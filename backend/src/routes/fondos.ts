import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { notFound, conflict, badRequest } from '../lib/errors.js';
import { auditar } from '../lib/audit.js';
import { requireAcceso } from '../plugins/auth.js';
import { soloEmprendedor } from '../auth/access.js';
import { exigirEmprendedor } from '../lib/actores.js';
import { compatibilidad, requisitosCheck, type PerfilMatch, type CriteriosMatch, type RequisitoDef } from '../domain/fondos.js';
import { getFondosMatchProvider, type FondoContexto } from '../adapters/fondos/index.js';

async function perfilDe(emprendedorId: string): Promise<PerfilMatch & { id: string }> {
  const e = await prisma.emprendedor.findUniqueOrThrow({ where: { id: emprendedorId }, include: { rubro: { select: { codigoMaestro: true } } } });
  return { id: e.id, rubroCodigo: e.rubro?.codigoMaestro ?? null, etapa: e.etapa, genero: e.genero, localidad: e.localidad, documentos: e.documentos };
}

const diasRestantes = (cierre: Date | null): number | null =>
  cierre ? Math.max(0, Math.ceil((cierre.getTime() - Date.now()) / 86_400_000)) : null;

export async function fondosRoutes(app: FastifyInstance): Promise<void> {
  const guard = { preHandler: requireAcceso(soloEmprendedor) };

  // ── Puerta 2: lista personalizada por match de perfil ───────────────────
  app.get('/api/fondos/para-mi', guard, async (req) => {
    const { tenantId, emprendedorId } = exigirEmprendedor(req);
    const perfil = await perfilDe(emprendedorId);
    const fondos = await prisma.fondo.findMany({ where: { tenantId, estado: 'ABIERTA' } });
    const conCompat = fondos
      .map((f) => ({ f, compat: compatibilidad(perfil, f.criteriosMatch as CriteriosMatch) }))
      .filter((x) => x.compat !== 'no') // NO mostrar fondos para los que no califica
      .sort((a, b) => (a.compat === 'alta' ? -1 : 1) - (b.compat === 'alta' ? -1 : 1));
    return {
      fondos: conCompat.map(({ f, compat }) => ({
        id: f.id, nombre: f.nombre, organismo: f.organismo, origen: f.origen, descripcion: f.descripcion,
        montoMax: f.montoMax, compatibilidad: compat, diasRestantes: diasRestantes(f.fechaCierre),
      })),
    };
  });

  // ── Puerta 1: asistente IA (mock por intención / RAG de MunIA) ──────────
  app.post('/api/fondos/asistente', guard, async (req) => {
    const { tenantId, emprendedorId } = exigirEmprendedor(req);
    const { consulta } = z.object({ consulta: z.string().min(2).max(500) }).parse(req.body);
    const perfil = await perfilDe(emprendedorId);
    const fondos = await prisma.fondo.findMany({ where: { tenantId, estado: 'ABIERTA' } });
    const ctx: FondoContexto[] = fondos.map((f) => ({ id: f.id, nombre: f.nombre, descripcion: f.descripcion, organismo: f.organismo, montoMax: f.montoMax, fechaCierre: f.fechaCierre?.toISOString() ?? null, criterios: f.criteriosMatch as CriteriosMatch }));
    const r = await getFondosMatchProvider().conversar({ consulta, perfil, fondos: ctx });
    const sugerido = r.fondoSugeridoId ? fondos.find((f) => f.id === r.fondoSugeridoId) : null;
    return { respuesta: r.respuesta, fondoSugerido: sugerido ? { id: sugerido.id, nombre: sugerido.nombre } : null };
  });

  // ── Ficha de fondo (a donde llegan ambas puertas) ───────────────────────
  app.get('/api/fondos/:id', guard, async (req) => {
    const { tenantId, emprendedorId } = exigirEmprendedor(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const fondo = await prisma.fondo.findFirst({ where: { id, tenantId } });
    if (!fondo) throw notFound('Fondo no encontrado');
    const perfil = await perfilDe(emprendedorId);
    const req_ = requisitosCheck(perfil, (fondo.requisitos as unknown as RequisitoDef[]) ?? []);
    const mia = await prisma.postulacionFondo.findUnique({ where: { fondoId_emprendedorId: { fondoId: id, emprendedorId } }, select: { estado: true } });
    return {
      fondo: {
        id: fondo.id, nombre: fondo.nombre, organismo: fondo.organismo, origen: fondo.origen, descripcion: fondo.descripcion,
        montoMax: fondo.montoMax, moneda: fondo.moneda, diasRestantes: diasRestantes(fondo.fechaCierre),
        compatibilidad: compatibilidad(perfil, fondo.criteriosMatch as CriteriosMatch),
        requisitos: req_.items, requisitosCumplidos: req_.cumplidos, requisitosVerificables: req_.verificables,
        faq: fondo.faq, miPostulacion: mia?.estado ?? null,
      },
    };
  });

  // ── Postular a un fondo ──────────────────────────────────────────────────
  app.post('/api/fondos/:id/postular', guard, async (req) => {
    const { usuarioId, tenantId, emprendedorId } = exigirEmprendedor(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const { proyecto, montoSolicitado } = z.object({ proyecto: z.string().min(10).max(2000), montoSolicitado: z.number().int().positive().optional() }).parse(req.body);
    const fondo = await prisma.fondo.findFirst({ where: { id, tenantId } });
    if (!fondo) throw notFound('Fondo no encontrado');
    if (fondo.estado !== 'ABIERTA') throw badRequest('Esta convocatoria no está recibiendo postulaciones', 'fondo_cerrado');
    const existe = await prisma.postulacionFondo.findUnique({ where: { fondoId_emprendedorId: { fondoId: id, emprendedorId } } });
    if (existe) throw conflict('Ya postulaste a este fondo', 'ya_postulada');
    const post = await prisma.postulacionFondo.create({ data: { fondoId: id, emprendedorId, proyecto, montoSolicitado, estado: 'POSTULADA' } });
    await auditar(prisma, { tenantId, usuarioId, accion: 'fondo.postular', entidad: 'PostulacionFondo', entidadId: post.id });
    return { postulacion: { id: post.id, estado: post.estado } };
  });

  app.get('/api/fondos/mis-postulaciones', guard, async (req) => {
    const { emprendedorId } = exigirEmprendedor(req);
    const postulaciones = await prisma.postulacionFondo.findMany({ where: { emprendedorId }, include: { fondo: { select: { nombre: true, organismo: true } } }, orderBy: { createdAt: 'desc' } });
    return { postulaciones };
  });
}

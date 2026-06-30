import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { conflict, notFound, badRequest } from '../lib/errors.js';
import { auditar } from '../lib/audit.js';
import { requireAcceso } from '../plugins/auth.js';
import { soloEmprendedor } from '../auth/access.js';
import { exigirEmprendedor } from '../lib/actores.js';
import { notificar } from '../lib/notify.js';
import { scorePropuesta, type PreguntaPuntuable } from '../domain/postulacion.js';

/** Traduce el criterio de selección a lenguaje del emprendedor. */
const criterioTexto = (pesoProp: number, pesoRep: number) =>
  pesoProp >= pesoRep ? 'Buena para mostrar algo nuevo' : 'Valora tu trayectoria';

export async function feriasRoutes(app: FastifyInstance): Promise<void> {
  const guard = { preHandler: requireAcceso(soloEmprendedor) };

  // ── Ferias abiertas para postular ───────────────────────────────────────
  app.get('/api/ferias/abiertas', guard, async (req) => {
    const { tenantId, emprendedorId } = exigirEmprendedor(req);
    const ferias = await prisma.feria.findMany({
      where: { tenantId, estado: 'ABIERTA' },
      include: { rubros: { include: { rubro: { select: { alias: true } } } }, postulaciones: { where: { emprendedorId }, select: { id: true, estado: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      ferias: ferias.map((f) => ({
        id: f.id, nombre: f.nombre, objetivo: f.objetivo, fecha: f.fecha, ubicacion: f.ubicacion, cupos: f.cupos,
        criterio: criterioTexto(f.pesoProp, f.pesoRep),
        rubros: f.rubros.map((r) => r.rubro.alias),
        yaPostulada: f.postulaciones[0]?.estado ?? null,
      })),
    };
  });

  // ── Detalle de feria + formulario híbrido ───────────────────────────────
  app.get('/api/ferias/:id', guard, async (req) => {
    const { tenantId, emprendedorId } = exigirEmprendedor(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const feria = await prisma.feria.findFirst({
      where: { id, tenantId },
      include: { preguntas: { orderBy: { orden: 'asc' } }, rubros: { include: { rubro: { select: { alias: true } } } }, postulaciones: { where: { emprendedorId } } },
    });
    if (!feria) throw notFound('Feria no encontrada');
    return {
      feria: {
        id: feria.id, nombre: feria.nombre, objetivo: feria.objetivo, fecha: feria.fecha, ubicacion: feria.ubicacion,
        estado: feria.estado, criterio: criterioTexto(feria.pesoProp, feria.pesoRep),
        rubros: feria.rubros.map((r) => r.rubro.alias),
        preguntas: feria.preguntas.map((p) => ({ id: p.id, texto: p.texto, tipo: p.tipo, opciones: p.opciones })),
        miPostulacion: feria.postulaciones[0] ?? null,
      },
    };
  });

  // ── Postular (núcleo desde perfil + respuestas configurables) ───────────
  app.post('/api/ferias/:id/postular', guard, async (req) => {
    const { usuarioId, tenantId, emprendedorId } = exigirEmprendedor(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = z.object({ respuestas: z.array(z.object({ preguntaId: z.string(), valor: z.string().nullable().optional(), archivoId: z.string().optional() })).default([]) }).parse(req.body);

    const feria = await prisma.feria.findFirst({ where: { id, tenantId }, include: { preguntas: true } });
    if (!feria) throw notFound('Feria no encontrada');
    if (feria.estado !== 'ABIERTA') throw badRequest('Esta feria no está recibiendo postulaciones', 'feria_cerrada');

    const existe = await prisma.postulacion.findUnique({ where: { feriaId_emprendedorId: { feriaId: id, emprendedorId } } });
    if (existe) throw conflict('Ya postulaste a esta feria', 'ya_postulada');

    const preguntas: PreguntaPuntuable[] = feria.preguntas.map((p) => ({ id: p.id, tipo: p.tipo, puntuable: p.puntuable, peso: p.peso, opciones: p.opciones }));
    const sProp = scorePropuesta(preguntas, body.respuestas);

    const postulacion = await prisma.postulacion.create({
      data: {
        feriaId: id, emprendedorId, scorePropuesta: sProp, estado: 'PENDIENTE',
        respuestas: { create: body.respuestas.filter((r) => feria.preguntas.some((p) => p.id === r.preguntaId)).map((r) => ({ preguntaId: r.preguntaId, valor: r.valor ?? null, archivoId: r.archivoId ?? null })) },
      },
    });
    await auditar(prisma, { tenantId, usuarioId, accion: 'feria.postular', entidad: 'Postulacion', entidadId: postulacion.id, meta: { feriaId: id, scorePropuesta: sProp } });
    await notificar(prisma, { tenantId, evento: 'POSTULACION_RECIBIDA', usuarioId, variables: { feria: feria.nombre } });
    return { postulacion: { id: postulacion.id, estado: postulacion.estado } };
  });

  // ── Mis postulaciones ────────────────────────────────────────────────────
  app.get('/api/ferias/mis-postulaciones', guard, async (req) => {
    const { emprendedorId } = exigirEmprendedor(req);
    const postulaciones = await prisma.postulacion.findMany({
      where: { emprendedorId },
      include: { feria: { select: { nombre: true, fecha: true, ubicacion: true, estado: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { postulaciones };
  });

  // ── Reportar feria (autoreporte capa 2) ─────────────────────────────────
  app.post('/api/ferias/:id/reportar', guard, async (req) => {
    const { usuarioId, tenantId, emprendedorId } = exigirEmprendedor(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = z.object({ participo: z.boolean().default(true), ventasReportadas: z.number().int().nonnegative().optional(), comentario: z.string().max(500).optional() }).parse(req.body);

    const admitida = await prisma.postulacion.findUnique({ where: { feriaId_emprendedorId: { feriaId: id, emprendedorId } } });
    if (!admitida || admitida.estado !== 'ADMITIDA') throw badRequest('Sólo puedes reportar ferias en las que fuiste admitido', 'no_admitido');

    const reporte = await prisma.reporteEmprendedor.upsert({
      where: { feriaId_emprendedorId: { feriaId: id, emprendedorId } },
      create: { feriaId: id, emprendedorId, participo: body.participo, ventasReportadas: body.ventasReportadas, comentario: body.comentario },
      update: { participo: body.participo, ventasReportadas: body.ventasReportadas, comentario: body.comentario },
    });
    await auditar(prisma, { tenantId, usuarioId, accion: 'feria.reportar', entidad: 'ReporteEmprendedor', entidadId: reporte.id });
    return { reporte };
  });
}

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { notFound } from '../lib/errors.js';
import { auditar } from '../lib/audit.js';
import { notificar } from '../lib/notify.js';
import { requireAcceso } from '../plugins/auth.js';
import { operarModulo, verModulo } from '../auth/access.js';
import { exigirFuncionario } from '../lib/actores.js';

const fondoSchema = z.object({
  nombre: z.string().min(3),
  organismo: z.string().min(2),
  origen: z.enum(['MUNICIPAL', 'EXTERNO']).default('MUNICIPAL'),
  descripcion: z.string().optional(),
  montoMax: z.number().int().positive().optional(),
  fechaCierre: z.string().optional(),
  criteriosMatch: z.object({ rubros: z.array(z.string()).optional(), etapa: z.array(z.string()).optional(), genero: z.array(z.string()).optional() }).default({}),
  requisitos: z.array(z.object({ clave: z.string(), etiqueta: z.string(), campoPerfil: z.string().nullable().optional() })).default([]),
  faq: z.array(z.object({ pregunta: z.string(), respuesta: z.string() })).default([]),
});

export async function fondosGestionRoutes(app: FastifyInstance): Promise<void> {
  const operar = { preHandler: requireAcceso(operarModulo('FONDOS')) };
  const ver = { preHandler: requireAcceso(verModulo('FONDOS')) };

  // ── Convocatorias ───────────────────────────────────────────────────────
  app.get('/api/gestion/fondos', ver, async (req) => {
    const { tenantId } = await exigirFuncionario(req);
    const fondos = await prisma.fondo.findMany({ where: { tenantId }, include: { _count: { select: { postulaciones: true } } }, orderBy: { createdAt: 'desc' } });
    return { fondos: fondos.map((f) => ({ id: f.id, nombre: f.nombre, organismo: f.organismo, origen: f.origen, estado: f.estado, montoMax: f.montoMax, fechaCierre: f.fechaCierre, postulaciones: f._count.postulaciones })) };
  });

  app.post('/api/gestion/fondos', operar, async (req, reply) => {
    const { usuarioId, tenantId } = await exigirFuncionario(req);
    const d = fondoSchema.parse(req.body);
    const fondo = await prisma.fondo.create({
      data: { tenantId, nombre: d.nombre, organismo: d.organismo, origen: d.origen, descripcion: d.descripcion, montoMax: d.montoMax, fechaCierre: d.fechaCierre ? new Date(d.fechaCierre) : null, estado: 'ABIERTA', criteriosMatch: d.criteriosMatch, requisitos: d.requisitos, faq: d.faq },
    });
    await auditar(prisma, { tenantId, usuarioId, accion: 'fondo.crear', entidad: 'Fondo', entidadId: fondo.id });

    // Notifica convocatoria abierta a emprendedores del rubro elegible (acotado).
    const rubros = d.criteriosMatch.rubros ?? [];
    const destinatarios = await prisma.emprendedor.findMany({
      where: { tenantId, ...(rubros.length ? { rubro: { codigoMaestro: { in: rubros } } } : {}) },
      select: { usuario: { select: { id: true } } }, take: 200,
    });
    for (const e of destinatarios) {
      await notificar(prisma, { tenantId, evento: 'CONVOCATORIA_ABIERTA', usuarioId: e.usuario.id, variables: { fondo: fondo.nombre, fecha: fondo.fechaCierre ? new Date(fondo.fechaCierre).toLocaleDateString('es-CL') : 'por confirmar' } });
    }
    return reply.code(201).send({ id: fondo.id, notificados: destinatarios.length });
  });

  // ── Evaluar postulaciones con reputación cruzada ────────────────────────
  app.get('/api/gestion/fondos/:id/postulaciones', ver, async (req) => {
    const { tenantId } = await exigirFuncionario(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const fondo = await prisma.fondo.findFirst({ where: { id, tenantId } });
    if (!fondo) throw notFound('Fondo no encontrado');
    const postulaciones = await prisma.postulacionFondo.findMany({
      where: { fondoId: id },
      include: { emprendedor: { select: { id: true, nombreEmprendimiento: true, repScore: true, feriasCumplidas: true, feriasTotales: true, rubro: { select: { alias: true } }, usuario: { select: { nombre: true } }, _count: { select: { certificados: true, inscripciones: true } } } } },
      orderBy: { createdAt: 'asc' },
    });
    return {
      fondo: { id: fondo.id, nombre: fondo.nombre, estado: fondo.estado },
      postulaciones: postulaciones.map((p) => ({
        id: p.id, estado: p.estado, proyecto: p.proyecto, montoSolicitado: p.montoSolicitado,
        emprendedor: {
          nombre: p.emprendedor.usuario.nombre, emprendimiento: p.emprendedor.nombreEmprendimiento, rubro: p.emprendedor.rubro?.alias,
          // Reputación cruzada: su historial en otros módulos es contexto para adjudicar.
          repScore: p.emprendedor.repScore, esNovato: p.emprendedor.feriasTotales === 0,
          ferias: `${p.emprendedor.feriasCumplidas}/${p.emprendedor.feriasTotales}`,
          certificados: p.emprendedor._count.certificados, cursos: p.emprendedor._count.inscripciones,
        },
      })),
    };
  });

  // ── Adjudicación ────────────────────────────────────────────────────────
  app.post('/api/gestion/postulaciones-fondo/:id/decidir', operar, async (req) => {
    const { usuarioId, tenantId } = await exigirFuncionario(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const { decision, motivo } = z.object({ decision: z.enum(['EN_EVALUACION', 'ADJUDICADA', 'RECHAZADA']), motivo: z.string().max(300).optional() }).parse(req.body);
    const post = await prisma.postulacionFondo.findFirst({ where: { id, fondo: { tenantId } }, include: { fondo: true, emprendedor: { select: { usuario: { select: { id: true } } } } } });
    if (!post) throw notFound('Postulación no encontrada');
    await prisma.postulacionFondo.update({ where: { id }, data: { estado: decision, motivoEstado: motivo } });
    await auditar(prisma, { tenantId, usuarioId, accion: `fondo.${decision.toLowerCase()}`, entidad: 'PostulacionFondo', entidadId: id, meta: { motivo } });
    if (decision === 'ADJUDICADA') {
      await notificar(prisma, { tenantId, evento: 'FONDO_ADJUDICADO', usuarioId: post.emprendedor.usuario.id, variables: { fondo: post.fondo.nombre } });
    }
    return { ok: true };
  });

  // ── Dashboard fondos ─────────────────────────────────────────────────────
  app.get('/api/gestion/dashboards/fondos', ver, async (req) => {
    const { tenantId } = await exigirFuncionario(req);
    const [adjudicados, postulaciones, apoyados, porRubro] = await Promise.all([
      prisma.postulacionFondo.count({ where: { fondo: { tenantId }, estado: 'ADJUDICADA' } }),
      prisma.postulacionFondo.count({ where: { fondo: { tenantId } } }),
      prisma.postulacionFondo.findMany({ where: { fondo: { tenantId }, estado: 'ADJUDICADA' }, select: { emprendedorId: true }, distinct: ['emprendedorId'] }),
      prisma.postulacionFondo.findMany({ where: { fondo: { tenantId }, estado: 'ADJUDICADA' }, include: { emprendedor: { select: { rubro: { select: { alias: true } } } } } }),
    ]);
    const dist = new Map<string, number>();
    for (const p of porRubro) { const k = p.emprendedor.rubro?.alias ?? 'Sin rubro'; dist.set(k, (dist.get(k) ?? 0) + 1); }
    return {
      fondosEntregados: adjudicados,
      emprendedoresApoyados: apoyados.length,
      postulaciones,
      distribucionRubro: [...dist.entries()].map(([clave, total]) => ({ clave, total })).sort((a, b) => b.total - a.total),
    };
  });
}

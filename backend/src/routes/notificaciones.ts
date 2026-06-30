import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { notFound } from '../lib/errors.js';
import { auditar } from '../lib/audit.js';
import { requireAuth, requireAcceso, exigirPrincipal } from '../plugins/auth.js';
import { soloAdmin } from '../auth/access.js';
import { VARIABLES_POR_EVENTO } from '../domain/plantillas.js';

export async function notificacionesRoutes(app: FastifyInstance): Promise<void> {
  // ── Centro de notificaciones in-app (campana) ───────────────────────────
  app.get('/api/notificaciones', { preHandler: requireAuth }, async (req) => {
    const p = exigirPrincipal(req);
    const [notificaciones, noLeidas] = await Promise.all([
      prisma.notificacion.findMany({ where: { usuarioId: p.usuarioId }, orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.notificacion.count({ where: { usuarioId: p.usuarioId, leida: false } }),
    ]);
    return { notificaciones, noLeidas };
  });

  app.post('/api/notificaciones/:id/leer', { preHandler: requireAuth }, async (req) => {
    const p = exigirPrincipal(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    await prisma.notificacion.updateMany({ where: { id, usuarioId: p.usuarioId }, data: { leida: true } });
    return { ok: true };
  });

  app.post('/api/notificaciones/leer-todas', { preHandler: requireAuth }, async (req) => {
    const p = exigirPrincipal(req);
    await prisma.notificacion.updateMany({ where: { usuarioId: p.usuarioId, leida: false }, data: { leida: true } });
    return { ok: true };
  });

  // ── Plantillas editables por el admin ───────────────────────────────────
  const guardAdmin = { preHandler: requireAcceso(soloAdmin) };

  app.get('/api/gestion/plantillas', guardAdmin, async (req) => {
    const p = exigirPrincipal(req);
    const plantillas = await prisma.plantillaNotificacion.findMany({ where: { tenantId: p.tenantId }, orderBy: { evento: 'asc' } });
    return { plantillas: plantillas.map((pl) => ({ ...pl, variables: VARIABLES_POR_EVENTO[pl.evento] ?? [] })) };
  });

  app.patch('/api/gestion/plantillas/:id', guardAdmin, async (req) => {
    const p = exigirPrincipal(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const data = z.object({ asunto: z.string().min(1).optional(), cuerpo: z.string().min(1).optional(), activa: z.boolean().optional() }).parse(req.body);
    const existe = await prisma.plantillaNotificacion.findFirst({ where: { id, tenantId: p.tenantId } });
    if (!existe) throw notFound('Plantilla no encontrada');
    const plantilla = await prisma.plantillaNotificacion.update({ where: { id }, data });
    await auditar(prisma, { tenantId: p.tenantId, usuarioId: p.usuarioId, accion: 'plantilla.editar', entidad: 'PlantillaNotificacion', entidadId: id, meta: { campos: Object.keys(data) } });
    return { plantilla };
  });
}

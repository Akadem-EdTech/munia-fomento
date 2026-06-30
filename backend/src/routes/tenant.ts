import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { auditar } from '../lib/audit.js';
import { requireAcceso, exigirPrincipal } from '../plugins/auth.js';
import { soloAdmin } from '../auth/access.js';

const tenantSchema = z.object({
  nombre: z.string().min(2).optional(),
  logoUrl: z.string().url().nullable().optional(),
  colorAccent: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color hex inválido').nullable().optional(),
  dominioCorreo: z.string().nullable().optional(),
  modulosActivos: z.array(z.enum(['FERIAS', 'CAPACITACION', 'FONDOS'])).optional(),
});

export async function tenantRoutes(app: FastifyInstance): Promise<void> {
  const guard = { preHandler: requireAcceso(soloAdmin) };

  // El municipio es CONFIGURACIÓN: el admin lo edita sin tocar código.
  app.get('/api/gestion/tenant', guard, async (req) => {
    const p = exigirPrincipal(req);
    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { id: p.tenantId },
      select: { slug: true, nombre: true, logoUrl: true, colorAccent: true, dominioCorreo: true, modulosActivos: true, consentVersion: true },
    });
    return { tenant };
  });

  app.patch('/api/gestion/tenant', guard, async (req) => {
    const p = exigirPrincipal(req);
    const data = tenantSchema.parse(req.body);
    const tenant = await prisma.tenant.update({
      where: { id: p.tenantId },
      data,
      select: { slug: true, nombre: true, logoUrl: true, colorAccent: true, dominioCorreo: true, modulosActivos: true },
    });
    await auditar(prisma, { tenantId: p.tenantId, usuarioId: p.usuarioId, accion: 'tenant.configurar', entidad: 'Tenant', entidadId: p.tenantId, meta: { campos: Object.keys(data) } });
    return { tenant };
  });
}

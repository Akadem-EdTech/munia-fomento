import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomBytes, createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { loadEnv } from '../env.js';
import { auditar } from '../lib/audit.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { requireAcceso, exigirPrincipal } from '../plugins/auth.js';
import { soloAdmin } from '../auth/access.js';
import { getEmailProvider } from '../adapters/email/index.js';

const MODULOS = ['FERIAS', 'CAPACITACION', 'FONDOS'] as const;
const ROLES = ['ADMINISTRADOR', 'EVALUADOR', 'JEFATURA'] as const;

const invitarSchema = z.object({
  nombre: z.string().min(2),
  email: z.string().email(),
  cargo: z.string().optional(),
  rol: z.enum(ROLES),
  modulos: z.array(z.enum(MODULOS)).default([]),
});

const editarSchema = z.object({
  cargo: z.string().optional(),
  rol: z.enum(ROLES).optional(),
  modulos: z.array(z.enum(MODULOS)).optional(),
});

export async function usuariosRoutes(app: FastifyInstance): Promise<void> {
  // Toda esta sección es "Administración del sistema": sólo ADMINISTRADOR.
  const guard = { preHandler: requireAcceso(soloAdmin) };

  // ── Listar funcionarios del municipio ───────────────────────────────────
  app.get('/api/usuarios', guard, async (req) => {
    const p = exigirPrincipal(req);
    const funcionarios = await prisma.usuario.findMany({
      where: { tenantId: p.tenantId, tipo: 'FUNCIONARIO' },
      select: {
        id: true, nombre: true, email: true, estado: true, createdAt: true, ultimoAcceso: true,
        funcionario: { select: { cargo: true, rol: true, modulos: true } },
      },
      orderBy: { nombre: 'asc' },
    });
    return { funcionarios };
  });

  // ── Invitar funcionario (alta por el admin; NO auto-registro) ───────────
  app.post('/api/usuarios/invitar', guard, async (req, reply) => {
    const p = exigirPrincipal(req);
    const data = invitarSchema.parse(req.body);
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: p.tenantId } });

    if (tenant.dominioCorreo && !data.email.toLowerCase().endsWith(`@${tenant.dominioCorreo.toLowerCase()}`)) {
      throw badRequest(`El correo debe ser del dominio institucional @${tenant.dominioCorreo}`, 'dominio_invalido');
    }

    const token = randomBytes(24).toString('hex');
    const inviteTokenHash = createHash('sha256').update(token).digest('hex');
    const inviteExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 días

    let usuario;
    try {
      usuario = await prisma.usuario.create({
        data: {
          tenantId: tenant.id,
          tipo: 'FUNCIONARIO',
          nombre: data.nombre,
          email: data.email.toLowerCase(),
          estado: 'INVITADO',
          authStrategy: 'PASSWORD',
          inviteTokenHash,
          inviteExpiresAt,
          funcionario: { create: { cargo: data.cargo, rol: data.rol, modulos: data.modulos } },
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw conflict('Ya existe un usuario con ese correo en el municipio', 'duplicado');
      }
      throw e;
    }

    const enlace = `${loadEnv().WEB_ORIGIN}/activar?token=${token}`;
    await getEmailProvider().enviar({
      to: usuario.email,
      subject: 'Activa tu cuenta en MunIA Fomento',
      text: `Hola ${data.nombre}, fuiste dado de alta como ${data.cargo ?? data.rol}. Activa tu cuenta: ${enlace}`,
    });
    await auditar(prisma, { tenantId: tenant.id, usuarioId: p.usuarioId, accion: 'usuario.invitar', entidad: 'Usuario', entidadId: usuario.id, meta: { rol: data.rol, modulos: data.modulos } });

    return reply.code(201).send({ id: usuario.id, estado: usuario.estado });
  });

  // ── Editar rol × módulos ────────────────────────────────────────────────
  app.patch('/api/usuarios/:id', guard, async (req) => {
    const p = exigirPrincipal(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const data = editarSchema.parse(req.body);

    const objetivo = await prisma.usuario.findFirst({ where: { id, tenantId: p.tenantId, tipo: 'FUNCIONARIO' }, include: { funcionario: true } });
    if (!objetivo || !objetivo.funcionario) throw notFound('Funcionario no encontrado');

    await prisma.funcionario.update({
      where: { id: objetivo.funcionario.id },
      data: { cargo: data.cargo ?? objetivo.funcionario.cargo, rol: data.rol ?? objetivo.funcionario.rol, modulos: data.modulos ?? objetivo.funcionario.modulos },
    });
    await auditar(prisma, { tenantId: p.tenantId, usuarioId: p.usuarioId, accion: 'usuario.editar_acceso', entidad: 'Usuario', entidadId: id, meta: { rol: data.rol, modulos: data.modulos } });
    return { ok: true };
  });

  // ── Suspender / reactivar acceso (acción sensible → auditada) ───────────
  app.post('/api/usuarios/:id/suspender', guard, async (req) => {
    const p = exigirPrincipal(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    if (id === p.usuarioId) throw badRequest('No puedes suspender tu propia cuenta', 'auto_suspension');
    const objetivo = await prisma.usuario.findFirst({ where: { id, tenantId: p.tenantId, tipo: 'FUNCIONARIO' } });
    if (!objetivo) throw notFound('Funcionario no encontrado');
    await prisma.usuario.update({ where: { id }, data: { estado: 'SUSPENDIDO' } });
    await auditar(prisma, { tenantId: p.tenantId, usuarioId: p.usuarioId, accion: 'usuario.suspender', entidad: 'Usuario', entidadId: id });
    return { ok: true };
  });

  app.post('/api/usuarios/:id/reactivar', guard, async (req) => {
    const p = exigirPrincipal(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const objetivo = await prisma.usuario.findFirst({ where: { id, tenantId: p.tenantId, tipo: 'FUNCIONARIO' } });
    if (!objetivo) throw notFound('Funcionario no encontrado');
    await prisma.usuario.update({ where: { id }, data: { estado: 'ACTIVO' } });
    await auditar(prisma, { tenantId: p.tenantId, usuarioId: p.usuarioId, accion: 'usuario.reactivar', entidad: 'Usuario', entidadId: id });
    return { ok: true };
  });
}

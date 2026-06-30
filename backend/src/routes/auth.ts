import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { loadEnv } from '../env.js';
import { resolverTenant } from '../lib/tenant.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { badRequest, conflict, unauthorized } from '../lib/errors.js';
import { auditar } from '../lib/audit.js';
import { establecerSesion, cerrarSesion, requireAuth, exigirPrincipal } from '../plugins/auth.js';
import { ClaveUnicaProvider } from '../auth/providers/clave-unica.js';

const registroSchema = z.object({
  nombre: z.string().min(2),
  rut: z.string().min(3),
  email: z.string().email(),
  // Contraseña sólo si NO viene de ClaveÚnica (que ya autentica por RUT verificado).
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').optional(),
  claveUnicaSub: z.string().optional(),
  nombreEmprendimiento: z.string().min(2),
  telefono: z.string().optional(),
  rubroId: z.string().optional(),
  // Consentimiento Ley 21.719: explícito, no pre-marcado. Se exige true en servidor.
  consentimiento: z.literal(true, { errorMap: () => ({ message: 'Debes aceptar el aviso de privacidad para registrarte' }) }),
}).refine((d) => !!d.password || !!d.claveUnicaSub, { message: 'Falta la contraseña', path: ['password'] });

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

/** Serializa el principal + datos visibles para el frontend. */
async function perfilActual(usuarioId: string) {
  return prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: {
      id: true, nombre: true, email: true, tipo: true, estado: true,
      funcionario: { select: { rol: true, cargo: true, modulos: true } },
      emprendedor: { select: { id: true, nombreEmprendimiento: true, repScore: true } },
      tenant: { select: { slug: true, nombre: true, logoUrl: true, colorAccent: true, modulosActivos: true } },
    },
  });
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // ── Auto-registro de emprendedor (puerta abierta, ciudadano) ────────────
  app.post('/api/auth/registro', async (req, reply) => {
    const data = registroSchema.parse(req.body);
    const tenant = await resolverTenant(req.headers['x-tenant']);

    const passwordHash = data.password ? await hashPassword(data.password) : null;
    try {
      const usuario = await prisma.usuario.create({
        data: {
          tenantId: tenant.id,
          tipo: 'EMPRENDEDOR',
          nombre: data.nombre,
          email: data.email.toLowerCase(),
          rut: data.rut,
          authStrategy: data.claveUnicaSub ? 'CLAVE_UNICA' : 'PASSWORD',
          passwordHash,
          claveUnicaSub: data.claveUnicaSub ?? null,
          emprendedor: {
            create: {
              tenantId: tenant.id,
              nombreEmprendimiento: data.nombreEmprendimiento,
              telefono: data.telefono,
              rubroId: data.rubroId,
              consentVersion: tenant.consentVersion,
              consentFecha: new Date(),
            },
          },
        },
      });
      await auditar(prisma, { tenantId: tenant.id, usuarioId: usuario.id, accion: 'emprendedor.registro', entidad: 'Usuario', entidadId: usuario.id, meta: { consentVersion: tenant.consentVersion } });
      establecerSesion(reply, usuario.id);
      return reply.code(201).send({ usuario: await perfilActual(usuario.id) });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const campo = (e.meta?.target as string[] | undefined)?.includes('rut') ? 'RUT' : 'correo';
        throw conflict(`Ya existe una cuenta con ese ${campo}`, 'duplicado');
      }
      throw e;
    }
  });

  // ── Login con contraseña (fallback dev / entornos sin ClaveÚnica) ────────
  app.post('/api/auth/login', async (req, reply) => {
    const { email, password } = loginSchema.parse(req.body);
    const tenant = await resolverTenant(req.headers['x-tenant']);
    const usuario = await prisma.usuario.findUnique({ where: { tenantId_email: { tenantId: tenant.id, email: email.toLowerCase() } } });
    if (!usuario || !usuario.passwordHash || !(await verifyPassword(usuario.passwordHash, password))) {
      throw unauthorized('Correo o contraseña incorrectos', 'credenciales');
    }
    if (usuario.estado === 'SUSPENDIDO') throw unauthorized('Tu cuenta está suspendida', 'suspendido');
    if (usuario.estado === 'INVITADO') throw unauthorized('Debes activar tu cuenta desde el correo de invitación', 'invitado');

    await prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoAcceso: new Date() } });
    establecerSesion(reply, usuario.id);
    return { usuario: await perfilActual(usuario.id) };
  });

  // ── Sesión actual ────────────────────────────────────────────────────────
  app.get('/api/auth/me', async (req) => {
    if (!req.principal) return { usuario: null };
    return { usuario: await perfilActual(req.principal.usuarioId) };
  });

  // ── Logout ────────────────────────────────────────────────────────────────
  app.post('/api/auth/logout', { preHandler: requireAuth }, async (req, reply) => {
    const p = exigirPrincipal(req);
    cerrarSesion(reply);
    await auditar(prisma, { tenantId: p.tenantId, usuarioId: p.usuarioId, accion: 'auth.logout', entidad: 'Usuario', entidadId: p.usuarioId });
    return { ok: true };
  });

  // ── Activación de cuenta de funcionario (invitación del admin) ──────────
  app.post('/api/auth/activar', async (req, reply) => {
    const schema = z.object({ token: z.string().min(10), password: z.string().min(8) });
    const { token, password } = schema.parse(req.body);
    const { createHash } = await import('node:crypto');
    const hash = createHash('sha256').update(token).digest('hex');
    const usuario = await prisma.usuario.findFirst({ where: { inviteTokenHash: hash, estado: 'INVITADO' } });
    if (!usuario || !usuario.inviteExpiresAt || usuario.inviteExpiresAt < new Date()) {
      throw badRequest('La invitación es inválida o expiró', 'invitacion_invalida');
    }
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { passwordHash: await hashPassword(password), estado: 'ACTIVO', inviteTokenHash: null, inviteExpiresAt: null },
    });
    await auditar(prisma, { tenantId: usuario.tenantId, usuarioId: usuario.id, accion: 'funcionario.activar', entidad: 'Usuario', entidadId: usuario.id });
    establecerSesion(reply, usuario.id);
    return { usuario: await perfilActual(usuario.id) };
  });

  // ── ClaveÚnica (OIDC) — método principal en producción ──────────────────
  app.get('/api/auth/clave-unica/start', async (req, reply) => {
    if (loadEnv().AUTH_PRIMARY_STRATEGY !== 'clave_unica') throw badRequest('ClaveÚnica no está habilitada', 'clave_unica_off');
    const provider = new ClaveUnicaProvider();
    const { randomBytes } = await import('node:crypto');
    const state = randomBytes(16).toString('hex');
    reply.setCookie('cu_state', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 });
    return reply.redirect(provider.buildAuthorizeUrl(state));
  });

  // Callback OIDC: intercambia el code, identifica por RUT verificado.
  app.get('/api/auth/clave-unica/callback', async (req, reply) => {
    const env = loadEnv();
    const { code, state } = z.object({ code: z.string(), state: z.string() }).parse(req.query);
    if (req.cookies['cu_state'] !== state) throw badRequest('Estado inválido (posible CSRF)', 'state_invalido');
    reply.clearCookie('cu_state', { path: '/' });

    const claims = await new ClaveUnicaProvider().handleCallback(code);
    const tenant = await resolverTenant(req.headers['x-tenant']);

    // Identidad: por subject de ClaveÚnica o por RUT verificado (anti-duplicados).
    let usuario = await prisma.usuario.findFirst({ where: { tenantId: tenant.id, OR: [{ claveUnicaSub: claims.sub }, { rut: claims.rut }] } });
    if (usuario) {
      if (usuario.claveUnicaSub !== claims.sub) {
        usuario = await prisma.usuario.update({ where: { id: usuario.id }, data: { claveUnicaSub: claims.sub, authStrategy: 'CLAVE_UNICA', ultimoAcceso: new Date() } });
      }
      establecerSesion(reply, usuario.id);
      return reply.redirect(`${env.WEB_ORIGIN}/app`);
    }
    // Sin cuenta: el emprendedor completa su registro (con consentimiento) con el RUT ya verificado.
    const params = new URLSearchParams({ rut: claims.rut, nombre: claims.nombre, cu: claims.sub });
    return reply.redirect(`${env.WEB_ORIGIN}/registro?${params.toString()}`);
  });

  // Config pública (no sensible): estrategia de auth + datos de marca del tenant.
  app.get('/api/config', async (req) => {
    const env = loadEnv();
    const tenant = await resolverTenant(req.headers['x-tenant']).catch(() => null);
    return {
      authStrategy: env.AUTH_PRIMARY_STRATEGY,
      tenant: tenant ? { nombre: tenant.nombre, logoUrl: tenant.logoUrl, colorAccent: tenant.colorAccent } : null,
    };
  });
}

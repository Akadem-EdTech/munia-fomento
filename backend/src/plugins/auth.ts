import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import fp from 'fastify-plugin';
import cookie from '@fastify/cookie';
import { prisma } from '../db.js';
import { loadEnv, isProd } from '../env.js';
import { AppError } from '../lib/errors.js';
import { evaluarAcceso, type Principal, type Requisito } from '../auth/access.js';

export const SESSION_COOKIE = 'munia_sid';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

declare module 'fastify' {
  interface FastifyRequest {
    /** Principal autenticado (null si anónimo). Cargado en cada request. */
    principal: Principal | null;
  }
}

/** Construye el Principal a partir del usuario (con rol y módulos del funcionario). */
async function cargarPrincipal(req: FastifyRequest): Promise<Principal | null> {
  const raw = req.cookies[SESSION_COOKIE];
  if (!raw) return null;
  const unsigned = req.unsignCookie(raw);
  if (!unsigned.valid || !unsigned.value) return null;

  const u = await prisma.usuario.findUnique({
    where: { id: unsigned.value },
    include: { funcionario: true, emprendedor: { select: { id: true } } },
  });
  // La suspensión surte efecto de inmediato: se revalida el estado en cada request.
  if (!u || u.estado !== 'ACTIVO') return null;

  return {
    usuarioId: u.id,
    tenantId: u.tenantId,
    tipo: u.tipo,
    estado: u.estado,
    funcionario: u.funcionario ? { rol: u.funcionario.rol, modulos: u.funcionario.modulos } : undefined,
    emprendedorId: u.emprendedor?.id,
  };
}

// fastify-plugin: NO encapsular — los decoradores de cookie y el hook deben
// aplicar al scope raíz donde se registran las rutas (si no, reply.setCookie
// no existiría en los handlers).
export const authPlugin = fp(async (app: FastifyInstance): Promise<void> => {
  await app.register(cookie, { secret: loadEnv().SESSION_SECRET });
  app.decorateRequest('principal', null);
  app.addHook('onRequest', async (req) => {
    req.principal = await cargarPrincipal(req);
  });
});

export function establecerSesion(reply: FastifyReply, usuarioId: string): void {
  reply.setCookie(SESSION_COOKIE, usuarioId, {
    signed: true,
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd(),
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export function cerrarSesion(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: '/' });
}

/**
 * preHandler que exige cumplir un Requisito de acceso (rol × módulo).
 * Se aplica en CADA endpoint protegido — no se confía en el frontend.
 */
export function requireAcceso(req: Requisito): preHandlerHookHandler {
  return async (request: FastifyRequest) => {
    const d = evaluarAcceso(request.principal, req);
    if (!d.ok) {
      throw new AppError(d.code === 'unauthorized' ? 401 : 403, d.motivo ?? 'Sin acceso', d.code ?? 'forbidden');
    }
  };
}

/** Sólo requiere estar autenticado y activo. */
export const requireAuth: preHandlerHookHandler = requireAcceso({});

/** Devuelve el principal o lanza 401. Útil dentro de handlers. */
export function exigirPrincipal(request: FastifyRequest): Principal {
  if (!request.principal) throw new AppError(401, 'No autenticado', 'unauthorized');
  return request.principal;
}

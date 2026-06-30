import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';

/**
 * Smoke test del cableado HTTP: health, control de acceso y validación.
 * No requiere base de datos: todas estas rutas resuelven antes de tocar Prisma.
 */
describe('app — cableado HTTP (sin BD)', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await buildApp(); });
  afterAll(async () => { await app.close(); });

  it('GET /api/health responde ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true });
  });

  it('GET /api/usuarios sin sesión → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/usuarios' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('unauthorized');
  });

  it('GET /api/auth/me sin sesión → usuario null', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ usuario: null });
  });

  it('POST /api/auth/registro sin consentimiento → 400 validación', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/auth/registro',
      payload: { nombre: 'Test', rut: '11.111.111-1', email: 'a@b.cl', password: 'clave123', nombreEmprendimiento: 'Mi Emp', consentimiento: false },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('validacion');
  });

  it('POST /api/auth/login con cuerpo inválido → 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'no-es-email', password: '' } });
    expect(res.statusCode).toBe(400);
  });
});

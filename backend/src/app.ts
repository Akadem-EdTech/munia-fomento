import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { ZodError } from 'zod';
import { loadEnv } from './env.js';
import { AppError } from './lib/errors.js';
import { authPlugin } from './plugins/auth.js';
import { authRoutes } from './routes/auth.js';
import { usuariosRoutes } from './routes/usuarios.js';
import { emprendedorRoutes } from './routes/emprendedor.js';
import { feriasRoutes } from './routes/ferias.js';
import { feriasGestionRoutes } from './routes/ferias-gestion.js';
import { notificacionesRoutes } from './routes/notificaciones.js';

/** Construye la app Fastify (sin escuchar) — reutilizable en tests. */
export async function buildApp(): Promise<FastifyInstance> {
  const env = loadEnv();
  const app = Fastify({ logger: env.NODE_ENV !== 'test' });

  await app.register(cors, { origin: env.WEB_ORIGIN, credentials: true });
  await app.register(authPlugin);

  // Manejador de errores uniforme (mensajes en español, sin filtrar internos).
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: 'validacion', mensaje: 'Datos inválidos', detalles: err.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })) });
    }
    if (err instanceof AppError) {
      return reply.code(err.statusCode).send({ error: err.code, mensaje: err.message });
    }
    req.log.error(err);
    return reply.code(500).send({ error: 'interno', mensaje: 'Ocurrió un error inesperado' });
  });

  app.get('/api/health', async () => ({ ok: true, ts: new Date().toISOString() }));

  await app.register(authRoutes);
  await app.register(usuariosRoutes);
  await app.register(emprendedorRoutes);
  await app.register(feriasRoutes);
  await app.register(feriasGestionRoutes);
  await app.register(notificacionesRoutes);

  return app;
}

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { prisma } from '../db.js';
import { badRequest, notFound } from '../lib/errors.js';
import { auditar } from '../lib/audit.js';
import { requireAuth, exigirPrincipal } from '../plugins/auth.js';
import { getStorageProvider } from '../adapters/storage/index.js';

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const MIMES_OK = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

export async function archivosRoutes(app: FastifyInstance): Promise<void> {
  // Subir un archivo (adjuntos de postulación, documentos, etc.).
  app.post('/api/archivos', { preHandler: requireAuth }, async (req) => {
    const p = exigirPrincipal(req);
    const data = await req.file({ limits: { fileSize: MAX_BYTES } });
    if (!data) throw badRequest('No se recibió ningún archivo', 'sin_archivo');
    if (!MIMES_OK.has(data.mimetype)) throw badRequest('Tipo de archivo no permitido (usa JPG, PNG, WebP o PDF)', 'mime_invalido');

    const buffer = await data.toBuffer();
    if (data.file.truncated) throw badRequest('El archivo supera el límite de 8 MB', 'archivo_grande');

    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
    const key = `${p.tenantId}/${randomUUID()}-${safe}`;
    await getStorageProvider().guardar(key, buffer, data.mimetype);

    const archivo = await prisma.archivo.create({
      data: { tenantId: p.tenantId, subidoPorId: p.usuarioId, storageKey: key, nombre: data.filename, mime: data.mimetype, tamano: buffer.length },
      select: { id: true, nombre: true, mime: true, tamano: true },
    });
    await auditar(prisma, { tenantId: p.tenantId, usuarioId: p.usuarioId, accion: 'archivo.subir', entidad: 'Archivo', entidadId: archivo.id });
    return { archivo };
  });

  // Descargar/servir un archivo (scope por tenant).
  app.get('/api/archivos/:id/contenido', { preHandler: requireAuth }, async (req, reply) => {
    const p = exigirPrincipal(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const archivo = await prisma.archivo.findFirst({ where: { id, tenantId: p.tenantId } });
    if (!archivo) throw notFound('Archivo no encontrado');
    const contenido = await getStorageProvider().leer(archivo.storageKey);
    return reply.header('Content-Type', archivo.mime).header('Content-Disposition', `inline; filename="${encodeURIComponent(archivo.nombre)}"`).send(contenido);
  });
}

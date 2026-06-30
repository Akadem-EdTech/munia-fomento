import type { PrismaClient } from '@prisma/client';

export interface EntradaAuditoria {
  tenantId: string;
  usuarioId?: string | null;
  accion: string; // ej: "feria.admitir", "usuario.suspender", "fondo.adjudicar"
  entidad: string; // ej: "Postulacion"
  entidadId?: string | null;
  meta?: Record<string, unknown>;
}

/**
 * Firma una acción sensible: usuario + timestamp + tenant. Hay recursos públicos
 * y selección de beneficiarios de por medio — toda acción sensible queda trazada.
 */
export async function auditar(
  db: Pick<PrismaClient, 'auditLog'>,
  e: EntradaAuditoria,
): Promise<void> {
  await db.auditLog.create({
    data: {
      tenantId: e.tenantId,
      usuarioId: e.usuarioId ?? null,
      accion: e.accion,
      entidad: e.entidad,
      entidadId: e.entidadId ?? null,
      meta: (e.meta ?? {}) as object,
    },
  });
}

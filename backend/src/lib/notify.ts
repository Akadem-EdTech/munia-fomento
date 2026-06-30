import type { EventoNotificacion, PrismaClient } from '@prisma/client';
import { renderPlantilla, type Variables } from '../domain/plantillas.js';
import { getEmailProvider } from '../adapters/email/index.js';

export interface SolicitudNotificacion {
  tenantId: string;
  evento: EventoNotificacion;
  /** Usuario destinatario (recibe la notificación in-app + email). */
  usuarioId: string;
  variables: Variables;
}

/**
 * Capa de notificaciones basada en EVENTOS, no email cableado en cada función.
 * El dominio sólo llama `notificar(EVENTO, …)`. Agregar un canal nuevo (WhatsApp)
 * mañana es enchufarlo aquí, sin tocar la lógica de negocio.
 *
 * Resiliente: si falla el envío, NO rompe la acción que la originó.
 */
export async function notificar(prisma: PrismaClient, req: SolicitudNotificacion): Promise<void> {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuarioId }, select: { email: true, nombre: true } });
    if (!usuario) return;

    // Plantilla editable del tenant; fallback genérico si no existe.
    const plantilla = await prisma.plantillaNotificacion.findUnique({
      where: { tenantId_evento_canal: { tenantId: req.tenantId, evento: req.evento, canal: 'EMAIL' } },
    });
    const asunto = plantilla?.activa !== false ? plantilla?.asunto ?? `Novedad de MunIA Fomento` : `Novedad de MunIA Fomento`;
    const cuerpo = plantilla?.cuerpo ?? 'Tienes una novedad en MunIA Fomento.';

    const vars: Variables = { nombre: usuario.nombre, ...req.variables };
    const tituloFinal = renderPlantilla(asunto, vars);
    const cuerpoFinal = renderPlantilla(cuerpo, vars);

    // Centro in-app (campana). Contextual al rol del destinatario.
    await prisma.notificacion.create({
      data: { tenantId: req.tenantId, usuarioId: req.usuarioId, evento: req.evento, titulo: tituloFinal, cuerpo: cuerpoFinal, meta: (req.variables ?? {}) as object },
    });

    // Canal email (MVP). Otros canales se enchufan al mismo evento.
    if (plantilla?.activa !== false) {
      await getEmailProvider().enviar({ to: usuario.email, subject: tituloFinal, text: cuerpoFinal });
    }
  } catch (err) {
    // No interrumpe la acción de negocio; sólo registra.
    // eslint-disable-next-line no-console
    console.error(`[notify] fallo al notificar ${req.evento}:`, err);
  }
}

/**
 * Render de plantillas con variables {nombre}, {feria}, {fecha}, etc.
 * Puro y testeable. Las plantillas son editables por el admin, NO hardcodeadas.
 */

export type Variables = Record<string, string | number | null | undefined>;

/** Reemplaza {clave} por su valor. Si falta, deja el literal (el admin lo nota). */
export function renderPlantilla(texto: string, variables: Variables): string {
  return texto.replace(/\{(\w+)\}/g, (literal, clave: string) => {
    const v = variables[clave];
    return v === undefined || v === null ? literal : String(v);
  });
}

/** Variables declaradas por evento — guía para el editor de plantillas del admin. */
export const VARIABLES_POR_EVENTO: Record<string, string[]> = {
  POSTULACION_RECIBIDA: ['nombre', 'feria'],
  EMPRENDEDOR_ADMITIDO: ['nombre', 'feria', 'fecha', 'ubicacion'],
  EMPRENDEDOR_RECHAZADO: ['nombre', 'feria'],
  EMPRENDEDOR_LISTA_ESPERA: ['nombre', 'feria'],
  FERIA_RECORDATORIO_48H: ['nombre', 'feria', 'fecha', 'ubicacion'],
  SOLICITUD_AUTOREPORTE: ['nombre', 'feria'],
  INSCRIPCION_CURSO_CONFIRMADA: ['nombre', 'curso', 'fecha'],
  CONVOCATORIA_ABIERTA: ['nombre', 'fondo', 'fecha'],
  FONDO_ADJUDICADO: ['nombre', 'fondo'],
  FUNCIONARIO_INVITADO: ['nombre', 'cargo', 'enlace'],
};

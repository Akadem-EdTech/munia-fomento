/**
 * Métricas de formación — puras y testeables.
 */

/** Tasa de asistencia: presentes sobre el total de registros tomados. */
export function tasaAsistencia(presentes: number, totalRegistros: number): number {
  return totalRegistros > 0 ? Math.round((presentes / totalRegistros) * 100) : 0;
}

export interface CursoDemanda {
  nombre: string;
  inscritos: number;
  cupos: number;
}

/** Ocupación de un curso (para la barra). */
export const ocupacion = (inscritos: number, cupos: number): number =>
  cupos > 0 ? Math.min(100, Math.round((inscritos / cupos) * 100)) : 0;

/** Cursos ordenados por demanda (inscritos), para el dashboard. */
export function cursosMasDemandados(cursos: CursoDemanda[], top = 5): CursoDemanda[] {
  return [...cursos].sort((a, b) => b.inscritos - a.inscritos).slice(0, top);
}

/** ¿Hay cupo? Determina si una inscripción entra como INSCRITO o LISTA_ESPERA. */
export const hayCupo = (inscritos: number, cupos: number): boolean => inscritos < cupos;

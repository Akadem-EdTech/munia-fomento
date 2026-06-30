/**
 * Cálculo de métricas de dashboard — funciones puras y testeables.
 * Tres lecturas: operativa (encargado, accionable), territorial (jefatura,
 * agregado) y narrativa (alcalde, números grandes). NUNCA métricas inventadas:
 * sólo agregan data real que se les pasa.
 */

export interface PostulacionMetrica {
  estado: 'PENDIENTE' | 'ADMITIDA' | 'RECHAZADA' | 'LISTA_ESPERA';
  rubroCodigo?: string | null;
  localidad?: string | null;
}

export interface MetricasOperativas {
  postulados: number;
  admitidos: number;
  pendientes: number;
  listaEspera: number;
  cupos: number;
  cuposUsadosPct: number;
}

export function metricasOperativas(postulaciones: PostulacionMetrica[], cupos: number): MetricasOperativas {
  const cuenta = (e: PostulacionMetrica['estado']) => postulaciones.filter((p) => p.estado === e).length;
  const admitidos = cuenta('ADMITIDA');
  return {
    postulados: postulaciones.length,
    admitidos,
    pendientes: cuenta('PENDIENTE'),
    listaEspera: cuenta('LISTA_ESPERA'),
    cupos,
    cuposUsadosPct: cupos > 0 ? Math.round((admitidos / cupos) * 100) : 0,
  };
}

export interface Distribucion {
  clave: string;
  total: number;
  pct: number;
}

/** Agrega admitidos por una dimensión (rubro o localidad). Para la vista territorial. */
export function distribucionPor(
  postulaciones: PostulacionMetrica[],
  dim: 'rubroCodigo' | 'localidad',
): Distribucion[] {
  const admitidos = postulaciones.filter((p) => p.estado === 'ADMITIDA');
  const conteo = new Map<string, number>();
  for (const p of admitidos) {
    const k = (p[dim] ?? 'Sin especificar') as string;
    conteo.set(k, (conteo.get(k) ?? 0) + 1);
  }
  const total = admitidos.length || 1;
  return [...conteo.entries()]
    .map(([clave, n]) => ({ clave, total: n, pct: Math.round((n / total) * 100) }))
    .sort((a, b) => b.total - a.total);
}

export interface ProgresoEvaluacion {
  evaluados: number;
  totales: number;
  pct: number;
}

export function progresoEvaluacion(completadas: number, totalAdmitidos: number): ProgresoEvaluacion {
  return {
    evaluados: completadas,
    totales: totalAdmitidos,
    pct: totalAdmitidos > 0 ? Math.round((completadas / totalAdmitidos) * 100) : 0,
  };
}

export interface FeriaCerradaMetrica {
  ventasReportadas?: string | null;
  publicoEstimado?: string | null;
}

export interface MetricasNarrativas {
  feriasRealizadas: number;
  emprendedoresParticipantes: number;
  // Ventas: dato NARRATIVO (autoreportado), nunca cifra dura de ranking.
  ventasReportadas: string[];
  publicoEstimado: string[];
}

export function metricasNarrativas(feriasCerradas: FeriaCerradaMetrica[], emprendedoresUnicos: number): MetricasNarrativas {
  return {
    feriasRealizadas: feriasCerradas.length,
    emprendedoresParticipantes: emprendedoresUnicos,
    ventasReportadas: feriasCerradas.map((f) => f.ventasReportadas).filter((v): v is string => !!v),
    publicoEstimado: feriasCerradas.map((f) => f.publicoEstimado).filter((v): v is string => !!v),
  };
}

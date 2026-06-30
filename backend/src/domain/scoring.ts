/**
 * Motor de scoring de Ferias — funciones puras.
 *
 * Doble score:
 *  - Score de DESEMPEÑO (reputación acumulada): persistente en el perfil.
 *  - Score de POSTULACIÓN (admisión): efímero, por feria.
 *
 * La perilla (pesoProp / pesoRep) combina ambos y resuelve el caso del novato:
 * un emprendedor con rep 0 puede entrar a una feria que pondere alto la propuesta.
 */

export interface ParametrosCombinado {
  scorePropuesta: number; // 0..100, fit de la propuesta con la feria
  repScore: number; // 0..100, reputación acumulada
  pesoProp: number; // 0..100
  pesoRep: number; // 0..100 (pesoProp + pesoRep deberían sumar 100)
}

export interface DesgloseScore {
  total: number;
  aportePropuesta: number;
  aporteReputacion: number;
}

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

/** Score combinado de admisión, con desglose visible (cada admisión defendible). */
export function desgloseCombinado(p: ParametrosCombinado): DesgloseScore {
  const sumaPesos = p.pesoProp + p.pesoRep || 1;
  const prop = clamp(p.scorePropuesta);
  const rep = clamp(p.repScore);
  const aportePropuesta = (prop * p.pesoProp) / sumaPesos;
  const aporteReputacion = (rep * p.pesoRep) / sumaPesos;
  return {
    total: Math.round(aportePropuesta + aporteReputacion),
    aportePropuesta: Math.round(aportePropuesta),
    aporteReputacion: Math.round(aporteReputacion),
  };
}

export const scoreCombinado = (p: ParametrosCombinado): number => desgloseCombinado(p).total;

export interface PostulacionRankeable {
  id: string;
  scorePropuesta: number;
  repScore: number;
}

export interface FilaRanking extends DesgloseScore {
  id: string;
  rank: number;
  sugerido: 'admitir' | 'lista_espera';
}

/**
 * Ordena postulaciones por score combinado y marca el corte por cupos.
 * Recalculable en vivo al mover la perilla.
 */
export function rankear(
  postulaciones: PostulacionRankeable[],
  pesoProp: number,
  pesoRep: number,
  cupos: number,
): FilaRanking[] {
  return postulaciones
    .map((p) => ({ id: p.id, ...desgloseCombinado({ scorePropuesta: p.scorePropuesta, repScore: p.repScore, pesoProp, pesoRep }) }))
    .sort((a, b) => b.total - a.total || b.aportePropuesta - a.aportePropuesta)
    .map((row, i) => ({
      ...row,
      rank: i + 1,
      sugerido: i < cupos ? ('admitir' as const) : ('lista_espera' as const),
    }));
}

// ───────────────────────────────────────────────────────────────────────────
//  Score de DESEMPEÑO — actualización por las 3 capas de evaluación
// ───────────────────────────────────────────────────────────────────────────

export interface EntradaEvento {
  /** Capa 1 (cumplimiento): mapa item→cumplido. Es el PISO del puntaje. */
  cumplimiento: Record<string, boolean>;
  /** Capa 2 (comercial autoreportada): ¿participó? Señal de participación, NO ventas. */
  participo: boolean;
  /** Capa 3 (calidad): estrellas 1..5, opcional. Acelera/frena. */
  calidadEstrellas?: number | null;
}

/** Puntaje 0..100 que una feria aporta al desempeño del emprendedor. */
export function puntajeEvento(e: EntradaEvento): number {
  const items = Object.values(e.cumplimiento);
  const total = items.length || 1;
  const cumplidos = items.filter(Boolean).length;
  const ratio = cumplidos / total; // piso de cumplimiento (capa 1)

  let puntaje = ratio * 100;

  // Capa 2: la no-participación (no presentarse pese a ser admitido) penaliza fuerte.
  // La participación NO suma por cifra de ventas (autoreportada, inflable).
  if (!e.participo) puntaje *= 0.5;

  // Capa 3: calidad acelera o frena en torno a un punto neutro (3 estrellas).
  if (e.calidadEstrellas != null) puntaje += (e.calidadEstrellas - 3) * 5;

  return Math.round(clamp(puntaje));
}

export interface EstadoReputacion {
  repScore: number;
  feriasCumplidas: number;
  feriasTotales: number;
}

/** El cumplimiento es "total" cuando todos los ítems de la capa 1 están marcados. */
export const cumplioPiso = (cumplimiento: Record<string, boolean>): boolean => {
  const items = Object.values(cumplimiento);
  return items.length > 0 && items.every(Boolean);
};

/**
 * Integra el puntaje de un evento al desempeño acumulado (media móvil).
 * Devuelve el nuevo estado de reputación del emprendedor.
 */
export function actualizarReputacion(actual: EstadoReputacion, evento: EntradaEvento): EstadoReputacion {
  const puntaje = puntajeEvento(evento);
  const totales = actual.feriasTotales + 1;
  const repScore = Math.round((actual.repScore * actual.feriasTotales + puntaje) / totales);
  return {
    repScore: clamp(repScore),
    feriasTotales: totales,
    feriasCumplidas: actual.feriasCumplidas + (cumplioPiso(evento.cumplimiento) ? 1 : 0),
  };
}

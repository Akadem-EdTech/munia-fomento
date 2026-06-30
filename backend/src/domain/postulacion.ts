/**
 * Score de POSTULACIÓN (admisión) a partir de las respuestas al bloque
 * configurable. Sólo las preguntas marcadas como puntuables nutren el score,
 * ponderadas por su peso. Transparente y testeable.
 */

export type TipoPregunta = 'TEXTO' | 'SELECCION' | 'NUMERO' | 'SINO' | 'ADJUNTO';

export interface PreguntaPuntuable {
  id: string;
  tipo: TipoPregunta;
  puntuable: boolean;
  peso: number;
  opciones?: string[];
}

export interface RespuestaCruda {
  preguntaId: string;
  valor?: string | null;
}

/** Calidad 0..1 de una respuesta según el tipo de pregunta. */
export function calidadRespuesta(p: PreguntaPuntuable, valor: string | null | undefined): number {
  const v = (valor ?? '').trim();
  switch (p.tipo) {
    case 'SINO':
      return /^s[ií]$|^true$|^1$/i.test(v) ? 1 : 0;
    case 'TEXTO':
      if (v.length === 0) return 0;
      return v.length >= 20 ? 1 : 0.5; // una respuesta desarrollada vale más
    case 'SELECCION': {
      if (!v || !p.opciones?.length) return v ? 1 : 0;
      const idx = p.opciones.findIndex((o) => o === v);
      if (idx < 0) return 0;
      // La primera opción se considera la más favorable; decae linealmente.
      return p.opciones.length === 1 ? 1 : 1 - idx / (p.opciones.length - 1);
    }
    case 'NUMERO':
      return v.length > 0 && !Number.isNaN(Number(v)) ? 1 : 0;
    case 'ADJUNTO':
      return v.length > 0 ? 1 : 0;
  }
}

/**
 * Score de propuesta 0..100. Suma ponderada de la calidad de cada respuesta
 * puntuable. Si no hay preguntas puntuables, devuelve un neutro (50) para no
 * castigar ferias sin formulario.
 */
export function scorePropuesta(preguntas: PreguntaPuntuable[], respuestas: RespuestaCruda[]): number {
  const puntuables = preguntas.filter((p) => p.puntuable && p.peso > 0);
  if (puntuables.length === 0) return 50;
  const mapa = new Map(respuestas.map((r) => [r.preguntaId, r.valor]));
  const pesoTotal = puntuables.reduce((s, p) => s + p.peso, 0);
  const aporte = puntuables.reduce((s, p) => s + p.peso * calidadRespuesta(p, mapa.get(p.id)), 0);
  return Math.round((aporte / pesoTotal) * 100);
}

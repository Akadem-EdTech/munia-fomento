/**
 * Match de fondos contra el perfil del emprendedor — puro y testeable.
 * Principio: NO mostrar fondos para los que no califica.
 */

export interface PerfilMatch {
  rubroCodigo?: string | null;
  etapa?: string | null;
  genero?: string | null;
  localidad?: string | null;
  documentos: string[];
}

export interface CriteriosMatch {
  rubros?: string[];
  etapa?: string[];
  genero?: string[];
  localidad?: string[];
}

export type Compatibilidad = 'alta' | 'media' | 'no';

/**
 * Compatibilidad del perfil con los criterios del fondo.
 * 'no' = no califica (constraint dura incumplida) → no se le muestra.
 */
export function compatibilidad(perfil: PerfilMatch, criterios: CriteriosMatch): Compatibilidad {
  const rubros = criterios.rubros ?? [];
  const generos = criterios.genero ?? [];
  // Constraints duras: rubro elegible y género (cuando el fondo lo exige).
  if (rubros.length && (!perfil.rubroCodigo || !rubros.includes(perfil.rubroCodigo))) return 'no';
  if (generos.length && (!perfil.genero || !generos.includes(perfil.genero))) return 'no';
  // Etapa: blanda. Si calza (o no hay restricción) → alta; si no → media.
  const etapas = criterios.etapa ?? [];
  const calzaEtapa = etapas.length === 0 || (!!perfil.etapa && etapas.includes(perfil.etapa));
  return calzaEtapa ? 'alta' : 'media';
}

export interface RequisitoDef {
  clave: string;
  etiqueta: string;
  campoPerfil?: string | null; // "documentos:Inicio actividades" | "localidad" | "genero" | null
}

export interface RequisitoCheck {
  clave: string;
  etiqueta: string;
  /** true=cumple, false=falta, null=no verificable automáticamente (manual). */
  cumple: boolean | null;
}

const tieneDoc = (docs: string[], frag: string) => docs.some((d) => d.toLowerCase().includes(frag.toLowerCase()));

/** Evalúa cada requisito contra el perfil ("cumples 2 de 4"). */
export function requisitosCheck(perfil: PerfilMatch, requisitos: RequisitoDef[]): { items: RequisitoCheck[]; cumplidos: number; verificables: number } {
  const items = requisitos.map((r): RequisitoCheck => {
    const campo = r.campoPerfil ?? null;
    let cumple: boolean | null = null;
    if (campo?.startsWith('documentos:')) cumple = tieneDoc(perfil.documentos, campo.split(':')[1]);
    else if (campo === 'localidad') cumple = !!perfil.localidad;
    else if (campo === 'genero') cumple = !!perfil.genero;
    return { clave: r.clave, etiqueta: r.etiqueta, cumple };
  });
  const verificables = items.filter((i) => i.cumple !== null).length;
  const cumplidos = items.filter((i) => i.cumple === true).length;
  return { items, cumplidos, verificables };
}

// ───────────────────────────────────────────────────────────────────────────
//  Match por intención (motor del asistente mock)
// ───────────────────────────────────────────────────────────────────────────

export interface FondoIndexable {
  id: string;
  nombre: string;
  descripcion?: string | null;
  organismo: string;
  criterios: CriteriosMatch;
}

const PALABRAS_VACIAS = new Set(['de', 'la', 'el', 'y', 'un', 'una', 'para', 'que', 'con', 'mi', 'me', 'necesito', 'tengo', 'quiero', 'comprar', 'los', 'las', 'en', 'a', 'es']);

const tokenizar = (t: string): string[] =>
  t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !PALABRAS_VACIAS.has(w));

/**
 * Puntúa qué tan bien un fondo responde a la consulta en lenguaje natural,
 * combinando solape de palabras con la compatibilidad del perfil.
 */
export function scoreIntencion(consulta: string, fondo: FondoIndexable, perfil: PerfilMatch): number {
  const compat = compatibilidad(perfil, fondo.criterios);
  if (compat === 'no') return 0;
  const tokens = tokenizar(consulta);
  const texto = `${fondo.nombre} ${fondo.descripcion ?? ''} ${fondo.organismo}`.toLowerCase();
  const solape = tokens.filter((t) => texto.includes(t)).length;
  const baseCompat = compat === 'alta' ? 2 : 1;
  return solape * 3 + baseCompat;
}

/** Mejor fondo para una consulta (o null si ninguno califica). */
export function mejorFondo(consulta: string, fondos: FondoIndexable[], perfil: PerfilMatch): { fondo: FondoIndexable; score: number } | null {
  const rank = fondos.map((fondo) => ({ fondo, score: scoreIntencion(consulta, fondo, perfil) })).filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
  return rank[0] ?? null;
}

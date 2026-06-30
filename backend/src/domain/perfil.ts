/**
 * Completitud del perfil del emprendedor — motor de auto-mantención.
 * Indicar qué falta (con el porqué) incentiva a mantener el dato vivo: es lo
 * que hace que el registro se aprecie en vez de morir. Lógica pura y testeable.
 */

export interface PerfilParaCompletitud {
  nombreEmprendimiento?: string | null;
  descripcion?: string | null;
  telefono?: string | null;
  localidad?: string | null;
  rubroId?: string | null;
  etapa?: string | null;
  documentos: string[];
}

export interface ItemCompletitud {
  key: string;
  label: string;
  hecho: boolean;
  /** Por qué conviene completarlo (la zanahoria, no el palo). */
  hint: string;
}

export interface Completitud {
  porcentaje: number; // 0..100
  completos: number;
  total: number;
  items: ItemCompletitud[];
  /** Lo siguiente más útil por hacer (primer item pendiente). */
  siguiente: ItemCompletitud | null;
}

const tieneDoc = (docs: string[], frag: string) =>
  docs.some((d) => d.toLowerCase().includes(frag.toLowerCase()));

export function calcularCompletitud(p: PerfilParaCompletitud): Completitud {
  const items: ItemCompletitud[] = [
    { key: 'nombre', label: 'Nombre del emprendimiento', hecho: !!p.nombreEmprendimiento, hint: 'Es cómo te verán en las ferias.' },
    { key: 'descripcion', label: 'Describe tu emprendimiento', hecho: !!p.descripcion && p.descripcion.trim().length >= 10, hint: 'Una buena descripción mejora tu postulación.' },
    { key: 'rubro', label: 'Selecciona tu rubro', hecho: !!p.rubroId, hint: 'Te mostramos las ferias y fondos que calzan contigo.' },
    { key: 'localidad', label: 'Indica tu localidad', hecho: !!p.localidad, hint: 'Algunos fondos priorizan por sector.' },
    { key: 'telefono', label: 'Agrega un teléfono de contacto', hecho: !!p.telefono, hint: 'Para avisarte de cupos y resultados.' },
    { key: 'etapa', label: 'Indica la etapa de tu emprendimiento', hecho: !!p.etapa, hint: 'Hay fondos pensados para cada etapa.' },
    { key: 'inicio_actividades', label: 'Registra tu inicio de actividades', hecho: tieneDoc(p.documentos, 'inicio'), hint: 'Es requisito de la mayoría de los fondos.' },
    { key: 'res_sanitaria', label: 'Agrega tu resolución sanitaria', hecho: tieneDoc(p.documentos, 'sanitaria'), hint: 'Te habilita para postular a más ferias de alimentos.' },
  ];
  const completos = items.filter((i) => i.hecho).length;
  return {
    porcentaje: Math.round((completos / items.length) * 100),
    completos,
    total: items.length,
    items,
    siguiente: items.find((i) => !i.hecho) ?? null,
  };
}

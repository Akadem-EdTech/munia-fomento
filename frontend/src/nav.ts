import type { IconName } from './components/Icon';
import type { Modulo, UsuarioActual } from './types';
import { tieneModulo } from './auth/auth';

export interface Seccion {
  key: string;
  label: string;
  icon: IconName;
}

export interface ModuloDef {
  id: Modulo;
  label: string;
  desc: string;
  icon: IconName;
  accentVar: string; // variable CSS del acento del módulo
  /** Navegación espejo: misma materia, cara distinta según quién entra. */
  emprendedor: Seccion[];
  municipio: Seccion[];
}

export const MODULOS: ModuloDef[] = [
  {
    id: 'FERIAS',
    label: 'Ferias',
    desc: 'Postula, vende y construye tu reputación feria a feria.',
    icon: 'feria',
    accentVar: 'var(--mod-ferias)',
    emprendedor: [
      { key: 'abiertas', label: 'Ferias abiertas', icon: 'feria' },
      { key: 'postulaciones', label: 'Mis postulaciones', icon: 'postul' },
      { key: 'reportar', label: 'Reportar feria', icon: 'doc' },
    ],
    municipio: [
      { key: 'panel', label: 'Panel', icon: 'dash' },
      { key: 'ferias', label: 'Ferias', icon: 'feria' },
      { key: 'seleccion', label: 'Selección', icon: 'postul' },
      { key: 'emprendedores', label: 'Emprendedores', icon: 'empr' },
      { key: 'evaluacion', label: 'Evaluación en terreno', icon: 'eval' },
      { key: 'dashboards', label: 'Dashboards', icon: 'chart' },
    ],
  },
  {
    id: 'CAPACITACION',
    label: 'Capacitación',
    desc: 'Inscríbete a cursos y obtén certificados.',
    icon: 'cap',
    accentVar: 'var(--mod-cap)',
    emprendedor: [
      { key: 'cursos', label: 'Cursos disponibles', icon: 'cap' },
      { key: 'inscripciones', label: 'Mis inscripciones', icon: 'postul' },
      { key: 'certificados', label: 'Mis certificados', icon: 'award' },
    ],
    municipio: [
      { key: 'cursos', label: 'Cursos', icon: 'cap' },
      { key: 'inscripciones', label: 'Inscripciones', icon: 'users' },
      { key: 'asistencia', label: 'Asistencia', icon: 'check' },
      { key: 'dashboard', label: 'Dashboard formación', icon: 'chart' },
    ],
  },
  {
    id: 'FONDOS',
    label: 'Fondos',
    desc: 'Descubre y postula a fondos que calzan con tu perfil.',
    icon: 'money',
    accentVar: 'var(--mod-fondos)',
    emprendedor: [
      { key: 'descubrir', label: 'Descubrir fondos', icon: 'compass' },
      { key: 'asistente', label: 'Asistente con IA', icon: 'sparkle' },
      { key: 'postulaciones', label: 'Mis postulaciones', icon: 'postul' },
    ],
    municipio: [
      { key: 'convocatorias', label: 'Convocatorias', icon: 'money' },
      { key: 'evaluar', label: 'Evaluar postulaciones', icon: 'eval' },
      { key: 'adjudicacion', label: 'Adjudicación', icon: 'award' },
      { key: 'dashboard', label: 'Dashboard fondos', icon: 'chart' },
    ],
  },
];

export const getModulo = (id: string): ModuloDef | undefined => MODULOS.find((m) => m.id === id);

/** Secciones visibles para el usuario en un módulo (según su cara). */
export function seccionesDe(modulo: ModuloDef, u: UsuarioActual | null): Seccion[] {
  if (!u) return [];
  return u.tipo === 'EMPRENDEDOR' ? modulo.emprendedor : modulo.municipio;
}

/** Módulos que el usuario puede ver en el hub. */
export function modulosVisibles(u: UsuarioActual | null): { def: ModuloDef; habilitado: boolean }[] {
  if (!u) return [];
  const activos = u.tenant.modulosActivos;
  return MODULOS.filter((m) => activos.includes(m.id)).map((def) => ({
    def,
    // El emprendedor ve todos los módulos activos; el funcionario sólo los asignados.
    habilitado: u.tipo === 'EMPRENDEDOR' ? true : tieneModulo(u, def.id),
  }));
}

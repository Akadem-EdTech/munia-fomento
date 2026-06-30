export type Modulo = 'FERIAS' | 'CAPACITACION' | 'FONDOS';
export type RolFuncionario = 'ADMINISTRADOR' | 'EVALUADOR' | 'JEFATURA';
export type TipoUsuario = 'EMPRENDEDOR' | 'FUNCIONARIO';
export type EstadoUsuario = 'ACTIVO' | 'INVITADO' | 'SUSPENDIDO';

export interface UsuarioActual {
  id: string;
  nombre: string;
  email: string;
  tipo: TipoUsuario;
  estado: EstadoUsuario;
  funcionario: { rol: RolFuncionario; cargo: string | null; modulos: Modulo[] } | null;
  emprendedor: { id: string; nombreEmprendimiento: string; repScore: number } | null;
  tenant: { slug: string; nombre: string; logoUrl: string | null; colorAccent: string | null; modulosActivos: Modulo[] };
}

export interface ItemCompletitud { key: string; label: string; hecho: boolean; hint: string; }
export interface Completitud { porcentaje: number; completos: number; total: number; items: ItemCompletitud[]; siguiente: ItemCompletitud | null; }

export interface InicioEmprendedor {
  emprendedor: { nombre: string; repScore: number; feriasCumplidas: number; feriasTotales: number; esNovato: boolean; estadoTexto: string };
  completitud: Completitud;
  feriasAbiertas: { id: string; nombre: string; fecha: string | null; ubicacion: string | null; pesoProp: number; pesoRep: number }[];
  reportesPendientes: { id: string; nombre: string }[];
}

export interface PerfilEmprendedor {
  id: string;
  nombreEmprendimiento: string;
  descripcion: string | null;
  telefono: string | null;
  localidad: string | null;
  rubroId: string | null;
  etapa: string | null;
  repScore: number;
  feriasCumplidas: number;
  feriasTotales: number;
  documentos: string[];
  consentVersion: string | null;
  consentFecha: string | null;
  rubro: { id: string; alias: string } | null;
  usuario: { nombre: string; email: string; rut: string | null };
  tenant: { consentVersion: string };
}

export interface SolicitudArco { id: string; tipo: string; estado: string; detalle: string | null; createdAt: string; resueltaAt: string | null; }
export interface Rubro { id: string; alias: string; color: string; }

// ── Ferias ──────────────────────────────────────────────────────────────
export interface FeriaAbierta { id: string; nombre: string; objetivo: string | null; fecha: string | null; ubicacion: string | null; cupos: number; criterio: string; rubros: string[]; yaPostulada: string | null; }
export interface PreguntaFeria { id: string; texto: string; tipo: 'TEXTO' | 'SELECCION' | 'NUMERO' | 'SINO' | 'ADJUNTO'; opciones: string[]; }
export interface FeriaDetalle { id: string; nombre: string; objetivo: string | null; fecha: string | null; ubicacion: string | null; estado: string; criterio: string; rubros: string[]; preguntas: PreguntaFeria[]; miPostulacion: { id: string; estado: string } | null; }
export interface MiPostulacion { id: string; feriaId: string; estado: string; scorePropuesta: number; createdAt: string; feria: { nombre: string; fecha: string | null; ubicacion: string | null; estado: string }; }
export interface FeriaGestion { id: string; nombre: string; estado: string; fecha: string | null; ubicacion: string | null; cupos: number; pesoProp: number; pesoRep: number; postulados: number; rubros: string[]; }
export interface FilaRanking {
  postulacionId: string; rank: number; sugerido: 'admitir' | 'lista_espera'; estado: string;
  total: number; aportePropuesta: number; aporteReputacion: number; scorePropuesta: number;
  emprendedor: { nombre: string; emprendimiento: string; repScore: number; conf: string; rubro?: string; esNovato: boolean };
}
export interface SeleccionData { feria: { id: string; nombre: string; cupos: number; pesoProp: number; pesoRep: number; estado: string }; perilla: { pesoProp: number; pesoRep: number }; ranking: FilaRanking[]; }
export interface EmprendedorReg { id: string; nombreEmprendimiento: string; repScore: number; feriasCumplidas: number; feriasTotales: number; localidad: string | null; rubro: { alias: string; codigoMaestro: string } | null; usuario: { nombre: string }; }
export interface ItemCumpl { k: string; txt: string; sub: string; }
export interface FilaEval { emprendedorId: string; nombre: string; emprendimiento: string; cumplimiento: Record<string, boolean>; calidadEstrellas: number | null; completada: boolean; autoreporte: { participo: boolean; ventas: number | null } | null; }
export interface EvaluacionData { feria: { id: string; nombre: string; estado: string }; items: ItemCumpl[]; lista: FilaEval[]; progreso: { evaluados: number; totales: number }; }
export interface DashboardsFerias {
  operativo: null | { feria: string; postulados: number; admitidos: number; pendientes: number; listaEspera: number; cupos: number; cuposUsadosPct: number };
  territorialRubro: null | { clave: string; total: number; pct: number }[];
  narrativo: { feriasRealizadas: number; emprendedoresParticipantes: number; ventasReportadas: string[]; publicoEstimado: string[] };
}

// ── Capacitación ────────────────────────────────────────────────────────
export interface CursoDisponible { id: string; nombre: string; descripcion: string | null; modalidad: 'PRESENCIAL' | 'ONLINE'; cupos: number; rubro: string | null; inscritos: number; ocupacion: number; miEstado: string | null; }
export interface MiInscripcion { id: string; estado: string; curso: { nombre: string; modalidad: string; fechaInicio: string | null }; }
export interface MiCertificado { id: string; emitidoAt: string; curso: { nombre: string; modalidad: string }; }
export interface CursoGestion { id: string; nombre: string; modalidad: string; cupos: number; rubro: string | null; inscritos: number; certificados: number; sesiones: number; }
export interface SesionCurso { id: string; titulo: string | null; orden: number; }
export interface InscritoCurso { emprendedorId: string; nombre: string; emprendimiento: string; estado: string; asistio: number; certificado: boolean; }
export interface DashboardCapacitacion { cursosDictados: number; emprendedoresFormados: number; certificadosEmitidos: number; tasaAsistencia: number; masDemandados: { nombre: string; inscritos: number; cupos: number }[]; }

export interface Notificacion { id: string; evento: string; titulo: string; cuerpo: string; leida: boolean; createdAt: string; }
export interface PlantillaNotif { id: string; evento: string; canal: string; asunto: string; cuerpo: string; activa: boolean; variables: string[]; }

export interface Funcionario {
  id: string;
  nombre: string;
  email: string;
  estado: EstadoUsuario;
  createdAt: string;
  ultimoAcceso: string | null;
  funcionario: { cargo: string | null; rol: RolFuncionario; modulos: Modulo[] } | null;
}

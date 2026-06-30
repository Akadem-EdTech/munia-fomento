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

export interface Funcionario {
  id: string;
  nombre: string;
  email: string;
  estado: EstadoUsuario;
  createdAt: string;
  ultimoAcceso: string | null;
  funcionario: { cargo: string | null; rol: RolFuncionario; modulos: Modulo[] } | null;
}

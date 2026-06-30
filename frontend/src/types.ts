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

export interface Funcionario {
  id: string;
  nombre: string;
  email: string;
  estado: EstadoUsuario;
  createdAt: string;
  ultimoAcceso: string | null;
  funcionario: { cargo: string | null; rol: RolFuncionario; modulos: Modulo[] } | null;
}

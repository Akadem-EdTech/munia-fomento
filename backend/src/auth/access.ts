import type { RolFuncionario, Modulo, TipoUsuario, EstadoUsuario } from '@prisma/client';

/**
 * Control de acceso por ROL × MÓDULO. Lógica pura, sin BD, para poder testear
 * exhaustivamente la matriz. El principio rector: el acceso se asigna.
 *
 * Reglas clave:
 *  - El ADMINISTRADOR NO es superusuario transversal: sólo accede a los módulos
 *    que tiene asignados (un "Encargado de Fondos" admin sólo ve Fondos).
 *  - La asignación de módulos gobierna a TODOS los roles de funcionario.
 *  - La gestión de usuarios ("Administración del sistema") es sólo del ADMINISTRADOR
 *    y no depende de un módulo de negocio.
 */

export interface Principal {
  usuarioId: string;
  tenantId: string;
  tipo: TipoUsuario;
  estado: EstadoUsuario;
  /** Presente sólo cuando tipo = FUNCIONARIO */
  funcionario?: { rol: RolFuncionario; modulos: Modulo[] };
  /** Presente sólo cuando tipo = EMPRENDEDOR */
  emprendedorId?: string;
}

export interface Requisito {
  /** Restringe el tipo de usuario (EMPRENDEDOR / FUNCIONARIO). */
  tipo?: TipoUsuario;
  /** Roles de funcionario permitidos (any-of). */
  roles?: RolFuncionario[];
  /** Módulo requerido: el funcionario debe tenerlo en su asignación. */
  modulo?: Modulo;
}

export interface Decision {
  ok: boolean;
  motivo?: string;
  code?: string;
}

const OK: Decision = { ok: true };

export function evaluarAcceso(p: Principal | null | undefined, req: Requisito): Decision {
  if (!p) return { ok: false, motivo: 'No autenticado', code: 'unauthorized' };
  if (p.estado !== 'ACTIVO') return { ok: false, motivo: 'Tu cuenta no está activa', code: 'inactive' };

  if (req.tipo && p.tipo !== req.tipo) {
    return { ok: false, motivo: 'Esta sección no corresponde a tu tipo de cuenta', code: 'forbidden' };
  }

  // Requisitos de funcionario (rol y/o módulo)
  const requiereFuncionario = !!req.roles?.length || !!req.modulo;
  if (requiereFuncionario) {
    if (p.tipo !== 'FUNCIONARIO' || !p.funcionario) {
      return { ok: false, motivo: 'Acceso reservado a funcionarios municipales', code: 'forbidden' };
    }
    if (req.roles?.length && !req.roles.includes(p.funcionario.rol)) {
      return { ok: false, motivo: 'Tu rol no permite esta acción', code: 'forbidden_role' };
    }
    if (req.modulo && !p.funcionario.modulos.includes(req.modulo)) {
      return { ok: false, motivo: 'No tienes acceso a este módulo', code: 'forbidden_module' };
    }
  }

  return OK;
}

export const tieneAcceso = (p: Principal | null | undefined, req: Requisito): boolean =>
  evaluarAcceso(p, req).ok;

/** Atajos de uso común. */
export const soloAdmin: Requisito = { roles: ['ADMINISTRADOR'] };
export const soloEmprendedor: Requisito = { tipo: 'EMPRENDEDOR' };
/** Operar (no sólo leer) un módulo: admin con ese módulo asignado. */
export const operarModulo = (modulo: Modulo): Requisito => ({ roles: ['ADMINISTRADOR'], modulo });
/** Ver dashboards de un módulo: cualquier rol de funcionario con el módulo asignado. */
export const verModulo = (modulo: Modulo): Requisito => ({ modulo });
/** Evaluar en un módulo: evaluador (o admin) con el módulo asignado. */
export const evaluarEnModulo = (modulo: Modulo): Requisito => ({ roles: ['ADMINISTRADOR', 'EVALUADOR'], modulo });

import { describe, it, expect } from 'vitest';
import { evaluarAcceso, tieneAcceso, operarModulo, verModulo, evaluarEnModulo, soloAdmin, soloEmprendedor, type Principal } from './access.js';

const emprendedor: Principal = { usuarioId: 'e1', tenantId: 't1', tipo: 'EMPRENDEDOR', estado: 'ACTIVO', emprendedorId: 'emp1' };
const adminTodos: Principal = { usuarioId: 'a1', tenantId: 't1', tipo: 'FUNCIONARIO', estado: 'ACTIVO', funcionario: { rol: 'ADMINISTRADOR', modulos: ['FERIAS', 'CAPACITACION', 'FONDOS'] } };
const adminSoloFondos: Principal = { usuarioId: 'a2', tenantId: 't1', tipo: 'FUNCIONARIO', estado: 'ACTIVO', funcionario: { rol: 'ADMINISTRADOR', modulos: ['FONDOS'] } };
const evaluadorFerias: Principal = { usuarioId: 'v1', tenantId: 't1', tipo: 'FUNCIONARIO', estado: 'ACTIVO', funcionario: { rol: 'EVALUADOR', modulos: ['FERIAS'] } };
const jefatura: Principal = { usuarioId: 'j1', tenantId: 't1', tipo: 'FUNCIONARIO', estado: 'ACTIVO', funcionario: { rol: 'JEFATURA', modulos: ['FERIAS', 'CAPACITACION', 'FONDOS'] } };

describe('control de acceso — base', () => {
  it('rechaza anónimo', () => {
    expect(evaluarAcceso(null, {})).toMatchObject({ ok: false, code: 'unauthorized' });
  });
  it('rechaza cuenta no activa', () => {
    expect(evaluarAcceso({ ...emprendedor, estado: 'SUSPENDIDO' }, {})).toMatchObject({ ok: false, code: 'inactive' });
    expect(evaluarAcceso({ ...evaluadorFerias, estado: 'INVITADO' }, {})).toMatchObject({ ok: false, code: 'inactive' });
  });
  it('permite a cualquier activo cuando no hay requisito', () => {
    expect(tieneAcceso(emprendedor, {})).toBe(true);
    expect(tieneAcceso(adminTodos, {})).toBe(true);
  });
});

describe('control de acceso — tipo de usuario', () => {
  it('soloEmprendedor excluye funcionarios', () => {
    expect(tieneAcceso(emprendedor, soloEmprendedor)).toBe(true);
    expect(tieneAcceso(adminTodos, soloEmprendedor)).toBe(false);
  });
  it('un emprendedor no puede operar módulos de gestión', () => {
    expect(tieneAcceso(emprendedor, operarModulo('FERIAS'))).toBe(false);
    expect(evaluarAcceso(emprendedor, soloAdmin)).toMatchObject({ ok: false, code: 'forbidden' });
  });
});

describe('control de acceso — rol × módulo', () => {
  it('gestión de usuarios es sólo del administrador', () => {
    expect(tieneAcceso(adminTodos, soloAdmin)).toBe(true);
    expect(tieneAcceso(adminSoloFondos, soloAdmin)).toBe(true);
    expect(tieneAcceso(evaluadorFerias, soloAdmin)).toBe(false);
    expect(tieneAcceso(jefatura, soloAdmin)).toBe(false);
  });

  it('el admin NO es superusuario transversal: sólo sus módulos asignados', () => {
    expect(tieneAcceso(adminTodos, operarModulo('FERIAS'))).toBe(true);
    // admin "Encargado de Fondos": opera Fondos pero NO Ferias
    expect(tieneAcceso(adminSoloFondos, operarModulo('FONDOS'))).toBe(true);
    expect(evaluarAcceso(adminSoloFondos, operarModulo('FERIAS'))).toMatchObject({ ok: false, code: 'forbidden_module' });
  });

  it('operar un módulo requiere rol administrador', () => {
    expect(evaluarAcceso(evaluadorFerias, operarModulo('FERIAS'))).toMatchObject({ ok: false, code: 'forbidden_role' });
    expect(evaluarAcceso(jefatura, operarModulo('FERIAS'))).toMatchObject({ ok: false, code: 'forbidden_role' });
  });

  it('evaluar requiere rol evaluador o admin con el módulo asignado', () => {
    expect(tieneAcceso(evaluadorFerias, evaluarEnModulo('FERIAS'))).toBe(true);
    expect(tieneAcceso(adminTodos, evaluarEnModulo('FERIAS'))).toBe(true);
    expect(tieneAcceso(jefatura, evaluarEnModulo('FERIAS'))).toBe(false);
    // evaluador de Ferias no puede evaluar en Fondos (módulo no asignado)
    expect(evaluarAcceso(evaluadorFerias, evaluarEnModulo('FONDOS'))).toMatchObject({ ok: false, code: 'forbidden_module' });
  });

  it('ver dashboards de un módulo: cualquier funcionario con el módulo', () => {
    expect(tieneAcceso(jefatura, verModulo('FERIAS'))).toBe(true);
    expect(tieneAcceso(evaluadorFerias, verModulo('FERIAS'))).toBe(true);
    expect(tieneAcceso(adminSoloFondos, verModulo('FERIAS'))).toBe(false);
    // un emprendedor nunca accede a dashboards de gestión
    expect(tieneAcceso(emprendedor, verModulo('FERIAS'))).toBe(false);
  });
});

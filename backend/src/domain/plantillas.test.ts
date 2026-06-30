import { describe, it, expect } from 'vitest';
import { renderPlantilla } from './plantillas.js';

describe('render de plantillas', () => {
  it('reemplaza variables conocidas', () => {
    expect(renderPlantilla('Hola {nombre}, fuiste admitido en {feria}', { nombre: 'María', feria: 'Expo Vendimia' }))
      .toBe('Hola María, fuiste admitido en Expo Vendimia');
  });
  it('deja el literal si falta la variable (el admin lo nota)', () => {
    expect(renderPlantilla('Hola {nombre}, {feria}', { nombre: 'Ana' })).toBe('Hola Ana, {feria}');
  });
  it('soporta números y múltiples ocurrencias', () => {
    expect(renderPlantilla('{n} y {n} = {fecha}', { n: 2, fecha: 'hoy' })).toBe('2 y 2 = hoy');
  });
  it('no rompe sin variables', () => {
    expect(renderPlantilla('Texto fijo', {})).toBe('Texto fijo');
  });
});

import { describe, it, expect } from 'vitest';
import { calcularCompletitud } from './perfil.js';

describe('completitud de perfil', () => {
  it('perfil recién registrado (novato) no está vacío ni completo', () => {
    const c = calcularCompletitud({ nombreEmprendimiento: 'TechAgro', documentos: ['Inicio actividades'] });
    expect(c.porcentaje).toBeGreaterThan(0);
    expect(c.porcentaje).toBeLessThan(100);
    expect(c.siguiente).not.toBeNull();
  });

  it('señala el siguiente paso más útil', () => {
    const c = calcularCompletitud({ nombreEmprendimiento: 'X', documentos: [] });
    expect(c.siguiente?.key).toBe('descripcion');
    expect(c.siguiente?.hint).toContain('postulación');
  });

  it('detecta documentos por fragmento (resolución sanitaria, inicio)', () => {
    const c = calcularCompletitud({ nombreEmprendimiento: 'X', documentos: ['Resolución sanitaria', 'Inicio actividades'] });
    expect(c.items.find((i) => i.key === 'res_sanitaria')?.hecho).toBe(true);
    expect(c.items.find((i) => i.key === 'inicio_actividades')?.hecho).toBe(true);
  });

  it('perfil completo llega a 100%', () => {
    const c = calcularCompletitud({
      nombreEmprendimiento: 'Delicias', descripcion: 'Mermeladas artesanales de fruta', rubroId: 'r1',
      localidad: 'Centro', telefono: '+56 9 1234 5678', etapa: 'consolidado',
      documentos: ['Inicio actividades', 'Resolución sanitaria'],
    });
    expect(c.porcentaje).toBe(100);
    expect(c.siguiente).toBeNull();
  });

  it('descripción demasiado corta no cuenta', () => {
    const c = calcularCompletitud({ nombreEmprendimiento: 'X', descripcion: 'hola', documentos: [] });
    expect(c.items.find((i) => i.key === 'descripcion')?.hecho).toBe(false);
  });
});

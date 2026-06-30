import { describe, it, expect } from 'vitest';
import { tasaAsistencia, ocupacion, cursosMasDemandados, hayCupo } from './capacitacion.js';

describe('métricas de capacitación', () => {
  it('tasa de asistencia', () => {
    expect(tasaAsistencia(8, 10)).toBe(80);
    expect(tasaAsistencia(0, 0)).toBe(0);
  });
  it('ocupación se topa en 100%', () => {
    expect(ocupacion(15, 30)).toBe(50);
    expect(ocupacion(40, 30)).toBe(100);
    expect(ocupacion(0, 0)).toBe(0);
  });
  it('hayCupo decide inscrito vs lista de espera', () => {
    expect(hayCupo(29, 30)).toBe(true);
    expect(hayCupo(30, 30)).toBe(false);
  });
  it('cursos más demandados ordena por inscritos', () => {
    const r = cursosMasDemandados([{ nombre: 'A', inscritos: 5, cupos: 10 }, { nombre: 'B', inscritos: 12, cupos: 20 }, { nombre: 'C', inscritos: 1, cupos: 5 }], 2);
    expect(r.map((c) => c.nombre)).toEqual(['B', 'A']);
  });
});

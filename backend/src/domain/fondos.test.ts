import { describe, it, expect } from 'vitest';
import { compatibilidad, requisitosCheck, scoreIntencion, mejorFondo, type PerfilMatch, type FondoIndexable } from './fondos.js';

const gastronoma: PerfilMatch = { rubroCodigo: 'GASTRONOMIA', etapa: 'menos_2_anios', genero: 'F', localidad: 'Centro', documentos: ['Inicio actividades'] };

describe('compatibilidad de fondos', () => {
  it('alta cuando rubro y etapa calzan', () => {
    expect(compatibilidad(gastronoma, { rubros: ['GASTRONOMIA'], etapa: ['menos_2_anios'] })).toBe('alta');
  });
  it('media cuando la etapa no calza pero el resto sí', () => {
    expect(compatibilidad(gastronoma, { rubros: ['GASTRONOMIA'], etapa: ['consolidado'] })).toBe('media');
  });
  it('no cuando el rubro no es elegible', () => {
    expect(compatibilidad(gastronoma, { rubros: ['TECNOLOGIA'] })).toBe('no');
  });
  it('no cuando el fondo exige género que no calza', () => {
    const hombre = { ...gastronoma, genero: 'M' };
    expect(compatibilidad(hombre, { rubros: ['GASTRONOMIA'], genero: ['F'] })).toBe('no');
    expect(compatibilidad(gastronoma, { rubros: ['GASTRONOMIA'], genero: ['F'] })).toBe('alta');
  });
  it('sin restricciones es alta', () => {
    expect(compatibilidad(gastronoma, {})).toBe('alta');
  });
});

describe('requisitos checkeados', () => {
  it('cumples 2 de 4 (con uno manual no verificable)', () => {
    const r = requisitosCheck(gastronoma, [
      { clave: 'ia', etiqueta: 'Inicio de actividades', campoPerfil: 'documentos:Inicio actividades' },
      { clave: 'loc', etiqueta: 'Residencia', campoPerfil: 'localidad' },
      { clave: 'san', etiqueta: 'Resolución sanitaria', campoPerfil: 'documentos:Resolución sanitaria' },
      { clave: 'proy', etiqueta: 'Proyecto', campoPerfil: null },
    ]);
    expect(r.cumplidos).toBe(2); // inicio actividades + localidad
    expect(r.verificables).toBe(3); // el proyecto es manual
    expect(r.items.find((i) => i.clave === 'proy')?.cumple).toBeNull();
    expect(r.items.find((i) => i.clave === 'san')?.cumple).toBe(false);
  });
});

describe('match por intención (asistente)', () => {
  const fondos: FondoIndexable[] = [
    { id: 'a', nombre: 'Capital Semilla Municipal', descripcion: 'Apoyo a la compra de equipamiento como hornos y maquinaria', organismo: 'Municipio', criterios: { rubros: ['GASTRONOMIA'] } },
    { id: 'b', nombre: 'Capital Abeja', descripcion: 'Emprendimientos liderados por mujeres', organismo: 'SERCOTEC', criterios: { rubros: ['GASTRONOMIA'], genero: ['F'] } },
    { id: 'c', nombre: 'Fondo Tecnológico', descripcion: 'Innovación y software', organismo: 'CORFO', criterios: { rubros: ['TECNOLOGIA'] } },
  ];

  it('no recomienda fondos para los que no califica', () => {
    expect(scoreIntencion('necesito un horno', fondos[2], gastronoma)).toBe(0); // rubro tec, perfil gastro
  });

  it('elige el fondo cuyo texto calza con la intención', () => {
    const r = mejorFondo('tengo una cocinería y necesito comprar un horno', fondos, gastronoma);
    expect(r?.fondo.id).toBe('a'); // "horno"/"equipamiento" calza con Capital Semilla
  });

  it('devuelve null si ningún fondo califica para el perfil', () => {
    const soloTec: PerfilMatch = { rubroCodigo: 'AGRICOLA', documentos: [] };
    expect(mejorFondo('software', [fondos[2]], soloTec)).toBeNull();
  });
});

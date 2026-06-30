import { describe, it, expect } from 'vitest';
import { calidadRespuesta, scorePropuesta, type PreguntaPuntuable } from './postulacion.js';
import { metricasOperativas, distribucionPor, progresoEvaluacion, metricasNarrativas } from './dashboards.js';

describe('score de propuesta', () => {
  const sino: PreguntaPuntuable = { id: 'q1', tipo: 'SINO', puntuable: true, peso: 30 };
  const texto: PreguntaPuntuable = { id: 'q2', tipo: 'TEXTO', puntuable: true, peso: 25 };
  const sel: PreguntaPuntuable = { id: 'q3', tipo: 'SELECCION', puntuable: true, peso: 20, opciones: ['Producción propia', 'Reventa'] };

  it('calidad por tipo de respuesta', () => {
    expect(calidadRespuesta(sino, 'Sí')).toBe(1);
    expect(calidadRespuesta(sino, 'No')).toBe(0);
    expect(calidadRespuesta(texto, 'corto')).toBe(0.5);
    expect(calidadRespuesta(texto, 'una descripción suficientemente desarrollada')).toBe(1);
    expect(calidadRespuesta(sel, 'Producción propia')).toBe(1);
    expect(calidadRespuesta(sel, 'Reventa')).toBe(0);
  });

  it('pondera por peso y normaliza a 0..100', () => {
    const s = scorePropuesta([sino, texto, sel], [
      { preguntaId: 'q1', valor: 'Sí' },
      { preguntaId: 'q2', valor: 'una descripción suficientemente desarrollada' },
      { preguntaId: 'q3', valor: 'Producción propia' },
    ]);
    expect(s).toBe(100);
  });

  it('respuestas débiles bajan el score', () => {
    const s = scorePropuesta([sino, texto, sel], [
      { preguntaId: 'q1', valor: 'No' },
      { preguntaId: 'q2', valor: 'corto' },
      { preguntaId: 'q3', valor: 'Reventa' },
    ]);
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(40);
  });

  it('feria sin preguntas puntuables devuelve neutro 50', () => {
    expect(scorePropuesta([{ id: 'a', tipo: 'ADJUNTO', puntuable: false, peso: 0 }], [])).toBe(50);
  });
});

describe('métricas de dashboard', () => {
  const postus = [
    { estado: 'ADMITIDA' as const, rubroCodigo: 'GASTRONOMIA', localidad: 'Centro' },
    { estado: 'ADMITIDA' as const, rubroCodigo: 'GASTRONOMIA', localidad: 'Sector Norte' },
    { estado: 'ADMITIDA' as const, rubroCodigo: 'ARTESANIA', localidad: 'Centro' },
    { estado: 'PENDIENTE' as const, rubroCodigo: 'TEXTIL', localidad: 'Centro' },
    { estado: 'LISTA_ESPERA' as const, rubroCodigo: 'AGRICOLA', localidad: 'Centro' },
    { estado: 'RECHAZADA' as const, rubroCodigo: 'AGRICOLA', localidad: 'Centro' },
  ];

  it('operativas: cuenta estados y uso de cupos', () => {
    const m = metricasOperativas(postus, 4);
    expect(m).toMatchObject({ postulados: 6, admitidos: 3, pendientes: 1, listaEspera: 1, cupos: 4, cuposUsadosPct: 75 });
  });

  it('distribución territorial agrega sólo admitidos', () => {
    const porRubro = distribucionPor(postus, 'rubroCodigo');
    expect(porRubro[0]).toMatchObject({ clave: 'GASTRONOMIA', total: 2 });
    expect(porRubro.reduce((s, d) => s + d.total, 0)).toBe(3); // sólo admitidos
  });

  it('progreso de evaluación N de M', () => {
    expect(progresoEvaluacion(2, 4)).toMatchObject({ evaluados: 2, totales: 4, pct: 50 });
    expect(progresoEvaluacion(0, 0).pct).toBe(0);
  });

  it('narrativas: números grandes, ventas sólo como dato narrativo', () => {
    const m = metricasNarrativas([{ ventasReportadas: '$3.240.000', publicoEstimado: '~8.500' }, { ventasReportadas: null, publicoEstimado: '~4.200' }], 42);
    expect(m.feriasRealizadas).toBe(2);
    expect(m.emprendedoresParticipantes).toBe(42);
    expect(m.ventasReportadas).toEqual(['$3.240.000']);
    expect(m.publicoEstimado).toEqual(['~8.500', '~4.200']);
  });
});

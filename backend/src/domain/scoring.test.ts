import { describe, it, expect } from 'vitest';
import { desgloseCombinado, scoreCombinado, rankear, puntajeEvento, actualizarReputacion, cumplioPiso } from './scoring.js';

describe('score combinado (admisión)', () => {
  it('combina propuesta y reputación según la perilla', () => {
    // 50/50
    expect(scoreCombinado({ scorePropuesta: 80, repScore: 40, pesoProp: 50, pesoRep: 50 })).toBe(60);
    // perilla a propuesta (80/20)
    expect(scoreCombinado({ scorePropuesta: 80, repScore: 40, pesoProp: 80, pesoRep: 20 })).toBe(72);
  });

  it('el desglose es defendible: suma de aportes = total', () => {
    const d = desgloseCombinado({ scorePropuesta: 86, repScore: 88, pesoProp: 55, pesoRep: 45 });
    expect(d.aportePropuesta + d.aporteReputacion).toBe(d.total);
  });

  it('caso del novato: rep 0 entra si la feria pondera alto la propuesta', () => {
    const novato = scoreCombinado({ scorePropuesta: 90, repScore: 0, pesoProp: 80, pesoRep: 20 });
    const veterano = scoreCombinado({ scorePropuesta: 40, repScore: 90, pesoProp: 80, pesoRep: 20 });
    expect(novato).toBeGreaterThan(veterano); // la buena propuesta del novato gana
  });

  it('caso free-rider: buena reputación + mala propuesta no entra automático', () => {
    const freeRider = scoreCombinado({ scorePropuesta: 20, repScore: 95, pesoProp: 70, pesoRep: 30 });
    const propuestaSolida = scoreCombinado({ scorePropuesta: 85, repScore: 30, pesoProp: 70, pesoRep: 30 });
    expect(propuestaSolida).toBeGreaterThan(freeRider);
  });

  it('normaliza aunque los pesos no sumen 100', () => {
    expect(scoreCombinado({ scorePropuesta: 100, repScore: 0, pesoProp: 30, pesoRep: 10 })).toBe(75);
  });
});

describe('ranking con corte por cupos', () => {
  const postus = [
    { id: 'a', scorePropuesta: 86, repScore: 88 },
    { id: 'b', scorePropuesta: 91, repScore: 82 },
    { id: 'c', scorePropuesta: 58, repScore: 69 },
    { id: 'd', scorePropuesta: 72, repScore: 34 },
  ];
  it('ordena por score combinado y sugiere admitir hasta los cupos', () => {
    const r = rankear(postus, 55, 45, 2);
    expect(r[0].rank).toBe(1);
    expect(r.filter((x) => x.sugerido === 'admitir')).toHaveLength(2);
    expect(r.slice(2).every((x) => x.sugerido === 'lista_espera')).toBe(true);
  });
  it('mover la perilla recalcula el orden', () => {
    const propuesta = rankear(postus, 90, 10, 4).map((x) => x.id);
    const reputacion = rankear(postus, 10, 90, 4).map((x) => x.id);
    expect(propuesta).not.toEqual(reputacion);
  });
});

describe('score de desempeño (3 capas)', () => {
  it('capa 1 es el piso: ratio de cumplimiento', () => {
    expect(puntajeEvento({ cumplimiento: { a: true, b: true, c: true, d: true }, participo: true })).toBe(100);
    expect(puntajeEvento({ cumplimiento: { a: true, b: true, c: false, d: false }, participo: true })).toBe(50);
  });
  it('no participar (no-show pese a admitido) penaliza fuerte', () => {
    expect(puntajeEvento({ cumplimiento: { a: true, b: true }, participo: false })).toBe(50);
  });
  it('capa 3 (calidad) acelera o frena en torno a 3 estrellas', () => {
    const base = puntajeEvento({ cumplimiento: { a: true, b: true, c: true, d: true }, participo: true, calidadEstrellas: 3 });
    const top = puntajeEvento({ cumplimiento: { a: true, b: true, c: true, d: true }, participo: true, calidadEstrellas: 5 });
    const bajo = puntajeEvento({ cumplimiento: { a: true, b: true }, participo: true, calidadEstrellas: 1 });
    expect(base).toBe(100);
    expect(top).toBe(100); // ya tope, clamp
    expect(bajo).toBeLessThan(100);
  });
  it('cumplioPiso sólo es true con todos los ítems marcados', () => {
    expect(cumplioPiso({ a: true, b: true })).toBe(true);
    expect(cumplioPiso({ a: true, b: false })).toBe(false);
    expect(cumplioPiso({})).toBe(false);
  });
  it('la reputación es media móvil y cuenta ferias cumplidas', () => {
    const inicial = { repScore: 0, feriasCumplidas: 0, feriasTotales: 0 };
    const tras1 = actualizarReputacion(inicial, { cumplimiento: { a: true, b: true }, participo: true });
    expect(tras1).toMatchObject({ repScore: 100, feriasCumplidas: 1, feriasTotales: 1 });
    const tras2 = actualizarReputacion(tras1, { cumplimiento: { a: true, b: false }, participo: true });
    expect(tras2.feriasTotales).toBe(2);
    expect(tras2.repScore).toBe(75); // media de 100 y 50
    expect(tras2.feriasCumplidas).toBe(1); // el segundo no cumplió el piso completo
  });
});

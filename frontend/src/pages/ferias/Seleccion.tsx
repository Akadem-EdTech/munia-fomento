import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { api } from '../../api/client';
import type { FeriaGestion, SeleccionData, FilaRanking } from '../../types';

export function Seleccion() {
  const qc = useQueryClient();
  const { data: ferias } = useQuery({ queryKey: ['gestion-ferias'], queryFn: () => api.get<{ ferias: FeriaGestion[] }>('/api/gestion/ferias') });
  const [feriaId, setFeriaId] = useState<string | null>(null);
  const [pesoProp, setPesoProp] = useState<number | null>(null);
  const [confirmar, setConfirmar] = useState<FilaRanking | null>(null);

  // Feria por defecto: la que está en evaluación.
  const lista = ferias?.ferias ?? [];
  const activa = feriaId ?? lista.find((f) => f.estado === 'EN_EVALUACION')?.id ?? lista[0]?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ['seleccion', activa, pesoProp],
    queryFn: () => api.get<SeleccionData>(`/api/gestion/ferias/${activa}/seleccion${pesoProp != null ? `?pesoProp=${pesoProp}&pesoRep=${100 - pesoProp}` : ''}`),
    enabled: !!activa,
  });

  const decidir = useMutation({
    mutationFn: ({ id, decision, motivo }: { id: string; decision: string; motivo?: string }) => api.post(`/api/gestion/postulaciones/${id}/decidir`, { decision, motivo }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seleccion'] }); setConfirmar(null); },
  });

  if (!lista.length) return <div className="empty"><Icon name="feria" /><h4>No hay ferias</h4><p>Crea una feria para empezar a recibir postulaciones.</p></div>;

  const pp = data?.perilla.pesoProp ?? 50;
  const sliderVal = pesoProp ?? pp;
  const maxTotal = Math.max(1, ...(data?.ranking.map((r) => r.total) ?? [1]));

  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: '1fr 320px', alignItems: 'start', marginBottom: '1.2rem' }}>
        <div className="field" style={{ margin: 0 }}>
          <label>Feria</label>
          <select value={activa ?? ''} onChange={(e) => { setFeriaId(e.target.value); setPesoProp(null); }}>
            {lista.map((f) => <option key={f.id} value={f.id}>{f.nombre} — {f.estado.toLowerCase()}</option>)}
          </select>
        </div>
        <div className="perilla">
          <div className="perilla-row"><span>Ponderación de selección</span></div>
          <input type="range" min={0} max={100} value={sliderVal} onChange={(e) => setPesoProp(Number(e.target.value))} />
          <div className="perilla-vals"><span style={{ color: 'var(--teal-light)' }}>Propuesta {sliderVal}%</span><span style={{ color: 'var(--civic-mid)' }}>Trayectoria {100 - sliderVal}%</span></div>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="center-screen" style={{ minHeight: 160 }}><span className="spinner" style={{ borderTopColor: 'var(--teal)' }} /></div>
      ) : (
        <div className="card" style={{ padding: '0.6rem 0' }}>
          <div className="score-legend" style={{ padding: '0 14px 8px' }}>
            <span><span className="dot" style={{ background: 'var(--teal-light)' }} /> Propuesta</span>
            <span><span className="dot" style={{ background: 'var(--civic-mid)' }} /> Trayectoria</span>
            <span style={{ marginLeft: 'auto', color: 'var(--warn)' }}>línea = corte por cupos ({data.feria.cupos})</span>
          </div>
          {data.ranking.map((r, i) => {
            const corte = i === data.feria.cupos && data.feria.cupos < data.ranking.length;
            const w = (n: number) => `${(n / maxTotal) * 100}%`;
            return (
              <div key={r.postulacionId} className={`rank-row ${corte ? 'corte' : ''}`}>
                <div className={`rank-num ${r.sugerido === 'admitir' ? 'in' : ''}`}>{r.rank}</div>
                <div>
                  <div className="ent-name">{r.emprendedor.emprendimiento} {r.emprendedor.esNovato && <span className="chip c-purp" style={{ marginLeft: 6 }}>nuevo</span>}</div>
                  <div className="ent-sub">{r.emprendedor.nombre} · {r.emprendedor.rubro ?? '—'} · cumplió {r.emprendedor.conf}</div>
                </div>
                <div>
                  <div className="score-stack" title={`Propuesta ${r.aportePropuesta} + Trayectoria ${r.aporteReputacion}`}>
                    <div className="score-prop" style={{ width: w(r.aportePropuesta) }} />
                    <div className="score-rep" style={{ width: w(r.aporteReputacion) }} />
                  </div>
                  <div className="score-legend"><span className="rep-num" style={{ color: 'var(--text)' }}>{r.total}</span><span>= {r.aportePropuesta} + {r.aporteReputacion}</span></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {r.estado === 'PENDIENTE' ? (
                    <>
                      <button className="btn-p btn-xs" onClick={() => decidir.mutate({ id: r.postulacionId, decision: 'ADMITIDA' })}>Admitir</button>{' '}
                      <button className="btn-g btn-xs" onClick={() => decidir.mutate({ id: r.postulacionId, decision: 'LISTA_ESPERA' })}>Espera</button>{' '}
                      <button className="btn-g btn-xs" onClick={() => setConfirmar(r)}>Rechazar</button>
                    </>
                  ) : (
                    <span className={`chip ${r.estado === 'ADMITIDA' ? 'c-ok' : r.estado === 'RECHAZADA' ? 'c-bad' : 'c-info'}`}>{r.estado.toLowerCase().replace('_', ' ')}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirmar && (
        <div className="modal-bg" onClick={() => setConfirmar(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Rechazar postulación</h3>
            <p className="ent-sub" style={{ marginTop: 6 }}>{confirmar.emprendedor.emprendimiento} no será seleccionado para esta feria. La decisión queda registrada.</p>
            <div className="modal-actions">
              <button className="btn-g" onClick={() => setConfirmar(null)}>Cancelar</button>
              <button className="btn-p" style={{ background: 'var(--bad)' }} disabled={decidir.isPending} onClick={() => decidir.mutate({ id: confirmar.postulacionId, decision: 'RECHAZADA' })}>{decidir.isPending ? <span className="spinner" /> : 'Rechazar'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

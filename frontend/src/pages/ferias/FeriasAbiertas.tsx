import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { api, ApiError } from '../../api/client';
import type { FeriaAbierta, FeriaDetalle } from '../../types';

function Postular({ feriaId, onClose }: { feriaId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['feria', feriaId], queryFn: () => api.get<{ feria: FeriaDetalle }>(`/api/ferias/${feriaId}`) });
  const [resp, setResp] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const enviar = useMutation({
    mutationFn: () => api.post(`/api/ferias/${feriaId}/postular`, { respuestas: Object.entries(resp).map(([preguntaId, valor]) => ({ preguntaId, valor })) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ferias-abiertas'] }); qc.invalidateQueries({ queryKey: ['mis-postulaciones'] }); onClose(); },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'No se pudo postular'),
  });
  const f = data?.feria;

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        {!f ? <div className="center-screen" style={{ minHeight: 120 }}><span className="spinner" style={{ borderTopColor: 'var(--teal)' }} /></div> : (
          <>
            <h3>Postular a {f.nombre}</h3>
            <p className="ent-sub" style={{ marginBottom: '1.2rem' }}>{f.objetivo}</p>
            {error && <div className="alert alert-bad" style={{ marginBottom: '1rem' }}><Icon name="info" />{error}</div>}
            <div className="alert alert-info" style={{ marginBottom: '1.2rem' }}><Icon name="check" />Tus datos de perfil (nombre, emprendimiento, rubro) se incluyen automáticamente.</div>

            {f.preguntas.map((p) => (
              <div className="field" key={p.id}>
                <label>{p.texto}</label>
                {p.tipo === 'TEXTO' && <textarea value={resp[p.id] ?? ''} onChange={(e) => setResp({ ...resp, [p.id]: e.target.value })} />}
                {p.tipo === 'NUMERO' && <input type="number" value={resp[p.id] ?? ''} onChange={(e) => setResp({ ...resp, [p.id]: e.target.value })} />}
                {p.tipo === 'SINO' && (
                  <select value={resp[p.id] ?? ''} onChange={(e) => setResp({ ...resp, [p.id]: e.target.value })}><option value="">— Selecciona —</option><option value="Sí">Sí</option><option value="No">No</option></select>
                )}
                {p.tipo === 'SELECCION' && (
                  <select value={resp[p.id] ?? ''} onChange={(e) => setResp({ ...resp, [p.id]: e.target.value })}><option value="">— Selecciona —</option>{p.opciones.map((o) => <option key={o} value={o}>{o}</option>)}</select>
                )}
                {p.tipo === 'ADJUNTO' && <div className="alert alert-info"><Icon name="doc" />Podrás adjuntar archivos cuando habilitemos la carga (próximamente).</div>}
              </div>
            ))}
            <div className="modal-actions">
              <button className="btn-g" onClick={onClose}>Cancelar</button>
              <button className="btn-p" disabled={enviar.isPending} onClick={() => enviar.mutate()}>{enviar.isPending ? <span className="spinner" /> : 'Enviar postulación'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function FeriasAbiertas() {
  const { data, isLoading } = useQuery({ queryKey: ['ferias-abiertas'], queryFn: () => api.get<{ ferias: FeriaAbierta[] }>('/api/ferias/abiertas') });
  const [postularId, setPostularId] = useState<string | null>(null);

  if (isLoading) return <div className="center-screen" style={{ minHeight: 200 }}><span className="spinner" style={{ borderTopColor: 'var(--teal)' }} /></div>;
  const ferias = data?.ferias ?? [];

  return (
    <>
      {ferias.length === 0 ? (
        <div className="empty"><Icon name="feria" /><h4>No hay ferias abiertas ahora</h4><p>Te avisaremos cuando se abra una nueva convocatoria para postular.</p></div>
      ) : (
        <div className="grid g2">
          {ferias.map((f) => (
            <div className="card" key={f.id}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'start' }}>
                <div className="ha-ico"><Icon name="feria" /></div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600 }}>{f.nombre}</h3>
                  <div className="ent-sub">{f.fecha ?? 'Fecha por confirmar'} · {f.ubicacion ?? ''}</div>
                </div>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '10px 0', lineHeight: 1.5 }}>{f.objetivo}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                <span className="chip c-info">{f.criterio}</span>
                {f.rubros.map((r) => <span key={r} className="rubro">{r}</span>)}
              </div>
              {f.yaPostulada ? (
                <span className="chip c-ok"><Icon name="check" /> Ya postulaste</span>
              ) : (
                <button className="btn-p btn-sm" onClick={() => setPostularId(f.id)}><Icon name="postul" /> Postular</button>
              )}
            </div>
          ))}
        </div>
      )}
      {postularId && <Postular feriaId={postularId} onClose={() => setPostularId(null)} />}
    </>
  );
}

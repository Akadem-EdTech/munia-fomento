import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { api, ApiError } from '../../api/client';
import type { FichaFondo as Ficha } from '../../types';

const compatChip = (c: string) => c === 'alta' ? <span className="compat compat-alta">Compatibilidad alta</span> : <span className="compat compat-media">Compatibilidad media</span>;

export function FichaFondo({ fondoId, onClose }: { fondoId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['ficha-fondo', fondoId], queryFn: () => api.get<{ fondo: Ficha }>(`/api/fondos/${fondoId}`) });
  const [proyecto, setProyecto] = useState('');
  const [postulando, setPostulando] = useState(false);
  const [error, setError] = useState('');
  const [faqAbierta, setFaqAbierta] = useState<number | null>(null);

  const postular = useMutation({
    mutationFn: () => api.post(`/api/fondos/${fondoId}/postular`, { proyecto }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ficha-fondo', fondoId] }); qc.invalidateQueries({ queryKey: ['fondos-mis'] }); setPostulando(false); },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'No se pudo postular'),
  });

  const f = data?.fondo;
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        {!f ? <div className="center-screen" style={{ minHeight: 160 }}><span className="spinner" style={{ borderTopColor: 'var(--mod-fondos)' }} /></div> : (
          <>
            <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
              <div className="puerta-ico" style={{ margin: 0, width: 44, height: 44 }}><Icon name="money" /></div>
              <div style={{ flex: 1 }}><h3>{f.nombre}</h3><div className="ent-sub">{f.organismo} · {f.origen === 'EXTERNO' ? 'Externo' : 'Municipal'}</div></div>
              {compatChip(f.compatibilidad)}
            </div>
            <div className="grid g3" style={{ margin: '1.2rem 0' }}>
              <div className="kpi" style={{ padding: '0.9rem 1rem' }}><div className="kpi-lbl">Monto</div><div className="kpi-val" style={{ fontSize: 19 }}>{f.montoMax ? `$${f.montoMax.toLocaleString('es-CL')}` : '—'}</div></div>
              <div className="kpi" style={{ padding: '0.9rem 1rem' }}><div className="kpi-lbl">Días restantes</div><div className="kpi-val" style={{ fontSize: 19 }}>{f.diasRestantes ?? '—'}</div></div>
              <div className="kpi" style={{ padding: '0.9rem 1rem' }}><div className="kpi-lbl">Requisitos</div><div className="kpi-val" style={{ fontSize: 19 }}>{f.requisitosCumplidos}<span className="u">/{f.requisitosVerificables}</span></div></div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: '1.2rem', lineHeight: 1.6 }}>{f.descripcion}</p>

            <div className="section-t" style={{ marginTop: 0 }}>Requisitos · cumples {f.requisitosCumplidos} de {f.requisitosVerificables}</div>
            <div style={{ marginBottom: '1.2rem' }}>
              {f.requisitos.map((r) => (
                <div className="req-item" key={r.clave}>
                  <div className={`req-mark ${r.cumple === true ? 'req-si' : r.cumple === false ? 'req-no' : 'req-man'}`}>
                    {r.cumple === true ? <Icon name="check" /> : r.cumple === false ? <Icon name="plus" style={{ transform: 'rotate(45deg)' }} /> : '?'}
                  </div>
                  <span style={{ color: r.cumple === false ? 'var(--muted)' : 'var(--text)' }}>{r.etiqueta}</span>
                  {r.cumple === null && <span className="ent-sub" style={{ marginLeft: 'auto' }}>se verifica al postular</span>}
                </div>
              ))}
            </div>

            {f.faq.length > 0 && (
              <>
                <div className="section-t">Preguntas frecuentes</div>
                <div style={{ marginBottom: '1.2rem' }}>
                  {f.faq.map((q, i) => (
                    <div key={i} className="card" style={{ padding: '0.8rem 1rem', marginBottom: 6, cursor: 'pointer' }} onClick={() => setFaqAbierta(faqAbierta === i ? null : i)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500 }}><Icon name="help" size={15} /> {q.pregunta}</div>
                      {faqAbierta === i && <p className="ent-sub" style={{ marginTop: 8, lineHeight: 1.6 }}>{q.respuesta}</p>}
                    </div>
                  ))}
                </div>
              </>
            )}

            {f.miPostulacion ? (
              <div className="alert alert-info"><Icon name="check" />Ya postulaste a este fondo · estado: {f.miPostulacion.toLowerCase()}</div>
            ) : !postulando ? (
              <button className="btn-p" style={{ background: 'var(--mod-fondos)', color: '#0b1a0f' }} onClick={() => setPostulando(true)}><Icon name="send" /> Postular a este fondo</button>
            ) : (
              <div>
                {error && <div className="alert alert-bad" style={{ marginBottom: '1rem' }}><Icon name="info" />{error}</div>}
                <div className="field"><label>Describe tu proyecto de inversión</label><textarea value={proyecto} onChange={(e) => setProyecto(e.target.value)} placeholder="¿En qué invertirías el fondo? El asistente puede ayudarte a redactarlo." style={{ minHeight: 110 }} /></div>
                <div className="modal-actions">
                  <button className="btn-g" onClick={() => setPostulando(false)}>Cancelar</button>
                  <button className="btn-p" style={{ background: 'var(--mod-fondos)', color: '#0b1a0f' }} disabled={postular.isPending || proyecto.length < 10} onClick={() => postular.mutate()}>{postular.isPending ? <span className="spinner" /> : 'Enviar postulación'}</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { api } from '../../api/client';
import { useAuth, esRol } from '../../auth/auth';
import type { FeriaGestion, EvaluacionData, FilaEval } from '../../types';

function Estrellas({ valor, onSet }: { valor: number | null; onSet: (n: number) => void }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} className={`star ${valor && n <= valor ? 'on' : ''}`} viewBox="0 0 24 24" onClick={() => onSet(n)}>
          <path d="M12 2l3 7h7l-5.5 4 2 7L12 17l-6.5 3 2-7L2 9h7z" strokeLinejoin="round" />
        </svg>
      ))}
    </div>
  );
}

function TarjetaEval({ feriaId, fila, items }: { feriaId: string; fila: FilaEval; items: EvaluacionData['items'] }) {
  const qc = useQueryClient();
  const [cumpl, setCumpl] = useState<Record<string, boolean>>(fila.cumplimiento);
  const [estrellas, setEstrellas] = useState<number | null>(fila.calidadEstrellas);
  useEffect(() => { setCumpl(fila.cumplimiento); setEstrellas(fila.calidadEstrellas); }, [fila]);

  const guardar = useMutation({
    mutationFn: (payload: object) => api.post(`/api/gestion/evaluacion/${feriaId}/${fila.emprendedorId}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluacion', feriaId] }),
  });

  const toggle = (k: string) => { const next = { ...cumpl, [k]: !cumpl[k] }; setCumpl(next); guardar.mutate({ cumplimiento: next }); }; // guardado instantáneo
  const setStar = (n: number) => { setEstrellas(n); guardar.mutate({ calidadEstrellas: n }); };
  const todoCapa1 = items.every((it) => cumpl[it.k]);

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="eval-emp" style={{ border: 'none', background: 'none', padding: 0, marginBottom: 12 }}>
        <div className="ent-av">{fila.nombre.charAt(0)}</div>
        <div style={{ flex: 1 }}><div className="ent-name">{fila.emprendimiento}</div><div className="ent-sub">{fila.nombre}</div></div>
        {fila.completada && <span className="chip c-ok"><Icon name="check" /> Evaluado</span>}
      </div>

      <div className="section-t" style={{ margin: '0 0 8px' }}>Capa 1 · Cumplimiento</div>
      {items.map((it) => (
        <div key={it.k} className={`check-item ${cumpl[it.k] ? 'on' : ''}`} onClick={() => toggle(it.k)}>
          <div className="check-box"><Icon name="check" /></div>
          <div><div style={{ fontSize: 13, fontWeight: 500 }}>{it.txt}</div><div className="ent-sub">{it.sub}</div></div>
        </div>
      ))}

      <div className="grid g2" style={{ marginTop: 12 }}>
        <div>
          <div className="section-t" style={{ margin: '0 0 6px' }}>Capa 3 · Calidad (opcional)</div>
          <Estrellas valor={estrellas} onSet={setStar} />
        </div>
        <div>
          <div className="section-t" style={{ margin: '0 0 6px' }}>Capa 2 · Autoreporte</div>
          {fila.autoreporte ? <span className="ent-sub">{fila.autoreporte.participo ? 'Participó' : 'No participó'}{fila.autoreporte.ventas ? ` · ventas ref. $${fila.autoreporte.ventas.toLocaleString('es-CL')}` : ''}</span> : <span className="ent-sub">Sin reporte aún</span>}
        </div>
      </div>

      {!fila.completada && (
        <button className="btn-g btn-sm" style={{ marginTop: 12 }} disabled={!todoCapa1} onClick={() => guardar.mutate({ completada: true })}>
          {todoCapa1 ? 'Marcar como evaluado' : 'Completa la capa 1 para finalizar'}
        </button>
      )}
    </div>
  );
}

export function Evaluacion() {
  const { usuario } = useAuth();
  const qc = useQueryClient();
  const { data: ferias } = useQuery({ queryKey: ['gestion-ferias'], queryFn: () => api.get<{ ferias: FeriaGestion[] }>('/api/gestion/ferias') });
  const [feriaId, setFeriaId] = useState<string | null>(null);
  const [confirmarCierre, setConfirmarCierre] = useState(false);

  const lista = ferias?.ferias ?? [];
  const activa = feriaId ?? lista.find((f) => f.estado === 'EN_EVALUACION')?.id ?? lista[0]?.id ?? null;

  const { data, isLoading, error } = useQuery({
    queryKey: ['evaluacion', activa],
    queryFn: () => api.get<EvaluacionData>(`/api/gestion/ferias/${activa}/evaluacion`),
    enabled: !!activa, retry: false,
  });

  const cerrar = useMutation({
    mutationFn: () => api.post(`/api/gestion/ferias/${activa}/cerrar`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gestion-ferias'] }); qc.invalidateQueries({ queryKey: ['evaluacion'] }); setConfirmarCierre(false); },
  });

  if (!lista.length) return <div className="empty"><Icon name="feria" /><h4>No hay ferias</h4></div>;

  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
        <div className="field" style={{ margin: 0, flex: 1, minWidth: 200 }}>
          <label>Feria a evaluar</label>
          <select value={activa ?? ''} onChange={(e) => setFeriaId(e.target.value)}>{lista.map((f) => <option key={f.id} value={f.id}>{f.nombre} — {f.estado.toLowerCase()}</option>)}</select>
        </div>
        {data && (
          <div className="perilla" style={{ minWidth: 200 }}>
            <div className="perilla-row"><span>Progreso</span><span className="rep-num" style={{ color: 'var(--text)' }}>{data.progreso.evaluados} de {data.progreso.totales}</span></div>
            <div className="prog"><div className="prog-fill" style={{ width: `${data.progreso.totales ? (data.progreso.evaluados / data.progreso.totales) * 100 : 0}%` }} /></div>
          </div>
        )}
      </div>

      {error ? <div className="alert alert-bad"><Icon name="info" />No tienes acceso a la evaluación de esta feria (no estás asignado como evaluador).</div>
        : isLoading || !data ? <div className="center-screen" style={{ minHeight: 160 }}><span className="spinner" style={{ borderTopColor: 'var(--teal)' }} /></div>
          : data.lista.length === 0 ? <div className="empty"><Icon name="eval" /><h4>Sin admitidos para evaluar</h4><p>Primero admite postulantes en la sección Selección.</p></div>
            : (
              <>
                {data.lista.map((fila) => <TarjetaEval key={fila.emprendedorId} feriaId={activa!} fila={fila} items={data.items} />)}
                {esRol(usuario, 'ADMINISTRADOR') && data.feria.estado !== 'CERRADA' && (
                  <button className="btn-p" onClick={() => setConfirmarCierre(true)}><Icon name="check" /> Cerrar feria y consolidar reputación</button>
                )}
              </>
            )}

      {confirmarCierre && (
        <div className="modal-bg" onClick={() => setConfirmarCierre(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Cerrar feria</h3>
            <p className="ent-sub" style={{ marginTop: 6 }}>Se consolidará la reputación de los emprendedores evaluados (capas 1–3) y la feria quedará cerrada. Esta acción no se revierte.</p>
            <div className="modal-actions">
              <button className="btn-g" onClick={() => setConfirmarCierre(false)}>Cancelar</button>
              <button className="btn-p" disabled={cerrar.isPending} onClick={() => cerrar.mutate()}>{cerrar.isPending ? <span className="spinner" /> : 'Cerrar feria'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

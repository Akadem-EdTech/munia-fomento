import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { api, ApiError } from '../../api/client';
import type { FondoGestion, PostulacionFondoEval, DashboardFondos, Rubro } from '../../types';

const CAMPOS = [{ v: '', l: 'Manual (se revisa a mano)' }, { v: 'documentos:Inicio actividades', l: 'Inicio de actividades' }, { v: 'documentos:Resolución sanitaria', l: 'Resolución sanitaria' }, { v: 'localidad', l: 'Localidad' }, { v: 'genero', l: 'Género' }];

function CrearFondo({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: rubros } = useQuery({ queryKey: ['rubros'], queryFn: () => api.get<{ rubros: (Rubro & { codigoMaestro?: string })[] }>('/api/rubros') });
  const [f, setF] = useState({ nombre: '', organismo: '', origen: 'MUNICIPAL', descripcion: '', montoMax: '', fechaCierre: '' });
  const [rubroCods, setRubroCods] = useState<string[]>([]);
  const [reqs, setReqs] = useState<{ etiqueta: string; campoPerfil: string }[]>([]);
  const [error, setError] = useState('');
  const crear = useMutation({
    mutationFn: () => api.post('/api/gestion/fondos', { nombre: f.nombre, organismo: f.organismo, origen: f.origen, descripcion: f.descripcion || undefined, montoMax: f.montoMax ? Number(f.montoMax) : undefined, fechaCierre: f.fechaCierre || undefined, criteriosMatch: { rubros: rubroCods }, requisitos: reqs.filter((r) => r.etiqueta).map((r, i) => ({ clave: `r${i}`, etiqueta: r.etiqueta, campoPerfil: r.campoPerfil || null })) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gestion-fondos'] }); onClose(); },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'No se pudo crear'),
  });
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '88vh', overflowY: 'auto' }}>
        <h3>Crear convocatoria</h3>
        {error && <div className="alert alert-bad" style={{ margin: '1rem 0' }}><Icon name="info" />{error}</div>}
        <div className="grid g2"><div className="field"><label>Nombre</label><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></div><div className="field"><label>Organismo</label><input value={f.organismo} onChange={(e) => setF({ ...f, organismo: e.target.value })} /></div></div>
        <div className="grid g3">
          <div className="field"><label>Origen</label><select value={f.origen} onChange={(e) => setF({ ...f, origen: e.target.value })}><option value="MUNICIPAL">Municipal</option><option value="EXTERNO">Externo</option></select></div>
          <div className="field"><label>Monto máximo</label><input type="number" value={f.montoMax} onChange={(e) => setF({ ...f, montoMax: e.target.value })} /></div>
          <div className="field"><label>Fecha cierre</label><input type="date" value={f.fechaCierre} onChange={(e) => setF({ ...f, fechaCierre: e.target.value })} /></div>
        </div>
        <div className="field"><label>Descripción</label><textarea value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></div>
        <div className="field"><label>Rubros elegibles (alimentan el match del asistente)</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{rubros?.rubros.map((r) => <label key={r.id} className="checkbox" style={{ background: 'var(--bg3)', border: '.5px solid var(--border)', borderRadius: 8, padding: '7px 11px', alignItems: 'center' }}><input type="checkbox" checked={rubroCods.includes(r.codigoMaestro!)} onChange={() => setRubroCods(rubroCods.includes(r.codigoMaestro!) ? rubroCods.filter((x) => x !== r.codigoMaestro) : [...rubroCods, r.codigoMaestro!])} /> {r.alias}</label>)}</div>
        </div>
        <div className="field"><label>Requisitos</label>
          {reqs.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <input value={r.etiqueta} onChange={(e) => setReqs(reqs.map((x, j) => j === i ? { ...x, etiqueta: e.target.value } : x))} placeholder="Requisito" style={{ flex: 1, background: 'var(--bg3)', border: '.5px solid var(--border)', borderRadius: 7, padding: '8px 11px', color: 'var(--text)' }} />
              <select value={r.campoPerfil} onChange={(e) => setReqs(reqs.map((x, j) => j === i ? { ...x, campoPerfil: e.target.value } : x))} style={{ background: 'var(--bg3)', border: '.5px solid var(--border)', borderRadius: 7, padding: '8px 10px', color: 'var(--text)' }}>{CAMPOS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}</select>
              <button className="btn-g btn-xs" onClick={() => setReqs(reqs.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button className="btn-g btn-sm" onClick={() => setReqs([...reqs, { etiqueta: '', campoPerfil: '' }])}><Icon name="plus" /> Agregar requisito</button>
        </div>
        <div className="modal-actions"><button className="btn-g" onClick={onClose}>Cancelar</button><button className="btn-p" style={{ background: 'var(--mod-fondos)', color: '#0b1a0f' }} disabled={crear.isPending || !f.nombre || !f.organismo} onClick={() => crear.mutate()}>{crear.isPending ? <span className="spinner" /> : 'Crear convocatoria'}</button></div>
      </div>
    </div>
  );
}

export function Convocatorias() {
  const { data, isLoading } = useQuery({ queryKey: ['gestion-fondos'], queryFn: () => api.get<{ fondos: FondoGestion[] }>('/api/gestion/fondos') });
  const [crear, setCrear] = useState(false);
  return (
    <>
      <div className="card-h" style={{ marginBottom: '1.2rem' }}><div className="ico" style={{ background: 'rgba(74,222,128,.14)' }}><Icon name="money" style={{ stroke: 'var(--mod-fondos)' }} /></div><h3>Convocatorias</h3>
        <div className="act"><button className="btn-p btn-sm" style={{ background: 'var(--mod-fondos)', color: '#0b1a0f' }} onClick={() => setCrear(true)}><Icon name="plus" /> Crear convocatoria</button></div></div>
      {isLoading ? <div className="center-screen" style={{ minHeight: 160 }}><span className="spinner" style={{ borderTopColor: 'var(--mod-fondos)' }} /></div> : !data?.fondos.length ? (
        <div className="empty"><Icon name="money" /><h4>Aún no hay convocatorias</h4><p>Crea la primera convocatoria de fondos.</p></div>
      ) : (
        <div className="card" style={{ padding: 0 }}><table className="tbl"><thead><tr><th>Fondo</th><th>Origen</th><th>Monto</th><th>Postulaciones</th><th>Estado</th></tr></thead>
          <tbody>{data.fondos.map((f) => <tr key={f.id}><td><div className="ent-name">{f.nombre}</div><div className="ent-sub">{f.organismo}</div></td><td className="ent-sub">{f.origen === 'EXTERNO' ? 'Externo' : 'Municipal'}</td><td className="mono">{f.montoMax ? `$${f.montoMax.toLocaleString('es-CL')}` : '—'}</td><td className="mono">{f.postulaciones}</td><td><span className={`chip ${f.estado === 'ABIERTA' ? 'c-info' : 'c-mute'}`}>{f.estado.toLowerCase()}</span></td></tr>)}</tbody>
        </table></div>
      )}
      {crear && <CrearFondo onClose={() => setCrear(false)} />}
    </>
  );
}

export function EvaluarFondos() {
  const qc = useQueryClient();
  const { data: fondos } = useQuery({ queryKey: ['gestion-fondos'], queryFn: () => api.get<{ fondos: FondoGestion[] }>('/api/gestion/fondos') });
  const [fondoId, setFondoId] = useState<string | null>(null);
  const lista = fondos?.fondos ?? [];
  const activo = fondoId ?? lista[0]?.id ?? null;
  const { data } = useQuery({ queryKey: ['eval-fondo', activo], queryFn: () => api.get<{ postulaciones: PostulacionFondoEval[] }>(`/api/gestion/fondos/${activo}/postulaciones`), enabled: !!activo });
  const decidir = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: string }) => api.post(`/api/gestion/postulaciones-fondo/${id}/decidir`, { decision }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eval-fondo', activo] }),
  });
  if (!lista.length) return <div className="empty"><Icon name="money" /><h4>No hay convocatorias</h4></div>;
  return (
    <>
      <div className="field" style={{ maxWidth: 380, marginBottom: '1.2rem' }}><label>Convocatoria</label><select value={activo ?? ''} onChange={(e) => setFondoId(e.target.value)}>{lista.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}</select></div>
      {!data ? <div className="center-screen" style={{ minHeight: 120 }}><span className="spinner" style={{ borderTopColor: 'var(--mod-fondos)' }} /></div> : !data.postulaciones.length ? (
        <div className="empty"><Icon name="postul" /><h4>Sin postulaciones</h4><p>Aún nadie postula a esta convocatoria.</p></div>
      ) : data.postulaciones.map((p) => (
        <div className="card" key={p.id} style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
            <div className="ent-av">{p.emprendedor.nombre.charAt(0)}</div>
            <div style={{ flex: 1 }}>
              <div className="ent-name">{p.emprendedor.emprendimiento}</div>
              <div className="ent-sub">{p.emprendedor.nombre} · {p.emprendedor.rubro ?? '—'}</div>
              {/* Reputación cruzada: su historial en otros módulos es contexto. */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {p.emprendedor.esNovato ? <span className="chip c-purp">nuevo</span> : <span className="chip c-info">reputación {p.emprendedor.repScore}</span>}
                <span className="chip c-mute"><Icon name="feria" /> ferias {p.emprendedor.ferias}</span>
                <span className="chip c-mute"><Icon name="cap" /> {p.emprendedor.cursos} cursos</span>
                <span className="chip c-mute"><Icon name="award" /> {p.emprendedor.certificados} cert.</span>
              </div>
            </div>
            {p.estado !== 'POSTULADA' && p.estado !== 'EN_EVALUACION' ? <span className={`chip ${p.estado === 'ADJUDICADA' ? 'c-ok' : 'c-bad'}`}>{p.estado.toLowerCase()}</span> : null}
          </div>
          {p.proyecto && <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '12px 0', lineHeight: 1.6, paddingLeft: 42 }}>{p.proyecto}</p>}
          {(p.estado === 'POSTULADA' || p.estado === 'EN_EVALUACION') && (
            <div style={{ display: 'flex', gap: 8, paddingLeft: 42 }}>
              <button className="btn-p btn-sm" style={{ background: 'var(--mod-fondos)', color: '#0b1a0f' }} onClick={() => decidir.mutate({ id: p.id, decision: 'ADJUDICADA' })}><Icon name="award" /> Adjudicar</button>
              <button className="btn-g btn-sm" onClick={() => decidir.mutate({ id: p.id, decision: 'RECHAZADA' })}>Rechazar</button>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

export function DashboardFondos() {
  const { data, isLoading } = useQuery({ queryKey: ['dash-fondos'], queryFn: () => api.get<DashboardFondos>('/api/gestion/dashboards/fondos') });
  if (isLoading || !data) return <div className="center-screen" style={{ minHeight: 200 }}><span className="spinner" style={{ borderTopColor: 'var(--mod-fondos)' }} /></div>;
  const max = Math.max(1, ...data.distribucionRubro.map((d) => d.total));
  return (
    <>
      <div className="grid g3" style={{ marginBottom: '1.4rem' }}>
        <div className="kpi"><div className="kpi-lbl"><Icon name="award" size={14} style={{ stroke: 'var(--mod-fondos)' }} /> Fondos entregados</div><div className="kpi-val">{data.fondosEntregados}</div></div>
        <div className="kpi"><div className="kpi-lbl"><Icon name="empr" size={14} style={{ stroke: 'var(--mod-fondos)' }} /> Emprendedores apoyados</div><div className="kpi-val">{data.emprendedoresApoyados}</div></div>
        <div className="kpi"><div className="kpi-lbl"><Icon name="postul" size={14} style={{ stroke: 'var(--mod-fondos)' }} /> Postulaciones</div><div className="kpi-val">{data.postulaciones}</div></div>
      </div>
      <div className="section-t">Adjudicados por rubro</div>
      {data.distribucionRubro.length === 0 ? <div className="empty"><Icon name="money" /><h4>Sin adjudicaciones aún</h4><p>Los números se llenan con data real al adjudicar fondos.</p></div> : (
        <div className="card">{data.distribucionRubro.map((d) => (
          <div key={d.clave} style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 10 }}>
            <div style={{ width: 160, fontSize: 12.5 }}>{d.clave}</div>
            <div className="prog" style={{ flex: 1 }}><div className="prog-fill" style={{ width: `${(d.total / max) * 100}%`, background: 'linear-gradient(90deg,#15803d,var(--mod-fondos))' }} /></div>
            <div className="mono ent-sub" style={{ width: 30, textAlign: 'right' }}>{d.total}</div>
          </div>
        ))}</div>
      )}
    </>
  );
}

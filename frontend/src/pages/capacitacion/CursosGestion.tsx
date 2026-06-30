import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { api, ApiError } from '../../api/client';
import type { CursoGestion, Rubro } from '../../types';

function CrearCurso({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: rubros } = useQuery({ queryKey: ['rubros'], queryFn: () => api.get<{ rubros: Rubro[] }>('/api/rubros') });
  const [f, setF] = useState({ nombre: '', descripcion: '', modalidad: 'PRESENCIAL', cupos: 30, rubroObjetivoId: '' });
  const [sesiones, setSesiones] = useState<string[]>(['']);
  const [error, setError] = useState('');
  const crear = useMutation({
    mutationFn: () => api.post('/api/gestion/cursos', { nombre: f.nombre, descripcion: f.descripcion || undefined, modalidad: f.modalidad, cupos: Number(f.cupos), rubroObjetivoId: f.rubroObjetivoId || null, sesiones: sesiones.filter((s) => s.trim()).map((titulo) => ({ titulo })) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gestion-cursos'] }); onClose(); },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'No se pudo crear'),
  });
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '88vh', overflowY: 'auto' }}>
        <h3>Crear curso</h3>
        {error && <div className="alert alert-bad" style={{ margin: '1rem 0' }}><Icon name="info" />{error}</div>}
        <div className="field"><label>Nombre</label><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></div>
        <div className="field"><label>Descripción</label><textarea value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></div>
        <div className="grid g3">
          <div className="field"><label>Modalidad</label><select value={f.modalidad} onChange={(e) => setF({ ...f, modalidad: e.target.value })}><option value="PRESENCIAL">Presencial</option><option value="ONLINE">Online</option></select></div>
          <div className="field"><label>Cupos</label><input type="number" value={f.cupos} onChange={(e) => setF({ ...f, cupos: Number(e.target.value) })} /></div>
          <div className="field"><label>Rubro objetivo</label><select value={f.rubroObjetivoId} onChange={(e) => setF({ ...f, rubroObjetivoId: e.target.value })}><option value="">General</option>{rubros?.rubros.map((r) => <option key={r.id} value={r.id}>{r.alias}</option>)}</select></div>
        </div>
        <div className="field">
          <label>Sesiones</label>
          {sesiones.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <input value={s} onChange={(e) => setSesiones(sesiones.map((x, j) => j === i ? e.target.value : x))} placeholder={`Sesión ${i + 1}`} style={{ flex: 1, background: 'var(--bg3)', border: '.5px solid var(--border)', borderRadius: 7, padding: '8px 11px', color: 'var(--text)' }} />
              {sesiones.length > 1 && <button className="btn-g btn-xs" onClick={() => setSesiones(sesiones.filter((_, j) => j !== i))}>✕</button>}
            </div>
          ))}
          <button className="btn-g btn-sm" onClick={() => setSesiones([...sesiones, ''])}><Icon name="plus" /> Agregar sesión</button>
        </div>
        <div className="modal-actions"><button className="btn-g" onClick={onClose}>Cancelar</button><button className="btn-p" disabled={crear.isPending || !f.nombre} onClick={() => crear.mutate()}>{crear.isPending ? <span className="spinner" /> : 'Crear curso'}</button></div>
      </div>
    </div>
  );
}

export function CursosGestion() {
  const { data, isLoading } = useQuery({ queryKey: ['gestion-cursos'], queryFn: () => api.get<{ cursos: CursoGestion[] }>('/api/gestion/cursos') });
  const [crear, setCrear] = useState(false);
  return (
    <>
      <div className="card-h" style={{ marginBottom: '1.2rem' }}><div className="ico" style={{ background: 'rgba(167,139,250,.14)' }}><Icon name="cap" style={{ stroke: 'var(--mod-cap)' }} /></div><h3>Cursos</h3>
        <div className="act"><button className="btn-p btn-sm" style={{ background: 'var(--mod-cap)' }} onClick={() => setCrear(true)}><Icon name="plus" /> Crear curso</button></div></div>
      {isLoading ? <div className="center-screen" style={{ minHeight: 160 }}><span className="spinner" style={{ borderTopColor: 'var(--mod-cap)' }} /></div> : !data?.cursos.length ? (
        <div className="empty"><Icon name="cap" /><h4>Aún no hay cursos</h4><p>Crea el primer curso de capacitación.</p></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="tbl"><thead><tr><th>Curso</th><th>Modalidad</th><th>Cupos</th><th>Inscritos</th><th>Sesiones</th><th>Certificados</th></tr></thead>
            <tbody>{data.cursos.map((c) => (
              <tr key={c.id}><td><div className="ent-name">{c.nombre}</div>{c.rubro && <div className="ent-sub">{c.rubro}</div>}</td>
                <td className="ent-sub">{c.modalidad === 'ONLINE' ? 'Online' : 'Presencial'}</td><td className="mono">{c.cupos}</td><td className="mono">{c.inscritos}</td><td className="mono">{c.sesiones}</td><td className="mono">{c.certificados}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {crear && <CrearCurso onClose={() => setCrear(false)} />}
    </>
  );
}

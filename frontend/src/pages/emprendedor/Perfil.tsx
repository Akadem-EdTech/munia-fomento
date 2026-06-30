import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { api, ApiError } from '../../api/client';
import type { PerfilEmprendedor, Rubro, Completitud } from '../../types';

const ETAPAS = [
  { id: 'idea', label: 'Idea / recién partiendo' },
  { id: 'menos_2_anios', label: 'Menos de 2 años' },
  { id: 'consolidado', label: 'Consolidado' },
];
const DOCS_SUGERIDOS = ['Inicio actividades', 'Resolución sanitaria', 'Patente municipal', 'Patente alcoholes'];

export function Perfil() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['emp-perfil'], queryFn: () => api.get<{ perfil: PerfilEmprendedor; completitud: Completitud }>('/api/emprendedor/perfil') });
  const { data: rubrosData } = useQuery({ queryKey: ['rubros'], queryFn: () => api.get<{ rubros: Rubro[] }>('/api/rubros') });
  const [form, setForm] = useState<Partial<PerfilEmprendedor>>({});
  const [docs, setDocs] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (data) {
      setForm({ nombreEmprendimiento: data.perfil.nombreEmprendimiento, descripcion: data.perfil.descripcion ?? '', telefono: data.perfil.telefono ?? '', localidad: data.perfil.localidad ?? '', rubroId: data.perfil.rubroId ?? '', etapa: data.perfil.etapa ?? '' });
      setDocs(data.perfil.documentos);
    }
  }, [data]);

  const guardar = useMutation({
    mutationFn: () => api.patch<{ completitud: Completitud }>('/api/emprendedor/perfil', { ...form, rubroId: form.rubroId || null, documentos: docs }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['emp-perfil'] }); qc.invalidateQueries({ queryKey: ['emp-inicio'] }); setMsg('Perfil actualizado'); setError(''); setTimeout(() => setMsg(''), 2500); },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'No se pudo guardar'),
  });

  if (!data) return <div className="center-screen" style={{ minHeight: 200 }}><span className="spinner" style={{ borderTopColor: 'var(--teal)' }} /></div>;
  const c = data.completitud;
  const p = data.perfil;
  const set = (k: keyof PerfilEmprendedor) => (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [k]: ev.target.value });
  const addDoc = (d: string) => { const v = d.trim(); if (v && !docs.includes(v)) setDocs([...docs, v]); };

  return (
    <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', alignItems: 'start' }}>
      <div className="card">
        <div className="card-h"><div className="ico"><Icon name="user" /></div><h3>Mi perfil</h3></div>
        {msg && <div className="alert alert-info" style={{ marginBottom: '1rem' }}><Icon name="check" />{msg}</div>}
        {error && <div className="alert alert-bad" style={{ marginBottom: '1rem' }}><Icon name="info" />{error}</div>}

        <div className="field"><label>Nombre del emprendimiento</label><input value={form.nombreEmprendimiento ?? ''} onChange={set('nombreEmprendimiento')} /></div>
        <div className="field"><label>Descripción</label><textarea value={form.descripcion ?? ''} onChange={set('descripcion')} placeholder="¿Qué haces? ¿Qué te hace distinto?" /></div>
        <div className="grid g2">
          <div className="field"><label>Rubro</label>
            <select value={form.rubroId ?? ''} onChange={set('rubroId')}>
              <option value="">— Selecciona —</option>
              {rubrosData?.rubros.map((r) => <option key={r.id} value={r.id}>{r.alias}</option>)}
            </select>
          </div>
          <div className="field"><label>Etapa</label>
            <select value={form.etapa ?? ''} onChange={set('etapa')}>
              <option value="">— Selecciona —</option>
              {ETAPAS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid g2">
          <div className="field"><label>Localidad</label><input value={form.localidad ?? ''} onChange={set('localidad')} /></div>
          <div className="field"><label>Teléfono</label><input value={form.telefono ?? ''} onChange={set('telefono')} placeholder="+56 9 ..." /></div>
        </div>

        <div className="field">
          <label>Documentos</label>
          <div>{docs.length === 0 && <span className="ent-sub">Aún no agregas documentos.</span>}
            {docs.map((d) => <span key={d} className="tag-doc"><Icon name="doc" size={13} /> {d} <button onClick={() => setDocs(docs.filter((x) => x !== d))} aria-label="quitar">✕</button></span>)}
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {DOCS_SUGERIDOS.filter((d) => !docs.includes(d)).map((d) => <button key={d} className="btn-g btn-xs" onClick={() => addDoc(d)}><Icon name="plus" size={12} /> {d}</button>)}
          </div>
        </div>

        <button className="btn-p" disabled={guardar.isPending} onClick={() => guardar.mutate()}>{guardar.isPending ? <span className="spinner" /> : 'Guardar cambios'}</button>
      </div>

      <div className="card">
        <div className="prog-row"><strong style={{ fontSize: 14 }}>Completitud</strong><span className="rep-num" style={{ color: c.porcentaje === 100 ? 'var(--ok)' : 'var(--teal-light)' }}>{c.porcentaje}%</span></div>
        <div className="prog"><div className="prog-fill" style={{ width: `${c.porcentaje}%` }} /></div>
        <div className="steps" style={{ marginTop: 14 }}>
          {c.items.map((it) => (
            <div key={it.key} className={`step ${it.hecho ? 'done' : ''}`} style={{ padding: '8px 0' }}>
              <div className="step-ico"><Icon name={it.hecho ? 'check' : 'plus'} /></div>
              <div className="step-txt"><div className="t">{it.label}</div>{!it.hecho && <div className="h">{it.hint}</div>}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '1.2rem', paddingTop: '1rem', borderTop: '.5px solid var(--border-soft)' }}>
          <div className="ent-sub">Reputación</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span className="rep-num" style={{ fontSize: 22 }}>{p.feriasTotales === 0 ? '—' : p.repScore}</span>
            <span className="ent-sub">{p.feriasTotales === 0 ? 'Sin historial aún' : `cumplió ${p.feriasCumplidas} de ${p.feriasTotales} ferias`}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { api, ApiError } from '../../api/client';
import type { FeriaGestion, Rubro } from '../../types';

type Tipo = 'TEXTO' | 'SELECCION' | 'NUMERO' | 'SINO' | 'ADJUNTO';
interface PreguntaForm { texto: string; tipo: Tipo; puntuable: boolean; peso: number; opciones: string }

const estadoChip = (e: string) => {
  const m: Record<string, [string, string]> = { BORRADOR: ['c-mute', 'Borrador'], ABIERTA: ['c-info', 'Abierta'], EN_EVALUACION: ['c-warn', 'En evaluación'], CERRADA: ['c-ok', 'Cerrada'] };
  const [c, t] = m[e] ?? ['c-mute', e];
  return <span className={`chip ${c}`}>{t}</span>;
};

function CrearFeria({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: rubros } = useQuery({ queryKey: ['rubros'], queryFn: () => api.get<{ rubros: Rubro[] }>('/api/rubros') });
  const [f, setF] = useState({ nombre: '', objetivo: '', fecha: '', ubicacion: '', cupos: 30, pesoProp: 50 });
  const [rubroIds, setRubroIds] = useState<string[]>([]);
  const [preguntas, setPreguntas] = useState<PreguntaForm[]>([]);
  const [error, setError] = useState('');

  const crear = useMutation({
    mutationFn: () => api.post('/api/gestion/ferias', {
      nombre: f.nombre, objetivo: f.objetivo || undefined, fecha: f.fecha || undefined, ubicacion: f.ubicacion || undefined,
      cupos: Number(f.cupos), pesoProp: f.pesoProp, pesoRep: 100 - f.pesoProp, rubroIds,
      preguntas: preguntas.map((p) => ({ texto: p.texto, tipo: p.tipo, puntuable: p.puntuable, peso: p.puntuable ? Number(p.peso) : 0, opciones: p.tipo === 'SELECCION' ? p.opciones.split(',').map((o) => o.trim()).filter(Boolean) : [] })),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gestion-ferias'] }); onClose(); },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'No se pudo crear'),
  });

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '88vh', overflowY: 'auto' }}>
        <h3>Crear feria</h3>
        {error && <div className="alert alert-bad" style={{ margin: '1rem 0' }}><Icon name="info" />{error}</div>}
        <div className="field"><label>Nombre</label><input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></div>
        <div className="field"><label>Objetivo</label><textarea value={f.objetivo} onChange={(e) => setF({ ...f, objetivo: e.target.value })} /></div>
        <div className="grid g2">
          <div className="field"><label>Fecha</label><input value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} placeholder="ej: 14–15 Mar 2026" /></div>
          <div className="field"><label>Ubicación</label><input value={f.ubicacion} onChange={(e) => setF({ ...f, ubicacion: e.target.value })} /></div>
        </div>
        <div className="field" style={{ maxWidth: 160 }}><label>Cupos</label><input type="number" value={f.cupos} onChange={(e) => setF({ ...f, cupos: Number(e.target.value) })} /></div>

        <div className="field">
          <label>Ponderación: Propuesta {f.pesoProp}% · Trayectoria {100 - f.pesoProp}%</label>
          <div className="perilla"><input type="range" min={0} max={100} value={f.pesoProp} onChange={(e) => setF({ ...f, pesoProp: Number(e.target.value) })} /></div>
        </div>

        <div className="field">
          <label>Rubros admitidos</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {rubros?.rubros.map((r) => (
              <label key={r.id} className="checkbox" style={{ background: 'var(--bg3)', border: '.5px solid var(--border)', borderRadius: 8, padding: '7px 11px', alignItems: 'center' }}>
                <input type="checkbox" checked={rubroIds.includes(r.id)} onChange={() => setRubroIds(rubroIds.includes(r.id) ? rubroIds.filter((x) => x !== r.id) : [...rubroIds, r.id])} /> {r.alias}
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Preguntas configurables ({preguntas.length}/6)</label>
          {preguntas.map((p, i) => (
            <div key={i} className="card" style={{ padding: '0.9rem', marginBottom: 8 }}>
              <input value={p.texto} onChange={(e) => setPreguntas(preguntas.map((x, j) => j === i ? { ...x, texto: e.target.value } : x))} placeholder="Texto de la pregunta" style={{ width: '100%', background: 'var(--bg3)', border: '.5px solid var(--border)', borderRadius: 7, padding: '8px 11px', color: 'var(--text)', fontFamily: 'inherit', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={p.tipo} onChange={(e) => setPreguntas(preguntas.map((x, j) => j === i ? { ...x, tipo: e.target.value as Tipo } : x))} style={{ background: 'var(--bg3)', border: '.5px solid var(--border)', borderRadius: 7, padding: '7px 10px', color: 'var(--text)' }}>
                  <option value="TEXTO">Texto</option><option value="SELECCION">Selección</option><option value="NUMERO">Número</option><option value="SINO">Sí/No</option><option value="ADJUNTO">Adjunto</option>
                </select>
                {p.tipo === 'SELECCION' && <input value={p.opciones} onChange={(e) => setPreguntas(preguntas.map((x, j) => j === i ? { ...x, opciones: e.target.value } : x))} placeholder="opciones, separadas por coma" style={{ flex: 1, background: 'var(--bg3)', border: '.5px solid var(--border)', borderRadius: 7, padding: '7px 10px', color: 'var(--text)' }} />}
                <label className="checkbox" style={{ alignItems: 'center' }}><input type="checkbox" checked={p.puntuable} onChange={(e) => setPreguntas(preguntas.map((x, j) => j === i ? { ...x, puntuable: e.target.checked } : x))} /> Puntuable</label>
                {p.puntuable && <input type="number" value={p.peso} onChange={(e) => setPreguntas(preguntas.map((x, j) => j === i ? { ...x, peso: Number(e.target.value) } : x))} style={{ width: 70, background: 'var(--bg3)', border: '.5px solid var(--border)', borderRadius: 7, padding: '7px 10px', color: 'var(--text)' }} placeholder="peso" />}
                <button className="btn-g btn-xs" onClick={() => setPreguntas(preguntas.filter((_, j) => j !== i))} style={{ marginLeft: 'auto' }}>Quitar</button>
              </div>
            </div>
          ))}
          {preguntas.length < 6 && <button className="btn-g btn-sm" onClick={() => setPreguntas([...preguntas, { texto: '', tipo: 'TEXTO', puntuable: false, peso: 0, opciones: '' }])}><Icon name="plus" /> Agregar pregunta</button>}
        </div>

        <div className="modal-actions">
          <button className="btn-g" onClick={onClose}>Cancelar</button>
          <button className="btn-p" disabled={crear.isPending || !f.nombre} onClick={() => crear.mutate()}>{crear.isPending ? <span className="spinner" /> : 'Crear feria'}</button>
        </div>
      </div>
    </div>
  );
}

export function FeriasGestion() {
  const { data, isLoading } = useQuery({ queryKey: ['gestion-ferias'], queryFn: () => api.get<{ ferias: FeriaGestion[] }>('/api/gestion/ferias') });
  const [crear, setCrear] = useState(false);

  return (
    <>
      <div className="card-h" style={{ marginBottom: '1.2rem' }}>
        <div className="ico"><Icon name="feria" /></div><h3>Ferias</h3>
        <div className="act"><button className="btn-p btn-sm" onClick={() => setCrear(true)}><Icon name="plus" /> Crear feria</button></div>
      </div>
      {isLoading ? <div className="center-screen" style={{ minHeight: 160 }}><span className="spinner" style={{ borderTopColor: 'var(--teal)' }} /></div> : !data?.ferias.length ? (
        <div className="empty"><Icon name="feria" /><h4>Aún no hay ferias</h4><p>Crea la primera feria para empezar a recibir postulaciones.</p></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="tbl">
            <thead><tr><th>Feria</th><th>Fecha</th><th>Cupos</th><th>Ponderación</th><th>Postulados</th><th>Estado</th></tr></thead>
            <tbody>
              {data.ferias.map((f) => (
                <tr key={f.id}>
                  <td><div className="ent-name">{f.nombre}</div><div className="ent-sub">{f.rubros.join(' · ')}</div></td>
                  <td className="ent-sub">{f.fecha ?? '—'}</td><td className="mono">{f.cupos}</td>
                  <td className="ent-sub mono">{f.pesoProp}/{f.pesoRep}</td><td className="mono">{f.postulados}</td><td>{estadoChip(f.estado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {crear && <CrearFeria onClose={() => setCrear(false)} />}
    </>
  );
}

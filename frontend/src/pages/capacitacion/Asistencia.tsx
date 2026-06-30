import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { api } from '../../api/client';
import type { CursoGestion, InscritoCurso, SesionCurso } from '../../types';

function useCursoSel() {
  const { data } = useQuery({ queryKey: ['gestion-cursos'], queryFn: () => api.get<{ cursos: CursoGestion[] }>('/api/gestion/cursos') });
  const [cursoId, setCursoId] = useState<string | null>(null);
  const cursos = data?.cursos ?? [];
  const activo = cursoId ?? cursos[0]?.id ?? null;
  const Selector = () => (
    <div className="field" style={{ maxWidth: 360, marginBottom: '1.2rem' }}>
      <label>Curso</label>
      <select value={activo ?? ''} onChange={(e) => setCursoId(e.target.value)}>{cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
    </div>
  );
  return { cursos, activo, Selector };
}

function useInscritos(cursoId: string | null) {
  return useQuery({
    queryKey: ['inscritos', cursoId],
    queryFn: () => api.get<{ curso: { id: string; nombre: string; sesiones: SesionCurso[] }; inscritos: InscritoCurso[] }>(`/api/gestion/cursos/${cursoId}/inscritos`),
    enabled: !!cursoId,
  });
}

export function Inscritos() {
  const qc = useQueryClient();
  const { cursos, activo, Selector } = useCursoSel();
  const { data } = useInscritos(activo);
  const certificar = useMutation({
    mutationFn: (empId: string) => api.post(`/api/gestion/cursos/${activo}/certificar/${empId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inscritos', activo] }),
  });
  if (!cursos.length) return <div className="empty"><Icon name="cap" /><h4>No hay cursos</h4></div>;
  return (
    <><Selector />
      {!data ? <div className="center-screen" style={{ minHeight: 120 }}><span className="spinner" style={{ borderTopColor: 'var(--mod-cap)' }} /></div> : !data.inscritos.length ? (
        <div className="empty"><Icon name="users" /><h4>Sin inscritos</h4><p>Aún nadie se inscribe a este curso.</p></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="tbl"><thead><tr><th>Emprendedor</th><th>Estado</th><th>Asistencias</th><th>Certificado</th><th></th></tr></thead>
            <tbody>{data.inscritos.map((i) => (
              <tr key={i.emprendedorId}>
                <td><div className="ent-cell"><div className="ent-av">{i.nombre.charAt(0)}</div><div><div className="ent-name">{i.emprendimiento}</div><div className="ent-sub">{i.nombre}</div></div></div></td>
                <td><span className={`chip ${i.estado === 'INSCRITO' ? 'c-ok' : 'c-info'}`}>{i.estado === 'INSCRITO' ? 'Inscrito' : 'Lista de espera'}</span></td>
                <td className="mono">{i.asistio}</td>
                <td>{i.certificado ? <span className="chip c-ok"><Icon name="check" /> Emitido</span> : <span className="ent-sub">—</span>}</td>
                <td style={{ textAlign: 'right' }}>{!i.certificado && i.asistio > 0 && <button className="btn-g btn-xs" disabled={certificar.isPending} onClick={() => certificar.mutate(i.emprendedorId)}><Icon name="award" size={13} /> Certificar</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

function MatrizAsistencia({ cursoId }: { cursoId: string }) {
  const qc = useQueryClient();
  const { data } = useInscritos(cursoId);
  const [local, setLocal] = useState<Record<string, boolean>>({});
  useEffect(() => { setLocal({}); }, [cursoId]);
  const marcar = useMutation({
    mutationFn: ({ sesionId, empId, presente }: { sesionId: string; empId: string; presente: boolean }) => api.post(`/api/gestion/asistencia/${sesionId}/${empId}`, { presente }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inscritos', cursoId] }),
  });
  if (!data) return <div className="center-screen" style={{ minHeight: 120 }}><span className="spinner" style={{ borderTopColor: 'var(--mod-cap)' }} /></div>;
  if (!data.curso.sesiones.length) return <div className="empty"><Icon name="cal" /><h4>Este curso no tiene sesiones</h4><p>Agrega sesiones al crear el curso para tomar asistencia.</p></div>;
  if (!data.inscritos.length) return <div className="empty"><Icon name="users" /><h4>Sin inscritos</h4></div>;

  const key = (s: string, e: string) => `${s}:${e}`;
  return (
    <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
      <table className="tbl">
        <thead><tr><th>Emprendedor</th>{data.curso.sesiones.map((s, i) => <th key={s.id} style={{ textAlign: 'center' }}>{s.titulo ?? `Sesión ${i + 1}`}</th>)}</tr></thead>
        <tbody>{data.inscritos.filter((i) => i.estado === 'INSCRITO').map((emp) => (
          <tr key={emp.emprendedorId}>
            <td><div className="ent-name">{emp.emprendimiento}</div><div className="ent-sub">{emp.nombre}</div></td>
            {data.curso.sesiones.map((s) => {
              const k = key(s.id, emp.emprendedorId);
              const on = local[k] ?? false;
              return (
                <td key={s.id} style={{ textAlign: 'center' }}>
                  <button className="check-box" style={{ margin: '0 auto', ...(on ? { background: 'var(--ok)', borderColor: 'var(--ok)' } : {}) }}
                    onClick={() => { const next = !on; setLocal((p) => ({ ...p, [k]: next })); marcar.mutate({ sesionId: s.id, empId: emp.emprendedorId, presente: next }); }}>
                    <Icon name="check" style={{ opacity: on ? 1 : 0, stroke: '#fff' }} />
                  </button>
                </td>
              );
            })}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export function Asistencia() {
  const { cursos, activo, Selector } = useCursoSel();
  if (!cursos.length) return <div className="empty"><Icon name="cap" /><h4>No hay cursos</h4></div>;
  return (<><Selector /><p className="ent-sub" style={{ marginBottom: '1rem' }}><Icon name="info" size={12} style={{ verticalAlign: '-1px' }} /> Cada marca se guarda al instante.</p>{activo && <MatrizAsistencia cursoId={activo} />}</>);
}

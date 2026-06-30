import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { api } from '../../api/client';
import type { CursoDisponible } from '../../types';

export function CursosDisponibles() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['cursos-disp'], queryFn: () => api.get<{ cursos: CursoDisponible[] }>('/api/cursos/disponibles') });
  const inscribir = useMutation({
    mutationFn: (id: string) => api.post(`/api/cursos/${id}/inscribir`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cursos-disp'] }); qc.invalidateQueries({ queryKey: ['mis-inscripciones'] }); },
  });

  if (isLoading) return <div className="center-screen" style={{ minHeight: 200 }}><span className="spinner" style={{ borderTopColor: 'var(--mod-cap)' }} /></div>;
  const cursos = data?.cursos ?? [];
  if (!cursos.length) return <div className="empty"><Icon name="cap" /><h4>Aún no hay cursos</h4><p>Te avisaremos cuando se abra una nueva capacitación.</p></div>;

  return (
    <div className="grid g2">
      {cursos.map((c) => (
        <div className="card" key={c.id}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'start', marginBottom: 10 }}>
            <div className="ha-ico" style={{ background: 'rgba(167,139,250,.14)' }}><Icon name="cap" style={{ stroke: 'var(--mod-cap)' }} /></div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>{c.nombre}</h3>
              <div className="ent-sub">{c.modalidad === 'ONLINE' ? 'Online' : 'Presencial'}{c.rubro ? ` · ${c.rubro}` : ''}</div>
            </div>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>{c.descripcion}</p>
          <div className="prog-row"><span className="ent-sub">Ocupación</span><span className="ent-sub mono">{c.inscritos}/{c.cupos}</span></div>
          <div className="prog" style={{ marginBottom: 12 }}><div className="prog-fill" style={{ width: `${c.ocupacion}%`, background: 'linear-gradient(90deg,#7c3aed,var(--mod-cap))' }} /></div>
          {c.miEstado ? (
            <span className={`chip ${c.miEstado === 'INSCRITO' ? 'c-ok' : 'c-info'}`}><Icon name="check" /> {c.miEstado === 'INSCRITO' ? 'Inscrito' : 'En lista de espera'}</span>
          ) : (
            <button className="btn-p btn-sm" style={{ background: 'var(--mod-cap)' }} disabled={inscribir.isPending} onClick={() => inscribir.mutate(c.id)}>{inscribir.isPending ? <span className="spinner" /> : <><Icon name="plus" /> Inscribirme</>}</button>
          )}
        </div>
      ))}
    </div>
  );
}

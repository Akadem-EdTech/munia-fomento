import { useQuery } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { api } from '../../api/client';
import type { DashboardCapacitacion } from '../../types';

export function DashboardFormacion() {
  const { data, isLoading } = useQuery({ queryKey: ['dash-cap'], queryFn: () => api.get<DashboardCapacitacion>('/api/gestion/dashboards/capacitacion') });
  if (isLoading || !data) return <div className="center-screen" style={{ minHeight: 200 }}><span className="spinner" style={{ borderTopColor: 'var(--mod-cap)' }} /></div>;
  const max = Math.max(1, ...data.masDemandados.map((c) => c.inscritos));
  return (
    <>
      <div className="grid g4" style={{ marginBottom: '1.4rem' }}>
        <div className="kpi"><div className="kpi-lbl"><Icon name="cap" size={14} style={{ stroke: 'var(--mod-cap)' }} /> Cursos dictados</div><div className="kpi-val">{data.cursosDictados}</div></div>
        <div className="kpi"><div className="kpi-lbl"><Icon name="empr" size={14} style={{ stroke: 'var(--mod-cap)' }} /> Emprendedores formados</div><div className="kpi-val">{data.emprendedoresFormados}</div></div>
        <div className="kpi"><div className="kpi-lbl"><Icon name="award" size={14} style={{ stroke: 'var(--mod-cap)' }} /> Certificados</div><div className="kpi-val">{data.certificadosEmitidos}</div></div>
        <div className="kpi"><div className="kpi-lbl"><Icon name="check" size={14} style={{ stroke: 'var(--mod-cap)' }} /> Tasa de asistencia</div><div className="kpi-val">{data.tasaAsistencia}<span className="u">%</span></div></div>
      </div>
      <div className="section-t">Cursos más demandados</div>
      {data.masDemandados.length === 0 ? <div className="empty"><Icon name="cap" /><h4>Sin datos aún</h4></div> : (
        <div className="card">
          {data.masDemandados.map((c) => (
            <div key={c.nombre} style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 10 }}>
              <div style={{ width: 200, fontSize: 12.5 }}>{c.nombre}</div>
              <div className="prog" style={{ flex: 1 }}><div className="prog-fill" style={{ width: `${(c.inscritos / max) * 100}%`, background: 'linear-gradient(90deg,#7c3aed,var(--mod-cap))' }} /></div>
              <div className="mono ent-sub" style={{ width: 70, textAlign: 'right' }}>{c.inscritos}/{c.cupos}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

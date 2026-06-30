import { useQuery } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { api } from '../../api/client';
import type { DashboardsFerias } from '../../types';

const Kpi = ({ label, val, unidad }: { label: string; val: number | string; unidad?: string }) => (
  <div className="kpi"><div className="kpi-lbl">{label}</div><div className="kpi-val">{val}{unidad && <span className="u"> {unidad}</span>}</div></div>
);

export function Dashboards() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboards-ferias'], queryFn: () => api.get<DashboardsFerias>('/api/gestion/dashboards/ferias') });
  if (isLoading || !data) return <div className="center-screen" style={{ minHeight: 200 }}><span className="spinner" style={{ borderTopColor: 'var(--teal)' }} /></div>;

  return (
    <>
      {/* Operativo */}
      {data.operativo && (
        <>
          <div className="section-t" style={{ marginTop: 0 }}>Operativo · {data.operativo.feria}</div>
          <div className="grid g4" style={{ marginBottom: '1.4rem' }}>
            <Kpi label="Postulados" val={data.operativo.postulados} />
            <Kpi label="Admitidos" val={data.operativo.admitidos} />
            <Kpi label="En lista de espera" val={data.operativo.listaEspera} />
            <Kpi label="Cupos usados" val={data.operativo.cuposUsadosPct} unidad="%" />
          </div>
        </>
      )}

      {/* Territorial */}
      {data.territorialRubro && data.territorialRubro.length > 0 && (
        <>
          <div className="section-t">Territorial · admitidos por rubro</div>
          <div className="card" style={{ marginBottom: '1.4rem' }}>
            {data.territorialRubro.map((d) => (
              <div className="bar-row" key={d.clave} style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 10 }}>
                <div style={{ width: 140, fontSize: 12.5 }}>{d.clave}</div>
                <div className="prog" style={{ flex: 1 }}><div className="prog-fill" style={{ width: `${d.pct}%` }} /></div>
                <div className="mono ent-sub" style={{ width: 60, textAlign: 'right' }}>{d.total} ({d.pct}%)</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Narrativo */}
      <div className="section-t">Relato · para presentar</div>
      <div className="dash-narr">
        <div className="grid g2">
          <div>
            <div className="kpi-lbl"><Icon name="feria" size={14} /> Ferias realizadas</div>
            <div className="kpi-big">{data.narrativo.feriasRealizadas}</div>
          </div>
          <div>
            <div className="kpi-lbl"><Icon name="empr" size={14} /> Emprendedores participantes</div>
            <div className="kpi-big">{data.narrativo.emprendedoresParticipantes}</div>
          </div>
        </div>
        {(data.narrativo.ventasReportadas.length > 0 || data.narrativo.publicoEstimado.length > 0) && (
          <div style={{ marginTop: '1.4rem', paddingTop: '1.2rem', borderTop: '.5px solid var(--border-soft)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {data.narrativo.publicoEstimado.length > 0 && <div><div className="ent-sub">Público estimado (reportado)</div><div className="mono" style={{ fontSize: 16, marginTop: 4 }}>{data.narrativo.publicoEstimado.join(' · ')}</div></div>}
            {data.narrativo.ventasReportadas.length > 0 && <div><div className="ent-sub">Ventas reportadas (referencial)</div><div className="mono" style={{ fontSize: 16, marginTop: 4 }}>{data.narrativo.ventasReportadas.join(' · ')}</div></div>}
          </div>
        )}
      </div>
      <p className="ent-sub" style={{ marginTop: 10 }}><Icon name="info" size={12} style={{ verticalAlign: '-1px' }} /> Las ventas son autoreportadas: dato narrativo, no métrica de ranking.</p>
    </>
  );
}

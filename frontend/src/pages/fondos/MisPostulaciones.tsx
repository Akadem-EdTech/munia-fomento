import { useQuery } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { api } from '../../api/client';
import type { MiPostulacionFondo } from '../../types';

const chip = (e: string) => {
  const m: Record<string, [string, string]> = { POSTULADA: ['c-warn', 'Postulada'], EN_EVALUACION: ['c-info', 'En evaluación'], ADJUDICADA: ['c-ok', 'Adjudicada'], RECHAZADA: ['c-bad', 'No adjudicada'] };
  const [c, t] = m[e] ?? ['c-mute', e];
  return <span className={`chip ${c}`}>{t}</span>;
};

export function MisPostulacionesFondo() {
  const { data, isLoading } = useQuery({ queryKey: ['fondos-mis'], queryFn: () => api.get<{ postulaciones: MiPostulacionFondo[] }>('/api/fondos/mis-postulaciones') });
  if (isLoading) return <div className="center-screen" style={{ minHeight: 200 }}><span className="spinner" style={{ borderTopColor: 'var(--mod-fondos)' }} /></div>;
  const ps = data?.postulaciones ?? [];
  if (!ps.length) return <div className="empty"><Icon name="money" /><h4>Aún no postulas a ningún fondo</h4><p>Descubre los fondos que calzan con tu perfil y postula.</p></div>;
  return (
    <div className="card" style={{ padding: 0 }}>
      <table className="tbl"><thead><tr><th>Fondo</th><th>Organismo</th><th>Estado</th></tr></thead>
        <tbody>{ps.map((p) => <tr key={p.id}><td className="ent-name">{p.fondo.nombre}</td><td className="ent-sub">{p.fondo.organismo}</td><td>{chip(p.estado)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

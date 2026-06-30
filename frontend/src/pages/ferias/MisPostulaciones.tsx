import { useQuery } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { api } from '../../api/client';
import type { MiPostulacion } from '../../types';

const chip = (estado: string) => {
  const map: Record<string, [string, string]> = {
    PENDIENTE: ['c-warn', 'En revisión'], ADMITIDA: ['c-ok', 'Admitida'],
    RECHAZADA: ['c-bad', 'No seleccionada'], LISTA_ESPERA: ['c-info', 'Lista de espera'],
  };
  const [cls, txt] = map[estado] ?? ['c-mute', estado];
  return <span className={`chip ${cls}`}>{txt}</span>;
};

export function MisPostulaciones() {
  const { data, isLoading } = useQuery({ queryKey: ['mis-postulaciones'], queryFn: () => api.get<{ postulaciones: MiPostulacion[] }>('/api/ferias/mis-postulaciones') });
  if (isLoading) return <div className="center-screen" style={{ minHeight: 200 }}><span className="spinner" style={{ borderTopColor: 'var(--teal)' }} /></div>;
  const postus = data?.postulaciones ?? [];

  if (postus.length === 0) return <div className="empty"><Icon name="postul" /><h4>Aún no has postulado a ninguna feria</h4><p>Revisa las ferias abiertas y postula a la que más te acomode.</p></div>;

  return (
    <div className="card" style={{ padding: 0 }}>
      <table className="tbl">
        <thead><tr><th>Feria</th><th>Fecha</th><th>Estado</th></tr></thead>
        <tbody>
          {postus.map((p) => (
            <tr key={p.id}>
              <td><div className="ent-name">{p.feria.nombre}</div><div className="ent-sub">{p.feria.ubicacion}</div></td>
              <td className="ent-sub">{p.feria.fecha ?? '—'}</td>
              <td>{chip(p.estado)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { api } from '../../api/client';
import type { EmprendedorReg, Rubro } from '../../types';

export function Emprendedores() {
  const [q, setQ] = useState('');
  const [rubro, setRubro] = useState('');
  const { data: rubros } = useQuery({ queryKey: ['rubros'], queryFn: () => api.get<{ rubros: (Rubro & { codigoMaestro?: string })[] }>('/api/rubros') });
  const { data, isLoading } = useQuery({
    queryKey: ['gestion-emprendedores', q, rubro],
    queryFn: () => api.get<{ emprendedores: EmprendedorReg[] }>(`/api/gestion/emprendedores?${new URLSearchParams({ ...(q ? { q } : {}), ...(rubro ? { rubro } : {}) })}`),
  });

  return (
    <>
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.2rem', flexWrap: 'wrap' }}>
        <div className="field" style={{ margin: 0, flex: 1, minWidth: 200 }}><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o emprendimiento…" /></div>
        <div className="field" style={{ margin: 0, minWidth: 180 }}>
          <select value={rubro} onChange={(e) => setRubro(e.target.value)}>
            <option value="">Todos los rubros</option>
            {rubros?.rubros.map((r) => <option key={r.id} value={r.codigoMaestro}>{r.alias}</option>)}
          </select>
        </div>
      </div>
      {isLoading ? <div className="center-screen" style={{ minHeight: 160 }}><span className="spinner" style={{ borderTopColor: 'var(--teal)' }} /></div> : !data?.emprendedores.length ? (
        <div className="empty"><Icon name="empr" /><h4>Sin resultados</h4><p>No encontramos emprendedores con esos filtros.</p></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="tbl">
            <thead><tr><th>Emprendedor</th><th>Rubro</th><th>Localidad</th><th>Reputación</th><th>Trayectoria</th></tr></thead>
            <tbody>
              {data.emprendedores.map((e) => (
                <tr key={e.id}>
                  <td><div className="ent-cell"><div className="ent-av">{e.usuario.nombre.charAt(0)}</div><div><div className="ent-name">{e.nombreEmprendimiento}</div><div className="ent-sub">{e.usuario.nombre}</div></div></div></td>
                  <td>{e.rubro ? <span className="rubro">{e.rubro.alias}</span> : '—'}</td>
                  <td className="ent-sub">{e.localidad ?? '—'}</td>
                  <td>{e.feriasTotales === 0 ? <span className="chip c-purp">nuevo</span> : <span className="rep-num" style={{ color: 'var(--teal-light)' }}>{e.repScore}</span>}</td>
                  <td className="ent-sub">{e.feriasTotales === 0 ? 'Sin historial' : `cumplió ${e.feriasCumplidas} de ${e.feriasTotales}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

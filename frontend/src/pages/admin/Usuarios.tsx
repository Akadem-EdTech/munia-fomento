import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { api, ApiError } from '../../api/client';
import type { Funcionario, Modulo, RolFuncionario } from '../../types';

const MODULOS: { id: Modulo; label: string }[] = [
  { id: 'FERIAS', label: 'Ferias' }, { id: 'CAPACITACION', label: 'Capacitación' }, { id: 'FONDOS', label: 'Fondos' },
];
const ROLES: { id: RolFuncionario; label: string; desc: string }[] = [
  { id: 'ADMINISTRADOR', label: 'Administrador', desc: 'Crea, configura y gestiona en sus módulos.' },
  { id: 'EVALUADOR', label: 'Evaluador', desc: 'Sólo evalúa lo que se le asigna.' },
  { id: 'JEFATURA', label: 'Jefatura', desc: 'Sólo lectura, sólo dashboards.' },
];
const estadoChip = (e: Funcionario['estado']) =>
  e === 'ACTIVO' ? <span className="chip c-ok"><Icon name="check" /> Activo</span>
    : e === 'INVITADO' ? <span className="chip c-warn">Invitado</span>
      : <span className="chip c-bad">Suspendido</span>;

interface FormState { id?: string; nombre: string; email: string; cargo: string; rol: RolFuncionario; modulos: Modulo[]; }
const VACIO: FormState = { nombre: '', email: '', cargo: '', rol: 'EVALUADOR', modulos: [] };

export function Usuarios() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['usuarios'], queryFn: () => api.get<{ funcionarios: Funcionario[] }>('/api/usuarios').then((r) => r.funcionarios) });
  const [form, setForm] = useState<FormState | null>(null);
  const [confirmar, setConfirmar] = useState<Funcionario | null>(null);
  const [error, setError] = useState('');

  const invalidar = () => qc.invalidateQueries({ queryKey: ['usuarios'] });
  const guardar = useMutation({
    mutationFn: (f: FormState) => f.id
      ? api.patch(`/api/usuarios/${f.id}`, { cargo: f.cargo, rol: f.rol, modulos: f.modulos })
      : api.post('/api/usuarios/invitar', { nombre: f.nombre, email: f.email, cargo: f.cargo, rol: f.rol, modulos: f.modulos }),
    onSuccess: () => { invalidar(); setForm(null); setError(''); },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Error al guardar'),
  });
  const suspender = useMutation({
    mutationFn: (u: Funcionario) => api.post(`/api/usuarios/${u.id}/${u.estado === 'SUSPENDIDO' ? 'reactivar' : 'suspender'}`),
    onSuccess: () => { invalidar(); setConfirmar(null); },
  });

  const toggleMod = (m: Modulo) => setForm((f) => f && ({ ...f, modulos: f.modulos.includes(m) ? f.modulos.filter((x) => x !== m) : [...f.modulos, m] }));

  return (
    <>
      <div className="card-h" style={{ marginBottom: '1.2rem' }}>
        <div className="ico"><Icon name="users" /></div>
        <h3>Funcionarios del municipio</h3>
        <div className="act"><button className="btn-p btn-sm" onClick={() => { setForm(VACIO); setError(''); }}><Icon name="plus" /> Invitar funcionario</button></div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="empty"><span className="spinner" style={{ borderTopColor: 'var(--teal)' }} /></div>
        ) : !data?.length ? (
          <div className="empty"><Icon name="users" /><h4>Aún no hay funcionarios</h4><p>Invita al primer funcionario para empezar a delegar la gestión.</p></div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Funcionario</th><th>Rol</th><th>Módulos</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {data.map((u) => (
                <tr key={u.id}>
                  <td><div className="ent-cell"><div className="ent-av">{u.nombre.charAt(0)}</div><div><div className="ent-name">{u.nombre}</div><div className="ent-sub">{u.funcionario?.cargo ?? u.email}</div></div></div></td>
                  <td>{u.funcionario?.rol}</td>
                  <td>{u.funcionario?.modulos.length ? u.funcionario.modulos.map((m) => <span key={m} className="rubro" style={{ marginRight: 4 }}>{m.toLowerCase()}</span>) : <span className="ent-sub">—</span>}</td>
                  <td>{estadoChip(u.estado)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn-g btn-xs" onClick={() => { setError(''); setForm({ id: u.id, nombre: u.nombre, email: u.email, cargo: u.funcionario?.cargo ?? '', rol: u.funcionario?.rol ?? 'EVALUADOR', modulos: u.funcionario?.modulos ?? [] }); }}><Icon name="settings" size={13} /> Editar</button>{' '}
                    <button className="btn-g btn-xs" onClick={() => setConfirmar(u)}>{u.estado === 'SUSPENDIDO' ? 'Reactivar' : 'Suspender'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal invitar / editar */}
      {form && (
        <div className="modal-bg" onClick={() => setForm(null)}>
          <div className="modal wide" onClick={(e) => e.stopPropagation()}>
            <h3>{form.id ? 'Editar acceso' : 'Invitar funcionario'}</h3>
            <p className="ent-sub" style={{ marginBottom: '1.2rem' }}>El acceso se asigna: define rol y los módulos a los que podrá entrar.</p>
            {error && <div className="alert alert-bad" style={{ marginBottom: '1rem' }}><Icon name="info" />{error}</div>}
            {!form.id && (
              <div className="grid g2">
                <div className="field"><label>Nombre</label><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
                <div className="field"><label>Correo institucional</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              </div>
            )}
            <div className="field"><label>Cargo</label><input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} placeholder="ej: Encargado de Fondos" /></div>
            <div className="field">
              <label>Rol</label>
              <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as RolFuncionario })}>
                {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label} — {r.desc}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Módulos con acceso</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {MODULOS.map((m) => (
                  <label key={m.id} className="checkbox" style={{ background: 'var(--bg3)', border: '.5px solid var(--border)', borderRadius: 9, padding: '8px 12px', alignItems: 'center' }}>
                    <input type="checkbox" checked={form.modulos.includes(m.id)} onChange={() => toggleMod(m.id)} /> {m.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-g" onClick={() => setForm(null)}>Cancelar</button>
              <button className="btn-p" disabled={guardar.isPending} onClick={() => guardar.mutate(form)}>{guardar.isPending ? <span className="spinner" /> : form.id ? 'Guardar' : 'Enviar invitación'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación suspender/reactivar */}
      {confirmar && (
        <div className="modal-bg" onClick={() => setConfirmar(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{confirmar.estado === 'SUSPENDIDO' ? 'Reactivar acceso' : 'Suspender acceso'}</h3>
            <p className="ent-sub" style={{ marginTop: 6 }}>
              {confirmar.estado === 'SUSPENDIDO'
                ? `${confirmar.nombre} volverá a tener acceso según su rol y módulos.`
                : `${confirmar.nombre} perderá el acceso de inmediato. La acción es reversible y queda registrada.`}
            </p>
            <div className="modal-actions">
              <button className="btn-g" onClick={() => setConfirmar(null)}>Cancelar</button>
              <button className="btn-p" style={confirmar.estado !== 'SUSPENDIDO' ? { background: 'var(--bad)' } : undefined} disabled={suspender.isPending} onClick={() => suspender.mutate(confirmar)}>
                {suspender.isPending ? <span className="spinner" /> : confirmar.estado === 'SUSPENDIDO' ? 'Reactivar' : 'Suspender'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

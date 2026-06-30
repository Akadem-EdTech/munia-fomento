import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { api, ApiError } from '../../api/client';
import { useAuth } from '../../auth/auth';
import type { TenantConfig, Modulo } from '../../types';

const MODULOS: { id: Modulo; label: string }[] = [{ id: 'FERIAS', label: 'Ferias' }, { id: 'CAPACITACION', label: 'Capacitación' }, { id: 'FONDOS', label: 'Fondos' }];

export function ConfigTenant() {
  const qc = useQueryClient();
  const { refrescar } = useAuth();
  const { data } = useQuery({ queryKey: ['tenant'], queryFn: () => api.get<{ tenant: TenantConfig }>('/api/gestion/tenant') });
  const [f, setF] = useState<Partial<TenantConfig>>({});
  const [msg, setMsg] = useState(''); const [error, setError] = useState('');
  useEffect(() => { if (data) setF({ nombre: data.tenant.nombre, logoUrl: data.tenant.logoUrl, colorAccent: data.tenant.colorAccent, dominioCorreo: data.tenant.dominioCorreo, modulosActivos: data.tenant.modulosActivos }); }, [data]);

  const guardar = useMutation({
    mutationFn: () => api.patch('/api/gestion/tenant', { nombre: f.nombre, logoUrl: f.logoUrl || null, colorAccent: f.colorAccent || null, dominioCorreo: f.dominioCorreo || null, modulosActivos: f.modulosActivos }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenant'] }); refrescar(); setMsg('Configuración guardada'); setError(''); setTimeout(() => setMsg(''), 2500); },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'No se pudo guardar'),
  });

  if (!data) return <div className="center-screen" style={{ minHeight: 200 }}><span className="spinner" style={{ borderTopColor: 'var(--teal)' }} /></div>;
  const toggleMod = (m: Modulo) => setF((p) => ({ ...p, modulosActivos: p.modulosActivos?.includes(m) ? p.modulosActivos.filter((x) => x !== m) : [...(p.modulosActivos ?? []), m] }));

  return (
    <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', alignItems: 'start' }}>
      <div className="card">
        <div className="card-h"><div className="ico"><Icon name="settings" /></div><h3>Configuración del municipio</h3></div>
        <p className="ent-sub" style={{ marginBottom: '1.2rem' }}>El municipio es configuración: estos datos definen cómo se ve y opera la plataforma, sin tocar código.</p>
        {msg && <div className="alert alert-info" style={{ marginBottom: '1rem' }}><Icon name="check" />{msg}</div>}
        {error && <div className="alert alert-bad" style={{ marginBottom: '1rem' }}><Icon name="info" />{error}</div>}

        <div className="field"><label>Nombre del municipio</label><input value={f.nombre ?? ''} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></div>
        <div className="field"><label>URL del logo (opcional)</label><input value={f.logoUrl ?? ''} onChange={(e) => setF({ ...f, logoUrl: e.target.value })} placeholder="https://…" /></div>
        <div className="grid g2">
          <div className="field"><label>Color de acento</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={f.colorAccent ?? '#2196F3'} onChange={(e) => setF({ ...f, colorAccent: e.target.value })} style={{ width: 44, height: 40, padding: 2, background: 'var(--bg3)', border: '.5px solid var(--border)', borderRadius: 9 }} />
              <input value={f.colorAccent ?? ''} onChange={(e) => setF({ ...f, colorAccent: e.target.value })} placeholder="#2196F3" style={{ flex: 1 }} />
            </div>
          </div>
          <div className="field"><label>Dominio de correo institucional</label><input value={f.dominioCorreo ?? ''} onChange={(e) => setF({ ...f, dominioCorreo: e.target.value })} placeholder="imunicipio.cl" /></div>
        </div>
        <div className="field"><label>Módulos activos</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {MODULOS.map((m) => <label key={m.id} className="checkbox" style={{ background: 'var(--bg3)', border: '.5px solid var(--border)', borderRadius: 9, padding: '8px 12px', alignItems: 'center' }}><input type="checkbox" checked={f.modulosActivos?.includes(m.id) ?? false} onChange={() => toggleMod(m.id)} /> {m.label}</label>)}
          </div>
        </div>
        <button className="btn-p" disabled={guardar.isPending} onClick={() => guardar.mutate()}>{guardar.isPending ? <span className="spinner" /> : 'Guardar configuración'}</button>
      </div>

      <div className="card">
        <div className="ent-sub" style={{ marginBottom: 10 }}>Vista previa de marca</div>
        <div className="side-brand" style={{ border: '.5px solid var(--border)', borderRadius: 11, padding: '1rem' }}>
          <div className="side-ico" style={f.colorAccent ? { background: `linear-gradient(135deg, ${f.colorAccent}, ${f.colorAccent})` } : undefined}><Icon name="shield" /></div>
          <div><div className="side-name"><span style={f.colorAccent ? { color: f.colorAccent } : undefined}>Mun</span>IA Fomento</div><div className="side-tag">{f.nombre || 'Municipio'}</div></div>
        </div>
        <p className="ent-sub" style={{ marginTop: 14, lineHeight: 1.6 }}>El wordmark "MunIA Fomento" no cambia: MunIA es la suite, Fomento el vertical. El municipio vive en la etiqueta y el acento.</p>
      </div>
    </div>
  );
}

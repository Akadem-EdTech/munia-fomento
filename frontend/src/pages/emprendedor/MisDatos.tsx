import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { api } from '../../api/client';
import type { PerfilEmprendedor, Completitud, SolicitudArco } from '../../types';

export function MisDatos() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['emp-perfil'], queryFn: () => api.get<{ perfil: PerfilEmprendedor; completitud: Completitud }>('/api/emprendedor/perfil') });
  const { data: arco } = useQuery({ queryKey: ['emp-arco'], queryFn: () => api.get<{ solicitudes: SolicitudArco[] }>('/api/emprendedor/arco') });
  const [confirmar, setConfirmar] = useState(false);
  const [msg, setMsg] = useState('');

  const exportar = useMutation({
    mutationFn: () => api.get<unknown>('/api/emprendedor/exportar'),
    onSuccess: (datos) => {
      const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'mis-datos-munia-fomento.json'; a.click();
      URL.revokeObjectURL(url);
    },
  });
  const solicitarEliminacion = useMutation({
    mutationFn: () => api.post('/api/emprendedor/arco', { tipo: 'ELIMINACION', detalle: 'Solicitud de eliminación desde el portal' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['emp-arco'] }); setConfirmar(false); setMsg('Recibimos tu solicitud de eliminación. El municipio la procesará y te informará.'); },
  });

  if (!data) return <div className="center-screen" style={{ minHeight: 200 }}><span className="spinner" style={{ borderTopColor: 'var(--teal)' }} /></div>;
  const p = data.perfil;
  const fecha = p.consentFecha ? new Date(p.consentFecha).toLocaleDateString('es-CL') : '—';

  const derechos = [
    { ico: 'user' as const, t: 'Acceder a tus datos', s: 'Revisa toda la información que tenemos de ti.', accion: () => nav('/app/perfil'), btn: 'Ver mi perfil' },
    { ico: 'edit' as const, t: 'Rectificar', s: 'Corrige o actualiza cualquier dato.', accion: () => nav('/app/perfil'), btn: 'Editar' },
    { ico: 'download' as const, t: 'Exportar (portabilidad)', s: 'Descarga una copia de tus datos en formato JSON.', accion: () => exportar.mutate(), btn: exportar.isPending ? 'Generando…' : 'Descargar' },
    { ico: 'lock' as const, t: 'Solicitar eliminación', s: 'Pide que eliminemos tu cuenta y tus datos.', accion: () => setConfirmar(true), btn: 'Solicitar', danger: true },
  ];

  return (
    <>
      <div className="card" style={{ marginBottom: '1.2rem' }}>
        <div className="card-h"><div className="ico"><Icon name="shield" /></div><h3>Privacidad y tus datos</h3></div>
        <p className="ent-sub" style={{ lineHeight: 1.6 }}>
          Tratamos tus datos personales conforme a la <strong style={{ color: 'var(--text)' }}>Ley 21.719</strong>, sólo para los programas de
          fomento del municipio. Aceptaste el aviso de privacidad <strong style={{ color: 'var(--text)' }}>v{p.consentVersion ?? p.tenant.consentVersion}</strong> el <strong style={{ color: 'var(--text)' }}>{fecha}</strong>.
        </p>
      </div>

      {msg && <div className="alert alert-info" style={{ marginBottom: '1.2rem' }}><Icon name="info" />{msg}</div>}

      <div className="grid g2">
        {derechos.map((d) => (
          <div key={d.t} className="card" style={{ display: 'flex', gap: 13, alignItems: 'center' }}>
            <div className="ha-ico" style={d.danger ? { background: 'rgba(239,68,68,.12)' } : undefined}><Icon name={d.ico} style={d.danger ? { stroke: '#f87171' } : undefined} /></div>
            <div style={{ flex: 1 }}><div className="ha-txt"><div className="t">{d.t}</div><div className="s">{d.s}</div></div></div>
            <button className="btn-g btn-sm" onClick={d.accion} style={d.danger ? { color: '#f87171', borderColor: 'rgba(239,68,68,.3)' } : undefined}>{d.btn}</button>
          </div>
        ))}
      </div>

      {!!arco?.solicitudes.length && (
        <>
          <div className="section-t">Mis solicitudes</div>
          <div className="card" style={{ padding: 0 }}>
            <table className="tbl">
              <thead><tr><th>Tipo</th><th>Estado</th><th>Fecha</th></tr></thead>
              <tbody>
                {arco.solicitudes.map((s) => (
                  <tr key={s.id}><td>{s.tipo}</td><td><span className={`chip ${s.estado === 'RESUELTA' ? 'c-ok' : s.estado === 'RECHAZADA' ? 'c-bad' : 'c-warn'}`}>{s.estado}</span></td><td className="ent-sub">{new Date(s.createdAt).toLocaleDateString('es-CL')}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {confirmar && (
        <div className="modal-bg" onClick={() => setConfirmar(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Solicitar eliminación de tus datos</h3>
            <p className="ent-sub" style={{ marginTop: 6 }}>Enviaremos tu solicitud al municipio. Algunos datos pueden conservarse si la ley lo exige (ej: adjudicaciones de fondos públicos). Te informaremos del resultado.</p>
            <div className="modal-actions">
              <button className="btn-g" onClick={() => setConfirmar(false)}>Cancelar</button>
              <button className="btn-p" style={{ background: 'var(--bad)' }} disabled={solicitarEliminacion.isPending} onClick={() => solicitarEliminacion.mutate()}>{solicitarEliminacion.isPending ? <span className="spinner" /> : 'Enviar solicitud'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { api } from '../../api/client';
import type { PlantillaNotif } from '../../types';

const NOMBRE_EVENTO: Record<string, string> = {
  POSTULACION_RECIBIDA: 'Postulación recibida', EMPRENDEDOR_ADMITIDO: 'Emprendedor admitido',
  EMPRENDEDOR_RECHAZADO: 'Emprendedor rechazado', EMPRENDEDOR_LISTA_ESPERA: 'Lista de espera',
  FERIA_RECORDATORIO_48H: 'Recordatorio de feria (48h)', SOLICITUD_AUTOREPORTE: 'Solicitud de autoreporte',
  INSCRIPCION_CURSO_CONFIRMADA: 'Inscripción a curso confirmada', CONVOCATORIA_ABIERTA: 'Convocatoria abierta',
  FONDO_ADJUDICADO: 'Fondo adjudicado', FUNCIONARIO_INVITADO: 'Funcionario invitado',
};

function Editor({ pl, onClose }: { pl: PlantillaNotif; onClose: () => void }) {
  const qc = useQueryClient();
  const [asunto, setAsunto] = useState(pl.asunto);
  const [cuerpo, setCuerpo] = useState(pl.cuerpo);
  const guardar = useMutation({
    mutationFn: () => api.patch(`/api/gestion/plantillas/${pl.id}`, { asunto, cuerpo }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plantillas'] }); onClose(); },
  });
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <h3>{NOMBRE_EVENTO[pl.evento] ?? pl.evento}</h3>
        <p className="ent-sub" style={{ marginBottom: '1rem' }}>Variables disponibles: {pl.variables.map((v) => <code key={v} className="rubro mono" style={{ marginRight: 5 }}>{`{${v}}`}</code>)}</p>
        <div className="field"><label>Asunto</label><input value={asunto} onChange={(e) => setAsunto(e.target.value)} /></div>
        <div className="field"><label>Cuerpo</label><textarea value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} style={{ minHeight: 120 }} /></div>
        <div className="modal-actions">
          <button className="btn-g" onClick={onClose}>Cancelar</button>
          <button className="btn-p" disabled={guardar.isPending} onClick={() => guardar.mutate()}>{guardar.isPending ? <span className="spinner" /> : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}

export function Plantillas() {
  const { data, isLoading } = useQuery({ queryKey: ['plantillas'], queryFn: () => api.get<{ plantillas: PlantillaNotif[] }>('/api/gestion/plantillas') });
  const [editar, setEditar] = useState<PlantillaNotif | null>(null);

  return (
    <>
      <div className="card-h" style={{ marginBottom: '1.2rem' }}>
        <div className="ico"><Icon name="bell" /></div><h3>Plantillas de notificación</h3>
      </div>
      <p className="ent-sub" style={{ marginBottom: '1.2rem' }}>Personaliza los mensajes que reciben emprendedores y funcionarios. Usa variables como <code className="rubro mono">{'{nombre}'}</code> para personalizar.</p>
      {isLoading ? <div className="center-screen" style={{ minHeight: 160 }}><span className="spinner" style={{ borderTopColor: 'var(--teal)' }} /></div> : (
        <div className="card" style={{ padding: 0 }}>
          <table className="tbl">
            <thead><tr><th>Evento</th><th>Asunto</th><th>Canal</th><th></th></tr></thead>
            <tbody>
              {data?.plantillas.map((pl) => (
                <tr key={pl.id}>
                  <td><div className="ent-name">{NOMBRE_EVENTO[pl.evento] ?? pl.evento}</div></td>
                  <td className="ent-sub">{pl.asunto}</td>
                  <td><span className="chip c-info">{pl.canal.toLowerCase()}</span></td>
                  <td style={{ textAlign: 'right' }}><button className="btn-g btn-xs" onClick={() => setEditar(pl)}><Icon name="edit" size={13} /> Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editar && <Editor pl={editar} onClose={() => setEditar(null)} />}
    </>
  );
}

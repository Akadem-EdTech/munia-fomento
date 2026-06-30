import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { api } from '../../api/client';
import type { MiPostulacion } from '../../types';

function FormReporte({ p, onClose }: { p: MiPostulacion; onClose: () => void }) {
  const qc = useQueryClient();
  const [participo, setParticipo] = useState(true);
  const [ventas, setVentas] = useState('');
  const [comentario, setComentario] = useState('');
  const enviar = useMutation({
    mutationFn: () => api.post(`/api/ferias/${p.feriaId}/reportar`, { participo, ventasReportadas: ventas ? Number(ventas) : undefined, comentario: comentario || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mis-postulaciones'] }); onClose(); },
  });
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>¿Cómo te fue en {p.feria.nombre}?</h3>
        <p className="ent-sub" style={{ marginBottom: '1.2rem' }}>Tu reporte nos ayuda a mejorar las próximas ferias. Las ventas son referenciales, no afectan tu admisión.</p>
        <label className="checkbox" style={{ marginBottom: '1rem' }}><input type="checkbox" checked={participo} onChange={(e) => setParticipo(e.target.checked)} /> Participé en la feria</label>
        <div className="field"><label>Ventas aproximadas (opcional, en $)</label><input type="number" value={ventas} onChange={(e) => setVentas(e.target.value)} placeholder="ej: 250000" /></div>
        <div className="field"><label>Comentario (opcional)</label><textarea value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="¿Qué tal la organización, el público, las ventas?" /></div>
        <div className="modal-actions">
          <button className="btn-g" onClick={onClose}>Cancelar</button>
          <button className="btn-p" disabled={enviar.isPending} onClick={() => enviar.mutate()}>{enviar.isPending ? <span className="spinner" /> : 'Enviar reporte'}</button>
        </div>
      </div>
    </div>
  );
}

export function Reportar() {
  const { data, isLoading } = useQuery({ queryKey: ['mis-postulaciones'], queryFn: () => api.get<{ postulaciones: MiPostulacion[] }>('/api/ferias/mis-postulaciones') });
  const [reportar, setReportar] = useState<MiPostulacion | null>(null);
  if (isLoading) return <div className="center-screen" style={{ minHeight: 200 }}><span className="spinner" style={{ borderTopColor: 'var(--teal)' }} /></div>;

  const admitidas = (data?.postulaciones ?? []).filter((p) => p.estado === 'ADMITIDA');
  if (admitidas.length === 0) return <div className="empty"><Icon name="doc" /><h4>No tienes ferias por reportar</h4><p>Cuando participes en una feria a la que fuiste admitido, podrás contarnos cómo te fue aquí.</p></div>;

  return (
    <>
      <div className="grid g2">
        {admitidas.map((p) => (
          <div className="card" key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="ha-ico"><Icon name="feria" /></div>
            <div style={{ flex: 1 }}><div className="ent-name">{p.feria.nombre}</div><div className="ent-sub">{p.feria.fecha}</div></div>
            <button className="btn-g btn-sm" onClick={() => setReportar(p)}>Reportar</button>
          </div>
        ))}
      </div>
      {reportar && <FormReporte p={reportar} onClose={() => setReportar(null)} />}
    </>
  );
}

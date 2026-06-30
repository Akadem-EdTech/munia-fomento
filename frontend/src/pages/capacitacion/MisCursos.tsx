import { useQuery } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { api } from '../../api/client';
import type { MiInscripcion, MiCertificado } from '../../types';

export function MisInscripciones() {
  const { data, isLoading } = useQuery({ queryKey: ['mis-inscripciones'], queryFn: () => api.get<{ inscripciones: MiInscripcion[] }>('/api/cursos/mis-inscripciones') });
  if (isLoading) return <div className="center-screen" style={{ minHeight: 200 }}><span className="spinner" style={{ borderTopColor: 'var(--mod-cap)' }} /></div>;
  const ins = data?.inscripciones ?? [];
  if (!ins.length) return <div className="empty"><Icon name="cap" /><h4>Aún no te inscribes a ningún curso</h4><p>Mira los cursos disponibles y resérvate un cupo.</p></div>;
  return (
    <div className="card" style={{ padding: 0 }}>
      <table className="tbl">
        <thead><tr><th>Curso</th><th>Modalidad</th><th>Estado</th></tr></thead>
        <tbody>
          {ins.map((i) => (
            <tr key={i.id}><td className="ent-name">{i.curso.nombre}</td><td className="ent-sub">{i.curso.modalidad === 'ONLINE' ? 'Online' : 'Presencial'}</td>
              <td><span className={`chip ${i.estado === 'INSCRITO' ? 'c-ok' : 'c-info'}`}>{i.estado === 'INSCRITO' ? 'Inscrito' : 'Lista de espera'}</span></td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function descargarCertificado(c: MiCertificado) {
  const fecha = new Date(c.emitidoAt).toLocaleDateString('es-CL');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Certificado</title>
  <style>body{font-family:Georgia,serif;background:#0D1117;color:#F0F4FF;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
  .c{border:2px solid #2196F3;border-radius:16px;padding:60px 80px;text-align:center;max-width:680px}
  h1{font-size:14px;letter-spacing:4px;text-transform:uppercase;color:#8B9DC3}h2{font-size:34px;margin:18px 0}p{color:#8B9DC3;line-height:1.7}
  .n{font-size:24px;color:#42A5F5;margin:24px 0}</style></head><body><div class="c">
  <h1>Certificado de participación</h1><p>MunIA Fomento certifica la participación en el curso</p>
  <h2>${c.curso.nombre}</h2><p>Modalidad ${c.curso.modalidad === 'ONLINE' ? 'online' : 'presencial'}</p>
  <p>Emitido el ${fecha}</p></div></body></html>`;
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
}

export function MisCertificados() {
  const { data, isLoading } = useQuery({ queryKey: ['mis-certificados'], queryFn: () => api.get<{ certificados: MiCertificado[] }>('/api/cursos/mis-certificados') });
  if (isLoading) return <div className="center-screen" style={{ minHeight: 200 }}><span className="spinner" style={{ borderTopColor: 'var(--mod-cap)' }} /></div>;
  const certs = data?.certificados ?? [];
  if (!certs.length) return <div className="empty"><Icon name="award" /><h4>Aún no tienes certificados</h4><p>Cuando completes un curso, tu certificado aparecerá aquí para descargar.</p></div>;
  return (
    <div className="grid g2">
      {certs.map((c) => (
        <div className="card" key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="ha-ico" style={{ background: 'rgba(167,139,250,.14)' }}><Icon name="award" style={{ stroke: 'var(--mod-cap)' }} /></div>
          <div style={{ flex: 1 }}><div className="ent-name">{c.curso.nombre}</div><div className="ent-sub">Emitido el {new Date(c.emitidoAt).toLocaleDateString('es-CL')}</div></div>
          <button className="btn-g btn-sm" onClick={() => descargarCertificado(c)}><Icon name="download" size={14} /> Descargar</button>
        </div>
      ))}
    </div>
  );
}

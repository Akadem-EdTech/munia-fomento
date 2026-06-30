import { useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../auth/auth';
import { getModulo, seccionesDe } from '../nav';

/** Placeholder de secciones de módulo. Se reemplaza por las vistas reales en
 *  las fases 5 (Ferias), 7 (Capacitación) y 8 (Fondos). El shell ya navega. */
export function ModuloSeccion() {
  const { modulo: moduloId, seccion } = useParams();
  const { usuario } = useAuth();
  const modulo = moduloId ? getModulo(moduloId) : undefined;
  if (!usuario || !modulo) return <div className="empty"><Icon name="info" /><h4>Sección no encontrada</h4></div>;

  const secs = seccionesDe(modulo, usuario);
  const sec = secs.find((s) => s.key === seccion) ?? secs[0];
  const fase = modulo.id === 'FERIAS' ? 5 : modulo.id === 'CAPACITACION' ? 7 : 8;

  return (
    <div className="card">
      <div className="card-h">
        <div className="ico"><Icon name={sec.icon} /></div>
        <h3>{sec.label}</h3>
        <span className="chip c-mute" style={{ marginLeft: 'auto' }}>{modulo.label}</span>
      </div>
      <div className="empty">
        <Icon name="settings" />
        <h4>En construcción</h4>
        <p>
          La vista «{sec.label}» del módulo {modulo.label} ({usuario.tipo === 'EMPRENDEDOR' ? 'cara emprendedor' : 'cara municipio'})
          se implementa en la Fase {fase}. La navegación, el control de acceso y el shell ya funcionan.
        </p>
      </div>
    </div>
  );
}

import { useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../auth/auth';
import { getModulo, seccionesDe } from '../nav';
import { FeriasAbiertas } from './ferias/FeriasAbiertas';
import { MisPostulaciones } from './ferias/MisPostulaciones';
import { Reportar } from './ferias/Reportar';
import { FeriasGestion } from './ferias/FeriasGestion';
import { Seleccion } from './ferias/Seleccion';
import { Emprendedores } from './ferias/Emprendedores';
import { Evaluacion } from './ferias/Evaluacion';
import { Dashboards } from './ferias/Dashboards';

// Despacho de secciones a vistas reales. Ferias está completo (fase 5);
// Capacitación (7) y Fondos (8) caen al placeholder hasta su fase.
const FERIAS_EMP: Record<string, () => JSX.Element> = { abiertas: FeriasAbiertas, postulaciones: MisPostulaciones, reportar: Reportar };
const FERIAS_MUNI: Record<string, () => JSX.Element> = { panel: Dashboards, ferias: FeriasGestion, seleccion: Seleccion, emprendedores: Emprendedores, evaluacion: Evaluacion, dashboards: Dashboards };

export function ModuloSeccion() {
  const { modulo: moduloId, seccion } = useParams();
  const { usuario } = useAuth();
  const modulo = moduloId ? getModulo(moduloId) : undefined;
  if (!usuario || !modulo) return <div className="empty"><Icon name="info" /><h4>Sección no encontrada</h4></div>;

  if (modulo.id === 'FERIAS' && seccion) {
    const tabla = usuario.tipo === 'EMPRENDEDOR' ? FERIAS_EMP : FERIAS_MUNI;
    const Vista = tabla[seccion];
    if (Vista) return <Vista />;
  }

  const secs = seccionesDe(modulo, usuario);
  const sec = secs.find((s) => s.key === seccion) ?? secs[0];
  const fase = modulo.id === 'CAPACITACION' ? 7 : 8;
  return (
    <div className="card">
      <div className="card-h"><div className="ico"><Icon name={sec.icon} /></div><h3>{sec.label}</h3><span className="chip c-mute" style={{ marginLeft: 'auto' }}>{modulo.label}</span></div>
      <div className="empty"><Icon name="settings" /><h4>En construcción</h4><p>La vista «{sec.label}» del módulo {modulo.label} se implementa en la Fase {fase}. La navegación y el control de acceso ya funcionan.</p></div>
    </div>
  );
}

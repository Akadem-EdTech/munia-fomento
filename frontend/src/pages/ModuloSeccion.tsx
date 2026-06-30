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
import { CursosDisponibles } from './capacitacion/CursosDisponibles';
import { MisInscripciones, MisCertificados } from './capacitacion/MisCursos';
import { CursosGestion } from './capacitacion/CursosGestion';
import { Inscritos, Asistencia } from './capacitacion/Asistencia';
import { DashboardFormacion } from './capacitacion/DashboardFormacion';
import { Descubrir } from './fondos/Descubrir';
import { Asistente } from './fondos/Asistente';
import { MisPostulacionesFondo } from './fondos/MisPostulaciones';
import { Convocatorias, EvaluarFondos, DashboardFondos } from './fondos/Gestion';

// Despacho de secciones a vistas reales. Ferias (5), Capacitación (7) y Fondos (8) completos.
const FERIAS_EMP: Record<string, () => JSX.Element> = { abiertas: FeriasAbiertas, postulaciones: MisPostulaciones, reportar: Reportar };
const FERIAS_MUNI: Record<string, () => JSX.Element> = { panel: Dashboards, ferias: FeriasGestion, seleccion: Seleccion, emprendedores: Emprendedores, evaluacion: Evaluacion, dashboards: Dashboards };
const CAP_EMP: Record<string, () => JSX.Element> = { cursos: CursosDisponibles, inscripciones: MisInscripciones, certificados: MisCertificados };
const CAP_MUNI: Record<string, () => JSX.Element> = { cursos: CursosGestion, inscripciones: Inscritos, asistencia: Asistencia, dashboard: DashboardFormacion };
const FON_EMP: Record<string, () => JSX.Element> = { descubrir: Descubrir, asistente: Asistente, postulaciones: MisPostulacionesFondo };
const FON_MUNI: Record<string, () => JSX.Element> = { convocatorias: Convocatorias, evaluar: EvaluarFondos, adjudicacion: EvaluarFondos, dashboard: DashboardFondos };

export function ModuloSeccion() {
  const { modulo: moduloId, seccion } = useParams();
  const { usuario } = useAuth();
  const modulo = moduloId ? getModulo(moduloId) : undefined;
  if (!usuario || !modulo) return <div className="empty"><Icon name="info" /><h4>Sección no encontrada</h4></div>;

  const esEmp = usuario.tipo === 'EMPRENDEDOR';
  if (modulo.id === 'FERIAS' && seccion) {
    const Vista = (esEmp ? FERIAS_EMP : FERIAS_MUNI)[seccion];
    if (Vista) return <Vista />;
  }
  if (modulo.id === 'CAPACITACION' && seccion) {
    const Vista = (esEmp ? CAP_EMP : CAP_MUNI)[seccion];
    if (Vista) return <Vista />;
  }
  if (modulo.id === 'FONDOS' && seccion) {
    const Vista = (esEmp ? FON_EMP : FON_MUNI)[seccion];
    if (Vista) return <Vista />;
  }

  const secs = seccionesDe(modulo, usuario);
  const sec = secs.find((s) => s.key === seccion) ?? secs[0];
  const fase = 9;
  return (
    <div className="card">
      <div className="card-h"><div className="ico"><Icon name={sec.icon} /></div><h3>{sec.label}</h3><span className="chip c-mute" style={{ marginLeft: 'auto' }}>{modulo.label}</span></div>
      <div className="empty"><Icon name="settings" /><h4>En construcción</h4><p>La vista «{sec.label}» del módulo {modulo.label} se implementa en la Fase {fase}. La navegación y el control de acceso ya funcionan.</p></div>
    </div>
  );
}

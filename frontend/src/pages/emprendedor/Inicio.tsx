import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '../../components/Icon';
import { api } from '../../api/client';
import { useAuth } from '../../auth/auth';
import { modulosVisibles, seccionesDe } from '../../nav';
import type { InicioEmprendedor } from '../../types';

export function InicioEmp() {
  const nav = useNavigate();
  const { usuario } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['emp-inicio'], queryFn: () => api.get<InicioEmprendedor>('/api/emprendedor/inicio') });

  if (!usuario) return null;
  if (isLoading || !data) return <div className="center-screen" style={{ minHeight: 200 }}><span className="spinner" style={{ borderTopColor: 'var(--teal)' }} /></div>;

  const { emprendedor: e, completitud: c, feriasAbiertas, reportesPendientes } = data;
  const nombre = usuario.nombre.split(' ')[0];

  return (
    <>
      <div className="hero">
        <h2>Hola, {nombre}</h2>
        <div className="estado">
          {e.esNovato
            ? <><Icon name="sparkle" size={14} style={{ stroke: 'var(--teal-light)' }} /> {e.estadoTexto}</>
            : <><Icon name="award" size={14} style={{ stroke: 'var(--ok)' }} /> Reputación <span className="rep-num" style={{ color: 'var(--text)' }}>{e.repScore}</span> · cumplió {e.feriasCumplidas} de {e.feriasTotales} ferias</>}
        </div>
      </div>

      {reportesPendientes.length > 0 && (
        <div className="alert alert-info" style={{ marginBottom: '1.2rem' }}>
          <Icon name="info" />
          <div>Tienes {reportesPendientes.length} {reportesPendientes.length === 1 ? 'reporte pendiente' : 'reportes pendientes'}: cuéntanos cómo te fue en {reportesPendientes.map((r) => r.nombre).join(', ')}.</div>
        </div>
      )}

      <div className="grid g2">
        {/* Completitud de perfil */}
        <div className="card">
          <div className="prog-row">
            <strong style={{ fontSize: 14 }}>Completitud de tu perfil</strong>
            <span className="rep-num" style={{ color: c.porcentaje === 100 ? 'var(--ok)' : 'var(--teal-light)' }}>{c.porcentaje}%</span>
          </div>
          <div className="prog"><div className="prog-fill" style={{ width: `${c.porcentaje}%` }} /></div>
          {c.siguiente ? (
            <div className="step" style={{ marginTop: 14, paddingLeft: 0 }}>
              <div className="step-ico"><Icon name="plus" /></div>
              <div className="step-txt"><div className="t">{c.siguiente.label}</div><div className="h">{c.siguiente.hint}</div></div>
              <button className="btn-g btn-xs" onClick={() => nav('/app/perfil')}>Completar</button>
            </div>
          ) : (
            <div className="estado" style={{ marginTop: 14 }}><Icon name="check" size={14} style={{ stroke: 'var(--ok)' }} /> Tu perfil está completo. ¡Bien ahí!</div>
          )}
        </div>

        {/* Primeros pasos (novato) o accesos rápidos */}
        <div className="card">
          <strong style={{ fontSize: 14 }}>{e.esNovato ? 'Primeros pasos' : 'Accesos rápidos'}</strong>
          <div className="steps" style={{ marginTop: 10 }}>
            <button className="step" onClick={() => nav('/app/perfil')}>
              <div className={`step-ico ${c.porcentaje > 70 ? 'done' : ''}`}><Icon name={c.porcentaje > 70 ? 'check' : 'user'} /></div>
              <div className="step-txt"><div className="t">Completa tu perfil</div><div className="h">Postular después toma un minuto.</div></div>
            </button>
            <button className="step" onClick={() => nav('/app/FERIAS/abiertas')}>
              <div className="step-ico"><Icon name="feria" /></div>
              <div className="step-txt"><div className="t">Explora las ferias abiertas</div><div className="h">{feriasAbiertas.length} disponibles ahora.</div></div>
            </button>
            <button className="step" onClick={() => nav('/app/FONDOS/descubrir')}>
              <div className="step-ico"><Icon name="compass" /></div>
              <div className="step-txt"><div className="t">Descubre fondos para ti</div><div className="h">Te mostramos los que calzan con tu perfil.</div></div>
            </button>
          </div>
        </div>
      </div>

      {/* Ferias abiertas */}
      <div className="section-t">Ferias abiertas para postular</div>
      {feriasAbiertas.length === 0 ? (
        <div className="empty"><Icon name="feria" /><h4>No hay ferias abiertas ahora</h4><p>Te avisaremos cuando se abra una nueva convocatoria.</p></div>
      ) : (
        <div className="grid g2">
          {feriasAbiertas.map((f) => (
            <button key={f.id} className="ha" onClick={() => nav('/app/FERIAS/abiertas')}>
              <div className="ha-ico"><Icon name="feria" /></div>
              <div className="ha-txt" style={{ flex: 1 }}>
                <div className="t">{f.nombre}</div>
                <div className="s">{f.fecha ?? 'Fecha por confirmar'} · {f.ubicacion ?? ''}</div>
              </div>
              <span className="chip c-info">{f.pesoProp >= f.pesoRep ? 'Buena para mostrar algo nuevo' : 'Valora tu trayectoria'}</span>
            </button>
          ))}
        </div>
      )}

      {/* Acceso a módulos */}
      <div className="section-t">Programas de fomento</div>
      <div className="grid g3">
        {modulosVisibles(usuario).map(({ def }) => (
          <button key={def.id} className="mod-card" style={{ ['--accent' as string]: def.accentVar }} onClick={() => nav(`/app/${def.id}/${seccionesDe(def, usuario)[0].key}`)}>
            <div className="mod-ico"><Icon name={def.icon} /></div>
            <h3>{def.label}</h3>
            <p>{def.desc}</p>
          </button>
        ))}
      </div>
    </>
  );
}

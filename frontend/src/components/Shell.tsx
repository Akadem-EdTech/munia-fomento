import { useState } from 'react';
import { Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { Icon } from './Icon';
import { useAuth, esRol } from '../auth/auth';
import { api } from '../api/client';
import { MODULOS, getModulo, seccionesDe } from '../nav';

/** Parsea la ubicación: módulo activo, sección y si es zona de administración. */
function parseLoc(pathname: string) {
  const parts = pathname.replace(/^\/app\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'admin') return { admin: true as const, moduloId: undefined, seccion: parts[1] };
  return { admin: false as const, moduloId: parts[0], seccion: parts[1] };
}

export function Shell() {
  const { usuario, refrescar } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [pop, setPop] = useState<null | 'notif' | 'user'>(null);

  if (!usuario) return null;
  const { admin, moduloId, seccion } = parseLoc(loc.pathname);
  const modulo = moduloId ? getModulo(moduloId) : undefined;

  const cerrarSesion = async () => {
    await api.post('/api/auth/logout').catch(() => {});
    refrescar();
    nav('/login');
  };

  // Título + breadcrumb contextual
  let titulo = 'Inicio';
  let crumb = 'MunIA Fomento';
  if (admin) { titulo = 'Gestión de usuarios'; crumb = 'Administración del sistema'; }
  else if (modulo) {
    const secs = seccionesDe(modulo, usuario);
    const sec = secs.find((s) => s.key === seccion) ?? secs[0];
    titulo = sec?.label ?? modulo.label;
    crumb = `${modulo.label} · ${usuario.tipo === 'EMPRENDEDOR' ? 'Participar' : 'Gestionar'}`;
  }

  const rolLabel = usuario.funcionario?.cargo ?? (usuario.emprendedor ? `Emprendedor · ${usuario.emprendedor.nombreEmprendimiento}` : usuario.tipo);

  return (
    <div className="app">
      <div className={`scrim ${menuAbierto ? 'show' : ''}`} onClick={() => setMenuAbierto(false)} />
      <aside className={`side ${menuAbierto ? 'open' : ''}`}>
        <div className="side-brand">
          <div className="side-ico"><Icon name="shield" /></div>
          <div>
            <div className="side-name"><span>Mun</span>IA Fomento</div>
            <div className="side-tag">{usuario.tenant.nombre}</div>
          </div>
        </div>

        <nav className="side-nav" onClick={() => setMenuAbierto(false)}>
          {modulo ? (
            <>
              <button className="side-link" onClick={() => nav('/app')}>
                <Icon name="back" /> Volver al inicio
              </button>
              <div className="side-group">{modulo.label}</div>
              {seccionesDe(modulo, usuario).map((s) => (
                <NavLink key={s.key} to={`/app/${modulo.id}/${s.key}`} className={({ isActive }) => `side-link ${isActive ? 'on' : ''}`}>
                  <Icon name={s.icon} /> {s.label}
                </NavLink>
              ))}
            </>
          ) : (
            <>
              <div className="side-group">Módulos</div>
              {MODULOS.filter((m) => usuario.tenant.modulosActivos.includes(m.id)).map((m) => {
                const habil = usuario.tipo === 'EMPRENDEDOR' || !!usuario.funcionario?.modulos.includes(m.id);
                return (
                  <button key={m.id} className="side-link" disabled={!habil} style={!habil ? { opacity: .4 } : undefined}
                    onClick={() => habil && nav(`/app/${m.id}/${seccionesDe(m, usuario)[0].key}`)}>
                    <Icon name={m.icon} /> {m.label}
                  </button>
                );
              })}
              {esRol(usuario, 'ADMINISTRADOR') && (
                <>
                  <div className="side-group">Administración del sistema</div>
                  <NavLink to="/app/admin/usuarios" className={({ isActive }) => `side-link ${isActive ? 'on' : ''}`}>
                    <Icon name="users" /> Gestión de usuarios
                  </NavLink>
                </>
              )}
            </>
          )}
        </nav>
        <div className="side-foot">MunIA · Suite de fomento</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="hamb" onClick={() => setMenuAbierto((v) => !v)}><Icon name="menu" /></button>
          <div>
            <h1>{titulo}</h1>
            <div className="crumb">{crumb}</div>
          </div>
          <div className="topbar-r">
            <button className="notif-btn" onClick={() => setPop(pop === 'notif' ? null : 'notif')} aria-label="Notificaciones">
              <Icon name="bell" />
            </button>
            <button className="user-chip" onClick={() => setPop(pop === 'user' ? null : 'user')}>
              <div className="user-av">{usuario.nombre.charAt(0)}</div>
              <div className="user-meta">
                <div className="user-name">{usuario.nombre}</div>
                <div className="user-role">{usuario.funcionario?.rol ?? 'Emprendedor'}</div>
              </div>
              <Icon name="chevron" className="user-chevron" />
            </button>

            {pop === 'notif' && (
              <div className="menu-pop">
                <div className="menu-head">Notificaciones</div>
                <div className="notif-empty">Aún no tienes notificaciones.<br />Te avisaremos aquí cuando haya novedades.</div>
              </div>
            )}
            {pop === 'user' && (
              <div className="menu-pop narrow">
                <div className="menu-head">{usuario.nombre}<div className="r">{rolLabel}</div></div>
                <button className="um-item danger" onClick={cerrarSesion}><Icon name="logout" /> Cerrar sesión</button>
              </div>
            )}
          </div>
        </header>
        <div className="view" onClick={() => pop && setPop(null)}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

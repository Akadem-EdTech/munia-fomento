import { useState } from 'react';
import { Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Icon } from './Icon';
import { useAuth, esRol } from '../auth/auth';
import { api } from '../api/client';
import { MODULOS, getModulo, seccionesDe } from '../nav';
import type { Notificacion } from '../types';

const haceCuanto = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'recién'; if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60); if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
};

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
  const qc = useQueryClient();

  const { data: notif } = useQuery({
    queryKey: ['notificaciones'],
    queryFn: () => api.get<{ notificaciones: Notificacion[]; noLeidas: number }>('/api/notificaciones'),
    refetchInterval: 60_000,
  });
  const leerTodas = useMutation({
    mutationFn: () => api.post('/api/notificaciones/leer-todas'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  });
  const abrirNotif = () => {
    const abrir = pop !== 'notif';
    setPop(abrir ? 'notif' : null);
    if (abrir && (notif?.noLeidas ?? 0) > 0) leerTodas.mutate();
  };

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
  if (admin) { titulo = seccion === 'plantillas' ? 'Plantillas de notificación' : 'Gestión de usuarios'; crumb = 'Administración del sistema'; }
  else if (moduloId === 'perfil') { titulo = 'Mi perfil'; crumb = 'Mi cuenta'; }
  else if (moduloId === 'datos') { titulo = 'Privacidad y mis datos'; crumb = 'Mi cuenta'; }
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
              {usuario.tipo === 'EMPRENDEDOR' && (
                <>
                  <div className="side-group">Mi cuenta</div>
                  <NavLink to="/app" end className={({ isActive }) => `side-link ${isActive ? 'on' : ''}`}><Icon name="dash" /> Inicio</NavLink>
                  <NavLink to="/app/perfil" className={({ isActive }) => `side-link ${isActive ? 'on' : ''}`}><Icon name="user" /> Mi perfil</NavLink>
                  <NavLink to="/app/datos" className={({ isActive }) => `side-link ${isActive ? 'on' : ''}`}><Icon name="shield" /> Mis datos</NavLink>
                </>
              )}
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
                  <NavLink to="/app/admin/plantillas" className={({ isActive }) => `side-link ${isActive ? 'on' : ''}`}>
                    <Icon name="bell" /> Plantillas
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
            <button className="notif-btn" onClick={abrirNotif} aria-label="Notificaciones">
              <Icon name="bell" />
              {(notif?.noLeidas ?? 0) > 0 && <span className="notif-dot" />}
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
                {!notif?.notificaciones.length ? (
                  <div className="notif-empty">Aún no tienes notificaciones.<br />Te avisaremos aquí cuando haya novedades.</div>
                ) : (
                  <div className="notif-list">
                    {notif.notificaciones.map((n) => (
                      <div key={n.id} className={`notif-item ${n.leida ? '' : 'unread'}`}>
                        <div className="notif-txt"><strong>{n.titulo}</strong><div style={{ color: 'var(--muted)' }}>{n.cuerpo}</div><div className="notif-time">{haceCuanto(n.createdAt)}</div></div>
                      </div>
                    ))}
                  </div>
                )}
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

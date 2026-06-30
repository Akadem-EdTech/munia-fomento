import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../auth/auth';
import { modulosVisibles, seccionesDe } from '../nav';

export function Hub() {
  const { usuario } = useAuth();
  const nav = useNavigate();
  if (!usuario) return null;

  const esEmp = usuario.tipo === 'EMPRENDEDOR';
  const saludo = esEmp ? `Hola, ${usuario.nombre.split(' ')[0]}` : `Hola, ${usuario.nombre.split(' ')[0]}`;
  const visibles = modulosVisibles(usuario);

  return (
    <>
      <div className="hub-head">
        <h2>{saludo}</h2>
        <p>{esEmp
          ? 'Estos son los programas de fomento disponibles para ti. Elige por dónde empezar.'
          : 'Estos son los módulos de fomento. Entra a gestionar el que necesites.'}</p>
      </div>

      <div className="grid g3">
        {visibles.map(({ def, habilitado }) => (
          <button
            key={def.id}
            className={`mod-card ${habilitado ? '' : 'mod-locked'}`}
            style={{ ['--accent' as string]: def.accentVar }}
            onClick={() => habilitado && nav(`/app/${def.id}/${seccionesDe(def, usuario)[0].key}`)}
          >
            <div className="mod-ico"><Icon name={def.icon} /></div>
            <h3>{def.label}</h3>
            <p>{def.desc}</p>
            <div className="mod-meta">
              {!habilitado ? (
                <span className="chip c-mute"><Icon name="lock" /> Sin acceso</span>
              ) : (
                <span className="chip c-info">{esEmp ? 'Participar' : 'Gestionar'}</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {visibles.length === 0 && (
        <div className="empty">
          <Icon name="inbox" />
          <h4>Sin módulos asignados</h4>
          <p>Aún no tienes acceso a ningún módulo. Solicita acceso al administrador del municipio.</p>
        </div>
      )}
    </>
  );
}

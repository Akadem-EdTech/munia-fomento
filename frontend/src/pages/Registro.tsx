import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/auth';

export function Registro() {
  const nav = useNavigate();
  const { refrescar } = useAuth();
  const [f, setF] = useState({ nombre: '', rut: '', email: '', password: '', nombreEmprendimiento: '', telefono: '' });
  const [consentimiento, setConsent] = useState(false); // NO pre-marcado
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!consentimiento) { setError('Debes aceptar el aviso de privacidad para registrarte.'); return; }
    setCargando(true);
    try {
      await api.post('/api/auth/registro', { ...f, consentimiento });
      refrescar();
      nav('/app');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la cuenta');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <div className="auth-brand">
          <div className="side-ico"><Icon name="shield" /></div>
          <div className="side-name"><span>Mun</span>IA Fomento</div>
        </div>
        <div className="auth-sub">Crea tu cuenta de emprendedor</div>

        {error && <div className="alert alert-bad" style={{ marginBottom: '1rem' }}><Icon name="info" />{error}</div>}

        <form onSubmit={enviar}>
          <div className="grid g2">
            <div className="field"><label>Nombre completo</label><input value={f.nombre} onChange={set('nombre')} required /></div>
            <div className="field"><label>RUT</label><input value={f.rut} onChange={set('rut')} required placeholder="12.345.678-9" /></div>
          </div>
          <div className="field"><label>Nombre de tu emprendimiento</label><input value={f.nombreEmprendimiento} onChange={set('nombreEmprendimiento')} required /></div>
          <div className="grid g2">
            <div className="field"><label>Correo electrónico</label><input type="email" value={f.email} onChange={set('email')} required /></div>
            <div className="field"><label>Teléfono (opcional)</label><input value={f.telefono} onChange={set('telefono')} placeholder="+56 9 ..." /></div>
          </div>
          <div className="field"><label>Contraseña</label><input type="password" value={f.password} onChange={set('password')} required minLength={8} placeholder="mínimo 8 caracteres" /></div>

          <label className="checkbox" style={{ margin: '1rem 0' }}>
            <input type="checkbox" checked={consentimiento} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              Acepto el <a href="#" style={{ color: 'var(--teal-light)' }}>aviso de privacidad</a> y autorizo el tratamiento de mis datos
              personales conforme a la Ley 21.719, para participar en los programas de fomento del municipio. Puedo acceder,
              rectificar, exportar o eliminar mis datos en cualquier momento desde mi perfil.
            </span>
          </label>

          <button className="btn-p btn-block" disabled={cargando}>{cargando ? <span className="spinner" /> : 'Crear mi cuenta'}</button>
        </form>

        <div className="auth-foot">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></div>
      </div>
    </div>
  );
}

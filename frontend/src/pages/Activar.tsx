import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/auth';

export function Activar() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const nav = useNavigate();
  const { refrescar } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setCargando(true);
    try {
      await api.post('/api/auth/activar', { token, password });
      refrescar();
      nav('/app');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo activar la cuenta');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="side-ico"><Icon name="shield" /></div>
          <div className="side-name"><span>Mun</span>IA Fomento</div>
        </div>
        <div className="auth-sub">Activa tu cuenta de funcionario</div>
        {!token && <div className="alert alert-bad"><Icon name="info" />Falta el token de invitación en el enlace.</div>}
        {error && <div className="alert alert-bad" style={{ marginBottom: '1rem' }}><Icon name="info" />{error}</div>}
        {token && (
          <form onSubmit={enviar}>
            <div className="field"><label>Define tu contraseña</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="mínimo 8 caracteres" /></div>
            <button className="btn-p btn-block" disabled={cargando}>{cargando ? <span className="spinner" /> : 'Activar y entrar'}</button>
          </form>
        )}
        <div className="auth-foot"><Link to="/login">Volver al inicio de sesión</Link></div>
      </div>
    </div>
  );
}

import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './auth/auth';
import { Shell } from './components/Shell';
import { Login } from './pages/Login';
import { Registro } from './pages/Registro';
import { Activar } from './pages/Activar';
import { Hub } from './pages/Hub';
import { ModuloSeccion } from './pages/ModuloSeccion';
import { Usuarios } from './pages/admin/Usuarios';
import { Perfil } from './pages/emprendedor/Perfil';
import { MisDatos } from './pages/emprendedor/MisDatos';

function Protegido() {
  const { usuario, cargando } = useAuth();
  if (cargando) return <div className="center-screen"><span className="spinner" style={{ borderTopColor: 'var(--teal)', width: 28, height: 28 }} /></div>;
  if (!usuario) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function SoloPublico() {
  const { usuario, cargando } = useAuth();
  if (cargando) return <div className="center-screen"><span className="spinner" style={{ borderTopColor: 'var(--teal)', width: 28, height: 28 }} /></div>;
  if (usuario) return <Navigate to="/app" replace />;
  return <Outlet />;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SoloPublico />}>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
        </Route>
        <Route path="/activar" element={<Activar />} />

        <Route element={<Protegido />}>
          <Route path="/app" element={<Shell />}>
            <Route index element={<Hub />} />
            <Route path="perfil" element={<Perfil />} />
            <Route path="datos" element={<MisDatos />} />
            <Route path="admin/usuarios" element={<Usuarios />} />
            <Route path=":modulo/:seccion" element={<ModuloSeccion />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

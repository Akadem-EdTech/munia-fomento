import { createContext, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { UsuarioActual, Modulo, RolFuncionario } from '../types';

interface AuthState {
  usuario: UsuarioActual | null;
  cargando: boolean;
  refrescar: () => void;
}

const AuthContext = createContext<AuthState>({ usuario: null, cargando: true, refrescar: () => {} });

export function useSesionQuery() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<{ usuario: UsuarioActual | null }>('/api/auth/me').then((r) => r.usuario),
    staleTime: 30_000,
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useSesionQuery();
  const qc = useQueryClient();
  const value: AuthState = {
    usuario: data ?? null,
    cargando: isLoading,
    refrescar: () => qc.invalidateQueries({ queryKey: ['me'] }),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

/** ¿El funcionario tiene acceso a un módulo? (refleja el rol×módulo del backend) */
export function tieneModulo(u: UsuarioActual | null, modulo: Modulo): boolean {
  return !!u?.funcionario?.modulos.includes(modulo);
}
export function esRol(u: UsuarioActual | null, ...roles: RolFuncionario[]): boolean {
  return !!u?.funcionario && roles.includes(u.funcionario.rol);
}

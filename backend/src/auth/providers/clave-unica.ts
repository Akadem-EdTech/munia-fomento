import { loadEnv } from '../../env.js';
import { AppError } from '../../lib/errors.js';

/** Claims que ClaveÚnica entrega tras el login (RUT verificado = llave única). */
export interface ClaveUnicaClaims {
  sub: string; // identificador estable del usuario en ClaveÚnica
  rut: string; // RUT verificado
  nombre: string;
  email?: string;
}

/**
 * Proveedor OIDC de ClaveÚnica. Método principal en producción: entrega RUT
 * verificado (anti-duplicados, requisito de fondos públicos). Arquitecturado
 * como estrategia intercambiable; en dev se usa el fallback de contraseña.
 */
export class ClaveUnicaProvider {
  readonly id = 'clave_unica' as const;

  private cfg() {
    const env = loadEnv();
    const { CLAVEUNICA_CLIENT_ID, CLAVEUNICA_CLIENT_SECRET, CLAVEUNICA_REDIRECT_URI, CLAVEUNICA_AUTH_URL, CLAVEUNICA_TOKEN_URL, CLAVEUNICA_USERINFO_URL } = env;
    if (!CLAVEUNICA_CLIENT_ID || !CLAVEUNICA_CLIENT_SECRET || !CLAVEUNICA_REDIRECT_URI || !CLAVEUNICA_AUTH_URL || !CLAVEUNICA_TOKEN_URL || !CLAVEUNICA_USERINFO_URL) {
      throw new AppError(503, 'ClaveÚnica no está configurada en este entorno', 'clave_unica_unavailable');
    }
    return { CLAVEUNICA_CLIENT_ID, CLAVEUNICA_CLIENT_SECRET, CLAVEUNICA_REDIRECT_URI, CLAVEUNICA_AUTH_URL, CLAVEUNICA_TOKEN_URL, CLAVEUNICA_USERINFO_URL };
  }

  /** URL de autorización a la que se redirige al usuario. */
  buildAuthorizeUrl(state: string): string {
    const c = this.cfg();
    const params = new URLSearchParams({
      client_id: c.CLAVEUNICA_CLIENT_ID,
      response_type: 'code',
      scope: 'openid run name',
      redirect_uri: c.CLAVEUNICA_REDIRECT_URI,
      state,
    });
    return `${c.CLAVEUNICA_AUTH_URL}?${params.toString()}`;
  }

  /** Intercambia el code por tokens y obtiene los claims (RUT, nombre). */
  async handleCallback(code: string): Promise<ClaveUnicaClaims> {
    const c = this.cfg();
    const tokenRes = await fetch(c.CLAVEUNICA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: c.CLAVEUNICA_CLIENT_ID,
        client_secret: c.CLAVEUNICA_CLIENT_SECRET,
        redirect_uri: c.CLAVEUNICA_REDIRECT_URI,
      }),
    });
    if (!tokenRes.ok) throw new AppError(502, 'Fallo al validar con ClaveÚnica', 'clave_unica_token');
    const { access_token } = (await tokenRes.json()) as { access_token: string };

    const userRes = await fetch(c.CLAVEUNICA_USERINFO_URL, { headers: { Authorization: `Bearer ${access_token}` } });
    if (!userRes.ok) throw new AppError(502, 'Fallo al obtener datos de ClaveÚnica', 'clave_unica_userinfo');
    const info = (await userRes.json()) as { sub: string; RolUnico?: { numero: number; DV: string }; name?: { nombres?: string[]; apellidos?: string[] } };

    const rut = info.RolUnico ? `${info.RolUnico.numero}-${info.RolUnico.DV}` : '';
    const nombre = [info.name?.nombres?.[0], info.name?.apellidos?.[0]].filter(Boolean).join(' ') || 'Usuario ClaveÚnica';
    return { sub: info.sub, rut, nombre };
  }
}

/* ============================================================================
 * Prueba el proveedor de email configurado (console / resend).
 * Uso:  npm run email:test -- destinatario@correo.cl
 * Lee backend/.env (EMAIL_PROVIDER, EMAIL_FROM, RESEND_API_KEY).
 * ========================================================================== */
import { getEmailProvider } from '../src/adapters/email/index.js';
import { loadEnv } from '../src/env.js';

// Carga .env a process.env (Node ≥ 20.12).
try { (process as unknown as { loadEnvFile?: (p?: string) => void }).loadEnvFile?.('.env'); } catch { /* opcional */ }

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error('Falta el destinatario.\n  npm run email:test -- tu@correo.cl');
    process.exit(1);
  }
  const env = loadEnv();
  console.log(`Proveedor: ${env.EMAIL_PROVIDER} · from: ${env.EMAIL_FROM}`);
  if (env.EMAIL_PROVIDER === 'resend' && !env.RESEND_API_KEY) {
    console.error('EMAIL_PROVIDER=resend pero falta RESEND_API_KEY en backend/.env');
    process.exit(1);
  }

  await getEmailProvider().enviar({
    to,
    subject: 'Prueba de email — MunIA Fomento',
    text: 'Si recibes este correo, el proveedor de email está bien configurado. ✅',
    html: '<p>Si recibes este correo, el proveedor de email de <strong>MunIA Fomento</strong> está bien configurado. ✅</p>',
  });
  console.log('Envío solicitado sin errores.');
}

main().catch((e) => { console.error('Fallo el envío:', e instanceof Error ? e.message : e); process.exit(1); });

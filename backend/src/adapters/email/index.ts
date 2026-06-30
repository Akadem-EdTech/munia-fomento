import { loadEnv } from '../../env.js';

export interface MensajeEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Adaptador de email intercambiable. Dev: consola. Prod: Resend (u otro). */
export interface EmailProvider {
  enviar(msg: MensajeEmail): Promise<void>;
}

class ConsoleEmail implements EmailProvider {
  async enviar(msg: MensajeEmail): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`\n📧 [email:console] → ${msg.to}\n   ${msg.subject}\n   ${msg.text}\n`);
  }
}

class ResendEmail implements EmailProvider {
  constructor(private apiKey: string, private from: string) {}
  async enviar(msg: MensajeEmail): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: this.from, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html }),
    });
    if (!res.ok) throw new Error(`Resend respondió ${res.status}: ${await res.text()}`);
  }
}

let cached: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (cached) return cached;
  const env = loadEnv();
  if (env.EMAIL_PROVIDER === 'resend') {
    if (!env.RESEND_API_KEY) throw new Error('EMAIL_PROVIDER=resend requiere RESEND_API_KEY');
    cached = new ResendEmail(env.RESEND_API_KEY, env.EMAIL_FROM);
  } else {
    cached = new ConsoleEmail();
  }
  return cached;
}

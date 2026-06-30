import { z } from 'zod';

/**
 * Configuración por variables de entorno. El municipio es CONFIGURACIÓN:
 * nada de lo que cambia entre comunas vive en el código.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET debe tener al menos 16 caracteres'),
  DATABASE_URL: z.string(),
  DEFAULT_TENANT_SLUG: z.string().default('demo'),

  AUTH_PRIMARY_STRATEGY: z.enum(['clave_unica', 'password']).default('password'),
  CLAVEUNICA_CLIENT_ID: z.string().optional(),
  CLAVEUNICA_CLIENT_SECRET: z.string().optional(),
  CLAVEUNICA_REDIRECT_URI: z.string().optional(),
  CLAVEUNICA_AUTH_URL: z.string().optional(),
  CLAVEUNICA_TOKEN_URL: z.string().optional(),
  CLAVEUNICA_USERINFO_URL: z.string().optional(),

  EMAIL_PROVIDER: z.enum(['console', 'resend']).default('console'),
  EMAIL_FROM: z.string().default('MunIA Fomento <no-reply@example.cl>'),
  RESEND_API_KEY: z.string().optional(),

  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  FONDOS_MATCH_PROVIDER: z.enum(['mock', 'rag']).default('mock'),
  RAG_ENDPOINT: z.string().optional(),
  RAG_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Configuración de entorno inválida:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const isProd = () => loadEnv().NODE_ENV === 'production';

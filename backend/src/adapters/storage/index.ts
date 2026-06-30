import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { loadEnv } from '../../env.js';

export interface ArchivoGuardado { storageKey: string }

/** Almacenamiento intercambiable. Dev: disco local. Prod: S3-compatible. */
export interface StorageProvider {
  readonly id: 'local' | 's3';
  guardar(key: string, contenido: Buffer, mime: string): Promise<ArchivoGuardado>;
  leer(key: string): Promise<Buffer>;
}

const RAIZ_LOCAL = resolve(process.cwd(), 'uploads');

class LocalStorage implements StorageProvider {
  readonly id = 'local' as const;
  async guardar(key: string, contenido: Buffer): Promise<ArchivoGuardado> {
    const ruta = join(RAIZ_LOCAL, key);
    await mkdir(dirname(ruta), { recursive: true });
    await writeFile(ruta, contenido);
    return { storageKey: key };
  }
  async leer(key: string): Promise<Buffer> {
    return readFile(join(RAIZ_LOCAL, key));
  }
}

class S3Storage implements StorageProvider {
  readonly id = 's3' as const;
  constructor(private client: S3Client, private bucket: string) {}
  async guardar(key: string, contenido: Buffer, mime: string): Promise<ArchivoGuardado> {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: contenido, ContentType: mime }));
    return { storageKey: key };
  }
  async leer(key: string): Promise<Buffer> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return Buffer.from(await res.Body!.transformToByteArray());
  }
}

let cached: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (cached) return cached;
  const env = loadEnv();
  if (env.STORAGE_PROVIDER === 's3') {
    if (!env.S3_BUCKET || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY) throw new Error('STORAGE_PROVIDER=s3 requiere S3_BUCKET, S3_ACCESS_KEY y S3_SECRET_KEY');
    const client = new S3Client({
      region: env.S3_REGION,
      ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT, forcePathStyle: true } : {}),
      credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
    });
    cached = new S3Storage(client, env.S3_BUCKET);
  } else {
    cached = new LocalStorage();
  }
  return cached;
}

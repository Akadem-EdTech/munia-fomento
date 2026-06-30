import type { Tenant } from '@prisma/client';
import { prisma } from '../db.js';
import { loadEnv } from '../env.js';
import { notFound } from './errors.js';

/**
 * Resuelve el tenant (municipio) de la petición. En despliegue mono-municipio
 * se usa DEFAULT_TENANT_SLUG; un header opcional permite multi-tenant por host.
 * El municipio es CONFIGURACIÓN: se resuelve, nunca se hardcodea.
 */
export async function resolverTenant(slugHint?: string | string[]): Promise<Tenant> {
  const slug = (Array.isArray(slugHint) ? slugHint[0] : slugHint) || loadEnv().DEFAULT_TENANT_SLUG;
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) throw notFound(`Municipio "${slug}" no encontrado`, 'tenant_not_found');
  return tenant;
}

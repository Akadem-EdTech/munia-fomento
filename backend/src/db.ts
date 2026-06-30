import { PrismaClient } from '@prisma/client';

/** Cliente Prisma único (evita agotar conexiones en hot-reload). */
export const prisma = new PrismaClient();

export type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

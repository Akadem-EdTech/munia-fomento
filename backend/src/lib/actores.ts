import type { FastifyRequest } from 'fastify';
import { prisma } from '../db.js';
import { forbidden } from './errors.js';
import { exigirPrincipal } from '../plugins/auth.js';

/** Garantiza que el principal es un emprendedor y devuelve sus ids. */
export function exigirEmprendedor(req: FastifyRequest): { usuarioId: string; tenantId: string; emprendedorId: string } {
  const p = exigirPrincipal(req);
  if (p.tipo !== 'EMPRENDEDOR' || !p.emprendedorId) throw forbidden('Sección sólo para emprendedores');
  return { usuarioId: p.usuarioId, tenantId: p.tenantId, emprendedorId: p.emprendedorId };
}

/** Garantiza funcionario y devuelve su id de Funcionario (para asignaciones). */
export async function exigirFuncionario(req: FastifyRequest): Promise<{ usuarioId: string; tenantId: string; funcionarioId: string; rol: string }> {
  const p = exigirPrincipal(req);
  if (p.tipo !== 'FUNCIONARIO' || !p.funcionario) throw forbidden('Acceso reservado a funcionarios');
  const f = await prisma.funcionario.findFirstOrThrow({ where: { usuarioId: p.usuarioId }, select: { id: true } });
  return { usuarioId: p.usuarioId, tenantId: p.tenantId, funcionarioId: f.id, rol: p.funcionario.rol };
}

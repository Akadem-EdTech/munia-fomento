import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { forbidden } from '../lib/errors.js';
import { auditar } from '../lib/audit.js';
import { requireAuth, requireAcceso, exigirPrincipal } from '../plugins/auth.js';
import { soloEmprendedor } from '../auth/access.js';
import { calcularCompletitud } from '../domain/perfil.js';

/** Garantiza que el principal es un emprendedor y devuelve su id de perfil. */
function exigirEmprendedor(req: FastifyRequest): { usuarioId: string; tenantId: string; emprendedorId: string } {
  const p = exigirPrincipal(req);
  if (p.tipo !== 'EMPRENDEDOR' || !p.emprendedorId) throw forbidden('Sección sólo para emprendedores');
  return { usuarioId: p.usuarioId, tenantId: p.tenantId, emprendedorId: p.emprendedorId };
}

const perfilSchema = z.object({
  nombreEmprendimiento: z.string().min(2).optional(),
  descripcion: z.string().max(600).optional(),
  telefono: z.string().max(40).optional(),
  localidad: z.string().max(80).optional(),
  rubroId: z.string().optional().nullable(),
  etapa: z.enum(['idea', 'menos_2_anios', 'consolidado']).optional(),
  documentos: z.array(z.string().max(120)).max(20).optional(),
});

export async function emprendedorRoutes(app: FastifyInstance): Promise<void> {
  const guardEmp = { preHandler: requireAcceso(soloEmprendedor) };

  // ── Catálogo de rubros del municipio (para el perfil) ───────────────────
  app.get('/api/rubros', { preHandler: requireAuth }, async (req) => {
    const p = exigirPrincipal(req);
    const rubros = await prisma.rubro.findMany({
      where: { tenantId: p.tenantId, activo: true }, orderBy: { orden: 'asc' },
      select: { id: true, alias: true, color: true },
    });
    return { rubros };
  });

  // ── Inicio orientado a la acción del momento ────────────────────────────
  app.get('/api/emprendedor/inicio', guardEmp, async (req) => {
    const { tenantId, emprendedorId } = exigirEmprendedor(req);
    const emp = await prisma.emprendedor.findUniqueOrThrow({ where: { id: emprendedorId } });
    const completitud = calcularCompletitud(emp);
    const esNovato = emp.feriasTotales === 0;

    const feriasAbiertas = await prisma.feria.findMany({
      where: { tenantId, estado: 'ABIERTA' },
      select: { id: true, nombre: true, fecha: true, ubicacion: true, pesoProp: true, pesoRep: true },
      orderBy: { createdAt: 'desc' }, take: 5,
    });
    // Reportes pendientes: ferias cerradas donde fue admitido y aún no reporta.
    const adminCerradas = await prisma.postulacion.findMany({
      where: { emprendedorId, estado: 'ADMITIDA', feria: { estado: 'CERRADA' } },
      select: { feria: { select: { id: true, nombre: true } } },
    });
    const conReporte = new Set(
      (await prisma.reporteEmprendedor.findMany({ where: { emprendedorId }, select: { feriaId: true } })).map((r) => r.feriaId),
    );
    const reportesPendientes = adminCerradas.map((a) => a.feria).filter((f) => !conReporte.has(f.id));

    return {
      emprendedor: {
        nombre: emp.nombreEmprendimiento,
        repScore: emp.repScore,
        feriasCumplidas: emp.feriasCumplidas,
        feriasTotales: emp.feriasTotales,
        esNovato,
        // El estado del novato dice "nuevo · sin historial aún", no un cero frío.
        estadoTexto: esNovato ? 'Emprendedor nuevo · sin historial aún' : `Reputación ${emp.repScore} · cumplió ${emp.feriasCumplidas} de ${emp.feriasTotales} ferias`,
      },
      completitud,
      feriasAbiertas,
      reportesPendientes,
    };
  });

  // ── Perfil (derecho ARCO: acceder) ──────────────────────────────────────
  app.get('/api/emprendedor/perfil', guardEmp, async (req) => {
    const { emprendedorId } = exigirEmprendedor(req);
    const emp = await prisma.emprendedor.findUniqueOrThrow({
      where: { id: emprendedorId },
      include: { rubro: { select: { id: true, alias: true } }, usuario: { select: { nombre: true, email: true, rut: true } }, tenant: { select: { consentVersion: true } } },
    });
    return { perfil: emp, completitud: calcularCompletitud(emp) };
  });

  // ── Rectificar perfil (derecho ARCO: rectificar) ────────────────────────
  app.patch('/api/emprendedor/perfil', guardEmp, async (req) => {
    const { usuarioId, tenantId, emprendedorId } = exigirEmprendedor(req);
    const data = perfilSchema.parse(req.body);
    const emp = await prisma.emprendedor.update({ where: { id: emprendedorId }, data });
    await auditar(prisma, { tenantId, usuarioId, accion: 'emprendedor.rectificar', entidad: 'Emprendedor', entidadId: emprendedorId, meta: { campos: Object.keys(data) } });
    return { perfil: emp, completitud: calcularCompletitud(emp) };
  });

  // ── Exportar mis datos (derecho ARCO: portabilidad) ─────────────────────
  app.get('/api/emprendedor/exportar', guardEmp, async (req) => {
    const { usuarioId, tenantId, emprendedorId } = exigirEmprendedor(req);
    const [perfil, postulaciones, inscripciones, certificados, fondos, reportes] = await Promise.all([
      prisma.emprendedor.findUniqueOrThrow({ where: { id: emprendedorId }, include: { usuario: { select: { nombre: true, email: true, rut: true, createdAt: true } } } }),
      prisma.postulacion.findMany({ where: { emprendedorId }, include: { feria: { select: { nombre: true } } } }),
      prisma.inscripcion.findMany({ where: { emprendedorId }, include: { curso: { select: { nombre: true } } } }),
      prisma.certificado.findMany({ where: { emprendedorId }, include: { curso: { select: { nombre: true } } } }),
      prisma.postulacionFondo.findMany({ where: { emprendedorId }, include: { fondo: { select: { nombre: true } } } }),
      prisma.reporteEmprendedor.findMany({ where: { emprendedorId } }),
    ]);
    await auditar(prisma, { tenantId, usuarioId, accion: 'arco.exportar', entidad: 'Emprendedor', entidadId: emprendedorId });
    return { generadoEl: new Date().toISOString(), perfil, postulaciones, inscripciones, certificados, fondos, reportes };
  });

  // ── Solicitudes ARCO (rectificación formal / eliminación / etc.) ────────
  app.post('/api/emprendedor/arco', guardEmp, async (req) => {
    const { usuarioId, tenantId, emprendedorId } = exigirEmprendedor(req);
    const { tipo, detalle } = z.object({ tipo: z.enum(['ACCESO', 'RECTIFICACION', 'EXPORTACION', 'ELIMINACION']), detalle: z.string().max(600).optional() }).parse(req.body);
    const solicitud = await prisma.solicitudArco.create({ data: { emprendedorId, tipo, detalle } });
    await auditar(prisma, { tenantId, usuarioId, accion: `arco.solicitud.${tipo.toLowerCase()}`, entidad: 'SolicitudArco', entidadId: solicitud.id });
    return { solicitud };
  });

  app.get('/api/emprendedor/arco', guardEmp, async (req) => {
    const { emprendedorId } = exigirEmprendedor(req);
    const solicitudes = await prisma.solicitudArco.findMany({ where: { emprendedorId }, orderBy: { createdAt: 'desc' } });
    return { solicitudes };
  });
}

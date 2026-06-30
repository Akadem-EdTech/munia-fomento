import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { notFound, conflict, badRequest } from '../lib/errors.js';
import { auditar } from '../lib/audit.js';
import { notificar } from '../lib/notify.js';
import { requireAcceso } from '../plugins/auth.js';
import { soloEmprendedor, operarModulo, verModulo } from '../auth/access.js';
import { exigirEmprendedor, exigirFuncionario } from '../lib/actores.js';
import { ocupacion, hayCupo, tasaAsistencia, cursosMasDemandados } from '../domain/capacitacion.js';

const cursoSchema = z.object({
  nombre: z.string().min(3),
  descripcion: z.string().optional(),
  modalidad: z.enum(['PRESENCIAL', 'ONLINE']),
  cupos: z.number().int().positive(),
  rubroObjetivoId: z.string().optional().nullable(),
  sesiones: z.array(z.object({ titulo: z.string() })).max(20).default([]),
});

export async function capacitacionRoutes(app: FastifyInstance): Promise<void> {
  const guardEmp = { preHandler: requireAcceso(soloEmprendedor) };
  const operar = { preHandler: requireAcceso(operarModulo('CAPACITACION')) };
  const ver = { preHandler: requireAcceso(verModulo('CAPACITACION')) };

  // ═══ CARA EMPRENDEDOR ═══════════════════════════════════════════════════
  app.get('/api/cursos/disponibles', guardEmp, async (req) => {
    const { tenantId, emprendedorId } = exigirEmprendedor(req);
    const cursos = await prisma.curso.findMany({
      where: { tenantId },
      include: { _count: { select: { inscripciones: { where: { estado: 'INSCRITO' } } } }, rubroObjetivo: { select: { alias: true } }, inscripciones: { where: { emprendedorId }, select: { estado: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      cursos: cursos.map((c) => ({
        id: c.id, nombre: c.nombre, descripcion: c.descripcion, modalidad: c.modalidad, cupos: c.cupos,
        rubro: c.rubroObjetivo?.alias ?? null, inscritos: c._count.inscripciones, ocupacion: ocupacion(c._count.inscripciones, c.cupos),
        miEstado: c.inscripciones[0]?.estado ?? null,
      })),
    };
  });

  app.post('/api/cursos/:id/inscribir', guardEmp, async (req) => {
    const { usuarioId, tenantId, emprendedorId } = exigirEmprendedor(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const curso = await prisma.curso.findFirst({ where: { id, tenantId } });
    if (!curso) throw notFound('Curso no encontrado');
    const existe = await prisma.inscripcion.findUnique({ where: { cursoId_emprendedorId: { cursoId: id, emprendedorId } } });
    if (existe) throw conflict('Ya estás inscrito en este curso', 'ya_inscrito');

    const inscritos = await prisma.inscripcion.count({ where: { cursoId: id, estado: 'INSCRITO' } });
    const estado = hayCupo(inscritos, curso.cupos) ? 'INSCRITO' : 'LISTA_ESPERA';
    const insc = await prisma.inscripcion.create({ data: { cursoId: id, emprendedorId, estado } });
    await auditar(prisma, { tenantId, usuarioId, accion: 'curso.inscribir', entidad: 'Inscripcion', entidadId: insc.id, meta: { cursoId: id, estado } });
    if (estado === 'INSCRITO') {
      await notificar(prisma, { tenantId, evento: 'INSCRIPCION_CURSO_CONFIRMADA', usuarioId, variables: { curso: curso.nombre, fecha: curso.fechaInicio ? new Date(curso.fechaInicio).toLocaleDateString('es-CL') : 'por confirmar' } });
    }
    return { inscripcion: { estado } };
  });

  app.get('/api/cursos/mis-inscripciones', guardEmp, async (req) => {
    const { emprendedorId } = exigirEmprendedor(req);
    const inscripciones = await prisma.inscripcion.findMany({ where: { emprendedorId }, include: { curso: { select: { nombre: true, modalidad: true, fechaInicio: true } } }, orderBy: { createdAt: 'desc' } });
    return { inscripciones };
  });

  app.get('/api/cursos/mis-certificados', guardEmp, async (req) => {
    const { emprendedorId } = exigirEmprendedor(req);
    const certificados = await prisma.certificado.findMany({ where: { emprendedorId }, include: { curso: { select: { nombre: true, modalidad: true } } }, orderBy: { emitidoAt: 'desc' } });
    return { certificados };
  });

  // ═══ CARA MUNICIPIO ═════════════════════════════════════════════════════
  app.get('/api/gestion/cursos', ver, async (req) => {
    const { tenantId } = await exigirFuncionario(req);
    const cursos = await prisma.curso.findMany({
      where: { tenantId },
      include: { _count: { select: { inscripciones: true, certificados: true, sesiones: true } }, rubroObjetivo: { select: { alias: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { cursos: cursos.map((c) => ({ id: c.id, nombre: c.nombre, modalidad: c.modalidad, cupos: c.cupos, rubro: c.rubroObjetivo?.alias ?? null, inscritos: c._count.inscripciones, certificados: c._count.certificados, sesiones: c._count.sesiones })) };
  });

  app.post('/api/gestion/cursos', operar, async (req, reply) => {
    const { usuarioId, tenantId } = await exigirFuncionario(req);
    const d = cursoSchema.parse(req.body);
    const curso = await prisma.curso.create({
      data: { tenantId, nombre: d.nombre, descripcion: d.descripcion, modalidad: d.modalidad, cupos: d.cupos, rubroObjetivoId: d.rubroObjetivoId || null, sesiones: { create: d.sesiones.map((s, i) => ({ titulo: s.titulo, orden: i })) } },
    });
    await auditar(prisma, { tenantId, usuarioId, accion: 'curso.crear', entidad: 'Curso', entidadId: curso.id });
    return reply.code(201).send({ id: curso.id });
  });

  app.get('/api/gestion/cursos/:id/inscritos', ver, async (req) => {
    const { tenantId } = await exigirFuncionario(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const curso = await prisma.curso.findFirst({ where: { id, tenantId }, include: { sesiones: { orderBy: { orden: 'asc' } } } });
    if (!curso) throw notFound('Curso no encontrado');
    const inscripciones = await prisma.inscripcion.findMany({ where: { cursoId: id }, include: { emprendedor: { select: { id: true, nombreEmprendimiento: true, usuario: { select: { nombre: true } } } } } });
    const asistencias = await prisma.asistencia.findMany({ where: { sesion: { cursoId: id } } });
    const certificados = await prisma.certificado.findMany({ where: { cursoId: id }, select: { emprendedorId: true } });
    const certSet = new Set(certificados.map((c) => c.emprendedorId));
    const presentesPorEmp = new Map<string, number>();
    for (const a of asistencias) if (a.presente) presentesPorEmp.set(a.emprendedorId, (presentesPorEmp.get(a.emprendedorId) ?? 0) + 1);
    return {
      curso: { id: curso.id, nombre: curso.nombre, sesiones: curso.sesiones },
      inscritos: inscripciones.map((i) => ({ emprendedorId: i.emprendedor.id, nombre: i.emprendedor.usuario.nombre, emprendimiento: i.emprendedor.nombreEmprendimiento, estado: i.estado, asistio: presentesPorEmp.get(i.emprendedor.id) ?? 0, certificado: certSet.has(i.emprendedor.id) })),
    };
  });

  // Asistencia por sesión — guardado instantáneo desde el celular.
  app.post('/api/gestion/asistencia/:sesionId/:empId', operar, async (req) => {
    const { usuarioId, tenantId } = await exigirFuncionario(req);
    const { sesionId, empId } = z.object({ sesionId: z.string(), empId: z.string() }).parse(req.params);
    const { presente } = z.object({ presente: z.boolean() }).parse(req.body);
    const sesion = await prisma.sesionCurso.findFirst({ where: { id: sesionId, curso: { tenantId } } });
    if (!sesion) throw notFound('Sesión no encontrada');
    await prisma.asistencia.upsert({
      where: { sesionId_emprendedorId: { sesionId, emprendedorId: empId } },
      create: { sesionId, emprendedorId: empId, presente },
      update: { presente },
    });
    await auditar(prisma, { tenantId, usuarioId, accion: 'curso.asistencia', entidad: 'Asistencia', entidadId: `${sesionId}:${empId}`, meta: { presente } });
    return { ok: true };
  });

  // Emitir certificado a un emprendedor que asistió.
  app.post('/api/gestion/cursos/:id/certificar/:empId', operar, async (req) => {
    const { usuarioId, tenantId } = await exigirFuncionario(req);
    const { id, empId } = z.object({ id: z.string(), empId: z.string() }).parse(req.params);
    const curso = await prisma.curso.findFirst({ where: { id, tenantId } });
    if (!curso) throw notFound('Curso no encontrado');
    const presentes = await prisma.asistencia.count({ where: { sesion: { cursoId: id }, emprendedorId: empId, presente: true } });
    if (presentes === 0) throw badRequest('El emprendedor no registra asistencia en este curso', 'sin_asistencia');
    const cert = await prisma.certificado.upsert({ where: { cursoId_emprendedorId: { cursoId: id, emprendedorId: empId } }, create: { cursoId: id, emprendedorId: empId }, update: {} });
    await auditar(prisma, { tenantId, usuarioId, accion: 'curso.certificar', entidad: 'Certificado', entidadId: cert.id });
    return { ok: true };
  });

  app.get('/api/gestion/dashboards/capacitacion', ver, async (req) => {
    const { tenantId } = await exigirFuncionario(req);
    const cursos = await prisma.curso.findMany({ where: { tenantId }, include: { _count: { select: { inscripciones: { where: { estado: 'INSCRITO' } } } } } });
    const certificados = await prisma.certificado.count({ where: { curso: { tenantId } } });
    const formados = await prisma.inscripcion.findMany({ where: { curso: { tenantId }, estado: 'INSCRITO' }, select: { emprendedorId: true }, distinct: ['emprendedorId'] });
    const asistencias = await prisma.asistencia.findMany({ where: { sesion: { curso: { tenantId } } }, select: { presente: true } });
    const presentes = asistencias.filter((a) => a.presente).length;
    return {
      cursosDictados: cursos.length,
      emprendedoresFormados: formados.length,
      certificadosEmitidos: certificados,
      tasaAsistencia: tasaAsistencia(presentes, asistencias.length),
      masDemandados: cursosMasDemandados(cursos.map((c) => ({ nombre: c.nombre, inscritos: c._count.inscripciones, cupos: c.cupos })), 5),
    };
  });
}

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { notFound, forbidden, badRequest } from '../lib/errors.js';
import { auditar } from '../lib/audit.js';
import { requireAcceso } from '../plugins/auth.js';
import { operarModulo, verModulo, evaluarEnModulo } from '../auth/access.js';
import { exigirFuncionario } from '../lib/actores.js';
import { notificar } from '../lib/notify.js';
import { rankear, desgloseCombinado, actualizarReputacion } from '../domain/scoring.js';
import { metricasOperativas, distribucionPor, metricasNarrativas } from '../domain/dashboards.js';

/** Checklist de cumplimiento (capa 1) — binario, se guarda al instante. */
export const CUMPLIMIENTO_ITEMS = [
  { k: 'asistio', txt: 'Asistió a la feria', sub: 'Se presentó el día del evento' },
  { k: 'puntual', txt: 'Montó a tiempo', sub: 'Instaló su stand en el horario indicado' },
  { k: 'normas', txt: 'Cumplió las normas del recinto', sub: 'Respetó espacio, ruido y reglamento' },
  { k: 'desarmo', txt: 'Desarmó correctamente', sub: 'Dejó el espacio limpio al cierre' },
];

const preguntaSchema = z.object({
  texto: z.string().min(3),
  tipo: z.enum(['TEXTO', 'SELECCION', 'NUMERO', 'SINO', 'ADJUNTO']),
  puntuable: z.boolean().default(false),
  peso: z.number().int().min(0).max(100).default(0),
  opciones: z.array(z.string()).default([]),
});
const feriaSchema = z.object({
  nombre: z.string().min(3),
  objetivo: z.string().optional(),
  fecha: z.string().optional(),
  ubicacion: z.string().optional(),
  cupos: z.number().int().positive(),
  pesoProp: z.number().int().min(0).max(100),
  pesoRep: z.number().int().min(0).max(100),
  rubroIds: z.array(z.string()).default([]),
  preguntas: z.array(preguntaSchema).max(6).default([]),
});

/** El evaluador sólo opera ferias asignadas (scope por evento); el admin no. */
async function asegurarEvaluadorAsignado(req: FastifyRequest, feriaId: string) {
  const { funcionarioId, rol } = await exigirFuncionario(req);
  if (rol === 'ADMINISTRADOR') return funcionarioId;
  const asignado = await prisma.evaluadorFeria.findUnique({ where: { feriaId_funcionarioId: { feriaId, funcionarioId } } });
  if (!asignado) throw forbidden('No estás asignado como evaluador de esta feria');
  return funcionarioId;
}

export async function feriasGestionRoutes(app: FastifyInstance): Promise<void> {
  const verFerias = { preHandler: requireAcceso(verModulo('FERIAS')) };
  const operarFerias = { preHandler: requireAcceso(operarModulo('FERIAS')) };
  const evaluarFerias = { preHandler: requireAcceso(evaluarEnModulo('FERIAS')) };

  // ── Listado de ferias (gestión) ──────────────────────────────────────────
  app.get('/api/gestion/ferias', verFerias, async (req) => {
    const { tenantId } = await exigirFuncionario(req);
    const ferias = await prisma.feria.findMany({
      where: { tenantId },
      include: { _count: { select: { postulaciones: true } }, rubros: { include: { rubro: { select: { alias: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return { ferias: ferias.map((f) => ({ id: f.id, nombre: f.nombre, estado: f.estado, fecha: f.fecha, ubicacion: f.ubicacion, cupos: f.cupos, pesoProp: f.pesoProp, pesoRep: f.pesoRep, postulados: f._count.postulaciones, rubros: f.rubros.map((r) => r.rubro.alias) })) };
  });

  // ── Crear feria ───────────────────────────────────────────────────────────
  app.post('/api/gestion/ferias', operarFerias, async (req, reply) => {
    const { usuarioId, tenantId, funcionarioId } = await exigirFuncionario(req);
    const d = feriaSchema.parse(req.body);
    const feria = await prisma.feria.create({
      data: {
        tenantId, nombre: d.nombre, objetivo: d.objetivo, fecha: d.fecha, ubicacion: d.ubicacion, cupos: d.cupos,
        pesoProp: d.pesoProp, pesoRep: d.pesoRep, estado: 'ABIERTA', creadoPorId: funcionarioId,
        rubros: { create: d.rubroIds.map((rubroId) => ({ rubroId })) },
        preguntas: { create: d.preguntas.map((p, i) => ({ texto: p.texto, tipo: p.tipo, puntuable: p.puntuable, peso: p.peso, opciones: p.opciones, orden: i })) },
      },
    });
    await auditar(prisma, { tenantId, usuarioId, accion: 'feria.crear', entidad: 'Feria', entidadId: feria.id });
    return reply.code(201).send({ id: feria.id });
  });

  // ── Detalle (gestión) ─────────────────────────────────────────────────────
  app.get('/api/gestion/ferias/:id', verFerias, async (req) => {
    const { tenantId } = await exigirFuncionario(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const feria = await prisma.feria.findFirst({ where: { id, tenantId }, include: { preguntas: { orderBy: { orden: 'asc' } }, rubros: true } });
    if (!feria) throw notFound('Feria no encontrada');
    return { feria };
  });

  // ── Selección: ranking por score combinado con desglose (corazón) ───────
  app.get('/api/gestion/ferias/:id/seleccion', operarFerias, async (req) => {
    const { tenantId } = await exigirFuncionario(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const q = z.object({ pesoProp: z.coerce.number().optional(), pesoRep: z.coerce.number().optional() }).parse(req.query);

    const feria = await prisma.feria.findFirst({ where: { id, tenantId } });
    if (!feria) throw notFound('Feria no encontrada');
    const pesoProp = q.pesoProp ?? feria.pesoProp;
    const pesoRep = q.pesoRep ?? feria.pesoRep;

    const postulaciones = await prisma.postulacion.findMany({
      where: { feriaId: id },
      include: { emprendedor: { select: { id: true, nombreEmprendimiento: true, repScore: true, feriasCumplidas: true, feriasTotales: true, rubro: { select: { alias: true } }, usuario: { select: { nombre: true } } } } },
    });
    const ranking = rankear(
      postulaciones.map((p) => ({ id: p.id, scorePropuesta: p.scorePropuesta, repScore: p.emprendedor.repScore })),
      pesoProp, pesoRep, feria.cupos,
    );
    const porId = new Map(postulaciones.map((p) => [p.id, p]));
    return {
      feria: { id: feria.id, nombre: feria.nombre, cupos: feria.cupos, pesoProp: feria.pesoProp, pesoRep: feria.pesoRep, estado: feria.estado },
      perilla: { pesoProp, pesoRep },
      ranking: ranking.map((r) => {
        const p = porId.get(r.id)!;
        return {
          postulacionId: r.id, rank: r.rank, sugerido: r.sugerido, estado: p.estado,
          total: r.total, aportePropuesta: r.aportePropuesta, aporteReputacion: r.aporteReputacion,
          scorePropuesta: p.scorePropuesta,
          emprendedor: { nombre: p.emprendedor.usuario.nombre, emprendimiento: p.emprendedor.nombreEmprendimiento, repScore: p.emprendedor.repScore, conf: `${p.emprendedor.feriasCumplidas}/${p.emprendedor.feriasTotales}`, rubro: p.emprendedor.rubro?.alias, esNovato: p.emprendedor.feriasTotales === 0 },
        };
      }),
    };
  });

  // ── Decidir una postulación (admitir / rechazar / lista de espera) ──────
  app.post('/api/gestion/postulaciones/:id/decidir', operarFerias, async (req) => {
    const { usuarioId, tenantId } = await exigirFuncionario(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const { decision, motivo } = z.object({ decision: z.enum(['ADMITIDA', 'RECHAZADA', 'LISTA_ESPERA']), motivo: z.string().max(300).optional() }).parse(req.body);
    const post = await prisma.postulacion.findFirst({ where: { id, feria: { tenantId } }, include: { feria: true, emprendedor: { select: { usuario: { select: { id: true } } } } } });
    if (!post) throw notFound('Postulación no encontrada');
    await prisma.postulacion.update({ where: { id }, data: { estado: decision, motivoEstado: motivo } });
    await auditar(prisma, { tenantId, usuarioId, accion: `feria.${decision.toLowerCase()}`, entidad: 'Postulacion', entidadId: id, meta: { motivo } });
    const evento = ({ ADMITIDA: 'EMPRENDEDOR_ADMITIDO', RECHAZADA: 'EMPRENDEDOR_RECHAZADO', LISTA_ESPERA: 'EMPRENDEDOR_LISTA_ESPERA' } as const)[decision];
    await notificar(prisma, { tenantId, evento, usuarioId: post.emprendedor.usuario.id, variables: { feria: post.feria.nombre, fecha: post.feria.fecha ?? '', ubicacion: post.feria.ubicacion ?? '' } });
    return { ok: true };
  });

  // ── Registro permanente de emprendedores (búsqueda/filtro) ──────────────
  app.get('/api/gestion/emprendedores', verFerias, async (req) => {
    const { tenantId } = await exigirFuncionario(req);
    const { q, rubro } = z.object({ q: z.string().optional(), rubro: z.string().optional() }).parse(req.query);
    const emprendedores = await prisma.emprendedor.findMany({
      where: {
        tenantId,
        ...(rubro ? { rubro: { codigoMaestro: rubro } } : {}),
        ...(q ? { OR: [{ nombreEmprendimiento: { contains: q, mode: 'insensitive' } }, { usuario: { nombre: { contains: q, mode: 'insensitive' } } }] } : {}),
      },
      select: { id: true, nombreEmprendimiento: true, repScore: true, feriasCumplidas: true, feriasTotales: true, localidad: true, rubro: { select: { alias: true, codigoMaestro: true } }, usuario: { select: { nombre: true } } },
      orderBy: { repScore: 'desc' }, take: 300,
    });
    return { emprendedores };
  });

  // ── Evaluación en terreno (3 capas) ─────────────────────────────────────
  app.get('/api/gestion/ferias/:id/evaluacion', evaluarFerias, async (req) => {
    const { tenantId } = await exigirFuncionario(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    await asegurarEvaluadorAsignado(req, id);
    const feria = await prisma.feria.findFirst({ where: { id, tenantId } });
    if (!feria) throw notFound('Feria no encontrada');
    const admitidos = await prisma.postulacion.findMany({
      where: { feriaId: id, estado: 'ADMITIDA' },
      include: { emprendedor: { select: { id: true, nombreEmprendimiento: true, usuario: { select: { nombre: true } } } } },
    });
    const evaluaciones = await prisma.evaluacionTerreno.findMany({ where: { feriaId: id } });
    const reportes = await prisma.reporteEmprendedor.findMany({ where: { feriaId: id } });
    const evalPorEmp = new Map(evaluaciones.map((e) => [e.emprendedorId, e]));
    const repPorEmp = new Map(reportes.map((r) => [r.emprendedorId, r]));
    const lista = admitidos.map((a) => {
      const ev = evalPorEmp.get(a.emprendedor.id);
      return {
        emprendedorId: a.emprendedor.id, nombre: a.emprendedor.usuario.nombre, emprendimiento: a.emprendedor.nombreEmprendimiento,
        cumplimiento: (ev?.cumplimiento as Record<string, boolean>) ?? {},
        calidadEstrellas: ev?.calidadEstrellas ?? null,
        completada: ev?.completada ?? false,
        autoreporte: repPorEmp.get(a.emprendedor.id) ? { participo: repPorEmp.get(a.emprendedor.id)!.participo, ventas: repPorEmp.get(a.emprendedor.id)!.ventasReportadas } : null,
      };
    });
    const completadas = lista.filter((l) => l.completada).length;
    return { feria: { id: feria.id, nombre: feria.nombre, estado: feria.estado }, items: CUMPLIMIENTO_ITEMS, lista, progreso: { evaluados: completadas, totales: lista.length } };
  });

  // Guardar evaluación al instante (cada marca; no acumula esperando un botón).
  app.post('/api/gestion/evaluacion/:feriaId/:empId', evaluarFerias, async (req) => {
    const { usuarioId, tenantId } = await exigirFuncionario(req);
    const { feriaId, empId } = z.object({ feriaId: z.string(), empId: z.string() }).parse(req.params);
    const funcionarioId = await asegurarEvaluadorAsignado(req, feriaId);
    const body = z.object({ cumplimiento: z.record(z.boolean()).optional(), calidadEstrellas: z.number().int().min(1).max(5).nullable().optional(), completada: z.boolean().optional() }).parse(req.body);

    const data = { ...(body.cumplimiento !== undefined ? { cumplimiento: body.cumplimiento } : {}), ...(body.calidadEstrellas !== undefined ? { calidadEstrellas: body.calidadEstrellas } : {}), ...(body.completada !== undefined ? { completada: body.completada } : {}) };
    const ev = await prisma.evaluacionTerreno.upsert({
      where: { feriaId_emprendedorId: { feriaId, emprendedorId: empId } },
      create: { feriaId, emprendedorId: empId, evaluadorId: funcionarioId, ...data },
      update: { evaluadorId: funcionarioId, ...data },
    });
    await auditar(prisma, { tenantId, usuarioId, accion: 'feria.evaluar', entidad: 'EvaluacionTerreno', entidadId: ev.id, meta: { feriaId, empId } });
    return { ok: true, evaluacion: { cumplimiento: ev.cumplimiento, calidadEstrellas: ev.calidadEstrellas, completada: ev.completada } };
  });

  // ── Cerrar feria: consolida la reputación (score de desempeño) ──────────
  app.post('/api/gestion/ferias/:id/cerrar', operarFerias, async (req) => {
    const { usuarioId, tenantId } = await exigirFuncionario(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const feria = await prisma.feria.findFirst({ where: { id, tenantId } });
    if (!feria) throw notFound('Feria no encontrada');
    if (feria.estado === 'CERRADA') throw badRequest('La feria ya está cerrada', 'ya_cerrada');

    const evaluaciones = await prisma.evaluacionTerreno.findMany({ where: { feriaId: id, completada: true } });
    const reportes = await prisma.reporteEmprendedor.findMany({ where: { feriaId: id } });
    const repPorEmp = new Map(reportes.map((r) => [r.emprendedorId, r]));

    await prisma.$transaction(async (tx) => {
      for (const ev of evaluaciones) {
        const emp = await tx.emprendedor.findUnique({ where: { id: ev.emprendedorId } });
        if (!emp) continue;
        const nuevo = actualizarReputacion(
          { repScore: emp.repScore, feriasCumplidas: emp.feriasCumplidas, feriasTotales: emp.feriasTotales },
          { cumplimiento: (ev.cumplimiento as Record<string, boolean>) ?? {}, participo: repPorEmp.get(ev.emprendedorId)?.participo ?? true, calidadEstrellas: ev.calidadEstrellas },
        );
        await tx.emprendedor.update({ where: { id: emp.id }, data: { repScore: nuevo.repScore, feriasCumplidas: nuevo.feriasCumplidas, feriasTotales: nuevo.feriasTotales } });
        await tx.scoreEvento.create({ data: { emprendedorId: emp.id, origen: 'feria', origenId: id, delta: nuevo.repScore - emp.repScore, motivo: `Cierre de ${feria.nombre}` } });
      }
      await tx.feria.update({ where: { id }, data: { estado: 'CERRADA' } });
    });
    await auditar(prisma, { tenantId, usuarioId, accion: 'feria.cerrar', entidad: 'Feria', entidadId: id, meta: { evaluados: evaluaciones.length } });
    return { ok: true, evaluados: evaluaciones.length };
  });

  // ── Dashboards (operativo / territorial / narrativo) ────────────────────
  app.get('/api/gestion/dashboards/ferias', verFerias, async (req) => {
    const { tenantId } = await exigirFuncionario(req);
    const enCurso = await prisma.feria.findFirst({ where: { tenantId, estado: { in: ['EN_EVALUACION', 'ABIERTA'] } }, orderBy: { createdAt: 'desc' } });

    let operativo = null;
    let territorialRubro = null;
    if (enCurso) {
      const postus = await prisma.postulacion.findMany({ where: { feriaId: enCurso.id }, include: { emprendedor: { select: { localidad: true, rubro: { select: { codigoMaestro: true, alias: true } } } } } });
      const metricaInput = postus.map((p) => ({ estado: p.estado, rubroCodigo: p.emprendedor.rubro?.alias ?? null, localidad: p.emprendedor.localidad }));
      operativo = { feria: enCurso.nombre, ...metricasOperativas(metricaInput, enCurso.cupos) };
      territorialRubro = distribucionPor(metricaInput, 'rubroCodigo');
    }

    const cerradas = await prisma.feria.findMany({ where: { tenantId, estado: 'CERRADA' }, select: { ventasReportadas: true, publicoEstimado: true } });
    const emprendedoresUnicos = await prisma.emprendedor.count({ where: { tenantId, feriasTotales: { gt: 0 } } });
    const narrativo = metricasNarrativas(cerradas, emprendedoresUnicos);

    return { operativo, territorialRubro, narrativo };
  });

  // Desglose individual (para defender una admisión puntual)
  app.get('/api/gestion/postulaciones/:id/desglose', operarFerias, async (req) => {
    const { tenantId } = await exigirFuncionario(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const post = await prisma.postulacion.findFirst({ where: { id, feria: { tenantId } }, include: { feria: true, emprendedor: { select: { repScore: true } } } });
    if (!post) throw notFound('Postulación no encontrada');
    return { desglose: desgloseCombinado({ scorePropuesta: post.scorePropuesta, repScore: post.emprendedor.repScore, pesoProp: post.feria.pesoProp, pesoRep: post.feria.pesoRep }) };
  });
}

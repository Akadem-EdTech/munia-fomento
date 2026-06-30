/* ============================================================================
 * MunIA Fomento — Datos semilla GENÉRICOS (sin nombre de comuna).
 * El municipio es configuración: aquí va un tenant "demo" neutro.
 * Incluye al menos un emprendedor nuevo (rep 0, sin historial) para validar
 * el onboarding del novato. Contraseña dev de todos: "demo1234".
 * ========================================================================== */
import { PrismaClient, TipoUsuario, RolFuncionario, Modulo, EstadoUsuario, AuthStrategy, EstadoFeria, TipoPregunta, EstadoPostulacion, ModalidadCurso, OrigenFondo, EstadoFondo, EventoNotificacion, CanalNotificacion } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();
const DEV_PASSWORD = 'demo1234';

async function main() {
  const hash = await argon2.hash(DEV_PASSWORD);

  // ── Limpieza idempotente del tenant demo ────────────────────────────────
  const existing = await prisma.tenant.findUnique({ where: { slug: 'demo' } });
  if (existing) {
    await prisma.tenant.delete({ where: { id: existing.id } }); // cascada
  }

  // ── TENANT (municipio demo, neutro) ─────────────────────────────────────
  const tenant = await prisma.tenant.create({
    data: {
      slug: 'demo',
      nombre: 'Municipio Demo',
      dominioCorreo: 'municipio.demo.cl',
      consentVersion: '1.0',
      modulosActivos: [Modulo.FERIAS, Modulo.CAPACITACION, Modulo.FONDOS],
    },
  });

  // ── RUBROS (alias de cara al usuario + maestro estándar inter-comunal) ──
  const rubrosSeed = [
    { codigoMaestro: 'GASTRONOMIA', alias: 'Cocinería', color: '#F59E0B' },
    { codigoMaestro: 'ARTESANIA', alias: 'Artesanía', color: '#A78BFA' },
    { codigoMaestro: 'TEXTIL', alias: 'Textil y Vestuario', color: '#EC4899' },
    { codigoMaestro: 'AGRICOLA', alias: 'Agrícola', color: '#4ADE80' },
    { codigoMaestro: 'SERVICIOS', alias: 'Servicios', color: '#2196F3' },
    { codigoMaestro: 'TECNOLOGIA', alias: 'Tecnología', color: '#22D3EE' },
  ];
  const rubros: Record<string, string> = {};
  for (const [i, r] of rubrosSeed.entries()) {
    const created = await prisma.rubro.create({ data: { ...r, orden: i, tenantId: tenant.id } });
    rubros[r.codigoMaestro] = created.id;
  }

  // ── PLANTILLAS DE NOTIFICACIÓN (editables, con variables) ───────────────
  const plantillas: { evento: EventoNotificacion; asunto: string; cuerpo: string }[] = [
    { evento: 'POSTULACION_RECIBIDA', asunto: 'Recibimos tu postulación a {feria}', cuerpo: 'Hola {nombre}, recibimos tu postulación a {feria}. Te avisaremos cuando se publiquen los resultados.' },
    { evento: 'EMPRENDEDOR_ADMITIDO', asunto: '¡Fuiste admitido en {feria}!', cuerpo: 'Hola {nombre}, ¡felicitaciones! Fuiste admitido en {feria} ({fecha}, {ubicacion}).' },
    { evento: 'EMPRENDEDOR_RECHAZADO', asunto: 'Resultado de tu postulación a {feria}', cuerpo: 'Hola {nombre}, en esta ocasión tu postulación a {feria} no fue seleccionada. Te invitamos a postular a próximas convocatorias.' },
    { evento: 'EMPRENDEDOR_LISTA_ESPERA', asunto: 'Quedaste en lista de espera para {feria}', cuerpo: 'Hola {nombre}, quedaste en lista de espera para {feria}. Te avisaremos si se libera un cupo.' },
    { evento: 'FERIA_RECORDATORIO_48H', asunto: 'Recordatorio: {feria} en 48 horas', cuerpo: 'Hola {nombre}, te recordamos que {feria} se realiza el {fecha} en {ubicacion}.' },
    { evento: 'SOLICITUD_AUTOREPORTE', asunto: '¿Cómo te fue en {feria}?', cuerpo: 'Hola {nombre}, cuéntanos cómo te fue en {feria}. Tu reporte nos ayuda a mejorar.' },
    { evento: 'INSCRIPCION_CURSO_CONFIRMADA', asunto: 'Inscripción confirmada: {curso}', cuerpo: 'Hola {nombre}, tu inscripción al curso {curso} fue confirmada ({fecha}).' },
    { evento: 'CONVOCATORIA_ABIERTA', asunto: 'Nueva convocatoria: {fondo}', cuerpo: 'Hola {nombre}, se abrió una convocatoria que podría interesarte: {fondo}. Cierra el {fecha}.' },
    { evento: 'FONDO_ADJUDICADO', asunto: '¡Te adjudicaste {fondo}!', cuerpo: 'Hola {nombre}, ¡felicitaciones! Se te adjudicó el fondo {fondo}.' },
    { evento: 'FUNCIONARIO_INVITADO', asunto: 'Activa tu cuenta en MunIA Fomento', cuerpo: 'Hola {nombre}, fuiste dado de alta como {cargo}. Activa tu cuenta en {enlace}.' },
  ];
  for (const p of plantillas) {
    await prisma.plantillaNotificacion.create({
      data: { tenantId: tenant.id, evento: p.evento, canal: CanalNotificacion.EMAIL, asunto: p.asunto, cuerpo: p.cuerpo },
    });
  }

  // ── FUNCIONARIOS (dados de alta por el admin, no auto-registro) ─────────
  async function crearFuncionario(nombre: string, email: string, cargo: string, rol: RolFuncionario, modulos: Modulo[]) {
    return prisma.usuario.create({
      data: {
        tenantId: tenant.id, tipo: TipoUsuario.FUNCIONARIO, nombre, email,
        estado: EstadoUsuario.ACTIVO, authStrategy: AuthStrategy.PASSWORD, passwordHash: hash,
        funcionario: { create: { cargo, rol, modulos } },
      },
    });
  }
  await crearFuncionario('Daniela Rojas', 'admin@municipio.demo.cl', 'Encargada de Fomento Productivo', RolFuncionario.ADMINISTRADOR, [Modulo.FERIAS, Modulo.CAPACITACION, Modulo.FONDOS]);
  const evalUser = await crearFuncionario('Claudia Pérez', 'evaluador@municipio.demo.cl', 'Evaluadora en terreno', RolFuncionario.EVALUADOR, [Modulo.FERIAS]);
  await crearFuncionario('Marco Núñez', 'evaluador2@municipio.demo.cl', 'Evaluador en terreno', RolFuncionario.EVALUADOR, [Modulo.FERIAS]);
  await crearFuncionario('Sergio Mella', 'jefatura@municipio.demo.cl', 'Director DIDECO', RolFuncionario.JEFATURA, [Modulo.FERIAS, Modulo.CAPACITACION, Modulo.FONDOS]);

  // ── EMPRENDEDORES (registro permanente, compartido entre módulos) ───────
  // Localidades genéricas (sin nombre de comuna). Incluye Roberto = nuevo (rep 0).
  const empSeed = [
    { nombre: 'María Fuentes', emp: 'Delicias del Valle', rut: '12.456.789-0', rubro: 'GASTRONOMIA', loc: 'Centro', rep: 88, cumpl: 8, tot: 8, etapa: 'consolidado', docs: ['Resolución sanitaria', 'Inicio actividades'], desc: 'Mermeladas y conservas artesanales de fruta.' },
    { nombre: 'Jorge Tapia', emp: 'Cuero & Greda', rut: '9.876.543-2', rubro: 'ARTESANIA', loc: 'Sector Norte', rep: 76, cumpl: 6, tot: 7, etapa: 'consolidado', docs: ['Inicio actividades'], desc: 'Marroquinería en cuero y cerámica utilitaria.' },
    { nombre: 'Carolina Reyes', emp: 'Hilos del Valle', rut: '15.234.567-8', rubro: 'TEXTIL', loc: 'Centro', rep: 91, cumpl: 9, tot: 9, etapa: 'consolidado', docs: ['Resolución sanitaria', 'Inicio actividades'], desc: 'Tejidos a telar y vestuario en lana natural teñida.' },
    { nombre: 'Pedro Salinas', emp: 'Viña Pequeña', rut: '11.345.678-9', rubro: 'AGRICOLA', loc: 'Sector Rural', rep: 82, cumpl: 7, tot: 8, etapa: 'consolidado', docs: ['Resolución sanitaria', 'Inicio actividades', 'Patente alcoholes'], desc: 'Vino de pequeña producción y aceite de oliva.' },
    { nombre: 'Valentina Soto', emp: 'Huerto Vivo', rut: '18.765.432-1', rubro: 'AGRICOLA', loc: 'Sector Costero', rep: 34, cumpl: 2, tot: 2, etapa: 'menos_2_anios', genero: 'F', docs: ['Inicio actividades'], desc: 'Hortalizas orgánicas y plantines. Emprendedora nueva.' },
    { nombre: 'Roberto Díaz', emp: 'TechAgro Local', rut: '16.543.210-9', rubro: 'TECNOLOGIA', loc: 'Centro', rep: 0, cumpl: 0, tot: 0, etapa: 'idea', docs: ['Inicio actividades'], desc: 'Sensores de bajo costo para riego inteligente. Primer registro.' },
    { nombre: 'Ana Maldonado', emp: 'Sabores del Mar', rut: '13.678.901-2', rubro: 'GASTRONOMIA', loc: 'Sector Costero', rep: 58, cumpl: 4, tot: 5, etapa: 'menos_2_anios', genero: 'F', docs: ['Resolución sanitaria'], desc: 'Conservas de productos del mar.' },
    { nombre: 'Luis Carrasco', emp: 'Madera Noble', rut: '10.234.567-8', rubro: 'ARTESANIA', loc: 'Sector Poniente', rep: 69, cumpl: 5, tot: 6, etapa: 'consolidado', docs: ['Inicio actividades'], desc: 'Muebles y objetos en madera nativa recuperada.' },
  ];
  const emps: Record<string, string> = {};
  for (const e of empSeed) {
    const email = e.nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '.') + '@example.cl';
    const u = await prisma.usuario.create({
      data: {
        tenantId: tenant.id, tipo: TipoUsuario.EMPRENDEDOR, nombre: e.nombre, email, rut: e.rut,
        estado: EstadoUsuario.ACTIVO, authStrategy: AuthStrategy.PASSWORD, passwordHash: hash,
        emprendedor: {
          create: {
            tenantId: tenant.id, nombreEmprendimiento: e.emp, descripcion: e.desc, localidad: e.loc,
            rubroId: rubros[e.rubro], etapa: e.etapa, genero: e.genero, repScore: e.rep,
            feriasCumplidas: e.cumpl, feriasTotales: e.tot, documentos: e.docs,
            consentVersion: '1.0', consentFecha: new Date(),
          },
        },
      },
      include: { emprendedor: true },
    });
    emps[e.nombre] = u.emprendedor!.id;
  }

  // ── FERIAS (con perilla de ponderación y preguntas configurables) ───────
  const expoVendimia = await prisma.feria.create({
    data: {
      tenantId: tenant.id, nombre: 'Expo Productores 2026',
      objetivo: 'Vitrina de productores de vino, aceite y gastronomía local para la temporada.',
      estado: EstadoFeria.EN_EVALUACION, fecha: '14–15 Mar 2026', ubicacion: 'Plaza de Armas', cupos: 40,
      pesoProp: 55, pesoRep: 45,
      rubros: { create: [{ rubroId: rubros.AGRICOLA }, { rubroId: rubros.GASTRONOMIA }, { rubroId: rubros.ARTESANIA }] },
      preguntas: {
        create: [
          { texto: '¿Cuenta con resolución sanitaria vigente?', tipo: TipoPregunta.SINO, puntuable: true, peso: 30, orden: 0 },
          { texto: 'Describa su producto estrella para esta feria', tipo: TipoPregunta.TEXTO, puntuable: true, peso: 25, orden: 1 },
          { texto: '¿Producción propia o reventa?', tipo: TipoPregunta.SELECCION, puntuable: true, peso: 20, opciones: ['Producción propia', 'Reventa'], orden: 2 },
          { texto: 'Adjunte fotos del producto', tipo: TipoPregunta.ADJUNTO, puntuable: false, peso: 0, orden: 3 },
        ],
      },
    },
  });

  await prisma.feria.create({
    data: {
      tenantId: tenant.id, nombre: 'Feria Nuevos Talentos',
      objetivo: 'Espacio para emprendedores emergentes con menos de 2 años. Prioriza propuesta sobre trayectoria.',
      estado: EstadoFeria.ABIERTA, fecha: '20 Abr 2026', ubicacion: 'Centro Cultural Municipal', cupos: 25,
      pesoProp: 80, pesoRep: 20,
      rubros: { create: [{ rubroId: rubros.TECNOLOGIA }, { rubroId: rubros.SERVICIOS }, { rubroId: rubros.TEXTIL }, { rubroId: rubros.ARTESANIA }] },
      preguntas: {
        create: [
          { texto: '¿Hace cuánto partió su emprendimiento?', tipo: TipoPregunta.SELECCION, puntuable: true, peso: 20, opciones: ['Menos de 6 meses', '6 meses a 1 año', '1 a 2 años'], orden: 0 },
          { texto: '¿Qué lo hace distinto?', tipo: TipoPregunta.TEXTO, puntuable: true, peso: 50, orden: 1 },
          { texto: '¿Qué necesita para crecer?', tipo: TipoPregunta.TEXTO, puntuable: false, peso: 0, orden: 2 },
        ],
      },
    },
  });

  await prisma.feria.create({
    data: {
      tenantId: tenant.id, nombre: 'Feria Navideña 2025',
      objetivo: 'Feria de fin de año con foco en regalos, gastronomía y artesanía.',
      estado: EstadoFeria.CERRADA, fecha: '13–22 Dic 2025', ubicacion: 'Plaza de Armas', cupos: 60,
      pesoProp: 40, pesoRep: 60, ventasReportadas: '$3.240.000', publicoEstimado: '~8.500',
      rubros: { create: [{ rubroId: rubros.GASTRONOMIA }, { rubroId: rubros.ARTESANIA }, { rubroId: rubros.TEXTIL }] },
    },
  });

  // ── POSTULACIONES a la feria en evaluación ──────────────────────────────
  const postSeed = [
    { emp: 'María Fuentes', sProp: 86 }, { emp: 'Pedro Salinas', sProp: 91 },
    { emp: 'Carolina Reyes', sProp: 78 }, { emp: 'Valentina Soto', sProp: 72 },
    { emp: 'Ana Maldonado', sProp: 64 }, { emp: 'Luis Carrasco', sProp: 58 },
  ];
  for (const p of postSeed) {
    await prisma.postulacion.create({
      data: { feriaId: expoVendimia.id, emprendedorId: emps[p.emp], scorePropuesta: p.sProp, estado: EstadoPostulacion.PENDIENTE },
    });
  }

  // ── EVALUADORES asignados a la feria (scope por evento) ─────────────────
  const evalFunc = await prisma.funcionario.findFirst({ where: { usuario: { id: evalUser.id } } });
  if (evalFunc) {
    await prisma.evaluadorFeria.create({ data: { feriaId: expoVendimia.id, funcionarioId: evalFunc.id } });
  }

  // ── CURSOS (capacitación) ───────────────────────────────────────────────
  const curso1 = await prisma.curso.create({
    data: {
      tenantId: tenant.id, nombre: 'Formalización y boleta electrónica', modalidad: ModalidadCurso.PRESENCIAL,
      cupos: 30, descripcion: 'Cómo formalizar tu emprendimiento e iniciar actividades.', rubroObjetivoId: null,
      sesiones: { create: [{ titulo: 'Sesión 1: Inicio de actividades', orden: 0 }, { titulo: 'Sesión 2: Boleta electrónica', orden: 1 }] },
    },
  });
  await prisma.curso.create({
    data: {
      tenantId: tenant.id, nombre: 'Marketing digital para ferias', modalidad: ModalidadCurso.ONLINE,
      cupos: 50, descripcion: 'Promociona tu stand y productos en redes sociales.', rubroObjetivoId: null,
    },
  });
  await prisma.inscripcion.create({ data: { cursoId: curso1.id, emprendedorId: emps['María Fuentes'] } });
  await prisma.inscripcion.create({ data: { cursoId: curso1.id, emprendedorId: emps['Valentina Soto'] } });

  // ── FONDOS (convocatorias, municipales y externas) ──────────────────────
  await prisma.fondo.create({
    data: {
      tenantId: tenant.id, nombre: 'Capital Semilla Municipal', organismo: 'Municipio Demo', origen: OrigenFondo.MUNICIPAL,
      estado: EstadoFondo.ABIERTA, descripcion: 'Apoyo a la compra de equipamiento para emprendedores locales.',
      montoMax: 1500000, fechaCierre: new Date('2026-08-30'),
      criteriosMatch: { rubros: ['GASTRONOMIA', 'ARTESANIA', 'TEXTIL', 'AGRICOLA', 'SERVICIOS', 'TECNOLOGIA'], etapa: ['menos_2_anios', 'consolidado'] },
      requisitos: [
        { clave: 'inicio_actividades', etiqueta: 'Inicio de actividades en SII', campoPerfil: 'documentos:Inicio actividades' },
        { clave: 'residencia', etiqueta: 'Residencia en la comuna', campoPerfil: 'localidad' },
        { clave: 'res_sanitaria', etiqueta: 'Resolución sanitaria (si aplica)', campoPerfil: 'documentos:Resolución sanitaria' },
        { clave: 'proyecto', etiqueta: 'Proyecto de inversión', campoPerfil: null },
      ],
      faq: [
        { pregunta: '¿Puedo postular si recién empiezo?', respuesta: 'Sí, este fondo está abierto a emprendimientos de menos de 2 años.' },
        { pregunta: '¿En qué puedo gastar el monto?', respuesta: 'En equipamiento y capital de trabajo asociado a tu proyecto.' },
      ],
    },
  });
  await prisma.fondo.create({
    data: {
      tenantId: tenant.id, nombre: 'Capital Abeja Emprende', organismo: 'SERCOTEC', origen: OrigenFondo.EXTERNO,
      estado: EstadoFondo.ABIERTA, descripcion: 'Financiamiento para emprendimientos liderados por mujeres.',
      montoMax: 3000000, fechaCierre: new Date('2026-07-15'),
      criteriosMatch: { rubros: ['GASTRONOMIA', 'ARTESANIA', 'TEXTIL', 'AGRICOLA', 'SERVICIOS'], etapa: ['idea', 'menos_2_anios', 'consolidado'], genero: ['F'] },
      requisitos: [
        { clave: 'genero', etiqueta: 'Emprendimiento liderado por mujer', campoPerfil: 'genero' },
        { clave: 'inicio_actividades', etiqueta: 'Inicio de actividades', campoPerfil: 'documentos:Inicio actividades' },
      ],
      faq: [{ pregunta: '¿Quiénes pueden postular?', respuesta: 'Mujeres mayores de 18 años con un emprendimiento en marcha o por iniciar.' }],
    },
  });

  console.log('Seed completado. Tenant: demo · Contraseña dev de todos los usuarios: ' + DEV_PASSWORD);
  console.log('Logins: admin@municipio.demo.cl · evaluador@municipio.demo.cl · jefatura@municipio.demo.cl');
  console.log('Emprendedores: maria.fuentes@example.cl (con historial) · roberto.diaz@example.cl (nuevo, rep 0)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

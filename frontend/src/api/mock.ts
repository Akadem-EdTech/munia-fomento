/* ============================================================================
 * Backend SIMULADO en el navegador — sólo para la demo estática de GitHub Pages.
 * Reproduce los endpoints reales contra datos semilla en memoria. NO persiste.
 * ========================================================================== */
import { ApiError } from './ApiError';

// ─── utilidades ──────────────────────────────────────────────────────────────
let SEQ = 1000;
const id = (p: string) => `${p}-${++SEQ}`;
const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n));
const delay = <T>(v: T): Promise<T> => new Promise((r) => setTimeout(() => r(v), 110));

// ─── modelo en memoria ───────────────────────────────────────────────────────
interface Usuario { id: string; tipo: 'EMPRENDEDOR' | 'FUNCIONARIO'; nombre: string; email: string; rut?: string; estado: 'ACTIVO' | 'INVITADO' | 'SUSPENDIDO'; rol?: 'ADMINISTRADOR' | 'EVALUADOR' | 'JEFATURA'; cargo?: string; modulos?: string[]; empId?: string; createdAt: string; ultimoAcceso?: string | null; }
interface Emp { id: string; usuarioId: string; nombreEmprendimiento: string; descripcion?: string | null; telefono?: string | null; localidad?: string | null; rubroCodigo?: string | null; etapa?: string | null; genero?: string | null; repScore: number; feriasCumplidas: number; feriasTotales: number; documentos: string[]; consentVersion?: string; consentFecha?: string; }
type Estado = 'PENDIENTE' | 'ADMITIDA' | 'RECHAZADA' | 'LISTA_ESPERA';

const RUBROS = [
  { id: 'r-gas', codigoMaestro: 'GASTRONOMIA', alias: 'Cocinería', color: '#F59E0B', orden: 0 },
  { id: 'r-art', codigoMaestro: 'ARTESANIA', alias: 'Artesanía', color: '#A78BFA', orden: 1 },
  { id: 'r-tex', codigoMaestro: 'TEXTIL', alias: 'Textil y Vestuario', color: '#EC4899', orden: 2 },
  { id: 'r-agr', codigoMaestro: 'AGRICOLA', alias: 'Agrícola', color: '#4ADE80', orden: 3 },
  { id: 'r-ser', codigoMaestro: 'SERVICIOS', alias: 'Servicios', color: '#2196F3', orden: 4 },
  { id: 'r-tec', codigoMaestro: 'TECNOLOGIA', alias: 'Tecnología', color: '#22D3EE', orden: 5 },
];
const aliasDe = (c?: string | null) => RUBROS.find((r) => r.codigoMaestro === c)?.alias ?? null;

const tenant = { slug: 'demo', nombre: 'Municipio Demo', logoUrl: null as string | null, colorAccent: null as string | null, dominioCorreo: 'municipio.demo.cl' as string | null, modulosActivos: ['FERIAS', 'CAPACITACION', 'FONDOS'], consentVersion: '1.0' };

const usuarios: Usuario[] = [];
const emps: Emp[] = [];
function nuevoFunc(nombre: string, email: string, cargo: string, rol: Usuario['rol'], modulos: string[]) {
  usuarios.push({ id: id('u'), tipo: 'FUNCIONARIO', nombre, email, estado: 'ACTIVO', rol, cargo, modulos, createdAt: '2026-02-01T12:00:00Z', ultimoAcceso: null });
}
function nuevoEmp(nombre: string, email: string, rut: string, emp: Omit<Emp, 'id' | 'usuarioId'>) {
  const uid = id('u'); const eid = id('e');
  usuarios.push({ id: uid, tipo: 'EMPRENDEDOR', nombre, email, rut, estado: 'ACTIVO', empId: eid, createdAt: '2026-02-01T12:00:00Z' });
  emps.push({ ...emp, id: eid, usuarioId: uid });
}
nuevoFunc('Daniela Rojas', 'admin@municipio.demo.cl', 'Encargada de Fomento Productivo', 'ADMINISTRADOR', ['FERIAS', 'CAPACITACION', 'FONDOS']);
nuevoFunc('Claudia Pérez', 'evaluador@municipio.demo.cl', 'Evaluadora en terreno', 'EVALUADOR', ['FERIAS']);
nuevoFunc('Marco Núñez', 'evaluador2@municipio.demo.cl', 'Evaluador en terreno', 'EVALUADOR', ['FERIAS']);
nuevoFunc('Sergio Mella', 'jefatura@municipio.demo.cl', 'Director DIDECO', 'JEFATURA', ['FERIAS', 'CAPACITACION', 'FONDOS']);
const base = { descripcion: '', telefono: null, consentVersion: '1.0', consentFecha: '2026-02-01T12:00:00Z' };
nuevoEmp('María Fuentes', 'maria.fuentes@example.cl', '12.456.789-0', { ...base, nombreEmprendimiento: 'Delicias del Valle', descripcion: 'Mermeladas y conservas artesanales de fruta.', localidad: 'Centro', rubroCodigo: 'GASTRONOMIA', etapa: 'consolidado', genero: null, repScore: 88, feriasCumplidas: 8, feriasTotales: 8, documentos: ['Resolución sanitaria', 'Inicio actividades'] });
nuevoEmp('Jorge Tapia', 'jorge.tapia@example.cl', '9.876.543-2', { ...base, nombreEmprendimiento: 'Cuero & Greda', descripcion: 'Marroquinería en cuero y cerámica utilitaria.', localidad: 'Sector Norte', rubroCodigo: 'ARTESANIA', etapa: 'consolidado', genero: null, repScore: 76, feriasCumplidas: 6, feriasTotales: 7, documentos: ['Inicio actividades'] });
nuevoEmp('Carolina Reyes', 'carolina.reyes@example.cl', '15.234.567-8', { ...base, nombreEmprendimiento: 'Hilos del Valle', descripcion: 'Tejidos a telar y vestuario en lana natural teñida.', localidad: 'Centro', rubroCodigo: 'TEXTIL', etapa: 'consolidado', genero: 'F', repScore: 91, feriasCumplidas: 9, feriasTotales: 9, documentos: ['Resolución sanitaria', 'Inicio actividades'] });
nuevoEmp('Pedro Salinas', 'pedro.salinas@example.cl', '11.345.678-9', { ...base, nombreEmprendimiento: 'Viña Pequeña', descripcion: 'Vino de pequeña producción y aceite de oliva.', localidad: 'Sector Rural', rubroCodigo: 'AGRICOLA', etapa: 'consolidado', genero: null, repScore: 82, feriasCumplidas: 7, feriasTotales: 8, documentos: ['Resolución sanitaria', 'Inicio actividades', 'Patente alcoholes'] });
nuevoEmp('Valentina Soto', 'valentina.soto@example.cl', '18.765.432-1', { ...base, nombreEmprendimiento: 'Huerto Vivo', descripcion: 'Hortalizas orgánicas y plantines.', localidad: 'Sector Costero', rubroCodigo: 'AGRICOLA', etapa: 'menos_2_anios', genero: 'F', repScore: 34, feriasCumplidas: 2, feriasTotales: 2, documentos: ['Inicio actividades'] });
nuevoEmp('Roberto Díaz', 'roberto.diaz@example.cl', '16.543.210-9', { ...base, nombreEmprendimiento: 'TechAgro Local', descripcion: 'Sensores de bajo costo para riego inteligente. Primer registro.', localidad: 'Centro', rubroCodigo: 'TECNOLOGIA', etapa: 'idea', genero: null, repScore: 0, feriasCumplidas: 0, feriasTotales: 0, documentos: ['Inicio actividades'] });
nuevoEmp('Ana Maldonado', 'ana.maldonado@example.cl', '13.678.901-2', { ...base, nombreEmprendimiento: 'Sabores del Mar', descripcion: 'Conservas de productos del mar.', localidad: 'Sector Costero', rubroCodigo: 'GASTRONOMIA', etapa: 'menos_2_anios', genero: 'F', repScore: 58, feriasCumplidas: 4, feriasTotales: 5, documentos: ['Resolución sanitaria'] });
nuevoEmp('Luis Carrasco', 'luis.carrasco@example.cl', '10.234.567-8', { ...base, nombreEmprendimiento: 'Madera Noble', descripcion: 'Muebles y objetos en madera nativa recuperada.', localidad: 'Sector Poniente', rubroCodigo: 'ARTESANIA', etapa: 'consolidado', genero: null, repScore: 69, feriasCumplidas: 5, feriasTotales: 6, documentos: ['Inicio actividades'] });

const empByName = (n: string) => emps.find((e) => e.nombreEmprendimiento === n)!;
const usuarioDeEmp = (eid: string) => usuarios.find((u) => u.empId === eid)!;

interface Pregunta { id: string; texto: string; tipo: string; puntuable: boolean; peso: number; opciones: string[]; orden: number; }
interface Feria { id: string; nombre: string; objetivo: string; estado: string; fecha: string | null; ubicacion: string | null; cupos: number; pesoProp: number; pesoRep: number; ventasReportadas?: string | null; publicoEstimado?: string | null; rubros: string[]; preguntas: Pregunta[]; evaluadores: string[]; }
const preg = (texto: string, tipo: string, puntuable: boolean, peso: number, opciones: string[] = []): Pregunta => ({ id: id('q'), texto, tipo, puntuable, peso, opciones, orden: 0 });
const ferias: Feria[] = [
  { id: 'f-expo', nombre: 'Expo Productores 2026', objetivo: 'Vitrina de productores de vino, aceite y gastronomía local para la temporada.', estado: 'EN_EVALUACION', fecha: '14–15 Mar 2026', ubicacion: 'Plaza de Armas', cupos: 40, pesoProp: 55, pesoRep: 45, rubros: ['AGRICOLA', 'GASTRONOMIA', 'ARTESANIA'], evaluadores: [usuarios.find((u) => u.email === 'evaluador@municipio.demo.cl')!.id], preguntas: [preg('¿Cuenta con resolución sanitaria vigente?', 'SINO', true, 30), preg('Describa su producto estrella para esta feria', 'TEXTO', true, 25), preg('¿Producción propia o reventa?', 'SELECCION', true, 20, ['Producción propia', 'Reventa']), preg('Adjunte fotos del producto', 'ADJUNTO', false, 0)] },
  { id: 'f-talentos', nombre: 'Feria Nuevos Talentos', objetivo: 'Espacio para emprendedores emergentes con menos de 2 años. Prioriza propuesta sobre trayectoria.', estado: 'ABIERTA', fecha: '20 Abr 2026', ubicacion: 'Centro Cultural Municipal', cupos: 25, pesoProp: 80, pesoRep: 20, rubros: ['TECNOLOGIA', 'SERVICIOS', 'TEXTIL', 'ARTESANIA'], evaluadores: [], preguntas: [preg('¿Hace cuánto partió su emprendimiento?', 'SELECCION', true, 20, ['Menos de 6 meses', '6 meses a 1 año', '1 a 2 años']), preg('¿Qué lo hace distinto?', 'TEXTO', true, 50), preg('¿Qué necesita para crecer?', 'TEXTO', false, 0)] },
  { id: 'f-navidad', nombre: 'Feria Navideña 2025', objetivo: 'Feria de fin de año con foco en regalos, gastronomía y artesanía.', estado: 'CERRADA', fecha: '13–22 Dic 2025', ubicacion: 'Plaza de Armas', cupos: 60, pesoProp: 40, pesoRep: 60, ventasReportadas: '$3.240.000', publicoEstimado: '~8.500', rubros: ['GASTRONOMIA', 'ARTESANIA', 'TEXTIL'], evaluadores: [], preguntas: [] },
];
const feriaById = (fid: string) => ferias.find((f) => f.id === fid);

interface Post { id: string; feriaId: string; empId: string; scorePropuesta: number; estado: Estado; motivoEstado?: string | null; createdAt: string; respuestas: { preguntaId: string; valor?: string | null; archivoId?: string | null }[]; }
const postulaciones: Post[] = [
  { emp: 'Delicias del Valle', s: 86 }, { emp: 'Viña Pequeña', s: 91 }, { emp: 'Hilos del Valle', s: 78 },
  { emp: 'Huerto Vivo', s: 72 }, { emp: 'Sabores del Mar', s: 64 }, { emp: 'Madera Noble', s: 58 },
].map((p) => ({ id: id('p'), feriaId: 'f-expo', empId: empByName(p.emp).id, scorePropuesta: p.s, estado: 'PENDIENTE' as Estado, motivoEstado: null, createdAt: '2026-02-05T12:00:00Z', respuestas: [] }));

interface Eval { feriaId: string; empId: string; cumplimiento: Record<string, boolean>; calidadEstrellas: number | null; completada: boolean; }
const evaluaciones: Eval[] = [];
const reportes: { feriaId: string; empId: string; participo: boolean; ventasReportadas?: number | null; comentario?: string }[] = [];

interface Curso { id: string; nombre: string; descripcion?: string | null; modalidad: string; cupos: number; rubroCodigo?: string | null; sesiones: { id: string; titulo: string; orden: number }[]; }
const cursos: Curso[] = [
  { id: 'c-form', nombre: 'Formalización y boleta electrónica', descripcion: 'Cómo formalizar tu emprendimiento e iniciar actividades.', modalidad: 'PRESENCIAL', cupos: 30, sesiones: [{ id: 's1', titulo: 'Sesión 1: Inicio de actividades', orden: 0 }, { id: 's2', titulo: 'Sesión 2: Boleta electrónica', orden: 1 }] },
  { id: 'c-mkt', nombre: 'Marketing digital para ferias', descripcion: 'Promociona tu stand y productos en redes sociales.', modalidad: 'ONLINE', cupos: 50, sesiones: [] },
];
interface Insc { id: string; cursoId: string; empId: string; estado: string; }
const inscripciones: Insc[] = [
  { id: id('i'), cursoId: 'c-form', empId: empByName('Delicias del Valle').id, estado: 'INSCRITO' },
  { id: id('i'), cursoId: 'c-form', empId: empByName('Huerto Vivo').id, estado: 'INSCRITO' },
];
const asistencias: { sesionId: string; empId: string; presente: boolean }[] = [];
const certificados: { id: string; cursoId: string; empId: string; emitidoAt: string }[] = [];

interface Fondo { id: string; nombre: string; organismo: string; origen: string; estado: string; descripcion: string; montoMax: number | null; moneda: string; fechaCierre: string | null; criteriosMatch: { rubros?: string[]; etapa?: string[]; genero?: string[] }; requisitos: { clave: string; etiqueta: string; campoPerfil: string | null }[]; faq: { pregunta: string; respuesta: string }[]; }
const fondos: Fondo[] = [
  { id: 'fo-semilla', nombre: 'Capital Semilla Municipal', organismo: 'Municipio Demo', origen: 'MUNICIPAL', estado: 'ABIERTA', descripcion: 'Apoyo a la compra de equipamiento para emprendedores locales.', montoMax: 1500000, moneda: 'CLP', fechaCierre: '2026-10-30', criteriosMatch: { rubros: ['GASTRONOMIA', 'ARTESANIA', 'TEXTIL', 'AGRICOLA', 'SERVICIOS', 'TECNOLOGIA'], etapa: ['menos_2_anios', 'consolidado'] }, requisitos: [{ clave: 'inicio_actividades', etiqueta: 'Inicio de actividades en SII', campoPerfil: 'documentos:Inicio actividades' }, { clave: 'residencia', etiqueta: 'Residencia en la comuna', campoPerfil: 'localidad' }, { clave: 'res_sanitaria', etiqueta: 'Resolución sanitaria (si aplica)', campoPerfil: 'documentos:Resolución sanitaria' }, { clave: 'proyecto', etiqueta: 'Proyecto de inversión', campoPerfil: null }], faq: [{ pregunta: '¿Puedo postular si recién empiezo?', respuesta: 'Sí, este fondo está abierto a emprendimientos de menos de 2 años.' }, { pregunta: '¿En qué puedo gastar el monto?', respuesta: 'En equipamiento y capital de trabajo asociado a tu proyecto.' }] },
  { id: 'fo-abeja', nombre: 'Capital Abeja Emprende', organismo: 'SERCOTEC', origen: 'EXTERNO', estado: 'ABIERTA', descripcion: 'Financiamiento para emprendimientos liderados por mujeres.', montoMax: 3000000, moneda: 'CLP', fechaCierre: '2026-09-15', criteriosMatch: { rubros: ['GASTRONOMIA', 'ARTESANIA', 'TEXTIL', 'AGRICOLA', 'SERVICIOS'], etapa: ['idea', 'menos_2_anios', 'consolidado'], genero: ['F'] }, requisitos: [{ clave: 'genero', etiqueta: 'Emprendimiento liderado por mujer', campoPerfil: 'genero' }, { clave: 'inicio_actividades', etiqueta: 'Inicio de actividades', campoPerfil: 'documentos:Inicio actividades' }], faq: [{ pregunta: '¿Quiénes pueden postular?', respuesta: 'Mujeres mayores de 18 años con un emprendimiento en marcha o por iniciar.' }] },
];
const fondoById = (fid: string) => fondos.find((f) => f.id === fid);
interface PostFondo { id: string; fondoId: string; empId: string; estado: string; proyecto?: string | null; montoSolicitado?: number | null; motivoEstado?: string | null; createdAt: string; }
const postulacionesFondo: PostFondo[] = [];

const VARIABLES_POR_EVENTO: Record<string, string[]> = { POSTULACION_RECIBIDA: ['nombre', 'feria'], EMPRENDEDOR_ADMITIDO: ['nombre', 'feria', 'fecha', 'ubicacion'], EMPRENDEDOR_RECHAZADO: ['nombre', 'feria'], EMPRENDEDOR_LISTA_ESPERA: ['nombre', 'feria'], FERIA_RECORDATORIO_48H: ['nombre', 'feria', 'fecha', 'ubicacion'], SOLICITUD_AUTOREPORTE: ['nombre', 'feria'], INSCRIPCION_CURSO_CONFIRMADA: ['nombre', 'curso', 'fecha'], CONVOCATORIA_ABIERTA: ['nombre', 'fondo', 'fecha'], FONDO_ADJUDICADO: ['nombre', 'fondo'], FUNCIONARIO_INVITADO: ['nombre', 'cargo', 'enlace'] };
const plantillas = [
  { evento: 'POSTULACION_RECIBIDA', asunto: 'Recibimos tu postulación a {feria}', cuerpo: 'Hola {nombre}, recibimos tu postulación a {feria}. Te avisaremos cuando se publiquen los resultados.' },
  { evento: 'EMPRENDEDOR_ADMITIDO', asunto: '¡Fuiste admitido en {feria}!', cuerpo: 'Hola {nombre}, ¡felicitaciones! Fuiste admitido en {feria} ({fecha}, {ubicacion}).' },
  { evento: 'EMPRENDEDOR_RECHAZADO', asunto: 'Resultado de tu postulación a {feria}', cuerpo: 'Hola {nombre}, en esta ocasión tu postulación a {feria} no fue seleccionada.' },
  { evento: 'EMPRENDEDOR_LISTA_ESPERA', asunto: 'Quedaste en lista de espera para {feria}', cuerpo: 'Hola {nombre}, quedaste en lista de espera para {feria}.' },
  { evento: 'FERIA_RECORDATORIO_48H', asunto: 'Recordatorio: {feria} en 48 horas', cuerpo: 'Hola {nombre}, te recordamos que {feria} se realiza el {fecha} en {ubicacion}.' },
  { evento: 'SOLICITUD_AUTOREPORTE', asunto: '¿Cómo te fue en {feria}?', cuerpo: 'Hola {nombre}, cuéntanos cómo te fue en {feria}.' },
  { evento: 'INSCRIPCION_CURSO_CONFIRMADA', asunto: 'Inscripción confirmada: {curso}', cuerpo: 'Hola {nombre}, tu inscripción al curso {curso} fue confirmada ({fecha}).' },
  { evento: 'CONVOCATORIA_ABIERTA', asunto: 'Nueva convocatoria: {fondo}', cuerpo: 'Hola {nombre}, se abrió una convocatoria que podría interesarte: {fondo}. Cierra el {fecha}.' },
  { evento: 'FONDO_ADJUDICADO', asunto: '¡Te adjudicaste {fondo}!', cuerpo: 'Hola {nombre}, ¡felicitaciones! Se te adjudicó el fondo {fondo}.' },
  { evento: 'FUNCIONARIO_INVITADO', asunto: 'Activa tu cuenta en MunIA Fomento', cuerpo: 'Hola {nombre}, fuiste dado de alta como {cargo}. Activa tu cuenta en {enlace}.' },
].map((p) => ({ id: id('pl'), canal: 'EMAIL', activa: true, ...p }));

interface Notif { id: string; usuarioId: string; evento: string; titulo: string; cuerpo: string; leida: boolean; createdAt: string; }
const notificaciones: Notif[] = [];
const solicitudesArco: { id: string; empId: string; tipo: string; estado: string; detalle?: string | null; createdAt: string; resueltaAt: string | null }[] = [];

// ─── lógica de dominio (portada, compacta) ───────────────────────────────────
const render = (t: string, v: Record<string, unknown>) => t.replace(/\{(\w+)\}/g, (lit, k) => (v[k] == null ? lit : String(v[k])));
function notificar(usuarioId: string, evento: string, vars: Record<string, unknown>) {
  const pl = plantillas.find((p) => p.evento === evento);
  const u = usuarios.find((x) => x.id === usuarioId);
  const v = { nombre: u?.nombre, ...vars };
  notificaciones.unshift({ id: id('n'), usuarioId, evento, titulo: render(pl?.asunto ?? 'Novedad', v), cuerpo: render(pl?.cuerpo ?? '', v), leida: false, createdAt: new Date().toISOString() });
}
function desglose(sProp: number, rep: number, pp: number, pr: number) {
  const suma = pp + pr || 1; const ap = (clamp(sProp) * pp) / suma; const ar = (clamp(rep) * pr) / suma;
  return { aportePropuesta: Math.round(ap), aporteReputacion: Math.round(ar), total: Math.round(ap + ar) };
}
function calidadResp(tipo: string, valor: string | null | undefined, opciones: string[]) {
  const v = (valor ?? '').trim();
  if (tipo === 'SINO') return /^s[ií]$|^true$|^1$/i.test(v) ? 1 : 0;
  if (tipo === 'TEXTO') return v.length === 0 ? 0 : v.length >= 20 ? 1 : 0.5;
  if (tipo === 'SELECCION') { if (!v || !opciones.length) return v ? 1 : 0; const i = opciones.indexOf(v); return i < 0 ? 0 : opciones.length === 1 ? 1 : 1 - i / (opciones.length - 1); }
  if (tipo === 'NUMERO') return v && !isNaN(Number(v)) ? 1 : 0;
  return v ? 1 : 0;
}
function scorePropuesta(preguntas: Pregunta[], respuestas: { preguntaId: string; valor?: string | null }[]) {
  const punt = preguntas.filter((p) => p.puntuable && p.peso > 0); if (!punt.length) return 50;
  const m = new Map(respuestas.map((r) => [r.preguntaId, r.valor])); const total = punt.reduce((s, p) => s + p.peso, 0);
  const ap = punt.reduce((s, p) => s + p.peso * calidadResp(p.tipo, m.get(p.id), p.opciones), 0);
  return Math.round((ap / total) * 100);
}
function completitud(e: Emp) {
  const doc = (f: string) => e.documentos.some((d) => d.toLowerCase().includes(f));
  const items = [
    { key: 'nombre', label: 'Nombre del emprendimiento', hecho: !!e.nombreEmprendimiento, hint: 'Es cómo te verán en las ferias.' },
    { key: 'descripcion', label: 'Describe tu emprendimiento', hecho: !!e.descripcion && e.descripcion.trim().length >= 10, hint: 'Una buena descripción mejora tu postulación.' },
    { key: 'rubro', label: 'Selecciona tu rubro', hecho: !!e.rubroCodigo, hint: 'Te mostramos las ferias y fondos que calzan contigo.' },
    { key: 'localidad', label: 'Indica tu localidad', hecho: !!e.localidad, hint: 'Algunos fondos priorizan por sector.' },
    { key: 'telefono', label: 'Agrega un teléfono de contacto', hecho: !!e.telefono, hint: 'Para avisarte de cupos y resultados.' },
    { key: 'etapa', label: 'Indica la etapa de tu emprendimiento', hecho: !!e.etapa, hint: 'Hay fondos pensados para cada etapa.' },
    { key: 'inicio_actividades', label: 'Registra tu inicio de actividades', hecho: doc('inicio'), hint: 'Es requisito de la mayoría de los fondos.' },
    { key: 'res_sanitaria', label: 'Agrega tu resolución sanitaria', hecho: doc('sanitaria'), hint: 'Te habilita para postular a más ferias de alimentos.' },
  ];
  const completos = items.filter((i) => i.hecho).length;
  return { porcentaje: Math.round((completos / items.length) * 100), completos, total: items.length, items, siguiente: items.find((i) => !i.hecho) ?? null };
}
function compat(e: Emp, c: Fondo['criteriosMatch']): 'alta' | 'media' | 'no' {
  const rubros = c.rubros ?? []; const generos = c.genero ?? [];
  if (rubros.length && (!e.rubroCodigo || !rubros.includes(e.rubroCodigo))) return 'no';
  if (generos.length && (!e.genero || !generos.includes(e.genero))) return 'no';
  const etapas = c.etapa ?? []; return etapas.length === 0 || (!!e.etapa && etapas.includes(e.etapa)) ? 'alta' : 'media';
}
function requisitos(e: Emp, reqs: Fondo['requisitos']) {
  const items = reqs.map((r) => { const c = r.campoPerfil; let cumple: boolean | null = null; if (c?.startsWith('documentos:')) cumple = e.documentos.some((d) => d.toLowerCase().includes(c.split(':')[1].toLowerCase())); else if (c === 'localidad') cumple = !!e.localidad; else if (c === 'genero') cumple = !!e.genero; return { clave: r.clave, etiqueta: r.etiqueta, cumple }; });
  return { items, cumplidos: items.filter((i) => i.cumple === true).length, verificables: items.filter((i) => i.cumple !== null).length };
}
const VACIAS = new Set(['de', 'la', 'el', 'y', 'un', 'una', 'para', 'que', 'con', 'mi', 'me', 'necesito', 'tengo', 'quiero', 'comprar', 'los', 'las', 'en', 'a', 'es']);
function mejorFondo(consulta: string, e: Emp) {
  const tokens = consulta.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !VACIAS.has(w));
  const rank = fondos.filter((f) => f.estado === 'ABIERTA').map((f) => { if (compat(e, f.criteriosMatch) === 'no') return { f, score: 0 }; const texto = `${f.nombre} ${f.descripcion} ${f.organismo}`.toLowerCase(); const solape = tokens.filter((t) => texto.includes(t)).length; const bc = compat(e, f.criteriosMatch) === 'alta' ? 2 : 1; return { f, score: solape * 3 + bc }; }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
  return rank[0]?.f ?? null;
}
const diasRest = (f?: string | null) => (f ? Math.max(0, Math.ceil((new Date(f).getTime() - Date.now()) / 86400000)) : null);

// ─── sesión ──────────────────────────────────────────────────────────────────
let sesionUid: string | null = null;
function perfilActual(uid: string) {
  const u = usuarios.find((x) => x.id === uid); if (!u) return null;
  const e = u.empId ? emps.find((x) => x.id === u.empId) : null;
  return { id: u.id, nombre: u.nombre, email: u.email, tipo: u.tipo, estado: u.estado, funcionario: u.tipo === 'FUNCIONARIO' ? { rol: u.rol, cargo: u.cargo ?? null, modulos: u.modulos ?? [] } : null, emprendedor: e ? { id: e.id, nombreEmprendimiento: e.nombreEmprendimiento, repScore: e.repScore } : null, tenant: { slug: tenant.slug, nombre: tenant.nombre, logoUrl: tenant.logoUrl, colorAccent: tenant.colorAccent, modulosActivos: tenant.modulosActivos } };
}
function miEmp(): Emp { const u = usuarios.find((x) => x.id === sesionUid); if (!u?.empId) throw new ApiError(403, 'Sección sólo para emprendedores', 'forbidden'); return emps.find((e) => e.id === u.empId)!; }

// ─── router ──────────────────────────────────────────────────────────────────
export async function mockUpload<T>(_url: string, file: File): Promise<T> {
  return delay({ archivo: { id: id('arch'), nombre: file.name, mime: file.type, tamano: file.size } } as T);
}

export function mockRequest<T>(method: string, rawUrl: string, body?: unknown): Promise<T> {
  const [path, qs] = rawUrl.split('?');
  const q = new URLSearchParams(qs ?? '');
  const seg = path.replace(/^\/api\//, '').split('/');
  const b = (body ?? {}) as Record<string, unknown>;
  try {
    return delay(route(method, seg, q, b) as T);
  } catch (e) {
    if (e instanceof ApiError) return Promise.reject(e);
    return Promise.reject(new ApiError(500, 'Error en el mock', 'mock'));
  }
}

function route(method: string, s: string[], q: URLSearchParams, b: Record<string, unknown>): unknown {
  const p = s.join('/');

  // ── config / auth ──
  if (p === 'config') return { authStrategy: 'password', tenant: { nombre: tenant.nombre, logoUrl: tenant.logoUrl, colorAccent: tenant.colorAccent } };
  if (p === 'auth/me') return { usuario: sesionUid ? perfilActual(sesionUid) : null };
  if (p === 'auth/login' && method === 'POST') {
    const u = usuarios.find((x) => x.email === String(b.email).toLowerCase());
    if (!u || b.password !== 'demo1234') throw new ApiError(401, 'Correo o contraseña incorrectos', 'credenciales');
    if (u.estado === 'SUSPENDIDO') throw new ApiError(401, 'Tu cuenta está suspendida', 'suspendido');
    sesionUid = u.id; u.ultimoAcceso = new Date().toISOString();
    return { usuario: perfilActual(u.id) };
  }
  if (p === 'auth/logout' && method === 'POST') { sesionUid = null; return { ok: true }; }
  if (p === 'auth/registro' && method === 'POST') {
    if (usuarios.some((x) => x.email === String(b.email).toLowerCase())) throw new ApiError(409, 'Ya existe una cuenta con ese correo', 'duplicado');
    const eid = id('e'); const uid = id('u');
    usuarios.push({ id: uid, tipo: 'EMPRENDEDOR', nombre: String(b.nombre), email: String(b.email).toLowerCase(), rut: String(b.rut), estado: 'ACTIVO', empId: eid, createdAt: new Date().toISOString() });
    emps.push({ id: eid, usuarioId: uid, nombreEmprendimiento: String(b.nombreEmprendimiento), descripcion: '', telefono: (b.telefono as string) ?? null, localidad: null, rubroCodigo: (b.rubroId as string) ? RUBROS.find((r) => r.id === b.rubroId)?.codigoMaestro ?? null : null, etapa: null, genero: null, repScore: 0, feriasCumplidas: 0, feriasTotales: 0, documentos: [], consentVersion: '1.0', consentFecha: new Date().toISOString() });
    sesionUid = uid; return { usuario: perfilActual(uid) };
  }
  if (p === 'auth/activar' && method === 'POST') throw new ApiError(400, 'La activación de funcionarios no está disponible en la demo', 'demo');

  if (p === 'rubros') return { rubros: RUBROS.map((r) => ({ id: r.id, alias: r.alias, color: r.color, codigoMaestro: r.codigoMaestro })) };

  // ── notificaciones ──
  if (p === 'notificaciones' && method === 'GET') { const list = notificaciones.filter((n) => n.usuarioId === sesionUid).slice(0, 30); return { notificaciones: list, noLeidas: list.filter((n) => !n.leida).length }; }
  if (p === 'notificaciones/leer-todas' && method === 'POST') { notificaciones.forEach((n) => { if (n.usuarioId === sesionUid) n.leida = true; }); return { ok: true }; }
  if (s[0] === 'notificaciones' && s[2] === 'leer' && method === 'POST') { const n = notificaciones.find((x) => x.id === s[1]); if (n) n.leida = true; return { ok: true }; }

  // ── emprendedor ──
  if (p === 'emprendedor/inicio') {
    const e = miEmp(); const c = completitud(e); const esNovato = e.feriasTotales === 0;
    const abiertas = ferias.filter((f) => f.estado === 'ABIERTA').map((f) => ({ id: f.id, nombre: f.nombre, fecha: f.fecha, ubicacion: f.ubicacion, pesoProp: f.pesoProp, pesoRep: f.pesoRep }));
    const adminCerr = postulaciones.filter((x) => x.empId === e.id && x.estado === 'ADMITIDA' && feriaById(x.feriaId)?.estado === 'CERRADA');
    const conRep = new Set(reportes.filter((r) => r.empId === e.id).map((r) => r.feriaId));
    const pend = adminCerr.filter((x) => !conRep.has(x.feriaId)).map((x) => ({ id: x.feriaId, nombre: feriaById(x.feriaId)!.nombre }));
    return { emprendedor: { nombre: e.nombreEmprendimiento, repScore: e.repScore, feriasCumplidas: e.feriasCumplidas, feriasTotales: e.feriasTotales, esNovato, estadoTexto: esNovato ? 'Emprendedor nuevo · sin historial aún' : `Reputación ${e.repScore} · cumplió ${e.feriasCumplidas} de ${e.feriasTotales} ferias` }, completitud: c, feriasAbiertas: abiertas, reportesPendientes: pend };
  }
  if (p === 'emprendedor/perfil' && method === 'GET') { const e = miEmp(); const u = usuarioDeEmp(e.id); return { perfil: perfilEmp(e, u), completitud: completitud(e) }; }
  if (p === 'emprendedor/perfil' && method === 'PATCH') {
    const e = miEmp();
    if (b.nombreEmprendimiento !== undefined) e.nombreEmprendimiento = String(b.nombreEmprendimiento);
    if (b.descripcion !== undefined) e.descripcion = String(b.descripcion);
    if (b.telefono !== undefined) e.telefono = (b.telefono as string) || null;
    if (b.localidad !== undefined) e.localidad = (b.localidad as string) || null;
    if (b.rubroId !== undefined) e.rubroCodigo = b.rubroId ? RUBROS.find((r) => r.id === b.rubroId)?.codigoMaestro ?? null : null;
    if (b.etapa !== undefined) e.etapa = (b.etapa as string) || null;
    if (b.documentos !== undefined) e.documentos = b.documentos as string[];
    return { perfil: perfilEmp(e, usuarioDeEmp(e.id)), completitud: completitud(e) };
  }
  if (p === 'emprendedor/exportar') { const e = miEmp(); return { generadoEl: new Date().toISOString(), perfil: perfilEmp(e, usuarioDeEmp(e.id)), postulaciones: postulaciones.filter((x) => x.empId === e.id), inscripciones: inscripciones.filter((x) => x.empId === e.id), certificados: certificados.filter((x) => x.empId === e.id), fondos: postulacionesFondo.filter((x) => x.empId === e.id), reportes: reportes.filter((x) => x.empId === e.id) }; }
  if (p === 'emprendedor/arco' && method === 'POST') { const e = miEmp(); const so = { id: id('arco'), empId: e.id, tipo: String(b.tipo), estado: 'PENDIENTE', detalle: (b.detalle as string) ?? null, createdAt: new Date().toISOString(), resueltaAt: null }; solicitudesArco.unshift(so); return { solicitud: so }; }
  if (p === 'emprendedor/arco' && method === 'GET') { const e = miEmp(); return { solicitudes: solicitudesArco.filter((x) => x.empId === e.id) }; }

  // ── ferias (emprendedor) ──
  if (p === 'ferias/abiertas') {
    const e = miEmp();
    return { ferias: ferias.filter((f) => f.estado === 'ABIERTA').map((f) => ({ id: f.id, nombre: f.nombre, objetivo: f.objetivo, fecha: f.fecha, ubicacion: f.ubicacion, cupos: f.cupos, criterio: f.pesoProp >= f.pesoRep ? 'Buena para mostrar algo nuevo' : 'Valora tu trayectoria', rubros: f.rubros.map(aliasDe), yaPostulada: postulaciones.find((x) => x.feriaId === f.id && x.empId === e.id)?.estado ?? null })) };
  }
  if (p === 'ferias/mis-postulaciones') { const e = miEmp(); return { postulaciones: postulaciones.filter((x) => x.empId === e.id).map((x) => { const f = feriaById(x.feriaId)!; return { id: x.id, feriaId: x.feriaId, estado: x.estado, scorePropuesta: x.scorePropuesta, createdAt: x.createdAt, feria: { nombre: f.nombre, fecha: f.fecha, ubicacion: f.ubicacion, estado: f.estado } }; }) }; }
  if (s[0] === 'ferias' && s.length === 2 && method === 'GET') {
    const e = miEmp(); const f = feriaById(s[1]); if (!f) throw new ApiError(404, 'Feria no encontrada');
    const mia = postulaciones.find((x) => x.feriaId === f.id && x.empId === e.id);
    return { feria: { id: f.id, nombre: f.nombre, objetivo: f.objetivo, fecha: f.fecha, ubicacion: f.ubicacion, estado: f.estado, criterio: f.pesoProp >= f.pesoRep ? 'Buena para mostrar algo nuevo' : 'Valora tu trayectoria', rubros: f.rubros.map(aliasDe), preguntas: f.preguntas.map((pq) => ({ id: pq.id, texto: pq.texto, tipo: pq.tipo, opciones: pq.opciones })), miPostulacion: mia ? { id: mia.id, estado: mia.estado } : null } };
  }
  if (s[0] === 'ferias' && s[2] === 'postular' && method === 'POST') {
    const e = miEmp(); const f = feriaById(s[1]); if (!f) throw new ApiError(404, 'Feria no encontrada');
    if (f.estado !== 'ABIERTA') throw new ApiError(400, 'Esta feria no está recibiendo postulaciones', 'feria_cerrada');
    if (postulaciones.some((x) => x.feriaId === f.id && x.empId === e.id)) throw new ApiError(409, 'Ya postulaste a esta feria', 'ya_postulada');
    const resp = (b.respuestas as { preguntaId: string; valor?: string; archivoId?: string }[]) ?? [];
    const sProp = scorePropuesta(f.preguntas, resp);
    const np: Post = { id: id('p'), feriaId: f.id, empId: e.id, scorePropuesta: sProp, estado: 'PENDIENTE', motivoEstado: null, createdAt: new Date().toISOString(), respuestas: resp };
    postulaciones.push(np); notificar(usuarioDeEmp(e.id).id, 'POSTULACION_RECIBIDA', { feria: f.nombre });
    return { postulacion: { id: np.id, estado: np.estado } };
  }
  if (s[0] === 'ferias' && s[2] === 'reportar' && method === 'POST') {
    const e = miEmp(); const f = feriaById(s[1])!; const existe = reportes.find((r) => r.feriaId === f.id && r.empId === e.id);
    const r = { feriaId: f.id, empId: e.id, participo: b.participo !== false, ventasReportadas: (b.ventasReportadas as number) ?? null, comentario: (b.comentario as string) ?? undefined };
    if (existe) Object.assign(existe, r); else reportes.push(r);
    return { reporte: r };
  }

  // ── ferias (gestión) ──
  if (p === 'gestion/ferias' && method === 'GET') return { ferias: ferias.map((f) => ({ id: f.id, nombre: f.nombre, estado: f.estado, fecha: f.fecha, ubicacion: f.ubicacion, cupos: f.cupos, pesoProp: f.pesoProp, pesoRep: f.pesoRep, postulados: postulaciones.filter((x) => x.feriaId === f.id).length, rubros: f.rubros.map(aliasDe) })) };
  if (p === 'gestion/ferias' && method === 'POST') {
    const nf: Feria = { id: id('f'), nombre: String(b.nombre), objetivo: (b.objetivo as string) ?? '', estado: 'ABIERTA', fecha: (b.fecha as string) ?? null, ubicacion: (b.ubicacion as string) ?? null, cupos: Number(b.cupos), pesoProp: Number(b.pesoProp), pesoRep: Number(b.pesoRep), rubros: ((b.rubroIds as string[]) ?? []).map((rid) => RUBROS.find((r) => r.id === rid)?.codigoMaestro ?? '').filter(Boolean), evaluadores: [], preguntas: ((b.preguntas as { texto: string; tipo: string; puntuable: boolean; peso: number; opciones: string[] }[]) ?? []).map((pq, i) => ({ id: id('q'), texto: pq.texto, tipo: pq.tipo, puntuable: pq.puntuable, peso: pq.peso, opciones: pq.opciones ?? [], orden: i })) };
    ferias.unshift(nf); return { id: nf.id };
  }
  if (s[0] === 'gestion' && s[1] === 'ferias' && s[3] === 'seleccion') {
    const f = feriaById(s[2])!; const pp = q.get('pesoProp') ? Number(q.get('pesoProp')) : f.pesoProp; const pr = q.get('pesoRep') ? Number(q.get('pesoRep')) : f.pesoRep;
    const rows = postulaciones.filter((x) => x.feriaId === f.id).map((x) => { const e = emps.find((y) => y.id === x.empId)!; const d = desglose(x.scorePropuesta, e.repScore, pp, pr); return { x, e, d }; }).sort((a, b2) => b2.d.total - a.d.total || b2.d.aportePropuesta - a.d.aportePropuesta);
    return { feria: { id: f.id, nombre: f.nombre, cupos: f.cupos, pesoProp: f.pesoProp, pesoRep: f.pesoRep, estado: f.estado }, perilla: { pesoProp: pp, pesoRep: pr }, ranking: rows.map((r, i) => ({ postulacionId: r.x.id, rank: i + 1, sugerido: i < f.cupos ? 'admitir' : 'lista_espera', estado: r.x.estado, total: r.d.total, aportePropuesta: r.d.aportePropuesta, aporteReputacion: r.d.aporteReputacion, scorePropuesta: r.x.scorePropuesta, emprendedor: { nombre: usuarioDeEmp(r.e.id).nombre, emprendimiento: r.e.nombreEmprendimiento, repScore: r.e.repScore, conf: `${r.e.feriasCumplidas}/${r.e.feriasTotales}`, rubro: aliasDe(r.e.rubroCodigo), esNovato: r.e.feriasTotales === 0 } })) };
  }
  if (s[0] === 'gestion' && s[1] === 'postulaciones' && s[3] === 'decidir' && method === 'POST') {
    const x = postulaciones.find((y) => y.id === s[2])!; x.estado = b.decision as Estado; x.motivoEstado = (b.motivo as string) ?? null;
    const f = feriaById(x.feriaId)!; const uid = usuarioDeEmp(x.empId).id;
    const ev = ({ ADMITIDA: 'EMPRENDEDOR_ADMITIDO', RECHAZADA: 'EMPRENDEDOR_RECHAZADO', LISTA_ESPERA: 'EMPRENDEDOR_LISTA_ESPERA' } as Record<string, string>)[x.estado];
    notificar(uid, ev, { feria: f.nombre, fecha: f.fecha ?? '', ubicacion: f.ubicacion ?? '' });
    return { ok: true };
  }
  if (p === 'gestion/emprendedores') {
    const qq = (q.get('q') ?? '').toLowerCase(); const ru = q.get('rubro');
    return { emprendedores: emps.filter((e) => (!ru || e.rubroCodigo === ru) && (!qq || e.nombreEmprendimiento.toLowerCase().includes(qq) || usuarioDeEmp(e.id).nombre.toLowerCase().includes(qq))).sort((a, b2) => b2.repScore - a.repScore).map((e) => ({ id: e.id, nombreEmprendimiento: e.nombreEmprendimiento, repScore: e.repScore, feriasCumplidas: e.feriasCumplidas, feriasTotales: e.feriasTotales, localidad: e.localidad, rubro: e.rubroCodigo ? { alias: aliasDe(e.rubroCodigo), codigoMaestro: e.rubroCodigo } : null, usuario: { nombre: usuarioDeEmp(e.id).nombre } })) };
  }
  if (s[0] === 'gestion' && s[1] === 'ferias' && s[3] === 'evaluacion') {
    const f = feriaById(s[2])!; const items = [{ k: 'asistio', txt: 'Asistió a la feria', sub: 'Se presentó el día del evento' }, { k: 'puntual', txt: 'Montó a tiempo', sub: 'Instaló su stand en el horario indicado' }, { k: 'normas', txt: 'Cumplió las normas del recinto', sub: 'Respetó espacio, ruido y reglamento' }, { k: 'desarmo', txt: 'Desarmó correctamente', sub: 'Dejó el espacio limpio al cierre' }];
    const adm = postulaciones.filter((x) => x.feriaId === f.id && x.estado === 'ADMITIDA');
    const lista = adm.map((x) => { const e = emps.find((y) => y.id === x.empId)!; const ev = evaluaciones.find((v) => v.feriaId === f.id && v.empId === e.id); const rep = reportes.find((r) => r.feriaId === f.id && r.empId === e.id); return { emprendedorId: e.id, nombre: usuarioDeEmp(e.id).nombre, emprendimiento: e.nombreEmprendimiento, cumplimiento: ev?.cumplimiento ?? {}, calidadEstrellas: ev?.calidadEstrellas ?? null, completada: ev?.completada ?? false, autoreporte: rep ? { participo: rep.participo, ventas: rep.ventasReportadas ?? null } : null }; });
    return { feria: { id: f.id, nombre: f.nombre, estado: f.estado }, items, lista, progreso: { evaluados: lista.filter((l) => l.completada).length, totales: lista.length } };
  }
  if (s[0] === 'gestion' && s[1] === 'evaluacion' && method === 'POST') {
    const [, , fid, eid] = s; let ev = evaluaciones.find((v) => v.feriaId === fid && v.empId === eid);
    if (!ev) { ev = { feriaId: fid, empId: eid, cumplimiento: {}, calidadEstrellas: null, completada: false }; evaluaciones.push(ev); }
    if (b.cumplimiento !== undefined) ev.cumplimiento = b.cumplimiento as Record<string, boolean>;
    if (b.calidadEstrellas !== undefined) ev.calidadEstrellas = b.calidadEstrellas as number;
    if (b.completada !== undefined) ev.completada = b.completada as boolean;
    return { ok: true, evaluacion: { cumplimiento: ev.cumplimiento, calidadEstrellas: ev.calidadEstrellas, completada: ev.completada } };
  }
  if (s[0] === 'gestion' && s[1] === 'ferias' && s[3] === 'cerrar' && method === 'POST') {
    const f = feriaById(s[2])!; if (f.estado === 'CERRADA') throw new ApiError(400, 'La feria ya está cerrada', 'ya_cerrada');
    let n = 0; evaluaciones.filter((v) => v.feriaId === f.id && v.completada).forEach((v) => { const e = emps.find((y) => y.id === v.empId); if (!e) return; const items = Object.values(v.cumplimiento); const ratio = items.length ? items.filter(Boolean).length / items.length : 0; let pj = ratio * 100; const rep = reportes.find((r) => r.feriaId === f.id && r.empId === e.id); if (rep && !rep.participo) pj *= 0.5; if (v.calidadEstrellas != null) pj += (v.calidadEstrellas - 3) * 5; pj = clamp(Math.round(pj)); const tot = e.feriasTotales + 1; e.repScore = clamp(Math.round((e.repScore * e.feriasTotales + pj) / tot)); e.feriasTotales = tot; if (items.length && items.every(Boolean)) e.feriasCumplidas += 1; n++; });
    f.estado = 'CERRADA'; return { ok: true, evaluados: n };
  }
  if (s[0] === 'gestion' && s[1] === 'postulaciones' && s[3] === 'desglose') { const x = postulaciones.find((y) => y.id === s[2])!; const e = emps.find((y) => y.id === x.empId)!; const f = feriaById(x.feriaId)!; return { desglose: desglose(x.scorePropuesta, e.repScore, f.pesoProp, f.pesoRep) }; }

  // ── dashboards ──
  if (p === 'gestion/dashboards/ferias') {
    const enCurso = ferias.find((f) => f.estado === 'EN_EVALUACION') ?? ferias.find((f) => f.estado === 'ABIERTA');
    let operativo = null; let terr = null;
    if (enCurso) {
      const ps = postulaciones.filter((x) => x.feriaId === enCurso.id); const adm = ps.filter((x) => x.estado === 'ADMITIDA');
      operativo = { feria: enCurso.nombre, postulados: ps.length, admitidos: adm.length, pendientes: ps.filter((x) => x.estado === 'PENDIENTE').length, listaEspera: ps.filter((x) => x.estado === 'LISTA_ESPERA').length, cupos: enCurso.cupos, cuposUsadosPct: enCurso.cupos ? Math.round((adm.length / enCurso.cupos) * 100) : 0 };
      const dist = new Map<string, number>(); adm.forEach((x) => { const k = aliasDe(emps.find((y) => y.id === x.empId)!.rubroCodigo) ?? 'Sin especificar'; dist.set(k, (dist.get(k) ?? 0) + 1); }); const t = adm.length || 1;
      terr = [...dist.entries()].map(([clave, total]) => ({ clave, total, pct: Math.round((total / t) * 100) })).sort((a, b2) => b2.total - a.total);
    }
    const cerr = ferias.filter((f) => f.estado === 'CERRADA');
    return { operativo, territorialRubro: terr, narrativo: { feriasRealizadas: cerr.length, emprendedoresParticipantes: emps.filter((e) => e.feriasTotales > 0).length, ventasReportadas: cerr.map((f) => f.ventasReportadas).filter(Boolean), publicoEstimado: cerr.map((f) => f.publicoEstimado).filter(Boolean) } };
  }

  // ── capacitación ──
  if (p === 'cursos/disponibles') { const e = miEmp(); return { cursos: cursos.map((c) => { const ins = inscripciones.filter((i) => i.cursoId === c.id && i.estado === 'INSCRITO').length; return { id: c.id, nombre: c.nombre, descripcion: c.descripcion, modalidad: c.modalidad, cupos: c.cupos, rubro: aliasDe(c.rubroCodigo), inscritos: ins, ocupacion: c.cupos ? Math.min(100, Math.round((ins / c.cupos) * 100)) : 0, miEstado: inscripciones.find((i) => i.cursoId === c.id && i.empId === e.id)?.estado ?? null }; }) }; }
  if (s[0] === 'cursos' && s[2] === 'inscribir' && method === 'POST') {
    const e = miEmp(); const c = cursos.find((x) => x.id === s[1])!; if (inscripciones.some((i) => i.cursoId === c.id && i.empId === e.id)) throw new ApiError(409, 'Ya estás inscrito en este curso', 'ya_inscrito');
    const ins = inscripciones.filter((i) => i.cursoId === c.id && i.estado === 'INSCRITO').length; const estado = ins < c.cupos ? 'INSCRITO' : 'LISTA_ESPERA';
    inscripciones.push({ id: id('i'), cursoId: c.id, empId: e.id, estado }); if (estado === 'INSCRITO') notificar(usuarioDeEmp(e.id).id, 'INSCRIPCION_CURSO_CONFIRMADA', { curso: c.nombre, fecha: 'por confirmar' });
    return { inscripcion: { estado } };
  }
  if (p === 'cursos/mis-inscripciones') { const e = miEmp(); return { inscripciones: inscripciones.filter((i) => i.empId === e.id).map((i) => { const c = cursos.find((x) => x.id === i.cursoId)!; return { id: i.id, estado: i.estado, curso: { nombre: c.nombre, modalidad: c.modalidad, fechaInicio: null } }; }) }; }
  if (p === 'cursos/mis-certificados') { const e = miEmp(); return { certificados: certificados.filter((x) => x.empId === e.id).map((x) => { const c = cursos.find((y) => y.id === x.cursoId)!; return { id: x.id, emitidoAt: x.emitidoAt, curso: { nombre: c.nombre, modalidad: c.modalidad } }; }) }; }
  if (p === 'gestion/cursos' && method === 'GET') return { cursos: cursos.map((c) => ({ id: c.id, nombre: c.nombre, modalidad: c.modalidad, cupos: c.cupos, rubro: aliasDe(c.rubroCodigo), inscritos: inscripciones.filter((i) => i.cursoId === c.id).length, certificados: certificados.filter((x) => x.cursoId === c.id).length, sesiones: c.sesiones.length })) };
  if (p === 'gestion/cursos' && method === 'POST') { const nc: Curso = { id: id('c'), nombre: String(b.nombre), descripcion: (b.descripcion as string) ?? null, modalidad: String(b.modalidad), cupos: Number(b.cupos), rubroCodigo: (b.rubroObjetivoId as string) ? RUBROS.find((r) => r.id === b.rubroObjetivoId)?.codigoMaestro ?? null : null, sesiones: ((b.sesiones as { titulo: string }[]) ?? []).map((x, i) => ({ id: id('s'), titulo: x.titulo, orden: i })) }; cursos.unshift(nc); return { id: nc.id }; }
  if (s[0] === 'gestion' && s[1] === 'cursos' && s[3] === 'inscritos') {
    const c = cursos.find((x) => x.id === s[2])!; const certSet = new Set(certificados.filter((x) => x.cursoId === c.id).map((x) => x.empId));
    const pres = new Map<string, number>(); asistencias.forEach((a) => { if (a.presente && c.sesiones.some((se) => se.id === a.sesionId)) pres.set(a.empId, (pres.get(a.empId) ?? 0) + 1); });
    return { curso: { id: c.id, nombre: c.nombre, sesiones: c.sesiones }, inscritos: inscripciones.filter((i) => i.cursoId === c.id).map((i) => ({ emprendedorId: i.empId, nombre: usuarioDeEmp(i.empId).nombre, emprendimiento: emps.find((e) => e.id === i.empId)!.nombreEmprendimiento, estado: i.estado, asistio: pres.get(i.empId) ?? 0, certificado: certSet.has(i.empId) })) };
  }
  if (s[0] === 'gestion' && s[1] === 'asistencia' && method === 'POST') { const [, , sid, eid] = s; let a = asistencias.find((x) => x.sesionId === sid && x.empId === eid); if (!a) { a = { sesionId: sid, empId: eid, presente: !!b.presente }; asistencias.push(a); } else a.presente = !!b.presente; return { ok: true }; }
  if (s[0] === 'gestion' && s[1] === 'cursos' && s[3] === 'certificar' && method === 'POST') { const cid = s[2]; const eid = s[4]; if (!certificados.some((x) => x.cursoId === cid && x.empId === eid)) certificados.push({ id: id('cert'), cursoId: cid, empId: eid, emitidoAt: new Date().toISOString() }); return { ok: true }; }
  if (p === 'gestion/dashboards/capacitacion') { const asis = asistencias; const pres = asis.filter((a) => a.presente).length; const dem = cursos.map((c) => ({ nombre: c.nombre, inscritos: inscripciones.filter((i) => i.cursoId === c.id && i.estado === 'INSCRITO').length, cupos: c.cupos })).sort((a, b2) => b2.inscritos - a.inscritos).slice(0, 5); return { cursosDictados: cursos.length, emprendedoresFormados: new Set(inscripciones.filter((i) => i.estado === 'INSCRITO').map((i) => i.empId)).size, certificadosEmitidos: certificados.length, tasaAsistencia: asis.length ? Math.round((pres / asis.length) * 100) : 0, masDemandados: dem }; }

  // ── fondos ──
  if (p === 'fondos/para-mi') { const e = miEmp(); return { fondos: fondos.filter((f) => f.estado === 'ABIERTA').map((f) => ({ f, c: compat(e, f.criteriosMatch) })).filter((x) => x.c !== 'no').sort((a, b2) => (a.c === 'alta' ? -1 : 1) - (b2.c === 'alta' ? -1 : 1)).map(({ f, c }) => ({ id: f.id, nombre: f.nombre, organismo: f.organismo, origen: f.origen, descripcion: f.descripcion, montoMax: f.montoMax, compatibilidad: c, diasRestantes: diasRest(f.fechaCierre) })) }; }
  if (p === 'fondos/asistente' && method === 'POST') { const e = miEmp(); const f = mejorFondo(String(b.consulta), e); if (!f) return { respuesta: 'No encontré un fondo que calce con eso y tu perfil. Prueba con otras palabras o revisa "Ver fondos para mí".', fondoSugerido: null }; const c = compat(e, f.criteriosMatch); const porque = c === 'alta' ? 'calza bien con tu rubro y etapa' : 'es elegible para tu rubro'; return { respuesta: `Para lo que necesitas, el fondo que mejor te calza es **${f.nombre}** (${f.organismo}): ${porque}. Aporta ${f.montoMax ? 'hasta $' + f.montoMax.toLocaleString('es-CL') : 'monto por confirmar'} y ${f.fechaCierre ? 'cierra el ' + new Date(f.fechaCierre).toLocaleDateString('es-CL') : 'con postulación abierta'}. ¿Quieres abrir su ficha para revisar los requisitos y postular?`, fondoSugerido: { id: f.id, nombre: f.nombre } }; }
  if (p === 'fondos/mis-postulaciones') { const e = miEmp(); return { postulaciones: postulacionesFondo.filter((x) => x.empId === e.id).map((x) => { const f = fondoById(x.fondoId)!; return { id: x.id, estado: x.estado, fondo: { nombre: f.nombre, organismo: f.organismo } }; }) }; }
  if (s[0] === 'fondos' && s.length === 2 && method === 'GET') { const e = miEmp(); const f = fondoById(s[1]); if (!f) throw new ApiError(404, 'Fondo no encontrado'); const rq = requisitos(e, f.requisitos); const mia = postulacionesFondo.find((x) => x.fondoId === f.id && x.empId === e.id); return { fondo: { id: f.id, nombre: f.nombre, organismo: f.organismo, origen: f.origen, descripcion: f.descripcion, montoMax: f.montoMax, moneda: f.moneda, diasRestantes: diasRest(f.fechaCierre), compatibilidad: compat(e, f.criteriosMatch), requisitos: rq.items, requisitosCumplidos: rq.cumplidos, requisitosVerificables: rq.verificables, faq: f.faq, miPostulacion: mia?.estado ?? null } }; }
  if (s[0] === 'fondos' && s[2] === 'postular' && method === 'POST') { const e = miEmp(); const f = fondoById(s[1])!; if (postulacionesFondo.some((x) => x.fondoId === f.id && x.empId === e.id)) throw new ApiError(409, 'Ya postulaste a este fondo', 'ya_postulada'); const np: PostFondo = { id: id('pf'), fondoId: f.id, empId: e.id, estado: 'POSTULADA', proyecto: (b.proyecto as string) ?? null, montoSolicitado: (b.montoSolicitado as number) ?? null, motivoEstado: null, createdAt: new Date().toISOString() }; postulacionesFondo.unshift(np); return { postulacion: { id: np.id, estado: np.estado } }; }
  if (p === 'gestion/fondos' && method === 'GET') return { fondos: fondos.map((f) => ({ id: f.id, nombre: f.nombre, organismo: f.organismo, origen: f.origen, estado: f.estado, montoMax: f.montoMax, fechaCierre: f.fechaCierre, postulaciones: postulacionesFondo.filter((x) => x.fondoId === f.id).length })) };
  if (p === 'gestion/fondos' && method === 'POST') { const nf: Fondo = { id: id('fo'), nombre: String(b.nombre), organismo: String(b.organismo), origen: String(b.origen ?? 'MUNICIPAL'), estado: 'ABIERTA', descripcion: (b.descripcion as string) ?? '', montoMax: (b.montoMax as number) ?? null, moneda: 'CLP', fechaCierre: (b.fechaCierre as string) ?? null, criteriosMatch: (b.criteriosMatch as Fondo['criteriosMatch']) ?? {}, requisitos: (b.requisitos as Fondo['requisitos']) ?? [], faq: [] }; fondos.unshift(nf); const rubros = nf.criteriosMatch.rubros ?? []; const dest = emps.filter((e) => !rubros.length || (e.rubroCodigo && rubros.includes(e.rubroCodigo))); dest.forEach((e) => notificar(usuarioDeEmp(e.id).id, 'CONVOCATORIA_ABIERTA', { fondo: nf.nombre, fecha: nf.fechaCierre ? new Date(nf.fechaCierre).toLocaleDateString('es-CL') : 'por confirmar' })); return { id: nf.id, notificados: dest.length }; }
  if (s[0] === 'gestion' && s[1] === 'fondos' && s[3] === 'postulaciones') { const f = fondoById(s[2])!; return { fondo: { id: f.id, nombre: f.nombre, estado: f.estado }, postulaciones: postulacionesFondo.filter((x) => x.fondoId === f.id).map((x) => { const e = emps.find((y) => y.id === x.empId)!; return { id: x.id, estado: x.estado, proyecto: x.proyecto, montoSolicitado: x.montoSolicitado, emprendedor: { nombre: usuarioDeEmp(e.id).nombre, emprendimiento: e.nombreEmprendimiento, rubro: aliasDe(e.rubroCodigo), repScore: e.repScore, esNovato: e.feriasTotales === 0, ferias: `${e.feriasCumplidas}/${e.feriasTotales}`, certificados: certificados.filter((c) => c.empId === e.id).length, cursos: inscripciones.filter((i) => i.empId === e.id).length } }; }) }; }
  if (s[0] === 'gestion' && s[1] === 'postulaciones-fondo' && s[3] === 'decidir' && method === 'POST') { const x = postulacionesFondo.find((y) => y.id === s[2])!; x.estado = String(b.decision); x.motivoEstado = (b.motivo as string) ?? null; const f = fondoById(x.fondoId)!; if (x.estado === 'ADJUDICADA') notificar(usuarioDeEmp(x.empId).id, 'FONDO_ADJUDICADO', { fondo: f.nombre }); return { ok: true }; }
  if (p === 'gestion/dashboards/fondos') { const adj = postulacionesFondo.filter((x) => x.estado === 'ADJUDICADA'); const dist = new Map<string, number>(); adj.forEach((x) => { const k = aliasDe(emps.find((e) => e.id === x.empId)!.rubroCodigo) ?? 'Sin rubro'; dist.set(k, (dist.get(k) ?? 0) + 1); }); return { fondosEntregados: adj.length, emprendedoresApoyados: new Set(adj.map((x) => x.empId)).size, postulaciones: postulacionesFondo.length, distribucionRubro: [...dist.entries()].map(([clave, total]) => ({ clave, total })).sort((a, b2) => b2.total - a.total) }; }

  // ── usuarios (admin) ──
  if (p === 'usuarios' && method === 'GET') return { funcionarios: usuarios.filter((u) => u.tipo === 'FUNCIONARIO').map((u) => ({ id: u.id, nombre: u.nombre, email: u.email, estado: u.estado, createdAt: u.createdAt, ultimoAcceso: u.ultimoAcceso ?? null, funcionario: { cargo: u.cargo ?? null, rol: u.rol, modulos: u.modulos ?? [] } })) };
  if (p === 'usuarios/invitar' && method === 'POST') { const nu: Usuario = { id: id('u'), tipo: 'FUNCIONARIO', nombre: String(b.nombre), email: String(b.email).toLowerCase(), estado: 'INVITADO', rol: b.rol as Usuario['rol'], cargo: (b.cargo as string) ?? undefined, modulos: (b.modulos as string[]) ?? [], createdAt: new Date().toISOString(), ultimoAcceso: null }; usuarios.push(nu); return { id: nu.id, estado: nu.estado }; }
  if (s[0] === 'usuarios' && s[2] === 'suspender' && method === 'POST') { const u = usuarios.find((x) => x.id === s[1]); if (u) u.estado = 'SUSPENDIDO'; return { ok: true }; }
  if (s[0] === 'usuarios' && s[2] === 'reactivar' && method === 'POST') { const u = usuarios.find((x) => x.id === s[1]); if (u) u.estado = 'ACTIVO'; return { ok: true }; }
  if (s[0] === 'usuarios' && s.length === 2 && method === 'PATCH') { const u = usuarios.find((x) => x.id === s[1]); if (u) { if (b.cargo !== undefined) u.cargo = b.cargo as string; if (b.rol !== undefined) u.rol = b.rol as Usuario['rol']; if (b.modulos !== undefined) u.modulos = b.modulos as string[]; } return { ok: true }; }

  // ── plantillas ──
  if (p === 'gestion/plantillas' && method === 'GET') return { plantillas: plantillas.map((pl) => ({ ...pl, variables: VARIABLES_POR_EVENTO[pl.evento] ?? [] })) };
  if (s[0] === 'gestion' && s[1] === 'plantillas' && method === 'PATCH') { const pl = plantillas.find((x) => x.id === s[2]); if (pl) { if (b.asunto !== undefined) pl.asunto = b.asunto as string; if (b.cuerpo !== undefined) pl.cuerpo = b.cuerpo as string; if (b.activa !== undefined) pl.activa = b.activa as boolean; } return { plantilla: pl }; }

  // ── tenant ──
  if (p === 'gestion/tenant' && method === 'GET') return { tenant: { slug: tenant.slug, nombre: tenant.nombre, logoUrl: tenant.logoUrl, colorAccent: tenant.colorAccent, dominioCorreo: tenant.dominioCorreo, modulosActivos: tenant.modulosActivos, consentVersion: tenant.consentVersion } };
  if (p === 'gestion/tenant' && method === 'PATCH') { if (b.nombre !== undefined) tenant.nombre = b.nombre as string; if (b.logoUrl !== undefined) tenant.logoUrl = b.logoUrl as string | null; if (b.colorAccent !== undefined) tenant.colorAccent = b.colorAccent as string | null; if (b.dominioCorreo !== undefined) tenant.dominioCorreo = b.dominioCorreo as string | null; if (b.modulosActivos !== undefined) tenant.modulosActivos = b.modulosActivos as string[]; return { tenant: { slug: tenant.slug, nombre: tenant.nombre, logoUrl: tenant.logoUrl, colorAccent: tenant.colorAccent, dominioCorreo: tenant.dominioCorreo, modulosActivos: tenant.modulosActivos } }; }

  throw new ApiError(404, `Ruta no simulada: ${method} /${s.join('/')}`, 'no_mock');
}

function perfilEmp(e: Emp, u: Usuario) {
  return { id: e.id, nombreEmprendimiento: e.nombreEmprendimiento, descripcion: e.descripcion ?? null, telefono: e.telefono ?? null, localidad: e.localidad ?? null, rubroId: RUBROS.find((r) => r.codigoMaestro === e.rubroCodigo)?.id ?? null, etapa: e.etapa ?? null, repScore: e.repScore, feriasCumplidas: e.feriasCumplidas, feriasTotales: e.feriasTotales, documentos: e.documentos, consentVersion: e.consentVersion ?? null, consentFecha: e.consentFecha ?? null, rubro: e.rubroCodigo ? { id: RUBROS.find((r) => r.codigoMaestro === e.rubroCodigo)!.id, alias: aliasDe(e.rubroCodigo) } : null, usuario: { nombre: u.nombre, email: u.email, rut: u.rut ?? null }, tenant: { consentVersion: tenant.consentVersion } };
}

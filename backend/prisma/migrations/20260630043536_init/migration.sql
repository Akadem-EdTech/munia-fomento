-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('EMPRENDEDOR', 'FUNCIONARIO');

-- CreateEnum
CREATE TYPE "RolFuncionario" AS ENUM ('ADMINISTRADOR', 'EVALUADOR', 'JEFATURA');

-- CreateEnum
CREATE TYPE "Modulo" AS ENUM ('FERIAS', 'CAPACITACION', 'FONDOS');

-- CreateEnum
CREATE TYPE "EstadoUsuario" AS ENUM ('ACTIVO', 'INVITADO', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "AuthStrategy" AS ENUM ('CLAVE_UNICA', 'PASSWORD');

-- CreateEnum
CREATE TYPE "EstadoFeria" AS ENUM ('BORRADOR', 'ABIERTA', 'EN_EVALUACION', 'CERRADA');

-- CreateEnum
CREATE TYPE "TipoPregunta" AS ENUM ('TEXTO', 'SELECCION', 'NUMERO', 'SINO', 'ADJUNTO');

-- CreateEnum
CREATE TYPE "EstadoPostulacion" AS ENUM ('PENDIENTE', 'ADMITIDA', 'RECHAZADA', 'LISTA_ESPERA');

-- CreateEnum
CREATE TYPE "ModalidadCurso" AS ENUM ('PRESENCIAL', 'ONLINE');

-- CreateEnum
CREATE TYPE "EstadoInscripcion" AS ENUM ('INSCRITO', 'LISTA_ESPERA', 'RETIRADO');

-- CreateEnum
CREATE TYPE "OrigenFondo" AS ENUM ('MUNICIPAL', 'EXTERNO');

-- CreateEnum
CREATE TYPE "EstadoFondo" AS ENUM ('BORRADOR', 'ABIERTA', 'CERRADA');

-- CreateEnum
CREATE TYPE "EstadoPostulacionFondo" AS ENUM ('POSTULADA', 'EN_EVALUACION', 'ADJUDICADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "EventoNotificacion" AS ENUM ('POSTULACION_RECIBIDA', 'EMPRENDEDOR_ADMITIDO', 'EMPRENDEDOR_RECHAZADO', 'EMPRENDEDOR_LISTA_ESPERA', 'FERIA_RECORDATORIO_48H', 'SOLICITUD_AUTOREPORTE', 'INSCRIPCION_CURSO_CONFIRMADA', 'CONVOCATORIA_ABIERTA', 'FONDO_ADJUDICADO', 'FUNCIONARIO_INVITADO');

-- CreateEnum
CREATE TYPE "CanalNotificacion" AS ENUM ('EMAIL', 'WHATSAPP', 'IN_APP');

-- CreateEnum
CREATE TYPE "TipoArco" AS ENUM ('ACCESO', 'RECTIFICACION', 'EXPORTACION', 'ELIMINACION');

-- CreateEnum
CREATE TYPE "EstadoArco" AS ENUM ('PENDIENTE', 'RESUELTA', 'RECHAZADA');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "logoUrl" TEXT,
    "colorAccent" TEXT,
    "dominioCorreo" TEXT,
    "modulosActivos" "Modulo"[] DEFAULT ARRAY['FERIAS', 'CAPACITACION', 'FONDOS']::"Modulo"[],
    "consentVersion" TEXT NOT NULL DEFAULT '1.0',
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rubros" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "codigoMaestro" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#2196F3',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rubros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tipo" "TipoUsuario" NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rut" TEXT,
    "estado" "EstadoUsuario" NOT NULL DEFAULT 'ACTIVO',
    "authStrategy" "AuthStrategy" NOT NULL DEFAULT 'PASSWORD',
    "passwordHash" TEXT,
    "claveUnicaSub" TEXT,
    "inviteTokenHash" TEXT,
    "inviteExpiresAt" TIMESTAMP(3),
    "ultimoAcceso" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funcionarios" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "cargo" TEXT,
    "rol" "RolFuncionario" NOT NULL,
    "modulos" "Modulo"[] DEFAULT ARRAY[]::"Modulo"[],

    CONSTRAINT "funcionarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emprendedores" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombreEmprendimiento" TEXT NOT NULL,
    "descripcion" TEXT,
    "telefono" TEXT,
    "localidad" TEXT,
    "rubroId" TEXT,
    "etapa" TEXT,
    "genero" TEXT,
    "repScore" INTEGER NOT NULL DEFAULT 0,
    "feriasCumplidas" INTEGER NOT NULL DEFAULT 0,
    "feriasTotales" INTEGER NOT NULL DEFAULT 0,
    "documentos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "consentVersion" TEXT,
    "consentFecha" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emprendedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ferias" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "objetivo" TEXT,
    "estado" "EstadoFeria" NOT NULL DEFAULT 'BORRADOR',
    "fecha" TEXT,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "ubicacion" TEXT,
    "cupos" INTEGER NOT NULL DEFAULT 0,
    "pesoProp" INTEGER NOT NULL DEFAULT 50,
    "pesoRep" INTEGER NOT NULL DEFAULT 50,
    "ventasReportadas" TEXT,
    "publicoEstimado" TEXT,
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ferias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feria_rubros" (
    "feriaId" TEXT NOT NULL,
    "rubroId" TEXT NOT NULL,

    CONSTRAINT "feria_rubros_pkey" PRIMARY KEY ("feriaId","rubroId")
);

-- CreateTable
CREATE TABLE "preguntas_feria" (
    "id" TEXT NOT NULL,
    "feriaId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "tipo" "TipoPregunta" NOT NULL,
    "puntuable" BOOLEAN NOT NULL DEFAULT false,
    "peso" INTEGER NOT NULL DEFAULT 0,
    "opciones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "preguntas_feria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postulaciones" (
    "id" TEXT NOT NULL,
    "feriaId" TEXT NOT NULL,
    "emprendedorId" TEXT NOT NULL,
    "scorePropuesta" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoPostulacion" NOT NULL DEFAULT 'PENDIENTE',
    "motivoEstado" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "postulaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respuestas_postulacion" (
    "id" TEXT NOT NULL,
    "postulacionId" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "valor" TEXT,
    "archivoId" TEXT,

    CONSTRAINT "respuestas_postulacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluadores_feria" (
    "feriaId" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "asignadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluadores_feria_pkey" PRIMARY KEY ("feriaId","funcionarioId")
);

-- CreateTable
CREATE TABLE "evaluaciones_terreno" (
    "id" TEXT NOT NULL,
    "feriaId" TEXT NOT NULL,
    "emprendedorId" TEXT NOT NULL,
    "evaluadorId" TEXT,
    "cumplimiento" JSONB NOT NULL DEFAULT '{}',
    "calidadEstrellas" INTEGER,
    "observaciones" TEXT,
    "completada" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluaciones_terreno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reportes_emprendedor" (
    "id" TEXT NOT NULL,
    "feriaId" TEXT NOT NULL,
    "emprendedorId" TEXT NOT NULL,
    "participo" BOOLEAN NOT NULL DEFAULT true,
    "ventasReportadas" INTEGER,
    "comentario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reportes_emprendedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_eventos" (
    "id" TEXT NOT NULL,
    "emprendedorId" TEXT NOT NULL,
    "origen" TEXT NOT NULL,
    "origenId" TEXT,
    "delta" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursos" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "modalidad" "ModalidadCurso" NOT NULL,
    "cupos" INTEGER NOT NULL DEFAULT 0,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "rubroObjetivoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscripciones" (
    "id" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "emprendedorId" TEXT NOT NULL,
    "estado" "EstadoInscripcion" NOT NULL DEFAULT 'INSCRITO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones_curso" (
    "id" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3),
    "titulo" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sesiones_curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asistencias" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "emprendedorId" TEXT NOT NULL,
    "presente" BOOLEAN NOT NULL DEFAULT false,
    "registradoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asistencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificados" (
    "id" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "emprendedorId" TEXT NOT NULL,
    "archivoId" TEXT,
    "emitidoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fondos" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "organismo" TEXT NOT NULL,
    "origen" "OrigenFondo" NOT NULL DEFAULT 'MUNICIPAL',
    "estado" "EstadoFondo" NOT NULL DEFAULT 'BORRADOR',
    "descripcion" TEXT,
    "montoMax" INTEGER,
    "moneda" TEXT NOT NULL DEFAULT 'CLP',
    "fechaCierre" TIMESTAMP(3),
    "criteriosMatch" JSONB NOT NULL DEFAULT '{}',
    "requisitos" JSONB NOT NULL DEFAULT '[]',
    "faq" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fondos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postulaciones_fondo" (
    "id" TEXT NOT NULL,
    "fondoId" TEXT NOT NULL,
    "emprendedorId" TEXT NOT NULL,
    "estado" "EstadoPostulacionFondo" NOT NULL DEFAULT 'POSTULADA',
    "proyecto" TEXT,
    "montoSolicitado" INTEGER,
    "motivoEstado" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "postulaciones_fondo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantillas_notificacion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "evento" "EventoNotificacion" NOT NULL,
    "canal" "CanalNotificacion" NOT NULL DEFAULT 'EMAIL',
    "asunto" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantillas_notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "evento" "EventoNotificacion" NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archivos" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subidoPorId" TEXT,
    "storageKey" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_arco" (
    "id" TEXT NOT NULL,
    "emprendedorId" TEXT NOT NULL,
    "tipo" "TipoArco" NOT NULL,
    "estado" "EstadoArco" NOT NULL DEFAULT 'PENDIENTE',
    "detalle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resueltaAt" TIMESTAMP(3),

    CONSTRAINT "solicitudes_arco_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "rubros_tenantId_idx" ON "rubros"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "rubros_tenantId_codigoMaestro_key" ON "rubros"("tenantId", "codigoMaestro");

-- CreateIndex
CREATE INDEX "usuarios_tenantId_tipo_idx" ON "usuarios"("tenantId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_tenantId_email_key" ON "usuarios"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_tenantId_rut_key" ON "usuarios"("tenantId", "rut");

-- CreateIndex
CREATE UNIQUE INDEX "funcionarios_usuarioId_key" ON "funcionarios"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "emprendedores_usuarioId_key" ON "emprendedores"("usuarioId");

-- CreateIndex
CREATE INDEX "emprendedores_tenantId_rubroId_idx" ON "emprendedores"("tenantId", "rubroId");

-- CreateIndex
CREATE INDEX "ferias_tenantId_estado_idx" ON "ferias"("tenantId", "estado");

-- CreateIndex
CREATE INDEX "preguntas_feria_feriaId_idx" ON "preguntas_feria"("feriaId");

-- CreateIndex
CREATE INDEX "postulaciones_feriaId_estado_idx" ON "postulaciones"("feriaId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "postulaciones_feriaId_emprendedorId_key" ON "postulaciones"("feriaId", "emprendedorId");

-- CreateIndex
CREATE UNIQUE INDEX "respuestas_postulacion_postulacionId_preguntaId_key" ON "respuestas_postulacion"("postulacionId", "preguntaId");

-- CreateIndex
CREATE INDEX "evaluaciones_terreno_feriaId_idx" ON "evaluaciones_terreno"("feriaId");

-- CreateIndex
CREATE UNIQUE INDEX "evaluaciones_terreno_feriaId_emprendedorId_key" ON "evaluaciones_terreno"("feriaId", "emprendedorId");

-- CreateIndex
CREATE UNIQUE INDEX "reportes_emprendedor_feriaId_emprendedorId_key" ON "reportes_emprendedor"("feriaId", "emprendedorId");

-- CreateIndex
CREATE INDEX "score_eventos_emprendedorId_idx" ON "score_eventos"("emprendedorId");

-- CreateIndex
CREATE INDEX "cursos_tenantId_idx" ON "cursos"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "inscripciones_cursoId_emprendedorId_key" ON "inscripciones"("cursoId", "emprendedorId");

-- CreateIndex
CREATE UNIQUE INDEX "asistencias_sesionId_emprendedorId_key" ON "asistencias"("sesionId", "emprendedorId");

-- CreateIndex
CREATE UNIQUE INDEX "certificados_cursoId_emprendedorId_key" ON "certificados"("cursoId", "emprendedorId");

-- CreateIndex
CREATE INDEX "fondos_tenantId_estado_idx" ON "fondos"("tenantId", "estado");

-- CreateIndex
CREATE INDEX "postulaciones_fondo_fondoId_estado_idx" ON "postulaciones_fondo"("fondoId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "postulaciones_fondo_fondoId_emprendedorId_key" ON "postulaciones_fondo"("fondoId", "emprendedorId");

-- CreateIndex
CREATE UNIQUE INDEX "plantillas_notificacion_tenantId_evento_canal_key" ON "plantillas_notificacion"("tenantId", "evento", "canal");

-- CreateIndex
CREATE INDEX "notificaciones_usuarioId_leida_idx" ON "notificaciones"("usuarioId", "leida");

-- CreateIndex
CREATE INDEX "archivos_tenantId_idx" ON "archivos"("tenantId");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entidad_entidadId_idx" ON "audit_logs"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "solicitudes_arco_emprendedorId_idx" ON "solicitudes_arco"("emprendedorId");

-- AddForeignKey
ALTER TABLE "rubros" ADD CONSTRAINT "rubros_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funcionarios" ADD CONSTRAINT "funcionarios_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emprendedores" ADD CONSTRAINT "emprendedores_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emprendedores" ADD CONSTRAINT "emprendedores_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emprendedores" ADD CONSTRAINT "emprendedores_rubroId_fkey" FOREIGN KEY ("rubroId") REFERENCES "rubros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ferias" ADD CONSTRAINT "ferias_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ferias" ADD CONSTRAINT "ferias_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "funcionarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feria_rubros" ADD CONSTRAINT "feria_rubros_feriaId_fkey" FOREIGN KEY ("feriaId") REFERENCES "ferias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feria_rubros" ADD CONSTRAINT "feria_rubros_rubroId_fkey" FOREIGN KEY ("rubroId") REFERENCES "rubros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preguntas_feria" ADD CONSTRAINT "preguntas_feria_feriaId_fkey" FOREIGN KEY ("feriaId") REFERENCES "ferias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulaciones" ADD CONSTRAINT "postulaciones_feriaId_fkey" FOREIGN KEY ("feriaId") REFERENCES "ferias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulaciones" ADD CONSTRAINT "postulaciones_emprendedorId_fkey" FOREIGN KEY ("emprendedorId") REFERENCES "emprendedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuestas_postulacion" ADD CONSTRAINT "respuestas_postulacion_postulacionId_fkey" FOREIGN KEY ("postulacionId") REFERENCES "postulaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuestas_postulacion" ADD CONSTRAINT "respuestas_postulacion_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "preguntas_feria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuestas_postulacion" ADD CONSTRAINT "respuestas_postulacion_archivoId_fkey" FOREIGN KEY ("archivoId") REFERENCES "archivos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluadores_feria" ADD CONSTRAINT "evaluadores_feria_feriaId_fkey" FOREIGN KEY ("feriaId") REFERENCES "ferias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluadores_feria" ADD CONSTRAINT "evaluadores_feria_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluaciones_terreno" ADD CONSTRAINT "evaluaciones_terreno_feriaId_fkey" FOREIGN KEY ("feriaId") REFERENCES "ferias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluaciones_terreno" ADD CONSTRAINT "evaluaciones_terreno_emprendedorId_fkey" FOREIGN KEY ("emprendedorId") REFERENCES "emprendedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluaciones_terreno" ADD CONSTRAINT "evaluaciones_terreno_evaluadorId_fkey" FOREIGN KEY ("evaluadorId") REFERENCES "funcionarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_emprendedor" ADD CONSTRAINT "reportes_emprendedor_feriaId_fkey" FOREIGN KEY ("feriaId") REFERENCES "ferias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_emprendedor" ADD CONSTRAINT "reportes_emprendedor_emprendedorId_fkey" FOREIGN KEY ("emprendedorId") REFERENCES "emprendedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_eventos" ADD CONSTRAINT "score_eventos_emprendedorId_fkey" FOREIGN KEY ("emprendedorId") REFERENCES "emprendedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos" ADD CONSTRAINT "cursos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos" ADD CONSTRAINT "cursos_rubroObjetivoId_fkey" FOREIGN KEY ("rubroObjetivoId") REFERENCES "rubros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_emprendedorId_fkey" FOREIGN KEY ("emprendedorId") REFERENCES "emprendedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_curso" ADD CONSTRAINT "sesiones_curso_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "sesiones_curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_emprendedorId_fkey" FOREIGN KEY ("emprendedorId") REFERENCES "emprendedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_emprendedorId_fkey" FOREIGN KEY ("emprendedorId") REFERENCES "emprendedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_archivoId_fkey" FOREIGN KEY ("archivoId") REFERENCES "archivos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fondos" ADD CONSTRAINT "fondos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulaciones_fondo" ADD CONSTRAINT "postulaciones_fondo_fondoId_fkey" FOREIGN KEY ("fondoId") REFERENCES "fondos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulaciones_fondo" ADD CONSTRAINT "postulaciones_fondo_emprendedorId_fkey" FOREIGN KEY ("emprendedorId") REFERENCES "emprendedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantillas_notificacion" ADD CONSTRAINT "plantillas_notificacion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_arco" ADD CONSTRAINT "solicitudes_arco_emprendedorId_fkey" FOREIGN KEY ("emprendedorId") REFERENCES "emprendedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

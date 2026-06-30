# MunIA Fomento

Plataforma de **fomento productivo municipal** — primer vertical de fomento de la suite MunIA. Digitaliza la relación entre un municipio y sus emprendedores a través de módulos (**Ferias**, **Capacitación**, **Fondos**), cada uno con dos caras: **participar** (emprendedor) y **gestionar** (municipio).

> **Producto, no cliente.** El municipio es una variable de configuración (un *tenant*), nunca código. La plataforma se despliega para cualquier comuna sin tocar el código — sólo configuración. No hay ningún nombre de comuna cableado en interfaz ni datos semilla.

La especificación viva es el prototipo navegable [`reference/munia-fomento-prototipo.html`](reference/munia-fomento-prototipo.html); el brief completo está en [`reference/prompt-munia-fomento-v2.md`](reference/prompt-munia-fomento-v2.md).

---

## Estado del build

Construcción por fases siguiendo el orden del brief (§11). Estado actual:

| # | Fase | Estado |
|---|------|--------|
| 1 | Modelo de datos multi-tenant + migraciones + seed genérico | ✅ Hecho |
| 2 | Auth (ClaveÚnica + fallback) + roles + control de acceso rol × módulo + gestión de usuarios | ✅ Hecho |
| 3 | Shell de navegación (hub, sidebar contextual, topbar) | ✅ Hecho |
| 4 | Registro y portal del emprendedor (consentimiento, perfil, ARCO, onboarding) | ✅ Hecho |
| 5 | Módulo Ferias (formulario híbrido, doble score + perilla, selección, evaluación 3 capas, dashboards) | ✅ Hecho |
| 6 | Notificaciones por evento + email + plantillas + centro in-app | ✅ Hecho |
| 7 | Módulo Capacitación | ✅ Hecho |
| 8 | Módulo Fondos (dos puertas, match, ficha, asistente IA con adaptador RAG/mock) | ⏳ Siguiente |
| 9 | Búsqueda/filtros, estados vacíos, confirmaciones, pulido responsive | ⬜ |
| 10 | Configuración de tenant (panel municipio) | ⬜ |

---

## Arquitectura

```
munia-fomento/
├── backend/            API REST (Fastify + Prisma + PostgreSQL)
│   ├── prisma/
│   │   ├── schema.prisma   ← modelo de datos multi-tenant (26 tablas)
│   │   └── seed.ts         ← datos semilla GENÉRICOS (tenant "demo")
│   └── src/                código de la API (servicios, rutas, adaptadores)
├── frontend/           SPA (Vite + React + TypeScript)
│   └── src/                shell, login diferenciado, hub, navegación espejo, gestión usuarios
├── reference/          prototipo HTML + brief (especificación viva)
└── docker-compose.yml  PostgreSQL para desarrollo
```

**Stack.** Node + TypeScript de punta a punta. Backend Fastify + Prisma + PostgreSQL + Zod. Frontend React + Vite + React Router + TanStack Query. Contraseñas con argon2. Almacenamiento S3-compatible (local en dev). Email transaccional (consola en dev, Resend en prod).

### Principios de diseño del modelo

- **Multi-tenant desde el día uno.** Toda entidad de negocio cuelga de `tenantId`. La config del municipio (nombre, logo, dominio de correo, módulos activos, versión de consentimiento) vive en la tabla `tenants`.
- **Una sola identidad de emprendedor** (`emprendedores`) atraviesa todos los módulos: quien postula a una feria es el mismo que se inscribe a un curso o postula a un fondo. Es el corazón del valor de plataforma.
- **El acceso se asigna, no se toma.** El emprendedor se auto-inscribe (puerta abierta); el funcionario es dado de alta por el admin con `rol × módulos`. El control de acceso se valida en backend en cada endpoint (fase 2).
- **Doble score en Ferias.** `emprendedores.repScore` = desempeño acumulado (persistente, reputación). `postulaciones.scorePropuesta` = admisión (efímero, por feria). La perilla `feria.pesoProp / pesoRep` los combina y resuelve el caso del novato (rep 0) sin volverse un club cerrado.
- **Ventas autoreportadas nunca son cifra dura.** Viven en `reportes_emprendedor` como señal de participación + dato narrativo, fuera del ranking.
- **Trazabilidad** (`audit_logs`) y **derechos ARCO** (`solicitudes_arco`, Ley 21.719) por diseño, no como add-on.
- **Notificaciones desacopladas por eventos** (`EventoNotificacion`): el enum de canal ya incluye `WHATSAPP` para enchufarlo mañana sin reescribir lógica. MVP: email + centro in-app.
- **Rubros** con `codigoMaestro` (estándar inter-comunal, comparabilidad) + `alias` (de cara al usuario). No se expone taxonomía CIIU/SII.

---

## Levantar el entorno de desarrollo

Requisitos: Node ≥ 20 y Docker (o un PostgreSQL local).

```bash
# 1. Dependencias
npm install

# 2. Base de datos (PostgreSQL en Docker)
docker compose up -d            # levanta Postgres en localhost:5432

# 3. Configuración del backend
cp backend/.env.example backend/.env   # los valores por defecto apuntan al Postgres de docker-compose

# 4. Migrar + poblar
npm run db:migrate              # crea el esquema (prisma migrate dev)
npm run db:seed                 # carga el tenant "demo" con datos genéricos

# 5. (Prisma Studio para inspeccionar la BD)
cd backend && npm run db:studio
```

¿Sin Docker? Crea una base `munia_fomento` en tu PostgreSQL local y ajusta `DATABASE_URL` en `backend/.env`.

### Usuarios de ejemplo (tras el seed)

Contraseña de todos en dev: **`demo1234`** (estrategia `password`, fallback de ClaveÚnica).

| Rol | Correo | Notas |
|-----|--------|-------|
| Administrador | `admin@municipio.demo.cl` | acceso a los 3 módulos + gestión de usuarios |
| Evaluador | `evaluador@municipio.demo.cl` | sólo Ferias, asignado a "Expo Productores 2026" |
| Jefatura | `jefatura@municipio.demo.cl` | sólo lectura / dashboards |
| Emprendedora (con historial) | `maria.fuentes@example.cl` | rep 88, 8/8 ferias |
| Emprendedor (**nuevo**, rep 0) | `roberto.diaz@example.cl` | sin historial — valida el onboarding del novato |

---

## Variables de entorno

Ver [`backend/.env.example`](backend/.env.example). Resumen:

| Variable | Para qué |
|----------|----------|
| `DATABASE_URL` | conexión PostgreSQL |
| `PORT`, `WEB_ORIGIN`, `SESSION_SECRET` | servidor y sesión |
| `DEFAULT_TENANT_SLUG` | tenant que sirve la raíz en despliegue mono-municipio |
| `AUTH_PRIMARY_STRATEGY` | `clave_unica` (prod) o `password` (dev) |
| `CLAVEUNICA_*` | credenciales OIDC de ClaveÚnica |
| `EMAIL_PROVIDER`, `EMAIL_FROM`, `RESEND_API_KEY` | email transaccional (`console` en dev) |
| `STORAGE_PROVIDER`, `S3_*` | archivos (`local` en dev) |
| `FONDOS_MATCH_PROVIDER`, `RAG_*` | asistente IA de Fondos (`mock` en dev, `rag` → MunIA core) |

---

## Configurar un nuevo municipio (tenant)

El municipio es configuración. Para desplegar la plataforma a una comuna nueva **no se toca código**:

1. Crear una fila en `tenants` con `slug`, `nombre`, `logoUrl`, `dominioCorreo`, `colorAccent` (opcional) y `modulosActivos`.
2. Cargar su catálogo de `rubros` (alias locales sobre los `codigoMaestro` estándar).
3. Crear el usuario administrador inicial del municipio.
4. (Opcional) Personalizar las `plantillas_notificacion`.

En fase 10 esto se expone como un panel de administración del tenant. Mientras tanto, el seed (`backend/prisma/seed.ts`) muestra exactamente cómo se compone un tenant completo.

---

## API REST — fase 2 (auth + gobernanza)

Control de acceso `rol × módulo` validado en backend en cada endpoint (preHandler `requireAcceso`). El `Principal` se recarga en cada request, así la suspensión surte efecto al instante. Toda acción sensible queda en `audit_logs`.

| Método | Ruta | Acceso | Qué hace |
|--------|------|--------|----------|
| GET | `/api/health` | público | healthcheck |
| POST | `/api/auth/registro` | público | auto-registro de emprendedor (exige consentimiento Ley 21.719) |
| POST | `/api/auth/login` | público | login con contraseña (fallback) |
| GET | `/api/auth/clave-unica/start` | público | inicia OIDC de ClaveÚnica (método principal) |
| POST | `/api/auth/activar` | público + token | activa cuenta de funcionario invitado |
| GET | `/api/auth/me` | sesión | perfil + rol + módulos del usuario actual |
| POST | `/api/auth/logout` | sesión | cierra sesión |
| GET | `/api/usuarios` | admin | lista funcionarios del municipio |
| POST | `/api/usuarios/invitar` | admin | da de alta funcionario (rol × módulos) + email de activación |
| PATCH | `/api/usuarios/:id` | admin | edita rol × módulos / cargo |
| POST | `/api/usuarios/:id/suspender` | admin | suspende acceso (sensible, auditado) |
| POST | `/api/usuarios/:id/reactivar` | admin | reactiva acceso |

Tests: `npm test` corre la matriz de acceso (`src/auth/access.test.ts`), el motor de scoring (`src/domain/scoring.test.ts`) y el cableado HTTP (`src/app.smoke.test.ts`) — 27 casos, sin BD.

## Adaptadores intercambiables (preparados para integrar con MunIA core)

| Capa | Interfaz | Dev | Prod |
|------|----------|-----|------|
| Auth | `AuthProvider` | `PasswordProvider` | `ClaveUnicaProvider` |
| Email | `EmailProvider` | `ConsoleEmail` | `ResendEmail` |
| Storage | `StorageProvider` | `LocalStorage` | `S3Storage` |
| Match de Fondos | `FondosMatchProvider` | `MockMatchProvider` (intención) | `RagMatchProvider` (RAG de MunIA) |

Cada uno se selecciona por variable de entorno. La plataforma es standalone y se integra a MunIA core vía estos adaptadores y APIs REST propias, sin acoplarse a su BPMN/ticketing.

---

## Comandos útiles

```bash
npm run dev:api      # backend en watch
npm run dev:web      # frontend (fase 3)
npm run db:migrate   # aplicar migraciones
npm run db:seed      # poblar datos demo
npm run db:reset     # resetear BD + re-seed
npm test             # tests (scoring, acceso rol×módulo, métricas, match)
```

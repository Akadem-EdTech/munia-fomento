# PROMPT DE DESARROLLO — MunIA Fomento · Plataforma de Fomento Productivo Municipal

> **Para:** Claude Code (agente de desarrollo full-stack)
> **Producto:** MunIA Fomento — plataforma de fomento productivo para municipios, primer vertical de fomento de la suite MunIA
> **Naturaleza:** MVP de producto real, backend + frontend, standalone con arquitectura preparada para integración futura vía API a MunIA core
> **Referencia visual y funcional:** existe un prototipo navegable HTML validado (`munia-fomento-prototipo.html`) que es la especificación viva de esta plataforma. Replica su arquitectura, flujos y sistema de diseño. Adjúntalo al iniciar el build.

---

## 0. CONTEXTO Y MISIÓN

Eres un equipo senior de producto (arquitecto, backend, frontend, UX). Vas a construir **MunIA Fomento**: una plataforma web que digitaliza la relación entre un municipio y sus emprendedores en materia de fomento productivo.

No es un sistema de ferias. Es **una plataforma de múltiples módulos** (Ferias, Capacitación, Fondos, y más por venir) con dos caras: la del **emprendedor** (cara pública, se auto-inscribe) y la del **municipio** (funcionarios con acceso asignado por rol). Ambas conviven en la misma plataforma; cada módulo tiene una cara de participación y una de gestión.

**Naturaleza del producto, no del cliente.** El producto se llama MunIA Fomento. El municipio concreto es una variable de configuración (nombre, logo, datos, dominio de correo), NO algo cableado en el código. El sistema debe poder desplegarse para cualquier municipio sin tocar código — solo configuración. NO hardcodees el nombre de ninguna comuna en ningún string de interfaz ni dato semilla; usa "tu municipio", "la comuna", o variables de configuración.

**Principio rector:** en un municipio, cada segundo de fricción mata la adopción. Prioriza usabilidad para funcionarios no técnicos y para emprendedores con baja alfabetización digital. El sistema debe **degradar con gracia**: ser útil aunque solo se completen los flujos mínimos.

---

## 1. ARQUITECTURA GENERAL

### Modelo conceptual: plataforma → módulos
- La plataforma es un **hub** (lobby). Al entrar, el usuario ve los módulos como tarjetas-territorio.
- Cada **módulo** (Ferias, Capacitación, Fondos) tiene su propia navegación interna y dos caras según el rol: **participar** (emprendedor) o **gestionar** (municipio).
- La navegación es **espejo**: el emprendedor en Ferias ve "Postular / Mis postulaciones / Reportar"; el municipio en Ferias ve "Crear feria / Selección / Evaluar". Mismo módulo, cara distinta según quién entra.
- Un botón "← Volver al inicio" siempre regresa al hub. Al entrar a un módulo, el menú lateral se transforma para mostrar las secciones de ese módulo.
- **Registro de emprendedores compartido entre módulos:** el emprendedor que postula a una feria es el mismo que se inscribe a un curso o postula a un fondo. Una sola identidad, una sola base, atravesando todos los módulos. Este es el corazón del valor de plataforma.

### Stack (ajustable si propones algo mejor justificado)
- **Backend:** Node.js + TypeScript (Fastify o Express) o Python (FastAPI). Uno, consistente.
- **Base de datos:** PostgreSQL (relacional — el modelo lo exige).
- **Frontend:** React + TypeScript, responsive y **mobile-first** en flujos de terreno y portal del emprendedor.
- **ORM:** Prisma o equivalente con migraciones versionadas.
- **Almacenamiento de archivos:** S3-compatible (o local en dev). NO binarios en la BD.
- **Email transaccional:** proveedor real (Resend/SendGrid). NO envío casero.
- **Autenticación:** ver sección 3.
- **IA (módulo Fondos):** integración con el agente RAG de MunIA core vía API. En dev, mock con interfaz idéntica para no bloquear el build (ver sección 6).

### Multi-tenant desde el diseño
Aunque el primer despliegue sea para un municipio, diseña el modelo de datos con `tenant_id` (municipio) en las entidades. Esto permite desplegar la misma plataforma para múltiples comunas sin refactorizar. La configuración del municipio (nombre, logo, colores opcionales, dominio de correo institucional, catálogo base de rubros) vive en una tabla de configuración, no en el código.

### Requisitos transversales no negociables
- **Trazabilidad / auditoría:** toda acción sensible (evaluación, admisión, rechazo, cambio de rol/acceso, adjudicación de fondo) queda firmada con `usuario_id` + `timestamp` + `tenant_id`. Hay recursos públicos y selección de beneficiarios de por medio.
- **Cumplimiento Ley 21.719 (protección de datos, Chile) por diseño:** consentimiento explícito al registrarse (checkbox activo + aviso de privacidad inline, NO pre-marcado), derechos ARCO operativos desde el portal del emprendedor (acceder, rectificar, exportar, solicitar eliminación), minimización de datos. Es parte del producto, no un add-on.
- **Seguridad:** hashing de contraseñas, validación de inputs server-side, control de acceso por rol Y por módulo en CADA endpoint (no confiar en el frontend), protección contra inyección.
- **NO** colocar datos personales en URLs/query strings.

---

## 2. ACCESO Y AUTENTICACIÓN (login diferenciado)

La plataforma tiene **dos puertas de entrada con lógicas distintas**, reflejando que el ciudadano se auto-inscribe pero el poder municipal se asigna.

### Cara pública: emprendedor (login + auto-registro)
- Pantalla principal de login orientada al emprendedor: iniciar sesión + **"Crear mi cuenta de emprendedor"**.
- **Auto-registro abierto:** cualquier emprendedor de la comuna puede crear su cuenta. El registro pide datos base (nombre, RUT, nombre del emprendimiento, contacto) + **checkbox de consentimiento Ley 21.719** (obligatorio, no pre-marcado, con aviso de privacidad inline).
- **Autenticación recomendada: ClaveÚnica.** Da RUT verificado (llave única anti-duplicados, requisito de fondos públicos) y refuerza la narrativa de integración con el Estado. Implementa ClaveÚnica como método principal; deja fallback email/password para entornos donde ClaveÚnica no esté disponible (dev). Esta es una decisión a confirmar con el cliente; arquitéctala como método de auth intercambiable.

### Cara municipal: funcionarios (login, sin auto-registro)
- Acceso por un enlace **discreto pero presente** al pie del login público: "Acceso funcionarios municipales →".
- **NO hay auto-registro para funcionarios.** A un funcionario lo da de alta el administrador (ver módulo de gestión de usuarios, sección 7). Login con credenciales institucionales.
- Al entrar, el funcionario cae directo al hub con las **mismas tarjetas de módulos**, viendo solo las funcionalidades que su rol y sus módulos asignados permiten.

### Roles del sistema
- **Emprendedor:** cara pública, perfil propio, participa en módulos.
- **Administrador (municipal):** crea, configura y gestiona en los módulos que tenga asignados. Además, accede al módulo de gestión de usuarios.
- **Evaluador:** solo evalúa lo que se le asigna, en los módulos/eventos asignados. Scope acotado.
- **Jefatura:** solo lectura, solo dashboards. No opera. (Es la vía de entrada de DIDECO/alcaldía al sistema.)

Un funcionario puede tener un rol y un **subconjunto de módulos** asignados (ej: un "Encargado de Fondos" con rol admin pero solo en el módulo Fondos). El control de acceso es por rol × módulo.

---

## 3. SESIÓN Y NAVEGACIÓN GLOBAL (UX shell)

- **Topbar** con: título de la vista actual + breadcrumb (en qué módulo/sección estás), **campana de notificaciones** (con indicador de no leídas y panel desplegable de notificaciones contextuales al rol), y **menú de usuario** clickeable (nombre, rol, accesos rápidos, y **cerrar sesión**).
- **Sidebar contextual:** en el hub muestra los módulos; dentro de un módulo muestra las secciones de ese módulo + "volver al inicio". Para el admin, además una sección "Administración del sistema" con gestión de usuarios.
- **Logout** siempre accesible desde el menú de usuario.
- **Mobile-first:** sidebar colapsable con botón hamburguesa; los flujos de terreno (evaluación) y todo el portal del emprendedor deben funcionar impecablemente en celular.

---

## 4. MÓDULO FERIAS

(El módulo más maduro. Replica la lógica del prototipo.)

### Cara emprendedor
- **Ferias abiertas:** lista de ferias a las que puede postular, cada una indicando si **prioriza propuesta o trayectoria** (traducción del criterio de selección a lenguaje del emprendedor: "buena para mostrar algo nuevo" vs "valora tu trayectoria").
- **Postulación:** formulario híbrido = bloque núcleo fijo (autocompletado desde el perfil) + bloque configurable por feria (3-6 preguntas de tipos predefinidos: texto, selección, número, sí/no, adjunto). Adjuntos en ambos bloques.
- **Mis postulaciones:** estado de cada una (postulada / admitida / rechazada / lista de espera).
- **Reportar feria:** autoreporte post-feria (Capa 2, ver scoring).

### Cara municipio
- **Crear/configurar feria:** objetivo, fecha, ubicación, cupos, rubros admitidos, **perilla de ponderación** (peso propuesta vs reputación, configurable por feria), preguntas configurables del formulario (cada una marcable como puntuable con peso), plantillas de notificación.
- **Selección de postulantes:** ranking por **score combinado** (propuesta × peso + reputación × peso), recalculable en vivo al mover la perilla, con desglose visible (cuánto aportó cada componente) para que cada admisión sea defendible. Admitir / rechazar / lista de espera (rechazar pide confirmación).
- **Registro de emprendedores:** base permanente, con **búsqueda y filtro por rubro** (debe escalar a cientos de registros).
- **Evaluación en terreno** (evaluador, móvil): 3 capas — Capa 1 cumplimiento (checklist binario obligatorio, **guardado al instante de cada marca**, NO acumulado esperando un botón final), Capa 2 comercial (autoreportada por el emprendedor), Capa 3 calidad (estrellas, opcional, selectiva). Barra de progreso "N de M evaluados".
- **Evaluadores:** asignación por feria específica (scope por evento).
- **Notificaciones:** plantillas editables por evento (ver sección 8).
- **Dashboards:** operativo (encargado, accionable), territorial (jefatura, agregado), narrativo/alcalde (instrumento de relato, números grandes, exportable como tarjeta).

### Motor de scoring (corazón de Ferias)
**Doble score:**
- **Score de desempeño (reputación acumulada):** persistente en el perfil del emprendedor. Crece feria a feria. Capa 1 (cumplimiento) es el piso; Capa 2 modula por participación (NO por cifra de ventas, que es autoreportada e inflable); Capa 3 acelera/frena. El emprendedor ve un número único + un **badge de confiabilidad** ("cumplió 8 de 8 ferias").
- **Score de postulación (admisión):** efímero, por feria. Evalúa el fit de la propuesta con esa feria, nutrido por las preguntas configurables marcadas como puntuables.
- **Combinación con perilla configurable:** resuelve el problema del novato (un emprendedor nuevo con reputación 0 debe poder entrar a una feria que pondere alto la propuesta — el sistema NO puede ser un club cerrado) y el del free-rider (buena reputación + mala propuesta no entra automático).

---

## 5. MÓDULO CAPACITACIÓN

### Cara emprendedor
- **Cursos disponibles:** lista con modalidad (presencial/online), cupos, fechas, descripción, barra de ocupación. Inscripción con un clic (autocompletada desde el perfil).
- **Mis inscripciones:** estado (inscrito / lista de espera).
- **Mis certificados:** certificados obtenidos, descargables.

### Cara municipio
- **Gestión de cursos:** crear curso (modalidad, cupos, fechas, rubro objetivo).
- **Inscripciones:** lista de inscritos (del registro compartido de emprendedores).
- **Asistencia:** toma de asistencia por sesión, desde el celular, guardado instantáneo.
- **Dashboard formación:** cursos dictados, emprendedores formados, certificados emitidos, tasa de asistencia, cursos más demandados.

La asistencia y la finalización de cursos pueden alimentar el perfil del emprendedor (señal de engagement formativo) — decisión a definir si entra al scoring transversal.

---

## 6. MÓDULO FONDOS (con asistente IA — el escaparate del RAG de MunIA)

Este módulo es la demostración tangible del agente conversacional de MunIA aplicado a fomento. Es estratégicamente la pieza de cierre.

### Cara emprendedor: dos puertas que convergen
Pantalla "Descubrir fondos" con **dos puertas iguales**, el emprendedor elige:

1. **Asistente con IA** ("Cuéntame qué necesitas"): chat donde el emprendedor describe en lenguaje natural a qué se dedica y qué necesita ("tengo una cocinería y necesito comprar un horno"). El asistente identifica el fondo correcto, **explica por qué**, da monto/fechas, y ofrece abrir la ficha para postular. **Conectado al RAG de MunIA core** sobre un repositorio de fondos vigentes (municipales y externos: CORFO, SERNAMEG, etc.). En dev, mock con la misma interfaz (motor de match por intención) para no bloquear el build — la integración real es un adaptador intercambiable.

2. **Lista personalizada** ("Ver fondos para mí"): fondos **filtrados por el perfil** del emprendedor (rubro, localidad, etapa, género si aplica), con nivel de **compatibilidad** visible (alta/media). Principio: NO mostrar fondos para los que no califica.

### Ficha de fondo (a donde llegan ambas puertas)
- Compatibilidad con el perfil, monto, días restantes, organismo.
- **Requisitos checkeados contra el perfil:** "cumples 2 de 4", marcando lo que ya tiene vs lo que le falta preparar.
- **Apoyo IA a la postulación:** el asistente ayuda a redactar el proyecto de inversión, armar cotizaciones, y responder dudas (FAQ desplegable).
- Fechas, requisitos, preguntas frecuentes.

### Cara municipio
- **Convocatorias:** crear/gestionar convocatorias, definir los **criterios de match** que alimentan al asistente (rubros elegibles, etapa, requisitos).
- **Evaluar postulaciones:** con la **reputación cruzada** del emprendedor (su historial en ferias y capacitación es contexto para adjudicar — el valor de la plataforma unificada).
- **Adjudicación:** fondos adjudicados.
- **Dashboard fondos:** fondos entregados, emprendedores apoyados, postulaciones, distribución por rubro.

**Nota de datos:** los fondos externos (CORFO, SERNAMEG) implican mantener un catálogo de convocatorias vigentes actualizado — esto es trabajo de curaduría de datos que el sistema debe soportar (carga/edición de convocatorias por el admin, y eventualmente sincronización con fuentes externas). Dimensiónalo.

---

## 7. MÓDULO DE GESTIÓN DE USUARIOS (gobernanza — solo administrador)

Vive en "Administración del sistema", accesible solo para el administrador. Es la gobernanza del sistema: quién es funcionario, con qué rol, y a qué módulos accede.

- **Lista de funcionarios:** nombre, cargo, rol, módulos con acceso (chips), estado (activo/invitado).
- **Invitar funcionario:** alta por el admin (nombre, cargo, correo institucional) → el funcionario recibe email para activar su cuenta. NO auto-registro.
- **Asignación rol × módulos:** al editar un usuario, el admin elige el **rol** (Administrador / Evaluador / Jefatura, cada uno con descripción de qué puede hacer) y marca los **módulos con acceso** (Ferias / Capacitación / Fondos). El control de acceso resultante se aplica en backend en cada endpoint.
- **Suspender acceso** (pide confirmación — acción reversible pero sensible).
- Toda asignación/cambio queda con trazabilidad (quién, cuándo).

Principio rector de gobernanza: **el acceso se asigna, no se toma.** El emprendedor se auto-inscribe (ciudadano, puerta abierta); el funcionario es dado de alta (poder, puerta asignada).

---

## 8. NOTIFICACIONES (arquitectura desacoplada por eventos)

- Capa de notificaciones basada en **eventos**, NO email cableado en cada función. Eventos mínimos:
  `postulacion_recibida`, `emprendedor_admitido`, `emprendedor_rechazado`, `emprendedor_lista_espera`, `feria_recordatorio_48h`, `solicitud_autoreporte`, `inscripcion_curso_confirmada`, `convocatoria_abierta`, `fondo_adjudicado`, `funcionario_invitado`.
- **Canal MVP: email transaccional.** Diseñar para que agregar WhatsApp mañana sea enchufar un canal al mismo evento, sin reescribir lógica. (WhatsApp y chat bidireccional NO entran en el MVP.)
- **Plantillas editables por el admin**, con variables (`{nombre}`, `{feria}`, `{fecha}`, `{ubicacion}`, etc.). NO hardcodeadas.
- **Centro de notificaciones in-app:** campana en el topbar con notificaciones contextuales al rol del usuario y estado leído/no leído.

---

## 9. EXPERIENCIA DEL EMPRENDEDOR (UX crítica para adopción)

El emprendedor es el usuario más frágil y el que sostiene el dato vivo. Diséñalo con cuidado especial.

- **Portal orientado a la acción del momento:** el hub no abre en el perfil, abre mostrando lo relevante ahora (feria abierta para postular, reporte pendiente, etc.).
- **Onboarding del emprendedor nuevo:** un emprendedor recién registrado (reputación 0, sin historial) NO debe ver una pantalla vacía y fría. Debe ver bienvenida + **primeros pasos guiados** (completa tu perfil, explora ferias, descubre fondos) + barra de **completitud de perfil**. Su estado dice "emprendedor nuevo · sin historial aún", no un cero.
- **Completitud de perfil como motor de auto-mantención:** indicar qué falta ("agrega tu resolución sanitaria para postular a más ferias") incentiva al emprendedor a mantener su dato actualizado — esto es lo que hace que el registro se aprecie en vez de morir.
- **Autocompletado desde el perfil** en toda postulación/inscripción: postular por segunda vez debe tomar un minuto. Es el premio por tener perfil.
- **Estados vacíos que guían:** "aún no has postulado a ninguna feria → mira las ferias abiertas". Nunca una tabla vacía muda.
- **Derechos ARCO** accesibles desde el portal (acceder/rectificar/exportar/eliminar su dato), con la fecha y versión de consentimiento visibles.

---

## 10. SISTEMA DE DISEÑO (MunIA / ALTKimia)

- **Marca:** wordmark "MunIA Fomento" (Mun en azul). MunIA es la suite; Fomento es el vertical. El nombre del municipio es configuración, nunca parte del wordmark.
- **Fondos:** Abyss `#080B12` / Night `#0D1117` / capas `#111827`, `#161F30`.
- **Acento azul:** `#2196F3` (con moderación, ≤20% de la composición). Acentos secundarios por módulo: Ferias azul, Capacitación violeta `#A78BFA`, Fondos verde `#4ADE80`, Asesorías ámbar `#F59E0B`.
- **Tipografía:** Space Grotesk (títulos/UI) + DM Mono (datos, código, métricas).
- **Iconografía:** outline-only, stroke ~2px.
- **Estilo:** sobrio, técnico, institucional pero moderno. Bordes redondeados generosos, hairlines de 0.5px, glows sutiles radiales.
- **Responsive y accesible:** mobile-first en flujos de terreno y portal emprendedor; contraste adecuado; objetivos táctiles generosos (uso en terreno, una mano, bajo sol); foco de teclado visible; respeta reduce-motion.
- Coherente con el ecosistema `altkimia-gaas.github.io`.

---

## 11. ENTREGABLES Y ORDEN DE CONSTRUCCIÓN

### Entregables
- Backend + frontend + esquema BD con migraciones y datos semilla (rubros maestros precargados, usuarios de ejemplo por rol, 2-3 ferias/cursos/fondos demo, emprendedores de prueba incluyendo **al menos uno nuevo sin historial** para validar el onboarding). Datos semilla **genéricos, sin nombre de comuna**.
- README: arquitectura, cómo levantar dev, variables de entorno (DB, email, storage, ClaveÚnica, endpoint RAG), mapa de flujos, cómo configurar un nuevo municipio (tenant).
- APIs REST documentadas (las que consumirá MunIA core y el adaptador de IA).
- Tests en lógica crítica: motor de scoring, control de acceso rol × módulo, cálculo de métricas de dashboard, match de fondos.

### Orden de construcción interno (entrega completo, construye en este orden)
1. Modelo de datos multi-tenant + migraciones + seed genérico.
2. Auth (ClaveÚnica + fallback) + roles + control de acceso rol × módulo + gestión de usuarios.
3. Shell de navegación: hub, sidebar contextual, topbar (notificaciones + menú usuario + logout).
4. Registro y portal del emprendedor (auto-inscripción, consentimiento, perfil, ARCO, onboarding del novato).
5. Módulo Ferias completo (formulario híbrido, doble score + perilla, selección, evaluación 3 capas móvil, dashboards).
6. Capa de notificaciones por evento + email + plantillas + centro in-app.
7. Módulo Capacitación.
8. Módulo Fondos (dos puertas, lista por match, ficha con requisitos, asistente IA con adaptador RAG/mock, caras de gestión).
9. Búsqueda/filtros en listados, estados vacíos, confirmaciones en acciones destructivas, pulido responsive.
10. Configuración de tenant (panel para nombre/logo/dominio del municipio).

---

## 12. ANTI-PATRONES (no hacer)

- **NO** hardcodear el nombre de ningún municipio en interfaz o datos. Es configuración (tenant).
- **NO** construir sobre Google Sheets / Apps Script. Es un sistema real.
- **NO** acoplar al BPMN/RAG/ticketing de MunIA core ahora — desacoplado, con APIs propias y adaptadores.
- **NO** auto-registro de funcionarios — los da de alta el administrador.
- **NO** form builder libre — rompe el perfil persistente y el scoring. Núcleo fijo + preguntas configurables de menú acotado.
- **NO** score único plano que mezcle admisión y desempeño — doble score por debajo, número único de cara al emprendedor.
- **NO** convertir el sistema en un club cerrado — el novato (reputación 0) debe poder entrar vía la perilla de propuesta.
- **NO** WhatsApp ni chat bidireccional en el MVP — solo email, arquitectura lista para más.
- **NO** ventas autoreportadas como cifra dura en el ranking — solo señal de participación + dato narrativo.
- **NO** poblar dashboards narrativos con métricas inventadas — se llenan con data real.
- **NO** confiar el control de acceso solo al frontend — rol × módulo validado en cada endpoint.
- **NO** acciones destructivas (rechazar, suspender, eliminar) sin confirmación.
- **NO** taxonomía CIIU/SII de cara al usuario — catálogo de rubros administrable con maestro estándar por debajo para comparabilidad inter-comunal.
- **NO** pantallas vacías mudas — estados vacíos que guían a la acción.

---

**Construye la plataforma completa. Producto, no cliente: el municipio es configuración. Prioriza la usabilidad del emprendedor no técnico y del funcionario apurado. Degrada con gracia. Trazabilidad, gobernanza de accesos y cumplimiento de datos por diseño. Calidad de activo de producto replicable a cientos de municipios, no de prototipo.**

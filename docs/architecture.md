# Scrap & Survive — Architecture Reference

> **Status:** Living document. Updated whenever architectural decisions change.
> **Stack:** Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind 4 · PostgreSQL · Prisma ORM · shadcn/ui
> **Fase actual:** MVP (Fase 0)

---

## 1. Resumen ejecutivo del proyecto

Scrap & Survive es un Idle Extraction RPG 2D para navegador. El jugador equipa a un chatarrero espacial y lo envía a expediciones automáticas. Durante la expedición, el personaje acumula botín con el paso del tiempo real mientras el nivel de peligro crece progresivamente según fórmulas definidas y validadas en servidor. El jugador debe decidir cuándo pulsar "Extraer" antes de que ocurra una catástrofe.

La arquitectura está diseñada como:

- **Server-authoritative por completo**: ninguna decisión económica, de progresión, de loot ni de riesgo ocurre en el cliente.
- **MVP compacto y correcto**: cimientos sólidos, mínima deuda técnica, preparado para crecer por fases sin reescribir el núcleo.
- **Producto primero**: las decisiones técnicas sirven al loop de juego, no al revés.

---

## 2. Objetivos técnicos del MVP

1. Autenticación funcional con sesión persistente (Auth.js + Google OAuth — ver sección 25).
2. Expedición activa única por usuario totalmente server-authoritative.
3. Cálculo de peligro y loot basado en tiempo real de servidor, nunca en tiempo de cliente.
4. Extracción y catástrofe resueltas en transacción atómica idempotente.
5. Inventario relacional persistente.
6. Historial mínimo de runs para retención y percepción de progresión.
7. UI reactiva ligera que consume DTOs del servidor — sin inventar datos localmente.
8. Cero duplicación de lógica de dominio entre cliente y servidor.
9. Base de datos con índices correctos desde el principio.
10. Tipado estricto end-to-end (TypeScript `strict: true`).
11. Gate de progresión por zona (`minLevel`) validado siempre en servidor.
12. Profundidad de build deterministic via configuración de equipo/rareza (sin cálculos autoritativos en cliente).

---

## 3. No-objetivos técnicos del MVP

> **[Decisión MVP]:** Todo lo listado aquí es out-of-scope deliberado, no deuda técnica. La arquitectura los tiene en cuenta pero no los implementa.

- WebSockets o tiempo real push. El cliente hace polling periódico al servidor.
- Microservicios, colas de trabajo distribuidas, CQRS, event sourcing.
- Panel de administración.
- Sistema de notificaciones push.
- PvP, chat, mercado entre jugadores, clanes.
- Múltiples expediciones simultáneas por usuario.
- Multi-character management.
- Crafting profundo, gacha, monetización real.
- Optimizaciones de rendimiento de escala alta (CDN edge, sharding, read replicas).
- Internacionalización.

---

## 4. Principios arquitectónicos

| # | Principio | Implicación práctica |
|---|-----------|---------------------|
| P1 | **Servidor es la única fuente de verdad** | El cliente nunca calcula loot, peligro, ni resultados finales |
| P2 | **Simple antes que complejo** | Si hay dos aproximaciones, elegir la más simple que cumpla el requisito |
| P3 | **Modular antes que monolítica** | Separar domain logic, data access y presentación desde el inicio |
| P4 | **Idempotencia en operaciones críticas** | Extraer, iniciar run, finalizar run: todas idempotentes |
| P5 | **Transacciones donde el dominio lo requiere** | Toda mutación que afecte a economía + inventario va en una sola transacción |
| P6 | **No confiar en nada del cliente** | Timestamps, cooldowns, cálculos: siempre validados en servidor |
| P7 | **Tipado estricto** | `strict: true` en TypeScript. Cero `any` implícitos. Zod en todos los inputs |
| P8 | **Separación de capas explícita** | UI → App Router → Server Actions → Application Services → Domain Services → Repositories → DB |
| P9 | **JSONB solo para metadatos flexibles** | Datos críticos de economía siempre en columnas relacionales tipadas |
| P10 | **Escalado por fases** | Arquitectura preparada para Fase 1+ sin rehacer el núcleo |

---

## 5. Resumen técnico del game loop

```
Usuario autenticado
    │
    ▼
Selecciona zona + equipo (zona puede estar bloqueada por nivel)
    │
    ▼
Server Action: startRun()
    ├── Valida que no hay RunActiva
    ├── Valida que el nivel del usuario cumple `zone.minLevel`
    ├── Captura equipo y configuración de zona
    ├── Persiste ActiveRun con startedAt = now() del servidor
    └── Retorna RunStartedDTO al cliente
    │
    ▼
Cliente muestra estado (polling cada ~5s o manual refresh)
    │
    ▼
Server: getRunState(userId) → RunStateDTO
    ├── Calcula tiempo transcurrido (now_server - startedAt)
    ├── Deriva dangerLevel (fórmula)
    ├── Deriva pendingLoot (fórmula)
    └── NO guarda derivados — son calculados al consultar
    │
    ├── Usuario decide extraer → Server Action: requestExtraction()
    │       ├── Verifica run RUNNING + ownership
    │       ├── Calcula estado final en momento del request
    │       ├── Transacción: transfiere loot, cierra run, registra ledger
    │       └── Retorna ExtractionResultDTO
    │
    └── Catástrofe detectada en poll
            └── Cliente muestra estado crítico; usuario extrae lo que queda
```

**Decisión crítica:** el loot pendiente y el nivel de peligro **no se persisten** entre ticks. Se calculan on-demand usando `startedAt` y las fórmulas del servidor. Solo se persiste el estado de la run y el resultado final.

---

## 6. State machine completa de una expedición

### Estados

| Estado | Descripción |
|--------|-------------|
| `idle` | Sin expedición activa. Usuario puede iniciar una nueva. |
| `running` | Expedición en progreso. Loot y peligro crecen con el tiempo. |
| `extraction_requested` | El usuario pulsó "Extraer". Transición transaccional atómica. Si la transacción falla, vuelve a `running`. |
| `extracted` | Extracción exitosa. Botín transferido. Run cerrada. Terminal. |
| `failed` | Catástrofe ocurrida y run cerrada con penalización. Terminal. |
| `cancelled` | Run cancelada por error del sistema (no disponible como acción de usuario en MVP). Terminal. |

> **[Decisión MVP]:** El estado `preparing` fue suprimido. `startRun` persiste directamente en estado `running`. Si en Fase 1 se añade lógica de pre-run (selección de dificultad, insurance) se añade `preparing` con ADR.

### Transiciones válidas

```
idle → running                    (startRun)
running → extraction_requested    (requestExtraction)
running → failed                  (transacción al detectar catástrofe en requestExtraction o poll)
extraction_requested → extracted  (transacción completada exitosamente)
extraction_requested → running    (rollback de transacción fallida)
extracted → [ActiveRun borrada]   (ExtractionResult almacena el resultado)
failed → [ActiveRun borrada]      (ExtractionResult almacena el resultado)
```

> **Nota de implementación:** los estados `extracted` y `failed` son **conceptuales** — la fila de `ActiveRun` se **elimina** dentro de la transacción que resuelve la run. El estado terminal se almacena en `ExtractionResult.status` (EXTRACTED o FAILED). Tras la transacción, `findActiveRun(userId)` retorna `null` y el usuario está en estado `idle`.

### Transiciones explícitamente prohibidas

- `resolved → running` (cada nueva run crea un nuevo registro)
- `failed → extracted` (no se puede recuperar una run fallida)
- `extracted → failed` (retroactivo imposible)
- Cualquier transición iniciada por el cliente sin pasar por el servidor

### Invariante de running

Mientras el estado es `running`:
- `startedAt` es inmutable
- `zoneId`, `equipmentSnapshot`, `dangerConfig` son inmutables
- Todos los valores derivados (loot, dangerLevel) se calculan al consultar
- La run pertenece a exactamente un usuario

### Lifecycle de catástrofe — especificación exacta

Este es el comportamiento que el sistema garantiza en todos los escenarios de catástrofe:

**¿Cuándo permanece en `RUNNING`?**
- Siempre que `dangerLevel < dangerConfig.catastropheThreshold` al momento del cálculo en servidor.
- El polling del cliente puede mostrar advertencias visuales (barra roja pulsando), pero el estado en DB sigue siendo `RUNNING` hasta que `requestExtraction` lo evalúa.
- **Una run nunca pasa a `FAILED` por el polling.** Solo una mutación puede cambiar el estado.

**¿Cuándo pasa a `FAILED`?**
- Exactamente cuando `requestExtraction` es procesado en servidor Y `dangerLevel >= catastropheThreshold` en ese momento.
- La transición `RUNNING → FAILED` ocurre **solo dentro de la transacción de `requestExtraction`**, nunca como efecto secundario de un poll.
- No hay ningún job ni proceso que marque runs como `FAILED` en segundo plano (en MVP).

**¿Puede el usuario rescatar loot tras la catástrofe?**
- Sí. Si `getRunState` devuelve `status: "catastrophe"` en el poll, el jugador **aún puede pulsar "Extraer"**.
- `requestExtraction` aceptará la llamada siempre que el status en DB sea `RUNNING`.
- Al procesar, la catástrofe es detectada (`isCatastrophe = true`) y se aplica la penalización: 20% del loot, 0 créditos, 25% XP.
- El resultado será un `ExtractionResultDTO` con `catastropheOccurred: true` y `status: "failed"`.

**¿Qué devuelve `getRunState()` cuando hay catástrofe?**
```typescript
// Si dangerLevel >= catastropheThreshold al calcular:
RunStateDTO {
  status: "catastrophe",  // no "failed" — la run aún está en DB como RUNNING
  runId: "...",
  dangerLevel: 1.05,      // puede superar 1.0
  pendingLoot: [...],     // loot al 20% (con penalización aplicada para mostrar al usuario)
  elapsedSeconds: ...
}
// La UI muestra estado de emergencia. El botón "Extraer" sigue activo.
```

**¿Cómo impacta en `requestExtraction()`?**
- El servidor no distingue "extracción normal" de "extracción post-catástrofe" externamente.
- La diferencia es interna: si `isCatastrophe = true`, se aplica `applyCatastrophePenalty(pendingLoot)`.
- El `ExtractionResult.status` será `FAILED` y `catastropheOccurred = true`.
- Desde el punto de vista del servidor, **siempre es una sola llamada a `requestExtraction`** — no existe una API separada para catástrofe.
- **Invariante:** una vez que la transacción de `requestExtraction` completa, el status de `ActiveRun` es irreversiblemente `EXTRACTED` o `FAILED`. No hay forma de revertir esto.

---

## 7. Invariantes de dominio

Estas reglas **nunca pueden violarse**. Si alguna se viola, es un bug crítico.

1. **Un usuario solo puede tener una ActiveRun en estado `running` o `extraction_requested`.** Garantizado por `ActiveRun.userId @unique` en DB.
2. **`startedAt` siempre proviene del servidor** — `new Date()` en el action, nunca del cliente.
3. **El inventario solo puede ser modificado por server actions dentro de transacciones.**
4. **El ledger de monedas es append-only.** Nunca se hacen updates a entradas existentes.
5. **Una extracción solo puede ocurrir una vez por run.** El status actúa como guard idempotente.
6. **El loot de una run solo se transfiere al inventario en la transacción que simultáneamente cierra la run.**
7. **El equipo se captura como snapshot al iniciar la run.** Cambios posteriores no afectan la run activa.
8. **La resolución de catástrofe usa `startedAt` del servidor.** Ningún valor del cliente participa en el cálculo.
9. **Los campos de economía son enteros.** Nunca floats sin control para cantidades de items o créditos.
10. **Toda operación sobre un recurso verifica ownership** antes de actuar.
11. **Las zonas con `minLevel` solo pueden iniciarse si `userProgression.currentLevel` cumple el gate.**
12. **Los modificadores de build (loot/currency/xp) son determinísticos y tienen caps explícitos.**

---

## 7b. Estado de contenido D.1 + D.2 + D.3 low-churn (actual)

- Zonas activas por config:
  - `shipyard_cemetery` (minLevel 1)
  - `orbital_derelict` (minLevel 4)
  - `abyssal_fracture` (minLevel 8)
- `startRun` aplica el gate por nivel en servicio de servidor antes de persistir `ActiveRun`.
- `dangerConfig` sigue snapshotteado en `ActiveRun` al inicio (inmutable durante la run).
- El modelo de resultado de equipo ahora incluye `xpMultiplier` (config de ítem + bonus por rareza), con límites explícitos en dominio.
- D.2 activo: `runMode` SAFE/HARD snapshotteado en `dangerConfig` y aplicado en reward profile server-side.
- D.3.1 activo: resolución de sinergias/arquetipo por configuración (`build-synergies.config.ts`) con caps explícitos aplicados en calculador de run.
- D.3.2 activo (persistente): evento activo + directivas semanales con progreso persistido por semana y claim atómico/idempotente.
- D.3.3 activo: analytics de jugador derivadas de `ExtractionResult` + `AuditLog(run.start)` para mix SAFE/HARD.

---

## 8. Modelo de autoridad cliente/servidor

| Qué | Cliente | Servidor |
|-----|---------|----------|
| UI state (modals, hover, animaciones) | ✅ Autoridad total | No involucrado |
| Timer visual de la expedición | ✅ Estimación local basada en `startedAt` devuelto por servidor | Fuente de verdad en cada poll |
| Nivel de peligro mostrado | Interpolación visual entre polls | ✅ Cálculo real en cada request |
| Loot mostrado | Estimación visual entre polls | ✅ Cálculo real en cada request |
| Iniciar expedición | Dispara Server Action | ✅ Valida y persiste |
| Extraer botín | Dispara Server Action | ✅ Calcula, transfiere, cierra en transacción |
| Detectar catástrofe | Ve el resultado en el poll | ✅ Detecta en requestExtraction |
| Inventario actual | Solo visualiza el DTO recibido | ✅ Fuente de verdad |
| Progresión del jugador | Solo visualiza el DTO recibido | ✅ Fuente de verdad |

**Regla de oro:** el cliente puede estimar para mejorar la percepción visual, pero el servidor siempre ignora esas estimaciones y recalcula con sus propios datos.

---

## 9. Responsabilidades por capa

Esta es la cadena de dependencias unidireccional:

```
UI (Client/Server Components)
    │ dispara actions, consume DTOs
    ▼
Server Actions  (/server/actions/)
    │ orquesta, no tiene lógica de dominio
    ▼
Application Services  (/server/services/)
    │ orquestación cross-domain, coordina múltiples domain services
    ▼
Domain Services  (/server/domain/**/*.service.ts)
    │ lógica de negocio pura
    ▼
Repositories  (/server/repositories/)
    │ acceso a datos, devuelven Domain Types (no Prisma types)
    ▼
DB (PostgreSQL via Prisma)
```

### UI Layer (`/app`, `/components`)
- Renderizar DTOs recibidos del servidor
- Gestionar estado de UI local (modals, loading, hover)
- Timer visual estimado (nunca autoritativo)
- Disparar Server Actions en respuesta a eventos de usuario
- **No calcula nada de economía, peligro, loot ni progresión**
- Los Server Components **prefieren llamar a Application Services** (`/server/services/`) para lectura — estos son los read-model loaders diseñados para componer la UI.
- Importar un Domain Service directamente desde una página solo es aceptable si la operación es de un único dominio Y no existe un Application Service que la cubra. Si lo haces, deja un comentario que lo justifique.
- Los Client Components reciben datos exclusivamente como props — nunca acceden a ninguna función de `/server/`.
- **Los archivos bajo `/server/` deben importar `server-only`** (paquete de Next.js) en su primera línea para garantizar que TypeScript falle si son importados accidentalmente desde código cliente. Ver sección 9b.

### Server Actions (`/server/actions/`)
- Único punto de entrada para mutaciones desde la UI
- Valida input con Zod antes de cualquier otra operación
- Verifica autenticación y ownership
- **Delega inmediatamente a Application Services o Domain Services — cero lógica de dominio propia**
- Devuelve `ActionResult<DTO>` — nunca tipos de Prisma crudos
- Llama `revalidatePath` tras mutaciones exitosas
- Registra en AuditLog

### Application Services (`/server/services/`)
- Orquestación cross-domain que require coordinar múltiples Domain Services
- Inician y coordinan transacciones de DB complejas
- Ejemplos: `RunResolutionService` (coordina run + inventory + economy al extraer), `PlayerStateService` (agrega datos de múltiples dominios para la UI)
- **No contienen cálculos de dominio propios** — delegan a Domain Services
- **No acceden a Prisma directamente** — usan Repositories

### Domain Services (`/server/domain/**/*.service.ts`)
- Lógica de negocio pura de un dominio específico
- Singleton por dominio: `RunService`, `InventoryService`, `EconomyService`
- **Sin dependencias de Next.js, Auth, Prisma, ni HTTP** — son funciones puras o con interfaces inyectadas
- Los cálculos puros (sin side effects) van en `*.calculator.ts` adyacente
- Pueden llamar a su propio Repository pero no a Application Services

### Repositories (`/server/repositories/`)
- Único acceso a PrismaClient
- Reciben e interpretan tipos de Prisma, devuelven **Domain Types** definidos en `/types/game.types.ts`
- No contienen lógica de negocio ni cálculos de dominio
- Reciben el cliente `tx` de transacción cuando se ejecutan dentro de una transacción
- **Nunca devuelven tipos de Prisma al exterior** — siempre mapear a Domain Types antes de retornar

### Database (PostgreSQL via Prisma)
- Fuente de verdad persistente
- Índices definidos desde el inicio
- Constraints de integridad referencial
- Enums en Prisma schema
- `timestamptz` para todos los campos de tiempo

---

## 10. Estructura de carpetas exacta

```
/
├── app/                                   # Next.js App Router
│   ├── (marketing)/                       # Grupo: páginas públicas
│   │   ├── layout.tsx                     # Layout público (minimal)
│   │   └── page.tsx                       # Landing page
│   │
│   ├── (game)/                            # Grupo: app autenticada
│   │   ├── layout.tsx                     # Layout del juego (auth guard, HUD base)
│   │   ├── dashboard/
│   │   │   └── page.tsx                   # Vista principal: estado del chatarrero + expedición
│   │   ├── expedition/
│   │   │   └── page.tsx                   # Vista de expedición activa
│   │   ├── inventory/
│   │   │   └── page.tsx                   # Inventario del jugador
│   │   └── history/
│   │       ├── page.tsx                   # Historial de runs (lista)
│   │       └── [runId]/
│   │           └── page.tsx               # Detalle de run histórica
│   │
│   ├── api/                               # Route Handlers — SOLO casos justificados
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts              # Auth.js callback
│   │
│   ├── layout.tsx                         # Root layout (fonts, AuthProvider)
│   ├── globals.css                        # Design tokens + estilos globales
│   └── not-found.tsx                      # 404 global
│
├── components/
│   ├── ui/                                # shadcn/ui (solo los instalados)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── progress.tsx
│   │   ├── separator.tsx
│   │   ├── dialog.tsx
│   │   ├── tooltip.tsx
│   │   └── skeleton.tsx
│   │
│   ├── game/                              # Componentes del dominio del juego
│   │   ├── ExpeditionPanel.tsx            # Panel principal de expedición activa (Client)
│   │   ├── DangerMeter.tsx                # Barra de peligro visual (Client)
│   │   ├── LootPreview.tsx                # Botín estimado en tiempo real (Client)
│   │   ├── ExtractButton.tsx              # Botón de extracción con estado (Client)
│   │   ├── InventoryGrid.tsx              # Grid de inventario (Server)
│   │   ├── InventorySlot.tsx              # Slot individual (Server o Client según interactividad)
│   │   ├── ItemTooltip.tsx                # Tooltip de item (Client)
│   │   ├── RunHistoryCard.tsx             # Card de historial (Server)
│   │   ├── RunSummaryPanel.tsx            # Resumen post-run (Client — muestra resultado)
│   │   ├── ResourceBar.tsx                # Barra de recursos/monedas (Server)
│   │   ├── StatBlock.tsx                  # Bloque de stats del chatarrero (Server)
│   │   └── ZoneSelector.tsx              # Selector de zona (Client — interactivo)
│   │
│   └── layout/
│       ├── GameShell.tsx                  # Shell principal del juego (Server)
│       ├── Sidebar.tsx                    # Navegación lateral (Server)
│       ├── TopBar.tsx                     # Barra superior con recursos y sesión (Server)
│       └── PageContainer.tsx             # Wrapper de contenido (Server)
│
├── server/                                # Código server-only estricto
│   ├── actions/                           # Server Actions — entry point de mutaciones
│   │   ├── run.actions.ts                 # startRun, requestExtraction
│   │   ├── inventory.actions.ts           # equipItem, unequipItem
│   │   └── user.actions.ts              # updateProfile
│   │
│   ├── auth/                              # Autenticación
│   │   ├── auth.ts                        # Configuración de Auth.js (Google OAuth)
│   │   ├── session.ts                     # getServerSession(), getCurrentUserId()
│   │   └── guards.ts                      # requireAuth(), requireOwnership()
│   │
│   ├── db/
│   │   ├── client.ts                      # Singleton de PrismaClient
│   │   └── transaction.ts                # withTransaction<T>(fn) — wrapper tipado
│   │
│   ├── domain/                            # Lógica de negocio pura por dominio
│   │   ├── run/
│   │   │   ├── run.service.ts             # startRun(), canExtract(), applyExtraction()
│   │   │   ├── run.calculator.ts          # computeDangerLevel(), computePendingLoot() — puras
│   │   │   ├── run.types.ts               # Domain types: RunDomain, PendingLoot, DangerState
│   │   │   └── run.constants.ts           # DANGER_*, LOOT_*, CATASTROPHE_* constants
│   │   │
│   │   ├── inventory/
│   │   │   ├── inventory.service.ts       # addItem(), removeItem(), getInventory()
│   │   │   └── inventory.types.ts         # InventoryItemDomain, EquipmentDomain
│   │   │
│   │   └── economy/
│   │       ├── economy.service.ts         # creditCurrency(), debitCurrency(), getBalance()
│   │       ├── economy.types.ts           # LedgerEntryDomain, BalanceDomain
│   │       └── economy.constants.ts       # CURRENCY_NAME, CATASTROPHE_RECOVERY_RATE, etc.
│   │
│   ├── repositories/                      # Acceso a datos — devuelven Domain Types
│   │   ├── run.repository.ts              # findActiveRun(), createRun(), closeRun()
│   │   ├── inventory.repository.ts        # upsertInventoryItem(), getInventoryByUser()
│   │   ├── user.repository.ts             # getUser(), getUserProfile()
│   │   ├── economy.repository.ts          # createLedgerEntry(), getCurrentBalance()
│   │   ├── extraction-result.repository.ts # createExtractionResult(), getRunHistory()
│   │   └── item-definition.repository.ts  # getItemDef(), getAllItemDefs()
│   │
│   └── services/                          # Application Services — orquestación cross-domain
│       ├── run-resolution.service.ts      # resolveExtraction() — orquesta run + inventory + economy
│       └── player-state.service.ts        # getPlayerState() — agrega datos para la dashboard
│
├── lib/
│   ├── utils/
│   │   ├── math.ts                        # round(), clamp(), discretize()
│   │   ├── time.ts                        # formatDuration(), elapsed()
│   │   └── cn.ts                          # className utility (clsx + twMerge)
│   │
│   └── validators/
│       ├── run.validators.ts              # StartRunSchema, RequestExtractionSchema
│       ├── inventory.validators.ts        # EquipItemSchema
│       └── user.validators.ts             # UpdateProfileSchema
│
├── types/
│   ├── game.types.ts                      # Domain Types públicos (RunStatus, ItemRarity, etc.)
│   ├── dto.types.ts                       # DTOs / View Models para la UI (ver sección 10b)
│   ├── api.types.ts                       # ActionResult<T>, ErrorCode
│   └── next.types.ts                      # Extensiones de tipos de Next.js
│
├── hooks/
│   ├── useRunPolling.ts                   # Polling periódico de RunStateDTO
│   ├── useCountdown.ts                    # Timer visual local (no autoritativo)
│   └── useServerAction.ts                # Wrapper con loading/error/success para Server Actions
│
├── config/
│   ├── game.config.ts                     # ZoneConfig[], parámetros de fórmulas, límites
│   └── site.config.ts                     # Nombre del sitio, URLs base, metadata
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── docs/
│   ├── architecture.md                    # Este archivo
│   ├── game-design.md
│   └── decisions/                         # ADRs
│       ├── 001-server-authority.md
│       └── 002-auth-provider.md
│
├── public/
│   └── images/
│
├── AGENTS.md
├── next.config.ts
├── tsconfig.json
└── package.json
```

### Reglas absolutas de ubicación

- `/app/*` — sin lógica de negocio, sin acceso a DB, sin cálculos de dominio. Solo composición y routing.
- `/components/*` — sin `import { db }`, sin Server Actions, sin tipos de Prisma.
- `/server/domain/*` — sin `import 'next/...'`, sin `import 'next-auth'`, sin PrismaClient directo.
- `/server/repositories/*` — única capa que toca PrismaClient. Solo ella.
- `/lib/*` — isomórfico. Sin `'use server'`, sin DB, sin auth.
- `/hooks/*` — solo client-side. Sin lógica de dominio.
- `/types/*` — solo tipos. Cero lógica ejecutable.
- `/config/*` — solo configuración estática. Cero lógica de negocio.

### Sobre la separación Domain Services vs Application Services

**Domain Services** (`/server/domain/**/*.service.ts`): lógica de negocio pura de un solo dominio. Sin transacciones multi-tabla. Sin coordinación entre servicios. Ejemplos: `RunService.canExtract()`, `EconomyService.creditCurrency()`.

**Application Services** (`/server/services/`): orquestación de múltiples Domain Services con una transacción que los involucra a todos. Solo existen cuando la operación es inherentemente cross-domain. Ejemplo: `RunResolutionService.resolveExtraction()` (coordina `RunService` + `InventoryService` + `EconomyService` en una sola transacción).

**Server Actions** (`/server/actions/`): entrada HTTP. Validan, autentican, delegan. Cero lógica de dominio propia.

**Regla de decisión**: ¿la operación involucra más de un domain service? → Application Service. ¿Solo uno? → el Domain Service directamente.

---

## 9b. Reglas de `server-only` y `client-only`

Next.js proporciona dos paquetes de marcado que causan errores de build si los límites se cruzan:

### `server-only` — qué archivos deben usarlo

Todo archivo que **nunca debe ejecutarse en el cliente** debe añadir en su primera línea:
```typescript
import 'server-only';
```

Esto aplica obligatoriamente a:
- Todos los archivos bajo `/server/` (actions, domain, services, repositories, auth, db)
- Los loaders de datos que leen de DB directamente desde Server Components

Si un Client Component importa accidentalmente cualquiera de estos archivos, el build falla inmediatamente con un error claro.

### `client-only` — qué archivos deben usarlo

Todo archivo que **solo puede ejecutarse en el navegador** debe añadir en su primera línea:
```typescript
import 'client-only';
```

Esto aplica a:
- Hooks que usan `window`, `document`, `navigator`, o APIs del browser
- Wrappers de librerías que solo funcionan en el browser (canvas, audio, etc.)

### Reglas de ubicación relacionadas

- `/server/*` → siempre `import 'server-only'` en la primera línea de cada archivo.
- `/hooks/*` → siempre `import 'client-only'` en la primera línea si el hook usa APIs de browser.
- `/lib/*` → isomórfico por defecto. Si un archivo en `/lib/` necesita server-only o client-only, moverlo a la carpeta correspondiente.
- **No compartir módulos ambiguos** entre server y cliente sin marcarlos explícitamente.

### Cómo instalar los paquetes

```bash
npm install server-only client-only
```

Ambos están mantenidos por el equipo de Next.js y no añaden overhead de runtime — son exclusivamente herramientas de tiempo de build.

---

## 10b. DTOs, View Models y Read Models

> Los tipos de Prisma **nunca salen de los Repositories**. Los tipos de dominio **nunca salen de `/server/`**. La UI siempre consume DTOs definidos en `/types/dto.types.ts`.

### Qué es un DTO en este contexto

Un DTO (Data Transfer Object) es una interfaz TypeScript en `/types/dto.types.ts` que representa exactamente lo que la UI necesita renderizar. No expone IDs internos innecesarios, no incluye campos de auditoría, y no incluye tipos de Prisma ni tipos de dominio interno.

### DTOs del MVP

```typescript
// /types/dto.types.ts

/** Estado de la expedición activa — resultado del poll */
export interface RunStateDTO {
  status: "idle" | "running" | "catastrophe";
  runId?: string;
  zoneId?: string;
  startedAt?: string;           // ISO string — el cliente lo parsea para el timer visual
  dangerLevel?: number;          // 0.0 – 1.0+ — calculado en servidor
  catastropheThreshold?: number; // para que la UI sepa dónde poner la línea roja
  pendingLoot?: PendingLootDTO[];
  elapsedSeconds?: number;       // calculado al momento del poll
}

/** Item de loot pendiente estimado */
export interface PendingLootDTO {
  itemId: string;
  displayName: string;
  iconKey: string;
  quantity: number;  // entero — aproximado en poll, definitivo al extraer
  rarity: ItemRarityDTO;
}

/** Resultado de una extracción o catástrofe */
export interface ExtractionResultDTO {
  runId: string;
  status: "extracted" | "failed";
  durationSeconds: number;
  dangerLevelAtClose: number;
  catastropheOccurred: boolean;
  loot: PendingLootDTO[];
  currencyEarned: number;
  xpEarned: number;
}

/** Item del inventario para la UI */
export interface InventoryItemDTO {
  itemId: string;
  itemDefinitionId: string;
  displayName: string;
  description: string;
  rarity: ItemRarityDTO;
  iconKey: string;
  quantity: number;
  baseValue: number;
  isEquipable: boolean;
}

/** Estado completo del jugador para la dashboard */
export interface PlayerStateDTO {
  userId: string;
  displayName: string;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  currencyBalance: number;
  equipment: EquipmentDTO;
  activeRun: RunStateDTO | null;
}

/** Equipo del chatarrero */
export interface EquipmentDTO {
  HEAD: InventoryItemDTO | null;
  BODY: InventoryItemDTO | null;
  HANDS: InventoryItemDTO | null;
  TOOL_PRIMARY: InventoryItemDTO | null;
  TOOL_SECONDARY: InventoryItemDTO | null;
  BACKPACK: InventoryItemDTO | null;
}

/** Card del historial de runs */
export interface RunHistoryCardDTO {
  runId: string;
  zoneId: string;
  status: "extracted" | "failed";
  startedAt: string;
  durationSeconds: number;
  currencyEarned: number;
  catastropheOccurred: boolean;
}

export type ItemRarityDTO = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
```

### Flujo de transformación completo

```
PrismaResult (en Repository)
    │
    ▼ mapeo en Repository (función toXxxDomain)
DomainType (en /types/game.types.ts)
    │
    ▼ mapeo en Application Service o Server Action (función toXxxDTO)
DTO (en /types/dto.types.ts)
    │
    ▼ props hacia componente Server o Client
UI Component
```

### Reglas de mapeo

- Los mapeos `toXxxDomain` viven al final del fichero `.repository.ts` correspondiente.
- Los mapeos `toXxxDTO` viven en el Application Service o Server Action que construye la respuesta.
- Nunca hacer el mapeo dentro del componente React.
- Los DTOs son interfaces planas — sin métodos, sin lógica.
- Los DTOs usan `string` para fechas (ISO 8601), nunca `Date` object en el boundary cliente/servidor.

---

## 11. Convenciones de naming y organización

### Archivos
- `kebab-case` para archivos y carpetas, sin excepción.
- Sufijos explícitos: `.service.ts`, `.repository.ts`, `.actions.ts`, `.types.ts`, `.constants.ts`, `.validators.ts`, `.config.ts`, `.calculator.ts`.
- Componentes React: `PascalCase.tsx`.
- Hooks: `useCamelCase.ts`.

### Variables y funciones
- `camelCase` para funciones y variables.
- `PascalCase` para tipos, interfaces y enums.
- `UPPER_SNAKE_CASE` para constantes en `.constants.ts` y `.config.ts`.
- Prefijo `get` para lectura pura, `create`/`update`/`delete` para mutaciones, `compute` para cálculos derivados, `to` para mapeos (toDomain, toDTO).

### Server Actions
- Siempre en `/server/actions/*.actions.ts`.
- `'use server'` en la primera línea del archivo (nivel de módulo, no función).
- Naming: verbo + sustantivo: `startRun`, `requestExtraction`, `equipItem`.
- Devuelven `Promise<ActionResult<DTO>>` — nunca tipos de Prisma ni de dominio.

### Tipos
- Domain Types en `/types/game.types.ts`.
- DTOs en `/types/dto.types.ts`.
- Tipos de API en `/types/api.types.ts`.
- Tipos de Prisma solo dentro de `/server/repositories/`.

### Enumerados
- Definidos en Prisma schema cuando son persistidos.
- Re-exportados en `/types/game.types.ts` como `as const` para uso compartido.
- Los DTOs usan string literals equivalentes, no los enums de Prisma.

---

## 12. Modelo de datos inicial

> El schema de Prisma actúa como fuente de verdad. Este documento lo describe conceptualmente.

### Enums

```prisma
enum RunStatus {
  RUNNING
  EXTRACTION_REQUESTED
  EXTRACTED
  FAILED
  CANCELLED
}

enum ItemRarity {
  COMMON
  UNCOMMON
  RARE
  EPIC
  LEGENDARY
}

enum LedgerEntryType {
  EXTRACTION_REWARD
  CATASTROPHE_PENALTY
  PURCHASE
  SALE
  ADMIN_ADJUSTMENT
}

enum EquipmentSlot {
  HEAD
  BODY
  HANDS
  TOOL_PRIMARY
  TOOL_SECONDARY
  BACKPACK
}

enum WeeklyDirectiveStatus {
  IN_PROGRESS
  CLAIMABLE
  CLAIMED
}
```

### Modelos

#### `User`
```
id            String    @id @default(cuid())
email         String    @unique
emailVerified DateTime?
name          String?
image         String?
createdAt     DateTime  @default(now())
updatedAt     DateTime  @updatedAt

→ UserProfile (1:1)
→ ActiveRun (0:1, @unique)
→ InventoryItem[]
→ EquipmentSlot[]
→ CurrencyLedger[]
→ ExtractionResult[]
→ UserProgression (1:1)
→ AuditLog[]
```

#### `UserProfile`
```
id           String   @id @default(cuid())
userId       String   @unique
displayName  String
createdAt    DateTime @default(now())
updatedAt    DateTime @updatedAt

@@index([userId])
```

**Justificación:** Separado de User para no mezclar datos de auth con datos de juego. `scrapperLevel` vive en `UserProgression`, no aquí. El perfil es solo display name y metadata pública.

#### `ItemDefinition`
```
id           String     @id @default(cuid())
internalKey  String     @unique       // "scrap_iron", "corrupted_cell"
displayName  String
description  String?
rarity       ItemRarity
baseValue    Int
stackable    Boolean    @default(true)
maxStack     Int        @default(999)
iconKey      String
metadata     Json?      // JSONB: efectos especiales, tags — nunca economía
createdAt    DateTime   @default(now())
updatedAt    DateTime   @updatedAt

@@unique([internalKey])
@@index([rarity])
```

#### `InventoryItem`
```
id               String   @id @default(cuid())
userId           String
itemDefinitionId String
quantity         Int      @default(1)
acquiredAt       DateTime @default(now())
updatedAt        DateTime @updatedAt

@@unique([userId, itemDefinitionId])
@@index([userId])
```

#### `EquipmentSlot`
```
id               String        @id @default(cuid())
userId           String
slot             EquipmentSlot
itemDefinitionId String?       // null = slot vacío
equippedAt       DateTime?
updatedAt        DateTime      @updatedAt

@@unique([userId, slot])
@@index([userId])
```

#### `ActiveRun`
```
id                   String    @id @default(cuid())
userId               String    @unique  // solo 1 run activa por usuario
status               RunStatus @default(RUNNING)
zoneId               String
startedAt            DateTime             // siempre now() del servidor
equipmentSnapshot    Json                 // JSONB: copia inmutable del equipo al inicio
dangerConfig         Json                 // JSONB: parámetros de zona snapshotteados
dangerTriggeredAt    DateTime?
extractionRequestAt  DateTime?
resolvedAt           DateTime?
createdAt            DateTime  @default(now())
updatedAt            DateTime  @updatedAt

@@unique([userId])
@@index([status])
```

**Justificación de JSONB:**
- `equipmentSnapshot`: copia histórica inmutable — no es economía viva, no se consulta por valor.
- `dangerConfig`: parámetros de la zona en el momento de inicio — garantiza determinismo de la run.
- Ningún campo de cantidad, monedas ni economía activa va en JSONB.

**Lifecycle:** la fila de `ActiveRun` se **elimina** al resolverse la run (ver sección 13). El `status` field en la práctica solo será `RUNNING` en MVP. Los campos `resolvedAt` y `status` se mantienen en el schema como safety net defensivo y para potencial uso en Fase 1 (ej: `preparing` state), pero no contendrán datos terminales — esos viven en `ExtractionResult`.

#### `ExtractionResult`
```
id                  String    @id @default(cuid())
userId              String
runId               String    @unique
zoneId              String
status              RunStatus  // EXTRACTED | FAILED
startedAt           DateTime
resolvedAt          DateTime
durationSeconds     Int
dangerLevelAtClose  Float
lootSnapshot        Json       // JSONB: [{itemId, quantity}] — registro inmutable
currencyEarned      Int
xpEarned            Int
catastropheOccurred Boolean    @default(false)
createdAt           DateTime   @default(now())

@@index([userId])
@@index([userId, createdAt(sort: Desc)])
```

#### `CurrencyLedger`
```
id           String          @id @default(cuid())
userId       String
entryType    LedgerEntryType
amount       Int             // positivo = ingreso, negativo = gasto
balanceAfter Int             // balance acumulado tras esta entrada
referenceId  String?         // runId, purchaseId, etc.
createdAt    DateTime        @default(now())

@@index([userId])
@@index([userId, createdAt(sort: Desc)])
@@index([referenceId])
```

#### `UserProgression`
```
id                    String  @id @default(cuid())
userId                String  @unique
currentXp             Int     @default(0)
currentLevel          Int     @default(1)
totalScrapCollected   Int     @default(0)
bestRunDurationSec    Int?
highestDangerSurvived Float?
updatedAt             DateTime @updatedAt

@@unique([userId])
```

#### `AuditLog`
```
id        String   @id @default(cuid())
userId    String?
action    String   // "run.start", "run.extract", "inventory.equip"
payload   Json
ipAddress String?
createdAt DateTime @default(now())

@@index([userId])
@@index([action])
@@index([createdAt(sort: Desc)])
```

#### `WeeklyDirectiveProgress`
```
id               String                @id @default(cuid())
userId           String
directiveKey     String
weekStart        DateTime              // lunes UTC 00:00 para la semana activa
target           Int
progress         Int                   @default(0)
status           WeeklyDirectiveStatus @default(IN_PROGRESS)
rewardCC         Int
rewardXP         Int
claimedAt        DateTime?
claimReferenceId String?
createdAt        DateTime              @default(now())
updatedAt        DateTime              @updatedAt

@@unique([userId, directiveKey, weekStart])
@@index([userId, weekStart])
@@index([userId, weekStart, status])
```

### Índices críticos

| Tabla | Índice | Por qué |
|-------|--------|---------|
| `User` | `email` unique | Lookup de auth |
| `ActiveRun` | `userId` unique | Invariante de 1 run activa + lookup |
| `ActiveRun` | `status` | Queries administrativas / cleanup |
| `InventoryItem` | `(userId, itemDefinitionId)` unique | Upsert de items stackables |
| `InventoryItem` | `userId` | Listar inventario |
| `CurrencyLedger` | `(userId, createdAt DESC)` | Balance O(1) + historial |
| `ExtractionResult` | `(userId, createdAt DESC)` | Historial de runs |
| `WeeklyDirectiveProgress` | `(userId, directiveKey, weekStart)` unique | Unicidad por usuario/directiva/semana e idempotencia de claim |
| `WeeklyDirectiveProgress` | `(userId, weekStart, status)` | Panel semanal por estado (`IN_PROGRESS/CLAIMABLE/CLAIMED`) |
| `AuditLog` | `(userId, action, createdAt)` | Debugging |

---

## 12b. Read Paths y Write Paths del MVP

Esta sección resume todos los flujos de datos del MVP, separados por dirección.

### Write Paths (mutaciones)

Todo write path sigue el mismo patrón: **Client → Server Action → Application/Domain Service → Repository → DB → revalidatePath**.

| Operación | Capas involucradas | Transacción |
|-----------|-------------------|-------------|
| `startRun(zoneId)` | `run.actions` → `RunResolutionService` → `RunRepository` + `AuditLogRepository` | Sí |
| `requestExtraction(runId)` | `run.actions` → `RunResolutionService` → `RunRepository` + `InventoryRepository` + `EconomyRepository` + `ExtractionResultRepository` + `UserProgressionRepository` + `AuditLogRepository` | Sí (compleja) |
| `equipItem(slot, itemId)` | `inventory.actions` → `InventoryService` → `EquipmentSlotRepository` + `AuditLogRepository` | Sí |
| `unequipItem(slot)` | `inventory.actions` → `InventoryService` → `EquipmentSlotRepository` + `AuditLogRepository` | Sí |
| `claimWeeklyDirective(directiveKey, weekStart)` | `liveops.actions` → `WeeklyGoalsService` → `WeeklyDirectiveProgress` + `CurrencyLedger` + `UserProgression` + `AuditLog` | Sí |
| Login (1er usuario) | `Auth.js signIn callback` → `UserRepository` + `UserProfileRepository` + `UserProgressionRepository` + `EconomyRepository` | Sí |

**Regla:** ningún write path toca la DB sin pasar por un Repository. Ningún write path omite el AuditLog en acciones sensibles.

### Read Paths (lecturas)

Todo read path es side-effect free. No escribe nada. Seguro para polling, concurrent requests y caché.

| Función | Iniciada desde | Frecuencia | Capas |
|---------|---------------|----------|-------|
| `getPlayerState(userId)` | Server Component en `/dashboard` | Por render RSC | `PlayerStateService` → múltiples repositories |
| `getRunState(userId)` | `useRunPolling` hook (Client) | Cada ~5s | `PlayerStateService.getRunState` → `RunRepository` → `RunCalculator` |
| `getInventory(userId)` | Server Component en `/inventory` | Por render RSC | `InventoryRepository` |
| `getRunHistory(userId)` | Server Component en `/history` | Por render RSC | `ExtractionResultRepository` |

**Invariante de read paths:** `getRunState` nunca modifica la DB. Si detecta `dangerLevel >= threshold`, devuelve `status: "catastrophe"` en el DTO pero **no** escribe ni cambia el status de `ActiveRun`. Solo `requestExtraction` puede hacer eso.

---

## 13. Flujos críticos del servidor

### Iniciar expedición: `startRun(userId, zoneId)`

```
Server Action: run.actions.ts / startRun()
  1. Zod: validar { zoneId }
  2. Auth: requireAuth() → userId
  3. Delegar: RunResolutionService.startRun(userId, zoneId)

Application Service: run-resolution.service.ts
  1. Verificar que no existe ActiveRun para userId (RunRepository.findActiveRun)
     └── Si existe: throw DomainError("RUN_ALREADY_ACTIVE")
  2. Obtener equipo actual (InventoryRepository.getEquipmentByUser)
  3. Obtener dangerConfig de zona (config/game.config.ts — no DB)
  4. RunRepository.createRun({ userId, zoneId, startedAt: new Date(), equipmentSnapshot, dangerConfig })
  5. AuditLog.create({ userId, action: "run.start", payload: { runId, zoneId } })
  6. Retornar: RunStartedDTO

Server Action: mapear resultado a ActionResult<RunStartedDTO>, revalidatePath
```

### Consultar estado de expedición: `getRunState(userId)`

```
Puede llamarse desde Server Component directamente (no es mutación):
  1. RunRepository.findActiveRun(userId)
     └── Si no existe: retornar RunStateDTO { status: "idle" }
  2. elapsedSeconds = (Date.now() - run.startedAt) / 1000
  3. dangerLevel = RunCalculator.computeDangerLevel(elapsedSeconds, run.dangerConfig)
  4. pendingLoot = RunCalculator.computePendingLoot(elapsedSeconds, run.equipmentSnapshot, dangerLevel)
  5. catastrophe = dangerLevel >= run.dangerConfig.catastropheThreshold
  6. Retornar RunStateDTO — sin escribir a DB
```

**Esta función solo lee y calcula. No escribe. Es segura para polling frecuente y para múltiples llamadas concurrentes del mismo usuario.**

### Resolver extracción: `requestExtraction(userId, runId)`

```
Server Action: run.actions.ts / requestExtraction()
  1. Zod: validar { runId }
  2. Auth: requireAuth() → userId
  3. Delegar: RunResolutionService.resolveExtraction(userId, runId)

Application Service: run-resolution.service.ts
  1. RunRepository.findActiveRun(userId)
     └── Verificar run.id === runId (ownership)
     └── Verificar run.status === RUNNING
     └── Si no: throw DomainError("RUN_NOT_RUNNING")
  2. En prisma.$transaction(async (tx) => {
     a. Calcular estado final: elapsedSeconds, dangerLevel, isCatastrophe, finalLoot
     b. finalLoot = isCatastrophe
        ? applyCatastrophePenalty(pendingLoot)  // 20% del loot, 0 monedas
        : pendingLoot
     c. Para cada item en finalLoot:
        InventoryRepository.upsertItem(tx, { userId, itemDefinitionId, +quantity })
     d. prevBalance = EconomyRepository.getCurrentBalance(tx, userId)
     e. CurrencyLedger.create(tx, { userId, amount, balanceAfter: prevBalance + amount, referenceId: runId })
     f. UserProgression.update(tx, { userId, +xp, +totalScrapCollected })
     g. ExtractionResult.create(tx, { snapshot completo de la run })
     h. ActiveRun.delete(tx, { id: runId })  // se BORRA la fila; ExtractionResult es el registro
     i. AuditLog.create(tx, { userId, action: "run.extract", payload })
  })
  3. Retornar ExtractionResultDTO

Server Action: revalidatePath('/dashboard'), revalidatePath('/inventory'), revalidatePath('/history')
```

**Lifecycle de `ActiveRun`:** la fila se **elimina** dentro de la transacción al resolverse (paso h). El registro histórico completo vive en `ExtractionResult`. Esto es necesario porque `ActiveRun.userId @unique` impide crear una nueva run si la fila anterior sigue existiendo. `findActiveRun` simplemente busca si existe una fila para el userId — si no existe, el usuario está en estado idle.

**Idempotencia:** si no existe `ActiveRun` para el userId al entrar (step 1), se retorna error `RUN_NOT_RUNNING`. La transacción garantiza que si algo falla en el medio, nada se persiste (ni loot, ni ledger, ni borrado de la run — rollback completo).

---

## 14. Consistency Model del CurrencyLedger

Este es el modelo de consistencia adoptado para el balance de monedas.

### Modelo: Read-your-writes via Materialized Balance

El `CurrencyLedger` es un log append-only. Cada entrada incluye el `balanceAfter` calculado al momento de inserción dentro de la transacción. El balance actual de un usuario es el `balanceAfter` de la última entrada.

```sql
-- Consulta de balance O(1)
SELECT "balanceAfter"
FROM "CurrencyLedger"
WHERE "userId" = $1
ORDER BY "createdAt" DESC
LIMIT 1;
```

### Garantías

1. **Append-only:** nunca `UPDATE` ni `DELETE` en `CurrencyLedger`. Si se necesita revertir, se inserta una entrada negativa.
2. **Balance calculado en transacción:** `balanceAfter = prevBalance + amount` se calcula y persiste dentro de la misma transacción que el evento que lo genera. No hay ventana de inconsistencia.
3. **Lectura de balance siempre fresh:** el balance nunca se cachea. La lectura siempre va a DB.
4. **Operaciones de gasto validan balance previo:** antes de crear una entrada negativa (gasto), se lee el `balanceAfter` más reciente y se verifica que `prevBalance + amount >= 0`. Si no, throw `DomainError("INSUFFICIENT_BALANCE")`.
5. **Race conditions:** el `@unique` en `ActiveRun.userId` impide que el mismo usuario tenga dos extracciones simultáneas. Una vez que la transacción comienza y el status se verifica como `RUNNING`, no puede ocurrir otra extracción concurrente para el mismo usuario.
6. **Auditoría:** `referenceId` en cada entrada del ledger apunta al evento que la generó (runId, purchaseId, etc.), permitiendo reconciliación.

### Por qué no SUM()

`SELECT SUM(amount)` recorre toda la tabla del usuario. A 100 runs/usuario con 2 entradas/run, serían 200 filas por usuario — manejable en MVP. Pero no escala. El `balanceAfter` materializado es O(1) independiente del historial.

### Caso especial: primer registro del usuario

Si no existe ninguna entrada en `CurrencyLedger` para el usuario, el balance es `0`. La función `getCurrentBalance` maneja este caso retornando `0` cuando no hay registro.

---

## 15. Estrategia transaccional

| Operación | Tablas involucradas | Tipo de transacción |
|-----------|--------------------|--------------------|
| Resolver extracción | ActiveRun, InventoryItem[], CurrencyLedger, ExtractionResult, UserProgression, AuditLog | `$transaction(async tx)` |
| Iniciar run | ActiveRun, AuditLog | `$transaction(async tx)` |
| Equipar item | EquipmentSlot, AuditLog | `$transaction([...])` |
| Consultar estado | Solo lectura | Sin transacción |
| Listar inventario | Solo lectura | Sin transacción |

**Regla:** usar `prisma.$transaction(async (tx) => {...})` (interactive transactions) para toda operación con lógica condicional. El array form solo para operaciones simples sin lógica condicional entre steps.

**Timeout:** configurar `timeout: 5000` en transacciones críticas. Si supera el timeout, la transacción hace rollback automático y el estado de la run queda en RUNNING (reintentable).

---

## 16. Decisión de autenticación — MVP

> **[Decisión cerrada — MVP]:** Auth.js v5 (NextAuth) con Google OAuth como único proveedor en MVP.

### Por qué Auth.js v5

- Primera opción natural para Next.js App Router. Integración oficial, bien mantenida.
- Soporta Google OAuth sin dependencias adicionales.
- El Route Handler (`/app/api/auth/[...nextauth]/route.ts`) es el único uso justificado de Route Handlers en MVP.
- La sesión es accesible en Server Components y Server Actions via `auth()` de Auth.js v5.

### Por qué solo Google OAuth

- Time-to-value mínimo para el usuario: un click para registrarse.
- No hay que gestionar passwords, resets, ni emails propios.
- Magic link (email) y email+password se consideran para Fase 1 si se detecta abandono por falta de cuenta Google.

### Configuración

```typescript
// /server/auth/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  callbacks: {
    session({ session, token }) {
      session.user.id = token.sub!;
      return session;
    },
  },
});
```

### Helpers

```typescript
// /server/auth/session.ts
export async function getCurrentUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new DomainError("UNAUTHORIZED", "No session");
  return session.user.id;
}
```

### Creación automática de perfil

Al primer login (callback `signIn` de Auth.js), se crea automáticamente `UserProfile` y `UserProgression` si no existen. El usuario nunca llega a la dashboard sin estos registros.

---

## 17. Seguridad y anti-cheat

1. **Ownership checks siempre:** `resource.userId === authenticatedUserId` antes de cualquier operación.
2. **`startedAt` del servidor:** nunca aceptar tiempos del cliente. El `startedAt` es `new Date()` ejecutado en el servidor.
3. **`requestExtraction` ignora timestamps del cliente:** calcula el tiempo transcurrido como `Date.now() - run.startedAt`.
4. **Rate limiting nivel DB:** `ActiveRun.userId @unique` impide doble-run. El status de la run impide doble extracción.
5. **Validación Zod en todos los inputs de Server Actions:** antes de cualquier lógica de dominio.
6. **No exponer IDs internos sensibles** sin verificar ownership.
7. **Headers de seguridad** via `next.config.ts`: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`.
8. **Variables de entorno:** secretos solo en `.env.local` y en la plataforma. Nunca en código.
9. **AuditLog** registra acciones sensibles para detección de anomalías post-hoc.
10. **Semilla determinista de catástrofe:** derivada de `runId` — no hay re-roll posible recargando la página.

---

## 18. Validación

- Zod en todos los inputs de Server Actions — sin excepciones.
- Schemas en `/lib/validators/*.validators.ts`.
- Validación format/tipos en Zod; validaciones de negocio con DB en Domain Services.
- `z.infer<typeof Schema>` para los tipos TypeScript correspondientes.
- Nunca confiar en tipos TypeScript al runtime — un input malformado puede llegar aunque TypeScript diga que es válido.

---

## 19. Error handling

**Contrato estándar:**
```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: ErrorCode; message: string } }
```

**Jerarquía de errores:**
- `DomainError(code, message)` — errores de negocio esperados, lanzados por Domain Services.
- `PrismaClientKnownRequestError` — errores de DB conocidos, mapeados a `DomainError` en Repositories antes de subir.
- `Error` desconocido — logueado en servidor con contexto completo, devuelto al cliente como `INTERNAL_ERROR`.

**En componentes:** `error.tsx` para errores de render. Mensajes de `ActionResult.error.message` para errores de actions. Nunca exponer stack traces.

---

## 20. Observabilidad

**MVP:**
- `console.error` con contexto `{ userId, action, runId?, durationMs?, error }` en errores inesperados.
- `AuditLog` en DB para todas las acciones de dominio críticas.

**Fase 1+:**
- Sentry o equivalente para tracking de errores.
- Métricas de juego: runs/hora, extraction success rate, danger level medio al extraer, drop rates.
- OpenTelemetry para traces si el volumen lo justifica.

---

## 21. Caching y revalidación

| Dato | Estrategia | Por qué |
|------|-----------|---------|
| ItemDefinitions / ZoneConfigs | `config/game.config.ts` en memoria — invalida en deploy | Cambia solo con deploy |
| Estado de run activa | Sin cache — siempre fresh del servidor | Timing crítico |
| Inventario del jugador | `revalidatePath` tras mutaciones | Cambia con acciones |
| Ledger / balance | Sin cache — siempre fresh | Economía crítica |
| Historial de runs | Cache corto (30s vía `cache()`) | Inmutable tras creación |
| Perfil de usuario | `revalidatePath` tras cambios de perfil | Cambia con acciones |

**No usar `export const revalidate = 0` globalmente.** Antipatrón que elimina todos los beneficios de RSC.

---

## 22. MVP Vertical Slice — Primer build jugable

Esta sección define el mínimo conjunto de pantallas, acciones y flujos que hacen el juego jugable de extremo a extremo.

### Pantallas obligatorias del MVP vertical slice

| Pantalla | Ruta | Descripción |
|----------|------|-------------|
| Landing | `/` | CTA de login. Sin estado de juego. |
| Dashboard | `/dashboard` | Estado del chatarrero + expedición activa + inventario resumido |
| Expedición activa | Vista dentro de dashboard | Panel con DangerMeter, LootPreview, ExtractButton |
| Inventario | `/inventory` | Grid de items con tooltips. Sin interacción de crafting. |
| Historial | `/history` | Lista de runs pasadas (éxito/fracaso, duración, loot). |

> **[Decisión MVP]:** No hay una ruta `/expedition` separada. La expedición activa es un panel dentro de `/dashboard` que aparece cuando hay una run activa. Esto simplifica el routing y es la información más importante — siempre visible al abrir el juego.

### Server Actions obligatorias del MVP vertical slice

| Action | Descripción |
|--------|-------------|
| `startRun(zoneId)` | Iniciar expedición. Verifica no hay run activa. |
| `requestExtraction(runId)` | Extraer botín. Verifica run RUNNING. Transacción completa. |
| `equipItem(slot, itemDefinitionId)` | Equipar item de inventario en slot. Solo fuera de run activa. |
| `unequipItem(slot)` | Vaciar slot de equipo. Solo fuera de run activa. |

### Flujos de lectura obligatorios

| Flujo | Desde | Descripción |
|-------|-------|-------------|
| `getPlayerState(userId)` | Server Component en `/dashboard` | Agrega estado completo del jugador (perfil, equipo, run activa, balance) |
| `getRunState(userId)` | Hook `useRunPolling` en Client Component | Poll cada 5s del estado de run — retorna `RunStateDTO` |
| `getInventory(userId)` | Server Component en `/inventory` | Lista de `InventoryItemDTO` con paginación |
| `getRunHistory(userId)` | Server Component en `/history` | Lista de `RunHistoryCardDTO` con paginación |

### Datos iniciales del usuario (seed)

Al primer login, el sistema crea automáticamente:
- `UserProfile` con displayName derivado del nombre de Google.
- `UserProgression` en nivel 1, XP 0.
- 6 `EquipmentSlot` vacíos.
- Un `InventoryItem` de equipo básico en el slot HEAD (equipo de chatarrero básico — itemKey: `"basic_helmet"`).
- Una entrada de `CurrencyLedger` de 0 créditos (initialización del balance).

### Pantallas explícitamente fuera del MVP vertical slice

- `/profile` — configuración de perfil.
- `/settings` — configuración de la cuenta.
- `/zones` — exploración de zonas (solo hay 1 en MVP).
- `/leaderboard` — rankings.
- Cualquier pantalla de marketplace, crafting, guild.

---

## 23. Out of scope but likely next

> Esta sección guía las iteraciones de Fase 1+ sin contaminar el MVP. No son backlog formal — son señales de diseño para no tomar decisiones en MVP que bloqueen estas features.

| Feature | Señal de diseño en MVP | Cuándo añadir |
|---------|----------------------|---------------|
| **Múltiples zonas** | `zoneId` en ActiveRun y ExtractionResult. `ZoneConfig[]` en config. | Fase 1 — primera prioridad |
| **Vendors / tiendas** | Ledger de créditos desde MVP. `LedgerEntryType.PURCHASE` ya definido. | Fase 1 — con múltiples zonas |
| **Crafting** | Materiales en inventario desde MVP. Recipes serán tabla nueva. | Fase 1+ |
| **Logros** | AuditLog + ExtractionResult tienen toda la data. | Fase 1 — tabla `Achievement` + `UserAchievement` |
| **Más providers de auth** | Auth.js soporta múltiples providers. Añadir magic link o Discord. | Fase 1 si hay abandono por falta de Google |
| **Events temporales** | `ZoneConfig` paramétrica permite zonas de evento. Sin cambio de schema. | Fase 2 |
| **TTL de runs huérfanas** | `ActiveRun.startedAt` disponible para cleanup por TTL. | Fase 1 — job nocturno simple |
| **Prestige** | `UserProgression` separable. Reset controlado es additive. | Fase 2 |
| **Market asíncrono** | `InventoryItem.userId` permite transfer. Añadir tabla `MarketListing`. | Fase 2 |
| **Guilds** | `UserProfile.guildId` añadible sin impacto en núcleo. | Fase 3 |
| **WebSockets / push** | La arquitectura de run (estado derivado, sin ticks persistidos) es compatible con WS. Añadir `socket.io` o Partykit. | Fase 3, cuando el polling muestre límites |
| **Panel de administración** | AuditLog + `AuditLog.action` + `ADMIN_ADJUSTMENT` ya definidos para operaciones admin básicas. | Fase 2 |
| **Audio / sounds** | Sin dependencia de arquitectura. Añadir librería de audio client-side. | Fase 1 |
| **i18n** | `next-intl` es additive. Las strings están hardcoded en MVP. | Fase 2 |

---

## 24. Rendimiento y escalabilidad inicial

> **[Decisión MVP]:** No hay optimizaciones de escala en MVP. La arquitectura las soporta en Fase 1+.

**Polling del cliente:** cada 5 segundos. `getRunState` es read-only y muy rápida (una query + cálculo en memoria). Tolerable hasta cientos de usuarios concurrentes.

**DB connections:** Prisma singleton con pool de conexiones gestionado por la plataforma (Neon serverless en MVP). En Fase 1 si hay problemas de conexiones, añadir Prisma Accelerate o pgBouncer.

**Sin optimizaciones prematuras:** no CDN para datos, no read replicas, no edge functions para lógica de juego en MVP.

---

## 25. Riesgos técnicos

| Riesgo | Prob. | Impacto | Mitigación |
|--------|-------|---------|-----------|
| Race condition en doble extracción | Media | Alto | `ActiveRun.userId @unique` + status check en transacción |
| Drift de tiempo cliente vs servidor | Alta | Bajo | Timer visual es estimación. Servidor siempre recalcula con `Date.now()` |
| Explosión de registros en AuditLog | Media | Medio | Añadir TTL/archivado en Fase 1 |
| Queries lentas en historial con muchos usuarios | Baja (MVP) | Medio | Índices compuestos. Paginación desde el inicio. |
| Fórmulas de peligro/loot desbalanceadas | Media | Alto (retención) | Parámetros en config. Iterar rápido. Tests de calculador. |
| Pérdida de sesión durante extracción | Baja | Medio | Idempotencia garantizada — reintento seguro |
| Serverless function timeout en transacción larga | Baja | Medio | Neon soporta transacciones largas. Timeout explícito de 5s en `$transaction`. |
| Runs huérfanas (servidor caído durante run) | Baja | Bajo | Aceptable en MVP. La run queda en RUNNING hasta que el usuario vuelva. Fase 1: TTL. |

---

## 25b. Concurrency Model

Esta sección define cómo el sistema maneja las situaciones de concurrencia más comunes en MVP.

### Doble click en "Extraer"

**Problema:** el usuario hace doble click en el botón "Extraer" y se disparan dos llamadas a `requestExtraction` casi simultáneas.

**Solución:**
1. El botón setea `loading = true` en el primer click → deshabilitado para el segundo.
2. Aunque ambas llamadas lleguen al servidor, la segunda encontrará `status !== RUNNING` porque la primera ya la cerró (o está en transacción).
3. `requestExtraction` devuelve `DomainError("RUN_NOT_RUNNING")` para la segunda llamada — sin efecto en datos.
4. **No se produce doble loot, doble ledger ni doble extracción.**

**Implementación requerida en UI:** el `ExtractButton` debe tener `disabled={isLoading}` y `isLoading` debe setearse optimísticamente al hacer click, antes de esperar la respuesta del servidor.

### Varias pestañas abiertas del mismo usuario

**Problema:** el usuario tiene dos pestañas del juego. En la pestaña A extrae. La pestaña B sigue mostrando la run como activa.

**Comportamiento:**
- La pestaña B sigue mostrando el estado anterior hasta el siguiente poll (máx. 5s).
- Al hacer poll, `getRunState` encuentra que no hay `ActiveRun` para el usuario → devuelve `status: "idle"`.
- Si el usuario intenta extraer desde la pestaña B, `requestExtraction` devuelve `RUN_NOT_RUNNING` y la UI muestra un error explicativo.
- **No hay datos corruptos.** La DB siempre es consistente.

**No hay optimistic updates para economía.** El inventario y el balance siempre requieren re-fetch del servidor tras una mutación.

### Polling concurrente durante mutación

**Problema:** el poll llega exactamente cuando `requestExtraction` está en transacción.

**Comportamiento:**
- `getRunState` es una query de lectura sin transacción. Si la `ActiveRun` todavía existe (la transacción no ha hecho commit), devuelve el estado como `running`.
- Una vez que la transacción hace commit y el status cambia a `EXTRACTED`, el siguiente poll devuelve `status: "idle"`.
- PostgreSQL garantiza read committed por defecto — el poll nunca verá un estado intermedio de la transacción.
- **No hay race condition visible al usuario.** En el peor caso ve un poll más con el estado anterior.

### Equipar item mientras hay ActiveRun

**Regla:** `equipItem` y `unequipItem` **verifican que no existe una `ActiveRun` activa antes de modificar el equipo.**

```typescript
// En InventoryService.equipItem():
const activeRun = await runRepository.findActiveRun(userId);
if (activeRun) {
  throw new DomainError("RUN_ALREADY_ACTIVE", "Cannot change equipment during an active expedition.");
}
```

Esta verificación ocurre **dentro de la transacción de equipar**. Si en el milisegundo entre la verificación y el commit alguien inicia una run, la constraint `ActiveRun.userId @unique` bloqueará el inicio de la run — no el equipamiento.

**Consecuencia de diseño:** la UI debe deshabilitar los botones de equipar cuando hay una run activa. El servidor es la última línea de defensa.

### No hay optimistic updates en economía

**Regla explícita:** el cliente **nunca** asume que el balance de créditos o el inventario cambió antes de recibir la respuesta del servidor.

- No se actualiza `useState` con el nuevo balance antes del `ActionResult`.
- No se añaden items al inventario visual antes de confirmar la extracción.
- El `ExtractionResultDTO` retornado por `requestExtraction` es la fuente de verdad que la UI muestra.
- Tras recibir el resultado, `revalidatePath` invalida el RSC cache y los Server Components reflejan el estado real de DB.

**Por qué:** los optimistic updates en economía son una fuente de inconsistencias visibles cuando la transacción falla. La latencia extra (100–300ms) es aceptable para el tipo de juego.

---

## 26. Estrategia de crecimiento del backend: MVP → v1

**Fase 0 (MVP):** un solo proceso Next.js, PostgreSQL (Neon serverless), Auth.js con Google OAuth. Todo el backend en Server Actions.

**Fase 1:** Prisma Accelerate o pgBouncer si hay problemas de conexiones. Separar `ItemDefinition` y `ZoneConfig` a tablas de DB editables sin deploy. Añadir más zonas. Vendors básicos.

**Fase 2:** Si se necesitan jobs asíncronos (eventos temporales, notificaciones), añadir `pg-boss` sobre PostgreSQL — sin infraestructura externa nueva.

**Fase 3:** Si hay miles de usuarios concurrentes con polling activo: evaluar WebSockets o SSE. Solo con métricas reales que muestren límites del polling.

---

## 27. Decisiones cerradas

Estas decisiones estaban abiertas en v1 del documento y se cierran aquí:

| Decisión | Opción elegida | Justificación |
|----------|---------------|---------------|
| **Auth provider** | Auth.js v5 + Google OAuth | Integración oficial Next.js 16, máxima rapidez de setup, sin gestión de credenciales propia |
| **Estado `preparing`** | Suprimido en MVP | Añade complejidad sin valor en MVP. El usuario va de idle a running directamente. |
| **Semilla de catástrofe** | Determinista por `runId` | Anti-cheat: no hay re-roll posible. Reproducibilidad para debugging. |
| **Moneda en MVP** | 1 moneda (Créditos de Chatarrero, CC) | No hay sinks en MVP, la economía dual no aporta valor sin vendedores. |
| **Recuperación en catástrofe** | 20% del loot acumulado, 0 créditos, 25% XP | Balance entre frustración (perder todo) y tensión (perder algo real). Ajustable en config. |
| **Plataforma** | Vercel + Neon PostgreSQL | Primera opción natural para Next.js. Serverless compatible con Prisma. |
| **Polling vs WebSockets** | Polling cada 5s en MVP | Sin infraestructura adicional. Suficiente para la tensión del juego. Migrable en Fase 3. |
| **1 zona en MVP** | Cementerio de Naves | Suficiente para validar el loop. Segunda zona en Fase 1. |
| **Cooldown entre runs** | Sin cooldown en MVP | El jugador puede lanzar inmediatamente. Cooldown como feature de diseño en Fase 1 si se detecta que quita peso al momento. |

---

## 28. Supuestos activos

1. La plataforma de despliegue soporta al menos 10 segundos de timeout en serverless functions.
2. Los assets de icono de items son `iconKey` strings referenciando un sistema de iconos definido (Lucide icons en MVP, sprite sheet en Fase 1).
3. El onboarding es contextual in-game — no hay una pantalla de tutorial separada en MVP.
4. La progresión del jugador en MVP es lineal simple (XP → Level) sin árbol de habilidades.
5. No hay crafting en MVP — los items del inventario son exclusivamente drops de expediciones.
6. La única zona del MVP tiene parámetros fijos en `config/game.config.ts`.

---

## 29. Glosario / Ubiquitous Language

Estos términos tienen significado preciso en el dominio del juego. Usar siempre estos nombres exactly — en código, en logs, en comentarios, en variables. No inventar sinónimos.

| Término | Definición canónica |
|---------|--------------------|
| **Run** | Una instancia de expedición. Existe en DB como `ActiveRun` mientras está activa y como `ExtractionResult` tras resolverse. Una run tiene ciclo de vida completo: inicio → progreso → resolución. |
| **Expedition** | Sinónimo de Run en el lenguaje del producto (visible al jugador). En código, usar **Run** (entidad de dominio). |
| **Extraction** | El acto de terminar voluntariamente una Run y reclamar el loot acumulado. Siempre iniciada por el jugador via `requestExtraction`. Puede resultar en éxito (parcial o completo) o aplicar penalización de catástrofe si ya ocurrió. |
| **Catastrophe** | El evento que ocurre cuando `dangerLevel >= catastropheThreshold`. No es un estado en DB — es una condición calculada. Cuando ocurre, la siguiente `requestExtraction` aplica la penalización (`CATASTROPHE_RECOVERY_RATE`). |
| **Failed** | El estado terminal (`RunStatus.FAILED`) de una Run que fue resuelta con catástrofe. El jugador recibió el 20% del loot y 0 créditos. La run aparece en el historial como fracaso. |
| **Loot** | Los items y créditos que el chatarrero recolecta automáticamente durante una Run. El loot es **pendiente** (calculado, no persistido) mientras la run está activa. Se convierte en real (persistido en `InventoryItem` + `CurrencyLedger`) solo en la transacción de `requestExtraction`. |
| **Credits** | La moneda principal del juego: Créditos de Chatarrero (CC). Representados como `Int` en DB. Gestionados via `CurrencyLedger` append-only. En código: `amount`, `balanceAfter`, `currencyEarned`. |
| **Equipment** | Los ítems equipados en los 6 slots del chatarrero (HEAD, BODY, HANDS, TOOL_PRIMARY, TOOL_SECONDARY, BACKPACK). El equipo activo se captura como snapshot al iniciar una Run. En código: `EquipmentSlot` (tabla) y `equipmentSnapshot` (JSONB en `ActiveRun`). |
| **Inventory** | La colección de todos los `InventoryItem` del usuario, incluyendo tanto items de equipo como materiales stackables. El inventario no incluye el equipo actualmente equipado en slots — esos son registros separados en `EquipmentSlot`. |
| **Danger Level** | El valor normalizado (0.0–1.0+) que representa el riesgo acumulado en la zona. Se calcula on-demand en `RunCalculator.computeDangerLevel()`. Nunca se persiste entre polls. |
| **Zone** | Una expedición tiene una zona (`zoneId`) que define los parámetros de peligro y loot. En MVP solo existe una zona: `"shipyard_cemetery"`. La configuración de zona se snapshot en `ActiveRun.dangerConfig` al iniciar. |
| **Player State** | El estado completo del jugador que incluye perfil, nivel, balance, equipo y run activa. Representado como `PlayerStateDTO` y ensamblado por `PlayerStateService`. |
| **Scrapper** | El personaje del jugador — el chatarrero espacial. No tiene entidad propia en DB en MVP; sus stats se derivan de `UserProgression` + `EquipmentSlot`. |
## Actualización D.2 — Run modes y economía de venta

- `startRun` ahora acepta `runMode: SAFE | HARD` (SAFE por defecto).
- El modo se persiste sin migración en `ActiveRun.dangerConfig.runMode` (snapshot autoritativo de servidor).
- Cálculo de run usa perfiles determinísticos por modo:
  - SAFE: menor loot/currency/xp y menor probabilidad efectiva de rarezas altas.
  - HARD: mayor loot/currency/xp y mejor salida de materiales complejos.
- En `resolveExtraction`, catástrofe en HARD ejecuta pérdida de equipo snapshotteado en la **misma transacción**:
  1) decremento/eliminación de `InventoryItem` para piezas equipadas,
  2) limpieza de `EquipmentSlot_`,
  3) settlement de loot/ledger/result.
- Catástrofe en SAFE mantiene equipo.
- Mercado de venta usa fórmula dedicada `computeSellUnitPrice(baseValue)` (35% base, floor 1) para nerf global, y UI de mercado consume la misma función para mantener preview = ledger final.

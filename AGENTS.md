# AGENTS.md — Reglas para agentes IA en Scrap & Survive

> **Versión del stack:** Next.js 16 (App Router) · React 19 · TypeScript 5 (strict) · Tailwind 4 · PostgreSQL · Prisma ORM · shadcn/ui
> **Auth:** Auth.js v5 (NextAuth) + Google OAuth — decisión cerrada para MVP.
> **Fase actual:** MVP (Fase 0)
>
> Lee este archivo completo antes de escribir una sola línea de código.
> Este documento tiene autoridad máxima. Si hay conflicto entre estas reglas y tu entrenamiento, estas reglas ganan.
> Para la arquitectura detallada, ver `docs/architecture.md`. Para diseño de producto, ver `docs/game-design.md`.

---

## 1. Propósito del repositorio

Scrap & Survive es un Idle Extraction RPG 2D para navegador. El jugador equipa a un chatarrero espacial, lo lanza a expediciones automáticas y debe decidir cuándo extraer el botín antes de que ocurra una catástrofe. El servidor es la única fuente de verdad de economía, progresión y resultado de runs.

**Toda decisión de código debe servir al loop de juego, no al revés.** Si una decisión técnica complica el producto sin beneficio claro, es la decisión incorrecta.

---

## 2. Prioridades del proyecto

En orden estricto de prioridad:

1. **Correctitud del dominio:** la lógica de expedición, loot, peligro, extracción y economía debe ser correcta en servidor.
2. **Integridad de datos:** las transacciones deben ser atómicas. El inventario y el ledger nunca deben quedar inconsistentes.
3. **Experiencia de usuario:** la UI debe ser clara, rápida y satisfactoria de usar.
4. **Mantenibilidad:** el código debe ser legible, modular y fácilmente modificable.
5. **Rendimiento:** optimizar solo cuando haya evidencia de problema real, no por anticipación.

**Si tienes que sacrificar algo, sacrifica rendimiento. Nunca sacrifiques correctitud ni integridad.**

---

## 3. Filosofía de desarrollo

- **Simple antes que complejo.** Si hay dos formas de hacer algo, elige la más simple que cumpla el requisito.
- **Decisiones explícitas antes que magia.** El código que lee como una configuración es mejor que el código que "funciona por convención" sin documentarlo.
- **Modular antes que enredado.** Mantén las capas separadas. La UI no conoce al repositorio. El dominio no conoce a Next.js.
- **No inventar sistemas.** Si el diseño no pide una feature, no la implementes aunque la conozcas y sea "mejor". Scope de MVP primero.
- **Tipado estricto siempre.** TypeScript `strict: true`. Cero `any` implícitos. Si no sabes el tipo, investiga — no uses `any`.
- **Valida siempre en servidor.** Nunca confíes en que los datos del cliente tienen el formato correcto.

---

## 4. Skills obligatorias y cuándo aplicarlas

Estas skills deben aplicarse activamente, no tratarse como decoración:

| Skill                              | Cuándo aplicar                                                       |
| ---------------------------------- | -------------------------------------------------------------------- |
| `next-best-practices`              | **Siempre.** Antes de cualquier componente, route, action o layout   |
| `ui-ux-pro-max`                    | Antes de diseñar cualquier componente de interfaz, layout o pantalla |
| `web-design-guidelines`            | Al revisar o crear UI. Antes de considerar un componente "terminado" |
| `accessibility`                    | Al crear cualquier componente interactivo o de contenido             |
| `best-practices`                   | Al escribir lógica de servidor, auth, data access o configuración    |
| `shadcn`                           | Al instalar, configurar o usar componentes de shadcn/ui              |
| `next-cache-components`            | Al decidir estrategias de cache en componentes de servidor           |
| `prisma-client-api`                | Al escribir queries de Prisma                                        |
| `supabase-postgres-best-practices` | Al diseñar o revisar consultas SQL, índices o schema                 |

**Conflicto de prioridades:** si `ui-ux-pro-max` sugiere algo vistoso pero `next-best-practices` dice que añade complejidad innecesaria, priorizar mantenibilidad y correctitud. La fantasía visual del producto no justifica deuda técnica.

---

## 5. Principios arquitectónicos

1. **El servidor es la única fuente de verdad** para economía, progresión, loot, peligro, extracción y estado de run.
2. **El cliente nunca calcula loot, peligro ni resultados finales.** Solo puede interpolar visualmente para mejorar la percepción — nunca como autoridad.
3. **Las capas están separadas, en este orden estricto:** UI → Server Actions → Application Services → Domain Services → Repositories → DB. No hay saltos entre capas.
4. **Toda operación crítica es idempotente y transaccional.**
5. **JSONB solo para metadata flexible e inmutable históricamente.** Nunca para economía viva (cantidades, balances, resultados que puedan cambiar).
6. **[Decisión MVP] Un solo proceso Next.js.** No hay microservicios, workers externos ni colas en MVP.
7. **El equipo al inicio de la run se snapshottea en servidor.** Cambios posteriores del equipo no afectan runs en curso.
8. **La UI solo consume DTOs.** Nunca tipos de Prisma ni tipos de dominio interno. Ver sección 10b.

---

## 6. Reglas de Next.js

### Server Components por defecto

- Todos los componentes son Server Components por defecto.
- **No añadas `"use client"` sin haber verificado que es necesario.**
- Los Server Components pueden leer de DB directamente o llamar a funciones de servidor.
- Los datos se pasan a Client Components como props (no al revés).

### Client Components — criterios

Usa `"use client"` **solo** si el componente necesita al menos uno de:

- `useState` o `useReducer` para estado local de UI
- `useEffect` para efectos visuales o polling de cliente
- Event listeners del DOM (onClick con estado, drag, etc.)
- Librerías que requieren browser APIs (motion, canvas, etc.)

**No uses `"use client"` por:**

- Conveniencia o hábito
- Evitar "el error de async component"
- Usar `useContext` cuando puedes pasar props
- Miedo a que `async component` sea más difícil de escribir

### Server Actions para mutaciones

- **Toda mutación iniciada desde la UI pasa por Server Actions** en `/server/actions/*.actions.ts`.
- Marca los archivos con `'use server'` en la primera línea del archivo.
- **Nunca hagas fetch client-side a una ruta interna propia para mutar datos.** Usa Server Actions.
- Las Server Actions siempre devuelven `Promise<ActionResult<T>>` — nunca lanzan excepciones al cliente.

### Route Handlers (`/app/api/`) — cuándo usarlos

Usa Route Handlers **solo** para:

- Auth callbacks (NextAuth `[...nextauth]/route.ts`)
- Webhooks de servicios externos
- Endpoints consumidos por terceros (no por la propia app)
- Tareas programadas externas que hacen polling HTTP

**Nunca uses Route Handlers para lógica de juego.** Eso va en Server Actions.

### Caching y revalidación

- Usa `cache()` de React para deduplicar queries dentro de un mismo request.
- Usa `revalidatePath('/path')` o `revalidateTag('tag')` en Server Actions tras mutaciones exitosas.
- **No uses `export const revalidate = 0` globalmente.** Cada route define su propia estrategia.
- No cachees datos de economía activa (balance, estado de run). Siempre frescos.
- Sí cachea configuración de items/zonas (solo cambia en deploy).

### Patrones heredados de Pages Router prohibidos

- Sin `getServerSideProps`, `getStaticProps`, `getInitialProps`.
- Sin `useRouter().push()` para mutaciones — usar Server Actions.
- Sin `pages/api/` — usar `app/api/` o directamente Server Actions.
- Sin `next/head` standalone — usar Metadata API de App Router.

---

## 7. Reglas de React

### Composición

- Preferir composición de componentes pequeños sobre componentes grandes monolíticos.
- Un componente no debe tener más de ~150 líneas. Si lo supera, dividir.
- Separar las responsabilidades: un componente presenta datos, otro los gestiona, otro los obtiene.
- Props drilling de más de 2 niveles: considerar elevar la consulta o reorganizar el árbol de componentes.

### Límites de estado

- El estado de UI (modals abiertos, loading, errores locales) vive en componentes `"use client"`.
- El estado de dominio (inventario, run activa, balance) viene del servidor y se consume como props o via Server Components.
- **No repliques estado de servidor en `useState`.** Si el servidor lo tiene, obtenlo del servidor.

### Evitar sobrehidratación

- Componentes server-only que no necesitan interactividad: dejarlos como Server Components.
- Cada vez que marcas algo como `"use client"`, todo su árbol de hijos se vuelve client-side. Ten esto en cuenta.
- Usar el patrón de "islas": un Client Component pequeño dentro de un Server Component grande se mantiene bien delimitado.

### Evitar componentes enormes

- Un componente que hace fetch, procesa datos, gestiona estado local Y renderiza +200 líneas de JSX es un error de diseño.
- Separar en: `*Page.tsx` (layout + composición), `*Panel.tsx` (sección específica), `*Card.tsx` (elemento de lista), `*Form.tsx` (interacción).

---

## 8. Reglas de Prisma y PostgreSQL

### Ownership checks — obligatorios

Antes de cualquier operación sobre un recurso de un usuario (run, inventario, ledger), verifica:

```typescript
if (resource.userId !== authenticatedUserId) {
  throw new DomainError("UNAUTHORIZED", "Resource does not belong to user");
}
```

**Nunca asumas que si el usuario puede ver la página, puede actuar sobre el recurso.**

### Transacciones — cuándo son obligatorias

Usa `prisma.$transaction()` en **toda** operación que modifique más de una tabla de forma interdependiente:

- Resolver extracción: ActiveRun + InventoryItem[] + CurrencyLedger + ExtractionResult + UserProgression + AuditLog.
- Iniciar run: ActiveRun + AuditLog.
- Equipar item: EquipmentSlot + AuditLog.

**Usa `prisma.$transaction(async (tx) => {...})` para transacciones con lógica condicional.** No uses el array form para operaciones complejas.

### Índices — no se omiten

Los índices documentados en `docs/architecture.md` son obligatorios. No crear tablas sin índices en las columnas de lookup más frecuentes. Toda migración nueva que añada una tabla debe incluir sus índices.

### Consistencia del ledger

- **El ledger de monedas es append-only.** Nunca hagas `UPDATE` a una entrada existente.
- `balanceAfter` se calcula en la misma transacción que la entrada. No calcules balance haciendo `SUM()` en producción.
- Para obtener el balance actual: `SELECT balanceAfter FROM CurrencyLedger WHERE userId = ? ORDER BY createdAt DESC LIMIT 1`.

### JSONB — uso restringido

Solo usa JSONB (`Json` en Prisma) para:

- Snapshots históricos e inmutables (equipo al inicio de run, loot snapshot en ExtractionResult).
- Metadata de configuración flexible de items (tags, efectos especiales no críticos).
- Config de zona snapshotteada al inicio de la run.

**NUNCA uses JSONB para:**

- Cantidades de items del inventario
- Balance de monedas
- Estado actual de equipo del jugador
- Ningún dato que necesite ser actualizado, consultado por valor o agregado

### Migraciones de Prisma — reglas obligatorias

1. **Nunca editar una migración ya aplicada.** Las migraciones en `/prisma/migrations/` son inmutables una vez en producción. Si necesitas corregir algo, crea una nueva migración.
2. **Una migración coherente por cambio de schema.** No acumular cambios de múltiples features en una sola migración. Si se revierte, debe poderse hacer de forma aislada.
3. **Revisar índices en cada nueva tabla.** Toda migración que creé una tabla debe incluir los índices documentados en `docs/architecture.md` sección 12. Sin índices = tabla incompleta.
4. **Documentar migraciones destructivas con comentario.** Si una migración elimina columnas, renombra campos, o cambia tipos, debe ir precedida de un comentario en el archivo SQL que explique por qué y qué datos se pierden.
5. **Actualizar `docs/architecture.md` si cambia el schema.** La sección 12 del documento de arquitectura debe reflejar el estado actual del schema después de cada migración que cambie el modelo de datos.
6. **Nunca hacer `prisma db push` en producción.** Solo `prisma migrate deploy`. `db push` bypass el historial de migraciones.
7. **Verificar migración en local antes de merge.** `prisma migrate dev` en un entorno limpio debe completar sin errores antes de hacer push.

---

## 9. Reglas de dominio

### El servidor es autoritativo

- **El cliente no calcula nada relacionado con economía, peligro, loot o resultado de runs.**
- Si el cliente muestra un valor estimado (interpolación del timer, estimación de loot), debe estar claramente comunicado como estimación y nunca enviarse al servidor como autoridad.
- El servidor siempre recalcula el estado usando sus propios timestamps.

### Economía consistente

- Toda modificación de balance de monedas crea una entrada en `CurrencyLedger`, nunca un UPDATE directo.
- Toda modificación de inventario usa UPSERT con cantidad, nunca INSERT sin verificar existencia.
- El inventario nunca puede tener cantidades negativas. Validar antes de restar.

### Operaciones idempotentes

- `startRun` verifica que no hay run activa antes de crear una nueva. Si ya existe, retorna la existente.
- `requestExtraction` verifica que la run está en status RUNNING antes de procesar. Si no, retorna error con el ExtractionResult existente.
- **Nunca diseñes una operación crítica que pueda ejecutarse dos veces con efectos dobles.**

### No duplicar lógica entre frontend y backend

- Las fórmulas de cálculo de peligro y loot viven en `/server/domain/run/run.calculator.ts`.
- **No copies esas fórmulas al cliente.** El cliente recibe el resultado del servidor, no lo recalcula.
- Si el cliente necesita una estimación local, usa la última respuesta del servidor como base y aplica interpolación lineal simple — no la fórmula real.

---

## 10. Reglas de capas y límites de importación

### La cadena de capas es estricta y unidireccional

```
UI (Client/Server Components)
  │ props / Server Action calls
  ▼
Server Actions  (/server/actions/*.actions.ts)
  │ delegan a
  ▼
Application Services  (/server/services/)
  │ coordinan múltiples
  ▼
Domain Services  (/server/domain/**/*.service.ts)
  │ usan
  ▼
Repositories  (/server/repositories/)
  │ usan
  ▼
DB (PostgreSQL via Prisma)
```

**Application Services vs Domain Services — regla de decisión:**
- ¿La operación involucra más de un Domain Service en una misma transacción? → Application Service.
- ¿Solo un dominio? → Domain Service directamente desde el Server Action.
- Ejemplo: `requestExtraction` afecta run + inventario + ledger → Application Service (`run-resolution.service.ts`).
- Ejemplo: `getEquipment` solo toca inventario → Domain Service directamente.

### Qué puede importar cada capa

| Capa | Puede importar | No puede importar |
|------|----------------|-------------------|
| `/app` (RSC) | `/server/services/*`, `/server/domain/*` (solo lectura directa), `/components/*`, `/types/*`, `/config/*` | Nada de PrismaClient directo |
| `/components/ui` | `/lib/utils/*`, `/types/dto.types.ts`, `/types/api.types.ts` | Nada de `/server/*` |
| `/components/game` | `/types/dto.types.ts`, `/lib/*`, `/components/ui/*` | Nada de `/server/*`, nada de game.types.ts internos |
| `/server/actions` | `/server/services/*`, `/server/domain/*`, `/server/auth/*`, `/lib/validators/*`, `/types/*` | No a `/app/*`, no a `/components/*` |
| `/server/services` | `/server/domain/*`, `/server/repositories/*`, `/types/*` | No a Next.js, no a PrismaClient directo |
| `/server/domain` | `/server/repositories/*` (solo su propio repo), `/types/*`, `/config/*` | No a Next.js, no a PrismaClient directo, no a otros domain services |
| `/server/repositories` | `/server/db/client.ts`, `/types/*` | No a `/server/domain/*`, no a `/server/services/*` |
| `/lib` | `/types/*` | Nada de server-only, nada de `/server/*` |
| `/hooks` | `/types/dto.types.ts`, `/types/api.types.ts`, `/lib/*` | Nada de `/server/*` |
| `/config` | `/types/*` | Nada de lógica de negocio |

### Violaciones prohibidas

- `import { db } from '@/server/db/client'` en cualquier lugar fuera de `/server/repositories/*`.
- Tipos de Prisma exportados fuera de `/server/repositories/*`.
- Tipos de dominio (`game.types.ts`) importados en componentes UI — usar DTOs.
- `import` de un Server Action en `/lib/*` o `/hooks/*`.
- Lógica de dominio en un `page.tsx` o `layout.tsx`.
- Un Domain Service importando otro Domain Service directamente.
- Un Repository importando lógica de dominio.
- Archivos bajo `/server/*` sin `import 'server-only'` en la primera línea.
- Hooks de browser sin `import 'client-only'` en la primera línea.
- Importar un Domain Service directamente desde una página sin un comentario justificativo.

### Estructura de carpetas — obligatoria

La estructura definida en `docs/architecture.md` sección 10 es la estructura oficial. No mover archivos a lugares no documentados sin actualizar la documentación primero.

---

## 11. Reglas de Server Actions

1. **Siempre marcados con `'use server'` en la primera línea del archivo** (no en la función individual, a nivel de módulo).
2. **Siempre validar el input con Zod** antes de cualquier lógica.
3. **Siempre verificar autenticación** como primera operación. Si no hay sesión, retornar `{ success: false, error: { code: 'UNAUTHORIZED' } }`.
4. **Nunca implementar lógica de dominio directamente** en el action. Llamar a un domain service.
5. **Siempre retornar `ActionResult<T>`** — nunca lanzar excepciones al cliente.
6. **Capturar errores de dominio** (`DomainError`) y mapearlos a `ActionResult.error`.
7. **Nunca retornar datos sensibles** (contraseñas, tokens, IDs internos innecesarios) al cliente.
8. **Registrar en AuditLog** cualquier acción sensible (iniciar run, extraer, modificar equipo).
9. **Llamar `revalidatePath`** tras mutaciones exitosas para invalidar cache de RSC relevantes.
10. **Usar nombres descriptivos:** `startRun`, `requestExtraction`, `equipItem` — verbos claros.

### Firma estándar

```typescript
"use server";

export async function startRun(
  input: StartRunInput,
): Promise<ActionResult<StartRunResult>> {
  // 1. Validar input con Zod
  // 2. Verificar sesión
  // 3. Llamar domain service
  // 4. revalidatePath si éxito
  // 5. Retornar ActionResult
}
```

---

## 12. Reglas de validación

1. **Zod en todos los inputs de Server Actions.** Sin excepciones.
2. **Los schemas de Zod viven en `/lib/validators/*.validators.ts`.**
3. **Valida antes de tocar la lógica de dominio.** Si el input falla la validación, retorna error inmediatamente.
4. **Tipos de Zod exportados:** usar `z.infer<typeof Schema>` para el tipo TypeScript correspondiente.
5. **Validaciones de negocio que requieren DB** (ej: "¿existe esta zona?") van en el domain service, no en el schema de Zod.
6. **Nunca confíes en tipos TypeScript al runtime.** Los tipos son compile-time. Un input malformado puede llegar aunque TypeScript "diga" que es válido.

---

## 13. Reglas de UI con shadcn/ui + Tailwind

1. **shadcn/ui es la librería de componentes base.** No introducir otras librerías de UI sin justificación explícita y documentada.
2. **Tailwind 4 como único sistema de estilos.** Sin CSS modules, sin styled-components, sin inline styles arbitrarios.
3. **Instalar solo los componentes de shadcn que se usen.** No instalar el kit completo para usar 2 componentes.
4. **Personalizar via `globals.css` y design tokens de Tailwind**, no sobreescribiendo clases de shadcn directamente en componentes.
5. **Antes de instalar un componente shadcn**, leer el skill `shadcn` para verificar la forma correcta de hacerlo con la versión del stack actual.
6. **No mezclar múltiples librerías visuales.** Si shadcn tiene un componente equivalente, usarlo en lugar de añadir otra dependencia.
7. **Clases de Tailwind en el JSX/TSX mediante `cn()` de `/lib/utils/cn.ts`** (wrapper de `clsx` + `twMerge`). No concatenar strings de clases manualmente.

---

## 14. Reglas de UX y diseño visual

### La fantasía visual es terminal espacial post-industrial

- Paleta oscura. Pocos colores. Alto contraste. Sin decoración innecesaria.
- La UI debe sentirse como un HUD de juego híridizado con un dashboard de datos.
- **No introducir estilos "marketing website"** (gradientes pastel, ilustraciones cartoon, typografía display enorme) que rompan la fantasía del juego.
- **No introducir animaciones pesadas** (parallax, 3D transforms, partículas complejas) en MVP.

### Información primero

- La barra de peligro, el loot estimado y el botón de extracción son los elementos más importantes. Siempre visibles sin scroll.
- El estado de la run activa es prioritario sobre cualquier otro panel.
- La densidad de información es un feature, no un problema. Pero la jerarquía visual debe ser clara.

### Calidad percibida

- Los estados de loading deben ser explícitos (skeletons, spinners contextuales). No dejar al usuario sin feedback.
- Los errores deben ser leíbles, humanos y accionables.
- Las transiciones deben ser rápidas (150–200ms), no flashy.
- Los botones deben tener estados de hover, active y disabled claramente diferenciados.

### No inventar sistemas visuales

- Si shadcn tiene un componente, usarlo. No crear un componente equivalente desde cero porque "tengo una idea mejor".
- La consistencia visual es más valiosa que la originalidad por componente.

---

## 15. Reglas de accesibilidad

1. **Todo elemento interactivo tiene un `aria-label` descriptivo** si el texto visible no es suficiente.
2. **El botón "Extraer" debe ser activable por teclado** (focus visible, Enter/Space funcionan).
3. **Las barras de progreso (peligro, XP)** usan `role="progressbar"` con `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.
4. **Las modales y diálogos** usan el componente `Dialog` de shadcn que ya gestiona focus trap correctamente.
5. **El contraste de texto** debe cumplir WCAG AA mínimo (4.5:1 para texto normal).
6. **No usar solo color para comunicar estado crítico.** El estado de catástrofe debe tener texto y/o icono además del color rojo.
7. **Aplicar el skill `accessibility`** antes de dar por terminado cualquier componente interactivo.

---

## 16. Manejo de errores

### En Server Actions

```typescript
try {
  const result = await runService.startRun(userId, input.zoneId);
  revalidatePath("/dashboard");
  return { success: true, data: result };
} catch (error) {
  if (error instanceof DomainError) {
    return {
      success: false,
      error: { code: error.code, message: error.message },
    };
  }
  console.error("[startRun] Unexpected error:", { userId, error });
  return {
    success: false,
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." },
  };
}
```

### En componentes

- Usar `error.tsx` de Next.js App Router para errores de render.
- Para errores de Server Actions, mostrar el `error.message` del `ActionResult` o un mensaje genérico si el código es `INTERNAL_ERROR`.
- **Nunca exponer stack traces al cliente.**

### Errores esperados vs inesperados

- `DomainError` (run ya activa, zona inválida, no autenticado) → mappear a código claro y mostrar al usuario.
- `PrismaClientKnownRequestError` (unique constraint) → mappear a DomainError apropiado antes de subir la cadena.
- Errores desconocidos → loguear en servidor con contexto completo, devolver `INTERNAL_ERROR` al cliente.

---

## 17. Contrato estándar de respuesta para Server Actions

```typescript
// /types/api.types.ts

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ActionError };

export interface ActionError {
  code: ErrorCode;
  message: string;
  details?: unknown; // solo en desarrollo, nunca en producción
}

export type ErrorCode =
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RUN_ALREADY_ACTIVE"
  | "RUN_NOT_RUNNING"
  | "RUN_ALREADY_RESOLVED"
  | "INSUFFICIENT_BALANCE"
  | "TRANSACTION_FAILED"
  | "INTERNAL_ERROR";
```

**Regla:** todos los Server Actions del proyecto usan este contrato sin excepción. No crear response shapes ad-hoc por action.

---

## 17b. DTOs, View Models y Read Models — reglas

**Principio:** la UI solo consume DTOs definidos en `/types/dto.types.ts`. Nunca tipos de Prisma ni tipos de dominio interno.

### Flujo de transformación

```
Prisma result → (mapeo en Repository) → Domain Type → (mapeo en Service/Action) → DTO → UI
```

### Reglas concretas

1. **Los mapeos `toDomain` viven al final del archivo `.repository.ts` correspondiente** — función `toXxxDomain(prismaResult): XxxDomain`.
2. **Los mapeos `toDTO` viven en el Application Service** o en el Server Action que construye la respuesta — función `toXxxDTO(domain): XxxDTO`.
3. **Nunca hacer el mapeo dentro del componente React.** El componente recibe el DTO ya listo.
4. **Los DTOs son interfaces planas** — sin métodos, sin Date objects, sin tipos de Prisma, sin enums de Prisma.
5. **Fechas en DTOs:** siempre `string` (ISO 8601). El componente cliente las parsea si necesita mostrarlas.
6. **IDs en DTOs:** incluir solo los IDs que la UI necesita para identificar recursos al disparar acciones (`runId` para solicitar extracción, `itemDefinitionId` para equipar).
7. **No incluir campos de auditoría** (`createdAt` interno, `updatedAt`) en DTOs a menos que la UI los muestre.
8. **Los DTOs de estado de run activa** nunca incluyen `startedAt` como Date — solo como string ISO para que el timer visual del cliente lo parsee.

### DTOs mínimos del MVP (referencia rápida)

| DTO | Usado en |
|-----|----------|
| `RunStateDTO` | Hook `useRunPolling`, polling del estado |
| `PlayerStateDTO` | Dashboard principal |
| `ExtractionResultDTO` | Pantalla de resultado post-run |
| `InventoryItemDTO` | Grid de inventario |
| `EquipmentDTO` | Panel de equipo |
| `RunHistoryCardDTO` | Historial de runs |

Ver definición completa en `docs/architecture.md` sección 10b.

---

## 18. Reglas de logging y auditoría

### Qué se registra en AuditLog

- `run.start` — iniciar expedición (userId, zoneId, runId)
- `run.extract` — extracción exitosa (userId, runId, lootSnapshot, currencyEarned)
- `run.fail` — catástrofe (userId, runId, dangerLevelAtFail, lootLost)
- `run.cancel` — cancelación (userId, runId, reason)
- `inventory.equip` — cambio de equipo (userId, slot, itemId)
- `economy.adjustment` — ajuste admin (userId, amount, reason)

### Formato de logs de servidor

```
[timestamp] [level] [action] { userId, runId?, error?, durationMs? }
```

### Lo que NO se loguea

- Passwords, tokens, secrets.
- Datos de tarjetas de pago (no aplica en MVP).
- Información médica o sensible (no aplica).
- Stack traces completos en respuestas al cliente.

### Nivel mínimo de logging

- `console.error` en todos los errores inesperados en servidor, con contexto.
- `console.warn` en acciones sospechosas pero no erróneas (ej: intento de doble extracción).
- Guardar AuditLog en DB para acciones de dominio críticas.

---

## 19. Testing mínimo esperado

### ¿Qué debe tener tests?

- Las funciones de `/server/domain/run/run.calculator.ts` (`computeDangerLevel`, `computePendingLoot`) **son puras y deben tener unit tests**.
- Las funciones de economía (cálculo de `balanceAfter`, validación de cantidades) **deben tener unit tests**.
- Los schemas de Zod deben tener tests de casos válidos e inválidos.

### ¿Qué puede omitirse en MVP?

- Tests de integración de DB (se puede hacer con DB de test en Fase 1).
- E2E tests completos (Playwright) en MVP, pero la estructura debe estar preparada.
- Tests de componentes UI de renderizado (bajo valor en MVP).

### Estrategia de testing

- Las funciones de dominio son las más críticas y las más fáciles de testear: son puras, sin dependencias externas.
- Una inversión pequeña en tests de calculador de peligro y loot previene bugs costosos de balance.
- Antes de cambiar una fórmula de peligro o loot, debe haber un test que verifique el comportamiento anterior.

---

## 19b. Reglas de `server-only` y `client-only`

**Regla:** todo archivo que nunca debe ejecutarse en el cliente debe importar `server-only` en su primera línea. Todo hook que depende de APIs de browser debe importar `client-only`.

```typescript
// Primera línea obligatoria en cualquier archivo bajo /server/*
import 'server-only';

// Primera línea en hooks que usan browser APIs
import 'client-only';
```

**Por qué:** si un Client Component importa accidentalmente un archivo de servidor (por ejemplo, uno que usa PrismaClient), Next.js no necesariamente falla en runtime — pero puede filtrar secretos al cliente. `server-only` hace que el build falle inmediatamente con un error claro antes de que llegue a producción.

**Instalar una única vez:**
```bash
npm install server-only client-only
```

**Archivos que requieren `server-only` (obligatorio):**
- Todos los archivos bajo `/server/` (actions, domain, services, repositories, auth, db)

**Archivos que requieren `client-only` (cuando aplica):**
- Hooks que leen `window`, `document`, `navigator`, o usan librerías browser-only

**Ver la especificación completa en `docs/architecture.md` sección 9b.**

---

## 20. Patrones prohibidos

Los siguientes patrones están **explícitamente prohibidos** en este repositorio:

### Arquitecturales

- ❌ `import { db } from '@/server/db/client'` en cualquier componente de `/components/*` o `/app/*`
- ❌ Lógica de dominio directamente en un `page.tsx` o `layout.tsx`
- ❌ Fetch client-side a rutas internas propias para mutaciones (usar Server Actions)
- ❌ WebSockets, SSE o tiempo real en MVP sin justificación arquitectónica documentada
- ❌ Colas de trabajo externas, microservicios, CQRS, event sourcing en MVP
- ❌ Duplicar lógica de cálculo de peligro/loot en cliente
- ❌ Importar un archivo de `/server/*` sin `import 'server-only'` en su primera línea
- ❌ Optimistic updates en balance de créditos o inventario antes de recibir el `ActionResult`
- ❌ Editar una migración de Prisma ya aplicada en producción
- ❌ `prisma db push` en producción (solo `prisma migrate deploy`)

### De datos

- ❌ `UPDATE CurrencyLedger` — el ledger es append-only
- ❌ Almacenar cantidades de inventario en JSONB
- ❌ Almacenar balance de monedas en JSONB
- ❌ Confiar en timestamps enviados por el cliente para calcular peligro o duración de run
- ❌ Permitir doble extracción sin verificar el status de la run primero
- ❌ Calcular `SUM(amount)` del ledger en producción para obtener balance (usar `balanceAfter`)

### De TypeScript

- ❌ `as any` sin comentario que justifique por qué no hay alternativa
- ❌ `// @ts-ignore` sin ticket de deuda técnica asociado
- ❌ Tipos de retorno `any` o `unknown` sin manejo explícito
- ❌ `as SomeType` sin verificación previa de que el cast es seguro

### De UI

- ❌ CSS modules, styled-components, inline styles arbitrarios (solo Tailwind + shadcn)
- ❌ Múltiples librerías de UI sin justificación documentada
- ❌ Animaciones pesadas (3D transforms, partículas) en MVP
- ❌ Estilos que rompan la fantasía visual de "terminal espacial post-industrial"
- ❌ Texto de botones sin estados de hover, active y disabled diferenciados

---

## 21. Anti-patterns específicos de vibe coding

Estos son los errores más comunes cuando se programa "por instinto" sin plan:

- **"Lo meto en el componente y ya":** no. Si hay lógica de negocio, va en el servidor. Si hay acceso a DB, va en un repositorio.
- **"Con un useEffect lo resuelvo":** useEffect es para efectos de UI (timers visuales, polling). No para cargar datos que debería cargar un Server Component.
- **"Hago el fetch directamente desde el cliente":** no para mutaciones. Server Actions existen exactamente para esto.
- **"El usuario no va a manipular esto":** el servidor siempre valida como si el usuario fuera a intentarlo.
- **"Añado este campo al objeto y lo paso por JSON":** si ese campo afecta la economía, necesita una columna relacional, no un JSON blob.
- **"Añado una feature extra que creo que quedaría bien":** no. El alcance es el documentado. Propón antes de implementar.
- **"Lo refactorizo después":** no. Si el patrón correcto lleva 20 minutos más pero evita deuda técnica, es la opción correcta.
- **"No necesito tests para esto":** las funciones de calculador de peligro y loot siempre necesitan tests.
- **"El `any` es temporal":** no existen `any` temporales. Si no sabes el tipo, investígalo antes de seguir.
- **"Actualizo el inventario visualmente antes de que responda el servidor":** no para economía. La latencia es aceptable; la inconsistencia no.
- **"Edito la migración directamente":** nunca. Crea una nueva migración con `prisma migrate dev`.
- **"Importo este service del servidor desde el componente directamente":** solo Application Services desde Server Components, y siempre con `server-only` en el archivo del service.

---

## 22. Cómo proponer cambios grandes

**Un cambio es "grande"** si:

- Modifica la state machine de la expedición
- Cambia el schema de la DB (nuevas tablas, renombres, cambios de tipo)
- Cambia fórmulas de peligro o loot
- Añade un sistema completamente nuevo
- Cambia el contrato de una Server Action existente
- Modifica cómo se calcula el balance del ledger

**Proceso obligatorio para cambios grandes:**

1. Abrir un ADR (Architecture Decision Record) en `/docs/decisions/NNN-titulo.md`
2. Describir: qué cambia, por qué, alternativas consideradas, decisión elegida, consecuencias
3. Actualizar `docs/architecture.md` o `docs/game-design.md` según corresponda
4. Obtener revisión antes de implementar (aunque seas solo tú — el ADR actúa como tu propia revisión estructurada)

---

## 23. Cómo documentar decisiones nuevas

### ADR (Architecture Decision Record)

Formato estándar en `/docs/decisions/NNN-titulo-kebab-case.md`:

```markdown
# NNN — Título de la decisión

**Estado:** PROPUESTO | ACEPTADO | RECHAZADO | OBSOLETO
**Fecha:** YYYY-MM-DD

## Contexto

Por qué surgió esta decisión.

## Decisión

Qué se decidió exactamente.

## Alternativas consideradas

Qué otras opciones existían y por qué no se eligieron.

## Consecuencias

Qué implica esta decisión: positivo, negativo, incertidumbre.
```

### Actualizaciones en documentación existente

- Si cambias el schema de Prisma, actualiza la sección 12 de `docs/architecture.md`.
- Si cambias una fórmula de diseño, actualiza `docs/game-design.md`.
- Si cambias la estructura de carpetas, actualiza la sección 10 de `docs/architecture.md`.
- **No dejes documentación desactualizada.** Es peor que no tener documentación.

---

## 24. MVP Vertical Slice — referencia rápida

> Para detalles completos, ver `docs/architecture.md` sección 22.

### Pantallas del MVP jugable

| Ruta | Qué hace |
|------|----------|
| `/` | Landing con CTA de login (Google OAuth) |
| `/dashboard` | Estado del chatarrero + expedición activa (panel inline) + balance + XP |
| `/inventory` | Grid de InventoryItemDTO con tooltips y botones de equipar |
| `/history` | Lista de RunHistoryCardDTO (paginada) |

### Server Actions obligatorias del MVP

| Action | Descripción |
|--------|-------------|
| `startRun(zoneId)` | Inicia expedición. Verifica ausencia de run activa. |
| `requestExtraction(runId)` | Extrae botín. Verifica RUNNING. Transacción completa. |
| `equipItem(slot, itemDefinitionId)` | Equipa item. Solo si no hay run activa. |
| `unequipItem(slot)` | Vacía slot. Solo si no hay run activa. |

### Flujos de lectura obligatorios

| Función | Desde | Frecuencia |
|---------|-------|------------|
| `getPlayerState(userId)` | Server Component en `/dashboard` | Por render (RSC) |
| `getRunState(userId)` | Hook `useRunPolling` | Cada 5s (Client) |
| `getInventory(userId)` | Server Component en `/inventory` | Por render (RSC) |
| `getRunHistory(userId)` | Server Component en `/history` | Por render (RSC) |

**Todo lo demás — múltiples zonas, vendors, crafting, logros, prestige — es Fase 1+. No implementar en MVP.**

---

## 25. Definition of Done para cualquier tarea

Una tarea está **done** cuando cumple **todos** los siguientes criterios:

- [ ] El código compila sin errores de TypeScript (`tsc --noEmit` pasa)
- [ ] No hay `eslint` warnings en los archivos modificados
- [ ] La funcionalidad cumple exactamente lo que se pidió — ni más, ni menos
- [ ] La lógica de dominio está en el servidor, no en el cliente
- [ ] Los Server Components y Server Actions usan DTOs como respuesta — nunca tipos de Prisma
- [ ] Todos los inputs de Server Actions están validados con Zod
- [ ] Todas las operaciones críticas tienen ownership check
- [ ] Todas las operaciones multi-tabla están en transacción
- [ ] Si hay nuevo campo de economía: es columna relacional, no JSONB
- [ ] Los componentes de UI respetan la paleta visual del juego
- [ ] Los estados interactivos tienen feedback visual (hover, active, disabled, loading)
- [ ] Los elementos interactivos tienen atributos de accesibilidad básicos
- [ ] Si hay nueva lógica de calculador de peligro/loot: tiene unit test
- [ ] Si el cambio modifica el schema de DB: hay migración y el `docs/architecture.md` está actualizado
- [ ] Si el cambio es grande: hay ADR en `/docs/decisions/`
- [ ] El AuditLog registra la acción si es sensible

---

## 26. Checklist final que la IA debe revisar antes de dar una tarea por terminada

Antes de decir "listo" o "terminado", responde estas preguntas:

**Dominio y datos:**

- [ ] ¿Hay algún cálculo de economía, peligro o loot que ocurra en el cliente? Si sí: muévelo al servidor.
- [ ] ¿Hay alguna operación multi-tabla fuera de una transacción? Si sí: añade la transacción.
- [ ] ¿Hay algún campo de cantidad, balance o resultado en JSONB sin justificación? Si sí: normaliza.
- [ ] ¿Se verifica el ownership antes de cada operación sobre recursos del usuario? Si no: añade la verificación.
- [ ] ¿Todos los inputs de Server Actions pasan por Zod? Si no: añade la validación.

**Arquitectura y capas:**

- [ ] ¿El código está en la capa correcta (UI / Action / AppService / DomainService / Repository / DB)? Si no: muévelo.
- [ ] ¿Los Server Actions y Server Components devuelven DTOs (no Domain Types ni Prisma types)? Si no: añade el mapeo.
- [ ] ¿Hay algún `import` que cruce los límites de capa prohibidos? Si sí: refactoriza.
- [ ] ¿Se respeta la estructura de carpetas de `docs/architecture.md` sección 10? Si no: reorganiza.
- [ ] ¿Un Domain Service está importando a otro Domain Service? Si sí: mueve la coordinación a un Application Service.

**UI y experiencia:**

- [ ] ¿Los estados de loading, error y éxito están manejados en la UI? Si no: añade el feedback.
- [ ] ¿La UI respeta la paleta y fantasía visual del producto (terminal espacial post-industrial)? Si no: revisa.
- [ ] ¿Los elementos interactivos son accesibles por teclado? Si no: corrige.

**Calidad de código:**

- [ ] ¿Hay algún `any` sin justificación? Si sí: escribe el tipo correcto.
- [ ] ¿El código es legible sin comentarios adicionales? Si no: refactoriza o comenta donde sea no obvio.
- [ ] ¿Hay funciones de más de 50 líneas que podrían dividirse? Si sí: divide.

**Documentación:**

- [ ] ¿El cambio modifica el schema, las fórmulas o la arquitectura? Si sí: actualiza la documentación.
- [ ] ¿El cambio es "grande" según la definición de la sección 22? Si sí: crea el ADR.

**Si cualquier respuesta es "no" o "sí debería pero no lo hice":** corrige antes de marcar la tarea como terminada.

---

## 26b. Concurrency Model — referencia rápida

> Para la especificación completa, ver `docs/architecture.md` sección 25b.

| Escenario | Qué ocurre | Qué hacer |
|-----------|------------|------------|
| Doble click en Extraer | 2ª llamada recibe `RUN_NOT_RUNNING` | `disabled={isLoading}` en el botón desde el primer click |
| Doble pestaña | Pestaña B ve estado stale hasta siguiente poll | UI muestra error explicativo al siguiente intento |
| Poll durante transacción | Poll ve estado pre-commit (PostgreSQL read committed) | Nada. Siguiente poll ya tiene estado correcto |
| Equipar con run activa | `InventoryService` lanza `RUN_ALREADY_ACTIVE` | UI deshabilita botones de equipar si hay run activa |
| Optimistic update en economía | Prohibido | Esperar siempre el `ActionResult` del servidor |

---

## Apéndice A: Restricciones de alcance del MVP

Las siguientes features **no existen y no deben implementarse** en MVP aunque parezcan sencillas o útiles:

- PvP de cualquier tipo
- Chat entre jugadores
- Mercado entre jugadores
- Sistema de guilds o clanes
- Múltiples runs simultáneas
- Multi-character management
- Notificaciones push externas
- Panel de administración complejo
- Monetización real (por implementar en Fase 2+)
- Sistema de logros formal (por implementar en Fase 1+)
- Vendors / tiendas (por implementar en Fase 1+)
- Crafting (por implementar en Fase 1+)
- Prestige (por implementar en Fase 2+)
- Múltiples zonas (por implementar en Fase 1+, aunque la arquitectura las soporta)
- Microservicios, colas externas, event sourcing
- WebSockets / SSE (polling cada 5s es suficiente en MVP)
- Panel de `/profile` o `/settings` (solo dashboard, inventory, history en MVP)

**Si la implementación de una feature no pedida "ya que estamos" añade 1 hora de trabajo, la respuesta es no.** El scope está definido. Propón la feature para una fase futura y sigue con el MVP.

---

## Apéndice B: Decisiones de MVP cerradas (no reabrir sin ADR)

| Decisión | Resultado |
|----------|-----------|
| Auth provider | Auth.js v5 + Google OAuth. Sin magic link ni email+password en MVP. |
| Estado `preparing` | Suprimido. `startRun` va directo a RUNNING. |
| Semilla de catástrofe | Determinista por `runId`. Anti-cheat + reproducibilidad. |
| Moneda en MVP | 1 moneda: Créditos de Chatarrero (CC). Sin moneda premium. |
| Recuperación en catástrofe | 20% del loot, 0 créditos, 25% XP. Parámetros en config. |
| Plataforma | Vercel + Neon PostgreSQL. |
| Polling vs WebSockets | Polling cada 5s en MVP. WebSockets en Fase 3 si métricas lo justifican. |
| Zonas en MVP | 1 zona: Cementerio de Naves. Segunda zona en Fase 1. |
| Cooldown entre runs | Sin cooldown en MVP. Reintento inmediato permitido. |
| Expedición en dashboard | La vista de expedición es un panel en /dashboard, no una ruta separada. |

---

## Apéndice C: Glosario rápido del dominio

> Definiciones completas en `docs/architecture.md` sección 29. Aquí solo los términos que más riesgo de confusión tienen.

| Término en código | Significado |
|------------------|-----------|
| `Run` | Entidad de dominio = instancia de expedición. Usar `Run`, no `Expedition`, en código. |
| `Catastrophe` | Condición calculada (`dangerLevel >= threshold`). NO es un estado de DB. La run sigue siendo `RUNNING` en DB hasta que `requestExtraction` la cierra. |
| `status: "catastrophe"` en `RunStateDTO` | Estado solo en el DTO de polling. Significa que el usuario puede extraer pero con penalización. La DB dice `RUNNING`. |
| `status: FAILED` en DB | Estado terminal de la run, DESPUÉS de que `requestExtraction` se ejecutó con catástrofe. |
| `Loot` | Pendiente = calculado, no persistido. Real = en `InventoryItem` tras transacción de extracción. |
| `Credits` | Siempre `Int` en DB. Nunca floats. Siempre via `CurrencyLedger`. |
| `Inventory` | Items en `InventoryItem`. El equipo en slots (`EquipmentSlot`) es separado. |
| `equipment` | Snapshot al inicio de run (`equipmentSnapshot` en `ActiveRun`). Slots actuales en `EquipmentSlot`. Nunca los mismos. |

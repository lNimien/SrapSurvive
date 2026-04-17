# Scrap & Survive — MVP Specification

> **Status:** Operativo. Autoridad máxima para la implementación del MVP.
> **Referencia:** Basado en `docs/architecture.md`, `docs/game-design.md` y `AGENTS.md`.
> **Decisión:** Cualquier conflicto entre este documento y los anteriores se resuelve actualizando este fichero con un ADR en `/docs/decisions/`.

---

## 1. Resumen del MVP

Scrap & Survive MVP construye **un ciclo de juego jugable de extremo a extremo** para un jugador humano real.

| Dimensión | Decisión |
|-----------|----------|
| Zona | 1 zona: Cementerio de Naves (`shipyard_cemetery`) |
| Pantallas | 4: landing `/`, dashboard `/dashboard`, inventario `/inventory`, historial `/history` |
| Server Actions | 4: `startRun`, `requestExtraction`, `equipItem`, `unequipItem` |
| Read flows | 4: `getPlayerState`, `getRunState`, `getInventory`, `getRunHistory` |
| Auth | Auth.js v5 + Google OAuth únicamente |
| Moneda | Créditos de Chatarrero (CC) — sin sinks en MVP |
| Tiempo de loop | 3–8 minutos por run competente |
| Niveles | 1–10 |
| Items base | 4 materiales stackables + 1 equipo de inicio por slot HEAD |

**El MVP está terminado cuando un jugador nuevo puede:**
1. Entrar con Google OAuth
2. Ver su chatarrero con equipo inicial
3. Lanzar una expedición
4. Ver la barra de peligro crecer y el loot acumularse
5. Extraer y ver el resultado con los items en su inventario
6. Lanzar una segunda expedición inmediatamente

---

## 2. Qué significa "MVP jugable"

El MVP **es** jugable cuando se cumplen **todos** estos criterios:

- [ ] Un usuario nuevo puede completar su primera run sin instrucciones externas
- [ ] La barra de peligro comunica su estado de forma inequívoca (verde / amarillo / rojo pulsante)
- [ ] El botón "Extraer" responde con feedback visual inmediato (loading state ≤ 100ms)
- [ ] El inventario muestra el loot recibido tras extraer
- [ ] El balance de créditos cambia tras una extracción exitosa
- [ ] La segunda run puede iniciarse sin recargar la página
- [ ] Una catástrofe muestra un estado claro ("DESASTRE") y el botón "Extraer" sigue siendo pulsable
- [ ] El historial muestra la run completada con su estado (éxito o fracaso)
- [ ] El juego funciona en Chrome desktop moderno sin errores de consola en flujo normal

El MVP **no** es jugable si cualquiera de los anteriores falla.

---

## 3. Fuera del MVP (scope cerrado — no implementar)

Las siguientes features no deben aparecer en ningún fichero del MVP. Si la IA las ve convenientes, debe proponerlas como ADR de Fase 1+ antes de implementarlas.

| Prohibido | Motivo |
|-----------|--------|
| Múltiples zonas | Solo `shipyard_cemetery` en MVP |
| Vendors / tiendas | No hay sinks de economía |
| Crafting | No hay recipes |
| Sistema de logros | No hay tabla `Achievement` |
| Cooldown entre runs | Sin cooldown — reintento inmediato |
| Panel de perfil `/profile` | No es necesario para el loop |
| Panel de ajustes `/settings` | No es necesario para el loop |
| Leaderboards | No hay componente social |
| WebSockets / SSE | Polling cada 5s es suficiente |
| Multi-run simultáneo | Constraint `@unique` en `ActiveRun.userId` |
| Audio / música | Siguiente fase |
| i18n | Siguiente fase |
| Panel de administración | Siguiente fase |
| Monetización | Siguiente fase |
| Mobile responsive completo | Nice-to-have si no bloquea desarrollo |
| Magic link / email+password auth | Solo Google OAuth |
| Prestige / soft reset | Fase 2 |
| Seguro de extracción | Considerado para Fase 1 |

**La IA debe rechazar silenciosamente cualquier razonamiento del tipo "ya que estamos añado X".** El scope del MVP es el definido aquí.

---

## 4. Pantallas del MVP

### 4.1 Landing — `/`

**Propósito:** Punto de entrada para usuarios no autenticados. CTA de login. Sin estado de juego.

**Datos necesarios:** Ninguno (pública, no protegida).

**Componentes principales:**
- `HeroSection` — título, subtítulo, descripción del juego en ≤3 líneas
- `LoginButton` — botón "Entrar con Google" que dispara `signIn('google')` de Auth.js

**Acciones posibles:**
- Iniciar login con Google OAuth

**Estados manejados:**

| Estado | Comportamiento |
|--------|---------------|
| No autenticado | Mostrar CTA |
| Autenticado (acceso directo a `/`) | Redirect a `/dashboard` via middleware |
| Error de OAuth callback | Mostrar mensaje "Error al iniciar sesión. Inténtalo de nuevo." |

**Reglas:**
- No hay formulario de email/password. Solo el botón de Google.
- Si el usuario ya está autenticado, el middleware redirige a `/dashboard` antes de renderizar.
- La página es Server Component puro — sin `"use client"`.

---

### 4.2 Dashboard — `/dashboard`

**Propósito:** Vista central del juego. Siempre visible cuando el jugador está autenticado. Muestra el chatarrero, el estado de expedición activa, el balance y el XP.

**Datos necesarios:** `PlayerStateDTO` (perfil, nivel, XP, balance, equipo, run activa).

**Componentes principales:**

| Componente | Tipo | Responsabilidad |
|-----------|------|-----------------|
| `ScrapperCard` | Server | Avatar + nombre + nivel + XP bar |
| `EquipmentDisplay` | Server | 6 slots de equipo con icons y stats sumarios |
| `ExpeditionPanel` | Client | Panel de run activa — condicional (ver abajo) |
| `DangerMeter` | Client | Barra de peligro con color y texto de estado |
| `LootPreview` | Client | Estimación de loot pendiente con "~" prefix |
| `ExtractButton` | Client | Botón de extracción con loading/disabled state |
| `StartRunSection` | Client | Selector de zona + botón "Lanzar expedición" (visible si no hay run activa) |
| `ResourceBar` | Server | Balance de créditos CC visibles |
| `RunResultModal` | Client | Modal de resultado post-extracción (éxito o catástrofe) |

**Estado condicional del `ExpeditionPanel`:**

```
Si PlayerStateDTO.activeRun === null:
  → Mostrar StartRunSection (selector de zona + botón)
  → Ocultar DangerMeter, LootPreview, ExtractButton

Si PlayerStateDTO.activeRun !== null:
  → Ocultar StartRunSection
  → Mostrar DangerMeter + LootPreview + ExtractButton
  → useRunPolling activo (cada 5s)
```

**Acciones posibles:**
- `startRun(zoneId)` — desde `StartRunSection`
- `requestExtraction(runId)` — desde `ExtractButton`

**Estados de loading/error/empty/success:**

| UI Element | Loading | Error | Empty | Success |
|-----------|---------|-------|-------|---------|
| Dashboard completa | Skeleton de toda la página | `error.tsx` de Next.js | — | Estado completo renderizado |
| `StartRunSection` | Botón disabled + spinner | Toast "Error al iniciar. Inténtalo." | — | `ExpeditionPanel` aparece |
| `ExtractButton` | Disabled + spinner desde click | Toast con `error.message` | — | `RunResultModal` aparece |
| `DangerMeter` | — | Último valor conocido | — | Valor actualizado en poll |
| `LootPreview` | — | Último valor conocido | — | Estimación actualizada |

**Reglas críticas:**
- `ExtractButton` se deshabilita en el momento del click (antes de recibir respuesta del servidor).
- El `RunResultModal` se muestra cuando `requestExtraction` retorna con `success: true`. No antes.
- El polling se detiene cuando no hay run activa (estado idle).
- El `useRunPolling` usa `setInterval` de 5000ms, no `useEffect` con recursión.

---

### 4.3 Inventario — `/inventory`

**Propósito:** Ver todos los items del jugador. Equipar/desequipar items de equipo. Sin crafting, sin venta en MVP.

**Datos necesarios:** `InventoryItemDTO[]` + `EquipmentDTO` (para saber qué está equipado).

**Componentes principales:**

| Componente | Tipo | Responsabilidad |
|-----------|------|-----------------|
| `InventoryGrid` | Server | Grid de items con rareza, cantidad, nombre |
| `InventorySlot` | Server | Slot individual con color de rareza |
| `ItemTooltip` | Client | Tooltip con stats completos del item al hover |
| `EquipmentPanel` | Server | 6 slots de equipo con items actuales |
| `EquipButton` | Client | Botón de equipar/desequipar con estado |

**Acciones posibles:**
- `equipItem(slot, itemDefinitionId)` — desde item de equipo en inventario
- `unequipItem(slot)` — desde slot de equipo ocupado

**Estados de loading/error/empty/success:**

| UI Element | Loading | Error | Empty | Success |
|-----------|---------|-------|-------|---------|
| Grid completo | Skeletons en cada slot | `error.tsx` | "Tu inventario está vacío. Lanza una expedición para conseguir items." | Grid renderizado |
| `EquipButton` | Disabled + spinner | Toast "No se pudo equipar. Inténtalo." | — | Slot actualizado visualmente vía revalidatePath |
| Items durante run activa | — | — | — | Botones de equipar disabled con tooltip "No puedes cambiar equipo durante una expedición" |

**Reglas críticas:**
- Si hay una run activa (`PlayerStateDTO.activeRun !== null`), todos los botones de equipar/desequipar están `disabled`. El tooltip explica por qué.
- La página se re-renderiza tras `equipItem` exitoso vía `revalidatePath('/inventory')`.
- Los items de COMMON y UNCOMMON rareza son primarily materiales stackables.
- No hay paginación en MVP si el inventario tiene < 100 slots distintos. Si supera, implementar paginación simple.

---

### 4.4 Historial — `/history`

**Propósito:** Ver las runs pasadas del jugador (éxito y fracaso). Solo visualización — sin acciones.

**Datos necesarios:** `RunHistoryCardDTO[]` (lista paginada, máx. 20 por página).

**Componentes principales:**

| Componente | Tipo | Responsabilidad |
|-----------|------|-----------------|
| `RunHistoryList` | Server | Lista de cards con runs pasadas |
| `RunHistoryCard` | Server | Card individual: estado, zona, duración, loot, fecha |
| `RunStatusBadge` | Server | Badge "EXTRAÍDO" (verde) o "FALLIDO" (rojo) |
| `PaginationControls` | Client | Botones siguiente/anterior página |

**Acciones posibles:** Ninguna. Página de solo lectura.

**Estados de loading/error/empty/success:**

| UI Element | Loading | Error | Empty | Success |
|-----------|---------|-------|-------|---------|
| Lista completa | Skeletons | `error.tsx` | "Todavía no has completado ninguna expedición. ¡Lanza tu primera!" | Lista de cards |

**Reglas críticas:**
- La paginación es server-side: el parámetro `?page=N` en la URL. El Server Component lee `searchParams`.
- Máximo 20 runs por página.
- Ordenadas por `resolvedAt DESC` — la más reciente primero.
- No hay filtros en MVP.

---

## 5. Server Actions del MVP

### 5.1 `startRun`

**Archivo:** `/server/actions/run.actions.ts`

**Input:**
```typescript
interface StartRunInput {
  zoneId: string; // "shipyard_cemetery" en MVP
}
```

**Validación (Zod):**
- `zoneId`: string, non-empty, valor válido en `config/game.config.ts`. Si no es válido: error `VALIDATION_ERROR`.

**Precondiciones (verificadas en `RunResolutionService`):**
1. Sesión activa — `getCurrentUserId()` no lanza error.
2. No existe `ActiveRun` para el userId actual. Si existe: error `RUN_ALREADY_ACTIVE`.
3. `zoneId` existe en la configuración de zonas. Si no: error `VALIDATION_ERROR`.

**Efectos (transacción):**
1. `RunRepository.createRun({ userId, zoneId, startedAt: new Date(), equipmentSnapshot, dangerConfig })` — `startedAt` siempre del servidor.
2. `AuditLogRepository.create({ userId, action: 'run.start', payload: { runId, zoneId } })`.
3. `revalidatePath('/dashboard')`.

**DTO de salida:** `RunStartedDTO`
```typescript
interface RunStartedDTO {
  runId: string;
  zoneId: string;
  startedAt: string; // ISO 8601
  dangerConfig: {
    catastropheThreshold: number;
  };
}
```

**Errores posibles:**

| Código | Cuándo |
|--------|--------|
| `UNAUTHORIZED` | No hay sesión |
| `RUN_ALREADY_ACTIVE` | Ya existe una `ActiveRun` para el usuario |
| `VALIDATION_ERROR` | `zoneId` inválido o formato incorrecto |
| `INTERNAL_ERROR` | Error inesperado de DB |

---

### 5.2 `requestExtraction`

**Archivo:** `/server/actions/run.actions.ts`

**Input:**
```typescript
interface RequestExtractionInput {
  runId: string;
}
```

**Validación (Zod):**
- `runId`: string, non-empty, formato cuid válido.

**Precondiciones (verificadas en `RunResolutionService`):**
1. Sesión activa.
2. Existe `ActiveRun` para el userId con `id === runId`. Si no: error `RUN_NOT_RUNNING`.
3. `ActiveRun.status === RUNNING`. Si no: error `RUN_NOT_RUNNING`.
4. `ActiveRun.userId === authenticatedUserId` (ownership). Si no: error `UNAUTHORIZED`.

**Efectos (una única transacción — ver `RunResolutionService.resolveExtraction()`):**
1. Calcular `elapsedSeconds = Date.now() - run.startedAt`.
2. Calcular `dangerLevel = RunCalculator.computeDangerLevel(elapsedSeconds, run.dangerConfig)`.
3. Calcular `isCatastrophe = dangerLevel >= run.dangerConfig.catastropheThreshold`.
4. Calcular `pendingLoot = RunCalculator.computePendingLoot(elapsedSeconds, run.equipmentSnapshot, dangerLevel)`.
5. Calcular `finalLoot = isCatastrophe ? applyCatastrophePenalty(pendingLoot) : pendingLoot`.
6. Calcular `currencyEarned = isCatastrophe ? 0 : computeCurrencyReward(elapsedSeconds, dangerLevel)`.
7. Calcular `xpEarned = isCatastrophe ? Math.floor(computeXpReward(...) * 0.25) : computeXpReward(...)`.
8. Para cada item en `finalLoot`: `InventoryRepository.upsertItem(tx, { userId, itemDefinitionId, +quantity })`.
9. `prevBalance = EconomyRepository.getCurrentBalance(tx, userId)`.
10. `EconomyRepository.createLedgerEntry(tx, { userId, amount: currencyEarned, balanceAfter: prevBalance + currencyEarned, referenceId: runId, entryType: isCatastrophe ? CATASTROPHE_PENALTY : EXTRACTION_REWARD })`.
11. `UserProgressionRepository.incrementXp(tx, { userId, xp: xpEarned, totalScrapCollected: totalMaterialsCount })`.
12. `ExtractionResultRepository.create(tx, { fullSnapshot })`.
13. `ActiveRunRepository.delete(tx, { runId })`. // la fila se BORRA; ExtractionResult es el registro histórico
14. `AuditLogRepository.create(tx, { userId, action: isCatastrophe ? 'run.fail' : 'run.extract', payload })`.
15. `revalidatePath('/dashboard')`, `revalidatePath('/inventory')`, `revalidatePath('/history')`.

**DTO de salida:** `ExtractionResultDTO`
```typescript
interface ExtractionResultDTO {
  runId: string;
  status: "extracted" | "failed";
  durationSeconds: number;
  dangerLevelAtClose: number;
  catastropheOccurred: boolean;
  loot: PendingLootDTO[];
  currencyEarned: number;
  xpEarned: number;
}
```

**Errores posibles:**

| Código | Cuándo |
|--------|--------|
| `UNAUTHORIZED` | No hay sesión o el runId no pertenece al usuario |
| `RUN_NOT_RUNNING` | No existe run activa, o el status no es RUNNING |
| `TRANSACTION_FAILED` | Error transaccional de DB — estado de run no cambia |
| `INTERNAL_ERROR` | Error inesperado |

**Invariante de idempotencia:** si el status ya no es RUNNING al verificar, se devuelve `RUN_NOT_RUNNING` — sin efectos secundarios. Nunca doble transferencia de loot.

---

### 5.3 `equipItem`

**Archivo:** `/server/actions/inventory.actions.ts`

**Input:**
```typescript
interface EquipItemInput {
  slot: "HEAD" | "BODY" | "HANDS" | "TOOL_PRIMARY" | "TOOL_SECONDARY" | "BACKPACK";
  itemDefinitionId: string;
}
```

**Validación (Zod):**
- `slot`: enum válido de `EquipmentSlot`.
- `itemDefinitionId`: string, non-empty, cuid válido.

**Precondiciones (verificadas en `InventoryService`):**
1. Sesión activa.
2. No existe `ActiveRun` activa para el usuario. Si existe: error `RUN_ALREADY_ACTIVE`.
3. El `InventoryItem` con `itemDefinitionId` existe en el inventario del usuario y `quantity >= 1`.
4. La `ItemDefinition` tiene `isEquipable: true`.
5. El `slot` es el correcto para el tipo del item (verificar en `ItemDefinition.metadata.validSlots`).

**Efectos (transacción):**
1. `EquipmentSlotRepository.upsert(tx, { userId, slot, itemDefinitionId })`.
2. `AuditLogRepository.create(tx, { userId, action: 'inventory.equip', payload: { slot, itemDefinitionId } })`.
3. `revalidatePath('/inventory')`, `revalidatePath('/dashboard')`.

**DTO de salida:** `EquipmentDTO` (el estado actual del equipo tras la acción).

**Errores posibles:**

| Código | Cuándo |
|--------|--------|
| `UNAUTHORIZED` | No hay sesión |
| `RUN_ALREADY_ACTIVE` | El usuario tiene una expedición activa |
| `NOT_FOUND` | El item no está en el inventario del usuario |
| `VALIDATION_ERROR` | Slot incompatible con el tipo de item |
| `INTERNAL_ERROR` | Error inesperado |

---

### 5.4 `unequipItem`

**Archivo:** `/server/actions/inventory.actions.ts`

**Input:**
```typescript
interface UnequipItemInput {
  slot: "HEAD" | "BODY" | "HANDS" | "TOOL_PRIMARY" | "TOOL_SECONDARY" | "BACKPACK";
}
```

**Validación (Zod):**
- `slot`: enum válido de `EquipmentSlot`.

**Precondiciones:**
1. Sesión activa.
2. No existe `ActiveRun` activa para el usuario. Si existe: error `RUN_ALREADY_ACTIVE`.
3. El slot tiene un item equipado. Si está vacío: operación no-op (retornar success sin efectos).

**Efectos (transacción):**
1. `EquipmentSlotRepository.clear(tx, { userId, slot })` — setea `itemDefinitionId: null`.
2. `AuditLogRepository.create(tx, { userId, action: 'inventory.equip', payload: { slot, itemDefinitionId: null } })`.
3. `revalidatePath('/inventory')`, `revalidatePath('/dashboard')`.

**DTO de salida:** `EquipmentDTO`.

**Errores posibles:**

| Código | Cuándo |
|--------|--------|
| `UNAUTHORIZED` | No hay sesión |
| `RUN_ALREADY_ACTIVE` | El usuario tiene una expedición activa |
| `INTERNAL_ERROR` | Error inesperado |

---

## 6. Read Flows del MVP

### 6.1 `getPlayerState(userId)`

**Quién lo llama:** Server Component en `/dashboard/page.tsx` (render inicial).

**Frecuencia:** Por render de página. No es polling — es RSC.

**Responsable:** `PlayerStateService.getPlayerState(userId)` — Application Service.

**Capas:** `PlayerStateService` → `UserProfileRepository` + `UserProgressionRepository` + `EconomyRepository` + `EquipmentSlotRepository` + `RunRepository`.

**DTO devuelto:** `PlayerStateDTO`
```typescript
interface PlayerStateDTO {
  userId: string;
  displayName: string;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  currencyBalance: number;
  equipment: EquipmentDTO;
  activeRun: RunStateDTO | null;
}
```

**Política de cache/revalidación:**
- Sin cache en RSC. Siempre fresco en render.
- Revalidado tras `startRun` y `requestExtraction` vía `revalidatePath('/dashboard')`.

---

### 6.2 `getRunState(userId)` — endpoint de polling

**Quién lo llama:** Hook `useRunPolling` en `ExpeditionPanel` (Client Component), cada 5 segundos mientras hay una run activa.

**Frecuencia:** Cada 5000ms. El polling se detiene si el `RunStateDTO.status` es `"idle"`.

**Implementación:** Route Handler `GET /api/game/run-state` — es el único Route Handler de gameplay permitido, justificado porque es consumido por el cliente para polling frecuente sin mutación.

> **Excepción documentada:** `getRunState` usa un Route Handler (`GET /api/game/run-state?userId={userId}`) en lugar de un Server Action porque los Server Actions son solo para mutaciones. Las consultas de polling son lectura pura que el cliente consume con `fetch`. El userId se obtiene de la sesión en el servidor — no del query param.

**Capas:** Route Handler → `PlayerStateService.getRunState(userId)` → `RunRepository` → `RunCalculator`.

**DTO devuelto:** `RunStateDTO`
```typescript
interface RunStateDTO {
  status: "idle" | "running" | "catastrophe";
  runId?: string;
  zoneId?: string;
  startedAt?: string;       // ISO 8601
  dangerLevel?: number;     // 0.0 – 1.0+
  catastropheThreshold?: number;
  pendingLoot?: PendingLootDTO[];
  elapsedSeconds?: number;
}
```

**Regla crítica:** `status: "catastrophe"` en el DTO no cambia el estado en DB. La run sigue siendo `RUNNING` en db. El cliente solo muestra estado de emergencia. Solo `requestExtraction` puede cerrar la run.

**Política de cache:** Sin cache. `cache: 'no-store'` en el fetch. Los datos de run activa nunca se cachean.

---

### 6.3 `getInventory(userId)`

**Quién lo llama:** Server Component en `/inventory/page.tsx`.

**Frecuencia:** Por render de página (RSC).

**Responsable:** `InventoryRepository.getInventoryByUser(userId)` — llamado directo desde el Server Component (único dominio, lectura simple).

**DTO devuelto:** `InventoryItemDTO[]` + `EquipmentDTO`.

**Política de cache/revalidación:**
- Sin cache explícito en RSC para el inventario.
- Revalidado tras `equipItem` y `unequipItem` vía `revalidatePath('/inventory')`.
- Revalidado tras `requestExtraction` (loot nuevo) vía `revalidatePath('/inventory')`.

---

### 6.4 `getRunHistory(userId, page)`

**Quién lo llama:** Server Component en `/history/page.tsx`.

**Frecuencia:** Por render de página (RSC). El parámetro `page` viene de `searchParams`.

**Responsable:** `ExtractionResultRepository.getRunHistory(userId, { page, pageSize: 20 })` — llamado directo desde el Server Component.

**DTO devuelto:** `RunHistoryCardDTO[]` + `{ totalPages, currentPage }`.

**Política de cache/revalidación:**
- Cache corto (30s via `cache()` de React) — los resultados históricos son inmutables.
- Revalidado con `revalidatePath('/history')` tras cada `requestExtraction` exitosa.

---

## 7. Flujo completo del usuario: primer login → segunda run

```
[Usuario llega a /]
  ↓ Ve la landing page con botón "Entrar con Google"
  ↓ Hace click → Auth.js redirige a Google
  ↓ Autoriza → Auth.js callback
  ↓ signIn callback: crea UserProfile + UserProgression + EquipmentSlots (x6) + item inicial en HEAD + entrada CC=0 en CurrencyLedger
  ↓ Next.js middleware detecta sesión → redirige a /dashboard

[Dashboard — primer render]
  ↓ getPlayerState() devuelve: nivel 1, XP 0, 0 CC, equipo básico en HEAD, activeRun: null
  ↓ Se renderiza ScrapperCard + EquipmentDisplay + StartRunSection (sin ExpeditionPanel)
  ↓ Tooltip inline minimal: "Tu chatarrero está listo. Selecciona una zona y lánzalo."

[El usuario hace click en "Lanzar Expedición"]
  ↓ startRun({ zoneId: "shipyard_cemetery" })
  ↓ Server verifica: sin run activa ✓, zona válida ✓
  ↓ Crea ActiveRun con startedAt = now(), equipmentSnapshot, dangerConfig
  ↓ revalidatePath('/dashboard')
  ↓ El Server Component re-renderiza → activeRun ≠ null
  ↓ ExpeditionPanel aparece, StartRunSection desaparece
  ↓ useRunPolling se activa (5s interval)

[Expedición en progreso — el usuario monitorea]
  ↓ Cada 5s: GET /api/game/run-state → RunStateDTO
  ↓ DangerMeter actualiza (verde → amarillo → rojo)
  ↓ LootPreview muestra "~X chatarra, ~Y células, ~Z CC"
  ↓ [Si dangerLevel >= 0.90]: status = "catastrophe"
      → DangerMeter pulsa en rojo
      → Texto: "¡PELIGRO CRÍTICO! Extrae ahora."
      → ExtractButton sigue activo

[El usuario hace click en "Extraer"]
  ↓ ExtractButton → disabled inmediatamente + spinner
  ↓ requestExtraction({ runId })
  ↓ Server calcula loot final en transacción completa
  ↓ Si éxito: ExtractionResultDTO { status: "extracted", loot: [...], currencyEarned: X }
  ↓ Si catástrofe: ExtractionResultDTO { status: "failed", catastropheOccurred: true, loot: [20%], currencyEarned: 0 }
  ↓ RunResultModal aparece con el resultado
  ↓ revalidatePath → Server Components refrescan: inventario, balance, historial

[RunResultModal — el usuario ve el resultado]
  ↓ Lista de items ganados con iconos y cantidades
  ↓ Créditos ganados (o 0 si catástrofe)
  ↓ XP ganado + si subió de nivel: "¡Subiste al nivel N!"
  ↓ Duración de la run
  ↓ Nivel de peligro al cerrar
  ↓ Botón "Continuar" para cerrar el modal

[El usuario cierra el modal]
  ↓ Dashboard en estado idle: StartRunSection visible
  ↓ useRunPolling detenido (status: "idle")

[Segunda run — inmediatamente disponible]
  ↓ El usuario puede lanzar otra run sin recargar la página
  ↓ Inventario actualizado visible en /inventory
  ↓ Primera run aparece en /history
```

---

## 8. Vertical Slices recomendados en orden

### Slice 1: Fundamentos de infraestructura

**Objetivo:** Proyecto funcionando localmente con auth, DB y shell visual.

**Incluye:**
- Next.js 16 App Router configurado con TypeScript strict
- Tailwind 4 + shadcn/ui configurados (instalar: Button, Card, Badge, Progress, Dialog, Skeleton, Tooltip, Separator)
- Prisma schema completo con todas las tablas del MVP + migraciones iniciales aplicadas
- Auth.js v5 configurado con Google OAuth
- Middleware de protección de rutas (`/dashboard`, `/inventory`, `/history` requieren sesión)
- `app/layout.tsx` con SessionProvider de Auth.js
- `app/(game)/layout.tsx` con shell visual (topbar con balance + avatar, sidebar con navegación)
- `app/(marketing)/page.tsx` — landing con botón de login funcional
- Variables de entorno documentadas en `.env.example`
- `server/db/client.ts` — PrismaClient singleton
- `import 'server-only'` en todos los archivos bajo `/server/`

**No incluye:** Lógica de juego. Sin startRun. Sin expediciones.

**Criterio de done:**
- [ ] `npm run dev` sin errores
- [ ] Login con Google OAuth funciona y crea sesión
- [ ] `/dashboard` protegida: redirige a `/` si no hay sesión
- [ ] La DB está disponible y las migraciones están aplicadas (`prisma migrate status` sale OK)
- [ ] El shell visual (layout del juego) renderiza sin errores para usuario autenticado

---

### Slice 2: Creación automática de perfil y estado inicial

**Objetivo:** Un usuario que hace login por primera vez tiene un estado de juego válido (perfil, progresión, equipo vacío, balance en 0).

**Incluye:**
- Callback `signIn` de Auth.js que detecta primer login y crea: `UserProfile`, `UserProgression`, 6 `EquipmentSlot` vacíos, entrada inicial en `CurrencyLedger` (amount: 0, balanceAfter: 0)
- `ItemDefinition` seed con los 4 materiales base + 1 item de equipo inicial para HEAD
- Creación del item inicial de HEAD en `InventoryItem` del usuario nuevo
- `PlayerStateService.getPlayerState(userId)` implementado y funcionando
- `app/(game)/dashboard/page.tsx` que llama a `getPlayerState` y renderiza `PlayerStateDTO`
- `ScrapperCard` mostrando nivel 1, XP 0
- `ResourceBar` mostrando 0 CC
- `EquipmentDisplay` mostrando el item en HEAD y slots vacíos

**No incluye:** Expediciones. Polling. ExtractButton.

**Criterio de done:**
- [ ] Usuario nuevo ve su dashboard con datos reales de DB al primer login
- [ ] El ChatarreROCard muestra nivel 1 y nombre de Google OAuth
- [ ] Los 6 slots de equipo se renderizan (1 con el item inicial, 5 vacíos)
- [ ] El balance muestra 0 CC
- [ ] No hay errores de TypeScript ni de consola

---

### Slice 3: Inventario y equipo

**Objetivo:** El jugador puede ver su inventario y equipar/desequipar items.

**Incluye:**
- `app/(game)/inventory/page.tsx` con `getInventory` funcional
- `InventoryGrid` con `InventorySlot` y colores de rareza
- `ItemTooltip` (Client Component) con nombre, descripción, stats
- `equipItem` Server Action completa con validaciones y transacción
- `unequipItem` Server Action completa
- `EquipButton` con loading state y disable during run
- Feedback de error en toast cuando la acción falla
- `revalidatePath` en acciones que actualiza el inventario visualmente

**No incluye:** Runs activas. El disable de equipar "durante run" puede ser básico (siempre habilitado si no hay run, que en este slice es siempre).

**Criterio de done:**
- [ ] `/inventory` muestra el item inicial en HEAD y los materiales correctamente
- [ ] El usuario puede equipar un item de inventario en un slot compatible
- [ ] El usuario puede desequipar un item de un slot
- [ ] Los cambios se reflejan en `/dashboard` (EquipmentDisplay actualizado)
- [ ] Si el usuario intenta equipar un item en un slot incompatible, recibe error claro
- [ ] No hay errores de TypeScript

---

### Slice 4: Iniciar expedición

**Objetivo:** El jugador puede lanzar una expedición y ver la UI cambiar al estado de "expedición activa".

**Incluye:**
- `StartRunSection` con el único selector de zona (Cementerio de Naves — hardcoded en MVP)
- `startRun` Server Action completa con validaciones y transacción
- `RunResolutionService.startRun()` implementado
- Lógica condicional en `/dashboard` para mostrar `ExpeditionPanel` vs `StartRunSection`
- `ExpeditionPanel` básico con `DangerMeter` estático (peligro 0 hasta que haya polling)
- `LootPreview` básico con "~0 items" hasta que haya polling
- `ExtractButton` presente pero sin funcionalidad aún
- Manejo de error `RUN_ALREADY_ACTIVE` en la UI

**No incluye:** Polling real. Extracción. El DangerMeter aún no muestra valores dinámicos.

**Criterio de done:**
- [ ] El usuario puede pulsar "Lanzar Expedición"
- [ ] La UI cambia al estado de expedición activa (StartRunSection desaparece, ExpeditionPanel aparece)
- [ ] Si el usuario recarga la página, el estado de expedición se mantiene (viene de getPlayerState)
- [ ] Si el usuario intenta iniciar una segunda run (segunda pestaña), recibe error `RUN_ALREADY_ACTIVE`
- [ ] La `ActiveRun` existe en DB con los datos correctos

---

### Slice 5: Polling y UI dinámica de expedición

**Objetivo:** La expedición muestra valores reales que cambian con el tiempo. El peligro crece. El loot visible crece.

**Incluye:**
- `RunCalculator.computeDangerLevel()` implementado con fórmula cuadrática
- `RunCalculator.computePendingLoot()` implementado con fórmula lineal base
- Route Handler `GET /api/game/run-state` implementado con autenticación
- Hook `useRunPolling` (cada 5s) que llama al Route Handler y actualiza el estado del Client Component
- `DangerMeter` con color dinámico: verde (0–0.5), amarillo (0.5–0.75), rojo (0.75–0.9), rojo pulsante (0.9+)
- Texto de estado dinámico: "Zona estable" / "Señales de inestabilidad" / "¡PELIGRO CRÍTICO!"
- `LootPreview` mostrando items estimados con prefijo "~"
- `useCountdown` para mostrar tiempo transcurrido en la run
- Detección de `status: "catastrophe"` en el poll → UI de emergencia

**No incluye:** Extracción. El botón de extraer aún no funciona.

**Criterio de done:**
- [ ] El DangerMeter cambia de color mientras el tiempo pasa (verificable esperando ~2 minutos)
- [ ] El LootPreview muestra items crecientes
- [ ] Al superar `catastropheThreshold` (0.90), la UI entra en estado de emergencia
- [ ] El polling se detiene si el usuario navega a `/inventory` (el ExpeditionPanel no existe ahí)
- [ ] No hay memory leaks (el setInterval se limpia en el cleanup de useEffect)

---

### Slice 6: Extracción y resultado

**Objetivo:** El jugador puede extraer, el servidor resuelve la transacción completa y el jugador ve el resultado.

**Incluye:**
- `requestExtraction` Server Action completa con transacción atómica
- `RunResolutionService.resolveExtraction()` completo (loot transfer + ledger + XP + close run)
- `ExtractButton` funcional con `disabled={isLoading}` y spinner
- `RunResultModal` que muestra `ExtractionResultDTO`: items ganados, CC ganados, XP ganado, duración
- Manejo del caso de catástrofe en el modal (mensaje diferente)
- `revalidatePath` en las 3 rutas afectadas
- Actualización automática del dashboard post-extracción (balance, XP, equipo visible)

**No incluye:** Historial (eso es Slice 7). El sistema de subida de nivel no tiene que mostrar animación especial en este slice.

**Criterio de done:**
- [ ] El usuario extrae y el modal muestra los items correctos
- [ ] Los items aparecen en `/inventory` tras cerrar el modal
- [ ] El balance de CC aumenta en `/dashboard`
- [ ] La run aparece en `ExtractionResult` en DB con los datos correctos
- [ ] Si el usuario hace doble click rápido en "Extraer", solo se procesa una vez
- [ ] Si la catástrofe ya había ocurrido, el modal muestra el estado "DESASTRE" con el 20% del loot
- [ ] Idempotencia: si `requestExtraction` se llama con un `runId` ya cerrado, retorna `RUN_NOT_RUNNING`

---

### Slice 7: Historial de runs

**Objetivo:** El jugador puede ver sus runs pasadas.

**Incluye:**
- `app/(game)/history/page.tsx` completa
- `getRunHistory` implementado con paginación
- `RunHistoryList` + `RunHistoryCard` + `RunStatusBadge`
- Paginación server-side via `searchParams.page`
- Estado empty con CTA a `/dashboard`

**Criterio de done:**
- [ ] `/history` muestra las runs pasadas ordenadas por fecha DESC
- [ ] Las runs exitosas tienen badge verde "EXTRAÍDO"
- [ ] Las runs fallidas tienen badge rojo "FALLIDO"
- [ ] La paginación funciona si hay más de 20 runs
- [ ] Si no hay runs, se muestra el estado empty con CTA

---

### Slice 8: Polish, edge cases y criterios de calidad

**Objetivo:** El juego está terminado y pasa todos los acceptance criteria.

**Incluye:**
- Todos los estados de loading tienen skeletons apropiados
- Todos los errores tienen mensajes legibles para el usuario
- El disable de equipar durante run activa está implementado correctamente
- `error.tsx` en las rutas del juego
- `not-found.tsx` global
- Headers de seguridad en `next.config.ts`
- Revisión de accesibilidad básica (aria-labels, role="progressbar" en DangerMeter, focus en ExtractButton)
- `tsc --noEmit` pasa sin errores
- Revisión de la paleta visual (terminal espacial post-industrial)

**Criterio de done:**
- [ ] Todos los acceptance criteria de pantallas y actions pasan
- [ ] `tsc --noEmit` sin errores
- [ ] No hay `console.error` en el flujo normal de usuario
- [ ] El juego funciona en Chrome desktop moderno
- [ ] El usuario nuevo puede completar su primera run sin asistencia

---

## 9. Acceptance Criteria por pantalla

### `/` — Landing

- [ ] La página renderiza sin sesión (pública)
- [ ] El botón "Entrar con Google" dispara el flujo de OAuth
- [ ] Un usuario ya autenticado que navega a `/` es redirigido a `/dashboard` por el middleware
- [ ] No hay errores de consola en la carga de la página

### `/dashboard`

- [ ] Muestra nombre del usuario proveniente de Google OAuth
- [ ] Muestra nivel y XP actuales de `UserProgression`
- [ ] Muestra balance de CC de la última entrada de `CurrencyLedger`
- [ ] Muestra los 6 slots de equipo con su estado actual
- [ ] Si no hay run activa: muestra `StartRunSection` y oculta `ExpeditionPanel`
- [ ] Si hay run activa: muestra `ExpeditionPanel` y oculta `StartRunSection`
- [ ] `DangerMeter` cambia de color según `dangerLevel` del último poll
- [ ] `LootPreview` muestra items con prefijo "~"
- [ ] `ExtractButton` está deshabilitado mientras `isLoading === true`
- [ ] Al extraer con éxito: aparece `RunResultModal` con los items correctos
- [ ] Al extraer con catástrofe: el modal muestra estado "DESASTRE" y el 20% del loot
- [ ] Tras cerrar el modal, el dashboard vuelve a estado idle (`StartRunSection` visible)
- [ ] Si `startRun` falla con `RUN_ALREADY_ACTIVE`: toast de error explicativo

### `/inventory`

- [ ] Muestra todos los items del usuario con cantidad, nombre y rareza
- [ ] Los items COMMON son grises, UNCOMMON son verdes, RARE son azules, EPIC son púrpura, LEGENDARY son dorados
- [ ] El tooltip del item muestra descripción completa y stats
- [ ] Si no hay run activa: botones de equipar están habilitados
- [ ] Si hay run activa: botones de equipar tienen `disabled` + tooltip explicativo
- [ ] Al equipar un item: se refleja en `/dashboard` tras la acción (revalidatePath)
- [ ] Si el inventario está vacío: mensaje de estado empty con CTA
- [ ] Los materiales stackables muestran su cantidad de forma prominente

### `/history`

- [ ] Lista runs en orden `resolvedAt DESC`
- [ ] Cada card muestra: status (éxito/fracaso), zona, duración, CC ganados, fecha
- [ ] Las runs fallidas tienen indicador visual diferenciado (badge rojo, texto de catástrofe)
- [ ] La paginación funciona (next/prev, 20 por página)
- [ ] Estado empty con CTA cuando no hay runs

---

## 10. Acceptance Criteria por Action

### `startRun`

- [ ] Crea `ActiveRun` con `startedAt` del servidor (no del cliente)
- [ ] El `equipmentSnapshot` contiene el equipo actual del usuario en el momento del inicio
- [ ] El `dangerConfig` contiene los parámetros de la zona `shipyard_cemetery`
- [ ] Falla con `RUN_ALREADY_ACTIVE` si ya existe una run activa
- [ ] Falla con `VALIDATION_ERROR` si `zoneId` no está en la config
- [ ] El `AuditLog` tiene una entrada `run.start`
- [ ] `revalidatePath('/dashboard')` se llama tras éxito

### `requestExtraction`

- [ ] El loot calculado corresponde a `elapsedSeconds` calculados en el momento del procesamiento del action (no del click del usuario)
- [ ] Si `dangerLevel >= 0.90` al procesar: `catastropheOccurred = true`, `currencyEarned = 0`, loot = 20%
- [ ] Si `dangerLevel < 0.90`: extracción exitosa, loot = 100%, `currencyEarned > 0`
- [ ] La entrada del ledger tiene `balanceAfter = prevBalance + currencyEarned`
- [ ] El `ActiveRun.status` cambia a `EXTRACTED` o `FAILED` tras la transacción
- [ ] El `ExtractionResult` contiene el snapshot completo de la run
- [ ] No se producen efectos si se llama con un `runId` ya resuelto (idempotencia)
- [ ] Falla con `UNAUTHORIZED` si el `runId` no pertenece al usuario autenticado
- [ ] Los items del loot aparecen en `InventoryItem` del usuario (upsert — no duplicados)
- [ ] El `AuditLog` tiene una entrada `run.extract` o `run.fail`

### `equipItem`

- [ ] Falla con `RUN_ALREADY_ACTIVE` si hay una run activa — el equipo nunca cambia durante una run
- [ ] Falla con `NOT_FOUND` si el item no está en el inventario del usuario
- [ ] Falla con `VALIDATION_ERROR` si el slot no es compatible con el item
- [ ] El `EquipmentSlot` se actualiza con el nuevo `itemDefinitionId`
- [ ] El equipo anterior en el slot no se elimina del inventario (solo se desequipa del slot)

### `unequipItem`

- [ ] Falla con `RUN_ALREADY_ACTIVE` si hay una run activa
- [ ] Si el slot ya está vacío: retorna success sin modificar la DB (no-op)
- [ ] El `EquipmentSlot` queda con `itemDefinitionId: null`

---

## 11. Estados y edge cases importantes

### Usuario sin run activa (estado idle)

- Dashboard muestra `StartRunSection` con el selector de zona.
- Los botones de equipar en `/inventory` están habilitados.
- `useRunPolling` está detenido.
- `getPlayerState().activeRun === null`.

### Usuario con run activa

- Dashboard muestra `ExpeditionPanel` (DangerMeter + LootPreview + ExtractButton).
- `useRunPolling` activo cada 5s.
- Los botones de equipar en `/inventory` están `disabled` con tooltip "No puedes cambiar equipo durante una expedición activa."
- Si el usuario navega a `/history` mientras la run está activa, el polling **no** continúa — el Client Component no está montado.
- Al volver a `/dashboard`, el polling se reinicia.

### Catástrofe ocurrida (status: "catastrophe" en RunStateDTO)

- `DangerMeter` en rojo pulsante.
- Texto: "¡PELIGRO CRÍTICO! Tu chatarrero apenas sobrevive. Extrae ahora."
- `ExtractButton` **sigue activo** — el usuario puede extraer y obtener el 20% del loot.
- Si el usuario extrae: `requestExtraction` detecta `isCatastrophe = true` en servidor, aplica penalización.
- El modal de resultado muestra: "DESASTRE — Tu chatarrero apenas escapó. Recuperaste el 20% del botín."
- **La run nunca pasa a `FAILED` por sí sola.** Solo `requestExtraction` cierra la run.

### Doble click en "Extraer"

- El `ExtractButton` se deshabilita (`disabled={true}`) en el momento del click, antes de recibir respuesta del servidor.
- Si de alguna forma llegan dos requests al servidor: el segundo find que `status !== RUNNING` y devuelve `RUN_NOT_RUNNING` — sin efectos.
- La UI maneja el error `RUN_NOT_RUNNING` de forma silenciosa (la run ya está cerrada, el modal ya debería estar mostrándose).

### Varias pestañas del mismo usuario

- Pestaña A: usuario extrae. La run se cierra en DB.
- Pestaña B: sigue mostrando la run como activa hasta el siguiente poll (máx. 5s).
- Al hacer poll, Pestaña B recibe `status: "idle"` (no hay `ActiveRun`).
- Si el usuario intenta extraer desde Pestaña B: `requestExtraction` devuelve `RUN_NOT_RUNNING`. La UI muestra toast: "Esta expedición ya fue extraída." y limpia el estado de polling.
- **No hay datos corruptos en ningún escenario de multi-pestaña.**

### Usuario nuevo sin inventario útil

- El callback `signIn` crea un item inicial en HEAD automatically.
- El usuario siempre tiene al menos 1 item de equipo al entrar por primera vez.
- El inventario de materiales está vacío — el estado empty de `/inventory` muestra: "Tu inventario está vacío. Lanza una expedición para conseguir materiales."
- El usuario puede lanzar una expedición sin inventario de materiales (el equipo en HEAD ya está activo).

### Usuario que cierra el navegador durante una run

- La run queda en estado `RUNNING` indefinidamente hasta que el usuario vuelva.
- Al volver a `/dashboard`, `getPlayerState` devuelve la run activa y el polling se reinicia.
- El DangerMeter muestra el nivel de peligro actual (calculado con el `startedAt` original del servidor).
- El loot acumulado se calcula correctamente con el tiempo real transcurrido.
- **En MVP no hay TTL de runs huérfanas.** Si el peligro ya superó el threshold: el usuario verá el estado de catástrofe y podrá extraer el 20%.

### Race condition: poll llega durante transacción de extracción

- `getRunState` es read-only. Si la `ActiveRun` todavía existe en DB (la transacción no hizo commit), devuelve el estado anterior.
- PostgreSQL read-committed garantiza que el poll nunca ve estados intermedios.
- Una vez que la transacción hace commit, el siguiente poll recibe un 404 de `ActiveRun` → devuelve `status: "idle"`.
- La UI ya tiene el `RunResultModal` abierto desde la respuesta de `requestExtraction` — el poll en estado "idle" es ignorado mientras el modal está visible.

---

## 12. Dependencias mínimas entre tareas

```
Slice 1 (infraestructura)
  └── Slice 2 (perfil inicial)
        ├── Slice 3 (inventario y equipo)       ← independiente entre sí
        └── Slice 4 (iniciar run)
              └── Slice 5 (polling UI dinámica)
                    └── Slice 6 (extracción)
                          └── Slice 7 (historial)
                                └── Slice 8 (polish)
```

**Dependencias críticas:**
- Slice 2 depende de Slice 1 (la DB debe existir).
- Slice 4 depende de Slice 2 (el usuario debe tener perfil válido para iniciar run).
- Slice 5 depende de Slice 4 (no hay nada que pollear si no hay runs).
- Slice 6 depende de Slice 5 (la extracción debe mostrar resultados basados en el estado de la run).
- Slice 3 puede implementarse en paralelo con Slices 4–5 (no tiene dependencia de runs).

---

## 13. Orden recomendado de implementación

```
1. prisma/schema.prisma completo → migrate dev
2. config/game.config.ts con ZoneConfig shipyard_cemetery y ItemDefinition seeds
3. server/db/client.ts + todos los repositories (esqueletos con tipos)
4. server/domain/run/run.calculator.ts (puras, con unit tests)
5. auth configuration (Auth.js v5 + signIn callback con creación de perfil)
6. app layout + middleware + shell visual
7. app/(marketing)/page.tsx — landing
8. PlayerStateService + getPlayerState
9. app/(game)/dashboard/page.tsx — render estático inicial
10. ScrapperCard + EquipmentDisplay + ResourceBar
11. InventoryRepository + getInventory
12. app/(game)/inventory/page.tsx + InventoryGrid
13. equipItem action + EquipButton
14. unequipItem action
15. startRun action + RunResolutionService.startRun()
16. StartRunSection + lógica condicional Dashboard
17. Route Handler GET /api/game/run-state
18. useRunPolling hook
19. DangerMeter + LootPreview dinámicos
20. requestExtraction action + RunResolutionService.resolveExtraction()
21. ExtractButton funcional
22. RunResultModal
23. ExtractionResultRepository + getRunHistory
24. app/(game)/history/page.tsx + RunHistoryCard
25. Estados de loading (skeletons)
26. Estados de error (toasts, error.tsx)
27. Edge cases (double click, multi-tab disable)
28. Accesibilidad básica
29. tsc --noEmit + fixes
30. Revisión visual final (paleta, tipografía, micro-animaciones mínimas)
```

---

## 14. Riesgos de implementación del MVP

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Fórmulas de peligro/loot desbalanceadas | Alta | Alto (retención) | Los parámetros están en `config/game.config.ts`. Ajustar sin cirugía de código. Tests del calculador con valores conocidos. |
| Auth.js v5 + Next.js 16 App Router config incorrecta | Media | Alto (bloquea todo) | Implementar y testear en Slice 1. Documentar en `.env.example`. Seguir skill `next-best-practices`. |
| Transacción de extracción demasiado larga (timeout) | Baja | Medio | Timeout configurado a 5000ms. Si supera, la run queda en RUNNING (reintentable). |
| Race conditions en multi-pestaña | Media | Bajo | Manejado por idempotencia y status check en transacción. Sin optimistic updates en economía. |
| Drift de clock cliente vs servidor | Alta | Bajo | Timer visual es solo estimación. El servidor siempre recalcula con `Date.now()`. |
| Prisma Neon Serverless cold starts | Media | Bajo | Pool de conexiones configurado. En MVP con pocos usuarios no es crítico. |
| UI demasiado densa / confusa para usuario nuevo | Media | Alto (primera impresión) | Test con usuario nuevo real antes de considerar MVP done. El flujo de primeros 10 mins debe funcionar sin contexto. |
| La catástrofe se percibe como injusta | Media | Alto (frustración) | Advertencias visuales progresivas. Tests de que las fórmulas sean predecibles. El primer fallo del usuario debe tener mensaje extra. |

---

## 15. Qué NO debe hacer la IA durante la implementación del MVP

**De scope:**
- No implementar vendors, tiendas ni sistema de compras aunque "parezca fácil de añadir".
- No implementar más de 1 zona aunque la configuración lo permita.
- No añadir cooldown entre runs (diseño aprobado: sin cooldown).
- No implementar lógica de crafting ni recipes.
- No añadir WebSockets ni SSE — polling es la decisión aprobada.
- No crear un panel de administración aunque los datos estén disponibles.
- No implementar lógica de prestige ni reset.
- No crear pantallas de perfil, settings ni onboarding modal separado.

**De arquitectura:**
- No poner lógica de dominio en `page.tsx` o `layout.tsx`.
- No importar PrismaClient fuera de `/server/repositories/`.
- No devolver tipos de Prisma desde Server Actions — solo DTOs.
- No omitir `import 'server-only'` en archivos bajo `/server/`.
- No hacer `fetch` client-side para mutaciones — usar Server Actions.
- No hacer `prisma db push` — usar `prisma migrate dev`.
- No editar migraciones ya generadas.
- No cachear datos de run activa ni balance de créditos.
- No hacer optimistic updates en balance o inventario antes de recibir `ActionResult`.
- No calcular loot, peligro ni resultados en el cliente — siempre en el servidor.

**De calidad:**
- No dejar `as any` sin justificación y comentario.
- No ignorar errores de TypeScript con `@ts-ignore` sin ticket de deuda técnica.
- No omitir estados de loading/error/empty en componentes interactivos.
- No exponer stack traces al cliente en mensajes de error.
- No omitir el `AuditLog` en acciones sensibles (startRun, requestExtraction, equipItem).
- No omitir ownership checks antes de operar sobre recursos de usuario.
- No omitir la transacción en operaciones multi-tabla.
- No marcar una tarea como "done" sin que `tsc --noEmit` pase sin errores.

**De diseño:**
- No introducir estilos de "marketing website" (gradientes pastel, tipografía display decorativa).
- No introducir animaciones 3D, parallax ni partículas.
- No mezclar múltiples librerías de UI — solo shadcn/ui + Tailwind 4.
- No crear componentes equivalentes a los de shadcn desde cero.
- No introducir segunda moneda o sistema de recursos adicional.

---

## Apéndice: Resumen de DTOs del MVP

```typescript
// Todos en /types/dto.types.ts

RunStartedDTO       → resultado de startRun exitoso
RunStateDTO         → resultado del polling de getRunState
ExtractionResultDTO → resultado de requestExtraction
PlayerStateDTO      → estado completo del jugador (dashboard)
InventoryItemDTO    → item del inventario
EquipmentDTO        → 6 slots de equipo con items actuales
RunHistoryCardDTO   → card del historial de runs
PendingLootDTO      → item de loot estimado (dentro de RunStateDTO)
```

## Apéndice: Parámetros de la zona initial (shipyard_cemetery)

```typescript
// Todos en /config/game.config.ts

const SHIPYARD_CEMETERY_CONFIG = {
  zoneId: "shipyard_cemetery",
  displayName: "Cementerio de Naves",
  baseRate: 0.04,               // nivel de peligro inicial
  quadraticFactor: 0.000004,    // acceleration — 90% de peligro a ~7.8 minutos (valor oficial v0)
  catastropheThreshold: 0.90,   // umbral de catástrofe
  spikeChance: 0.02,            // probabilidad de pico por tick
  spikeMagnitude: 0.05,         // magnitud de cada pico
  dangerLootBonus: 0.8,         // bonus de loot al 100% de peligro = +80%
  baseLootPerSecond: {
    "scrap_metal": 0.5,         // ~30 por minuto
    "energy_cell": 0.15,        // ~9 por minuto
    "recycled_component": 0.08, // ~5 por minuto
    "corrupted_crystal": 0.02,  // ~1 por minuto (raro)
  },
  baseCurrencyPerMinute: 45,    // CC por minuto base
  xpPerSecond: 3.5,             // XP por segundo base
};
```

## Apéndice: Fórmulas del servidor (referencia para implementación)

```typescript
// En /server/domain/run/run.calculator.ts

// Nivel de peligro a tiempo T (en segundos)
computeDangerLevel(elapsedSeconds, config):
  base = config.baseRate + config.quadraticFactor * (elapsedSeconds ** 2)
  spikes = sum de picos deterministas derivados de runId y timestamps
  return clamp(base + spikes, 0, 1.5)  // puede superar 1.0

// Loot pendiente a tiempo T
computePendingLoot(elapsedSeconds, equipmentSnapshot, dangerLevel, config):
  dangerBonus = 1 + (config.dangerLootBonus * dangerLevel)
  equipmentMultiplier = getEquipmentLootMultiplier(equipmentSnapshot)
  for each item in config.baseLootPerSecond:
    quantity = floor(config.baseLootPerSecond[item] * elapsedSeconds * dangerBonus * equipmentMultiplier)
  currencyEstimate = floor(config.baseCurrencyPerMinute * (elapsedSeconds / 60) * dangerBonus)
  return { items: [...], currencyEstimate }

// Penalización de catástrofe
applyCatastrophePenalty(pendingLoot):
  for each item: quantity = floor(item.quantity * 0.20)  // 20% del loot
  return { items: [...], currencyEarned: 0 }
```

> Las fórmulas concretas se finalizan durante su implementación. Los parámetros de `config/game.config.ts` permiten ajustarlas sin cambiar el código. Toda fórmula nueva requiere un unit test en `run.calculator.test.ts`.

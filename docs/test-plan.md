# Scrap & Survive — Test Plan

> **Status:** Plan de testing del MVP. Documento operativo para implementación incremental.
> **Audiencia:** Desarrolladores e IAs que implementan los tests.
> **Autoridad:** Este documento define qué se testea y en qué orden. Seguir el orden recomendado en sección 15.
> **Referencia:** Extiende `docs/architecture.md` y `docs/mvp-spec.md`.

---

## 1. Filosofía de testing del proyecto

### El test suite protege el dominio crítico, no demuestra cobertura

La métrica correcta no es "porcentaje de cobertura". La métrica correcta es:

> **¿Puede un cambio romper la economía o el resultado de una run y pasar desapercibido?**

Si la respuesta es no — el test suite cumple su función. Si es sí — hay un hueco que llenar.

Para un side project desarrollado con IA, la estrategia de testing tiene un objetivo adicional: **prevenir que la IA introduzca regresiones silenciosas en el dominio**. Un agente que modifica `run.calculator.ts` para "mejorar" la fórmula de peligro debe encontrar tests que fallen inmediatamente si rompe el comportamiento esperado.

### Principios operativos

1. **Primero el dominio puro.** Las funciones de cálculo de peligro, loot y XP son matemáticamente deterministas y no dependen de la DB. Son las más fáciles de testear y las más críticas de proteger. Van primero.

2. **Segundo las invariantes económicas.** El ledger, los ownership checks y la idempotencia de `requestExtraction` son las áreas de mayor riesgo. Un bug en una transacción puede corrompir datos de verdad.

3. **Tercero los flujos de acción.** Los Server Actions orquestan lógica compleja. Los tests de acción verifican que las capas se coordinan correctamente.

4. **UI/E2E al final.** Los tests de UI son caros de mantener y frágiles. En MVP solo se testean los flujos críticos del usuario end-to-end.

5. **No testear lo que no puede romperse.** Los DTOs simples, los componentes puramente presentacionales y el CSS no tienen tests. El tiempo de testing se invierte donde el riesgo es real.

---

## 2. Objetivos del test plan del MVP

Los tests del MVP tienen cuatro objetivos exactos.

### Objetivo 1: Proteger el `RunCalculator`

El `RunCalculator` es la pieza más crítica del servidor: calcula peligro, loot y XP. Es determinista y puro (sin efectos secundarios). Cualquier cambio en sus fórmulas que altere el comportamiento esperado debe ser detectado inmediatamente.

**Cobertura obligatoria:** los tests deben exhaustivamente cubrir los límites de la curva de peligro, los cálculos de loot con distintos multiplicadores, el cálculo de penalización de catástrofe y la XP ganada por run.

### Objetivo 2: Proteger la integridad económica

El ledger de créditos es append-only con `balanceAfter` materializado. Los tests deben verificar que ningún flujo puede:
- Crear una entrada del ledger sin `balanceAfter` correcto.
- Dar créditos por una run fallida.
- Dar loot dos veces por la misma run.
- Dejar la DB en estado inconsistente.

### Objetivo 3: Proteger la transición de estados de run

Una run tiene estados: `RUNNING → EXTRACTED | FAILED`. Ningún camino puede producir una transición inválida, y `requestExtraction` debe ser idempotente.

### Objetivo 4: Proteger ownership y autenticación

Ningún flujo puede operar sobre recursos de un usuario desde la sesión de otro usuario. Los ownership checks deben ser verificados en los tests de acción.

---

## 3. Tipos de tests

### Unit Tests — `/server/domain/**/__tests__/`

**Qué testean:** funciones puras sin dependencia de DB ni de Next.js. El `RunCalculator` completo, los validadores de Zod, las funciones auxiliares de dominio.

**Herramienta:** Vitest (integrado con Next.js 16, más rápido que Jest). Ejecuta en milisegundos.

**Cuándo se ejecutan:** en cada `git commit` (pre-commit hook) y en CI.

**Cobertura objetivo:** > 90% de las funciones en `/server/domain/run/run.calculator.ts`.

---

### Integration Tests — `/server/__tests__/integration/`

**Qué testean:** la interacción entre Domain Services, Repositories y la DB real (o una DB de test). Verifican que las transacciones son atómicas, que los ownership checks se ejecutan y que los estados de run transicionan correctamente.

**Herramienta:** Vitest + Prisma Client apuntando a una DB PostgreSQL de test. La DB de test se resetea antes de cada suite con `prisma migrate reset --force`.

**Cuándo se ejecutan:** antes de cada merge a la rama principal. No en cada commit (son más lentos).

**Cobertura objetivo:** cada flujo de mutación crítico (`startRun`, `requestExtraction`, `equipItem`) tiene al menos un test de camino feliz y uno de camino de error.

---

### Action Tests — `/server/__tests__/actions/`

**Qué testean:** los Server Actions como unidad funcional. Verifican que el action valida el input, verifica la sesión, llama al service correcto y retorna el `ActionResult` correcto. Los services se mockean para aislar la lógica del action.

**Herramienta:** Vitest + mocks de `auth()` y de los services. Sin DB real.

**Cuándo se ejecutan:** en cada commit.

**Cobertura objetivo:** cada action tiene tests para: sin sesión, input inválido, precondición fallida, éxito.

---

### E2E Tests — `/e2e/`

**Qué testean:** flujos completos del usuario con browser real. El happy path de la primera run, el modal de resultado y la navegación básica.

**Herramienta:** Playwright.

**Cuándo se ejecutan:** solo antes de deploy a producción. No en CI rutinaria — son los más lentos.

**Cobertura objetivo:** mínimo 3 flujos críticos del usuario. Ver sección 8.

---

## 4. Qué es obligatorio testear en MVP

Los siguientes módulos y flujos son **no negociables**. Una feature no está "done" si alguno de estos tests falta o falla.

### Obligatorio — Unit Tests

| Módulo | Por qué es obligatorio |
|--------|----------------------|
| `RunCalculator.computeDangerLevel()` | Es la función central del juego. Un error silencioso produce catástrofes inesperadas o la zona trivial. |
| `RunCalculator.computePendingLoot()` | Determina cuánto gana el jugador. Un error aquí puede inflar o destruir la economía. |
| `RunCalculator.applyCatastrophePenalty()` | Verifica que el 20% se calcula correctamente y que los créditos son 0. |
| `RunCalculator.computeXpReward()` | Verifica la progresión. |
| `RunCalculator.computeCurrencyReward()` | Verifica que los créditos no se otorgan en catástrofe. |
| Validadores de Zod (todos) | Verifica que el input malo se rechaza antes de tocar el dominio. |
| `EconomyRepository.computeBalanceAfter()` (si existe como función) | La función que calcula `balanceAfter` debe ser determinista y verificada. |

### Obligatorio — Integration Tests

| Flujo | Por qué es obligatorio |
|-------|----------------------|
| `startRun` — happy path | Verifica que la `ActiveRun` se crea con los datos correctos (startedAt del servidor, equipmentSnapshot correcto). |
| `startRun` — run ya activa | Verifica que devuelve `RUN_ALREADY_ACTIVE` y no crea duplicate. |
| `requestExtraction` — happy path | Verifica la transacción completa: loot → ledger → UserProgression → close run. |
| `requestExtraction` — catástrofe | Verifica la penalización: 20% loot, 0 CC, 25% XP, status FAILED. |
| `requestExtraction` — idempotencia | Verificar que llamar dos veces con el mismo `runId` ya cerrado devuelve `RUN_NOT_RUNNING` sin efectos. |
| `requestExtraction` — ownership | Verificar que un userId diferente no puede extraer la run de otro. |
| `equipItem` — run activa | Verifica que devuelve `RUN_ALREADY_ACTIVE` y no modifica el equipo. |
| `CurrencyLedger` — balanceAfter | Verifica que cada entrada del ledger tiene el `balanceAfter` correcto respecto a la entrada anterior. |

### Obligatorio — E2E

| Flujo E2E | Por qué es obligatorio |
|----------|----------------------|
| Login con Google OAuth (simulado) | Verifica que el flujo de autenticación funciona end-to-end. |
| Prime loop: login → dashboard → start run → extract → result modal | El happy path completo en un browser real. |
| Catástrofe end-to-end | Verificar que la UI entra en estado de emergencia y el modal muestra catástrofe. |

---

## 5. Qué se puede posponer a Fase 1

Los siguientes elementos son importantes pero no bloquean el MVP. Se implementan cuando haya vendors, nuevas zonas o monetización activa.

| Test pospuesto | Razón |
|---------------|-------|
| Tests de UI de inventario completo | La UI de inventario es visualización — el riesgo real está en las actions. |
| Tests de historial (`/history`) | Es solo lectura con query simple. Sin riesgo de corrupción. |
| Tests de rendimiento y carga | En MVP no hay escala. |
| Tests de la suscripción VIP | No existe en MVP. |
| Tests de vendors y crafting | No existen en MVP. |
| Tests de la página de landing (`/`) | Es HTML estático con un botón. |
| Tests de accesibilidad automatizados | Importante pero no crítico para MVP. |
| Tests de multi-zona | Solo existe `shipyard_cemetery`. |
| Tests de regresión visual (screenshots) | Costoso de mantener en side project. |
| Tests de `getRunHistory` | Query de solo lectura sin lógica de negocio. |

---

## 6. Matriz de prioridades de tests

| Área | Prioridad | Tipo de test | Razón |
|------|-----------|-------------|-------|
| `RunCalculator` completo | **CRÍTICO** | Unit | Si falla silenciosamente, el juego entero está roto |
| Transacción de `requestExtraction` | **CRÍTICO** | Integration | Atomicidad de economía. Un bug crea dinero de la nada. |
| Idempotencia de `requestExtraction` | **CRÍTICO** | Integration | Doble extracción = duplicar loot. Inaceptable. |
| Ownership checks en actions | **CRÍTICO** | Action | Seguridad básica. Un usuario no puede actuar sobre recursos de otro. |
| `balanceAfter` correcto en ledger | **CRÍTICO** | Integration | La economía es append-only. El balance debe ser siempre consistente. |
| Validadores de Zod | **CRÍTICO** | Unit | Primera línea de defensa contra input malformado. |
| `startRun` con run ya activa | **CRÍTICO** | Integration | Sin este test, es posible tener dos runs activas simultáneas. |
| Penalización de catástrofe | **CRÍTICO** | Integration | 20% loot, 0 CC — si falla, la catástrofe es generosa o destructiva. |
| Auth requerida en todas las actions | **IMPORTANTE** | Action | Sin sesión → `UNAUTHORIZED`. Verificar en cada action. |
| Equipar item con run activa | **IMPORTANTE** | Action | El equipo no puede cambiar durante una run. |
| `equipItem` — slot incompatible | **IMPORTANTE** | Action | El servidor valida la compatibilidad del slot, no el cliente. |
| Transición de run a userId incorrecto | **IMPORTANTE** | Integration | El ownership check de run se verifica desde la DB, no desde la sesión. |
| Flujo completo de usuario E2E | **IMPORTANTE** | E2E | El happy path completo debe funcionar en browser real. |
| `unequipItem` — slot vacío (no-op) | **DESEABLE** | Action | Edge case del slot vacío — bajo riesgo pero fácil de testear. |
| XP de run fallida al 25% | **DESEABLE** | Unit | Correcto pero derivado de `computeXpReward` ya testeado. |
| `getRunState` — cálculo de `status: catastrophe"` | **DESEABLE** | Unit | Derivado del `computeDangerLevel` ya crítico. |
| Respuesta del poll cuando run ya cerrada | **DESEABLE** | Integration | Verifica que el Route Handler devuelve `status: idle` correctamente. |

---

## 7. Funciones y módulos con tests unitarios obligatorios

Todos deben estar en `/server/domain/run/__tests__/run.calculator.test.ts`.

### `computeDangerLevel(elapsedSeconds, config)`

| Test | Input | Expected |
|------|-------|----------|
| Peligro al inicio (1 seg) | t=1, config base | < 0.05 |
| Peligro a 3 min (zona verde) | t=180, config base | < 0.25 |
| Peligro a 5 min (zona amarilla) | t=300, config base | aprox. 0.40 ± 0.05 |
| Peligro a 7 min (zona naranja) | t=420, config base | aprox. 0.74 ± 0.05 |
| Peligro supera umbral a ~7.8 min | t=468, config base | ≥ 0.90 |
| Peligro con picos añadidos | t=420, config + spikes simulados | > peligro base |
| Peligro nunca negativo | t=0, config cualquiera | ≥ 0 |
| Peligro puede superar 1.0 | t=600, config base | > 1.0 (zona de catástrofe inevitable) |
| `dangerResistance` reduce el peligro efectivo | t=420, dangerResistance=0.20 | < dangerLevel sin resistencia |
| Config con threshold diferente | t=420, threshold=0.80 | catástrofe antes |

---

### `computePendingLoot(elapsedSeconds, equipmentSnapshot, dangerLevel, config)`

| Test | Input | Expected |
|------|-------|----------|
| Loot a tiempo 0 | t=0 | { scrap_metal: 0, energy_cell: 0, ... } |
| Loot a 5 min sin equipo | t=300, lootMult=1.0, backpack=1.0, danger=0.40 | scrap_metal ≈ 200 ± 20 |
| Bonus de peligro incrementa el loot | t=300, peligro 0.40 vs 0.80 | loot al 80% > loot al 40% |
| Multiplicador de equipo se aplica | t=300, lootMult=1.20 | loot = loot_base × 1.20 |
| backpackCapacity se aplica a materiales | t=300, backpack=1.30 | cantidades × 1.30 |
| lootMultiplier y backpackCapacity se apilan | t=300, lootMult=1.20, backpack=1.30 | correcto apilamiento multiplicativo |
| Resultado es siempre entero | cualquiera | todas las cantidades son integers (floor aplicado) |
| Ningún material tiene cantidad negativa | cualquiera | todas las cantidades ≥ 0 |

---

### `applyCatastrophePenalty(pendingLoot)`

| Test | Input | Expected |
|------|-------|----------|
| 20% del loot se retiene | { scrap_metal: 100 } | { scrap_metal: 20 } |
| Floor se aplica (sin fracciones) | { scrap_metal: 7 } | { scrap_metal: 1 } (20% de 7 = 1.4 → floor = 1) |
| Cantidad de 0 permanece 0 | { corrupted_crystal: 0 } | { corrupted_crystal: 0 } |
| Cantidad de 1 da 0 tras penalización | { neural_interface_fragment: 1 } | { neural_interface_fragment: 0 } |
| Los créditos siempre son 0 | currencyEarned: 500 | currencyEarned: 0 |
| Todos los materiales penalizados | { scrap: 100, energy: 50 } | { scrap: 20, energy: 10 } |

---

### `computeCurrencyReward(elapsedSeconds, dangerLevel, equipmentSnapshot, config)`

| Test | Input | Expected |
|------|-------|----------|
| Base a 5 min | t=300, danger=0.40, lootMult=1.0 | aprox. 222 CC ± 20 |
| Bonus de peligro incrementa CC | t=300, danger=0.40 vs danger=0.80 | CC mayor al 80% |
| lootMultiplier incrementa CC | t=300, lootMult=1.20 | CC × 1.20 vs sin multiplicador |
| Resultado es entero | cualquiera | Int (floor aplicado) |

---

### `computeXpReward(elapsedSeconds, dangerLevel, config)`

| Test | Input | Expected |
|------|-------|----------|
| XP a 5 min, peligro 40% | t=300, danger=0.40 | aprox. 1.470 XP ± 100 |
| XP crece con el peligro | t=300, danger=0.40 vs 0.80 | XP mayor al 80% |
| XP de catástrofe (25%) | t=300, danger=0.40, isCatastrophe=true | aprox. 368 XP |
| XP nunca negativa | cualquiera | ≥ 0 |
| XP es entero | cualquiera | Int |

---

### `computeBalanceAfter(previousBalance, amount)` (si existe como función pura)

| Test | Input | Expected |
|------|-------|----------|
| Balance positivo + créditos positivos | prev=500, amount=200 | 700 |
| Balance 0 + primeros créditos | prev=0, amount=315 | 315 |
| Amount de 0 (catástrofe) | prev=500, amount=0 | 500 |
| Resultado nunca negativo | cualquier combinación | ≥ 0 |

---

### Validadores de Zod (`/lib/validators/__tests__/`)

| Validador | Test feliz | Test de error |
|-----------|----------|--------------|
| `StartRunInputSchema` | `{ zoneId: "shipyard_cemetery" }` | `{ zoneId: "" }`, `{ zoneId: 123 }`, `{}` |
| `RequestExtractionInputSchema` | `{ runId: "valid-cuid" }` | `{ runId: "" }`, `{}`, `{ runId: null }` |
| `EquipItemInputSchema` | `{ slot: "HEAD", itemDefinitionId: "valid-cuid" }` | `{ slot: "INVALID_SLOT" }`, `{ slot: "HEAD", itemDefinitionId: "" }` |
| `UnequipItemInputSchema` | `{ slot: "BODY" }` | `{ slot: "TOOL_SECONDARY" }` (no válido en MVP), `{}` |

---

## 8. Flujos críticos con tests de integración o acción

### `startRun` — Integration Tests

**Setup:** usuario con perfil válido, sin `ActiveRun`.

| Caso | Precondición | Expected |
|------|-------------|----------|
| **Happy path** | Sin run activa, zoneId válido | `ActiveRun` creada, `startedAt` del servidor, `equipmentSnapshot` correcto, `AuditLog` creado |
| **Run ya activa** | `ActiveRun` existente en DB | Devuelve `RUN_ALREADY_ACTIVE`, no crea segunda `ActiveRun` |
| **ZoneId inválido** | `zoneId: "nonexistent_zone"` | Devuelve `VALIDATION_ERROR`, no crea `ActiveRun` |
| **Sin sesión** | Sin `userId` válido | Devuelve `UNAUTHORIZED` |
| **El equipmentSnapshot es correcto** | Usuario con casco reforzado en HEAD | `equipmentSnapshot` contiene el casco reforzado, no el básico |
| **startedAt viene del servidor** | Input cualquiera | `startedAt` en la `ActiveRun` es posterior a `Date.now() - 1000` |

---

### `requestExtraction` — Integration Tests

**Setup:** usuario con `ActiveRun` en status `RUNNING`, inventario previo con materiales.

| Caso | Precondición | Expected |
|------|-------------|----------|
| **Happy path (sin catástrofe)** | Run de 5 min, peligro ~40% | `InventoryItem` actualizado, `CurrencyLedger` entry creada, `UserProgression` XP sumada, `ActiveRun` eliminada de DB, `ExtractionResult` creado con `status: EXTRACTED` |
| **Con catástrofe** | Run de 8 min, peligro ≥ 90% | Loot = 20%, CC = 0, XP = 25%, `ActiveRun` eliminada de DB, `ExtractionResult` creado con `status: FAILED` |
| **Idempotencia — run ya resuelta** | No existe `ActiveRun` para userId | Devuelve `RUN_NOT_RUNNING`, sin efectos secundarios, sin segunda entrada en ledger |
| **Idempotencia — segunda llamada** | `ActiveRun` ya fue borrada por primera extracción | Devuelve `RUN_NOT_RUNNING`, sin efectos secundarios |
| **Ownership incorrecto** | `runId` pertenece a otro usuario | Devuelve `UNAUTHORIZED` |
| **Run inexistente** | `runId` no existe en DB | Devuelve `RUN_NOT_RUNNING` |
| **balanceAfter correcto** | Balance previo = 350 CC, extraction = 200 CC | Entrada del ledger con `balanceAfter = 550` |
| **balanceAfter correcto en catástrofe** | Balance previo = 350 CC, catástrofe | Entrada del ledger con `amount = 0`, `balanceAfter = 350` |
| **Loot va al inventario (upsert)** | Inventario previo: scrap_metal: 50 | Tras extracción con 200 scrap_metal → inventario tiene ≥ 250 scrap_metal |
| **Sin entrada doble en ledger** | Misma run extraída dos veces | Solo hay UNA entrada en `CurrencyLedger` por run |
| **Atomicidad — fallo simulado a mitad** | Error forzado en `UserProgressionRepository` durante transacción | Verificar que ni el ledger ni el inventario tienen cambios (rollback completo) |

---

### `equipItem` — Action Tests

| Caso | Precondición | Expected |
|------|-------------|----------|
| **Happy path** | Sin run activa, item en inventario, slot compatible | `EquipmentSlot` actualizado, `AuditLog` creado |
| **Run activa** | `ActiveRun` existente | Devuelve `RUN_ALREADY_ACTIVE`, `EquipmentSlot` no cambia |
| **Item no en inventario** | Item no tiene `InventoryItem` del usuario | Devuelve `NOT_FOUND` |
| **Slot incompatible** | `HEAD` item intentado en `BODY` | Devuelve `VALIDATION_ERROR` |
| **Sin sesión** | Sin sesión válida | Devuelve `UNAUTHORIZED` |
| **Equipa sobre slot ya ocupado** | HEAD ya tiene casco básico | Casco básico reemplazado por nuevo casco en `EquipmentSlot` |

---

### `unequipItem` — Action Tests

| Caso | Precondición | Expected |
|------|-------------|----------|
| **Happy path** | Slot ocupado, sin run activa | `EquipmentSlot.itemDefinitionId = null`, `AuditLog` creado |
| **Slot ya vacío (no-op)** | Slot `BODY` vacío | Devuelve success, sin cambios en DB |
| **Run activa** | `ActiveRun` existente | Devuelve `RUN_ALREADY_ACTIVE` |
| **Sin sesión** | Sin sesión | Devuelve `UNAUTHORIZED` |

---

### Flujos E2E obligatorios (Playwright)

| Flujo E2E | Descripción |
|----------|-------------|
| **Prime loop** | Login simulado → dashboard → start run → esperar 3s → extract → verificar RunResultModal aparece con loot |
| **Catástrofe E2E** | Login → start run → esperar tiempo suficiente para catástrofe (mock del tiempo o aceleración de config) → verificar UI de emergencia → extract → modal de FAILED |
| **Navegar entre páginas con run activa** | Run activa → navegar a `/inventory` → volver a `/dashboard` → verificar que el ExpeditionPanel sigue visible y el polling continúa |

---

## 9. Edge cases obligatorios

Estos casos deben cubrirse en los tests de integración o acción. No son nice-to-have.

| Edge Case | Dónde se testea | Por qué |
|-----------|----------------|---------|
| **Doble click en "Extraer"** | Integration — `requestExtraction` idempotencia | El segundo request no encuentra `ActiveRun` (ya borrada) → `RUN_NOT_RUNNING`. Sin doble loot. |
| **Doble pestaña — segunda intenta iniciar run** | Integration — `startRun` con run activa | La segunda pestaña recibe `RUN_ALREADY_ACTIVE`. Solo una `ActiveRun` por usuario. |
| **Run inexistente** | Action — `requestExtraction`, `unequipItem` | El `runId` no existe en DB → `RUN_NOT_RUNNING`. Sin errores 500. |
| **Usuario sin sesión en action** | Action — todas | Todas las actions devuelven `UNAUTHORIZED` sin procesar nada. |
| **Balance inicial = 0, primera extracción** | Integration — `requestExtraction` | `balanceAfter = 0 + creditsEarned`. Sin errores de null balance. |
| **Inventario vacío — primera extracción** | Integration — `requestExtraction` | Los items del loot se crean como nuevos `InventoryItem` (insert, no update). |
| **Equipo en slot ya ocupado** | Action — `equipItem` | El slot anterior se reemplaza limpiamente (upsert del `EquipmentSlot`). |
| **itemDefinitionId inválido** | Action — `equipItem` | El item no existe en la DB → `NOT_FOUND`, no null pointer error. |
| **Catástrofe con loot anterior en inventario** | Integration — `requestExtraction` catástrofe | El inventario previo no se modifica. Solo se añade el 20% del loot de esta run. |
| **Run de 0 segundos (extracción inmediata)** | Unit — `computePendingLoot` | Loot = 0 para todos los materiales. Ningún div/0. |
| **Peligro exactamente en el umbral** | Unit — `computeDangerLevel` | dangerLevel = 0.90 → `isCatastrophe = true`. No hay ambigüedad en el borde. |
| **dangerResistance al cap de 50%** | Unit — `computeDangerLevel` | La resistencia no puede superar un `dangerLevel_effective` de 0 aunque mathematically. |

---

## 10. Invariantes del sistema que los tests deben proteger

Las invariantes son propiedades que **siempre deben ser verdad**. Si algún test encuentra que una invariante no se cumple, hay un bug crítico.

| Invariante | Verifición obligatoria |
|-----------|----------------------|
| **Una sola `ActiveRun` por userId** | Después de `startRun`, verificar `COUNT(ActiveRun WHERE userId = X) <= 1` |
| **`CurrencyLedger` es append-only** | Ningún test puede usar UPDATE en `CurrencyLedger`. Si una implementación lo hace, el test de integration lo detecta. |
| **`balanceAfter` = suma histórica del ledger** | Para un usuario con N entradas: `balanceAfter` de la última = `SUM(amount)` de todas. Test de verificación post-transacción. |
| **El loot de catástrofe nunca supera el 20%** | Para cualquier `pendingLoot`, `applyCatastrophePenalty(pendingLoot).scrap_metal ≤ pendingLoot.scrap_metal × 0.20` |
| **Los créditos de catástrofe son exactamente 0** | `computeCurrencyReward(..., isCatastrophe=true) === 0` siempre. |
| **`requestExtraction` no modifica inventario previo** | Los items que el usuario tenía antes de la run no cambian de cantidad tras la extracción (solo se suman los nuevos). |
| **El cambio de equipo no afecta runs activas** | `equipItem` ejecutado con una run activa devuelve error y el `equipmentSnapshot` de la run sigue inalterado. |
| **`ActiveRun.startedAt` nunca viene del cliente** | `startedAt` en la `ActiveRun` creada por `startRun` nunca iguala un timestamp enviado en el input. Es siempre `Date.now()` del servidor. |
| **`EquipmentSlot` solo modifica 1 usuario** | `equipItem` solo puede afectar los `EquipmentSlot` del usuario autenticado. Verificar con userId explícito en la query. |
| **`ExtractionResult` existe para cada run cerrada** | Después de cualquier `requestExtraction` exitoso (status EXTRACTED o FAILED), existe un `ExtractionResult` correspondiente. |

---

## 11. Datos seed de test necesarios

Los tests de integración y acción necesitan datos iniciales en la DB de test. Los seeds de test son independientes de los seeds de producción.

### Usuario de test base

```
User:
  id: "test-user-001"
  email: "test@scrapsurvive.test"
  name: "Test Scrapper"

UserProfile:
  userId: "test-user-001"
  createdAt: fecha fija para tests deterministas

UserProgression:
  userId: "test-user-001"
  level: 1
  currentXp: 0
  totalRuns: 0

CurrencyLedger (entrada inicial):
  userId: "test-user-001"
  amount: 0
  balanceAfter: 0
  entryType: INITIAL

EquipmentSlot × 5 (todos vacíos excepto HEAD):
  HEAD: itemDefinitionId: "basic_work_helmet"
  BODY: null
  HANDS: null
  TOOL_PRIMARY: null
  BACKPACK: null
```

### Segundo usuario para tests de ownership

```
User:
  id: "test-user-002"
  email: "other@scrapsurvive.test"

+ misma estructura de UserProfile, UserProgression, CurrencyLedger, EquipmentSlots
```

### ItemDefinitions de test (subset)

Los tests no necesitan las 17 ItemDefinitions completas. Basta con:

```
ItemDefinition[]:
  - id: "basic_work_helmet" → tipo equipo, HEAD, COMMON, stats vacíos
  - id: "reinforced_explorer_helmet" → tipo equipo, HEAD, UNCOMMON, dangerResistance: 0.08
  - id: "industrial_work_gloves" → tipo equipo, HANDS, COMMON, lootMultiplier: 0.05
  - id: "scrap_metal" → tipo material, COMMON, stackable
  - id: "energy_cell" → tipo material, COMMON, stackable
```

### ZoneConfig de test

```
ZoneConfig[]:
  - zoneId: "shipyard_cemetery"
    baseRate: 0.04
    quadraticFactor: 0.000004
    catastropheThreshold: 0.90
    ...parámetros completos del content-seed.md
    
  - zoneId: "test_fast_zone" (solo para tests de catástrofe)
    baseRate: 0.90
    quadraticFactor: 0.0
    catastropheThreshold: 0.90
    → Esta zona entra en catástrofe inmediatamente. Útil para tests sin esperar tiempo real.
```

### InventoryItem de test para `equipItem`

```
InventoryItem:
  userId: "test-user-001"
  itemDefinitionId: "reinforced_explorer_helmet"
  quantity: 1

InventoryItem:
  userId: "test-user-001"
  itemDefinitionId: "scrap_metal"
  quantity: 500
```

### ActiveRun de test (para tests que necesitan run ya activa)

```
ActiveRun:
  userId: "test-user-001"
  zoneId: "shipyard_cemetery"
  startedAt: new Date(Date.now() - 5 * 60 * 1000)  // 5 minutos atrás
  status: "RUNNING"
  equipmentSnapshot: { HEAD: "basic_work_helmet" }
  dangerConfig: { ...shipyard_cemetery config }
```

---

## 12. Estrategia para testear Prisma/PostgreSQL

### DB de test — configuración

Los tests de integración necesitan una DB PostgreSQL separada, nunca la de desarrollo o producción.

**Configuración recomendada:**
- Variable de entorno `DATABASE_URL_TEST` apuntando a una DB `scrapsurvive_test`.
- Los tests de integración leen `DATABASE_URL_TEST` en lugar de `DATABASE_URL`.
- La DB de test se crea localmente con Docker o con Neon branching si está disponible.

**Reset antes de cada suite:**
```
prisma migrate reset --force --schema=prisma/schema.prisma
```
Aplicar después el seed de test. Este reset ocurre una vez por suite, no por test individual.

### Transacciones en tests

Los tests de integración que verifican atomicidad necesitan:

1. Preparar el estado inicial (seed).
2. Ejecutar la operación.
3. Verificar el estado final en la DB consultando directamente.
4. No usar `prisma.$transaction` en los tests — verificar el resultado de la transacción real del service.

### Patrón para tests de integración

```
describe('requestExtraction', () => {
  beforeEach(async () => {
    // Reset y seed de la DB de test
    await resetTestDb();
    await seedTestUser('test-user-001');
    await seedTestRun('test-user-001', { minutesAgo: 5 });
  });

  it('should complete extraction atomically', async () => {
    // Ejecutar el service directamente (no el action)
    const result = await runResolutionService.resolveExtraction(
      'test-user-001',
      'test-run-id'
    );
    
    // Verificar todos los efectos en DB
    const ledger = await db.currencyLedger.findFirst({ ... });
    const inventory = await db.inventoryItem.findMany({ ... });
    const run = await db.activeRun.findUnique({ where: { userId: 'test-user-001' } });
    const extractionResult = await db.extractionResult.findFirst({ ... });
    
    expect(result.status).toBe('extracted');
    expect(ledger.balanceAfter).toBe(previousBalance + result.currencyEarned);
    expect(run).toBeNull();  // ActiveRun se BORRA al resolver — no queda fila
    expect(extractionResult).not.toBeNull();
    expect(extractionResult.status).toBe('EXTRACTED');
    // ... más assertions
  });
});
```

### Qué no mockear en integration tests

- **No mockear Prisma.** Los tests de integración verifican el comportamiento real de la DB.
- **No mockear los repositories.** El repository es parte del flujo que se testea.
- **Sí mockear el reloj (`Date.now()`)** cuando se necesita un tiempo de run específico, usando `vi.setSystemTime()` de Vitest.

---

## 13. Qué no merece la pena testear aún

Estas áreas no tienen tests hasta Fase 1 o posterior. La razón en todos los casos: el riesgo de bug no justifica el costo de mantenimiento del test en MVP.

| Qué no testear | Por qué no |
|----------------|------------|
| Componentes React de UI (unit tests de componentes) | La lógica de UI es presentacional. Los bugs de UI son visibles a simple vista. El riesgo está en el servidor, no en el cliente. |
| Hooks de React (`useRunPolling`, `useCountdown`) | Difíciles de testear, frágiles de mantener. El comportamiento correcto se valida en E2E. |
| Server Components puros (data fetching en `page.tsx`) | Son query + render. Si el service funciona (testeado) y el componente compila (TypeScript), el riesgo es mínimo. |
| Estilos CSS y Tailwind | No testeable significativamente de forma automatizada. |
| El `auth()` middleware | Auth.js garantiza su propio comportamiento. Testear el middleware de Next.js es redundante. |
| `getRunHistory` (solo lectura, sin lógica) | Una query con ORDER BY y LIMIT. Si compila y retorna el tipo correcto, es correcto. |
| `getInventory` (solo lectura, sin lógica) | Ídem. |
| El layout y navegación del shell | Verificación visual. No hay lógica de dominio. |
| Los seeds de DB de producción | Los seeds corren una vez — tienen que ser correctos pero no necesitan test. Se validan en staging. |
| Funciones de formato de UI (`formatCC`, `formatDuration`) | Si el output es legible, es correcto. No hay riesgo de economía. |
| La tienda de cosméticos | No existe en MVP. |
| El sistema VIP | No existe en MVP. |

---

## 14. Criterios de aceptación antes de considerar una feature "done"

Una feature no está terminada hasta que cumple **todos** los criterios aplicables:

### Para cualquier Server Action nueva

- [ ] El Server Action tiene al menos un test de acción para: sin sesión, input inválido, precondición fallida, happy path.
- [ ] Los validadores de Zod tienen unit tests.
- [ ] `tsc --noEmit` pasa sin errores.
- [ ] El `AuditLog` se crea en las acciones que lo requieren (verificado en test de integración).

### Para cualquier cambio en `RunCalculator`

- [ ] Todos los tests existentes de `run.calculator.test.ts` siguen pasando.
- [ ] Se añade al menos un test unitario para el nuevo comportamiento.
- [ ] Los valores de ejemplo de la sección 7 de `docs/balance-v0.md` siguen siendo consistentes con los resultados del calculador (test de regresión numérica).

### Para cualquier operación de DB nueva

- [ ] La transacción está cubierta por un test de integración que verifica atomicidad.
- [ ] El ownership check está verificado en algún test.
- [ ] La invariante de `balanceAfter` se verifica si la operación toca el ledger.

### Para el MVP completo (antes de considerar Fase 0 cerrada)

- [ ] Todos los tests unitarios pasan (`vitest run`).
- [ ] Todos los tests de integración pasan (`vitest run --config vitest.integration.config.ts`).
- [ ] Los 3 flujos E2E obligatorios pasan en Playwright.
- [ ] `tsc --noEmit` pasa sin errores.
- [ ] Los acceptance criteria de `docs/mvp-spec.md` sección 9 y 10 son verificables manualmente.

---

## 15. Orden recomendado para implementar los tests

El orden sigue la prioridad del dominio, no la comodidad de implementación.

```
Paso 1: Configurar Vitest en el proyecto
  → vitest.config.ts para unit tests
  → vitest.integration.config.ts para integration tests (DB separada)
  → Scripts en package.json: "test:unit", "test:integration", "test:e2e"

Paso 2: Unit tests de RunCalculator (ANTES de implementar el calculador)
  → run.calculator.test.ts con todos los casos de sección 7
  → Estos tests deben escribirse PRIMERO y fallar
  → La implementación del calculador los hace pasar (TDD estricto aquí)

Paso 3: Unit tests de validadores Zod
  → validators.test.ts para cada schema de input

Paso 4: Unit tests de computeBalanceAfter (si existe como función pura)

Paso 5: DB de test + seed helpers
  → resetTestDb(), seedTestUser(), seedTestRun()
  → Verificar que el seed produce el estado esperado

Paso 6: Integration tests de requestExtraction
  → Los más críticos del proyecto
  → Happy path, catástrofe, idempotencia, ownership

Paso 7: Integration tests de startRun
  → Happy path, doble run, zoneId inválido

Paso 8: Action tests de equipItem y unequipItem
  → Con mocks de services y auth

Paso 9: Configurar Playwright + primer E2E
  → Solo el prime loop (login → run → extract → modal)

Paso 10: E2E de catástrofe y navegación con run activa

Paso 11 (optional en MVP): Pre-commit hook
  → Ejecutar "test:unit" antes de cada commit
```

---

## 16. Recomendaciones específicas para vibe coding + tests

### Cómo pedir tests a una IA

Las IAs generan tests decorativos si el prompt es vago. Un test decorativo pasa siempre porque no verifica nada real.

**Prompt malo:**
> "Escribe tests para el RunCalculator"

**Prompt correcto:**
> "Escribe tests unitarios para `computePendingLoot()` en `/server/domain/run/run.calculator.ts`. Debe cubrir exactamente estos casos: [lista de la sección 7 de test-plan.md]. Para cada test, el valor expected debe calcularse manualmente con los parámetros del balance-v0.md y verificarse que el resultado es el correcto dentro de ±5% de tolerancia. Los tests deben fallar si la función retorna NaN, valores negativos o no aplica el floor."

**Regla:** siempre especificar los casos exactos. No delegar al criterio de la IA qué testear.

---

### Qué nunca delegar sin revisar

| Tarea | Por qué no delegar sin revisar |
|-------|-------------------------------|
| Los valores expected en tests económicos | La IA puede calcular mal el `balanceAfter`. Verificar manualmente con calculadora. |
| Tests de idempotencia | La IA suele escribir tests de idempotencia que solo comprueban que no hay excepción, no que no hay efectos secundarios. Verificar que el test consulta la DB antes y después. |
| Tests de ownership | La IA suele olvidar crear el segundo usuario y testear con su `userId`. Verificar que el test tiene dos usuarios distintos. |
| Tests de atomicidad | La IA rara vez fuerza un fallo simulado para verificar rollback. Pedir explícitamente tests que fuercen errores a mitad de transacción. |
| Los edge cases de `applyCatastrophePenalty` | Los valores de floor son trampas matemáticas. Verificar cada caso con `floor(x × 0.20)` calculado a mano. |

---

### Cómo evitar tests decorativos sin valor

Un test decorativo tiene esta forma:

```typescript
it('should work', () => {
  const result = computeDangerLevel(300, config);
  expect(result).toBeDefined();  // ← DECORATIVO. No verifica nada útil.
  expect(result).toBeGreaterThanOrEqual(0);  // ← SEMI-ÚTIL pero insuficiente.
});
```

Un test con valor tiene esta forma:

```typescript
it('should compute danger level of ~40% at 5 minutes with base config', () => {
  const elapsedSeconds = 300;
  const result = computeDangerLevel(elapsedSeconds, SHIPYARD_CEMETERY_CONFIG);
  
  // El valor exacto calculado manualmente:
  // 0.04 + 0.000004 × 300² = 0.04 + 0.36 = 0.40
  expect(result).toBeCloseTo(0.40, 1);  // ← VALOR CONCRETO verificable
  expect(result).toBeLessThan(0.90);  // ← NO es catástrofe a los 5 min
});
```

**Regla práctica:** si el test pasa si la función devuelve cualquier número positivo — es decorativo. Un test útil falla si el resultado cambia aunque sea un 10%.

---

### Señales de que la IA generó tests de mala calidad

- Todos los tests del mismo módulo tienen el mismo `expected` aunque el input varíe.
- Los tests de transactions solo verifican que no hay excepción, no el estado de la DB después.
- Los tests de ownership no tienen un segundo usuario con userId diferente.
- No hay ningún test que verifique que algo NO ocurre (que el ledger no tiene una segunda entrada, que el run.status no cambió).
- Los tests de catástrofe verifican que el status es "failed" pero no que los créditos son exactamente 0.
- Ningún test usa `beforeEach` para resetear estado — cada test podría estar dependiendo del anterior.

---

## Apéndice A: Estructura de carpetas de tests

```
/server/
  domain/
    run/
      run.calculator.ts
      __tests__/
        run.calculator.test.ts         ← CRÍTICO — unit tests
  __tests__/
    integration/
      start-run.integration.test.ts   ← CRÍTICO
      request-extraction.integration.test.ts  ← CRÍTICO
      currency-ledger.integration.test.ts     ← CRÍTICO
    actions/
      run.actions.test.ts             ← IMPORTANTE
      inventory.actions.test.ts       ← IMPORTANTE

/lib/
  validators/
    __tests__/
      validators.test.ts              ← CRÍTICO — unit tests

/e2e/
  prime-loop.spec.ts                  ← IMPORTANTE — Playwright
  catastrophe.spec.ts                 ← IMPORTANTE — Playwright
  navigation-with-run.spec.ts         ← DESEABLE — Playwright
```

---

## Apéndice B: Scripts de package.json recomendados

```json
"scripts": {
  "test": "vitest run",
  "test:unit": "vitest run --config vitest.config.ts",
  "test:integration": "vitest run --config vitest.integration.config.ts",
  "test:watch": "vitest --watch",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:all": "npm run test:unit && npm run test:integration"
}
```

El pre-commit hook solo ejecuta `test:unit` (rápido). Los tests de integración se ejecutan en CI o manualmente antes de merge.

---

## Apéndice C: Las 5 preguntas antes de cerrar un test suite

Antes de considerar el test suite de un módulo completo, responder estas 5 preguntas:

1. **¿Hay algún test que verifique que algo NO ocurre?** (doble loot, estado incorrecto, ledger extra)
2. **¿El test de ownership usa DOS usuarios distintos?** (no solo uno)
3. **¿Los valores expected se calcularon manualmente o los copió la IA sin verificar?**
4. **¿Hay algún test que simule un fallo a mitad de transacción?** (si el módulo tiene transacciones)
5. **¿El test fallaría si cambio el 20% de catástrofe al 50%?** (si no — está mal)

Si todas las respuestas son "sí", el test suite tiene valor real. Si alguna es "no" — hay trabajo pendiente.

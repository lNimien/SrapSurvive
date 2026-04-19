# Scrap & Survive — Test Plan (Current Slice)

## Scope covered in this slice

1. **Vitest setup**
   - `vitest.config.ts` for unit tests.
   - `vitest.integration.config.ts` for DB-backed tests.
   - Scripts: `npm run test:unit` and `npm run test:integration`.

2. **DB integration helpers**
   - `server/__tests__/helpers/db-test-utils.ts`
   - `resetTestDb()` cleans all runtime game/auth tables and reseeds `ItemDefinition` from `ITEM_CATALOG`.
   - `seedTestUser(userId)` provisions real user/profile/progression/ledger/equipment rows.
   - `seedTestRun(...)` creates real `ActiveRun` rows with configurable `startedAt`.

3. **Critical suites implemented**
    - Unit: `server/domain/run/__tests__/run.calculator.test.ts`
    - Integration: `server/__tests__/integration/request-extraction.integration.test.ts`
    - Action security: `server/__tests__/actions/run.actions.test.ts`

4. **B.3/C.1 suites added/updated**
   - Unit:
     - `server/domain/contract/__tests__/contract.calculator.test.ts`
       - determinismo por `seed + level`
       - bracket difficulty explícito
       - escalado de reward por nivel
     - `server/domain/progression/__tests__/account-upgrade.logic.test.ts`
       - sanity de nuevas definiciones de upgrades
       - validación de caps de aplicación (`catastropheThreshold`)
     - `server/domain/progression/__tests__/achievement.logic.test.ts`
       - cobertura de triggers para logros nuevos
   - Action:
     - `server/__tests__/actions/contract.actions.test.ts`
       - `refreshContractsAction`: unauthorized + validation + service no llamado al fallar
    - Integration:
      - `server/__tests__/integration/contracts.integration.test.ts`
        - refresh: deduce CC + rota contratos + audit log
        - refresh con fondos insuficientes: rollback sin efectos
        - completion de contrato escalado: recompensa/ledger/progression atómicos

5. **D.1 suites added/updated**
   - Unit:
     - `server/domain/run/__tests__/run.validators.test.ts`
       - tercera zona válida en schema
       - schema level-aware rechaza zonas bloqueadas y acepta zonas desbloqueadas
     - `server/domain/run/__tests__/run.calculator.test.ts`
       - `xpMultiplier` determinístico por equipo + rareza
       - sanity de XP base vs configuración con equipo
   - Integration:
     - `server/__tests__/integration/start-run.integration.test.ts`
       - `startRun` rechaza usuario por debajo de `minLevel`
       - `startRun` permite nivel requerido y snapshot de config de tercera zona
     - `server/__tests__/integration/request-extraction.integration.test.ts`
       - extracción en tercera zona con materiales nuevos en loot/inventario
       - setup high-tier ahora también verifica mejora en `xpEarned`
      - `server/__tests__/integration/crafting.integration.test.ts`
        - ruta de crafting D.1 para receta legendaria con materiales nuevos

6. **D.2 suites added/updated**
   - Unit:
     - `server/domain/run/__tests__/run.calculator.test.ts`
       - diferencias determinísticas SAFE vs HARD para loot/currency/xp
     - `server/domain/economy/__tests__/market.calculator.test.ts`
       - fórmula dedicada de venta (`computeSellUnitPrice`) con bounds globales
     - `server/domain/run/__tests__/run.validators.test.ts`
       - validación de `runMode` (`SAFE|HARD`) + default SAFE
   - Integration:
     - `server/__tests__/integration/start-run.integration.test.ts`
       - snapshot de `runMode` en `dangerConfig`
     - `server/__tests__/integration/request-extraction.integration.test.ts`
       - catástrofe SAFE conserva equipo
       - catástrofe HARD elimina equipo equipado (slots + inventario) atómicamente
     - `server/__tests__/integration/economy-market.integration.test.ts`
       - venta usa payout nerfeado y consistente con preview/formula compartida
     - `server/__tests__/integration/crafting.integration.test.ts`
       - coherencia de filtros por categoría + obtenibilidad para recetas nuevas
   - Action:
      - `server/__tests__/actions/start-run.actions.test.ts`
        - `startRunAction` rechaza `runMode` inválido

7. **D.3 low-churn suites added/updated**
   - Unit:
     - `server/domain/run/__tests__/run.calculator.test.ts`
       - resolución determinística de sinergias + arquetipo
       - caps explícitos respetados en multiplicadores derivados
     - `server/services/__tests__/weekly-goals.service.test.ts`
       - agregación determinística de progreso de directivas por historial de extracciones
     - `server/services/__tests__/player-analytics.service.test.ts`
       - agregación determinística de success rate, promedios, mix SAFE/HARD y mejor zona
   - Integration:
     - `server/__tests__/integration/request-extraction.integration.test.ts`
       - settlement de extracción refleja bonus de build con sinergias/arquetipo activos
      - `server/__tests__/integration/d3-liveops-analytics.integration.test.ts`
        - progreso semanal derivado correctamente desde `ExtractionResult`
        - analítica derivada correctamente desde `ExtractionResult` + `AuditLog(run.start)`

8. **D.4a suites added/updated (mitigation flags + action guards)**
   - Unit:
     - `server/services/__tests__/mutation-guard.service.test.ts`
       - parseo de env vars kill-switch con default seguro `false`
       - metadata de guard estándar (`FEATURE_DISABLED` + mensaje de mantenimiento)
   - Action:
     - `server/__tests__/actions/start-run.actions.test.ts`
       - `startRunAction` bloqueado por kill-switch de extracción y smoke cuando está inactivo
     - `server/__tests__/actions/run-mutation-guards.actions.test.ts`
       - `requestExtractionAction` y `resolveAnomalyAction` bloqueados/permitidos según flag
     - `server/__tests__/actions/economy.actions.test.ts`
       - buy/sell bloqueados por kill-switch de market + smoke de flujo permitido
     - `server/__tests__/actions/inventory.actions.test.ts`
       - craft/salvage bloqueados por kill-switch de crafting + smoke permitido
     - `server/__tests__/actions/contract.actions.test.ts`
       - deliver/refresh bloqueados por kill-switch de contratos + smoke permitido
     - `server/__tests__/actions/upgrades.actions.test.ts`
       - purchase bloqueado por kill-switch de claims/mejoras + smoke permitido
      - `server/__tests__/actions/achievements.actions.test.ts`
        - claim bloqueado por kill-switch de claims/mejoras + smoke permitido

9. **LiveOps semanal persistente (claim atómico + idempotente)**
    - Unit:
      - `server/services/__tests__/weekly-goals.service.test.ts`
        - ventana semanal UTC normalizada a lunes 00:00
        - semántica de claim idempotente (`CLAIMED` / `ALREADY_CLAIMED` / `NOT_CLAIMABLE`)
        - bounds conservadores de rewards CC/XP
        - normalización/saneamiento de `rewardItems` (IDs válidos, cantidades, orden determinístico)
    - Action:
      - `server/__tests__/actions/liveops.actions.test.ts`
        - `claimWeeklyDirectiveAction`: unauthorized, validation failure, guard-disabled
    - Integration:
      - `server/__tests__/integration/weekly-directives.integration.test.ts`
        - sync inicial crea directivas persistidas por usuario+semana
        - progreso semanal se deriva de `ExtractionResult`
       - claim happy path aplica ledger + XP + inventory upsert de item rewards y marca claimed
       - segundo claim es determinístico (already claimed) sin duplicar ledger/xp/items
       - race de doble claim simultáneo: exactamente 1 settlement con rewards, segundo resultado determinístico sin duplicación
       - rollback total en falla forzada mid-transaction (sin efectos parciales en ledger/xp/items)

10. **D.4b observabilidad + hardening operativo de claims**
    - Unit:
      - `server/services/__tests__/economy-observability.service.test.ts`
        - percentiles p50/p95 para latencia de claim
        - agregación de outcomes + success ratio + faucet por itemDefId
    - Integration:
      - `server/__tests__/integration/economy-observability.integration.test.ts`
        - ventanas 24h/7d para metrics de claims (`CLAIMED`, `ALREADY_CLAIMED`, `NOT_CLAIMABLE`, `FEATURE_DISABLED`, `ERROR`)
        - cálculo de latencia p50/p95 desde auditoría de intentos
        - faucet por itemDefId desde claims exitosos
      - `server/__tests__/integration/weekly-directives.integration.test.ts`
        - race concurrente de doble claim (mismo usuario/directiva/semana) sin efectos económicos duplicados

---

## Numeric expectations locked by unit tests

Using `SHIPYARD_CEMETERY_CONFIG`:

- `computeDangerLevel(0)` = **0.04**
- `computeDangerLevel(600)` = **1.48**

- `computePendingLoot(0, ...)` = **[]**
- `computePendingLoot(600, emptyEquipment, danger=1.48)` quantities:
  - `scrap_metal`: **655**
  - `energy_cell`: **196**
  - `recycled_component`: **104**
  - `corrupted_crystal`: **26**
  - `armor_fiber`: **65**

- `applyCatastrophePenalty` floor behavior:
  - `100 -> 20`
  - `7 -> 1`
  - `1 -> 0` (dropped from output)

- `computeCurrencyReward(0, ...)` = **0**
- `computeCurrencyReward(600, danger=1.48, emptyEquipment)` = **783**

---

## Integration invariants (`resolveExtraction`)

1. **Happy path**
   - Loot is transferred to `InventoryItem`.
   - New `CurrencyLedger` entry has correct `balanceAfter`.
   - `ActiveRun` is deleted.
   - `ExtractionResult` is created with `EXTRACTED`.

2. **Catastrophe path (`danger > 0.90`)**
   - `currencyEarned = 0`.
   - Loot is reduced to **20%** (with floor per item).
   - Ledger entry uses `CATASTROPHE_PENALTY` and keeps balance consistent.

3. **Idempotence guard**
   - No active run => `RUN_NOT_RUNNING`.

4. **Atomicity**
   - Real DB FK failure mid-transaction rolls back inventory and ledger changes.

---

## Action-level ownership/security

- `requestExtractionAction` must return `UNAUTHORIZED` when session user tries to extract a run belonging to another real user.
- `refreshContractsAction` must return `UNAUTHORIZED` on missing session and `VALIDATION_ERROR` for invalid input without touching service layer.

---

## Execution

- Unit: `npm run test:unit`
- Integration + action DB suites: `npm run test:integration`

## Expected D.1 invariants

1. `startRun` aplica gate de nivel server-side para zonas con `minLevel`.
2. El cliente puede ver bloqueo/desbloqueo de zona, pero la autoridad final sigue en servidor.
3. Todas las recetas nuevas deben mantener obtenibilidad (`zona drop` y/o `vendor`).
4. Nuevo efecto de build para XP debe ser determinístico, explícito y con cap.

Integration tests require a valid `DATABASE_URL_TEST` (preferred) or `DATABASE_URL` pointing to a real PostgreSQL test database.

## D.3 test matrix (referencia rápida)

| Área D.3 | Unit | Integration |
|---|---|---|
| Buildcraft/sinergias | Resolver de sinergias/arquetipo deterministic + caps | Comparativa de rewards con build de arquetipo vs control |
| Directivas semanales | Cálculo de stats semanales desde historial | Progreso correcto por métricas (`extractions`, `catastrophes`, `zone clears`, `materials`) |
| Analytics jugador | Agregación (`success rate`, promedios, mix SAFE/HARD, best zone) | Derivación desde datos reales seeded (`ExtractionResult` + `AuditLog`) |

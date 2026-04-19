# LiveOps semanal persistente — Plan técnico ejecutable

## Goal

Implementar directivas semanales **persistentes por usuario** con:

- sincronización por ventana semanal (lunes UTC),
- progreso calculado desde fuentes autoritativas del servidor,
- claim de recompensa **atómico e idempotente**,
- integración en dashboard con estados `in_progress`, `claimable`, `claimed`.

## Non-goals

- Monetización premium o boosts de pago.
- Nuevas zonas, nuevas fórmulas de run o cambios de economía base del loop principal.
- Tiempo real por WebSocket/SSE (se mantiene polling/render actual).
- Backoffice LiveOps completo (solo soporte MVP operativo semanal).

## Architecture

1. **Persistencia**
   - Nueva tabla `WeeklyDirectiveProgress` por `(userId, directiveKey, weekStart)`.
   - Guarda target/progress/status/reward y metadata de claim (`claimedAt`, `claimReferenceId`).
   - Unique compuesto para evitar duplicados en sync.

2. **Servicio de dominio/aplicación**
   - `syncWeeklyDirectives(userId, now)`:
     - calcula `weekStart/weekEnd`,
     - agrega métricas desde `ExtractionResult`,
     - upsert por directiva,
     - marca estados (`IN_PROGRESS`, `CLAIMABLE`, `CLAIMED`) sin retroceder claims.
   - `claimWeeklyDirective(userId, directiveKey, weekStart)`:
     - transacción única,
     - lock lógico sobre fila objetivo,
     - si ya está reclamada: respuesta determinística idempotente (sin duplicar rewards),
     - si claimable: aplica ledger + XP + marca claimed + audit log.

3. **Acciones + UI**
   - Nueva Server Action `claimWeeklyDirectiveAction` con Zod.
   - Guard de kill-switch en categoría de claims.
   - Dashboard: panel semanal con botón claim por directiva, feedback loading/disabled y estados accesibles.

4. **DTO**
   - `WeeklyDirectiveDTO` extendido con campos persistidos de estado/claim/recompensa.
   - `PlayerStateService` retorna weekly goals sincronizado persistente.

## Task batches

### Batch 1 — Data model + core services

- [ ] Agregar modelos Prisma para progreso semanal persistente (y enums asociados si aplica).
- [ ] Crear migración nueva con índices/constraints requeridos.
- [ ] Implementar utilidades de semana UTC (weekStart/weekEnd/weekKey).
- [ ] Refactor de `weekly-goals.service.ts` para:
  - [ ] sincronizar directivas por usuario/semana,
  - [ ] calcular progreso desde `ExtractionResult`,
  - [ ] persistir estado `IN_PROGRESS/CLAIMABLE/CLAIMED`,
  - [ ] exponer claim transaccional idempotente.
- [ ] Definir rewards conservadoras CC+XP en `config/liveops.config.ts`.

### Batch 2 — Actions + UI integration

- [ ] Crear validador Zod para claim semanal (`directiveKey`, `weekStart`).
- [ ] Implementar `claimWeeklyDirectiveAction` (`ActionResult`) con auth + validation + guard + revalidate.
- [ ] Integrar panel de directivas con claim por fila y estados visuales.
- [ ] Añadir loading/disabled y mensajes de estado (`completada`, `reclamable`, `reclamada`).
- [ ] Validar accesibilidad de botones y barras de progreso (roles/aria + keyboard flow).

### Batch 3 — Tests + docs + rollout notes

- [ ] Unit tests:
  - [ ] cálculo ventana semanal,
  - [ ] idempotencia de claim,
  - [ ] bounds de rewards.
- [ ] Integration tests:
  - [ ] sync inicial crea directivas para user/week,
  - [ ] progreso actualizado desde run history,
  - [ ] claim happy path aplica reward y marca claimed,
  - [ ] segundo claim no duplica ledger/xp,
  - [ ] rollback ante falla forzada mid-transaction.
- [ ] Action tests:
  - [ ] unauthorized,
  - [ ] validation failure,
  - [ ] guard-disabled path.
- [ ] Actualizar `docs/test-plan.md` con matriz LiveOps semanal persistente.
- [ ] Añadir notas de rollout (flags/kill-switch, migración y monitoreo).

## Acceptance criteria

- Existe persistencia semanal por usuario con unicidad por directiva+semana.
- `getWeeklyGoals` devuelve estado persistido consistente entre renders.
- Claim ejecuta en una sola transacción y no duplica recompensas en reintentos.
- Reward impacta `CurrencyLedger` (append-only) y `UserProgression` en la misma transacción.
- Server Action cumple contrato `ActionResult` y maneja `UNAUTHORIZED`, `VALIDATION_ERROR`, `FEATURE_DISABLED`.
- UI permite claim solo cuando corresponde; estados accesibles y coherentes.
- Suite de tests (unit/integration/action) cubre happy path + invariantes de idempotencia/atomicidad.

## Risks & mitigations

- **Riesgo:** doble claim concurrente.
  - **Mitigación:** unique y verificación dentro de transacción sobre fila de progreso + referencia determinística de claim.

- **Riesgo:** drift de progreso semanal por timezone.
  - **Mitigación:** cálculo exclusivo UTC (lunes 00:00 UTC) y tests de ventana.

- **Riesgo:** duplicación de rewards por retries de UI/red.
  - **Mitigación:** claimReferenceId determinístico por user+directive+week y ruta idempotente.

- **Riesgo:** lock operativo en producción.
  - **Mitigación:** kill-switch de categoría claims y manejo `FEATURE_DISABLED` en Action.

## Commands to validate

```bash
npm run test:unit
npm run test:integration
```

# Phase B.3 — Implemented Slice Summary

**Fecha:** 2026-04-18  
**Estado:** Implementado (low-churn hardening/expansion)  
**Migraciones DB:** Ninguna

---

## 1) Scope done

### 1.1 Contracts v1.5 (server-authoritative)

- Se extendió la generación de contratos con:
  - **difficulty brackets explícitos** (`EASY`, `STANDARD`, `HARD`),
  - escalado de cantidades/recompensas por nivel,
  - comportamiento determinista por `seed`.
- Se endureció `ensureDailyContracts` para mantener consistencia diaria y evitar regeneración infinita al completar contratos.
- Se agregó refresh/reroll de contratos:
  - costo en CC,
  - transacción serializable,
  - ledger append-only,
  - audit log,
  - idempotencia segura por `requestId`.

### 1.2 Upgrades expansion

- Se agregaron 4 nuevas definiciones en `config/upgrades.config.ts`:
  - `upgrade_hull_stabilizers_v2`
  - `upgrade_escape_protocol_v2`
  - `upgrade_salvage_optimizer_v2`
  - `upgrade_adaptive_plating_v1`
- Se mantuvo el modelo actual de efectos, aplicación determinista y cap de `catastropheThreshold`.

### 1.3 Achievements expansion

- Se agregaron 8 nuevos achievements en `config/achievements.config.ts` con triggers existentes:
  - extracción (10/50),
  - catástrofe (3/10),
  - nivel (5/10),
  - chatarra total (2500/7500).
- El flujo de claim permanece idempotente/transaccional.

### 1.4 UI engagement tweaks

- Contratos:
  - indicador de urgencia por tiempo,
  - orden por accionabilidad,
  - botón mínimo de refresh en panel existente.
- Upgrades y achievements:
  - orden priorizando items accionables,
  - resumen rápido de “comprables/reclamables ahora”.

---

## 2) Acceptance criteria (B.3)

- [x] Contratos v1.5 con dificultad + escalado por nivel sin cambiar schema.
- [x] Acción refresh/reroll transaccional, auditada e idempotent-safe.
- [x] UX de contratos más clara (progreso/urgencia/acción inmediata).
- [x] 3–5 upgrades nuevas (se implementaron 4).
- [x] 6–10 achievements nuevos (se implementaron 8).
- [x] Integridad económica preservada (ledger append-only, checks de balance, rollback).
- [x] Sin migraciones DB.

---

## 3) Test matrix

| Tipo | Suite | Cobertura B.3 |
|------|-------|----------------|
| Unit | `server/domain/contract/__tests__/contract.calculator.test.ts` | determinismo seed+level, bracket difficulty, rewards escaladas |
| Unit | `server/domain/progression/__tests__/account-upgrade.logic.test.ts` | sanity nuevas upgrades, caps de aplicación |
| Unit | `server/domain/progression/__tests__/achievement.logic.test.ts` | cobertura de triggers de nuevos logros |
| Action | `server/__tests__/actions/contract.actions.test.ts` | refresh unauthorized + validation + no service call on fail |
| Integration | `server/__tests__/integration/contracts.integration.test.ts` | refresh success + rollback insuficiente + completion escalada atómica |

---

## 4) Deferred items

- **Global market P2P** (sigue fuera de B.3).
- **Premium economy schema** (sin cambios de schema en este slice).
- Metadatos avanzados persistentes de contratos (sloting/versionado por schema dedicado).

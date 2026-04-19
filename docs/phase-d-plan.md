# Plan de Fase D — Profundidad de Contenido + Escalado Operacional

**Estado:** D.1 implementado · D.2 implementado (gameplay/economía/UI) · D.3.1/D.3.2/D.3.3 (slice low-churn) implementados · D.3b pendiente  
**Fecha:** 2026-04-19  
**Scope:** Diseño de ejecución para escalar contenido, economía y operación sin degradar integridad

---

## Objetivo de Fase D

Fase D tiene dos metas acopladas:

1. **Aumentar profundidad de contenido** (más decisiones por sesión, más variedad de objetivos, más rutas de progreso).
2. **Escalar operación y confiabilidad** para sostener crecimiento de usuarios y mayor volumen transaccional.

La regla no cambia: **correctitud del dominio + integridad económica primero**. Más contenido no puede introducir exploitabilidad ni inconsistencia de datos.

---

## Dependencias desde Fase C (gate de entrada)

Fase D no arranca sin cumplir estos prerequisitos de C:

- C.1 en producción con telemetría económica estable y panel ops usable.
- C.2 beta sin incidentes críticos de settlement/idempotencia durante una ventana operacional sostenida.
- C.3 con monetización cosmética/QoL y LiveOps operando dentro de guardrails de fairness.
- Kill switches funcionales por capacidad (`c1/c2/c3`) y protocolos de rollback validados.

Si cualquier guardrail económico o antifraude de C se rompe, D se pausa y vuelve a hardening de C.

---

## Subfases de D

## D.1 — Profundidad de contenido sistémico

**Estado:** ✅ Implementado (slice ejecutado)

### Objetivo

Expandir la variedad jugable sin romper el loop principal de extracción y riesgo.

### Alcance

- Nueva capa de objetivos de sesión y meta-objetivos multi-sesión.
- Mayor diversidad de encuentros/eventos dentro de run.
- Rotaciones de contenido con reglas server-authoritative y snapshots explícitos.

### Entregado en D.1

- Tercera zona (`abyssal_fracture`) con gate de nivel mínimo server-side.
- Config de zonas extendida con `minLevel` y feedback UX de bloqueo/desbloqueo.
- Expansión de materiales y equipamiento high-tier (legendary) con recipes asociadas.
- Nuevo efecto de build determinístico para XP (`xpMultiplier`) derivado de item config + rareza, con cap explícito.
- Extensión de upgrades y achievements por configuración, sin migraciones de schema.
- Nuevas pruebas unit/integration para gate de zona, rutas de contenido nuevo y consistencia de obtenibilidad.

### Restricciones

- Sin cálculos autoritativos en cliente.
- Sin bypass de riesgo por monetización.
- Mantener idempotencia en claims/recompensas.

---

## D.2 — Ajuste de riesgo/recompensa + UX de sistemas operativos

**Estado:** ✅ Implementado (slice D.2)

### Objetivo

Introducir decisiones de riesgo explícitas por modo de run y consolidar UX de economía/crafting para mejorar acción en primera pantalla sin romper integridad transaccional.

### Alcance implementado

- **Run modes reales:** `SAFE` (default) y `HARD` con snapshot en `dangerConfig` JSON sin migración.
- **Riesgo/recompensa por modo:** SAFE reduce payout/drop; HARD aumenta rewards y material complejo.
- **Catástrofe por modo:** SAFE conserva equipo; HARD destruye equipo equipado en la run (slots + inventario) en la misma transacción.
- **Dashboard/layout rework:** expedición sigue primaria; contratos/upgrades/achievements reposicionados para accionabilidad de primer scroll.
- **Loadout clarity:** layout vertical tipo personaje + tooltips con perks explícitos.
- **Workshop pass:** nuevas recetas craftables, filtros por categoría de slot, costos incrementados de forma global.
- **Economía de mercado:** fórmula de venta dedicada con nerf global y preview UI alineado con ledger final.

### Verificación mínima aplicada

1. Unit tests de perfiles SAFE/HARD y fórmula de venta.
2. Integration tests de snapshot de modo, catástrofe SAFE/HARD con invariantes de atomicidad.
3. Action tests de validación de `runMode` en `startRunAction`.
4. Tests de coherencia de filtros/obtenibilidad para recetas ampliadas de workshop.

### Restricciones mantenidas

- Sin migración de schema para D.2 (modo persistido en snapshot JSON).
- Sin lógica autoritativa en cliente para rewards/loot/economía.
- Mutaciones críticas en transacciones atómicas con ledger append-only.

---

## D.3 — Operación continua y gobierno de balance

**Estado:** 🟡 Parcial (D.3.1 + D.3.2 + D.3.3 low-churn)

### Objetivo

Operar el juego como servicio con ajustes seguros de balance y respuesta rápida ante abuso.

### Alcance implementado en este slice

1. **D.3.1 Buildcraft/sinergias (server-authoritative):**
   - Sinergias y arquetipo activos por configuración (`config/build-synergies.config.ts`).
   - Aplicación en cálculo de run con caps explícitos (loot/currency/xp/resistencia/danger bonus/threshold).
   - Exposición en `PlayerStateDTO` y render en dashboard/loadout.

2. **D.3.2 LiveOps read-only (evento + directivas semanales):**
   - `config/liveops.config.ts` con descriptor de evento activo y directivas por métrica existente.
   - Servicio de progreso semanal derivado de `ExtractionResult` (sin schema nuevo, sin sistema de claim).
   - Panel nuevo en dashboard detrás de feature flag.

3. **D.3.3 Analytics de jugador (QoL):**
   - Servicio de analítica agregada (success rate, promedio CC/XP, mix SAFE/HARD, mejor zona por earnings).
   - Uso de `ExtractionResult` + `AuditLog(run.start)` para mix SAFE/HARD.
   - Panel nuevo en dashboard detrás de feature flag.

### D.3b — pendiente

- Playbooks formales de ajuste económico por cohorte con límites por release.
- Protocolo operativo completo de incident response/rollback económico con drills recurrentes.
- Gobierno de balance con cadencia semanal/quincenal y cierre formal de loop (runbook + postmortem versionado).

### Plan concreto D.3b (posterior a este slice)

1. Runbooks de balance por cohorte con límites de cambio por release.
2. Procedimiento de kill-switch económico con validación recurrente en staging.
3. Cadencia de revisión semanal/quincenal de fuentes/sinks, concentración de riqueza y anomalías.
4. Protocolo de postmortem para incidentes económicos con acciones preventivas versionadas.

### Restricciones

- No aplicar cambios de balance sin observabilidad de impacto post-release.
- Toda intervención económica debe quedar en audit trail y ser reversible operativamente.

---

## Constraints de anti-cheat y economía (obligatorios)

- Ledger append-only, sin `UPDATE` destructivo.
- Ownership checks en toda mutación de activos.
- Idempotencia por `requestId` para operaciones sensibles.
- Transacciones atómicas multi-tabla para settlement/claims/recompensas.
- Detección activa de patrones anómalos (colusión, lavado de valor, volumen atípico por cohorte).
- Kill switch por módulo con degradación controlada (desactivar mutación sin tumbar lectura base).

---

## Matriz de testing para Fase D

| Subfase | Unit | Integration | Action | E2E | Load/Chaos |
|---|---|---|---|---|---|
| **D.1** | Reglas de contenido, cálculo de recompensas, validadores de elegibilidad | Flujos de recompensa multi-tabla con rollback | Auth/ownership + validación Zod en acciones nuevas | Recorridos de contenido clave por cohorte | Carga de lecturas de estado + mutaciones de run sin degradar p95 |
| **D.2** | Heurísticas de escalado y cálculo de umbrales operativos | Pruebas de consistencia bajo concurrencia alta | Verificación de límites/rate controls | Smoke de rutas críticas post-optimización | Stress + chaos de dependencias DB/servicio y recuperación controlada |
| **D.3** | Reglas de balance y guardrails de seguridad | Simulación de ajustes en entorno de staging con rollback | Acciones de operación interna con gate admin | Runbook E2E de incident response | Drill operativo con kill switch y restauración gradual |

---

## Estrategia de rollout

1. **Flags por capacidad D.1 / D.2 / D.3**, nunca activación masiva por endpoint aislado.
2. **Canary por cohortes** (interno → voluntario → gradual) con checkpoints de KPIs económicos.
3. **Go/No-Go checklist** por release con métricas de latencia, errores, invariantes y fraude.
4. **Rollback operativo estándar**: congelar mutaciones, estabilizar lecturas, postmortem, reapertura por etapas.

---

## Criterios de salida de Fase D

- 0 incidentes críticos de integridad económica durante ventanas de rollout principales.
- Estabilidad de latencia p95/p99 en rutas críticas según objetivo definido por subfase.
- KPIs de retención y uso de contenido al menos neutrales (no degradación sostenida).
- Capacidad demostrada de operar ajustes y mitigaciones sin downtime funcional del loop base.

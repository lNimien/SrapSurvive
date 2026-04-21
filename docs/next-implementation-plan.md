# Next Autonomous Implementation Plan — Midgame Spine (Post D.4b)

**Fecha:** 2026-04-19  
**Estado actual:** D.4b consolidado (observabilidad de claims + hardening de concurrencia + runbook operativo)
**Prioridad recomendada siguiente bloque:** Alta

---

## Slice completado

- Claim semanal persistente ahora aplica **CC + XP + item rewards** en la misma transacción.
- Idempotencia reforzada: segundo claim no duplica ledger, progresión ni inventario.
- Cobertura actualizada (unit/integration/action) para normalización de item rewards y rollback end-to-end.
- Dashboard semanal muestra recompensas de items junto con estado de claim.

---

## Próximo bloque recomendado: E.1 — Midgame Spine (retención 2–6 semanas)

1. **Contratos encadenados (multi-run) con riesgo/recompensa real**
   - Introducir cadenas de 2-3 etapas con bonus final y condición de falla.
   - Reusar contratos actuales como plantilla y sumar variantes por modo SAFE/HARD.
   - Mantener idempotencia y claim transaccional como regla innegociable.

2. **Buildcraft funcional (trade-offs, no solo números)**
   - Añadir perks/efectos con contrapartida explícita (ganás X, perdés Y).
   - Evitar meta única: cada arquetipo debe tener al menos una debilidad clara.
   - Mantener caps explícitos en loot/currency/xp/resistencia/threshold.

3. **Sinks de economía de mediano plazo**
   - Introducir sink recurrente controlado (ej. recalibración/reroll acotado con costo en CC).
   - Añadir sink aspiracional (upgrade de cuenta de costo escalado).
   - Monitorear faucet/sink por cohorte antes de ampliar payout global.

4. **UX de decisión de extracción (claridad táctica)**
   - Exponer ganancia marginal estimada por ventana corta (+10s / +30s) en dashboard.
   - Reforzar señalización de umbral de catástrofe y estado de riesgo actual.
   - Priorizar legibilidad y evitar sobrecarga visual.

---

## Backlog técnico posterior (opcional)

### B1 — Telemetría de producto (retención/profundidad)
- Ratio faucet/sink por cohorte.
- Percentiles de ingresos por usuario.
- Delta SAFE/HARD por ventana temporal.
- Time-to-first-build viable y completion rate de cadenas de contrato.

### B2 — Escalado de contenido
- Nuevos eventos de expedición con mutadores server-authoritative.
- Nuevas familias de stats/effects con identidad por arquetipo.
- Extensión de progresión con hitos funcionales (no solo cap numérico).

---

## Criterio de Done del siguiente bloque (E.1)

- Contratos encadenados activos y claimables sin duplicidad en escenarios concurrentes.
- Primer set de perks/efectos de trade-off desplegado con caps explícitos y tests de balance básicos.
- Al menos 1 sink recurrente y 1 sink aspiracional activos, medidos en dashboard ops.
- Mejora de UX en extracción desplegada y validada con telemetría de uso.

---

## Riesgos y mitigación del siguiente bloque

- **Riesgo:** agregar contenido sin decisiones reales (pseudo-variedad).
  - **Mitigación:** exigir trade-offs y counters por arquetipo antes de aprobar perks/items.

- **Riesgo:** inflación de economía por faucets nuevos sin sinks equivalentes.
  - **Mitigación:** gatear nuevos rewards detrás de ratio faucet/sink objetivo por cohorte.

- **Riesgo:** sobrecargar la UI con señales nuevas.
  - **Mitigación:** introducir cambios en iteraciones pequeñas y validar comprensión con métricas de interacción.

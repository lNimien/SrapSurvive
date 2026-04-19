# Next Autonomous Implementation Plan — Post D.4a Weekly Claim Items

**Fecha:** 2026-04-19  
**Estado actual:** D.4a consolidado (kill-switch guards + claim semanal persistente + item rewards transaccionales)
**Prioridad recomendada siguiente bloque:** Alta

---

## Slice completado

- Claim semanal persistente ahora aplica **CC + XP + item rewards** en la misma transacción.
- Idempotencia reforzada: segundo claim no duplica ledger, progresión ni inventario.
- Cobertura actualizada (unit/integration/action) para normalización de item rewards y rollback end-to-end.
- Dashboard semanal muestra recompensas de items junto con estado de claim.

---

## Próximo bloque recomendado: D.4b — Observabilidad y hardening operativo de LiveOps claims

1. **Métricas operativas de claims semanales**
   - Contadores por resultado (`CLAIMED`, `ALREADY_CLAIMED`, `NOT_CLAIMABLE`, `FEATURE_DISABLED`).
   - Tiempos de transacción (p50/p95) para detectar degradación en horario pico.
   - Ratio de rollback y error rate por directiva.

2. **Audit payload ampliado + tablero ops**
   - Exponer en `/ops` resumen semanal de claims (volumen, éxito, rechazos, item faucet por itemDefId).
   - Detectar outliers de faucet de materiales con umbrales simples configurables.

3. **Hardening de concurrencia (stress básico en integración)**
   - Escenario de doble claim concurrente verificando unicidad de efectos.
   - Escenario de contención con múltiples directivas en paralelo para mismo usuario.

4. **Runbook operativo específico de LiveOps claims**
   - Procedimiento para pausar claims, validar consistencia post-incidente y reactivar.
   - Checklist de evidencia para cierre de incidente.

---

## Backlog técnico posterior (opcional)

### B1 — Telemetría por cohorte extendida
- Ratio faucet/sink por cohorte.
- Percentiles de ingresos por usuario.
- Delta SAFE/HARD por ventana temporal.

### B2 — Alerting automático
- Enrutar warning/critical a on-call (Discord/Slack/email).
- Deduplicación de alertas y ventana de enfriamiento.

---

## Criterio de Done del siguiente bloque (D.4b)

- Métricas de claims publicadas en panel ops y auditables por semana.
- Tests de concurrencia para claims semanales en verde.
- Runbook operativo de claims documentado y validado en staging.
- Alertas básicas para spikes de error/rollback configuradas.

---

## Riesgos y mitigación del siguiente bloque

- **Riesgo:** más observabilidad sin señal accionable.
  - **Mitigación:** limitar métricas a KPIs operativos concretos y umbrales explícitos.

- **Riesgo:** tests concurrentes frágiles/no deterministas.
  - **Mitigación:** escenarios acotados con aserciones de invariantes duras (ledger/xp/items únicos).

- **Riesgo:** detección tardía de inflación por item rewards.
  - **Mitigación:** reporte semanal de faucet por itemDefId y límites de rewards conservadores.

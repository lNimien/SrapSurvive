# Next Autonomous Implementation Plan — Post D.3b

**Fecha:** 2026-04-19  
**Estado actual:** D.3b completado (guardrails + runbook + postmortem template)
**Prioridad recomendada siguiente bloque:** Alta

---

## D.3b completado

- Config de gobernanza y helper de evaluación de guardrails.
- Extensión del panel Ops para estado healthy/warning/critical + recomendaciones.
- Documentación operativa en repo:
  - `docs/balance-runbook.md`
  - `docs/postmortem-template.md`
  - referencias cruzadas en `docs/real-money-readiness.md`.

---

## Próximo bloque recomendado: D.4a — Mitigation Flags + Action Guards

1. **Feature flags de mitigación fina en mutaciones económicas críticas**
   - Flags por capacidad: extracción, compras, claims.
   - Precedencia explícita de flags (qué bloquea, qué permite lectura).

2. **Action guards consistentes (`ActionResult`)**
   - Respuestas claras al activar kill-switch.
   - Sin excepciones filtradas al cliente.

3. **Tests de resiliencia operativa**
   - Integration: mutaciones bloqueadas, lecturas disponibles.
   - Action tests: códigos esperados bajo flags activas.

4. **Runbook de kill-switch en staging con drill verificable**
   - Procedimiento paso a paso + evidencia requerida por release.

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

## Criterio de Done del siguiente bloque (D.4a)

- Flags por mutación crítica implementadas y documentadas.
- Tests action/integration en verde para escenarios bloqueados + permitidos.
- Runbook de kill-switch en staging ejecutable de punta a punta.
- Sin rutas de mutación económica sin guardas operativas.

---

## Riesgos y mitigación del siguiente bloque

- **Riesgo:** aumentar complejidad de flags y provocar estados inconsistentes.
  - **Mitigación:** matriz explícita de precedencia de flags + tests de combinatoria mínima.

- **Riesgo:** guardas activadas bloqueando más de lo debido.
  - **Mitigación:** separación estricta mutación vs lectura + smoke tests por ruta.

- **Riesgo:** runbooks demasiado teóricos sin validación real.
  - **Mitigación:** drills de staging obligatorios con evidencia en PR/issue.

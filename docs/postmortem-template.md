# Economy/LiveOps Incident Postmortem Template

**Incident ID:**
**Date/Time (UTC):**
**Severity:** SEV-1 / SEV-2 / SEV-3
**Owner:**
**Status:** Draft / Final

---

## 1) Executive Summary

- Qué pasó en 2-4 líneas.
- Impacto en economía, operación y jugadores.

## 2) Timeline (UTC)

| Time | Event | Owner |
|---|---|---|
| HH:MM | Detección inicial | |
| HH:MM | Contención aplicada | |
| HH:MM | Mitigación confirmada | |
| HH:MM | Reapertura parcial/total | |

## 3) Impact Assessment

- Métricas afectadas (faucet/sink ratio, catastrophe rate, etc.).
- Alcance (cohortes, rutas, features).
- Duración total del incidente.

## 4) Root Cause

- Causa técnica primaria.
- Factores contribuyentes (proceso, observabilidad, validación, comunicación).

## 5) What Worked / What Failed

### Worked

-

### Failed or Missing

-

## 6) Containment & Recovery

- Kill-switches/knobs activados.
- Verificación de staging previa a reapertura.
- Criterio usado para volver a producción.

## 7) Corrective / Preventive Actions (CAPA)

| Action | Type (Fix/Prevention) | Owner | Due Date | Status |
|---|---|---|---|---|
| | | | | |

## 8) Evidence

- Dashboards / snapshots:
- Logs / audit entries:
- PRs / commits / issues relacionados:

## 9) Follow-up Gate

- [ ] Runbook actualizado (`docs/balance-runbook.md`) si aplica.
- [ ] Guardrails ajustados o confirmados.
- [ ] Tests agregados para evitar regresión.
- [ ] Revisión quincenal programada con due date.

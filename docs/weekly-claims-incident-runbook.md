# Weekly Claims Incident Runbook (D.4b)

**Estado:** Activo para operación interna  
**Última actualización:** 2026-04-19  
**Owner:** LiveOps On-Call + Economy Owner

---

## 1) Objetivo

Responder rápido a incidentes de claims semanales (duplicación, rechazos masivos, latencia elevada o faucet anómalo) sin comprometer integridad económica.

---

## 2) Señales de detección (en `/ops` → Weekly Claims Health)

- Spike de `ERROR` o `FEATURE_DISABLED` en attempts por outcome.
- `successRatio` 24h cae de forma abrupta vs baseline semanal.
- `p95` de claim latency se degrada sostenidamente.
- Faucet por `itemDefId` fuera de patrón esperado (materiales específicos con salto no explicado).

Señales secundarias:

- Soporte reporta claims “perdidos” o repetidos.
- Incremento de `VALIDATION_ERROR` en `claimWeeklyDirectiveAction`.

---

## 3) Mitigación inmediata (primeros 15 minutos)

1. **Contener mutación de claims**
   - Activar `FEATURE_KILL_SWITCH_UPGRADE_ACHIEVEMENT_CLAIMS=true`.
   - Desplegar/reiniciar proceso si aplica para refrescar env.
   - Confirmar en `/ops` que el kill-switch aparece activo.

2. **Verificar efecto de contención**
   - Ejecutar smoke de claim: debe responder `FEATURE_DISABLED`.
   - Verificar que paneles de lectura (dashboard/inventory/history/ops) siguen operativos.

3. **Preservar evidencia**
   - Exportar snapshot de métricas Weekly Claims Health (24h/7d).
   - Registrar timestamp de activación, owner y motivo.

---

## 4) Queries de verificación rápida

> Ejecutar en DB de producción/staging según incidente.

### 4.1 Duplicados por `claimReferenceId` en ledger (no debe haber >1)

```sql
SELECT "referenceId", COUNT(*) AS duplicate_count
FROM "CurrencyLedger"
WHERE "referenceId" LIKE 'weekly-directive:%:claim'
GROUP BY "referenceId"
HAVING COUNT(*) > 1;
```

### 4.2 Estado de claims por directiva/semana

```sql
SELECT "directiveKey", "weekStart", "status", COUNT(*) AS rows
FROM "WeeklyDirectiveProgress"
GROUP BY "directiveKey", "weekStart", "status"
ORDER BY "weekStart" DESC, "directiveKey", "status";
```

### 4.3 Intentos por outcome desde audit log (24h)

```sql
SELECT
  payload->>'outcome' AS outcome,
  COUNT(*) AS attempts,
  ROUND(AVG((payload->>'durationMs')::numeric), 2) AS avg_duration_ms
FROM "AuditLog"
WHERE action = 'liveops.weekly.claim_attempt'
  AND "createdAt" >= NOW() - INTERVAL '24 hours'
GROUP BY payload->>'outcome'
ORDER BY attempts DESC;
```

### 4.4 Faucet semanal por itemDefId desde claims (7d)

```sql
SELECT
  item->>'itemDefinitionId' AS item_def_id,
  SUM((item->>'quantity')::int) AS total_quantity
FROM "AuditLog",
LATERAL jsonb_array_elements(payload->'rewardItems') AS item
WHERE action = 'liveops.weekly.claim'
  AND "createdAt" >= NOW() - INTERVAL '7 days'
GROUP BY item->>'itemDefinitionId'
ORDER BY total_quantity DESC;
```

---

## 5) Recovery checklist

1. Reproducir causa en staging con dataset mínimo del incidente.
2. Validar fix con doble-claim concurrente (solo 1 settlement efectivo).
3. Verificar invariantes:
   - ledger append-only sin duplicados por referenceId,
   - sin doble incremento de inventory,
   - XP/level consistentes con un solo claim válido.
4. Reabrir gradualmente:
   - desactivar kill-switch,
   - smoke controlado de claims,
   - monitoreo reforzado en 2 ventanas consecutivas.

---

## 6) Comunicación de incidente

### Interna (obligatoria)

- Abrir incidente con severidad y alcance.
- Compartir:
  - cuándo inició,
  - impacto estimado (usuarios/directivas/items),
  - estado de mitigación,
  - ETA de recuperación.

### Externa (si hubo impacto al jugador)

- Mensaje breve y factual:
  - qué se afectó,
  - estado actual (mitigado/en recuperación),
  - si habrá compensación/manual replay.

### Cierre

- Postmortem en `docs/postmortem-template.md` dentro de 48h.
- Crear acciones preventivas con owner y fecha (alertas, tests o guardrails faltantes).

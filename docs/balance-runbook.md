# Balance Governance Runbook (D.3b)

**Estado:** Activo para operación interna
**Última actualización:** 2026-04-19
**Owner:** Economy Owner + LiveOps On-Call

---

## 1) Objetivo

Operar la economía con cambios pequeños, trazables y reversibles, evitando ajustes impulsivos que rompan fairness o estabilidad del loop base.

---

## 2) Cadencia operativa

### Revisión semanal (obligatoria)

- Ventana principal: 24h + 7d.
- Revisar en panel Ops:
  - ratio faucet/sink,
  - tasa de catástrofe,
  - participación de ventas en faucet,
  - top faucets/sinks por `entryType`.
- Confirmar estado guardrails (healthy/warning/critical).
- Registrar decisiones en issue/PR o bitácora interna antes de aplicar cambios.

### Revisión quincenal (obligatoria)

- Comparar tendencia 14d por cohorte (nuevos vs recurrentes).
- Validar que ajustes recientes no degradaron:
  - retención,
  - tasa de extracción exitosa,
  - percepción de progreso (ganancia neta no explosiva).
- Revisar si los floor/ceiling de venta siguen alineados con economía global.

---

## 3) Checklist de revisión (Go / Hold)

### A. Integridad y estabilidad

- [ ] No hay incidentes abiertos de ledger/inventario.
- [ ] No hay alertas de duplicación o idempotencia rota.
- [ ] Kill-switches conocidos y responsables on-call disponibles.

### B. Guardrails económicos

- [ ] Faucet/sink dentro de banda objetivo (o plan explícito si está en warning).
- [ ] Catastrophe rate dentro de banda esperada por zona/corte temporal.
- [ ] Participación de ventas en faucet dentro de guía (sin picos anómalos).

### C. Decisión de cambio

- [ ] Cambio propuesto <= 10% por release (recompensa, costo o floor/ceiling).
- [ ] Existe rollback documentado antes de activar.
- [ ] Ajuste probado en staging con evidencia.

Si algún punto falla, decisión por defecto: **HOLD**.

---

## 4) Qué NO cambiar impulsivamente

1. Multiplicadores de recompensa + costos en el mismo release sin simulación.
2. Thresholds de catástrofe en caliente sin test de regresión.
3. Varios knobs económicos a la vez para “corregir rápido”.
4. Floor/ceiling de venta sin revisar cohortes y top faucets.
5. Cualquier ajuste sin plan de rollback y sin responsable asignado.

---

## 5) Flujo de respuesta de emergencia

1. **Detectar y clasificar**
   - Identificar métrica en `critical` + alcance (cohortes / rutas afectadas).
2. **Contener**
   - Activar kill-switch o knob operativo más acotado posible.
   - Mantener lecturas del juego cuando sea viable.
3. **Preservar evidencia**
   - Guardar snapshots de métricas, logs y acciones ejecutadas.
4. **Mitigar en staging**
   - Reproducir causa y validar fix/ajuste en entorno controlado.
5. **Reapertura gradual**
   - Re-habilitar en cohortes pequeñas con monitoreo reforzado.
6. **Cerrar con postmortem**
   - Completar `docs/postmortem-template.md` en < 48h.

### Checklist operativo D.4a — activación/desactivación de kill-switch

**Activación (contención inmediata)**

1. Identificar categoría afectada (extracción, market, crafting, contratos, claims).
2. Activar variable `FEATURE_KILL_SWITCH_*` correspondiente en entorno objetivo.
3. Desplegar/reiniciar proceso según plataforma para que el flag quede efectivo.
4. Verificar en `/ops` que el switch aparece como **Activo**.
5. Ejecutar smoke manual:
   - mutación crítica devuelve `FEATURE_DISABLED` + mensaje estándar,
   - flujos de lectura continúan operativos.
6. Registrar timestamp, owner y motivo en bitácora del incidente.

**Desactivación (reapertura gradual)**

1. Confirmar fix aplicado y validado en staging con replay del caso.
2. Desactivar el `FEATURE_KILL_SWITCH_*` del flujo afectado.
3. Verificar en `/ops` estado **Inactivo**.
4. Ejecutar smoke post-reapertura (1-2 mutaciones reales controladas).
5. Monitorear 2 ventanas consecutivas sin regresiones antes de cerrar incidente.

---

## 6) Knobs/Kill-switches recomendados

- `FEATURE_D3_BALANCE_GOVERNANCE` → visibilidad del panel de guardrails (no muta economía).
- `FEATURE_C2_GLOBAL_MARKET_BETA` → pausar impacto de mercado.
- `FEATURE_C3_PREMIUM_SYSTEMS` → congelar claims/compras premium.
- `FEATURE_C3_LIVE_OPS` → pausar eventos con impacto de recompensa.
- `ops.freeze-extraction-reward-adjustments` (operativo) → congelar ajustes manuales mientras se investiga.

---

## 7) Criterio de salida de incidente

- Guardrails en `warning` o `healthy` durante al menos 2 ventanas de revisión consecutivas.
- Sin inconsistencias nuevas de ledger/inventario.
- Acciones preventivas asignadas con owner y fecha.

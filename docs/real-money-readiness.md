# Scrap & Survive — Real Money Readiness Plan

**Estado:** Plan operativo previo a cualquier integración de dinero real  
**Fecha:** 2026-04-19  
**Objetivo:** habilitar monetización real sin romper fairness, compliance ni integridad económica

---

## Estado D.3b (Operational Governance) — completado

- ✅ Guardrails de balance implementados en panel Ops (`FEATURE_D3_BALANCE_GOVERNANCE`).
- ✅ Runbook operativo de balance versionado: `docs/balance-runbook.md`.
- ✅ Plantilla de postmortem económico/liveops: `docs/postmortem-template.md`.
- ✅ Recomendación automática de contención basada en métricas 24h.

> Nota: estos entregables habilitan operación más segura hacia real-money readiness, pero **no** sustituyen compliance legal ni conciliación financiera automatizada.

---

## 1) Principios de monetización (fair, non-P2W)

1. **No pay-to-win estricto**
   - Prohibido vender ventajas directas de poder: loot/xp boosts, reducción de peligro, bypass de catástrofe, ventajas de matchmaking o trading.
2. **Venta de valor cosmético y QoL no competitivo**
   - Skins, temas HUD, personalización visual, herramientas de conveniencia que no alteren resultados económicos autoritativos.
3. **Transparencia contractual**
   - Todo producto de pago debe explicar claramente qué da y qué NO da.
4. **Integridad > conversión**
   - Si una mecánica mejora ARPPU pero daña fairness/confianza, no se despliega.
5. **Control de presión comercial**
   - No diseñar FOMO agresivo ni dark patterns como base del revenue.

---

## 2) Compliance y riesgos (checklist operativo)

> Esta sección no reemplaza asesoría legal. Es checklist técnico-operativo para coordinar legal/finanzas/ops.

### Jurisdicción y calificación regulatoria

- [ ] Definir países objetivo iniciales (whitelist de operación).
- [ ] Confirmar si la economía entra en categorías reguladas (gaming/gambling/financial transfer) por jurisdicción.
- [ ] Aplicar geo-restricciones donde el marco legal no esté claro o sea prohibitivo.

### KYC/AML boundaries

- [ ] Documentar si el producto habilita cash-in y/o cash-out.
- [ ] Si existe cash-out o transferencia de valor equivalente a dinero, evaluar obligatoriedad de KYC/AML.
- [ ] Integrar proveedor de verificación donde sea requerido y registrar decisiones de riesgo.
- [ ] Definir umbrales de monitoreo por volumen/frecuencia para señales de lavado.

### Tax y accounting

- [ ] Definir tratamiento contable de revenue diferido (entitlements consumibles/no consumibles).
- [ ] Implementar conciliación diaria: pagos proveedor ↔ ledger interno ↔ entregables virtuales.
- [ ] Configurar reportes de impuestos indirectos (VAT/GST/sales tax) según región.
- [ ] Definir política de reembolso y reversa contable con trazabilidad.

### Anti-fraud ops

- [ ] Detección de abuso por patrones (velocity, device fingerprint, chargeback clustering).
- [ ] Rate limiting + challenge escalonado en eventos sospechosos.
- [ ] Playbook de suspensión temporal y revisión manual.
- [ ] Evidencia forense en `AuditLog` para disputas/reversiones.

---

## 3) Guardrails de economía para sistemas vinculados a dinero real

1. **Ledger append-only obligatorio**
   - Cualquier evento monetario deja entrada inmutable con `referenceId` trazable.
2. **Separación de monedas**
   - Mantener separación clara entre monedas blandas de gameplay y entitlements premium.
3. **Límites por transacción y por ventana temporal**
   - Topes por usuario/día para compras, claims y transferencias de alto riesgo.
4. **Circuit breakers económicos**
   - Si métricas de anomalía cruzan umbral, congelar mutaciones premium/market inmediatamente.
5. **Idempotencia end-to-end**
   - Toda operación de compra/claim con `requestId` único y respuesta repetible sin efectos dobles.
6. **No optimistic economy updates**
   - El cliente espera confirmación server-authoritative antes de reflejar balances/entitlements.
7. **Monitoreo de concentración y abuso**
   - Alertas por concentración extrema de valor, arbitraje abusivo y colusión.

---

## 4) Estrategia de rollout por fases

### Fase R0 — Preparación interna (sin cobro a usuarios)

- Endurecer observabilidad y antifraude.
- Ejecutar pruebas de carga/concurrencia de flujos monetarios en staging.
- Validar kill-switches y rollback operativos.

### Fase R1 — Paid sandbox limitado

- Habilitar compras simuladas o low-risk SKU para cohorte interna.
- Verificar conciliación técnica completa (proveedor ↔ ledger ↔ entrega).
- Medir incidencia de errores y tiempos de resolución.

### Fase R2 — Beta cerrada (1–5%)

- Apertura con catálogo acotado (cosmético/QoL).
- Guardrails estrictos de riesgo y límites de transacción.
- Revisión diaria de fraude, chargebacks, soporte y satisfacción.

### Fase R3 — Escalado gradual (5–20–100%)

- Expandir cohortes por hitos de estabilidad, no por calendario fijo.
- Go/No-Go por métricas: integridad, fraude, latencia, soporte, retención.

---

## 5) Política de kill-switch (obligatoria)

### Switches mínimos

- `premium.purchase.enabled`
- `premium.claim.enabled`
- `market.settlement.enabled`
- `cashout.enabled` (si aplica)

### D.4a — Kill-switches implementados en código (MVP)

- `FEATURE_KILL_SWITCH_EXTRACTION_MUTATIONS` → bloquea `startRun`, `requestExtraction`, `resolveAnomaly`.
- `FEATURE_KILL_SWITCH_MARKET_MUTATIONS` → bloquea `buyItem`, `sellItems`.
- `FEATURE_KILL_SWITCH_CRAFTING_MUTATIONS` → bloquea `craftItem`, `salvageItem`.
- `FEATURE_KILL_SWITCH_CONTRACTS_MUTATIONS` → bloquea mutaciones de contratos (`deliver`, `refresh`).
- `FEATURE_KILL_SWITCH_UPGRADE_ACHIEVEMENT_CLAIMS` → bloquea `purchaseUpgrade`, `claimAchievement`.

Contrato de respuesta bajo bloqueo:
- `ActionResult.success = false`
- `error.code = FEATURE_DISABLED`
- `error.message = "Sistema temporalmente en mantenimiento. Intenta más tarde."`
- lectura de estado (`dashboard`, `inventory`, `history`, `ops`) sigue disponible.

### Reglas de activación

Activar kill-switch inmediato si ocurre cualquiera:

1. inconsistencia de ledger/inventario confirmada,
2. duplicación de compra o claim,
3. señal de fraude sistémica por encima de umbral,
4. caída de conciliación financiera fuera de tolerancia.

### Protocolo operativo

1. Congelar mutaciones afectadas (mantener lecturas cuando sea posible).
2. Preservar evidencia (logs, request ids, snapshots transaccionales).
3. Ejecutar runbook de contención + comunicación.
4. Corregir causa raíz y validar en staging con replay controlado.
5. Reapertura progresiva por cohortes.

---

## 6) Definición de readiness mínima antes de producción real-money

- [ ] Compliance legal validado por jurisdicción objetivo.
- [ ] Flujos monetarios con idempotencia e integración de auditoría completos.
- [ ] Monitoreo antifraude + alerting con on-call operativo.
- [ ] Conciliación contable diaria automatizada.
- [ ] Kill-switches probados con drills de incidente.
- [ ] Catálogo de pago limitado a elementos non-P2W.
- [ ] Métricas de confianza/soporte aceptables en beta cerrada.

Referencias operativas vigentes:
- `docs/balance-runbook.md`
- `docs/postmortem-template.md`

Si algún punto no está en verde, **no se habilita dinero real en producción**.

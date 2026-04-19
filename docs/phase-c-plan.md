# Plan de Fase C — Mercado Global, Monetización Justa y LiveOps

**Estado:** C.1 implementado (foundation), C.2/C.3 en plan  
**Fecha:** 2026-04-18  
**Scope:** Planeación y criterios de ejecución (sin implementación)

---

## Objetivo de Fase C

Construir el meta-juego de largo plazo de Scrap & Survive con tres ejes coordinados:

1. **Mercado global P2P** seguro, auditable e idempotente.
2. **Monetización sana** orientada a cosmético/QoL, sin pay-to-win.
3. **LiveOps + social ligero** para sostener engagement semanal/mensual.

El objetivo principal de C no es “más features”, sino **operar sistemas de alto riesgo económico sin romper integridad de datos ni confianza del jugador**.

---

## Criterios de entrada (qué debe estar estable en B antes de iniciar)

Fase C solo inicia cuando B esté operacionalmente estable durante al menos 4 semanas continuas:

- **Integridad económica:**
  - 0 incidentes críticos de desbalance de ledger/inventario.
  - 0 incidentes de doble claim/craft/salvage sin rollback.
- **Calidad técnica:**
  - Test suite estable en CI (sin flakes críticos) en dominios de economía/progresión.
  - Cobertura de pruebas de concurrencia en flujos B (craft/salvage/equip) ejecutada en cada release.
- **Observabilidad mínima:**
  - Dashboard de salud de economía (fuentes/sinks netos diarios, distribución de riqueza, inflación de precios NPC).
  - Alertas operativas activas (errores 5xx, latencias p95, rollback rate transaccional).
- **Retención mínima orientativa para justificar C:**
  - D7 ≥ 20%.
  - D30 ≥ 10%.
  - Sesiones semanales por usuario estables o al alza en 3 cortes semanales consecutivos.

Si alguno de estos criterios cae por debajo del umbral, C se pausa y se vuelve a hardening de B.

---

## Principios de monetización justa (no pay-to-win, integrity-first)

Estos principios son vinculantes para toda Fase C:

1. **No pay-to-win absoluto:**
   - Prohibido vender loot, stats, XP, reducción de peligro o garantías de drop.
2. **La economía competitiva no depende de pago:**
   - El mercado P2P no puede dar ventajas transaccionales exclusivas para jugadores de pago.
3. **Monetización como conveniencia visual/operativa:**
   - Solo cosméticos, personalización, analítica avanzada personal y QoL no decisivo.
4. **Integridad primero que conversión:**
   - Si una mecánica aumenta conversión pero degrada fairness o confianza, se descarta.
5. **Transparencia total:**
   - Lo pagado debe explicarse claramente (qué da y qué no da).
6. **Control de presión psicológica:**
   - No FOMO extremo, no timers artificiales diseñados para forzar compra.

Referencia normativa: `docs/monetization.md` (líneas rojas) + `docs/game-design.md` (loop núcleo).

---

## Fase C.1 (Foundation)

**Estado actual:** Implementado en el código base (slice previo) para cobertura de observabilidad/economía; C.1 se considera habilitado para operar y monitorear, no aún equivalente a apertura de mercado P2P.

### Objetivo

Preparar infraestructura operativa, antifraude y de observabilidad **antes** de habilitar cualquier transacción P2P real.

### Alcance C.1

- Telemetría de economía y mercado (aún sin mercado habilitado al público).
- Controles antifraude base y trazabilidad de actor/acción/recurso.
- Borrador de modelo escrow (bloqueo temporal de activos en venta).
- Métricas operativas de confiabilidad y performance para operaciones críticas.

### Data model impact (Prisma/DB)

Cambios permitidos en C.1 (draft + infraestructura):

- `MarketEscrow` (draft/disabled por feature flag):
  - `id`, `userId`, `assetType`, `assetRefId`, `quantity`, `status`, `expiresAt`, `createdAt`.
  - Índices: `(userId, status)`, `(status, expiresAt)`, `(assetType, assetRefId)`.
- `EconomyMetricDaily` (agregado diario):
  - `date`, `faucetTotal`, `sinkTotal`, `netDelta`, `activeUsers`, `medianBalance`.
  - Índices: único `(date)`.
- `FraudSignal`:
  - `id`, `userId`, `signalType`, `severity`, `payloadJson`, `createdAt`, `resolvedAt`.
  - Índices: `(userId, createdAt)`, `(signalType, createdAt)`, `(severity, createdAt)`.

> Nota: C.1 puede crear tablas “apagadas” para telemetry/escrow draft, pero sin habilitar compra/venta real al usuario final.

### Server/service impact

- `server/services/telemetry/*`: agregación de métricas de economía.
- `server/services/fraud/*`: scoring básico por heurísticas (velocidad anómala, patrones repetitivos).
- `server/domain/market/escrow.service.ts` (solo validaciones + simulación, detrás de flag).
- Extensión de `AuditLog` para eventos de intención de mercado y señales antifraude.

### Resultado esperado de C.1

Mercado aún deshabilitado, pero base operativa lista para beta controlada.

### Resultado real alcanzado (snapshot)

- Telemetría económica y observabilidad operacional incorporadas.
- Hardening de invariantes económicos en suites de integración/servicio.
- Acciones y servicios de C.1 operativos con enfoque en auditoría y trazabilidad.
- Mercado P2P global permanece apagado (alineado a secuencia C.1 → C.2).

---

## Fase C.2 (Global Market beta)

### Objetivo

Lanzar beta cerrada de mercado global P2P con garantías fuertes de idempotencia, no-duplicación y settlement atómico.

### Flujos obligatorios

1. **Listing:** usuario publica oferta válida, se bloquea activo en escrow.
2. **Escrow:** el item/stack listado queda no-transferible fuera del flujo de mercado.
3. **Matching:** compra directa (sin libro complejo en primer corte) por precio fijo.
4. **Settlement:** transacción atómica (debitar comprador, acreditar vendedor, fee sink, transferir activo, cerrar escrow).
5. **Cancelación:** solo si no está en proceso de fill; desbloquea escrow de forma idempotente.

### Reglas de fees/sinks

- Fee por transacción P2P en moneda blanda (CC), configurable por entorno.
- Fee mínimo y máximo para evitar extremos en micro-transacciones y tickets grandes.
- Fee se registra en ledger append-only como sink explícito de economía.

### Reglas anti-dupe / idempotencia / concurrencia

- Toda mutación crítica requiere `requestId` único por usuario + acción.
- `settlement` solo por `status=OPEN` y transición única `OPEN -> FILLED`.
- Bloqueo transaccional de filas de listing/escrow durante fill.
- Reintentos de cliente no deben crear efectos dobles.
- Cualquier inconsistencia intermedia hace rollback total.

### Data model impact (Prisma/DB)

- `MarketListing`:
  - `id`, `sellerUserId`, `assetType`, `assetRefId`, `quantity`, `unitPrice`, `currency`, `status`, `expiresAt`, `createdAt`, `updatedAt`.
  - Índices: `(status, createdAt)`, `(sellerUserId, status)`, `(assetType, status, unitPrice)`, `(expiresAt)`.
- `MarketTrade`:
  - `id`, `listingId`, `buyerUserId`, `sellerUserId`, `quantity`, `grossAmount`, `feeAmount`, `netAmount`, `status`, `createdAt`.
  - Índices: `(buyerUserId, createdAt)`, `(sellerUserId, createdAt)`, `(listingId)`.
- `MarketIdempotencyKey`:
  - `id`, `userId`, `actionType`, `requestId`, `resultHash`, `createdAt`.
  - Índices: único `(userId, actionType, requestId)`.

### Server/service impact

- Nuevos Application Services:
  - `market-listing.service.ts`
  - `market-matching.service.ts`
  - `market-settlement.service.ts`
- Domain services dedicados:
  - validación de precio/rango,
  - validación ownership real del activo,
  - reglas de expiración y cancelación segura.
- Repositories:
  - acceso aislado para listing/trade/escrow/idempotency.
- Server Actions:
  - `createListing`, `cancelListing`, `buyListing`, `getMarketSnapshot` (solo DTOs).

> **Compatibilidad con MVP single-process:** en C.2 el matching/settlement se mantiene en proceso único Next.js + PostgreSQL transaccional.  
> Si se propone cola/worker para settlement asíncrono, requiere ADR previo (ver sección ADRs).

---

## Fase C.3 (Monetización + LiveOps)

### Objetivo

Activar monetización compatible con fairness y operar ciclos de contenido en vivo para sostener DAU/WAU sin erosionar confianza.

### Alcance monetización (permitido)

- Cosméticos puros (skins visuales, temas HUD, efectos visuales de resultado).
- QoL no competitivo (historial extendido, analítica personal avanzada, presets de UI).
- Pases estacionales tipo battle-pass-like **solo** si las recompensas de gameplay son equivalentes para free/pago (premium enfocado en cosmético + conveniencia).

### Alcance monetización (prohibido)

- Boosts de loot/XP/peligro.
- Ventajas directas en mercado (fees menores solo para premium, prioridad de matching, slots de listing competitivos).
- Cualquier bypass de riesgo del loop de run.

### LiveOps y cadence

- Cadencia mínima:
  - evento corto semanal (48–72h),
  - evento mediano mensual (7–10 días),
  - temporada trimestral (8–12 semanas).
- Rotación de objetivos:
  - objetivos de extracción, contratos temáticos, milestones comunitarios.
- Recompensas:
  - mayormente cosméticas + títulos + meta-progresión no competitiva.

### Social layer (lightweight first)

Primero social de bajo acoplamiento:

- Perfil público básico (opt-in).
- Feed liviano de hitos (sin chat en tiempo real).
- Leaderboards acotados por temporada con anti-cheat y reseteo planificado.

No incluir aún:

- chat global,
- guild wars,
- trading directo P2P fuera del market regulado,
- sistemas de reputación punitivos complejos sin tooling de moderación.

### Data model impact (Prisma/DB)

- `LiveEvent` + `LiveEventRule` + `LiveEventReward`:
  - índices por `(status, startsAt, endsAt)` y `(eventId, ruleType)`.
- `SeasonPassSeason`, `SeasonPassTrack`, `SeasonPassClaim`:
  - índices `(seasonId, tier)`, único `(userId, seasonId, trackType, tier)`.
- `CosmeticOwnership`:
  - único `(userId, cosmeticId)`.
- `SocialProfile` (opt-in) + `SeasonLeaderboardEntry`:
  - índices `(seasonId, score DESC)`, `(userId, seasonId)`.

### Server/service impact

- `liveops.service.ts`: activación/cierre de eventos y validación de ventanas temporales.
- `season-pass.service.ts`: progreso, claims idempotentes y antifraude.
- `cosmetic.service.ts`: catálogo, unlocks, ownership checks.
- `social-read.service.ts`: read models de perfil/leaderboard con DTOs cacheables de corta duración.

---

## Security & anti-cheat checklist

- [ ] Ownership check obligatorio en toda mutación de activo/listing/trade.
- [ ] Idempotencia por `requestId` para `create/cancel/buy/claim`.
- [ ] Transacciones atómicas para settlement y claims de evento.
- [ ] Ledger append-only sin updates destructivos.
- [ ] Alertas antifraude por patrones de colusión (IPs, tiempos, precios atípicos).
- [ ] Límites de frecuencia por usuario/IP para endpoints de mercado.
- [ ] Auditoría completa (`run.*`, `market.*`, `liveops.*`, `premium.*`).
- [ ] Kill switch operativo por módulo (`market_enabled`, `liveops_enabled`, `premium_enabled`).
- [ ] Monitoreo de divergencia inventario↔escrow↔trade diario.

---

## Testing matrix por subfase

| Subfase | Unit | Integration | Action | E2E | Load/Chaos |
|---|---|---|---|---|---|
| **C.1** | Reglas de señales antifraude, agregación de métricas, validación de draft escrow | Escritura de métricas + rollback ante fallos parciales | Auth/ownership de endpoints de telemetry interna | Smoke de paneles operativos internos | Carga: 200 rps lectura de métricas, p95 < 250ms; caos: caída de writer no rompe gameplay |
| **C.2** | Invariantes de listing/escrow/fees, transiciones de estado | Settlement atómico multi-tabla + idempotencia por reintento | create/cancel/buy con usuarios válidos/no autorizados | Flujo completo listar→comprar→confirmar inventario/ledger | Carga: 50 settles/s sostenidos, p95 < 400ms; caos: retries duplicados y abortos de transacción sin dupe |
| **C.3** | Reglas de eventos, cálculo de progreso season pass, políticas premium | Claims de pass/evento con rollback + no doble claim | purchase/claim/profile social con ownership y validación Zod | Temporada end-to-end (activar evento, progresar, reclamar, cerrar) | Carga: 500 claims/min en pico; caos: kill switch inmediato + reanudación consistente |

### Criterios de salida de testing

- 0 fallos de invariantes económicos en integración.
- 0 duplicaciones en pruebas de concurrencia repetidas (mín. 1000 iteraciones por flujo crítico C.2).
- Objetivos de latencia p95 cumplidos en entorno staging representativo.

---

## Rollout strategy

1. **Feature flags por capacidad** (no por endpoint suelto):
   - `market.c1_telemetry`
   - `market.c2_beta`
   - `premium.c3`
   - `liveops.c3`
   - `social.c3_light`
2. **Canary cohorts**:
   - 1% usuarios internos/whitelist.
   - 5% cohort voluntario.
   - 20% gradual con observación de KPIs.
   - 100% solo al cumplir guardrails.
3. **Kill switch**:
   - deshabilitar mutaciones de mercado/liveops sin tumbar lectura del juego base.
4. **Rollback operativo**:
   - suspender nuevas operaciones, completar transacciones en curso, abrir postmortem y reactivar por etapas.

---

## KPI targets y guardrails

### Retención / engagement

- D7 objetivo C.3: **≥ 24%**.
- D30 objetivo C.3: **≥ 12%**.
- WAU/MAU objetivo: **≥ 0.45**.

### Salud económica

- Delta neto faucet-sink semanal dentro de banda controlada (definir por zona y nivel).
- Top 1% balance share bajo umbral de concentración acordado en ADR de economía.
- Precio mediano de ítems core con volatilidad semanal acotada.

### Riesgo/fraude

- Trades marcados como sospechosos: **< 0.5%** del total.
- Confirmación de fraude real sobre total de trades: **< 0.1%**.
- Incidentes críticos de integridad mercado: **0 tolerancia**.

### Conversión (con guardrails)

- Conversión premium objetivo inicial: **2–4%** sin deterioro de fairness.
- ARPPU creciente sin correlación negativa fuerte en retención free.
- Guardrail: si sube conversión y cae D30 free > 2pp por 2 ciclos, pausar expansión premium.

---

## ADRs requeridos antes de implementación

Antes de escribir código de Fase C, deben existir y estar aprobados estos ADRs:

1. **ADR-C01 — Invariantes de mercado P2P y modelo escrow**.
2. **ADR-C02 — Política de fees/sinks y estabilidad macroeconómica**.
3. **ADR-C03 — Framework antifraude (detección, respuesta, apelación)**.
4. **ADR-C04 — Monetización justa (líneas rojas operativas y excepciones nulas)**.
5. **ADR-C05 — LiveOps cadence + season pass sin pay-to-win**.
6. **ADR-C06 — Escalabilidad operativa C (single-process vs workers/queues)**:
   - Si se proponen workers/colas, este ADR es prerequisito obligatorio y debe detallar migración incremental desde proceso único.

---

## No hacer todavía (explícito)

- No habilitar mercado global abierto sin completar C.1 y pruebas de C.2.
- No introducir moneda premium que afecte resultados de run.
- No activar subastas complejas/order book avanzado en primer beta.
- No agregar chat global o social en tiempo real (WebSockets/SSE) sin ADR y capacidad operativa demostrada.
- No mover a microservicios por anticipación; mantener single-process hasta evidencia objetiva de cuello de botella.
- No lanzar battle pass si no hay contenido estacional real y calendario operativo sostenido.
- No abrir cross-region market si no existe modelo fiscal/legal y anti-fraude regional documentado.

---

## Secuencia recomendada post B.3 (resumen ejecutivo)

1. **C.1 Foundation (4–6 semanas):** telemetría + antifraude + escrow draft + métricas operativas.
2. **C.2 Market beta (6–10 semanas):** beta cerrada de listing/escrow/settlement con guardrails estrictos.
3. **C.3 Monetización + LiveOps (8–12 semanas):** premium cosmético/QoL + eventos + social ligero por flags.

Condición transversal: cada salto de subfase requiere KPIs en verde + cero incidentes críticos de integridad.

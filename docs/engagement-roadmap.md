# Roadmap de Engagement y Retención (Post-MVP)

**Estado:** B/C implementadas parcialmente + D.1/D.2 ejecutados + D.3 low-churn slice (D.3.1/3.2/3.3) aplicado  
**Fecha:** 2026-04-19  
**Scope:** Fase 1+ (no bloquea ni modifica el alcance MVP actual)

---

## Estado de implementación — B/C audit + D.1 aplicado

### Revisión rápida B/C (slice actual)

- **Gameplay/economía:** sin inconsistencias críticas detectadas en ledger append-only, crafting transaccional, ownership checks ni claim idempotente.
- **Auth/actions:** suites de acciones siguen cubriendo `UNAUTHORIZED`/`VALIDATION_ERROR` en mutaciones sensibles.
- **Cobertura de tests B/C:** se mantiene cobertura de dominio para contratos/upgrades/achievements, más integración de contratos/crafting/extracción.
- **Fixes mínimos críticos aplicados:** ninguno fuera de D.1 (no se detectó un blocker de integridad que exigiera hotfix independiente).

### Implementado ahora

- **Contratos v1.5 (server-authoritative):**
  - Generación diaria con bracket de dificultad explícito (EASY/STANDARD/HARD) y rewards escaladas por nivel.
  - Hardening de rotación diaria: no se regeneran contratos infinitamente al completar uno; se mantiene set diario coherente.
  - Nueva acción de **refresh/reroll** de contratos con costo en CC, transacción serializable, ledger append-only, audit log e idempotencia por `requestId`.
  - Mejora UX en panel de contratos (urgencia temporal, orden por accionabilidad y CTA de refresh).

- **Expansión de upgrades:**
  - +4 definiciones nuevas en `config/upgrades.config.ts`, usando el modelo actual de efectos y manteniendo caps deterministas al aplicar sobre `DangerConfig`.

- **Expansión de achievements:**
  - +8 logros nuevos en `config/achievements.config.ts`, todos usando triggers existentes.
  - Se mantiene claim idempotente/transaccional en servicio.

- **Balance pass temprano (NPC economy):**
  - Ajuste de presión económica mediante refresh de contratos con sink controlado (85 CC) y rewards de contrato con escalado más suave por nivel.
  - Mercado sigue siendo **NPC market** (sin P2P global).

- **D.1 — Profundidad de contenido y progresión (implementado):**
  - Nueva zona `abyssal_fracture` con riesgo/recompensa superior y `minLevel` en config.
  - Gate server-authoritative por nivel en `startRun` (usuario por debajo del mínimo no puede iniciar).
  - Selector de zona actualizado con estado bloqueado/desbloqueado y nivel requerido visible.
  - Expansión de contenido: nuevos materiales de tier alto y piezas legendarias craftables.
  - Recetas nuevas (3-5+) ligadas al contenido de zona nueva y consistencia de obtenibilidad.
  - Profundización de build: nuevo efecto determinístico de equipo para XP (`xpMultiplier` por config + rareza, con cap explícito).
  - Hooks de progresión extendidos con nuevas definiciones de upgrades/logros sin cambios de schema.

### Diferido explícitamente

- Mercado global entre jugadores (P2P).
- Premium currency / monetización de economía avanzada.
- Cambios de schema para modelar metadatos avanzados de contratos (se evitó migración en B.3).

---

## 1) Brecha actual: loop correcto, profundidad limitada

El MVP actual valida bien el núcleo del juego (run automática, riesgo creciente, decisión de extraer, resolución autoritativa en servidor), pero tiene una brecha clara de retención:

- El loop es **sólido pero corto**: la decisión principal existe, pero hay pocas metas de mediano plazo.
- Falta variedad sistémica para sostener sesiones repetidas (economy sinks, progresión transversal, metas semanales, etc.).
- El jugador entiende rápido “cómo jugar”, pero todavía no tiene suficientes razones para volver de forma consistente.

**Conclusión:** el siguiente salto no es “más UI”, sino **más profundidad sistémica** sin comprometer integridad de datos ni anti-cheat.

---

## 2) Roadmap por fases

> Regla de compatibilidad con AGENTS.md: crafting, mercado y social son **Fase 1+**. No se implementan en MVP inmediato.

## Fase A (corto plazo) — Retención base

### Objetivo de producto

Extender el bucle de 5–10 minutos a sesiones con objetivo de 20–30 minutos, añadiendo metas claras entre runs y sinks de economía tempranos.

### Alcance concreto

- Vendors/sinks básicos (tienda de consumo y reciclaje simple).
- Contratos simples (objetivos de 1 run: “extrae X item”, “sobrevive Y min”).
- Segunda zona jugable con perfil de riesgo/recompensa distinto.
- Upgrades persistentes de cuenta (pequeños boosts controlados).
- Achievements básicos (hitos de progresión y maestría).

### Impacto técnico (DB/domain/services)

- **DB:** tablas para contratos, progreso de contratos, catálogo de vendor, upgrades desbloqueados, achievements.
- **Domain:** validadores de elegibilidad, cálculo de recompensas de contrato, límites de compra y sinks.
- **Services:** nuevos Application Services para canjear contratos, comprar mejoras, reclamar logros; transacciones con ledger/inventario.

### Riesgos de integridad / anti-cheat

- Doble claim de contrato o achievement por race condition.
- Compra concurrente que deje balance negativo si no se valida dentro de transacción.
- Explotación por reintentos de action (idempotencia insuficiente).

### Estrategia mínima de testing

- Unit tests: reglas de elegibilidad, fórmulas de recompensa y costos de upgrades.
- Integration tests: compra + ledger + inventario en una sola transacción (rollback e idempotencia).
- Action tests: ownership/auth para claim y compra.

---

## Fase B (medio plazo) — Profundidad sistémica

### Objetivo de producto

Crear decisiones de build y planificación de runs, de modo que el jugador no solo “juegue más”, sino que **juegue diferente** según estrategia.

### Alcance concreto

- Crafting inicial (recetas limitadas y controladas).
- Sistema de salvage/desmantelado (convertir ítems en materiales).
- Rarezas funcionales y efectos de equipo (bonos reales en fórmulas de run).
- Tiers ampliados de equipo (progresión más larga sin power creep descontrolado).
- Contratos avanzados encadenados (objetivos multi-run y condiciones especiales).

### Impacto técnico (DB/domain/services)

- **DB:** tablas de recetas, materiales, componentes, catálogo de rarezas/affixes y relaciones de crafting.
- **Domain:** motor de validación de recetas, reglas de salvage, aplicación de modifiers de rareza/equipo.
- **Services:** orquestación transaccional para craft/salvage/equip con actualización de inventario y ledger.

### Riesgos de integridad / anti-cheat

- Duplicación de materiales por condiciones de carrera (especialmente craft + salvage simultáneo).
- Inyección de combinaciones inválidas de modifiers si no se valida en servidor.
- Inflación económica si costos/fuentes no tienen sinks compensatorios.

### Estrategia mínima de testing

- Unit tests: resolver recetas, aplicar modifiers, límites de tiers y compatibilidad de slots.
- Integration tests: flujo completo craft/salvage con rollback ante fallo intermedio.
- Action tests multi-usuario: acceso indebido a inventario ajeno y validación de ownership.

---

## Fase C (largo plazo) — Meta-juego y comunidad

> Plan detallado obligatorio: ver `docs/phase-c-plan.md`.
> Esta sección se mantiene como resumen ejecutivo; el detalle de secuencia, data model, testing y rollout vive en el plan de Fase C.
> Plan de continuidad posterior: ver `docs/phase-d-plan.md`.

### Objetivo de producto

Subir retención de largo plazo (semanas/meses) con sistemas liveops y componentes sociales de bajo a medio acoplamiento.

### Secuencia de subfases (alineada)

- **C.1 Foundation:** telemetría económica, controles antifraude, borrador de escrow y métricas operativas.
- **C.2 Global Market beta:** listing/escrow/matching/settlement bajo feature flags y cohortes canary.
- **C.3 Monetización + LiveOps:** premium cosmético/QoL, cadencia de eventos y social ligero (opt-in).

### Secuencia explícita de ejecución (obligatoria)

`C.1 → C.2 → C.3 → D`

- **No se inicia C.2 sin validar C.1** (telemetría + antifraude + ops).
- **No se inicia C.3 sin validar C.2** (beta de mercado sin incidentes críticos).
- **No se inicia D sin cerrar C.3** y cumplir guardrails operativos/económicos.

Referencias de planning:

- C: `docs/phase-c-plan.md`
- D: `docs/phase-d-plan.md`

### Notas de alcance

- El mercado global P2P **no** se abre sin pasar por C.1 y sin validar C.2 en beta cerrada.
- Monetización en C se limita a **cosmético/QoL** y respeta política anti pay-to-win.
- Si se propone mover settlement a workers/colas, requiere ADR previo (no automático en C).

## Estado operativo actual (post D.1)

- ✅ B.3 aplicado
- ✅ C.1 foundation (telemetría/observabilidad base) aplicado en slice anterior
- ✅ D.1 profundidad de contenido aplicado en este slice
- ✅ D.2 aplicado (run modes SAFE/HARD + pass de UX/economía/workshop)
- 🟡 D.3 parcial: implementado low-churn slice (sinergias, directivas read-only, analítica jugador)
- 🔲 D.3b pendiente: runbooks operativos/incident response de economía y gobierno formal de balance

### D.3 low-churn implementado en este slice

- **Buildcraft/sinergias:** resolución de sinergias y arquetipo activos por configuración y aplicados server-side en cálculo de run con caps explícitos.
- **LiveOps read-only:** evento activo + directivas semanales derivadas de tablas existentes (sin claims persistentes por ahora).
- **Analytics jugador:** métricas agregadas de rendimiento personal y mix SAFE/HARD para lectura táctica.
- **Feature flags D3:** paneles de dashboard ocultables por flags específicas (`FEATURE_D3_*`).

### D.2 implementado en este slice

- Run modes autoritativos (`SAFE`/`HARD`) con riesgo/recompensa diferenciada.
- Catástrofe en HARD consume equipo snapshotteado en la misma transacción (slots + inventario).
- SAFE mantiene equipo en catástrofe.
- Reorganización de dashboard para contratos/upgrades/achievements más accionables en primera pantalla.
- Workshop con filtros por categoría y expansión de recetas + incremento fuerte de costos.
- Nerf global de venta en mercado con fórmula dedicada y preview UI alineado al settlement real.

### Riesgos de integridad / anti-cheat

- Riesgo alto de RMT, colusión, lavado de valor y manipulación de precios.
- Doble venta/compra por concurrencia si no existe locking y diseño idempotente fuerte.
- Impacto reputacional si hay inconsistencias de mercado (pérdida de confianza).

### Testing y rollout

- Ver matriz completa en `docs/phase-c-plan.md` (unit/integration/action/e2e + load/chaos por subfase).
- Rollout obligatorio por flags, cohorts canary y kill switch operativo.

---

## 3) Mercado global entre jugadores: cuándo sí y por qué no ahora

### Recomendación

Implementarlo **solo en Fase C**.

### Por qué no ahora

1. **Complejidad sistémica desproporcionada** para el estado actual del producto.
2. **Superficie de fraude y abuso** mucho mayor que en economía cerrada PvE.
3. Requiere madurez previa en:
   - sinks/fuentes balanceados,
   - observabilidad económica,
   - pruebas de concurrencia avanzadas,
   - tooling de moderación y trazabilidad.
4. Desviaría foco del objetivo inmediato: consolidar retención sobre el loop PvE autoritativo.

### Cuándo sí

- Cuando Fase A y B demuestren estabilidad económica (sin inflación severa) y métricas de retención saludables.
- Cuando exista infraestructura de testing y monitoreo suficiente para operar un sistema P2P sin romper integridad.

---

## 4) Backlog priorizado (Top 12)

1. **Contratos simples (daily/rotación corta)** con recompensas claras y anti-double-claim.
2. **Vendor básico con sinks reales de créditos** (consumibles/utilidad, no cosmético primero).
3. **Segunda zona** con identidad de riesgo y tabla de loot diferenciada.
4. **Upgrades persistentes de cuenta** con caps y costos escalables.
5. **Achievements básicos** conectados a run, extracción y mastery.
6. **Balance pass de economía** (fuentes vs sinks) con telemetría mínima.
7. **Crafting v1** (recetas controladas, sin combinatoria explosiva).
8. **Salvage system** para convertir excedente en materiales útiles.
9. **Rarezas funcionales + tiers ampliados** de equipo con impacto real en run.
10. **Contratos avanzados multi-run** con condiciones especiales y payout mayor.
11. **C.1 Foundation** (telemetría + antifraude + escrow draft + métricas operativas).
12. **C.2 preflight** (invariantes de mercado, pruebas de concurrencia y beta cerrada antes de apertura).

---

## 5) Criterios de avance entre fases

- **A → B:** estabilidad de economía base + mejoras de retención temprana + cero incidentes críticos de integridad.
- **B → C:** consistencia de crafting/salvage/equipo bajo carga + observabilidad de balance + tests de concurrencia maduros.
- **C.1 → C.2:** telemetría/fraude en verde + métricas operativas estables + ADRs de mercado aprobados.
- **C.2 → C.3:** beta de mercado sin incidentes críticos de integridad + KPIs de riesgo/fraude dentro de umbral.
- **C.3 → D:** LiveOps + premium en operación estable, sin degradación de fairness y con kill-switches probados.
- **D en adelante:** solo con evidencias de operación robusta y capacidad de respuesta ante abuso.

---

## 6) Notas de alineación con alcance MVP

- Este roadmap **no cambia** las restricciones del MVP actual.
- Features como crafting, social y mercado se mantienen fuera del MVP inmediato.
- La prioridad sigue siendo: correctitud del dominio + integridad de datos + UX clara.

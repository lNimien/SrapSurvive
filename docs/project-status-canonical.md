# Scrap & Survive — Estado Canónico del Proyecto

**Última actualización:** 2026-04-21  
**Owner:** Product/Design/Tech Leads  
**Fuente de verdad:** este documento prevalece ante resúmenes desactualizados en otros `.md`.

---

## Estado ejecutivo

- **Fase actual:** Post-MVP (Fase D operativa).
- **Subfases D:**
  - ✅ D.1 implementado
  - ✅ D.2 implementado
  - ✅ D.3.1 / D.3.2 / D.3.3 implementados
  - ✅ D.3b implementado
  - ✅ D.4a implementado
  - ✅ D.4b implementado

---

## Qué está estable (no tocar sin motivo fuerte)

1. Integridad económica server-authoritative (ledger append-only + transacciones).
2. Guardrails operativos (kill-switches por capacidad, contrato uniforme `FEATURE_DISABLED`).
3. Idempotencia y ownership en mutaciones sensibles.
4. Observabilidad operativa básica de claims liveops.

---

## Foco actual aprobado (E.1)

**Nombre:** Midgame Spine (retención 2–6 semanas)  
**Prioridad:** Alta

Objetivos:
1. Contratos encadenados multi-run con riesgo/recompensa real.
2. Buildcraft con trade-offs (no solo multiplicadores lineales).
3. Sinks de economía de mediano plazo (recurrente + aspiracional).
4. Claridad UX en decisión de extracción (ganancia marginal + señal de riesgo).

---

## Fuera de alcance ahora (bloqueado)

1. Mercado global P2P.
2. Monetización con impacto directo en poder.
3. Sistemas sociales de alta complejidad (guild/chat en tiempo real).
4. Escalado de niveles sin contenido intermedio funcional.

---

## Política de actualización

- Si cambia el estado de una fase/subfase, actualizar este archivo en el mismo PR.
- Si otro documento contradice este estado, tratarlo como desactualizado y corregirlo.
- No iniciar un nuevo bloque sin declarar explícitamente estado + objetivo + criterio de done aquí.

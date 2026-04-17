# Scrap & Survive — Balance v0

> **Status:** Balance inicial del MVP. Diseñado para ser implementado, probado e iterado.
> **Versión:** 0.1 — Primera build jugable.
> **Autoridad:** Los valores aquí son el punto de partida. Nada es sacred. Todo es ajustable.
> **Referencia:** Extiende `docs/content-seed.md` y `docs/mvp-spec.md`.

---

## 1. Filosofía de balance para v0

### El objetivo no es equilibrio perfecto. Es primera sensación correcta.

Un balance v0 tiene una misión: hacer que el loop se sienta real y con intención. No hace falta que sea óptimo, matemáticamente riguroso ni sorprendentemente original. Necesita cumplir tres condiciones:

1. **Que el jugador sienta que el tiempo en la zona vale la pena** — cada minuto adicional debe notarse en el loot.
2. **Que la catástrofe se sienta justa** — el jugador que llega a catástrofe en las primeras runs debe pensar "debería haber salido antes" y no "el juego me trampó".
3. **Que la progresión se sienta imparable** — cada run, aunque sea fallida, debe dejar algo tangible. El jugador nunca termina una run con exactamente el mismo estado que empezó.

### Principios operativos de v0

- **Errar del lado de la generosidad.** Es mucho más fácil reducir recompensas que convencer a un jugador frustrado de que vuelva. En v0, si hay duda, el balance favorece al jugador.
- **Los números deben ser legibles.** Créditos en rango 100–500 por run, XP en rango 500–2.000, materiales en decenas. Cualquier valor que requiera notación científica está mal.
- **El peligro debe sentirse inevitable, no hostil.** La curva de peligro existe para crear tensión, no para castigar. El jugador siempre debe tener tiempo de reaccionar.
- **Subir de nivel es frecuente al principio.** Los primeros 5 niveles deben llegar rápido — dan sensación de progresión y anclan al jugador. Los niveles 6–10 pueden necesitar más esfuerzo.
- **El balance de drops es más liberal que el balance de economía.** En MVP no hay sinks. Los materiales pueden acumularse sin consecuencia. El balance de drops no necesita ser restrictivo — el jugador que tiene más materiales no tiene ventaja injusta porque no puede gastarlos todavía.

---

## 2. Objetivos de sensación del balance

### Primeras runs (Run 1–3)

| Momento | Sensación objetivo |
|---------|-------------------|
| Durante la run | "El loot está subiendo. El peligro todavía está bajo. Puedo quedarme un poco más." |
| Al extraer | "Conseguí más de lo que esperaba. Quiero saber si hay más si espero más tiempo." |
| Si hay catástrofe | "Debería haber salido antes. Pero tampoco perdí todo. ¿Cuánto más tendría si hubiera extraído a tiempo?" |
| Entre runs | "Tengo materiales. Una pieza de equipo. Necesito otra run." |

**Métrica clave de primeras runs:** el jugador que termina 3 runs debe tener, como mínimo, 1 slot de equipo cubierto con algo que no sea el casco inicial. Si no — el ritmo de drops está roto.

---

### Primera hora (Run 1–8 aprox.)

| Momento | Sensación objetivo |
|---------|-------------------|
| Justo después de la run 5 | "Ya entiendo cuándo extraer. Mi equipo mejoró un poco." |
| Al llegar al nivel 3 | "El chatarrero mejoró. Las runs dan más loot que al principio." |
| Al ver el historial | "Varias runs exitosas, una o dos catástrofes. Las fallidas me enseñaron algo." |
| Al ver el inventario | "Tengo materiales apilados. Algunos son de un color diferente — raros." |

**Métrica de primera hora:** ≥ 3 slots de equipo cubiertos, nivel 3–4 alcanzado, al menos 1 material RARE en inventario.

---

### Primeras 10 runs

| Momento | Sensación objetivo |
|---------|-------------------|
| Después de la run 10 | "Soy notablemente mejor que en la run 1. Las runs duran más. El peligro llega más tarde." |
| Al comparar inventario inicial vs actual | "El inventario era casi vacío. Ahora hay stacks de todo." |
| Sensación de maestría incipiente | "Empiezo a leer la curva de peligro. Sé cuándo es verde, cuándo es amarillo, cuándo me tengo que ir." |
| Ganas de continuar | "Necesito una zona más difícil." (gancho para Fase 1) |

**Métrica de 10 runs:** nivel 4–5, equipo en 4+ slots, 1 material EPIC visto (aunque no obtenido), primera extracción con peligro > 80%.

---

## 3. Duración objetivo de una run

### Zona: `shipyard_cemetery`

| Tipo de run | Duración | Peligro al extraer | Descripción |
|-------------|----------|--------------------|-------------|
| **Mínima razonable** | 2–3 min | ~10–20% | Extracción preventiva. Poca tensión. Loot modesto pero seguro. Válida para jugadores cautelosos o test rápido del loop. |
| **Óptima** | 4–6 min | 40–65% | El sweet spot de v0. Buen loot, bonus de peligro notable, sin catástrofe. El jugador que aprende a quedarse aquí maximiza el loop sin arriesgarse. |
| **Arriesgada** | 6–8 min | 65–85% | Loot excelente. El jugador está en zona amarilla. La catástrofe está visible pero no inminente. Alto potencial de drops raros. |
| **Casi suicida** | > 8 min | > 85% | Loot máximo con bonus enorme. La barra de peligro está en rojo. Un error de timing (o un pico) puede causar catástrofe. Solo para jugadores expertos. |

### Calibración de la curva de peligro v0 para estos tiempos

La fórmula cuadrática base produce los siguientes niveles de peligro sin picos:

```
dangerLevel(t) = baseRate + quadraticFactor × t²
              = 0.04 + 0.0000018 × t²
  donde t está en segundos
```

| Tiempo | Peligro calculado (sin picos) | Zona de color |
|--------|--------------------------|---------------|
| 1 min (60s) | 0.04 + 0.0065 ≈ **0.047** (~5%) | Verde |
| 2 min (120s) | 0.04 + 0.026 ≈ **0.066** (~7%) | Verde |
| 3 min (180s) | 0.04 + 0.058 ≈ **0.098** (~10%) | Verde |
| 4 min (240s) | 0.04 + 0.104 ≈ **0.144** (~14%) | Verde |
| 5 min (300s) | 0.04 + 0.162 ≈ **0.202** (~20%) | Verde tirando a amarillo |
| 6 min (360s) | 0.04 + 0.233 ≈ **0.273** (~27%) | Amarillo |
| 7 min (420s) | 0.04 + 0.317 ≈ **0.357** (~36%) | Amarillo |
| 8 min (480s) | 0.04 + 0.415 ≈ **0.455** (~46%) | Amarillo |
| 10 min (600s) | 0.04 + 0.648 ≈ **0.688** (~69%) | Naranja/Rojo |
| 12 min (720s) | 0.04 + 0.933 ≈ **0.973** (~97%) | Rojo — ¡peligro crítico! |
| ~12.5 min | ≈ **0.90** umbral | Catástrofe si no extrae |

> **Problema identificado:** Con `quadraticFactor = 0.0000018`, la curva base llega al umbral de catástrofe (~12 minutos) demasiado lentamente. Las sensaciones de tensión no llegan hasta el minuto 10. Esto hace que los primeros 7–8 minutos sean demasiado "relajados".

### Corrección v0: ajuste del `quadraticFactor`

Para que la tensión empiece a ser visible a los 5 minutos y la catástrofe ocurra entre 8–10 minutos sin picos, se ajusta el factor:

```
quadraticFactor_v0 = 0.0000085
```

Tabla recalculada:

| Tiempo | Peligro v0 (sin picos) | Zona de color |
|--------|------------------------|---------------|
| 2 min (120s) | 0.04 + 0.122 ≈ **0.162** (~16%) | Verde |
| 3 min (180s) | 0.04 + 0.275 ≈ **0.315** (~32%) | Amarillo |
| 4 min (240s) | 0.04 + 0.490 ≈ **0.530** (~53%) | Amarillo oscuro |
| 5 min (300s) | 0.04 + 0.765 ≈ **0.805** (~81%) | Naranja/Rojo |
| 5.5 min (330s) | 0.04 + 0.926 ≈ **0.966** (~97%) | Rojo crítico |
| ~5.2 min | ≈ **0.90** umbral | Catástrofe |

**Demasiado rápido.** Con este factor el jugador tiene solo 5 minutos antes de catástrofe. Es correcto para sensación de tensión pero demasiado para exploración inicial.

### Factor definitivo para v0: equilibrio tensión / tiempo

```
quadraticFactor_v0 = 0.000004
```

| Tiempo | Peligro v0 | Color |
|--------|------------|-------|
| 1 min (60s) | ~0.054 (5%) | Verde |
| 2 min (120s) | ~0.098 (10%) | Verde |
| 3 min (180s) | ~0.169 (17%) | Verde |
| 4 min (240s) | ~0.270 (27%) | Amarillo |
| 5 min (300s) | ~0.400 (40%) | Amarillo |
| 6 min (360s) | ~0.554 (55%) | Amarillo oscuro |
| 7 min (420s) | ~0.741 (74%) | Naranja |
| 8 min (480s) | ~0.962 (96%) | Rojo — zona crítica |
| ~7.8 min | ≈ **0.90** umbral | **Catástrofe sin picos** |

Este factor produce:
- **Minutos 1–3:** tensión baja — el jugador aprende el loop sin presión.
- **Minutos 4–6:** tensión media — empieza a mirar la barra. Momento de decisión real.
- **Minutos 6–7:** tensión alta — el jugador con poco equipo debería estar pensando en salir.
- **Minuto 7.8+:** zona de catástrofe sin picos. Con picos puede ocurrir antes.

**`quadraticFactor_v0 = 0.000004`** es el valor oficial para la primera implementación.

---

## 4. Curva de peligro v0

### Comportamiento esperado

La curva de peligro tiene tres tramos claramente diferenciados que el jugador debe poder leer visualmente:

**Tramo 1 — Zona Verde (0–35% peligro, 0–5 min):**
Crecimiento lento. El chatarrero "está bien". El jugador puede observar sin ansiedad. Es el momento de ver crecer el loot y decidir si quiere arriesgarse más.

**Tramo 2 — Zona Amarilla (35–75% peligro, 5–7 min):**
La barra cambia de color de forma notable. El texto de estado cambia. El jugador siente que el contador ha comenzado. La mayoría de las extracciones exitosas competentes deben ocurrir en este tramo.

**Tramo 3 — Zona Roja (75–90% peligro, 7–7.8 min):**
Rojo. La barra pulsa. El texto es de emergencia. El jugador que llega aquí deliberadamente es el que busca el máximo loot posible. El jugador que llega aquí por descuido está a punto de perder.

**Zona de Catástrofe (>90% peligro):**
La catástrofe ya ocurrió. La DB lo marcará al siguiente ciclo de evaluación. El jugador puede extraer y recuperar el 20%.

### Cómo se siente

- Los primeros 3 minutos se sienten como "explorando". La barra se mueve lentamente.
- Entre los minutos 4 y 6, el jugador empieza a planear su salida.
- A los 7 minutos, el jugador que no ha extraído está siendo activamente presionado por la UI.
- A los 8 minutos, si el jugador no ha extraído: catástrofe. No hay ambigüedad.

### Cuándo entra la tensión

La tensión emocional real empieza cuando la barra llega al **50%** (~5.5 minutos). Ese es el punto donde el jugador pasa de "tengo tiempo" a "debería pensar en salir". La UI debe reflejar esto con el cambio de color amarillo a naranja en ese rango.

### Picos de peligro

Cada tick de evaluación (cada 5 segundos, en el polling) hay un `spikeChance = 0.02` (2%). Si el pico ocurre, añade `spikeMagnitude ≤ 0.05` al peligro actual.

**Impacto real de los picos:**
- Un pico en el minuto 7 (peligro ~74%) puede subir a 79% — el jugador sigue teniendo margen.
- Un pico en el minuto 7.5 (peligro ~87%) puede subir a 92% — **catástrofe inmediata**.
- En promedio, un pico ocurre cada ~2.5 minutos (con polling de 5s: 24 ticks/2min, 2% c/u → 1 pico cada 3.5 min aprox.).

**Decisión de v0:** los picos son deterministas por semilla de run (no aleatorios por recargar). El jugador que carga la página no puede "rerollear" los picos — si ocurrieron, ocurrieron. Esto es crítico para la integridad del sistema.

### Cuándo debería ocurrir normalmente la catástrofe

| Perfil de jugador | Runs típicas con catástrofe |
|------------------|----------------------------|
| Jugador nuevo (run 1–3) | 60–70% de las runs — está aprendiendo el timing |
| Jugador intermedio (run 4–8) | 20–30% — empieza a controlar el timing |
| Jugador competente (run 8+) | < 10% — extrae consistentemente en zona amarilla |

**Objetivo:** un jugador que has aprendido el loop debe poder hacer 10 runs seguidas sin catástrofe si lo decide. La catástrofe no es un evento inevitable para un jugador habilidoso — es la consecuencia de esperar demasiado.

---

## 5. Curva de loot v0

### Crecimiento base (materiales por segundo)

Los valores base del `content-seed.md` son los definitivos para v0:

| Material | Unidades/seg base | Unidades en run de 5 min | Unidades en run de 7 min |
|----------|------------------|--------------------------|--------------------------|
| Chatarra Metálica | 0.50 | 150 | 210 |
| Célula de Energía | 0.15 | 45 | 63 |
| Componente Reciclado | 0.08 | 24 | 34 |
| Cristal Corrupto | 0.02 | 6 | 8 |

Estos son **valores pre-multiplicadores**. El loot real es el resultado de aplicar todos los modificadores.

### Fórmula completa de loot por material

```
cantidad_final = floor(
  (baseLootPerSecond[material] × elapsedSeconds)
  × dangerBonus
  × lootMultiplier
  × backpackCapacity
)

donde:
  dangerBonus    = 1.0 + (0.80 × dangerLevel)
  lootMultiplier = 1.0 + sum(item.lootMultiplier para items equipados)
  backpackCapacity = 1.0 + sum(item.backpackCapacity para items equipados)
```

### Bonus por peligro — tabla de referencia v0

| Nivel de peligro | `dangerBonus` | Multiplicador efectivo |
|-----------------|--------------|----------------------|
| 10% | ×1.08 | +8% |
| 25% | ×1.20 | +20% |
| 40% | ×1.32 | +32% |
| 60% | ×1.48 | +48% |
| 75% | ×1.60 | +60% |
| 85% | ×1.68 | +68% |
| 90% (catástrofe) | ×1.72 | +72% |

### Impacto del equipo sobre el loot

| Configuración de equipo | `lootMultiplier` | `backpackCapacity` | Multiplicador total de materiales |
|------------------------|------------------|--------------------|----------------------------------|
| Sin equipo (solo casco básico) | 1.0 | 1.0 | **×1.00** |
| Guantes equipados | 1.05 | 1.0 | **×1.05** |
| Guantes + Cortador Térmico | 1.20 | 1.0 | **×1.20** |
| Mochila Ampliada (solo) | 1.0 | 1.30 | **×1.30** |
| Guantes + Cortador + Mochila | 1.20 | 1.30 | **×1.56** |

**Ejemplo de run de 6 minutos con equipo completo UNCOMMON (peligro 54%):**
```
Chatarra Metálica:
  floor(0.50 × 360 × 1.432 × 1.20 × 1.30)
  = floor(0.50 × 360 × 2.244)
  = floor(404) = 404 unidades

Célula de Energía:
  floor(0.15 × 360 × 2.244)
  = floor(121) = 121 unidades

Componente Reciclado:
  floor(0.08 × 360 × 2.244)
  = floor(65) = 65 unidades

Cristal Corrupto:
  floor(0.02 × 360 × 2.244)
  = floor(16) = 16 unidades
```

Estos números son sensatos: no son demasiado pequeños para parecer míseros, ni demasiado grandes para inflar el inventario de forma absurda en pocas runs.

### Loot de catástrofe (20%)

| Material | Run de 7 min (peligro ~74%) | Catástrofe: 20% |
|----------|----------------------------|-----------------|
| Chatarra Metálica | ~370 | **74** |
| Célula de Energía | ~111 | **22** |
| Componente Reciclado | ~59 | **12** |
| Cristal Corrupto | ~15 | **3** |

El loot de catástrofe es suficiente para no sentirse vacío. El jugador obtiene algo visible, no 1–2 unidades insignificantes. Esto es importante: el 20% de un run largo todavía vale la pena extraer.

---

## 6. Recompensa de créditos v0

### Fórmula de créditos por extracción exitosa

```
credits = floor(
  (baseCurrencyPerMinute × elapsedMinutes)
  × dangerBonus
  × lootMultiplier
)

donde:
  baseCurrencyPerMinute = 45 CC
  dangerBonus y lootMultiplier = mismos que para materiales
```

### Tabla de referencia de créditos por tipo de run (sin equipo extra)

| Tipo de run | Duración | Peligro | Créditos (sin equipo) | Créditos (equipo UNCOMMON completo) |
|-------------|----------|---------|-----------------------|-------------------------------------|
| Mínima (2 min) | 120s | ~10% | ~99 CC | ~119 CC |
| Prudente (3.5 min) | 210s | ~24% | ~195 CC | ~234 CC |
| Óptima (5 min) | 300s | ~40% | ~315 CC | ~378 CC |
| Arriesgada (7 min) | 420s | ~74% | ~548 CC | ~658 CC |
| Casi suicida (7.8 min antes de catástrofe) | 468s | ~89% | ~636 CC | ~763 CC |

**Por extracción exitosa óptima:** ~315–378 CC. Un jugador nuevo sin equipo puede esperar ~315 CC por run bien ejecutada.

**Por extracción arriesgada:** ~548–658 CC. El riesgo adicional de 2 minutos ofrece un 74% más de créditos respecto a la run óptima. Es matemáticamente atractivo.

**Por extracción con catástrofe:** 0 CC. Sin excepción. La catástrofe no da créditos.

### Sensación de los créditos en v0

En v0 los créditos no se gastan — solo se acumulan. Esto significa que el balance de créditos puede ser relativamente generoso sin consecuencias económicas negativas. El objetivo de los créditos en MVP es:
- Ser un marcador de progreso visible
- Recompensar al jugador que extrae sin catástrofe frente al que falla
- Preparar la economía para los vendors de Fase 1

**Target:** un jugador que completa 10 runs exitosas de duración óptima debería tener entre **2.500–4.000 CC** acumulados. Esto representa un "saldo" que se sentirá significativo cuando lleguen los vendors.

---

## 7. Recompensa de XP v0

### Fórmula de XP por run

```
xpBase = xpPerSecond × elapsedSeconds × dangerBonus

donde:
  xpPerSecond = 3.5 XP/s
  dangerBonus = 1.0 + (0.80 × dangerLevel)
```

**Nota sobre `levelPenalty`:** en MVP el `levelPenalty` no se implementa para simplificar. La zona inicial da XP plena en todos los niveles 1–10. Esta penalización se añade en Fase 1 cuando haya más zonas.

#### Run exitosa — tabla de referencia XP

| Run | Duración | Peligro | XP ganada |
|-----|----------|---------|-----------|
| Mínima (2 min) | 120s | ~10% | 454 XP |
| Prudente (3.5 min) | 210s | ~24% | 908 XP |
| Óptima (5 min) | 300s | ~40% | 1.470 XP |
| Arriesgada (7 min) | 420s | ~74% | 2.564 XP |
| Casi suicida (~7.8 min) | 468s | ~89% | 3.097 XP |

#### Run fallida (catástrofe) — XP al 25%

| Run | XP base | XP con catástrofe (25%) |
|-----|---------|------------------------|
| 5 min (peligro ~40%) | 1.470 | **368 XP** |
| 7 min (peligro ~74%) | 2.564 | **641 XP** |

Incluso en una catástrofe el jugador recibe XP suficiente para sentir que progresa. Una run fallida de 7 minutos da 641 XP — suficiente para contribuir al siguiente nivel de forma notable.

---

## 8. Curva de nivelación v0

### Filosofía de la curva

- Niveles 1–3: rápidos. El jugador sube de nivel en 2–3 runs. Establece el ritmo de progresión.
- Niveles 4–6: moderados. 4–6 runs por nivel. El loop está aprendido y la progresión sigue siendo visible.
- Niveles 7–10: más lentos. 6–10 runs por nivel. La zona empieza a sentirse dominada.

### XP necesaria por nivel (curva suave cuadrática)

```
xpRequired(level) = 1.500 × level^1.6
```

| Nivel | XP para subir | XP acumulada | Runs óptimas para subir (1.470 XP c/u) |
|-------|--------------|--------------|----------------------------------------|
| 1 → 2 | 1.500 | 1.500 | ~1.0 |
| 2 → 3 | 2.857 | 4.357 | ~1.9 |
| 3 → 4 | 4.547 | 8.904 | ~3.1 |
| 4 → 5 | 6.530 | 15.434 | ~4.4 |
| 5 → 6 | 8.773 | 24.207 | ~6.0 |
| 6 → 7 | 11.250 | 35.457 | ~7.7 |
| 7 → 8 | 13.940 | 49.397 | ~9.5 |
| 8 → 9 | 16.826 | 66.223 | ~11.4 |
| 9 → 10 | 19.896 | 86.119 | ~13.5 |

**Total estimado para llegar al nivel 10:** ~62 runs de duración óptima. A 5 minutos de promedio por run, son ~310 minutos de juego (5+ horas). Para un idle game sin sinks, es un contenido adecuado de Fase 0.

### Sensación por nivel

| Nivel | Sensación objetivo |
|-------|-------------------|
| 1–2 | "Este juego da cosas rápido. Quiero ver qué más hay." |
| 2–3 | "Subí de nivel dos veces en mi primera hora. El personaje mejora." |
| 3–5 | "Tengo equipo nuevo. Las runs duran más. Consigo más materiales." |
| 5–7 | "Estoy dominando esta zona. Las catástrofes ya no me pasan." |
| 7–10 | "Necesito más desafío. Esta zona ya es demasiado fácil." → gancho Fase 1 |

### Bonus de nivel (stats del chatarrero)

Los niveles del chatarrero mejoran sus stats base. En v0 los bonus por nivel son simples y lineales:

| Por nivel adicional | Bonus |
|--------------------|-------|
| `lootMultiplier` base | +2% por nivel (nivel 5 = +10% base) |
| `dangerResistance` base | +1% por nivel (nivel 5 = +5% base) |

**A nivel 10:** `lootMultiplier` base = +20%, `dangerResistance` base = +10%. Combinado con equipo UNCOMMON completo: lootMultiplier total ×1.40, dangerResistance 30%.

Estos bonus son aplicados en el `RunCalculator` como parte del `equipmentSnapshot` — los stats del personaje se snapshottean al iniciar la run junto con el equipo.

---

## 9. Ritmo de drops v0

### Primeras 3 runs — qué debe caer

El sistema de drops de equipo está basado en tiradas al final de la extracción (ver `content-seed.md` sección 8). Para las primeras runs:

| Run | Duración esperada (jugador nuevo) | Tiradas de equipo | Probabilidad de drop UNCOMMON |
|-----|----------------------------------|-------------------|-----------------------------|
| Run 1 | 3–5 min (puede haber catástrofe) | 1–2 | ~40% (si 2 tiradas) |
| Run 2 | 4–6 min (jugador aprende timing) | 1–2 | ~40% |
| Run 3 | 5–7 min (más cómodo) | 2 | ~55% |

**Target de drop:** el primer item UNCOMMON debe caer antes de terminar la run 3 en el 90% de los casos.

Para garantizarlo sin romper el sistema aleatorio: si el jugador llega a la run 3 sin ningún drop UNCOMMON, la run 3 tiene **garantía de al menos 1 drop UNCOMMON** (implementado como floor en el generador de drops, con lógica de "primer drop garantizado" en `RunResolutionService`).

> **Nota al implementador:** esta garantía no es aleatoria — es una regla explícita: `if (user.totalRuns >= 2 && user.uncommonDropCount === 0) { forceUncommonDrop() }`. El contador de drops se guarda en `UserProgression`.

---

### Primeras 10 runs — progresión de slots cubiertos

El jugador debería cubrir slots progresivamente. El ritmo esperado con el sistema de drops actual:

| Después de la run... | Slots cubiertos esperados (promedio) |
|----------------------|--------------------------------------|
| Run 2 | 1 extra (BODY o HANDS) |
| Run 4 | 2 extras (BODY + HANDS) |
| Run 6 | 3 extras (BODY + HANDS + HEAD upgrade o TOOL) |
| Run 8 | 4 extras (todos los principales: HEAD, BODY, HANDS, TOOL o BACKPACK) |
| Run 10 | 4–5 slots cubiertos con UNCOMMON |

**Meta de la run 10:** el jugador debería tener equipo UNCOMMON en al menos 3 de los 5 slots activos. Si no — el ritmo de drops está siendo demasiado conservador y hay que bajar los pesos de rareza relativa de UNCOMMON.

---

### Cuándo cae el primer upgrade real

Un "upgrade real" se define como un item UNCOMMON que el jugador puede equipar y que mejora perceptiblemente una run.

**Target:** cae en la run 2 o 3 en el 90% de las partidas.

El primer upgrade más probable por probabilidad ponderada:
1. Traje de Extracción Estándar (COMMON, peso 40) — no es un "upgrade real" pero llena slots.
2. Guantes de Trabajo Industrial (COMMON, peso 35) — da +5% loot, el jugador lo percibe.
3. Casco de Exploración Reforzado (UNCOMMON, peso 15) — **primer upgrade real** de dangerResistance.

El Casco Reforzado tiene peso 15 sobre ~118 total de pesos → ~12.7% por tirada. Con 2 tiradas en run 2 → ~24% de que caiga. La garantía de run 3 asegura que ocurra si no ha caído antes.

---

## 10. Recuperación por catástrofe v0

### Valores concretos

| Recurso | Recuperación | Razonamiento |
|---------|-------------|--------------|
| Materiales acumulados | 20% (redondeado abajo) | Suficiente para que el jugador no sienta que perdió todo. No tanto que la catástrofe sea irrelevante. |
| Créditos de la run | 0 CC | Penalización económica clara. La catástrofe tiene un costo tangible. |
| XP de la run | 25% | El jugador siempre progresa, aunque más lento. La catástrofe no bloquea el avance. |
| Items de equipo dropped en la run | 0 | Las tiradas de equipo no se hacen en runs fallidas. El loot de equipo es un privilegio de extracciones exitosas. |
| Inventario previo a la run | 100% — intacto | Invariante. Nunca se toca. |
| Equipo equipado | 100% — intacto | Invariante. El equipo nunca se daña. |
| Balance CC previo | 100% — intacto | La catástrofe solo afecta lo ganado en ESA run. |
| Nivel y XP acumulados | 100% — intactos | No hay regresión de nivel. |

### La sensación de catástrofe debe ser: "perdí esta run, no el progreso total"

El jugador que sufre su primera catástrofe debe pensar:
- "Perdí la mayor parte del loot de esta run." ✓
- "Pero mis items anteriores están. Mi nivel está. Mi balance anterior está." ✓
- "Si hubiera extraído 2 minutos antes, habría ganado X más." ✓
- "La próxima vez voy a estar más atento al color de la barra." ✓

El jugador no debe pensar:
- "El juego me robó todo lo que tenía."
- "Tengo que empezar de cero."
- "No vale la pena intentarlo."

---

## 11. Targets concretos de sesión

### Sesión de 5 minutos (1 run breve)

**Situación:** El jugador tiene poco tiempo, lanza una run, extrae pronto.

| Qué consigue | Cantidad esperada |
|-------------|------------------|
| Chatarra Metálica | 80–120 |
| Célula de Energía | 25–35 |
| Componente Reciclado | 13–18 |
| Cristal Corrupto | 3–5 |
| Créditos CC | 100–200 |
| XP | 450–750 |
| Item de equipo | 40–60% de probabilidad (1 tirada) |

**Sensación objetivo:** "En 5 minutos conseguí materiales y quizá un item. Vale la pena volver."

---

### Sesión de 15 minutos (2–3 runs)

**Situación:** El jugador prueba el timing, tal vez tiene 1 catástrofe.

| Qué consigue | Cantidad acumulada |
|-------------|-------------------|
| Chatarra Metálica | 250–500 |
| Célula de Energía | 75–150 |
| Componente Reciclado | 40–80 |
| Cristal Corrupto | 8–18 |
| Créditos CC | 300–600 |
| XP | 1.500–3.000 (posiblemente nivel 2) |
| Items de equipo | 1–3 items, al menos 1 UNCOMMON |

**Sensación objetivo:** "Mejoré mi equipo. Entiendo mejor el timing. Quiero probar una run más larga."

---

### Sesión de 30 minutos (4–6 runs)

**Situación:** El jugador ya controla el loop básico. Puede estar empezando a optimizar.

| Qué consigue | Cantidad acumulada |
|-------------|-------------------|
| Chatarra Metálica | 800–1.500 |
| Célula de Energía | 250–450 |
| Componente Reciclado | 130–240 |
| Cristal Corrupto | 30–60 |
| Materiales RARE | 2–5 drops (Núcleo Propulsor u otros) |
| Créditos CC | 800–2.000 |
| XP | 4.000–8.000 (nivel 3–4) |
| Items de equipo | 3–6 items, 2–4 UNCOMMON equipados |

**Sensación objetivo:** "Mi chatarrero claramente mejoró. Las runs me dan más loot que al principio. Quiero ver hasta dónde llego en nivel."

---

## 12. Tabla de métricas objetivo para validar el balance

Estas son las métricas que deben medirse durante el playtesting de la primera build para confirmar que el balance es correcto. Si alguna métrica está fuera de rango, revisar la sección de señales de balance roto.

| Métrica | Target v0 | Rango aceptable | Cómo medir |
|---------|-----------|-----------------|------------|
| **Tasa de éxito por run** | 60–70% en runs 1–3, 80–90% en run 8+ | No < 40% en avg total, no > 95% en avg total | `ExtractionResult.status` |
| **Duración media de run exitosa** | 4.5–6 min | 3–8 min | `resolvedAt - startedAt` para `EXTRACTED` |
| **Catástrofes por 10 runs** | 2–4 (jugador nuevo), 0–1 (jugador exp.) | No > 6, no < 0 | Count de `status: FAILED` |
| **Créditos medios por run (cualquier resultado)** | 250–350 CC | 100–600 CC | Media de `ExtractionResult.creditsEarned` |
| **XP media por run (cualquier resultado)** | 900–1.400 XP | 400–2.500 XP | Media de `ExtractionResult.xpEarned` |
| **Runs para llegar a nivel 3** | 4–6 runs | 2–10 | `UserProgression.level` vs runs totales |
| **Runs para primer drop UNCOMMON** | ≤ 3 runs | ≤ 5 | Primer `ExtractionResult` con equipo UNCOMMON |
| **Peligro medio al extraer (exitosas)** | 40–65% | 20–80% | Media de `ExtractionResult.dangerLevelAtClose` para EXTRACTED |
| **Peligro medio en catástrofes** | > 85% | > 80% | Media de `dangerLevelAtClose` para FAILED |
| **Duración media de sesión** | 15–20 min | 8–45 min | Tiempo entre primer `startRun` y último evento por sesión |

---

## 13. Señales de que el balance está roto

### El balance es demasiado fácil si...

- La tasa de éxito de nuevos jugadores supera el 85% en sus 3 primeras runs. (El jugador nuevo debería cometer errores de timing.)
- El jugador nunca se preocupa por la barra de peligro porque "siempre tiene tiempo de sobra".
- El peligro no llega al 50% hasta el minuto 8 o más. (La tensión no empieza a tiempo.)
- El jugador puede extraer en el minuto 10 sin catástrofe de forma consistente. (La zona no tiene presión.)

**Corrección:** aumentar `quadraticFactor` o reducir `catastropheThreshold` a 0.85.

---

### El balance es demasiado cruel si...

- Los jugadores nuevos pierden más del 80% de sus primeras 5 runs. (La curva de aprendizaje es demasiado brutal.)
- El jugador siente que la catástrofe "le sorprendió" sin advertencia visual. (El tiempo de reacción es insuficiente.)
- El minuto 4 ya está en zona roja. (No hay tiempo de aprender.)
- Los créditos por run fallida son tan bajos que el jugador siente que "no valió la pena intentarlo".

**Corrección:** reducir `quadraticFactor`, aumentar el porcentaje de recuperación de catástrofe a 30%, o aumentar el margen de gracia visual (mostrar animación de emergencia antes del umbral real).

---

### El balance es demasiado lento si...

- El jugador lleva 5 runs sin haber subido de nivel. (La curva de XP es demasiado alta.)
- Los drops de equipo tardan más de 5 runs en aparecer. (El sistema de drops es demasiado conservador.)
- El jugador lleva 30 minutos de juego y su équipo es el mismo que al inicio. (No hay progresión de equipo.)

**Corrección:** reducir el `xpRequired` de los primeros 3 niveles en un 30%, o aumentar los pesos de equipo COMMON en la loot table.

---

### El balance es demasiado generoso si...

- El jugador llega al nivel 10 en menos de 30 runs. (La progresión termina demasiado rápido.)
- El inventario está lleno de stacks enormes de materiales RARE en las primeras 5 runs. (Los raros no son raros.)
- El loot de una run de 2 minutos ya da 1.000+ unidades de chatarra. (Las cantidades son absurdas.)
- El jugador tiene todos los slots de equipo UNCOMMON cubiertos antes de la run 5. (El equipo no da sensación de logro.)

**Corrección:** reducir las probabilidades de drops RARE a la mitad, o reducir `baseLootPerSecond` en 20%.

---

## 14. Parámetros que deben vivir en config y no hardcoded

Todos estos valores deben estar en `config/game.config.ts` y en ningún otro lugar. Cambiar el balance nunca debe requerir tocar `run.calculator.ts` ni lógica de negocio.

### En `ZONE_CONFIG['shipyard_cemetery']`:
- `baseRate` (v0: 0.04)
- `quadraticFactor` (v0: **0.000004**)
- `catastropheThreshold` (v0: 0.90)
- `spikeChance` (v0: 0.02)
- `spikeMagnitude` (v0: 0.05)
- `dangerLootBonus` (v0: 0.80)
- `baseLootPerSecond` (objeto por material)
- `baseCurrencyPerMinute` (v0: 45)
- `baseXpPerSecond` (v0: 3.5)
- `equipDropTiersEnabled` (objeto con rates por rareza)

### En `PROGRESSION_CONFIG`:
- `xpCurveBase` (v0: 1.500)
- `xpCurveExponent` (v0: 1.6)
- `levelLootMultiplierPerLevel` (v0: 0.02)
- `levelDangerResistancePerLevel` (v0: 0.01)
- `maxLevel` (v0: 10)

### En `ECONOMY_CONFIG`:
- `catastropheLootPenalty` (v0: 0.20 — el jugador conserva el 20%)
- `catastropheXpPenalty` (v0: 0.25 — el jugador gana el 25% del XP base)
- `catastropheCurrencyMultiplier` (v0: 0 — 0 créditos en catástrofe)

### En `LOOT_TABLE_CONFIG['shipyard_cemetery']`:
- Pesos de cada item de equipo
- Probabilidades de drops raros por duracion
- Umbral de run mínima para tiradas de equipo (v0: 120 segundos)
- Número de tiradas por rango de duración

### En `ONBOARDING_CONFIG`:
- `firstUncommonDropGuaranteeAfterRuns` (v0: 2 — garantía activa desde la tercera run)

---

## 15. Qué partes del balance son deliberadamente provisionales

Las siguientes decisiones son correctas para v0 pero **se esperan como las primeras en cambiar** tras el playtesting inicial.

| Parte del balance | Por qué es provisional | Qué cambiará |
|------------------|----------------------|--------------|
| `quadraticFactor = 0.000004` | Derivado de cálculos teóricos, no de playtesting real | Se ajustará en ±20% según el feedback de timing de los primeros jugadores |
| `catastropheLootPenalty = 20%` | ¿Es suficiente penalización o demasiado permisiva? Pregunta abierta. | Puede bajar a 15% si los jugadores sienten que la catástrofe "no importa", o subir a 25% si las catástrofes siguen siendo muy frecuentes |
| `baseLootPerSecond` (todos) | Calibrados para números legibles, no para economía balanceada (no hay sinks) | Se revisarán cuando lleguen los vendors de Fase 1 con sinks reales |
| `baseCurrencyPerMinute = 45` | Arbitrario pero legible. Sin referencia de cuánto costará equipo en Fase 1 | Se reescalará cuando se definan los precios de vendors |
| `xpCurveBase = 1.500 × level^1.6` | Curva suave razonable. No playtested. | Se ajustará según cuántas runs tarda el jugador típico en cada nivel |
| `firstUncommonDropGuaranteeAfterRuns = 2` | Garantiza el primer drop sin ser demasiado restrictivo | Puede eliminarse si el sistema natural de drops resulta suficientemente generoso |
| `spikeChance = 0.02` | Picos poco frecuentes por diseño. ¿Suficientes para crear imprevisibilidad? | Puede aumentar a 0.03–0.04 si el juego se siente predecible |
| Bonus de nivel (+2% loot, +1% dangerResistance por nivel) | Valores mínimos para que los niveles se sientan. Pueden ser muy pequeños. | Se revisarán si el jugador de nivel 8 no nota diferencia frente al de nivel 1 |
| Número de tiradas de equipo por duración de run | 0/1/2/3 es una escala lineal. Puede ser demasiado poca varianza. | Se revisará si el jugador siente que los drops de equipo son demasiado predecibles |

### Señales que indicarán que una iteración de balance es necesaria

1. **Más del 50% de los jugadores nuevos se van después de 3 runs:** el balance o la sensación de progresión no funcionan.
2. **Los jugadores reportan que "la catástrofe es injusta":** la curva de peligro o las advertencias visuales son deficientes.
3. **Los jugadores reportan que "nunca pasa nada malo":** la catástrofe no genera suficiente tensión — subir `quadraticFactor`.
4. **El inventario de materiales llena en < 10 runs:** los `baseLootPerSecond` son demasiado altos.
5. **Los jugadores llegan al nivel 10 en < 2 horas:** la curva de XP requiere más escalado en los niveles altos.
6. **Ningún jugador llega al nivel 5 en su primera hora:** la curva de XP en los primeros niveles es demasiado alta.

---

## Apéndice A: Resumen de parámetros v0

### Zona `shipyard_cemetery`

| Parámetro | Valor v0 |
|-----------|----------|
| `baseRate` | 0.04 |
| `quadraticFactor` | **0.000004** |
| `catastropheThreshold` | 0.90 |
| `spikeChance` | 0.02 |
| `spikeMagnitude` | 0.05 |
| `dangerLootBonus` | 0.80 |
| `baseCurrencyPerMinute` | 45 CC |
| `baseXpPerSecond` | 3.5 XP/s |

### `baseLootPerSecond`

| Material | Valor v0 |
|----------|----------|
| `scrap_metal` | 0.50 u/s |
| `energy_cell` | 0.15 u/s |
| `recycled_component` | 0.08 u/s |
| `corrupted_crystal` | 0.02 u/s |

### Progressión

| Parámetro | Valor v0 |
|-----------|----------|
| `xpCurveBase` | 1.500 |
| `xpCurveExponent` | 1.6 |
| `levelLootMultiplierPerLevel` | +2% |
| `levelDangerResistancePerLevel` | +1% |
| `maxLevel` | 10 |

### Economía de catástrofe

| Parámetro | Valor v0 |
|-----------|----------|
| `catastropheLootRetained` | 20% |
| `catastropheXpRetained` | 25% |
| `catastropheCurrencyRetained` | 0% |

### Tiradas de equipo por run

| Duración | Tiradas base | Bonus si peligro > 0.75 |
|----------|-------------|------------------------|
| < 2 min | 0 | —  |
| 2–4 min | 1 | +1 |
| 4–7 min | 2 | +1 |
| > 7 min | 3 | +1 |

---

## Apéndice B: Simulación de una sesión de 3 runs — jugador nuevo nivel 1

**Punto de partida:** nivel 1, solo casco básico, sin materiales.

### Run 1 — 4 minutos, catástrofe (jugador no extrae a tiempo)

- Peligro al cerrar: ~97% (catástrofe)
- Loot final (20%):
  - Chatarra Metálica: floor(0.50 × 240 × 1.776 × 1.0 × 1.0 × 0.20) = **~42 unidades**
  - Célula de Energía: floor(0.15 × 240 × 1.776 × 0.20) = **~13 unidades**
  - Componente Reciclado: floor(0.08 × 240 × 1.776 × 0.20) = **~7 unidades**
  - Cristal Corrupto: floor(0.02 × 240 × 1.776 × 0.20) = **~2 unidades**
- Créditos: 0 CC
- XP: floor(3.5 × 240 × 1.776 × 0.25) = **~373 XP**
- Drops de equipo: 0 tiradas (run fallida)

Estado post run 1: nivel 1 con 373 XP, 0 CC, algo de materiales.

**Mensaje del juego:** "DESASTRE — Extrae antes de que la barra llegue al rojo. Recuperaste el 20% del botín. | Primera catástrofe: La barra de peligro llegó al máximo. ¡Extrae antes de que ocurra!"

---

### Run 2 — 5.5 minutos, extracción exitosa (peligro ~47%)

- Peligro al extraer: `0.04 + 0.000004 × 330² = 0.04 + 0.436 ≈ 0.476 (47.6%)`
- `dangerBonus` = 1 + 0.80 × 0.476 = **×1.381**
- Loot:
  - Chatarra Metálica: floor(0.50 × 330 × 1.381) = **~228 unidades**
  - Célula de Energía: floor(0.15 × 330 × 1.381) = **~68 unidades**
  - Componente Reciclado: floor(0.08 × 330 × 1.381) = **~36 unidades**
  - Cristal Corrupto: floor(0.02 × 330 × 1.381) = **~9 unidades**
- Créditos: floor(45 × 5.5 × 1.381) = **~342 CC**
- XP: floor(3.5 × 330 × 1.381) = **~1.597 XP**
- Total XP acumulada: 373 + 1.597 = **1.970 XP** → ¡sube a nivel 2! (necesitaba 1.500)
- Drops de equipo: 2 tiradas → probabilidad de 1 drop UNCOMMON ~35% → supongamos que cae **Guantes de Trabajo Industrial** (COMMON: ×1.05 loot desde ahora)

**Sensación:** "Subí de nivel. Tengo guantes nuevos. Las runs van a dar más materiales. Esta vez no me sorprendrá la barra."

---

### Run 3 — 6 minutos, extracción exitosa con guantes equipados (peligro ~55%)

- Equipo: casco básico + guantes industriales (`lootMultiplier` = 1.05)
- Peligro al extraer: `0.04 + 0.000004 × 360² ≈ 0.558 (55.8%)`
- `dangerBonus` = 1 + 0.80 × 0.558 = **×1.446**
- Loot:
  - Chatarra Metálica: floor(0.50 × 360 × 1.446 × 1.05) = **~274 unidades**
  - Célula de Energía: floor(0.15 × 360 × 1.446 × 1.05) = **~82 unidades**
  - Componente Reciclado: floor(0.08 × 360 × 1.446 × 1.05) = **~44 unidades**
  - Cristal Corrupto: floor(0.02 × 360 × 1.446 × 1.05) = **~11 unidades**
- Créditos: floor(45 × 6 × 1.446 × 1.05) = **~412 CC**
- XP: floor(3.5 × 360 × 1.446) = **~1.822 XP**
- Total XP acumulada: 1.970 + 1.822 - 1.500 (nivel 2 cost) = **~2.292 XP** en nivel 2 (necesita 2.857 para nivel 3 → 80% completado)
- Drops de equipo: 2 tiradas + 1 bonus (peligro > 55%) = 3 tiradas → garantía de UNCOMMON activa (run 3 sin UNCOMMON previo) → **Casco de Exploración Reforzado** cae garantizado

**Sensación:** "Casco nuevo. Ahora tengo resistencia al peligro. Las runs van a durar más sin que la barra suba tan rápido. Casi nivel 3. Quiero una run más."

---

### Estado del jugador después de 3 runs (~20 minutos totales)

| Qué | Cantidad |
|-----|----------|
| Nivel | 2 (casi 3) |
| XP acumulada | ~2.292 |
| CC | ~754 |
| Chatarra Metálica | ~342 |
| Célula de Energía | ~103 |
| Componente Reciclado | ~57 |
| Cristal Corrupto | ~13 |
| Equipo equipado | HEAD: Casco Reforzado, HANDS: Guantes Industriales |
| Items pendientes equipar | Ninguno — los que tiene están equipados |
| Slots aún vacíos | BODY, TOOL_PRIMARY, BACKPACK |

Este es el estado objetivo de un jugador nuevo después de 20 minutos. El balance v0 lo logra si los parámetros definidos en este documento se implementan correctamente.

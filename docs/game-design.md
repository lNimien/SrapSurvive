# Scrap & Survive — Game Design Document

> **Status:** Living document. Referencia de diseño de producto y sistemas de juego.
> **Fase actual:** MVP (Fase 0)

---

## 1. Visión del juego

Scrap & Survive es un **Idle Extraction RPG de decisiones de codicia controlada** para navegador. El jugador no controla al personaje en tiempo real ni hace click febril. En cambio, equipa a su chatarrero, lo lanza a una expedición automática, y enfrenta una pregunta genuinamente tensa:

**¿Cuánto te atreves a esperar antes de salir?**

El loop nuclear es simple pero profundo: más tiempo = más loot, pero también más peligro. La catástrofe siempre llega si esperas suficiente. La habilidad real del jugador no es la velocidad de reflejos, sino la lectura del riesgo y la decisión de cuándo extraer.

---

## 2. Fantasía del jugador

El jugador es un operador de extracción espacial en una zona post-industrial degradada. No es un héroe épico. Es un mercenario pragmático con una nave destartalada y un sentido del riesgo muy calibrado. La fantasía no es "matar dragones". Es:

- **Entrar donde nadie entra porque es peligroso.**
- **Sacar todo lo que puedes antes de que el lugar colapse.**
- **Saber exactamente cuándo correr.**

La tensión visceral de "aún no... aún no... ¡ahora!" es el núcleo emocional del juego. El loot es la recompensa tangible. La progresión es la razón para volver. El riesgo calibrado es el skill expression.

---

## 3. Core Loop

```
[Preparar]
  Revisar inventario + equipo
  Seleccionar zona
  Pulsar "Lanzar expedición"
       │
       ▼
[Esperar / Vigilar]
  El chatarrero acumula loot automáticamente
  El peligro sube con el tiempo
  El jugador monitorea barras y estimaciones
       │
       ├──── [Extraer]
       │         El jugador pulsa "Extraer" en el momento que considera óptimo
       │         El servidor calcula loot final + transfiere al inventario
       │         La run termina exitosamente
       │
       └──── [Catástrofe]
                 El peligro alcanza umbral crítico
                 El chatarrero pierde la mayoría del loot acumulado
                 La run termina con pérdida parcial o total
       │
       ▼
[Resolver]
  Ver resumen de la run (ganado, perdido, duración, peligro máximo)
  Usar loot, vender, equipar mejoras
  Repetir con mejor conocimiento
```

**Duración de un ciclo de loop completo:** 2–15 minutos (configurable por zona y decisión del jugador). El MVP tiene una zona con duración objetivo de 3–8 minutos por run competente.

---

## 4. Secondary Loops

### Loop de progresión del personaje
- Runs → XP → Niveles del chatarrero → Mejores stats base → Runs más largas o en zonas más peligrosas.
- Visible después de cada run. Progresión tangible en sesiones cortas.

### Loop de equipamiento
- Drops de items → Equipar mejores items → Mejor loot multiplier y resistencia → Runs más eficientes.
- Decisión real: ¿guardo este item para stats o lo vendo para créditos?

### Loop de optimización
- El jugador aprende cuándo extraer en cada zona para maximizar loot/tiempo.
- Con mayor nivel experimenta con mayor riesgo deliberado.
- Sensación de maestría incremental.

### Loop de sesión corta vs larga
- Sesión corta: lanzar una run, volver cuando termine, extraer, repetir.
- Sesión larga: vigilar activamente, optimizar el momento exacto de extracción.
- Ambas deben ser válidas y satisfactorias.

---

## 5. Sesión típica del jugador

**Duración estimada:** 5–20 minutos

1. El jugador abre el juego. Ve el estado de la dashboard.
2. Si hay una run en progreso: revisa el estado actual (loot acumulado, nivel de peligro).
3. Decide extraer o esperar más.
4. Si no hay run activa: revisa inventario, decide si equipar algo mejor, selecciona zona y lanza.
5. Mientras la run avanza: monitorea pasivamente. Puede hacer otras cosas y volver.
6. Extrae en el momento elegido o pierde parte del loot si se tardó.
7. Ve el resumen de la run: qué ganó, cuánto tiempo duró, qué nivel de peligro sobrevivió.
8. Gestión breve del inventario.
9. Lanza otra run o cierra el juego.

**El juego debe ser satisfactorio si el jugador solo tiene 5 minutos, o si tiene 2 horas.**

---

## 6. Primeros 10 minutos de experiencia

El objetivo de los primeros 10 minutos es enseñar el loop completo con cero fricción y máxima claridad.

### Minuto 0–1: Llegada
- El jugador crea cuenta o ingresa con OAuth.
- Se le presenta la dashboard del chatarrero con un estado limpio.
- Un tooltip de onboarding minimal le dice: "Tu chatarrero necesita salir a recolectar. Equípalo y lánzalo."

### Minuto 1–2: Equipo inicial
- El jugador parte con un equipo básico pre-equipado (no puede el inventario estar vacío al iniciar).
- Puede ver los slots de equipo. Una nota explica brevemente qué hace cada slot.
- No hay puzzles ni tutoriales largos. El equipo inicial ya está equipado.

### Minuto 2–3: Primera run
- Selecciona la única zona disponible en MVP (se desbloquean más en Fase 1).
- Pulsa "Lanzar expedición". La UI cambia a la vista de expedición.
- Ve la barra de peligro comenzar a crecer lentamente. Ve el loot simulado acumularse.

### Minuto 3–7: Vigilancia y decisión
- El jugador observa. El peligro crece. El número de loot prometido también crece.
- La UI debe hacer visible la tensión: la barra de peligro cambia de color, hay indicadores sutiles de advertencia.
- El jugador extrae cuando considera que ya ganó suficiente o cuando el peligro parece inminente.

### Minuto 7–9: Resultado
- El servidor calcula y muestra el resumen: "Extraído con éxito. Obteniste: [items + créditos]."
- O si catástrofe: "Demasiado tarde. Recuperaste solo el 20% del botín acumulado."
- Se añaden los items al inventario visible.

### Minuto 9–10: "Una más"
- El jugador quiere lanzar otra run.
- Ya entiende el loop. El juego ganó su primera sesión.

**Regla de oro:** si un jugador nuevo no entiende el loop en 5 minutos sin texto explicativo, la UI ha fallado.

---

## 7. Motivaciones del jugador

| Motivación | Expresión en el juego |
|-----------|----------------------|
| **Codicia calibrada** | Siempre hay un poco más de loot si esperas. ¿Merece el riesgo? |
| **Progresión visible** | Cada run da XP y loot. El progreso es constante aunque sea pequeño |
| **Optimización** | ¿Cuál es el momento óptimo de extracción para esta zona con este equipo? |
| **Colección** | Obtener items raros llena espacios en el inventario. La rareza importa |
| **Vuelta al juego** | El loop corto invita a volver varias veces al día |
| **Dominio** | Sobrevivir niveles de peligro altos da sensación de hazaña |

---

## 8. Riesgo vs Recompensa

Este es el eje central del diseño. Todas las decisiones de sistema deben reforzarlo.

### Principios

1. **El loot nunca deja de crecer:** a mayor tiempo en zona, siempre hay más loot potencial.
2. **El peligro también siempre crece:** la curva de peligro es monotónicamente creciente.
3. **Nunca hay un momento "seguro" eterno:** no existe un plateau de peligro bajo indefinido.
4. **El jugador siempre tiene información suficiente:** nunca siente que fue injusto porque no sabía.
5. **La catástrofe no borra todo:** se pierde la mayor parte, pero no el 100% (salvo diseño explícito de zona de alto riesgo en Fase 1). Esto evita frustración paralizante.
6. **El riesgo extra tiene recompensa extra:** el bonus de loot por peligro alto hace que esperar más tenga sentido matemático, no solo dramático.

### Fórmula conceptual

```
Valor esperado de extracción = f(loot_acumulado × danger_bonus) - riesgo_de_pérdida
```

El jugador experto maximiza este valor esperado. El jugador nuevo aprende que no siempre es "más tiempo = mejor".

---

## 9. Sistema de peligro

### Descripción
El peligro es una abstracción de los riesgos de la zona: colapso estructural, fauna hostil, anomalías energéticas. Se representa como un valor normalizado de 0.0 a 1.0+.

### Componentes

**Crecimiento base:** peligro crece con el tiempo. La curva es al menos cuadrática (no lineal) para que los últimos minutos sean dramáticamente más tensos que los primeros. Parámetro configurable por zona.

**Picos aleatorios:** eventos de peligro súbito que pueden disparar el nivel temporalmente. Deterministas por semilla de run (no se puede "recargar" para evitarlos). Añaden imprevisibilidad controlada sin injusticia.

**Umbral de catástrofe:** cuando el peligro supera el threshold configurado de la zona (ej: 0.95), se dispara la catástrofe. Este umbral puede tener un pequeño margen de gracia (ej: 2 segundos) para que el servidor lo evalúe de forma justa.

### Visualización
- **Barra de peligro:** de verde a amarillo a rojo. En rojo intenso: animación de pulso.
- **Texto de estado:** "Zona estable" → "Señales de inestabilidad" → "PELIGRO CRÍTICO".
- **Advertencias visuales** cuando el peligro supera ciertos umbrales (ej: 50%, 75%, 90%).
- El jugador siempre ve el nivel de peligro actual. No se oculta esta información.

### Parámetros de zona base (MVP)
```
Zona: Cementerio de Naves (zona inicial)
  baseRate: 0.04              // peligro inicial bajo
  quadraticFactor: 0.000004   // crecimiento acelerado — catástrofe a ~7.8 min (valor oficial v0)
  catastropheThreshold: 0.90  // catástrofe al 90% de peligro
  spikeChance: 0.02           // 2% de probabilidad por tick de evaluación
  spikeMagnitude: 0.05        // un pico añade hasta 5% al peligro
  dangerLootBonus: 0.8        // bonus máximo de loot por peligro = 80% extra al 100% peligro
```

---

## 10. Sistema de loot

### Descripción
El botín es lo que el chatarrero recolecta durante la expedición. Crece con el tiempo y con la calidad del equipo. Todo el cálculo de loot ocurre en el servidor.

### Tipos de loot
- **Materiales (stackables):** chatarra metálica, células de energía, componentes reciclados, cristales corruptos, etc. Son la base de la economía.
- **Items de equipo (no stackables en Fase 1):** mejoras para el chatarrero. En MVP los drops del inventario son principalmente materiales.
- **Créditos directos:** moneda del juego que cae directamente como recompensa de extracción.

### Drop table
- Cada zona tiene una drop table definida: lista de `{ itemDefinitionId, baseDropRate, minQuantity, maxQuantity }`.
- El servidor calcula qué items caen con qué cantidad al resolver la extracción.
- La rareza influye en la drop rate: items raros caen menos frecuentemente y en menor cantidad.

### Crecimiento del loot por tiempo
- El loot base crece de forma aproximadamente lineal con el tiempo (a mayor tiempo, más materiales recolectados).
- El equipo del chatarrero aplica multiplicadores (ej: mochila mayor = +30% cantidad base).
- El bonus de peligro añade un multiplicador adicional: más peligro = más loot potencial.

### Visualización del loot pendiente
- La UI muestra una **estimación** del loot que se obtendría si se extrajera ahora mismo.
- Esta estimación viene del servidor en el polling o se interpola localmente entre polls.
- El número debe ser claro y legible: "~47 chatarra metálica, ~12 células de energía, ~320 Créditos".
- La palabra "~" (aproximado) deja claro que es una estimación, no un contrato. El servidor confirma el final al extraer.

---

## 11. Sistema de extracción

### Descripción
La extracción es el acto de terminar voluntariamente la run y reclamar el botín acumulado.

### Flujo desde el jugador
1. El jugador ve el estado de la run (peligro, loot estimado).
2. Decide pulsar "EXTRAER AHORA".
3. El botón tiene un breve delay visual (0.5s) para evitar clicks accidentales. No es un delay de gameplay — es UX.
4. El servidor procesa la extracción.
5. El resultado aparece: items obtenidos, créditos ganados, duración de la run.
6. El inventario se actualiza.

### Regla de catástrofe durante extracción
- Si entre que el jugador pulsa "Extraer" y el servidor procesa, la catástrofe ya había ocurrido (el `dangerLevel` calculado por el servidor supera el threshold): se aplica la penalización de catástrofe, no la extracción exitosa.
- No hay "última milésima" explotable: el servidor siempre calcula el estado al momento del procesamiento del action.

### Extracción tardía
- Si el jugador no extrae a tiempo y la catástrofe ocurre, el servidor lo detecta en el siguiente poll.
- La UI muestra el estado de catástrofe: "Desastre ocurrido. Tu chatarrero apenas escapó."
- El jugador **aún puede pulsar "Extraer"** pero obtendrá solo el % de compensación.
- Esto da una salida digna y evita que el jugador sienta que "no pudo hacer nada" — sí podía, pero fue tarde.

---

## 12. Sistema de pérdida / fracaso

### Filosofía
La pérdida en una catástrofe no debe ser devastadora ni irreversible. El jugador debe sentir que perdió algo real (motivación para mejorar) pero no debe sentir que fue injusto o que retrocedió significativamente en progresión.

### Consecuencias de catástrofe (MVP)
- **Loot perdido:** el 80% del loot acumulado hasta el momento de catástrofe se destruye.
- **Recuperación mínima:** el jugador obtiene el 20% restante del loot acumulado (redondeado hacia abajo, mínimo 0).
- **Monedas:** no se obtienen créditos de la run fallida (el bonus de extracción exitosa no aplica).
- **XP de consolación:** se otorga una pequeña cantidad de XP (ej: 25% del XP de extracción exitosa) para que hasta las runs fallidas contribuyan a la progresión.
- **El equipo del chatarrero no se daña en MVP.**

### Lo que NO ocurre en una catástrofe (MVP)
- No se pierden items del inventario ya guardado.
- No se pierde equipo.
- No se retrocede en nivel.
- No se pierden créditos del balance previo.

**Justificación:** en MVP, el objetivo es establecer el loop sin frustración excesiva. Las catástrofes más severas (zonas peligrosas, pérdida de equipo) son mecánicas de Fase 1+ para jugadores que eligan deliberadamente mayor riesgo.

### Registro del fracaso
- Se crea un `ExtractionResult` con `status: FAILED` y `catastropheOccurred: true`.
- El historial muestra la run fallida con todos sus datos (duración, nivel de peligro, loot perdido).
- Ver runs fallidas en el historial motiva el "me viene una revancha".

---

## 13. Inventario y equipamiento

### Inventario
- Grid de ítems. En MVP: capacidad generosa (no hay restricción de slots de inventario en fase inicial — la restricción vendrá con la progresión en Fase 1).
- Ítems stackables (materiales): se acumulan en un solo slot con contador.
- Vista clara de nombre, cantidad, rareza y valor base.
- Permite seleccionar un ítem para ver detalles (tooltip completo).

### Equipamiento del chatarrero
- El chatarrero tiene **6 slots de equipo** en MVP: HEAD, BODY, HANDS, TOOL_PRIMARY, TOOL_SECONDARY, BACKPACK.
- Cada slot puede estar vacío (equipo base sin bonus) o con un ítem de equipo.
- Los items de equipo otorgan stats que afectan la run: `lootMultiplier`, `dangerResistance`, `extractionSpeedBonus`, `backpackCapacity`.
- En MVP el equipo está definido en la ItemDefinition. Los items de equipo son drops raros.
- El jugador puede equipar/desequipar fuera de una run activa. No se puede cambiar el equipo durante una run.

### Snapshot de equipo
- Al iniciar una run, el equipo actual se snapshottea en `ActiveRun.equipmentSnapshot`.
- Si el jugador cambia el equipo después de iniciar (posible si tiene otra UI abierta), no afecta la run en curso.

---

## 14. Progresión mínima del MVP

### XP y niveles del chatarrero
- Cada run exitosa otorga XP proporcional a: duración de la run, nivel de peligro alcanzado, cantidad de loot obtenido.
- Runs fallidas dan un 25% del XP usual.
- Subir de nivel aumenta stats base del chatarrero (loot multiplier base, resistencia al peligro).
- En MVP: niveles 1–10. Curva de XP suave. Un jugador normal sube de nivel cada 3–5 runs.

### Desbloqueables de nivel (Fase 0 → Fase 1)
- MVP: los niveles no desbloquean contenido nuevo (solo mejoran stats). La sensación de progresión viene de los números crecer.
- Fase 1: los niveles desbloquean zonas, slots de equipo adicionales, acceso a vendors.

### CurrencyLedger
- Los créditos se acumulan con cada extracción exitosa.
- En MVP solo se usan créditos como marcador de progreso. Los vendedores llegan en Fase 1.
- El ledger es append-only: el balance visible es la suma real de todas las entradas.

---

## 15. Recursos y monedas base

### Moneda principal: Créditos de Chatarrero (CC)
- Ganados en extracciones exitosas.
- Fuentes: bonus de extracción exitosa por duración + peligro.
- Sinks (Fase 1): comprar equipo a vendors, mejorar la nave, desbloquear zonas.
- En MVP: acumulación sin gasto (sinks llegan en Fase 1, pero el balance se construye desde ahora).

### Materiales (items stackables)
- Chatarra Metálica, Células de Energía, Componentes Reciclados, Cristales Corruptos.
- Fuentes: drops en expediciones.
- Sinks (Fase 1): crafting, vendedores, mejoras de equipo.
- En MVP: se acumulan en inventario. Se pueden "vender" en Fase 1.

**No se añade segunda moneda en MVP.** La complejidad de economía dual se introduce cuando haya contenido que la justifique.

---

## 16. Fuentes y sinks

| Recurso | Fuentes (MVP) | Sinks (MVP) | Sinks (Fase 1+) |
|---------|--------------|------------|----------------|
| Créditos CC | Extracción exitosa | Ninguno | Vendors, mejoras, eventos |
| Materiales | Drops de runs | Ninguno | Crafting, vendors, eventos |
| XP | Cada run | No aplica (solo se gasta subiendo de nivel) | — |
| Equipo | Drops raros | No aplica | Venderse, destruirse por crafting |

**Riesgo identificado:** sin sinks en MVP, los créditos y materiales se acumulan indefinidamente. Esto es aceptable en MVP porque el juego está en etapa de construcción. Se prioriza que el jugador sienta progresión. Los sinks se introducen en Fase 1 simultáneamente con los primeros vendedores.

---

## 17. Curva de progresión inicial

### Primeras 30 runs (sesiones tempranas)
- Nivel 1–3: el jugador aprende el timing de extracción. Las runs son cortas. Los drops son modestos pero perceptibles.
- Nivel 3–6: el jugador empieza a ver drops de equipo. Puede equipar mejoras. Las runs con mejor equipo dan más loot. La diferencia es visible.
- Nivel 6–10: el jugador puede llegar a niveles de peligro más altos antes de la catástrofe. Las recompensas crecen notablemente. El loop se siente dominado.

### Sensación objetivo por nivel
- Nivel 1: "Estoy aprendiendo. Cada run me enseña algo."
- Nivel 3: "Voy mejorando mi equipo. Las runs son más largas."
- Nivel 7: "Sé exactamente cuándo extraer. Soy eficiente."
- Nivel 10: "Necesito una zona más difícil." → gancho para Fase 1.

---

## 18. Principios de balance

1. **Nunca hacer que las catástrofes se sientan ineludibles en la zona inicial.** El jugador experto debe poder completar la zona inicial sin catástrofes consistentemente.
2. **El primer drop de item de equipo nunca debe tardar más de 3 runs.** La primera mejora visible importa mucho para la retención.
3. **Los números deben verse bien en pantalla.** Evitar cantidades de loot que sean o demasiado pequeñas (0–2 unidades) o demasiado grandes (millones en el nivel 1).
4. **El tiempo óptimo de extracción en la zona inicial debe ser ~4–6 minutos.** Ni demasiado corto (sin tensión) ni demasiado largo (aburrido).
5. **Los parámetros de fórmulas van en `config/game.config.ts`**, no en el código. El balance se ajusta sin "cirugía" de código.
6. **El balance se valida empíricamente, no solo matemáticamente.** Las fórmulas dan el framework; el playtesting define los números reales.
7. **Nunca restar lo que ya está en el inventario del jugador** por errores de balance retroactivos.

---

## 19. Principios de UX del juego

1. **La información crítica siempre visible:** nivel de peligro, loot estimado, botón de extracción. Nunca enterrada en menús.
2. **El estado de la run es siempre claro:** el jugador nunca debe preguntarse si tiene una run activa o no.
3. **El feedback de acciones es inmediato:** al pulsar "Extraer", el sistema muestra loading state de inmediato. No hay botón que parece no responder.
4. **Los errores son explicativos:** "No puedes iniciar una expedición mientras hay una activa" es mejor que "Error 400".
5. **El resumen de la run es satisfactorio:** muestra lo que ganaste, la duración, el nivel de peligro máximo alcanzado. Haz que el jugador sienta lo que logró.
6. **El historial de runs es fácil de leer de un vistazo:** iconos de éxito/fracaso, duración, loot total, fecha.
7. **El inventario es legible:** la rareza tiene colores. Las cantidades son prominentes. Los tooltips dan información completa.
8. **El onboarding es contextual, no un tutorial modal interminable.**

---

## 20. Reglas para evitar frustración injusta

1. **La catástrofe debe ser predecible:** el jugador siempre tiene tiempo de ver la barra de peligro en rojo y reaccionar. No hay catástrofes sin advertencia.
2. **El jugador siempre tiene una acción disponible:** incluso si la catástrofe ya ocurrió, puede pulsar "Extraer" para recuperar el 20%.
3. **Nunca perder items ya guardados en inventario por una run fallida.**
4. **Nunca reiniciar el nivel o el XP por una catástrofe.**
5. **La UI no miente:** si el servidor calculó que la catástrofe ocurrió hace 30 segundos pero el cliente no lo sabía aún, el mensaje debe explicar qué pasó y cuándo, no simplemente mostrar un error.
6. **Las fórmulas de peligro usan semillas deterministas:** el jugador no puede "recargar" para evitar un pico de peligro, pero tampoco puede ser víctima de un resultado aleatorio diferente en cada recarga.
7. **La primera catástrofe del jugador debe venir con un mensaje explicativo extra:** "Demasiado tarde esta vez. La barra de peligro llegó al máximo. ¡Extrae antes de que sea tarde!"
8. **Los picos de peligro aleatorios deben ser visualmente anunciados:** un destello, un cambio de color brusco, un sonido (en Fase 1) antes de que el valor cambie.

---

## 21. Preparación para features futuras

Las siguientes features NO están en MVP, pero la arquitectura y el diseño de dominio las tienen en cuenta:

| Feature | Preparación en MVP |
|---------|-------------------|
| **Más zonas** | ZoneId en ActiveRun y ExtractionResult. Config paramétrica por zona. |
| **Vendors / tiendas** | Ledger de créditos desde MVP. Créditos se acumulan. Sinks se añaden en Fase 1. |
| **Crafting** | Materiales en inventario desde MVP. Recipes serán tabla nueva en Fase 1. |
| **Prestige** | UserProgression como tabla separada. Reset de level con reset controlado es additive. |
| **Market asíncrono** | InventoryItem es relacional y tiene propiedad de userId. Transfer es posible. |
| **Logros** | AuditLog + ExtractionResult tienen la data necesaria para derivar logros después. |
| **Eventos temporales** | ZoneConfig paramétrica permite zonas de evento con config diferente. |
| **Guilds** | UserProfile puede recibir guildId. No impacta el núcleo. |
| **Múltiples zonas simultáneas** | En MVP: constraint de 1 run activa por userId. Eliminar el @unique en Fase 1+ si se diseña multi-run. |
| **Notificaciones push** | AuditLog tiene timestamps exactos. Servicio de notificaciones puede leer sin cambio de core. |

---

## 22. Preparación para monetización futura sana

**Principio:** monetización de calidad de vida, no de pay-to-win agresivo.

### Qué se PUEDE monetizar sin romper el balance
- **Suscripción VIP:** historial de runs extendido, slots de inventario adicionales, acceso anticipado a zonas nuevas, cosmético HUD personalizado.
- **Cosméticos:** skin del chatarrero, tema visual del HUD, iconos de items premium. Cero impacto en gameplay.
- **Slots de comodidad:** poder tener 2 runs activas simultáneas (cuando el sistema soporte multi-run en Fase 2+).
- **Paquetes de zonas de evento:** acceso a zonas temporales especiales con mejor drop rate — el acceso cuesta, no el resultado.
- **Boost cosmético limitado:** +10% XP durante 24h — marginal, no game-breaking, y transparent.

### Qué NUNCA se monetizará (por diseño)
- Comprar loot directamente.
- Comprar niveles de personaje.
- Reducir el tiempo de catástrofe artificialmente.
- Items de equipo exclusivos que no sean obtenibles en juego.
- Comprar ventaja en rankings o comparaciones sociales.

### Base técnica para monetización
- `UserProfile` puede recibir un campo `subscriptionTier` sin cambios de arquitectura.
- El ledger puede añadir `LedgerEntryType.PREMIUM_PURCHASE` sin cambios de schema.
- Los gating de features premium se implementan como checks en domain services.

---

## 23. Riesgos de diseño

| Riesgo | Descripción | Mitigación |
|--------|-------------|-----------|
| **Loop demasiado simple** | Sin suficiente variedad, el loop se siente repetitivo en pocas horas | Añadir zonas y variedad de drops en Fase 1. El MVP explícitamente prepara para esto. |
| **Timing de catástrofe injusto** | El jugador siente que la catástrofe fue sorpresa o injusta | Fórmulas deterministas, advertencias visuales claras, margen de gracia |
| **Sin sinks: inflación de inventario** | El inventario se llena con materiales que no sirven para nada | Esperado en MVP. Sinks llegan en Fase 1. Comunicar al jugador que "guardar es bueno" |
| **Curva de XP demasiado lenta** | El jugador no siente progresión rápida | Target: subir de nivel cada 3–5 runs. Ajustar con playtesting |
| **La primera zona se vuelve trivial rápido** | Jugadores de nivel 8+ extraen siempre al máximo sin tensión | Zona inicial está diseñada para niveles 1–5. La Fase 1 añade zonas más difíciles |
| **UI demasiado densa** | El jugador se siente abrumado por información | Principio: máxima información visible, mínima interfaz necesaria. Test de usuarios nuevos |
| **Sin razón para volver** | Si el jugador completa el inventory early, pierde motivación | Nivelar el deseo: siempre hay un item mejor que aún no has obtenido |

---

## 24. Preguntas abiertas de diseño

1. **¿Cuánto loot se recupera en catástrofe?** Asumido: 20%. ¿Es demasiado poco (frustrante) o demasiado (quita tensión)?

2. **¿Debería haber "seguro de extracción" costeable?** Un ítem consumible que garantiza extracción exitosa incluso si hay catástrofe. Útil para monetización y decisión estratégica. Considerado para Fase 1.

3. **¿El timer de la run debería tener sounds/música?** Los sonidos de tensión aumentarían drásticamente la emoción. Pero añaden complejidad a MVP. Decisión: assets de audio en Fase 1.

4. **¿Debería mostrarse al jugador la semilla de catástrofe?** Esto permitiría al jugador muy avanzado calcular exactamente cuándo ocurrirá la catástrofe. ¿Eso es "metagame sano" o elimina la tensión? Decisión pendiente.

5. **¿Los drops de equipo de MVP son equipables directamente o requieren materiales para mejorar?** Asumido: equipables directamente. Mejoras requieren crafting (Fase 1).

6. **¿Qué ocurre si el servidor cae durante una run activa?** En el estado actual, la run queda en RUNNING indefinidamente. ¿Se necesita un TTL automático de runs que no han tenido actividad? Considerado para Fase 1.

7. **¿Cuántas zonas en el MVP jugable completo?** Diseñado para 1 zona. ¿Una única zona con tutorial integrado es suficiente para retención inicial?

8. **¿Hay cooldown entre runs?** Actualmente no hay cooldown: el jugador puede lanzar otra run inmediatamente. ¿Esto es correcto o hay que forzar una micro-pausa para dar peso al momento?

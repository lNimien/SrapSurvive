# Scrap & Survive — Content Seed

> **Status:** Documento de contenido inicial del MVP. Autoridad máxima para la definición de items, zonas, loot tables y valores base.
> **Referencia:** Extrae decisiones de `docs/architecture.md`, `docs/game-design.md` y `docs/mvp-spec.md`.
> **Audiencia:** Una IA puede convertir este documento directamente en seeds de DB, registros en `ItemDefinition` y constantes en `config/game.config.ts` sin tomar decisiones creativas adicionales.

---

## 1. Principios del content seed del MVP

1. **Pequeño pero suficiente.** El número de items y zonas es el mínimo que permite sentir que el juego tiene contenido real. No se añade contenido para impresionar — se añade para validar el loop.

2. **Cada item tiene un rol.** Ningún item existe solo para llenar. Cada uno ocupa una función específica: recompensa de loops cortos, material visible de progresión, rareza que motiva exploración o pieza de equipo que mejora las runs.

3. **Coherencia tonal.** Todo el contenido pertenece a la fantasía de chatarrero espacial post-industrial. La nomenclatura evoca desgaste, reutilización, tecnología oxidada y supervivencia pragmática. Sin magia, sin fantasía élfica, sin ciencia ficción limpia.

4. **Números visibles y legibles.** Las cantidades de loot en una run normal deben ser números que se lean bien en pantalla: ni 2 unidades (miseria) ni 50.000 (inflación sin sentido). Objetivo de run exitosa de 5 minutos: cantidades en rango 20–120 por material, créditos en rango 150–400 CC.

5. **La primera drop importante ocurre antes del run 3.** El primer upgrade visible (item de equipo) debe caer en las primeras 3 expediciones para anclar el loop de progresión. Si no cae, el jugador no tiene razón para volver.

6. **Los parámetros numéricos son ajustables.** Las cantidades, probabilidades y valores aquí son punto de partida. Se ajustan con playtesting. Pero los nombres canónicos, las rarezas y los roles son fijos una vez sembrados en DB.

7. **No sembrar lo que no se usa.** Un item que no tiene función en el MVP no debe existir en la DB del MVP. Genera confusión en el código y en el testing.

---

## 2. Glosario oficial de términos de contenido

Estos términos tienen definición única y canónica. Usarlos exactamente así en código, logs, comentarios y UI.

| Término | Definición canónica |
|---------|---------------------|
| **Run** | Una instancia de expedición con ciclo de vida completo: inicio → progreso → resolución. Es la entidad de dominio. En código siempre `Run`, nunca `Mission`, `Game` ni `Session`. |
| **Expedition** | Sinónimo de Run en la UI y el lenguaje del jugador. La pantalla dice "Expedición". El código dice `Run`. |
| **Catastrophe** | El evento que ocurre cuando el nivel de peligro supera el umbral configurado de la zona. No es un estado en la DB — es una condición calculada. La run no cambia su status en DB hasta que el jugador extrae. |
| **Credits** | La moneda principal del juego. Nombre completo: **Créditos de Chatarrero**. Abreviatura canónica: **CC**. En código, las variables relacionadas se llaman `credits`, `currencyEarned`, `balanceAfter`. Nunca `gold`, `coins` ni `money`. |
| **Loot** | Los materiales e items que el chatarrero recolecta durante una Run. El loot es *pendiente* (calculado, no persistido) mientras la run está activa. Se convierte en *real* (escrito en la DB) únicamente en la transacción de extracción. |
| **Equipment** | Los ítems equipados en los 6 slots del chatarrero. Afectan directamente los cálculos de loot y peligro. Se capturan como snapshot al iniciar cada Run — los cambios posteriores no afectan la run en curso. |
| **Inventory** | La colección de todos los `InventoryItem` del usuario. Incluye materiales y equipo no equipado. No incluye los items en los slots de equipo activos — esos son `EquipmentSlot`, entidad separada. |
| **Zone** | El escenario de una expedición. Define los parámetros de peligro, loot y duración. En MVP existe una sola zona: el Cementerio de Naves. |

---

## 3. Moneda base del MVP

| Campo | Valor |
|-------|-------|
| **Nombre completo** | Créditos de Chatarrero |
| **Abreviatura canónica** | CC |
| **internalKey (código)** | `credits` |
| **Tipo** | Moneda principal. Una sola moneda en MVP. |
| **Representación en DB** | `Int` — nunca floats |
| **Fuentes en MVP** | Extracciones exitosas únicamente |
| **Uso en MVP** | Ninguno activo. Los créditos se acumulan y son el marcador de progreso económico del jugador. |
| **Uso futuro (Fase 1+)** | Comprar equipo a vendors, mejorar la nave, desbloquear zonas adicionales |
| **Sinks en MVP** | Ninguno |
| **Tono** | Pragmático, industrial. No son "monedas de oro". Son créditos de operación: el pago por sobrevivir y entregar chatarra. |

**Regla:** El balance de CC no puede ser negativo. No se descuenta CC en MVP. Si en el futuro se implementan sinks, la validación de balance insuficiente usa el código de error `INSUFFICIENT_BALANCE`.

---

## 4. Zona inicial del MVP

### Cementerio de Naves *(Shipyard Cemetery)*

| Campo | Valor |
|-------|-------|
| **internalKey** | `shipyard_cemetery` |
| **displayName** | Cementerio de Naves |
| **Dificultad** | Principiante — diseñada para niveles 1–5 |
| **Propósito** | Validar el loop completo. Enseñar timing de extracción. Primera fuente de materiales y equipo. |
| **Duración objetivo** | Run competente: 4–6 minutos. Run cauta: 2–3 minutos. Run codiciosa: 7–9 minutos (zona de catástrofe). |
| **Tipo de loot** | Materiales de desguace metálico y energético. Drops raros de componentes de alta tecnología degradada. |
| **Identidad visual** | Oscura, acerada, con destellos de pantallas rotas. Barcos enormes apilados como montañas de hierro. Luces de emergencia parpadeantes en naranja y rojo. Silencio salvo por crujidos metálicos y zumbidos eléctricos. |
| **Fantasía** | El jugador envía a su chatarrero a desguazar naves abandonadas antes de que el sector colapse. El riesgo es el colapso estructural progresivo — no hay enemigos, hay gravedad y entropía. |
| **Peligro principal** | Desestabilización estructural acelerada: las naves viejas se hunden, aplanan secciones, generan explosiones de presión. |
| **Umbral de catástrofe** | 0.90 (90% de peligro) |

#### Parámetros de peligro

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| `baseRate` | 0.04 | Peligro inicial bajo — zona tranquila los primeros 2 minutos |
| `quadraticFactor` | 0.000004 | Aceleración cuadrática — llega al 90% en ~7.8 min sin picos (valor oficial v0) |
| `catastropheThreshold` | 0.90 | Umbral de catástrofe |
| `spikeChance` | 0.02 | 2% por tick de evaluación — picos poco frecuentes |
| `spikeMagnitude` | 0.05 | Cada pico añade hasta +5% de peligro |
| `dangerLootBonus` | 0.80 | Al 100% de peligro: +80% de multiplicador de loot |

> **¿Qué significa esto para el jugador?** En los primeros 3 minutos el peligro apenas ha llegado al 17%. Entre minutos 4–6 llega al 27–55%. A partir del minuto 7 la curva se acelera notablemente (~74%). El timing óptimo de extracción para maximizar loot/riesgo es entre los 4 y 6 minutos. Catástrofe a ~7.8 min sin picos.

#### Parámetros de loot por segundo base

Estos valores se usan para calcular el loot pendiente durante la run. Son cantidades por segundo antes de aplicar multiplicadores de equipo y bonus de peligro.

| Material | `internalKey` | Unidades/segundo base |
|----------|---------------|----------------------|
| Chatarra Metálica | `scrap_metal` | 0.50 |
| Célula de Energía | `energy_cell` | 0.15 |
| Componente Reciclado | `recycled_component` | 0.08 |
| Cristal Corrupto | `corrupted_crystal` | 0.02 |

**Créditos base:** 45 CC por minuto de run (antes de multiplicadores).
**XP base:** 3.5 XP por segundo de run (antes de multiplicadores).

> **Referencia de run competente (5 minutos, 50% peligro promedio):**
> - ~180 Chatarra Metálica
> - ~54 Células de Energía
> - ~29 Componentes Reciclados
> - ~7 Cristales Corruptos
> - ~225 CC
> - ~1.050 XP

---

## 5. Lista exacta de Item Definitions iniciales

El MVP tiene **17 item definitions**. Este número es deliberado: suficiente para que el inventario se vea real, manejable para implementar y testear completamente.

### Materiales (10 items)

#### M-01 — Chatarra Metálica

| Campo | Valor |
|-------|-------|
| **internalKey** | `scrap_metal` |
| **displayName** | Chatarra Metálica |
| **Tipo** | Material |
| **Rarity** | COMMON |
| **Stackable** | Sí |
| **baseValue** | 1 CC |
| **Descripción** | Restos de aleaciones estelares deformadas por el tiempo. El pan de cada día del chatarrero. |
| **iconKey** | `icon_scrap_metal` |
| **Rol en el loop** | Material de volumen. El jugador lo obtiene en toda corrida. Indicador visual de que la expedición está funcionando. Futuro: material base de crafting. |

---

#### M-02 — Célula de Energía

| Campo | Valor |
|-------|-------|
| **internalKey** | `energy_cell` |
| **displayName** | Célula de Energía |
| **Tipo** | Material |
| **Rarity** | COMMON |
| **Stackable** | Sí |
| **baseValue** | 4 CC |
| **Descripción** | Unidades de almacenamiento de energía descargadas parcialmente. Todavía tienen algo dentro. |
| **iconKey** | `icon_energy_cell` |
| **Rol en el loop** | Material secundario abundante. Complementa la economía de chatarra. Valor base mayor que la chatarra — da sensación de objetos más "valiosos" sin ser raros. |

---

#### M-03 — Componente Reciclado

| Campo | Valor |
|-------|-------|
| **internalKey** | `recycled_component` |
| **displayName** | Componente Reciclado |
| **Tipo** | Material |
| **Rarity** | UNCOMMON |
| **Stackable** | Sí |
| **baseValue** | 12 CC |
| **Descripción** | Placa de circuito desmontada a mano. Quién sabe para qué servía. Quién sabe para qué servirá. |
| **iconKey** | `icon_recycled_component` |
| **Rol en el loop** | Material poco común con mayor valor. Cae menos que la chatarra, lo que crea momentos de "¡caínes un componente!". Futuro: material de crafting de equipo. |

---

#### M-04 — Cristal Corrupto

| Campo | Valor |
|-------|-------|
| **internalKey** | `corrupted_crystal` |
| **displayName** | Cristal Corrupto |
| **Tipo** | Material |
| **Rarity** | UNCOMMON |
| **Stackable** | Sí |
| **baseValue** | 20 CC |
| **Descripción** | Formaciones cristalinas de origen desconocido. Emiten una frecuencia que ningún escáner ha podido clasificar. |
| **iconKey** | `icon_corrupted_crystal` |
| **Rol en el loop** | Material poco común con el valor base más alto de los materiales. El jugador lo busca deliberadamente. Aparece con menos frecuencia — hace que las runs largas valgan más. Futuro: componente clave de crafteos avanzados. |

---

#### M-05 — Fibra de Blindaje

| Campo | Valor |
|-------|-------|
| **internalKey** | `armor_fiber` |
| **displayName** | Fibra de Blindaje |
| **Tipo** | Material |
| **Rarity** | UNCOMMON |
| **Stackable** | Sí |
| **baseValue** | 10 CC |
| **Descripción** | Tiras de polímero reforzado de antiguas cubiertas de nave. Flexible, resistente y virtualmente imposible de conseguir nuevo. |
| **iconKey** | `icon_armor_fiber` |
| **Rol en el loop** | Tercer material poco común. Introduce variedad de drops sin complicar. Distinguible visualmente de los cristales. Futuro: crafting de piezas de protección. |

---

#### M-06 — Núcleo de Propulsor

| Campo | Valor |
|-------|-------|
| **internalKey** | `thruster_core` |
| **displayName** | Núcleo de Propulsor |
| **Tipo** | Material |
| **Rarity** | RARE |
| **Stackable** | Sí |
| **baseValue** | 55 CC |
| **Descripción** | El corazón de un motor de impulso de clase media. Todavía calienta si se acerca demasiado la mano. |
| **iconKey** | `icon_thruster_core` |
| **Rol en el loop** | Primer material raro. Aparece en 1 de cada 5–6 runs de duración media. El primer drop es memorable. Futuro: material crítico para mejoras de nave. |

---

#### M-07 — Placa de Blindaje Primaria

| Campo | Valor |
|-------|-------|
| **internalKey** | `primary_armor_plate` |
| **displayName** | Placa de Blindaje Primaria |
| **Tipo** | Material |
| **Rarity** | RARE |
| **Stackable** | Sí |
| **baseValue** | 65 CC |
| **Descripción** | Capa exterior de blindaje de una nave de clase pesada. Agujerada, deformada, pero las propiedades del material base siguen intactas. |
| **iconKey** | `icon_primary_armor_plate` |
| **Rol en el loop** | Segundo material raro. Alternativa a los núcleos de propulsor — crea variedad en los drops raros. El jugador no sabe cuál caerá, lo que añade imprevisibilidad positiva. |

---

#### M-08 — Residuo de Plasma

| Campo | Valor |
|-------|-------|
| **internalKey** | `plasma_residue` |
| **displayName** | Residuo de Plasma |
| **Tipo** | Material |
| **Rarity** | RARE |
| **Stackable** | Sí |
| **baseValue** | 48 CC |
| **Descripción** | Depósito solidificado de cañón de plasma inactivo. Inestable a temperatura ambiente. Se maneja con guantes, si los tienes. |
| **iconKey** | `icon_plasma_residue` |
| **Rol en el loop** | Tercer material raro. El jugador en el nivel 1–3 siente que los materiales raros son valiosos pero alcanzables. Tres raros distintos previenen la monotonía. |

---

#### M-09 — Interfaz Neural Fragmentada

| Campo | Valor |
|-------|-------|
| **internalKey** | `neural_interface_fragment` |
| **displayName** | Interfaz Neural Fragmentada |
| **Tipo** | Material |
| **Rarity** | EPIC |
| **Stackable** | Sí |
| **baseValue** | 180 CC |
| **Descripción** | Segmento de una interfaz de control mental de mando. La mitad de los circuitos están quemados. La otra mitad todavía registra algo. |
| **iconKey** | `icon_neural_interface_fragment` |
| **Rol en el loop** | Material épico. Aparece en muy pocas runs. El primer drop de un EPIC es un evento — el jugador lo nota inmediatamente por el valor base. Reservado para runs largas con alto peligro. Futuro: componente de crafteos legendarios. |

---

#### M-10 — Núcleo de Singularidad Inerte

| Campo | Valor |
|-------|-------|
| **internalKey** | `inert_singularity_core` |
| **displayName** | Núcleo de Singularidad Inerte |
| **Tipo** | Material |
| **Rarity** | LEGENDARY |
| **Stackable** | Sí |
| **baseValue** | 600 CC |
| **Descripción** | Un punto de colapso gravitatorio estabilizado artificialmente. Nadie sabe cómo funciona. Nadie se atreve a abrirlo. |
| **iconKey** | `icon_singularity_core` |
| **Rol en el loop** | Material legendario. Extremadamente raro — aparece quizá una vez en 20–30 runs de nivel alto. Crea una historia para contar: "una vez encontré uno". Futuro: componente único de crafteos excepcionales. |

---

### Equipo (7 items)

#### E-01 — Casco de Trabajo Básico *(equipo inicial)*

| Campo | Valor |
|-------|-------|
| **internalKey** | `basic_work_helmet` |
| **displayName** | Casco de Trabajo Básico |
| **Tipo** | Equipo |
| **Slot** | HEAD |
| **Rarity** | COMMON |
| **Stackable** | No |
| **baseValue** | 15 CC |
| **Descripción** | El casco estándar de operaciones de desguace. Abollado, con la visera rayada, pero sigue siendo mejor que nada. |
| **iconKey** | `icon_helmet_basic` |
| **Stats** | `lootMultiplier: +0%` — neutral. Sin bonus. Es el punto de partida, no la meta. |
| **Rol en el loop** | El jugador comienza equipado con este item. Permite iniciar runs sin estar en blanco. Establece el baseline del equipo HEAD. |

---

#### E-02 — Casco de Exploración Reforzado

| Campo | Valor |
|-------|-------|
| **internalKey** | `reinforced_explorer_helmet` |
| **displayName** | Casco de Exploración Reforzado |
| **Tipo** | Equipo |
| **Slot** | HEAD |
| **Rarity** | UNCOMMON |
| **Stackable** | No |
| **baseValue** | 80 CC |
| **Descripción** | Modelo mejorado con sensores integrados de peligro estructural. Detecta resonancias antes de que el ojo las vea. |
| **iconKey** | `icon_helmet_reinforced` |
| **Stats** | `dangerResistance: +8%` — reduce la velocidad efectiva de crecimiento del peligro. |
| **Rol en el loop** | Primera mejora visible de HEAD. El primer UNCOMMON que cae en las primeras 3 runs es probablemente este item. El jugador siente el upgrade. |

---

#### E-03 — Traje de Extracción Estándar

| Campo | Valor |
|-------|-------|
| **internalKey** | `standard_extraction_suit` |
| **displayName** | Traje de Extracción Estándar |
| **Tipo** | Equipo |
| **Slot** | BODY |
| **Rarity** | COMMON |
| **Stackable** | No |
| **baseValue** | 20 CC |
| **Descripción** | Mono de trabajo de polímero resistente. Sin presurización, sin climatización. Hace lo mínimo para que la expedición no te mate al instante. |
| **iconKey** | `icon_suit_standard` |
| **Stats** | `dangerResistance: +3%` — leve reducción del peligro percibido. |
| **Rol en el loop** | Equipo BODY disponible desde el primer drop con algo de suerte. Si el jugador no lo tiene, el slot BODY está vacío y no hay ningún bonus aplicado. No es el item de inicio — para eso está el casco. |

---

#### E-04 — Traje de Blindaje Liviano

| Campo | Valor |
|-------|-------|
| **internalKey** | `light_armor_suit` |
| **displayName** | Traje de Blindaje Liviano |
| **Tipo** | Equipo |
| **Slot** | BODY |
| **Rarity** | UNCOMMON |
| **Stackable** | No |
| **baseValue** | 95 CC |
| **Descripción** | Traje con placas insertadas en hombros y torso. No detiene un impacto directo, pero absorbe las ondas de presión de una explosión cercana. |
| **iconKey** | `icon_suit_light_armor` |
| **Stats** | `dangerResistance: +12%` — mejora notable frente al estándar. |
| **Rol en el loop** | Upgrade claro de BODY. Combinado con el casco reforzado, el jugador ya tiene una defensa perceptible. El peligro crece más lento en las runs — el jugador nota la diferencia. |

---

#### E-05 — Guantes de Trabajo Industrial

| Campo | Valor |
|-------|-------|
| **internalKey** | `industrial_work_gloves` |
| **displayName** | Guantes de Trabajo Industrial |
| **Tipo** | Equipo |
| **Slot** | HANDS |
| **Rarity** | COMMON |
| **Stackable** | No |
| **baseValue** | 12 CC |
| **Descripción** | Guantes reforzados con grafeno sintético. Permiten manipular piezas calientes, cortantes o irradiadas sin consecuencias inmediatas. |
| **iconKey** | `icon_gloves_industrial` |
| **Stats** | `lootMultiplier: +5%` — pequeño bonus de recolección. |
| **Rol en el loop** | El bonus de loot más accesible. El jugador lo busca para sus primeras mejoras de eficiencia. Hace que el slot HANDS sea relevante desde el principio. |

---

#### E-06 — Cortador Térmico Portátil

| Campo | Valor |
|-------|-------|
| **internalKey** | `portable_thermal_cutter` |
| **displayName** | Cortador Térmico Portátil |
| **Tipo** | Equipo |
| **Slot** | TOOL_PRIMARY |
| **Rarity** | UNCOMMON |
| **Stackable** | No |
| **baseValue** | 120 CC |
| **Descripción** | Herramienta de corte por haz térmico concentrado. Permite desmontar secciones de nave que de otra forma tomarían el doble de tiempo. |
| **iconKey** | `icon_tool_thermal_cutter` |
| **Stats** | `lootMultiplier: +15%` — bonus de loot significativo. |
| **Rol en el loop** | La primera herramienta UNCOMMON es el upgrade más impactante de loot disponible en MVP. El slot TOOL_PRIMARY es el más importante para la eficiencia de extracción. Su ausencia es notoria. |

---

#### E-07 — Mochila de Carga Ampliada

| Campo | Valor |
|-------|-------|
| **internalKey** | `extended_cargo_backpack` |
| **displayName** | Mochila de Carga Ampliada |
| **Tipo** | Equipo |
| **Slot** | BACKPACK |
| **Rarity** | UNCOMMON |
| **Stackable** | No |
| **baseValue** | 90 CC |
| **Descripción** | Estructura de transporte modular con compartimentos extensibles. Cabe más de lo que parece razonable. |
| **iconKey** | `icon_backpack_extended` |
| **Stats** | `backpackCapacity: +30%` — aumenta el multiplicador de cantidad base de todos los materiales. |
| **Rol en el loop** | El upgrade de BACKPACK es el que más impacta visualmente al loot total. El jugador ve números crecer más rápido. Refuerza la fantasía de "soy más eficiente con mejor equipo". |

---

## 6. Equipo inicial del jugador

Al crear su cuenta, el jugador comienza con exactamente este estado de equipo:

| Slot | Item equipado | Por qué |
|------|--------------|---------|
| HEAD | `basic_work_helmet` | El jugador no puede comenzar sin ningún rango de equipo — el slot HEAD vacío es desangelado. El casco básico establece el baseline sin dar ventaja. |
| BODY | Vacío | El slot BODY vacío desde el inicio crea la primera meta visible: "necesito un traje". |
| HANDS | Vacío | Ídem — el jugador busca guantes en sus primeras runs. |
| TOOL_PRIMARY | Vacío | El slot de herramienta es el más impactante de loot — su ausencia inicial refuerza que conseguirlo es un logro. |
| TOOL_SECONDARY | Vacío | Sin contenido en MVP para este slot. Reservado para Fase 1. |
| BACKPACK | Vacío | La mochila ampliada es el primer gran upgrade de volumen. Empezar sin ella hace que conseguirla se sienta bien. |

**El `basic_work_helmet` también existe en el inventario del jugador como `InventoryItem` con `quantity: 1`.** El equipo en slots y los items del inventario son entidades separadas — el helmet está tanto equipado como disponible en el inventario.

**Stats iniciales efectivos del chatarrero:**
- `lootMultiplier`: 1.0 (base, sin bonus)
- `dangerResistance`: 0% (base, sin bonus)
- `backpackCapacity`: 1.0 (base, sin bonus)

---

## 7. Slots de equipo del MVP

| Slot canónico | displayName | Propósito | Tipos de item que acepta |
|---------------|-------------|-----------|--------------------------|
| `HEAD` | Cabeza | Resistencia al peligro. El chatarrero necesita ver dónde va. | Cascos, viseras, sensores de exploración |
| `BODY` | Cuerpo | Resistencia al peligro y protección general. | Trajes, armaduras, exoesqueletos |
| `HANDS` | Manos | Eficiencia de recolección. Las manos hacen el trabajo. | Guantes, manipuladores, prótesis |
| `TOOL_PRIMARY` | Herramienta Principal | Multiplicador de loot. La herramienta define cuánto extraes. | Cortadores, escáneres, extractores |
| `TOOL_SECONDARY` | Herramienta Secundaria | Reservado — sin items en MVP. No mostrar como slot disponible en UI del MVP. | — |
| `BACKPACK` | Mochila | Capacidad de carga. Define cuánto cabe en cada run. | Mochilas, contenedores, módulos de carga |

> **`TOOL_SECONDARY`:** El slot existe en la DB desde el inicio (está en el schema como parte de `EquipmentSlot`) para no requerir migración en Fase 1. Pero no hay items para él en MVP y no debe mostrarse en la UI.

---

## 8. Loot table inicial de la zona

### Zona: `shipyard_cemetery`

La loot table define qué items pueden caer como drops de equipo en una extracción. Los materiales se calculan mediante las fórmulas del calculador con `baseLootPerSecond` — no están en la loot table.

**La loot table aplica solo a drops de equipo.** Los materiales M-01 a M-10 caen mediante el sistema de cálculo continuo (cantidad por tiempo).

#### Drops de equipo (loot table de ítems de equipo)

Se evalúa una vez por extracción. El sistema hace N tiradas según la duración de la run y el nivel de peligro alcanzado.

| Item | `internalKey` | Rarity | Peso relativo | Probabilidad por run de 5 min | Notas |
|------|---------------|--------|---------------|-------------------------------|-------|
| Traje de Extracción Estándar | `standard_extraction_suit` | COMMON | 40 | ~60% | Común — el jugador lo consigue rápido |
| Guantes de Trabajo Industrial | `industrial_work_gloves` | COMMON | 35 | ~50% | Ibid. — slot HANDS viable temprano |
| Casco de Exploración Reforzado | `reinforced_explorer_helmet` | UNCOMMON | 15 | ~25% | El primer UNCOMMON deseable |
| Traje de Blindaje Liviano | `light_armor_suit` | UNCOMMON | 10 | ~17% | Segundo UNCOMMON — complemento del casco |
| Mochila de Carga Ampliada | `extended_cargo_backpack` | UNCOMMON | 10 | ~17% | Tercer UNCOMMON — muy buscado |
| Cortador Térmico Portátil | `portable_thermal_cutter` | UNCOMMON | 8 | ~13% | Herramienta — el upgrade más impactante |
| — | — | RARE | — | ~5% total | En MVP la zona inicial no dropea equipo RARE — el espacio de drops raros es de materiales |
| — | — | EPIC/LEGENDARY | — | 0% | No dropean equipo EPIC/LEGENDARY en zona inicial |

> **Nota sobre los pesos:** Los pesos son relativos entre sí, no probabilidades directas. El sistema tira un dado ponderado. Si `standard_extraction_suit` tiene peso 40 y `reinforced_explorer_helmet` tiene peso 15 sobre un total de 118, la probabilidad del casco reforzado es 15/118 = ~12.7% por tirada. La probabilidad por run depende del número de tiradas.

**Número de tiradas de equipo por run:**
- Run de < 2 minutos: 0 tiradas (demasiado corta para drops de equipo)
- Run de 2–4 minutos: 1 tirada
- Run de 4–7 minutos: 2 tiradas
- Run de > 7 minutos: 3 tiradas
- Run con nivel de peligro > 0.75 al extraer: +1 tirada extra (bonus de riesgo)

#### Drops de materiales raros (loot table especial)

Los materiales RARE, EPIC y LEGENDARY no caen por el sistema continuo — tienen su propia tabla de drops evaluada por separado.

| Item | `internalKey` | Rarity | Drops por run (cantidad) | Probabilidad |
|------|---------------|--------|--------------------------|--------------|
| Núcleo de Propulsor | `thruster_core` | RARE | 1–3 | 18% por run de 4+ min |
| Placa de Blindaje Primaria | `primary_armor_plate` | RARE | 1–2 | 15% por run de 4+ min |
| Residuo de Plasma | `plasma_residue` | RARE | 1–2 | 12% por run de 4+ min |
| Interfaz Neural Fragmentada | `neural_interface_fragment` | EPIC | 1 | 4% por run de 6+ min |
| Núcleo de Singularidad Inerte | `inert_singularity_core` | LEGENDARY | 1 | 0.5% por run de 7+ min |

> Los drops raros se calculan al resolver la extracción, junto con los materiales continuos. Las probabilidades son independientes entre sí — pueden caer varios raros en la misma run.

---

## 9. Recompensas de extracción

### Extracción exitosa (sin catástrofe)

| Recompensa | Fórmula base | Ejemplo: 5 min, 50% peligro |
|-----------|-------------|----------------------------|
| **Loot de materiales** | `baseLootPerSecond × elapsed × dangerBonus × equipmentMultiplier` | Ver tabla sección 4 |
| **Drops de equipo** | Loot table — 2 tiradas a 5 min | 1 item de equipo esperado |
| **Créditos (CC)** | `45 CC/min × elapsed × dangerBonus × equipmentMultiplier` | ~225 CC |
| **XP** | `3.5 XP/seg × elapsed × dangerBonus × levelPenalty` | ~1.050 XP |

**`dangerBonus`:** `1 + (0.80 × dangerLevel)`. Con peligro al 50%: ×1.40. Con peligro al 90%: ×1.72.

**`equipmentMultiplier` para créditos y materiales:** suma de todos los `lootMultiplier` de los items equipados + 1.0 base. Ejemplo con guantes (+5%) y cortador térmico (+15%): ×1.20.

**`levelPenalty` para XP:** reduce la XP ganada para niveles altos en la zona inicial. Un jugador nivel 8 gana solo el 40% de la XP calculada en el Cementerio de Naves — sus runs en esta zona ya no son un desafío.

### Extracción con catástrofe (FAILED)

| Recompensa | Modificador | Notas |
|-----------|------------|-------|
| **Loot de materiales** | 20% del loot calculado | Redondeado hacia abajo. Mínimo 0 unidades por item. |
| **Drops de equipo** | 0 tiradas | No hay drops de equipo en runs fallidas |
| **Créditos (CC)** | 0 CC | La catástrofe nunca da créditos |
| **XP** | 25% de la XP calculada | La run fallida siempre aporta algo a la progresión |

**Resultado esperado de una run fallida de 5 minutos (ejemplo):**
- ~36 Chatarra Metálica (20% de ~180)
- ~11 Células de Energía (20% de ~54)
- ~6 Componentes Reciclados (20% de ~29)
- ~1 Cristal Corrupto (20% de ~7)
- 0 CC
- ~262 XP (25% de ~1.050)

---

## 10. Recuperación por catástrofe

### Qué se pierde

| Qué | Pérdida |
|-----|---------|
| Loot de materiales | 80% — el jugador conserva solo el 20% |
| Drops de equipo | 100% — ningún drop de equipo en runs fallidas |
| Créditos de la run | 100% — 0 CC de una run catastrófica |
| XP extra de la run | 75% — solo el 25% base |

### Qué se conserva siempre (invariante)

| Qué | Estado |
|-----|--------|
| Inventario existente antes de la run | Intacto. Una catástrofe **nunca** toca el inventario previo |
| Equipo equipado | Intacto. No se daña ni se pierde equipo |
| Balance de créditos previo a la run | Intacto. Solo se pierde el CC que habría ganado en esta run |
| Nivel y XP acumulados previamente | Intactos. No hay regresión de nivel |
| Las runs de historial anteriores | Intactas. El historial es inmutable |

**Mensaje de catástrofe (texto de UI sugerido):**
> "DESASTRE — El Cementerio de Naves se desestabilizó antes de que pudieras salir. Tu chatarrero escapó por poco. Recuperaste el 20% del botín acumulado."

**Primer fallo del jugador — mensaje adicional:**
> "Demasiado tarde esta vez. La barra de peligro llegó al máximo. Extrae antes de que sea tarde — el peligro crece cada segundo."

---

## 11. Primeros drops importantes que el jugador debería ver

### En la Run 1

**Objetivo:** El jugador ve que el loop funciona. Obtiene materiales visibles. No frustrarlo.

| Qué debe pasar | Por qué |
|----------------|---------|
| 80–150 Chatarra Metálica | Volumen visible. El inventario ya no está vacío. |
| 20–40 Células de Energía | Un segundo material le da variedad |
| 5–15 Componentes Reciclados | Primer UNCOMMON material — el jugador ve que hay más de 2 tipos |
| 0–2 Cristales Corruptos | Puede que no caigan. Si caen, son bonus bienvenido. |
| 1 item de equipo con probabilidad ~60% | Con suerte el Traje de Extracción o los Guantes. El drop no está garantizado en run 1. |
| 150–200 CC | Cantidad legible. Hace que la run parezca provechosa. |
| ~700–900 XP | Suficiente para sentir que el nivel va a subir pronto |

> Si la run 1 termina por catástrofe (jugador nuevo que no extrajo a tiempo), el único mensaje negativo es el tono — los números del 20% todavía muestran que algo se ganó.

---

### En las primeras 3 runs

**Objetivo:** El jugador tiene su primer item de equipo equipado. Ve que el inventario crece. Ve diferencia entre runs.

| Qué debe haber ocurrido | Por qué |
|------------------------|---------|
| Al menos 1 drop de equipo COMMON equipado (Traje o Guantes) | El jugador vive el loop de "equipa mejoras entre runs" |
| Al menos 1 drop de equipo UNCOMMON (con alta probabilidad) | El primer UNCOMMON es el gancho de progresión — debe llegar antes del run 3 |
| Suficiente chatarra para que el inventario se vea semi-lleno | Da sensación de progresión acumulada |
| 1–2 drops de materiales RARE (Núcleo de Propulsor u otro) | El jugador descubre que existen materiales más valiosos |
| XP suficiente para subir al nivel 2 | Subir de nivel en las primeras 3 runs es esencial para la retención |

---

### En las primeras 10 runs

**Objetivo:** El jugador tiene equipo en la mayoría de slots. Conoce el timing de la zona. Tiene materiales raros en su inventario.

| Qué debe haber ocurrido | Por qué |
|------------------------|---------|
| Casco reforzado equipado (HEAD upgrade) | El slot HEAD tiene un item que mejora el peligro |
| Slot BODY con traje (estándar o de blindaje) | El jugador cubre los slots básicos de supervivencia |
| Guantes equipados en HANDS | El lootMultiplier base está activo |
| Al menos 1 UNCOMMON de herramienta o mochila | La eficiencia de extracción o carga ha mejorado notablemente |
| Varios stacks de materiales RARE acumulados | El inventario contiene items de valor real que "guardar" para Fase 1 |
| Nivel 3–4 del chatarrero alcanzado | La curva de XP permite 3–5 runs por nivel en los primeros niveles |
| Al menos 1 run con catástrofe (probablemente 2–3) | Las catástrofes enseñan timing. Las primeras están diseñadas para ocurrir. |
| Conocimiento empírico del timing óptimo | Alrededor de run 6–8, el jugador experto empieza a extraer consistentemente antes del 90% |

---

## 12. Stats del chatarrero en el MVP

### `lootMultiplier`

| Campo | Descripción |
|-------|-------------|
| **Qué es** | Multiplicador de la cantidad de materiales (y CC) obtenidos por la run. Un valor de 1.20 significa +20% de todo el loot. |
| **Dónde impacta** | `computePendingLoot()` y `computeCurrencyReward()` en `RunCalculator`. Se aplica sobre el loot calculado antes de finalizar la transacción. |
| **Cómo se calcula** | `1.0 + sum(lootMultiplier bonus de cada item equipado)` |
| **Estado en MVP** | ✅ Activo. Es el stat más impactante en el MVPy debe funcionar desde el primer slot con bonus. |
| **Ejemplos de bonus** | Guantes industriales: +5%. Cortador térmico: +15%. Mochila ampliada: impacta via `backpackCapacity`, no aquí. |

---

### `dangerResistance`

| Campo | Descripción |
|-------|-------------|
| **Qué es** | Porcentaje de reducción efectiva en la velocidad de crecimiento del peligro. Un valor de 0.10 (10%) hace que el peligro crezca como si el jugador llevara menos tiempo en la zona. |
| **Dónde impacta** | `computeDangerLevel()` en `RunCalculator`. Se aplica como modificador del tiempo efectivo: `elapsedEffective = elapsed × (1 - dangerResistance)`. |
| **Cómo se calcula** | `sum(dangerResistance bonus de cada item equipado)`. No se suman más del 50% en MVP (cap de resistencia). |
| **Estado en MVP** | ✅ Activo. Hace que el equipo de protección cambie perceptiblemente la experiencia de las runs. |
| **Ejemplos de bonus** | Traje estándar: +3%. Casco reforzado: +8%. Traje de blindaje liviano: +12%. |
| **Cap en MVP** | Máximo 50% de resistencia. Con todo el equipo de protección disponible en MVP: HEAD (8%) + BODY (12%) = 20% máximo en MVP — lejos del cap. |

---

### `backpackCapacity`

| Campo | Descripción |
|-------|-------------|
| **Qué es** | Multiplicador de la cantidad base de todos los materiales. Un valor de 1.30 significa +30% de todas las cantidades de loot de material. |
| **Dónde impacta** | `computePendingLoot()` en `RunCalculator`. Se aplica multiplicativamente con `lootMultiplier`. |
| **Cómo se calcula** | `1.0 + sum(backpackCapacity bonus de cada item equipado)`. En MVP solo el slot BACKPACK contribuye a este stat. |
| **Estado en MVP** | ✅ Activo. La mochila ampliada es el upgrade más visible de volumen de materiales. |
| **Ejemplos de bonus** | Mochila de Carga Ampliada: +30%. Sin mochila: ×1.0 (sin bonus). |

---

### Stats reservados para Fase 1+

| Stat | Descripción | Estado |
|------|-------------|--------|
| `extractionSpeedBonus` | Reduciría el tiempo de procesamiento del servidor al extraer. No tiene valor en MVP (la extracción es instantánea). | 🔲 Reservado Fase 1 |
| `rarityBonus` | Aumentaría la probabilidad de drops de mayor rareza. Requiere rediseño de la loot table con modificadores. | 🔲 Reservado Fase 1 |
| `criticalExtraction` | Probabilidad de obtener el doble de loot en una extracción exitosa. | 🔲 Reservado Fase 2 |
| `hazardVision` | Alertas tempranas de picos de peligro antes de que ocurran. | 🔲 Reservado Fase 1 |

---

## 13. Tabla de rarezas del MVP

| Rarity | Color UI | Intención de diseño | Frecuencia esperada |
|--------|----------|---------------------|--------------------|
| **COMMON** | Gris (#9CA3AF) | El volumen del juego. Lo que el jugador siempre obtiene. No es emocionante, pero es el fundamento de la economía. | Siempre. En toda run de cualquier duración. |
| **UNCOMMON** | Verde (#22C55E) | El primer paso de mejora. Crea momentos de satisfacción frecuentes. El jugador busca UNCOMMON items para sus slots. | 1–2 por run estándar de equipo. Los materiales UNCOMMON caen con frecuencia moderada. |
| **RARE** | Azul (#3B82F6) | Un evento en la run. El jugador nota el drop. Los materiales RARE tienen valor base significativo. | 15–18% por run de duración media para materiales. Para equipo: 0% en zona inicial (solo materiales RARE). |
| **EPIC** | Púrpura (#A855F7) | Un evento de sesión. El jugador recuerda el día que cayó un EPIC. | ~4% por run de duración alta (6+ min). |
| **LEGENDARY** | Dorado (#EAB308) | Un evento de vida. Genera contenido para contar. Extreme raridad justificada. | ~0.5% por run de duración máxima en nivel avanzado. |

**Regla de color:** los colores definidos aquí son los colores canónicos para toda la UI. No cambiarlos por ítem — la rareza tiene su propio color, no cada item el suyo. Los colores de rareza son la señal universal al jugador de la calidad de un drop.

---

## 14. Principios para nombrar futuros items y zonas

### Tono general

El universo de Scrap & Survive es post-industrial espacial desgastado. La nomenclatura evoca:
- **Funcionalidad sobre elegancia:** "Cortador Térmico Portátil", no "Espada de Fuego del Vacío".
- **Origen industrial o de recuperación:** los items no son manufacturados nuevos — son recuperados, modificados y reutilizados.
- **Escala humana:** no hay items "divinos" ni "legendarios" en el sentido épico — son simplemente muy raros o muy difíciles de encontrar.
- **Español neutro:** sin regionalismos. Terminología técnica accesible.

### Materiales — patrón de nombre

`[Tipo de material] [Descriptor de origen o condición]`

Ejemplos válidos:
- Chatarra Metálica ✓
- Residuo de Plasma ✓
- Célula de Energía Agotada ✓
- Núcleo de Propulsor Quemado ✓

Ejemplos inválidos:
- Esencia Mágica ✗ (tono incorrecto)
- Super Cristal de Poder ✗ (demasiado genérico / no coherente)
- Materium ✗ (sin contexto comprensible)

### Equipo — patrón de nombre

`[Adjetivo de calidad o uso] [Tipo de objeto]` o `[Tipo] de [Función]`

Ejemplos válidos:
- Casco de Exploración Reforzado ✓
- Traje de Extracción Estándar ✓
- Mochila de Carga Ampliada ✓
- Cortador Térmico Portátil ✓

Ejemplos inválidos:
- Armadura de Dragón ✗
- Guantes +3 ✗
- Herramienta Mágica ✗

### Zonas — patrón de nombre

`[Descriptor geográfico o tipo] de [Sustantivo específico]`

Ejemplos válidos:
- Cementerio de Naves ✓
- Depósito de Combustible Abandonado ✓
- Ruinas de la Estación Kappa-7 ✓
- Cinturón de Escombros Sector 9 ✓

Ejemplos inválidos:
- Dungeon oscuro ✗
- Nivel 2 ✗
- Mapa de hielo ✗

### Consistencia de sufijos

| Uso | Patrón de sufijo |
|-----|------------------|
| Item de tier bajo | "Básico", "Estándar", "De Trabajo" |
| Item de tier medio | "Reforzado", "Ampliado", "Portátil", "Industrial" |
| Item de tier alto | "De Alta Precisión", "Blindado", "De Ingeniería" |
| Material de zona inicial | Sin adjetivo o con adjetivo de degradación ("Corrupto", "Fragmentado", "Quemado") |
| Material de zona avanzada | Adjetivos de potencia ("Estabilizado", "Purificado", "Cargado") |

---

## 15. Restricciones del content seed del MVP

### Qué no existe todavía

| Qué | Por qué no existe |
|-----|-------------------|
| Segunda zona | Solo `shipyard_cemetery` en MVP |
| Items para `TOOL_SECONDARY` | El slot existe en DB pero no tiene contenido |
| Recipes de crafting | El sistema de crafting es Fase 1 |
| Items de consumible | No hay sistema de consumibles |
| Items de quest | No hay sistema de quests |
| Equipo de rareza RARE, EPIC o LEGENDARY | En MVP la escasez de drops raros aplica solo a materiales; el equipo tope es UNCOMMON |
| Vendedores y sus inventarios | Los vendors son Fase 1 |
| Items de cosmético | Fase 2 |
| Items de suscripción premium | Fase 2 |
| Items que otorguen `extractionSpeedBonus`, `rarityBonus` o `criticalExtraction` | Esos stats no son funcionales en MVP |
| Zonas de evento temporales | Fase 2 |
| Items de nivel ≥ 5 en la zona inicial | El contenido de MVP está calibrado para niveles 1–5 |

### Qué no se debe sembrar en la DB del MVP

| Prohibición | Motivo |
|-------------|--------|
| Más de 17 ItemDefinitions | El catálogo actual es suficiente. Añadir items sin contenido que los use produce confusión. |
| Items con `validSlots: ["TOOL_SECONDARY"]` | No hay contenido de slot secundario — genera slots vacíos sin forma de llenarlos |
| ItemDefinitions con `isEquipable: false` y rareza EPIC o LEGENDARY que NO estén en la loot table | Items que nunca pueden obtenerse no deben existir en DB del MVP |
| Más de una zona activa | Una sola zona en MVP. Si `ZoneConfig` tiene más de una entrada activa, habrá opciones en la UI que no están especificadas |
| Items con `baseValue > 600 CC` | El Núcleo de Singularidad Inerte es el item más valioso del MVP. Superar ese valor es escalar fuera del rango validado |
| Items con `lootMultiplier > 0.30` | El Cortador Térmico (+15%) es el bonus de loot máximo en MVP. El doble de eso rompe el balance del calculador |
| Items con `dangerResistance > 0.20` | El cap de MVP es 20% de resistencia total. Un item que lo supere solo destruye la curva de peligro |

---

## Apéndice A: Resumen de Item Definitions (referencia rápida)

| # | internalKey | displayName | Tipo | Slot | Rarity | Stackable | baseValue |
|---|-------------|-------------|------|------|--------|-----------|-----------|
| M-01 | `scrap_metal` | Chatarra Metálica | Material | — | COMMON | Sí | 1 CC |
| M-02 | `energy_cell` | Célula de Energía | Material | — | COMMON | Sí | 4 CC |
| M-03 | `recycled_component` | Componente Reciclado | Material | — | UNCOMMON | Sí | 12 CC |
| M-04 | `corrupted_crystal` | Cristal Corrupto | Material | — | UNCOMMON | Sí | 20 CC |
| M-05 | `armor_fiber` | Fibra de Blindaje | Material | — | UNCOMMON | Sí | 10 CC |
| M-06 | `thruster_core` | Núcleo de Propulsor | Material | — | RARE | Sí | 55 CC |
| M-07 | `primary_armor_plate` | Placa de Blindaje Primaria | Material | — | RARE | Sí | 65 CC |
| M-08 | `plasma_residue` | Residuo de Plasma | Material | — | RARE | Sí | 48 CC |
| M-09 | `neural_interface_fragment` | Interfaz Neural Fragmentada | Material | — | EPIC | Sí | 180 CC |
| M-10 | `inert_singularity_core` | Núcleo de Singularidad Inerte | Material | — | LEGENDARY | Sí | 600 CC |
| E-01 | `basic_work_helmet` | Casco de Trabajo Básico | Equipo | HEAD | COMMON | No | 15 CC |
| E-02 | `reinforced_explorer_helmet` | Casco de Exploración Reforzado | Equipo | HEAD | UNCOMMON | No | 80 CC |
| E-03 | `standard_extraction_suit` | Traje de Extracción Estándar | Equipo | BODY | COMMON | No | 20 CC |
| E-04 | `light_armor_suit` | Traje de Blindaje Liviano | Equipo | BODY | UNCOMMON | No | 95 CC |
| E-05 | `industrial_work_gloves` | Guantes de Trabajo Industrial | Equipo | HANDS | COMMON | No | 12 CC |
| E-06 | `portable_thermal_cutter` | Cortador Térmico Portátil | Equipo | TOOL_PRIMARY | UNCOMMON | No | 120 CC |
| E-07 | `extended_cargo_backpack` | Mochila de Carga Ampliada | Equipo | BACKPACK | UNCOMMON | No | 90 CC |

---

## Apéndice B: Stats de equipo por item (referencia para seeding)

| internalKey | `lootMultiplier` | `dangerResistance` | `backpackCapacity` |
|-------------|-----------------|--------------------|--------------------|
| `basic_work_helmet` | +0% | +0% | +0% |
| `reinforced_explorer_helmet` | +0% | +8% | +0% |
| `standard_extraction_suit` | +0% | +3% | +0% |
| `light_armor_suit` | +0% | +12% | +0% |
| `industrial_work_gloves` | +5% | +0% | +0% |
| `portable_thermal_cutter` | +15% | +0% | +0% |
| `extended_cargo_backpack` | +0% | +0% | +30% |

---

## Apéndice C: Combinación óptima de equipo en MVP

Si el jugador consigue todos los UNCOMMON disponibles y los equipa, sus stats son:

| Stat | Valor máximo con equipo UNCOMMON completo |
|------|------------------------------------------|
| `lootMultiplier` | 1.0 + 0.05 (guantes) + 0.15 (cortador) = **×1.20** (+20%) |
| `dangerResistance` | 0% + 8% (casco) + 12% (traje) = **20%** (peligro crece 20% más lento) |
| `backpackCapacity` | 1.0 + 0.30 (mochila) = **×1.30** (+30% volumen de materiales) |

**Multiplicador total de loot en una run de 5 min con equipo completo y 60% peligro:**
- `dangerBonus`: 1 + (0.80 × 0.60) = ×1.48
- `lootMultiplier`: ×1.20
- `backpackCapacity`: ×1.30 (solo materiales)
- Loot total de materiales aprox.: ×1.48 × ×1.20 × ×1.30 ≈ **×2.31** respecto a sin equipo
- Créditos aprox.: ×1.48 × 1.20 ≈ **×1.78** respecto a sin equipo

Esta progresión es la recompensa visible de mejorar el equipo. El jugador con equipo UNCOMMON completo obtiene más del doble de materiales que el jugador con equipo básico. Eso justifica el loop de inventario.

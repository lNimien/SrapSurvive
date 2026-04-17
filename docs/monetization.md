# Scrap & Survive — Monetization Strategy

> **Status:** Documento de estrategia de monetización futura. No hay monetización en MVP.
> **Audiencia:** Product owner, desarrolladores, agentes IA en fases posteriores.
> **Autoridad:** Este documento, junto con `docs/game-design.md`, define las líneas rojas de monetización. Ningún agente IA puede implementar monetización que contradiga la sección 12 de este documento.
> **Referencia:** Compatible con `docs/architecture.md`, `docs/game-design.md`, `docs/balance-v0.md`.

---

## 1. Filosofía de monetización del proyecto

### El contrato con el jugador

Scrap & Survive es un juego que pide tiempo, atención y decisiones. El jugador invierte en el loop varias veces al día. Antes de poner un precio a cualquier cosa, hay una pregunta que debe responderse honestamente:

**¿Esto lo pagaría yo si fuera el jugador?**

Si la respuesta es "no, porque el juego funciona bien sin ello" — es un buen candidato a monetización. Si la respuesta es "no, porque el juego me lo está haciendo difícil artificialmente" — nunca se vende.

Esta distinción es la línea entre monetización sana y extracción. Scrap & Survive se posiciona completamente en el primer lado.

### Modelo mental de referencia

El referente no es Clash of Clans ni ningún gacha agresivo. El referente son juegos como:

- **Factorio:** compra directa, sin presión, sin efectos negativos para quien no paga.
- **Hades:** contenido completo de base, soporte con ediciones especiales voluntarias.
- **Old School RuneScape:** suscripción mensual que amplía la experiencia sin bloquear el contenido núcleo.
- **Vampire Survivors:** compra única barata que desbloquea contenido adicional no esencial.

El modelo de Scrap & Survive se orientará hacia una **suscripción de calidad de vida** + **cosméticos opcionales**, sin jamás vender ventaja gameplay directa.

### Premisa de producto web como side project

Scrap & Survive no tiene detrás un equipo de UA, inversión de riesgo ni presión de monetizar desde el lanzamiento. La monetización es secundaria a:

1. Que el juego sea bueno y retenga jugadores.
2. Que la arquitectura soporte monetización cuando llegue el momento.
3. Que la reputación del proyecto sea la de "un juego limpio".

**Si el juego no retiene, no tiene sentido monetizar.** La monetización se introduce cuando los jugadores quieran quedarse, no para que se queden.

---

## 2. Qué significa "monetización sana" para Scrap & Survive

| Criterio | Sí es sana | No es sana |
|----------|------------|------------|
| **Impacto en gameplay** | Cero. El jugador free tiene exactamente el mismo loop. | Cualquier ventaja estadística comprable directamente. |
| **Presión psicológica** | El jugador compra porque quiere, no porque el juego lo empuja. | Timers artificiales para presionar compras. Recursos escasos artificialmente. |
| **Proporción precio/valor** | El precio es justo para lo que ofrece. Comparable a un café. | Precios diseñados para crear FOMO o extraer whales. |
| **Reversibilidad** | El juego sigue siendo completo si el jugador deja de pagar. | El progreso desaparece al cancelar la suscripción. |
| **Transparencia** | El jugador sabe exactamente qué compra. Sin loot boxes con ítems de gameplay. | Sistemas opacos de probabilidad para obtener ventajas. |
| **Loop intacto** | La tensión del loop (riesgo/recompensa) es igual para todos. | El pago elimina la tensión del loop. |

**Resumen en una frase:** "Paga para mejorar la experiencia. No pagues para evitar el dolor que el juego creó artificialmente."

---

## 3. Qué está explícitamente prohibido monetizar

Las siguientes cosas **nunca se venderán** en ninguna fase de Scrap & Survive, independientemente de la presión comercial:

| Prohibición | Justificación |
|-------------|--------------|
| **Comprar loot directo** | El loop del juego es ganar loot en runs. Comprar loot es comprar el juego, no disfrutarlo. |
| **Reducir el nivel de peligro con dinero** | La tensión del peligro es el núcleo emocional del juego. Venderla es destruirlo. |
| **Comprar XP o niveles** | La progresión es la sensación de dominio. Comprarla la vacía de significado. |
| **Garantizar drops raros** | Los drops raros existen porque son raros. Vender la rareza elimina el event que los hace valiosos. |
| **Extender la zona sin catástrofe con dinero** | La catástrofe es la mecánica de riesgo central. Cancelarla con dinero convierte el juego en un idle sin tensión. |
| **Items de equipo exclusivos no obtenibles jugando** | El equipo mejor solo se obtiene jugando. El que paga tiene cosméticos, no ventaja estadística. |
| **Ventaja en rankings o comparaciones sociales** | Si se añaden rankings en el futuro, el dinero no puede dar ventaja en ellos. |
| **Energía / cooldowns artificiales desbloqueables con dinero** | En MVP no hay cooldowns. Si se añaden, serán de diseño, no para presionar compras. |
| **Segunda moneda premium que otorgue ventaja** | Si hubiera una moneda premium, sirve para cosméticos y calidad de vida, nunca para stats. |

---

## 4. Orden recomendado de monetización por fases

### MVP (Fase 0) — Sin monetización

**Objetivo:** Validar el loop. Retener jugadores. No hay nada que vender porque no hay nada que ofrecer que no sea el loop básico.

**Estado monetización:** 0. No hay ningún sistema de pago implementado. No hay botones de compra. No hay referencias a premium en la UI.

**Lo que sí se prepara técnicamente:** ver sección 11.

**Decisión:** Introducir monetización antes de validar retención sería un error de producto que distrae del objetivo real de Fase 0.

---

### Fase 1 — Suscripción VIP + primeros cosméticos opcionales

**Prerequisitos antes de activar monetización:**
- El juego tiene retención de día 7 superior al 25%.
- El juego tiene al menos una segunda zona disponible.
- Hay al menos 200 usuarios activos mensuales.

**Qué se introduce:**
- **Suscripción Scrapper VIP** — ver sección 6.
- **Pack cosmético de lanzamiento** — 3–5 skins de casco o traje, sin impacto en stats.
- **Historial extendido** — los últimos 100 runs en vez de los últimos 20, disponible para VIP.

**Cómo se presenta:** un badge "VIP" sutil en el perfil. Una pestaña de "Cosmetic Shop" vacía que claramente indica "próximamente" para free players. Sin spam, sin promos agresivas.

---

### Fase 2 — Contenido premium opcional

**Prerequisitos:**
- Al menos 3 zonas disponibles.
- Retención de día 30 superior al 15%.
- El juego se siente completo para un jugador free.

**Qué se introduce:**
- **Zonas de evento de acceso premium** — zonas temporales con mayor dificultad y mejores drops. El acceso cuesta, el resultado no está garantizado.
- **Pack de cosméticos avanzados** — iconos de items, tema oscuro alternativo del HUD, partículas sutiles en la pantalla de resultado.
- **Slot de carga de equipación** — guardar hasta 3 "loadouts" de equipo y restaurarlos con un click. Calidad de vida pura.

**Cómo se presenta:** Siempre opcional. Los jugadores free pueden progresar igual — simplemente tardan más en cambiar equipo.

---

### Fase 3 — Monetización madura

**Prerequisitos:**
- El juego tiene economía de Fase 2 funcionando.
- Los sinks están establecidos.
- Hay sistema de guilds o social mínimo.

**Qué se evalúa:**
- **Multi-run simultáneo** (VIP+ puede tener 2 runs activas si el sistema lo soporta).
- **Cosmético de nave** — si se añade una mini-visualización de la base del jugador.
- **Battle pass ligero estacional** — si la base de jugadores activos es suficiente para mantenerlo con contenido real.

**Nota sobre el Battle Pass:** Solo se implementa si hay contenido estacional real que justifique el sistema. Un battle pass sin contenido de temporada es solo presión por tiempo. No se introduce como mecanismo de retención artificial.

---

## 5. Opciones de monetización compatibles con el juego

### 5.1 Suscripción VIP

**Tipo:** Recurrente mensual / anual (con descuento).
**Precio referencia:** 3,99€/mes o 29,99€/año.
**Lo que da:** Ver sección 6.
**Lo que no da:** Ninguna ventaja de gameplay.
**Compatibilidad:** Alta. Es el modelo más limpio para idle games web.

---

### 5.2 Quality of Life Perks

Pequeñas mejoras de experiencia que el jugador aprecia pero que no son necesarias para disfrutar el juego.

| Perk | Descripción | Sin QoL (free) | Con QoL (VIP) |
|------|-------------|----------------|---------------|
| Historial extendido | Ver más de tus runs pasadas | Últimas 20 runs | Últimas 100 runs |
| Loadouts de equipo | Guardar configuraciones de equipo | Equipar manualmente | 3 loadouts guardados |
| Notificaciones de expedición | Aviso cuando la run está en zona roja | No disponible | Aviso browser/email |
| Dashboard de estadísticas | Métricas personales de rendimiento | Solo historial | XP/run, CC/run, tasa de éxito |

**Regla:** ningún QoL perk puede disminuir la experiencia del jugador free. El juego debe funcionar perfectamente sin ellos. El QoL debe ser "conveniente", no "necesario".

---

### 5.3 Cosméticos

Modificaciones visuales que no afectan stats. Ver sección 7.

**Tipos principales:**
- Skins de equipo del chatarrero
- Temas de color del HUD
- Iconos de items alternativos
- Efectos de extracción (animación de resultado diferente)
- Nombre de usuario con badge de estilo

**Regla:** todo cosmético debe ser claramente cosmético. Si hay duda de si un cosmético confunde al jugador sobre si tiene ventaja — no se vende.

---

### 5.4 Slots adicionales

Capacidades adicionales de gestión sin impacto en el loop de combat.

| Slot | Descripción | Justificación de venta |
|------|-------------|----------------------|
| Loadouts de equipo extra | 3 → 5 loadouts (VIP+) | Calidad de vida para optimizadores |
| Historial más largo | 100 → 250 runs | Para jugadores que analizan sus datos |
| Favoritos de items | Marcar items para no vender accidentalmente | QoL sin impacto en gameplay |

**Lo que nunca se vende como slot:** más capacidad de inventario en MVP. El inventario en MVP es ilimitado. Si en Fase 1 se añaden restricciones, la capacidad extra podría ser VIP — pero solo si el límite base es generoso.

---

### 5.5 Convenience Systems

Sistemas que hacen el juego más conveniente sin alterar el resultado de las runs.

| Sistema | Descripción | Restricción |
|---------|-------------|------------|
| Auto-equip sugerencias | El juego sugiere qué equipar según las stats (no lo hace automáticamente) | Solo sugerencia — la decisión siempre es del jugador |
| Export de historial | Descargar el historial de runs en CSV | Totalmente cosmético/análisis |
| Estadísticas avanzadas de zona | Ver patrones de tus runs en una zona concreta | Solo informativo |

**Lo que nunca se vende como convenience:** auto-extracción automática cuando el peligro llega al X%. Eso elimina la decisión del jugador, que es el núcleo del juego.

---

### 5.6 Contenido temporal

Zonas de evento accesibles durante un tiempo limitado.

**Modelo:** acceso de pago que permite entrar a la zona durante el evento. El drop rate y la dificultad de la zona son fijos — no hay ventaja adicional por pagar más.

**Regla:** las zonas de evento no deben contener items exclusivos de gameplay. Pueden tener cosméticos exclusivos del evento, pero el equipo de gameplay siempre es obtenible en zonas regulares.

**Riesgo a evitar:** eventos que crean FOMO extremo o que hacen sentir al jugador free que se está perdiendo algo crítico del juego.

---

## 6. Diseño preliminar de la Suscripción Scrapper VIP

### Propuesta de valor

La suscripción VIP no hace al jugador más poderoso. Hace el juego más cómodo de gestionar y más satisfactorio de analizar. Es la diferencia entre jugar en "modo normal" y jugar con "cámara adicional y estadísticas visibles".

### Qué incluye la Suscripción Scrapper VIP

| Feature | Descripción | Por qué está en VIP |
|---------|-------------|---------------------|
| **Badge VIP** | Distinción visual en el perfil (sin impacto en gameplay) | Identidad. El jugador quiere que se note que apoya el proyecto. |
| **Historial extendido** | Ver las últimas 100 runs en `/history` (vs 20 para free) | Calidad de vida. No afecta el loop. |
| **3 Loadouts de equipo** | Guardar y restaurar configuraciones de equipo | Reducción de fricción en el loop de gestión. |
| **Dashboard de estadísticas** | XP media por run, CC ganados totales, tasa de éxito, peligro medio, mejores runs | Los datos que el jugador analítico de todos modos querría. |
| **Notificaciones de expedición** | Alerta browser cuando el peligro supera el 75% si el jugador tiene el tab en background | Muy valorado sobre todo en idle games. Sin impacto en gameplay. |
| **Acceso anticipado a zonas de evento** | 48h de acceso antes que los free players en eventos futuros | Esto solo se activa en Fase 2. En Fase 1 VIP no incluye zonas de evento. |
| **Créditos de cosmético mensuales** | 200 "Créditos Cosméticos" por mes para gastar en la tienda de cosméticos | Hace que la suscripción tenga valor tangible sin dar ventaja. |

### Qué no incluye la Suscripción Scrapper VIP

| No incluye | Por qué no |
|------------|------------|
| Más loot por run | Rompe el balance entre jugadores |
| Menor peligro | Destruye la tensión del loop |
| Más tiradas de equipo | Ventaja directa de drops |
| XP adicional | Acelera la progresión de forma injusta |
| Acceso a equipo exclusivo de gameplay | El equipo de stats es democrático |
| Segunda run simultánea en Fase 1 | Demasiado impactante para Fase 1. Se evalúa en Fase 2+. |
| Garantía de drops | Las probabilidades son iguales para todos |

### Precio y estructura

| Plan | Precio | Descuento |
|------|--------|-----------|
| Mensual | 3,99€/mes | — |
| Anual | 29,99€/año | ~37% de descuento |

**Justificación del precio:** 3,99€ es el precio de un café. Para un jugador que juega varias veces por semana, es una inversión trivial si el juego le gusta. El precio no debe ser tan bajo que parezca que el juego no vale, ni tan alto que cree barrera.

### Cómo no romper el balance

1. **Nunca añadir a VIP algo que afecte el cálculo de runs.** El `RunCalculator` no sabe si el jugador es VIP. Los stats de la run son idénticos.
2. **Las notificaciones son información, no ventaja.** Saber que el peligro llegó al 75% no da más tiempo — el tiempo real es el mismo. Solo reduce la necesidad de mirar la pantalla constantemente.
3. **Los loadouts son conveniencia, no power.** El jugador free puede tener el mismo equipo — tarda más en equiparlo entre runs.
4. **Los créditos cosméticos compran apariencia, no poder.** La tienda de cosméticos no tiene ningún item con stats.

### Gestión de la cancelación

- Al cancelar: el jugador pierde acceso a los features VIP.
- El historial de runs no se borra — solo se limita la visualización a las 20 más recientes.
- Los loadouts guardados no se borran — no se pueden activar hasta reactivar VIP, pero tampoco se pierden.
- Los cosméticos desbloqueados permanecen. Siempre.

**Regla de oro de la cancelación:** cancelar la suscripción no puede sentirse como perder el progreso. Solo como perder conveniencias.

---

## 7. Diseño preliminar de cosméticos

### Filosofía de los cosméticos

Los cosméticos de Scrap & Survive deben ser:
- **Reconocibles en el universo del juego:** no hay skins de unicornio ni fantasía étnica. Todo encaja en la estética de chatarrero espacial post-industrial.
- **Accesibles en precio:** los cosméticos individuales deben costar menos que la suscripción mensual.
- **Ganables opcionalmente en juego:** algunos cosméticos deberían poder obtenerse por logros de gameplay (no comprados). Así el jugador free tiene acceso a algo especial.

### Tipos de cosméticos

#### Skins de equipo del chatarrero

Cambios de apariencia en la silhoueta del chatarrero visible en el `ScrapperCard` del dashboard.

| Ejemplo de skin | Descripción | Rareza cosmética |
|----------------|-------------|-----------------|
| Traje Oxidado Vintage | Versión envejecida y desgastada del traje base | Común cosmético |
| Casco de Soldadura Industrial | Visera de chispas, estilo obrero pesado | Poco común cosmético |
| Traje de Oficial de Explotación | Uniforme con insignias de rango, elegante y oscuro | Raro cosmético |

**Regla:** las skins no cambian los stats del equipo subyacente. Un `Casco de Trabajo Básico` con skin de "Casco de Soldadura" sigue teniendo los mismos stats del `Casco de Trabajo Básico`.

#### Temas del HUD

Paletas de color alternativas para la interfaz. El contenido es idéntico — solo cambian los colores y algunos elementos decorativos.

| Tema | Descripción |
|------|-------------|
| Terminal Verde (base) | El tema por defecto. Verde oscuro sobre negro. |
| Carbono Industrial | Grises y blancos sobre negro absoluto. Minimalismo extremo. |
| Alerta Roja | Rojos y naranjas. Evoca emergencia constante. |
| Azulado Criogénico | Azules fríos. Más tranquilo que el verde. |

#### Iconos de items alternativos

Versiones alternativas del icono visual de los materiales e items en el inventario. No cambian el nombre ni el valor — solo la imagen.

| Ejemplo | Descripción |
|---------|-------------|
| Chatarra Metálica — versión "Vintage" | Estilo dibujo técnico en lugar de flat icon |
| Célula de Energía — versión "Blueprint" | Wireframe azulado en lugar de icono estándar |

#### Efectos de extracción

Animaciones adicionales en la pantalla de resultado post-run. Solo visuales.

| Efecto | Descripción |
|--------|-------------|
| Estándar | Resultado aparece sin animación especial |
| Detonación de carga | Los items "explotan" desde el centro al aparecer |
| Escaneo de terminal | Los items se revelan como si se escanearan línea a línea |

#### Insignias de perfil

Badges que aparecen junto al nombre del jugador, obtenibles por:
- Compra directa (cosméticos)
- Logros de gameplay (runs sin catástrofe, niveles alcanzados, materiales acumulados)

Los badges de logros siempre son obtenibles gratis. Los badges exclusivos pueden ser de compra.

### Dónde viven los cosméticos en la UI

- **ScrapperCard (dashboard):** el avatar del chatarrero muestra la skin activa.
- **InventoryGrid:** los iconos de items usan el pack de iconos activo.
- **RunResultModal:** el efecto de extracción activo se aplica aquí.
- **Topbar del perfil:** el badge de perfil aparece junto al nombre.
- **HUD completo:** el tema de color se aplica a toda la app.

### Tienda de cosméticos (Fase 1)

- Accesible desde un nuevo item de nav (icono de paleta de colores).
- Los cosméticos se pagan con "Créditos Cosméticos" (CC★ — símbolo distinto a los Créditos de Chatarrero CC para evitar confusión).
- Los Créditos Cosméticos se obtienen comprándolos directamente o como bonus de la suscripción VIP (200 CC★/mes).
- **Nunca hay loot boxes de cosméticos.** El jugador ve exactamente qué compra antes de comprar.

---

## 8. Monetización de conveniencia

### Qué sí es conveniencia vendible

| Conveniencia | Por qué es aceptable |
|--------------|----------------------|
| Loadouts de equipo extra | Ahorran tiempo entre runs. El jugador free puede equipar manualmente. |
| Historial más largo | El jugador analítico quiere datos. El free player no necesita más de 20 runs. |
| Notificaciones de background | Evitan tener que estar mirando la pantalla. El gameplay es idéntico. |
| Estadísticas avanzadas | Los datos son suyos — pagan por visualizarlos mejor. |
| Acceso anticipado a zonas de evento | 48h de ventaja de tiempo de acceso, no de probabilidad. |

### Qué no es conveniencia vendible

| "Conveniencia" prohibida | Por qué está prohibida |
|--------------------------|------------------------|
| Auto-extracción automática | Elimina la decisión central del juego. |
| Reducir el tiempo de polling a 1s (vs 5s) | Daría información más rápida — ventaja real. |
| "Seguro de extracción" — garantizar loot aunque haya catástrofe | Destruye la penalización de riesgo. Si se implementa en Fase 1, es un item raro obtenible en juego, no comprado. |
| Restablecer la semilla de peligro de una run activa | Manipulación del resultado — nunca. |
| Iniciar una run más rápido (cooldown bypass) | Si hay cooldowns diseñados, existen por razón de gameplay. Venderlos es diseñar sistemas trampa. |

### La regla del "jugador de bus"

Un buen test de conveniencia: ¿Este feature ayuda al jugador que está en el autobús con el móvil (pantalla pequeña, tiempo limitado, sin auriculares)? Si sí — puede ser VIP. ¿Da ventaja al jugador que está en casa con tiempo libre? Si solo ayuda a este segundo perfil — no es conveniencia, es ventaja.

---

## 9. Riesgos de monetización

### Pay-to-Win

**Riesgo:** Introducir un feature VIP que resulta ser ventaja de gameplay disfrazada de QoL.

**Ejemplo de trampa:** "Los VIP reciben los resultados del poll cada 3 segundos en lugar de 5." Parece conveniente. En realidad da 2 segundos adicionales de reacción antes de una catástrofe. Es ventaja real.

**Mitigación:** Toda feature VIP pasa por el test: ¿cambia el resultado de una run? Si la respuesta es "sí, aunque sea un poco" — no es VIP material.

---

### Inflación de la economía

**Riesgo:** Si los VIP ganan más CC o materiales por run, la economía se bifurca entre jugadores free y premium con distintos ritmos de acumulación.

**Mitigación:** El `RunCalculator` no conoce el estado VIP del jugador. Los multiplicadores de loot no tienen relación con la suscripción.

---

### Sensación de castigo al jugador free

**Riesgo:** Si el juego comunica mal los beneficios VIP, el free player puede sentir que "el juego le quita cosas" en lugar de que "el VIP recibe más".

**Ejemplos de mala comunicación:**
- "Actualiza para ver tus estadísticas completas" (implica que se oculta algo suyo).
- Banner de "Solo VIP" en la pantalla principal del dashboard.
- Modal de upgrade al 2º login del usuario.

**Buena comunicación:**
- Tab de estadísticas con nota discreta "Disponible en Scrapper VIP".
- Ningún banner ou pop-up en el flujo de gameplay.
- El jugador free descubre los perks VIP orgánicamente, no por presión.

---

### Destruir la tensión del loop

**Riesgo:** Si cualquier feature vendida reduce la presión de la decisión de extracción, el loop pierde su poder.

**El peor escenario:** vender un "Estabilizador de Zona" que reduce el `quadraticFactor` de una run concreta. El jugador paga para tener más tiempo. El peligro ya no es inevitable. La tensión se evapora.

**Mitigación:** el contrato fundamenta: el peligro es igual para todos. El tiempo es igual para todos. El loot potencial es igual para todos. Lo que varía es la comodidad de gestión.

---

### Gacha y probabilidad opaca

**Riesgo:** si se añaden "packs de cosméticos con probabilidad de obtener items raros", se degrada hacia gacha.

**Línea clara:** no hay cajas de loot de ningún tipo. Nunca. Si hay un cosmético nuevo, tiene un precio fijo y el jugador sabe exactamente qué compra.

---

## 10. Señales para decidir si monetizar o no

Antes de activar cualquier sistema de pago en Fase 1, deben cumplirse **todas** las métricas mínimas:

### Métricas mínimas de activación

| Métrica | Umbral mínimo | Por qué |
|---------|--------------|---------|
| **Retención día 1** | > 50% | Si más de la mitad se va al primer día, no hay nada que monetizar. |
| **Retención día 7** | > 25% | Un jugador que vuelve a los 7 días es un jugador potencial de pago. |
| **Retención día 30** | > 10% | La suscripción mensual solo tiene sentido si hay jugadores que permanecen un mes. |
| **Usuarios activos mensuales** | > 500 | Por debajo de este número, el sistema de pago no vale la energía de desarrollo. |
| **Runs por usuario activo por semana** | > 5 | El jugador está enganchado al loop — hay algo que ofrecerle. |
| **NPS o feedback cualitativo positivo** | Mayoritariamente positivo | Si el loop no gusta, el dinero no lo arregla. |

### Engagement mínimo

- Los jugadores pueden llegar al nivel 5 de forma orgánica.
- El historial de runs de los usuarios activos muestra mayoría de extracciones exitosas (>60%).
- El tiempo medio de sesión es > 10 minutos.

### Señal de "es demasiado pronto para monetizar"

Si hay más de 3 issues abiertos con el tag "gameplay bug" o "balance problem" — no es el momento. Arreglar el juego primero.

---

## 11. Preparación técnica necesaria para monetización futura

### Campos que podrían añadirse a `UserProfile`

Los siguientes campos pueden añadirse en migraciones futuras sin romper la arquitectura actual:

| Campo | Tipo | Propósito |
|-------|------|-----------|
| `subscriptionTier` | `Enum (FREE, VIP, VIP_PLUS)` | Nivel de suscripción actual del usuario |
| `subscriptionValidUntil` | `DateTime?` | Fecha de expiración de la suscripción activa |
| `cosmeticCredits` | `Int` | Balance de CC★ (créditos cosméticos) |
| `activeHelmetSkinId` | `String?` | Referencia al cosmético de casco activo |
| `activeBodySkinId` | `String?` | Referencia al cosmético de traje activo |
| `activeHudTheme` | `String?` | Tema de color del HUD activo |
| `activeExtractionEffect` | `String?` | Efecto de extracción activo |
| `equipmentLoadouts` | Tabla separada | Loadouts guardados (relación 1:N con UserProfile) |
| `uncommonDropCount` | `Int` | Contador de drops UNCOMMON (ya existe en spec para garantía de primer drop) |

### Sistemas que deben mantenerse limpios (sin contaminar con lógica de monetización)

| Sistema | Por qué debe mantenerse limpio |
|---------|-------------------------------|
| `RunCalculator` | Nunca debe recibir `subscriptionTier` como input. Las runs son iguales para todos. |
| `CurrencyLedger` | La moneda del juego (CC) y la cosmética (CC★) deben ser ledgers separados. Mezclarlos es un error de arquitectura. |
| `InventoryItem` | El inventario de gameplay nunca contiene cosméticos. Los cosméticos son tabla separada. |
| `RunResolutionService` | La resolución de una run no tiene lógica de monetización. Ownership checks sí — VIP checks no. |

### Decisiones actuales que facilitan monetizar luego

| Decisión actual | Beneficio futuro |
|----------------|-----------------|
| `UserProfile` separado de `UserProgression` | Puede añadir campos de suscripción sin tocar la progresión |
| `CurrencyLedger` append-only | Puede añadir `PREMIUM_PURCHASE` como `LedgerEntryType` sin cambios en el schema principal |
| `EquipmentSlot` como entidad separada del inventario | Permite añadir skins de equipo como campo de overlay sin tocar el sistema de stats |
| `ItemDefinition` con campo `metadata` JSONB | Puede añadir `validSkins: [...]` sin migración de schema |
| `ExtractionResult` con snapshot completo | El historial extendido VIP no requiere datos adicionales — solo se cambia el `LIMIT` de la query |
| Configuración en `game.config.ts` | Los valores de balance pueden ajustarse sin migración cuando lleguen features VIP |

### Cómo implementar el check de suscripción (cuando llegue)

La suscripción se verifica en el **Application Service o Domain Service** que sirva la feature que la requiere, nunca en el `RunCalculator`. El patrón:

```
GET /api/game/run-state:
  Todos los usuarios → mismos datos

GET /api/me/stats (Fase 1):
  Si subscriptionTier === VIP → devolver AdvancedStatsDTO
  Si subscriptionTier === FREE → devolver null o error 403
```

El check de suscripción es un **gate de feature**, no un modificador de gameplay.

---

## 12. Líneas rojas del proyecto

Las líneas rojas son reglas que no pueden violarse independientemente de la presión comercial, el consejo de terceros o la situación económica del proyecto.

### 12.1 Líneas rojas de gameplay

```
❌ Nunca se venderá reducción del nivel de peligro de una run.
❌ Nunca se venderá loot directo.
❌ Nunca se venderán XP ni niveles.
❌ Nunca se venderán garantías de drops.
❌ Nunca se venderán herramientas que eliminen la catástrofe como posibilidad.
❌ Nunca se añadirá cooldown artificial para presionar compras de "bypass".
❌ Nunca se venderá ventaja estadística de ningún tipo en el loop de runs.
```

### 12.2 Líneas rojas de diseño de sistemas

```
❌ Nunca habrá loot boxes de ningún tipo (cosméticos o gameplay).
❌ Nunca habrá segunda moneda que pueda convertirse en ventaja de gameplay.
❌ Nunca habrá timers artificiales creados exclusivamente para presionar compras.
❌ Nunca habrá sistemas de energía que limiten el número de runs gratuitas por día.
❌ Nunca habrá items de gameplay exclusivos de pago no obtenibles jugando.
```

### 12.3 Líneas rojas de comunicación y UX

```
❌ Nunca se mostrarán pop-ups de compra durante o después de una run (momento de máxima vulnerabilidad emocional).
❌ Nunca se mostrará propaganda de pago al jugador nuevo antes de completar su primera run.
❌ Nunca se usará lenguaje de urgencia artificial ("¡Solo hoy!", "¡Última oportunidad!") para cosméticos permanentes.
❌ Nunca se comparará públicamente el progreso de jugadores free vs VIP de forma que avergüence al free player.
```

### 12.4 Líneas rojas de datos

```
❌ Nunca se venderán datos de comportamiento del jugador a terceros.
❌ Nunca se permitirá que terceros usen los datos de runs para publicidad behavioral.
```

---

## 13. Recomendación final de monetización para este proyecto

**Para un side project web serio con loop de engagement fuerte, el modelo óptimo es:**

### Modelo recomendado: Freemium con suscripción de calidad de vida

**Tier gratuito (Base):**
- Loop de juego completo.
- Sin limitaciones de runs.
- Las últimas 20 runs en el historial.
- Sin notificaciones de background.
- Sin estadísticas avanzadas.
- **El jugador free tiene exactamente la misma experiencia de tensión y recompensa.**

**Scrapper VIP (3,99€/mes):**
- Badge VIP.
- Historial extendido (100 runs).
- 3 loadouts de equipo guardados.
- Dashboard de estadísticas personales.
- Notificaciones de background (peligro > 75%).
- 200 CC★ mensuales para la tienda de cosméticos.
- Acceso anticipado a zonas de evento en Fase 2.

**Tienda de cosméticos (precios sueltos):**
- Skins de equipo: 1,99€–4,99€ cada una.
- Temas de HUD: 2,99€ cada uno.
- Efectos de extracción: 1,99€ cada uno.
- Sin loot boxes. Precio fijo y producto visible antes de comprar.

### Por qué este modelo y no otro

| Alternativa | Por qué no |
|-------------|------------|
| Compra única del juego | Difícil de justificar para un web game sin marketing masivo. El jugador no "descarga" nada. |
| Battle pass | Requiere contenido estacional con suficiente cadencia. Un side project no puede mantener eso. |
| Gacha | Destruye la reputación del juego y entra en conflicto directo con la filosofía del loop. |
| F2P puro sin monetización | Si el juego crece, necesita sostenibilidad económica aunque sean ingresos modestos. |
| Freemium agresivo con energía | Destruye la retención al día 3. |

### Realismo económico

Un side project con 1.000 usuarios activos y una tasa de conversión realista del 5–8% genera:
- ~50–80 suscripciones VIP × 3,99€/mes = **200–320€/mes**
- + compras de cosméticos esporádicas

Esto no es un negocio. Pero cubre costes de hosting, dominio y herramientas. Permite que el proyecto sea sostenible sin inversión externa.

Si la retención llega a 5.000 usuarios activos mensuales con 5–8% conversión:
- ~250–400 suscriptores × 3,99€ = **approx. 1.000–1.600€/mes**

En ese escenario, el proyecto puede pagar trabajo de mantenimiento y diseño de contenido adicional. Eso es el objetivo realista.

### Cuándo activar la monetización

> **Activar la monetización de Fase 1 cuando:**
> 1. El juego tiene retención día 7 > 25%.
> 2. Hay al menos 500 usuarios activos mensuales.
> 3. El loop está validado y los bugs críticos resueltos.
> 4. Hay al menos 2 zonas de contenido disponibles.
> 5. El equipo puede comprometerse a mantener los perks VIP (historial, stats, notificaciones) funcionando de forma estable.
>
> **No lanzar monetización antes de cumplir todos estos criterios.**

---

## Apéndice: Glosario de monetización

| Término | Definición en el contexto de Scrap & Survive |
|---------|---------------------------------------------|
| **CC** | Créditos de Chatarrero. Moneda de gameplay. Sin relación con pagos reales. |
| **CC★** | Créditos Cosméticos. Moneda exclusiva de la tienda de cosméticos. No afecta el gameplay. Se obtiene comprando o como beneficio VIP mensual. |
| **Scrapper VIP** | Nombre de la suscripción premium. Se pronuncia como un apelativo, no como un tier. |
| **Cosmético** | Item visual sin impacto en stats ni en el resultado de las runs. |
| **QoL (Quality of Life)** | Feature que hace el juego más cómodo sin alterar el resultado del loop. |
| **Pay-to-Win** | Cualquier pago que otorgue ventaja estadística en el resultado de runs vs jugadores free. Prohibido. |
| **Gacha** | Sistema de loot boxes con probabilidad variable de recompensa. Prohibido en todas sus formas. |
| **Gate de feature** | Check de suscripción que permite o bloquea acceso a una feature específica. Válido para QoL, prohibido para gameplay. |

# Deck Context Visible — revisión de maná y colores V1

Fecha: 2026-10-12. Rama inicial: `feat/deck-context-mana-feasibility-v1`. Baseline de integración: `ea84601c95589cb6482040e0d7942f5b3dae9276`.

## Objetivo, alcance y límites

Segunda criba **posterior y complementaria** a la legalidad por formato ya implantada. Evitar que el analizador muestre en primer plano cartas que exigen colores de maná sin una fuente **directa identificada en tierras del mazo**, sin confundir legalidad con viabilidad ni eliminar candidatas legales de su conjunto completo.

La clasificación de una carta legal es:
- **Fuentes directas verificadas**: el coste de lanzamiento normal contiene colores que aparecen entre los `produced_mana` de alguna tierra con producción no condicionada. La mera presencia de un color no demuestra tener suficientes tierras ni alcanzar la curva.
- **Necesita revisar el maná**: falta al menos un color de un coste normal inequívoco entre esas fuentes directas. **No es una prueba de imposibilidad**. Se preserva la carta y sus razones semánticas en una sección desplegable separada. Se señalan costes/color y posible necesidad de cambiar tierras.
- **Desconocido**: híbridos, pirexianos, caras/alternativas de lanzamiento, tierras candidatas, registros no resueltos, falta de índice, falta de fecha fiable o antigüedad mayor de 30 días. Se conserva la carta legal con una advertencia, sin certificar su viabilidad.
- Las tierras de búsqueda y fuentes condicionadas como Cavern of Souls y Nykthos no se convierten automáticamente en una fuente directa de todos los colores; su función puede depender de condiciones del estado de la partida o del tipo de hechizo.
- Los productores no tierra, aceleradores de maná, efectos temporales, costes alternativos, tesoros, identidad de color de Commander, curva de maná y proporción de fuentes son variables que esta primera microfase **no simula ni certifica**.
- Commander sigue fuera de los formatos certificables de la fase anterior.

## Fuentes y trazabilidad

`scripts/build_cards_mana_signals.mjs` genera un fichero `public/data/cards_mana_signals.json.gz` (~398 KB) a partir de Scryfall Oracle Cards, con `type`, `mana_cost`, `produced`, `identity`, `conditional` y `complex_cast`. La generación mantiene fecha y SHA-256 del mismo fichero masivo usado para el índice de legalidad. Los casos ambiguos se concilian **durante el mantenimiento**, mediante consultas exactas por lotes de 75 o menos con pausas; ninguno se consulta por la web mientras un jugador analiza su baraja.

`scripts/verify_cards_mana_signals.mjs` verifica el hash del comprimido, identidad de la fuente frente a la de legalidades, cobertura y señales de cartas conocidas. La validación se añade al `prebuild`.

Las cartas y listas de los jugadores solo interactúan con los **tres ficheros estáticos internos** (índice Oracle, legalidades por formato, maná) y el motor local; no se envían las listas a Scryfall.

## Ensayo controlado: cuatro mazos publicados

Se mantienen los cuatro mazos de 60 cartas del mismo corpus de pruebas congelado en `deck_context_published_decks_format_legality_v1.test.ts`, que preserva la legalidad anterior y la misma recuperación y puntuación semántica:

| Mazo (formato auditado) | Legales antes en top visible | Revisión de colores antes | Desconocido antes | Nuevo primer plano, fuentes directas |
|---|---:|---:|---:|---:|
| Mono-Red Madness / Guttersnipe (Pauper) | 10 | 4 | 0 | 6 |
| Soul Sisters (Modern) | 12 | 5 | 0 | 12 |
| Golgari Elves (Modern) | 12 | 11 | 0 | 9 |
| Izzet Prowess (Modern) | 12 | 4 | 1 | 12 |
| **Total** | **46** | **24** | **1** | **39** |

**Lectura correcta del antes/después:** antes, 24 de las 46 cartas legalmente mostradas carecían de algún color con fuente directa detectada y una tenía coste no representado. En el primer plano nuevo hay 39 candidatas en total (máximo 12 por mazo), ninguna con un color de coste normal sin fuente directa detectada. Se conservan **todas** las cartas legalmente identificadas dentro de las categorías completas `direct` / `needsReview` / `unknown`, y las que necesitan revisión permanecen visibles en el apartado desplegable. El comparativo está restringido a cuatro listas, no es una inferencia sobre el metajuego, el funcionamiento de todos los mazos ni la satisfacción del usuario.

El sistema sigue pudiendo proponer cartas poco pertinentes estratégicamente o cartas caras para la curva (por ejemplo un hechizo de seis manás cuando existen fuentes del color). Esta microfase **no corrige aún la calidad semántica ni la curva**, solo la detección y presentación de compatibilidad de colores para costes inequívocos.

## Reproducción

Desde el directorio del repositorio, con Node compatible:
```powershell
node scripts/verify_cards_mana_signals.mjs
npx vitest run src/engine/__tests__/deck_context_mana_feasibility_v1.test.ts src/engine/__tests__/deck_context_published_decks_format_legality_v1.test.ts src/components/analyzer/tests/deck_context_visible_mvp_v1.test.tsx
npm test -- --run
npm run build
git diff --check
```

Para actualizar la instantánea, reconstruir **primero** la legalidad si Scryfall ha publicado una revisión nueva, **después** `node scripts/build_cards_mana_signals.mjs`, ejecutar la verificación y solo desplegar tras pruebas y revisión del diff. No hay actualización periódica automática implícita; a los 30 días sin refresh se degrada la evaluación de maná.

## Condición de integración

Mantener todos los filtros previos de legalidad y exclusión, no presentar "legal" como "viable" por defecto, conservar candidatos antes legales, reproducir los cuatro mazos, suite completa y CI. No fusionar una PR ni desplegar si hay regresiones.

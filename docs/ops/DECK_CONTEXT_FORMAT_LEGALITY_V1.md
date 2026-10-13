# Deck Context Visible — formato y legalidad (V1)

**Alcance:** recomendaciones externas del analizador en formato explícitamente elegido por el jugador. No modifica el motor semántico, los costes MTG, la estructura de los mazos ni las puntuaciones de sinergia.

## Contrato de seguridad
- Sin formato seleccionado no se muestran nuevas recomendaciones como cartas legalmente aptas.
- Las candidatas proceden del motor semántico local. Un segundo control independiente consulta **solo un fichero estático local** de legalidades de Scryfall.
- `legal` permite una recomendación; `banned` y `not_legal` la excluyen; `restricted` y ausencia de datos se señalan como **no verificadas / no recomendadas**.
- Si falla la carga, no se encuentra el formato o la instantánea tiene más de **30 días** o una fecha inválida, todas las candidatas quedan **desconocidas**. No se certifican.
- La UI muestra origen y fecha de la instantánea. No promete legalidad en tiempo real, composición óptima, cumplimiento de restricciones de copias ni viabilidad de maná. **Commander no está disponible como formato certificable en esta V1** porque Scryfall no puede garantizar la identidad de color del comandante de un mazo desconocido; los datos brutos se conservan para una fase posterior.
- **No se envían mazos, nombres de cartas ni información del usuario a Scryfall durante el análisis del navegador.** Un mantenedor obtiene datos públicos de Scryfall únicamente en la generación manual del fichero.

## Reconstrucción del índice de legalidades
Ejecutar en un entorno de mantenimiento con Node 22.12+:
```powershell
node scripts/build_cards_format_legalities.mjs
node scripts/verify_cards_format_legalities.mjs
npm test -- --run
npm run build
```

El generador descarga la versión pública `oracle_cards` en JSONL comprimido y la concilia con los 36k nombres del índice estático actual. Los alias residuales y las ambigüedades del Oracle bulk se consultan por lotes de un máximo de 75, con pausas, exclusivamente en la operación de actualización. No se descargan imágenes, no se regeneran otros índices y no se cambia el despliegue automáticamente.

Artefactos: `public/data/cards_format_legalities.json.gz` y `.manifest.json`. El manifiesto conserva fecha de Scryfall, identificador de la fuente, huella SHA-256, formatos y cobertura. `npm run build` comprueba ambas huellas/estructura y los casos conocidos.

**Caducidad:** actualizar el snapshot antes de 30 días; la política fail-closed protege al usuario si no se refresca. No crear tareas de actualización externa implícitas.

## Resultado de cuatro mazos publicados (2026-10-12)

Corpus congelado dentro del test de aceptación, formado a partir de las mismas listas de la auditoría previa:
- Mono-Red Madness / Guttersnipe: https://www.mtggoldfish.com/deck/popout?id=7910513 (Pauper evaluado).
- Soul Sisters: https://www.mtggoldfish.com/deck/popout?id=753750 (Modern).
- Golgari Elves: https://www.mtggoldfish.com/deck/popout?id=5300762 (Modern).
- Izzet Prowess: https://magicmeta.net/formats/modern/archetypes/izzet-prowess/decks/islandgosame-2026-08-16-4 (Modern).

Las listas se transcribieron desde extractos públicos; las páginas completas de MTGGoldfish devolvieron HTTP 403 al host original de auditoría, límite de verificación de procedencia que se conserva. No se verifica éxito competitivo ni sideboard.

| Mazo | Antes, no legales /12 | Después, no legales | Después, legales visibles | Legales previas conservadas |
|---|---:|---:|---:|---:|
| Guttersnipe (Pauper) | 8 | 0 | 10 | 4/4 |
| Soul Sisters (Modern) | 2 | 0 | 12 | 10/10 |
| Golgari Elves (Modern) | 2 | 0 | 12 | 10/10 |
| Izzet Prowess (Modern) | 5 | 0 | 12 | 7/7 |
| **Total** | **17/48** | **0/46** | **46** | **31/31** |

Se excluyeron solo estatus `not_legal` y `banned`; los datos ausentes o `restricted` se separan como desconocidos, **nunca** como legales. Este resultado no prueba coherencia de maná, sinergia competitiva ni ajuste de planes de juego. La foto de legalidad procede de Scryfall del 2026-10-12, no representa garantía legal futura.

## Protocolo de validación
Pruebas de positivos/negativos en `deck_context_format_legality_v1.test.ts` y control del recorrido completo con cuatro mazos publicados, incluido Guttersnipe, en `deck_context_published_decks_format_legality_v1.test.ts`. Congelar y comparar before/after; cero recomendaciones clasificadas como `not_legal` o `banned` por la instantánea, y preservación de las confirmadas `legal` del top-12 anterior. La calidad del orden, el maná y la satisfacción del usuario quedan como auditorías diferentes, no se declaran corregidas por el filtro.

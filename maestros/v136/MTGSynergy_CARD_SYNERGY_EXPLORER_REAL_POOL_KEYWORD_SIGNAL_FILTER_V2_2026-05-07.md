# MTGSynergy — Cierre de Microfase

## 1) Microfase
`CARD_SYNERGY_EXPLORER_REAL_POOL_KEYWORD_SIGNAL_FILTER_V2`

## 2) Tipo
Mejora del filtro público client-side del Card Synergy Explorer usando `keywords` reales del `cards_index`.

## 3) Baseline de entrada
`main == origin/main == 7aa9dff`

La microfase anterior `CARD_SYNERGY_EXPLORER_CARDS_INDEX_KEYWORDS_SCHEMA_V1` dejó el índice público con:
- `schema_version: cardrecordmin-v1`
- `record_count: 36267`
- `records_with_non_empty_keywords: 16419`
- `cards_index.json.gz: 2576651 bytes`
- `sha256_gz: 487aa7a21a42b3ff8a2f9ab627c1d06a6952cc3beab5ae1ab27f5b262fccd424`

## 4) Problema detectado antes de V2
El Card Synergy Explorer ya mostraba candidatos reales no rankeados, pero el pool seguía demasiado lexical:
- `Counterspell` incluía `Abrupt Decay` por texto pasivo `can't be countered`.
- `Sol Ring` devolvía artefactos/anillos random en vez de mana rocks.
- `Llanowar Elves` devolvía ruido como `Blufferfish`.
- `A-The One Ring` mezclaba candidatos muy abiertos.
- El bloque `Placeholder no rankeado / Sin candidatos reales` seguía apareciendo aunque hubiera candidatos reales.

## 5) Scope operativo
Solo se modificó:
- `src/pages/es/explorador-de-sinergias-mtg.astro`

No se modificó:
- `scripts/build_cards_index.mjs`
- `src/engine/cards/lookup.ts`
- `public/data/cards_index.json.gz`
- `public/data/cards_index.manifest.json`
- `package.json`
- layouts
- CSS global
- engine CSE core
- docs hasta este cierre

## 6) Cambios implementados
- Se añadieron helpers de señales keyword:
  - `KEYWORD_SIGNAL_TAG_MAP`
  - `normalizeKeyword`
  - `extractKeywordSignalTags`
  - `mergeTags`
- Se combinaron señales de texto/type/oracle con `record.keywords` reales.
- Se mantuvo compatibilidad si `record.keywords` no existe.
- Se endurecieron filtros anti-ruido:
  - `Counterspell` requiere señal activa de counterspell y evita positivos pasivos como `can't be countered`.
  - Seeds de daño activo requieren candidatos con señal activa de daño.
  - Seeds de maná requieren señal de maná/treasure/land/mana utility.
  - `Llanowar Elves` y criaturas de maná mejoran hacia mana dorks/elf ramp.
- Se corrigió la UI para ocultar el bloque placeholder cuando ya existen candidatos reales.
- Se mantuvo salida no rankeada y máximo 8 candidatos.

## 7) Prohibiciones preservadas
No se introdujo:
- ranking real
- score real
- recomendador final
- recomendaciones finales
- mejor candidato
- top candidato
- explicación causal real
- fetch externo
- hardcoded candidates
- mock/fallback candidates
- localStorage
- sessionStorage
- Date.now
- Math.random
- imports del engine en HTML público

## 8) Guardrails preservados
- Candidatos reales no rankeados
- Pool inicial filtrado
- Filtrado mínimo desde índice local
- El orden no representa ranking
- No son recomendaciones finales
- Sin ranking
- Sin score
- Sin explicación causal
- 100% client-side

## 9) Commits
Feature commit:
- `fcf6087 feat(site): improve card synergy explorer keyword signal filter v2`

Merge commit:
- `fc5fc58 merge: card synergy explorer real pool keyword signal filter v2`

Estado operativo final antes del cierre documental:
- `main == origin/main == fc5fc58`

## 10) Validación local
- `git diff --check` OK
- Ring CSE contractual: `14 files / 109 tests passed`
- `npm run build` OK
- `cards_index manifest verified` OK
- Scope versionado: solo `src/pages/es/explorador-de-sinergias-mtg.astro`

## 11) Snapshot funcional V2
Lightning Bolt:
- `Emeritus of Conflict // Lightning Bolt`
- `Barbed Lightning`
- `Blastfire Bolt`
- `Branching Bolt`
- `Burst Lightning`
- `Demon Bolt`
- `Electrostatic Bolt`
- `Feedback Bolt`

Counterspell:
- `Abjure`
- `Absorb`
- `Absorb Energy`
- `Abstruse Interference`
- `Access Denied`
- `Admiral's Order`
- `Aether Spike`
- `Amazing Acrobatics`

Importante:
- `Abrupt Decay` desaparece del pool de `Counterspell`.

Sol Ring:
- `Basalt Monolith`
- `Bender's Waterskin`
- `Brass's Tunnel-Grinder // Tecutlan, the Searing Rift`
- `Glittering Stockpile`
- `Grim Monolith`
- `Inherited Envelope`
- `Mana Vault`
- `Megatron, Tyrant // Megatron, Destructive Force`

Llanowar Elves:
- `Llanowar Mentor`
- `A-Llanowar Loamspeaker`
- `Elves of Deep Shadow`
- `Fyndhorn Elves`
- `Heritage Druid`
- `Joraga Treespeaker`
- `Llanowar Loamspeaker`
- `Llanowar Tribe`

A-The One Ring:
- `The One Ring`
- `Venat, Heart of Hydaelyn // Hydaelyn, the Mothercrystal`
- `Tamiyo, Compleated Sage`
- `The Great Henge`
- `Etali, Primal Conqueror // Etali, Primal Sickness`
- `Rory Williams`
- `The Eleventh Hour`
- `Toski, Bearer of Secrets`

Seed inválida:
`Not A Real MTG Card 12345`:
- degraded
- 0 candidatos
- mensaje: `No se ha encontrado una carta seed real en el índice local.`

## 12) Validación pública
Public smoke CSE V2:
- CSE HTTP `200`
- HTML público contiene:
  - `KEYWORD_SIGNAL_TAG_MAP`
  - `extractKeywordSignalTags`
  - `normalizeKeyword`
  - `mergeTags`
  - `outputContract.hidden`
- fetch único/local:
  - `fetch("/data/cards_index.json.gz")`
- sin strings prohibidos
- Analyzer HTTP `200`
- cards_index público:
  - `schema_version: cardrecordmin-v1`
  - `record_count: 36267`
  - `records_with_non_empty_keywords: 16419`
  - `sha256 descargado == sha256 manifest`

## 13) Validación manual PDF
Se imprimieron/guardaron PDFs de la web con las seeds:
- `Lightning Bolt`
- `Counterspell`
- `Sol Ring`
- `Llanowar Elves`
- `A-The One Ring`
- `Not A Real MTG Card 12345`

Resultado manual:
- `Lightning Bolt` muestra pool burn/damage correcto.
- `Counterspell` ya no muestra `Abrupt Decay`.
- `Sol Ring` muestra mana rocks / mana utility.
- `Llanowar Elves` muestra mana dorks / elf ramp y ya no muestra `Blufferfish`.
- `A-The One Ring` queda aceptable para beta, con pool de value/engine candidates.
- La seed inválida degrada correctamente sin candidatos reales.
- El placeholder ya no aparece cuando hay candidatos reales.
- El placeholder aparece en la seed inválida, donde es aceptable.
- Los guardrails siguen visibles.

## 14) Observación menor
En los PDFs impresos se observan pequeños cortes de palabras como `rank ing` o `candi datos`, interpretados como artefacto de impresión/render PDF, no como fallo funcional.

## 15) Lectura técnica final
V2 mejora de forma real el pool público sin convertirlo en ranking, score ni recomendador final. Sigue siendo una beta de pool inicial filtrado no rankeado, pero ahora reduce ruido lexical importante y aprovecha `record.keywords` reales del índice.

## 16) Siguiente paso recomendado
Después del cierre documental, el siguiente paso podría ser:
- prueba del analizador de mazos tras los cambios del índice,
- o una microfase posterior de explicación/categorización no causal,
- o una microfase de más snapshots controlados con más seeds.

# MTGSynergy — Card Synergy Explorer Real Candidate Pool Source V1

Fecha de cierre: 2026-05-04
Proyecto: MTGSynergy / PÁGINA WEB MAGIC
Microfase: `CARD_SYNERGY_EXPLORER_REAL_CANDIDATE_POOL_SOURCE_V1`

## Estado final confirmado

Repositorio local:

```text
C:\MTGSynergy
```

Branch final:

```text
main
```

Estado final técnico antes del cierre documental:

```text
main == origin/main == 993eb51
```

Commit de merge publicado:

```text
993eb51 merge: card synergy explorer real candidate pool source v1
```

Commit de rama:

```text
aa15c83 feat(engine): add card synergy explorer real candidate pool source v1
```

## Objetivo de la microfase

Hacer que el adapter real del Card Synergy Explorer pueda devolver un candidate pool real mínimo desde el índice local de cartas.

La microfase no buscaba ranking, scoring, explanations ni bridges. El objetivo era sustituir el `findCandidatePool(...)` vacío por una fuente real, limitada y determinista, basada en `cards_index`.

## Archivos modificados

```text
src/engine/cards/lookup.ts
src/engine/__tests__/cards_lookup.test.ts
src/engine/card_synergy_explorer/cards_index_adapter.ts
src/engine/__tests__/card_synergy_explorer_cards_index_adapter_v1.test.ts
```

## Cambio técnico cerrado

En `src/engine/cards/lookup.ts` se añadió:

```text
listCardsIndexRecords(options?)
ListCardsIndexRecordsOptions
```

La nueva API:

- reutiliza `loadCardsIndex(...)` y su caché existente,
- no crea un loader nuevo,
- no duplica gzip/fetch/parsing,
- enumera registros desde `payload.by_name`,
- ordena de forma determinista por nombre canónico,
- filtra por defecto records sin `oracle_text` usable,
- permite `includeEmptyOracleText: true`,
- aplica `limit` con default 200,
- devuelve `[]` si `limit <= 0`,
- mantiene `lookupCard(...)` y `getCardsIndexCount(...)` sin romper comportamiento previo.

En `src/engine/card_synergy_explorer/cards_index_adapter.ts`:

- se añadió fuente inyectable `listCardsIndexRecords`,
- se añadieron `candidatePoolLimit` y `candidatePoolOverscan`,
- `findCandidatePool(...)` dejó de devolver siempre `[]`,
- ahora obtiene records reales desde `cards_index`,
- usa `input.options?.maxCandidates + overscan` cuando aplica,
- usa `candidatePoolLimit` cuando no hay `maxCandidates`,
- devuelve `[]` sin listar si `maxCandidates <= 0`,
- mapea records a `CardSynergyCandidateCard` mínimo,
- no llama `lookupCard(...)` desde `findCandidatePool(...)`,
- no excluye seeds ahí: la exclusión/deduplicación sigue en `candidate_pool.ts` + normalización.

## Comportamiento fijado

El Explorador ya puede producir un pool real inicial de candidatos desde el índice local.

Este pool sigue siendo una fuente bruta normalizada posteriormente, no una lista final de recomendaciones sinérgicas.

## No-goals preservados

Esta microfase no implementa:

- UI pública,
- página `/es/explorador-de-sinergias-mtg/`,
- analyzer wiring,
- parser,
- semantic overlay,
- ranking,
- scoring,
- explanations,
- bridges reales,
- SPS por carta,
- Monte Carlo,
- heurística por color/mana/formato como sinergia,
- cambios en `public/data`,
- cambios en `package.json`,
- cambios en configuración Astro.

## Validación ejecutada

Post-merge en `main`:

```text
cards_lookup:
11 tests passing

CSE real pool + wiring:
30 tests passing

cards index / enrich / tagging:
19 tests passing

CSE completo:
58 tests passing

recommendations ring:
40 tests passing

Build:
OK

diff --check:
OK
```

## Lectura correcta

El Card Synergy Explorer queda ahora conectado hasta:

```text
contract types
↓
adapter contract
↓
cards_index adapter real para seed resolution
↓
cards_index real candidate pool source
↓
input validation
↓
seed resolution
↓
candidate pool
↓
candidate normalization wiring
```

El sistema ya resuelve seeds reales y puede obtener candidatos reales mínimos desde `cards_index`, pero todavía no puede decir que esos candidatos son “los mejores” ni explicar sinergias causales.

## Implicación para publicación

Esta fase acerca el Explorador de Sinergias MTG a una beta pública, pero todavía no basta para publicarlo como recomendador semántico.

Antes de UI pública conviene cerrar al menos un contrato de salida visible o gate semántico mínimo para no presentar un pool bruto como si fuera ranking de sinergia.

## Siguiente fase recomendada

Abrir una microfase de producto/contrato antes de la UI pública:

```text
CARD_SYNERGY_EXPLORER_CANDIDATE_OUTPUT_CONTRACT_V1
```

Objetivo probable:

- definir qué forma tendrá un resultado visible,
- separar claramente pool bruto de candidato publicable,
- fijar campos como name, typeLine, oracleText, cmc, evidence/status/degradations,
- mantener `score` y `explanation` ausentes o explícitamente no disponibles hasta bridge/scoring real.

## Estado de cierre

Microfase cerrada técnicamente en `main`.

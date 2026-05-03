# MTGSynergy — Card Synergy Explorer Cards Index Adapter V1

Fecha de cierre: 2026-05-03
Proyecto: MTGSynergy / PÁGINA WEB MAGIC
Microfase: `CARD_SYNERGY_EXPLORER_CARDS_INDEX_ADAPTER_V1`

## Estado final confirmado

Repositorio local:

```text
C:\MTGSynergy
```

Branch final:

```text
main
```

Estado final:

```text
main == origin/main == 18c2b34
```

Commit de merge publicado:

```text
18c2b34 merge: card synergy explorer cards index adapter v1
```

Commit de rama:

```text
fb120a0 feat(engine): add card synergy explorer cards index adapter v1
```

## Objetivo de la microfase

Crear un adapter real mínimo para el Card Synergy Explorer basado en el índice local de cartas ya existente en el proyecto.

El objetivo era permitir que el Explorador pueda resolver seeds reales mediante `lookupCard(...)`, sin publicar UI todavía y sin abrir búsqueda real de candidatos.

## Archivos creados / modificados

```text
src/engine/card_synergy_explorer/cards_index_adapter.ts
src/engine/card_synergy_explorer/index.ts
src/engine/__tests__/card_synergy_explorer_cards_index_adapter_v1.test.ts
```

## Cambio técnico cerrado

Se añadió `createCardSynergyCardsIndexAdapter(options?)`, que implementa `CardSynergyDataAdapter`.

El adapter:

- usa `lookupCard(...)` desde `src/engine/cards/lookup.ts`,
- permite inyectar `lookupCard` para tests,
- acepta `baseUrl` opcional,
- resuelve seeds reales contra el índice local de cartas,
- devuelve `missing_card_record` cuando no hay record,
- devuelve `missing_oracle_text` cuando el record no tiene Oracle text usable,
- mapea record válido a `CardSynergyCandidateCard`,
- conserva `typeLine`, `oracleText` y `cmc`,
- usa `record.name` como nombre canónico cuando está disponible,
- usa `record.oracle_id` como `oracleId` cuando la seed no lo trae.

## Comportamiento deliberadamente NO implementado

`findCandidatePool(input)` devuelve `[]` en V1.

Esto es intencional: esta microfase no abre todavía búsqueda de candidatos, ranking, scoring, explanations ni bridge evaluation.

## No-goals preservados

Esta microfase no implementa:

- UI pública,
- página `/es/explorador-de-sinergias-mtg/`,
- analyzer wiring,
- parser,
- semantic overlay,
- búsqueda real de candidatos,
- ranking,
- scoring,
- explanations,
- bridges reales,
- SPS por carta,
- Monte Carlo,
- lectura directa de `public/data`,
- cambios en `cards_index`,
- cambios en `package.json` o configuración Astro.

## Validación ejecutada

Post-merge en `main`:

```text
Card Synergy Explorer ring:
7 files / 48 tests passing

Cards index lookup ring:
5 files / 15 tests passing

Recommendations ring:
6 files / 40 tests passing

Build:
OK

diff --check:
OK
```

Total validado:

```text
103 tests passing + build OK
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
input validation
↓
seed resolution
↓
candidate pool
↓
candidate normalization wiring
```

El sistema ya puede resolver cartas reales desde el índice local, pero todavía no genera candidatos reales sinérgicos.

## Siguiente fase recomendada

La siguiente microfase debería avanzar hacia publicación, pero sin saltar directamente a UI final.

Recomendación:

```text
CARD_SYNERGY_EXPLORER_REAL_CANDIDATE_POOL_SOURCE_V1
```

Objetivo probable:

- definir una fuente mínima de candidate pool real desde cards_index,
- todavía sin ranking semántico final,
- todavía sin UI pública,
- preparando el vertical slice que permita después publicar una beta honesta del Explorador de Sinergias MTG.

## Estado de cierre

Microfase cerrada correctamente en `main`.

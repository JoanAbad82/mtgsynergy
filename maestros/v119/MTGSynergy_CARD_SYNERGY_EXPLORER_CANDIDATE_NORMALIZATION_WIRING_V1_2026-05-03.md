# MTGSynergy — Card Synergy Explorer Candidate Normalization Wiring V1

Fecha de cierre: 2026-05-03
Proyecto: MTGSynergy / PÁGINA WEB MAGIC
Microfase: `CARD_SYNERGY_EXPLORER_CANDIDATE_NORMALIZATION_WIRING_V1`

## Estado final confirmado

Repositorio local:

```text
C:\MTGSynergy
```

Branch final:

```text
main
```

Estado final antes del cierre documental:

```text
main == origin/main == 3c39457
```

Commit de merge publicado:

```text
3c39457 merge: card synergy explorer candidate normalization wiring v1
```

Commit de rama:

```text
2fdf3e0 feat(engine): wire card synergy explorer candidate normalization v1
```

## Objetivo de la microfase

Conectar la normalización del pool de candidatos al flujo interno del Card Synergy Explorer después de la resolución de seeds y después de obtener el candidate pool bruto mediante adapter inyectado.

El objetivo era normalizar el pool bruto sin abrir todavía ranking, scoring, explanations, bridges reales ni candidatos finales.

## Archivos modificados / añadidos

```text
src/engine/card_synergy_explorer/candidate_pool.ts
src/engine/__tests__/card_synergy_explorer_candidate_pool_normalization_wiring_v1.test.ts
```

## Cambio técnico cerrado

En `resolveCardSynergyCandidatePool(...)`:

- Se mantiene el early return cuando hay degradaciones de validación o seed resolution.
- En rama degradada:
  - `candidatePool` sigue siendo `[]`.
  - no se llama a `adapter.findCandidatePool(...)`.
  - no se ejecuta normalización.
- En rama correcta:
  - se llama a `adapter.findCandidatePool(seedResolution.input)`.
  - se normaliza el pool bruto con `normalizeCardSynergyCandidatePool(...)`.
  - se usan como `seedCards` las cartas resueltas: `seedResolution.resolvedSeeds.map((seed) => seed.card)`.
  - se aplica `maxCandidates` desde `input.options?.maxCandidates`.
  - se devuelve `candidatePool: normalization.normalizedCandidatePool`.

## Comportamiento fijado

La normalización ahora:

- excluye seeds si aparecen dentro del candidate pool,
- deduplica candidatos por `oracleId`,
- preserva el primer objeto aceptado,
- mantiene orden estable,
- aplica `maxCandidates` después de exclusión y deduplicación,
- no muta objetos originales,
- no convierte todavía a `CardSynergyCandidate`.

## No-goals preservados

Esta microfase no implementa:

- UI pública,
- analyzer wiring,
- parser,
- semantic overlay,
- cards_index runtime adapter real,
- fetch real,
- ranking,
- scoring,
- explanations,
- bridges reales,
- SPS por carta,
- Monte Carlo,
- sinergia por color/mana/formato.

## Validación ejecutada

Post-merge en `main`:

```text
Card Synergy Explorer ring:
6 files / 49 tests passing

Recommendations ring:
6 files / 40 tests passing

Build:
OK

diff --check:
OK
```

Total validado en cierre:

```text
89 tests passing + build OK
```

## Lectura correcta

El Card Synergy Explorer queda ahora conectado hasta:

```text
contract types
↓
adapter contract
↓
input validation
↓
seed resolution
↓
candidate pool
↓
candidate normalization wiring
```

El core sigue manteniendo:

```text
candidates: []
semantic_ir_unavailable
```

Esto es correcto porque todavía no existe ranking semántico real basado en evento/efecto + bridge causal explícito.

## Siguiente fase recomendada

Abrir una microfase posterior, todavía estrecha, para definir el siguiente contrato interno antes de cualquier UI:

```text
CARD_SYNERGY_EXPLORER_CANDIDATE_OUTPUT_CONTRACT_OR_SCORING_GATE_V1
```

La decisión exacta debe tomarse con preflight, pero no debe saltarse directamente a UI ni a ranking heurístico.

## Estado de cierre

Microfase cerrada correctamente en `main`.

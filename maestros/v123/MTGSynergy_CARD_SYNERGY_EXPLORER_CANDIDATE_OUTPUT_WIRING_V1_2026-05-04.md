# MTGSynergy — Card Synergy Explorer Candidate Output Wiring V1

Fecha de cierre: 2026-05-04
Proyecto: MTGSynergy / PÁGINA WEB MAGIC
Microfase: `CARD_SYNERGY_EXPLORER_CANDIDATE_OUTPUT_WIRING_V1`

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
main == origin/main == a9498d4
```

Commit de merge publicado:

```text
a9498d4 merge: card synergy explorer candidate output wiring v1
```

Commit de rama:

```text
24c51b0 feat(engine): wire card synergy explorer candidate outputs v1
```

## Objetivo de la microfase

Cablear internamente el contrato `candidate_output` en el flujo del Card Synergy Explorer sin convertirlo todavía en un recomendador rankeado.

El objetivo era que `core` pudiera exponer `candidateOutputs` public-safe/unranked desde el `candidatePool` real normalizado, manteniendo `candidates: []` hasta que exista ranking/scoring/bridges reales.

## Archivos modificados / creados

```text
src/engine/card_synergy_explorer/types.ts
src/engine/card_synergy_explorer/core.ts
src/engine/__tests__/card_synergy_explorer_core_candidate_output_wiring_v1.test.ts
```

## Cambio técnico cerrado

En `types.ts`:

- Se añadió `import type { CardSynergyCandidateOutput } from "./candidate_output";`.
- `CardSynergyExplorerResult` ahora incluye `candidateOutputs: readonly CardSynergyCandidateOutput[]`.
- `candidateOutputs` es requerido, no opcional.
- `candidates: readonly CardSynergyCandidate[]` permanece intacto.

En `core.ts`:

- Se importó `createCardSynergyCandidateOutputs(...)`.
- Todos los returns incluyen `candidateOutputs`.
- Los paths degradados devuelven `candidateOutputs: []`.
- El success path con adapter genera `candidateOutputs` desde `poolResult.candidatePool`.
- `candidates` sigue siendo `[]` en todos los paths.
- `semantic_ir_unavailable` sigue apareciendo solo en success path.
- No se llama directamente a `findCandidatePool(...)` desde core.
- No se tocó meta.

## Comportamiento fijado

Path inválido:

```text
candidates: []
candidateOutputs: []
degradations: validación
sin semantic_ir_unavailable
sin llamadas al adapter
```

Path con seed degradada:

```text
candidates: []
candidateOutputs: []
degradations: missing_card_record u otra degradación de seed
sin semantic_ir_unavailable
sin findCandidatePool
```

Path correcto:

```text
candidatePool real normalizado
↓
candidateOutputs unranked/public-safe
↓
candidates: []
degradations: semantic_ir_unavailable
```

## No-goals preservados

Esta microfase no implementa:

- UI pública,
- página `/es/explorador-de-sinergias-mtg/`,
- analyzer wiring,
- parser,
- semantic overlay,
- ranking,
- scoring,
- explanations reales,
- bridges reales,
- SPS por carta,
- Monte Carlo,
- cambios en `cards_index`,
- cambios en `public/data`,
- cambios en `package.json`,
- cambios en configuración Astro.

## Validación ejecutada

Post-merge en `main`:

```text
Test focal nuevo:
7 tests passing

Candidate Output Contract:
7 tests passing

CSE ring:
10 files / 72 tests passing

Cards index / lookup ring:
5 files / 19 tests passing

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
candidate normalization
↓
candidate output contract unranked
↓
core candidateOutputs wiring
```

El sistema ya puede exponer outputs visibles no rankeados desde el core, pero todavía no devuelve recomendaciones finales rankeadas ni explicaciones causales.

## Implicación para publicación

Esta fase acerca de forma directa el Explorador de Sinergias MTG a una beta pública honesta.

Ya existe una salida interna visible y segura, pero la UI debe presentar estos resultados como candidatos no rankeados o como beta experimental, no como ranking de sinergia definitivo.

## Siguiente fase recomendada

La siguiente decisión razonable queda entre:

```text
CARD_SYNERGY_EXPLORER_PUBLIC_BETA_ROUTE_SHELL_V1
```

o una fase previa de contrato de exposición beta si se quiere blindar todavía más el copy y los estados públicos:

```text
CARD_SYNERGY_EXPLORER_PUBLIC_BETA_COPY_AND_STATE_CONTRACT_V1
```

La ruta más orientada a publicación es crear primero una route shell pública muy honesta, sin ranking ni promesas semánticas fuertes.

## Estado de cierre

Microfase cerrada técnicamente en `main`.

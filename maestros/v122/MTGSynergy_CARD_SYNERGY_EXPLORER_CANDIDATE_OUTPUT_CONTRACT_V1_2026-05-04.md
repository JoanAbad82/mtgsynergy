# MTGSynergy — Card Synergy Explorer Candidate Output Contract V1

Fecha de cierre: 2026-05-04
Proyecto: MTGSynergy / PÁGINA WEB MAGIC
Microfase: `CARD_SYNERGY_EXPLORER_CANDIDATE_OUTPUT_CONTRACT_V1`

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
main == origin/main == fb667d0
```

Commit de merge publicado:

```text
fb667d0 merge: card synergy explorer candidate output contract v1
```

Commit de rama:

```text
6d5fbc1 feat(engine): add card synergy explorer candidate output contract v1
```

## Objetivo de la microfase

Crear un contrato interno puro para convertir candidatos del candidate pool real en outputs publicables no rankeados.

El objetivo era preparar una salida segura para futura UI sin fingir ranking, scoring, explanations ni bridges semánticos.

## Archivos creados / modificados

```text
src/engine/card_synergy_explorer/candidate_output.ts
src/engine/card_synergy_explorer/index.ts
src/engine/__tests__/card_synergy_explorer_candidate_output_contract_v1.test.ts
```

## Cambio técnico cerrado

Se añadió `candidate_output.ts` con:

```text
CARD_SYNERGY_EXPLORER_CANDIDATE_OUTPUT_VERSION
CARD_SYNERGY_CANDIDATE_OUTPUT_META
CardSynergyCandidateOutput
CardSynergyCandidateOutputInput
CardSynergyCandidateOutputMeta
createCardSynergyCandidateOutputs(input)
```

El contrato `CardSynergyCandidateOutput` representa candidatos publicables pero no rankeados.

Campos principales:

```text
name
oracleId?
typeLine?
oracleText?
cmc?
source: "candidate_pool"
status: "unranked"
semanticStatus: "semantic_bridge_unavailable"
```

## Comportamiento fijado

`createCardSynergyCandidateOutputs(input)`:

- preserva el orden de entrada,
- crea objetos nuevos,
- no muta `candidatePool` ni candidatos originales,
- copia solo campos útiles existentes,
- marca cada output como `candidate_pool`, `unranked` y `semantic_bridge_unavailable`,
- no aplica límite ni truncado,
- no crea `score`,
- no crea `rank`,
- no crea `explanation`,
- no crea bridges.

## No-goals preservados

Esta microfase no implementa:

- UI pública,
- página `/es/explorador-de-sinergias-mtg/`,
- wiring en `core.ts`,
- analyzer wiring,
- parser,
- semantic overlay,
- ranking,
- scoring,
- explanations reales,
- bridges reales,
- SPS por carta,
- Monte Carlo,
- lectura directa de `cards_index`,
- cambios en `public/data`,
- cambios en `package.json`,
- cambios en configuración Astro.

## Validación ejecutada

Post-merge en `main`:

```text
Test focal Candidate Output:
7 tests passing

CSE ring:
9 files / 65 tests passing

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
```

El sistema ya puede transformar un pool de candidatos reales en outputs seguros para una futura UI, pero todavía no devuelve recomendaciones rankeadas ni explicaciones causales.

## Implicación para publicación

Esta fase acerca el Explorador de Sinergias MTG a una beta pública porque ya existe una forma de salida visible que no promete más de lo que el motor puede justificar.

La UI puede usar este contrato en una beta honesta, siempre que se presente como candidatos no rankeados / semántica todavía no disponible, o bien esperar a un gate mínimo de scoring semántico.

## Siguiente fase recomendada

Antes de publicar UI, conviene decidir entre dos rutas:

```text
CARD_SYNERGY_EXPLORER_CANDIDATE_OUTPUT_WIRING_V1
```

o

```text
CARD_SYNERGY_EXPLORER_PUBLIC_BETA_ROUTE_SHELL_V1
```

La ruta más prudente es cablear primero el output contract internamente y mantener `core.candidates: []` hasta que exista un contrato claro de exposición beta.

## Estado de cierre

Microfase cerrada técnicamente en `main`.

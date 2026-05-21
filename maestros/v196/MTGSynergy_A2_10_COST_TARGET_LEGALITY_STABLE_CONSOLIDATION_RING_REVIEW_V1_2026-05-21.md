# MTGSynergy — Cierre documental real v196

## Microfase

`A2.10_COST_TARGET_LEGALITY_STABLE_CONSOLIDATION_RING_REVIEW_V1`

## Fecha

2026-05-21

## Estado

Cerrada técnicamente, mergeada, pusheada y sincronizada en `main`.

## Commits

- Feature/audit commit: `45e2458`
  - `test(semantic): add a210 stable consolidation ring v1`
- Merge commit en `main`: `b642be9`
  - `merge: a210 stable consolidation ring review v1`

## Alcance real

La microfase añadió un artefacto tests-only de consolidación estable para A2.10 tras las fases recientes de:

- corpus adicional Oracle real para `split/divided damage target count`;
- modelo estrecho `predicate-bearing split/divided damage target model`;
- actualización contractual para `CREATURE_ONLY` y `WITH_FLYING`;
- cierres documentales v194 y v195.

Archivo añadido:

- `src/engine/semantic/tests/sem_cost_target_legality_a210_stable_consolidation_ring_review_v1.test.ts`

Cambio real:

- `tests-only`
- `1 file changed`
- `239 insertions`
- sin cambios runtime
- sin cambios en lowering/parser
- sin cambios en contratos
- sin cambios UI
- sin cambios overlay
- sin cambios scoring/SPS/MC
- sin cambios routing/deploy/build
- sin cambios de producto visible

## Objetivo de la consolidación

La fase no abrió nueva semántica.

Su función fue crear un ring de revisión estable que comprueba coherencia cruzada entre contratos y runtime actual de A2.10, especialmente después de haber pasado de estados antiguos de diagnóstico/futuro a comportamiento productivo estrecho en split/divided damage.

## Invariantes cubiertas

El nuevo test confirma que:

- la separación CostIR / EffectIR sigue intacta;
- `split_divided_damage_target_model` sigue siendo aditivo y diagnóstico;
- los casos legacy `ANY_TARGET` se preservan como umbrella;
- `current_target_count` permanece `null` en corpus legacy split/divided;
- `modal_selection_model` no se crea ni modifica;
- `current_legality_kinds` permanece vacío en estos casos;
- la política scalar projection sigue siendo `DO_NOT_PROJECT`;
- `target_count_model` no se proyecta a `current_target_count`;
- la excepción predicate-bearing queda limitada a:
  - `CREATURE_ONLY`
  - `WITH_FLYING`
- no se declara full target legality;
- no se declara resolution model;
- los negativos no split/no target siguen sin producir modelo split/divided.

## Corpus observado

Legacy `ANY_TARGET` preservado:

- `Electrolyze`
- `Arc Lightning`
- `Flames of the Firebrand`
- `Pyrotechnics`
- `Rolling Thunder`
- `Fire // Ice`
- `Magma Opus`
- `Boulderfall`

Predicate-bearing estrecho preservado:

- `Pyrokinesis`
  - `CREATURE_ONLY`
- `Aerial Volley`
  - `WITH_FLYING`

Guardrails negativos preservados:

- `Fall of the Titans`
- `Arc Trail`
- `Earthquake`

## Validación ejecutada

Antes del merge:

- test nuevo:
  - `1 file passed`
  - `1 test passed`
- stable A2.10 ring:
  - `13 files passed`
  - `33 tests passed`
- `git diff --check`:
  - limpio

Después del merge:

- test nuevo:
  - `1 file passed`
  - `1 test passed`
- stable A2.10 ring:
  - `13 files passed`
  - `33 tests passed`
- `git diff --check`:
  - limpio

## Estado final verificado

- `main = b642be9`
- `origin/main = b642be9`
- working tree limpio
- `FAILED=0`

## Limitación conocida

El smoke global `npx vitest run src/engine/semantic/tests` todavía contiene fallos legacy/preexistentes fuera de esta microfase.

Lectura actual:

- no están causados por el nuevo archivo de consolidación;
- el nuevo archivo es tests-only;
- el stable A2.10 ring pasa completo;
- las fallas globales reflejan suites antiguas con expectativas previas a la modelización productiva de split/divided damage y algunas superficies overlay/modal antiguas.

Este punto debe tratarse en una fase separada si se quiere limpiar el smoke global completo.

## Cierre

La microfase queda cerrada como consolidación estable A2.10. El estado actual es más robusto porque existe un ring explícito que ata contrato, corpus Oracle real y runtime mínimo de coste/target/legalidad, sin abrir predicados complejos ni tocar comportamiento visible.

Siguiente frente recomendado:

- `A2.10_LEGACY_EXPECTATION_SURFACE_REPAIR_V1`, si queremos alinear las suites antiguas que todavía esperan estados `min_exists=false`/`target_kinds=[]`;
- o pausar A2.10 y avanzar a otra zona del motor con esta base consolidada.
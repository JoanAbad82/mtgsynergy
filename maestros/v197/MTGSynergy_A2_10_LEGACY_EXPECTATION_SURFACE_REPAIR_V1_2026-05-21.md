# MTGSynergy — Cierre documental real v197

## Microfase

`A2.10_LEGACY_EXPECTATION_SURFACE_REPAIR_V1`

## Fecha

2026-05-21

## Estado

Cerrada técnicamente, mergeada, pusheada y sincronizada en `main`.

## Commits

- Feature/test commit: `054da80`
  - `test(semantic): repair a210 legacy expectation surfaces v1`
- Merge commit en `main`: `ab918d3`
  - `merge: a210 legacy expectation surface repair v1`

## Alcance real

La microfase reparó superficies de expectativas legacy en tests semánticos A2.10 que todavía reflejaban el estado previo a la modelización productiva de `split/divided damage`.

El objetivo fue alinear tests antiguos con el runtime ya aceptado y consolidado, no abrir semántica nueva.

## Tipo de cambio

- tests-only
- sin runtime change
- sin lowering/parser change
- sin contract JSON change
- sin UI
- sin overlay code
- sin scoring/SPS/MC
- sin Astro/pages/styles/routing/deploy/build
- sin producto visible

## Archivos modificados

Se modificaron exactamente 14 archivos bajo `src/engine/semantic/tests`:

- `src/engine/semantic/tests/sem_cost_target_legality_modal_target_aggregation_diagnosis_v1.test.ts`
- `src/engine/semantic/tests/sem_cost_target_legality_modal_target_aggregation_guardrail_ring_v1.test.ts`
- `src/engine/semantic/tests/sem_cost_target_legality_modal_target_selection_model_diagnosis_v1.test.ts`
- `src/engine/semantic/tests/sem_cost_target_legality_modal_target_selection_model_extraction_diagnosis_v1.test.ts`
- `src/engine/semantic/tests/sem_cost_target_legality_modal_target_selection_model_extraction_guardrail_ring_v1.test.ts`
- `src/engine/semantic/tests/sem_cost_target_legality_modal_target_selection_model_extraction_v1.test.ts`
- `src/engine/semantic/tests/sem_cost_target_legality_modal_target_selection_model_guardrail_ring_v1.test.ts`
- `src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_allowed_target_kinds_extraction_v1.test.ts`
- `src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_extraction_v1.test.ts`
- `src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_model_diagnosis_v1.test.ts`
- `src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_model_extraction_diagnosis_v1.test.ts`
- `src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_model_extraction_v1.test.ts`
- `src/engine/semantic/tests/sem_cost_target_legality_target_kind_canonicalization_guardrail_ring_v1.test.ts`
- `src/engine/semantic/tests/sem_cost_target_legality_target_kind_canonicalization_v1.test.ts`

Diff real:

- `14 files changed`
- `52 insertions`
- `46 deletions`

## Expectativas reparadas

Se alinearon tests legacy que seguían esperando estados antiguos:

- `min_exists=false`
- `target_kinds=[]`
- ausencia de modelo split/divided productivo

con el baseline actual ya consolidado:

- `current_min_exists=true`
- `current_target_kinds=["ANY_TARGET"]`
- `current_target_count=null`
- `modal_selection_model=null` en superficies split/divided no modales
- `split_divided_damage_target_model` presente y aditivo
- no proyección escalar de `target_count_model`
- no leakage de `legality_kinds`

## Casos principalmente afectados

Legacy split/divided `ANY_TARGET`:

- `Electrolyze`
- `Arc Lightning`
- `Flames of the Firebrand`
- `Pyrotechnics`
- `Rolling Thunder`

Superficies de test afectadas:

- modal target aggregation diagnosis/guardrails
- modal target selection model diagnosis/guardrails
- split/divided target model diagnosis/extraction
- split/divided target kind integration
- target kind canonicalization non-goal surfaces

## Invariantes preservadas

La fase preserva:

- separación CostIR / EffectIR;
- `ANY_TARGET` como umbrella legacy;
- `target_count_model` como canal aditivo/diagnóstico;
- `current_target_count=null` para legacy split/divided;
- `modal_selection_model` no creado para split/divided no modal;
- `current_legality_kinds=[]` en estos casos;
- política de no proyección escalar;
- predicate-bearing limitado a `CREATURE_ONLY` y `WITH_FLYING`;
- negativos no split/no target sin promoción indebida;
- sin full target legality;
- sin resolution model.

## Validación ejecutada

Antes del merge:

- los 14 archivos reparados pasaron individualmente;
- stable A2.10 ring:
  - `14 files passed`
  - `34 tests passed`
- `git diff --check`:
  - limpio

Después del merge:

- los 14 archivos reparados volvieron a pasar individualmente;
- stable A2.10 ring volvió a pasar:
  - `14 files passed`
  - `34 tests passed`
- `git diff --check`:
  - limpio

## Global semantic suite

El diagnóstico global sigue devolviendo:

- `GLOBAL_EXIT=1`

Este residuo no bloquea la fase porque queda fuera del alcance de A2.10 legacy expectation repair.

Fallos residuales conocidos:

- fixtures bajo `tools/family_qualification/...` sin suite de test;
- drift de overlay Rakdos en `sem_overlay_rakdos_signal_diagnose.test.ts`.

La reparación de esta microfase redujo las fallas legacy A2.10 relacionadas con `min_exists=false` / `target_kinds=[]`, pero no intentó resolver superficies overlay/family fuera de alcance.

## Estado final verificado

- `main = ab918d3`
- `origin/main = ab918d3`
- working tree limpio
- `FAILED=0`

## Cierre

La microfase queda cerrada como reparación tests-only de expectativas legacy A2.10. El estado actual del motor es más coherente porque las suites antiguas ya no contradicen el runtime productivo aceptado para split/divided damage.

Siguiente frente recomendado:

- `SEMANTIC_GLOBAL_SUITE_RESIDUAL_FAILURE_TRIAGE_V1`, para clasificar y reparar por separado los 3 residuos restantes del global semantic smoke;
- o pausar A2.10 y abrir otra línea funcional del motor con la base actual ya consolidada.
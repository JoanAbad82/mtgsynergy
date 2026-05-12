# A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_EXTRACTION_V1

## Estado
- Cerrada operativamente.
- Cierre documental pendiente hasta commit.
- Tipo: runtime additive extraction + focused regression test.
- Rama final: `main`.

## Estado Operativo Final
- Repo: `C:\MTGSynergy`.
- Branch final: `main`.
- `main == origin/main == 1ac8acd`.
- Merge commit: `1ac8acd`.
- Feature commit: `c0b97bf`.
- Previous/base commit: `ab649e1`.

## Scope
Archivos modificados:

- `src/engine/semantic/lowering/lower_to_ability_ir_min_v1.ts`
- `src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_model_extraction_v1.test.ts`

Tamaño operativo final:

- `2 files changed`
- `293 insertions`

## Propósito Técnico
Esta microfase implementa extracción productiva aditiva de `split_divided_damage_target_model` para wording real Oracle de split/divided damage.

El objetivo fue añadir el modelo sin sustituir todavía los canales diagnósticos existentes:

- `target_kinds`
- `target_count`
- `modal_selection_model`

## Implementación
Se añadió en `lower_to_ability_ir_min_v1.ts`:

- tipo `SplitDividedDamageModelKindMinV1`
- tipo `SplitDividedDamageTargetModelMinV1`
- helper puro `inferSplitDividedDamageTargetModelMinV1`
- salida top-level `splitDividedDamageTargetModel`
- campo opcional `split_divided_damage_target_model` dentro de `cost_target_legality_min` cuando exista min hint

## Corpus Real Oracle
- Electrolyze
- Arc Lightning
- Flames of the Firebrand
- Pyrotechnics
- Rolling Thunder

## Modelos Productivos Congelados
- Electrolyze:
  - `SPLIT_DIVIDED_DAMAGE_TARGET_MODEL`
  - `ONE_OR_TWO_TARGETS`
  - `conceptual_target_slots_min 1`
  - `conceptual_target_slots_max 2`

- Arc Lightning:
  - `SPLIT_DIVIDED_DAMAGE_TARGET_MODEL`
  - `ONE_TWO_OR_THREE_TARGETS`
  - `conceptual_target_slots_min 1`
  - `conceptual_target_slots_max 3`

- Flames of the Firebrand:
  - `SPLIT_DIVIDED_DAMAGE_TARGET_MODEL`
  - `ONE_TWO_OR_THREE_TARGETS`
  - `conceptual_target_slots_min 1`
  - `conceptual_target_slots_max 3`

- Pyrotechnics:
  - `SPLIT_DIVIDED_DAMAGE_TARGET_MODEL`
  - `ANY_NUMBER_OF_TARGETS`
  - `conceptual_target_slots_min 0`
  - `conceptual_target_slots_max null`
  - `known_gap ANY_NUMBER_OF_TARGETS_MIN_SLOT_IS_CONSERVATIVE_0;SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS`

- Rolling Thunder:
  - `SPLIT_DIVIDED_DAMAGE_TARGET_MODEL`
  - `ANY_NUMBER_OF_TARGETS`
  - `conceptual_target_slots_min 0`
  - `conceptual_target_slots_max null`
  - `known_gap ANY_NUMBER_OF_TARGETS_MIN_SLOT_IS_CONSERVATIVE_0;SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS`

## Invariantes Preservados
- `split_divided_damage_target_model` queda separado de `modal_selection_model`.
- `target_kinds` no se sustituye.
- `target_count` no se sustituye.
- Para el corpus base actual:
  - `current_min_exists false`
  - `current_target_kinds []`
  - `current_target_count null`
  - `current_modal_selection_model null`
- `CAST_ONLY_IF` no aparece en target/model channels.
- `ACTIVATE_ONLY_AS_SORCERY` no aparece en target/model channels.
- `UNKNOWN_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL` queda como fallback explícito.
- No se declara semántica final completa de Magic.

## Validaciones Aprobadas
- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_model_extraction_v1.test.ts`
  - `1 file passed`
  - `1 test passed`
  - marker: `SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_EXTRACTION_V1_COMPLETE`

- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_model_contract_v1.test.ts`
  - `1 file passed`
  - `2 tests passed`

- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_model_extraction_diagnosis_v1.test.ts`
  - `1 file passed`
  - `1 test passed`

- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_modal_target_selection_model_extraction_guardrail_ring_v1.test.ts`
  - `1 file passed`
  - `1 test passed`

- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_contract_freeze_v1.test.ts`
  - `1 file passed`
  - `3 tests passed`

- `npm run build`
  - `cards_index manifest verified: OK`
  - `astro build` complete
  - `4 page(s) built`
  - client bundle generated successfully

- `git diff --check` clean after EOF amend.
- push succeeded.
- final sync verified: `main == origin/main == 1ac8acd`.

## Build/Smoke
- `npm run build` ejecutado y aprobado.
- Public smoke no requerido.
- Cambio engine/runtime local con test focal y build.

## Non-Goals
- No sustituir `target_kinds`.
- No sustituir `target_count`.
- No modificar `modal_selection_model`.
- No tocar UI/CSE/scoring/overlay.
- No tocar public data/package/config.
- No modelar distribución exacta de daño por objetivo.
- No declarar semántica final completa de Magic.

## Siguiente Microfase Recomendada
- `A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_EXTRACTION_GUARDRAIL_RING_V1`
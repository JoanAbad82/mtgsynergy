# A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_CONTRACT_V1

## Estado
- Cerrada operativamente.
- Cierre documental pendiente hasta commit.
- Repo: `C:\MTGSynergy`.
- Branch final: `main`.
- Final sync: `main == origin/main == 8fece04`.
- Merge commit: `8fece04`.
- Feature commit: `356d3a4`.
- Previous/base contract plan merge: `8656ea6`.
- Contract plan commit: `31eb48f`.
- Diagnosis doc commit: `5c44d0f`.
- Diagnosis merge commit: `e877237`.
- Diagnosis test commit: `cc5d105`.

## Resumen Técnico
- Se añadió contrato JSON congelado para `split_divided_damage_target_model`.
- Se añadió test freeze del contrato.
- La microfase es contract+test-only.
- No implementa extracción productiva.
- No cambia runtime/lowering/parser/service/UI/CSE/scoring/overlay/public data/package/config.
- split/divided damage queda separado de `modal_selection_model`.
- `target_kinds` y `target_count` siguen siendo canales de agregación diagnóstica, no sustituidos.

## Archivos Añadidos
- `src/engine/semantic/contract/sem_cost_target_legality_split_divided_damage_target_model_contract_v1.json`
- `src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_model_contract_v1.test.ts`

## Contrato Congelado
- `document_id`: `sem_cost_target_legality_split_divided_damage_target_model_contract_v1`.
- `status`: `contract-freeze`.
- `kind`: `SPLIT_DIVIDED_DAMAGE_TARGET_MODEL`.
- `split_damage_model_kind` enum:
- `ONE_OR_TWO_TARGETS`
- `ONE_TWO_OR_THREE_TARGETS`
- `ANY_NUMBER_OF_TARGETS`
- `UNKNOWN_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL`
- Campos:
- `split_damage_model_kind`
- `conceptual_target_slots_min`
- `conceptual_target_slots_max`
- `damage_allocation_is_divided`
- `productive_min_hint_currently_models_split_damage`
- `target_kinds_policy`
- `notes`
- `known_gap`

## Corpus
- Electrolyze: `ONE_OR_TWO_TARGETS`, conceptual slots `1..2`.
- Arc Lightning: `ONE_TWO_OR_THREE_TARGETS`, conceptual slots `1..3`.
- Flames of the Firebrand: `ONE_TWO_OR_THREE_TARGETS`, conceptual slots `1..3`.
- Pyrotechnics: `ANY_NUMBER_OF_TARGETS`, conceptual slots `0..null` conservador.
- Rolling Thunder: `ANY_NUMBER_OF_TARGETS`, conceptual slots `0..null` conservador.

## Baseline Actual Congelada
- `min_exists false`.
- `target_kinds []`.
- `target_count null`.
- `modal_selection_model null`.
- `target_kinds_policy CURRENTLY_UNMODELLED_EMPTY_TARGET_KINDS`.
- `known_gap SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS`.
- Para any number: `ANY_NUMBER_OF_TARGETS_MIN_SLOT_IS_CONSERVATIVE_0;SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS`.

## Invariantes
- `CAST_ONLY_IF` no aparece en target/model channels.
- `ACTIVATE_ONLY_AS_SORCERY` no aparece en target/model channels.
- `modal_selection_model` no absorbe split/divided damage.
- `target_kinds` y `target_count` no son reemplazados.
- Función total/fallback explícito preservado para `UNKNOWN_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL`.

## Validaciones Aprobadas
- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_model_contract_v1.test.ts`
- `1 file passed`
- `2 tests passed`
- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_model_diagnosis_v1.test.ts`
- `1 file passed`
- `1 test passed`
- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_modal_target_selection_model_extraction_guardrail_ring_v1.test.ts`
- `1 file passed`
- `1 test passed`
- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_contract_freeze_v1.test.ts`
- `1 file passed`
- `3 tests passed`
- `git diff --check` clean after EOF amend.
- push succeeded.
- final sync verified: `main == origin/main == 8fece04`.

## Build/Smoke
- npm run build not required.
- Cambio contract+test-only.
- Public smoke no requerido.

## Non-Goals
- No productive split/divided damage extraction.
- No lowering/parser/service/runtime changes.
- No `modal_selection_model` changes.
- No UI/CSE/scoring/overlay.
- No public data/package/config.
- No sustitución de `target_kinds` ni `target_count`.
- No semántica final completa de Magic.

## Siguiente Microfase Recomendada
- `A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_EXTRACTION_DIAGNOSIS_V1`.
- O, si preferimos antes, `A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_EXTRACTION_PLAN_V1`.

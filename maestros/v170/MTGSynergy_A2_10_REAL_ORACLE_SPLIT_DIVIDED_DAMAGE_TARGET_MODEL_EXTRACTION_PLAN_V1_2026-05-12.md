# A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_EXTRACTION_PLAN_V1

## Estado
- plan-only.
- docs-only.
- sin cambios productivos/runtime.

## Referencias
- `ecde8ae`
- `6636f2b`
- `b1ad055`
- `ee78213`
- `8fece04`
- `356d3a4`
- `sem_cost_target_legality_split_divided_damage_target_model_contract_v1`
- `sem_cost_target_legality_split_divided_damage_target_model_extraction_diagnosis_v1.test.ts`

## Propósito Técnico
- Definir cómo implementar después la extracción productiva de `split_divided_damage_target_model`.
- Mantenerlo separado de `modal_selection_model`.
- Mantener `target_kinds` y `target_count` como canales diagnósticos hasta fase explícita posterior.

## Corpus Base
- Electrolyze
- Arc Lightning
- Flames of the Firebrand
- Pyrotechnics
- Rolling Thunder

## Modelo Objetivo
- `SPLIT_DIVIDED_DAMAGE_TARGET_MODEL`
- `split_damage_model_kind`
- `ONE_OR_TWO_TARGETS`
- `ONE_TWO_OR_THREE_TARGETS`
- `ANY_NUMBER_OF_TARGETS`
- `UNKNOWN_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL`
- `conceptual_target_slots_min`
- `conceptual_target_slots_max`
- `damage_allocation_is_divided`
- `productive_min_hint_currently_models_split_damage`
- `target_kinds_policy`
- `known_gap`

## Plan de Implementación Futura
1. Añadir helper puro de reconocimiento de wording Oracle split/divided damage.
2. Conectar de forma aditiva en `buildCostTargetLegalityHints`.
3. No reemplazar `target_kinds` ni `target_count`.
4. Preservar `modal_selection_model` intacto.
5. Añadir guardrail ring productivo.
6. Validar no-leakage de `CAST_ONLY_IF` y `ACTIVATE_ONLY_AS_SORCERY`.

## Política Para Any Number of Targets
- Mantener `conceptual_target_slots_min` en `0` de forma conservadora.
- Mantener `conceptual_target_slots_max` en `null`.
- Mantener `known_gap` con `ANY_NUMBER_OF_TARGETS_MIN_SLOT_IS_CONSERVATIVE_0`.

## Non-Goals
- No modificar código.
- No modificar tests.
- No modificar contract JSON.
- No tocar lowering/parser/service/runtime.
- No tocar UI/CSE/scoring/overlay.
- No tocar public data/package/config.
- No declarar semántica final completa de Magic.

## Siguiente Microfase Recomendada
- `A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_EXTRACTION_V1`.

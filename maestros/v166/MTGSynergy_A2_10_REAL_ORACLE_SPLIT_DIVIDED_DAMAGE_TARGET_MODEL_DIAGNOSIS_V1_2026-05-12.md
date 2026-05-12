# A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_DIAGNOSIS_V1

## Estado
- Cerrada operativamente.
- Cierre documental pendiente hasta commit.
- Tipo: test-only real Oracle split/divided damage target model diagnosis.

## Estado Operativo Final
- Repo: `C:\MTGSynergy`.
- Branch final: `main`.
- `main == origin/main == e877237`.
- Merge commit: `e877237`.
- Test commit: `cc5d105`.
- Previous/base docs commit: `654f829`.

## Scope
- Archivo añadido: `src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_model_diagnosis_v1.test.ts`.
- Tamaño operativo: `1 file changed`, `264 insertions`.
- Sin cambios productivos/runtime/lowering/parser/service/contract/UI/CSE/scoring/overlay/public-data/package/config.

## Propósito Técnico
- Diagnosticar wording real Oracle de split/divided damage.
- Mantenerlo separado de `modal_selection_model`.
- No reparar comportamiento productivo.
- No declarar semántica final completa de Magic.

## Corpus Real Oracle
- Electrolyze
- Arc Lightning
- Flames of the Firebrand
- Pyrotechnics
- Rolling Thunder

## Observaciones Congeladas
- Electrolyze: `ONE_OR_TWO_TARGETS`, conceptual slots `1..2`, `min_exists false`, `target_kinds []`, `target_count null`, `modal_selection_model null`, `known_gap SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS`.
- Arc Lightning: `ONE_TWO_OR_THREE_TARGETS`, conceptual slots `1..3`, `min_exists false`, `target_kinds []`, `target_count null`, `modal_selection_model null`.
- Flames of the Firebrand: `ONE_TWO_OR_THREE_TARGETS`, conceptual slots `1..3`, `min_exists false`, `target_kinds []`, `target_count null`, `modal_selection_model null`.
- Pyrotechnics: `ANY_NUMBER_OF_TARGETS`, conceptual slots `0..null` conservador, `min_exists false`, `target_kinds []`, `target_count null`, `modal_selection_model null`, `known_gap ANY_NUMBER_OF_TARGETS_MIN_SLOT_IS_CONSERVATIVE_0;SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS`.
- Rolling Thunder: `ANY_NUMBER_OF_TARGETS`, conceptual slots `0..null` conservador, `min_exists false`, `target_kinds []`, `target_count null`, `modal_selection_model null`, `known_gap ANY_NUMBER_OF_TARGETS_MIN_SLOT_IS_CONSERVATIVE_0;SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS`.

## Invariantes
- split/divided damage permanece fuera de `modal_selection_model` productivo.
- `CAST_ONLY_IF` no aparece en `target_kinds` ni en diagnosis.
- `ACTIVATE_ONLY_AS_SORCERY` no aparece en `target_kinds` ni en diagnosis.
- `CostIR`, `TargetSpec`, `LegalityGate` y diagnosis conceptual permanecen separados.

## Validaciones Aprobadas
- split divided damage diagnosis: `1 file passed`, `1 test passed`.
- modal target selection extraction guardrail ring: `1 file passed`, `1 test passed`.
- modal target selection extraction v1: `1 file passed`, `1 test passed`.
- lowering hint wiring: `1 file passed`, `8 tests passed`.
- contract freeze: `1 file passed`, `3 tests passed`.
- `git diff --check` clean after EOF amend.
- push succeeded.
- final sync verified: `main == origin/main == e877237`.

## Build/Smoke
- `npm run build` not required.
- Cambio test-only diagnosis.
- Public smoke no requerido.

## Non-Goals
- No reparación productiva.
- No cambios lowering/parser/service/contract.
- No cambios UI/CSE/scoring/overlay.
- No public data/package/config.
- No sustitución de `target_kinds` ni `target_count`.
- No semántica final completa de Magic.

## Siguiente Microfase Recomendada
- `A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_CONTRACT_PLAN_V1`.
- O, si se quiere avanzar directamente, `A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_CONTRACT_V1`.

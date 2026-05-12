# A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_EXTRACTION_DIAGNOSIS_V1

## Estado
- Cerrada operativamente.
- Cierre documental pendiente hasta commit.
- Tipo: test-only extraction diagnosis.
- Sin cambios productivos/runtime.

## Estado Operativo Final
- Repo: `C:\MTGSynergy`.
- Branch final: `main`.
- `main == origin/main == 6636f2b`.
- Merge commit: `6636f2b`.
- Test commit: `b1ad055`.
- Previous/base docs commit: `ee78213`.

## Scope
Archivo añadido:

- `src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_model_extraction_diagnosis_v1.test.ts`

Tamaño operativo:

- `1 file changed`
- `348 insertions`

No se modificó:

- lowering
- parser
- service
- runtime
- contract JSON
- UI
- CSE
- scoring
- overlay
- public data
- package/config

## Propósito Técnico
Esta microfase añade una diagnosis de extracción para `split_divided_damage_target_model` comparando cuatro capas:

1. Real Oracle text desde `cards_index.json.gz`.
2. Baseline actual de `buildCostTargetLegalityHints`.
3. Contrato congelado `sem_cost_target_legality_split_divided_damage_target_model_contract_v1`.
4. Inferencia local diagnosis-only.

El objetivo no es reparar aún el runtime, sino probar que una extracción determinista local puede reproducir el contrato sin cambiar comportamiento productivo.

## Corpus Real Oracle
- Electrolyze
- Arc Lightning
- Flames of the Firebrand
- Pyrotechnics
- Rolling Thunder

## Resultado Diagnóstico Congelado
Para todas las cartas del corpus:

- `current_min_exists false`
- `current_target_kinds []`
- `current_target_count null`
- `current_modal_selection_model null`
- `extraction_delta_kind MATCHES_CONTRACT`

## Modelos Congelados
- Electrolyze:
  - `ONE_OR_TWO_TARGETS`
  - `conceptual_target_slots_min 1`
  - `conceptual_target_slots_max 2`
  - `known_gap SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS`

- Arc Lightning:
  - `ONE_TWO_OR_THREE_TARGETS`
  - `conceptual_target_slots_min 1`
  - `conceptual_target_slots_max 3`
  - `known_gap SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS`

- Flames of the Firebrand:
  - `ONE_TWO_OR_THREE_TARGETS`
  - `conceptual_target_slots_min 1`
  - `conceptual_target_slots_max 3`
  - `known_gap SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS`

- Pyrotechnics:
  - `ANY_NUMBER_OF_TARGETS`
  - `conceptual_target_slots_min 0`
  - `conceptual_target_slots_max null`
  - `known_gap ANY_NUMBER_OF_TARGETS_MIN_SLOT_IS_CONSERVATIVE_0;SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS`

- Rolling Thunder:
  - `ANY_NUMBER_OF_TARGETS`
  - `conceptual_target_slots_min 0`
  - `conceptual_target_slots_max null`
  - `known_gap ANY_NUMBER_OF_TARGETS_MIN_SLOT_IS_CONSERVATIVE_0;SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS`

## Invariantes Preservados
- `split_divided_damage_target_model` permanece separado de `modal_selection_model`.
- No se inyecta `split_divided_damage_target_model` en runtime.
- `target_kinds` y `target_count` siguen siendo agregación diagnóstica existente.
- `CAST_ONLY_IF` no aparece en target/model channels.
- `ACTIVATE_ONLY_AS_SORCERY` no aparece en target/model channels.
- Función total/fallback explícito preservado mediante `UNKNOWN_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL`.
- No se declara semántica final completa de Magic.

## Validaciones Aprobadas
- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_model_extraction_diagnosis_v1.test.ts`
  - `1 file passed`
  - `1 test passed`
  - marker: `SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_EXTRACTION_DIAGNOSIS_COMPLETE`

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
- final sync verified: `main == origin/main == 6636f2b`.

## Build/Smoke
- npm run build not required.
- Cambio test-only.
- Public smoke no requerido.

## Non-Goals
- No productive split/divided damage extraction.
- No lowering/parser/service/runtime changes.
- No contract JSON changes.
- No `modal_selection_model` changes.
- No UI/CSE/scoring/overlay.
- No public data/package/config.
- No sustitución de `target_kinds` ni `target_count`.

## Siguiente Microfase Recomendada
- `A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_EXTRACTION_PLAN_V1`
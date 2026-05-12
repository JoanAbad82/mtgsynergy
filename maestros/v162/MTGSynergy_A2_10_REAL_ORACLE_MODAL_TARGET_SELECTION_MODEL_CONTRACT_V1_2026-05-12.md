# A2.10_REAL_ORACLE_MODAL_TARGET_SELECTION_MODEL_CONTRACT_V1

## Estado
- Cerrada operativamente.
- Cierre documental pendiente hasta commit de este documento.
- Tipo: contrato aditivo + test de freeze.
- main == origin/main == e0d4c0a.

## Commits
- merge: e0d4c0a
- contract/test: e979c12
- contract-plan base: d854b17
- contract-plan doc commit: c01223b

## Scope
Archivos añadidos:
- src/engine/semantic/contract/sem_cost_target_legality_modal_target_selection_model_contract_v1.json
- src/engine/semantic/tests/sem_cost_target_legality_modal_target_selection_model_contract_v1.test.ts

Tamaño:
- 2 files changed
- 466 insertions

## Contrato congelado
`modal_selection_model` queda definido como estructura aditiva con los campos:
- kind
- mode_selection_kind
- selected_modes_min
- selected_modes_max
- modes_total
- targeted_modes_count
- conceptual_target_slots_min
- conceptual_target_slots_max
- aggregated_target_kinds
- notes
- known_gap

## Enum protegido
- CHOOSE_ONE
- CHOOSE_TWO
- CHOOSE_ONE_OR_MORE
- SPLIT_DIVIDED_DAMAGE_NON_MODAL
- UNKNOWN_MODAL_SELECTION

## Corpus protegido
- Abrade
- Kolaghan's Command
- Cryptic Command
- Prismari Command
- Casualties of War
- Electrolyze

## Invariantes
- modal_selection_model es aditivo.
- No reemplaza target_kinds.
- No reemplaza target_count.
- target_kinds y target_count siguen siendo agregación diagnóstica.
- SPLIT_DIVIDED_DAMAGE_NON_MODAL queda separado de modal normal.
- UNKNOWN_MODAL_SELECTION queda como fallback explícito.
- CAST_ONLY_IF no entra en aggregated_target_kinds.
- ACTIVATE_ONLY_AS_SORCERY no entra en aggregated_target_kinds.

## Validaciones aprobadas
- npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_modal_target_selection_model_contract_v1.test.ts
  - 1 file passed
  - 2 tests passed
- npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_modal_target_selection_model_guardrail_ring_v1.test.ts
  - 1 file passed
  - 1 test passed
- npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_modal_target_selection_model_diagnosis_v1.test.ts
  - 1 file passed
  - 1 test passed
- npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_contract_freeze_v1.test.ts
  - 1 file passed
  - 3 tests passed
- npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_lowering_hint_wiring_v1.test.ts
  - 1 file passed
  - 8 tests passed
- git diff --check clean
- push succeeded
- final sync verified: main == origin/main == e0d4c0a

## Build/smoke
- npm run build not required.
- Cambio contrato+test-only.
- Public smoke no requerido.

## Non-goals preservados
- No runtime changes.
- No parser changes.
- No lowering changes.
- No service changes.
- No UI/CSE/scoring/overlay changes.
- No public data/package/config changes.
- No reparación productiva modal.
- No reparación de Electrolyze.

## Siguiente microfase recomendada
A2.10_REAL_ORACLE_MODAL_TARGET_SELECTION_MODEL_EXTRACTION_DIAGNOSIS_V1

Nota operativa: `maestros/` está ignorado; para el commit documental posterior se requerirá `git add -f`.
# A2.10_REAL_ORACLE_MODAL_TARGET_SELECTION_MODEL_EXTRACTION_DIAGNOSIS_V1

## Estado
- Cerrada operativamente.
- Cierre documental pendiente hasta commit de este documento.
- Tipo: test-only diagnosis.

## Estado final operativo
- repo C:\MTGSynergy
- branch final main
- main == origin/main == 6f6ca13
- merge commit 6f6ca13
- test commit a64f265
- base docs commit cf7908d

## Scope
- Archivo añadido:
  - src/engine/semantic/tests/sem_cost_target_legality_modal_target_selection_model_extraction_diagnosis_v1.test.ts
- 1 file changed
- 255 insertions
- Sin cambios en parser/lowering/service/contract/runtime/UI/CSE/scoring/overlay/public data/package/config/existing tests.

## Propósito técnico
- Diagnosticar si una extracción determinista estrecha de modal_selection_model puede derivarse desde Oracle real.
- Comparar resultado diagnóstico contra el contrato congelado:
  - src/engine/semantic/contract/sem_cost_target_legality_modal_target_selection_model_contract_v1.json
- Confirmar que target_kinds y target_count siguen siendo agregación diagnóstica.
- Confirmar que modal_selection_model es aditivo.
- Mantener Electrolyze como SPLIT_DIVIDED_DAMAGE_NON_MODAL separado de modal normal.
- No implementar extracción productiva.

## Corpus
- Abrade
- Kolaghan's Command
- Cryptic Command
- Prismari Command
- Casualties of War
- Electrolyze

## Diagnóstico observado
- Abrade -> CHOOSE_ONE, modes_total 2, targeted_modes_count 2, conceptual slots 1..1
- Kolaghan's Command -> CHOOSE_TWO, modes_total 4, targeted_modes_count 4, conceptual slots 2..2
- Cryptic Command -> CHOOSE_TWO, modes_total 4, targeted_modes_count 2, conceptual slots 0..2
- Prismari Command -> CHOOSE_TWO, modes_total 4, targeted_modes_count 4, conceptual slots 2..2
- Casualties of War -> CHOOSE_ONE_OR_MORE, modes_total 5, targeted_modes_count 5, conceptual slots 1..5
- Electrolyze -> SPLIT_DIVIDED_DAMAGE_NON_MODAL, conceptual slots 1..2, known_gap SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS

## Invariantes
- CAST_ONLY_IF no aparece en aggregated_target_kinds.
- ACTIVATE_ONLY_AS_SORCERY no aparece en aggregated_target_kinds.
- CostIR, TargetSpec y LegalityGate permanecen separados.
- No se reemplaza target_kinds.
- No se reemplaza target_count.

## Validaciones aprobadas
- npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_modal_target_selection_model_extraction_diagnosis_v1.test.ts
  - 1 file passed
  - 1 test passed
- npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_modal_target_selection_model_contract_v1.test.ts
  - 1 file passed
  - 2 tests passed
- npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_modal_target_selection_model_guardrail_ring_v1.test.ts
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
- final sync verified: main == origin/main == 6f6ca13

## Build/smoke
- npm run build not required.
- Cambio test-only.
- Public smoke no requerido.

## Non-goals preservados
- No runtime changes.
- No parser changes.
- No lowering changes.
- No service changes.
- No contract JSON changes.
- No UI/CSE/scoring/overlay changes.
- No public data/package/config changes.
- No reparación productiva modal.
- No reparación de Electrolyze.

## Siguiente microfase recomendada
A2.10_REAL_ORACLE_MODAL_TARGET_SELECTION_MODEL_EXTRACTION_V1
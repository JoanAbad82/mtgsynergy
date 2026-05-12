# A2.10_REAL_ORACLE_MODAL_TARGET_SELECTION_MODEL_EXTRACTION_V1

## Estado
- Cerrada operativamente.
- Cierre documental pendiente hasta commit de este documento.
- Tipo: productive additive A2.10 modal target selection model extraction.

## Estado Final Operativo
- repo: C:\MTGSynergy
- branch final: main
- main == origin/main == 1dd5fc0
- merge commit: 1dd5fc0
- feature commit: 8f8142c
- previous docs/base commit: a65b4e8

## Scope
Archivos cambiados operativamente:
- src/engine/semantic/lowering/lower_to_ability_ir_min_v1.ts
- src/engine/semantic/tests/sem_cost_target_legality_modal_target_selection_model_extraction_v1.test.ts

Tamaño operativo:
- 2 files changed
- 377 insertions

Sin cambios en UI/CSE/scoring/overlay/public data/package/config/contract JSON/service.

## Resumen Técnico
- Se añadió `modal_selection_model` de forma aditiva al `costTargetLegalityMin`.
- No reemplaza `target_kinds`.
- No reemplaza `target_count`.
- `target_kinds` y `target_count` siguen siendo canales de agregación diagnóstica.
- La extracción productiva cubre patrones estrechos:
  - `Choose one —`
  - `Choose two —`
  - `Choose one or more —`
- Se añadieron campos:
  - `kind`
  - `mode_selection_kind`
  - `selected_modes_min`
  - `selected_modes_max`
  - `modes_total`
  - `targeted_modes_count`
  - `conceptual_target_slots_min`
  - `conceptual_target_slots_max`
  - `aggregated_target_kinds`
  - `notes`
  - `known_gap`
- kind usado:
  - `MODAL_SELECTION_MODEL`
- kinds cubiertos:
  - `CHOOSE_ONE`
  - `CHOOSE_TWO`
  - `CHOOSE_ONE_OR_MORE`
  - `UNKNOWN_MODAL_SELECTION` como fallback conservador.
- `SPLIT_DIVIDED_DAMAGE_NON_MODAL` queda fuera de reparación productiva.
- Electrolyze permanece sin `costTargetLegalityMin` y sin `modal_selection_model` productivo.

## Corpus Protegido
- Abrade
- Kolaghan's Command
- Cryptic Command
- Prismari Command
- Casualties of War
- Electrolyze

## Snapshots Esperados
- Abrade:
  - `CHOOSE_ONE`
  - `modes_total 2`
  - `targeted_modes_count 2`
  - conceptual slots `1..1`
  - `aggregated_target_kinds ["ARTIFACT","CREATURE"]`
- Kolaghan's Command:
  - `CHOOSE_TWO`
  - `modes_total 4`
  - `targeted_modes_count 4`
  - conceptual slots `2..2`
  - `aggregated_target_kinds ["ANY_TARGET","ARTIFACT","CREATURE","PLAYER"]`
- Cryptic Command:
  - `CHOOSE_TWO`
  - `modes_total 4`
  - `targeted_modes_count 2`
  - conceptual slots `0..2`
  - `aggregated_target_kinds ["PERMANENT","UNKNOWN_TARGET_KIND"]`
- Prismari Command:
  - `CHOOSE_TWO`
  - `modes_total 4`
  - `targeted_modes_count 4`
  - conceptual slots `2..2`
  - `aggregated_target_kinds ["ANY_TARGET","ARTIFACT","PLAYER"]`
- Casualties of War:
  - `CHOOSE_ONE_OR_MORE`
  - `modes_total 5`
  - `targeted_modes_count 5`
  - conceptual slots `1..5`
  - `aggregated_target_kinds ["ARTIFACT","CREATURE","LAND","UNKNOWN_TARGET_KIND"]`
- Electrolyze:
  - `SPLIT_DIVIDED_DAMAGE_NON_MODAL` marker documented as non-goal
  - min remains absent/falsy
  - no productive repair

## Invariantes y No-Leakage
- `modal_selection_model` se mantiene aditivo.
- `target_kinds` y `target_count` se preservan como señal diagnóstica.
- `CAST_ONLY_IF` no aparece en `aggregated_target_kinds`.
- `ACTIVATE_ONLY_AS_SORCERY` no aparece en `aggregated_target_kinds`.
- `CostIR`, `TargetSpec` y `LegalityGate` se mantienen separados.

## Validaciones Aprobadas
- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_modal_target_selection_model_extraction_v1.test.ts`
  - 1 file passed
  - 1 test passed
- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_modal_target_selection_model_extraction_diagnosis_v1.test.ts`
  - 1 file passed
  - 1 test passed
- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_modal_target_selection_model_contract_v1.test.ts`
  - 1 file passed
  - 2 tests passed
- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_modal_target_selection_model_guardrail_ring_v1.test.ts`
  - 1 file passed
  - 1 test passed
- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_modal_target_aggregation_guardrail_ring_v1.test.ts`
  - 1 file passed
  - 1 test passed
- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_lowering_hint_wiring_v1.test.ts`
  - 1 file passed
  - 8 tests passed
- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_contract_freeze_v1.test.ts`
  - 1 file passed
  - 3 tests passed
- `npm run build`
  - cards_index manifest verified: OK
  - astro build completed
  - 4 pages built
- `git diff --check` clean
- push succeeded
- final sync verified: `main == origin/main == 1dd5fc0`

## Build/Smoke
- `npm run build` ejecutado y aprobado.
- Public smoke no requerido por alcance de microfase.

## Non-goals Preservados
- No UI.
- No CSE.
- No scoring.
- No overlay.
- No public data.
- No package/config.
- No contract JSON changes.
- No service changes.
- No reparación productiva de Electrolyze.
- No sustitución de `target_kinds` ni `target_count`.

## Siguiente Microfase Recomendada
`A2.10_REAL_ORACLE_MODAL_TARGET_SELECTION_MODEL_EXTRACTION_GUARDRAIL_RING_V1`
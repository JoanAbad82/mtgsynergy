# A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_EXTRACTION_GUARDRAIL_RING_V1

## Estado
- Cerrada operativamente.
- Cierre documental pendiente hasta commit.
- Tipo: test-only guardrail ring.
- Sin cambios runtime/lowering/parser/service.

## Estado Operativo Final
- Repo: `C:\MTGSynergy`.
- Branch final: `main`.
- `main == origin/main == e816ce5`.
- Merge commit: `e816ce5`.
- Test commit: `5dbf6b4`.
- Previous/base docs commit: `f59c23c`.

## Scope
Archivo añadido:

- `src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_model_extraction_guardrail_ring_v1.test.ts`

Tamaño operativo:

- `1 file changed`
- `193 insertions`

No se modificó:

- runtime
- lowering
- parser
- service
- contract JSON
- UI
- CSE
- scoring
- overlay
- public data
- package/config

## Propósito Técnico
Esta microfase añade un guardrail ring estable para la extracción productiva aditiva de `split_divided_damage_target_model`.

El ring congela que el modelo existe para el corpus real Oracle de split/divided damage, pero que sigue separado de los canales diagnósticos existentes:

- `modal_selection_model`
- `target_kinds`
- `target_count`

## Corpus Real Oracle
- Electrolyze
- Arc Lightning
- Flames of the Firebrand
- Pyrotechnics
- Rolling Thunder

## Invariantes Congelados
Para todas las cartas del corpus:

- `split_divided_damage_target_model` existe.
- `SPLIT_DIVIDED_DAMAGE_TARGET_MODEL` se mantiene como `kind`.
- `damage_allocation_is_divided true`.
- `productive_min_hint_currently_models_split_damage true`.
- `target_kinds_policy CURRENTLY_UNMODELLED_EMPTY_TARGET_KINDS`.
- `current_min_exists false`.
- `current_target_kinds []`.
- `current_target_count null`.
- `current_modal_selection_model null`.

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

## No-Leakage
- `CAST_ONLY_IF` no aparece en target/model channels.
- `ACTIVATE_ONLY_AS_SORCERY` no aparece en target/model channels.
- `split_divided_damage_target_model` no absorbe legality gates.
- `split_divided_damage_target_model` no se mezcla con `modal_selection_model`.


## Marcadores Técnicos Explícitos
- splitDividedDamageTargetModel queda congelado como salida top-level del bundle de hints.
- UNKNOWN_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL queda documentado como fallback explícito para wording futuro no reconocido.
## Validaciones Aprobadas
- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_model_extraction_guardrail_ring_v1.test.ts`
  - `1 file passed`
  - `1 test passed`
  - marker: `SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_EXTRACTION_GUARDRAIL_RING_COMPLETE`

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

- `npm test -- --run src/engine/semantic/tests/sem_cost_target_legality_lowering_hint_wiring_v1.test.ts`
  - `1 file passed`
  - `8 tests passed`

- `git diff --check` clean.
- push succeeded.
- final sync verified: `main == origin/main == e816ce5`.

## Build/Smoke
- npm run build not required.
- Cambio test-only.
- Public smoke no requerido.

## Non-Goals
- No runtime changes.
- No lowering/parser/service changes.
- No contract JSON changes.
- No `modal_selection_model` changes.
- No sustitución de `target_kinds`.
- No sustitución de `target_count`.
- No UI/CSE/scoring/overlay.
- No public data/package/config.
- No modelar distribución exacta de daño por objetivo.
- No declarar semántica final completa de Magic.

## Siguiente Microfase Recomendada
- `A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_TARGET_KIND_INTEGRATION_PLAN_V1`

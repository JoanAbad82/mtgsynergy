# MTGSynergy — A2.10 Real Oracle Split/Divided Damage Target Count Model Extraction V1

Project: MTGSynergy / PÁGINA WEB MAGIC
Date: 2026-05-13
Microphase: A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_EXTRACTION_V1
Status: Closed operationally and documentarily

## 1. Executive summary

This microphase closes the first productive extraction of split/divided damage target-count and allocation semantics.

The implemented change adds a conservative `target_count_model` to the already existing `split_divided_damage_target_model` for recognized real Oracle split/divided damage wording.

The extraction is deliberately narrow. It does not populate scalar `costTargetLegalityMin.target_count`, does not expand `ANY_TARGET`, does not create modal selection semantics, does not introduce legality gates, and does not touch UI, overlay, scoring, CSE, package/config, public data, or build wiring.

The key productive result is:

```text
split_divided_damage_target_model.target_count_model
```

for the closed five-card corpus:

```text
Electrolyze
Arc Lightning
Flames of the Firebrand
Pyrotechnics
Rolling Thunder
```

## 2. Baseline and closure commits

Baseline before the operational feature branch:

```text
04df61d
```

Feature branch:

```text
feat/a210-split-divided-damage-target-count-model-extraction-v1
```

Feature commit:

```text
fd39d85 feat: add a210 split divided damage target count extraction v1
```

Operational merge commit on `main`:

```text
1db6441 merge: a210 split divided damage target count extraction v1
```

Final synchronized operational state before this documentary closure:

```text
HEAD == origin/main == 1db6441
```

## 3. Scope closed

### In scope

* Minimal productive extraction of `target_count_model`.
* Additive wiring into the existing split/divided damage target model path.
* Focused extraction test for the closed real Oracle corpus.
* Preservation of the frozen contract semantics.
* Preservation of target-kind emission from `allowed_target_kinds`.
* Preservation of scalar `target_count == null`.

### Out of scope

* No parser rewrite.
* No general target parser.
* No damage allocation solver.
* No target legality evaluator.
* No resolution-time target legality.
* No modal selection model.
* No legality gates.
* No scalar `costTargetLegalityMin.target_count` projection.
* No `ANY_TARGET` expansion.
* No UI labels.
* No overlay behavior.
* No scoring behavior.
* No CSE behavior.
* No package/config changes.
* No public data changes.
* No build pipeline changes.
* No previous contract rewrites.

## 4. Files changed operationally

The operational merge changed exactly these files:

```text
src/engine/semantic/lowering/lower_to_ability_ir_min_v1.ts
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_model_extraction_v1.test.ts
```

No files outside that operational scope were changed.

## 5. Productive behavior closed

The lowering now emits a `target_count_model` for recognized split/divided damage target-count wording.

The model is attached to the existing split/divided damage structure:

```text
split_divided_damage_target_model.target_count_model
```

The same model is visible through the min-channel split/divided model mirror when that mirror is present:

```text
costTargetLegalityMin.split_divided_damage_target_model.target_count_model
```

The extraction is additive and only occurs for recognized split/divided damage wording.

## 6. Target count model shape

The emitted model follows the frozen contract shape:

```json
{
  "kind": "ONE_OR_TWO_TARGETS",
  "min_targets": 1,
  "max_targets": 2,
  "is_variable": false,
  "variable_symbol": null,
  "requires_damage_allocation": true,
  "damage_amount_kind": "FIXED",
  "damage_amount": 2,
  "raw_text": "2 damage divided as you choose among one or two targets"
}
```

For variable X damage, the model preserves variable identity:

```json
{
  "kind": "ANY_NUMBER_OF_TARGETS",
  "min_targets": 1,
  "max_targets": null,
  "is_variable": true,
  "variable_symbol": "X",
  "requires_damage_allocation": true,
  "damage_amount_kind": "VARIABLE",
  "damage_amount": null,
  "raw_text": "X damage divided as you choose among any number of targets"
}
```

## 7. Corpus closed

The closed real Oracle corpus and productive readings are:

```text
Electrolyze -> ONE_OR_TWO_TARGETS, min 1, max 2, fixed 2 damage
Arc Lightning -> ONE_TWO_OR_THREE_TARGETS, min 1, max 3, fixed 3 damage
Flames of the Firebrand -> ONE_TWO_OR_THREE_TARGETS, min 1, max 3, fixed 3 damage
Pyrotechnics -> ANY_NUMBER_OF_TARGETS, min 1, max null, fixed 4 damage
Rolling Thunder -> ANY_NUMBER_OF_TARGETS, min 1, max null, variable X damage
```

The runtime output preserves `Rolling Thunder` as variable:

```text
variable_symbol == "X"
damage_amount_kind == "VARIABLE"
damage_amount == null
```

The fixed-damage cases preserve their numeric damage amounts.

## 8. Conservative policy preserved

The following invariants remain closed and preserved:

```text
current_target_kinds == ["ANY_TARGET"]
current_target_count == null
current_modal_selection_model == null
current_legality_kinds == []
allowed_target_kinds == ["ANY_TARGET"]
```

This is the most important policy preserved by the microphase.

The project now models split/divided target-count/allocation structure without flattening range semantics into scalar `target_count`.

## 9. Guardrails preserved

The extraction preserves the following guardrails:

```text
No scalar target_count projection
No ANY_TARGET expansion
No modal_selection_model creation
No legality_kinds population
No legality gate leakage
No parser rewrite
No UI or scoring surface changes
```

The forbidden legality or gate-like values remain excluded from target kind fields:

```text
CAST_ONLY_IF
ACTIVATE_ONLY_AS_SORCERY
CONTROLS_X
ATTACKED_THIS_TURN
ONCE_EACH_TURN
OTHER_LEGALITY_TEXT
```

`ANY_TARGET` remains canonical and is not expanded into:

```text
CREATURE
PLAYER
PLANESWALKER
BATTLE
```

## 10. Tests executed and passing

The focused extraction test passed:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_model_extraction_v1.test.ts

PASS: 1 file passed
PASS: 1 test passed
TARGET_COUNT_MODEL_EXTRACTION_V1_COMPLETE
```

The frozen target-count contract test passed:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_model_contract_v1.test.ts

PASS: 1 file passed
PASS: 2 tests passed
TARGET_COUNT_MODEL_CONTRACT_V1_COMPLETE
```

The target-kind emission regression passed:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_target_kinds_emission_v1.test.ts

PASS: 1 file passed
PASS: 1 test passed
TARGET_KINDS_EMISSION_V1_COMPLETE
```

These tests were run before commit and again after merge on `main`.

## 11. Validation and hygiene

Changed scope before commit:

```text
src/engine/semantic/lowering/lower_to_ability_ir_min_v1.ts
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_model_extraction_v1.test.ts
```

Encoding and file hygiene passed:

```text
hasBom=False
hasCR=False
no trailing whitespace detected
```

Diff hygiene passed:

```text
git diff --check
clean

git diff --cached --check
clean
```

Staged scope was exact:

```text
src/engine/semantic/lowering/lower_to_ability_ir_min_v1.ts
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_model_extraction_v1.test.ts
```

Feature commit summary:

```text
fd39d85 feat: add a210 split divided damage target count extraction v1

2 files changed, 418 insertions(+)
```

## 12. Merge and push validation

Feature branch was confirmed clean at:

```text
fd39d85
```

Main baseline before merge:

```text
HEAD == origin/main == 04df61d
```

Merge completed successfully:

```text
1db6441 merge: a210 split divided damage target count extraction v1
```

Merge scope was exact:

```text
src/engine/semantic/lowering/lower_to_ability_ir_min_v1.ts
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_model_extraction_v1.test.ts
```

Push completed successfully:

```text
04df61d..1db6441 main -> main
```

Final sync after push:

```text
branch: main
HEAD: 1db6441
origin/main: 1db6441
working tree clean
```

Final operational markers:

```text
TARGET_COUNT_MODEL_EXTRACTION_V1_MERGED_AND_PUSHED
A2_10_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_EXTRACTION_V1_OPERATIONAL_COMPLETE
```

## 13. Architectural reading

This microphase is an important semantic step because it adds a productive, structured count/allocation model without collapsing semantics into lossy scalar fields.

The separation remains intact:

```text
split_divided_damage_target_model
```

owns split/divided damage-specific structure, while:

```text
costTargetLegalityMin.target_count
```

remains null.

This preserves the distinction between:

```text
target-kind projection
target-count range semantics
damage allocation semantics
modal selection
legality gates
```

The project now has a more expressive A2.10 target channel while preserving conservative behavior.

## 14. Validation policy

No build was required because the change touched semantic lowering and focused tests only. It did not touch UI, bundle wiring, routes, public data, package config, generated assets, or production-visible surface.

Under the post-v33 validation protocol:

```text
Anillo A: focused extraction test
Anillo B: frozen contract test + target kinds emission regression
Anillo C: not applicable
```

A and B passed. C did not apply.

## 15. Closure decision

This microphase is closed.

The project now productively emits `target_count_model` for the closed split/divided damage corpus while preserving:

```text
target_kinds == ["ANY_TARGET"]
target_count == null
modal_selection_model == null
legality_kinds == []
```

## 16. Recommended next microphase

Recommended next microphase:

```text
A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_EXTRACTION_GUARDRAIL_RING_V1
```

Rationale:

* Productive extraction is now live in `main`.
* The next correct step is to promote this behavior into a stable guardrail ring.
* The guardrail should freeze the new `target_count_model` behavior against future drift.
* It should also preserve the existing target-kind, target-count-null, modal-null, and legality-empty invariants.

After the guardrail ring, a later separate microphase may consider scalar projection policy if needed, but not before contract-first analysis.

## 17. Final markers

```text
TARGET_COUNT_MODEL_EXTRACTION_V1_COMMITTED
TARGET_COUNT_MODEL_EXTRACTION_V1_MERGED_AND_PUSHED
TARGET_COUNT_MODEL_EXTRACTION_V1_COMPLETE
A2_10_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_EXTRACTION_V1_OPERATIONAL_COMPLETE
A2_10_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_EXTRACTION_V1_DOCUMENTARY_CLOSURE_COMPLETE
```
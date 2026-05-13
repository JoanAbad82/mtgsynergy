# MTGSynergy — A2.10 Real Oracle Split/Divided Damage Target Count Model Extraction Guardrail Ring V1

Project: MTGSynergy / PÁGINA WEB MAGIC
Date: 2026-05-13
Microphase: A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_EXTRACTION_GUARDRAIL_RING_V1
Status: Closed operationally and documentarily

## 1. Executive summary

This microphase closes the stable guardrail ring for the already productive split/divided damage `target_count_model` extraction.

The previous extraction microphase added a conservative `target_count_model` to the existing `split_divided_damage_target_model` for recognized real Oracle split/divided damage wording.

This guardrail ring did not change runtime behavior. It added a test-only regression ring that freezes the productive baseline and protects it from future semantic drift.

The guardrail confirms that the project now preserves all of the following simultaneously:

```text
split_divided_damage_target_model.target_count_model exists
allowed_target_kinds == ["ANY_TARGET"]
costTargetLegalityMin.target_kinds == ["ANY_TARGET"]
costTargetLegalityMin.target_count == null
modal_selection_model == null
legality_kinds == []
```

## 2. Baseline and closure commits

Baseline before the guardrail test branch:

```text
f0b6218
```

Feature/test branch:

```text
test/a210-split-divided-damage-target-count-model-extraction-guardrail-ring-v1
```

Feature/test commit:

```text
2d4c0c1 test: add a210 split divided damage target count extraction guardrail ring v1
```

Operational merge commit on `main`:

```text
cb81645 merge: a210 split divided damage target count extraction guardrail ring v1
```

Final synchronized operational state before this documentary closure:

```text
HEAD == origin/main == cb81645
```

## 3. Scope closed

### In scope

* Test-only guardrail ring for productive `target_count_model` extraction.
* Five-card real Oracle split/divided damage corpus.
* Exact target-count/allocation model freeze.
* Preservation of `ANY_TARGET` target-kind policy.
* Preservation of scalar `target_count == null`.
* Preservation of `modal_selection_model == null`.
* Preservation of `legality_kinds == []`.
* Regression coverage against target-kind emission drift.
* Regression coverage against target-count contract drift.

### Out of scope

* No runtime code changes.
* No lowering changes.
* No parser changes.
* No contract changes.
* No UI changes.
* No overlay changes.
* No scoring changes.
* No CSE changes.
* No package/config changes.
* No public data changes.
* No build pipeline changes.
* No scalar `target_count` projection.
* No `ANY_TARGET` expansion.
* No legality gate creation.
* No modal selection semantics.

## 4. Files changed operationally

The operational merge changed exactly one file:

```text
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_model_extraction_guardrail_ring_v1.test.ts
```

No runtime files were changed.

No files outside the allowed test-only scope were changed.

## 5. Guardrail behavior frozen

The new guardrail ring freezes the productive extraction baseline for this corpus:

```text
Electrolyze
Arc Lightning
Flames of the Firebrand
Pyrotechnics
Rolling Thunder
```

For every corpus card, the guardrail verifies:

```text
current_min_exists == true
current_target_kinds == ["ANY_TARGET"]
current_target_count == null
current_modal_selection_model == null
current_legality_kinds == []
split_divided_damage_target_model exists
split_divided_damage_target_model.allowed_target_kinds == ["ANY_TARGET"]
split_divided_damage_target_model.target_count_model exists
```

If the min-channel split/divided damage model mirror exists, the guardrail also verifies that it carries the same `target_count_model`.

## 6. Target count model values frozen

The guardrail freezes these exact productive values:

```text
Electrolyze -> ONE_OR_TWO_TARGETS, min 1, max 2, fixed 2 damage
Arc Lightning -> ONE_TWO_OR_THREE_TARGETS, min 1, max 3, fixed 3 damage
Flames of the Firebrand -> ONE_TWO_OR_THREE_TARGETS, min 1, max 3, fixed 3 damage
Pyrotechnics -> ANY_NUMBER_OF_TARGETS, min 1, max null, fixed 4 damage
Rolling Thunder -> ANY_NUMBER_OF_TARGETS, min 1, max null, variable X damage
```

Representative fixed-damage shape:

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

Representative variable-damage shape:

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

## 7. Conservative policy preserved

The most important policy preserved by this ring is:

```text
costTargetLegalityMin.target_count == null
```

The project intentionally does not flatten range-based target semantics into a scalar.

The richer count/allocation structure remains inside:

```text
split_divided_damage_target_model.target_count_model
```

This preserves the distinction between:

```text
target-kind projection
target-count range semantics
damage allocation semantics
modal selection
legality gates
```

## 8. Target-kind guardrails preserved

The guardrail ring preserves:

```text
allowed_target_kinds == ["ANY_TARGET"]
target_kinds == ["ANY_TARGET"]
```

The guardrail forbids expansion of `ANY_TARGET` into:

```text
CREATURE
PLAYER
PLANESWALKER
BATTLE
```

The guardrail also protects against leakage of legality or gate-like values into target kind fields:

```text
CAST_ONLY_IF
ACTIVATE_ONLY_AS_SORCERY
CONTROLS_X
ATTACKED_THIS_TURN
ONCE_EACH_TURN
OTHER_LEGALITY_TEXT
```

## 9. Tests executed and passing

The new guardrail ring test passed on the feature/test branch and again after merge on `main`:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_model_extraction_guardrail_ring_v1.test.ts

PASS: 1 file passed
PASS: 1 test passed
TARGET_COUNT_MODEL_EXTRACTION_GUARDRAIL_RING_V1_COMPLETE
```

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

## 10. Validation and hygiene

Changed scope before commit:

```text
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_model_extraction_guardrail_ring_v1.test.ts
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
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_model_extraction_guardrail_ring_v1.test.ts
```

Feature/test commit summary:

```text
2d4c0c1 test: add a210 split divided damage target count extraction guardrail ring v1

1 file changed, 260 insertions(+)
```

## 11. Merge and push validation

Feature/test branch was confirmed clean at:

```text
2d4c0c1
```

Main baseline before merge:

```text
HEAD == origin/main == f0b6218
```

Merge completed successfully:

```text
cb81645 merge: a210 split divided damage target count extraction guardrail ring v1
```

Merge scope was exact:

```text
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_model_extraction_guardrail_ring_v1.test.ts
```

Push completed successfully:

```text
f0b6218..cb81645 main -> main
```

Final sync after push:

```text
branch: main
HEAD: cb81645
origin/main: cb81645
working tree clean
```

Final operational markers:

```text
TARGET_COUNT_MODEL_EXTRACTION_GUARDRAIL_RING_V1_MERGED_AND_PUSHED
A2_10_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_EXTRACTION_GUARDRAIL_RING_V1_OPERATIONAL_COMPLETE
```

## 12. Architectural reading

This guardrail ring is important because the project now has productive target-count/allocation extraction and a stable regression ring protecting it.

The ring preserves the architectural choice that split/divided damage-specific count semantics belong to:

```text
split_divided_damage_target_model.target_count_model
```

and not to a lossy scalar projection:

```text
costTargetLegalityMin.target_count
```

It also confirms that the target-count work did not contaminate target-kind semantics, modal selection semantics, or legality semantics.

## 13. Validation policy

No build was required because this microphase touched only a semantic test file.

Under the post-v33 validation protocol:

```text
Anillo A: new guardrail ring test
Anillo B: focused extraction test + frozen contract test + target-kind emission regression
Anillo C: not applicable
```

A and B passed. C did not apply.

## 14. Closure decision

This microphase is closed.

The project now has productive extraction plus a stable guardrail ring for split/divided damage `target_count_model`.

Runtime behavior remains unchanged by this microphase.

## 15. Recommended next microphase

Recommended next microphase:

```text
A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_SCALAR_PROJECTION_POLICY_PLAN_V1
```

Rationale:

* The rich `target_count_model` is now extracted and guarded.
* Scalar `costTargetLegalityMin.target_count` remains intentionally null.
* Any future decision to project count ranges into scalar diagnostics must be contract-first.
* A policy plan should decide whether scalar projection is useful, forbidden, or only allowed for exact non-range counts.
* No scalar projection should be implemented without a separate contract.

Alternative next microphase if scalar projection is deferred:

```text
A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_ADDITIONAL_CORPUS_PLAN_V1
```

## 16. Final markers

```text
TARGET_COUNT_MODEL_EXTRACTION_GUARDRAIL_RING_V1_COMMITTED
TARGET_COUNT_MODEL_EXTRACTION_GUARDRAIL_RING_V1_MERGED_AND_PUSHED
TARGET_COUNT_MODEL_EXTRACTION_GUARDRAIL_RING_V1_COMPLETE
A2_10_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_EXTRACTION_GUARDRAIL_RING_V1_OPERATIONAL_COMPLETE
A2_10_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_EXTRACTION_GUARDRAIL_RING_V1_DOCUMENTARY_CLOSURE_COMPLETE
```
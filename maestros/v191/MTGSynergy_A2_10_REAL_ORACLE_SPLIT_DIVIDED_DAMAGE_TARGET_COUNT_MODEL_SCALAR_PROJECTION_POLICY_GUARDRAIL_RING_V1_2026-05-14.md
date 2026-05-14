# MTGSynergy — A2.10 Real Oracle Split/Divided Damage Target Count Model Scalar Projection Policy Guardrail Ring V1

Project: MTGSynergy / PÁGINA WEB MAGIC
Date: 2026-05-14
Microphase: A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_SCALAR_PROJECTION_POLICY_GUARDRAIL_RING_V1
Status: Closed operationally and documentarily

## 1. Executive summary

This microphase closes the test-only guardrail ring for the scalar projection policy around split/divided damage `target_count_model` semantics.

The previously closed contract established that rich range/open-ended target-count semantics must not be flattened into:

```text
costTargetLegalityMin.target_count
```

This guardrail ring now verifies that policy through the real runtime/lowering path.

The productive runtime remains:

```text
current_target_count == null
```

The rich count/allocation model remains canonical:

```text
split_divided_damage_target_model.target_count_model
```

No runtime code, lowering, parser, contract JSON, UI, overlay, scoring, CSE, package/config, public data, or build wiring was changed.

## 2. Baseline and closure commits

Baseline before the guardrail test branch:

```text
377a820
```

Feature/test branch:

```text
test/a210-split-divided-damage-target-count-scalar-projection-policy-guardrail-ring-v1
```

Feature/test commit:

```text
c024ae2 test: add a210 split divided damage target count scalar projection policy guardrail ring v1
```

Operational merge commit on `main`:

```text
de2c30e merge: a210 split divided damage target count scalar projection policy guardrail ring v1
```

Final synchronized operational state before this documentary closure:

```text
HEAD == origin/main == de2c30e
```

## 3. Scope closed

### In scope

* Test-only guardrail ring for scalar projection policy.
* Runtime verification that `target_count` remains null for the current corpus.
* Runtime verification that `target_count_model` remains productive and exact.
* Regression coverage for the scalar projection policy contract.
* Regression coverage for target count model extraction guardrail.
* Regression coverage for focused target count model extraction.
* Preservation of `ANY_TARGET` target-kind policy.
* Preservation of modal and legality boundaries.

### Out of scope

* No runtime implementation.
* No lowering change.
* No parser change.
* No contract JSON change.
* No existing test mutation.
* No UI change.
* No overlay change.
* No scoring change.
* No CSE change.
* No package/config change.
* No public data change.
* No build pipeline change.
* No scalar projection implementation.
* No additional corpus expansion.

## 4. Files changed operationally

The operational merge changed exactly one file:

```text
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_scalar_projection_policy_guardrail_ring_v1.test.ts
```

No runtime files were changed.

No files outside the allowed test-only scope were changed.

## 5. Guardrail behavior frozen

The guardrail ring exercises the real runtime/lowering path for the closed split/divided damage corpus:

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

If the min-channel split/divided damage model mirror exists, the guardrail verifies that it also carries the same `target_count_model`.

## 6. Scalar projection policy protected

The core policy protected by this ring is:

```text
DO_NOT_PROJECT
```

For the current corpus, this means:

```text
target_count remains null
```

The guardrail protects against accidental scalar projections such as:

```text
target_count = min_targets
target_count = max_targets
target_count = damage_amount
target_count = conceptual_target_slots_min
target_count = conceptual_target_slots_max
target_count = 0 for any number of targets
target_count = 1 for any number of targets
target_count = comma-separated target word count
target_count = variable symbol X
```

## 7. Target count model values preserved

The guardrail confirms these productive model values remain intact:

```text
Electrolyze -> ONE_OR_TWO_TARGETS, min 1, max 2, fixed 2 damage
Arc Lightning -> ONE_TWO_OR_THREE_TARGETS, min 1, max 3, fixed 3 damage
Flames of the Firebrand -> ONE_TWO_OR_THREE_TARGETS, min 1, max 3, fixed 3 damage
Pyrotechnics -> ANY_NUMBER_OF_TARGETS, min 1, max null, fixed 4 damage
Rolling Thunder -> ANY_NUMBER_OF_TARGETS, min 1, max null, variable X damage
```

Representative fixed-damage model:

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

Representative variable-damage model:

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

## 8. Target-kind and legality boundaries preserved

The guardrail preserves:

```text
target_kinds == ["ANY_TARGET"]
allowed_target_kinds == ["ANY_TARGET"]
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

The following boundaries remain intact:

```text
current_target_count == null
current_modal_selection_model == null
current_legality_kinds == []
```

## 9. Tests executed and passing

The new scalar projection policy guardrail ring passed on the feature/test branch and again after merge on `main`:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_scalar_projection_policy_guardrail_ring_v1.test.ts

PASS: 1 file passed
PASS: 1 test passed
TARGET_COUNT_SCALAR_PROJECTION_POLICY_GUARDRAIL_RING_V1_COMPLETE
```

The scalar projection policy contract regression passed:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_scalar_projection_policy_contract_v1.test.ts

PASS: 1 file passed
PASS: 2 tests passed
TARGET_COUNT_SCALAR_PROJECTION_POLICY_CONTRACT_V1_COMPLETE
```

The target count model extraction guardrail regression passed:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_model_extraction_guardrail_ring_v1.test.ts

PASS: 1 file passed
PASS: 1 test passed
TARGET_COUNT_MODEL_EXTRACTION_GUARDRAIL_RING_V1_COMPLETE
```

The focused extraction regression passed:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_model_extraction_v1.test.ts

PASS: 1 file passed
PASS: 1 test passed
TARGET_COUNT_MODEL_EXTRACTION_V1_COMPLETE
```

## 10. Validation and hygiene

Changed scope before commit:

```text
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_scalar_projection_policy_guardrail_ring_v1.test.ts
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
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_scalar_projection_policy_guardrail_ring_v1.test.ts
```

Feature/test commit summary:

```text
c024ae2 test: add a210 split divided damage target count scalar projection policy guardrail ring v1

1 file changed, 351 insertions(+)
```

## 11. Merge and push validation

Feature/test branch was confirmed clean at:

```text
c024ae2
```

Main baseline before merge:

```text
HEAD == origin/main == 377a820
```

Merge completed successfully:

```text
de2c30e merge: a210 split divided damage target count scalar projection policy guardrail ring v1
```

Merge scope was exact:

```text
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_scalar_projection_policy_guardrail_ring_v1.test.ts
```

Post-merge diff hygiene passed:

```text
git diff --check
clean
```

Push completed successfully:

```text
377a820..de2c30e main -> main
```

Final sync after push:

```text
branch: main
HEAD: de2c30e
origin/main: de2c30e
working tree clean
```

Final operational markers:

```text
TARGET_COUNT_SCALAR_PROJECTION_POLICY_GUARDRAIL_RING_V1_MERGED_AND_PUSHED
A2_10_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_SCALAR_PROJECTION_POLICY_GUARDRAIL_RING_V1_OPERATIONAL_COMPLETE
```

## 12. Architectural reading

This guardrail ring protects a precise architectural boundary.

The project now has:

```text
productive target_count_model extraction
contract-first scalar projection policy
runtime guardrail that prevents accidental scalar projection
```

The correct semantic ownership remains:

```text
split_divided_damage_target_model.target_count_model
```

The scalar diagnostic field remains intentionally non-committal for current range/open-ended cases:

```text
costTargetLegalityMin.target_count == null
```

This prevents the engine from collapsing:

```text
one or two targets
one, two, or three targets
any number of targets
X damage divided among any number of targets
```

into misleading scalar values.

## 13. Validation policy

No build was required because this microphase touched only a semantic test file.

Under the post-v33 validation protocol:

```text
Anillo A: scalar projection policy guardrail ring test
Anillo B: scalar projection policy contract regression + target count model extraction guardrail regression + focused extraction regression
Anillo C: not applicable
```

A and B passed. C did not apply.

## 14. Closure decision

This microphase is closed.

The project now has a stable runtime guardrail ensuring the current split/divided damage corpus does not project rich count/allocation semantics into scalar `target_count`.

Runtime behavior remains unchanged.

## 15. Recommended next microphase

Recommended next microphase:

```text
A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_ADDITIONAL_CORPUS_PLAN_V1
```

Rationale:

* Productive `target_count_model` extraction is now implemented.
* Extraction is guarded.
* Scalar projection policy is contractually frozen.
* Scalar projection policy is guarded at runtime.
* The next value is broader real Oracle coverage planning, not another scalar projection change.
* Additional corpus should be planned contract-first before expanding recognition.

Alternative if the project wants to pause split/divided damage and return to another A2.10 family:

```text
A2.10_REAL_ORACLE_COST_TARGET_LEGALITY_STABLE_RING_REVIEW_V1
```

## 16. Final markers

```text
TARGET_COUNT_SCALAR_PROJECTION_POLICY_GUARDRAIL_RING_V1_COMMITTED
TARGET_COUNT_SCALAR_PROJECTION_POLICY_GUARDRAIL_RING_V1_MERGED_AND_PUSHED
TARGET_COUNT_SCALAR_PROJECTION_POLICY_GUARDRAIL_RING_V1_COMPLETE
A2_10_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_SCALAR_PROJECTION_POLICY_GUARDRAIL_RING_V1_OPERATIONAL_COMPLETE
A2_10_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_SCALAR_PROJECTION_POLICY_GUARDRAIL_RING_V1_DOCUMENTARY_CLOSURE_COMPLETE
```
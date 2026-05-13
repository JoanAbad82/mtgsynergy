# MTGSynergy — A2.10 Real Oracle Split/Divided Damage Target Count Model Scalar Projection Policy Contract V1

Project: MTGSynergy / PÁGINA WEB MAGIC
Date: 2026-05-13
Microphase: A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_SCALAR_PROJECTION_POLICY_CONTRACT_V1
Status: Closed operationally and documentarily

## 1. Executive summary

This microphase closes the contract-first freeze for scalar projection policy from rich split/divided damage `target_count_model` semantics into the scalar diagnostic field:

```text
costTargetLegalityMin.target_count
```

The contract freezes the conservative decision that the current split/divided damage corpus must not project target-count ranges or open-ended target-count models into a scalar value.

The current productive runtime remains:

```text
current_target_count == null
```

The rich model remains canonical:

```text
split_divided_damage_target_model.target_count_model
```

No runtime extraction, lowering, parser, UI, overlay, scoring, CSE, package/config, public data, or build wiring was changed.

## 2. Baseline and closure commits

Baseline before the operational contract branch:

```text
8c5f2ae
```

Feature/test branch:

```text
test/a210-split-divided-damage-target-count-scalar-projection-policy-contract-v1
```

Feature/test commit:

```text
f73a4e7 test: add a210 split divided damage target count scalar projection policy contract v1
```

Operational merge commit on `main`:

```text
1603bdb merge: a210 split divided damage target count scalar projection policy contract v1
```

Final synchronized operational state before this documentary closure:

```text
HEAD == origin/main == 1603bdb
```

## 3. Scope closed

### In scope

* JSON contract for scalar projection policy.
* Focused contract test for scalar projection policy.
* Five-card real Oracle split/divided damage corpus.
* Policy freeze that `target_count` remains null for range/open-ended split/divided damage cases.
* Explicit rejection of min-target, max-target, damage-amount, conceptual-slot, and comma-count scalar projections.
* Preservation of the rich `target_count_model` as canonical count/allocation structure.
* Preservation of existing target-kind, modal, and legality boundaries.

### Out of scope

* No runtime code changes.
* No lowering changes.
* No parser changes.
* No UI changes.
* No overlay changes.
* No scoring changes.
* No CSE changes.
* No package/config changes.
* No public data changes.
* No build pipeline changes.
* No scalar projection implementation.
* No mutation of existing extraction tests.
* No mutation of existing guardrail rings.
* No mutation of previous contracts.

## 4. Files changed operationally

The operational merge changed exactly these files:

```text
src/engine/semantic/contract/sem_cost_target_legality_split_divided_damage_target_count_scalar_projection_policy_contract_v1.json
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_scalar_projection_policy_contract_v1.test.ts
```

No runtime files were changed.

No files outside the allowed contract/test scope were changed.

## 5. Policy frozen

The contract freezes the recommended policy:

```text
KEEP_TARGET_COUNT_NULL_FOR_SPLIT_DIVIDED_RANGE_OR_OPEN_ENDED_CASES
```

For the current corpus, every case has:

```text
scalar_projection.expected_target_count == null
scalar_projection.policy_result == "DO_NOT_PROJECT"
```

The intent is explicit: the scalar diagnostic channel must not flatten range or open-ended target-count semantics.

## 6. Corpus closed

The contract covers the same closed real Oracle split/divided damage corpus:

```text
Electrolyze
Arc Lightning
Flames of the Firebrand
Pyrotechnics
Rolling Thunder
```

The scalar projection policy matrix is:

```text
Electrolyze -> DO_NOT_PROJECT, target_count null, reason: range 1..2 is not exact
Arc Lightning -> DO_NOT_PROJECT, target_count null, reason: range 1..3 is not exact
Flames of the Firebrand -> DO_NOT_PROJECT, target_count null, reason: range 1..3 is not exact
Pyrotechnics -> DO_NOT_PROJECT, target_count null, reason: open-ended range
Rolling Thunder -> DO_NOT_PROJECT, target_count null, reason: open-ended range and variable X damage
```

## 7. Rejected scalar projections

The contract explicitly rejects the following projection policies for this family:

```text
TARGET_COUNT_EQUALS_MIN_TARGETS
TARGET_COUNT_EQUALS_MAX_TARGETS
TARGET_COUNT_EQUALS_DAMAGE_AMOUNT
TARGET_COUNT_EQUALS_CONCEPTUAL_TARGET_SLOTS_MIN
TARGET_COUNT_EQUALS_CONCEPTUAL_TARGET_SLOTS_MAX
TARGET_COUNT_EQUALS_ZERO_FOR_ANY_NUMBER
TARGET_COUNT_EQUALS_ONE_FOR_ANY_NUMBER
TARGET_COUNT_EQUALS_COMMA_SEPARATED_TARGET_WORDS
```

These are rejected because they would create misleading scalar values from richer target-count/allocation semantics.

Examples:

```text
one or two targets -> not scalar 1 or 2
one, two, or three targets -> not scalar 1 or 3
any number of targets -> not scalar 0 or 1
4 damage -> not scalar target_count 4
X damage -> not scalar target_count X
```

## 8. Exact-only future candidate

The contract documents an exact-only future candidate, but it does not apply to the current five-card corpus.

The future candidate may only be considered in a separate contract if all of these conditions are true:

```text
min_targets == max_targets
max_targets is a number
is_variable == false
target_count_model_kind is not ANY_NUMBER_OF_TARGETS
target_count_model_kind is not ONE_OR_TWO_TARGETS
target_count_model_kind is not ONE_TWO_OR_THREE_TARGETS
```

Under this policy, the current corpus still remains:

```text
target_count == null
```

because every current case is range-based or open-ended.

## 9. Guardrails preserved

The contract preserves:

```text
split_divided_damage_target_model.target_count_model remains canonical
costTargetLegalityMin.target_count remains null for current corpus
target_kinds remains ["ANY_TARGET"]
allowed_target_kinds remains ["ANY_TARGET"]
modal_selection_model remains null
legality_kinds remains []
ANY_TARGET is not expanded
legality/gate values do not leak into target kind fields
no runtime change
```

Forbidden legality or gate-like values remain excluded from target kind fields:

```text
CAST_ONLY_IF
ACTIVATE_ONLY_AS_SORCERY
CONTROLS_X
ATTACKED_THIS_TURN
ONCE_EACH_TURN
OTHER_LEGALITY_TEXT
```

Forbidden concrete target-kind expansion values remain excluded:

```text
CREATURE
PLAYER
PLANESWALKER
BATTLE
```

## 10. Test behavior

The focused scalar projection policy contract test validates:

```text
contract metadata
phase
status
no_runtime_change
recommended_policy
exact five-card corpus order
expected_target_count null for all five cases
policy_result DO_NOT_PROJECT for all five cases
exact target_count_model metadata for all five cases
rejected scalar values for min/max/damage where relevant
exact-only future candidate is documented but not applicable to current corpus
rejected projection policies are present
guardrails preserve ANY_TARGET, modal null, legality empty, and no runtime change
forbidden legality/gate and concrete target-kind expansion values are not present in kind fields
```

The focused contract test includes the literal marker:

```text
TARGET_COUNT_SCALAR_PROJECTION_POLICY_CONTRACT_V1_COMPLETE
```

## 11. Validation executed

Before feature commit, JSON parse passed:

```text
TARGET_COUNT_SCALAR_PROJECTION_POLICY_CONTRACT_JSON_VALID
```

The scalar projection policy contract test passed:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_scalar_projection_policy_contract_v1.test.ts

PASS: 1 file passed
PASS: 2 tests passed
TARGET_COUNT_SCALAR_PROJECTION_POLICY_CONTRACT_V1_COMPLETE
```

The target count guardrail ring regression passed:

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

## 12. Validation and hygiene

Changed scope before commit:

```text
src/engine/semantic/contract/sem_cost_target_legality_split_divided_damage_target_count_scalar_projection_policy_contract_v1.json
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_scalar_projection_policy_contract_v1.test.ts
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
src/engine/semantic/contract/sem_cost_target_legality_split_divided_damage_target_count_scalar_projection_policy_contract_v1.json
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_scalar_projection_policy_contract_v1.test.ts
```

Feature/test commit summary:

```text
f73a4e7 test: add a210 split divided damage target count scalar projection policy contract v1

2 files changed, 486 insertions(+)
```

## 13. Merge and push validation

Feature/test branch was confirmed clean at:

```text
f73a4e7
```

Main baseline before merge:

```text
HEAD == origin/main == 8c5f2ae
```

Merge completed successfully:

```text
1603bdb merge: a210 split divided damage target count scalar projection policy contract v1
```

Merge scope was exact:

```text
src/engine/semantic/contract/sem_cost_target_legality_split_divided_damage_target_count_scalar_projection_policy_contract_v1.json
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_scalar_projection_policy_contract_v1.test.ts
```

Post-merge diff hygiene passed:

```text
git diff --check
clean
```

Push completed successfully:

```text
8c5f2ae..1603bdb main -> main
```

Final sync after push:

```text
branch: main
HEAD: 1603bdb
origin/main: 1603bdb
working tree clean
```

Final operational markers:

```text
TARGET_COUNT_SCALAR_PROJECTION_POLICY_CONTRACT_V1_MERGED_AND_PUSHED
A2_10_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_SCALAR_PROJECTION_POLICY_CONTRACT_V1_OPERATIONAL_COMPLETE
```

## 14. Architectural reading

This microphase is important because it prevents a common semantic error: treating a rich range/allocation model as a scalar count.

The architecture remains clean:

```text
split_divided_damage_target_model.target_count_model
```

owns split/divided target-count/allocation semantics, while:

```text
costTargetLegalityMin.target_count
```

remains null for current range/open-ended cases.

This protects the semantic distinction between:

```text
target-kind projection
target-count range semantics
damage allocation semantics
scalar diagnostics
modal selection
legality gates
```

## 15. Validation policy

No build was required because this microphase touched only a contract JSON file and a focused test file.

Under the post-v33 validation protocol:

```text
Anillo A: scalar projection policy contract test
Anillo B: target count guardrail ring regression + focused extraction regression
Anillo C: not applicable
```

A and B passed. C did not apply.

## 16. Closure decision

This microphase is closed.

The project now has a frozen contract stating that the current split/divided damage range/open-ended corpus must not project into scalar `target_count`.

Runtime behavior remains intentionally unchanged.

## 17. Recommended next microphase

Recommended next microphase:

```text
A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_SCALAR_PROJECTION_POLICY_GUARDRAIL_RING_V1
```

Rationale:

* The scalar projection policy contract is now frozen.
* The next correct step is a test-only guardrail ring that protects `target_count == null` for the current corpus.
* This avoids accidental future projection from min/max/damage amount or conceptual slots.
* It should not change runtime.

Alternative if scalar projection policy is considered complete:

```text
A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_ADDITIONAL_CORPUS_PLAN_V1
```

## 18. Final markers

```text
TARGET_COUNT_SCALAR_PROJECTION_POLICY_CONTRACT_V1_COMMITTED
TARGET_COUNT_SCALAR_PROJECTION_POLICY_CONTRACT_V1_MERGED_AND_PUSHED
TARGET_COUNT_SCALAR_PROJECTION_POLICY_CONTRACT_V1_COMPLETE
A2_10_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_SCALAR_PROJECTION_POLICY_CONTRACT_V1_OPERATIONAL_COMPLETE
A2_10_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_SCALAR_PROJECTION_POLICY_CONTRACT_V1_DOCUMENTARY_CLOSURE_COMPLETE
```
# MTGSynergy — A2.10 Real Oracle Split/Divided Damage Target Count Model Scalar Projection Policy Plan V1

Project: MTGSynergy / PÁGINA WEB MAGIC
Date: 2026-05-13
Microphase: A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_SCALAR_PROJECTION_POLICY_PLAN_V1
Status: Closed as docs-only / policy-plan

## 1. Executive summary

This microphase defines the policy decision path for whether rich split/divided damage `target_count_model` semantics should ever be projected into the scalar diagnostic field:

```text
costTargetLegalityMin.target_count
```

The immediately preceding microphases established and guarded productive extraction of:

```text
split_divided_damage_target_model.target_count_model
```

for the closed real Oracle split/divided damage corpus:

```text
Electrolyze
Arc Lightning
Flames of the Firebrand
Pyrotechnics
Rolling Thunder
```

The current productive runtime intentionally preserves:

```text
costTargetLegalityMin.target_count == null
```

This policy-plan microphase does not change runtime behavior. It records the decision framework and recommends a conservative contract-first path before any scalar projection is implemented.

## 2. Baseline

Baseline before opening this policy-plan microphase:

```text
f6aa6d2
```

Previously closed microphase:

```text
A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_EXTRACTION_GUARDRAIL_RING_V1
```

Previously closed result:

```text
HEAD == origin/main == f6aa6d2
```

## 3. Current semantic state

The project now productively emits rich target-count/allocation structure inside:

```text
split_divided_damage_target_model.target_count_model
```

The guarded corpus has these readings:

```text
Electrolyze -> ONE_OR_TWO_TARGETS, min 1, max 2, fixed 2 damage
Arc Lightning -> ONE_TWO_OR_THREE_TARGETS, min 1, max 3, fixed 3 damage
Flames of the Firebrand -> ONE_TWO_OR_THREE_TARGETS, min 1, max 3, fixed 3 damage
Pyrotechnics -> ANY_NUMBER_OF_TARGETS, min 1, max null, fixed 4 damage
Rolling Thunder -> ANY_NUMBER_OF_TARGETS, min 1, max null, variable X damage
```

The stable invariants are:

```text
current_target_kinds == ["ANY_TARGET"]
current_target_count == null
current_modal_selection_model == null
current_legality_kinds == []
allowed_target_kinds == ["ANY_TARGET"]
```

This state is correct and intentionally conservative.

## 4. Problem statement

`target_count_model` is a structured model. It can represent ranges, variable maxima, allocation constraints, fixed damage, and X-based damage.

The scalar field:

```text
costTargetLegalityMin.target_count
```

can represent only one number or null.

That means scalar projection is lossy for several currently guarded cases.

For example:

```text
one or two targets
one, two, or three targets
any number of targets
X damage divided among any number of targets
```

None of those can be faithfully represented as a single scalar target count without losing important semantics.

## 5. Policy options

### Option A: keep scalar target_count null for all split/divided damage cases

Policy:

```text
costTargetLegalityMin.target_count == null
```

for all split/divided damage target-count models.

Pros:

* No semantic flattening.
* No misleading scalar values.
* Keeps range/allocation semantics in the rich model.
* Preserves current runtime behavior.
* Avoids treating a diagnostic field as a rules-complete target model.

Cons:

* Some downstream consumers may not get a simple count.
* UI or summaries may need to read `target_count_model` directly if they want richer count semantics.

### Option B: project only exact non-range counts

Policy:

```text
target_count = N
```

only when:

```text
min_targets == max_targets == N
is_variable == false
```

and otherwise:

```text
target_count == null
```

Pros:

* Safe for exact target-count cases.
* Avoids flattening ranges.
* Creates a future path for scalar exact-only diagnostic support.

Cons:

* Current closed corpus has no exact-only split/divided damage count cases.
* It does not add value to the current five-card corpus.
* It requires a separate exact-count corpus and contract.
* It may create inconsistent expectations if users expect range cases to project too.

### Option C: project the minimum target count

Policy:

```text
target_count = min_targets
```

Pros:

* Always produces a number for recognized models.
* Simple for downstream consumers.

Cons:

* Misleading for range cases.
* `one or two targets` would become `1`.
* `one, two, or three targets` would become `1`.
* `any number of targets` would become `1` despite being open-ended.
* This collapses range semantics into a lower bound.
* This should be rejected for A2.10.

### Option D: project the maximum target count

Policy:

```text
target_count = max_targets
```

when max exists, and null for open-ended cases.

Pros:

* Gives an upper bound for closed ranges.

Cons:

* Misleading for optional ranges.
* `one or two targets` would become `2`.
* `one, two, or three targets` would become `3`.
* Open-ended cases remain null.
* This field would no longer mean exact count.
* This should be rejected for A2.10.

### Option E: introduce a separate scalar-like diagnostic range

Policy:

Do not use `target_count`. Add a future diagnostic projection such as:

```text
target_count_range
target_count_min
target_count_max
```

Pros:

* Could preserve range semantics outside the rich model.
* Avoids abusing `target_count`.

Cons:

* Adds another public/min-channel shape.
* Requires a separate contract.
* Duplicates information already present in `target_count_model`.
* Should not happen unless a concrete downstream consumer needs it.

## 6. Recommended policy

Recommended policy for the current A2.10 family:

```text
Option A: keep costTargetLegalityMin.target_count null for split/divided damage target-count models.
```

Rationale:

* The current corpus is range-based or variable.
* Scalar projection would be lossy.
* The rich model already captures the needed semantics.
* Existing guardrails already freeze `target_count == null`.
* Any future exact-count projection should be decided only after an exact non-range corpus exists.
* A2.10 should not introduce a misleading scalar just to fill a field.

## 7. Rejected policies

The following policies should be explicitly rejected for this family:

```text
target_count = min_targets
target_count = max_targets
target_count = number of conceptual slots
target_count = damage amount
target_count = number of comma-separated target words
target_count = 0 for any number of targets
target_count = 1 for any number of targets
```

Reasons:

* They are lossy or misleading.
* They blur target count with allocation amount.
* They confuse minimum target legality with target range semantics.
* They risk downstream false confidence.
* They undermine the rich `target_count_model`.

## 8. Contract-first requirement

No scalar projection should be implemented without a separate contract microphase.

A future scalar projection contract must define:

```text
what target_count means
when it may be non-null
whether it means exact count only
whether ranges are forbidden
whether open-ended ranges remain null
whether split/divided damage is excluded entirely
how exact non-range cases are distinguished
which corpus examples prove the policy
```

Without that contract, the project must preserve:

```text
costTargetLegalityMin.target_count == null
```

for the existing split/divided damage family.

## 9. Recommended future contract if scalar projection is revisited

If scalar projection is ever revisited, the only safe candidate policy is:

```text
exact-only scalar projection
```

Suggested condition:

```text
target_count = N only if min_targets == max_targets == N and is_variable == false
```

Suggested non-projection conditions:

```text
min_targets != max_targets
max_targets == null
is_variable == true
damage_amount_kind == "VARIABLE"
kind == "ANY_NUMBER_OF_TARGETS"
kind == "ONE_OR_TWO_TARGETS"
kind == "ONE_TWO_OR_THREE_TARGETS"
```

Under that policy, the currently closed corpus would still preserve:

```text
target_count == null
```

because all five current cases are range or open-ended cases.

## 10. Current corpus policy matrix

```text
Electrolyze
kind: ONE_OR_TWO_TARGETS
policy result: target_count remains null
reason: range 1..2, not exact

Arc Lightning
kind: ONE_TWO_OR_THREE_TARGETS
policy result: target_count remains null
reason: range 1..3, not exact

Flames of the Firebrand
kind: ONE_TWO_OR_THREE_TARGETS
policy result: target_count remains null
reason: range 1..3, not exact

Pyrotechnics
kind: ANY_NUMBER_OF_TARGETS
policy result: target_count remains null
reason: open-ended range, not exact

Rolling Thunder
kind: ANY_NUMBER_OF_TARGETS
policy result: target_count remains null
reason: open-ended range and variable X damage
```

## 11. Guardrails to preserve

Future scalar policy work must preserve:

```text
split_divided_damage_target_model.target_count_model exists
allowed_target_kinds == ["ANY_TARGET"]
target_kinds == ["ANY_TARGET"]
modal_selection_model == null
legality_kinds == []
ANY_TARGET is not expanded
legality/gate values do not leak into target kind fields
```

The following values must remain excluded from target kind fields:

```text
CAST_ONLY_IF
ACTIVATE_ONLY_AS_SORCERY
CONTROLS_X
ATTACKED_THIS_TURN
ONCE_EACH_TURN
OTHER_LEGALITY_TEXT
```

The following target-kind expansions remain forbidden:

```text
CREATURE
PLAYER
PLANESWALKER
BATTLE
```

## 12. Impact on existing tests

The existing guardrail ring should remain valid and unchanged:

```text
sem_cost_target_legality_split_divided_damage_target_count_model_extraction_guardrail_ring_v1.test.ts
```

The existing extraction test should remain valid and unchanged:

```text
sem_cost_target_legality_split_divided_damage_target_count_model_extraction_v1.test.ts
```

The existing contract test should remain valid and unchanged:

```text
sem_cost_target_legality_split_divided_damage_target_count_model_contract_v1.test.ts
```

Any future scalar projection contract must not weaken these tests.

If scalar projection remains null, existing tests should continue to assert:

```text
current_target_count == null
```

## 13. Recommended next implementation path

Recommended next step:

```text
A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_SCALAR_PROJECTION_POLICY_CONTRACT_V1
```

Purpose:

* Freeze the policy that split/divided damage range/open-ended cases keep `target_count == null`.
* Explicitly reject min/max scalar projection for current corpus.
* Preserve `target_count_model` as the canonical count/allocation structure.
* Keep the current productive behavior stable.

Alternative:

```text
A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_ADDITIONAL_CORPUS_PLAN_V1
```

Use this if scalar projection is deferred and the project prefers to broaden the real Oracle corpus first.

## 14. Validation policy for this plan

This microphase is documentation-only.

Required validation:

```text
document exists
UTF-8 without BOM
LF only
no trailing whitespace
markers present
docs-only scope exact
staged scope exact
git diff --cached --check clean
atomic commit
merge to main
push to origin/main
final HEAD == origin/main
working tree clean
```

No tests or build are required because this microphase does not touch runtime, source, tests, UI, package files, public assets, or generated artifacts.

## 15. Closure decision

This policy-plan microphase is closed once committed and pushed.

It does not change runtime behavior.

It recommends preserving the current policy:

```text
costTargetLegalityMin.target_count == null
```

for the current split/divided damage target-count family.

## 16. Final markers

```text
A2_10_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_SCALAR_PROJECTION_POLICY_PLAN_V1_COMPLETE
TARGET_COUNT_SCALAR_PROJECTION_POLICY_PLAN_V1_DOCS_ONLY
TARGET_COUNT_SCALAR_PROJECTION_POLICY_PLAN_V1_NO_RUNTIME_CHANGE
TARGET_COUNT_SCALAR_PROJECTION_POLICY_PLAN_V1_RECOMMENDS_NULL_FOR_CURRENT_CORPUS
TARGET_COUNT_SCALAR_PROJECTION_POLICY_PLAN_V1_NEXT_CONTRACT_RECOMMENDED
```
# MTGSynergy — A2.10 Real Oracle Split/Divided Damage Target Count Model Additional Corpus Plan V1

Project: MTGSynergy / PÁGINA WEB MAGIC
Date: 2026-05-14
Microphase: A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_ADDITIONAL_CORPUS_PLAN_V1
Status: Draft created for docs-only corpus planning
Baseline: 342cc1f
Branch: docs/a210-split-divided-damage-target-count-additional-corpus-plan-v1

## 1. Executive summary

This microphase is a docs-only corpus planning phase.

It does not implement new extraction logic.

It does not mutate parser, lowering, contracts, tests, UI, scoring, CSE, package/config, public data, or build wiring.

The goal is to define the next safe expansion boundary for split/divided damage `target_count_model` coverage.

The current engine already has:

```text
split_divided_damage_target_model extraction
allowed_target_kinds extraction
target kind integration
target kinds emission
target_count_model extraction
scalar target_count projection policy
runtime guardrail ring
```

The current scalar policy is intentionally conservative:

```text
DO_NOT_PROJECT
```

The rich model remains canonical:

```text
split_divided_damage_target_model.target_count_model
```

The diagnostic scalar field remains intentionally non-committal for range/open-ended allocation cases:

```text
costTargetLegalityMin.target_count == null
```

The next value is not more runtime code immediately. The next value is a real Oracle corpus plan that separates safe coverage, risky coverage, and out-of-scope traps before any productive extraction is expanded.

## 2. Baseline

Current repo baseline:

```text
HEAD == origin/main == 342cc1f
```

Immediately preceding guide phase:

```text
MTGSYNERGY_SEMANTIC_ENGINE_STATUS_MAP_AND_PSEUDOCODE_REVIEW_V1
```

The status-map guide recommended this phase as the next A2.10 continuation:

```text
A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_ADDITIONAL_CORPUS_PLAN_V1
```

## 3. Scope

### In scope

```text
- Plan additional real Oracle corpus for split/divided damage target_count_model.
- Separate safe same-shape candidates from risky semantic variants.
- Identify non-equivalent cards that look superficially related.
- Define positive candidates, caution candidates, negative guardrails, and explicit no-goals.
- Preserve current scalar projection policy.
- Preserve separation between target_count and target_count_model.
- Prepare future test/extraction microphases.
```

### Out of scope

```text
- No parser changes.
- No lowering changes.
- No contract JSON changes.
- No test changes.
- No runtime extraction changes.
- No UI changes.
- No overlay changes.
- No scoring changes.
- No CSE changes.
- No package/config changes.
- No public data changes.
- No deploy.
```

## 4. Current closed corpus

The current closed corpus is:

```text
Electrolyze
Arc Lightning
Flames of the Firebrand
Pyrotechnics
Rolling Thunder
```

Current model coverage:

```text
Electrolyze -> ONE_OR_TWO_TARGETS, min 1, max 2, fixed 2 damage
Arc Lightning -> ONE_TWO_OR_THREE_TARGETS, min 1, max 3, fixed 3 damage
Flames of the Firebrand -> ONE_TWO_OR_THREE_TARGETS, min 1, max 3, fixed 3 damage
Pyrotechnics -> ANY_NUMBER_OF_TARGETS, min 1, max null, fixed 4 damage
Rolling Thunder -> ANY_NUMBER_OF_TARGETS, min 1, max null, variable X damage
```

Current target-kind policy:

```text
target_kinds == ["ANY_TARGET"]
allowed_target_kinds == ["ANY_TARGET"]
```

Current scalar policy:

```text
target_count == null
```

## 5. Existing invariants that must not regress

The future corpus expansion must preserve these invariants:

```text
target_count != target_count_model
modal_selection_model != split_divided_damage_target_model
target_kinds is diagnostic aggregation, not the rich model owner
allowed_target_kinds belongs to split_divided_damage_target_model
ANY_TARGET must not be expanded into CREATURE / PLAYER / PLANESWALKER / BATTLE in diagnostic target_kinds
range/open-ended target-count semantics must not be flattened into scalar target_count
cost/target/legality min must not absorb EffectIR semantics
legality gates must not leak into target kinds
```

The future corpus expansion must also preserve:

```text
current_target_count == null
current_modal_selection_model == null
current_legality_kinds == []
```

unless a later contract explicitly proves otherwise for a new family.

## 6. Candidate classification model

Additional corpus should be classified into five buckets.

```text
Bucket A: Same-shape safe expansion
Bucket B: Same count model but narrower allowed target kinds
Bucket C: Similar split allocation but extra casting cost or variable rule coupling
Bucket D: Superficially similar but semantically different
Bucket E: Explicit negative guardrails
```

This document is not asserting final Oracle text for each candidate. The next implementation phase must verify exact local Oracle wording from the current card index before freezing tests.

## 7. Bucket A — same-shape safe expansion candidates

These are candidates that appear likely to match the existing model shapes with minimal new semantic risk.

### A1. One or two targets, fixed damage

Candidate family:

```text
Twin Bolt
Chandra's Pyrohelix
Forked Bolt
Fire // Ice, Fire half
```

Expected model shape after Oracle verification:

```text
kind: ONE_OR_TWO_TARGETS
min_targets: 1
max_targets: 2
is_variable: false
damage_amount_kind: FIXED
requires_damage_allocation: true
```

Expected policy:

```text
target_count remains null
target_count_model is productive
scalar projection remains DO_NOT_PROJECT
```

Reason to include:

```text
This bucket strengthens the already-covered Electrolyze-style pattern.
It expands coverage without changing the shape of the model.
```

Risk:

```text
Some candidates may use different target restrictions or historical wording.
Exact Oracle verification is mandatory before implementation.
```

### A2. Any number of targets, fixed damage

Candidate family:

```text
Magma Opus
Boulderfall
```

Expected model shape after Oracle verification:

```text
kind: ANY_NUMBER_OF_TARGETS
min_targets: 1
max_targets: null
is_variable: false
damage_amount_kind: FIXED
requires_damage_allocation: true
```

Expected policy:

```text
target_count remains null
target_count_model is productive
```

Reason to include:

```text
This bucket strengthens the Pyrotechnics-style open-ended fixed-damage allocation shape.
```

Risk:

```text
Large spell wording may contain additional effects.
The extraction must isolate only the split/divided damage clause and avoid absorbing unrelated spell effects.
```

### A3. Any number of targets, variable damage

Candidate family:

```text
Fall of the Titans
Meteor Shower
```

Expected model shape after Oracle verification:

```text
kind: ANY_NUMBER_OF_TARGETS
min_targets: 1
max_targets: null
is_variable: true
variable_symbol: X
damage_amount_kind: VARIABLE
requires_damage_allocation: true
```

Expected policy:

```text
target_count remains null
target_count_model is productive
```

Reason to include:

```text
This bucket strengthens the Rolling Thunder-style variable allocation shape.
```

Risk:

```text
Some variable-damage candidates may contain alternate costs, surge, X coupling, or additional target legality nuances.
Those must be kept outside the model unless explicitly contracted.
```

## 8. Bucket B — narrower allowed target kinds

These candidates are valuable because they test whether `allowed_target_kinds` can remain precise without polluting diagnostic `target_kinds`.

Candidate family:

```text
Pyrokinesis
Aerial Volley
Fire at Will
```

Expected model shape after Oracle verification:

```text
target_count_model exists
requires_damage_allocation == true
allowed_target_kinds is narrower than ANY_TARGET
target_kinds remains diagnostic and conservative
```

Possible allowed-target categories to evaluate:

```text
CREATURE
CREATURE_WITH_FLYING
ATTACKING_OR_BLOCKING_CREATURE
```

Reason to include:

```text
The current closed corpus mostly protects ANY_TARGET behavior.
A future expansion should verify constrained target families without exploding diagnostic target_kinds.
```

Risks:

```text
Target predicates may combine object kind and combat/status qualifiers.
The model must not flatten "attacking or blocking creature" into only CREATURE if that loses relevant legality.
The model must not leak legality predicates into target kind fields unless a future contract defines a separate target predicate structure.
```

Recommended handling:

```text
Plan first.
Do not implement until allowed_target_kinds and target predicates are explicitly separated.
```

## 9. Bucket C — split allocation with cost/rule coupling

These candidates are strategically important but should not be first implementation targets.

Candidate family:

```text
Fireball
```

Why it matters:

```text
Fireball-like wording can combine:
- any number of targets
- divided evenly / rounded down
- extra cost per target beyond the first
- variable X damage
```

This is not the same as Rolling Thunder.

Potential model concerns:

```text
target_count_model is not enough by itself
damage allocation policy may be EVEN_DIVISION instead of AS_YOU_CHOOSE
extra target count may alter cost
X value and target count may interact
rounding may matter
```

Recommended policy:

```text
Do not include Fireball in the next productive extraction.
Add it as a named guardrail / future design target.
```

Future model extension may need:

```text
damage_allocation_policy:
  AS_CHOSEN
  EVENLY_ROUNDED_DOWN

extra_target_cost_model:
  cost_per_target_beyond_first

x_value_model:
  controller_chosen_on_cast
```

## 10. Bucket D — superficially similar but semantically different

These cards should not be treated as split/divided damage `target_count_model` unless a future contract opens a separate model.

Candidate family:

```text
Arc Trail
Cone of Flame
Comet Storm
Jaya's Immolating Inferno
```

Reasons:

```text
Arc Trail-style cards assign fixed different amounts to separately described targets.
Cone of Flame-style cards assign different fixed amounts to first/second/third targets.
Comet Storm-style cards may involve multikicker-created target selection and equal damage to each target.
Jaya's Immolating Inferno-style cards may choose up to N targets and deal equal X damage to each, not divide a pool as chosen.
```

Current decision:

```text
These are not split/divided damage allocation candidates for the existing model.
```

Potential future families:

```text
multi_target_fixed_allocation_model
up_to_n_equal_damage_targets_model
kicker_generated_target_set_model
ordered_distinct_target_damage_model
```

## 11. Bucket E — explicit negative guardrails

The next implementation phase should include negative guardrails proving that the split/divided damage model does not trigger on semantically adjacent but distinct wording.

Recommended negative guardrail families:

```text
"deals 2 damage to any target and 1 damage to another target"
"deals 1 damage to target creature, 2 damage to another target creature, and 3 damage to a third target creature"
"deals X damage to each of up to three targets"
"choose any target, then choose another target for each time this spell was kicked"
"deals X damage to each of them"
```

Candidate negative cards after Oracle verification:

```text
Arc Trail
Cone of Flame
Comet Storm
Jaya's Immolating Inferno
```

Purpose:

```text
Protect against over-broad regex or phrase matching.
Prevent the engine from treating equal-damage multi-target spells as divided allocation.
Prevent the engine from treating fixed ordered-target spells as free allocation.
```

## 12. Target-count policy for "any number"

Current project policy remains:

```text
ANY_NUMBER_OF_TARGETS min_targets: 1
max_targets: null
```

This policy should not be changed in this phase.

Reason:

```text
The existing model is a conservative target-slot model for productive extraction.
It is not yet a full CR target-announcement simulator.
```

Open question for future review:

```text
Whether "any number" should ever allow min_targets: 0 in a complete casting legality model.
```

Decision for this phase:

```text
Do not change min_targets.
Do not project scalar target_count.
Do not open CR 107.1c / full casting procedure semantics here.
```

## 13. Recommended future test structure

The next productive phase should probably add one focused test file:

```text
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_model_additional_corpus_v1.test.ts
```

Suggested positive sections:

```text
one-or-two fixed damage additional corpus
any-number fixed damage additional corpus
any-number variable damage additional corpus
narrow allowed target kind corpus
```

Suggested negative sections:

```text
fixed ordered multi-target damage is not split_divided_damage_target_model
equal X damage to up to N targets is not split_divided_damage_target_model
multikicker generated target sets are not split_divided_damage_target_model
Fireball-like even division remains out of scope unless separately contracted
```

Expected assertions:

```text
split_divided_damage_target_model exists for positives
target_count_model matches expected kind/min/max/variable/damage amount
target_count remains null
modal_selection_model remains null
legality_kinds remains []
diagnostic target_kinds remains conservative
negative cards do not emit split_divided_damage_target_model
```

## 14. Recommended implementation order after this plan

Recommended sequence:

```text
1. A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_ADDITIONAL_CORPUS_CONTRACT_V1
2. A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_ADDITIONAL_CORPUS_EXTRACTION_V1
3. A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_ADDITIONAL_CORPUS_GUARDRAIL_RING_V1
4. A2.10_REAL_ORACLE_COST_TARGET_LEGALITY_STABLE_RING_REVIEW_V1
```

Reason:

```text
The plan should be converted to a frozen contract before productive extraction.
Extraction should remain narrow.
A guardrail ring should freeze the expanded corpus.
Then A2.10 should be consolidated into a stable ring.
```

## 15. Recommended future contract fields

If additional corpus reveals enough variance, future contracts may need to separate:

```text
target_count_model
damage_amount_model
damage_allocation_policy
allowed_target_kinds
target_predicate_model
extra_target_cost_model
x_value_model
```

Do not add these fields in this docs-only phase.

Possible future shape:

```text
split_divided_damage_target_model:
  allowed_target_kinds: [...]
  target_count_model:
    kind
    min_targets
    max_targets
  damage_amount_model:
    kind
    fixed_amount
    variable_symbol
  damage_allocation_policy:
    kind: AS_CHOSEN | EVENLY_ROUNDED_DOWN
  target_predicate_model:
    kind: NONE | HAS_FLYING | ATTACKING_OR_BLOCKING | OTHER
  extra_target_cost_model:
    kind: NONE | COST_PER_TARGET_BEYOND_FIRST
```

## 16. Risks

### Risk 1: over-broad matching

A naive phrase matcher may include Arc Trail, Cone of Flame, or Comet Storm.

Mitigation:

```text
Require "divided as you choose" or equivalent verified wording for the current model family.
Add negative guardrails.
```

### Risk 2: target predicate leakage

Aerial Volley and Fire at Will may require target predicates beyond simple target kind.

Mitigation:

```text
Treat predicate-bearing target restrictions as a separate concern.
Do not flatten them into target_kinds.
```

### Risk 3: Fireball complexity

Fireball-like wording is semantically rich and tempting.

Mitigation:

```text
Keep Fireball out of the next extraction.
Document it as a future model extension.
```

### Risk 4: scalar regression

Expanding corpus may tempt target_count projection.

Mitigation:

```text
Keep target_count == null for all range/open-ended split/divided damage cases.
```

### Risk 5: accidental modal contamination

Some large spells may have additional choices.

Mitigation:

```text
Do not set modal_selection_model unless the card independently matches the modal-selection contract.
```

## 17. Closure decision

This plan should be considered complete when it has:

```text
- named candidate buckets
- positive candidates
- caution candidates
- negative guardrail families
- invariants to preserve
- recommended future test shape
- recommended next microphase
```

No runtime validation, npm test, build, smoke, or deploy is required for this docs-only planning phase.

## 18. Recommended next microphase

Recommended next microphase:

```text
A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_ADDITIONAL_CORPUS_CONTRACT_V1
```

Alternative if the project wants to consolidate before expanding:

```text
A2.10_REAL_ORACLE_COST_TARGET_LEGALITY_STABLE_RING_REVIEW_V1
```

## 19. Final markers

```text
A2_10_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_ADDITIONAL_CORPUS_PLAN_V1_CREATED
A2_10_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_ADDITIONAL_CORPUS_PLAN_V1_DOCS_ONLY
A2_10_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_ADDITIONAL_CORPUS_PLAN_V1_NO_CODE_TOUCHED
A2_10_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_ADDITIONAL_CORPUS_PLAN_V1_READY_FOR_REVIEW
```
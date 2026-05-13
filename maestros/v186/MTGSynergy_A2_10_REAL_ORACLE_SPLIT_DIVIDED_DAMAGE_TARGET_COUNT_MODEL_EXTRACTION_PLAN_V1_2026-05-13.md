# MTGSynergy — A2.10 Real Oracle Split/Divided Damage Target Count Model Extraction Plan V1

Project: MTGSynergy / PÁGINA WEB MAGIC
Date: 2026-05-13
Microphase: A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_EXTRACTION_PLAN_V1
Status: Closed as docs-only / plan-only

## 1. Executive summary

This microphase defines the implementation plan for future productive extraction of `target_count_model` from real Oracle split/divided damage wording.

The previous contract microphase froze the target-count/allocation schema and expectations for the closed corpus:

```text
Electrolyze
Arc Lightning
Flames of the Firebrand
Pyrotechnics
Rolling Thunder
```

This plan does not implement runtime extraction. It defines where the future extraction should happen, what it may emit, what it must preserve, which tests are required, and which semantic projection remains forbidden.

The key policy remains:

```text
costTargetLegalityMin.target_count == null
```

until a later explicit contract changes scalar projection policy.

## 2. Baseline

Baseline before opening this plan microphase:

```text
2e46fec
```

Previously closed microphase:

```text
A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_CONTRACT_V1
```

Previously closed result:

```text
HEAD == origin/main == 2e46fec
```

## 3. Purpose

The purpose of the next productive extraction phase is to populate the rich split/divided damage-specific count/allocation structure:

```text
split_divided_damage_target_model.target_count_model
```

or the equivalent contracted location already frozen by the target-count model contract.

The future extraction must not populate:

```text
costTargetLegalityMin.target_count
```

unless a separate scalar projection contract explicitly authorizes it.

The extraction should remain additive, conservative, and corpus-driven.

## 4. Current state before extraction

The project already has:

```text
split_divided_damage_target_model
allowed_target_kinds == ["ANY_TARGET"]
costTargetLegalityMin.target_kinds == ["ANY_TARGET"]
costTargetLegalityMin.target_count == null
modal_selection_model == null
legality_kinds == []
```

The project also has a frozen target-count/allocation contract for five cards with:

```text
kind
min_targets
max_targets
is_variable
variable_symbol
requires_damage_allocation
damage_amount_kind
damage_amount
raw_text
```

The missing step is productive construction of that model from recognized split/divided damage wording.

## 5. In scope for the future extraction phase

The next productive extraction microphase may touch only the minimum files needed to:

```text
1. detect recognized split/divided damage target-count wording
2. build target_count_model according to the frozen contract
3. attach it to split_divided_damage_target_model
4. preserve existing allowed_target_kinds and target_kinds behavior
5. add a focused extraction test for the five-card corpus
```

Expected productive output for recognized cases:

```text
Electrolyze -> ONE_OR_TWO_TARGETS
Arc Lightning -> ONE_TWO_OR_THREE_TARGETS
Flames of the Firebrand -> ONE_TWO_OR_THREE_TARGETS
Pyrotechnics -> ANY_NUMBER_OF_TARGETS
Rolling Thunder -> ANY_NUMBER_OF_TARGETS with variable_symbol "X"
```

The extraction should use narrow pattern recognition, not broad natural-language inference.

## 6. Out of scope for the future extraction phase

The extraction phase must not implement:

```text
parser rewrite
general target parser
general damage allocation solver
target legality evaluator
resolution-time target legality
modal selection model
legality gates
costTargetLegalityMin.target_count population
ANY_TARGET expansion
UI labels
overlay behavior
scoring behavior
CSE behavior
package/config changes
public data changes
build pipeline changes
previous contract rewrites
```

The extraction must also not change any unrelated semantic families.

## 7. Recommended implementation location

The future productive extraction should be implemented as close as possible to the current split/divided damage model construction path.

Recommended strategy:

```text
1. locate the existing split_divided_damage_target_model construction
2. add a small local helper for target-count/allocation detection
3. call the helper only when split/divided damage wording is already recognized
4. attach target_count_model only when the helper returns a fully recognized model
5. otherwise leave target_count_model absent or null according to the frozen schema policy
```

Preferred helper shape:

```text
buildSplitDividedDamageTargetCountModel(text)
```

or a similarly narrow local helper.

The helper should not become a general Oracle parser.

## 8. Recognition policy

The future extraction should recognize only these patterns in V1:

```text
2 damage divided as you choose among one or two targets
3 damage divided as you choose among one, two, or three targets
4 damage divided as you choose among any number of targets
X damage divided as you choose among any number of targets
```

The pattern may be normalized for case and punctuation, but it must not overgeneralize.

The extraction should require all of the following:

```text
damage amount signal
divided as you choose signal
among signal
formal target-count phrase
target or targets phrase
```

If the target-count phrase is not recognized, the extractor must not invent a model.

## 9. Required output semantics

The future extraction should emit models equivalent to:

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
  "raw_text": "one or two targets"
}
```

For Rolling Thunder:

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

The exact raw text may preserve either the full matching phrase or the target-count subphrase, but it must remain deterministic and testable.

## 10. Projection policy

The extraction phase must preserve:

```text
costTargetLegalityMin.target_count == null
```

Rationale:

* The frozen count model is richer than a scalar.
* "one or two targets" cannot be faithfully represented as one number.
* "any number of targets" cannot be faithfully represented as one number.
* Projection to scalar `target_count` requires its own explicit policy.
* The current A2.10 diagnostic minimum should not flatten range semantics prematurely.

If a future microphase wants scalar projection, it should be separate and contract-first.

## 11. Guardrails to preserve

The future extraction must preserve these invariants:

```text
split_divided_damage_target_model exists
allowed_target_kinds remains ["ANY_TARGET"]
target_kinds remains ["ANY_TARGET"]
target_count remains null
modal_selection_model remains null
legality_kinds remains []
target_count_model appears only for recognized split/divided damage target-count patterns
```

The following values must not appear in target kind fields:

```text
CAST_ONLY_IF
ACTIVATE_ONLY_AS_SORCERY
CONTROLS_X
ATTACKED_THIS_TURN
ONCE_EACH_TURN
OTHER_LEGALITY_TEXT
```

The extractor must not expand `ANY_TARGET` into:

```text
CREATURE
PLAYER
PLANESWALKER
BATTLE
```

## 12. Required future tests

The productive extraction phase should add a focused test file, likely:

```text
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_model_extraction_v1.test.ts
```

The test must validate:

```text
exact five-card corpus
split_divided_damage_target_model exists
allowed_target_kinds == ["ANY_TARGET"]
costTargetLegalityMin.target_kinds == ["ANY_TARGET"]
costTargetLegalityMin.target_count == null
modal_selection_model == null
legality_kinds == []
target_count_model exact for each card
Rolling Thunder preserves variable_symbol == "X"
fixed-damage cards preserve damage_amount
forbidden legality/gate values do not leak
```

The test should include the marker:

```text
TARGET_COUNT_MODEL_EXTRACTION_V1_COMPLETE
```

The future extraction should also run the existing contract test:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_model_contract_v1.test.ts
```

and the new focused extraction test.

## 13. Suggested allowed files for the future extraction

The future productive extraction should probably allow only:

```text
src/engine/semantic/lowering/lower_to_ability_ir_min_v1.ts
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_model_extraction_v1.test.ts
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_model_contract_v1.test.ts
```

The contract test should only be updated if necessary to align with additive runtime evidence. Ideally, it should remain unchanged.

If a separate helper file already exists for split/divided damage target modeling, it may be preferable to modify that helper instead of expanding the lowering file. That decision should be made by inspecting the current code immediately before implementation.

## 14. Validation policy for the future extraction

Minimum required validation:

```text
new focused extraction test
existing target count model contract test
existing target kinds emission/guardrail tests if touched by the same lowering path
git diff --check
git diff --cached --check
exact scope validation
atomic commit
controlled merge to main
push
final HEAD == origin/main
working tree clean
```

Build is not required unless the future extraction touches runtime-visible UI, bundle wiring, package config, public data, or generated assets.

## 15. Risks

### Risk 1: scalar flattening

Populating `costTargetLegalityMin.target_count` with a scalar would misrepresent range-based target semantics.

Mitigation:

```text
keep target_count null
store count/allocation in target_count_model only
```

### Risk 2: target-kind expansion

Expanding `ANY_TARGET` into concrete subtypes would change the already closed target-kind policy.

Mitigation:

```text
preserve ANY_TARGET exactly
```

### Risk 3: broad phrase matching

Matching every phrase containing "target" and "damage" could create false positives.

Mitigation:

```text
require divided-as-you-choose wording plus recognized count phrase
```

### Risk 4: modal contamination

Split/divided target count could be mistakenly represented as modal selection.

Mitigation:

```text
modal_selection_model remains null
```

### Risk 5: legality leakage

Target-count extraction must not import casting/activation legality concepts.

Mitigation:

```text
legality_kinds remains []
forbidden gate values remain excluded
```

## 16. Closure decision

This microphase is closed once committed and pushed as documentation-only.

It does not change runtime behavior.

It establishes the next safe implementation path:

```text
1. additive helper or local extraction path
2. target_count_model construction only for recognized split/divided damage wording
3. no scalar target_count projection
4. no ANY_TARGET expansion
5. focused extraction test
6. contract test preservation
```

## 17. Recommended next microphase

Recommended next microphase:

```text
A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_EXTRACTION_V1
```

Rationale:

* The plan is now explicit.
* The contract is already frozen.
* The corpus is closed.
* The next productive step can safely add extraction under narrow guardrails.

A follow-up guardrail ring should come after extraction:

```text
A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_EXTRACTION_GUARDRAIL_RING_V1
```

## 18. Final markers

```text
A2_10_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_EXTRACTION_PLAN_V1_COMPLETE
TARGET_COUNT_MODEL_EXTRACTION_PLAN_V1_DOCS_ONLY
TARGET_COUNT_MODEL_EXTRACTION_PLAN_V1_NO_RUNTIME_CHANGE
TARGET_COUNT_MODEL_EXTRACTION_PLAN_V1_NEXT_EXTRACTION_RECOMMENDED
```
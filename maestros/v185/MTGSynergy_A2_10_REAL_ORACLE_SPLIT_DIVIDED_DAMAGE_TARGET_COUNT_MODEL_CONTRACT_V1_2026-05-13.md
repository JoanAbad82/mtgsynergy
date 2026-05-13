# MTGSynergy — A2.10 Real Oracle Split/Divided Damage Target Count Model Contract V1

Project: MTGSynergy / PÁGINA WEB MAGIC
Date: 2026-05-13
Microphase: A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_CONTRACT_V1
Status: Closed operationally and documentarily

## 1. Executive summary

This microphase closes the contract-first freeze for split/divided damage target-count and allocation semantics.

The microphase intentionally did not implement productive extraction. It added only a JSON contract and a focused contract test to freeze the future target-count model before any runtime lowering, parser, or target-count emission work.

The contract preserves the already closed target-kind result:

```text
split_divided_damage_target_model.allowed_target_kinds == ["ANY_TARGET"]
costTargetLegalityMin.target_kinds == ["ANY_TARGET"]
```

It also preserves the conservative current policy:

```text
costTargetLegalityMin.target_count == null
```

The newly frozen target-count semantics live in a future-facing `target_count_model` shape, not in productive runtime output.

## 2. Baseline and closure commits

Baseline before the operational contract branch:

```text
25b635e
```

Feature/test branch:

```text
test/a210-split-divided-damage-target-count-model-contract-v1
```

Feature/test commit:

```text
bdc2c08 test: add a210 split divided damage target count model contract v1
```

Operational merge commit on `main`:

```text
3eaa8ef merge: a210 split divided damage target count model contract v1
```

Final synchronized operational state before this documentary closure:

```text
HEAD == origin/main == 3eaa8ef
```

## 3. Scope closed

### In scope

* Additive JSON contract for split/divided damage target-count model semantics.
* Focused test that validates the contract metadata, policy, corpus order, target-count model fields, exact expected cases, and conservative invariants.
* Freeze of target-count/allocation expectations for the existing real Oracle split/divided damage corpus.
* Preservation of current runtime policy where `costTargetLegalityMin.target_count` remains null.
* Preservation of `ANY_TARGET` as umbrella target kind.

### Out of scope

* No productive extraction.
* No parser changes.
* No lowering changes.
* No runtime emission of `target_count_model`.
* No population of `costTargetLegalityMin.target_count`.
* No target legality simulator.
* No damage allocation solver.
* No modal selection changes.
* No legality gate creation.
* No UI changes.
* No overlay changes.
* No scoring changes.
* No CSE changes.
* No package/config/public data/build changes.
* No updates to previous contracts.

## 4. Files changed operationally

The operational merge changed exactly these files:

```text
src/engine/semantic/contract/sem_cost_target_legality_split_divided_damage_target_count_model_contract_v1.json
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_model_contract_v1.test.ts
```

No files outside that scope were changed.

## 5. Contract semantics frozen

The contract freezes a minimum target-count/allocation shape:

```json
{
  "kind": "...",
  "min_targets": 1,
  "max_targets": null,
  "is_variable": true,
  "variable_symbol": null,
  "requires_damage_allocation": true,
  "damage_amount_kind": "FIXED",
  "damage_amount": 4,
  "raw_text": "..."
}
```

The schema is intentionally future-facing. It describes what the model must be able to represent before extraction is implemented.

The contract does not claim that runtime already emits `target_count_model`.

## 6. Corpus closed

The contract covers the same closed real Oracle split/divided damage corpus:

```text
Electrolyze
Arc Lightning
Flames of the Firebrand
Pyrotechnics
Rolling Thunder
```

The frozen target-count/allocation readings are:

```text
Electrolyze -> ONE_OR_TWO_TARGETS, min 1, max 2, fixed 2 damage
Arc Lightning -> ONE_TWO_OR_THREE_TARGETS, min 1, max 3, fixed 3 damage
Flames of the Firebrand -> ONE_TWO_OR_THREE_TARGETS, min 1, max 3, fixed 3 damage
Pyrotechnics -> ANY_NUMBER_OF_TARGETS, min 1, max null, fixed 4 damage
Rolling Thunder -> ANY_NUMBER_OF_TARGETS, min 1, max null, variable X damage
```

These are contract expectations only. Runtime extraction remains a future microphase.

## 7. Conservative policy preserved

The contract explicitly preserves:

```text
target_kinds remains ["ANY_TARGET"]
allowed_target_kinds remains ["ANY_TARGET"]
target_count remains null under current policy
modal_selection_model remains null
legality_kinds remains []
```

The decision to keep `target_count` null is deliberate.

Rationale:

* It avoids collapsing range semantics into a scalar.
* It avoids representing "one or two targets" as a single target count.
* It avoids representing "any number of targets" as an exact count.
* It keeps split/divided damage count semantics inside a richer model.
* It prevents premature runtime assertions before extraction exists.

## 8. Guardrails preserved

The contract and test preserve the following guardrails:

```text
No expansion of ANY_TARGET into CREATURE / PLAYER / PLANESWALKER / BATTLE
No legality/gate leakage into target kind fields
No modal_selection_model creation
No legality_kinds population
No target_count population under current policy
No runtime extraction
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

## 9. Test behavior

The focused test validates:

```text
contract metadata
phase
status
no_runtime_change
policy
exact five-card corpus order
required target_count_model fields
exact target_count_model expectations for all five cards
target_count remains null under current policy
target_kinds remains ["ANY_TARGET"]
allowed_target_kinds remains ["ANY_TARGET"]
modal_selection_model remains null
legality_kinds remains []
forbidden legality/gate values do not leak into target kind fields
```

The focused test includes the literal marker:

```text
TARGET_COUNT_MODEL_CONTRACT_V1_COMPLETE
```

## 10. Validation executed

Before feature commit:

```text
node JSON parse
TARGET_COUNT_MODEL_CONTRACT_JSON_VALID
```

Focused test:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_model_contract_v1.test.ts

PASS: 1 file passed
PASS: 2 tests passed
TARGET_COUNT_MODEL_CONTRACT_V1_COMPLETE
```

Diff hygiene:

```text
git diff --check
clean

git diff --cached --check
clean
```

Encoding and file hygiene:

```text
hasBom=False
hasCR=False
no trailing whitespace detected
```

Staged scope:

```text
src/engine/semantic/contract/sem_cost_target_legality_split_divided_damage_target_count_model_contract_v1.json
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_model_contract_v1.test.ts
```

## 11. Merge and push validation

Feature branch was confirmed clean at:

```text
bdc2c08
```

Main baseline before merge:

```text
HEAD == origin/main == 25b635e
```

Merge completed successfully:

```text
3eaa8ef merge: a210 split divided damage target count model contract v1
```

Merge scope was exact:

```text
src/engine/semantic/contract/sem_cost_target_legality_split_divided_damage_target_count_model_contract_v1.json
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_model_contract_v1.test.ts
```

Focused test was re-run on `main` and passed:

```text
1 file passed
2 tests passed
TARGET_COUNT_MODEL_CONTRACT_V1_COMPLETE
```

Push completed successfully:

```text
25b635e..3eaa8ef main -> main
```

Final sync after push:

```text
branch: main
HEAD: 3eaa8ef
origin/main: 3eaa8ef
working tree clean
```

Final operational markers:

```text
TARGET_COUNT_MODEL_CONTRACT_V1_MERGED_AND_PUSHED
A2_10_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_CONTRACT_V1_OPERATIONAL_COMPLETE
```

## 12. Architectural reading

This microphase is a schema freeze, not an extractor.

It moves the project one step forward by defining how split/divided damage target-count and allocation semantics should be represented before runtime work begins.

The key architectural distinction remains intact:

```text
split_divided_damage_target_model
```

continues to own split/divided damage-specific structure, while:

```text
costTargetLegalityMin.target_count
```

remains null until the project explicitly decides how scalar projection should work.

This avoids premature semantic flattening.

## 13. Validation policy

No build was required because this microphase did not touch UI, bundle wiring, public data, package config, routes, runtime loader, production surface, or generated assets.

Under the post-v33 validation protocol:

```text
Anillo A: focused contract test
Anillo B: not expanded; contract-only local guard
Anillo C: not applicable
```

A passed. C did not apply.

## 14. Closure decision

This microphase is closed.

The project now has a frozen contract for target-count/allocation semantics over the closed split/divided damage corpus.

Runtime behavior remains intentionally unchanged.

## 15. Recommended next microphase

Recommended next microphase:

```text
A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_EXTRACTION_PLAN_V1
```

Rationale:

* The target-count/allocation contract is now frozen.
* Productive extraction should not start blindly.
* A short implementation plan should decide where `target_count_model` is built, where it is stored, and which fields are allowed to surface.
* The plan should preserve `costTargetLegalityMin.target_count == null` unless a later contract explicitly changes that projection policy.

Alternative if skipping the plan:

```text
A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_EXTRACTION_V1
```

However, the recommended sequence remains plan first, extraction second.

## 16. Final markers

```text
TARGET_COUNT_MODEL_CONTRACT_V1_COMMITTED
TARGET_COUNT_MODEL_CONTRACT_V1_MERGED_AND_PUSHED
TARGET_COUNT_MODEL_CONTRACT_V1_COMPLETE
A2_10_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_CONTRACT_V1_OPERATIONAL_COMPLETE
A2_10_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_CONTRACT_V1_DOCUMENTARY_CLOSURE_COMPLETE
```
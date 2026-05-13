# MTGSynergy — A2.10 Real Oracle Split/Divided Damage Target Kind Integration: Target Kinds Emission V1

Project: MTGSynergy / PÁGINA WEB MAGIC
Date: 2026-05-13
Microphase: A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_TARGET_KINDS_EMISSION_V1
Status: Closed operationally and documentarily

## 1. Executive summary

This microphase closes the minimal productive runtime emission of `target_kinds` from the already structured `split_divided_damage_target_model.allowed_target_kinds` into `costTargetLegalityMin.target_kinds`.

The frozen decision was intentionally narrow:

```text
allowed_target_kinds: ["ANY_TARGET"]
->
target_kinds: ["ANY_TARGET"]
```

The implementation preserves `ANY_TARGET` as the canonical umbrella target kind. It does not expand it into `CREATURE`, `PLAYER`, `PLANESWALKER`, or `BATTLE`.

The change is additive and conservative. It does not open a general target simulator, does not infer target count, does not create modal selection semantics, and does not mix target kind extraction with legality gates.

## 2. Baseline and closure commits

Baseline before the operational feature branch:

```text
efd3723
```

Feature branch:

```text
feat/a210-split-divided-damage-target-kinds-emission-v1
```

Operational feature commit:

```text
b78016d feat: add a210 split divided damage target kinds emission v1
```

Merge commit on `main`:

```text
bc40432 merge: a210 split divided damage target kinds emission v1
```

Final synchronized state after push:

```text
HEAD == origin/main == bc40432
```

## 3. Scope closed

### In scope

* Minimal productive lowering emission.
* New focused test for target kind emission.
* Promotion of previous guardrail baselines to the new post-emission runtime state.
* Preservation of the existing split/divided damage target model.
* Emission only of classes already present in `allowed_target_kinds`.
* Preservation of `ANY_TARGET` as umbrella canonical kind.

### Out of scope

* No expansion of `ANY_TARGET` into specific target subtypes.
* No target count inference.
* No modal selection model creation.
* No legality kind population.
* No legality gate creation.
* No parser changes.
* No UI changes.
* No overlay changes.
* No scoring changes.
* No CSE changes.
* No package/config/build/public data changes.
* No rewrite of previous contracts.

## 4. Files changed operationally

The operational merge changed exactly these files:

```text
src/engine/semantic/lowering/lower_to_ability_ir_min_v1.ts
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_target_kinds_emission_v1.test.ts
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_target_kinds_emission_contract_v1.test.ts
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_allowed_target_kinds_guardrail_ring_v1.test.ts
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_extraction_guardrail_ring_v1.test.ts
src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_model_extraction_guardrail_ring_v1.test.ts
```

No files outside that operational scope were changed.

## 5. Productive lowering behavior

The lowering now emits `costTargetLegalityMin.target_kinds` for split/divided damage cases when `split_divided_damage_target_model.allowed_target_kinds` contains structured values.

The emission is conservative:

* copies only existing allowed target kinds;
* deduplicates through the existing target kind normalization path;
* preserves order through the current canonical sorting/unique path;
* does not add new values;
* does not translate `ANY_TARGET`;
* does not expand umbrella kinds;
* does not infer `target_count`;
* does not create `modal_selection_model`;
* does not populate `legality_kinds`;
* does not introduce legality gates.

For split-only emission, the runtime baseline is:

```json
{
  "current_min_exists": true,
  "current_target_kinds": ["ANY_TARGET"],
  "current_target_count": null,
  "current_modal_selection_model": null,
  "current_legality_kinds": []
}
```

## 6. Corpus closed

The focused real Oracle corpus remains:

```text
Electrolyze
Arc Lightning
Flames of the Firebrand
Pyrotechnics
Rolling Thunder
```

For all five cards, the runtime now preserves:

```text
split_divided_damage_target_model.allowed_target_kinds == ["ANY_TARGET"]
costTargetLegalityMin.target_kinds == ["ANY_TARGET"]
```

## 7. Guardrails preserved

The microphase explicitly preserves these invariants:

```text
split_divided_damage_target_model exists
allowed_target_kinds remains ["ANY_TARGET"]
target_kinds emits ["ANY_TARGET"]
target_count remains null for split-only emission
modal_selection_model remains null
legality_kinds remains []
```

The following legality or gate-like values must not leak into `target_kinds`:

```text
CAST_ONLY_IF
ACTIVATE_ONLY_AS_SORCERY
CONTROLS_X
ATTACKED_THIS_TURN
ONCE_EACH_TURN
OTHER_LEGALITY_TEXT
```

The focused test includes the literal marker:

```text
TARGET_KINDS_EMISSION_V1_COMPLETE
```

## 8. Tests executed and passing

The following focused and ring tests were executed successfully before commit:

```text
npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_target_kinds_emission_v1.test.ts
PASS: 1 file passed, 1 test passed

npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_target_kinds_emission_contract_v1.test.ts
PASS: 1 file passed, 2 tests passed

npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_allowed_target_kinds_guardrail_ring_v1.test.ts
PASS: 1 file passed, 2 tests passed

npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_extraction_guardrail_ring_v1.test.ts
PASS: 1 file passed, 2 tests passed

npm test -- src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_model_extraction_guardrail_ring_v1.test.ts
PASS: 1 file passed, 1 test passed

npm test -- src/engine/semantic/tests/sem_cost_target_legality_lowering_hint_wiring_v1.test.ts
PASS: 1 file passed, 8 tests passed
```

Diff hygiene passed:

```text
git diff --check
clean

git diff --cached --check
clean
```

## 9. Merge and push validation

The feature branch was clean before merge:

```text
branch: feat/a210-split-divided-damage-target-kinds-emission-v1
HEAD: b78016d
```

`main` and `origin/main` were confirmed at the expected baseline before merge:

```text
main HEAD: efd3723
origin/main: efd3723
```

The merge to `main` completed successfully with the expected scope:

```text
6 files changed, 258 insertions(+), 21 deletions(-)
```

Push completed successfully:

```text
efd3723..bc40432 main -> main
```

Final sync:

```text
HEAD: bc40432
origin/main: bc40432
working tree clean
```

Post-push scope validation passed:

```text
OK: post-push scope exact
TARGET_KINDS_EMISSION_V1_POST_PUSH_SCOPE_OK
```

## 10. Architectural reading

This microphase is a narrow A2.10 target-channel improvement. It strengthens the cost/target/legality minimum semantics by allowing already structured split/divided target-kind information to surface in the canonical `target_kinds` diagnostic channel.

It does not blur the separation between:

```text
cost
target
legality
modal selection
split/divided damage allocation
```

The important architectural distinction remains intact: `split_divided_damage_target_model` continues to model the split/divided damage target structure, while `target_kinds` now receives the conservative target-kind projection already available from that model.

## 11. Validation policy

No build was required for this microphase because the change touched only semantic lowering and tests. It did not touch UI, bundle wiring, public data, package config, routing, or production-visible surface.

Under the post-v33 validation protocol, this microphase required:

```text
Anillo A: focused microphase test
Anillo B: relevant stable semantic rings
Anillo C: not applicable
```

A and B passed. C did not apply.

## 12. Closure decision

This microphase is closed.

The project now has productive minimal emission of:

```text
split_divided_damage_target_model.allowed_target_kinds
->
costTargetLegalityMin.target_kinds
```

for the closed real Oracle split/divided damage corpus, with conservative `ANY_TARGET` semantics and no leakage from legality channels.

## 13. Recommended next microphase

Recommended next microphase:

```text
A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_PLAN_V1
```

Rationale:

* `target_kinds` now has a productive conservative emission path.
* `allowed_target_kinds` has already been extracted and guarded.
* The remaining visible semantic gap for split/divided damage is not target-kind class, but target-count/allocation shape.
* The next correct step should be a plan-only or contract-first microphase for target count modeling, especially for:

  * one or two targets,
  * one, two, or three targets,
  * any number of targets,
  * conservative handling of X and variable allocation.

No implementation should infer target count opportunistically without a separate contract.

## 14. Final markers

```text
TARGET_KINDS_EMISSION_V1_COMMITTED
TARGET_KINDS_EMISSION_V1_MERGED_AND_PUSHED
TARGET_KINDS_EMISSION_V1_POST_PUSH_SCOPE_OK
A2_10_TARGET_KINDS_EMISSION_V1_DOCUMENTARY_CLOSURE_COMPLETE
```
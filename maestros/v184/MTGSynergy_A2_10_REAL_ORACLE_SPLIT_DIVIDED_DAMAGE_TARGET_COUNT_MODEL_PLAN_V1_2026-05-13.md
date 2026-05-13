# MTGSynergy — A2.10 Real Oracle Split/Divided Damage Target Count Model Plan V1

Project: MTGSynergy / PÁGINA WEB MAGIC
Date: 2026-05-13
Microphase: A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_PLAN_V1
Status: Closed as docs-only / plan-only

## 1. Executive summary

This microphase defines the next conservative modeling plan for split/divided damage target count semantics.

The immediately preceding target-kind work closed productive emission of:

```text
split_divided_damage_target_model.allowed_target_kinds
->
costTargetLegalityMin.target_kinds
```

for the real Oracle split/divided damage corpus, preserving `ANY_TARGET` as the canonical umbrella target kind.

The remaining semantic gap is not target kind class. The remaining gap is target-count and allocation shape.

This document intentionally does not implement extraction, lowering, parser logic, tests, UI, overlay, scoring, CSE behavior, build wiring, or runtime behavior. It freezes the next correct contract-first path.

## 2. Baseline

Baseline before opening this plan microphase:

```text
8b9c541
```

Previous closed microphase:

```text
A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_TARGET_KINDS_EMISSION_V1
```

Previous closed result:

```text
HEAD == origin/main == 8b9c541
```

## 3. Problem statement

Split/divided damage cards encode more than target kind. They encode how many targets may or must be chosen and how damage can be divided among them.

Examples in the current corpus include patterns such as:

```text
one or two targets
one, two, or three targets
any number of targets
X divided as you choose among any number of targets
```

The current model has already separated the split/divided damage structure from modal selection semantics. It has also promoted allowed target kinds into the diagnostic `target_kinds` channel.

However, `target_count` remains intentionally null for split-only emission. That is correct for the previous microphase, because target count should not be inferred opportunistically without an explicit model.

This plan defines the minimum model needed before any productive extraction should occur.

## 4. Architectural constraints

The target count model must preserve the existing layer separation:

```text
cost
target
legality
modal selection
split/divided damage allocation
```

The model must not collapse split/divided damage allocation into modal selection.

The model must not treat informal textual references as formal targets unless they are tied to target grammar.

The model must not expand `ANY_TARGET` into concrete target subtypes.

The model must not infer legality gates.

The model must not simulate target legality at announcement or resolution.

The model must not claim precision for allocation rules beyond what the minimal contract can defend.

## 5. In scope for the future contract

The next contract microphase should define a minimal additive shape inside `split_divided_damage_target_model`, or adjacent to it, for target count semantics.

The contract should be able to represent at least these classes:

```text
EXACTLY_ONE_TARGET
ONE_OR_TWO_TARGETS
ONE_TWO_OR_THREE_TARGETS
ANY_NUMBER_OF_TARGETS
X_TARGETS_OR_ANY_NUMBER_WITH_X_ALLOCATION
OTHER_SPLIT_DIVIDED_TARGET_COUNT_TEXT
```

A more compact enum is acceptable if it remains conservative and testable.

The future contract should also define explicit fields for:

```text
target_count_model.kind
target_count_model.min_targets
target_count_model.max_targets
target_count_model.is_variable
target_count_model.variable_symbol
target_count_model.requires_damage_allocation
target_count_model.raw_text
```

The precise final names may differ, but the semantics must remain explicit.

## 6. Out of scope for the future contract

The next contract should not implement:

```text
productive extraction
parser rewrites
lowering changes
runtime emission into target_count
UI labels
overlay changes
score changes
CSE changes
deck analysis changes
legality gates
resolution-time legality simulation
damage assignment solver
target legality evaluator
```

It should remain a contract-first freeze.

## 7. Corpus to preserve

The initial corpus should remain the currently closed real Oracle split/divided damage corpus:

```text
Electrolyze
Arc Lightning
Flames of the Firebrand
Pyrotechnics
Rolling Thunder
```

The expected target-count readings should be treated conservatively:

```text
Electrolyze -> one or two targets
Arc Lightning -> one, two, or three targets
Flames of the Firebrand -> one, two, or three targets
Pyrotechnics -> any number of targets, constrained by four damage divided as chosen
Rolling Thunder -> any number of targets, constrained by X damage divided as chosen
```

These labels are planning expectations only. They should not be treated as runtime behavior until a contract and tests freeze them.

## 8. Recommended contract semantics

The future contract should distinguish at least two independent axes.

### 8.1 Target count range

This axis describes how many formal targets may be chosen.

Examples:

```text
one or two targets
one, two, or three targets
any number of targets
```

Suggested representation:

```json
{
  "min_targets": 1,
  "max_targets": 2,
  "is_variable": false
}
```

For any number of targets:

```json
{
  "min_targets": 1,
  "max_targets": null,
  "is_variable": true
}
```

The minimum for "any number of targets" should be handled conservatively. If the wording and rules context allow zero targets in a specific construction, that must be frozen separately. No broad zero-target assumption should be introduced in this microphase family without explicit evidence.

### 8.2 Allocation shape

This axis describes whether damage must be divided among the chosen targets.

Examples:

```text
2 damage divided as you choose among one or two targets
3 damage divided as you choose among one, two, or three targets
4 damage divided as you choose among any number of targets
X damage divided as you choose among any number of targets
```

Suggested representation:

```json
{
  "requires_damage_allocation": true,
  "damage_amount_kind": "FIXED",
  "damage_amount": 3,
  "variable_symbol": null
}
```

For X:

```json
{
  "requires_damage_allocation": true,
  "damage_amount_kind": "VARIABLE",
  "damage_amount": null,
  "variable_symbol": "X"
}
```

## 9. Conservative policy for `target_count`

The existing top-level or min-level `target_count` field should not be populated casually from split/divided wording until the project decides what that field means.

There are two possible policies:

```text
Policy A: keep costTargetLegalityMin.target_count null and expose count only inside split_divided_damage_target_model.target_count_model.
Policy B: project a safe scalar only when exact and non-variable, while keeping richer count/allocation semantics inside split_divided_damage_target_model.
```

Recommended initial policy:

```text
Policy A
```

Rationale:

* It avoids collapsing range semantics into a scalar.
* It avoids misrepresenting "one or two" or "any number" as a single count.
* It preserves the separation between diagnostic target aggregation and split/divided damage structure.
* It keeps the future productive extraction reversible and auditable.

## 10. Guardrails for the future extraction phase

A future extraction phase must preserve these invariants:

```text
target_kinds remains ["ANY_TARGET"] for the closed corpus
allowed_target_kinds remains ["ANY_TARGET"]
modal_selection_model remains null
legality_kinds remains []
target_count remains null unless a later contract explicitly changes policy
target_count_model exists only for recognized split/divided damage target-count patterns
```

The following must not be introduced by the target count work:

```text
CAST_ONLY_IF
ACTIVATE_ONLY_AS_SORCERY
CONTROLS_X
ATTACKED_THIS_TURN
ONCE_EACH_TURN
OTHER_LEGALITY_TEXT
```

The future extraction must not infer target count from unrelated phrases such as:

```text
each target
that target
another target
up to one target
target creature you control
```

unless those forms are separately contracted.

## 11. Expected future contract baseline

The next contract should likely freeze a JSON contract file with cases resembling:

```json
{
  "card": "Electrolyze",
  "expected": {
    "split_divided_damage_target_model_exists": true,
    "allowed_target_kinds": ["ANY_TARGET"],
    "target_count_model": {
      "kind": "ONE_OR_TWO_TARGETS",
      "min_targets": 1,
      "max_targets": 2,
      "is_variable": false,
      "requires_damage_allocation": true,
      "damage_amount_kind": "FIXED",
      "damage_amount": 2,
      "variable_symbol": null
    }
  }
}
```

For Rolling Thunder, the future contract should preserve the variable nature:

```json
{
  "card": "Rolling Thunder",
  "expected": {
    "split_divided_damage_target_model_exists": true,
    "allowed_target_kinds": ["ANY_TARGET"],
    "target_count_model": {
      "kind": "ANY_NUMBER_OF_TARGETS",
      "min_targets": 1,
      "max_targets": null,
      "is_variable": true,
      "requires_damage_allocation": true,
      "damage_amount_kind": "VARIABLE",
      "damage_amount": null,
      "variable_symbol": "X"
    }
  }
}
```

This is illustrative. The next microphase should freeze the exact schema before implementation.

## 12. Validation policy for this plan

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
commit atomic
merge to main
push to origin/main
final HEAD == origin/main
working tree clean
```

No tests or build are required because this microphase does not touch runtime, source, tests, UI, package files, public assets, or generated artifacts.

## 13. Closure decision

This plan microphase is closed once committed and pushed.

It does not change runtime behavior.

It establishes the next safe sequence:

```text
1. Target count model contract
2. Focused guardrail test for existing null target_count policy
3. Productive extraction only after schema freeze
4. Guardrail ring promotion after productive extraction
```

## 14. Recommended next microphase

Recommended next microphase:

```text
A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_CONTRACT_V1
```

Rationale:

* Target kinds are already extracted and emitted.
* Allowed target kinds are already guarded.
* Split/divided damage structure exists.
* Target count/allocation shape now needs a contract before extraction.
* The next step should freeze schema and expectations, not implement runtime behavior.

## 15. Final markers

```text
A2_10_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_PLAN_V1_COMPLETE
TARGET_COUNT_MODEL_PLAN_V1_DOCS_ONLY
TARGET_COUNT_MODEL_PLAN_V1_NO_RUNTIME_CHANGE
TARGET_COUNT_MODEL_PLAN_V1_NEXT_CONTRACT_RECOMMENDED
```
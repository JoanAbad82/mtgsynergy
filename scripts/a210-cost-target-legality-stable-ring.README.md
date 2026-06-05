# A2.10 cost/target/legality stable ring scripted gate

This gate is the versioned executable form of the compact A2.10 stable ring candidate validated by:

`MTGSYNERGY_A2_10_COST_TARGET_LEGALITY_STABLE_RING_AND_SCOPE_BOUNDARY_CONSOLIDATION_AUDIT_V1`

## Command

```powershell
npm run test:a210:stable-ring
```

Equivalent direct command:

```powershell
node scripts/a210-cost-target-legality-stable-ring.cjs
```

## Scope

The gate runs an explicit list of A2.10 cost/target/legality guardrail tests plus diagnostic observability anchors.

It is intentionally narrow. It does not replace the full test suite.

## Protected areas

The gate protects current behavior around:

* stable consolidation review
* canonical lowering snapshots
* real Oracle lowering ring
* activation/casting legality guardrails
* modal target selection and aggregation guardrails
* multi-ability selection guardrail
* split/divided damage target model guardrail
* split/divided damage target-kind integration guardrails
* split/divided damage target-count model guardrail
* scalar projection policy guardrail
* target-kind canonicalization guardrail
* lowering diagnostics
* coverage input-resolution diagnostics

## Explicit boundaries

This gate does not authorize runtime expansion.

It preserves the current A2.10 boundaries:

* `target_count_model` remains canonical for split/divided range models.
* Scalar `target_count` remains `null` where `DO_NOT_PROJECT` applies.
* `SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS` remains contractual.
* `ANY_NUMBER_OF_TARGETS_MIN_SLOT_IS_CONSERVATIVE_0` remains contractual.
* Predicate-bearing split/divided damage remains narrow v1.
* No full target legality or resolution model is implied.

## Non-goals

This gate does not:

* add semantic coverage
* modify `lower_to_ability_ir_min_v1.ts`
* modify contracts
* modify tests
* modify parser behavior
* modify UI or scoring
* replace full CI

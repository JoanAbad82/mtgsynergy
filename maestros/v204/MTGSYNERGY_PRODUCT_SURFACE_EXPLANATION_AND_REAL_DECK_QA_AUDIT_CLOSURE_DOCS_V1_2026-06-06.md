# MTGSynergy Product Surface Explanation and Real Deck QA Audit Closure

Date: 2026-06-06
Phase: MTGSYNERGY_PRODUCT_SURFACE_EXPLANATION_AND_REAL_DECK_QA_AUDIT_CLOSURE_DOCS_V1
Source audit: MTGSYNERGY_PRODUCT_SURFACE_EXPLANATION_AND_REAL_DECK_QA_AUDIT_V1
Repository: C:\MTGSynergy
Branch: main
Main HEAD before docs closure: 8ca915c

## Purpose

This docs-only closure records the read-only product surface audit performed after the A2.10 stable ring scripted gate sequence.

The audit validated that the visible web product can analyze a real deck while the internal A2.10 semantic gate and production build remain green.

## Validation baseline

Confirmed audit baseline:

- branch: main
- head: 8ca915c
- working tree: clean
- post-closure validation evidence: PASS
- A2.10 stable ring gate: PASS
- build: PASS

The audit was explicitly read-only:

- no code changes
- no documentation changes during the audit
- no staging
- no commit

## Product state observed

The web product is operational with a real mono-red deck and renders a complete local analysis surface.

The current product surface communicates privacy and local execution clearly through no-server, no-account, and share-by-url copy.

The result surface exposes useful high-level metrics:

- SPS
- detected synergies
- density
- dominant roles
- semantic overlay

## Main audit finding

The strongest product risk is not runtime correctness at this point. It is explanation clarity.

Several visible metrics are technically meaningful but may not be self-evident to a normal user.

The priority explanation areas are:

- SPS
- density
- semantic overlay
- Peso en el plan

## Peso en el plan decision

The tested deck showed Peso en el plan as zero across roles.

This is the strongest candidate for a separate follow-up audit because it may represent one of three different cases:

- expected but poorly explained behavior
- under-modelled metric behavior
- confusing UI presentation

This closure does not decide which one is true. It only fixes that Peso en el plan must not be changed casually inside a generic UI copy patch.

## Semantic overlay decision

The semantic overlay is valuable but partial.

The tested product surface showed partial coverage and missing template coverage in an honest way.

The next product work should preserve that honesty while making the meaning clearer for users.

## Scope decision

No implementation is authorized by this closure.

The next implementation must not change A2.10 semantics.

The next phase must choose one of two separated scopes:

Option A - UI/copy explanation patch:

- clarify SPS
- clarify density
- clarify semantic overlay
- improve user-facing explanations only
- do not modify scoring
- do not modify semantic engine behavior
- do not modify A2.10 contracts

Option B - Peso en el plan audit:

- determine whether zero values are expected
- inspect role graph centrality inputs
- decide whether to explain, hide, rename, or repair the metric
- do not mix this with general copy polishing

## Recommended next step

Open a separate microphase after this closure.

Recommended first follow-up:

MTGSYNERGY_PRODUCT_SURFACE_METRIC_EXPLANATION_COPY_PATCH_V1

Allowed scope for that follow-up should be limited to UI copy and tests around user-facing explanations.

If Peso en el plan is selected instead, open a separate read-only audit first:

MTGSYNERGY_ROLE_GRAPH_PLAN_WEIGHT_ZERO_STATE_AUDIT_V1

## Closure

This audit is closed as docs-only.

The project should not proceed directly into broad product changes. The next phase must be narrow, explicit, and either copy-only or metric-audit-only.

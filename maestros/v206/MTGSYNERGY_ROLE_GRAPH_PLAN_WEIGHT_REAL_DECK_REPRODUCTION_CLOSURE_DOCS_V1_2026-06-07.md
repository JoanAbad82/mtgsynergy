# MTGSynergy Role Graph Plan Weight Real Deck Reproduction Closure

Date: 2026-06-07
Phase: MTGSYNERGY_ROLE_GRAPH_PLAN_WEIGHT_REAL_DECK_REPRODUCTION_CLOSURE_DOCS_V1
Source phase: MTGSYNERGY_ROLE_GRAPH_PLAN_WEIGHT_REAL_DECK_REPRODUCTION_READ_ONLY_V1
Repository: C:\MTGSynergy
Final branch: main
Main HEAD before docs closure: c404fb2

## Purpose

This docs-only closure records the read-only reproduction for the user-visible Peso en el plan zero-state observed in the role graph panel.

The objective was to determine whether zero plan weight could be explained by an empty or relationless role graph before authorizing any UI, calculation, or role graph repair.

## Reproduction method

The reproduction avoided the earlier parser assumption and used a minimal DeckState directly.

The temporary reproduction test was created under review, executed by Vitest, and removed before final status.

No repository mutation was left behind.

## Captured result

The minimal mono-red DeckState reproduced the zero-state as follows:

- deck entries: 10
- total copies: 56
- generated edges: 0
- edges_total: 0
- density: 0
- nodes_active: 4
- nodes_total: 8
- has_any_role_centrality: false
- all_visible_centrality_zero: true

Role counts were present:

- ENGINE: 4
- PAYOFF: 20
- REMOVAL: 12
- LAND: 20

However, all centrality_score values were zero because the graph had no generated edges.

## Classification

CLASSIFICATION=EXPECTED_ZERO_FROM_EMPTY_OR_RELATIONLESS_GRAPH

In this reproduction, Peso en el plan equals zero because centrality_score is zero for every role, and centrality_score is zero because the generated role graph has no edges.

This means the observed zero-state is not, by itself, evidence of a RoleGraphPanel rendering bug.

## Explicit non-scope

This closure does not authorize:

- RoleGraphPanel patching
- Peso en el plan calculation changes
- centrality algorithm changes
- edge generation changes
- parser changes
- analyzer pipeline changes
- A2.10 semantic changes
- UI hiding or renaming of Peso en el plan

## Validation

The reproduction completed with:

- temporary reproduction test: PASS
- A2.10 stable ring gate: PASS
- production build: PASS
- final branch: main
- final head: c404fb2
- final working tree: clean
- repo mutation: no

## Remaining nuance

This reproduction used a minimal DeckState with explicit role_primary fields.

It proves that zero plan weight is expected when the role graph is empty or relationless.

It does not yet prove whether the public web analyzer pipeline should or should not generate edges for the same user-facing deck input.

If further work is desired, the next separate read-only phase should inspect the public analyzer pipeline from MTGA input through enrichment, edge generation, structural summary, and RoleGraphPanel rows.

Suggested follow-up:

MTGSYNERGY_PUBLIC_ANALYZER_ROLE_GRAPH_PIPELINE_EDGE_GENERATION_AUDIT_V1

## Closure

This reproduction is closed as docs-only.

Peso en el plan remains technically coherent for an empty graph. Any future change must target the pipeline that produces or does not produce role graph edges, not the panel display in isolation.

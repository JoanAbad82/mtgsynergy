---
applyTo: "src/engine/**"
---
# MTGSynergy deterministic engine

Ground changes in current TypeScript contracts and src/engine/__tests__.
Require negative and ambiguous cases for changes to Oracle normalization,
parser, mana/cost, target legality, semantic relations and rankings.
Preserve deterministic candidate order, typed diagnostics, index provenance
and clear distinction between game rules and inferred heuristics.
Do not rewrite generated card assets or export third-party content as
new Apache-2.0 material. Run focused Vitest and full CI tests.

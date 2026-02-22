# Semantic Normalization Spec v1 (SEM_IR_VERSION=1)

This document defines the deterministic normalization contract for semantic extraction. It is a spec, not an implementation.

## Scope (v1 MVP)
- v1 is intentionally minimal and deterministic.
- No advanced parametric gates (only fixed GateId entries).
- No type taxonomy and no zones in ResourceId.
- Unknown tokens map to UNKNOWN_* ids.

## Segmentation
- Input text is split into ordered segments by sentence boundaries and top-level clause separators (",", ";", "and then").
- Each segment is processed left-to-right with no reordering.
- Parenthetical reminder text is ignored for semantic extraction.

## Classification
Each segment is assigned exactly one frame kind:
- Triggered: "when/whenever/at" clauses that describe an event.
- Activated: "cost: effect" patterns and explicit activation verbs.
- Static: continuous effects and replacement rules.
- Spell: one-shot spell resolution text.

## Canonicalization (ordered)
Canonicalization is applied in this fixed order:
1. Normalize keyword shortcuts to explicit events (e.g., "dies" -> "is put into a graveyard from the battlefield").
2. Normalize numbers to digits ("two" -> "2").
3. Singularize resource nouns when count is not explicitly pluralized ("creatures" -> "creature").
4. Normalize verb tenses to base forms ("draws" -> "draw").
5. Collapse equivalent event phrases to canonical events ("leaves the battlefield" -> LEAVES_BATTLEFIELD).

## Specific Then Generic
When multiple matches apply, select the most specific event/action first, then fall back to a generic one. Example:
- Prefer CREATURE_DIES over LEAVES_BATTLEFIELD.
- Prefer DEAL_DAMAGE over a generic loss/gain.

## Cost Extraction v1
- Activated abilities record a deterministic cost list in `SemanticFrame.cost`.
- Costs are normalized to `CostId` and may include a related `ResourceId` and count.
- Costs use `x: true` only when the cost explicitly includes X.

## TokenData Usage v1
- `EffectAtom.tokenData` is only populated when `action === ActionId.CREATE_TOKEN`.
- `TokenData.kind` uses `TokenKindId` for known token types; otherwise UNKNOWN_TOKEN.
- Power/toughness and count are optional and only included when explicitly specified.

## Determinism
Given the same input, segmentation, classification, and canonicalization must always produce identical frames and id lists. There is no randomness, and unknown tokens map to UNKNOWN_* ids.

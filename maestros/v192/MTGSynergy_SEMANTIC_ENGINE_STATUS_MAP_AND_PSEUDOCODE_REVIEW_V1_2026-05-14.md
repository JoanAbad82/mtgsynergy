# MTGSynergy — Semantic Engine Status Map and Pseudocode Review V1

Project: MTGSynergy / PÁGINA WEB MAGIC
Date: 2026-05-14
Microphase: MTGSYNERGY_SEMANTIC_ENGINE_STATUS_MAP_AND_PSEUDOCODE_REVIEW_V1
Status: Draft created for documentary audit
Baseline: d78e497
Branch: docs/semantic-engine-status-map-review-v1

## 1. Executive summary

This document is a senior technical map of the current MTGSynergy semantic engine.

Its purpose is not to add code. Its purpose is to make the current architecture legible enough to continue development with less drift, less duplicated reasoning, and clearer prioritization.

The reviewed baseline is:

```text
HEAD == origin/main == d78e497
```

The audit pack was generated outside the repository and reported:

```text
00_repo_state.txt                  4650 bytes
01_project_file_inventory.txt     37339 bytes
02_semantic_contracts.txt          3796 bytes
03_semantic_tests.txt             12576 bytes
04_a210_related_files.txt         10220 bytes
05_package_json.txt                 784 bytes
06_config_refs.txt                  332 bytes
07_semantic_marker_search.txt    371126 bytes
08_recent_maestros_inventory.txt   2737 bytes
09_relevant_git_history.txt       19731 bytes
```

High-level reading:

```text
The project is no longer a simple structural analyzer.
It is now a layered client-side semantic analyzer with:
- structural engine
- static card index
- semantic parser / normalizer
- AbilityIR lowering
- semantic hints
- cost / target / legality min extraction
- semantic overlay bridges
- many guardrail rings
- documentary closure discipline
```

The current main engineering risk is not lack of work. The risk is loss of global map: many narrow slices are closed, but the project now needs an explicit status map showing what is productive, what is only contractual or guarded, and what remains intentionally out of scope.

## 2. Audit scope and constraints

### In scope

```text
- Repo state inventory.
- Semantic contracts inventory.
- Semantic tests inventory.
- A2.10 cost/target/legality inventory.
- Marker search for major semantic primitives.
- Recent maestros/v170-v191 inventory.
- Relevant git history.
- Pseudocode map of the current engine.
- Status map: IMPLEMENTED / PARTIAL / PENDING.
- Recommended next microphases.
```

### Out of scope

```text
- No runtime code changes.
- No parser changes.
- No lowering changes.
- No test changes.
- No UI changes.
- No scoring changes.
- No package/config changes.
- No deploy.
```

### Method

This document is based on the generated audit pack plus the project canon:

```text
Oracle text = canonical lexical/syntactic card text.
Comprehensive Rules = operational semantics of the game.
The engine should remain deterministic, typed, total where possible, and explicit about partial/fallback semantics.
```

## 3. Repo state

Baseline confirmed by audit:

```text
Branch: docs/semantic-engine-status-map-review-v1
HEAD: d78e497
origin/main: d78e497
Status: clean
```

Last closed microphase at baseline:

```text
d78e497 docs: close a210 split divided damage target count scalar projection guardrail ring v1
```

Immediate preceding operational merge:

```text
de2c30e merge: a210 split divided damage target count scalar projection policy guardrail ring v1
```

The branch is correctly positioned for a docs-only review.

## 4. File inventory signal

The audit inventory reported these active project areas:

```text
src/engine/semantic      214 files
src/engine/analyzer        2 files
src/engine/edges           4 files
src/engine/cards           5 files
src/components/analyzer   29 files
maestros                 204 files
```

The audit path `src/engine/cards_index` was not present. That does not imply card-index functionality is absent; current project history indicates card index generation/loading has moved through scripts/static assets and `src/engine/cards`. This should be treated as a naming/path drift to document, not a runtime defect.

Semantic contracts inventory:

```text
47 contract files
```

Semantic tests inventory:

```text
148 semantic test files/snapshots
```

A2.10-related inventory:

```text
97 files
```

A2.10 is now a substantial family, not a single slice.

## 5. Current architecture: layer map

The current architecture should be understood as eight layers.

```text
Layer 0: Product shell / Analyzer UI
Layer 1: MTGA input parsing and deck normalization
Layer 2: Static card data lookup / enrichment
Layer 3: Structural engine
Layer 4: Semantic normalization and parsing
Layer 5: AbilityIR lowering and semantic hints
Layer 6: Semantic overlay / local bridge graph
Layer 7: Experimental/future interpreters: CSE, legality, target re-checks, broader corpus expansion
```

The most important discipline is that these layers must not be collapsed.

```text
Structural scoring must not pretend to be semantic causality.
Semantic hints must not pretend to be full CR execution.
UI labels must not compensate for missing engine semantics.
A2.10 target aggregation must not overwrite richer split/divided damage models.
```

## 6. Global engine pseudocode

### 6.1 Public analyzer flow

```text
analyzeMtgaExportAsync(input, options):
  rawDeck = parseMtgaInput(input)

  deckEntries = normalizeDeckEntries(rawDeck)

  if options.enableCardIndex:
    cardIndex = loadStaticCardIndex()
    resolvedEntries = enrichEntriesFromCardIndex(deckEntries, cardIndex)
  else:
    resolvedEntries = deckEntries with limited metadata

  structuralSummary = computeStructuralSummary(resolvedEntries)

  structuralEdges = generateStructuralEdges(resolvedEntries)
  structuralScores = computeStructuralPowerScore(structuralSummary, structuralEdges)

  semanticProfiles = []
  for each resolvedEntry in resolvedEntries:
    semanticProfiles.push(buildSemanticCardProfile(resolvedEntry))

  semanticOverlay = computeSemanticOverlayFromProfiles(semanticProfiles)

  result = {
    deckState,
    structuralSummary,
    structuralEdges,
    semanticOverlay,
    issues,
    metadata
  }

  return result
```

### 6.2 Semantic card profile flow

```text
buildSemanticCardProfile(card):
  oracleText = card.oracle_text

  normalizedText = normalizeOracleTextV1(oracleText)

  parserIr = parseSemanticIrV0(normalizedText)

  abilityIr = lowerToAbilityIrMinV1(parserIr, cardContext)

  profile = {
    producedSignals: mapActionsAndEventsProduced(parserIr, abilityIr),
    consumedSignals: mapActionsAndEventsConsumed(parserIr, abilityIr),
    semanticHints: abilityIr.semantic_hints,
    originEvidence: preserveLocalEvidence(parserIr, abilityIr)
  }

  return profile
```

### 6.3 AbilityIR lowering flow

```text
lowerToAbilityIrMinV1(parserFrame, cardContext):
  ability = createAbilityShell(parserFrame)

  attach basic events/actions/effects

  triggeredAbilityMin = classifyTriggeredAbilityMinV1(parserFrame)
  replacementPreventionMin = classifyReplacementPreventionMinV1(parserFrame)
  linkedAbilityMin = classifyLinkedAbilityMinV1(parserFrame)
  continuousLayersMin = classifyContinuousLayersMinV1(parserFrame)

  costTargetLegalityMin = buildCostTargetLegalityMinV1(parserFrame, cardContext)

  splitDividedDamageTargetModel = inferSplitDividedDamageTargetModelMinV1(oracleText)

  if splitDividedDamageTargetModel exists:
    attach splitDividedDamageTargetModel at top-level hints
    optionally mirror split_divided_damage_target_model into cost/target/legality min channel

  return ability with semantic_hints
```

### 6.4 A2.10 cost / target / legality flow

```text
buildCostTargetLegalityMinV1(oracleText, abilityContext):
  costs = extractCostIR(oracleText, abilityContext)
  targets = extractFormalTargetKinds(oracleText)
  targetCount = extractScalarTargetCountOnlyWhenSafe(oracleText)
  legalityKinds = extractAnnouncementOrActivationGates(oracleText)
  modalSelectionModel = extractModalSelectionModelWhenExplicit(oracleText)

  if oracleText matches split/divided damage:
    splitModel = inferSplitDividedDamageTargetModelMinV1(oracleText)
    allowedTargetKinds = inferAllowedTargetKinds(splitModel)
    targetCountModel = inferTargetCountModel(splitModel)

    target_kinds = diagnosticAggregationOnly(["ANY_TARGET"])
    target_count = null for range/open-ended allocation cases
    modal_selection_model = null unless independently modal

  return {
    cost_kinds,
    target_kinds,
    target_count,
    legality_kinds,
    modal_selection_model,
    split_divided_damage_target_model
  }
```

### 6.5 Semantic overlay graph flow

```text
computeSemanticOverlayFromProfiles(profiles):
  edges = []

  for each producerProfile in profiles:
    for each consumerProfile in profiles:
      if producer produces signal consumed by consumer:
        edges.push(createSemanticEdge(producer, consumer, signal))

  applyLocalBridgeRules(edges, profiles):
    - CAST_SPELL -> DEAL_DAMAGE
    - CAST_SPELL -> CREATE_TOKEN
    - CAST_SPELL -> DRAW_CARDS
    - DRAW_CARDS -> CREATE_TOKEN
    - DRAW_CARDS -> DEAL_DAMAGE
    - CREATURE_DIES -> payoff actions
    - LIFE_GAIN -> ADD_COUNTERS
    - LIFE_GAIN -> DRAW_CARDS
    - DEAL_DAMAGE -> LOSE_LIFE
    - DAMAGE_WITH_LIFELINK -> LIFE_GAIN
    - attack-trigger local bridges
    - mana/ramp local bridges
    - other narrow min-v1 bridge families

  rank and explain semantic edges

  compute:
    coverage
    SOS
    total_edge_score
    orphan listeners
    excess producers
    redundancy groups

  return semanticOverlay
```

## 7. Status map: implemented / partial / pending

### 7.1 Productively implemented

These areas have code, tests, and recurring use in the analyzer pipeline.

```text
MTGA input parsing and deck normalization                  IMPLEMENTED
Static card lookup/enrichment via shipped site assets       IMPLEMENTED
Structural roles / edges / weights / scores                 IMPLEMENTED
SPS / structural summary                                    IMPLEMENTED
Analyzer UI surface                                         IMPLEMENTED
Semantic normalizer v1                                      IMPLEMENTED
Parser v1 template recognition                              IMPLEMENTED
AbilityIR minimum lowering                                  IMPLEMENTED
Semantic overlay panel                                      IMPLEMENTED
Semantic overlay local bridges                              IMPLEMENTED
A2.9 zone identity / LKI minimum semantics                  IMPLEMENTED
Cost/target/legality pure service v1                        IMPLEMENTED
Cost/target/legality lowering hint wiring                   IMPLEMENTED
Activation legality gates                                   IMPLEMENTED, NARROW
Casting legality gates                                      IMPLEMENTED, NARROW
Target kind canonicalization                                IMPLEMENTED, NARROW
Modal target selection model extraction                     IMPLEMENTED, NARROW
Split/divided damage target model extraction                IMPLEMENTED
Split/divided damage target kind integration                IMPLEMENTED
Split/divided damage allowed target kinds extraction        IMPLEMENTED
Split/divided damage target kinds emission                  IMPLEMENTED
Split/divided damage target_count_model extraction          IMPLEMENTED
Scalar projection policy for target_count                   IMPLEMENTED AS DO_NOT_PROJECT
```

### 7.2 Partial, contractual, or guardrail-only

These areas exist but must be treated as narrow min-v1 semantics, not complete CR engines.

```text
Triggered ability classification                            PARTIAL / MIN V1
Delayed triggered abilities                                 PARTIAL / MIN V1
Reflexive triggered abilities                               PARTIAL / MIN V1
Replacement / prevention                                    PARTIAL / MIN V1
Linked abilities                                            PARTIAL / MIN V1
Continuous effects / layers / dependency / timestamp        PARTIAL / HINTS ONLY
Legality condition / action binding / actor constraints     PARTIAL / MIN V1
Zone permission                                             PARTIAL / MIN V1
Target re-check at resolution                               GUARD / NOT FULL SIMULATION
Prevent-damage no-damage-event rule                         GUARD / NARROW
Mana ability classification                                 PARTIAL / MIN V1
Loyalty ability / loyalty symbol restrictions               PARTIAL / MIN V1
Mode selection                                              PARTIAL / MIN V1
Q-symbol / tap/untap special cases                          PARTIAL / COVERAGE SLICE
Local bridge families                                       MANY IMPLEMENTED, NOT GENERAL SEMANTIC CLOSURE
```

### 7.3 Pending or intentionally out of scope

These areas should not be opened casually.

```text
Full stack / priority simulator                             PENDING
Full casting/activation procedure simulator                 PENDING
Full CR 613 layers engine                                   PENDING
Full replacement/prevention interaction engine              PENDING
Full linked abilities CR 607 coverage                       PENDING
Full modal spell/mode cost algebra                          PENDING
Full X-cost and variable-value algebra                      PENDING
Full target legality re-check at resolution                 PENDING
Full target object identity tracking through resolution     PENDING
Full anaphora/reference resolver                            PENDING
Full Oracle drift automation                                PENDING
Full card-by-card semantic coverage map                     PENDING
Semantic totality/fallback observability review             PENDING REVIEW
Broad corpus expansion beyond current anchors               PENDING PLAN-FIRST
```

## 8. A2.10 status map

A2.10 is now one of the strongest parts of the project.

Audit found:

```text
- sem_cost_target_legality_min_v1.json
- sem_cost_target_legality_focal_corpus_v1.json
- sem_cost_target_legality_service_v1.ts
- sem_cost_target_legality_min_v1.ts
- 40 cost_target_legality-related semantic tests
- 38 recent maestros files related to A2.10 and split/divided damage in the A2.10 inventory
```

### A2.10 closed chain

```text
v142 contract freeze
v143 pure service
v144 lowering hint wiring
v145 canonical lowering snapshot ring
v146 real Oracle lowering ring
v147 multi-ability selection repair
v149 activation legality gate
v150 activation legality gate guardrail
v151 casting legality gate
v152 casting legality gate guardrail
v154 target kind canonicalization
v155 target kind canonicalization guardrail
v166 split/divided damage target model diagnosis
v168 split/divided damage target model contract
v171 split/divided damage target model extraction
v172 split/divided damage target model extraction guardrail
v174 target kind integration contract
v176 target kind integration extraction
v177 target kind integration guardrail
v179 allowed target kinds extraction
v180 allowed target kinds guardrail
v182 target kinds emission contract
v183 target kinds emission
v185 target count model contract
v187 target count model extraction
v188 target count model extraction guardrail
v190 scalar projection policy contract
v191 scalar projection policy guardrail ring
```

### Current A2.10 invariant

```text
CostIR != EffectIR
TargetSpec != textual reference
LegalityGate != target kind
modal_selection_model != split_divided_damage_target_model
target_count != target_count_model
ANY_TARGET must not be exploded into CREATURE/PLAYER/PLANESWALKER/BATTLE in the diagnostic aggregation channel
range/open-ended split/divided damage target count semantics must not be flattened into scalar target_count
```

### Current split/divided damage state

Closed corpus:

```text
Electrolyze
Arc Lightning
Flames of the Firebrand
Pyrotechnics
Rolling Thunder
```

Canonical model now lives in:

```text
split_divided_damage_target_model.target_count_model
```

Current scalar projection policy:

```text
DO_NOT_PROJECT
```

Therefore:

```text
costTargetLegalityMin.target_count == null
```

for the current range/open-ended split/divided damage corpus.

This is correct. It prevents misleading scalar compression of "one or two targets", "one, two, or three targets", and "any number of targets".

## 9. Semantic overlay status map

The semantic overlay is broad and valuable, but it must be read as a bridge/evidence layer, not as a full rules engine.

Audit signal:

```text
63 semantic overlay test files/slices
multiple local bridge contracts
many local bridge min-v1 families
```

Implemented bridge families include:

```text
CAST_SPELL -> DEAL_DAMAGE
CAST_SPELL -> CREATE_TOKEN
CAST_SPELL -> DRAW_CARDS
CAST_SPELL -> ADD_COUNTERS
CAST_SPELL -> ADD_MANA
CAST_SPELL -> PT_CHANGE
DRAW_CARDS -> CREATE_TOKEN
DRAW_CARDS -> DEAL_DAMAGE
DRAW_CARDS -> LOSE_LIFE
DRAW_CARDS -> MILL
DRAW_CARDS -> ADD_COUNTERS
DRAW_CARDS -> ADD_MANA
CREATURE_DIES -> payoff actions
LEAVES_BATTLEFIELD -> DRAW_CARDS
LIFE_GAIN -> ADD_COUNTERS
LIFE_GAIN -> DRAW_CARDS
DEAL_DAMAGE -> LOSE_LIFE
DAMAGE_WITH_LIFELINK -> LIFE_GAIN
CREATURE_ATTACKS -> multiple local payoff/action families
SACRIFICE_AS_COST -> DRAW_CARDS
BLOOD_RESOURCE -> DISCARD/DRAW
TAPPED_STATUS local enablement
PRODUCE_MANA enablement closure
```

Senior reading:

```text
The overlay is already commercially visible and useful.
It should keep expanding through narrow bridge families.
It should not be treated as full semantic closure.
It should not be merged with structural scoring or A2.10 legality semantics.
```

## 10. Parser / totality / fallback review

The audit marker search found matches for:

```text
parseSemanticIrV0
normalizeOracleTextV1
lowerToAbilityIrMinV1
```

But the literal marker search reported no matches for:

```text
OpaqueText
parse_status
```

This does not prove that fallback behavior is absent, because the implementation may use different names. But it does show that the canonical concepts "opaque fallback" and "parse status" are not easily discoverable through those literal terms.

Recommendation:

```text
Open a focused docs/diagnosis microphase later:
MTGSYNERGY_SEMANTIC_TOTALITY_AND_FALLBACK_OBSERVABILITY_REVIEW_V1
```

Goal of that later review:

```text
- verify whether every Oracle input path has explicit partial/fallback representation
- document actual fallback names
- decide whether parse status should become a first-class observable field
- avoid silent semantic failure
```

This should be a review first, not an implementation.

## 11. Risk register

### Risk 1: map drift

The project has many closed microphases. Without a living map, future work may repeat old diagnosis or confuse contract-only state with productive runtime.

Mitigation:

```text
Maintain this v192 map as the canonical development guide until superseded.
```

### Risk 2: A2.10 becoming too dominant

A2.10 is strong and active, but it can absorb too much focus. Other semantic families still need review.

Mitigation:

```text
After the next A2.10 corpus plan, consider a stable-ring review or fallback observability review.
```

### Risk 3: local bridges mistaken for general semantics

Many overlay bridges are productive, but they are narrow.

Mitigation:

```text
Every new bridge must state:
- explicit wording gate
- positive corpus
- guardrails
- no-goals
- whether it is local-only or cross-card
```

### Risk 4: UI hiding semantic gaps

The UI is polished enough that users may assume the semantic layer is more complete than it is.

Mitigation:

```text
Keep "experimental" and explanation copy honest.
Do not let UI labels claim full rules precision.
```

### Risk 5: full rules engine temptation

Full priority, stack, replacement/prevention interactions, CR 613 layers, and target re-checks are expensive.

Mitigation:

```text
Do not open full engines without contract-first corpus and stable ring.
Prefer narrow min-v1 recognition and guardrails.
```

## 12. Recommended next microphases

### Option A — Continue current A2.10 chain

```text
A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_ADDITIONAL_CORPUS_PLAN_V1
```

Why:

```text
- Current split/divided damage model is productive.
- Target kinds are integrated.
- Target count model is productive.
- Scalar projection policy is protected.
- Next value is corpus expansion, but it should be plan-first.
```

### Option B — Stabilize after heavy A2.10 work

```text
A2.10_REAL_ORACLE_COST_TARGET_LEGALITY_STABLE_RING_REVIEW_V1
```

Why:

```text
- A2.10 now has many contracts and tests.
- A stable ring review would reduce future regression risk.
- It would identify the smallest permanent Anillo B for A2.10.
```

### Option C — Global semantic map follow-up

```text
MTGSYNERGY_SEMANTIC_TOTALITY_AND_FALLBACK_OBSERVABILITY_REVIEW_V1
```

Why:

```text
- Literal audit markers did not find OpaqueText or parse_status.
- Total deterministic fallback is a canonical architectural promise.
- This should be verified before broad corpus expansion accelerates.
```

### Option D — Commercial/product-facing readiness

```text
MTGSYNERGY_ANALYZER_SEMANTIC_CAPABILITY_PUBLIC_COPY_REVIEW_V1
```

Why:

```text
- The engine is technically deep.
- The UI must explain its power honestly without overclaiming.
- Public copy should distinguish structural, semantic overlay, and experimental status.
```

## 13. Proposed priority order

Recommended order:

```text
1. A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_ADDITIONAL_CORPUS_PLAN_V1
2. A2.10_REAL_ORACLE_COST_TARGET_LEGALITY_STABLE_RING_REVIEW_V1
3. MTGSYNERGY_SEMANTIC_TOTALITY_AND_FALLBACK_OBSERVABILITY_REVIEW_V1
4. Next productive extraction or bridge chosen from the stable-ring findings
```

Rationale:

```text
Finish the immediate chain cleanly.
Then compress guardrails into a stable ring.
Then verify totality/fallback observability.
Then resume expansion with lower risk.
```

## 14. Decision rules for future work

Use this checklist before any new semantic microphase:

```text
1. Is this recognition, extraction, lowering, bridge, UI, or scoring?
2. Which layer owns it?
3. Does it need a contract first?
4. Does it need a positive corpus?
5. Does it need guardrails?
6. Does it alter visible behavior?
7. Does it require Anillo C?
8. Is it local-only or cross-card?
9. Is it runtime productive or documentation-only?
10. What exact file set is allowed?
```

If these cannot be answered, the microphase is not ready.

## 15. Minimal stable ring candidate

A future stable ring should not run everything. It should protect the semantic spine.

Candidate Anillo B:

```text
sem_lower_to_ability_ir_min_v1.test.ts
sem_zone_identity_lki_min_v1.test.ts
sem_triggered_ability_classification_min_v1.test.ts
sem_replacement_prevention_min_v1.test.ts
sem_linked_ability_min_v1.test.ts
sem_continuous_layers_dependency_timestamp_min_v1.test.ts
sem_cost_target_legality_contract_freeze_v1.test.ts
sem_cost_target_legality_real_oracle_lowering_ring_v1.test.ts
sem_cost_target_legality_split_divided_damage_target_model_extraction_guardrail_ring_v1.test.ts
sem_cost_target_legality_split_divided_damage_target_count_model_extraction_guardrail_ring_v1.test.ts
sem_cost_target_legality_split_divided_damage_target_count_scalar_projection_policy_guardrail_ring_v1.test.ts
```

This should be reviewed before being institutionalized. The goal is protection, not maximal runtime cost.

## 16. Architecture boundaries to preserve

```text
Structural engine:
  roles, edges, SPS, MC-SSL, static enrichment.

Semantic parser/lowering:
  normalized Oracle text, parser frames, AbilityIR, semantic hints.

A2.10:
  cost, target, legality, modal target model, split/divided damage model.

Semantic overlay:
  produce/consume signals and local bridge evidence.

UI:
  explanation surface, not semantic compensation layer.

CSE:
  separate exploratory surface; must not contaminate analyzer scoring or semantic contracts.
```

## 17. Current project reading

The project is in an advanced middle stage.

It has moved beyond proof-of-concept because it has:

```text
- static full-card data strategy
- structural engine
- semantic overlay
- AbilityIR lowering
- many min-v1 rule-family recognizers
- A2.10 cost/target/legality infrastructure
- split/divided damage target model with guardrails
- disciplined documentary closure
```

It is not yet a complete MTG rules engine because it does not have:

```text
- full game-state simulator
- full casting/priority/stack execution
- full replacement/prevention interaction ordering
- full layers/dependency/timestamp resolution
- full target legality re-check at resolution
- full linked abilities CR 607 coverage
```

That is acceptable. The product value comes from deterministic semantic approximation with explicit guardrails, not from claiming total rules simulation.

## 18. Closure decision

This review establishes a renewed project map.

The most important conclusion is:

```text
MTGSynergy should continue as a layered deterministic semantic analyzer, not drift into a monolithic simulator.
```

The next immediate step should be either:

```text
A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_ADDITIONAL_CORPUS_PLAN_V1
```

or, if the project wants to consolidate before expanding:

```text
A2.10_REAL_ORACLE_COST_TARGET_LEGALITY_STABLE_RING_REVIEW_V1
```

## 19. Final markers

```text
MTGSYNERGY_SEMANTIC_ENGINE_STATUS_MAP_AND_PSEUDOCODE_REVIEW_V1_CREATED
MTGSYNERGY_SEMANTIC_ENGINE_STATUS_MAP_AND_PSEUDOCODE_REVIEW_V1_DOCS_ONLY
MTGSYNERGY_SEMANTIC_ENGINE_STATUS_MAP_AND_PSEUDOCODE_REVIEW_V1_NO_CODE_TOUCHED
MTGSYNERGY_SEMANTIC_ENGINE_STATUS_MAP_AND_PSEUDOCODE_REVIEW_V1_GUIDE_READY_FOR_REVIEW
```
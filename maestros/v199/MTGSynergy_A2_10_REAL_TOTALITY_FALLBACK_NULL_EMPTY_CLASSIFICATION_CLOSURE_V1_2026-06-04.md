# MTGSynergy — A2.10 Real Totality / Fallback Null-Empty Classification Closure V1

Date: 2026-06-04  
Phase: MTGSYNERGY_A2_10_REAL_TOTALITY_FALLBACK_NULL_EMPTY_CLASSIFICATION_V1  
Closure: MTGSYNERGY_A2_10_REAL_TOTALITY_FALLBACK_NULL_EMPTY_CLASSIFICATION_CLOSURE_V1  
Baseline: 9b05b6c  
Scope: docs-only interpretative closure. No runtime patch.

## Objective

Classify the semantic engine return sites previously identified as possible totality/fallback observability risks:

- return null
- return []
- UNKNOWN_* paths
- opaque/fallback-related exits
- possible non-observable Oracle input drops

The goal was to determine whether the current semantic architecture has a confirmed runtime semantic defect, or whether the residual issue is diagnostic observability only.

## Evidence reviewed

Read-only evidence files:

- review\MTGSYNERGY_A2_10_REAL_TOTALITY_FALLBACK_NULL_EMPTY_CLASSIFICATION_V1\precheck_null_empty_classification_output.txt
- review\MTGSYNERGY_A2_10_REAL_TOTALITY_FALLBACK_NULL_EMPTY_CLASSIFICATION_V1\null_empty_return_classification_output.txt
- review\MTGSYNERGY_A2_10_REAL_TOTALITY_FALLBACK_NULL_EMPTY_CLASSIFICATION_V1\risk_sites_focal_review_output.txt

No source, test, runtime, web, deployment, staging, merge, or push operation was performed during the read-only review.

## Precheck result

The precheck confirmed:

- branch: main
- HEAD/origin baseline: 9b05b6c
- clean tree
- critical semantic files present
- exact return-site inventory produced
- total return sites: 63

## Classification result

The read-only classification produced:

- SAFE_OPTIONAL_ABSENCE: 43
- EXPECTED_EMPTY_RESULT: 9
- CONTROLLED_FALLBACK_WITH_OBSERVABILITY: 2
- KNOWN_GAP_EXPLICITLY_DECLARED: 1
- POTENTIAL_SILENT_SEMANTIC_DROP: 5
- UNCLASSIFIED_REVIEW_REQUIRED: 3

Total classified: 63 return sites.

## Focal risk review result

The 8 advisory/risk sites were reviewed manually by source context and related call/test/contract evidence.

Final interpretation:

- confirmed runtime semantic defects: 0
- diagnostic observability gap sites: 5
- safe optional absence reclassified sites: 3

## Final classifications

### 1. lowerToAbilityIrMinV1 null exits

Files:

- src/engine/semantic/lowering/lower_to_ability_ir_min_v1.ts

Lines:

- 1064
- 1088
- 1092
- 1096

Final classification:

DIAGNOSTIC_OBSERVABILITY_GAP_NOT_CONFIRMED_RUNTIME_DEFECT

Interpretation:

These exits are conservative no-overclaim gates. They prevent AbilityIR production when template, parsed frame, runtime wording, or expected action does not align.

This is not a confirmed semantic runtime defect. However, the current path does not expose structured null reasons for corpus-wide diagnosis.

Recommended future work:

- design a lowering-null reason diagnostic layer;
- count template misses, frame mismatches, runtime wording mismatches and expected-action mismatches;
- do not change lowering semantics unless a later corpus-backed defect proves it necessary.

### 2. sem_overlay_compute missing card/oracle exit

File:

- src/engine/semantic/overlay/sem_overlay_compute.ts

Line:

- 177

Final classification:

DIAGNOSTIC_OBSERVABILITY_GAP_POSSIBLE_INPUT_RESOLUTION_DROP

Interpretation:

Missing lookup result or missing oracle_text is filtered out before overlay computation. This is probably correct for runtime safety, but unresolved inputs can disappear from the analyzer unless reported elsewhere.

Recommended future work:

- expose unresolved card names;
- expose missing oracle_text count;
- preserve deterministic behavior;
- avoid changing scoring or semantic edge generation during diagnostic work.

### 3. detectLegalityActionBindingMinV1 null exits

File:

- src/engine/semantic/parser/sem_parser_v1.ts

Lines:

- 272
- 277
- 284

Final classification:

SAFE_OPTIONAL_ABSENCE_AFTER_MANUAL_REVIEW

Interpretation:

These null exits mean no CAST_ONLY / ACTIVATE_ONLY action binding was present, or the frame kind is not ACTIVATED. They are narrow optional classifier exits, not fallback failures.

No patch recommended.

## Architectural conclusion

The phase does not prove a violation of deterministic totality + no-overclaim.

Current conclusion:

- The system has explicit fallback mechanisms.
- UNKNOWN_* sentinel paths are present.
- known_gap contracts are present.
- opaque_remainder is present in AbilityIR contract and anchor corpus.
- Most null/empty exits are optional absence or expected empty result.
- No confirmed runtime semantic defect was found in the 8 advisory sites.
- Residual risk is diagnostic observability, not semantic behavior.

## No-goals preserved

This closure does not authorize:

- CR607 full linked ability engine
- CR613 full continuous effects/layers engine
- replacement/prevention full interaction engine
- stack/priority simulation
- target re-check implementation
- parser/runtime rewrite
- overlay scoring change
- web/deploy change

## Recommended next phase

Recommended next phase:

MTGSYNERGY_A2_10_REAL_DIAGNOSTIC_OBSERVABILITY_PLAN_V1

Suggested scope:

- read-only / plan-first;
- design structured diagnostics for lowering null reasons;
- design analyzer/debug reporting for unresolved card names and missing oracle_text;
- avoid runtime semantic changes;
- avoid changing score/edge generation;
- prepare a future test-first implementation only if the plan is accepted.

## Closure result

MTGSYNERGY_A2_10_REAL_TOTALITY_FALLBACK_NULL_EMPTY_CLASSIFICATION_CLOSURE_V1_DOCS_ONLY_PASS

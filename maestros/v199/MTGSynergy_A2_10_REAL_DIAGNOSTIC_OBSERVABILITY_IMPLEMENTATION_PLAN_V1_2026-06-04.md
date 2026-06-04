# MTGSynergy — A2.10 Real Diagnostic Observability Implementation Plan V1

Date: 2026-06-04  
Phase: MTGSYNERGY_A2_10_REAL_DIAGNOSTIC_OBSERVABILITY_IMPLEMENTATION_PLAN_V1  
Closure: MTGSYNERGY_A2_10_REAL_DIAGNOSTIC_OBSERVABILITY_IMPLEMENTATION_PLAN_CLOSURE_V1  
Baseline: 7063878  
Scope: docs-only implementation plan. No runtime patch.

## Objective

Freeze the implementation plan for diagnostic observability before touching source code.

The plan converts the prior read-only architecture review into an exact future implementation surface for two diagnostic gaps:

1. lowering-null reason diagnostics;
2. input resolution diagnostics for unresolved names and missing Oracle text.

## Evidence

Primary evidence file:

- review\MTGSYNERGY_A2_10_REAL_DIAGNOSTIC_OBSERVABILITY_IMPLEMENTATION_PLAN_V1\diagnostic_observability_implementation_plan_output.txt

This closure is based on the read-only implementation plan result:

- RESULT=PASS_DIAGNOSTIC_OBSERVABILITY_IMPLEMENTATION_PLAN_READY_FOR_INTERPRETATION

## Architectural premise

The previous phases found no confirmed runtime semantic defect.

The residual issue is diagnostic observability:

- lowerToAbilityIrMinV1 returns null conservatively but does not expose a structured reason;
- coverage/reporting currently groups lookup-null and missing-oracle cases under a broad NO_ORACLE path;
- no score, edge, parser, AbilityIR or semantic production change is required.

## Surface A — Lowering null reason diagnostics

Future implementation file:

- src/engine/semantic/lowering/lower_to_ability_ir_diagnostics_min_v1.ts

Future exported API:

- explainLowerToAbilityIrMinV1(input): LoweringDiagnosticResultMinV1

Candidate types:

- LoweringNullReasonMinV1
- LoweringDiagnosticResultMinV1

Candidate reason enum:

- LOWERED
- NO_BASE_TEMPLATE
- NO_PARSED_FRAME
- FRAME_KIND_MISMATCH
- RUNTIME_WORDING_MISMATCH
- EXPECTED_ACTION_MISMATCH

Required contracts:

- known lowerable canonical card returns lowered=true and reason=LOWERED;
- unknown/non-template card returns NO_BASE_TEMPLATE;
- unparseable known template returns NO_PARSED_FRAME or equivalent explicit non-lowered reason;
- Howling Mine runtime wording mismatch returns RUNTIME_WORDING_MISMATCH;
- expected-action mismatch returns EXPECTED_ACTION_MISMATCH;
- helper does not alter lowerToAbilityIrMinV1 output.

Protected behavior:

- do not change lowerToAbilityIrMinV1 signature;
- do not change AbilityIrMin shape;
- do not change parser semantics;
- do not change lowering output.

## Surface B — Input resolution diagnostics

Future additive implementation file:

- src/engine/semantic/overlay/sem_coverage_report.ts

Candidate additive type:

- SemanticInputResolutionDiagnosticsMinV1

Candidate additive field:

- inputResolution

Candidate fields:

- input_unique_count
- resolved_unique_count
- missing_unique_count
- unresolved_names
- missing_oracle_names

Required contracts:

- existing coverage fields remain unchanged;
- unresolved_names includes lookup-null names;
- missing_oracle_names includes resolved records with oracle_text == null;
- missing_unique_count equals unresolved_names.length + missing_oracle_names.length;
- deterministic alphabetical ordering is preserved;
- computeSemanticOverlayFromDeckEntries is not changed;
- edge/scoring/metrics behavior is not changed.

## Minimal file surface

Future implementation candidates:

1. src/engine/semantic/lowering/lower_to_ability_ir_diagnostics_min_v1.ts
2. src/engine/semantic/overlay/sem_coverage_report.ts

Future test candidates:

1. src/engine/semantic/tests/sem_lower_to_ability_ir_diagnostics_min_v1.test.ts
2. src/engine/semantic/tests/sem_overlay_coverage_report_input_resolution_diagnostics_min_v1.test.ts

Optional later, not first implementation:

- src/engine/semantic/overlay/sem_debug_flow.ts
- src/engine/semantic/tests/sem_debug_flow_input_resolution_diagnostics_min_v1.test.ts

Protected first-implementation files:

- src/engine/semantic/overlay/sem_overlay_compute.ts
- parser files
- scoring files
- metrics files
- edges files
- web UI
- card index generation

## Test-first strategy

Step 1: add failing tests only.

Lowering diagnostic test cases:

- lowerable canonical anchor => LOWERED
- unknown/non-template card => NO_BASE_TEMPLATE
- known card with nonmatching runtime wording => RUNTIME_WORDING_MISMATCH
- known card with expected action mismatch => EXPECTED_ACTION_MISMATCH
- diagnostic helper does not mutate lowerToAbilityIrMinV1 output

Coverage diagnostic test cases:

- all cards resolved => empty unresolved_names and missing_oracle_names
- lookup null => unresolved_names contains card name
- card exists but oracle_text null => missing_oracle_names contains card name
- deterministic sorted output
- legacy coverage fields unchanged

Step 2: implement minimal code to satisfy tests.  
Step 3: run targeted tests.  
Step 4: run related regression anchors.  
Step 5: run semantic stable ring subset.  
Step 6: only then consider broader semantic suite.

## Future targeted commands

Targeted future tests:

npx vitest run src/engine/semantic/tests/sem_lower_to_ability_ir_diagnostics_min_v1.test.ts src/engine/semantic/tests/sem_overlay_coverage_report_input_resolution_diagnostics_min_v1.test.ts

Related regression anchors:

npx vitest run src/engine/semantic/tests/sem_lower_to_ability_ir_min_v1.test.ts src/engine/semantic/tests/sem_overlay_coverage_report.test.ts src/engine/semantic/tests/sem_overlay_compute_real_deck.test.ts src/engine/semantic/tests/sem_canonical_snapshot_ring_v1.test.ts

## No-goals

This plan does not authorize:

- runtime semantic change;
- parser rewrite;
- AbilityIR production change;
- lowerToAbilityIrMinV1 signature change;
- overlay score/edge change;
- snapshot updates not directly justified by diagnostic fields;
- CR607 full linked ability engine;
- CR613 full layers engine;
- replacement/prevention full interaction engine;
- stack/priority work;
- web/UI exposure.

## Next authorized phase

MTGSYNERGY_A2_10_REAL_DIAGNOSTIC_OBSERVABILITY_TEST_FIRST_IMPLEMENTATION_V1

Required opening mode:

- independent precheck first;
- test-first implementation only after precheck PASS;
- no direct runtime patch without failing tests;
- keep implementation limited to the minimal surface above.

## Closure result

MTGSYNERGY_A2_10_REAL_DIAGNOSTIC_OBSERVABILITY_IMPLEMENTATION_PLAN_CLOSURE_V1_DOCS_ONLY_PASS

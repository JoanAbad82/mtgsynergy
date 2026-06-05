#!/usr/bin/env node

const { spawnSync } = require("node:child_process");

const stableRingTests = [
  "src/engine/semantic/tests/sem_cost_target_legality_a210_stable_consolidation_ring_review_v1.test.ts",
  "src/engine/semantic/tests/sem_cost_target_legality_canonical_lowering_snapshot_ring_v1.test.ts",
  "src/engine/semantic/tests/sem_cost_target_legality_real_oracle_lowering_ring_v1.test.ts",
  "src/engine/semantic/tests/sem_cost_target_legality_activation_legality_gate_guardrail_ring_v1.test.ts",
  "src/engine/semantic/tests/sem_cost_target_legality_casting_legality_gate_guardrail_ring_v1.test.ts",
  "src/engine/semantic/tests/sem_cost_target_legality_modal_target_selection_model_guardrail_ring_v1.test.ts",
  "src/engine/semantic/tests/sem_cost_target_legality_modal_target_aggregation_guardrail_ring_v1.test.ts",
  "src/engine/semantic/tests/sem_cost_target_legality_modal_target_selection_model_extraction_guardrail_ring_v1.test.ts",
  "src/engine/semantic/tests/sem_cost_target_legality_multi_ability_selection_guardrail_ring_v1.test.ts",
  "src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_model_extraction_guardrail_ring_v1.test.ts",
  "src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_extraction_guardrail_ring_v1.test.ts",
  "src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_kind_integration_allowed_target_kinds_guardrail_ring_v1.test.ts",
  "src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_model_extraction_guardrail_ring_v1.test.ts",
  "src/engine/semantic/tests/sem_cost_target_legality_split_divided_damage_target_count_scalar_projection_policy_guardrail_ring_v1.test.ts",
  "src/engine/semantic/tests/sem_cost_target_legality_target_kind_canonicalization_guardrail_ring_v1.test.ts",
];

const diagnosticAnchorTests = [
  "src/engine/semantic/tests/sem_lower_to_ability_ir_diagnostics_min_v1.test.ts",
  "src/engine/semantic/tests/sem_overlay_coverage_report_input_resolution_diagnostics_min_v1.test.ts",
];

const allTests = [...stableRingTests, ...diagnosticAnchorTests];

console.log("=====================================================================");
console.log("A2.10 COST/TARGET/LEGALITY STABLE RING - SCRIPTED GATE V1");
console.log("=====================================================================");
console.log("");
console.log("Scope:");
console.log("- stable ring files:", stableRingTests.length);
console.log("- diagnostic anchor files:", diagnosticAnchorTests.length);
console.log("- total files:", allTests.length);
console.log("");
console.log("Boundary:");
console.log("- no runtime mutation");
console.log("- no contract mutation");
console.log("- no test mutation");
console.log("- target_count_model remains canonical for split/divided ranges");
console.log("- scalar target_count remains null where DO_NOT_PROJECT applies");
console.log("");

for (const testPath of allTests) {
  console.log(`GATE_FILE ${testPath}`);
}

console.log("");
console.log("Running: npx vitest run <explicit A2.10 gate files>");
console.log("");

const result = spawnSync("npx", ["vitest", "run", ...allTests], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  console.error("");
  console.error("A2_10_STABLE_RING_SCRIPTED_GATE_ERROR");
  console.error(result.error.message);
  process.exit(1);
}

const exitCode = typeof result.status === "number" ? result.status : 1;

console.log("");

if (exitCode === 0) {
  console.log("A2_10_STABLE_RING_SCRIPTED_GATE_PASS");
} else {
  console.error("A2_10_STABLE_RING_SCRIPTED_GATE_FAIL");
}

process.exit(exitCode);

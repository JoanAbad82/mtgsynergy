import type { Pipeline, PipelineStep } from "../domain/types";

const step = (role: PipelineStep["role"]): PipelineStep => ({
  role,
  min_count: 1,
});

export const PIPELINES: Pipeline[] = [
  {
    id: "P1_RAMP_ENGINE_PAYOFF",
    steps: [step("RAMP"), step("ENGINE"), step("PAYOFF")],
  },
  {
    id: "P2_DRAW_ENGINE_PAYOFF",
    steps: [step("DRAW"), step("ENGINE"), step("PAYOFF")],
  },
  {
    id: "P3_PROTECT_ENGINE_PAYOFF",
    steps: [step("PROTECTION"), step("ENGINE"), step("PAYOFF")],
  },
  {
    id: "P4_INTERACT_ENGINE_PAYOFF",
    steps: [step("REMOVAL"), step("ENGINE"), step("PAYOFF")],
  },
  {
    id: "P5_ENGINE_PAYOFF",
    steps: [step("ENGINE"), step("PAYOFF")],
  },
];

export const PIPELINE_BY_ID = Object.fromEntries(
  PIPELINES.map((p) => [p.id, p]),
) as Record<string, Pipeline>;

export const DEFAULT_PIPELINES_ACTIVE = [
  "P5_ENGINE_PAYOFF",
  "P1_RAMP_ENGINE_PAYOFF",
  "P2_DRAW_ENGINE_PAYOFF",
];

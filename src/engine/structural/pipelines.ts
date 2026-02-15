import type { DeckState, Role } from "../domain/types";
import { DEFAULT_PIPELINES_ACTIVE, PIPELINE_BY_ID } from "../catalog/pipelines";
import { ROLE_ORDER } from "./counts";

export type MissingRole = {
  role: Role;
  needed: number;
  have: number;
};

export type MissingRolesForPipeline = {
  pipeline_id: string;
  missing: MissingRole[];
};

export function missingRolesForPipelines(
  ds: DeckState,
  role_counts: Record<Role, number>,
): MissingRolesForPipeline[] {
  const active = ds.pipelines_active?.length
    ? ds.pipelines_active
    : DEFAULT_PIPELINES_ACTIVE;

  const result: MissingRolesForPipeline[] = [];

  for (const pipeline_id of active) {
    const pipeline = PIPELINE_BY_ID[pipeline_id];
    if (!pipeline) continue;

    const missing: MissingRole[] = [];
    for (const step of pipeline.steps) {
      const have = role_counts[step.role];
      if (have < step.min_count) {
        missing.push({
          role: step.role,
          needed: step.min_count,
          have,
        });
      }
    }

    result.push({
      pipeline_id,
      missing: missing.sort(
        (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role),
      ),
    });
  }

  return result;
}

import type { Role } from "../domain/types";
import { ROLE_ORDER } from "./counts";

export type Diagnostics = {
  bottlenecks: {
    roles: Role[];
    max_centrality: number;
  };
  low_redundancy: {
    roles: Role[];
    threshold: number;
    only_one_active_role: boolean;
  };
  sparse_graph: {
    flag: boolean;
    density: number;
    threshold: number;
  };
  isolated_roles: {
    roles: Role[];
  };
};

const LOW_REDUNDANCY_THRESHOLD = 4;
const SPARSE_GRAPH_THRESHOLD = 0.1;

export function computeDiagnostics(params: {
  role_counts: Record<Role, number>;
  centrality_score: Record<Role, number>;
  in_degree: Record<Role, number>;
  out_degree: Record<Role, number>;
  density: number;
  nodes_active: number;
}): Diagnostics {
  const {
    role_counts,
    centrality_score,
    in_degree,
    out_degree,
    density,
    nodes_active,
  } = params;

  const maxCentrality = Math.max(
    ...ROLE_ORDER.map((role) => centrality_score[role]),
  );
  const bottlenecks = ROLE_ORDER.filter(
    (role) => centrality_score[role] === maxCentrality && role_counts[role] > 0,
  );

  const critical: Role[] = ["ENGINE", "PAYOFF"];
  const lowRedundancyRoles = critical.filter(
    (role) => role_counts[role] <= LOW_REDUNDANCY_THRESHOLD,
  );

  const only_one_active_role = nodes_active <= 1;
  if (only_one_active_role) {
    for (const role of critical) {
      if (!lowRedundancyRoles.includes(role)) {
        lowRedundancyRoles.push(role);
      }
    }
  }

  const isolated = ROLE_ORDER.filter(
    (role) =>
      role_counts[role] > 0 &&
      in_degree[role] === 0 &&
      out_degree[role] === 0,
  );

  return {
    bottlenecks: {
      roles: bottlenecks,
      max_centrality: maxCentrality,
    },
    low_redundancy: {
      roles: lowRedundancyRoles,
      threshold: LOW_REDUNDANCY_THRESHOLD,
      only_one_active_role,
    },
    sparse_graph: {
      flag: density < SPARSE_GRAPH_THRESHOLD,
      density,
      threshold: SPARSE_GRAPH_THRESHOLD,
    },
    isolated_roles: {
      roles: isolated,
    },
  };
}

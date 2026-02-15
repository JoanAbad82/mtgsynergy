export type Role =
  | "ENGINE"
  | "PAYOFF"
  | "RAMP"
  | "DRAW"
  | "REMOVAL"
  | "PROTECTION"
  | "LAND"
  | "UTILITY";

export type PipelineStep = {
  role: Role;
  min_count: number;
};

export type CardRef = {
  name: string;
  name_norm: string;
};

export type CardEntry = {
  name: string;
  name_norm: string;
  count: number;
  role_primary: Role;
};

export type Deck = {
  entries: CardEntry[];
};

export type RoleEdge = {
  from: Role;
  to: Role;
  weight?: number;
};

export type Pipeline = {
  id: string;
  steps: PipelineStep[];
};

export type SimSettings = {
  mulligan_model: "none";
  turn_T: number;
  iterations: number;
  seed?: number;
  assume_on_play?: boolean;
};

export type StructuralSummary = {
  nodes_total: number;
  nodes_active: number;
  role_counts: Record<Role, number>;
  role_share: Record<Role, number>;
  edges_total: number;
  density: number;
  in_degree: Record<Role, number>;
  out_degree: Record<Role, number>;
  centrality_score: Record<Role, number>;
  sources: Role[];
  sinks: Role[];
  cycles_present: boolean;
  components_weak: { count: number; components: Role[][] };
  missing_roles_for_pipelines: Array<{
    pipeline_id: string;
    missing: Array<{ role: Role; needed: number; have: number }>;
  }>;
  diagnostics: {
    bottlenecks: { roles: Role[]; max_centrality: number };
    low_redundancy: {
      roles: Role[];
      threshold: number;
      only_one_active_role: boolean;
    };
    sparse_graph: { flag: boolean; density: number; threshold: number };
    isolated_roles: { roles: Role[] };
  };
};

export type DeckState = {
  deck: Deck;
  edges?: RoleEdge[];
  pipelines_active?: string[];
  sim?: SimSettings;
};

export type IssueCode =
  | "DECK_TOO_SMALL"
  | "COUNT_INVALID"
  | "INVALID_ROLE"
  | "DUPLICATE_ENTRY"
  | "SELF_EDGE"
  | "PIPELINE_NOT_FOUND"
  | "INVALID_TURN_T"
  | "INVALID_ITERATIONS"
  | "INVALID_MULLIGAN";

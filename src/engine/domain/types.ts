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
  roles: Role[];
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
  turn_t?: number;
  iterations?: number;
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

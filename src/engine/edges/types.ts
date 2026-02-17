export type EdgeKind =
  | "burn_supports_threat"
  | "anthem_supports_tokens"
  | "spells_support_prowess";

export type Edge = {
  from: string;
  to: string;
  kind: EdgeKind;
  weight: number;
  score: number;
};

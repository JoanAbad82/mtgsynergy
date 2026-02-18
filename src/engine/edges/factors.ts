export const EDGE_SCORE_MODEL_VERSION = "v1" as const;

export const KIND_FACTOR_V1 = {
  burn_supports_threat: 1.2,
  spells_support_prowess: 1.1,
  anthem_supports_tokens: 1.15,
} as const;

export const ROLE_FACTOR_V1 = {
  "REMOVAL->PAYOFF": 1.5,
  "ENGINE->PAYOFF": 1.4,
  "ENGINE->ENGINE": 1.2,
} as const;

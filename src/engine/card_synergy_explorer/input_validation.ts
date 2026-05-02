import type { CardSynergyDegradation, CardSynergyExplorerInput } from "./types";

export const CARD_SYNERGY_EXPLORER_INPUT_VALIDATION_VERSION =
  "card-synergy-explorer-input-validation-v1" as const;

export interface CardSynergyInputValidationMeta {
  validationVersion: typeof CARD_SYNERGY_EXPLORER_INPUT_VALIDATION_VERSION;
  deterministic: true;
  mutatesInput: false;
  performsLookup: false;
  performsRanking: false;
}

export const CARD_SYNERGY_INPUT_VALIDATION_META: CardSynergyInputValidationMeta = {
  validationVersion: CARD_SYNERGY_EXPLORER_INPUT_VALIDATION_VERSION,
  deterministic: true,
  mutatesInput: false,
  performsLookup: false,
  performsRanking: false,
};

export interface CardSynergyInputValidationResult {
  ok: boolean;
  degradations: readonly CardSynergyDegradation[];
  meta: CardSynergyInputValidationMeta;
}

export function createInvalidInputDegradation(message: string): CardSynergyDegradation {
  return {
    reason: "invalid_input",
    message,
    recoverable: true,
  };
}

export function createUnsupportedSeedCountDegradation(count: number): CardSynergyDegradation {
  return {
    reason: "unsupported_seed_count",
    message: `Card Synergy Explorer V1 requires 1 or 2 seed cards; received ${count}.`,
    recoverable: true,
  };
}

export function validateCardSynergyExplorerInput(
  input: CardSynergyExplorerInput,
): CardSynergyInputValidationResult {
  const degradations: CardSynergyDegradation[] = [];
  const runtimeCards = (input as { cards?: unknown }).cards;
  const cards = Array.isArray(runtimeCards) ? runtimeCards : [];
  const count = cards.length;

  if (count !== 1 && count !== 2) {
    degradations.push(createUnsupportedSeedCountDegradation(count));
  }

  cards.forEach((seed, index) => {
    const name = (seed as { name?: unknown } | null | undefined)?.name;
    if (typeof name !== "string" || name.trim().length === 0) {
      degradations.push(
        createInvalidInputDegradation(
          `Seed card at index ${index} must provide a non-empty name string.`,
        ),
      );
    }
  });

  return {
    ok: degradations.length === 0,
    degradations,
    meta: CARD_SYNERGY_INPUT_VALIDATION_META,
  };
}

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { CardSynergyExplorerInput } from "../card_synergy_explorer";
import {
  CARD_SYNERGY_INPUT_VALIDATION_META,
  createInvalidInputDegradation,
  createUnsupportedSeedCountDegradation,
  validateCardSynergyExplorerInput,
} from "../card_synergy_explorer";

describe("card synergy explorer input validation v1", () => {
  test("input validation meta is fixed", () => {
    expect(CARD_SYNERGY_INPUT_VALIDATION_META.validationVersion).toBe(
      "card-synergy-explorer-input-validation-v1",
    );
    expect(CARD_SYNERGY_INPUT_VALIDATION_META.deterministic).toBe(true);
    expect(CARD_SYNERGY_INPUT_VALIDATION_META.mutatesInput).toBe(false);
    expect(CARD_SYNERGY_INPUT_VALIDATION_META.performsLookup).toBe(false);
    expect(CARD_SYNERGY_INPUT_VALIDATION_META.performsRanking).toBe(false);
  });

  test("validateCardSynergyExplorerInput accepts one valid seed", () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Brainstorm" }],
    };

    const result = validateCardSynergyExplorerInput(input);

    expect(result.ok).toBe(true);
    expect(result.degradations).toEqual([]);
  });

  test("validateCardSynergyExplorerInput accepts two valid seeds", () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Lightning Bolt" }, { name: "Snapcaster Mage" }],
    };

    const result = validateCardSynergyExplorerInput(input);

    expect(result.ok).toBe(true);
    expect(result.degradations).toEqual([]);
  });

  test("validateCardSynergyExplorerInput rejects zero seeds with unsupported_seed_count", () => {
    const input = { cards: [] } as unknown as CardSynergyExplorerInput;
    const result = validateCardSynergyExplorerInput(input);

    expect(result.ok).toBe(false);
    expect(result.degradations.some((d) => d.reason === "unsupported_seed_count")).toBe(true);
  });

  test("validateCardSynergyExplorerInput rejects three seeds with unsupported_seed_count", () => {
    const input = {
      cards: [{ name: "A" }, { name: "B" }, { name: "C" }],
    } as unknown as CardSynergyExplorerInput;
    const result = validateCardSynergyExplorerInput(input);

    expect(result.ok).toBe(false);
    expect(result.degradations.some((d) => d.reason === "unsupported_seed_count")).toBe(true);
  });

  test("validateCardSynergyExplorerInput rejects empty or whitespace names", () => {
    const emptyName = {
      cards: [{ name: "" }],
    } as unknown as CardSynergyExplorerInput;
    const whitespaceName = {
      cards: [{ name: "   " }],
    } as unknown as CardSynergyExplorerInput;

    const emptyResult = validateCardSynergyExplorerInput(emptyName);
    const whitespaceResult = validateCardSynergyExplorerInput(whitespaceName);

    expect(emptyResult.ok).toBe(false);
    expect(emptyResult.degradations.some((d) => d.reason === "invalid_input")).toBe(true);
    expect(whitespaceResult.ok).toBe(false);
    expect(whitespaceResult.degradations.some((d) => d.reason === "invalid_input")).toBe(true);
  });

  test("validateCardSynergyExplorerInput does not mutate input and does not trim original names", () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "  Opt  " }],
    };
    const snapshot = JSON.parse(JSON.stringify(input));

    Object.freeze(input.cards[0]);
    Object.freeze(input.cards);
    Object.freeze(input);

    const result = validateCardSynergyExplorerInput(input);

    expect(result.ok).toBe(true);
    expect(input).toEqual(snapshot);
    expect(input.cards[0].name).toBe("  Opt  ");
  });

  test("createInvalidInputDegradation sets invalid_input and recoverable true", () => {
    const degradation = createInvalidInputDegradation("Invalid seed name.");

    expect(degradation.reason).toBe("invalid_input");
    expect(degradation.recoverable).toBe(true);
  });

  test("createUnsupportedSeedCountDegradation sets unsupported_seed_count and recoverable true", () => {
    const degradation = createUnsupportedSeedCountDegradation(0);

    expect(degradation.reason).toBe("unsupported_seed_count");
    expect(degradation.recoverable).toBe(true);
  });

  test("input_validation file does not include forbidden runtime hooks or imports", () => {
    const source = readFileSync(
      new URL("../card_synergy_explorer/input_validation.ts", import.meta.url),
      "utf-8",
    );

    expect(source.includes("fetch(")).toBe(false);
    expect(source.includes("Date.now")).toBe(false);
    expect(source.includes("Math.random")).toBe(false);
    expect(source.includes("buildSemanticEdges")).toBe(false);
    expect(source.includes("computeStructuralPowerScore")).toBe(false);
    expect(source.includes("montecarlo")).toBe(false);
    expect(source.includes("generateEdges")).toBe(false);
    expect(source.includes("../analyzer")).toBe(false);
    expect(source.includes("../parser")).toBe(false);
    expect(source.includes("../semantic")).toBe(false);
    expect(source.includes("../edges")).toBe(false);
    expect(source.includes("../structural")).toBe(false);
    expect(source.includes("../cards")).toBe(false);
  });
});

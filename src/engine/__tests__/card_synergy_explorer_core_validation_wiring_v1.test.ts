import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { CardSynergyExplorerInput } from "../card_synergy_explorer";
import { runCardSynergyExplorerCoreSkeleton } from "../card_synergy_explorer";

describe("card synergy explorer core validation wiring v1", () => {
  test("valid 1-card input returns semantic_ir_unavailable only", () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Brainstorm" }],
    };

    const result = runCardSynergyExplorerCoreSkeleton(input);

    expect(result.candidates).toEqual([]);
    expect(result.degradations).toHaveLength(1);
    expect(result.degradations[0].reason).toBe("semantic_ir_unavailable");
  });

  test("valid 2-card input returns semantic_ir_unavailable only", () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Lightning Bolt" }, { name: "Snapcaster Mage" }],
    };

    const result = runCardSynergyExplorerCoreSkeleton(input);

    expect(result.candidates).toEqual([]);
    expect(result.degradations).toHaveLength(1);
    expect(result.degradations[0].reason).toBe("semantic_ir_unavailable");
  });

  test("invalid 0-card input returns unsupported_seed_count and no semantic_ir_unavailable", () => {
    const input = { cards: [] } as unknown as CardSynergyExplorerInput;

    const result = runCardSynergyExplorerCoreSkeleton(input);
    const reasons = result.degradations.map((d) => d.reason);

    expect(result.candidates).toEqual([]);
    expect(reasons.includes("unsupported_seed_count")).toBe(true);
    expect(reasons.includes("semantic_ir_unavailable")).toBe(false);
  });

  test("invalid 3-card input returns unsupported_seed_count and no semantic_ir_unavailable", () => {
    const input = {
      cards: [{ name: "A" }, { name: "B" }, { name: "C" }],
    } as unknown as CardSynergyExplorerInput;

    const result = runCardSynergyExplorerCoreSkeleton(input);
    const reasons = result.degradations.map((d) => d.reason);

    expect(reasons.includes("unsupported_seed_count")).toBe(true);
    expect(reasons.includes("semantic_ir_unavailable")).toBe(false);
  });

  test("invalid empty or whitespace name returns invalid_input and no semantic_ir_unavailable", () => {
    const emptyName = { cards: [{ name: "" }] } as unknown as CardSynergyExplorerInput;
    const whitespaceName = { cards: [{ name: "   " }] } as unknown as CardSynergyExplorerInput;

    const emptyResult = runCardSynergyExplorerCoreSkeleton(emptyName);
    const whitespaceResult = runCardSynergyExplorerCoreSkeleton(whitespaceName);

    expect(emptyResult.degradations.map((d) => d.reason).includes("invalid_input")).toBe(true);
    expect(emptyResult.degradations.map((d) => d.reason).includes("semantic_ir_unavailable")).toBe(
      false,
    );
    expect(whitespaceResult.degradations.map((d) => d.reason).includes("invalid_input")).toBe(
      true,
    );
    expect(
      whitespaceResult.degradations.map((d) => d.reason).includes("semantic_ir_unavailable"),
    ).toBe(false);
  });

  test("core remains deterministic for same invalid and valid input", () => {
    const validInput: CardSynergyExplorerInput = {
      cards: [{ name: "Opt" }],
    };
    const invalidInput = { cards: [] } as unknown as CardSynergyExplorerInput;

    const validFirst = runCardSynergyExplorerCoreSkeleton(validInput);
    const validSecond = runCardSynergyExplorerCoreSkeleton(validInput);
    const invalidFirst = runCardSynergyExplorerCoreSkeleton(invalidInput);
    const invalidSecond = runCardSynergyExplorerCoreSkeleton(invalidInput);

    expect(validFirst).toEqual(validSecond);
    expect(invalidFirst).toEqual(invalidSecond);
  });

  test("core does not mutate input and does not trim original seed name", () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "  Opt  " }],
    };
    const snapshot = JSON.parse(JSON.stringify(input));

    Object.freeze(input.cards[0]);
    Object.freeze(input.cards);
    Object.freeze(input);

    const result = runCardSynergyExplorerCoreSkeleton(input);

    expect(input).toEqual(snapshot);
    expect(input.cards[0].name).toBe("  Opt  ");
    expect(result.input).toBe(input);
  });

  test("core file does not include forbidden runtime hooks or imports", () => {
    const source = readFileSync(new URL("../card_synergy_explorer/core.ts", import.meta.url), "utf-8");

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

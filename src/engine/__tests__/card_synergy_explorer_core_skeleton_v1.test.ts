import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { CardSynergyExplorerInput } from "../card_synergy_explorer";
import {
  CARD_SYNERGY_EXPLORER_CORE_SKELETON_META,
  createSemanticIrUnavailableDegradation,
  runCardSynergyExplorerCoreSkeleton,
} from "../card_synergy_explorer";

describe("card synergy explorer core skeleton v1", () => {
  test("core skeleton meta is fixed", () => {
    expect(CARD_SYNERGY_EXPLORER_CORE_SKELETON_META.coreVersion).toBe(
      "card-synergy-explorer-core-skeleton-v1",
    );
    expect(CARD_SYNERGY_EXPLORER_CORE_SKELETON_META.schemaVersion).toBe(
      "card-synergy-explorer-contract-v1",
    );
    expect(CARD_SYNERGY_EXPLORER_CORE_SKELETON_META.deterministic).toBe(true);
    expect(CARD_SYNERGY_EXPLORER_CORE_SKELETON_META.usesDeckSps).toBe(false);
    expect(CARD_SYNERGY_EXPLORER_CORE_SKELETON_META.usesMonteCarlo).toBe(false);
    expect(CARD_SYNERGY_EXPLORER_CORE_SKELETON_META.performsRanking).toBe(false);
    expect(CARD_SYNERGY_EXPLORER_CORE_SKELETON_META.evaluatesSemanticBridges).toBe(false);
  });

  test("runCardSynergyExplorerCoreSkeleton returns empty candidates and explicit degradation", () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Brainstorm" }],
    };

    const result = runCardSynergyExplorerCoreSkeleton(input);

    expect(result.candidates).toEqual([]);
    expect(result.degradations).toHaveLength(1);
    expect(result.degradations[0].reason).toBe("semantic_ir_unavailable");
    expect(result.degradations[0].recoverable).toBe(true);
    expect(result.meta.schemaVersion).toBe("card-synergy-explorer-contract-v1");
    expect(result.meta.deterministic).toBe(true);
    expect(result.meta.usesDeckSps).toBe(false);
    expect(result.meta.usesMonteCarlo).toBe(false);
  });

  test("runCardSynergyExplorerCoreSkeleton is deterministic", () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Lightning Bolt" }, { name: "Snapcaster Mage" }],
      options: { maxCandidates: 12, includeDegraded: true, explanationLevel: "summary" },
    };

    const first = runCardSynergyExplorerCoreSkeleton(input);
    const second = runCardSynergyExplorerCoreSkeleton(input);

    expect(first).toEqual(second);
  });

  test("runCardSynergyExplorerCoreSkeleton does not mutate input", () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Counterspell" }],
      options: { maxCandidates: 5, includeDegraded: true, explanationLevel: "detailed" },
    };
    const snapshot = JSON.parse(JSON.stringify(input));

    Object.freeze(input.cards[0]);
    Object.freeze(input.cards);
    if (input.options) {
      Object.freeze(input.options);
    }
    Object.freeze(input);

    const result = runCardSynergyExplorerCoreSkeleton(input);

    expect(input).toEqual(snapshot);
    expect(result.input).toBe(input);
  });

  test("createSemanticIrUnavailableDegradation returns stable non-empty message", () => {
    const first = createSemanticIrUnavailableDegradation();
    const second = createSemanticIrUnavailableDegradation();

    expect(first.reason).toBe("semantic_ir_unavailable");
    expect(first.recoverable).toBe(true);
    expect(first.message.length).toBeGreaterThan(0);
    expect(first.message).toBe(second.message);
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

import { readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";
import type {
  CardSynergyCandidateCard,
  CardSynergyDataAdapter,
  CardSynergyDegradedCardRecord,
  CardSynergyExplorerInput,
} from "../card_synergy_explorer";
import {
  CARD_SYNERGY_SEED_RESOLUTION_META,
  isCardSynergyDegradedCardRecord,
  resolveCardSynergySeeds,
} from "../card_synergy_explorer";

describe("card synergy explorer seed resolution contract v1", () => {
  test("seed resolution meta is fixed", () => {
    expect(CARD_SYNERGY_SEED_RESOLUTION_META.resolutionVersion).toBe(
      "card-synergy-explorer-seed-resolution-contract-v1",
    );
    expect(CARD_SYNERGY_SEED_RESOLUTION_META.deterministic).toBe(true);
    expect(CARD_SYNERGY_SEED_RESOLUTION_META.usesInjectedAdapter).toBe(true);
    expect(CARD_SYNERGY_SEED_RESOLUTION_META.directRuntimeFetches).toBe(false);
    expect(CARD_SYNERGY_SEED_RESOLUTION_META.performsCandidateSearch).toBe(false);
    expect(CARD_SYNERGY_SEED_RESOLUTION_META.performsRanking).toBe(false);
    expect(CARD_SYNERGY_SEED_RESOLUTION_META.evaluatesSemanticBridges).toBe(false);
  });

  test("resolveCardSynergySeeds resolves one valid seed through adapter only", async () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Brainstorm" }],
    };
    const adapter: CardSynergyDataAdapter = {
      async resolveSeedCard(seed) {
        return { name: seed.name };
      },
      async findCandidatePool() {
        return [{ name: "Unused" }];
      },
    };
    const resolveSpy = vi.spyOn(adapter, "resolveSeedCard");
    const poolSpy = vi.spyOn(adapter, "findCandidatePool");

    const result = await resolveCardSynergySeeds(input, adapter);

    expect(resolveSpy).toHaveBeenCalledTimes(1);
    expect(poolSpy).toHaveBeenCalledTimes(0);
    expect(result.resolvedSeeds).toHaveLength(1);
    expect(result.resolvedSeeds[0].source).toBe("adapter");
    expect(result.degradations).toEqual([]);
  });

  test("resolveCardSynergySeeds resolves two valid seeds preserving order", async () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "A" }, { name: "B" }],
    };
    const adapter: CardSynergyDataAdapter = {
      async resolveSeedCard(seed) {
        return { name: seed.name };
      },
      async findCandidatePool() {
        return [];
      },
    };
    const resolveSpy = vi.spyOn(adapter, "resolveSeedCard");
    const poolSpy = vi.spyOn(adapter, "findCandidatePool");

    const result = await resolveCardSynergySeeds(input, adapter);

    expect(resolveSpy).toHaveBeenCalledTimes(2);
    expect(resolveSpy).toHaveBeenNthCalledWith(1, input.cards[0]);
    expect(resolveSpy).toHaveBeenNthCalledWith(2, input.cards[1]);
    expect(poolSpy).toHaveBeenCalledTimes(0);
    expect(result.resolvedSeeds.map((item) => item.seed.name)).toEqual(["A", "B"]);
  });

  test("resolveCardSynergySeeds surfaces adapter degradations for degraded seeds", async () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Unknown Card" }],
    };
    const degraded: CardSynergyDegradedCardRecord = {
      name: "Unknown Card",
      degradation: {
        reason: "missing_card_record",
        message: "No record",
        recoverable: true,
      },
    };
    const adapter: CardSynergyDataAdapter = {
      async resolveSeedCard() {
        return degraded;
      },
      async findCandidatePool() {
        return [];
      },
    };

    const result = await resolveCardSynergySeeds(input, adapter);

    expect(result.resolvedSeeds).toEqual([]);
    expect(result.degradations.map((d) => d.reason)).toContain("missing_card_record");
  });

  test("resolveCardSynergySeeds with invalid zero-card input skips adapter calls", async () => {
    const input = { cards: [] } as unknown as CardSynergyExplorerInput;
    const adapter: CardSynergyDataAdapter = {
      async resolveSeedCard() {
        return { name: "should-not-happen" };
      },
      async findCandidatePool() {
        return [{ name: "should-not-happen" }];
      },
    };
    const resolveSpy = vi.spyOn(adapter, "resolveSeedCard");
    const poolSpy = vi.spyOn(adapter, "findCandidatePool");

    const result = await resolveCardSynergySeeds(input, adapter);

    expect(resolveSpy).toHaveBeenCalledTimes(0);
    expect(poolSpy).toHaveBeenCalledTimes(0);
    expect(result.resolvedSeeds).toEqual([]);
    expect(result.degradations.map((d) => d.reason)).toContain("unsupported_seed_count");
  });

  test("resolveCardSynergySeeds with invalid empty seed name skips adapter calls", async () => {
    const input = { cards: [{ name: "   " }] } as unknown as CardSynergyExplorerInput;
    const adapter: CardSynergyDataAdapter = {
      async resolveSeedCard() {
        return { name: "should-not-happen" };
      },
      async findCandidatePool() {
        return [];
      },
    };
    const resolveSpy = vi.spyOn(adapter, "resolveSeedCard");

    const result = await resolveCardSynergySeeds(input, adapter);

    expect(resolveSpy).toHaveBeenCalledTimes(0);
    expect(result.degradations.map((d) => d.reason)).toContain("invalid_input");
  });

  test("resolveCardSynergySeeds does not mutate input and does not trim names", async () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "  Opt  " }],
    };
    const snapshot = JSON.parse(JSON.stringify(input));
    const adapter: CardSynergyDataAdapter = {
      async resolveSeedCard(seed) {
        return { name: seed.name };
      },
      async findCandidatePool() {
        return [];
      },
    };

    Object.freeze(input.cards[0]);
    Object.freeze(input.cards);
    Object.freeze(input);

    await resolveCardSynergySeeds(input, adapter);

    expect(input).toEqual(snapshot);
    expect(input.cards[0].name).toBe("  Opt  ");
  });

  test("isCardSynergyDegradedCardRecord distinguishes degraded records from candidate cards", () => {
    const degraded: CardSynergyDegradedCardRecord = {
      name: "Unknown Card",
      degradation: {
        reason: "missing_card_record",
        message: "No record",
        recoverable: true,
      },
    };
    const candidate: CardSynergyCandidateCard = {
      name: "Brainstorm",
      oracleText: "Draw three cards, then put two cards from your hand on top of your library in any order.",
    };

    expect(isCardSynergyDegradedCardRecord(degraded)).toBe(true);
    expect(isCardSynergyDegradedCardRecord(candidate)).toBe(false);
  });

  test("seed_resolution file does not include forbidden runtime hooks or imports", () => {
    const source = readFileSync(
      new URL("../card_synergy_explorer/seed_resolution.ts", import.meta.url),
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

import { readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";
import type {
  CardSynergyDataAdapter,
  CardSynergyExplorerInput,
} from "../card_synergy_explorer";
import {
  CARD_SYNERGY_CANDIDATE_POOL_META,
  resolveCardSynergyCandidatePool,
} from "../card_synergy_explorer";

describe("card synergy explorer candidate pool contract v1", () => {
  test("meta/version is stable", () => {
    expect(CARD_SYNERGY_CANDIDATE_POOL_META.version).toBe(
      "card-synergy-explorer-candidate-pool-contract-v1",
    );
    expect(CARD_SYNERGY_CANDIDATE_POOL_META.deterministic).toBe(true);
    expect(CARD_SYNERGY_CANDIDATE_POOL_META.usesInjectedAdapter).toBe(true);
    expect(CARD_SYNERGY_CANDIDATE_POOL_META.directRuntimeIo).toBe(false);
    expect(CARD_SYNERGY_CANDIDATE_POOL_META.performsCandidateSearch).toBe(true);
    expect(CARD_SYNERGY_CANDIDATE_POOL_META.performsRanking).toBe(false);
  });

  test("invalid input returns validation degradations, empty pool, and adapter methods are not called", async () => {
    const input = { cards: [] } as unknown as CardSynergyExplorerInput;
    const adapter: CardSynergyDataAdapter = {
      async resolveSeedCard() {
        return { name: "should-not-run" };
      },
      async findCandidatePool() {
        return [{ name: "should-not-run" }];
      },
    };
    const resolveSpy = vi.spyOn(adapter, "resolveSeedCard");
    const poolSpy = vi.spyOn(adapter, "findCandidatePool");

    const result = await resolveCardSynergyCandidatePool(input, adapter);

    expect(result.candidatePool).toEqual([]);
    expect(result.degradations.map((d) => d.reason)).toContain("unsupported_seed_count");
    expect(resolveSpy).toHaveBeenCalledTimes(0);
    expect(poolSpy).toHaveBeenCalledTimes(0);
  });

  test("valid input with degraded seed returns degradation, empty pool, and does not call findCandidatePool", async () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Unknown Card" }],
    };
    const adapter: CardSynergyDataAdapter = {
      async resolveSeedCard() {
        return {
          name: "Unknown Card",
          degradation: {
            reason: "missing_card_record",
            message: "No cards_index record is available.",
            recoverable: true,
          },
        };
      },
      async findCandidatePool() {
        return [{ name: "should-not-run" }];
      },
    };
    const resolveSpy = vi.spyOn(adapter, "resolveSeedCard");
    const poolSpy = vi.spyOn(adapter, "findCandidatePool");

    const result = await resolveCardSynergyCandidatePool(input, adapter);

    expect(resolveSpy).toHaveBeenCalledTimes(1);
    expect(result.candidatePool).toEqual([]);
    expect(result.degradations.map((d) => d.reason)).toContain("missing_card_record");
    expect(poolSpy).toHaveBeenCalledTimes(0);
  });

  test("valid resolved seed calls findCandidatePool once and returns adapter pool with no degradations", async () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Brainstorm" }],
    };
    const returnedPool = [{ name: "Ponder" }, { name: "Preordain" }];
    const adapter: CardSynergyDataAdapter = {
      async resolveSeedCard(seed) {
        return { name: seed.name };
      },
      async findCandidatePool() {
        return returnedPool;
      },
    };
    const poolSpy = vi.spyOn(adapter, "findCandidatePool");

    const result = await resolveCardSynergyCandidatePool(input, adapter);

    expect(poolSpy).toHaveBeenCalledTimes(1);
    expect(result.candidatePool).toEqual(returnedPool);
    expect(result.degradations).toEqual([]);
  });

  test("two valid seeds resolve in order and candidate pool is queried after both resolutions", async () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "A" }, { name: "B" }],
    };
    const events: string[] = [];
    const adapter: CardSynergyDataAdapter = {
      async resolveSeedCard(seed) {
        events.push(`resolve:${seed.name}`);
        return { name: seed.name };
      },
      async findCandidatePool() {
        events.push("pool");
        return [{ name: "C" }];
      },
    };
    const resolveSpy = vi.spyOn(adapter, "resolveSeedCard");
    const poolSpy = vi.spyOn(adapter, "findCandidatePool");

    const result = await resolveCardSynergyCandidatePool(input, adapter);

    expect(resolveSpy).toHaveBeenCalledTimes(2);
    expect(resolveSpy).toHaveBeenNthCalledWith(1, input.cards[0]);
    expect(resolveSpy).toHaveBeenNthCalledWith(2, input.cards[1]);
    expect(poolSpy).toHaveBeenCalledTimes(1);
    expect(events).toEqual(["resolve:A", "resolve:B", "pool"]);
    expect(result.degradations).toEqual([]);
  });

  test("empty pool from adapter is returned without degradations", async () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Opt" }],
    };
    const adapter: CardSynergyDataAdapter = {
      async resolveSeedCard(seed) {
        return { name: seed.name };
      },
      async findCandidatePool() {
        return [];
      },
    };

    const result = await resolveCardSynergyCandidatePool(input, adapter);

    expect(result.candidatePool).toEqual([]);
    expect(result.degradations).toEqual([]);
  });

  test("function does not mutate input or trim original names", async () => {
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

    await resolveCardSynergyCandidatePool(input, adapter);

    expect(input).toEqual(snapshot);
    expect(input.cards[0].name).toBe("  Opt  ");
  });

  test("candidate_pool.ts does not include forbidden hooks", () => {
    const source = readFileSync(
      new URL("../card_synergy_explorer/candidate_pool.ts", import.meta.url),
      "utf-8",
    );

    expect(source.includes("fetch")).toBe(false);
    expect(source.includes("Date.now")).toBe(false);
    expect(source.includes("Math.random")).toBe(false);
    expect(source.includes("localStorage")).toBe(false);
    expect(source.includes("sessionStorage")).toBe(false);
    expect(source.includes("window")).toBe(false);
    expect(source.includes("document")).toBe(false);
    expect(source.includes("cards_index")).toBe(false);
    expect(source.includes("semantic")).toBe(false);
    expect(source.includes("analyzer")).toBe(false);
    expect(source.includes("parser")).toBe(false);
    expect(source.includes("montecarlo")).toBe(false);
    expect(source.includes("sps")).toBe(false);
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";
import type {
  CardSynergyDataAdapter,
  CardSynergyExplorerInput,
} from "../card_synergy_explorer";
import { runCardSynergyExplorerCoreSkeleton } from "../card_synergy_explorer";

describe("card synergy explorer core candidate pool wiring v1", () => {
  test("invalid input returns validation degradation, does not call adapter methods, and excludes semantic_ir_unavailable", async () => {
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

    const result = await runCardSynergyExplorerCoreSkeleton(input, adapter);
    const reasons = result.degradations.map((d) => d.reason);

    expect(result.candidates).toEqual([]);
    expect(reasons.some((reason) => reason === "unsupported_seed_count" || reason === "invalid_input")).toBe(
      true,
    );
    expect(reasons).not.toContain("semantic_ir_unavailable");
    expect(resolveSpy).toHaveBeenCalledTimes(0);
    expect(poolSpy).toHaveBeenCalledTimes(0);
  });

  test("valid input with degraded seed returns seed degradation, no pool call, and excludes semantic_ir_unavailable", async () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Unknown Card" }],
    };
    const adapter: CardSynergyDataAdapter = {
      async resolveSeedCard() {
        return {
          name: "Unknown Card",
          degradation: {
            reason: "missing_card_record",
            message: "No record",
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

    const result = await runCardSynergyExplorerCoreSkeleton(input, adapter);
    const reasons = result.degradations.map((d) => d.reason);

    expect(resolveSpy).toHaveBeenCalledTimes(1);
    expect(poolSpy).toHaveBeenCalledTimes(0);
    expect(result.candidates).toEqual([]);
    expect(reasons).toContain("missing_card_record");
    expect(reasons).not.toContain("semantic_ir_unavailable");
  });

  test("valid resolved seed with empty pool calls findCandidatePool once and returns semantic_ir_unavailable", async () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Brainstorm" }],
    };
    const adapter: CardSynergyDataAdapter = {
      async resolveSeedCard(seed) {
        return { name: seed.name };
      },
      async findCandidatePool() {
        return [];
      },
    };
    const poolSpy = vi.spyOn(adapter, "findCandidatePool");

    const result = await runCardSynergyExplorerCoreSkeleton(input, adapter);

    expect(poolSpy).toHaveBeenCalledTimes(1);
    expect(result.candidates).toEqual([]);
    expect(result.degradations).toHaveLength(1);
    expect(result.degradations[0].reason).toBe("semantic_ir_unavailable");
  });

  test("valid resolved seed with non-empty pool calls findCandidatePool once and still returns semantic_ir_unavailable", async () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Ponder" }],
    };
    const adapter: CardSynergyDataAdapter = {
      async resolveSeedCard(seed) {
        return { name: seed.name };
      },
      async findCandidatePool() {
        return [{ name: "Preordain" }];
      },
    };
    const poolSpy = vi.spyOn(adapter, "findCandidatePool");

    const result = await runCardSynergyExplorerCoreSkeleton(input, adapter);

    expect(poolSpy).toHaveBeenCalledTimes(1);
    expect(result.candidates).toEqual([]);
    expect(result.degradations).toHaveLength(1);
    expect(result.degradations[0].reason).toBe("semantic_ir_unavailable");
  });

  test("two valid seeds are resolved in order and pool is queried after both", async () => {
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

    const result = await runCardSynergyExplorerCoreSkeleton(input, adapter);

    expect(resolveSpy).toHaveBeenCalledTimes(2);
    expect(resolveSpy).toHaveBeenNthCalledWith(1, input.cards[0]);
    expect(resolveSpy).toHaveBeenNthCalledWith(2, input.cards[1]);
    expect(poolSpy).toHaveBeenCalledTimes(1);
    expect(events).toEqual(["resolve:A", "resolve:B", "pool"]);
    expect(result.degradations[0].reason).toBe("semantic_ir_unavailable");
  });

  test("core is deterministic for same input and deterministic adapter", async () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Opt" }],
    };
    const adapter: CardSynergyDataAdapter = {
      async resolveSeedCard(seed) {
        return { name: seed.name, cmc: 1 };
      },
      async findCandidatePool() {
        return [{ name: "Serum Visions" }];
      },
    };

    const first = await runCardSynergyExplorerCoreSkeleton(input, adapter);
    const second = await runCardSynergyExplorerCoreSkeleton(input, adapter);

    expect(first).toEqual(second);
  });

  test("core does not mutate input or trim original names", async () => {
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

    await runCardSynergyExplorerCoreSkeleton(input, adapter);

    expect(input).toEqual(snapshot);
    expect(input.cards[0].name).toBe("  Opt  ");
  });

  test("core.ts excludes forbidden hooks and does not directly invoke findCandidatePool", () => {
    const source = readFileSync(new URL("../card_synergy_explorer/core.ts", import.meta.url), "utf-8");

    expect(source.includes("fetch")).toBe(false);
    expect(source.includes("Date.now")).toBe(false);
    expect(source.includes("Math.random")).toBe(false);
    expect(source.includes("localStorage")).toBe(false);
    expect(source.includes("sessionStorage")).toBe(false);
    expect(source.includes("window")).toBe(false);
    expect(source.includes("document")).toBe(false);
    expect(source.includes("cards_index")).toBe(false);
    expect(source.includes("../analyzer")).toBe(false);
    expect(source.includes("../parser")).toBe(false);
    expect(source.includes("../semantic")).toBe(false);
    expect(source.includes("montecarlo")).toBe(false);
    expect(source.includes("sps")).toBe(false);
    expect(source.includes("findCandidatePool(")).toBe(false);
  });
});

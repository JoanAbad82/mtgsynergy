import { readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";
import type {
  CardSynergyDataAdapter,
  CardSynergyExplorerInput,
} from "../card_synergy_explorer";
import { runCardSynergyExplorerCoreSkeleton } from "../card_synergy_explorer";

describe("card synergy explorer core seed resolution wiring v1", () => {
  test("invalid input returns validation degradations, does not call adapter, and excludes semantic_ir_unavailable", async () => {
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

  test("valid input with degraded seed returns adapter degradation, excludes semantic_ir_unavailable, and does not call findCandidatePool", async () => {
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

    const result = await runCardSynergyExplorerCoreSkeleton(input, adapter);
    const reasons = result.degradations.map((d) => d.reason);

    expect(resolveSpy).toHaveBeenCalledTimes(1);
    expect(reasons).toContain("missing_card_record");
    expect(reasons).not.toContain("semantic_ir_unavailable");
    expect(poolSpy).toHaveBeenCalledTimes(0);
  });

  test("valid input with resolved seed returns empty candidates and semantic_ir_unavailable", async () => {
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

    expect(result.candidates).toEqual([]);
    expect(result.degradations).toHaveLength(1);
    expect(result.degradations[0].reason).toBe("semantic_ir_unavailable");
    expect(poolSpy).toHaveBeenCalledTimes(0);
  });

  test("two valid seeds are resolved in order and semantic_ir_unavailable remains final degradation", async () => {
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

    const result = await runCardSynergyExplorerCoreSkeleton(input, adapter);

    expect(resolveSpy).toHaveBeenCalledTimes(2);
    expect(resolveSpy).toHaveBeenNthCalledWith(1, input.cards[0]);
    expect(resolveSpy).toHaveBeenNthCalledWith(2, input.cards[1]);
    expect(result.degradations).toHaveLength(1);
    expect(result.degradations[0].reason).toBe("semantic_ir_unavailable");
  });

  test("core is deterministic for same input with deterministic adapter", async () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Opt" }],
    };
    const adapter: CardSynergyDataAdapter = {
      async resolveSeedCard(seed) {
        return { name: seed.name, cmc: 1 };
      },
      async findCandidatePool() {
        return [];
      },
    };

    const first = await runCardSynergyExplorerCoreSkeleton(input, adapter);
    const second = await runCardSynergyExplorerCoreSkeleton(input, adapter);

    expect(first).toEqual(second);
  });

  test("core does not mutate input and does not trim original seed name", async () => {
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

  test("core.ts has no forbidden runtime hooks and does not invoke findCandidatePool", () => {
    const source = readFileSync(new URL("../card_synergy_explorer/core.ts", import.meta.url), "utf-8");

    expect(source.includes("fetch(")).toBe(false);
    expect(source.includes("Date.now")).toBe(false);
    expect(source.includes("Math.random")).toBe(false);
    expect(source.includes("localStorage")).toBe(false);
    expect(source.includes("sessionStorage")).toBe(false);
    expect(source.includes("window")).toBe(false);
    expect(source.includes("document")).toBe(false);
    expect(source.includes("cards_index")).toBe(false);
    expect(source.includes("findCandidatePool(")).toBe(false);
  });
});

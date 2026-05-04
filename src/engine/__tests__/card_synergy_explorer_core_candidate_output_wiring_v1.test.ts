import { readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";
import type {
  CardSynergyCandidateCard,
  CardSynergyDataAdapter,
  CardSynergyExplorerInput,
} from "../card_synergy_explorer";
import { runCardSynergyExplorerCoreSkeleton } from "../card_synergy_explorer";

describe("card synergy explorer core candidate output wiring v1", () => {
  test("invalid input returns empty candidateOutputs/candidates, no semantic degradation, and no adapter calls", async () => {
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
    const reasons = result.degradations.map((degradation) => degradation.reason);

    expect(result.candidates).toEqual([]);
    expect(result.candidateOutputs).toEqual([]);
    expect(reasons.some((reason) => reason === "unsupported_seed_count" || reason === "invalid_input")).toBe(
      true,
    );
    expect(reasons).not.toContain("semantic_ir_unavailable");
    expect(resolveSpy).toHaveBeenCalledTimes(0);
    expect(poolSpy).toHaveBeenCalledTimes(0);
  });

  test("degraded seed returns empty candidateOutputs/candidates, missing_card_record, and no pool call", async () => {
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
    const reasons = result.degradations.map((degradation) => degradation.reason);

    expect(result.candidates).toEqual([]);
    expect(result.candidateOutputs).toEqual([]);
    expect(reasons).toContain("missing_card_record");
    expect(reasons).not.toContain("semantic_ir_unavailable");
    expect(resolveSpy).toHaveBeenCalledTimes(1);
    expect(poolSpy).toHaveBeenCalledTimes(0);
  });

  test("success path inherits normalized pool into candidateOutputs (seed excluded, duplicate removed, stable order)", async () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Seed", oracleId: "seed-1" }],
    };
    const firstAccepted: CardSynergyCandidateCard = { name: "A", oracleId: "a-1" };
    const duplicate: CardSynergyCandidateCard = { name: "A Variant", oracleId: "a-1" };
    const seedAsCandidate: CardSynergyCandidateCard = { name: "Seed", oracleId: "seed-1" };
    const secondAccepted: CardSynergyCandidateCard = { name: "B", oracleId: "b-1" };

    const adapter: CardSynergyDataAdapter = {
      async resolveSeedCard(seed) {
        return { name: seed.name, oracleId: seed.oracleId };
      },
      async findCandidatePool() {
        return [firstAccepted, duplicate, seedAsCandidate, secondAccepted];
      },
    };
    const poolSpy = vi.spyOn(adapter, "findCandidatePool");

    const result = await runCardSynergyExplorerCoreSkeleton(input, adapter);

    expect(poolSpy).toHaveBeenCalledTimes(1);
    expect(result.candidates).toEqual([]);
    expect(result.degradations).toHaveLength(1);
    expect(result.degradations[0].reason).toBe("semantic_ir_unavailable");
    expect(result.candidateOutputs).toEqual([
      {
        name: "A",
        oracleId: "a-1",
        source: "candidate_pool",
        status: "unranked",
        semanticStatus: "semantic_bridge_unavailable",
      },
      {
        name: "B",
        oracleId: "b-1",
        source: "candidate_pool",
        status: "unranked",
        semanticStatus: "semantic_bridge_unavailable",
      },
    ]);
  });

  test("success path respects maxCandidates truncation from normalization", async () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Seed", oracleId: "seed-1" }],
      options: { maxCandidates: 1 },
    };
    const candidateA: CardSynergyCandidateCard = { name: "A", oracleId: "a-1" };
    const candidateADup: CardSynergyCandidateCard = { name: "A Dup", oracleId: "a-1" };
    const candidateB: CardSynergyCandidateCard = { name: "B", oracleId: "b-1" };

    const adapter: CardSynergyDataAdapter = {
      async resolveSeedCard(seed) {
        return { name: seed.name, oracleId: seed.oracleId };
      },
      async findCandidatePool() {
        return [{ name: "Seed", oracleId: "seed-1" }, candidateA, candidateADup, candidateB];
      },
    };

    const result = await runCardSynergyExplorerCoreSkeleton(input, adapter);

    expect(result.candidateOutputs).toEqual([
      {
        name: "A",
        oracleId: "a-1",
        source: "candidate_pool",
        status: "unranked",
        semanticStatus: "semantic_bridge_unavailable",
      },
    ]);
  });

  test("outputs do not include score/rank/explanation/bridges", async () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Seed" }],
    };
    const adapter: CardSynergyDataAdapter = {
      async resolveSeedCard(seed) {
        return { name: seed.name };
      },
      async findCandidatePool() {
        return [{ name: "Candidate" }];
      },
    };

    const result = await runCardSynergyExplorerCoreSkeleton(input, adapter);
    const output = result.candidateOutputs[0];

    expect(output.source).toBe("candidate_pool");
    expect(output.status).toBe("unranked");
    expect(output.semanticStatus).toBe("semantic_bridge_unavailable");
    expect("score" in output).toBe(false);
    expect("rank" in output).toBe(false);
    expect("explanation" in output).toBe(false);
    expect("bridges" in output).toBe(false);
  });

  test("core remains deterministic and does not mutate input", async () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "  Seed  " }],
      options: { maxCandidates: 2 },
    };
    const snapshot = JSON.parse(JSON.stringify(input));
    const adapter: CardSynergyDataAdapter = {
      async resolveSeedCard(seed) {
        return { name: seed.name };
      },
      async findCandidatePool() {
        return [{ name: "C1" }, { name: "C2" }];
      },
    };

    Object.freeze(input.cards[0]);
    Object.freeze(input.cards);
    Object.freeze(input.options!);
    Object.freeze(input);

    const first = await runCardSynergyExplorerCoreSkeleton(input, adapter);
    const second = await runCardSynergyExplorerCoreSkeleton(input, adapter);

    expect(first).toEqual(second);
    expect(input).toEqual(snapshot);
    expect(input.cards[0].name).toBe("  Seed  ");
  });

  test("core.ts excludes forbidden hooks/imports and does not directly invoke findCandidatePool", () => {
    const source = readFileSync(new URL("../card_synergy_explorer/core.ts", import.meta.url), "utf-8");

    expect(source.includes("fetch")).toBe(false);
    expect(source.includes("Date.now")).toBe(false);
    expect(source.includes("Math.random")).toBe(false);
    expect(source.includes("window")).toBe(false);
    expect(source.includes("document")).toBe(false);
    expect(source.includes("localStorage")).toBe(false);
    expect(source.includes("sessionStorage")).toBe(false);
    expect(source.includes("../semantic")).toBe(false);
    expect(source.includes("../parser")).toBe(false);
    expect(source.includes("../analyzer")).toBe(false);
    expect(source.includes("montecarlo")).toBe(false);
    expect(source.includes("sps")).toBe(false);
    expect(source.includes("findCandidatePool(")).toBe(false);
  });
});

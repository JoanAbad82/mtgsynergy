import { describe, expect, test, vi } from "vitest";
import type {
  CardSynergyCandidateCard,
  CardSynergyDataAdapter,
  CardSynergyExplorerInput,
} from "../card_synergy_explorer";
import { resolveCardSynergyCandidatePool } from "../card_synergy_explorer";

describe("card synergy explorer candidate pool normalization wiring v1", () => {
  test("does not search or normalize when validation/seed resolution degrades", async () => {
    const invalidInput = { cards: [] } as unknown as CardSynergyExplorerInput;
    const degradedInput: CardSynergyExplorerInput = { cards: [{ name: "Missing" }] };

    const adapter: CardSynergyDataAdapter = {
      async resolveSeedCard(seed) {
        if (seed.name === "Missing") {
          return {
            name: seed.name,
            degradation: {
              reason: "missing_card_record",
              message: "No record",
              recoverable: true,
            },
          };
        }
        return { name: seed.name };
      },
      async findCandidatePool() {
        return [{ name: "should-not-run" }];
      },
    };
    const resolveSpy = vi.spyOn(adapter, "resolveSeedCard");
    const poolSpy = vi.spyOn(adapter, "findCandidatePool");

    const invalidResult = await resolveCardSynergyCandidatePool(invalidInput, adapter);
    const degradedResult = await resolveCardSynergyCandidatePool(degradedInput, adapter);

    expect(invalidResult.candidatePool).toEqual([]);
    expect(invalidResult.degradations.map((d) => d.reason)).toContain("unsupported_seed_count");
    expect(degradedResult.candidatePool).toEqual([]);
    expect(degradedResult.degradations.map((d) => d.reason)).toContain("missing_card_record");
    expect(resolveSpy).toHaveBeenCalledTimes(1);
    expect(poolSpy).toHaveBeenCalledTimes(0);
  });

  test("normalizes raw pool in success path (exclude seed + dedupe by oracleId + stable first accepted)", async () => {
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

    const result = await resolveCardSynergyCandidatePool(input, adapter);

    expect(result.degradations).toEqual([]);
    expect(result.candidatePool).toEqual([firstAccepted, secondAccepted]);
    expect(result.candidatePool[0]).toBe(firstAccepted);
  });

  test("applies maxCandidates after seed exclusion and deduplication", async () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Seed", oracleId: "seed-1" }],
      options: { maxCandidates: 1 },
    };
    const a: CardSynergyCandidateCard = { name: "A", oracleId: "a-1" };
    const aDup: CardSynergyCandidateCard = { name: "A Duplicate", oracleId: "a-1" };
    const b: CardSynergyCandidateCard = { name: "B", oracleId: "b-1" };

    const adapter: CardSynergyDataAdapter = {
      async resolveSeedCard(seed) {
        return { name: seed.name, oracleId: seed.oracleId };
      },
      async findCandidatePool() {
        return [{ name: "Seed", oracleId: "seed-1" }, a, aDup, b];
      },
    };

    const result = await resolveCardSynergyCandidatePool(input, adapter);

    expect(result.degradations).toEqual([]);
    expect(result.candidatePool).toEqual([a]);
  });

  test("does not mutate original candidatePool objects or resolved seed cards", async () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "  Seed  ", oracleId: "seed-1" }],
    };
    const rawCandidate: CardSynergyCandidateCard = { name: "  C  ", oracleId: "c-1" };
    const rawSnapshot = JSON.parse(JSON.stringify(rawCandidate));
    const seedSnapshot = JSON.parse(JSON.stringify(input.cards[0]));

    const adapter: CardSynergyDataAdapter = {
      async resolveSeedCard(seed) {
        return { name: seed.name, oracleId: seed.oracleId };
      },
      async findCandidatePool() {
        return [rawCandidate];
      },
    };

    Object.freeze(input.cards[0]);
    Object.freeze(input.cards);
    Object.freeze(input);
    Object.freeze(rawCandidate);

    const result = await resolveCardSynergyCandidatePool(input, adapter);

    expect(result.candidatePool).toEqual([rawCandidate]);
    expect(rawCandidate).toEqual(rawSnapshot);
    expect(input.cards[0]).toEqual(seedSnapshot);
    expect(input.cards[0].name).toBe("  Seed  ");
    expect(rawCandidate.name).toBe("  C  ");
  });
});

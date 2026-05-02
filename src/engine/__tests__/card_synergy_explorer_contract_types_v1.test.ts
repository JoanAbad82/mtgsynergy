import { describe, expect, test } from "vitest";
import type {
  CardSynergyCandidate,
  CardSynergyDataAdapter,
  CardSynergyDegradation,
  CardSynergyExplorerInput,
  CardSynergyExplorerMeta,
  CardSynergySeedCard,
} from "../card_synergy_explorer";

describe("card synergy explorer contract types v1", () => {
  test("input with 1 seed card is valid by shape/type", () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Lightning Bolt" }],
    };

    expect(input.cards).toHaveLength(1);
    expect(input.cards[0].name).toBe("Lightning Bolt");
  });

  test("input with 2 seed cards is valid by shape/type", () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Brainstorm" }, { name: "Fetchland" }],
      options: { maxCandidates: 10, explanationLevel: "detailed" },
    };

    expect(input.cards).toHaveLength(2);
    expect(input.cards[1].name).toBe("Fetchland");
  });

  test("meta fixes deterministic and non-SPS/non-MonteCarlo contract flags", () => {
    const meta: CardSynergyExplorerMeta = {
      schemaVersion: "card-synergy-explorer-contract-v1",
      deterministic: true,
      usesDeckSps: false,
      usesMonteCarlo: false,
    };

    expect(meta.schemaVersion).toBe("card-synergy-explorer-contract-v1");
    expect(meta.deterministic).toBe(true);
    expect(meta.usesDeckSps).toBe(false);
    expect(meta.usesMonteCarlo).toBe(false);
  });

  test("candidate can explain synergy through an explicit causal bridge", () => {
    const candidate: CardSynergyCandidate = {
      card: {
        name: "Aetherflux Reservoir",
        oracleId: "example-oracle-id",
        typeLine: "Artifact",
        oracleText: "Whenever you cast a spell, you gain 1 life for each spell you've cast this turn.",
        cmc: 4,
      },
      score: {
        value: 0.91,
        confidence: "high",
        basis: "explicit_causal_bridge",
      },
      explanation: {
        summary: "Casting multiple spells creates a direct life-gain payoff bridge.",
        bridges: [
          {
            fromEvent: "cast a spell",
            toEffect: "gain life scaling with spells cast",
            bridgeKind: "event_to_effect",
            evidence: [
              {
                source: "oracle_text",
                text: "Whenever you cast a spell, you gain 1 life for each spell you've cast this turn.",
              },
            ],
          },
        ],
      },
    };

    expect(candidate.score.basis).toBe("explicit_causal_bridge");
    expect(candidate.explanation.bridges).toHaveLength(1);
    expect(candidate.explanation.bridges[0].bridgeKind).toBe("event_to_effect");
  });

  test("explicit degradation exists for no_explicit_bridge", () => {
    const degradation: CardSynergyDegradation = {
      reason: "no_explicit_bridge",
      message: "No explicit causal bridge could be established from available records.",
      recoverable: true,
    };

    expect(degradation.reason).toBe("no_explicit_bridge");
    expect(degradation.recoverable).toBe(true);
  });

  test("data adapter is typed as separate layer and returns Promises", async () => {
    const adapter: CardSynergyDataAdapter = {
      async resolveSeedCard(seed: CardSynergySeedCard) {
        return { name: seed.name };
      },
      async findCandidatePool() {
        return [{ name: "Sol Ring", cmc: 1 }];
      },
    };

    const seed: CardSynergySeedCard = { name: "Arcane Signet" };
    const resolvePromise = adapter.resolveSeedCard(seed);
    const poolPromise = adapter.findCandidatePool({ cards: [seed] });

    expect(resolvePromise).toBeInstanceOf(Promise);
    expect(poolPromise).toBeInstanceOf(Promise);

    const resolved = await resolvePromise;
    const pool = await poolPromise;

    expect("name" in resolved).toBe(true);
    expect(pool[0].name).toBe("Sol Ring");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { CardSynergyResolvedCardIndexRecord } from "../card_synergy_explorer";
import {
  CARD_SYNERGY_ADAPTER_CONTRACT_META,
  cardIndexRecordToCandidateCard,
  missingCardRecordToDegradedCard,
  missingOracleTextDegradation,
} from "../card_synergy_explorer";

describe("card synergy explorer adapter contract v1", () => {
  test("adapter contract meta is fixed", () => {
    expect(CARD_SYNERGY_ADAPTER_CONTRACT_META.schemaVersion).toBe(
      "card-synergy-explorer-adapter-contract-v1",
    );
    expect(CARD_SYNERGY_ADAPTER_CONTRACT_META.cardsIndexSchemaVersion).toBe("cardrecordmin-v1");
    expect(CARD_SYNERGY_ADAPTER_CONTRACT_META.deterministic).toBe(true);
    expect(CARD_SYNERGY_ADAPTER_CONTRACT_META.runtimeFetches).toBe(false);
    expect(CARD_SYNERGY_ADAPTER_CONTRACT_META.performsRanking).toBe(false);
  });

  test("cardIndexRecordToCandidateCard adapts a resolved record", () => {
    const input: CardSynergyResolvedCardIndexRecord = {
      seed: { name: "Lightning Bolt", oracleId: "oracle-123" },
      record: {
        type_line: "Instant",
        oracle_text: "Lightning Bolt deals 3 damage to any target.",
        cmc: 1,
      },
      source: "cards_index",
    };

    const candidate = cardIndexRecordToCandidateCard(input);

    expect(candidate.name).toBe("Lightning Bolt");
    expect(candidate.oracleId).toBe("oracle-123");
    expect(candidate.typeLine).toBe("Instant");
    expect(candidate.oracleText).toBe("Lightning Bolt deals 3 damage to any target.");
    expect(candidate.cmc).toBe(1);
  });

  test("cardIndexRecordToCandidateCard does not invent optional fields", () => {
    const input: CardSynergyResolvedCardIndexRecord = {
      seed: { name: "Forest" },
      record: {
        type_line: "Basic Land - Forest",
        cmc: 0,
      },
      source: "cards_index",
    };

    const candidate = cardIndexRecordToCandidateCard(input);

    expect("oracleText" in candidate).toBe(false);
    expect(candidate.typeLine).toBe("Basic Land - Forest");
    expect(candidate.cmc).toBe(0);
  });

  test("missingCardRecordToDegradedCard creates explicit degradation", () => {
    const degraded = missingCardRecordToDegradedCard({ name: "Unknown Card" });

    expect(degraded.name).toBe("Unknown Card");
    expect(degraded.degradation.reason).toBe("missing_card_record");
    expect(degraded.degradation.recoverable).toBe(true);
  });

  test("missingOracleTextDegradation creates explicit degradation", () => {
    const degradation = missingOracleTextDegradation("Grizzly Bears");

    expect(degradation.reason).toBe("missing_oracle_text");
    expect(degradation.recoverable).toBe(true);
  });

  test("adapter contract file does not include forbidden runtime hooks", () => {
    const source = readFileSync(
      new URL("../card_synergy_explorer/adapter_contract.ts", import.meta.url),
      "utf-8",
    );

    expect(source.includes("fetch(")).toBe(false);
    expect(source.includes("buildSemanticEdges")).toBe(false);
    expect(source.includes("computeStructuralPowerScore")).toBe(false);
    expect(source.includes("montecarlo")).toBe(false);
    expect(source.includes("generateEdges")).toBe(false);
  });
});

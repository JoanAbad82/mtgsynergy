import { readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";
import type { CardRecordMin } from "../cards/types";
import type { CardSynergyExplorerInput } from "../card_synergy_explorer";
import {
  CARD_SYNERGY_CARDS_INDEX_ADAPTER_META,
  CARD_SYNERGY_EXPLORER_CARDS_INDEX_ADAPTER_VERSION,
  createCardSynergyCardsIndexAdapter,
} from "../card_synergy_explorer";

describe("card synergy explorer cards index adapter v1", () => {
  test("meta/version is stable", () => {
    expect(CARD_SYNERGY_EXPLORER_CARDS_INDEX_ADAPTER_VERSION).toBe(
      "card-synergy-explorer-cards-index-adapter-v1",
    );
    expect(CARD_SYNERGY_CARDS_INDEX_ADAPTER_META.version).toBe(
      "card-synergy-explorer-cards-index-adapter-v1",
    );
    expect(CARD_SYNERGY_CARDS_INDEX_ADAPTER_META.deterministic).toBe(true);
    expect(CARD_SYNERGY_CARDS_INDEX_ADAPTER_META.usesCardsIndexLookup).toBe(true);
    expect(CARD_SYNERGY_CARDS_INDEX_ADAPTER_META.directRuntimeFetches).toBe(false);
    expect(CARD_SYNERGY_CARDS_INDEX_ADAPTER_META.performsCandidateSearch).toBe(true);
    expect(CARD_SYNERGY_CARDS_INDEX_ADAPTER_META.performsRanking).toBe(false);
    expect(CARD_SYNERGY_CARDS_INDEX_ADAPTER_META.createsScores).toBe(false);
    expect(CARD_SYNERGY_CARDS_INDEX_ADAPTER_META.createsExplanations).toBe(false);
    expect(CARD_SYNERGY_CARDS_INDEX_ADAPTER_META.evaluatesSemanticBridges).toBe(false);
  });

  test("resolveSeedCard returns missing_card_record when lookup returns null", async () => {
    const lookup = vi.fn(async () => null);
    const adapter = createCardSynergyCardsIndexAdapter({
      baseUrl: "http://cards.test",
      lookupCard: lookup,
    });
    const seed = { name: "Unknown Card" };

    const result = await adapter.resolveSeedCard(seed);

    expect(lookup).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledWith(seed.name, "http://cards.test");
    expect("degradation" in result).toBe(true);
    if (!("degradation" in result)) {
      throw new Error("Expected degraded result");
    }
    expect(result.degradation.reason).toBe("missing_card_record");
  });

  test("resolveSeedCard maps a valid cards_index record", async () => {
    const record: CardRecordMin = {
      name: "Lightning Bolt",
      name_norm: "lightning bolt",
      oracle_id: "oracle-123",
      type_line: "Instant",
      oracle_text: "Lightning Bolt deals 3 damage to any target.",
      cmc: 1,
    };
    const lookup = vi.fn(async () => record);
    const adapter = createCardSynergyCardsIndexAdapter({ lookupCard: lookup });

    const result = await adapter.resolveSeedCard({ name: "Bolt Seed Name" });

    expect("degradation" in result).toBe(false);
    if ("degradation" in result) {
      throw new Error("Expected candidate result");
    }
    expect(result.name).toBe("Lightning Bolt");
    expect(result.oracleId).toBe("oracle-123");
    expect(result.typeLine).toBe("Instant");
    expect(result.oracleText).toBe("Lightning Bolt deals 3 damage to any target.");
    expect(result.cmc).toBe(1);
  });

  test("resolveSeedCard returns missing_oracle_text degradation for null/empty oracle text", async () => {
    const records: CardRecordMin[] = [
      {
        name: "Card Null Oracle",
        name_norm: "card null oracle",
        oracle_text: null,
      },
      {
        name: "Card Empty Oracle",
        name_norm: "card empty oracle",
        oracle_text: "   ",
      },
    ];

    for (const record of records) {
      const lookup = vi.fn(async () => record);
      const adapter = createCardSynergyCardsIndexAdapter({ lookupCard: lookup });
      const result = await adapter.resolveSeedCard({ name: "Seed" });

      expect("degradation" in result).toBe(true);
      if (!("degradation" in result)) {
        throw new Error("Expected degraded result");
      }
      expect(result.degradation.reason).toBe("missing_oracle_text");
      expect(result.degradation.recoverable).toBe(true);
    }
  });

  test("findCandidatePool uses injected list source, does not call lookup, and maps real candidates", async () => {
    const lookup = vi.fn(async () => null);
    const listRecords = vi.fn(async () => {
      return [
        {
          name: "Candidate A",
          name_norm: "candidate a",
          oracle_id: "a-1",
          type_line: "Instant",
          oracle_text: "Draw a card.",
          cmc: 1,
        },
        {
          name: "Candidate B",
          name_norm: "candidate b",
          type_line: "Creature",
          oracle_text: "Flying",
          cmc: 2,
        },
      ] satisfies readonly CardRecordMin[];
    });
    const adapter = createCardSynergyCardsIndexAdapter({
      lookupCard: lookup,
      listCardsIndexRecords: listRecords,
      baseUrl: "http://cards.test",
    });
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Seed A" }],
      options: { maxCandidates: 2 },
    };

    const result = await adapter.findCandidatePool(input);

    expect(lookup).toHaveBeenCalledTimes(0);
    expect(listRecords).toHaveBeenCalledTimes(1);
    expect(listRecords).toHaveBeenCalledWith({
      baseUrl: "http://cards.test",
      limit: 18,
      includeEmptyOracleText: false,
    
      recordFilter: expect.any(Function),});
    expect(result).toEqual([
      {
        name: "Candidate A",
        oracleId: "a-1",
        typeLine: "Instant",
        oracleText: "Draw a card.",
        cmc: 1,
      },
      {
        name: "Candidate B",
        typeLine: "Creature",
        oracleText: "Flying",
        cmc: 2,
      },
    ]);
  });

  test("findCandidatePool returns [] and does not list when maxCandidates <= 0", async () => {
    const lookup = vi.fn(async () => null);
    const listRecords = vi.fn(async () => {
      return [{ name: "Candidate", name_norm: "candidate", oracle_text: "x" }] satisfies readonly CardRecordMin[];
    });
    const adapter = createCardSynergyCardsIndexAdapter({
      lookupCard: lookup,
      listCardsIndexRecords: listRecords,
    });
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Seed A" }],
      options: { maxCandidates: 0 },
    };

    const result = await adapter.findCandidatePool(input);

    expect(result).toEqual([]);
    expect(lookup).toHaveBeenCalledTimes(0);
    expect(listRecords).toHaveBeenCalledTimes(0);
  });

  test("findCandidatePool uses candidatePoolLimit when maxCandidates is not provided", async () => {
    const listRecords = vi.fn(async () => {
      return [{ name: "Candidate A", name_norm: "candidate a", oracle_text: "x" }] satisfies readonly CardRecordMin[];
    });
    const adapter = createCardSynergyCardsIndexAdapter({
      listCardsIndexRecords: listRecords,
      candidatePoolLimit: 7,
      candidatePoolOverscan: 3,
    });
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "Seed A" }],
    };

    await adapter.findCandidatePool(input);

    expect(listRecords).toHaveBeenCalledTimes(1);
    expect(listRecords).toHaveBeenCalledWith({
      baseUrl: undefined,
      limit: 7,
      includeEmptyOracleText: false,
    
      recordFilter: expect.any(Function),});
  });

  test("findCandidatePool does not mutate input or list records", async () => {
    const input: CardSynergyExplorerInput = {
      cards: [{ name: "  Seed Name  " }],
      options: { maxCandidates: 1 },
    };
    const inputSnapshot = JSON.parse(JSON.stringify(input));
    const record: CardRecordMin = {
      name: "  Candidate Name  ",
      name_norm: "candidate name",
      oracle_text: "Has oracle text.",
      type_line: "Artifact",
      cmc: 2,
    };
    const recordSnapshot = JSON.parse(JSON.stringify(record));
    const listRecords = vi.fn(async () => [record] as readonly CardRecordMin[]);
    const adapter = createCardSynergyCardsIndexAdapter({
      listCardsIndexRecords: listRecords,
    });

    Object.freeze(input.cards[0]);
    Object.freeze(input.cards);
    Object.freeze(input.options!);
    Object.freeze(input);
    Object.freeze(record);

    const result = await adapter.findCandidatePool(input);

    expect(input).toEqual(inputSnapshot);
    expect(record).toEqual(recordSnapshot);
    expect(result).toEqual([
      {
        name: "  Candidate Name  ",
        typeLine: "Artifact",
        oracleText: "Has oracle text.",
        cmc: 2,
      },
    ]);
  });

  test("resolveSeedCard does not mutate seed or record", async () => {
    const seed = { name: "  Seed Name  " };
    const record: CardRecordMin = {
      name: "Canonical Name",
      name_norm: "canonical name",
      oracle_text: "Has oracle text.",
      type_line: "Creature - Wizard",
      cmc: 2,
    };
    const seedSnapshot = JSON.parse(JSON.stringify(seed));
    const recordSnapshot = JSON.parse(JSON.stringify(record));
    const lookup = vi.fn(async () => record);
    const adapter = createCardSynergyCardsIndexAdapter({ lookupCard: lookup });

    Object.freeze(seed);
    Object.freeze(record);

    await adapter.resolveSeedCard(seed);

    expect(seed).toEqual(seedSnapshot);
    expect(record).toEqual(recordSnapshot);
    expect(seed.name).toBe("  Seed Name  ");
  });

  test("cards_index_adapter.ts excludes forbidden hooks/imports", () => {
    const source = readFileSync(
      new URL("../card_synergy_explorer/cards_index_adapter.ts", import.meta.url),
      "utf-8",
    );

    expect(source.includes("fetch(")).toBe(false);
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
  });
});

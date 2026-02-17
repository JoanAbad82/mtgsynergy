import { describe, expect, test, vi } from "vitest";
import { normalizeCardName } from "../cards/normalize";
import { lookupCard, __testing } from "../cards/lookup";
import { extractFeatures } from "../cards/features";

const shardData = {
  "llanowar elves": {
    oracle_id: "x",
    name: "Llanowar Elves",
    name_norm: "llanowar elves",
    type_line: "Creature \u2014 Elf Druid",
    oracle_text: "{T}: Add {G}.",
    mana_cost: "{G}",
    cmc: 1,
    colors: ["G"],
    color_identity: ["G"],
    produced_mana: ["G"],
    keywords: [],
    games: ["arena"],
    legalities: { historic: "legal" },
  },
};

describe("cards helpers", () => {
  test("normalizeCardName collapses spaces", () => {
    expect(normalizeCardName("  Llanowar   Elves ")).toBe("llanowar elves");
  });

  test("shardKey for name_norm", () => {
    expect(__testing.shardKeyFromNameNorm("llanowar elves")).toBe("l.json");
  });

  test("lookupCard fetches shard and returns record", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => shardData,
    }));
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    try {
      __testing.clearCache();
      const card = await lookupCard("Llanowar Elves");
      expect(card?.name_norm).toBe("llanowar elves");
      expect(fetchMock).toHaveBeenCalledWith("/data/cards_index/l.json");
    } finally {
      // @ts-expect-error restore
      globalThis.fetch = originalFetch;
    }
  });

  test("extractFeatures detects flags", () => {
    const features = extractFeatures(shardData["llanowar elves"]);
    expect(features.is_creature).toBe(true);
    expect(features.produces_mana).toBe(true);
    expect(features.draws_cards).toBe(false);
    expect(features.cmc_bucket).toBe(1);
  });
});

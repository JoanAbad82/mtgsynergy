import pako from "pako";
import { describe, expect, test, vi } from "vitest";
import { normalizeCardName } from "../cards/normalize";
import { getCardsIndexCount, lookupCard, __testing } from "../cards/lookup";
import { extractFeatures } from "../cards/features";

const payload = {
  schema_version: "cardrecordmin-v1",
  by_name: {
    "Llanowar Elves": {
      type_line: "Creature \u2014 Elf Druid",
      oracle_text: "{T}: Add {G}.",
      cmc: 1,
    },
    Forest: {
      type_line: "Basic Land \u2014 Forest",
      oracle_text: "",
      cmc: 0,
    },
  },
  by_name_norm: {
    "llanowar elves": "Llanowar Elves",
    forest: "Forest",
  },
};

describe("cards helpers", () => {
  test("normalizeCardName collapses spaces", () => {
    expect(normalizeCardName("  Llanowar   Elves ")).toBe("llanowar elves");
  });

  test("lookupCard fetches gzip index and returns record", async () => {
    const originalFetch = globalThis.fetch;
    const gz = pako.gzip(JSON.stringify(payload));
    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength),
    }));
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    try {
      __testing.clearCache();
      const card = await lookupCard("Llanowar Elves");
      expect(card?.name_norm).toBe("llanowar elves");
      expect(fetchMock).toHaveBeenCalledWith("/data/cards_index.json.gz");
      const count = await getCardsIndexCount();
      expect(count).toBe(2);
    } finally {
      // @ts-expect-error restore
      globalThis.fetch = originalFetch;
    }
  });

  test("extractFeatures detects flags", () => {
    const features = extractFeatures({
      name: "Llanowar Elves",
      name_norm: "llanowar elves",
      ...payload.by_name["Llanowar Elves"],
    });
    expect(features.is_creature).toBe(true);
    expect(features.produces_mana).toBe(true);
    expect(features.draws_cards).toBe(false);
    expect(features.cmc_bucket).toBe(1);
  });
});

import pako from "pako";
import { describe, expect, test, vi } from "vitest";
import type { CardEntry } from "../domain/types";
import { enrichEntriesWithCardIndex } from "../analyzer/enrich";
import { __testing } from "../cards/lookup";

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
      oracle_text: "({T}: Add {G}.)",
      cmc: 0,
    },
    "Collected Company": {
      type_line: "Instant",
      oracle_text:
        "Look at the top six cards of your library. You may put up to two creature cards from among them onto the battlefield.",
      cmc: 4,
    },
    Bolt: {
      type_line: "Instant",
      oracle_text: "Bolt deals 3 damage to any target.",
      cmc: 1,
    },
  },
  by_name_norm: {
    "llanowar elves": "Llanowar Elves",
    forest: "Forest",
    "collected company": "Collected Company",
    bolt: "Bolt",
  },
};

function makeEntry(name: string, name_norm: string): CardEntry {
  return { name, name_norm, count: 4, role_primary: "UTILITY" };
}

describe("enrichEntriesWithCardIndex", () => {
  test("assigns RAMP and LAND roles and emits TAGGING_ACTIVE", async () => {
    const originalFetch = globalThis.fetch;
    const gz = pako.gzip(JSON.stringify(payload));
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/cards_index.json.gz")) {
        return {
          ok: true,
          arrayBuffer: async () =>
            gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength),
        };
      }
      return { ok: false, status: 404 } as any;
    });
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    try {
      __testing.clearCache();
      const entries = [
        makeEntry("Llanowar Elves", "llanowar elves"),
        makeEntry("Forest", "forest"),
      ];
      const result = await enrichEntriesWithCardIndex(entries, {
        baseUrl: "http://x.test",
      });

      expect(result.entries[0].role_primary).toBe("RAMP");
      expect(result.entries[1].role_primary).toBe("LAND");
      expect(result.issues_added[0].code).toBe("TAGGING_ACTIVE");
    } finally {
      // @ts-expect-error restore
      globalThis.fetch = originalFetch;
    }
  });

  test("unknown entry remains UTILITY but TAGGING_ACTIVE if any match", async () => {
    const originalFetch = globalThis.fetch;
    const gz = pako.gzip(JSON.stringify(payload));
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/cards_index.json.gz")) {
        return {
          ok: true,
          arrayBuffer: async () =>
            gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength),
        };
      }
      return { ok: false, status: 404 } as any;
    });
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    try {
      __testing.clearCache();
      const entries = [
        makeEntry("Llanowar Elves", "llanowar elves"),
        makeEntry("Unknown Card", "unknown card"),
      ];
      const result = await enrichEntriesWithCardIndex(entries, {
        baseUrl: "http://x.test",
      });

      expect(result.entries[0].role_primary).toBe("RAMP");
      expect(result.entries[1].role_primary).toBe("UTILITY");
      expect(result.issues_added[0].code).toBe("TAGGING_ACTIVE");
    } finally {
      // @ts-expect-error restore
      globalThis.fetch = originalFetch;
    }
  });

  test("fetch failure returns TAGGING_UNAVAILABLE and leaves roles unchanged", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn(async () => {
      throw new Error("network");
    });
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    try {
      __testing.clearCache();
      const entries = [makeEntry("Llanowar Elves", "llanowar elves")];
      const result = await enrichEntriesWithCardIndex(entries, {
        baseUrl: "http://x.test",
      });

      expect(result.issues_added[0].code).toBe("TAGGING_UNAVAILABLE");
      expect(result.entries[0].role_primary).toBe("UTILITY");
    } finally {
      // @ts-expect-error restore
      globalThis.fetch = originalFetch;
    }
  });
});

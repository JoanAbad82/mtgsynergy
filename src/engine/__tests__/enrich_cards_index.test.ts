import { describe, expect, test, vi } from "vitest";
import type { CardEntry } from "../domain/types";
import { enrichEntriesWithCardIndex } from "../analyzer/enrich";
import { __testing } from "../cards/lookup";

const lShard = {
  "llanowar elves": {
    oracle_id: "l",
    name: "Llanowar Elves",
    name_norm: "llanowar elves",
    type_line: "Creature \u2014 Elf Druid",
    oracle_text: "{T}: Add {G}.",
    cmc: 1,
    produced_mana: ["G"],
  },
};

const fShard = {
  forest: {
    oracle_id: "f",
    name: "Forest",
    name_norm: "forest",
    type_line: "Basic Land \u2014 Forest",
    oracle_text: "({T}: Add {G}.)",
    cmc: 0,
  },
};

const cShard = {
  "collected company": {
    oracle_id: "c",
    name: "Collected Company",
    name_norm: "collected company",
    type_line: "Instant",
    oracle_text:
      "Look at the top six cards of your library. You may put up to two creature cards from among them onto the battlefield.",
    cmc: 4,
  },
};

const bShard = {
  bolt: {
    oracle_id: "b",
    name: "Bolt",
    name_norm: "bolt",
    type_line: "Instant",
    oracle_text: "Bolt deals 3 damage to any target.",
    cmc: 1,
  },
};

function makeEntry(name: string, name_norm: string): CardEntry {
  return { name, name_norm, count: 4, role_primary: "UTILITY" };
}

describe("enrichEntriesWithCardIndex", () => {
  test("assigns RAMP and LAND roles and emits TAGGING_ACTIVE", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/l.json")) return { ok: true, json: async () => lShard };
      if (url.endsWith("/f.json")) return { ok: true, json: async () => fShard };
      if (url.endsWith("/c.json")) return { ok: true, json: async () => cShard };
      if (url.endsWith("/b.json")) return { ok: true, json: async () => bShard };
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
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/l.json")) return { ok: true, json: async () => lShard };
      return { ok: true, json: async () => ({}) };
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

import pako from "pako";
import { describe, expect, test, vi } from "vitest";
import { analyzeMtgaExportAsync } from "../analyzer";
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
  },
  by_name_norm: {
    "llanowar elves": "Llanowar Elves",
    forest: "Forest",
  },
};

describe("analyzeMtgaExportAsync tagging", () => {
  test("filters ROLES_DEFAULTED_TO_UTILITY when tagging active", async () => {
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
      const input = "4 Llanowar Elves\n20 Forest\n";
      const res = await analyzeMtgaExportAsync(input, {
        enableCardIndex: true,
        baseUrl: "http://x.test",
      });

      const codes = res.issues.map((i) => i.code);
      expect(codes).toContain("TAGGING_ACTIVE");
      expect(codes).not.toContain("ROLES_DEFAULTED_TO_UTILITY");

      const roles = res.deckState.deck.entries.map((e) => e.role_primary);
      expect(roles).toContain("RAMP");
      expect(roles).toContain("LAND");
    } finally {
      // @ts-expect-error restore
      globalThis.fetch = originalFetch;
    }
  });

  test("when tagging unavailable, keeps default roles warning", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn(async () => {
      throw new Error("network");
    });
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    try {
      __testing.clearCache();
      const input = "4 Llanowar Elves\n20 Forest\n";
      const res = await analyzeMtgaExportAsync(input, {
        enableCardIndex: true,
        baseUrl: "http://x.test",
      });

      const codes = res.issues.map((i) => i.code);
      expect(codes).toContain("TAGGING_UNAVAILABLE");
      expect(codes).toContain("ROLES_DEFAULTED_TO_UTILITY");
    } finally {
      // @ts-expect-error restore
      globalThis.fetch = originalFetch;
    }
  });
});

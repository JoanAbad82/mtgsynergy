import pako from "pako";
import { describe, expect, test, vi } from "vitest";
import { normalizeCardName } from "../cards/normalize";
import {
  getCardsIndexRecordsSourceSnapshot,
  getCardsIndexCount,
  listCardsIndexRecords,
  lookupCard,
  __testing,
} from "../cards/lookup";
import { computeSemanticOverlayFromDeckEntries } from "../semantic/overlay/sem_overlay_compute";
import { extractFeatures } from "../cards/features";

const payload = {
  schema_version: "cardrecordmin-v1",
  by_name: {
    "Llanowar Elves": {
      type_line: "Creature \u2014 Elf Druid",
      oracle_text: "{T}: Add {G}.",
      cmc: 1,
      keywords: [" Elf ", "Mana Ability"],
    },
    Forest: {
      type_line: "Basic Land \u2014 Forest",
      oracle_text: "",
      cmc: 0,
    },
    "Blightstep Pathway // Searstep Pathway": {
      type_line: "Land",
      oracle_text: "{T}: Add {B} or {R}.",
      cmc: 0,
    },
  },
  by_name_norm: {
    "llanowar elves": "Llanowar Elves",
    forest: "Forest",
  },
};

const listPayload = {
  schema_version: "cardrecordmin-v1",
  by_name: {
    Zeta: {
      type_line: "Creature",
      oracle_text: "  ",
      cmc: 3,
    },
    Alpha: {
      type_line: "Instant",
      oracle_text: "Draw a card.",
      cmc: 1,
      keywords: [" Cantrip ", "Draw"],
    },
    Gamma: {
      type_line: "Artifact",
      oracle_text: null,
      cmc: 2,
    },
    Beta: {
      type_line: "Sorcery",
      oracle_text: "Deal 2 damage.",
      cmc: 2,
    },
  },
  by_name_norm: {
    alpha: "Alpha",
    beta: "Beta",
    gamma: "Gamma",
    zeta: "Zeta",
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
      expect(card?.keywords).toEqual(["Elf", "Mana Ability"]);
      expect(fetchMock).toHaveBeenCalledWith("/data/cards_index.json.gz");
      const count = await getCardsIndexCount();
      expect(count).toBe(3);
    } finally {
      // @ts-expect-error restore
      globalThis.fetch = originalFetch;
    }
  });

  test("lookupCard accepts plain JSON payload when server already decompresses .gz", async () => {
    const originalFetch = globalThis.fetch;
    const plain = new TextEncoder().encode(JSON.stringify(payload));
    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () =>
        plain.buffer.slice(plain.byteOffset, plain.byteOffset + plain.byteLength),
    }));
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    try {
      __testing.clearCache();
      const card = await lookupCard("Forest");
      expect(card?.name).toBe("Forest");
      expect(fetchMock).toHaveBeenCalledWith("/data/cards_index.json.gz");
      const count = await getCardsIndexCount();
      expect(count).toBe(3);
    } finally {
      // @ts-expect-error restore
      globalThis.fetch = originalFetch;
    }
  });

  test("lookupCard reuses a single fetch for multiple calls", async () => {
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
      await Promise.all([
        lookupCard("Llanowar Elves"),
        lookupCard("Forest"),
        lookupCard("Llanowar Elves"),
      ]);
      const count = await getCardsIndexCount();
      expect(count).toBe(3);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      // @ts-expect-error restore
      globalThis.fetch = originalFetch;
    }
  });

  test("lookupCard resolves left side pathway names via alias", async () => {
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
      const card = await lookupCard("Blightstep Pathway");
      expect(card).not.toBeNull();
      expect(card?.name).toBe("Blightstep Pathway // Searstep Pathway");
      expect(card?.name_norm).toBe("blightstep pathway // searstep pathway");
    } finally {
      // @ts-expect-error restore
      globalThis.fetch = originalFetch;
    }
  });

  test("overlay compute reuses cards index loader", async () => {
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
      const entries = [
        { name: "Llanowar Elves" },
        { name: "Forest" },
        { name: "Llanowar Elves" },
      ];
      await computeSemanticOverlayFromDeckEntries(entries, lookupCard);
      await computeSemanticOverlayFromDeckEntries(entries, lookupCard);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      // @ts-expect-error restore
      globalThis.fetch = originalFetch;
    }
  });

  test("listCardsIndexRecords lists records from mocked payload in deterministic canonical-name order", async () => {
    const originalFetch = globalThis.fetch;
    const gz = pako.gzip(JSON.stringify(listPayload));
    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength),
    }));
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    try {
      __testing.clearCache();
      const records = await listCardsIndexRecords();
      expect(records.map((record) => record.name)).toEqual(["Alpha", "Beta"]);
      expect(records[0].name_norm).toBe("alpha");
      expect(records[1].name_norm).toBe("beta");
      expect(records[0].keywords).toEqual(["Cantrip", "Draw"]);
      expect(records[1].keywords).toBeUndefined();
    } finally {
      // @ts-expect-error restore
      globalThis.fetch = originalFetch;
    }
  });

  test("listCardsIndexRecords respects limit and returns [] for limit <= 0", async () => {
    const originalFetch = globalThis.fetch;
    const gz = pako.gzip(JSON.stringify(listPayload));
    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength),
    }));
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    try {
      __testing.clearCache();
      const limited = await listCardsIndexRecords({ limit: 1 });
      expect(limited.map((record) => record.name)).toEqual(["Alpha"]);

      const zero = await listCardsIndexRecords({ limit: 0 });
      expect(zero).toEqual([]);
    } finally {
      // @ts-expect-error restore
      globalThis.fetch = originalFetch;
    }
  });

  test("listCardsIndexRecords includes empty/null oracle text when includeEmptyOracleText is true", async () => {
    const originalFetch = globalThis.fetch;
    const gz = pako.gzip(JSON.stringify(listPayload));
    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength),
    }));
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    try {
      __testing.clearCache();
      const records = await listCardsIndexRecords({ includeEmptyOracleText: true, limit: 10 });
      expect(records.map((record) => record.name)).toEqual(["Alpha", "Beta", "Gamma", "Zeta"]);
    } finally {
      // @ts-expect-error restore
      globalThis.fetch = originalFetch;
    }
  });

  test("listCardsIndexRecords reuses existing cache for repeated calls with same baseUrl", async () => {
    const originalFetch = globalThis.fetch;
    const gz = pako.gzip(JSON.stringify(listPayload));
    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength),
    }));
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    try {
      __testing.clearCache();
      await listCardsIndexRecords({ baseUrl: "http://x.test" });
      await listCardsIndexRecords({ baseUrl: "http://x.test" });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      // @ts-expect-error restore
      globalThis.fetch = originalFetch;
    }
  });

  test("cards-index cache key treats equivalent same-origin baseUrl forms as one material load", async () => {
    const originalFetch = globalThis.fetch;
    const gz = pako.gzip(JSON.stringify(listPayload));
    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength),
    }));
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;
    vi.stubGlobal("location", { origin: "http://local.test" });

    try {
      __testing.clearCache();
      await listCardsIndexRecords();
      await listCardsIndexRecords({ baseUrl: "http://local.test" });
      await listCardsIndexRecords({ baseUrl: "http://local.test/" });

      expect(__testing.getCardsIndexCacheKey()).toBe("http://local.test");
      expect(__testing.getCardsIndexCacheKey("http://local.test/")).toBe("http://local.test");
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(__testing.getMaterialLoadCounters()).toEqual({
        fetch: 1,
        decompression: 1,
        jsonParse: 1,
      });
    } finally {
      // @ts-expect-error restore
      globalThis.fetch = originalFetch;
      vi.unstubAllGlobals();
    }
  });

  test("cards-index cache key keeps different origins isolated and failed loads retry", async () => {
    const originalFetch = globalThis.fetch;
    const gz = pako.gzip(JSON.stringify(listPayload));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength),
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength),
      });
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    try {
      __testing.clearCache();
      await listCardsIndexRecords({ baseUrl: "http://one.test" });
      await listCardsIndexRecords({ baseUrl: "http://two.test" });
      await expect(listCardsIndexRecords({ baseUrl: "http://retry.test" })).rejects.toThrow(
        "Failed to load cards_index.json.gz: 503",
      );
      await listCardsIndexRecords({ baseUrl: "http://retry.test" });

      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
        "http://one.test/data/cards_index.json.gz",
        "http://two.test/data/cards_index.json.gz",
        "http://retry.test/data/cards_index.json.gz",
        "http://retry.test/data/cards_index.json.gz",
      ]);
      expect(__testing.getCardsIndexCacheKey("http://one.test")).not.toBe(
        __testing.getCardsIndexCacheKey("http://two.test"),
      );
    } finally {
      // @ts-expect-error restore
      globalThis.fetch = originalFetch;
    }
  });

  test("cards-index source identity is stable for the same loaded payload and atomic with listed records", async () => {
    const originalFetch = globalThis.fetch;
    const gz = pako.gzip(JSON.stringify(listPayload));
    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength),
    }));
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;
    vi.stubGlobal("location", { origin: "http://local.test" });

    try {
      __testing.clearCache();
      const first = await getCardsIndexRecordsSourceSnapshot({
        limit: 10,
        includeEmptyOracleText: false,
      });
      const second = await getCardsIndexRecordsSourceSnapshot({
        baseUrl: "http://local.test/",
        limit: 10,
        includeEmptyOracleText: false,
      });

      expect(first.sourceIdentity).toBe(second.sourceIdentity);
      expect(first.records.map((record) => record.name)).toEqual(["Alpha", "Beta"]);
      expect(second.records.map((record) => record.name)).toEqual(["Alpha", "Beta"]);
      expect(__testing.getCardsIndexSourceIdentityDiagnostic(first.sourceIdentity)).toMatchObject({
        cacheKey: "http://local.test",
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      // @ts-expect-error restore
      globalThis.fetch = originalFetch;
      vi.unstubAllGlobals();
    }
  });

  test("cards-index source identity differs by source and changes after cache clear reload", async () => {
    const originalFetch = globalThis.fetch;
    const gz = pako.gzip(JSON.stringify(listPayload));
    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength),
    }));
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    try {
      __testing.clearCache();
      const one = await __testing.getCardsIndexSourceIdentity("http://one.test");
      const two = await __testing.getCardsIndexSourceIdentity("http://two.test");
      expect(one).not.toBe(two);

      __testing.clearCache();
      const reloadedOne = await __testing.getCardsIndexSourceIdentity("http://one.test");
      expect(reloadedOne).not.toBe(one);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    } finally {
      // @ts-expect-error restore
      globalThis.fetch = originalFetch;
    }
  });

  test("cards-index failed load does not create a durable source identity", async () => {
    const originalFetch = globalThis.fetch;
    const gz = pako.gzip(JSON.stringify(listPayload));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength),
      });
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    try {
      __testing.clearCache();
      await expect(__testing.getCardsIndexSourceIdentity("http://retry.test")).rejects.toThrow(
        "Failed to load cards_index.json.gz: 500",
      );
      const identity = await __testing.getCardsIndexSourceIdentity("http://retry.test");
      expect(__testing.getCardsIndexSourceIdentityDiagnostic(identity)).toMatchObject({
        cacheKey: "http://retry.test",
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
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

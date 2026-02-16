import { expect, test } from "vitest";
import {
  decodeShareState,
  encodeShareState,
  exportShareJson,
  importShareJson,
} from "../share";
import type { DeckState } from "../domain/types";
import { canonicalizeShareState } from "../share/canonical";

const baseDeck: DeckState = {
  deck: {
    entries: [
      {
        name: "Lightning Bolt",
        name_norm: "lightning bolt",
        count: 4,
        role_primary: "UTILITY",
      },
      {
        name: "Mountain",
        name_norm: "mountain",
        count: 20,
        role_primary: "LAND",
      },
    ],
  },
};

test("roundtrip encode/decode matches canonical state", () => {
  const token = encodeShareState(baseDeck);
  const decoded = decodeShareState(token);
  const canonical = canonicalizeShareState(baseDeck);
  expect(decoded).toEqual(canonical);
});

test("merge duplicates by name_norm", () => {
  const ds: DeckState = {
    deck: {
      entries: [
        {
          name: "Lightning   Bolt",
          name_norm: "lightning   bolt",
          count: 2,
          role_primary: "UTILITY",
        },
        {
          name: "lightning bolt",
          name_norm: "lightning bolt",
          count: 3,
          role_primary: "UTILITY",
        },
      ],
    },
  };
  const decoded = decodeShareState(encodeShareState(ds));
  expect(decoded.deck.entries.length).toBe(1);
  expect(decoded.deck.entries[0].name_norm).toBe("lightning bolt");
  expect(decoded.deck.entries[0].count).toBe(5);
});

test("token is URL-safe", () => {
  const token = encodeShareState(baseDeck);
  expect(token.includes("+")).toBe(false);
  expect(token.includes("/")).toBe(false);
  expect(token.includes("=")).toBe(false);
});

test("defaults for edges and pipelines_active", () => {
  const token = encodeShareState(baseDeck);
  const decoded = decodeShareState(token);
  expect(decoded.edges).toEqual([]);
  expect(decoded.pipelines_active).toEqual([]);
});

test("schema_version defaulted to 1 when missing", () => {
  const json = exportShareJson(baseDeck);
  const parsed = JSON.parse(json);
  delete parsed.schema_version;
  const ds = importShareJson(JSON.stringify(parsed));
  expect(ds.schema_version).toBe(1);
});

test("decodeShareState returns schema_version", () => {
  const token = encodeShareState(baseDeck);
  const decoded = decodeShareState(token);
  expect(decoded.schema_version).toBe(1);
});

test("works without Buffer", () => {
  const original = (globalThis as { Buffer?: unknown }).Buffer;
  (globalThis as { Buffer?: unknown }).Buffer = undefined;
  try {
    const token = encodeShareState(baseDeck);
    const decoded = decodeShareState(token);
    expect(decoded.schema_version).toBe(1);
  } finally {
    (globalThis as { Buffer?: unknown }).Buffer = original;
  }
});

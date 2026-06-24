import { expect, test } from "vitest";
import { readFileSync } from "node:fs";

import { decodeShareState, encodeShareState } from "../../../engine";
import { exportJson, importJson } from "../state/jsonFallback";
import {
  buildShareUrl,
  getShareTokenFromUrl,
  setShareTokenInUrl,
} from "../state/shareUrl";
import { copyToClipboard } from "../state/copyToClipboard";
import type { DeckState } from "../../../engine";

const deckState: DeckState = {
  deck: {
    entries: [
      {
        name: "Mountain",
        name_norm: "mountain",
        count: 20,
        role_primary: "LAND",
      },
    ],
  },
};

test("URL token roundtrip helper", () => {
  const token = encodeShareState(deckState);
  const url = setShareTokenInUrl(
    new URL("https://x.test/es/analizador-de-mazos-mtg/"),
    token,
  );
  const token2 = getShareTokenFromUrl(url);
  expect(token2).toBe(token);
});

test("Deep-link decode includes schema_version", () => {
  const token = encodeShareState(deckState);
  const url = setShareTokenInUrl(
    new URL("https://x.test/es/analizador-de-mazos-mtg/"),
    token,
  );
  const token2 = getShareTokenFromUrl(url) as string;
  const decoded = decodeShareState(token2);
  expect(decoded.schema_version).toBe(1);
});

test("Fallback JSON roundtrip", () => {
  const json = exportJson(deckState);
  const ds2 = importJson(json);
  expect(ds2.schema_version).toBe(1);
});

test("buildShareUrl preserves path and adds token", () => {
  const token = encodeShareState(deckState);
  const url = buildShareUrl(
    new URL("https://x.test/es/analizador-de-mazos-mtg/"),
    token,
  );
  expect(url).toContain("/es/analizador-de-mazos-mtg/");
  expect(url).toContain(`s=${token}`);
});

test("copy helper does not throw without clipboard", async () => {
  const nav = (globalThis as { navigator?: Navigator }).navigator;
  const clipboardDesc = nav
    ? Object.getOwnPropertyDescriptor(nav, "clipboard")
    : undefined;
  const canRedefine = !!clipboardDesc?.configurable || !!clipboardDesc?.writable;
  if (nav && canRedefine) {
    Object.defineProperty(nav, "clipboard", {
      value: undefined,
      configurable: true,
      writable: true,
    });
  }
  try {
    const ok = await copyToClipboard("x");
    expect(typeof ok).toBe("boolean");
  } finally {
    if (nav && clipboardDesc && canRedefine) {
      Object.defineProperty(nav, "clipboard", clipboardDesc);
    }
  }
});

test("semantic comparison visible surface keeps Version B optional and avoids strength claims", () => {
  const source = readFileSync(
    new URL("../AnalyzerApp.tsx", import.meta.url),
    "utf8",
  );
  expect(source).toContain("Comparación semántica");
  expect(source).toContain("Versión B (opcional)");
  expect(source).toContain("veredicto de fuerza competitiva");
  expect(source).toContain('data-testid="semantic-comparison-result"');
});

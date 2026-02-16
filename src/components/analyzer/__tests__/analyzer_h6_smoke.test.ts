import { expect, test } from "vitest";
import { decodeShareState, encodeShareState } from "../../../engine";
import { exportJson, importJson } from "../state/jsonFallback";
import { getShareTokenFromUrl, setShareTokenInUrl } from "../state/shareUrl";
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

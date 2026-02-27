import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../../cards/normalize";
import type { CardRecordMin } from "../../cards/types";
import { computeSemanticOverlayFromDeckEntries } from "../overlay/sem_overlay_compute";

type CardsIndexPayload = {
  by_name?: Record<string, { oracle_text?: string | null; type_line?: string | null }>;
  by_name_norm?: Record<string, string>;
};

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");

function loadCardsIndex(): CardsIndexPayload {
  const gz = readFileSync(cardsIndexPath);
  const json = gunzipSync(gz).toString("utf8");
  return JSON.parse(json) as CardsIndexPayload;
}

function findCanonicalName(payload: CardsIndexPayload, name: string): string | null {
  const byName = payload.by_name ?? {};
  const byNameNorm = payload.by_name_norm ?? {};
  if (byName[name]) return name;
  const norm = normalizeCardName(name);
  const canonical = byNameNorm[norm];
  if (canonical && byName[canonical]) return canonical;
  if (!name.includes("//")) {
    const prefix = `${norm} //`;
    const matches = Object.entries(byNameNorm)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => value)
      .filter((value) => value && byName[value]);
    if (matches.length === 1) return matches[0];
  }
  return null;
}

function createLocalLookup(payload: CardsIndexPayload) {
  return async (name: string): Promise<CardRecordMin | null> => {
    const canonical = findCanonicalName(payload, name);
    if (!canonical) return null;
    const record = payload.by_name?.[canonical];
    if (!record) return null;
    return {
      name: canonical,
      name_norm: normalizeCardName(canonical),
      type_line: record.type_line ?? null,
      oracle_text: record.oracle_text ?? null,
    };
  };
}

describe("semantic overlay compute: real deck integration", () => {
  it("computes deterministic overlay from a real deck list", async () => {
    const payload = loadCardsIndex();
    const lookupLocal = createLocalLookup(payload);
    const deckNames = [
      "Bloodtithe Harvester",
      "Bloodtithe Harvester",
      "Fable of the Mirror-Breaker",
      "Fable of the Mirror-Breaker",
      "Thoughtseize",
      "Thoughtseize",
      "Fatal Push",
      "Fatal Push",
      "Fatal Push",
      "Mayhem Devil",
      "Mayhem Devil",
      "Cauldron Familiar",
      "Cauldron Familiar",
      "Witch's Oven",
      "Witch's Oven",
      "Village Rites",
      "Deadly Dispute",
      "Claim the Firstborn",
      "Kroxa, Titan of Death's Hunger",
      "Kroxa, Titan of Death's Hunger",
      "Bedevil",
      "Kolaghan's Command",
      "Lightning Bolt",
      "Terminate",
      "Go for the Throat",
      "Seasoned Pyromancer",
      "Ob Nixilis, the Adversary",
      "The Meathook Massacre",
      "Reckoner Bankbuster",
      "Unlicensed Hearse",
      "Blood Crypt",
      "Blood Crypt",
      "Blood Crypt",
      "Mountain",
      "Mountain",
      "Mountain",
      "Swamp",
      "Swamp",
      "Swamp",
      "Castle Locthwain",
      "Den of the Bugbear",
      "Bloodstained Mire",
      "Bloodstained Mire",
      "Not A Real Card",
      "Imaginary Rakdos",
    ];
    const entries = deckNames.map((name) => ({ name }));
    const uniqueNamesCount = new Set(deckNames).size;

    const resultA = await computeSemanticOverlayFromDeckEntries(entries, lookupLocal);
    const resultB = await computeSemanticOverlayFromDeckEntries(entries, lookupLocal);

    expect(resultA.deckEntriesCount).toBe(entries.length);
    expect(resultA.resolvedUnique + resultA.missingUnique).toBe(uniqueNamesCount);
    expect(resultA.metrics.card_count).toBeGreaterThan(0);
    expect(resultA.metrics.card_count).toBe(Object.keys(resultA.idToName).length);
    expect(resultA.metrics.semantic_coverage).toBeGreaterThanOrEqual(0);
    expect(resultA.metrics.semantic_coverage).toBeLessThanOrEqual(1);

    expect(resultA).toEqual(resultB);
    expect(resultA.edgesTop).toEqual(resultB.edgesTop);
    expect(resultA.edgesTop.length).toBeLessThanOrEqual(10);
    for (const edge of resultA.edgesTop) {
      expect(edge.from).not.toBe(edge.to);
    }
  });
});

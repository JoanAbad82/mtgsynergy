import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../../cards/normalize";
import type { CardRecordMin } from "../../cards/types";
import { debugSemanticFlowForDeck } from "../overlay/sem_debug_flow";

type CardsIndexPayload = {
  by_name?: Record<string, { oracle_text?: string | null; type_line?: string | null }>;
  by_name_norm?: Record<string, string>;
};

type DeckPayload = {
  name: string;
  entries: string[];
};

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");
const spellsDeckPath = join(here, "../../../../tools/semantics/gold/sem_gold_v3_deck_spells_matter.json");

function loadCardsIndex(): CardsIndexPayload {
  const gz = readFileSync(cardsIndexPath);
  const json = gunzipSync(gz).toString("utf8");
  return JSON.parse(json) as CardsIndexPayload;
}

function loadDeck(path: string): DeckPayload {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as DeckPayload;
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

async function runDeck(path: string) {
  const payload = loadCardsIndex();
  const deck = loadDeck(path);
  const entries = deck.entries.map((name) => ({ name }));
  const lookupLocal = createLocalLookup(payload);
  return debugSemanticFlowForDeck({ entries, lookup: lookupLocal });
}

describe("semantic debug flow (spells matter)", () => {
  it("emits debug report with unmatched signals", async () => {
    const report = await runDeck(spellsDeckPath);
    console.log(JSON.stringify(report, null, 2));

    expect(report.producedByCard.length).toBeGreaterThan(0);
    expect(report.consumedByCard.length).toBeGreaterThan(0);
    expect(report.unmatchedProduced.length + report.unmatchedConsumed.length).toBeGreaterThan(0);
  });
});

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../../cards/normalize";
import type { CardRecordMin } from "../../cards/types";
import { computeSemanticOverlayFromDeckEntries } from "../overlay/sem_overlay_compute";
import { explainKey } from "../overlay/sem_profile";

type CardsIndexPayload = {
  by_name?: Record<string, { oracle_text?: string | null; type_line?: string | null }>;
  by_name_norm?: Record<string, string>;
};

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");

const deckList: Array<{ name: string; count: number }> = [
  { name: "Ajani's Pridemate", count: 4 },
  { name: "Voice of the Blessed", count: 4 },
  { name: "Trelasarra, Moon Dancer", count: 4 },
  { name: "Revitalize", count: 4 },
];

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

function buildDeckEntries(): Array<{ name: string }> {
  return deckList.flatMap((entry) =>
    Array.from({ length: entry.count }, () => ({ name: entry.name })),
  );
}

function hasSignalInEdges(
  edges: Array<{ reasons: Array<{ key: number }> }>,
  patterns: string[],
): boolean {
  return edges.some((edge) =>
    edge.reasons.some((reason) =>
      patterns.some((pattern) => explainKey(reason.key).includes(pattern)),
    ),
  );
}

function hasSignalInBucket(
  bucket: Array<{ explain: string }>,
  patterns: string[],
): boolean {
  return bucket.some((row) => patterns.some((pattern) => row.explain.includes(pattern)));
}

describe("semantic overlay life gain add counters diagnose", () => {
  it("diagnoses LIFE_GAIN / ADD_COUNTERS closure in current overlay state", async () => {
    const payload = loadCardsIndex();
    const lookup = createLocalLookup(payload);
    const entries = buildDeckEntries();
    const result = await computeSemanticOverlayFromDeckEntries(entries, lookup);

    expect(result.edgesTop.length).toBeGreaterThan(0);

    const signals = {
      LIFE_GAIN_FAMILY: ["ACTION:GAIN_LIFE", "EVENT:LIFE_GAIN"],
      ADD_COUNTERS: ["ACTION:ADD_COUNTERS"],
    };

    const buckets = Object.fromEntries(
      Object.entries(signals).map(([label, patterns]) => [
        label,
        {
          inTopEdges: hasSignalInEdges(result.edgesTop, patterns),
          inOrphanListeners: hasSignalInBucket(result.metrics.orphan_listeners, patterns),
          inExcessProducers: hasSignalInBucket(result.metrics.excess_producers, patterns),
        },
      ]),
    );

    expect(
      buckets.LIFE_GAIN_FAMILY.inTopEdges ||
        buckets.LIFE_GAIN_FAMILY.inExcessProducers ||
        buckets.LIFE_GAIN_FAMILY.inOrphanListeners,
    ).toBe(true);

    expect(
      buckets.ADD_COUNTERS.inTopEdges ||
        buckets.ADD_COUNTERS.inExcessProducers ||
        buckets.ADD_COUNTERS.inOrphanListeners,
    ).toBe(true);

    console.log(
      JSON.stringify(
        {
          topEdges: result.edgesTop.slice(0, 12),
          buckets,
          orphan_listeners: result.metrics.orphan_listeners,
          excess_producers: result.metrics.excess_producers,
        },
        null,
        2,
      ),
    );
  });
});

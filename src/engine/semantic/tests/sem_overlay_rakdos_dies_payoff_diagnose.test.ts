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
  { name: "Shambling Ghast", count: 4 },
  { name: "Persistent Specimen", count: 4 },
  { name: "Blood Artist", count: 4 },
  { name: "Goblin Bombardment", count: 4 },
  { name: "Village Rites", count: 4 },
  { name: "Deadly Dispute", count: 4 },
  { name: "Experimental Synthesizer", count: 4 },
  { name: "Oni-Cult Anvil", count: 4 },
  { name: "Howling Mine", count: 4 },
  { name: "Darksteel Ingot", count: 4 },
  { name: "Swamp", count: 10 },
  { name: "Mountain", count: 10 },
  { name: "Bloodfell Caves", count: 4 },
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

describe("semantic overlay rakdos dies payoff diagnose", () => {
  it("diagnoses CREATURE_DIES payoff closure in current overlay state", async () => {
    const payload = loadCardsIndex();
    const lookup = createLocalLookup(payload);
    const entries = buildDeckEntries();
    const result = await computeSemanticOverlayFromDeckEntries(entries, lookup);

    expect(result.edgesTop.length).toBeGreaterThan(0);

    const diesListener = hasSignalInBucket(result.metrics.orphan_listeners, ["EVENT:CREATURE_DIES"]);
    const diesInEdges = hasSignalInEdges(result.edgesTop, ["EVENT:CREATURE_DIES"]);

    const payoffSignals = {
      LOSE_LIFE: ["ACTION:LOSE_LIFE", "EVENT:LIFE_LOSS"],
      DEAL_DAMAGE: ["ACTION:DEAL_DAMAGE"],
      LIFE_GAIN: ["ACTION:GAIN_LIFE", "EVENT:LIFE_GAIN"],
    };

    const payoffBuckets = Object.fromEntries(
      Object.entries(payoffSignals).map(([label, patterns]) => [
        label,
        {
          inTopEdges: hasSignalInEdges(result.edgesTop, patterns),
          inOrphanListeners: hasSignalInBucket(result.metrics.orphan_listeners, patterns),
          inExcessProducers: hasSignalInBucket(result.metrics.excess_producers, patterns),
        },
      ]),
    );

    const payoffProduced = Object.values(payoffBuckets).some(
      (bucket) => bucket.inTopEdges || bucket.inExcessProducers,
    );

    let diagnosis: "A" | "B" | "C" | "resolved" | "unknown" = "unknown";
    if (diesListener && !payoffProduced) {
      diagnosis = "A";
    } else if (!diesListener && payoffProduced) {
      diagnosis = "B";
    } else if (diesListener && payoffProduced && !diesInEdges) {
      diagnosis = "C";
    } else if (diesInEdges) {
      diagnosis = "resolved";
    }

    console.log("Rakdos dies payoff buckets:", {
      CREATURE_DIES_LISTENER: diesListener,
      CREATURE_DIES_IN_TOP_EDGES: diesInEdges,
      payoffBuckets,
      diagnosis,
    });

    expect(diagnosis).not.toBe("unknown");
    expect(result.metrics.orphan_listeners).toBeTruthy();
    expect(result.metrics.excess_producers).toBeTruthy();
  });
});

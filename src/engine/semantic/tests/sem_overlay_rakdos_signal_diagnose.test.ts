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

function explainEdgeReasons(reasons: Array<{ key: number; weight: number }>): string[] {
  return reasons.map((reason) => `${explainKey(reason.key)}:${reason.weight}`);
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

describe("semantic overlay rakdos signal diagnose", () => {
  it("diagnoses current top semantic edges for the Rakdos test deck", async () => {
    const payload = loadCardsIndex();
    const lookup = createLocalLookup(payload);
    const entries = buildDeckEntries();
    const result = await computeSemanticOverlayFromDeckEntries(entries, lookup);

    expect(result.edgesTop.length).toBeGreaterThan(0);

    const topEdges = result.edgesTop.map((edge) => ({
      from: result.idToName[edge.from],
      to: result.idToName[edge.to],
      score: edge.score,
      reasons: explainEdgeReasons(edge.reasons),
    }));

    console.log("Rakdos top edges:", topEdges);

    const etbInTop = hasSignalInEdges(result.edgesTop, ["EVENT:ENTERS_BATTLEFIELD"]);
    expect(etbInTop).toBe(true);
  });

  it("diagnoses orphan listeners and excess producers for sacrifice/dies/draw/life signals", async () => {
    const payload = loadCardsIndex();
    const lookup = createLocalLookup(payload);
    const entries = buildDeckEntries();
    const result = await computeSemanticOverlayFromDeckEntries(entries, lookup);

    const signals = {
      SACRIFICE: ["EVENT:SACRIFICE"],
      CREATURE_DIES: ["EVENT:CREATURE_DIES"],
      DRAW: ["ACTION:DRAW_CARDS", "EVENT:DRAW_EXTRA_CARD_TURN"],
      LIFE_GAIN: ["ACTION:GAIN_LIFE", "EVENT:LIFE_GAIN"],
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

    console.log("Rakdos signal buckets:", buckets);

    expect(result.metrics.orphan_listeners).toBeTruthy();
    expect(result.metrics.excess_producers).toBeTruthy();
  });

  it("explains why enters_battlefield outranks sacrifice family in current overlay state", async () => {
    const payload = loadCardsIndex();
    const lookup = createLocalLookup(payload);
    const entries = buildDeckEntries();
    const result = await computeSemanticOverlayFromDeckEntries(entries, lookup);

    const etbInTop = hasSignalInEdges(result.edgesTop, ["EVENT:ENTERS_BATTLEFIELD"]);
    const sacrificeInTop = hasSignalInEdges(result.edgesTop, ["EVENT:SACRIFICE"]);
    const diesInTop = hasSignalInEdges(result.edgesTop, ["EVENT:CREATURE_DIES"]);
    const drawInTop = hasSignalInEdges(result.edgesTop, ["ACTION:DRAW_CARDS", "EVENT:DRAW_EXTRA_CARD_TURN"]);
    const lifeGainInTop = hasSignalInEdges(result.edgesTop, ["ACTION:GAIN_LIFE", "EVENT:LIFE_GAIN"]);

    console.log("Top edges signal presence:", {
      ENTERS_BATTLEFIELD: etbInTop,
      SACRIFICE: sacrificeInTop,
      CREATURE_DIES: diesInTop,
      DRAW: drawInTop,
      LIFE_GAIN: lifeGainInTop,
    });

    expect(etbInTop).toBe(true);
    expect(sacrificeInTop).toBe(false);
    expect(diesInTop).toBe(false);
    expect(drawInTop).toBe(false);
    expect(lifeGainInTop).toBe(false);
  });
});

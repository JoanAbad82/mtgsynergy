import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../../cards/normalize";
import type { CardRecordMin } from "../../cards/types";
import { ActionId, EventId } from "../contract";
import { buildSemanticCoverageReport } from "../overlay/sem_coverage_report";
import { computeSemanticOverlayFromDeckEntries } from "../overlay/sem_overlay_compute";
import { explainKey, explainKeyHuman, KeyKind, keyOf } from "../overlay/sem_profile";

type CardsIndexPayload = {
  by_name?: Record<string, { oracle_text?: string | null; type_line?: string | null }>;
  by_name_norm?: Record<string, string>;
};

type CanonicalDeck = {
  name: string;
  entries: string[];
};

type CanonicalSnapshot = {
  name: string;
  resolvedUnique: number;
  missingUnique: number;
  edgesTopCount: number;
  totalEdgeScore: number;
  coveragePct: number;
  labels: string[];
  rawReasons: string[];
  targeted: {
    hasCastSpellReason: boolean;
    hasCreatureSpellLabel: boolean;
    hasInstantSorceryFallbackLabel: boolean;
    hasDrawSecondReason: boolean;
    hasCreatureDiesReason: boolean;
    hasCreateTokenReason: boolean;
    hasEtbReason: boolean;
    hasDealDamageReason: boolean;
  };
  uncoveredNonLand: Array<{ name: string; reasonId: string }>;
};

type CanonicalRun = {
  overlay: Awaited<ReturnType<typeof computeSemanticOverlayFromDeckEntries>>;
  coverage: Awaited<ReturnType<typeof buildSemanticCoverageReport>>;
  snapshot: CanonicalSnapshot;
};

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");
const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);

const CANONICAL_DECKS: Record<
  "elvesRamp" | "spellsMatter" | "drawSecond" | "sacrificeDies" | "tokensEtb",
  CanonicalDeck
> = {
  elvesRamp: {
    name: "elves_ramp_creature_spell_payoff_v1",
    entries: [
      "Llanowar Elves",
      "Elvish Mystic",
      "Fyndhorn Elves",
      "Heritage Druid",
      "Elvish Archdruid",
      "Beast Whisperer",
      "Elvish Visionary",
      "Dwynen's Elite",
      "Leaf-Crowned Visionary",
      "Nettle Sentinel",
    ],
  },
  spellsMatter: {
    name: "spells_matter_v3",
    entries: [
      "Young Pyromancer",
      "Guttersnipe",
      "Thermo-Alchemist",
      "Opt",
      "Shock",
      "Lightning Bolt",
      "Consider",
    ],
  },
  drawSecond: {
    name: "draw_second_v3",
    entries: [
      "Irencrag Pyromancer",
      "Improbable Alliance",
      "Minn, Wily Illusionist",
      "Opt",
      "Consider",
      "Brainstorm",
      "Divination",
    ],
  },
  sacrificeDies: {
    name: "rakdos_dies_payoff_v1",
    entries: [
      "Cauldron Familiar",
      "Witch's Oven",
      "Mayhem Devil",
      "Claim the Firstborn",
      "Village Rites",
      "Blood Artist",
    ],
  },
  tokensEtb: {
    name: "tokens_etb_v3",
    entries: [
      "Raise the Alarm",
      "Dragon Fodder",
      "Krenko's Command",
      "Saproling Migration",
      "Lingering Souls",
      "Impact Tremors",
      "Soul Warden",
      "Cathars' Crusade",
      "Mirkwood Bats",
    ],
  },
};

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

function computeReasonLabels(
  edge: (Awaited<ReturnType<typeof computeSemanticOverlayFromDeckEntries>>)["edgesTop"][number],
): Array<{ raw: string; label: string }> {
  const reasonKeys = edge.reasons.map((reason) => reason.key);
  return edge.reasons.map((reason) => {
    const raw = explainKey(reason.key);
    const label = explainKeyHuman(reason.key, reasonKeys, {
      cast_spell_context: edge.cast_spell_context,
    });
    return { raw, label };
  });
}

function buildCanonicalSnapshot(
  deck: CanonicalDeck,
  overlay: Awaited<ReturnType<typeof computeSemanticOverlayFromDeckEntries>>,
  coverage: Awaited<ReturnType<typeof buildSemanticCoverageReport>>,
): CanonicalSnapshot {
  const allReasons = overlay.edgesTop.flatMap((edge) => computeReasonLabels(edge));
  const labels = Array.from(new Set(allReasons.map((reason) => reason.label))).sort((a, b) =>
    a.localeCompare(b),
  );
  const rawReasons = Array.from(new Set(allReasons.map((reason) => reason.raw))).sort((a, b) =>
    a.localeCompare(b),
  );
  const uncoveredNonLand = [...coverage.uncoveredNonLand]
    .sort((a, b) => {
      if (a.reasonId !== b.reasonId) return a.reasonId.localeCompare(b.reasonId);
      return a.name.localeCompare(b.name);
    })
    .map((row) => ({ name: row.name, reasonId: row.reasonId }));

  return {
    name: deck.name,
    resolvedUnique: overlay.resolvedUnique,
    missingUnique: overlay.missingUnique,
    edgesTopCount: overlay.edgesTop.length,
    totalEdgeScore: overlay.metrics.total_edge_score,
    coveragePct: coverage.coveragePct,
    labels,
    rawReasons,
    targeted: {
      hasCastSpellReason: rawReasons.includes("EVENT:CAST_SPELL"),
      hasCreatureSpellLabel: labels.includes("Lanzas un hechizo de criatura (experimental)"),
      hasInstantSorceryFallbackLabel: labels.includes("Lanzas instantáneo o conjuro (experimental)"),
      hasDrawSecondReason: rawReasons.includes("EVENT:DRAW_EXTRA_CARD_TURN"),
      hasCreatureDiesReason: rawReasons.includes("EVENT:CREATURE_DIES"),
      hasCreateTokenReason: rawReasons.includes("ACTION:CREATE_TOKEN"),
      hasEtbReason: rawReasons.includes("EVENT:ENTERS_BATTLEFIELD"),
      hasDealDamageReason: rawReasons.includes("ACTION:DEAL_DAMAGE"),
    },
    uncoveredNonLand,
  };
}

function findCardId(idToName: Record<number, string>, name: string): number | null {
  const target = normalizeCardName(name);
  for (const [rawId, cardName] of Object.entries(idToName)) {
    if (normalizeCardName(cardName) === target) {
      return Number(rawId);
    }
  }
  return null;
}

function findLocalCastDrawEdge(
  overlay: Awaited<ReturnType<typeof computeSemanticOverlayFromDeckEntries>>,
  cardName: string,
) {
  const cardId = findCardId(overlay.idToName, cardName);
  if (cardId == null) return null;
  return (
    overlay.edgesTop.find(
      (edge) =>
        edge.local_only &&
        edge.from === cardId &&
        edge.to === cardId &&
        edge.reasons.some((reason) => reason.key === castSpellKey) &&
        edge.reasons.some((reason) => reason.key === drawCardsKey),
    ) ?? null
  );
}

function castSpellLabelForEdge(
  edge: (Awaited<ReturnType<typeof computeSemanticOverlayFromDeckEntries>>)["edgesTop"][number],
): string {
  const reasonKeys = edge.reasons.map((reason) => reason.key);
  return explainKeyHuman(castSpellKey, reasonKeys, {
    cast_spell_context: edge.cast_spell_context,
  });
}

async function runCanonicalDeck(
  deck: CanonicalDeck,
  lookup: ReturnType<typeof createLocalLookup>,
): Promise<CanonicalRun> {
  const entries = deck.entries.map((name) => ({ name }));
  const overlay = await computeSemanticOverlayFromDeckEntries(entries, lookup);
  const coverage = await buildSemanticCoverageReport({ entries, lookup });
  const snapshot = buildCanonicalSnapshot(deck, overlay, coverage);
  return { overlay, coverage, snapshot };
}

describe("semantic canonical snapshot ring v1", () => {
  it("keeps elves/ramp creature-spell payoff context wiring stable", async () => {
    const lookup = createLocalLookup(loadCardsIndex());
    const runA = await runCanonicalDeck(CANONICAL_DECKS.elvesRamp, lookup);
    const runB = await runCanonicalDeck(CANONICAL_DECKS.elvesRamp, lookup);

    expect(runA.snapshot).toEqual(runB.snapshot);
    expect(runA.snapshot.resolvedUnique).toBeGreaterThanOrEqual(2);
    expect(runA.snapshot.missingUnique).toBe(0);

    const heritageId = findCardId(runA.overlay.idToName, "Heritage Druid");
    const beastId = findCardId(runA.overlay.idToName, "Beast Whisperer");
    expect(heritageId).not.toBeNull();
    expect(beastId).not.toBeNull();

    const beastEdge = findLocalCastDrawEdge(runA.overlay, "Beast Whisperer");
    expect(beastEdge).toBeTruthy();
    expect(beastEdge?.cast_spell_context).toBe("CREATURE_SPELL");

    const beastCastSpellLabel = castSpellLabelForEdge(beastEdge!);
    expect(beastCastSpellLabel).toBe("Lanzas un hechizo de criatura (experimental)");
    expect(beastCastSpellLabel).not.toBe("Lanzas instantáneo o conjuro (experimental)");
    expect(runA.snapshot.targeted.hasCreatureSpellLabel).toBe(true);
  });

  it("keeps spells-matter cast-spell fallback labeling and payoff signal", async () => {
    const lookup = createLocalLookup(loadCardsIndex());
    const runA = await runCanonicalDeck(CANONICAL_DECKS.spellsMatter, lookup);
    const runB = await runCanonicalDeck(CANONICAL_DECKS.spellsMatter, lookup);

    expect(runA.snapshot).toEqual(runB.snapshot);
    expect(runA.snapshot.missingUnique).toBe(0);
    expect(runA.snapshot.targeted.hasCastSpellReason).toBe(true);
    expect(runA.snapshot.targeted.hasDealDamageReason || runA.snapshot.totalEdgeScore > 0).toBe(true);
    expect(runA.snapshot.targeted.hasInstantSorceryFallbackLabel).toBe(true);
  });

  it("keeps draw-second ring signals visible under current contract", async () => {
    const lookup = createLocalLookup(loadCardsIndex());
    const runA = await runCanonicalDeck(CANONICAL_DECKS.drawSecond, lookup);
    const runB = await runCanonicalDeck(CANONICAL_DECKS.drawSecond, lookup);

    expect(runA.snapshot).toEqual(runB.snapshot);
    expect(runA.snapshot.missingUnique).toBe(0);
    expect(runA.snapshot.targeted.hasDrawSecondReason).toBe(true);

    const hasDrawSecondHumanLabel = runA.snapshot.labels.some(
      (label) =>
        label === "Robas cartas adicionales en el turno (experimental)" ||
        label === "Robas tu segunda carta del turno -> creas una ficha" ||
        label === "Robas tu segunda carta del turno -> haces daño",
    );
    expect(hasDrawSecondHumanLabel).toBe(true);
    expect(runA.snapshot.totalEdgeScore > 0 || runA.snapshot.edgesTopCount > 0).toBe(true);
  });

  it("keeps sacrifice/dies payoff closure signals without overasserting", async () => {
    const lookup = createLocalLookup(loadCardsIndex());
    const runA = await runCanonicalDeck(CANONICAL_DECKS.sacrificeDies, lookup);
    const runB = await runCanonicalDeck(CANONICAL_DECKS.sacrificeDies, lookup);

    expect(runA.snapshot).toEqual(runB.snapshot);
    expect(runA.snapshot.missingUnique).toBe(0);
    expect(runA.snapshot.edgesTopCount).toBeGreaterThan(0);

    const hasCreatureDiesSignal =
      runA.snapshot.targeted.hasCreatureDiesReason ||
      runA.overlay.metrics.orphan_listeners.some((row) => explainKey(row.key).includes("EVENT:CREATURE_DIES"));
    expect(hasCreatureDiesSignal).toBe(true);

    const payoffSignalPresent =
      runA.snapshot.targeted.hasDealDamageReason ||
      runA.snapshot.rawReasons.includes("ACTION:LOSE_LIFE") ||
      runA.snapshot.rawReasons.includes("ACTION:GAIN_LIFE");
    expect(payoffSignalPresent).toBe(true);
  });

  it("keeps tokens/ETB canonical signals stable", async () => {
    const lookup = createLocalLookup(loadCardsIndex());
    const runA = await runCanonicalDeck(CANONICAL_DECKS.tokensEtb, lookup);
    const runB = await runCanonicalDeck(CANONICAL_DECKS.tokensEtb, lookup);

    expect(runA.snapshot).toEqual(runB.snapshot);
    expect(runA.snapshot.missingUnique).toBe(0);
    expect(runA.snapshot.totalEdgeScore).toBeGreaterThan(0);
    expect(runA.snapshot.edgesTopCount).toBeGreaterThan(0);
    expect(
      runA.snapshot.targeted.hasCreateTokenReason ||
        runA.coverage.textTags.some((row) => row.tag === "TOKEN"),
    ).toBe(true);
    expect(runA.snapshot.targeted.hasEtbReason || runA.snapshot.rawReasons.includes("ACTION:GAIN_LIFE")).toBe(
      true,
    );
  });
});

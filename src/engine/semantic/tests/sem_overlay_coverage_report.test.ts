import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../../cards/normalize";
import type { CardRecordMin } from "../../cards/types";
import { buildSemanticCoverageReport } from "../overlay/sem_coverage_report";

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

async function runReport() {
  const payload = loadCardsIndex();
  const lookupLocal = createLocalLookup(payload);
  const entries = [
    { name: "Totally Fake Card" },
    { name: "Serra Angel" },
    { name: "Raise the Alarm" },
  ];
  return buildSemanticCoverageReport({ entries, lookup: lookupLocal });
}

describe("semantic overlay coverage report", () => {
  it("is deterministic and reports coverage gaps", async () => {
    const reportA = await runReport();
    const reportB = await runReport();
    expect(reportA).toEqual(reportB);

    expect(reportA.totalCardsWithOracle).toBe(2);
    expect(reportA.coveredCards).toBe(1);
    expect(reportA.coveragePct).toBe(50);

    expect(reportA.reasons.length).toBeGreaterThan(0);
    expect(reportA.reasons.map((r) => r.reasonId)).toEqual([
      "NO_MATCH_V1_TEMPLATES",
      "NO_ORACLE",
    ]);

    const noMatch = reportA.reasons.find((r) => r.reasonId === "NO_MATCH_V1_TEMPLATES");
    expect(noMatch?.count).toBe(1);
    expect(noMatch?.examples).toEqual(["Serra Angel"]);

    const noOracle = reportA.reasons.find((r) => r.reasonId === "NO_ORACLE");
    expect(noOracle?.count).toBe(1);
    expect(noOracle?.examples).toEqual(["Totally Fake Card"]);
  });

  it("buckets land no-match into land rules reason deterministically", async () => {
    const payload: CardsIndexPayload = {
      by_name: {
        "Mystic Hollow": {
          type_line: "Land",
          oracle_text: "{T}: Add {G}.",
        },
      },
      by_name_norm: {
        "mystic hollow": "Mystic Hollow",
      },
    };
    const lookupLocal = createLocalLookup(payload);
    const entries = [{ name: "Mystic Hollow" }];
    const reportA = await buildSemanticCoverageReport({ entries, lookup: lookupLocal });
    const reportB = await buildSemanticCoverageReport({ entries, lookup: lookupLocal });
    expect(reportA).toEqual(reportB);
    expect(reportA.reasons.map((r) => r.reasonId)).toEqual(["LAND_RULES_UNMODELED_V1"]);
    const landReason = reportA.reasons.find((r) => r.reasonId === "LAND_RULES_UNMODELED_V1");
    expect(landReason?.count).toBe(1);
    expect(landReason?.examples).toEqual(["Mystic Hollow"]);
  });

  it("exposes uncoveredNonLand deterministically", async () => {
    const payload: CardsIndexPayload = {
      by_name: {
        "Mystic Rebel": {
          type_line: "Creature — Rebel",
          oracle_text: "Flavor only.",
        },
        "Dusty Basin": {
          type_line: "Land",
          oracle_text: "{T}: Add {G}.",
        },
        "Blank Spell": {
          type_line: "Sorcery",
          oracle_text: "",
        },
      },
      by_name_norm: {
        "mystic rebel": "Mystic Rebel",
        "dusty basin": "Dusty Basin",
        "blank spell": "Blank Spell",
      },
    };
    const lookupLocal = createLocalLookup(payload);
    const entries = [
      { name: "Mystic Rebel" },
      { name: "Dusty Basin" },
      { name: "Blank Spell" },
      { name: "Missing Card" },
    ];
    const reportA = await buildSemanticCoverageReport({ entries, lookup: lookupLocal });
    const reportB = await buildSemanticCoverageReport({ entries, lookup: lookupLocal });
    expect(reportA).toEqual(reportB);
    expect(reportA.uncoveredNonLand).toEqual([
      { name: "Blank Spell", reasonId: "EMPTY_TEXT" },
      { name: "Mystic Rebel", reasonId: "NO_MATCH_V1_TEMPLATES" },
      { name: "Missing Card", reasonId: "NO_ORACLE" },
    ]);
  });

  it("covers Archpriest of Iona via search library template", async () => {
    const payload: CardsIndexPayload = {
      by_name: {
        "Archpriest of Iona": {
          type_line: "Creature — Human Cleric",
          oracle_text:
            "Archpriest of Iona gets +1/+1 for each creature you control. {3}{W}{W}: Search your library for a Cleric card, put it onto the battlefield, then shuffle.",
        },
      },
      by_name_norm: {
        "archpriest of iona": "Archpriest of Iona",
      },
    };
    const lookupLocal = createLocalLookup(payload);
    const entries = [{ name: "Archpriest of Iona" }];
    const report = await buildSemanticCoverageReport({ entries, lookup: lookupLocal });
    expect(report.coveredCards).toBe(1);
    expect(report.reasons.find((r) => r.reasonId === "NO_MATCH_V1_TEMPLATES")).toBeUndefined();
    expect(report.uncoveredNonLand.find((r) => r.name === "Archpriest of Iona")).toBeUndefined();
  });
});

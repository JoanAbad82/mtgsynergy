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
          oracle_text: "Mystic Hollow enters the battlefield tapped.",
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

  it("covers Archpriest of Iona via search library template without affecting nearby matching", async () => {
    const payload: CardsIndexPayload = {
      by_name: {
        "Archpriest of Iona": {
          type_line: "Creature — Human Cleric",
          oracle_text:
            "Archpriest of Iona gets +1/+1 for each creature you control. {3}{W}{W}: Search your library for a Cleric card, put it onto the battlefield, then shuffle.",
        },
        "Simple Bear": {
          type_line: "Creature — Bear",
          oracle_text: "Flavor only.",
        },
      },
      by_name_norm: {
        "archpriest of iona": "Archpriest of Iona",
        "simple bear": "Simple Bear",
      },
    };
    const lookupLocal = createLocalLookup(payload);
    const entries = [{ name: "Archpriest of Iona" }, { name: "Simple Bear" }];
    const reportA = await buildSemanticCoverageReport({ entries, lookup: lookupLocal });
    const reportB = await buildSemanticCoverageReport({ entries, lookup: lookupLocal });
    expect(reportA).toEqual(reportB);
    expect(reportA.coveredCards).toBe(1);
    const noMatch = reportA.reasons.find((r) => r.reasonId === "NO_MATCH_V1_TEMPLATES");
    expect(noMatch?.examples).toEqual(["Simple Bear"]);
    expect(reportA.uncoveredNonLand.find((r) => r.name === "Archpriest of Iona")).toBeUndefined();
    expect(reportA.uncoveredNonLand.find((r) => r.name === "Simple Bear")?.reasonId).toBe(
      "NO_MATCH_V1_TEMPLATES",
    );
  });

  it("covers Icy Manipulator via tap-target template without broadening matches", async () => {
    const payload: CardsIndexPayload = {
      by_name: {
        "Icy Manipulator": {
          type_line: "Artifact",
          oracle_text: "{1}, {T}: Tap target artifact, creature, or land.",
        },
        "Vanilla Adept": {
          type_line: "Creature — Human",
          oracle_text: "Flavor only.",
        },
      },
      by_name_norm: {
        "icy manipulator": "Icy Manipulator",
        "vanilla adept": "Vanilla Adept",
      },
    };
    const lookupLocal = createLocalLookup(payload);
    const entries = [{ name: "Icy Manipulator" }, { name: "Vanilla Adept" }];
    const reportA = await buildSemanticCoverageReport({ entries, lookup: lookupLocal });
    const reportB = await buildSemanticCoverageReport({ entries, lookup: lookupLocal });
    expect(reportA).toEqual(reportB);
    expect(reportA.coveredCards).toBe(1);
    const noMatch = reportA.reasons.find((r) => r.reasonId === "NO_MATCH_V1_TEMPLATES");
    expect(noMatch?.examples).toEqual(["Vanilla Adept"]);
    expect(reportA.uncoveredNonLand.find((r) => r.name === "Icy Manipulator")).toBeUndefined();
    expect(reportA.uncoveredNonLand.find((r) => r.name === "Vanilla Adept")?.reasonId).toBe(
      "NO_MATCH_V1_TEMPLATES",
    );
  });

  it("covers Crystal Ball via scry template without broadening matches", async () => {
    const payload: CardsIndexPayload = {
      by_name: {
        "Crystal Ball": {
          type_line: "Artifact",
          oracle_text: "{1}, {T}: Scry 2.",
        },
        "Vanilla Adept": {
          type_line: "Creature — Human",
          oracle_text: "Flavor only.",
        },
      },
      by_name_norm: {
        "crystal ball": "Crystal Ball",
        "vanilla adept": "Vanilla Adept",
      },
    };
    const lookupLocal = createLocalLookup(payload);
    const entries = [{ name: "Crystal Ball" }, { name: "Vanilla Adept" }];
    const reportA = await buildSemanticCoverageReport({ entries, lookup: lookupLocal });
    const reportB = await buildSemanticCoverageReport({ entries, lookup: lookupLocal });
    expect(reportA).toEqual(reportB);
    expect(reportA.coveredCards).toBe(1);
    const noMatch = reportA.reasons.find((r) => r.reasonId === "NO_MATCH_V1_TEMPLATES");
    expect(noMatch?.examples).toEqual(["Vanilla Adept"]);
    expect(reportA.uncoveredNonLand.find((r) => r.name === "Crystal Ball")).toBeUndefined();
    expect(reportA.uncoveredNonLand.find((r) => r.name === "Vanilla Adept")?.reasonId).toBe(
      "NO_MATCH_V1_TEMPLATES",
    );
  });

  it("covers Elvish Mystic via green mana template without broadening matches", async () => {
    const payload: CardsIndexPayload = {
      by_name: {
        "Elvish Mystic": {
          type_line: "Creature — Elf Druid",
          oracle_text: "{T}: Add {G}.",
        },
        "Vanilla Adept": {
          type_line: "Creature — Human",
          oracle_text: "Flavor only.",
        },
      },
      by_name_norm: {
        "elvish mystic": "Elvish Mystic",
        "vanilla adept": "Vanilla Adept",
      },
    };
    const lookupLocal = createLocalLookup(payload);
    const entries = [{ name: "Elvish Mystic" }, { name: "Vanilla Adept" }];
    const reportA = await buildSemanticCoverageReport({ entries, lookup: lookupLocal });
    const reportB = await buildSemanticCoverageReport({ entries, lookup: lookupLocal });
    expect(reportA).toEqual(reportB);
    expect(reportA.coveredCards).toBe(1);
    const noMatch = reportA.reasons.find((r) => r.reasonId === "NO_MATCH_V1_TEMPLATES");
    expect(noMatch?.examples).toEqual(["Vanilla Adept"]);
    expect(reportA.uncoveredNonLand.find((r) => r.name === "Elvish Mystic")).toBeUndefined();
    expect(reportA.uncoveredNonLand.find((r) => r.name === "Vanilla Adept")?.reasonId).toBe(
      "NO_MATCH_V1_TEMPLATES",
    );
  });

  it("covers Darksteel Ingot via any-color mana template without broadening matches", async () => {
    const payload: CardsIndexPayload = {
      by_name: {
        "Darksteel Ingot": {
          type_line: "Artifact",
          oracle_text: "{T}: Add one mana of any color.",
        },
        "Vanilla Adept": {
          type_line: "Creature — Human",
          oracle_text: "Flavor only.",
        },
      },
      by_name_norm: {
        "darksteel ingot": "Darksteel Ingot",
        "vanilla adept": "Vanilla Adept",
      },
    };
    const lookupLocal = createLocalLookup(payload);
    const entries = [{ name: "Darksteel Ingot" }, { name: "Vanilla Adept" }];
    const reportA = await buildSemanticCoverageReport({ entries, lookup: lookupLocal });
    const reportB = await buildSemanticCoverageReport({ entries, lookup: lookupLocal });
    expect(reportA).toEqual(reportB);
    expect(reportA.coveredCards).toBe(1);
    const noMatch = reportA.reasons.find((r) => r.reasonId === "NO_MATCH_V1_TEMPLATES");
    expect(noMatch?.examples).toEqual(["Vanilla Adept"]);
    expect(reportA.uncoveredNonLand.find((r) => r.name === "Darksteel Ingot")).toBeUndefined();
    expect(reportA.uncoveredNonLand.find((r) => r.name === "Vanilla Adept")?.reasonId).toBe(
      "NO_MATCH_V1_TEMPLATES",
    );
  });

  it("covers Gilded Lotus via any-one-color mana template without broadening matches", async () => {
    const payload: CardsIndexPayload = {
      by_name: {
        "Gilded Lotus": {
          type_line: "Artifact",
          oracle_text: "{T}: Add three mana of any one color.",
        },
        "Vanilla Adept": {
          type_line: "Creature — Human",
          oracle_text: "Flavor only.",
        },
      },
      by_name_norm: {
        "gilded lotus": "Gilded Lotus",
        "vanilla adept": "Vanilla Adept",
      },
    };
    const lookupLocal = createLocalLookup(payload);
    const entries = [{ name: "Gilded Lotus" }, { name: "Vanilla Adept" }];
    const reportA = await buildSemanticCoverageReport({ entries, lookup: lookupLocal });
    const reportB = await buildSemanticCoverageReport({ entries, lookup: lookupLocal });
    expect(reportA).toEqual(reportB);
    expect(reportA.coveredCards).toBe(1);
    const noMatch = reportA.reasons.find((r) => r.reasonId === "NO_MATCH_V1_TEMPLATES");
    expect(noMatch?.examples).toEqual(["Vanilla Adept"]);
    expect(reportA.uncoveredNonLand.find((r) => r.name === "Gilded Lotus")).toBeUndefined();
    expect(reportA.uncoveredNonLand.find((r) => r.name === "Vanilla Adept")?.reasonId).toBe(
      "NO_MATCH_V1_TEMPLATES",
    );
  });

  it("covers Worn Powerstone via colorless mana template without broadening matches", async () => {
    const payload: CardsIndexPayload = {
      by_name: {
        "Worn Powerstone": {
          type_line: "Artifact",
          oracle_text: "Worn Powerstone enters the battlefield tapped. {T}: Add {C}{C}.",
        },
        "Vanilla Adept": {
          type_line: "Creature — Human",
          oracle_text: "Flavor only.",
        },
      },
      by_name_norm: {
        "worn powerstone": "Worn Powerstone",
        "vanilla adept": "Vanilla Adept",
      },
    };
    const lookupLocal = createLocalLookup(payload);
    const entries = [{ name: "Worn Powerstone" }, { name: "Vanilla Adept" }];
    const reportA = await buildSemanticCoverageReport({ entries, lookup: lookupLocal });
    const reportB = await buildSemanticCoverageReport({ entries, lookup: lookupLocal });
    expect(reportA).toEqual(reportB);
    expect(reportA.coveredCards).toBe(1);
    const noMatch = reportA.reasons.find((r) => r.reasonId === "NO_MATCH_V1_TEMPLATES");
    expect(noMatch?.examples).toEqual(["Vanilla Adept"]);
    expect(reportA.uncoveredNonLand.find((r) => r.name === "Worn Powerstone")).toBeUndefined();
    expect(reportA.uncoveredNonLand.find((r) => r.name === "Vanilla Adept")?.reasonId).toBe(
      "NO_MATCH_V1_TEMPLATES",
    );
  });

  it("covers Howling Mine via exact wording template without broadening matches", async () => {
    const payload: CardsIndexPayload = {
      by_name: {
        "Howling Mine": {
          type_line: "Artifact",
          oracle_text:
            "At the beginning of each player's draw step, if Howling Mine is untapped, that player draws an additional card.",
        },
        "Vanilla Adept": {
          type_line: "Creature — Human",
          oracle_text: "Flavor only.",
        },
      },
      by_name_norm: {
        "howling mine": "Howling Mine",
        "vanilla adept": "Vanilla Adept",
      },
    };
    const lookupLocal = createLocalLookup(payload);
    const entries = [{ name: "Howling Mine" }, { name: "Vanilla Adept" }];
    const reportA = await buildSemanticCoverageReport({ entries, lookup: lookupLocal });
    const reportB = await buildSemanticCoverageReport({ entries, lookup: lookupLocal });
    expect(reportA).toEqual(reportB);
    expect(reportA.coveredCards).toBe(1);
    const noMatch = reportA.reasons.find((r) => r.reasonId === "NO_MATCH_V1_TEMPLATES");
    expect(noMatch?.examples).toEqual(["Vanilla Adept"]);
    expect(reportA.uncoveredNonLand.find((r) => r.name === "Howling Mine")).toBeUndefined();
    expect(reportA.uncoveredNonLand.find((r) => r.name === "Vanilla Adept")?.reasonId).toBe(
      "NO_MATCH_V1_TEMPLATES",
    );
  });

  it("covers Millstone via mill template without broadening matches", async () => {
    const payload: CardsIndexPayload = {
      by_name: {
        "Millstone": {
          type_line: "Artifact",
          oracle_text: "{2}, {T}: Target player mills two cards.",
        },
        "Vanilla Adept": {
          type_line: "Creature — Human",
          oracle_text: "Flavor only.",
        },
      },
      by_name_norm: {
        "millstone": "Millstone",
        "vanilla adept": "Vanilla Adept",
      },
    };
    const lookupLocal = createLocalLookup(payload);
    const entries = [{ name: "Millstone" }, { name: "Vanilla Adept" }];
    const reportA = await buildSemanticCoverageReport({ entries, lookup: lookupLocal });
    const reportB = await buildSemanticCoverageReport({ entries, lookup: lookupLocal });
    expect(reportA).toEqual(reportB);
    expect(reportA.coveredCards).toBe(1);
    const noMatch = reportA.reasons.find((r) => r.reasonId === "NO_MATCH_V1_TEMPLATES");
    expect(noMatch?.examples).toEqual(["Vanilla Adept"]);
    expect(reportA.uncoveredNonLand.find((r) => r.name === "Millstone")).toBeUndefined();
    expect(reportA.uncoveredNonLand.find((r) => r.name === "Vanilla Adept")?.reasonId).toBe(
      "NO_MATCH_V1_TEMPLATES",
    );
  });

  it("builds a deterministic priority shortlist for next v1 coverage uplifts", async () => {
    const payload = loadCardsIndex();
    const lookupLocal = createLocalLookup(payload);
    const candidateNames = [
    ];

    const entries = candidateNames.map((name) => ({ name }));
    const reportA = await buildSemanticCoverageReport({ entries, lookup: lookupLocal });
    const reportB = await buildSemanticCoverageReport({ entries, lookup: lookupLocal });
    expect(reportA).toEqual(reportB);

    const uncovered = reportA.uncoveredNonLand;
    expect(uncovered.map((r) => r.name).sort()).toEqual([...candidateNames].sort());
    uncovered.forEach((row) => {
      expect(row.reasonId).toBe("NO_MATCH_V1_TEMPLATES");
    });

    // Selection rule: prefer activated abilities, then triggered, then static; tie-break by name.
    const abilityRank = (text: string) => {
      if (/\b(when|whenever|at the beginning)\b/i.test(text)) return 2;
      if (/:/.test(text)) return 1;
      return 3;
    };

    const shortlist = candidateNames
      .map((name) => {
        const card = payload.by_name?.[name];
        expect(card).toBeTruthy();
        expect(/\bland\b/i.test(card?.type_line ?? "")).toBe(false);
        return {
          name,
          rank: abilityRank(card?.oracle_text ?? ""),
        };
      })
      .sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return a.name.localeCompare(b.name);
      })
      .map((row) => row.name);

    expect(shortlist).toEqual([
    ]);
  });
});

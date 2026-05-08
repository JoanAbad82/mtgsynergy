import { describe, expect, it } from "vitest";
import type { CardRecordMin } from "../../cards/types";
import { ActionId, EventId } from "../contract";
import { buildSemanticCoverageReport } from "../overlay/sem_coverage_report";
import { buildSemanticEdges } from "../overlay/sem_edges";
import { KeyKind, keyOf } from "../overlay/sem_profile";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";

function createLocalLookup(cards: ReadonlyArray<CardRecordMin>) {
  const byName = new Map(cards.map((card) => [card.name.toLowerCase(), card]));
  return async (name: string): Promise<CardRecordMin | null> => byName.get(name.toLowerCase()) ?? null;
}

describe("semantic elf mana dork / ramp bridge v1", () => {
  it("recognizes elf mana dorks and elf mana engines as activated PRODUCE_MANA abilities", () => {
    const rows = [
      {
        name: "Llanowar Elves",
        typeLine: "Creature — Elf Druid",
        oracleText: "{T}: Add {G}.",
      },
      {
        name: "Elvish Mystic",
        typeLine: "Creature — Elf Druid",
        oracleText: "{T}: Add {G}.",
      },
      {
        name: "Fyndhorn Elves",
        typeLine: "Creature — Elf Druid",
        oracleText: "{T}: Add {G}.",
      },
      {
        name: "Heritage Druid",
        typeLine: "Creature — Elf Druid",
        oracleText: "Tap three untapped Elves you control: Add {G}{G}{G}.",
      },
      {
        name: "Elvish Archdruid",
        typeLine: "Creature — Elf Druid",
        oracleText: "Other Elf creatures you control get +1/+1. {T}: Add {G} for each Elf you control.",
      },
    ] as const;

    for (const row of rows) {
      const ir = parseSemanticIrV0({
        name: row.name,
        type_line: row.typeLine,
        oracle_text: row.oracleText,
      });

      expect(
        ir.frames[0]?.do.some((effect) => effect.action === ActionId.PRODUCE_MANA),
        `${row.name} should emit PRODUCE_MANA`,
      ).toBe(true);

      const semanticHints = Reflect.get(ir, "semantic_hints") as
        | { mana_ability_min?: { class?: string } }
        | undefined;
      expect(semanticHints?.mana_ability_min?.class, `${row.name} should classify as MANA_ABILITY`).toBe(
        "MANA_ABILITY",
      );
    }
  });

  it("keeps Heritage Druid covered in semantic coverage report and out of uncovered non-land gaps", async () => {
    const lookup = createLocalLookup([
      {
        name: "Heritage Druid",
        name_norm: "heritage druid",
        type_line: "Creature — Elf Druid",
        oracle_text: "Tap three untapped Elves you control: Add {G}{G}{G}.",
      },
      {
        name: "Vanilla Adept",
        name_norm: "vanilla adept",
        type_line: "Creature — Human Wizard",
        oracle_text: "Flavor only.",
      },
    ]);

    const report = await buildSemanticCoverageReport({
      entries: [{ name: "Heritage Druid" }, { name: "Vanilla Adept" }],
      lookup,
    });

    expect(report.totalCardsWithOracle).toBe(2);
    expect(report.coveredCards).toBe(1);
    expect(report.uncoveredNonLand.some((row) => row.name === "Heritage Druid")).toBe(false);
    expect(
      report.uncoveredNonLand.find((row) => row.name === "Vanilla Adept")?.reasonId,
    ).toBe("NO_MATCH_V1_TEMPLATES");
  });

  it("creates a local CAST_SPELL -> DRAW_CARDS bridge for creature-spell payoff text (Beast Whisperer style)", () => {
    const oracleText = "Whenever you cast a creature spell, draw a card.";
    const ir = parseSemanticIrV0({
      name: "Beast Whisperer",
      type_line: "Creature — Elf Druid",
      oracle_text: oracleText,
    });
    ir.card_id = 1;

    const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
    const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);

    const edges = buildSemanticEdges([{ card_id: 1, ir, oracle_text: oracleText }], {
      includeLocalOnly: true,
    });

    const bridge = edges.find(
      (edge) =>
        edge.local_only &&
        edge.from === 1 &&
        edge.to === 1 &&
        edge.reasons.some((reason) => reason.key === castSpellKey) &&
        edge.reasons.some((reason) => reason.key === drawCardsKey),
    );

    expect(bridge).toBeTruthy();
  });
});

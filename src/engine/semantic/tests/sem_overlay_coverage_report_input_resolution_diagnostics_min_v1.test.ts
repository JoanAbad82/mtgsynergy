import { describe, expect, it } from "vitest";
import { buildSemanticCoverageReport } from "../overlay/sem_coverage_report";
import type { CardRecordMin } from "../../cards/types";

function createLookup(cards: ReadonlyArray<CardRecordMin>) {
  const byName = new Map(cards.map((card) => [card.name, card]));
  return async (name: string): Promise<CardRecordMin | null> => byName.get(name) ?? null;
}

describe("semantic coverage input resolution diagnostics min v1", () => {
  it("reports empty input resolution diagnostics when all unique cards resolve with oracle text", async () => {
    const report = await buildSemanticCoverageReport({
      entries: [{ name: "Elvish Mystic" }],
      lookup: createLookup([
        {
          id: 1,
          name: "Elvish Mystic",
          name_norm: "elvish mystic",
          oracle_text: "{T}: Add {G}.",
          type_line: "Creature — Elf Druid",
        },
      ]),
    });

    expect(report.inputResolution).toEqual({
      input_unique_count: 1,
      resolved_unique_count: 1,
      missing_unique_count: 0,
      unresolved_names: [],
      missing_oracle_names: [],
    });
  });

  it("separates unresolved names from records missing oracle text deterministically", async () => {
    const report = await buildSemanticCoverageReport({
      entries: [
        { name: "Zeta Missing Lookup" },
        { name: "Alpha Missing Oracle" },
        { name: "Elvish Mystic" },
        { name: "Zeta Missing Lookup" },
      ],
      lookup: createLookup([
        {
          id: 1,
          name: "Elvish Mystic",
          name_norm: "elvish mystic",
          oracle_text: "{T}: Add {G}.",
          type_line: "Creature — Elf Druid",
        },
        {
          id: 2,
          name: "Alpha Missing Oracle",
          name_norm: "alpha missing oracle",
          oracle_text: null,
          type_line: "Artifact",
        },
      ]),
    });

    expect(report.inputResolution).toEqual({
      input_unique_count: 3,
      resolved_unique_count: 2,
      missing_unique_count: 2,
      unresolved_names: ["Zeta Missing Lookup"],
      missing_oracle_names: ["Alpha Missing Oracle"],
    });

    expect(report.reasons.find((reason) => reason.reasonId === "NO_ORACLE")?.count).toBe(2);
  });

  it("preserves legacy coverage fields while adding input resolution diagnostics", async () => {
    const report = await buildSemanticCoverageReport({
      entries: [{ name: "Elvish Mystic" }, { name: "Totally Fake Card" }],
      lookup: createLookup([
        {
          id: 1,
          name: "Elvish Mystic",
          name_norm: "elvish mystic",
          oracle_text: "{T}: Add {G}.",
          type_line: "Creature — Elf Druid",
        },
      ]),
    });

    expect(report.totalCardsWithOracle).toBe(1);
    expect(report.coveredCards).toBe(1);
    expect(report.coveragePct).toBe(100);
    expect(report.uncoveredNonLand).toEqual([
      { name: "Totally Fake Card", reasonId: "NO_ORACLE" },
    ]);
    expect(report.inputResolution.unresolved_names).toEqual(["Totally Fake Card"]);
  });
});

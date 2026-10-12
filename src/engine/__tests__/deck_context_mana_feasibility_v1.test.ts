// @ts-ignore - existing project tsconfig omits Node fixture declarations.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DeckContextCandidateScore } from "../deck_context";
import {
  assessManaAgainstSnapshot, clearManaCacheForTests,
  parseRequiredDirectColors, prioritizeLegalDeckCandidatesByMana,
  type ManaSnapshot,
} from "../deck_context/mana_feasibility_v1";
const card = (name: string): DeckContextCandidateScore => ({
  candidate: {identityKey: "name:" + name.toLowerCase(), card: {name}, retrievedByAnchors: []},
  contextualScore: 81, connectedDeckCardCount: 1,
  relatedDeckCards: [], reasons: [{key: 101,weight: 1}],
  warnings: [], evidenceLevel: "high",
});
const signal = (type: "land"|"nonland", mana_cost: string | null, produced: string[] = [],
  conditional = false, complex_cast = false) => ({
  type, mana_cost, identity: [], produced, conditional, complex_cast,
});
const snapshot = (records: Record<string, any>, when = "2026-10-12T09:02:38Z"): ManaSnapshot => ({
  schema_version: "cards-mana-signals-v1", provider: "Scryfall",
  source_updated_at: when, by_name_norm: records,
});
const now = new Date("2026-10-12T12:00:00Z");

afterEach(() => {vi.unstubAllGlobals();clearManaCacheForTests();});

describe("mana feasibility: soft classification never overrides format legality", () => {
  it("parses ordinary colored costs without assuming hybrid/Phyrexian costs are strict", () => {
    expect(parseRequiredDirectColors("{2}{W}{U}")).toEqual(["W","U"]);
    expect(parseRequiredDirectColors("{R}{R}{1}")).toEqual(["R"]);
    expect(parseRequiredDirectColors("{2}")).toEqual([]);
    expect(parseRequiredDirectColors("{X}{G}")).toEqual(["G"]);
    expect(parseRequiredDirectColors("{3}{U/P}")).toBe(null);
    expect(parseRequiredDirectColors("{R/G}")).toBe(null);
    expect(parseRequiredDirectColors("{G}", true)).toBe(null);
    expect(parseRequiredDirectColors(null)).toBe(null);
    expect(parseRequiredDirectColors("not a mana cost")).toBe(null);
  });

  it("marks red spells for review in Golgari; keeps viable, uncertain and reviewed legal cards in full pool", () => {
    const records = {
      "overgrown tomb": signal("land",null,["B","G"]),
      "forest": signal("land",null,["G"]),
      "cavern of souls": signal("land",null,["W","U","B","R","G"],true),
      "nykthos, shrine to nyx": signal("land",null,["W","U","B","R","G"],true),
      "misty rainforest": signal("land",null,[]),
      "impact tremors": signal("nonland","{1}{R}"),
      "warleader's call": signal("nonland","{1}{R}{W}"),
      "shaman of the pack": signal("nonland","{1}{B}{G}"),
      "phyrexian metamorph": signal("nonland","{3}{U/P}"),
    };
    const legal = [card("Impact Tremors"),card("Warleader's Call"),card("Shaman of the Pack"),card("Phyrexian Metamorph")];
    const result = assessManaAgainstSnapshot(legal,
      [{name:"Overgrown Tomb"},{name:"Forest"},{name:"Cavern of Souls"},
       {name:"Nykthos, Shrine to Nyx"},{name:"Misty Rainforest"}],
      snapshot(records),now);
    expect(result.directColors).toEqual(["B","G"]);
    expect(result.direct.map(d=>d.row.candidate.card.name)).toEqual(["Shaman of the Pack"]);
    expect(result.needsReview.map(d=>d.row.candidate.card.name))
      .toEqual(["Impact Tremors","Warleader's Call"]);
    expect(result.needsReview[1].withoutDirectSource).toEqual(["W","R"]);
    expect(result.unknown.map(d=>d.row.candidate.card.name)).toEqual(["Phyrexian Metamorph"]);
    expect(result.landSourcesNotModelled).toBe(3);
    expect(result.direct.length + result.needsReview.length + result.unknown.length).toBe(legal.length);
  });

  it("does not claim an unmodelled fetch land or conditional-only source supplies every color", () => {
    const records = {
      "cavern of souls": signal("land",null,["R","U","W","B","G"],true),
      "misty rainforest": signal("land",null,[]),
      "slash, reptile rampager": signal("nonland","{3}{R}{R}")
    };
    const result = assessManaAgainstSnapshot([card("Slash, Reptile Rampager")],
      [{name:"Cavern of Souls"},{name:"Misty Rainforest"}],snapshot(records),now);
    expect(result.direct).toHaveLength(0);
    expect(result.needsReview).toHaveLength(1);
    expect(result.warning).toMatch(/condicionadas/);
  });

  it("does not promote any mana suggestion on stale, missing or corrupt snapshot", async () => {
    const legal = [card("Impact Tremors")];
    const r = await prioritizeLegalDeckCandidatesByMana(legal,[{name:"Mountain"}],{
      fetchSnapshot: async () => {throw Error("offline");}
    });
    expect(r.direct).toHaveLength(0);
    expect(r.unknown).toHaveLength(1);
    const stale = assessManaAgainstSnapshot(legal,[{name:"Mountain"}],
      snapshot({"mountain":signal("land",null,["R"])}, "2026-08-01T00:00:00Z"),now);
    expect(stale.direct).toHaveLength(0);
    expect(stale.unknown).toHaveLength(1);
  });

  it("reads snapshot from same-origin static file without sending deck data to third parties", async () => {
    const bytes = readFileSync("public/data/cards_mana_signals.json.gz");
    const fake = vi.fn(async (input: unknown) => {
      expect(input).toBe("/data/cards_mana_signals.json.gz");
      return new Response(new Uint8Array(bytes),{status:200});
    });
    vi.stubGlobal("fetch",fake);
    const cards = [card("Impact Tremors"),card("Warleader's Call"),card("Phyrexian Metamorph")];
    const first = await prioritizeLegalDeckCandidatesByMana(cards,[{name:"Mountain"}],{now});
    const second = await prioritizeLegalDeckCandidatesByMana(cards,[{name:"Mountain"}],{now});
    expect(first.direct.map(x=>x.row.candidate.card.name)).toEqual(["Impact Tremors"]);
    expect(first.needsReview.map(x=>x.row.candidate.card.name)).toEqual(["Warleader's Call"]);
    expect(first.unknown.map(x=>x.row.candidate.card.name)).toEqual(["Phyrexian Metamorph"]);
    expect(second.evaluatedCount).toBe(3);
    expect(fake).toHaveBeenCalledTimes(1);
  });
});

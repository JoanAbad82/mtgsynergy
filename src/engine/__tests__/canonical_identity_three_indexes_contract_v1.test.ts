// Contract-first negative fixtures: canonical identity across Oracle, format, and mana.
// No changes to scoring or recommendation ordering.
// @ts-ignore - Node fixture types absent from the baseline tsconfig.
import { readFileSync } from "node:fs";
import pako from "pako";
import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupCard, __testing as cardsTesting } from "../cards/lookup";
import { selectFormatLegalCandidates } from "../deck_context/format_legality_v1";
import { assessManaAgainstSnapshot, type ManaSnapshot } from "../deck_context/mana_feasibility_v1";
import type { DeckContextCandidateScore } from "../deck_context/types";

const now = new Date("2026-10-12T12:00:00Z");
const asRow = (name: string): DeckContextCandidateScore => ({
  candidate: { identityKey: "name:" + name.toLowerCase(), card: { name }, retrievedByAnchors: [] },
  contextualScore: 77, connectedDeckCardCount: 1, relatedDeckCards: [],
  reasons: [], warnings: [], evidenceLevel: "limited",
});
const monoBlue = [{ name: "Island", count: 20 }];
const signal = (cost: string | null, type: "land" | "nonland" = "nonland", produced: string[] = []) => ({
  type, mana_cost: cost, identity: ["U"], produced, conditional: false, complex_cast: false,
});
const manaSnapshot = (by_name_norm: Record<string, ReturnType<typeof signal>>) => ({
  schema_version: "cards-mana-signals-v1", provider: "Scryfall",
  source_updated_at: "2026-10-12T09:02:38Z", by_name_norm,
}) as ManaSnapshot;
const legalitySnapshot = (by_name_norm: Record<string, Record<string, string>>) => ({
  schema_version: "cards-format-legalities-v1", provider: "Scryfall",
  source_updated_at: "2026-10-12T09:02:38Z",
  formats: ["modern", "pauper"], by_name_norm,
});
afterEach(() => {
  vi.unstubAllGlobals();
  cardsTesting.clearCache();
});

describe("canonical card identity / three local indexes V1", () => {
  it("RED: chooses the sole usable Oracle front-face candidate over empty same-face printing", async () => {
    const payload = { schema_version: "cardrecordmin-v1",
      by_name: {
        "Delver of Secrets // Delver of Secrets": {
          type_line: "Card // Card", oracle_text: "", cmc: 0,
        },
        "Delver of Secrets // Insectile Aberration": {
          type_line: "Creature — Human Wizard // Creature — Human Insect",
          oracle_text: "At the beginning of your upkeep, look at the top card of your library.",
          cmc: 1,
        },
      },
      by_name_norm: {
        "delver of secrets // delver of secrets": "Delver of Secrets // Delver of Secrets",
        "delver of secrets // insectile aberration": "Delver of Secrets // Insectile Aberration",
      },
    };
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(bytes, { status: 200 })));
    const result = await lookupCard("Delver of Secrets");
    expect(result?.name).toBe("Delver of Secrets // Insectile Aberration");
    expect(result?.oracle_text).toMatch(/beginning of your upkeep/);
    // A canonical full name still resolves exactly; no silent rewriting of identity.
    const exact = await lookupCard("Delver of Secrets // Delver of Secrets");
    expect(exact?.name).toBe("Delver of Secrets // Delver of Secrets");
  });

  it("RED: never guesses an ambiguous front-face Oracle alias with two usable distinct cards", async () => {
    const payload = { by_name: {
      "Same Face // Other A": { type_line: "Creature", oracle_text: "Draw a card.", cmc: 2 },
      "Same Face // Other B": { type_line: "Creature", oracle_text: "Create a token.", cmc: 3 },
    } };
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(bytes, { status: 200 })));
    expect(await lookupCard("Same Face")).toBeNull();
  });

  it("RED: format legality resolves a unique full-face key for a short-name candidate", async () => {
    const got = await selectFormatLegalCandidates([asRow("Emeritus of Ideation")], "modern", {
      fetchSnapshot: async () => legalitySnapshot({
        "emeritus of ideation // ancestral recall": { modern: "legal" },
      }) as any, now,
    });
    expect(got.legal).toHaveLength(1);
    expect(got.unknown).toHaveLength(0);
  });

  it("unknown format legality on conflicting face aliases, regardless of order", async () => {
    const cases = [
      { "same face // alpha": {modern:"legal"}, "same face // beta": {modern:"banned"} },
      { "same face // beta": {modern:"banned"}, "same face // alpha": {modern:"legal"} },
    ];
    for (const entries of cases) {
      const got = await selectFormatLegalCandidates([asRow("Same Face")], "modern", {
        fetchSnapshot: async () => legalitySnapshot(entries) as any, now,
      });
      expect(got.legal).toHaveLength(0);
      expect(got.unknown).toHaveLength(1);
      expect(got.excluded).toBe(0);
    }
  });

  it("RED: direct-mana assessment resolves unique short-face key, never certifies ambiguous aliases", () => {
    const normal = manaSnapshot({
      island: signal(null, "land", ["U"]),
      "emeritus of ideation // ancestral recall": signal("{3}{U}{U}"),
    });
    const found = assessManaAgainstSnapshot([asRow("Emeritus of Ideation")], monoBlue, normal, now);
    expect(found.direct.map(x => x.row.candidate.card.name)).toEqual(["Emeritus of Ideation"]);
    const ambiguous = manaSnapshot({
      island: signal(null, "land", ["U"]),
      "same face // alpha": signal("{U}"),
      "same face // beta": signal("{R}"),
    });
    const unknown = assessManaAgainstSnapshot([asRow("Same Face")], monoBlue, ambiguous, now);
    expect(unknown.unknown.map(x => x.row.candidate.card.name)).toEqual(["Same Face"]);
    expect(unknown.direct).toHaveLength(0);
  });

  it("frozen local Oracle index resolves Delver's actual transform face, without rewriting full keys", async () => {
    const bytes = readFileSync("public/data/cards_index.json.gz");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array(bytes), { status: 200 })));
    const short = await lookupCard("Delver of Secrets");
    expect(short?.name).toBe("Delver of Secrets // Insectile Aberration");
    expect(short?.oracle_text).toMatch(/At the beginning of your upkeep/);
    const exact = await lookupCard("Delver of Secrets // Delver of Secrets");
    expect(exact?.name).toBe("Delver of Secrets // Delver of Secrets");
    expect(exact?.oracle_text ?? "").toBe("");
  });

  it("frozen auxiliary indexes resolve Emeritus uniquely but keep its split cost uncertain", async () => {
    const legalBytes = readFileSync("public/data/cards_format_legalities.json.gz");
    const legalIndex = JSON.parse(pako.ungzip(legalBytes, { to: "string" }));
    const eligible = await selectFormatLegalCandidates([asRow("Emeritus of Ideation")], "modern", {
      fetchSnapshot: async () => legalIndex, now,
    });
    expect(eligible.legal).toHaveLength(1);
    const manaBytes = readFileSync("public/data/cards_mana_signals.json.gz");
    const manaIndex = JSON.parse(pako.ungzip(manaBytes, { to: "string" })) as ManaSnapshot;
    const assessed = assessManaAgainstSnapshot(eligible.legal,
      [{ name: "Island", count: 20 }, { name: "Emeritus of Ideation", count: 1 }],
      manaIndex, now);
    expect(assessed.landSourcesNotModelled).toBe(0);
    expect(assessed.direct).toHaveLength(0);
    expect(assessed.unknown).toHaveLength(1); // split cost remains unmodelled, not "free".
  });

});

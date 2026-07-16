import { Fragment, h } from "preact";
import renderToString from "preact-render-to-string";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildCandidateAnchorSemanticConnections } from "../../../engine/deck_context";

type GlobalWithReactShim = typeof globalThis & {
  React?: {
    createElement: typeof h;
    Fragment: typeof Fragment;
  };
};

const globalWithReactShim = globalThis as GlobalWithReactShim;
const previousReact = globalWithReactShim.React;

beforeAll(() => {
  globalWithReactShim.React = {
    createElement: h,
    Fragment,
  };
});

afterAll(() => {
  if (previousReact) {
    globalWithReactShim.React = previousReact;
  } else {
    delete globalWithReactShim.React;
  }
});

const positiveCandidate = {
  name: "Impact Tremors",
  typeLine: "Enchantment",
  oracleText:
    "Whenever a creature enters the battlefield under your control, Impact Tremors deals 1 damage to each opponent.",
};

const completeAnchor = {
  key: "name:krenko, mob boss",
  name: "Krenko, Mob Boss",
  nameNorm: "krenko, mob boss",
  count: 1,
  typeLine: "Legendary Creature — Goblin Warrior",
  oracleText:
    "{T}: Create X 1/1 red Goblin creature tokens, where X is the number of Goblins you control.",
  rank: 0,
  evidence: "supported" as const,
};

describe("deck-context conditional anchor lookup", () => {
  it("skips lookup when Oracle text and type line are present", async () => {
    const lookupCardFn = vi.fn(async () => {
      throw new Error("lookup must not run");
    });
    const result = await buildCandidateAnchorSemanticConnections({
      candidate: positiveCandidate,
      anchors: [completeAnchor],
      lookupCardFn,
    });
    expect(lookupCardFn).toHaveBeenCalledTimes(0);
    expect(result.connections.length).toBeGreaterThan(0);
  });

  it("looks up once when Oracle text is missing", async () => {
    const lookupCardFn = vi.fn(async () => ({
      name: completeAnchor.name,
      name_norm: completeAnchor.nameNorm,
      type_line: completeAnchor.typeLine,
      oracle_text: completeAnchor.oracleText,
      cmc: null,
    }));
    const result = await buildCandidateAnchorSemanticConnections({
      candidate: positiveCandidate,
      anchors: [{ ...completeAnchor, oracleText: undefined }],
      lookupCardFn,
    });
    expect(lookupCardFn).toHaveBeenCalledTimes(1);
    expect(result.connections.length).toBeGreaterThan(0);
  });

  it("looks up once when type line is missing", async () => {
    const lookupCardFn = vi.fn(async () => ({
      name: completeAnchor.name,
      name_norm: completeAnchor.nameNorm,
      type_line: completeAnchor.typeLine,
      oracle_text: completeAnchor.oracleText,
      cmc: null,
    }));
    const result = await buildCandidateAnchorSemanticConnections({
      candidate: positiveCandidate,
      anchors: [{ ...completeAnchor, typeLine: undefined }],
      lookupCardFn,
    });
    expect(lookupCardFn).toHaveBeenCalledTimes(1);
    expect(result.connections.length).toBeGreaterThan(0);
  });

  it("degrades explicitly when missing data cannot be resolved", async () => {
    const lookupCardFn = vi.fn(async () => null);
    const result = await buildCandidateAnchorSemanticConnections({
      candidate: positiveCandidate,
      anchors: [{
        ...completeAnchor,
        oracleText: undefined,
        typeLine: undefined,
      }],
      lookupCardFn,
    });
    expect(lookupCardFn).toHaveBeenCalledTimes(1);
    expect(result.connections).toHaveLength(0);
    expect(result.degradations).toContainEqual({
      candidateKey: "name:impact tremors",
      anchorKey: completeAnchor.key,
      reason: "missing_anchor_oracle",
    });
  });
});

describe("deck-context visible MVP", () => {
  it("renders candidate evidence and cautious warnings", async () => {
    const { ExternalCardDiscoveryPanel } = await import(
      "../panels/ExternalCardDiscoveryPanel"
    );
    const html = renderToString(
      h(ExternalCardDiscoveryPanel, {
        loading: false,
        error: null,
        candidates: [{
          candidate: {
            identityKey: "name:impact tremors",
            card: { name: "Impact Tremors" },
            retrievedByAnchors: [completeAnchor.key],
          },
          contextualScore: 84,
          connectedDeckCardCount: 2,
          relatedDeckCards: [
            { key: completeAnchor.key, name: completeAnchor.name, score: 76 },
            { key: "name:young pyromancer", name: "Young Pyromancer", score: 61 },
          ],
          reasons: [
            { key: 101, weight: 1 },
            { key: 202, weight: 0.8 },
          ],
          evidenceLevel: "medium",
          warnings: [
            "Compatibilidad semántica; legalidad de formato no verificada.",
          ],
        }],
      }),
    );
    expect(html).toContain("Compatibilidad semántica externa");
    expect(html).toContain("Impact Tremors");
    expect(html).toContain("84/100");
    expect(html).toContain("Conecta con 2 carta(s)");
    expect(html).toContain("Krenko, Mob Boss");
    expect(html).toContain("razones:");
    expect(html).toContain("101");
    expect(html).toContain("legalidad de formato no verificada");
  });

  it("renders the prudent no-evidence state", async () => {
    const { ExternalCardDiscoveryPanel } = await import(
      "../panels/ExternalCardDiscoveryPanel"
    );
    const html = renderToString(
      h(ExternalCardDiscoveryPanel, {
        candidates: [],
        loading: false,
        error: null,
      }),
    );
    expect(html).toContain("Compatibilidad semántica externa");
    expect(html).toContain(
      "No se ha encontrado evidencia semántica suficiente para ordenar candidatas externas.",
    );
  });
});

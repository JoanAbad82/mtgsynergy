import { expect, test } from "vitest";
import type { DeckState } from "../domain/types";
import { normalizeCardName } from "../normalize/normalize";
import { validateDeckState } from "../validate/validate";

const baseDeck: DeckState = {
  deck: {
    entries: [
      {
        name: "Card A",
        name_norm: "card a",
        count: 30,
        role_primary: "ENGINE",
      },
      {
        name: "Card B",
        name_norm: "card b",
        count: 30,
        role_primary: "PAYOFF",
      },
    ],
  },
  sim: {
    mulligan_model: "none",
    turn_T: 4,
    iterations: 1000,
  },
};

test("normalizeCardName collapses whitespace", () => {
  expect(normalizeCardName("Lightning   Bolt")).toBe("lightning bolt");
});

test("normalizeCardName handles unicode deterministically", () => {
  expect(normalizeCardName("Æther Vial")).toBe("æther vial");
});

test("deck size 60 passes DECK_TOO_SMALL check", () => {
  const issues = validateDeckState(baseDeck);
  expect(issues).not.toContain("DECK_TOO_SMALL");
});

test("deck size 59 yields DECK_TOO_SMALL", () => {
  const ds: DeckState = {
    ...baseDeck,
    deck: {
      entries: [
        {
          name: "Card A",
          name_norm: "card a",
          count: 29,
          role_primary: "ENGINE",
        },
        {
          name: "Card B",
          name_norm: "card b",
          count: 30,
          role_primary: "PAYOFF",
        },
      ],
    },
  };
  const issues = validateDeckState(ds);
  expect(issues).toContain("DECK_TOO_SMALL");
});

test("duplicate entry by name_norm yields DUPLICATE_ENTRY", () => {
  const ds: DeckState = {
    ...baseDeck,
    deck: {
      entries: [
        {
          name: "Card A",
          name_norm: "Card A",
          count: 30,
          role_primary: "ENGINE",
        },
        {
          name: "Card A",
          name_norm: "card a",
          count: 30,
          role_primary: "PAYOFF",
        },
      ],
    },
  };
  const issues = validateDeckState(ds);
  expect(issues).toContain("DUPLICATE_ENTRY");
});

test("pipeline not found yields PIPELINE_NOT_FOUND", () => {
  const ds: DeckState = {
    ...baseDeck,
    pipelines_active: ["NO_SUCH_PIPELINE"],
  };
  const issues = validateDeckState(ds);
  expect(issues).toContain("PIPELINE_NOT_FOUND");
});

test("self-edge yields SELF_EDGE", () => {
  const ds: DeckState = {
    ...baseDeck,
    edges: [{ from: "ENGINE", to: "ENGINE" }],
  };
  const issues = validateDeckState(ds);
  expect(issues).toContain("SELF_EDGE");
});

test("invalid mulligan model yields INVALID_MULLIGAN", () => {
  const ds: DeckState = {
    ...baseDeck,
    sim: { mulligan_model: "other" as "none", turn_T: 4, iterations: 1000 },
  };
  const issues = validateDeckState(ds);
  expect(issues).toContain("INVALID_MULLIGAN");
});

test("sim without turn_T yields INVALID_TURN_T", () => {
  const ds: DeckState = {
    ...baseDeck,
    sim: { mulligan_model: "none", iterations: 1000 } as DeckState["sim"],
  };
  const issues = validateDeckState(ds);
  expect(issues).toContain("INVALID_TURN_T");
});

test("sim without iterations yields INVALID_ITERATIONS", () => {
  const ds: DeckState = {
    ...baseDeck,
    sim: { mulligan_model: "none", turn_T: 4 } as DeckState["sim"],
  };
  const issues = validateDeckState(ds);
  expect(issues).toContain("INVALID_ITERATIONS");
});

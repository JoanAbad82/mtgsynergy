import { expect, test } from "vitest";
import { parseMtgaExport } from "../parser";

test("parses Arena export with Deck and Sideboard", () => {
  const input = [
    "Deck",
    "4 Monastery Swiftspear (BRO) 144",
    "4 Mishras Foundry (BRO) 265",
    "20 Mountain",
    "Sideboard",
    "2 Abrade (BRO) 123",
  ].join("\n");

  const result = parseMtgaExport(input);
  const names = result.deck.entries.map((e) => e.name_norm);
  expect(names).toEqual(["mishras foundry", "monastery swiftspear", "mountain"]);

  const swiftspear = result.deck.entries.find(
    (e) => e.name_norm === "monastery swiftspear",
  );
  const mountain = result.deck.entries.find((e) => e.name_norm === "mountain");
  const foundry = result.deck.entries.find(
    (e) => e.name_norm === "mishras foundry",
  );

  expect(swiftspear?.count).toBe(4);
  expect(mountain?.count).toBe(20);
  expect(foundry?.count).toBe(4);
  expect(result.deck.entries.every((e) => e.role_primary === "UTILITY")).toBe(
    true,
  );

  expect(
    result.issues.filter((i) => i.code === "SIDEBOARD_IGNORED").length,
  ).toBe(1);
  expect(
    result.issues.filter((i) => i.code === "ROLES_DEFAULTED_TO_UTILITY").length,
  ).toBe(1);
});

test("merges duplicates by normalized name", () => {
  const input = ["Deck", "2 Lightning   Bolt (A) 1", "3 lightning bolt (B) 2"].join(
    "\n",
  );
  const result = parseMtgaExport(input);
  expect(result.deck.entries.length).toBe(1);
  expect(result.deck.entries[0].name_norm).toBe("lightning bolt");
  expect(result.deck.entries[0].count).toBe(5);
  expect(
    result.issues.filter((i) => i.code === "DUPLICATES_MERGED").length,
  ).toBe(1);
});

test("parses line without suffix", () => {
  const input = ["Deck", "4 Mountain"].join("\n");
  const result = parseMtgaExport(input);
  expect(result.deck.entries.length).toBe(1);
  expect(result.deck.entries[0].name).toBe("Mountain");
  expect(result.deck.entries[0].count).toBe(4);
});

test("LINE_UNPARSEABLE error", () => {
  const input = ["Deck", "Lightning Bolt (A) 1"].join("\n");
  const result = parseMtgaExport(input);
  const issue = result.issues.find((i) => i.code === "LINE_UNPARSEABLE");
  expect(issue?.severity).toBe("error");
  expect(issue?.line).toBe(2);
});

test("COUNT_INVALID error", () => {
  const input = ["Deck", "0 Lightning Bolt (A) 1"].join("\n");
  const result = parseMtgaExport(input);
  const issue = result.issues.find((i) => i.code === "COUNT_INVALID");
  expect(issue?.severity).toBe("error");
});

test("EMPTY_DECK with sideboard only", () => {
  const input = ["Deck", "Sideboard", "2 Whatever (A) 1"].join("\n");
  const result = parseMtgaExport(input);
  expect(
    result.issues.filter((i) => i.code === "SIDEBOARD_IGNORED").length,
  ).toBe(1);
  expect(result.issues.some((i) => i.code === "EMPTY_DECK")).toBe(true);
});

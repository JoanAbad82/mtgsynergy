import { describe, expect, it } from "vitest";
import { EventId, FrameKind } from "../contract";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";
import { buildSemanticCardProfile, KeyKind, keyOf } from "../overlay/sem_profile";

function parseText(oracleText: string) {
  return parseSemanticIrV0({
    name: "Attack Trigger Test Card",
    type_line: "Creature",
    oracle_text: oracleText,
  });
}

describe("semantic attack trigger event min v1", () => {
  it("maps 'Whenever this creature attacks' to CREATURE_ATTACKS and not UNKNOWN_EVENT", () => {
    const oracleText = "Whenever this creature attacks, create a 1/1 white Soldier creature token.";
    const ir = parseText(oracleText);
    const frame = ir.frames[0];
    const attackKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);

    expect(frame?.kind).toBe(FrameKind.TRIGGERED);
    expect(frame?.watch.some((watch) => watch.id === EventId.CREATURE_ATTACKS)).toBe(true);
    expect(frame?.watch.some((watch) => watch.id === EventId.UNKNOWN_EVENT)).toBe(false);

    const profile = buildSemanticCardProfile(ir, oracleText);
    expect(profile.consumed.get(attackKey)?.count ?? 0).toBeGreaterThan(0);
  });

  it("guardrail: does not map 'Whenever one or more creatures attack' to CREATURE_ATTACKS", () => {
    const oracleText = "Whenever one or more creatures attack, draw a card.";
    const ir = parseText(oracleText);
    const profile = buildSemanticCardProfile(ir, oracleText);
    const attackKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);

    expect(ir.frames[0]?.watch.some((watch) => watch.id === EventId.CREATURE_ATTACKS)).toBe(false);
    expect(profile.consumed.has(attackKey)).toBe(false);
  });

  it("guardrail: does not map 'Whenever you attack' to CREATURE_ATTACKS", () => {
    const oracleText = "Whenever you attack, draw a card.";
    const ir = parseText(oracleText);
    const profile = buildSemanticCardProfile(ir, oracleText);
    const attackKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);

    expect(ir.frames[0]?.watch.some((watch) => watch.id === EventId.CREATURE_ATTACKS)).toBe(false);
    expect(profile.consumed.has(attackKey)).toBe(false);
  });

  it("guardrail: combat damage trigger does not map to CREATURE_ATTACKS", () => {
    const oracleText = "Whenever this creature deals combat damage to a player, draw a card.";
    const ir = parseText(oracleText);
    const profile = buildSemanticCardProfile(ir, oracleText);
    const attackKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);

    expect(ir.frames[0]?.watch.some((watch) => watch.id === EventId.CREATURE_ATTACKS)).toBe(false);
    expect(profile.consumed.has(attackKey)).toBe(false);
  });
});


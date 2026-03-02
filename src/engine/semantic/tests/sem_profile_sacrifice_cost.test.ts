import { describe, expect, it } from "vitest";
import { CostId, EventId } from "../contract";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";
import { KeyKind, buildSemanticCardProfile, keyOf } from "../overlay/sem_profile";

describe("semantic profile: sacrificio como coste", () => {
  it("marca origin=cost para 'Sacrifice a creature:'", () => {
    const ir = parseSemanticIrV0({
      name: "Test Cost",
      oracle_text: "Sacrifice a creature: Draw a card.",
      type_line: "Creature",
    });
    const profile = buildSemanticCardProfile(ir, "Sacrifice a creature: Draw a card.");
    const key = keyOf(KeyKind.EVENT, EventId.SACRIFICE);
    const entry = profile.produced.get(key);
    expect(entry).toBeTruthy();
    expect(entry?.origin).toBe("cost");
  });

  it("marca origin=effect fuera del patrón de coste", () => {
    const ir = parseSemanticIrV0({
      name: "Test Effect",
      oracle_text: "When a creature dies, you may sacrifice a creature.",
      type_line: "Creature",
    });
    const frame = ir.frames[0];
    const nextFrame = { ...frame, cost: [...frame.cost, { cost: CostId.SACRIFICE_AS_COST }] };
    const nextIr = { ...ir, frames: [nextFrame] } as typeof ir;

    const profile = buildSemanticCardProfile(nextIr, "When a creature dies, you may sacrifice a creature.");
    const key = keyOf(KeyKind.EVENT, EventId.SACRIFICE);
    const entry = profile.produced.get(key);
    expect(entry).toBeTruthy();
    expect(entry?.origin).toBe("effect");
  });
});

import { describe, expect, it } from "vitest";
import { EventId, ActionId, ResourceId, FrameKind } from "../contract";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";

function parseText(oracle_text: string) {
  return parseSemanticIrV0({
    name: "Test Card",
    type_line: "Creature",
    oracle_text,
  });
}

describe("semantic parser v1 templates", () => {
  it("detects ETB trigger with reminder text", () => {
    const ir = parseText(
      "When Test Card enters the battlefield, draw a card. (This is reminder text.)",
    );
    expect(ir.frames[0]?.kind).toBe(FrameKind.TRIGGERED);
    expect(ir.frames[0]?.watch.some((w) => w.id === EventId.ENTERS_BATTLEFIELD)).toBe(true);
    expect(ir.frames[0]?.do.some((d) => d.action === ActionId.DRAW_CARDS)).toBe(true);
  });

  it("detects LTB trigger", () => {
    const ir = parseText("When Test Card leaves the battlefield, create a 1/1 Soldier token.");
    expect(ir.frames[0]?.watch.some((w) => w.id === EventId.LEAVES_BATTLEFIELD)).toBe(true);
    expect(ir.frames[0]?.do.some((d) => d.action === ActionId.CREATE_TOKEN)).toBe(true);
  });

  it("detects lifegain trigger with counters", () => {
    const ir = parseText(
      "Whenever you gain life, put a +1/+1 counter on target creature. (Reminder text.)",
    );
    expect(ir.frames[0]?.watch.some((w) => w.id === EventId.LIFE_GAIN)).toBe(true);
    expect(ir.frames[0]?.do.some((d) => d.action === ActionId.ADD_COUNTERS)).toBe(true);
  });

  it("detects lifegain effect", () => {
    const ir = parseText("You gain 3 life. (Reminder text.)");
    expect(ir.frames[0]?.do.some((d) => d.action === ActionId.GAIN_LIFE)).toBe(true);
    expect(ir.frames[0]?.touch.some((t) => t.id === ResourceId.LIFE)).toBe(true);
  });

  it("detects +1/+1 counters", () => {
    const ir = parseText("Put two +1/+1 counters on target creature.");
    expect(ir.frames[0]?.do.some((d) => d.action === ActionId.ADD_COUNTERS)).toBe(true);
    expect(ir.frames[0]?.touch.some((t) => t.id === ResourceId.COUNTER_P1P1)).toBe(true);
  });

  it("detects generic token creation", () => {
    const ir = parseText("Create two 1/1 Soldier tokens.");
    expect(ir.frames[0]?.do.some((d) => d.action === ActionId.CREATE_TOKEN)).toBe(true);
    expect(ir.frames[0]?.touch.some((t) => t.id === ResourceId.TOKEN_GENERIC)).toBe(true);
  });

  it("detects card draw", () => {
    const ir = parseText("Draw a card.");
    expect(ir.frames[0]?.do.some((d) => d.action === ActionId.DRAW_CARDS)).toBe(true);
    expect(ir.frames[0]?.touch.some((t) => t.id === ResourceId.CARD)).toBe(true);
  });
});

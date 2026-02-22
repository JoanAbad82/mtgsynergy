import { describe, expect, it } from "vitest";
import {
  ActionId,
  CostId,
  EventId,
  FrameKind,
  GateId,
  ResourceId,
  SEM_IR_VERSION,
  SemanticCardIR,
  TokenKindId,
  isKnownActionId,
  isKnownCostId,
  isKnownEventId,
  isKnownGateId,
  isKnownResourceId,
  isKnownTokenKindId,
  isValidActionId,
  isValidCostId,
  isValidEventId,
  isValidGateId,
  isValidResourceId,
  isValidTokenKindId,
} from "../contract";

describe("semantic contract v1", () => {
  it("exports SEM_IR_VERSION === 1", () => {
    expect(SEM_IR_VERSION).toBe(1);
  });

  it("enums contain UNKNOWN_*", () => {
    expect(EventId.UNKNOWN_EVENT).toBeTypeOf("number");
    expect(ActionId.UNKNOWN_ACTION).toBeTypeOf("number");
    expect(CostId.UNKNOWN_COST).toBeTypeOf("number");
    expect(ResourceId.UNKNOWN_RESOURCE).toBeTypeOf("number");
    expect(TokenKindId.UNKNOWN_TOKEN).toBeTypeOf("number");
    expect(GateId.UNKNOWN_GATE).toBeTypeOf("number");
  });

  it("helper guards reject UNKNOWN and out of range", () => {
    expect(isKnownEventId(EventId.UNKNOWN_EVENT)).toBe(false);
    expect(isKnownActionId(ActionId.UNKNOWN_ACTION)).toBe(false);
    expect(isKnownCostId(CostId.UNKNOWN_COST)).toBe(false);
    expect(isKnownResourceId(ResourceId.UNKNOWN_RESOURCE)).toBe(false);
    expect(isKnownTokenKindId(TokenKindId.UNKNOWN_TOKEN)).toBe(false);
    expect(isKnownGateId(GateId.UNKNOWN_GATE)).toBe(false);
    expect(isKnownEventId(9999)).toBe(false);
  });

  it("valid guards accept UNKNOWN_*", () => {
    expect(isValidEventId(EventId.UNKNOWN_EVENT)).toBe(true);
    expect(isValidActionId(ActionId.UNKNOWN_ACTION)).toBe(true);
    expect(isValidCostId(CostId.UNKNOWN_COST)).toBe(true);
    expect(isValidResourceId(ResourceId.UNKNOWN_RESOURCE)).toBe(true);
    expect(isValidTokenKindId(TokenKindId.UNKNOWN_TOKEN)).toBe(true);
    expect(isValidGateId(GateId.UNKNOWN_GATE)).toBe(true);
  });

  it("watch/do/touch/gates use numeric ids", () => {
    const card: SemanticCardIR = {
      card_id: 42,
      frames: [
        {
          kind: FrameKind.TRIGGERED,
          watch: [{ id: EventId.CREATURE_DIES }],
          cost: [{ cost: CostId.TAP_AS_COST }],
          do: [{ action: ActionId.CREATE_TOKEN, tokenData: { kind: TokenKindId.TREASURE, n: 1 } }],
          touch: [{ id: ResourceId.MANA }],
          gates: [{ id: GateId.YOU_CONTROL }],
        },
      ],
    };

    const frame = card.frames[0];
    expect(typeof frame.watch[0].id).toBe("number");
    expect(typeof frame.cost[0].cost).toBe("number");
    expect(typeof frame.do[0].action).toBe("number");
    expect(typeof frame.do[0].tokenData?.kind).toBe("number");
    expect(typeof frame.touch[0].id).toBe("number");
    expect(typeof frame.gates[0].id).toBe("number");
  });
});

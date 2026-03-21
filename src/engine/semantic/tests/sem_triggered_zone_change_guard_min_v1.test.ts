import { describe, expect, it } from "vitest";
import { classifyTriggeredAbilityMinV1 } from "../parser/sem_parser_v1";
import { detectTriggeredZoneChangeGuardMinV1 } from "../lowering/lower_to_ability_ir_min_v1";

describe("triggered zone-change guard min v1", () => {
  it("requires triggered zone-change or linked fallback before asserting possible_lki_required", () => {
    const oracle =
      "When Oblivion Ring enters the battlefield, exile another target nonland permanent. When Oblivion Ring leaves the battlefield, return the exiled card to the battlefield under its owner's control.";
    const classified = classifyTriggeredAbilityMinV1(oracle);
    const guarded = detectTriggeredZoneChangeGuardMinV1(oracle, classified);

    expect(classified.is_triggered).toBe(true);
    expect(classified.class).toBe("NONE");
    expect(classified.fallback).toBe("LINKED");
    expect(guarded.possibleZoneChange).toBe(true);
    expect(guarded.possibleLkiRequired).toBe(true);
  });

  it("does not overdeclare LKI when zone-change trigger has no explicit LKI reference", () => {
    const oracle = "When Doomed Dissenter dies, create a 2/2 black Zombie creature token.";
    const classified = classifyTriggeredAbilityMinV1(oracle);
    const guarded = detectTriggeredZoneChangeGuardMinV1(oracle, classified);

    expect(classified.class).toBe("ZONE_CHANGE");
    expect(guarded.possibleZoneChange).toBe(true);
    expect(guarded.possibleLkiRequired).toBe(false);
  });

  it("does not overdeclare LKI for non-triggered text even if it contains 'that card' and zone words", () => {
    const oracle = "Return that card from your graveyard to your hand.";
    const classified = classifyTriggeredAbilityMinV1(oracle);
    const guarded = detectTriggeredZoneChangeGuardMinV1(oracle, classified);

    expect(classified.is_triggered).toBe(false);
    expect(guarded.possibleZoneChange).toBe(true);
    expect(guarded.possibleLkiRequired).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildZoneChangeRecord,
  captureLastKnownInformation,
  createObjectInstanceRef,
  deriveCreatureDiesFromZoneChange,
  deriveLeavesBattlefieldFromZoneChange,
  evaluateZoneSemantics,
  isTokenExtinguishedAfterLeave,
  resolveLkiQuery
} from "../services/sem_zone_identity_lki_min_v1";

function reasonCodes(result: ReturnType<typeof evaluateZoneSemantics>): string[] {
  return result.reasons.map((reason) => reason.code);
}

describe("sem_zone_identity_lki_min_v1", () => {
  it("derives LEAVES_BATTLEFIELD and CREATURE_DIES for battlefield to graveyard when object was a creature immediately before change", () => {
    const objectRef = createObjectInstanceRef({
      objectInstanceId: "obj-1",
      objectKind: "card",
      oracleCardName: "Doomed Dissenter",
      ownerId: "p1",
      controllerId: "p1"
    });

    const record = buildZoneChangeRecord({
      objectRef,
      fromZone: "BATTLEFIELD",
      toZone: "GRAVEYARD",
      wasCreatureImmediatelyBeforeChange: true,
      sourceTextHint: "When Doomed Dissenter dies, create a 2/2 black Zombie creature token."
    });

    expect(deriveLeavesBattlefieldFromZoneChange(record)).toBe(true);
    expect(deriveCreatureDiesFromZoneChange(record)).toBe(true);

    const result = evaluateZoneSemantics(record);
    const codes = reasonCodes(result);

    expect(result.createsNewObjectByDefault).toBe(true);
    expect(result.derivesLeavesBattlefield).toBe(true);
    expect(result.derivesCreatureDies).toBe(true);
    expect(result.tokenCeasesToExistAfterZoneChangeSba).toBe(false);
    expect(result.lkiAvailable).toBe(true);
    expect(codes).toContain("ZONE_CHANGE_NEW_OBJECT_DEFAULT");
    expect(codes).toContain("LKI_AVAILABLE_MINIMAL");
    expect(codes).toContain("LEAVES_BATTLEFIELD_DERIVED");
    expect(codes).toContain("CREATURE_DIES_DERIVED");
  });

  it("derives LEAVES_BATTLEFIELD but not CREATURE_DIES for battlefield to exile", () => {
    const objectRef = createObjectInstanceRef({
      objectInstanceId: "obj-2",
      objectKind: "card",
      oracleCardName: "Banisher Priest",
      ownerId: "p1",
      controllerId: "p1"
    });

    const record = buildZoneChangeRecord({
      objectRef,
      fromZone: "BATTLEFIELD",
      toZone: "EXILE",
      wasCreatureImmediatelyBeforeChange: true,
      sourceTextHint: "Exile target creature until Banisher Priest leaves the battlefield."
    });

    expect(deriveLeavesBattlefieldFromZoneChange(record)).toBe(true);
    expect(deriveCreatureDiesFromZoneChange(record)).toBe(false);

    const result = evaluateZoneSemantics(record);
    const codes = reasonCodes(result);

    expect(result.derivesLeavesBattlefield).toBe(true);
    expect(result.derivesCreatureDies).toBe(false);
    expect(codes).toContain("LEAVES_BATTLEFIELD_DERIVED");
    expect(codes).not.toContain("CREATURE_DIES_DERIVED");
  });

  it("does not overclaim LEAVES_BATTLEFIELD or CREATURE_DIES when the change does not start on the battlefield", () => {
    const objectRef = createObjectInstanceRef({
      objectInstanceId: "obj-3",
      objectKind: "card",
      oracleCardName: "Reassembling Skeleton",
      ownerId: "p1",
      controllerId: "p1"
    });

    const record = buildZoneChangeRecord({
      objectRef,
      fromZone: "GRAVEYARD",
      toZone: "HAND",
      wasCreatureImmediatelyBeforeChange: true,
      sourceTextHint: "Return Reassembling Skeleton from your graveyard to your hand."
    });

    expect(deriveLeavesBattlefieldFromZoneChange(record)).toBe(false);
    expect(deriveCreatureDiesFromZoneChange(record)).toBe(false);

    const result = evaluateZoneSemantics(record);
    const codes = reasonCodes(result);

    expect(result.derivesLeavesBattlefield).toBe(false);
    expect(result.derivesCreatureDies).toBe(false);
    expect(codes).not.toContain("LEAVES_BATTLEFIELD_DERIVED");
    expect(codes).not.toContain("CREATURE_DIES_DERIVED");
  });

  it("marks token extinction after leaving the battlefield", () => {
    const objectRef = createObjectInstanceRef({
      objectInstanceId: "tok-1",
      objectKind: "token",
      oracleCardName: "Zombie Token",
      ownerId: "p1",
      controllerId: "p1"
    });

    const record = buildZoneChangeRecord({
      objectRef,
      fromZone: "BATTLEFIELD",
      toZone: "EXILE",
      wasCreatureImmediatelyBeforeChange: true,
      sourceTextHint: "Exile target token."
    });

    expect(isTokenExtinguishedAfterLeave(record)).toBe(true);

    const result = evaluateZoneSemantics(record);
    const codes = reasonCodes(result);

    expect(result.derivesLeavesBattlefield).toBe(true);
    expect(result.derivesCreatureDies).toBe(false);
    expect(result.tokenCeasesToExistAfterZoneChangeSba).toBe(true);
    expect(codes).toContain("TOKEN_EXTINGUISHES_AFTER_LEAVE");
  });

  it("captures and resolves minimal LKI without inventing extra semantics", () => {
    const objectRef = createObjectInstanceRef({
      objectInstanceId: "obj-4",
      objectKind: "card",
      oracleCardName: "Myr Retriever",
      ownerId: "p1",
      controllerId: "p2"
    });

    const record = buildZoneChangeRecord({
      objectRef,
      fromZone: "BATTLEFIELD",
      toZone: "GRAVEYARD",
      wasCreatureImmediatelyBeforeChange: true,
      sourceTextHint: "When Myr Retriever dies, return another target artifact card from your graveyard to your hand."
    });

    const lki = captureLastKnownInformation(record);
    const resolved = resolveLkiQuery(lki);

    expect(lki).toEqual({
      objectRef,
      zoneBeforeChange: "BATTLEFIELD",
      wasCreature: true,
      controllerId: "p2",
      ownerId: "p1",
      sourceTextHint: "When Myr Retriever dies, return another target artifact card from your graveyard to your hand."
    });

    expect(resolved).toEqual(lki);
  });

  it("uses pre-SBA snapshot guard for leaves-the-battlefield LKI", () => {
    const objectRef = createObjectInstanceRef({
      objectInstanceId: "obj-5",
      objectKind: "card",
      oracleCardName: "Shambling Ghast",
      ownerId: "p1",
      controllerId: "p2"
    });

    const record = buildZoneChangeRecord({
      objectRef,
      fromZone: "BATTLEFIELD",
      toZone: "GRAVEYARD",
      wasCreatureImmediatelyBeforeChange: true,
      sourceTextHint: "When Shambling Ghast dies, choose one - create a Treasure token; or target creature gets -1/-1 until end of turn."
    });

    const preSbaLki = captureLastKnownInformation(record);
    const resolvedWithSbaGuard = resolveLkiQuery(preSbaLki, {
      leftBattlefieldInSbaBatch: true
    });
    const resolvedWithoutSbaGuard = resolveLkiQuery(preSbaLki, {
      leftBattlefieldInSbaBatch: false
    });

    expect(resolvedWithSbaGuard).toEqual(preSbaLki);
    expect(resolvedWithoutSbaGuard).toEqual(preSbaLki);
  });
});

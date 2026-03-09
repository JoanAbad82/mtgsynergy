import {
  LastKnownInfo,
  ObjectInstanceRef,
  ZoneChangeRecord,
  ZoneId,
  ZoneSemanticsReason,
  ZoneSemanticsResult
} from "../types/sem_zone_identity_types";

export function createObjectInstanceRef(args: {
  objectInstanceId: string;
  objectKind: "card" | "token" | "copy" | "unknown";
  oracleCardName?: string;
  ownerId?: string;
  controllerId?: string;
}): ObjectInstanceRef {
  return {
    objectInstanceId: args.objectInstanceId,
    objectKind: args.objectKind,
    oracleCardName: args.oracleCardName,
    ownerId: args.ownerId,
    controllerId: args.controllerId
  };
}

export function buildZoneChangeRecord(args: {
  objectRef: ObjectInstanceRef;
  fromZone: ZoneId;
  toZone: ZoneId;
  wasCreatureImmediatelyBeforeChange?: boolean;
  sourceTextHint?: string;
}): ZoneChangeRecord {
  return {
    objectRef: args.objectRef,
    fromZone: args.fromZone,
    toZone: args.toZone,
    wasCreatureImmediatelyBeforeChange: args.wasCreatureImmediatelyBeforeChange,
    sourceTextHint: args.sourceTextHint
  };
}

export function deriveLeavesBattlefieldFromZoneChange(record: ZoneChangeRecord): boolean {
  return record.fromZone === "BATTLEFIELD";
}

export function deriveCreatureDiesFromZoneChange(record: ZoneChangeRecord): boolean {
  return (
    record.fromZone === "BATTLEFIELD" &&
    record.toZone === "GRAVEYARD" &&
    record.wasCreatureImmediatelyBeforeChange === true
  );
}

export function captureLastKnownInformation(record: ZoneChangeRecord): LastKnownInfo {
  return {
    objectRef: record.objectRef,
    zoneBeforeChange: record.fromZone,
    wasCreature: record.wasCreatureImmediatelyBeforeChange,
    controllerId: record.objectRef.controllerId,
    ownerId: record.objectRef.ownerId,
    sourceTextHint: record.sourceTextHint
  };
}

export function resolveLkiQuery(lki: LastKnownInfo): LastKnownInfo {
  return lki;
}

export function isTokenExtinguishedAfterLeave(record: ZoneChangeRecord): boolean {
  return record.objectRef.objectKind === "token" && record.fromZone === "BATTLEFIELD";
}

export function evaluateZoneSemantics(record: ZoneChangeRecord): ZoneSemanticsResult {
  const derivesLeavesBattlefield = deriveLeavesBattlefieldFromZoneChange(record);
  const derivesCreatureDies = deriveCreatureDiesFromZoneChange(record);
  const tokenCeasesToExistAfterZoneChangeSba = isTokenExtinguishedAfterLeave(record);

  const reasons: ZoneSemanticsReason[] = [
    {
      code: "ZONE_CHANGE_NEW_OBJECT_DEFAULT",
      detail: "zone_change_creates_new_object_by_default"
    },
    {
      code: "LKI_AVAILABLE_MINIMAL",
      detail: "lki_available_for_minimal_zone_change_queries"
    }
  ];

  if (derivesLeavesBattlefield) {
    reasons.push({
      code: "LEAVES_BATTLEFIELD_DERIVED",
      detail: "from_zone_battlefield"
    });
  }

  if (derivesCreatureDies) {
    reasons.push({
      code: "CREATURE_DIES_DERIVED",
      detail: "battlefield_to_graveyard_and_was_creature_before_change"
    });
  }

  if (tokenCeasesToExistAfterZoneChangeSba) {
    reasons.push({
      code: "TOKEN_EXTINGUISHES_AFTER_LEAVE",
      detail: "token_left_battlefield_extinguishes_on_sba"
    });
  }

  return {
    createsNewObjectByDefault: true,
    derivesLeavesBattlefield,
    derivesCreatureDies,
    tokenCeasesToExistAfterZoneChangeSba,
    lkiAvailable: true,
    reasons
  };
}

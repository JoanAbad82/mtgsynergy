export type ZoneId =
  | "BATTLEFIELD"
  | "GRAVEYARD"
  | "HAND"
  | "LIBRARY"
  | "STACK"
  | "EXILE"
  | "COMMAND"
  | "ANTE"
  | "SIDEBOARD"
  | "UNKNOWN";

export interface ObjectInstanceRef {
  objectInstanceId: string;
  objectKind: "card" | "token" | "copy" | "unknown";
  oracleCardName?: string;
  ownerId?: string;
  controllerId?: string;
}

export interface ZoneChangeRecord {
  objectRef: ObjectInstanceRef;
  fromZone: ZoneId;
  toZone: ZoneId;
  wasCreatureImmediatelyBeforeChange?: boolean;
  sourceTextHint?: string;
}

export interface LastKnownInfo {
  objectRef: ObjectInstanceRef;
  zoneBeforeChange: ZoneId;
  wasCreature?: boolean;
  controllerId?: string;
  ownerId?: string;
  sourceTextHint?: string;
}

export interface ZoneSemanticsReason {
  code: string;
  detail: string;
}

export interface ZoneSemanticsResult {
  createsNewObjectByDefault: boolean;
  derivesLeavesBattlefield: boolean;
  derivesCreatureDies: boolean;
  tokenCeasesToExistAfterZoneChangeSba: boolean;
  lkiAvailable: boolean;
  reasons: ZoneSemanticsReason[];
}

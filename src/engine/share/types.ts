import type { DeckState } from "../domain/types";

export type ShareDeckState = {
  schema_version: number;
  deck: DeckState["deck"];
  edges: NonNullable<DeckState["edges"]>;
  pipelines_active: NonNullable<DeckState["pipelines_active"]>;
  sim?: DeckState["sim"];
};

export type ShareState = ShareDeckState;

export type ShareStatePayload = {
  schema_version: number;
  deck: DeckState["deck"];
  edges?: DeckState["edges"];
  pipelines_active?: DeckState["pipelines_active"];
  sim?: DeckState["sim"];
};

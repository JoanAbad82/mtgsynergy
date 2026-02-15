import type { Deck } from "../domain/types";

export type ParseIssueCode =
  | "LINE_UNPARSEABLE"
  | "COUNT_INVALID"
  | "EMPTY_DECK"
  | "SIDEBOARD_IGNORED"
  | "DUPLICATES_MERGED"
  | "ROLES_DEFAULTED_TO_UTILITY";

export type ParseSeverity = "error" | "warning";

export type ParseIssue = {
  code: ParseIssueCode;
  severity: ParseSeverity;
  line?: number;
  message: string;
};

export type ParseResult = {
  deck: Deck;
  issues: ParseIssue[];
};

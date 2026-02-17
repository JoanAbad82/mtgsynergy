import type { CardEntry, Deck } from "../domain/types";
import { normalizeCardName } from "../normalize/normalize";
import type { ParseIssue, ParseResult } from "./types";

const ARENA_SUFFIX_RE = /\s+\([^)]+\)\s+\d+\s*$/;

type WarningFlags = {
  sideboardIgnored: boolean;
  duplicatesMerged: boolean;
  rolesDefaulted: boolean;
};

export function parseMtgaExport(input: string): ParseResult {
  const issues: ParseIssue[] = [];
  const entriesByNorm = new Map<string, CardEntry>();
  const warnings: WarningFlags = {
    sideboardIgnored: false,
    duplicatesMerged: false,
    rolesDefaulted: false,
  };

  const lines = input.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const lineNo = i + 1;
    let raw = lines[i].trim();
    raw = raw.replace(/\s+/g, " ");
    raw = raw.replace(/^[\-\*\u2022]+\s*/, "");
    raw = raw.replace(/\([^)]*\)/g, "").trim();
    raw = raw.replace(/\s*\d+\s*$/, "").trim();

    if (raw.length === 0) continue;
    if (raw.toLowerCase() === "deck") continue;

    if (raw.toLowerCase() === "sideboard") {
      if (!warnings.sideboardIgnored) {
        issues.push({
          code: "SIDEBOARD_IGNORED",
          severity: "warning",
          line: lineNo,
          message: "Sideboard ignored.",
        });
        warnings.sideboardIgnored = true;
      }
      break;
    }

    const match = raw.match(/^(\d+)\s+(.+)$/);
    if (!match) {
      issues.push({
        code: "LINE_UNPARSEABLE",
        severity: "error",
        line: lineNo,
        message: "Line does not match '<count> <card_name>'.",
      });
      continue;
    }

    const count = Number.parseInt(match[1], 10);
    if (!Number.isInteger(count) || count < 1) {
      issues.push({
        code: "COUNT_INVALID",
        severity: "error",
        line: lineNo,
        message: "Count must be an integer >= 1.",
      });
      continue;
    }

    let name = match[2].trim();
    if (ARENA_SUFFIX_RE.test(name)) {
      name = name.replace(ARENA_SUFFIX_RE, "").trim();
    }

    const name_norm = normalizeCardName(name);
    const existing = entriesByNorm.get(name_norm);
    if (existing) {
      existing.count += count;
      if (!warnings.duplicatesMerged) {
        issues.push({
          code: "DUPLICATES_MERGED",
          severity: "warning",
          message: "Duplicate card lines merged.",
        });
        warnings.duplicatesMerged = true;
      }
      continue;
    }

    const entry: CardEntry = {
      name,
      name_norm,
      count,
      role_primary: "UTILITY",
    };
    entriesByNorm.set(name_norm, entry);
  }

  const entries = Array.from(entriesByNorm.values()).sort((a, b) =>
    a.name_norm.localeCompare(b.name_norm),
  );

  if (entries.length > 0 && !warnings.rolesDefaulted) {
    issues.push({
      code: "ROLES_DEFAULTED_TO_UTILITY",
      severity: "warning",
      message: "Roles defaulted to UTILITY.",
    });
    warnings.rolesDefaulted = true;
  }

  if (entries.length === 0) {
    issues.push({
      code: "EMPTY_DECK",
      severity: "error",
      message: "No valid cards found in deck.",
    });
  }

  const deck: Deck = { entries };
  return { deck, issues };
}

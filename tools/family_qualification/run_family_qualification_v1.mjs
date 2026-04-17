#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const STATUS_CLOSED = 'CLOSED';
const STATUS_VETOED = 'VETOED';
const STATUS_CONTAMINATED = 'CONTAMINATED_BY_WORKTREE';
const STATUS_ABSORBED = 'ABSORBED';
const STATUS_INSUFFICIENT_ANCHOR = 'INSUFFICIENT_ANCHOR';
const STATUS_OPEN_CANDIDATE = 'OPEN_CANDIDATE';
const VERDICT_NO_CLEAN = 'NO_CLEAN_CANDIDATE';
const VERDICT_SHORTLIST_READY = 'SHORTLIST_READY';
const FAMILY_SCOPE_REAL_SEED = 'REAL_SEED';
const FAMILY_SCOPE_BOOTSTRAP = 'BOOTSTRAP';
const AUXILIARY_NON_ELIGIBLE_REASON =
  'real-seed non-eligible auxiliary/test-only artifact: blocked from real promotion';
const PROMOTION_BLOCKER_NONE = 'NONE';
const PROMOTION_BLOCKER_WORKTREE_CONTAMINATION = 'WORKTREE_CONTAMINATION';
const PROMOTION_BLOCKER_INSUFFICIENT_ANCHOR = 'INSUFFICIENT_ANCHOR';
const PROMOTION_BLOCKER_AUXILIARY_TEST_ONLY_EXCLUSION = 'AUXILIARY_TEST_ONLY_EXCLUSION';
const PROMOTION_BLOCKER_ALREADY_CLOSED = 'ALREADY_CLOSED';
const PROMOTION_BLOCKER_ALREADY_ABSORBED = 'ALREADY_ABSORBED';
const PROMOTION_BLOCKER_CLOSURE_NEGATIVE = 'CLOSURE_NEGATIVE';

function buildUsage(scriptPath) {
  const scriptName = scriptPath ? normalizePath(scriptPath) : 'tools/family_qualification/run_family_qualification_v1.mjs';
  return [
    'Usage:',
    `  node ${scriptName} --closure <path> --catalog <path> --report <path> --report-text <path>`,
    '',
    'Options:',
    '  --closure <path>      Path to closure text file',
    '  --catalog <path>      Path to family catalog JSON',
    '  --report <path>       Output path for JSON report',
    '  --report-text <path>  Output path for plain-text report',
    '  --help, -h            Show this help and exit'
  ].join('\n');
}

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h') {
      out.help = true;
      continue;
    }
    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }
    out[key] = value;
    i += 1;
  }

  if (out.help) {
    return out;
  }

  const required = ['closure', 'catalog', 'report', 'report-text'];
  for (const key of required) {
    if (!out[key]) {
      throw new Error(`Missing required argument --${key}`);
    }
  }
  return out;
}

function runGit(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trimEnd();
}

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function globToRegExp(glob) {
  const value = normalizePath(glob);
  let pattern = '^';
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (ch === '*') {
      const next = value[i + 1];
      if (next === '*') {
        pattern += '.*';
        i += 1;
      } else {
        pattern += '[^/]*';
      }
      continue;
    }
    if (ch === '?') {
      pattern += '[^/]';
      continue;
    }
    pattern += escapeRegex(ch);
  }
  pattern += '$';
  return new RegExp(pattern);
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function matchAny(pathValue, globs) {
  return globs.some((glob) => globToRegExp(glob).test(pathValue));
}

function collectPathHits(paths, globs) {
  if (!Array.isArray(globs) || globs.length === 0) {
    return [];
  }
  return uniqueSorted(paths.filter((filePath) => matchAny(filePath, globs)));
}

function collectClosureHits(closureTextLower, terms) {
  if (!Array.isArray(terms) || terms.length === 0) {
    return [];
  }
  const hits = [];
  for (const term of terms) {
    if (typeof term !== 'string') {
      continue;
    }
    const trimmed = term.trim();
    if (!trimmed) {
      continue;
    }
    if (closureTextLower.includes(trimmed.toLowerCase())) {
      hits.push(trimmed);
    }
  }
  return uniqueSorted(hits);
}

function parseUntrackedPaths(statusShortRaw) {
  const lines = statusShortRaw.split(/\r?\n/).filter(Boolean);
  const out = [];
  for (const line of lines) {
    const code = line.slice(0, 2);
    if (!code.includes('?')) {
      continue;
    }
    const rawPath = line.slice(3).trim();
    if (!rawPath) {
      continue;
    }
    const finalPath = rawPath.includes(' -> ')
      ? rawPath.split(' -> ').pop().trim()
      : rawPath;
    out.push(normalizePath(finalPath));
  }
  return uniqueSorted(out);
}

function normalizeFamilyScope(value) {
  if (value === FAMILY_SCOPE_BOOTSTRAP) {
    return FAMILY_SCOPE_BOOTSTRAP;
  }
  return FAMILY_SCOPE_REAL_SEED;
}

function isAuxiliaryPatternFamily(family) {
  const familyId = typeof family.family_id === 'string' ? family.family_id : '';
  const label = typeof family.label === 'string' ? family.label : '';
  const haystack = `${familyId} ${label}`.toLowerCase();
  return (
    haystack.includes('_diagnose_') ||
    haystack.includes('_pairing_inspect_') ||
    haystack.includes('-diagnose-') ||
    haystack.includes('-pairing-inspect-') ||
    haystack.includes(' diagnose ') ||
    haystack.includes(' pairing_inspect ') ||
    haystack.includes(' pairing inspect ')
  );
}

function isCatalogTestOnlyShape(family) {
  const hasTestGlobs = Array.isArray(family.repo_test_globs) && family.repo_test_globs.length > 0;
  const hasContractGlobs = Array.isArray(family.repo_contract_globs) && family.repo_contract_globs.length > 0;
  const hasWiringGlobs = Array.isArray(family.repo_wiring_globs) && family.repo_wiring_globs.length > 0;
  return hasTestGlobs && !hasContractGlobs && !hasWiringGlobs;
}

function inferPromotionProvenance(status, statusReason) {
  if (status === STATUS_OPEN_CANDIDATE) {
    return {
      promotionEligibleForRealSeed: true,
      promotionBlockerKind: PROMOTION_BLOCKER_NONE
    };
  }

  if (status === STATUS_CONTAMINATED) {
    return {
      promotionEligibleForRealSeed: false,
      promotionBlockerKind: PROMOTION_BLOCKER_WORKTREE_CONTAMINATION
    };
  }

  if (status === STATUS_INSUFFICIENT_ANCHOR) {
    return {
      promotionEligibleForRealSeed: false,
      promotionBlockerKind:
        statusReason === AUXILIARY_NON_ELIGIBLE_REASON
          ? PROMOTION_BLOCKER_AUXILIARY_TEST_ONLY_EXCLUSION
          : PROMOTION_BLOCKER_INSUFFICIENT_ANCHOR
    };
  }

  if (status === STATUS_CLOSED) {
    return {
      promotionEligibleForRealSeed: false,
      promotionBlockerKind: PROMOTION_BLOCKER_ALREADY_CLOSED
    };
  }

  if (status === STATUS_ABSORBED) {
    return {
      promotionEligibleForRealSeed: false,
      promotionBlockerKind: PROMOTION_BLOCKER_ALREADY_ABSORBED
    };
  }

  if (status === STATUS_VETOED) {
    return {
      promotionEligibleForRealSeed: false,
      promotionBlockerKind: PROMOTION_BLOCKER_CLOSURE_NEGATIVE
    };
  }

  return {
    promotionEligibleForRealSeed: false,
    promotionBlockerKind: PROMOTION_BLOCKER_INSUFFICIENT_ANCHOR
  };
}

function classifyFamily(family, trackedFiles, untrackedPaths, closureTextLower) {
  const familyScope = normalizeFamilyScope(family.family_scope);
  const trackedContractHits = collectPathHits(trackedFiles, family.repo_contract_globs);
  const trackedTestHits = collectPathHits(trackedFiles, family.repo_test_globs);
  const trackedWiringHits = collectPathHits(trackedFiles, family.repo_wiring_globs);
  const untrackedHomonymHits = collectPathHits(untrackedPaths, family.untracked_homonym_globs);
  const closurePositiveHits = collectClosureHits(closureTextLower, family.closure_positive_terms);
  const closureNegativeHits = collectClosureHits(closureTextLower, family.closure_negative_terms);
  const closureAbsorbedHits = collectClosureHits(closureTextLower, family.closure_absorbed_terms);
  const isTrackedTestOnlyShape =
    trackedTestHits.length > 0 &&
    trackedContractHits.length === 0 &&
    trackedWiringHits.length === 0;
  const isAuxiliaryNonEligible =
    isAuxiliaryPatternFamily(family) ||
    isCatalogTestOnlyShape(family) ||
    isTrackedTestOnlyShape;

  const hasClosedCondition =
    trackedContractHits.length > 0 &&
    trackedTestHits.length > 0 &&
    (trackedWiringHits.length > 0 || closurePositiveHits.length > 0) &&
    closureAbsorbedHits.length === 0;
  const hasOpenCandidateCondition =
    trackedContractHits.length === 0 &&
    trackedTestHits.length === 0 &&
    closureAbsorbedHits.length === 0 &&
    trackedWiringHits.length > 0 &&
    untrackedHomonymHits.length === 0 &&
    closureNegativeHits.length === 0;
  const hasMaterialOpenCandidateCondition =
    family.allow_material_open_candidate === true &&
    trackedContractHits.length > 0 &&
    trackedTestHits.length > 0 &&
    trackedWiringHits.length > 0 &&
    closurePositiveHits.length > 0 &&
    closureAbsorbedHits.length === 0 &&
    untrackedHomonymHits.length === 0 &&
    closureNegativeHits.length === 0;

  let status = STATUS_INSUFFICIENT_ANCHOR;
  let statusReason = 'insufficient positive anchor: no clean material basis';

  if (closureNegativeHits.length > 0) {
    status = STATUS_VETOED;
    statusReason = `closure negative hit: ${closureNegativeHits.join(', ')}`;
  } else if (untrackedHomonymHits.length > 0) {
    status = STATUS_CONTAMINATED;
    statusReason = `worktree contamination blocks real promotion: untracked homonym hit: ${untrackedHomonymHits.join(', ')}`;
  } else if (hasMaterialOpenCandidateCondition && isAuxiliaryNonEligible) {
    status = STATUS_INSUFFICIENT_ANCHOR;
    statusReason = AUXILIARY_NON_ELIGIBLE_REASON;
  } else if (hasMaterialOpenCandidateCondition) {
    status = STATUS_OPEN_CANDIDATE;
    statusReason = 'clean positive anchor: controlled material open-candidate fixture';
  } else if (hasClosedCondition) {
    status = STATUS_CLOSED;
    statusReason = 'tracked contract + tracked test + material additional hit';
  } else if (closureAbsorbedHits.length > 0) {
    status = STATUS_ABSORBED;
    statusReason = `closure absorbed hit: ${closureAbsorbedHits.join(', ')}`;
  } else if (hasOpenCandidateCondition && isAuxiliaryNonEligible) {
    status = STATUS_INSUFFICIENT_ANCHOR;
    statusReason = AUXILIARY_NON_ELIGIBLE_REASON;
  } else if (hasOpenCandidateCondition) {
    status = STATUS_OPEN_CANDIDATE;
    statusReason = 'clean positive anchor: controlled open-candidate probe';
  } else if (isAuxiliaryNonEligible) {
    status = STATUS_INSUFFICIENT_ANCHOR;
    statusReason = AUXILIARY_NON_ELIGIBLE_REASON;
  }
  const provenance = inferPromotionProvenance(status, statusReason);

  return {
    family_id: family.family_id,
    family_scope: familyScope,
    status,
    status_reason: statusReason,
    promotion_eligible_for_real_seed: provenance.promotionEligibleForRealSeed,
    promotion_blocker_kind: provenance.promotionBlockerKind,
    tracked_contract_hits: trackedContractHits,
    tracked_test_hits: trackedTestHits,
    tracked_wiring_hits: trackedWiringHits,
    untracked_homonym_hits: untrackedHomonymHits,
    closure_positive_hits: closurePositiveHits,
    closure_negative_hits: closureNegativeHits,
    closure_absorbed_hits: closureAbsorbedHits
  };
}

function renderTextReport(report) {
  const lines = [];
  lines.push('FAMILY_QUALIFICATION_SYSTEM_V1 bootstrap (minimal)');
  lines.push(`headShort: ${report.meta.headShort}`);
  lines.push(`originMainShort: ${report.meta.originMainShort}`);
  lines.push(`repoDirtyGlobal: ${report.meta.repoDirtyGlobal}`);
  lines.push(`closurePath: ${report.meta.closurePath}`);
  lines.push(`catalogPath: ${report.meta.catalogPath}`);
  lines.push(`verdict: ${report.verdict}`);
  lines.push(`shortlist: ${JSON.stringify(report.shortlist)}`);
  lines.push(`bootstrap_shortlist: ${JSON.stringify(report.bootstrap_shortlist)}`);
  lines.push('families:');
  for (const family of report.families) {
    lines.push(`- ${family.family_id}: ${family.status}`);
    lines.push(`  reason: ${family.status_reason}`);
    lines.push(`  promotion_eligible_for_real_seed: ${family.promotion_eligible_for_real_seed}`);
    lines.push(`  promotion_blocker_kind: ${family.promotion_blocker_kind}`);
  }
  return `${lines.join('\n')}\n`;
}

function validateCatalogFamilyShape(family) {
  const required = [
    'family_id',
    'label',
    'repo_contract_globs',
    'repo_test_globs',
    'repo_wiring_globs',
    'untracked_homonym_globs',
    'closure_positive_terms',
    'closure_negative_terms',
    'closure_absorbed_terms'
  ];
  for (const key of required) {
    if (!(key in family)) {
      throw new Error(`Catalog family is missing required key "${key}"`);
    }
  }
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(buildUsage(process.argv[1]));
    return;
  }
  const closureText = fs.readFileSync(args.closure, 'utf8');
  const catalogJson = JSON.parse(fs.readFileSync(args.catalog, 'utf8'));
  const catalogFamilies = Array.isArray(catalogJson)
    ? catalogJson
    : catalogJson.families;

  if (!Array.isArray(catalogFamilies)) {
    throw new Error('Catalog must be an array or object with "families" array');
  }

  const headShort = runGit(['rev-parse', '--short', 'HEAD']);
  const originMainShort = runGit(['rev-parse', '--short', 'origin/main']);
  const statusShortRaw = runGit(['status', '--short']);
  const trackedFiles = uniqueSorted(
    runGit(['ls-files'])
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map(normalizePath)
  );
  const untrackedPaths = parseUntrackedPaths(statusShortRaw);
  const closureTextLower = closureText.toLowerCase();

  const families = catalogFamilies.map((family) => {
    validateCatalogFamilyShape(family);
    return classifyFamily(family, trackedFiles, untrackedPaths, closureTextLower);
  });
  const shortlist = families
    .filter(
      (family) =>
        family.status === STATUS_OPEN_CANDIDATE &&
        family.family_scope === FAMILY_SCOPE_REAL_SEED
    )
    .map((family) => family.family_id);
  const bootstrapShortlist = families
    .filter(
      (family) =>
        family.status === STATUS_OPEN_CANDIDATE &&
        family.family_scope === FAMILY_SCOPE_BOOTSTRAP
    )
    .map((family) => family.family_id);

  const report = {
    meta: {
      headShort,
      originMainShort,
      repoDirtyGlobal: statusShortRaw.trim().length > 0,
      closurePath: args.closure,
      catalogPath: args.catalog
    },
    verdict:
      shortlist.length > 0
        ? VERDICT_SHORTLIST_READY
        : VERDICT_NO_CLEAN,
    shortlist,
    bootstrap_shortlist: bootstrapShortlist,
    families
  };

  fs.mkdirSync(path.dirname(args.report), { recursive: true });
  fs.mkdirSync(path.dirname(args['report-text']), { recursive: true });
  fs.writeFileSync(args.report, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(args['report-text'], renderTextReport(report), 'utf8');
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[run_family_qualification_v1] ${message}`);
  process.exitCode = 1;
}

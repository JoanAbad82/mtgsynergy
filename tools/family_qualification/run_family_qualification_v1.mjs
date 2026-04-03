#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const STATUS_CLOSED = 'CLOSED';
const STATUS_VETOED = 'VETOED';
const STATUS_CONTAMINATED = 'CONTAMINATED_BY_WORKTREE';
const VERDICT_NO_CLEAN = 'NO_CLEAN_CANDIDATE';

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
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

function classifyFamily(family, trackedFiles, untrackedPaths, closureTextLower) {
  const trackedContractHits = collectPathHits(trackedFiles, family.repo_contract_globs);
  const trackedTestHits = collectPathHits(trackedFiles, family.repo_test_globs);
  const trackedWiringHits = collectPathHits(trackedFiles, family.repo_wiring_globs);
  const untrackedHomonymHits = collectPathHits(untrackedPaths, family.untracked_homonym_globs);
  const closurePositiveHits = collectClosureHits(closureTextLower, family.closure_positive_terms);
  const closureNegativeHits = collectClosureHits(closureTextLower, family.closure_negative_terms);

  let status = STATUS_CONTAMINATED;
  let statusReason = 'bootstrap fallback: not enough material evidence for CLOSED';

  if (closureNegativeHits.length > 0) {
    status = STATUS_VETOED;
    statusReason = `closure negative hit: ${closureNegativeHits.join(', ')}`;
  } else if (untrackedHomonymHits.length > 0) {
    status = STATUS_CONTAMINATED;
    statusReason = `untracked homonym hit: ${untrackedHomonymHits.join(', ')}`;
  } else if (
    trackedContractHits.length > 0 &&
    trackedTestHits.length > 0 &&
    (trackedWiringHits.length > 0 || closurePositiveHits.length > 0)
  ) {
    status = STATUS_CLOSED;
    statusReason = 'tracked contract + tracked test + material additional hit';
  }

  return {
    family_id: family.family_id,
    status,
    status_reason: statusReason,
    tracked_contract_hits: trackedContractHits,
    tracked_test_hits: trackedTestHits,
    tracked_wiring_hits: trackedWiringHits,
    untracked_homonym_hits: untrackedHomonymHits,
    closure_positive_hits: closurePositiveHits,
    closure_negative_hits: closureNegativeHits
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
  lines.push('families:');
  for (const family of report.families) {
    lines.push(`- ${family.family_id}: ${family.status}`);
    lines.push(`  reason: ${family.status_reason}`);
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
    'closure_negative_terms'
  ];
  for (const key of required) {
    if (!(key in family)) {
      throw new Error(`Catalog family is missing required key "${key}"`);
    }
  }
}

function main() {
  const args = parseArgs(process.argv);
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

  const report = {
    meta: {
      headShort,
      originMainShort,
      repoDirtyGlobal: statusShortRaw.trim().length > 0,
      closurePath: args.closure,
      catalogPath: args.catalog
    },
    verdict: VERDICT_NO_CLEAN,
    shortlist: [],
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

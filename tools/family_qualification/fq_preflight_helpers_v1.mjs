const STATUS_CLOSED = 'CLOSED';
const STATUS_CONTAMINATED = 'CONTAMINATED_BY_WORKTREE';
const STATUS_INSUFFICIENT_ANCHOR = 'INSUFFICIENT_ANCHOR';
const STATUS_NEEDS_RECONCILIATION = 'NEEDS_RECONCILIATION';
const STATUS_OPEN_CANDIDATE = 'OPEN_CANDIDATE';
const FAMILY_SCOPE_BOOTSTRAP = 'BOOTSTRAP';
const FAMILY_SCOPE_REAL_SEED = 'REAL_SEED';

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

export function normalizePath(value) {
  return String(value).replace(/\\/g, '/');
}

export function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

export function globToRegExp(glob) {
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

export function parseStatusShort(statusShortRaw) {
  const lines = String(statusShortRaw)
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  const out = [];
  for (const line of lines) {
    const code = line.slice(0, 2);
    const rawPath = line.slice(3).trim();
    if (!rawPath) {
      continue;
    }
    const finalPath = rawPath.includes(' -> ')
      ? rawPath.split(' -> ').pop().trim()
      : rawPath;

    out.push({
      code,
      path: normalizePath(finalPath)
    });
  }
  return out;
}

function normalizeFamilyScope(value) {
  if (value === FAMILY_SCOPE_BOOTSTRAP) {
    return FAMILY_SCOPE_BOOTSTRAP;
  }
  return FAMILY_SCOPE_REAL_SEED;
}

export function deriveRepoState({
  branchRaw,
  headRaw,
  originMainRaw,
  statusShortRaw
}) {
  const entries = parseStatusShort(statusShortRaw);
  const trackedModifiedPaths = uniqueSorted(
    entries.filter((item) => !item.code.includes('?')).map((item) => item.path)
  );
  const untrackedPaths = uniqueSorted(
    entries.filter((item) => item.code.includes('?')).map((item) => item.path)
  );

  const branch = String(branchRaw ?? '').trim();
  const head = String(headRaw ?? '').trim();
  const originMain = String(originMainRaw ?? '').trim();

  return {
    branch,
    head,
    originMain,
    headEqualsOriginMain: Boolean(head) && head === originMain,
    trackedModified: trackedModifiedPaths.length > 0,
    trackedModifiedPaths,
    untracked: untrackedPaths.length > 0,
    untrackedPaths
  };
}

export function splitContaminationByCatalog({
  catalogFamilies,
  untrackedPaths
}) {
  const families = Array.isArray(catalogFamilies) ? catalogFamilies : [];
  const normalizedUntracked = uniqueSorted(
    (Array.isArray(untrackedPaths) ? untrackedPaths : []).map(normalizePath)
  );
  const gateAffectingHits = [];
  const gateMatchedSet = new Set();

  for (const family of families) {
    if (!family || typeof family !== 'object') {
      continue;
    }

    const familyId =
      typeof family.family_id === 'string' ? family.family_id : 'UNKNOWN_FAMILY';
    const scope = normalizeFamilyScope(family.family_scope);
    const globs = Array.isArray(family.untracked_homonym_globs)
      ? family.untracked_homonym_globs.filter(
          (item) => typeof item === 'string' && item.length > 0
        )
      : [];

    if (globs.length === 0) {
      continue;
    }

    const regexes = globs.map((glob) => globToRegExp(glob));
    const matchedPaths = normalizedUntracked.filter((pathValue) =>
      regexes.some((regex) => regex.test(pathValue))
    );

    if (matchedPaths.length === 0) {
      continue;
    }

    for (const matchedPath of matchedPaths) {
      gateMatchedSet.add(matchedPath);
    }

    gateAffectingHits.push({
      family_id: familyId,
      scope,
      matched_paths: matchedPaths
    });
  }

  gateAffectingHits.sort((a, b) => a.family_id.localeCompare(b.family_id));

  const nonGateNoisePaths = normalizedUntracked.filter(
    (pathValue) => !gateMatchedSet.has(pathValue)
  );

  return {
    gateAffectingHits,
    nonGateNoiseCount: nonGateNoisePaths.length,
    nonGateNoisePaths
  };
}

function inferDominantBlocker({ scope, status }) {
  if (status === STATUS_CONTAMINATED) {
    return 'contamination';
  }
  if (status === STATUS_INSUFFICIENT_ANCHOR) {
    return 'insufficient_anchor';
  }
  if (status === STATUS_NEEDS_RECONCILIATION) {
    return 'reconciliation';
  }
  if (status === STATUS_OPEN_CANDIDATE && scope === FAMILY_SCOPE_BOOTSTRAP) {
    return 'bootstrap_only';
  }
  return 'none_or_unknown';
}

export function extractFqSummary(runnerReport) {
  const shortlistReal = Array.isArray(runnerReport?.shortlist)
    ? runnerReport.shortlist.filter((item) => typeof item === 'string')
    : [];
  const bootstrapShortlist = Array.isArray(runnerReport?.bootstrap_shortlist)
    ? runnerReport.bootstrap_shortlist.filter((item) => typeof item === 'string')
    : [];

  return {
    verdict:
      typeof runnerReport?.verdict === 'string'
        ? runnerReport.verdict
        : 'UNKNOWN_VERDICT',
    shortlistReal: uniqueSorted(shortlistReal),
    bootstrapShortlist: uniqueSorted(bootstrapShortlist),
    repoDirtyGlobal: Boolean(runnerReport?.meta?.repoDirtyGlobal)
  };
}

export function derivePromotionFrontier(families) {
  const rows = Array.isArray(families) ? families : [];
  const allowedStatuses = new Set([
    STATUS_CONTAMINATED,
    STATUS_INSUFFICIENT_ANCHOR,
    STATUS_NEEDS_RECONCILIATION,
    STATUS_OPEN_CANDIDATE
  ]);

  const frontier = [];
  for (const row of rows) {
    const status = typeof row?.status === 'string' ? row.status : '';
    if (!allowedStatuses.has(status)) {
      continue;
    }
    const scope = normalizeFamilyScope(row.family_scope);
    const familyId = typeof row.family_id === 'string' ? row.family_id : 'UNKNOWN_FAMILY';
    frontier.push({
      family_id: familyId,
      scope,
      current_status: status,
      dominant_blocker: inferDominantBlocker({ scope, status })
    });
  }

  const scopePriority = {
    [FAMILY_SCOPE_REAL_SEED]: 0,
    [FAMILY_SCOPE_BOOTSTRAP]: 1
  };
  const statusPriority = {
    [STATUS_OPEN_CANDIDATE]: 0,
    [STATUS_CONTAMINATED]: 1,
    [STATUS_INSUFFICIENT_ANCHOR]: 2,
    [STATUS_NEEDS_RECONCILIATION]: 3
  };

  frontier.sort((a, b) => {
    const byScope = (scopePriority[a.scope] ?? 99) - (scopePriority[b.scope] ?? 99);
    if (byScope !== 0) {
      return byScope;
    }
    const byStatus =
      (statusPriority[a.current_status] ?? 99) -
      (statusPriority[b.current_status] ?? 99);
    if (byStatus !== 0) {
      return byStatus;
    }
    return a.family_id.localeCompare(b.family_id);
  });

  return frontier;
}

export function buildPreflightReport({
  repoState,
  contamination,
  fqSummary,
  frontier,
  closurePath,
  catalogPath
}) {
  return {
    meta: {
      preflightVersion: 'family_preflight_v1',
      generatedAt: new Date().toISOString(),
      closurePath: normalizePath(closurePath),
      catalogPath: normalizePath(catalogPath)
    },
    repo: repoState,
    contamination,
    fq: fqSummary,
    frontier
  };
}

export function renderPreflightTextReport(report) {
  const lines = [];

  lines.push('1. REPO STATE');
  lines.push(`branch: ${report.repo.branch}`);
  lines.push(`head: ${report.repo.head}`);
  lines.push(`originMain: ${report.repo.originMain}`);
  lines.push(`headEqualsOriginMain: ${report.repo.headEqualsOriginMain}`);
  lines.push(`trackedModified: ${report.repo.trackedModified}`);
  lines.push(`trackedModifiedPaths: ${JSON.stringify(report.repo.trackedModifiedPaths)}`);
  lines.push(`untracked: ${report.repo.untracked}`);
  lines.push(`untrackedPaths: ${JSON.stringify(report.repo.untrackedPaths)}`);
  lines.push('');

  lines.push('2. GATE-AFFECTING CONTAMINATION');
  if (report.contamination.gateAffectingHits.length === 0) {
    lines.push('none');
  } else {
    for (const hit of report.contamination.gateAffectingHits) {
      lines.push(`- ${hit.family_id} [${hit.scope}]`);
      lines.push(`  matched_paths: ${JSON.stringify(hit.matched_paths)}`);
    }
  }
  lines.push('');

  lines.push('3. NON-GATE NOISE');
  lines.push(`nonGateNoiseCount: ${report.contamination.nonGateNoiseCount}`);
  lines.push(`nonGateNoisePaths: ${JSON.stringify(report.contamination.nonGateNoisePaths)}`);
  lines.push('');

  lines.push('4. FQ RESULT');
  lines.push(`verdict: ${report.fq.verdict}`);
  lines.push(`repoDirtyGlobal: ${report.fq.repoDirtyGlobal}`);
  lines.push('');

  lines.push('5. SHORTLIST REAL VS BOOTSTRAP');
  lines.push(`shortlist_real: ${JSON.stringify(report.fq.shortlistReal)}`);
  lines.push(`bootstrap_shortlist: ${JSON.stringify(report.fq.bootstrapShortlist)}`);
  lines.push('');

  lines.push('6. PROMOTION FRONTIER');
  if (report.frontier.length === 0) {
    lines.push('none');
  } else {
    for (const row of report.frontier) {
      lines.push(
        `- ${row.family_id} [${row.scope}] status=${row.current_status} dominant_blocker=${row.dominant_blocker}`
      );
    }
  }

  return `${lines.join('\n')}\n`;
}

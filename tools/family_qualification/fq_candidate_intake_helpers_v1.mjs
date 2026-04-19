const FAMILY_SCOPE_BOOTSTRAP = 'BOOTSTRAP';
const FAMILY_SCOPE_REAL_SEED = 'REAL_SEED';

function normalizeScope(value) {
  if (value === FAMILY_SCOPE_BOOTSTRAP) {
    return FAMILY_SCOPE_BOOTSTRAP;
  }
  return FAMILY_SCOPE_REAL_SEED;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function countArray(value) {
  return asArray(value).length;
}

function catalogFamiliesFromPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.families)) {
    return payload.families;
  }
  throw new Error('Catalog JSON must be an array or an object with "families" array');
}

export function readCatalogFamiliesFromFileContent(fileContent) {
  const payload = JSON.parse(fileContent);
  return catalogFamiliesFromPayload(payload);
}

export function readPreflightReportFromFileContent(fileContent) {
  const payload = JSON.parse(fileContent);
  if (!payload || typeof payload !== 'object') {
    throw new Error('Preflight report JSON must be an object');
  }
  if (!Array.isArray(payload.frontier)) {
    throw new Error('Preflight report JSON must include "frontier" array');
  }
  return payload;
}

function nextRequiredAction({ scope, currentStatus }) {
  if (scope === FAMILY_SCOPE_REAL_SEED && currentStatus === 'CONTAMINATED_BY_WORKTREE') {
    return 'clean_gate_relevant_contamination';
  }
  if (scope === FAMILY_SCOPE_REAL_SEED && currentStatus === 'INSUFFICIENT_ANCHOR') {
    return 'add_real_seed_anchor_evidence';
  }
  if (scope === FAMILY_SCOPE_REAL_SEED && currentStatus === 'NEEDS_RECONCILIATION') {
    return 'reconcile_real_seed_evidence';
  }
  if (scope === FAMILY_SCOPE_REAL_SEED && currentStatus === 'OPEN_CANDIDATE') {
    return 'ready_for_runner_promotion_check';
  }
  if (scope === FAMILY_SCOPE_BOOTSTRAP && currentStatus === 'OPEN_CANDIDATE') {
    return 'do_not_promote_bootstrap_collect_real_seed_counterpart';
  }
  if (scope === FAMILY_SCOPE_BOOTSTRAP && currentStatus === 'INSUFFICIENT_ANCHOR') {
    return 'do_not_promote_bootstrap_collect_real_seed_counterpart';
  }
  return 'fallback_conservative_do_not_promote_bootstrap_without_real_seed_evidence';
}

function promotionCandidate({ scope, currentStatus }) {
  return scope === FAMILY_SCOPE_REAL_SEED && currentStatus === 'OPEN_CANDIDATE';
}

export function deriveCandidateDossiers({ catalogFamilies, preflightReport }) {
  const families = asArray(catalogFamilies);
  const frontier = asArray(preflightReport?.frontier);
  const familyById = new Map();

  for (const family of families) {
    if (!family || typeof family !== 'object') {
      continue;
    }
    if (typeof family.family_id !== 'string' || family.family_id.length === 0) {
      continue;
    }
    familyById.set(family.family_id, family);
  }

  const dossiers = [];
  for (const row of frontier) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    const familyId = typeof row.family_id === 'string' ? row.family_id : 'UNKNOWN_FAMILY';
    const scope = normalizeScope(row.scope);
    const currentStatus =
      typeof row.current_status === 'string' ? row.current_status : 'UNKNOWN_STATUS';
    const dominantBlocker =
      typeof row.dominant_blocker === 'string' ? row.dominant_blocker : 'none_or_unknown';
    const familyCatalog = familyById.get(familyId) ?? {};

    const dossier = {
      family_id: familyId,
      scope,
      current_status: currentStatus,
      dominant_blocker: dominantBlocker,
      promotion_candidate: promotionCandidate({ scope, currentStatus }),
      next_required_action: nextRequiredAction({ scope, currentStatus }),
      repo_contract_globs_count: countArray(familyCatalog.repo_contract_globs),
      repo_test_globs_count: countArray(familyCatalog.repo_test_globs),
      repo_wiring_globs_count: countArray(familyCatalog.repo_wiring_globs),
      closure_positive_terms_count: countArray(familyCatalog.closure_positive_terms),
      closure_negative_terms_count: countArray(familyCatalog.closure_negative_terms),
      closure_absorbed_terms_count: countArray(familyCatalog.closure_absorbed_terms),
      untracked_homonym_globs_count: countArray(familyCatalog.untracked_homonym_globs)
    };

    dossiers.push(dossier);
  }

  dossiers.sort((a, b) => a.family_id.localeCompare(b.family_id));
  return dossiers;
}

export function separateDossiersByScope(dossiers) {
  const all = asArray(dossiers);
  const realSeedDossiers = all.filter((item) => item.scope === FAMILY_SCOPE_REAL_SEED);
  const bootstrapDossiers = all.filter((item) => item.scope === FAMILY_SCOPE_BOOTSTRAP);

  return {
    realSeedDossiers,
    bootstrapDossiers
  };
}

export function deriveActionableFrontierSummary(dossiers) {
  const all = asArray(dossiers);
  const actionable = all.map((item) => ({
    family_id: item.family_id,
    scope: item.scope,
    current_status: item.current_status,
    dominant_blocker: item.dominant_blocker,
    promotion_candidate: item.promotion_candidate,
    next_required_action: item.next_required_action
  }));

  const actionCounts = {};
  for (const row of actionable) {
    actionCounts[row.next_required_action] = (actionCounts[row.next_required_action] ?? 0) + 1;
  }

  return {
    total: actionable.length,
    promotionCandidatesCount: actionable.filter((item) => item.promotion_candidate).length,
    actionCounts,
    entries: actionable
  };
}

export function buildCandidateIntakeReport({ catalogFamilies, preflightReport, dossiers }) {
  const separated = separateDossiersByScope(dossiers);
  const actionableFrontier = deriveActionableFrontierSummary(dossiers);

  return {
    meta: {
      intakeVersion: 'family_candidate_intake_v1',
      generatedAt: new Date().toISOString()
    },
    input_summary: {
      catalog_families_count: asArray(catalogFamilies).length,
      preflight_frontier_count: asArray(preflightReport?.frontier).length,
      preflight_verdict: preflightReport?.fq?.verdict ?? 'UNKNOWN_VERDICT',
      preflight_shortlist_real_count: countArray(preflightReport?.fq?.shortlistReal),
      preflight_bootstrap_shortlist_count: countArray(preflightReport?.fq?.bootstrapShortlist)
    },
    real_seed_candidate_dossiers: separated.realSeedDossiers,
    bootstrap_auxiliary_dossiers: separated.bootstrapDossiers,
    actionable_frontier: actionableFrontier
  };
}

export function renderCandidateIntakeTextReport(report) {
  const lines = [];

  lines.push('1. INPUT SUMMARY');
  lines.push(`catalog_families_count: ${report.input_summary.catalog_families_count}`);
  lines.push(`preflight_frontier_count: ${report.input_summary.preflight_frontier_count}`);
  lines.push(`preflight_verdict: ${report.input_summary.preflight_verdict}`);
  lines.push(
    `preflight_shortlist_real_count: ${report.input_summary.preflight_shortlist_real_count}`
  );
  lines.push(
    `preflight_bootstrap_shortlist_count: ${report.input_summary.preflight_bootstrap_shortlist_count}`
  );
  lines.push('');

  lines.push('2. REAL_SEED CANDIDATE DOSSIERS');
  if (report.real_seed_candidate_dossiers.length === 0) {
    lines.push('none');
  } else {
    for (const dossier of report.real_seed_candidate_dossiers) {
      lines.push(
        `- ${dossier.family_id} status=${dossier.current_status} blocker=${dossier.dominant_blocker} promotion_candidate=${dossier.promotion_candidate} next_required_action=${dossier.next_required_action}`
      );
    }
  }
  lines.push('');

  lines.push('3. BOOTSTRAP AUXILIARY DOSSIERS');
  if (report.bootstrap_auxiliary_dossiers.length === 0) {
    lines.push('none');
  } else {
    for (const dossier of report.bootstrap_auxiliary_dossiers) {
      lines.push(
        `- ${dossier.family_id} status=${dossier.current_status} blocker=${dossier.dominant_blocker} promotion_candidate=${dossier.promotion_candidate} next_required_action=${dossier.next_required_action}`
      );
    }
  }
  lines.push('');

  lines.push('4. ACTIONABLE FRONTIER');
  lines.push(`total: ${report.actionable_frontier.total}`);
  lines.push(`promotion_candidates_count: ${report.actionable_frontier.promotionCandidatesCount}`);
  lines.push(`action_counts: ${JSON.stringify(report.actionable_frontier.actionCounts)}`);
  for (const row of report.actionable_frontier.entries) {
    lines.push(
      `- ${row.family_id} [${row.scope}] status=${row.current_status} dominant_blocker=${row.dominant_blocker} promotion_candidate=${row.promotion_candidate} next_required_action=${row.next_required_action}`
    );
  }

  return `${lines.join('\n')}\n`;
}

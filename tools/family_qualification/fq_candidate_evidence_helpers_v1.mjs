const FAMILY_SCOPE_BOOTSTRAP = 'BOOTSTRAP';
const FAMILY_SCOPE_REAL_SEED = 'REAL_SEED';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeScope(value) {
  if (value === FAMILY_SCOPE_BOOTSTRAP) {
    return FAMILY_SCOPE_BOOTSTRAP;
  }
  return FAMILY_SCOPE_REAL_SEED;
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

function cloneStringArray(value) {
  return asArray(value).filter((item) => typeof item === 'string').map((item) => item);
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

function cloneAnchorArrays(familyCatalog) {
  return {
    repo_contract_globs: cloneStringArray(familyCatalog.repo_contract_globs),
    repo_test_globs: cloneStringArray(familyCatalog.repo_test_globs),
    repo_wiring_globs: cloneStringArray(familyCatalog.repo_wiring_globs),
    closure_positive_terms: cloneStringArray(familyCatalog.closure_positive_terms),
    closure_negative_terms: cloneStringArray(familyCatalog.closure_negative_terms),
    closure_absorbed_terms: cloneStringArray(familyCatalog.closure_absorbed_terms),
    untracked_homonym_globs: cloneStringArray(familyCatalog.untracked_homonym_globs)
  };
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

export function deriveCandidateEvidenceDossiers({ catalogFamilies, preflightReport }) {
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

  const dossiers = frontier.map((row) => {
    const familyId = typeof row?.family_id === 'string' ? row.family_id : 'UNKNOWN_FAMILY';
    const scope = normalizeScope(row?.scope);
    const currentStatus =
      typeof row?.current_status === 'string' ? row.current_status : 'UNKNOWN_STATUS';
    const dominantBlocker =
      typeof row?.dominant_blocker === 'string' ? row.dominant_blocker : 'none_or_unknown';
    const familyCatalog = familyById.get(familyId) ?? {};
    return {
      family_id: familyId,
      scope,
      current_status: currentStatus,
      dominant_blocker: dominantBlocker,
      promotion_candidate: promotionCandidate({ scope, currentStatus }),
      next_required_action: nextRequiredAction({ scope, currentStatus }),
      ...cloneAnchorArrays(familyCatalog)
    };
  });

  dossiers.sort((a, b) => a.family_id.localeCompare(b.family_id));
  return dossiers;
}

export function separateEvidenceDossiersByScope(dossiers) {
  const all = asArray(dossiers);
  const realSeedDossiers = all.filter((item) => item.scope === FAMILY_SCOPE_REAL_SEED);
  const bootstrapDossiers = all.filter((item) => item.scope === FAMILY_SCOPE_BOOTSTRAP);
  return {
    realSeedDossiers,
    bootstrapDossiers
  };
}

export function deriveExecutableFrontierFromDossiers(dossiers) {
  const all = asArray(dossiers);
  return all.map((item) => ({
    family_id: item.family_id,
    scope: item.scope,
    current_status: item.current_status,
    dominant_blocker: item.dominant_blocker,
    promotion_candidate: item.promotion_candidate,
    next_required_action: item.next_required_action,
    repo_contract_globs: cloneStringArray(item.repo_contract_globs),
    repo_test_globs: cloneStringArray(item.repo_test_globs),
    repo_wiring_globs: cloneStringArray(item.repo_wiring_globs),
    closure_positive_terms: cloneStringArray(item.closure_positive_terms),
    closure_negative_terms: cloneStringArray(item.closure_negative_terms),
    closure_absorbed_terms: cloneStringArray(item.closure_absorbed_terms),
    untracked_homonym_globs: cloneStringArray(item.untracked_homonym_globs)
  }));
}

export function derivePromotionPacketsFromDossiers(dossiers) {
  return asArray(dossiers)
    .filter(
      (item) =>
        item.scope === FAMILY_SCOPE_REAL_SEED &&
        item.current_status === 'OPEN_CANDIDATE' &&
        item.promotion_candidate === true
    )
    .map((item) => ({
      family_id: item.family_id,
      current_status: item.current_status,
      promotion_candidate: item.promotion_candidate,
      next_required_action: item.next_required_action,
      repo_contract_globs: cloneStringArray(item.repo_contract_globs),
      repo_test_globs: cloneStringArray(item.repo_test_globs),
      repo_wiring_globs: cloneStringArray(item.repo_wiring_globs),
      closure_positive_terms: cloneStringArray(item.closure_positive_terms),
      closure_negative_terms: cloneStringArray(item.closure_negative_terms),
      closure_absorbed_terms: cloneStringArray(item.closure_absorbed_terms),
      untracked_homonym_globs: cloneStringArray(item.untracked_homonym_globs)
    }));
}

export function buildCandidateEvidenceReport({
  catalogFamilies,
  preflightReport,
  evidenceDossiers
}) {
  const separated = separateEvidenceDossiersByScope(evidenceDossiers);
  const executableFrontier = deriveExecutableFrontierFromDossiers(evidenceDossiers);
  const promotionPackets = derivePromotionPacketsFromDossiers(evidenceDossiers);

  return {
    meta: {
      evidenceVersion: 'family_candidate_evidence_v1',
      generatedAt: new Date().toISOString()
    },
    input_summary: {
      catalog_families_count: asArray(catalogFamilies).length,
      preflight_frontier_count: asArray(preflightReport?.frontier).length,
      preflight_verdict: preflightReport?.fq?.verdict ?? 'UNKNOWN_VERDICT',
      preflight_shortlist_real_count: asArray(preflightReport?.fq?.shortlistReal).length,
      preflight_bootstrap_shortlist_count: asArray(preflightReport?.fq?.bootstrapShortlist).length
    },
    real_seed_evidence_dossiers: separated.realSeedDossiers,
    bootstrap_auxiliary_dossiers: separated.bootstrapDossiers,
    executable_frontier: executableFrontier,
    promotion_packets: promotionPackets
  };
}

export function renderCandidateEvidenceTextReport(report) {
  const lines = [];

  function appendAnchorLines(entry) {
    lines.push(`  repo_contract_globs: ${JSON.stringify(cloneStringArray(entry.repo_contract_globs))}`);
    lines.push(`  repo_test_globs: ${JSON.stringify(cloneStringArray(entry.repo_test_globs))}`);
    lines.push(`  repo_wiring_globs: ${JSON.stringify(cloneStringArray(entry.repo_wiring_globs))}`);
    lines.push(
      `  closure_positive_terms: ${JSON.stringify(cloneStringArray(entry.closure_positive_terms))}`
    );
    lines.push(
      `  closure_negative_terms: ${JSON.stringify(cloneStringArray(entry.closure_negative_terms))}`
    );
    lines.push(
      `  closure_absorbed_terms: ${JSON.stringify(cloneStringArray(entry.closure_absorbed_terms))}`
    );
    lines.push(
      `  untracked_homonym_globs: ${JSON.stringify(cloneStringArray(entry.untracked_homonym_globs))}`
    );
  }

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

  lines.push('2. REAL_SEED EVIDENCE DOSSIERS');
  if (report.real_seed_evidence_dossiers.length === 0) {
    lines.push('none');
  } else {
    for (const dossier of report.real_seed_evidence_dossiers) {
      lines.push(
        `- ${dossier.family_id} status=${dossier.current_status} blocker=${dossier.dominant_blocker} promotion_candidate=${dossier.promotion_candidate} next_required_action=${dossier.next_required_action}`
      );
      appendAnchorLines(dossier);
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
      appendAnchorLines(dossier);
    }
  }
  lines.push('');

  lines.push('4. EXECUTABLE FRONTIER');
  lines.push(`total: ${report.executable_frontier.length}`);
  for (const row of report.executable_frontier) {
    lines.push(
      `- ${row.family_id} [${row.scope}] status=${row.current_status} dominant_blocker=${row.dominant_blocker} promotion_candidate=${row.promotion_candidate} next_required_action=${row.next_required_action}`
    );
    appendAnchorLines(row);
  }
  lines.push('');

  lines.push('5. PROMOTION PACKETS');
  if (report.promotion_packets.length === 0) {
    lines.push('none');
  } else {
    for (const packet of report.promotion_packets) {
      lines.push(
        `- ${packet.family_id} status=${packet.current_status} promotion_candidate=${packet.promotion_candidate} next_required_action=${packet.next_required_action}`
      );
      appendAnchorLines(packet);
    }
  }

  return `${lines.join('\n')}\n`;
}

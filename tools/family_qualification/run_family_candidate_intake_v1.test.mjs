import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  deriveCandidateDossiers,
  buildCandidateIntakeReport
} from './fq_candidate_intake_helpers_v1.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const intakeCliPath = path.join(
  repoRoot,
  'tools/family_qualification/run_family_candidate_intake_v1.mjs'
);

test('helper maps required actions and promotion_candidate deterministically', () => {
  const catalogFamilies = [
    {
      family_id: 'real_seed_contaminated_min_v1',
      family_scope: 'REAL_SEED',
      repo_contract_globs: ['a'],
      repo_test_globs: ['a'],
      repo_wiring_globs: ['a'],
      closure_positive_terms: ['a'],
      closure_negative_terms: [],
      closure_absorbed_terms: [],
      untracked_homonym_globs: ['a']
    },
    {
      family_id: 'real_seed_insufficient_anchor_min_v1',
      family_scope: 'REAL_SEED',
      repo_contract_globs: [],
      repo_test_globs: ['a'],
      repo_wiring_globs: [],
      closure_positive_terms: [],
      closure_negative_terms: [],
      closure_absorbed_terms: [],
      untracked_homonym_globs: ['a']
    },
    {
      family_id: 'real_seed_reconciliation_min_v1',
      family_scope: 'REAL_SEED',
      repo_contract_globs: [],
      repo_test_globs: [],
      repo_wiring_globs: [],
      closure_positive_terms: [],
      closure_negative_terms: [],
      closure_absorbed_terms: ['a'],
      untracked_homonym_globs: []
    },
    {
      family_id: 'real_seed_open_candidate_min_v1',
      family_scope: 'REAL_SEED',
      repo_contract_globs: [],
      repo_test_globs: [],
      repo_wiring_globs: ['a'],
      closure_positive_terms: ['a'],
      closure_negative_terms: [],
      closure_absorbed_terms: [],
      untracked_homonym_globs: []
    },
    {
      family_id: 'bootstrap_open_candidate_probe_min_v1',
      family_scope: 'BOOTSTRAP',
      repo_contract_globs: [],
      repo_test_globs: [],
      repo_wiring_globs: ['a'],
      closure_positive_terms: [],
      closure_negative_terms: [],
      closure_absorbed_terms: [],
      untracked_homonym_globs: []
    }
  ];

  const preflightReport = {
    frontier: [
      {
        family_id: 'real_seed_contaminated_min_v1',
        scope: 'REAL_SEED',
        current_status: 'CONTAMINATED_BY_WORKTREE',
        dominant_blocker: 'contamination'
      },
      {
        family_id: 'real_seed_insufficient_anchor_min_v1',
        scope: 'REAL_SEED',
        current_status: 'INSUFFICIENT_ANCHOR',
        dominant_blocker: 'insufficient_anchor'
      },
      {
        family_id: 'real_seed_reconciliation_min_v1',
        scope: 'REAL_SEED',
        current_status: 'NEEDS_RECONCILIATION',
        dominant_blocker: 'reconciliation'
      },
      {
        family_id: 'real_seed_open_candidate_min_v1',
        scope: 'REAL_SEED',
        current_status: 'OPEN_CANDIDATE',
        dominant_blocker: 'none_or_unknown'
      },
      {
        family_id: 'bootstrap_open_candidate_probe_min_v1',
        scope: 'BOOTSTRAP',
        current_status: 'OPEN_CANDIDATE',
        dominant_blocker: 'bootstrap_only'
      }
    ]
  };

  const dossiers = deriveCandidateDossiers({ catalogFamilies, preflightReport });
  const byId = new Map(dossiers.map((item) => [item.family_id, item]));

  assert.equal(
    byId.get('real_seed_contaminated_min_v1')?.next_required_action,
    'clean_gate_relevant_contamination'
  );
  assert.equal(
    byId.get('real_seed_insufficient_anchor_min_v1')?.next_required_action,
    'add_real_seed_anchor_evidence'
  );
  assert.equal(
    byId.get('real_seed_reconciliation_min_v1')?.next_required_action,
    'reconcile_real_seed_evidence'
  );
  assert.equal(
    byId.get('real_seed_open_candidate_min_v1')?.next_required_action,
    'ready_for_runner_promotion_check'
  );
  assert.equal(
    byId.get('bootstrap_open_candidate_probe_min_v1')?.next_required_action,
    'do_not_promote_bootstrap_collect_real_seed_counterpart'
  );

  assert.equal(byId.get('real_seed_open_candidate_min_v1')?.promotion_candidate, true);
  assert.equal(byId.get('real_seed_contaminated_min_v1')?.promotion_candidate, false);
  assert.equal(byId.get('real_seed_insufficient_anchor_min_v1')?.promotion_candidate, false);
  assert.equal(byId.get('real_seed_reconciliation_min_v1')?.promotion_candidate, false);
  assert.equal(byId.get('bootstrap_open_candidate_probe_min_v1')?.promotion_candidate, false);
});

test('CLI integration emits valid JSON/TXT and separates REAL_SEED vs BOOTSTRAP dossiers', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'family-candidate-intake-v1-'));
  const catalogPath = path.join(tempDir, 'catalog.json');
  const preflightPath = path.join(tempDir, 'preflight_report.json');
  const outputJsonPath = path.join(tempDir, 'candidate_intake_report.json');
  const outputTextPath = path.join(tempDir, 'candidate_intake_report.txt');

  const catalog = {
    catalog_version: 'candidate_intake_fixture_min_v1',
    families: [
      {
        family_id: 'draw_cards_add_counters_local_bridge_min_v1',
        family_scope: 'REAL_SEED',
        repo_contract_globs: ['src/contract/a.json'],
        repo_test_globs: ['src/tests/a.test.ts'],
        repo_wiring_globs: ['src/overlay/edges.ts'],
        closure_positive_terms: [],
        closure_negative_terms: [],
        closure_absorbed_terms: [],
        untracked_homonym_globs: ['src/tests/a.test.ts']
      },
      {
        family_id: 'bootstrap_open_candidate_probe_min_v1',
        family_scope: 'BOOTSTRAP',
        repo_contract_globs: [],
        repo_test_globs: [],
        repo_wiring_globs: ['tools/family_qualification/run_family_qualification_v1.mjs'],
        closure_positive_terms: [],
        closure_negative_terms: [],
        closure_absorbed_terms: [],
        untracked_homonym_globs: []
      },
      {
        family_id: 'bootstrap_insufficient_anchor_probe_min_v1',
        family_scope: 'BOOTSTRAP',
        repo_contract_globs: [],
        repo_test_globs: [],
        repo_wiring_globs: [],
        closure_positive_terms: [],
        closure_negative_terms: [],
        closure_absorbed_terms: [],
        untracked_homonym_globs: []
      }
    ]
  };

  const preflightReport = {
    fq: {
      verdict: 'NO_CLEAN_CANDIDATE',
      shortlistReal: [],
      bootstrapShortlist: ['bootstrap_open_candidate_probe_min_v1']
    },
    frontier: [
      {
        family_id: 'draw_cards_add_counters_local_bridge_min_v1',
        scope: 'REAL_SEED',
        current_status: 'CONTAMINATED_BY_WORKTREE',
        dominant_blocker: 'contamination'
      },
      {
        family_id: 'bootstrap_open_candidate_probe_min_v1',
        scope: 'BOOTSTRAP',
        current_status: 'OPEN_CANDIDATE',
        dominant_blocker: 'bootstrap_only'
      },
      {
        family_id: 'bootstrap_insufficient_anchor_probe_min_v1',
        scope: 'BOOTSTRAP',
        current_status: 'INSUFFICIENT_ANCHOR',
        dominant_blocker: 'insufficient_anchor'
      }
    ]
  };

  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  fs.writeFileSync(preflightPath, `${JSON.stringify(preflightReport, null, 2)}\n`, 'utf8');

  execFileSync(
    'node',
    [
      intakeCliPath,
      '--catalog',
      catalogPath,
      '--preflight-report',
      preflightPath,
      '--report',
      outputJsonPath,
      '--report-text',
      outputTextPath
    ],
    { cwd: repoRoot, stdio: 'pipe' }
  );

  const reportJson = JSON.parse(fs.readFileSync(outputJsonPath, 'utf8'));
  const reportText = fs.readFileSync(outputTextPath, 'utf8');

  assert.ok(reportJson && typeof reportJson === 'object');
  assert.equal(Array.isArray(reportJson.real_seed_candidate_dossiers), true);
  assert.equal(Array.isArray(reportJson.bootstrap_auxiliary_dossiers), true);
  assert.equal(reportJson.real_seed_candidate_dossiers.length, 1);
  assert.equal(reportJson.bootstrap_auxiliary_dossiers.length, 2);

  const realSeed = reportJson.real_seed_candidate_dossiers[0];
  assert.equal(realSeed.family_id, 'draw_cards_add_counters_local_bridge_min_v1');
  assert.equal(realSeed.scope, 'REAL_SEED');
  assert.equal(realSeed.next_required_action, 'clean_gate_relevant_contamination');
  assert.equal(realSeed.promotion_candidate, false);

  const bootstrapById = new Map(
    reportJson.bootstrap_auxiliary_dossiers.map((item) => [item.family_id, item])
  );
  assert.equal(
    bootstrapById.get('bootstrap_open_candidate_probe_min_v1')?.next_required_action,
    'do_not_promote_bootstrap_collect_real_seed_counterpart'
  );
  assert.equal(
    bootstrapById.get('bootstrap_open_candidate_probe_min_v1')?.promotion_candidate,
    false
  );
  assert.equal(
    bootstrapById.get('bootstrap_insufficient_anchor_probe_min_v1')?.next_required_action,
    'do_not_promote_bootstrap_collect_real_seed_counterpart'
  );

  assert.match(reportText, /^1\. INPUT SUMMARY/m);
  assert.match(reportText, /^2\. REAL_SEED CANDIDATE DOSSIERS/m);
  assert.match(reportText, /^3\. BOOTSTRAP AUXILIARY DOSSIERS/m);
  assert.match(reportText, /^4\. ACTIONABLE FRONTIER/m);
});

test('report builder keeps actionable frontier consistent with dossiers', () => {
  const catalogFamilies = [
    {
      family_id: 'real_seed_open_candidate_min_v1',
      family_scope: 'REAL_SEED',
      repo_contract_globs: [],
      repo_test_globs: [],
      repo_wiring_globs: ['x'],
      closure_positive_terms: ['x'],
      closure_negative_terms: [],
      closure_absorbed_terms: [],
      untracked_homonym_globs: []
    }
  ];

  const preflightReport = {
    fq: {
      verdict: 'SHORTLIST_READY',
      shortlistReal: ['real_seed_open_candidate_min_v1'],
      bootstrapShortlist: []
    },
    frontier: [
      {
        family_id: 'real_seed_open_candidate_min_v1',
        scope: 'REAL_SEED',
        current_status: 'OPEN_CANDIDATE',
        dominant_blocker: 'none_or_unknown'
      }
    ]
  };

  const dossiers = deriveCandidateDossiers({ catalogFamilies, preflightReport });
  const report = buildCandidateIntakeReport({
    catalogFamilies,
    preflightReport,
    dossiers
  });

  assert.equal(report.real_seed_candidate_dossiers.length, 1);
  assert.equal(report.bootstrap_auxiliary_dossiers.length, 0);
  assert.equal(report.actionable_frontier.total, 1);
  assert.equal(report.actionable_frontier.promotionCandidatesCount, 1);
  assert.equal(report.actionable_frontier.entries[0].promotion_candidate, true);
  assert.equal(
    report.actionable_frontier.entries[0].next_required_action,
    'ready_for_runner_promotion_check'
  );
});

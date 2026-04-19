import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  buildCandidateEvidenceReport,
  deriveCandidateEvidenceDossiers,
  deriveExecutableFrontierFromDossiers,
  derivePromotionPacketsFromDossiers
} from './fq_candidate_evidence_helpers_v1.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const evidenceHelpersPath = path.join(
  repoRoot,
  'tools/family_qualification/fq_candidate_evidence_helpers_v1.mjs'
);
const evidenceCliPath = path.join(
  repoRoot,
  'tools/family_qualification/run_family_candidate_evidence_v1.mjs'
);

test('evidence helper is autonomous and does not import intake helper', () => {
  const source = fs.readFileSync(evidenceHelpersPath, 'utf8');
  assert.doesNotMatch(source, /fq_candidate_intake_helpers_v1\.mjs/);
  assert.doesNotMatch(source, /\bderiveCandidateDossiers\b/);
});

test('preserves next_required_action and promotion_candidate exactly from intake mapping', () => {
  const catalogFamilies = [
    {
      family_id: 'real_seed_contaminated_min_v1',
      family_scope: 'REAL_SEED',
      repo_contract_globs: ['rc1'],
      repo_test_globs: ['rt1'],
      repo_wiring_globs: ['rw1'],
      closure_positive_terms: ['cp1'],
      closure_negative_terms: ['cn1'],
      closure_absorbed_terms: ['ca1'],
      untracked_homonym_globs: ['uh1']
    },
    {
      family_id: 'real_seed_insufficient_anchor_min_v1',
      family_scope: 'REAL_SEED',
      repo_contract_globs: ['rc2'],
      repo_test_globs: ['rt2'],
      repo_wiring_globs: ['rw2'],
      closure_positive_terms: ['cp2'],
      closure_negative_terms: ['cn2'],
      closure_absorbed_terms: ['ca2'],
      untracked_homonym_globs: ['uh2']
    },
    {
      family_id: 'real_seed_reconciliation_min_v1',
      family_scope: 'REAL_SEED',
      repo_contract_globs: ['rc3'],
      repo_test_globs: ['rt3'],
      repo_wiring_globs: ['rw3'],
      closure_positive_terms: ['cp3'],
      closure_negative_terms: ['cn3'],
      closure_absorbed_terms: ['ca3'],
      untracked_homonym_globs: ['uh3']
    },
    {
      family_id: 'real_seed_open_candidate_min_v1',
      family_scope: 'REAL_SEED',
      repo_contract_globs: ['rc4'],
      repo_test_globs: ['rt4'],
      repo_wiring_globs: ['rw4'],
      closure_positive_terms: ['cp4'],
      closure_negative_terms: ['cn4'],
      closure_absorbed_terms: ['ca4'],
      untracked_homonym_globs: ['uh4']
    },
    {
      family_id: 'bootstrap_open_candidate_probe_min_v1',
      family_scope: 'BOOTSTRAP',
      repo_contract_globs: ['bc1'],
      repo_test_globs: ['bt1'],
      repo_wiring_globs: ['bw1'],
      closure_positive_terms: ['bp1'],
      closure_negative_terms: ['bn1'],
      closure_absorbed_terms: ['ba1'],
      untracked_homonym_globs: ['bu1']
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

  const dossiers = deriveCandidateEvidenceDossiers({ catalogFamilies, preflightReport });
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

  assert.deepEqual(byId.get('real_seed_open_candidate_min_v1')?.repo_contract_globs, ['rc4']);
  assert.deepEqual(byId.get('real_seed_open_candidate_min_v1')?.repo_test_globs, ['rt4']);
  assert.deepEqual(byId.get('real_seed_open_candidate_min_v1')?.repo_wiring_globs, ['rw4']);
  assert.deepEqual(byId.get('real_seed_open_candidate_min_v1')?.closure_positive_terms, ['cp4']);
  assert.deepEqual(byId.get('real_seed_open_candidate_min_v1')?.closure_negative_terms, ['cn4']);
  assert.deepEqual(byId.get('real_seed_open_candidate_min_v1')?.closure_absorbed_terms, ['ca4']);
  assert.deepEqual(byId.get('real_seed_open_candidate_min_v1')?.untracked_homonym_globs, ['uh4']);
});

test('executable frontier is consistent with evidence dossiers and promotion packets stay real-seed only', () => {
  const dossiers = [
    {
      family_id: 'real_seed_open_candidate_min_v1',
      scope: 'REAL_SEED',
      current_status: 'OPEN_CANDIDATE',
      dominant_blocker: 'none_or_unknown',
      promotion_candidate: true,
      next_required_action: 'ready_for_runner_promotion_check',
      repo_contract_globs: ['rc'],
      repo_test_globs: ['rt'],
      repo_wiring_globs: ['rw'],
      closure_positive_terms: ['cp'],
      closure_negative_terms: [],
      closure_absorbed_terms: [],
      untracked_homonym_globs: []
    },
    {
      family_id: 'bootstrap_open_candidate_probe_min_v1',
      scope: 'BOOTSTRAP',
      current_status: 'OPEN_CANDIDATE',
      dominant_blocker: 'bootstrap_only',
      promotion_candidate: false,
      next_required_action: 'do_not_promote_bootstrap_collect_real_seed_counterpart',
      repo_contract_globs: ['bc'],
      repo_test_globs: ['bt'],
      repo_wiring_globs: ['bw'],
      closure_positive_terms: [],
      closure_negative_terms: [],
      closure_absorbed_terms: [],
      untracked_homonym_globs: []
    }
  ];

  const frontier = deriveExecutableFrontierFromDossiers(dossiers);
  assert.equal(frontier.length, 2);
  assert.deepEqual(frontier[0], dossiers[0]);
  assert.deepEqual(frontier[1], dossiers[1]);

  const packets = derivePromotionPacketsFromDossiers(dossiers);
  assert.equal(packets.length, 1);
  assert.equal(packets[0].family_id, 'real_seed_open_candidate_min_v1');
  assert.equal(packets[0].promotion_candidate, true);
  assert.ok(!packets.some((item) => item.family_id === 'bootstrap_open_candidate_probe_min_v1'));
});

test('CLI integration emits valid JSON/TXT with required sections and scope separation', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'family-candidate-evidence-v1-'));
  const catalogPath = path.join(tempDir, 'catalog.json');
  const preflightPath = path.join(tempDir, 'preflight_report.json');
  const outputJsonPath = path.join(tempDir, 'candidate_evidence_report.json');
  const outputTextPath = path.join(tempDir, 'candidate_evidence_report.txt');

  const catalog = {
    catalog_version: 'candidate_evidence_fixture_min_v1',
    families: [
      {
        family_id: 'real_seed_open_candidate_min_v1',
        family_scope: 'REAL_SEED',
        repo_contract_globs: ['src/contract/open.json'],
        repo_test_globs: ['src/tests/open.test.ts'],
        repo_wiring_globs: ['src/overlay/edges.ts'],
        closure_positive_terms: ['open positive'],
        closure_negative_terms: [],
        closure_absorbed_terms: [],
        untracked_homonym_globs: ['src/tests/open.test.ts']
      },
      {
        family_id: 'bootstrap_open_candidate_probe_min_v1',
        family_scope: 'BOOTSTRAP',
        repo_contract_globs: ['tools/bootstrap.contract.json'],
        repo_test_globs: ['tools/bootstrap.test.txt'],
        repo_wiring_globs: ['tools/bootstrap.wiring.txt'],
        closure_positive_terms: [],
        closure_negative_terms: [],
        closure_absorbed_terms: [],
        untracked_homonym_globs: []
      }
    ]
  };

  const preflightReport = {
    fq: {
      verdict: 'SHORTLIST_READY',
      shortlistReal: ['real_seed_open_candidate_min_v1'],
      bootstrapShortlist: ['bootstrap_open_candidate_probe_min_v1']
    },
    frontier: [
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

  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  fs.writeFileSync(preflightPath, `${JSON.stringify(preflightReport, null, 2)}\n`, 'utf8');

  execFileSync(
    'node',
    [
      evidenceCliPath,
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

  const report = JSON.parse(fs.readFileSync(outputJsonPath, 'utf8'));
  const reportText = fs.readFileSync(outputTextPath, 'utf8');

  assert.ok(report && typeof report === 'object');
  assert.equal(report.real_seed_evidence_dossiers.length, 1);
  assert.equal(report.bootstrap_auxiliary_dossiers.length, 1);

  const realSeed = report.real_seed_evidence_dossiers[0];
  const bootstrap = report.bootstrap_auxiliary_dossiers[0];

  assert.equal(realSeed.family_id, 'real_seed_open_candidate_min_v1');
  assert.equal(realSeed.scope, 'REAL_SEED');
  assert.equal(realSeed.promotion_candidate, true);
  assert.equal(realSeed.next_required_action, 'ready_for_runner_promotion_check');
  assert.deepEqual(realSeed.repo_contract_globs, ['src/contract/open.json']);
  assert.deepEqual(realSeed.repo_test_globs, ['src/tests/open.test.ts']);
  assert.deepEqual(realSeed.repo_wiring_globs, ['src/overlay/edges.ts']);

  assert.equal(bootstrap.family_id, 'bootstrap_open_candidate_probe_min_v1');
  assert.equal(bootstrap.scope, 'BOOTSTRAP');
  assert.equal(bootstrap.promotion_candidate, false);
  assert.equal(
    bootstrap.next_required_action,
    'do_not_promote_bootstrap_collect_real_seed_counterpart'
  );

  assert.equal(report.executable_frontier.length, 2);
  const executableById = new Map(
    report.executable_frontier.map((item) => [item.family_id, item])
  );
  assert.deepEqual(executableById.get(realSeed.family_id), realSeed);
  assert.deepEqual(executableById.get(bootstrap.family_id), bootstrap);

  assert.equal(report.promotion_packets.length, 1);
  assert.equal(report.promotion_packets[0].family_id, 'real_seed_open_candidate_min_v1');
  assert.ok(
    !report.promotion_packets.some(
      (item) => item.family_id === 'bootstrap_open_candidate_probe_min_v1'
    )
  );

  assert.match(reportText, /^1\. INPUT SUMMARY/m);
  assert.match(reportText, /^2\. REAL_SEED EVIDENCE DOSSIERS/m);
  assert.match(reportText, /^3\. BOOTSTRAP AUXILIARY DOSSIERS/m);
  assert.match(reportText, /^4\. EXECUTABLE FRONTIER/m);
  assert.match(reportText, /^5\. PROMOTION PACKETS/m);
  assert.match(reportText, /repo_contract_globs:/);
  assert.match(reportText, /repo_test_globs:/);
  assert.match(reportText, /repo_wiring_globs:/);
  assert.match(reportText, /closure_positive_terms:/);
  assert.match(reportText, /closure_negative_terms:/);
  assert.match(reportText, /closure_absorbed_terms:/);
  assert.match(reportText, /untracked_homonym_globs:/);
});

test('report builder returns required top-level shape', () => {
  const catalogFamilies = [
    {
      family_id: 'real_seed_contaminated_min_v1',
      family_scope: 'REAL_SEED',
      repo_contract_globs: ['c1'],
      repo_test_globs: ['t1'],
      repo_wiring_globs: ['w1'],
      closure_positive_terms: [],
      closure_negative_terms: [],
      closure_absorbed_terms: [],
      untracked_homonym_globs: ['u1']
    }
  ];

  const preflightReport = {
    fq: {
      verdict: 'NO_CLEAN_CANDIDATE',
      shortlistReal: [],
      bootstrapShortlist: []
    },
    frontier: [
      {
        family_id: 'real_seed_contaminated_min_v1',
        scope: 'REAL_SEED',
        current_status: 'CONTAMINATED_BY_WORKTREE',
        dominant_blocker: 'contamination'
      }
    ]
  };

  const evidenceDossiers = deriveCandidateEvidenceDossiers({ catalogFamilies, preflightReport });
  const report = buildCandidateEvidenceReport({
    catalogFamilies,
    preflightReport,
    evidenceDossiers
  });

  assert.ok(report.meta && typeof report.meta === 'object');
  assert.ok(report.input_summary && typeof report.input_summary === 'object');
  assert.ok(Array.isArray(report.real_seed_evidence_dossiers));
  assert.ok(Array.isArray(report.bootstrap_auxiliary_dossiers));
  assert.ok(Array.isArray(report.executable_frontier));
  assert.ok(Array.isArray(report.promotion_packets));
  assert.equal(report.real_seed_evidence_dossiers.length, 1);
});

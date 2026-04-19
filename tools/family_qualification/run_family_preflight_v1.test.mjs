import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  derivePromotionFrontier,
  deriveRepoState,
  splitContaminationByCatalog
} from './fq_preflight_helpers_v1.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const preflightRunnerPath = path.join(
  repoRoot,
  'tools/family_qualification/run_family_preflight_v1.mjs'
);

function seedGitRepo(repoDir) {
  execFileSync('git', ['init'], { cwd: repoDir, stdio: 'pipe' });
  execFileSync('git', ['config', 'user.email', 'family-preflight-tests@example.local'], {
    cwd: repoDir,
    stdio: 'pipe'
  });
  execFileSync('git', ['config', 'user.name', 'family-preflight-tests'], {
    cwd: repoDir,
    stdio: 'pipe'
  });
  execFileSync('git', ['add', '.'], { cwd: repoDir, stdio: 'pipe' });
  execFileSync('git', ['commit', '-m', 'seed fixture'], { cwd: repoDir, stdio: 'pipe' });
  execFileSync('git', ['branch', '-M', 'main'], { cwd: repoDir, stdio: 'pipe' });
  execFileSync('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD'], {
    cwd: repoDir,
    stdio: 'pipe'
  });
}

test('deriveRepoState + contamination split separate gate-affecting hits from non-gate noise', () => {
  const statusShortRaw = [
    ' M src/engine/semantic/overlay/sem_edges.ts',
    '?? src/engine/semantic/tests/sem_overlay_draw_cards_add_counters_local_bridge_min_v1.test.ts',
    '?? artifacts/noise.txt'
  ].join('\n');

  const repoState = deriveRepoState({
    branchRaw: 'main\n',
    headRaw: 'abc123\n',
    originMainRaw: 'abc123\n',
    statusShortRaw
  });

  assert.equal(repoState.headEqualsOriginMain, true);
  assert.equal(repoState.trackedModified, true);
  assert.deepEqual(repoState.trackedModifiedPaths, ['src/engine/semantic/overlay/sem_edges.ts']);
  assert.equal(repoState.untracked, true);
  assert.deepEqual(repoState.untrackedPaths, [
    'artifacts/noise.txt',
    'src/engine/semantic/tests/sem_overlay_draw_cards_add_counters_local_bridge_min_v1.test.ts'
  ]);

  const contamination = splitContaminationByCatalog({
    catalogFamilies: [
      {
        family_id: 'draw_cards_add_counters_local_bridge_min_v1',
        family_scope: 'REAL_SEED',
        untracked_homonym_globs: [
          'src/engine/semantic/tests/sem_overlay_draw_cards_add_counters_local_bridge_min_v1.test.ts'
        ]
      }
    ],
    untrackedPaths: repoState.untrackedPaths
  });

  assert.equal(contamination.gateAffectingHits.length, 1);
  assert.equal(
    contamination.gateAffectingHits[0].family_id,
    'draw_cards_add_counters_local_bridge_min_v1'
  );
  assert.deepEqual(contamination.gateAffectingHits[0].matched_paths, [
    'src/engine/semantic/tests/sem_overlay_draw_cards_add_counters_local_bridge_min_v1.test.ts'
  ]);
  assert.equal(contamination.nonGateNoiseCount, 1);
  assert.deepEqual(contamination.nonGateNoisePaths, ['artifacts/noise.txt']);
});

test('derivePromotionFrontier exposes scope and dominant blocker explicitly', () => {
  const frontier = derivePromotionFrontier([
    {
      family_id: 'draw_cards_add_counters_local_bridge_min_v1',
      family_scope: 'REAL_SEED',
      status: 'CONTAMINATED_BY_WORKTREE'
    },
    {
      family_id: 'bootstrap_open_candidate_probe_min_v1',
      family_scope: 'BOOTSTRAP',
      status: 'OPEN_CANDIDATE'
    },
    {
      family_id: 'bootstrap_insufficient_anchor_probe_min_v1',
      family_scope: 'BOOTSTRAP',
      status: 'INSUFFICIENT_ANCHOR'
    },
    {
      family_id: 'needs_reconciliation_probe_min_v1',
      family_scope: 'REAL_SEED',
      status: 'NEEDS_RECONCILIATION'
    },
    {
      family_id: 'draw_cards_mill_local_bridge_min_v1',
      family_scope: 'REAL_SEED',
      status: 'CLOSED'
    }
  ]);

  const byId = new Map(frontier.map((row) => [row.family_id, row]));
  assert.equal(
    byId.get('draw_cards_add_counters_local_bridge_min_v1')?.dominant_blocker,
    'contamination'
  );
  assert.equal(
    byId.get('bootstrap_open_candidate_probe_min_v1')?.dominant_blocker,
    'bootstrap_only'
  );
  assert.equal(
    byId.get('bootstrap_insufficient_anchor_probe_min_v1')?.dominant_blocker,
    'insufficient_anchor'
  );
  assert.equal(
    byId.get('needs_reconciliation_probe_min_v1')?.dominant_blocker,
    'reconciliation'
  );
  assert.ok(!byId.has('draw_cards_mill_local_bridge_min_v1'));
});

test('run_family_preflight_v1 emits consolidated report with sectioned text output', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'family-preflight-v1-cli-'));
  const repoDir = path.join(tempDir, 'repo');
  fs.mkdirSync(repoDir, { recursive: true });

  const trackedFiles = [
    ['material/bootstrap_probe.wiring.txt', 'bootstrap wiring\n'],
    ['material/real_candidate.wiring.txt', 'real candidate wiring\n'],
    ['material/closed.contract.json', '{ "fixture": "closed" }\n'],
    ['material/closed.test.txt', 'closed test\n'],
    ['material/closed.wiring.txt', 'closed wiring\n']
  ];

  for (const [relativePath, content] of trackedFiles) {
    const absolutePath = path.join(repoDir, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content, 'utf8');
  }

  const closurePath = path.join(repoDir, 'closure.txt');
  fs.writeFileSync(closurePath, 'preflight fixture closure\n', 'utf8');

  const catalogPath = path.join(repoDir, 'catalog.json');
  const catalog = {
    catalog_version: 'preflight_fixture_min_v1',
    families: [
      {
        family_id: 'draw_cards_add_counters_local_bridge_min_v1',
        family_scope: 'REAL_SEED',
        label: 'REAL_SEED contaminated candidate',
        repo_contract_globs: [],
        repo_test_globs: [],
        repo_wiring_globs: ['material/real_candidate.wiring.txt'],
        untracked_homonym_globs: ['material/real_candidate.untracked.txt'],
        closure_positive_terms: [],
        closure_negative_terms: [],
        closure_absorbed_terms: []
      },
      {
        family_id: 'bootstrap_open_candidate_probe_min_v1',
        family_scope: 'BOOTSTRAP',
        label: 'BOOTSTRAP open candidate probe',
        repo_contract_globs: [],
        repo_test_globs: [],
        repo_wiring_globs: ['material/bootstrap_probe.wiring.txt'],
        untracked_homonym_globs: ['material/bootstrap_probe.untracked.txt'],
        closure_positive_terms: [],
        closure_negative_terms: [],
        closure_absorbed_terms: []
      },
      {
        family_id: 'bootstrap_insufficient_anchor_probe_min_v1',
        family_scope: 'BOOTSTRAP',
        label: 'BOOTSTRAP insufficient anchor probe',
        repo_contract_globs: [],
        repo_test_globs: [],
        repo_wiring_globs: ['material/missing.wiring.txt'],
        untracked_homonym_globs: ['material/bootstrap_insufficient.untracked.txt'],
        closure_positive_terms: [],
        closure_negative_terms: [],
        closure_absorbed_terms: []
      },
      {
        family_id: 'draw_cards_mill_local_bridge_min_v1',
        family_scope: 'REAL_SEED',
        label: 'REAL_SEED closed fixture',
        repo_contract_globs: ['material/closed.contract.json'],
        repo_test_globs: ['material/closed.test.txt'],
        repo_wiring_globs: ['material/closed.wiring.txt'],
        untracked_homonym_globs: ['material/closed.untracked.txt'],
        closure_positive_terms: [],
        closure_negative_terms: [],
        closure_absorbed_terms: []
      }
    ]
  };
  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');

  seedGitRepo(repoDir);

  fs.writeFileSync(path.join(repoDir, 'material/real_candidate.untracked.txt'), 'gate hit\n', 'utf8');
  fs.writeFileSync(path.join(repoDir, 'unrelated_noise.txt'), 'non-gate noise\n', 'utf8');

  const reportPath = path.join(tempDir, 'preflight_report.json');
  const reportTextPath = path.join(tempDir, 'preflight_report.txt');

  execFileSync(
    'node',
    [
      preflightRunnerPath,
      '--closure',
      closurePath,
      '--catalog',
      catalogPath,
      '--report',
      reportPath,
      '--report-text',
      reportTextPath
    ],
    { cwd: repoDir, stdio: 'pipe' }
  );

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const reportText = fs.readFileSync(reportTextPath, 'utf8');

  assert.equal(report.repo.branch, 'main');
  assert.equal(report.repo.headEqualsOriginMain, true);
  assert.equal(report.repo.trackedModified, false);
  assert.equal(report.repo.untracked, true);

  assert.equal(report.contamination.gateAffectingHits.length, 1);
  assert.equal(
    report.contamination.gateAffectingHits[0].family_id,
    'draw_cards_add_counters_local_bridge_min_v1'
  );
  assert.equal(report.contamination.nonGateNoiseCount, 1);
  assert.deepEqual(report.contamination.nonGateNoisePaths, ['unrelated_noise.txt']);

  assert.equal(report.fq.verdict, 'NO_CLEAN_CANDIDATE');
  assert.deepEqual(report.fq.shortlistReal, []);
  assert.deepEqual(report.fq.bootstrapShortlist, ['bootstrap_open_candidate_probe_min_v1']);
  assert.equal(report.fq.repoDirtyGlobal, true);

  const frontierById = new Map(report.frontier.map((item) => [item.family_id, item]));
  assert.equal(
    frontierById.get('draw_cards_add_counters_local_bridge_min_v1')?.dominant_blocker,
    'contamination'
  );
  assert.equal(
    frontierById.get('bootstrap_open_candidate_probe_min_v1')?.dominant_blocker,
    'bootstrap_only'
  );
  assert.equal(
    frontierById.get('bootstrap_insufficient_anchor_probe_min_v1')?.dominant_blocker,
    'insufficient_anchor'
  );
  assert.ok(!frontierById.has('draw_cards_mill_local_bridge_min_v1'));

  assert.match(reportText, /^1\. REPO STATE/m);
  assert.match(reportText, /^2\. GATE-AFFECTING CONTAMINATION/m);
  assert.match(reportText, /^3\. NON-GATE NOISE/m);
  assert.match(reportText, /^4\. FQ RESULT/m);
  assert.match(reportText, /^5\. SHORTLIST REAL VS BOOTSTRAP/m);
  assert.match(reportText, /^6\. PROMOTION FRONTIER/m);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const runnerPath = path.join(repoRoot, 'tools/family_qualification/run_family_qualification_v1.mjs');

function seedGitRepo(repoDir) {
  execFileSync('git', ['init'], { cwd: repoDir, stdio: 'pipe' });
  execFileSync('git', ['config', 'user.email', 'family-qualification-tests@example.local'], {
    cwd: repoDir,
    stdio: 'pipe'
  });
  execFileSync('git', ['config', 'user.name', 'family-qualification-tests'], {
    cwd: repoDir,
    stdio: 'pipe'
  });
  execFileSync('git', ['add', '.'], { cwd: repoDir, stdio: 'pipe' });
  execFileSync('git', ['commit', '-m', 'seed fixture'], { cwd: repoDir, stdio: 'pipe' });
  execFileSync('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD'], {
    cwd: repoDir,
    stdio: 'pipe'
  });
}

function runFixture({ files, catalog, closureLines }) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fq-bootstrap-real-seed-separation-'));
  const repoDir = path.join(tempDir, 'repo');
  fs.mkdirSync(repoDir, { recursive: true });

  for (const [relativePath, content] of files) {
    const absolutePath = path.join(repoDir, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content, 'utf8');
  }

  seedGitRepo(repoDir);

  const closurePath = path.join(tempDir, 'closure.txt');
  fs.writeFileSync(closurePath, `${closureLines.join('\n')}\n`, 'utf8');

  const catalogPath = path.join(tempDir, 'catalog.json');
  fs.writeFileSync(catalogPath, `${JSON.stringify({ catalog_version: 'fq_m4_min_v1', families: catalog }, null, 2)}\n`, 'utf8');

  const reportPath = path.join(tempDir, 'report.json');
  const reportTextPath = path.join(tempDir, 'report.txt');
  execFileSync(
    'node',
    [
      runnerPath,
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

  return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
}

function buildBootstrapFamily() {
  return {
    family_id: 'bootstrap_open_candidate_probe_min_v1',
    family_scope: 'BOOTSTRAP',
    label: 'Bootstrap open-candidate probe (non-engine)',
    allow_material_open_candidate: true,
    repo_contract_globs: ['material/bootstrap.contract.json'],
    repo_test_globs: ['material/bootstrap.test.txt'],
    repo_wiring_globs: ['material/bootstrap.wiring.txt'],
    untracked_homonym_globs: ['material/bootstrap.*'],
    closure_positive_terms: ['bootstrap-anchor-min-v1'],
    closure_negative_terms: [],
    closure_absorbed_terms: []
  };
}

function buildRealSeedFamily() {
  return {
    family_id: 'real_seed_open_candidate_material_min_v1',
    family_scope: 'REAL_SEED',
    label: 'Real-seed open-candidate material min v1',
    allow_material_open_candidate: true,
    repo_contract_globs: ['material/real.contract.json'],
    repo_test_globs: ['material/real.test.txt'],
    repo_wiring_globs: ['material/real.wiring.txt'],
    untracked_homonym_globs: ['material/real.*'],
    closure_positive_terms: ['real-seed-anchor-min-v1'],
    closure_negative_terms: [],
    closure_absorbed_terms: []
  };
}

test('bootstrap OPEN_CANDIDATE stays out of real shortlist and cannot trigger SHORTLIST_READY', () => {
  const report = runFixture({
    files: [
      ['material/bootstrap.contract.json', '{ "fixture": "bootstrap" }\n'],
      ['material/bootstrap.test.txt', 'bootstrap test\n'],
      ['material/bootstrap.wiring.txt', 'bootstrap wiring\n']
    ],
    catalog: [buildBootstrapFamily()],
    closureLines: ['bootstrap-anchor-min-v1']
  });

  assert.equal(report.verdict, 'NO_CLEAN_CANDIDATE');
  assert.deepEqual(report.shortlist, []);
  assert.deepEqual(report.bootstrap_shortlist, ['bootstrap_open_candidate_probe_min_v1']);
  assert.equal(report.families.length, 1);
  assert.equal(report.families[0].status, 'OPEN_CANDIDATE');
});

test('real-seed OPEN_CANDIDATE still promotes real shortlist while bootstrap remains separated', () => {
  const report = runFixture({
    files: [
      ['material/bootstrap.contract.json', '{ "fixture": "bootstrap" }\n'],
      ['material/bootstrap.test.txt', 'bootstrap test\n'],
      ['material/bootstrap.wiring.txt', 'bootstrap wiring\n'],
      ['material/real.contract.json', '{ "fixture": "real-seed" }\n'],
      ['material/real.test.txt', 'real-seed test\n'],
      ['material/real.wiring.txt', 'real-seed wiring\n']
    ],
    catalog: [buildBootstrapFamily(), buildRealSeedFamily()],
    closureLines: ['bootstrap-anchor-min-v1', 'real-seed-anchor-min-v1']
  });

  assert.equal(report.verdict, 'SHORTLIST_READY');
  assert.deepEqual(report.shortlist, ['real_seed_open_candidate_material_min_v1']);
  assert.deepEqual(report.bootstrap_shortlist, ['bootstrap_open_candidate_probe_min_v1']);
  assert.ok(!report.shortlist.includes('bootstrap_open_candidate_probe_min_v1'));

  const byFamilyId = new Map(report.families.map((item) => [item.family_id, item]));
  assert.equal(byFamilyId.get('bootstrap_open_candidate_probe_min_v1').status, 'OPEN_CANDIDATE');
  assert.equal(byFamilyId.get('real_seed_open_candidate_material_min_v1').status, 'OPEN_CANDIDATE');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const runnerPath = path.join(repoRoot, 'tools/family_qualification/run_family_qualification_v1.mjs');
const closurePath = path.join(
  repoRoot,
  'maestros/v72/MTGSynergy_CIERRE_DOCUMENTAL_REAL_v72_2026-04-03.txt'
);
const catalogPath = path.join(repoRoot, 'tools/family_qualification/family_catalog_v1.json');
const fixtureBasePath = path.join(
  repoRoot,
  'tools/family_qualification/fixtures/non_bootstrap_open_candidate_material_min_v1'
);
const fixtureCatalogPath = path.join(fixtureBasePath, 'fixture_catalog_v1.json');
const fixtureClosurePath = path.join(fixtureBasePath, 'fixture_closure.txt');
const fixtureMaterialPath = path.join(fixtureBasePath, 'material');

function executeRunnerInTempDir() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'family-qualification-v1-'));
  const reportPath = path.join(tempDir, 'family_qualification_report.json');
  const reportTextPath = path.join(tempDir, 'family_qualification_report.txt');

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
    { cwd: repoRoot, stdio: 'pipe' }
  );

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  return { tempDir, reportPath, reportTextPath, report };
}

function executeRunnerWithNonBootstrapMaterialFixture() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'family-qualification-v1-non-bootstrap-'));
  const repoDir = path.join(tempDir, 'repo');
  fs.mkdirSync(repoDir, { recursive: true });
  fs.cpSync(fixtureMaterialPath, path.join(repoDir, 'material'), { recursive: true });

  execFileSync('git', ['init'], { cwd: repoDir, stdio: 'pipe' });
  execFileSync('git', ['config', 'user.email', 'family-qualification-fixture@example.local'], {
    cwd: repoDir,
    stdio: 'pipe'
  });
  execFileSync('git', ['config', 'user.name', 'family-qualification-fixture'], {
    cwd: repoDir,
    stdio: 'pipe'
  });
  execFileSync('git', ['add', '.'], { cwd: repoDir, stdio: 'pipe' });
  execFileSync('git', ['commit', '-m', 'seed fixture'], { cwd: repoDir, stdio: 'pipe' });
  execFileSync('git', ['update-ref', 'refs/remotes/origin/main', 'HEAD'], {
    cwd: repoDir,
    stdio: 'pipe'
  });

  const reportPath = path.join(tempDir, 'family_qualification_report.json');
  const reportTextPath = path.join(tempDir, 'family_qualification_report.txt');

  execFileSync(
    'node',
    [
      runnerPath,
      '--closure',
      fixtureClosurePath,
      '--catalog',
      fixtureCatalogPath,
      '--report',
      reportPath,
      '--report-text',
      reportTextPath
    ],
    { cwd: repoDir, stdio: 'pipe' }
  );

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  return { tempDir, repoDir, reportPath, reportTextPath, report };
}

test('run_family_qualification_v1 bootstrap reconciled with post-v72 emits expected deterministic report', () => {
  const { reportPath, reportTextPath, report } = executeRunnerInTempDir();

  assert.ok(fs.existsSync(reportPath), 'JSON report should exist');
  assert.ok(fs.existsSync(reportTextPath), 'text report should exist');

  assert.ok(report && typeof report === 'object', 'report must be an object');
  assert.ok(report.meta && typeof report.meta === 'object', 'meta must exist');
  assert.equal(typeof report.meta.headShort, 'string');
  assert.equal(typeof report.meta.originMainShort, 'string');
  assert.equal(typeof report.meta.repoDirtyGlobal, 'boolean');
  assert.equal(typeof report.meta.closurePath, 'string');
  assert.equal(typeof report.meta.catalogPath, 'string');

  assert.equal(report.verdict, 'NO_CLEAN_CANDIDATE');
  assert.deepEqual(report.shortlist, ['bootstrap_open_candidate_probe_min_v1']);
  assert.ok(Array.isArray(report.families), 'families must be an array');
  assert.equal(report.families.length, 6, 'must classify exactly 6 families');

  const byFamilyId = new Map(report.families.map((item) => [item.family_id, item]));
  const expectedStatuses = {
    draw_cards_mill_local_bridge_min_v1: 'CLOSED',
    draw_cards_add_counters_local_bridge_min_v1: 'CONTAMINATED_BY_WORKTREE',
    produce_mana_enablement_closure_min_v1: 'ABSORBED',
    tapped_status_local_enablement_bridge_min_v1: 'CLOSED',
    bootstrap_insufficient_anchor_probe_min_v1: 'INSUFFICIENT_ANCHOR',
    bootstrap_open_candidate_probe_min_v1: 'OPEN_CANDIDATE'
  };

  for (const [familyId, expectedStatus] of Object.entries(expectedStatuses)) {
    const row = byFamilyId.get(familyId);
    assert.ok(row, `missing family row for ${familyId}`);
    assert.equal(row.status, expectedStatus, `unexpected status for ${familyId}`);
    assert.equal(typeof row.status_reason, 'string');
    assert.ok(Array.isArray(row.tracked_contract_hits));
    assert.ok(Array.isArray(row.tracked_test_hits));
    assert.ok(Array.isArray(row.tracked_wiring_hits));
    assert.ok(Array.isArray(row.untracked_homonym_hits));
    assert.ok(Array.isArray(row.closure_positive_hits));
    assert.ok(Array.isArray(row.closure_negative_hits));
    assert.ok(Array.isArray(row.closure_absorbed_hits));
  }

  const produceMana = byFamilyId.get('produce_mana_enablement_closure_min_v1');
  assert.ok(produceMana.closure_absorbed_hits.length > 0);

  const insufficientAnchor = byFamilyId.get('bootstrap_insufficient_anchor_probe_min_v1');
  assert.equal(
    insufficientAnchor.status_reason,
    'insufficient positive anchor: no clean material basis'
  );
});

test('bootstrap_open_candidate_probe_min_v1 emits controlled OPEN_CANDIDATE shortlist promotion', () => {
  const { report } = executeRunnerInTempDir();
  const byFamilyId = new Map(report.families.map((item) => [item.family_id, item]));

  const openProbe = byFamilyId.get('bootstrap_open_candidate_probe_min_v1');
  assert.ok(openProbe, 'missing open-candidate probe row');
  assert.equal(openProbe.status, 'OPEN_CANDIDATE');
  assert.equal(report.shortlist.length, 1);
  assert.deepEqual(report.shortlist, ['bootstrap_open_candidate_probe_min_v1']);

  const insufficientAnchor = byFamilyId.get('bootstrap_insufficient_anchor_probe_min_v1');
  assert.ok(insufficientAnchor, 'missing insufficient-anchor probe row');
  assert.equal(insufficientAnchor.status, 'INSUFFICIENT_ANCHOR');
});

test('non-bootstrap synthetic fixture can promote OPEN_CANDIDATE with tracked material and clean closure', () => {
  const { report } = executeRunnerWithNonBootstrapMaterialFixture();
  assert.equal(report.verdict, 'NO_CLEAN_CANDIDATE');
  assert.deepEqual(report.shortlist, ['synthetic_non_bootstrap_open_candidate_material_min_v1']);
  assert.equal(report.families.length, 1);

  const row = report.families[0];
  assert.equal(row.family_id, 'synthetic_non_bootstrap_open_candidate_material_min_v1');
  assert.equal(row.status, 'OPEN_CANDIDATE');
  assert.equal(
    row.status_reason,
    'clean positive anchor: controlled material open-candidate fixture'
  );
  assert.ok(row.tracked_contract_hits.length > 0);
  assert.ok(row.tracked_test_hits.length > 0);
  assert.ok(row.tracked_wiring_hits.length > 0);
  assert.equal(row.untracked_homonym_hits.length, 0);
  assert.ok(row.closure_positive_hits.length > 0);
  assert.equal(row.closure_negative_hits.length, 0);
  assert.equal(row.closure_absorbed_hits.length, 0);
});

test('runner --help prints usage and exits successfully', () => {
  const stdout = execFileSync('node', [runnerPath, '--help'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe'
  });

  assert.match(stdout, /^Usage:/m);
  assert.match(stdout, /--closure <path>/);
  assert.match(stdout, /--catalog <path>/);
  assert.match(stdout, /--report <path>/);
  assert.match(stdout, /--report-text <path>/);
  assert.match(stdout, /--help, -h/);
});

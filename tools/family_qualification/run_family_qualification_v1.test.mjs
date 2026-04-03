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
  'maestros/v70/MTGSynergy_CIERRE_DOCUMENTAL_REAL_v70_2026-03-30.txt'
);
const catalogPath = path.join(repoRoot, 'tools/family_qualification/family_catalog_v1.json');

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

test('run_family_qualification_v1 bootstrap emits expected deterministic report for current repo', () => {
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
  assert.deepEqual(report.shortlist, []);
  assert.ok(Array.isArray(report.families), 'families must be an array');
  assert.equal(report.families.length, 4, 'must classify exactly 4 families');

  const byFamilyId = new Map(report.families.map((item) => [item.family_id, item]));
  const expectedStatuses = {
    draw_cards_mill_local_bridge_min_v1: 'CLOSED',
    draw_cards_add_counters_local_bridge_min_v1: 'CONTAMINATED_BY_WORKTREE',
    produce_mana_enablement_closure_min_v1: 'ABSORBED',
    tapped_status_local_enablement_bridge_min_v1: 'CLOSED'
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
});

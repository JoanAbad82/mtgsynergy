#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  buildPreflightReport,
  derivePromotionFrontier,
  deriveRepoState,
  extractFqSummary,
  normalizePath,
  renderPreflightTextReport,
  splitContaminationByCatalog
} from './fq_preflight_helpers_v1.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUNNER_PATH = path.join(__dirname, 'run_family_qualification_v1.mjs');

function buildUsage(scriptPath) {
  const scriptName = scriptPath
    ? normalizePath(scriptPath)
    : 'tools/family_qualification/run_family_preflight_v1.mjs';

  return [
    'Usage:',
    `  node ${scriptName} --closure <path> --catalog <path> --report <path> --report-text <path>`,
    '',
    'Options:',
    '  --closure <path>      Path to closure text file passed to canonical runner',
    '  --catalog <path>      Path to family catalog JSON passed to canonical runner',
    '  --report <path>       Output path for JSON preflight report',
    '  --report-text <path>  Output path for plain-text preflight report',
    '  --help, -h            Show this help and exit'
  ].join('\n');
}

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h') {
      out.help = true;
      continue;
    }
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

  if (out.help) {
    return out;
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

function readCatalogFamilies(catalogPath) {
  const payload = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.families)) {
    return payload.families;
  }
  throw new Error('Catalog must be an array or object with "families" array');
}

function runCanonicalRunner({ closurePath, catalogPath }) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'family-preflight-v1-'));
  const runnerJsonPath = path.join(tempDir, 'fq_runner_report.json');
  const runnerTextPath = path.join(tempDir, 'fq_runner_report.txt');

  try {
    execFileSync(
      'node',
      [
        RUNNER_PATH,
        '--closure',
        closurePath,
        '--catalog',
        catalogPath,
        '--report',
        runnerJsonPath,
        '--report-text',
        runnerTextPath
      ],
      {
        encoding: 'utf8',
        stdio: 'pipe'
      }
    );

    const report = JSON.parse(fs.readFileSync(runnerJsonPath, 'utf8'));
    return report;
  } catch (error) {
    if (error instanceof Error) {
      const stderr = 'stderr' in error ? String(error.stderr ?? '').trim() : '';
      if (stderr.length > 0) {
        throw new Error(`Canonical runner failed: ${stderr}`);
      }
      throw new Error(`Canonical runner failed: ${error.message}`);
    }
    throw error;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(buildUsage(process.argv[1]));
    return;
  }

  const branchRaw = runGit(['branch', '--show-current']);
  const headRaw = runGit(['rev-parse', 'HEAD']);
  const originMainRaw = runGit(['rev-parse', 'origin/main']);
  const statusShortRaw = runGit(['status', '--short']);

  const repoState = deriveRepoState({
    branchRaw,
    headRaw,
    originMainRaw,
    statusShortRaw
  });

  const catalogFamilies = readCatalogFamilies(args.catalog);
  const contamination = splitContaminationByCatalog({
    catalogFamilies,
    untrackedPaths: repoState.untrackedPaths
  });

  const runnerReport = runCanonicalRunner({
    closurePath: args.closure,
    catalogPath: args.catalog
  });
  const fqSummary = extractFqSummary(runnerReport);
  const frontier = derivePromotionFrontier(runnerReport.families);

  const preflightReport = buildPreflightReport({
    repoState,
    contamination,
    fqSummary,
    frontier,
    closurePath: args.closure,
    catalogPath: args.catalog
  });

  fs.mkdirSync(path.dirname(args.report), { recursive: true });
  fs.mkdirSync(path.dirname(args['report-text']), { recursive: true });
  fs.writeFileSync(args.report, `${JSON.stringify(preflightReport, null, 2)}\n`, 'utf8');
  fs.writeFileSync(args['report-text'], renderPreflightTextReport(preflightReport), 'utf8');
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[run_family_preflight_v1] ${message}`);
  process.exitCode = 1;
}

#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  buildCandidateEvidenceReport,
  deriveCandidateEvidenceDossiers,
  readCatalogFamiliesFromFileContent,
  readPreflightReportFromFileContent,
  renderCandidateEvidenceTextReport
} from './fq_candidate_evidence_helpers_v1.mjs';

function normalizePath(value) {
  return String(value).replace(/\\/g, '/');
}

function buildUsage(scriptPath) {
  const scriptName = scriptPath
    ? normalizePath(scriptPath)
    : 'tools/family_qualification/run_family_candidate_evidence_v1.mjs';
  return [
    'Usage:',
    `  node ${scriptName} --catalog <path> --preflight-report <path> --report <path> --report-text <path>`,
    '',
    'Options:',
    '  --catalog <path>           Path to family catalog JSON',
    '  --preflight-report <path>  Path to preflight report JSON',
    '  --report <path>            Output path for evidence JSON report',
    '  --report-text <path>       Output path for evidence plain-text report',
    '  --help, -h                 Show this help and exit'
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

  const required = ['catalog', 'preflight-report', 'report', 'report-text'];
  for (const key of required) {
    if (!out[key]) {
      throw new Error(`Missing required argument --${key}`);
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(buildUsage(process.argv[1]));
    return;
  }

  const catalogText = fs.readFileSync(args.catalog, 'utf8');
  const preflightText = fs.readFileSync(args['preflight-report'], 'utf8');

  const catalogFamilies = readCatalogFamiliesFromFileContent(catalogText);
  const preflightReport = readPreflightReportFromFileContent(preflightText);
  const evidenceDossiers = deriveCandidateEvidenceDossiers({
    catalogFamilies,
    preflightReport
  });

  const report = buildCandidateEvidenceReport({
    catalogFamilies,
    preflightReport,
    evidenceDossiers
  });
  const reportText = renderCandidateEvidenceTextReport(report);

  fs.mkdirSync(path.dirname(args.report), { recursive: true });
  fs.mkdirSync(path.dirname(args['report-text']), { recursive: true });
  fs.writeFileSync(args.report, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(args['report-text'], reportText, 'utf8');
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[run_family_candidate_evidence_v1] ${message}`);
  process.exitCode = 1;
}

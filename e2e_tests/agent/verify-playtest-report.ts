import fs from 'node:fs';
import path from 'node:path';
import { parseLastSessionSummary, validatePlaytestReport } from './playtestReport';

const [reportArg, transcriptArg] = process.argv.slice(2);
if (!reportArg || !transcriptArg) {
  process.stderr.write('Usage: npm run agent:verify-report -- <qa-report.md> <session.jsonl>\n');
  process.exit(2);
}

const reportPath = path.resolve(reportArg);
const transcriptPath = path.resolve(transcriptArg);
const summary = parseLastSessionSummary(fs.readFileSync(transcriptPath, 'utf8'));
const errors = validatePlaytestReport(
  fs.readFileSync(reportPath, 'utf8'),
  summary,
  path.relative(process.cwd(), transcriptPath),
);

if (errors.length > 0) {
  process.stderr.write(`${JSON.stringify({ ok: false, report: reportPath, transcript: transcriptPath, errors }, null, 2)}\n`);
  process.exit(1);
}

process.stdout.write(`${JSON.stringify({ ok: true, report: reportPath, transcript: transcriptPath })}\n`);

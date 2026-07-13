import fs from 'node:fs';
import path from 'node:path';
import { parseLastSessionSummary, renderPlaytestReport } from './playtestReport';

const [reportArg, transcriptArg] = process.argv.slice(2);
if (!reportArg || !transcriptArg) {
  process.stderr.write('Usage: npm run agent:write-report -- <qa-report.md> <session.jsonl>\n');
  process.exit(2);
}

const reportPath = path.resolve(reportArg);
const transcriptPath = path.resolve(transcriptArg);
const summary = parseLastSessionSummary(fs.readFileSync(transcriptPath, 'utf8'));
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(
  reportPath,
  renderPlaytestReport(summary, path.relative(process.cwd(), transcriptPath)),
);
process.stdout.write(`${JSON.stringify({ ok: true, report: reportPath, transcript: transcriptPath })}\n`);

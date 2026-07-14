import { auditQaReport } from './qaAudit';

const [reportArg, transcriptArg, ...rest] = process.argv.slice(2);
if (rest.includes('--verbose')) {
  // The public audit contract is intentionally compact for now. Keep the flag
  // accepted so callers can adopt it before the full unbounded error view lands.
}
if (!reportArg) {
  process.stderr.write('Usage: npm run agent:qa-audit -- <report.md> [session.jsonl] [--verbose]\n');
  process.exit(2);
}

const result = auditQaReport(reportArg, transcriptArg, rest.includes('--verbose'));
process.stdout.write(`${JSON.stringify(result)}\n`);
if (!result.ok) process.exit(1);

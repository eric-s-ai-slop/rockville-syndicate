/** Compact, agent-oriented validation with safe changed-file test selection. */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { selectTests } from './check-selection';
import { formatFailureOutput } from './check-output';
import { runStages, type StageResult, type StageSpec } from './stage-runner';

const ROOT = process.cwd();
const LOG_DIR = path.resolve('agent-artifacts/check');
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
const receiptChecks: Array<{ name: string; status: 'passed' | 'failed' | 'skipped'; durationMs: number; reason?: string }> = [];
let latestEslintOutput = '';
let verboseOutput = false;
let receiptStartedAt = Date.now();
let stageConcurrency = 1;

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(child) : [child];
  });
}

function availableUnitTests(): string[] {
  return [...walk('src'), ...walk('e2e_tests/agent')]
    .filter((file) => /\.test\.tsx?$/.test(file))
    .filter((file) => !file.endsWith('e2e_tests/agent/cli.diagnostic.test.ts') && !file.endsWith('e2e_tests/agent/cli.protocol.test.ts'))
    .map((file) => path.relative(ROOT, path.resolve(file)).split(path.sep).join('/'));
}

function changedFiles(): string[] {
  const tracked = spawnSync('git', ['diff', '--name-only', '--diff-filter=ACMR', 'HEAD'], { encoding: 'utf8' });
  const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' });
  if (tracked.status !== 0 || untracked.status !== 0) return [];
  return [...new Set(`${tracked.stdout}\n${untracked.stdout}`.split('\n').map((line) => line.trim()).filter(Boolean))];
}

function detail(name: string, output: string): string {
  const clean = output.replace(ANSI, '');
  if (name === 'eslint') {
    const match = clean.match(/(\d+) problems? \((\d+) errors?, (\d+) warnings?\)/);
    return match ? `${match[2]} errors, ${match[3]} warnings` : 'clean';
  }
  if (name === 'tests') {
    const match = clean.match(/Tests\s+([^\n]+)/);
    return match ? match[1].trim() : 'passed';
  }
  if (name === 'build') {
    const match = clean.match(/built in ([^\n]+)/);
    return match ? match[1].trim() : 'passed';
  }
  return 'clean';
}

function receiptName(name: string): string {
  return name === 'tests' ? 'focused-tests' : name === 'typecheck' ? 'typecheck' : name;
}

function reportStage(result: StageResult): void {
  if (result.name === 'eslint') latestEslintOutput = result.output;
  const seconds = (result.durationMs / 1000).toFixed(1);
  const log = path.relative(ROOT, result.logPath);
  if (result.exitCode !== 0 || result.cancelled) {
    const failure = formatFailureOutput(result.name, result.output, verboseOutput);
    const status = result.cancelled ? 'CANCEL' : 'FAIL';
    process.stdout.write(`${result.name.padEnd(10)} ${status}  ${seconds}s  log=${log}  omitted=${failure.omittedLines}\n`);
    process.stdout.write(`${failure.text}\n`);
    receiptChecks.push({ name: receiptName(result.name), status: 'failed', durationMs: result.durationMs });
    return;
  }
  process.stdout.write(`${result.name.padEnd(10)} PASS  ${seconds}s  ${detail(result.name, result.output)}\n`);
  receiptChecks.push({ name: receiptName(result.name), status: 'passed', durationMs: result.durationMs });
}

function filesForReceipt(): string[] {
  const tracked = spawnSync('git', ['diff', '--name-only', '--diff-filter=ACMR', 'HEAD'], { encoding: 'utf8' });
  const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' });
  return [...new Set(`${tracked.stdout ?? ''}\n${untracked.stdout ?? ''}`.split('\n').map((line) => line.trim()).filter(Boolean))];
}

function writeReceipt(ok: boolean, files: string[], eslintOutput = ''): void {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const warnings = eslintOutput.split('\n').filter((line) => line.includes('warning')).map((line) => line.trim());
  const baselinePath = path.join(LOG_DIR, 'warnings-baseline.json');
  const baseline = fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')) as string[] : [];
  if (!fs.existsSync(baselinePath)) fs.writeFileSync(baselinePath, JSON.stringify(warnings, null, 2));
  const receipt = {
    schema: 'omega-validation-receipt-v1', ok, changedFiles: files, checks: receiptChecks,
    durationMs: Date.now() - receiptStartedAt,
    concurrency: stageConcurrency,
    warnings: { preExisting: warnings.filter((warning) => baseline.includes(warning)), introduced: warnings.filter((warning) => !baseline.includes(warning)) },
  };
  fs.writeFileSync(path.join(LOG_DIR, 'validation-receipt.json'), JSON.stringify(receipt, null, 2));
  process.stdout.write(`${JSON.stringify({ cmd: 'validation-receipt', ok, path: path.relative(ROOT, path.join(LOG_DIR, 'validation-receipt.json')) })}\n`);
}

export function getExplicitFiles(args: string[]): string[] {
  const reportIndex = args.indexOf('--report');
  const transcriptIndex = args.indexOf('--transcript');
  const concurrencyIndex = args.indexOf('--concurrency');
  const reportValueIndex = reportIndex >= 0 ? reportIndex + 1 : -1;
  const transcriptValueIndex = transcriptIndex >= 0 ? transcriptIndex + 1 : -1;
  const concurrencyValueIndex = concurrencyIndex >= 0 ? concurrencyIndex + 1 : -1;
  const reportPath = reportValueIndex >= 0 ? args[reportValueIndex] : null;
  const transcriptPath = transcriptValueIndex >= 0 ? args[transcriptValueIndex] : null;
  const concurrencyValue = concurrencyValueIndex >= 0 ? args[concurrencyValueIndex] : null;
  const excluded = new Set([reportPath, transcriptPath, concurrencyValue]);
  return args.filter((arg, index) => !arg.startsWith('--') && !excluded.has(arg) && index !== reportValueIndex && index !== transcriptValueIndex && index !== concurrencyValueIndex);
}

function getConcurrency(args: string[]): number {
  const index = args.indexOf('--concurrency');
  if (index >= 0 && args[index + 1] === undefined) throw new Error('--concurrency requires a positive integer.');
  const raw = index >= 0 ? args[index + 1] : process.env.OMEGA_CHECK_CONCURRENCY;
  const fallback = Math.max(1, Math.min(5, os.availableParallelism?.() ?? os.cpus().length));
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error('--concurrency and OMEGA_CHECK_CONCURRENCY must be positive integers.');
  return parsed;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  receiptChecks.length = 0;
  latestEslintOutput = '';
  receiptStartedAt = Date.now();
  verboseOutput = args.includes('--verbose');
  stageConcurrency = getConcurrency(args);
  const forceFull = args.includes('--full');
  const reportIndex = args.indexOf('--report');
  const transcriptIndex = args.indexOf('--transcript');
  const reportPath = reportIndex >= 0 ? args[reportIndex + 1] : null;
  const transcriptPath = transcriptIndex >= 0 ? args[transcriptIndex + 1] : null;
  const explicitFiles = getExplicitFiles(args);
  const files = explicitFiles.length ? explicitFiles : changedFiles();
  const tests = availableUnitTests();
  const selection = forceFull || files.length === 0
    ? { fullSuite: true, testFiles: tests, reasons: forceFull ? ['--full requested'] : ['no changed files detected'] }
    : selectTests(files, tests);

  process.stdout.write(`scope      ${selection.fullSuite ? 'full' : 'focused'}  files=${files.length} tests=${selection.testFiles.length}\n`);
  for (const reason of selection.reasons) process.stdout.write(`scope-note ${reason}\n`);

  const stages: StageSpec[] = [
    { name: 'typecheck', command: 'npm', args: ['run', 'lint', '--silent'] },
    { name: 'eslint', command: 'npm', args: ['run', 'lint:es', '--silent'] },
    { name: 'boundaries', command: 'npm', args: ['run', 'agent:boundaries', '--silent'] },
  ];
  if (selection.testFiles.length) {
    stages.push({ name: 'tests', command: 'npx', args: ['vitest', 'run', ...selection.testFiles] });
  } else {
    receiptChecks.push({ name: 'focused-tests', status: 'skipped', durationMs: 0, reason: 'No focused tests matched and the changed files did not require the full suite.' });
    process.stdout.write('tests      SKIP  no relevant unit tests\n');
  }
  if (selection.fullSuite) stages.push({ name: 'build', command: 'npm', args: ['run', 'build', '--silent'] });

  const controller = new AbortController();
  let interruptedSignal: NodeJS.Signals | null = null;
  const interrupt = (signal: NodeJS.Signals): void => {
    interruptedSignal = signal;
    controller.abort(signal);
  };
  const onSigint = (): void => interrupt('SIGINT');
  const onSigterm = (): void => interrupt('SIGTERM');
  process.once('SIGINT', onSigint);
  process.once('SIGTERM', onSigterm);

  const runOptions = {
    cwd: ROOT,
    logDir: LOG_DIR,
    concurrency: stageConcurrency,
    signal: controller.signal,
    ...(verboseOutput ? { onOutput: (_stage: string, chunk: string) => process.stdout.write(chunk) } : {}),
  };

  try {
    // Independent stages share a bounded worker pool. Every active/queued
    // stage resolves to a receipt entry, including on interruption.
    const results = await runStages(stages, runOptions);
    for (const result of results) reportStage(result);
    if (interruptedSignal || results.some((result) => result.exitCode !== 0 || result.cancelled)) {
      writeReceipt(false, filesForReceipt(), latestEslintOutput);
      process.exitCode = interruptedSignal === 'SIGTERM' ? 143 : interruptedSignal === 'SIGINT' ? 130 : 1;
      return;
    }

    if (reportPath) {
      const [reportResult] = await runStages([{
        name: 'report-audit',
        command: 'npm',
        args: ['run', 'agent:qa-audit', '--silent', '--', reportPath, ...(transcriptPath ? [transcriptPath] : [])],
      }], runOptions);
      reportStage(reportResult);
      if (reportResult.exitCode !== 0 || reportResult.cancelled) {
        writeReceipt(false, filesForReceipt(), latestEslintOutput);
        process.exitCode = interruptedSignal === 'SIGTERM' ? 143 : interruptedSignal === 'SIGINT' ? 130 : 1;
        return;
      }
      receiptChecks.push({ name: 'visual-evidence', status: 'passed', durationMs: 0, reason: 'Validated by agent:qa-audit.' });
    } else {
      receiptChecks.push({ name: 'report-audit', status: 'skipped', durationMs: 0, reason: 'No report path was provided to agent:check.' });
      receiptChecks.push({ name: 'visual-evidence', status: 'skipped', durationMs: 0, reason: 'Visual evidence is validated by agent:qa-audit.' });
    }
    writeReceipt(true, files, latestEslintOutput);
  } finally {
    process.removeListener('SIGINT', onSigint);
    process.removeListener('SIGTERM', onSigterm);
  }
}

if (process.argv[1]?.endsWith('check.ts')) {
  void main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`agent:check failed: ${message}\n`);
    writeReceipt(false, filesForReceipt(), latestEslintOutput);
    process.exitCode = 1;
  });
}

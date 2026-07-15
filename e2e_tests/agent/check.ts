/** Compact, agent-oriented validation with safe changed-file test selection. */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { selectTests } from './check-selection';
import { formatFailureOutput } from './check-output';

const ROOT = process.cwd();
const LOG_DIR = path.resolve('agent-artifacts/check');
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
const receiptChecks: Array<{ name: string; status: 'passed' | 'failed' | 'skipped'; durationMs: number; reason?: string }> = [];
let latestEslintOutput = '';
let verboseOutput = false;

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

function runStage(name: string, command: string, args: string[]): void {
  const start = performance.now();
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (name === 'eslint') latestEslintOutput = output;
  if (verboseOutput && output) process.stdout.write(output);
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const logPath = path.join(LOG_DIR, `${name}.log`);
  fs.writeFileSync(logPath, output);
  const seconds = ((performance.now() - start) / 1000).toFixed(1);

  if (result.status !== 0) {
    receiptChecks.push({ name: name === 'tests' ? 'focused-tests' : name === 'typecheck' ? 'typecheck' : name, status: 'failed', durationMs: Math.round(performance.now() - start) });
    const failure = formatFailureOutput(name, output, verboseOutput);
    process.stdout.write(`${name.padEnd(10)} FAIL  ${seconds}s  log=${path.relative(ROOT, logPath)}  omitted=${failure.omittedLines}\n`);
    process.stdout.write(`${failure.text}\n`);
    writeReceipt(false, filesForReceipt(), output);
    process.exit(result.status ?? 1);
  }
  receiptChecks.push({ name: name === 'tests' ? 'focused-tests' : name === 'typecheck' ? 'typecheck' : name, status: 'passed', durationMs: Math.round(performance.now() - start) });
  process.stdout.write(`${name.padEnd(10)} PASS  ${seconds}s  ${detail(name, output)}\n`);
}

function filesForReceipt(): string[] {
  const tracked = spawnSync('git', ['diff', '--name-only', '--diff-filter=ACMR', 'HEAD'], { encoding: 'utf8' });
  const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' });
  return [...new Set(`${tracked.stdout ?? ''}\n${untracked.stdout ?? ''}`.split('\n').map((line) => line.trim()).filter(Boolean))];
}

function writeReceipt(ok: boolean, files: string[], eslintOutput = ''): void {
  const warnings = eslintOutput.split('\n').filter((line) => line.includes('warning')).map((line) => line.trim());
  const baselinePath = path.join(LOG_DIR, 'warnings-baseline.json');
  const baseline = fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')) as string[] : [];
  if (!fs.existsSync(baselinePath)) fs.writeFileSync(baselinePath, JSON.stringify(warnings, null, 2));
  const receipt = {
    schema: 'omega-validation-receipt-v1', ok, changedFiles: files, checks: receiptChecks,
    warnings: { preExisting: warnings.filter((warning) => baseline.includes(warning)), introduced: warnings.filter((warning) => !baseline.includes(warning)) },
  };
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.writeFileSync(path.join(LOG_DIR, 'validation-receipt.json'), JSON.stringify(receipt, null, 2));
  process.stdout.write(`${JSON.stringify({ cmd: 'validation-receipt', ok, path: path.relative(ROOT, path.join(LOG_DIR, 'validation-receipt.json')) })}\n`);
}

function main(): void {
  const args = process.argv.slice(2);
  verboseOutput = args.includes('--verbose');
  const forceFull = args.includes('--full');
  const reportIndex = args.indexOf('--report');
  const transcriptIndex = args.indexOf('--transcript');
  const reportPath = reportIndex >= 0 ? args[reportIndex + 1] : null;
  const transcriptPath = transcriptIndex >= 0 ? args[transcriptIndex + 1] : null;
  const excluded = new Set([reportPath, transcriptPath]);
  const explicitFiles = args.filter((arg, index) => !arg.startsWith('--') && !excluded.has(arg) && index !== reportIndex + 1 && index !== transcriptIndex + 1);
  const files = explicitFiles.length ? explicitFiles : changedFiles();
  const tests = availableUnitTests();
  const selection = forceFull || files.length === 0
    ? { fullSuite: true, testFiles: tests, reasons: forceFull ? ['--full requested'] : ['no changed files detected'] }
    : selectTests(files, tests);

  process.stdout.write(`scope      ${selection.fullSuite ? 'full' : 'focused'}  files=${files.length} tests=${selection.testFiles.length}\n`);
  for (const reason of selection.reasons) process.stdout.write(`scope-note ${reason}\n`);

  runStage('typecheck', 'npm', ['run', 'lint', '--silent']);
  runStage('eslint', 'npm', ['run', 'lint:es', '--silent']);
  runStage('boundaries', 'npm', ['run', 'agent:boundaries', '--silent']);
  if (selection.testFiles.length) {
    runStage('tests', 'npx', ['vitest', 'run', ...selection.testFiles]);
  } else {
    process.stdout.write('tests      SKIP  no relevant unit tests\n');
  }
  if (selection.fullSuite) runStage('build', 'npm', ['run', 'build', '--silent']);
  if (reportPath) {
    runStage('report-audit', 'npm', ['run', 'agent:qa-audit', '--silent', '--', reportPath, ...(transcriptPath ? [transcriptPath] : [])]);
    receiptChecks.push({ name: 'visual-evidence', status: 'passed', durationMs: 0, reason: 'Validated by agent:qa-audit.' });
  } else {
    receiptChecks.push({ name: 'report-audit', status: 'skipped', durationMs: 0, reason: 'No report path was provided to agent:check.' });
    receiptChecks.push({ name: 'visual-evidence', status: 'skipped', durationMs: 0, reason: 'Visual evidence is validated by agent:qa-audit.' });
  }
  writeReceipt(true, files, latestEslintOutput);
}

main();

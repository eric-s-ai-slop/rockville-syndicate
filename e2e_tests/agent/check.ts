/** Compact, agent-oriented validation with safe changed-file test selection. */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { selectTests } from './check-selection';

const ROOT = process.cwd();
const LOG_DIR = path.resolve('agent-artifacts/check');
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

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
    .map((file) => path.relative(ROOT, path.resolve(file)).split(path.sep).join('/'));
}

function changedFiles(): string[] {
  const tracked = spawnSync('git', ['diff', '--name-only', '--diff-filter=ACMR', 'HEAD'], { encoding: 'utf8' });
  const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' });
  if (tracked.status !== 0 || untracked.status !== 0) return [];
  return [...new Set(`${tracked.stdout}\n${untracked.stdout}`.split('\n').map((line) => line.trim()).filter(Boolean))];
}

function tail(output: string, lines = 60): string {
  return output.replace(ANSI, '').split('\n').filter(Boolean).slice(-lines).join('\n');
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
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const logPath = path.join(LOG_DIR, `${name}.log`);
  fs.writeFileSync(logPath, output);
  const seconds = ((performance.now() - start) / 1000).toFixed(1);

  if (result.status !== 0) {
    process.stdout.write(`${name.padEnd(10)} FAIL  ${seconds}s  log=${path.relative(ROOT, logPath)}\n`);
    process.stdout.write(`${tail(output)}\n`);
    process.exit(result.status ?? 1);
  }
  process.stdout.write(`${name.padEnd(10)} PASS  ${seconds}s  ${detail(name, output)}\n`);
}

function main(): void {
  const args = process.argv.slice(2);
  const forceFull = args.includes('--full');
  const explicitFiles = args.filter((arg) => !arg.startsWith('--'));
  const files = explicitFiles.length ? explicitFiles : changedFiles();
  const tests = availableUnitTests();
  const selection = forceFull || files.length === 0
    ? { fullSuite: true, testFiles: tests, reasons: forceFull ? ['--full requested'] : ['no changed files detected'] }
    : selectTests(files, tests);

  process.stdout.write(`scope      ${selection.fullSuite ? 'full' : 'focused'}  files=${files.length} tests=${selection.testFiles.length}\n`);
  for (const reason of selection.reasons) process.stdout.write(`scope-note ${reason}\n`);

  runStage('typecheck', 'npm', ['run', 'lint', '--silent']);
  runStage('eslint', 'npm', ['run', 'lint:es', '--silent']);
  if (selection.testFiles.length) {
    runStage('tests', 'npx', ['vitest', 'run', ...selection.testFiles]);
  } else {
    process.stdout.write('tests      SKIP  no relevant unit tests\n');
  }
  if (selection.fullSuite) runStage('build', 'npm', ['run', 'build', '--silent']);
}

main();

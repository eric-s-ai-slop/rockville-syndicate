import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runStages, type StageSpec } from './stage-runner';

const temporaryDirectories: string[] = [];

function temporaryDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'omega-stage-runner-'));
  temporaryDirectories.push(directory);
  return directory;
}

function nodeStage(name: string, source: string): StageSpec {
  return { name, command: process.execPath, args: ['-e', source] };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('validation stage runner', () => {
  it('waits for every stage, preserves declared order, and keeps separate logs on failure', async () => {
    const logDir = temporaryDirectory();
    const results = await runStages([
      nodeStage('slow-pass', "setTimeout(() => { console.log('slow done'); }, 80)"),
      nodeStage('fast-fail', "console.error('expected failure'); process.exit(7)"),
    ], { cwd: process.cwd(), logDir, concurrency: 2 });

    expect(results.map((result) => result.name)).toEqual(['slow-pass', 'fast-fail']);
    expect(results.map((result) => result.exitCode)).toEqual([0, 7]);
    expect(fs.readFileSync(path.join(logDir, 'slow-pass.log'), 'utf8')).toContain('slow done');
    expect(fs.readFileSync(path.join(logDir, 'fast-fail.log'), 'utf8')).toContain('expected failure');
  });

  it('streams complete logs while retaining only a bounded output tail', async () => {
    const logDir = temporaryDirectory();
    const chunks: string[] = [];
    const [result] = await runStages([
      nodeStage('noisy', "process.stdout.write('x'.repeat(2000) + 'THE_END')"),
    ], {
      cwd: process.cwd(),
      logDir,
      concurrency: 1,
      maxCaptureChars: 64,
      onOutput: (_stage, chunk) => chunks.push(chunk),
    });

    expect(result.output.length).toBeLessThanOrEqual(64);
    expect(result.output).toContain('THE_END');
    expect(chunks.join('')).toHaveLength(2007);
    expect(fs.readFileSync(result.logPath, 'utf8')).toHaveLength(2007);
  });

  it('terminates active work and marks queued stages cancelled when aborted', async () => {
    const logDir = temporaryDirectory();
    const controller = new AbortController();
    const run = runStages([
      nodeStage('active', "setInterval(() => {}, 1000)"),
      nodeStage('queued', "console.log('must not run')"),
    ], { cwd: process.cwd(), logDir, concurrency: 1, signal: controller.signal });

    setTimeout(() => controller.abort(), 100);
    const results = await run;

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual(expect.objectContaining({ name: 'active', cancelled: true }));
    expect(results[1]).toEqual(expect.objectContaining({ name: 'queued', cancelled: true, durationMs: 0 }));
    expect(fs.readFileSync(results[1].logPath, 'utf8')).not.toContain('must not run');
  });
});


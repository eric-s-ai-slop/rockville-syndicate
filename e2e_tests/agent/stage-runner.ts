import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

export interface StageSpec {
  name: string;
  command: string;
  args: string[];
}

export interface StageResult {
  name: string;
  output: string;
  durationMs: number;
  exitCode: number;
  logPath: string;
  cancelled?: boolean;
}

export interface StageRunOptions {
  cwd: string;
  logDir: string;
  concurrency: number;
  signal?: AbortSignal;
  maxCaptureChars?: number;
  onOutput?: (stage: string, chunk: string) => void;
}

const DEFAULT_MAX_CAPTURE_CHARS = 2 * 1024 * 1024;

function appendTail(current: string, chunk: string, limit: number): string {
  const combined = current + chunk;
  return combined.length <= limit ? combined : combined.slice(-limit);
}

function killProcessTree(child: ChildProcess): void {
  if (!child.pid) return;
  try {
    process.kill(process.platform === 'win32' ? child.pid : -child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }
}

function cancelledResult(spec: StageSpec, logDir: string): StageResult {
  const logPath = path.join(logDir, `${spec.name}.log`);
  const output = 'Stage cancelled before it started.\n';
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(logPath, output);
  return { name: spec.name, output, durationMs: 0, exitCode: 130, logPath, cancelled: true };
}

function runStage(
  spec: StageSpec,
  options: StageRunOptions,
  activeChildren: Set<ChildProcess>,
): Promise<StageResult> {
  return new Promise((resolve) => {
    const start = performance.now();
    const logPath = path.join(options.logDir, `${spec.name}.log`);
    const maxCaptureChars = Math.max(1, options.maxCaptureChars ?? DEFAULT_MAX_CAPTURE_CHARS);
    fs.mkdirSync(options.logDir, { recursive: true });
    const log = fs.createWriteStream(logPath, { flags: 'w' });
    const spawnOptions: SpawnOptions = {
      cwd: options.cwd,
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    };
    const child = spawn(spec.command, spec.args, spawnOptions);
    activeChildren.add(child);
    if (options.signal?.aborted) killProcessTree(child);
    let output = '';

    const capture = (chunk: Buffer | string): void => {
      const text = chunk.toString();
      log.write(text);
      output = appendTail(output, text, maxCaptureChars);
      options.onOutput?.(spec.name, text);
    };
    child.stdout?.on('data', capture);
    child.stderr?.on('data', capture);
    child.on('error', (error) => capture(`${error.message}\n`));
    child.on('close', (status) => {
      activeChildren.delete(child);
      log.end(() => {
        resolve({
          name: spec.name,
          output,
          durationMs: Math.round(performance.now() - start),
          exitCode: status ?? 1,
          logPath,
          ...(options.signal?.aborted ? { cancelled: true } : {}),
        });
      });
    });
  });
}

export async function runStages(specs: StageSpec[], options: StageRunOptions): Promise<StageResult[]> {
  if (!specs.length) return [];
  const concurrency = Math.max(1, Math.min(Math.floor(options.concurrency), specs.length));
  const results = new Array<StageResult>(specs.length);
  const activeChildren = new Set<ChildProcess>();
  let nextIndex = 0;

  const abort = (): void => {
    for (const child of activeChildren) killProcessTree(child);
  };
  options.signal?.addEventListener('abort', abort, { once: true });

  const worker = async (): Promise<void> => {
    while (nextIndex < specs.length) {
      const index = nextIndex++;
      const spec = specs[index];
      if (options.signal?.aborted) {
        results[index] = cancelledResult(spec, options.logDir);
        continue;
      }
      results[index] = await runStage(spec, options, activeChildren);
    }
  };

  try {
    await Promise.all(Array.from({ length: concurrency }, worker));
    return results;
  } finally {
    options.signal?.removeEventListener('abort', abort);
    if (options.signal?.aborted) abort();
  }
}

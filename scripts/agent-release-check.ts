import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PRODUCTION_CHAPTER_MANIFEST } from '../src/data/chapters';
import { releaseBuildArgs } from './release-build';

type Stage = 'image-build' | 'container-startup' | 'health' | 'static-smoke' | 'manifest';
type StageReceipt = { stage: Stage; ok: boolean; detail?: string };

const outputDir = path.resolve('agent-artifacts/release-check');
const receiptPath = path.join(outputDir, 'release-receipt.json');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { version?: string };
const version = packageJson.version ?? '';
const revision = runGit(['rev-parse', 'HEAD']).trim();
const buildTime = new Date().toISOString();
const imageTag = `project-omega-release-check:${process.pid}-${Date.now()}`;
const stages: StageReceipt[] = [];
let containerId: string | null = null;
let imageId: string | null = null;

function runGit(args: string[]): string {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr || 'unknown error'}`);
  return result.stdout;
}

function docker(args: string[], logName: string): { status: number | null; stdout: string; stderr: string } {
  fs.mkdirSync(outputDir, { recursive: true });
  const result = spawnSync('docker', args, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  fs.writeFileSync(path.join(outputDir, logName), `${result.stdout}${result.stderr}`);
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function tail(text: string): string {
  return text.trim().split('\n').slice(-12).join('\n');
}

function record(stage: Stage, ok: boolean, detail?: string): void {
  stages.push({ stage, ok, ...(detail ? { detail } : {}) });
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'} ${stage}${detail ? ` — ${detail}` : ''}\n`);
}

function cleanup(): void {
  if (containerId) {
    spawnSync('docker', ['rm', '--force', containerId], { stdio: 'ignore' });
    containerId = null;
  }
  if (imageTag) spawnSync('docker', ['image', 'rm', '--force', imageTag], { stdio: 'ignore' });
}

function writeReceipt(ok: boolean, error?: string): void {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(receiptPath, `${JSON.stringify({
    schema: 'omega-release-receipt-v1',
    ok,
    imageTag,
    imageId,
    version,
    revision,
    buildTime,
    stages,
    ...(error ? { error } : {}),
  }, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ cmd: 'release-receipt', ok, path: path.relative(process.cwd(), receiptPath) })}\n`);
}

async function waitForJson(url: string, timeoutMs: number): Promise<{ status: number; body: unknown }> {
  const started = Date.now();
  let lastError = 'not attempted';
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      const text = await response.text();
      return { status: response.status, body: JSON.parse(text) as unknown };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  throw new Error(`timed out waiting for ${url}: ${lastError}`);
}

async function waitForText(url: string, timeoutMs: number): Promise<{ status: number; body: string }> {
  const started = Date.now();
  let lastError = 'not attempted';
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      return { status: response.status, body: await response.text() };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  throw new Error(`timed out waiting for ${url}: ${lastError}`);
}

function reservePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') return reject(new Error('could not reserve a TCP port'));
      server.close(() => resolve(address.port));
    });
  });
}

async function main(): Promise<void> {
  if (!version || !revision) throw new Error('package version and Git revision are required');
  const useGhaCache = process.env.OMEGA_DOCKER_CACHE === 'gha';
  const build = docker(releaseBuildArgs({ useGhaCache, imageTag, version, revision, buildTime }), 'image-build.log');
  if (build.status !== 0) {
    record('image-build', false, tail(`${build.stdout}${build.stderr}`));
    throw new Error('Docker image build failed');
  }
  imageId = docker(['image', 'inspect', '--format', '{{.Id}}', imageTag], 'image-inspect.log').stdout.trim();
  const labelsResult = docker(['image', 'inspect', '--format', '{{json .Config.Labels}}', imageTag], 'image-labels.log');
  let labels: Record<string, string> = {};
  try { labels = JSON.parse(labelsResult.stdout) as Record<string, string>; } catch { /* handled below */ }
  const labelsMatch = labels['org.opencontainers.image.version'] === version
    && labels['org.opencontainers.image.revision'] === revision
    && labels['org.opencontainers.image.created'] === buildTime;
  if (!labelsMatch) {
    record('image-build', false, `OCI labels did not match ${version}@${revision.slice(0, 12)}`);
    throw new Error('Docker image provenance labels are missing or stale');
  }
  record('image-build', true, imageId);

  const port = await reservePort();
  const started = docker(['run', '--detach', '--rm', '--env', 'NODE_ENV=production', '--publish', `127.0.0.1:${port}:3324`, imageTag], 'container-startup.log');
  if (started.status !== 0) {
    record('container-startup', false, tail(`${started.stdout}${started.stderr}`));
    throw new Error('Docker container failed to start');
  }
  containerId = started.stdout.trim();
  record('container-startup', true, containerId.slice(0, 12));

  const health = await waitForJson(`http://127.0.0.1:${port}/api/health`, 30_000);
  const healthBody = health.body as Record<string, unknown>;
  const expectedHealth = health.status === 200
    && healthBody.status === 'healthy'
    && healthBody.version === version
    && healthBody.revision === revision
    && healthBody.builtAt === buildTime
    && healthBody.environment === 'production';
  if (!expectedHealth) {
    record('health', false, JSON.stringify({ status: health.status, body: health.body }));
    throw new Error('health response did not match build provenance');
  }
  record('health', true, `${version}@${revision.slice(0, 12)}`);

  const staticApp = await waitForText(`http://127.0.0.1:${port}/`, 5_000);
  if (staticApp.status !== 200 || !/<(?:!doctype|html)/i.test(staticApp.body)) {
    record('static-smoke', false, `HTTP ${staticApp.status}`);
    throw new Error('production root did not return an HTML application');
  }
  record('static-smoke', true, `HTTP ${staticApp.status}`);

  const manifest = await waitForJson(`http://127.0.0.1:${port}/api/chapters`, 5_000);
  const manifestBody = manifest.body as { schema?: unknown; chapters?: unknown };
  const expectedIds = PRODUCTION_CHAPTER_MANIFEST.map(chapter => chapter.id);
  const actualIds = Array.isArray(manifestBody.chapters)
    ? manifestBody.chapters.map(entry => (entry as { id?: unknown }).id)
    : [];
  if (manifest.status !== 200 || manifestBody.schema !== 'omega-production-chapters-v1' || JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
    record('manifest', false, JSON.stringify({ status: manifest.status, body: manifest.body }));
    throw new Error('production chapter manifest does not match canonical shipping chapters');
  }
  record('manifest', true, `${actualIds.length} shipping chapters`);
}

process.on('SIGINT', () => { cleanup(); process.exit(130); });
process.on('SIGTERM', () => { cleanup(); process.exit(143); });

main()
  .then(() => { cleanup(); writeReceipt(true); })
  .catch(error => {
    const message = error instanceof Error ? error.message : String(error);
    cleanup();
    writeReceipt(false, message);
    process.exitCode = 1;
  });

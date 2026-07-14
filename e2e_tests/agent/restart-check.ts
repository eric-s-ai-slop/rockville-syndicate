import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const root = process.cwd();
const port = 3324;
const logPath = path.resolve('agent-artifacts/dev-server.log');

function owner(): { pid: number; cwd: string } | null {
  const result = spawnSync('lsof', ['-ti', `tcp:${port}`], { encoding: 'utf8' });
  const pid = Number(result.stdout.trim().split(/\s+/)[0]);
  if (!Number.isInteger(pid) || pid <= 0) return null;
  const cwdResult = spawnSync('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'], { encoding: 'utf8' });
  const cwd = cwdResult.stdout.split('\n').find((line) => line.startsWith('n'))?.slice(1) ?? '';
  return { pid, cwd };
}

function health(): Promise<boolean> {
  return new Promise((resolve) => {
    const request = http.get(`http://127.0.0.1:${port}`, (response) => { response.resume(); resolve((response.statusCode ?? 500) < 500); });
    request.on('error', () => resolve(false));
    request.setTimeout(500, () => { request.destroy(); resolve(false); });
  });
}

async function main(): Promise<void> {
  const existing = owner();
  if (existing && !path.resolve(existing.cwd).startsWith(path.resolve(root))) {
    throw new Error(`REFUSED_UNVERIFIED_PROCESS: port ${port} is owned by PID ${existing.pid} outside ${root}`);
  }
  if (existing) process.kill(existing.pid, 'SIGTERM');
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  const log = fs.createWriteStream(logPath, { flags: 'w' });
  const child = spawn('npm', ['run', 'dev'], { cwd: root, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout?.pipe(log);
  child.stderr?.pipe(log);
  child.unref();
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await health()) {
      process.stdout.write(`${JSON.stringify({ cmd: 'restart-check', ok: true, pid: child.pid, url: `http://localhost:${port}`, log: logPath })}\n`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const tail = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8').split('\n').slice(-20).join('\n') : '';
  throw new Error(`DEV_SERVER_TIMEOUT: server did not become healthy. log=${logPath}\n${tail}`);
}

main().catch((error) => { process.stderr.write(`${JSON.stringify({ cmd: 'restart-check', ok: false, error: error instanceof Error ? error.message : String(error) })}\n`); process.exit(1); });

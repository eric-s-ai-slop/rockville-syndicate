import { spawn } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function runDiagnostic(args: string[]): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'agent', '--', '--diagnostic', '--chapter', 'fixture-playtest', ...args], {
      cwd: path.resolve(__dirname, '../..'),
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let buffer = '';
    const receipts: Record<string, unknown>[] = [];
    const timer = setTimeout(() => { child.kill('SIGTERM'); reject(new Error('diagnostic CLI integration timed out')); }, 20_000);
    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        try { receipts.push(JSON.parse(line) as Record<string, unknown>); } catch { /* npm banners are not receipts */ }
      }
    });
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', () => { clearTimeout(timer); resolve(receipts); });
  });
}

describe('diagnostic CLI integration', () => {
  it('rejects skipped beat prerequisites unless explicitly acknowledged', async () => {
    const receipts = await runDiagnostic(['goto beat 1; quit']);
    const goto = receipts.find((entry) => entry.cmd === 'goto');
    const summary = receipts.find((entry) => entry.cmd === 'session_summary');
    expect(goto).toMatchObject({ ok: false });
    expect(String(goto?.error)).toContain('DIAGNOSTIC_PREREQUISITE_REQUIRED');
    expect(summary).toMatchObject({ evidenceClass: 'targeted-diagnostic', completionEligible: false, completion_status: 'targeted-diagnostic' });
  }, 25_000);

  it('labels an acknowledged beat jump as targeted diagnostic evidence', async () => {
    const receipts = await runDiagnostic(['--allow-skipped-prerequisites', 'goto beat 1; quit']);
    const goto = receipts.find((entry) => entry.cmd === 'goto');
    const summary = receipts.find((entry) => entry.cmd === 'session_summary');
    expect(goto).toMatchObject({ ok: true, evidenceClass: 'targeted-diagnostic', completionEligible: false, beatIndex: 1 });
    expect(summary).toMatchObject({ evidenceClass: 'targeted-diagnostic', completionEligible: false });
  }, 25_000);
});

import { spawn } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('agent JSONL protocol integration', () => {
  it('rejects a second command while the first is in flight', async () => {
    const cwd = path.resolve(__dirname, '../..');
    const child = spawn('npm', ['run', 'agent', '--', '--repl', '--chapter', 'fixture-playtest'], {
      cwd,
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const lines: Record<string, unknown>[] = [];
    let buffer = '';
    let sent = false;
    let quitSent = false;
    const output = new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`protocol integration timed out; receipts=${JSON.stringify(lines)}`));
      }, 20_000);
      child.stdout.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const chunks = buffer.split(/\r?\n/);
        buffer = chunks.pop() ?? '';
        for (const line of chunks) {
          try { lines.push(JSON.parse(line) as Record<string, unknown>); } catch { continue; }
          if (!sent && lines.some((entry) => entry.repl === 'ready')) {
            sent = true;
            child.stdin.write(`${JSON.stringify({ protocol: 'omega-agent-v1', cmd_id: 'slow', action: 'wait', args: ['750'] })}\n`);
            child.stdin.write(`${JSON.stringify({ protocol: 'omega-agent-v1', cmd_id: 'too-soon', action: 'state', args: [] })}\n`);
          }
          if (!quitSent && lines.some((entry) => entry.cmd_id === 'slow' && entry.status === 'completed')) {
            quitSent = true;
            child.stdin.write('quit\n');
          }
        }
      });
      child.on('error', (error) => { clearTimeout(timer); reject(error); });
      child.on('close', (code) => { clearTimeout(timer); resolve(code ?? 0); });
    });
    const code = await output;
    expect(code).toBe(0);
    expect(lines).toContainEqual(expect.objectContaining({ cmd_id: 'too-soon', status: 'rejected', error: expect.objectContaining({ code: 'COMMAND_IN_FLIGHT' }) }));
    expect(lines).toContainEqual(expect.objectContaining({ cmd_id: 'slow', status: 'completed' }));
  }, 25_000);
});

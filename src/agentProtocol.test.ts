import { describe, expect, it } from 'vitest';
import { OMEGA_AGENT_PROTOCOL, parseAgentCommandLine, parseLegacyCommandLine } from '../e2e_tests/agent/protocol';

describe('omega agent protocol parsing', () => {
  it('parses a valid JSON command and preserves string args with spaces', () => {
    const parsed = parseAgentCommandLine(JSON.stringify({
      protocol: OMEGA_AGENT_PROTOCOL,
      cmd_id: 'choose-1',
      action: 'choose',
      args: ['first option with spaces'],
    }));

    expect(parsed.ok).toBe(true);
    if (parsed.ok === false) return;
    expect(parsed.command.cmd_id).toBe('choose-1');
    expect(parsed.request).toMatchObject({
      action: 'choose',
      args: ['first option with spaces'],
      rest: 'first option with spaces',
    });
  });

  it('serializes structured args into JSON text for existing handlers', () => {
    const parsed = parseAgentCommandLine(JSON.stringify({
      protocol: OMEGA_AGENT_PROTOCOL,
      cmd_id: 'mode-1',
      action: 'mode',
      args: ['benTrivia', { rounds: 2, prompt: 'CAN BEN...' }],
    }));

    expect(parsed.ok).toBe(true);
    if (parsed.ok === false) return;
    expect(parsed.request.args).toEqual(['benTrivia', '{"rounds":2,"prompt":"CAN BEN..."}']);
    expect(parsed.request.rest).toBe('benTrivia {"rounds":2,"prompt":"CAN BEN..."}');
  });

  it('rejects malformed JSON', () => {
    const parsed = parseAgentCommandLine('{nope');

    expect(parsed.ok).toBe(false);
    if (parsed.ok === true) return;
    expect(parsed.code).toBe('INVALID_JSON');
    expect(parsed.cmd_id).toBeNull();
  });

  it('rejects commands missing cmd_id or action', () => {
    const missingId = parseAgentCommandLine(JSON.stringify({
      protocol: OMEGA_AGENT_PROTOCOL,
      action: 'state',
    }));
    const missingAction = parseAgentCommandLine(JSON.stringify({
      protocol: OMEGA_AGENT_PROTOCOL,
      cmd_id: 'state-1',
    }));

    expect(missingId.ok).toBe(false);
    if (missingId.ok === false) expect(missingId.code).toBe('INVALID_CMD_ID');
    expect(missingAction.ok).toBe(false);
    if (missingAction.ok === false) expect(missingAction.code).toBe('INVALID_ACTION');
  });

  it('rejects unknown protocol and invalid option shapes', () => {
    const badProtocol = parseAgentCommandLine(JSON.stringify({
      protocol: 'json-rpc-ish',
      cmd_id: 'state-1',
      action: 'state',
    }));
    const badOptions = parseAgentCommandLine(JSON.stringify({
      protocol: OMEGA_AGENT_PROTOCOL,
      cmd_id: 'state-2',
      action: 'state',
      options: { telemetry: 'yes' },
    }));

    expect(badProtocol.ok).toBe(false);
    if (badProtocol.ok === false) expect(badProtocol.code).toBe('INVALID_PROTOCOL');
    expect(badOptions.ok).toBe(false);
    if (badOptions.ok === false) expect(badOptions.code).toBe('INVALID_OPTIONS');
  });

  it('keeps legacy command parsing unchanged', () => {
    expect(parseLegacyCommandLine('walkto 100 200')).toMatchObject({
      action: 'walkto',
      args: ['100', '200'],
      rest: '100 200',
      sourceLine: 'walkto 100 200',
    });
    expect(parseLegacyCommandLine('   # comment')).toBeNull();
  });
});

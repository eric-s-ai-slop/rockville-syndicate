export const OMEGA_AGENT_PROTOCOL = 'omega-agent-v1';

export interface AgentCommandOptions {
  snapshot?: 'after';
  annotate?: boolean;
  telemetry?: boolean;
  console_delta?: boolean;
  timeout_ms?: number;
}

export interface AgentCommand {
  protocol: typeof OMEGA_AGENT_PROTOCOL;
  cmd_id: string;
  action: string;
  args?: unknown[];
  options?: AgentCommandOptions;
}

export interface CommandRequest {
  action: string;
  args: string[];
  rest: string;
  sourceLine: string;
}

export type AgentCommandParseResult =
  | { ok: true; command: AgentCommand; request: CommandRequest }
  | { ok: false; cmd_id: string | null; code: string; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringifyArg(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return String(value);
  return JSON.stringify(value);
}

function commandRequestFromAction(action: string, args: unknown[]): CommandRequest {
  const stringArgs = args.map(stringifyArg);
  return {
    action: action.toLowerCase(),
    args: stringArgs,
    rest: stringArgs.join(' '),
    sourceLine: [action, ...stringArgs].join(' '),
  };
}

export function parseLegacyCommandLine(line: string): CommandRequest | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const action = trimmed.split(/\s+/)[0].toLowerCase();
  const rest = trimmed.slice(action.length).trim();
  return {
    action,
    args: rest.length ? rest.split(/\s+/) : [],
    rest,
    sourceLine: trimmed,
  };
}

export function parseAgentCommandLine(line: string): AgentCommandParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      cmd_id: null,
      code: 'INVALID_JSON',
      message:
        `${detail} JSONL requires one newline-terminated command at a time; ` +
        'wait for its completed/failed receipt before sending the next command.',
    };
  }

  const cmdId = isRecord(parsed) && typeof parsed.cmd_id === 'string' ? parsed.cmd_id : null;
  if (!isRecord(parsed)) {
    return { ok: false, cmd_id: cmdId, code: 'INVALID_COMMAND', message: 'Command must be a JSON object.' };
  }
  if (parsed.protocol !== OMEGA_AGENT_PROTOCOL) {
    return {
      ok: false,
      cmd_id: cmdId,
      code: 'INVALID_PROTOCOL',
      message: `Expected protocol "${OMEGA_AGENT_PROTOCOL}".`,
    };
  }
  if (typeof parsed.cmd_id !== 'string' || parsed.cmd_id.trim() === '') {
    return { ok: false, cmd_id: cmdId, code: 'INVALID_CMD_ID', message: 'cmd_id must be a non-empty string.' };
  }
  if (typeof parsed.action !== 'string' || parsed.action.trim() === '') {
    return { ok: false, cmd_id: parsed.cmd_id, code: 'INVALID_ACTION', message: 'action must be a non-empty string.' };
  }
  if (parsed.args !== undefined && !Array.isArray(parsed.args)) {
    return { ok: false, cmd_id: parsed.cmd_id, code: 'INVALID_ARGS', message: 'args must be an array when provided.' };
  }
  if (parsed.options !== undefined && !isRecord(parsed.options)) {
    return { ok: false, cmd_id: parsed.cmd_id, code: 'INVALID_OPTIONS', message: 'options must be an object when provided.' };
  }

  const options = (parsed.options ?? {}) as Record<string, unknown>;
  if (options.snapshot !== undefined && options.snapshot !== 'after') {
    return { ok: false, cmd_id: parsed.cmd_id, code: 'INVALID_OPTIONS', message: 'options.snapshot only supports "after".' };
  }
  for (const key of ['annotate', 'telemetry', 'console_delta'] as const) {
    if (options[key] !== undefined && typeof options[key] !== 'boolean') {
      return { ok: false, cmd_id: parsed.cmd_id, code: 'INVALID_OPTIONS', message: `options.${key} must be boolean.` };
    }
  }
  if (
    options.timeout_ms !== undefined &&
    (typeof options.timeout_ms !== 'number' || !Number.isFinite(options.timeout_ms) || options.timeout_ms <= 0)
  ) {
    return { ok: false, cmd_id: parsed.cmd_id, code: 'INVALID_OPTIONS', message: 'options.timeout_ms must be a positive number.' };
  }

  const args = Array.isArray(parsed.args) ? parsed.args : [];
  const command: AgentCommand = {
    protocol: OMEGA_AGENT_PROTOCOL,
    cmd_id: parsed.cmd_id,
    action: parsed.action,
    args,
    options: options as AgentCommandOptions,
  };
  return {
    ok: true,
    command,
    request: commandRequestFromAction(command.action, command.args ?? []),
  };
}

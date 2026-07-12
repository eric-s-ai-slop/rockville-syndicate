/**
 * playtestPolicy.ts — pure, dependency-free policy for `--playtest` mode.
 *
 * `cli.ts` calls `main()` at module scope (it boots a real Playwright
 * browser as a side effect of being imported), so it can't be imported from
 * a Vitest unit test. This module holds the actual --playtest decision
 * logic in isolation so it can be unit-tested directly, with `cli.ts`
 * importing it as the single source of truth for the gate.
 *
 * `checkPlaytestPolicy` is pure and synchronous: given the parsed verb/args/
 * rest of one command, it decides whether that command is allowed to run
 * unmodified, must be blocked outright, or is allowed but should be recorded
 * in the session's audit trail. It never touches the page/agent/flags —
 * callers (cli.ts) are responsible for acting on the decision (throwing,
 * recording, etc).
 */

export type PlaytestPolicyDecision =
  | { kind: 'allowed' }
  | { kind: 'blocked'; error: string }
  | { kind: 'audited'; note: string };

/**
 * Mirrors the `watch` command's own parsing of its raw remainder (see the
 * `watch` case in cli.ts): a trailing bare integer is peeled off as
 * `timeoutMs` (default 5000), then surrounding matching quotes are stripped.
 * `cli.ts` imports this so the expression it actually runs and the
 * expression the policy lints are guaranteed to be the same string.
 */
export function parseWatchExpression(rest: string): { expr: string; timeoutMs: number } {
  let expr = rest;
  let timeoutMs = 5000;
  const trailingMs = expr.match(/^(.*\S)\s+(\d+)$/);
  if (trailingMs) {
    expr = trailingMs[1];
    timeoutMs = Number(trailingMs[2]);
  }
  if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
    expr = expr.slice(1, -1);
  }
  return { expr, timeoutMs };
}

// Compound-assignment operators. Order doesn't matter here since each is
// checked independently via `includes` rather than a single alternated
// regex match, so there's no "longest alternative first" concern.
const COMPOUND_ASSIGNMENT_OPS = [
  '**=', '&&=', '||=', '??=', '<<=', '>>=',
  '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=',
];

// Multi-character comparison/arrow operators that legitimately contain '='.
// Longest-first within each shared prefix so the regex engine's left-to-right
// alternative matching consumes the full operator instead of a shorter
// prefix of it (e.g. '===' must be tried before '==', '!==' before '!=').
const COMPARISON_OPS_RE = /===|!==|==|!=|<=|>=|=>/g;

/**
 * Rejects a `watch` expression that could mutate live game state instead of
 * merely reading it. Blocks `++`/`--`, any compound-assignment operator, and
 * any bare `=` that isn't part of a comparison/arrow operator.
 */
export function isMutatingWatchExpr(expr: string): boolean {
  if (/\+\+|--/.test(expr)) return true;
  if (COMPOUND_ASSIGNMENT_OPS.some((op) => expr.includes(op))) return true;
  const withoutComparisons = expr.replace(COMPARISON_OPS_RE, '');
  return withoutComparisons.includes('=');
}

/**
 * Decide what --playtest mode does with one already-parsed command.
 *
 * `verb` is the lowercased command name, `args` the whitespace-split
 * arguments, and `rest` the raw remainder string (used by `eval`/`watch`,
 * which can contain spaces themselves).
 */
export function checkPlaytestPolicy(verb: string, args: string[], rest: string): PlaytestPolicyDecision {
  switch (verb) {
    case 'eval':
      return {
        kind: 'blocked',
        error: 'eval is unavailable in --playtest mode; use supported CLI commands only.',
      };
    case 'goto':
      return {
        kind: 'blocked',
        error: 'goto is unavailable in --playtest mode; report the blocked scene instead of bypassing it.',
      };
    case 'mode':
      return {
        kind: 'blocked',
        error: 'mode is unavailable in --playtest mode; it launches a mode directly and is not a bypass. Reach minigames through chapter flow, attempt the visible UI, then use winmode/losemode only if blocked.',
      };
    case 'modify':
      return {
        kind: 'blocked',
        error: 'modify is unavailable in --playtest mode; do not alter live chapter state.',
      };
    case 'injectbeat':
      return {
        kind: 'blocked',
        error: 'injectbeat is unavailable in --playtest mode; do not alter chapter flow.',
      };

    case 'skipbeat': {
      // Mirrors cli.ts's own default-to-1 parsing (`args[0] ? num(0) : 1`).
      // The general positive-integer validation stays in cli.ts and runs
      // regardless of --playtest; this only cares about the multi-beat case.
      const count = args[0] ? Number(args[0]) : 1;
      if (count !== 1) {
        return {
          kind: 'blocked',
          error: 'Only skipbeat 1 is allowed in --playtest mode; larger skips invalidate untested content.',
        };
      }
      return { kind: 'allowed' };
    }

    case 'chapterflag': {
      if (args.length > 0) {
        return {
          kind: 'blocked',
          error: 'chapterflag writes are unavailable in --playtest mode; progress must come from actually playing.',
        };
      }
      return { kind: 'allowed' };
    }

    case 'settings': {
      if (args.length > 0) {
        return {
          kind: 'blocked',
          error: 'settings writes are unavailable in --playtest mode; do not alter persisted settings state.',
        };
      }
      return { kind: 'allowed' };
    }

    case 'watch': {
      const { expr } = parseWatchExpression(rest);
      if (isMutatingWatchExpr(expr)) {
        return {
          kind: 'blocked',
          error: 'watch predicates must be read-only in --playtest mode; the expression must not mutate game state.',
        };
      }
      return { kind: 'audited', note: `watch: ${expr}` };
    }

    case 'loadstate': {
      const file = args[0];
      if (file) {
        return { kind: 'audited', note: `loadstate from file: ${file}` };
      }
      return { kind: 'allowed' };
    }

    case 'speed':
    case 'timescale': {
      const factor = args[0];
      return { kind: 'audited', note: `speed set to ${factor}` };
    }

    default:
      return { kind: 'allowed' };
  }
}

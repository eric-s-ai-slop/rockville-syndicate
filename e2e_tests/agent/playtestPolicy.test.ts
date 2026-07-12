import { describe, expect, it } from 'vitest';
import { checkPlaytestPolicy, isMutatingWatchExpr, parseWatchExpression } from './playtestPolicy';

describe('checkPlaytestPolicy — blocked verbs', () => {
  it('blocks eval', () => {
    expect(checkPlaytestPolicy('eval', [], 'window.location.reload()')).toEqual({
      kind: 'blocked',
      error: 'eval is unavailable in --playtest mode; use supported CLI commands only.',
    });
  });

  it('blocks goto', () => {
    expect(checkPlaytestPolicy('goto', ['3'], '')).toEqual({
      kind: 'blocked',
      error: 'goto is unavailable in --playtest mode; report the blocked scene instead of bypassing it.',
    });
  });

  it('blocks mode', () => {
    expect(checkPlaytestPolicy('mode', ['bossFight'], '')).toEqual({
      kind: 'blocked',
      error: 'mode is unavailable in --playtest mode; it launches a mode directly and is not a bypass. Reach minigames through chapter flow, attempt the visible UI, then use winmode/losemode only if blocked.',
    });
  });

  it('blocks modify', () => {
    expect(checkPlaytestPolicy('modify', ['hp', '999'], '')).toEqual({
      kind: 'blocked',
      error: 'modify is unavailable in --playtest mode; do not alter live chapter state.',
    });
  });

  it('blocks injectbeat', () => {
    expect(checkPlaytestPolicy('injectbeat', [], '{"type":"wait"}')).toEqual({
      kind: 'blocked',
      error: 'injectbeat is unavailable in --playtest mode; do not alter chapter flow.',
    });
  });
});

describe('checkPlaytestPolicy — skipbeat', () => {
  it('allows skipbeat with no args (defaults to 1)', () => {
    expect(checkPlaytestPolicy('skipbeat', [], '')).toEqual({ kind: 'allowed' });
  });

  it('allows skipbeat 1', () => {
    expect(checkPlaytestPolicy('skipbeat', ['1'], '')).toEqual({ kind: 'allowed' });
  });

  it('blocks skipbeat 2', () => {
    expect(checkPlaytestPolicy('skipbeat', ['2'], '')).toEqual({
      kind: 'blocked',
      error: 'Only skipbeat 1 is allowed in --playtest mode; larger skips invalidate untested content.',
    });
  });
});

describe('checkPlaytestPolicy — chapterflag reads vs writes', () => {
  it('allows a bare chapterflag read', () => {
    expect(checkPlaytestPolicy('chapterflag', [], '')).toEqual({ kind: 'allowed' });
  });

  it('blocks a chapterflag write', () => {
    expect(checkPlaytestPolicy('chapterflag', ['ch1', 'complete'], '')).toEqual({
      kind: 'blocked',
      error: 'chapterflag writes are unavailable in --playtest mode; progress must come from actually playing.',
    });
  });

  it('blocks every chapterflag write action', () => {
    for (const action of ['complete', 'uncomplete', 'freeplay-on', 'freeplay-off']) {
      const decision = checkPlaytestPolicy('chapterflag', ['ch1', action], '');
      expect(decision.kind).toBe('blocked');
    }
  });
});

describe('checkPlaytestPolicy — settings reads vs writes', () => {
  it('allows a bare settings read', () => {
    expect(checkPlaytestPolicy('settings', [], '')).toEqual({ kind: 'allowed' });
  });

  it('blocks a settings write', () => {
    expect(checkPlaytestPolicy('settings', ['musicVolume', '0'], '')).toEqual({
      kind: 'blocked',
      error: 'settings writes are unavailable in --playtest mode; do not alter persisted settings state.',
    });
  });
});

describe('checkPlaytestPolicy — audited commands', () => {
  it('audits a read-only watch expression, including it in the note', () => {
    // Quoted, matching the documented `watch "<expr>" [timeoutMs]` usage — an
    // unquoted expression ending in a bare number has that number peeled off
    // as timeoutMs (see the parseWatchExpression tests below).
    const decision = checkPlaytestPolicy('watch', [], '"scene.activeHp < 50"');
    expect(decision).toEqual({ kind: 'audited', note: 'watch: scene.activeHp < 50' });
  });

  it('audits loadstate with a file argument, including the file in the note', () => {
    const decision = checkPlaytestPolicy('loadstate', ['save1.json'], '');
    expect(decision).toEqual({ kind: 'audited', note: 'loadstate from file: save1.json' });
  });

  it('allows bare in-memory loadstate without auditing', () => {
    expect(checkPlaytestPolicy('loadstate', [], '')).toEqual({ kind: 'allowed' });
  });

  it('audits speed, including the factor in the note', () => {
    const decision = checkPlaytestPolicy('speed', ['3'], '');
    expect(decision).toEqual({ kind: 'audited', note: 'speed set to 3' });
  });

  it('audits timescale (alias of speed)', () => {
    const decision = checkPlaytestPolicy('timescale', ['2'], '');
    expect(decision).toEqual({ kind: 'audited', note: 'speed set to 2' });
  });
});

describe('checkPlaytestPolicy — mutating watch expressions are blocked', () => {
  it('blocks an assignment watch expression', () => {
    const decision = checkPlaytestPolicy('watch', [], 'scene.player.x = 999');
    expect(decision.kind).toBe('blocked');
    if (decision.kind === 'blocked') {
      expect(decision.error).toMatch(/read-only/);
    }
  });

  it('blocks a compound-assignment watch expression', () => {
    const decision = checkPlaytestPolicy('watch', [], 'scene.activeHp += 1');
    expect(decision.kind).toBe('blocked');
  });
});

describe('checkPlaytestPolicy — unknown verbs', () => {
  it('allows an unrecognized command', () => {
    expect(checkPlaytestPolicy('state', [], '')).toEqual({ kind: 'allowed' });
    expect(checkPlaytestPolicy('advance', ['30'], '')).toEqual({ kind: 'allowed' });
    expect(checkPlaytestPolicy('totallyMadeUpVerb', ['x'], '')).toEqual({ kind: 'allowed' });
  });
});

describe('parseWatchExpression', () => {
  it('strips a trailing bare-integer timeout', () => {
    expect(parseWatchExpression('scene.activeHp < 50 10000')).toEqual({
      expr: 'scene.activeHp < 50',
      timeoutMs: 10000,
    });
  });

  it('defaults timeoutMs to 5000 when no trailing integer is present', () => {
    // An unquoted expression ending in a bare number ('... < 50') would have
    // that number parsed as timeoutMs instead (see the test above) — quoting
    // is how a caller keeps a numeric literal as part of the expression.
    expect(parseWatchExpression('"scene.activeHp < 50"')).toEqual({
      expr: 'scene.activeHp < 50',
      timeoutMs: 5000,
    });
  });

  it('strips surrounding double quotes', () => {
    expect(parseWatchExpression('"scene.activeHp < 50"')).toEqual({
      expr: 'scene.activeHp < 50',
      timeoutMs: 5000,
    });
  });

  it('strips surrounding single quotes', () => {
    expect(parseWatchExpression("'scene.activeHp < 50'")).toEqual({
      expr: 'scene.activeHp < 50',
      timeoutMs: 5000,
    });
  });
});

describe('isMutatingWatchExpr — allowed (read-only) expressions', () => {
  const allowed = [
    'scene.activeHp < 50',
    'a == b',
    'a === b',
    'a <= b',
    'a >= b',
    'a != b',
    'a !== b',
    'scene.beatIndex >= 4 && !scene.movementFrozen',
    '[1,2].some(x => x > 1)',
  ];

  for (const expr of allowed) {
    it(`allows: ${expr}`, () => {
      expect(isMutatingWatchExpr(expr)).toBe(false);
    });
  }
});

describe('isMutatingWatchExpr — blocked (mutating) expressions', () => {
  const blocked = [
    'scene.player.x = 999',
    'scene.activeHp += 1',
    'x++',
    'x--',
    'scene.flags ||= {}',
  ];

  for (const expr of blocked) {
    it(`blocks: ${expr}`, () => {
      expect(isMutatingWatchExpr(expr)).toBe(true);
    });
  }
});

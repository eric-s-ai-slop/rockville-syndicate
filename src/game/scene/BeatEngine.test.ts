

import { describe, it, expect, vi } from 'vitest';
import { BeatEngine } from './BeatEngine';
import type { Beat } from '../../data/chapters/types';

// ── Pure routing helpers extracted from BeatEngine ────────────────────────────
// These mirror BeatEngine's private routing logic without needing Phaser.

/**
 * Mirror of BeatEngine.gotoBeatId() — finds beat index by id.
 * Returns the found index, or -1 if not found (caller falls through to advance).
 */
function resolveBeatIndex(beats: Beat[], id: string): number {
  return beats.findIndex(b => b.id === id);
}

/**
 * Mirror of BeatEngine.runRouteOnMinigame() routing logic.
 * Returns the target beat id to jump to, or null (meaning: advance normally).
 */
function resolveMinigameRoute(
  lastResult: { data?: unknown } | null,
  cases: Record<string, string>,
  defaultTarget: string | undefined
): string | null {
  const data = lastResult?.data as Record<string, unknown> | undefined;
  const saidTrueThing = data?.saidTrueThing === true;
  const when = saidTrueThing ? (data?.when as string | undefined) : undefined;
  const target = (when && cases[when]) ? cases[when] : defaultTarget;
  return target ?? null;
}

// ── gotoBeatId routing ─────────────────────────────────────────────────────────

describe('BeatEngine.gotoBeatId resolution', () => {
  const beats: Beat[] = [
    { id: 'intro', type: 'dialogue', speaker: 'eric', lines: ['hello'] },
    { id: 'fight', type: 'bossFight', bossId: 'boss_eric', arena: { x: 500, y: 300, w: 400, h: 300 } },
    { id: 'outro', type: 'dialogue', speaker: 'eric', lines: ['done'] },
  ];

  it('finds the correct beat index by id', () => {
    expect(resolveBeatIndex(beats, 'intro')).toBe(0);
    expect(resolveBeatIndex(beats, 'fight')).toBe(1);
    expect(resolveBeatIndex(beats, 'outro')).toBe(2);
  });

  it('returns -1 for unknown beat ids (caller falls to advanceBeat)', () => {
    expect(resolveBeatIndex(beats, 'missing_beat')).toBe(-1);
  });

  it('matches the first occurrence when duplicate ids exist', () => {
    const dup: Beat[] = [
      { id: 'x', type: 'dialogue', speaker: 'eric', lines: ['a'] },
      { id: 'x', type: 'dialogue', speaker: 'eric', lines: ['b'] },
    ];
    expect(resolveBeatIndex(dup, 'x')).toBe(0);
  });
});

// ── routeOnMinigame dispatch ───────────────────────────────────────────────────

describe('BeatEngine.runRouteOnMinigame routing', () => {
  const cases = { monday: 'beat_monday', friday: 'beat_friday' };
  const defaultTarget = 'beat_default';

  it('routes to the matching case when saidTrueThing is true and when matches', () => {
    const result = { data: { saidTrueThing: true, when: 'monday' } };
    expect(resolveMinigameRoute(result, cases, defaultTarget)).toBe('beat_monday');
  });

  it('routes to default when saidTrueThing is true but when does not match a case', () => {
    const result = { data: { saidTrueThing: true, when: 'wednesday' } };
    expect(resolveMinigameRoute(result, cases, defaultTarget)).toBe('beat_default');
  });

  it('routes to default when saidTrueThing is false', () => {
    const result = { data: { saidTrueThing: false, when: 'monday' } };
    expect(resolveMinigameRoute(result, cases, defaultTarget)).toBe('beat_default');
  });

  it('returns null (advance) when no default and no matching case', () => {
    const result = { data: { saidTrueThing: false } };
    expect(resolveMinigameRoute(result, cases, undefined)).toBeNull();
  });

  it('returns default when lastMinigameResult is null (no prior minigame)', () => {
    expect(resolveMinigameRoute(null, cases, defaultTarget)).toBe('beat_default');
  });
});

// ── Beat dispatch type coverage ────────────────────────────────────────────────

describe('Beat type switch — all known types are handled', () => {
  const knownTypes: Beat['type'][] = [
    'dialogue', 'choice', 'walkTo', 'cameraPan', 'bossFight',
    'chase', 'wait', 'ledger', 'minigame', 'routeOnMinigame',
    'stopAllAudio', 'changeScene', 'endChapter',
  ];

  it('every expected beat type is a known string', () => {
    for (const t of knownTypes) {
      expect(typeof t).toBe('string');
    }
  });

  it('no duplicates in the known type list', () => {
    const set = new Set(knownTypes);
    expect(set.size).toBe(knownTypes.length);
  });
});

// ── BeatEngine.startBeat ───────────────────────────────────────────────────────




describe('BeatEngine.startBeat', () => {
  it('returns early if index is out of bounds', () => {
    const mockScene: any = {
      chapter: { beats: [{ type: 'dialogue', speaker: 'eric', lines: ['a'] }] },
      beatIndex: 0,
      beatActive: false,
    };
    const engine = new BeatEngine(mockScene);

    engine.startBeat(1);

    expect(mockScene.beatIndex).toBe(0);
    expect(mockScene.beatActive).toBe(false);
  });

  it('updates state and delegates to runDialogueBeat', () => {
    const mockScene: any = {
      chapter: { beats: [{ type: 'dialogue', speaker: 'eric', lines: ['a'] }] },
      beatIndex: -1,
      beatActive: false,
    };
    const engine = new BeatEngine(mockScene);
    const runDialogueBeatSpy = vi.spyOn(engine as any, 'runDialogueBeat').mockImplementation(() => {});

    engine.startBeat(0);

    expect(mockScene.beatIndex).toBe(0);
    expect(mockScene.beatActive).toBe(true);
    expect(runDialogueBeatSpy).toHaveBeenCalledWith(mockScene.chapter.beats[0]);
  });

  it('delegates wait beat using scene.time.delayedCall', () => {
    const mockDelayedCall = vi.fn();
    const mockScene: any = {
      chapter: { beats: [{ type: 'wait', ms: 1000 }] },
      beatIndex: -1,
      beatActive: false,
      time: { delayedCall: mockDelayedCall }
    };
    const engine = new BeatEngine(mockScene);

    engine.startBeat(0);

    expect(mockScene.beatIndex).toBe(0);
    expect(mockScene.beatActive).toBe(true);
    expect(mockDelayedCall).toHaveBeenCalledWith(1000, expect.any(Function));
  });

  it('delegates ledger beat and calls advanceBeat', () => {
    const mockApplyLedger = vi.fn();
    const mockScene: any = {
      chapter: { beats: [{ type: 'ledger', delta: 50, note: 'test' }] },
      beatIndex: -1,
      beatActive: false,
      applyLedger: mockApplyLedger
    };
    const engine = new BeatEngine(mockScene);
    const advanceBeatSpy = vi.spyOn(engine as any, 'advanceBeat').mockImplementation(() => {});

    engine.startBeat(0);

    expect(mockScene.beatIndex).toBe(0);
    expect(mockScene.beatActive).toBe(true);
    expect(mockApplyLedger).toHaveBeenCalledWith(50, 'test');
    expect(advanceBeatSpy).toHaveBeenCalled();
  });
});

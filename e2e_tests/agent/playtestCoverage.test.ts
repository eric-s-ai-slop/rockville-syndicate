import { describe, expect, it } from 'vitest';
import { playtestCompletionVerdict } from './playtestCompliance';
import { PlaytestCoverageTracker } from './playtestCoverage';

const transition = (overrides: Partial<{
  reason: string;
  modeKind: 'foreground' | 'background' | null;
  modeId: string | null;
  modeBeatIndex: number | null;
}> = {}) => ({
  reason: 'chapter scene 0 entered',
  modeKind: null as 'foreground' | 'background' | null,
  modeId: null,
  modeBeatIndex: null,
  ...overrides,
});
describe('PlaytestCoverageTracker', () => {
  it('consumes every coalesced transition and separates checkpointed/reviewed scenes', () => {
    const tracker = new PlaytestCoverageTracker();
    tracker.recordCheckpoint(1, 1, [
      transition({ reason: 'chapter scene 1 entered' }),
      transition({
        reason: 'Background mode "poolParty" ended',
        modeKind: 'background',
        modeId: 'poolParty',
        modeBeatIndex: 18,
      }),
    ]);
    tracker.recordCheckpointReview(1);

    expect(tracker.summary()).toMatchObject({
      scenes: { checkpointed: [1], reviewed: [1] },
      modes: [{ id: 'poolParty', kind: 'background', beatIndex: 18, ending: 'natural' }],
    });
  });

  it('counts keyboard, pointer, and drag inputs without inferring understanding', () => {
    const tracker = new PlaytestCoverageTracker();
    tracker.recordCheckpoint(1, 0, [transition({
      reason: 'Foreground mode "trivia" started',
      modeKind: 'foreground',
      modeId: 'trivia',
      modeBeatIndex: 4,
    })]);
    tracker.recordInput('tap');
    tracker.recordInput('click');
    tracker.recordInput('drag');
    tracker.recordCheckpoint(2, 0, [transition({
      reason: 'Foreground mode "trivia" ended',
      modeKind: 'foreground',
      modeId: 'trivia',
      modeBeatIndex: 4,
    })]);

    expect(tracker.summary().modes).toEqual([{
      id: 'trivia',
      beatIndex: 4,
      kind: 'foreground',
      inputs: { count: 3, keyboard: 1, pointer: 1, drag: 1 },
      ending: 'natural',
    }]);
  });

  it('distinguishes bypassed mode endings from natural endings', () => {
    const tracker = new PlaytestCoverageTracker();
    tracker.recordCheckpoint(1, 0, [transition({
      reason: 'Foreground mode "bossFight" started',
      modeKind: 'foreground',
      modeId: 'bossFight',
      modeBeatIndex: 7,
    })]);
    tracker.recordBypass('winmode');
    tracker.recordCheckpoint(2, 0, [transition({
      reason: 'Foreground mode "bossFight" ended',
      modeKind: 'foreground',
      modeId: 'bossFight',
      modeBeatIndex: 7,
    })]);

    expect(tracker.summary().modes[0]?.ending).toBe('bypassed');
  });

  it('records choice options, walk results, terminal observation, and passive misses compactly', () => {
    const tracker = new PlaytestCoverageTracker();
    tracker.recordChoice(0, 3, 1, 'Take the left path');
    tracker.recordWalk(0, 5, 'walkTo', false);
    tracker.recordWalk(0, 5, 'walkTo', true);
    tracker.recordTerminalObservation();
    tracker.recordPassiveEvents([
      { sceneIndex: 0, beatIndex: 9, beatType: 'ledger', evidence: 'post-advance' },
      { sceneIndex: 0, beatIndex: 12, beatType: 'hideActor', captureMissed: true, evidence: 'missed' },
    ]);

    expect(tracker.summary()).toEqual({
      scenes: { checkpointed: [], reviewed: [] },
      choices: [{ sceneIndex: 0, beatIndex: 3, optionIndex: 1, optionText: 'Take the left path' }],
      walks: [{ sceneIndex: 0, beatIndex: 5, attempts: 2, successes: 1, failures: 1 }],
      modes: [],
      terminalObserved: true,
      passive: {
        captured: ['0:9:ledger'],
        missed: ['0:12:hideActor'],
      },
    });
  });

  it('does not attribute skipbeat to a background mode attempt', () => {
    const tracker = new PlaytestCoverageTracker();
    tracker.recordCheckpoint(1, 0, [transition({
      reason: 'Background mode "poolParty" started',
      modeKind: 'background',
      modeId: 'poolParty',
      modeBeatIndex: 18,
    })]);
    tracker.recordBypass('skipbeat');

    expect(tracker.summary().modes).toMatchObject([{
      id: 'poolParty',
      kind: 'background',
      ending: 'active',
    }]);
    expect(playtestCompletionVerdict({
      status: 'complete',
      captured: 0,
      reviewed: 0,
      pending: [],
      reviews: [],
      reasons: [],
    }, tracker.summary(), 'partially-bypassed')).toMatchObject({
      ok: false,
      status: 'incomplete-integrity',
    });
  });

  it('does not create walk coverage outside a walk objective', () => {
    const tracker = new PlaytestCoverageTracker();
    tracker.recordWalk(0, 4, 'dialogue', true);
    expect(tracker.summary().walks).toEqual([]);
  });
});

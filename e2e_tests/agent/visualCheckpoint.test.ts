import { describe, expect, it } from 'vitest';
import {
  checkpointIdentity,
  checkpointTransitions,
  coalesceCheckpointTransitions,
  contactSheetChunks,
  isCheckpointIdentityReady,
  passiveVisualEventKey,
  persistentEvidenceEvent,
  persistentEvidenceMode,
  visualEventsFromBeatTrace,
  type CheckpointIdentity,
} from './visualCheckpoint';

const scene = (overrides: Partial<CheckpointIdentity> = {}): CheckpointIdentity => ({
  sceneKey: 'ChapterScene',
  sceneIndex: 0,
  foregroundModeId: null,
  foregroundModeBeatIndex: null,
  backgroundModeId: null,
  backgroundModeBeatIndex: null,
  ...overrides,
});

describe('checkpointIdentity', () => {
  it('rejects the pre-activation bridge identity that can capture a black frame', () => {
    expect(isCheckpointIdentityReady(scene({ sceneKey: null }))).toBe(false);
    expect(isCheckpointIdentityReady(scene())).toBe(true);
  });

  it('keeps foreground and background mode ids and beat indexes in separate fields', () => {
    expect(checkpointIdentity({
      sceneKey: 'ChapterScene',
      sceneIndex: 0,
      activeModeId: 'poolParty',
      activeModeBeatIndex: 18,
      activeModeBackground: true,
    })).toEqual(scene({ backgroundModeId: 'poolParty', backgroundModeBeatIndex: 18 }));

    expect(checkpointIdentity({
      sceneKey: 'ChapterScene',
      sceneIndex: 0,
      activeModeId: 'benTrivia',
      activeModeBeatIndex: 16,
      activeModeBackground: false,
    })).toEqual(scene({ foregroundModeId: 'benTrivia', foregroundModeBeatIndex: 16 }));
  });
});

describe('checkpointTransitions', () => {
  it('emits a deduplicated background start and no receipt for repeated observation', () => {
    const start = scene({ backgroundModeId: 'poolParty', backgroundModeBeatIndex: 18 });
    expect(checkpointTransitions(scene(), start)).toMatchObject([{
      modeKind: 'background',
      modeId: 'poolParty',
      modeBeatIndex: 18,
      reason: 'Background mode "poolParty" started',
    }]);
    expect(checkpointTransitions(start, start)).toEqual([]);
  });

  it('emits background replacement and end transitions', () => {
    const active = scene({ backgroundModeId: 'poolParty', backgroundModeBeatIndex: 18 });
    const replacement = scene({ backgroundModeId: 'crowdLoop', backgroundModeBeatIndex: 21 });

    expect(checkpointTransitions(active, replacement)).toMatchObject([{
      modeKind: 'background',
      modeId: 'crowdLoop',
      modeBeatIndex: 21,
      reason: 'Background mode "poolParty" replaced by "crowdLoop"',
    }]);
    expect(checkpointTransitions(active, scene())).toMatchObject([{
      modeKind: 'background',
      modeId: 'poolParty',
      modeBeatIndex: 18,
      reason: 'Background mode "poolParty" ended',
    }]);
  });

  it('keeps foreground start/end behavior and reports scene plus background teardown together', () => {
    const backgroundScene = scene({ backgroundModeId: 'poolParty', backgroundModeBeatIndex: 18 });
    const nextScene = scene({ sceneIndex: 1 });
    const sceneAndTeardown = checkpointTransitions(backgroundScene, nextScene);
    expect(sceneAndTeardown).toEqual(expect.arrayContaining([
      expect.objectContaining({ reason: 'chapter scene 1 entered', modeKind: null }),
      expect.objectContaining({
        reason: 'Background mode "poolParty" ended',
        modeKind: 'background',
        modeId: 'poolParty',
      }),
    ]));

    const foreground = scene({ foregroundModeId: 'benTrivia', foregroundModeBeatIndex: 16 });
    expect(checkpointTransitions(scene(), foreground)).toMatchObject([{
      modeKind: 'foreground',
      modeId: 'benTrivia',
      reason: 'Foreground mode "benTrivia" started',
    }]);
    expect(checkpointTransitions(foreground, scene())).toMatchObject([{
      modeKind: 'foreground',
      modeId: 'benTrivia',
      reason: 'Foreground mode "benTrivia" ended',
    }]);
  });
});

describe('passive visual beat trace projection', () => {
  it('keeps only risk beat types and deduplicates by scene, beat, and type', () => {
    expect(visualEventsFromBeatTrace([
      { sequence: 1, beatIndex: 5, beatType: 'cameraPan', sceneIndex: 0, timestamp: 1 },
      { sequence: 2, beatIndex: 6, beatType: 'dialogue', sceneIndex: 0, timestamp: 2 },
      { sequence: 3, beatIndex: 7, beatType: 'hideActor', sceneIndex: 0, timestamp: 3 },
      { sequence: 4, beatIndex: 7, beatType: 'hideActor', sceneIndex: 0, timestamp: 4 },
      { sequence: 5, beatIndex: 8, beatType: 'ledger', sceneIndex: 1, timestamp: 5 },
    ])).toEqual([
      { sceneIndex: 0, beatIndex: 5, beatType: 'cameraPan' },
      { sceneIndex: 0, beatIndex: 7, beatType: 'hideActor' },
      { sceneIndex: 1, beatIndex: 8, beatType: 'ledger' },
    ]);
  });

  it('uses the documented dedupe key', () => {
    expect(passiveVisualEventKey({ sceneIndex: 2, beatIndex: 14, beatType: 'chase' })).toBe('2:14:chase');
  });

  it('caps contact-sheet batches at six tiles', () => {
    expect(contactSheetChunks(Array.from({ length: 13 }, (_, index) => index))).toEqual([
      [0, 1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10, 11],
      [12],
    ]);
  });

  it('marks a persistent effect missed when its scene changed before capture', () => {
    expect(persistentEvidenceEvent({ sceneIndex: 0, beatIndex: 12, beatType: 'hideActor' }, 1)).toEqual({
      sceneIndex: 0,
      beatIndex: 12,
      beatType: 'hideActor',
      captureMissed: true,
      evidence: 'missed',
    });
  });

  it('allows same-scene persistent effects to use post-advance evidence', () => {
    expect(persistentEvidenceMode({ sceneIndex: 1 }, 1)).toBe('post-advance');
    expect(persistentEvidenceEvent({ sceneIndex: 1, beatIndex: 12, beatType: 'hideActor' }, 1)).toEqual({
      sceneIndex: 1,
      beatIndex: 12,
      beatType: 'hideActor',
      evidence: 'post-advance',
    });
  });
});

describe('coalesced checkpoint receipts', () => {
  it('keeps scene entry and background teardown in one review obligation', () => {
    const transitions = checkpointTransitions(
      scene({ backgroundModeId: 'poolParty', backgroundModeBeatIndex: 18 }),
      scene({ sceneIndex: 1 }),
    );
    const receipt = coalesceCheckpointTransitions(transitions);

    expect(receipt.transitions).toHaveLength(2);
    expect(receipt.reasons).toEqual([
      'chapter scene 1 entered',
      'Background mode "poolParty" ended',
    ]);
    expect(receipt.reason).toBe(receipt.reasons.join('; '));
    expect(receipt.modeKind).toBe('background');
    expect(receipt.modeId).toBe('poolParty');
    expect(receipt.modeBeatIndex).toBe(18);
  });
});

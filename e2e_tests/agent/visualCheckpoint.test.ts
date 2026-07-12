import { describe, expect, it } from 'vitest';
import {
  checkpointIdentity,
  checkpointTransitions,
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

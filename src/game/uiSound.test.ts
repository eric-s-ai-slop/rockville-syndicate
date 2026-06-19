import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { playUi, isUiMuted } from './uiSound';

describe('uiSound error paths', () => {
  let mockPlay: any;

  beforeEach(() => {
    mockPlay = vi.fn().mockResolvedValue(undefined);

    class MockAudio {
      paused = true;
      ended = false;
      currentTime = 0;
      volume = 1;
      play = mockPlay;
    }

    vi.stubGlobal('Audio', MockAudio);

    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should not crash when Audio.play() rejects', async () => {
    mockPlay.mockRejectedValue(new Error('Audio playback failed'));

    expect(() => playUi('click')).not.toThrow();

    // Wait a tick to ensure promise rejection is caught
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  it('should not crash when Audio constructor or play throws synchronously', () => {
    class FailingMockAudio {
      constructor() {
        throw new Error('Audio constructor failed');
      }
    }
    vi.stubGlobal('Audio', FailingMockAudio);

    expect(() => playUi('hover')).not.toThrow();
  });

  it('should return false from isUiMuted if localStorage throws', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('localStorage denied');
    });

    expect(isUiMuted()).toBe(false);
  });
});

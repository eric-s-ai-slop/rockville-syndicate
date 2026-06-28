import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { playUi, isUiMuted } from './uiSound';
import { updateSettings, _reloadFromStorage } from './settings';

describe('uiSound', () => {
  const mockPlay = vi.fn().mockResolvedValue(undefined);
  let audioInstances: any[] = [];

  beforeEach(() => {
    window.localStorage.clear();
    _reloadFromStorage(); // reset settings store to defaults (unmuted)
    mockPlay.mockClear();
    audioInstances = [];

    const MockAudio = vi.fn().mockImplementation(function() {
      // @ts-ignore
      this.play = mockPlay;
      // @ts-ignore
      this.currentTime = 100;
      // @ts-ignore
      this.volume = 1;
      // @ts-ignore
      this.paused = true;
      // @ts-ignore
      this.ended = false;
      audioInstances.push(this);
    });
    vi.stubGlobal('Audio', MockAudio);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('isUiMuted returns false by default', () => {
    expect(isUiMuted()).toBe(false);
  });

  it('isUiMuted returns true when the settings store is muted', () => {
    updateSettings({ muted: true });
    expect(isUiMuted()).toBe(true);
  });

  it('playUi does not play sound if muted', () => {
    updateSettings({ muted: true });
    playUi('click');
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it('playUi plays sound with correct default volume and resets currentTime', () => {
    playUi('click');
    expect(mockPlay).toHaveBeenCalled();
    // Verify volume was assigned
    const instance = audioInstances.find(a => a.volume === 0.4);
    expect(instance).toBeDefined();
    expect(instance.currentTime).toBe(0);
  });

  it('playUi plays sound with specific volume and resets currentTime', () => {
    playUi('hover', 0.8); // use different sound so we don't pick up cached pooled objects with already set states easily if that mattered
    expect(mockPlay).toHaveBeenCalled();
    const instance = audioInstances.find(a => a.volume === 0.8);
    expect(instance).toBeDefined();
    expect(instance.currentTime).toBe(0);
  });
});

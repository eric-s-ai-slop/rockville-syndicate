import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isUiMuted, playUi } from './uiSound';

describe('uiSound', () => {
  let originalAudio: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();

    originalAudio = global.Audio;
    global.Audio = class {
      paused = true;
      ended = true;
      currentTime = 0;
      volume = 1;
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn();
    } as any;
  });

  afterEach(() => {
    global.Audio = originalAudio;
  });

  describe('isUiMuted', () => {
    it('returns true when localStorage has omega-muted as true', () => {
      window.localStorage.setItem('omega-muted', 'true');
      expect(isUiMuted()).toBe(true);
    });

    it('returns false when localStorage has omega-muted as false', () => {
      window.localStorage.setItem('omega-muted', 'false');
      expect(isUiMuted()).toBe(false);
    });

    it('returns false when localStorage does not have omega-muted', () => {
      expect(isUiMuted()).toBe(false);
    });

    it('returns false when localStorage throws an error', () => {
      vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Access Denied');
      });
      expect(isUiMuted()).toBe(false);
    });
  });

  describe('playUi', () => {
    it('does not play sound if UI is muted', () => {
      window.localStorage.setItem('omega-muted', 'true');
      expect(() => playUi('click')).not.toThrow();
    });

    it('catches and ignores exceptions from play()', () => {
      expect(() => playUi('pick')).not.toThrow();
    });

    it('plays sound successfully', () => {
      expect(() => playUi('shatter')).not.toThrow();
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioController } from './AudioController';
import type { AudioContext } from './contracts';

describe('AudioController.safeLoadAudio', () => {
  let loadAudio: ReturnType<typeof vi.fn>;
  let controller: AudioController;

  beforeEach(() => {
    loadAudio = vi.fn();
    controller = new AudioController({ load: { audio: loadAudio } } as unknown as AudioContext);
  });

  it('silently catches loader errors', () => {
    loadAudio.mockImplementation(() => { throw new Error('audio unavailable'); });
    expect(() => controller.safeLoadAudio('test_sfx_key', 'test_sfx_url.mp3')).not.toThrow();
    expect(loadAudio).toHaveBeenCalledWith('test_sfx_key', 'test_sfx_url.mp3');
  });

  it('delegates valid audio registrations to Phaser', () => {
    controller.safeLoadAudio('test_bgm_key', 'test_bgm_url.mp3');
    expect(loadAudio).toHaveBeenCalledWith('test_bgm_key', 'test_bgm_url.mp3');
  });
});

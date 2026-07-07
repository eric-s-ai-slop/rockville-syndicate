import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChapterScene from './ChapterScene';

describe('ChapterScene', () => {
  let scene: any;

  beforeEach(() => {
    // Instantiate ChapterScene
    scene = new ChapterScene();

    // Mock the Phaser load plugin that ChapterScene relies on
    scene.load = {
      audio: vi.fn(),
      image: vi.fn(),
      start: vi.fn(),
      maxParallelDownloads: 32
    };
  });

  describe('safeLoadAudio', () => {
    it('should silently catch errors when load.audio throws', () => {
      // Configure load.audio to throw an exception to simulate a missing file or error
      scene.load.audio.mockImplementation(() => {
        throw new Error('Test error: Audio file missing or unavailable');
      });

      // The call to safeLoadAudio should catch the error and not throw it upwards
      expect(() => {
        scene.safeLoadAudio('test_sfx_key', 'test_sfx_url.mp3');
      }).not.toThrow();

      // Ensure the underlying load.audio was indeed called
      expect(scene.load.audio).toHaveBeenCalledWith('test_sfx_key', 'test_sfx_url.mp3');
    });

    it('should successfully call load.audio when no error occurs', () => {
      // The call to safeLoadAudio should work normally
      expect(() => {
        scene.safeLoadAudio('test_bgm_key', 'test_bgm_url.mp3');
      }).not.toThrow();

      // Ensure the underlying load.audio was called with correct arguments
      expect(scene.load.audio).toHaveBeenCalledWith('test_bgm_key', 'test_bgm_url.mp3');
    });
  });
});

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

  it('catches missing file errors when this.scene.load.audio throws', () => {
    loadAudio.mockImplementation(() => {
      throw new Error('missing file');
    });
    expect(() => controller.safeLoadAudio('missing_key', 'missing_url.mp3')).not.toThrow();
    expect(loadAudio).toHaveBeenCalledWith('missing_key', 'missing_url.mp3');
  });
});

describe('AudioController.loadChapterAudio', () => {
  let loadAudio: ReturnType<typeof vi.fn>;
  let mockScene: any;
  let controller: AudioController;

  beforeEach(() => {
    loadAudio = vi.fn();
    mockScene = {
      load: { audio: loadAudio },
      chapter: {
        id: 'test_chapter',
        scenes: [],
        beats: []
      },
      getActiveSceneConfig: vi.fn().mockReturnValue({ map: { theme: 'apartment' } }),
      footstepKeys: []
    };
    controller = new AudioController(mockScene);
  });

  it('loads chapter-level music when defined in CHAPTER_MUSIC_KEY', () => {
    mockScene.chapter.id = 'spotify_insurgency'; // Maps to 'music_ch1'
    controller.loadChapterAudio();
    expect(loadAudio).toHaveBeenCalledWith('music_ch1', expect.stringContaining('.mp3'));
  });

  it('loads scene-level music when no chapter key is defined but scene[0] has music', () => {
    mockScene.chapter.id = 'umbc_incident'; // No predefined key in CHAPTER_MUSIC_KEY
    mockScene.chapter.scenes = [{ music: 'music_umbc_basement' }];
    controller.loadChapterAudio();
    expect(loadAudio).toHaveBeenCalledWith('music_umbc_basement', expect.stringContaining('.mp3'));
  });

  it('gracefully handles missing music URLs by skipping load calls', () => {
    mockScene.chapter.id = 'unknown_chapter';
    controller.loadChapterAudio();
    expect(loadAudio).not.toHaveBeenCalledWith(undefined, expect.anything());
  });

  it('iterates over scenes and beats to preload specific changeMusic keys', () => {
    mockScene.chapter.id = 'unknown_chapter';
    mockScene.chapter.scenes = [{ music: 'music_ch1' }, { music: 'music_ch2' }];
    mockScene.chapter.beats = [{ type: 'changeMusic', key: 'music_ch3' }];
    controller.loadChapterAudio();
    expect(loadAudio).toHaveBeenCalledWith('music_ch2', expect.stringContaining('.mp3'));
    expect(loadAudio).toHaveBeenCalledWith('music_ch3', expect.stringContaining('.mp3'));
  });

  it('loads static SFX and theme-based footprints', () => {
    mockScene.chapter.id = 'unknown_chapter';
    mockScene.getActiveSceneConfig.mockReturnValue({ map: { theme: 'park' } }); // maps to 'grass' variant
    controller.loadChapterAudio();
    expect(loadAudio).toHaveBeenCalledWith('boss_sting', expect.stringContaining('.mp3'));
    expect(loadAudio).toHaveBeenCalledWith('ui_select', expect.stringContaining('.ogg'));
    expect(loadAudio).toHaveBeenCalledWith('footstep_0', expect.stringContaining('grass_000.ogg'));
    expect(mockScene.footstepKeys.length).toBeGreaterThan(0);
    expect(mockScene.footstepKeys[0]).toBe('footstep_0');
  });
});

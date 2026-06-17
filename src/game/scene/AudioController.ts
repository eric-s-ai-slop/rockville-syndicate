import Phaser from 'phaser';
import type ChapterScene from '../ChapterScene';
import { CHAPTERS } from '../../data/chapters';
import {
  CHAPTER_MUSIC_KEY, STAGE_MUSIC_URL, BOSS_MUSIC_URL, BOSS_LOOP_URL,
  THEME_FOOTSTEP, FOOTSTEP_URLS,
  UI_SELECT_URL, VICTORY_JINGLE_URL, KNOCK_URL,
} from '../audio';

export class AudioController {
  private scene: ChapterScene;

  constructor(scene: ChapterScene) {
    this.scene = scene;
  }

  public safeLoadAudio(key: string, url: string) {
    try { this.scene.load.audio(key, url); } catch { /* missing file — skip silently */ }
  }

  public loadChapterAudio() {
    // Chapter-level music key (used when no scene-level override is set)
    const musicKey = CHAPTER_MUSIC_KEY[this.scene.chapter.id]
      ?? this.scene.chapter.scenes?.[0]?.music;
    const musicUrl = musicKey ? STAGE_MUSIC_URL[musicKey] : undefined;
    if (musicKey && musicUrl) this.safeLoadAudio(musicKey, musicUrl);

    // Pre-load music for every scene that specifies its own key
    for (const scene of this.scene.chapter.scenes ?? []) {
      if (scene.music && scene.music !== musicKey) {
        const url = STAGE_MUSIC_URL[scene.music];
        if (url) this.safeLoadAudio(scene.music, url);
      }
    }
    this.safeLoadAudio('boss_sting', BOSS_MUSIC_URL);
    this.safeLoadAudio('boss_loop', BOSS_LOOP_URL);

    const variant = THEME_FOOTSTEP[(this.scene.chapter.map as any).theme ?? 'apartment'] ?? 'carpet';
    this.scene.footstepKeys = (FOOTSTEP_URLS[variant] ?? []).map((url, i) => {
      const key = `footstep_${i}`;
      this.safeLoadAudio(key, url);
      return key;
    });

    this.safeLoadAudio('ui_select', UI_SELECT_URL);
    this.safeLoadAudio('victory_jingle', VICTORY_JINGLE_URL);
    this.safeLoadAudio('sfx_knock', KNOCK_URL);
  }

  public preloadNextChapterAudio() {
    this.scene.time.delayedCall(2000, () => {
      const currentIndex = CHAPTERS.findIndex(c => c.id === this.scene.chapter.id);
      if (currentIndex >= 0 && currentIndex < CHAPTERS.length - 1) {
        const nextChapter = CHAPTERS[currentIndex + 1];
        const nextMusicKey = CHAPTER_MUSIC_KEY[nextChapter.id];
        const nextMusicUrl = nextMusicKey ? STAGE_MUSIC_URL[nextMusicKey] : undefined;
        if (nextMusicKey && nextMusicUrl && !this.scene.cache.audio.exists(nextMusicKey)) {
          this.scene.load.audio(nextMusicKey, nextMusicUrl);
          this.scene.load.start();
        }
      }
    });
  }

  public startStageMusic() {
    const musicKey = CHAPTER_MUSIC_KEY[this.scene.chapter.id]
      ?? this.scene.chapter.scenes?.[0]?.music;
    if (!musicKey || !this.scene.cache.audio.exists(musicKey)) return;
    try {
      this.scene.stageMusic = this.scene.sound.add(musicKey, { loop: true, volume: 0 });
      this.scene.stageMusic.play();
      this.scene.tweens.add({ targets: this.scene.stageMusic, volume: 0.30, duration: 1200 });
    } catch { /* Web Audio not ready — play will resume on first canvas interaction */ }
  }

  /** Crossfade from the current stage music to a new track by Phaser audio key.
   *  No-op if the key isn't loaded or is already playing. */
  public crossfadeToMusic(newKey: string) {
    if (!newKey || !this.scene.cache.audio.exists(newKey)) return;
    const current = this.scene.stageMusic as Phaser.Sound.WebAudioSound | null;
    if ((current as any)?.key === newKey && current?.isPlaying) return;

    if (current?.isPlaying) {
      this.scene.tweens.add({
        targets: current, volume: 0, duration: 700,
        onComplete: () => { current.stop(); current.destroy(); this.scene.stageMusic = null; },
      });
    }

    this.scene.time.delayedCall(350, () => {
      try {
        this.scene.stageMusic = this.scene.sound.add(newKey, { loop: true, volume: 0 });
        this.scene.stageMusic.play();
        this.scene.tweens.add({ targets: this.scene.stageMusic, volume: 0.30, duration: 900 });
      } catch { /* Web Audio context not ready */ }
    });
  }

  public startBossMusic() {
    // Fade out stage music
    if (this.scene.stageMusic?.isPlaying) {
      this.scene.tweens.add({
        targets: this.scene.stageMusic, volume: 0, duration: 600,
        onComplete: () => (this.scene.stageMusic as Phaser.Sound.WebAudioSound | null)?.pause(),
      });
    }
    // R3: play Prowler sting once, then transition to Techno-Tetris loop
    // Crossfade: sting is 4.127s long. Start crossfade at 3.127s.
    if (this.scene.cache.audio.exists('boss_sting')) {
      try {
        this.scene.bossMusicSting = this.scene.sound.add('boss_sting', { loop: false, volume: 0.55 });
        this.scene.bossMusicSting.play();
        this.scene.time.delayedCall(3127, () => {
          if (this.scene.bossMusicSting && this.scene.bossMusicSting.isPlaying) {
            this.scene.tweens.add({
              targets: this.scene.bossMusicSting,
              volume: 0,
              duration: 1000,
              onComplete: () => {
                this.scene.bossMusicSting?.destroy();
                this.scene.bossMusicSting = null;
              }
            });
          }
          this.startBossLoop(1000);
        });
      } catch {
        this.startBossLoop(); // sting failed — jump straight to loop
      }
    } else {
      this.startBossLoop();
    }
  }

  public startBossLoop(fadeDuration: number = 600) {
    if (!this.scene.cache.audio.exists('boss_loop')) return;
    try {
      this.scene.bossMusic = this.scene.sound.add('boss_loop', { loop: true, volume: 0 });
      this.scene.bossMusic.play();
      this.scene.tweens.add({ targets: this.scene.bossMusic, volume: 0.42, duration: fadeDuration });
    } catch { /* skip */ }
  }

  public stopBossMusic() {
    // Stop and destroy the sting if it is still playing
    if (this.scene.bossMusicSting) {
      try { this.scene.bossMusicSting.stop(); } catch { /* skip */ }
      this.scene.bossMusicSting.destroy();
      this.scene.bossMusicSting = null;
    }
    // Fade out and destroy the loop
    if (this.scene.bossMusic) {
      this.scene.tweens.add({
        targets: this.scene.bossMusic, volume: 0, duration: 700,
        onComplete: () => { this.scene.bossMusic?.destroy(); this.scene.bossMusic = null; },
      });
    }
    // Resume stage music
    if (this.scene.stageMusic) {
      try {
        if (!(this.scene.stageMusic as any).isPlaying) (this.scene.stageMusic as Phaser.Sound.WebAudioSound).resume();
        this.scene.tweens.add({ targets: this.scene.stageMusic, volume: 0.30, duration: 900 });
      } catch { /* skip */ }
    }
  }
}

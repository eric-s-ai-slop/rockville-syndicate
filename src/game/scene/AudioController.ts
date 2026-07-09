import Phaser from 'phaser';
import type ChapterScene from '../ChapterScene';
import { CHAPTERS } from '../../data/chapters';
import {
  CHAPTER_MUSIC_KEY, STAGE_MUSIC_URL, BOSS_MUSIC_URL, BOSS_LOOP_URL,
  THEME_FOOTSTEP, FOOTSTEP_URLS,
  UI_SELECT_URL, VICTORY_JINGLE_URL, KNOCK_URL, DOOR_OPEN_URL,
  SFX_LEDGER_URL, SFX_CREAK_URL, SFX_DOOR_CLOSE_URL, SFX_METAL_CLICK_URL,
} from '../audio';
import { subscribeSettings, getSettings } from '../../game/settings';

// Per-track mix levels (target volume before musicVolume multiplier is applied).
const STAGE_MIX  = 0.30;
const BOSS_MIX   = 0.42;
const CH6_MIX    = 0.70;

export class AudioController {
  private scene: ChapterScene;
  private settingsUnsub: (() => void) | null = null;
  private currentStageMix = STAGE_MIX;
  // Bumped on every crossfadeToMusic()/stopAllAudio() call so stale delayedCall/tween
  // callbacks from a superseded crossfade can detect they've been overtaken and bail
  // instead of touching a destroyed/replaced stageMusic (goto/warpScene can trigger
  // several crossfades in quick succession — see docs/archive/toolkit_complaints.resolved.md).
  private crossfadeToken = 0;

  constructor(scene: ChapterScene) {
    this.scene = scene;
    this.settingsUnsub = subscribeSettings(() => this.applyVolumeToLiveSounds());
  }

  /** Unsubscribe from settings. Call from ChapterScene shutdown. */
  public destroy(): void {
    this.settingsUnsub?.();
    this.settingsUnsub = null;
  }

  /** Push current settings volumes into the sound manager + any live music tracks. */
  private applyVolumeToLiveSounds(): void {
    const s = getSettings();
    try {
      if (this.scene.sound) this.scene.sound.volume = s.masterVolume;
      const mv = s.musicVolume;
      if (this.scene.stageMusic)
        (this.scene.stageMusic as Phaser.Sound.WebAudioSound).volume = this.currentStageMix * mv;
      if (this.scene.bossMusic)
        (this.scene.bossMusic as Phaser.Sound.WebAudioSound).volume = BOSS_MIX * mv;
    } catch { /* scene may be mid-shutdown */ }
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
    this.safeLoadAudio('sfx_door_open', DOOR_OPEN_URL);
    this.safeLoadAudio('sfx_ledger', SFX_LEDGER_URL);
    this.safeLoadAudio('sfx_creak', SFX_CREAK_URL);
    this.safeLoadAudio('sfx_door_close', SFX_DOOR_CLOSE_URL);
    this.safeLoadAudio('sfx_metal_click', SFX_METAL_CLICK_URL);
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
      this.currentStageMix = STAGE_MIX;
      this.scene.stageMusic = this.scene.sound.add(musicKey, { loop: true, volume: 0 });
      this.scene.stageMusic.play();
      this.scene.tweens.add({ targets: this.scene.stageMusic, volume: STAGE_MIX * getSettings().musicVolume, duration: 1200 });
    } catch { /* Web Audio not ready — play will resume on first canvas interaction */ }
  }

  public pauseStageMusic() {
    if (this.scene.stageMusic?.isPlaying) {
      this.scene.tweens.add({
        targets: this.scene.stageMusic, volume: 0, duration: 600,
        onComplete: () => (this.scene.stageMusic as Phaser.Sound.WebAudioSound | null)?.pause(),
      });
    }
  }

  public resumeStageMusic() {
    if (this.scene.stageMusic?.isPaused) {
      (this.scene.stageMusic as Phaser.Sound.WebAudioSound).resume();
      this.scene.tweens.add({
        targets: this.scene.stageMusic, volume: this.currentStageMix * getSettings().musicVolume, duration: 600,
      });
    } else if (!this.scene.stageMusic?.isPlaying) {
      this.startStageMusic();
    }
  }

  /** Crossfade from the current stage music to a new track by Phaser audio key.
   *  No-op if the key isn't loaded or is already playing. */
  public crossfadeToMusic(newKey: string) {
    if (!newKey || !this.scene.cache.audio.exists(newKey)) return;
    const current = this.scene.stageMusic as Phaser.Sound.WebAudioSound | null;
    if ((current as any)?.key === newKey && current?.isPlaying) return;

    // Invalidate any in-flight crossfade from a previous call (e.g. warp/goto firing
    // several crossfades back-to-back) — its delayedCall/tween callbacks below check
    // this token and bail instead of touching a sound object we've since destroyed.
    const myToken = ++this.crossfadeToken;

    if (current?.isPlaying) {
      // A prior crossfade's fade-out/fade-in tween may still be ticking against
      // `current` — clear it first so it can't set .volume on it after destroy() below.
      this.scene.tweens.killTweensOf(current);
      this.scene.tweens.add({
        targets: current, volume: 0, duration: 700,
        onComplete: () => {
          try { current.stop(); current.destroy(); } catch { /* already gone */ }
          if (this.scene.stageMusic === current) {
            this.scene.stageMusic = null;
          }
        },
      });
    }

    this.scene.time.delayedCall(350, () => {
      // A newer crossfade (or a stopAllAudio) superseded this one — the sound object
      // we'd target here may already be destroyed/reassigned. Bail quietly.
      if (myToken !== this.crossfadeToken) return;
      try {
        this.currentStageMix = newKey === 'music_ch6' ? CH6_MIX : STAGE_MIX;
        const track = this.scene.sound.add(newKey, { loop: true, volume: 0 });
        this.scene.stageMusic = track;
        track.play();
        this.scene.tweens.add({
          targets: track, volume: this.currentStageMix * getSettings().musicVolume, duration: 900,
        });
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
          const sting = this.scene.bossMusicSting;
          if (sting && !(sting as any).pendingRemove && sting.isPlaying) {
            this.scene.tweens.add({
              targets: sting,
              volume: 0,
              duration: 1000,
              onComplete: () => {
                try { sting.destroy(); } catch { /* already gone */ }
                if (this.scene.bossMusicSting === sting) this.scene.bossMusicSting = null;
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
      this.scene.tweens.add({ targets: this.scene.bossMusic, volume: BOSS_MIX * getSettings().musicVolume, duration: fadeDuration });
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
        this.scene.tweens.add({ targets: this.scene.stageMusic, volume: this.currentStageMix * getSettings().musicVolume, duration: 900 });
      } catch { /* skip */ }
    }
  }

  /** Lower the stage music to a low volume and leave it there — the scene
   *  audibly "loses its air." Pairs with a later stopAllAudio() for a full cut. */
  public duckStageMusic(toVolume: number = 0.1, durationMs: number = 1400) {
    const stage = this.scene.stageMusic;
    if (stage?.isPlaying) {
      this.scene.tweens.add({ targets: stage, volume: toVolume, duration: durationMs });
    }
  }

  /** Hard-cut all music (stage + boss) to silence over a short fade and do NOT
   *  restart it. Used for a deliberate silence beat; silence persists until a
   *  later beat starts music again. (changeScene only revives music when a scene
   *  sets its own `music`, so the silence carries across scene transitions.) */
  public stopAllAudio(fadeMs: number = 150) {
    // Invalidate any in-flight crossfadeToMusic() delayedCall/tween so it can't
    // resurrect stageMusic after we've just silenced everything.
    this.crossfadeToken++;
    const kill = (snd: Phaser.Sound.BaseSound | null) => {
      if (!snd) return;
      // Any tween still ticking against this sound (e.g. a fade-out/fade-in from a
      // prior crossfade) would otherwise keep setting .volume on it next frame after
      // destroy() below nulls its internals — killTweensOf() removes those first.
      this.scene.tweens.killTweensOf(snd);
      if (snd.isPlaying && fadeMs > 0) {
        this.scene.tweens.add({
          targets: snd, volume: 0, duration: fadeMs,
          onComplete: () => { try { snd.stop(); snd.destroy(); } catch { /* skip */ } },
        });
      } else {
        try { snd.stop(); snd.destroy(); } catch { /* skip */ }
      }
    };
    kill(this.scene.stageMusic);     this.scene.stageMusic = null;
    kill(this.scene.bossMusic);      this.scene.bossMusic = null;
    kill(this.scene.bossMusicSting); this.scene.bossMusicSting = null;
  }
}

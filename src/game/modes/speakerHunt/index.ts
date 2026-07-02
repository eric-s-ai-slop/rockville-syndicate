import Phaser from 'phaser';
import type { GameMode, ModeContext, ModeResult } from '../types';

// ─── speakerHunt ──────────────────────────────────────────────────────────────
// Recurring foreground mode for Ch11 (Cabin From Hell), deployed 3x with
// escalating config (Nights 1-3). The player follows a proximity-panned
// diegetic audio loop ('sfx_ultraphonk') to hidden speaker(s) in the dark.
// Night 1 adds red-herring spots; Night 2 requires a hold-to-extract step;
// Night 3 swaps the final speaker for a locked-door tension-lockpick puzzle.
// A barricade prop blocks Eric & Alex's door for the mode's duration on every
// night. See docs/chapter-pipeline/working/cabin_from_hell_2025/shenandoah_cabin_mechanic.md
//
// Losing (Nights 1-2 timeout) is not punitive — it just routes to a short
// "found it late" reaction beat via the beat's loseGoto. Night 3 cannot time
// out; the lockpick auto-resolves as solved if the clock runs out mid-puzzle.

interface SpeakerSpot {
  x: number;
  y: number;
  id: string;
  requiresExtract?: boolean;
}

interface RedHerring {
  x: number;
  y: number;
  bark: string;
}

interface SpeakerHuntConfig {
  night: 1 | 2 | 3;
  speakers: SpeakerSpot[];
  redHerrings?: RedHerring[];
  locked?: { doorX: number; doorY: number };
  barricade: { doorX: number; doorY: number };
  timeLimitMs: number;
}

const ZONE_RADIUS = 42;
const EXTRACT_HOLD_MS = 1500;
const LOCKPICK_SEGMENTS = 3;
const LOCKPICK_HOLD_MS = 1800;
const LOCKPICK_ZONE_WIDTH = 0.16;

export class SpeakerHuntMode implements GameMode {
  id = 'speakerHunt';
  private ctx!: ModeContext;
  private config!: SpeakerHuntConfig;
  private onCompleteCallback: ((result: ModeResult) => void) | null = null;
  private resolved = false;

  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private hudText: Phaser.GameObjects.Text | null = null;
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private extractTimer: Phaser.Time.TimerEvent | null = null;
  private extractingId: string | null = null;
  private extractProgress = 0;

  private foundIds = new Set<string>();
  private speakerZones: { spot: SpeakerSpot; marker: Phaser.GameObjects.Arc }[] = [];
  private herringZones: { spot: RedHerring; marker: Phaser.GameObjects.Arc; cooling: boolean }[] = [];

  private barricadeSprite: Phaser.GameObjects.Rectangle | null = null;
  private barricadeBody: Phaser.Physics.Arcade.StaticGroup | null = null;

  private lockpickActive = false;
  private lockpickGraphics: Phaser.GameObjects.Container | null = null;
  private lockpickIndicator: Phaser.GameObjects.Rectangle | null = null;
  private lockpickSweepPos = 0;
  private lockpickSweepSpeed = 1.4;
  private lockpickZoneCenter = 0.5;
  private lockpickSegmentsDone = 0;
  private lockpickHoldMs = 0;
  private slowKey: Phaser.Input.Keyboard.Key | null = null;

  private loopSound: Phaser.Sound.BaseSound | null = null;

  preload(_ctx: ModeContext): void {}

  start(ctx: ModeContext, config: SpeakerHuntConfig, onComplete: (result: ModeResult) => void): void {
    this.ctx = ctx;
    this.config = config;
    this.onCompleteCallback = onComplete;
    this.resolved = false;
    this.foundIds = new Set();
    this.speakerZones = [];
    this.herringZones = [];
    this.lockpickActive = false;
    this.lockpickSegmentsDone = 0;

    const cam = ctx.cameras.main;

    // Dim the room — searching in the dark.
    this.overlay = ctx.add.rectangle(cam.width / 2, cam.height / 2, cam.width, cam.height, 0x000010, 0.55)
      .setScrollFactor(0).setDepth(9000);

    this.hudText = ctx.label(cam.width / 2, 56, this.hudLabel(), {
      fontSize: '14px', color: '#facc15', fontStyle: 'bold',
      backgroundColor: '#0b1208d0', padding: { x: 10, y: 6 }, stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9001);

    // Duck the stage track and start the diegetic loop.
    ctx.audioController.duckStageMusic(0.05, 800);
    try {
      this.loopSound = ctx.sound.add('sfx_ultraphonk', { loop: true, volume: 0 });
      this.loopSound.play();
    } catch { /* audio not loaded or not ready */ }

    // Barricade — Eric & Alex's door, hard-blocked for the whole mode.
    const { doorX, doorY } = config.barricade;
    this.barricadeSprite = ctx.add.rectangle(doorX, doorY, 40, 16, 0x3b2a1a).setStrokeStyle(2, 0x1a1208).setDepth(doorY);
    this.barricadeBody = ctx.physics.add.staticGroup();
    const body = this.barricadeBody.create(doorX, doorY, undefined) as Phaser.Physics.Arcade.Sprite;
    body.setVisible(false);
    body.body!.setSize(40, 16);
    ctx.physics.add.collider(ctx.player, this.barricadeBody);

    // Speaker zones.
    config.speakers.forEach(spot => {
      const marker = ctx.add.circle(spot.x, spot.y, ZONE_RADIUS, 0xffffff, 0).setDepth(-5);
      this.speakerZones.push({ spot, marker });
    });

    // Red herrings (Night 1 only).
    (config.redHerrings ?? []).forEach(spot => {
      const marker = ctx.add.circle(spot.x, spot.y, ZONE_RADIUS, 0xffffff, 0).setDepth(-5);
      this.herringZones.push({ spot, marker, cooling: false });
    });

    // Overall timer.
    this.timerEvent = ctx.time.delayedCall(config.timeLimitMs, () => this.handleTimeout());

    if (config.locked) {
      this.slowKey = ctx.physics.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }
  }

  private hudLabel(): string {
    const total = this.config.speakers.length;
    return `NIGHT ${this.config.night} — FIND THE SPEAKER${total > 1 ? 'S' : ''} (${this.foundIds.size}/${total})`;
  }

  update(_time: number, delta: number): void {
    if (this.resolved) return;

    if (this.lockpickActive) {
      this.updateLockpick(delta);
      return;
    }

    if (this.extractingId) {
      this.updateExtract(delta);
    }

    this.updateProximityAudio();
    this.checkHerringOverlap();
    this.checkSpeakerOverlap();
  }

  private nearestUnfoundDistance(): number {
    const player = this.ctx.player;
    let best = Infinity;
    this.speakerZones.forEach(({ spot }) => {
      if (this.foundIds.has(spot.id)) return;
      const d = Phaser.Math.Distance.Between(player.x as number, player.y as number, spot.x, spot.y);
      if (d < best) best = d;
    });
    return best;
  }

  private updateProximityAudio(): void {
    if (!this.loopSound) return;
    const dist = this.nearestUnfoundDistance();
    const maxDist = 700;
    const closeness = Phaser.Math.Clamp(1 - dist / maxDist, 0, 1);
    const vol = 0.15 + closeness * 0.55;
    (this.loopSound as Phaser.Sound.WebAudioSound).volume = vol;
  }

  private checkHerringOverlap(): void {
    const player = this.ctx.player;
    for (const h of this.herringZones) {
      if (h.cooling) continue;
      const d = Phaser.Math.Distance.Between(player.x as number, player.y as number, h.spot.x, h.spot.y);
      if (d <= ZONE_RADIUS) {
        h.cooling = true;
        this.ctx.showBubbleText(this.ctx.player as any, h.spot.bark, '#94a3b8');
        this.ctx.time.delayedCall(2500, () => { h.cooling = false; });
      }
    }
  }

  private checkSpeakerOverlap(): void {
    const player = this.ctx.player;
    for (const s of this.speakerZones) {
      if (this.foundIds.has(s.spot.id)) continue;
      const d = Phaser.Math.Distance.Between(player.x as number, player.y as number, s.spot.x, s.spot.y);
      if (d > ZONE_RADIUS) continue;

      const isLockedTarget = this.config.locked && this.config.night === 3;
      if (isLockedTarget) {
        this.startLockpick();
        return;
      }
      if (s.spot.requiresExtract && this.extractingId !== s.spot.id) {
        this.startExtract(s.spot.id);
        return;
      }
      if (!s.spot.requiresExtract) {
        this.markFound(s.spot.id);
      }
    }
  }

  private startExtract(id: string): void {
    this.extractingId = id;
    this.extractProgress = 0;
    this.ctx.showPassiveIconText(this.ctx.player.x as number, (this.ctx.player.y as number) - 30, 'HOLD TO EXTRACT', '#facc15');
  }

  private updateExtract(delta: number): void {
    const player = this.ctx.player;
    const spot = this.speakerZones.find(z => z.spot.id === this.extractingId)?.spot;
    if (!spot) { this.extractingId = null; return; }
    const d = Phaser.Math.Distance.Between(player.x as number, player.y as number, spot.x, spot.y);
    if (d > ZONE_RADIUS) {
      this.extractingId = null;
      this.extractProgress = 0;
      return;
    }
    this.extractProgress += delta;
    if (this.extractProgress >= EXTRACT_HOLD_MS) {
      const id = this.extractingId;
      this.extractingId = null;
      this.extractProgress = 0;
      if (id) this.markFound(id);
    }
  }

  private markFound(id: string): void {
    if (this.foundIds.has(id)) return;
    this.foundIds.add(id);
    const zone = this.speakerZones.find(z => z.spot.id === id);
    if (zone) {
      this.ctx.showPassiveIconText(zone.spot.x, zone.spot.y - 20, 'FOUND IT', '#4ade80');
      try { this.ctx.sound.play('ui_select', { volume: 0.8 }); } catch {}
    }
    this.hudText?.setText(this.hudLabel());

    const allFound = this.speakerZones.every(z => this.foundIds.has(z.spot.id));
    if (allFound && !this.config.locked) this.resolve('win');
  }

  // ── Night 3: tension lockpick ──────────────────────────────────────────────

  private startLockpick(): void {
    if (this.lockpickActive) return;
    this.lockpickActive = true;
    this.lockpickSweepPos = 0;
    this.lockpickSegmentsDone = 0;
    this.lockpickHoldMs = 0;
    this.lockpickSweepSpeed = 1.4;
    this.pickNewZone();

    const cam = this.ctx.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2 + 120;
    const track = this.ctx.add.rectangle(0, 0, 260, 18, 0x1a1a1a).setStrokeStyle(2, 0x000000);
    const zone = this.ctx.add.rectangle((this.lockpickZoneCenter - 0.5) * 260, 0, 260 * LOCKPICK_ZONE_WIDTH, 18, 0x4ade80, 0.5);
    const indicator = this.ctx.add.rectangle(-130, 0, 4, 26, 0xffffff);
    const label = this.ctx.label(0, -30, "HOLD [SPACE] TO SLOW THE FORK", { fontSize: '13px', color: '#facc15', fontStyle: 'bold' }).setOrigin(0.5);
    this.lockpickGraphics = this.ctx.add.container(cx, cy, [track, zone, indicator, label]).setScrollFactor(0).setDepth(9500);
    this.lockpickIndicator = indicator;
    (this.lockpickGraphics as any).__zone = zone;
  }

  private pickNewZone(): void {
    this.lockpickZoneCenter = Phaser.Math.FloatBetween(0.2, 0.8);
  }

  private updateLockpick(delta: number): void {
    const dt = delta / 1000;
    const slowing = this.slowKey?.isDown;
    this.lockpickSweepPos += this.lockpickSweepSpeed * dt * (slowing ? 0.35 : 1);
    const t = (Math.sin(this.lockpickSweepPos) + 1) / 2; // 0..1

    if (this.lockpickIndicator) this.lockpickIndicator.x = (t - 0.5) * 260;
    const zoneShape = (this.lockpickGraphics as any)?.__zone as Phaser.GameObjects.Rectangle | undefined;
    if (zoneShape) zoneShape.x = (this.lockpickZoneCenter - 0.5) * 260;

    const inZone = Math.abs(t - this.lockpickZoneCenter) < LOCKPICK_ZONE_WIDTH / 2;
    if (inZone) {
      this.lockpickHoldMs += delta;
      if (this.lockpickIndicator) this.lockpickIndicator.fillColor = 0x4ade80;
      if (this.lockpickHoldMs >= LOCKPICK_HOLD_MS) {
        this.lockpickSegmentsDone += 1;
        this.lockpickHoldMs = 0;
        this.lockpickSweepSpeed += 0.6;
        this.pickNewZone();
        try { this.ctx.sound.play('ui_select', { volume: 0.7 }); } catch {}
        if (this.lockpickSegmentsDone >= LOCKPICK_SEGMENTS) {
          this.finishLockpick();
        }
      }
    } else {
      this.lockpickHoldMs = 0; // slip — only this segment's progress resets
      if (this.lockpickIndicator) this.lockpickIndicator.fillColor = 0xffffff;
    }
  }

  private finishLockpick(): void {
    this.lockpickActive = false;
    this.lockpickGraphics?.destroy();
    this.lockpickGraphics = null;
    const doorSpot = this.speakerZones[0]?.spot;
    if (doorSpot) this.markFound(doorSpot.id);
    this.resolve('win');
  }

  private handleTimeout(): void {
    if (this.resolved) return;
    if (this.config.night === 3) {
      // Night 3 can't meaningfully time out — auto-resolve as solved.
      if (this.lockpickActive) this.finishLockpick();
      else this.resolve('win');
      return;
    }
    this.resolve('lose');
  }

  private resolve(outcome: 'win' | 'lose'): void {
    if (this.resolved) return;
    this.resolved = true;
    this.timerEvent?.remove();
    this.ctx.audioController.resumeStageMusic();
    // Hand the sound off to the tween's closure and clear the field immediately —
    // `cb?.()` below synchronously triggers BeatEngine's completion callback, which
    // calls teardown() before this tween finishes. teardown() only destroys
    // `this.loopSound` if it's still set, so clearing it here prevents teardown()
    // from destroying the same sound object the in-flight tween is still targeting
    // (which previously threw when the tween's next tick set .volume on a
    // destroyed WebAudioSound, breaking the RAF loop).
    const loop = this.loopSound;
    this.loopSound = null;
    if (loop) {
      this.ctx.tweens.add({
        targets: loop, volume: 0, duration: 500,
        onComplete: () => { loop.stop(); loop.destroy(); },
      });
    }
    const cb = this.onCompleteCallback;
    this.onCompleteCallback = null;
    cb?.({ outcome });
  }

  teardown(): void {
    this.overlay?.destroy(); this.overlay = null;
    this.hudText?.destroy(); this.hudText = null;
    this.timerEvent?.remove(); this.timerEvent = null;
    this.extractTimer?.remove(); this.extractTimer = null;
    this.speakerZones.forEach(z => z.marker.destroy());
    this.speakerZones = [];
    this.herringZones.forEach(h => h.marker.destroy());
    this.herringZones = [];
    this.barricadeSprite?.destroy(); this.barricadeSprite = null;
    this.barricadeBody?.clear(true, true);
    this.barricadeBody = null;
    this.lockpickGraphics?.destroy(); this.lockpickGraphics = null;
    this.slowKey?.reset();
    this.slowKey = null;
    if (this.loopSound) { this.loopSound.stop(); this.loopSound.destroy(); this.loopSound = null; }
    this.onCompleteCallback = null;
  }
}

export const speakerHuntMode = new SpeakerHuntMode();
export default speakerHuntMode;

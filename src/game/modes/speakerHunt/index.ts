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

const ZONE_RADIUS = 60;
const EXTRACT_HOLD_MS = 1500;
const LOCKPICK_SEGMENTS = 3;
const LOCKPICK_HOLD_MS = 1200;
const LOCKPICK_ZONE_WIDTH = 0.30;
const LOCKPICK_SLOW_FACTOR = 0.22;

export class SpeakerHuntMode implements GameMode {
  id = 'speakerHunt';
  private ctx!: ModeContext;
  private config!: SpeakerHuntConfig;
  private onCompleteCallback: ((result: ModeResult) => void) | null = null;
  private resolved = false;

  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private hudText: Phaser.GameObjects.Text | null = null;
  private hintText: Phaser.GameObjects.Text | null = null;
  private arrowText: Phaser.GameObjects.Text | null = null;
  private tempText: Phaser.GameObjects.Text | null = null;
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private extractTimer: Phaser.Time.TimerEvent | null = null;
  private extractingId: string | null = null;
  private extractProgress = 0;
  private extractBarBg: Phaser.GameObjects.Rectangle | null = null;
  private extractBarFill: Phaser.GameObjects.Rectangle | null = null;
  private extractLabel: Phaser.GameObjects.Text | null = null;

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
  private lockpickSegmentText: Phaser.GameObjects.Text | null = null;
  private lockpickHoldBarFill: Phaser.GameObjects.Rectangle | null = null;
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

    const needsExtract = config.speakers.some(s => s.requiresExtract);
    this.hintText = ctx.label(cam.width / 2, 80, config.locked
      ? 'Follow the arrow. Get close, then hold [SHIFT].'
      : needsExtract
        ? 'Follow the arrow. Get close, then stand still — no button, just don\'t move.'
        : 'Follow the arrow. Walk right up to it.', {
      fontSize: '12px', color: '#9aa0a8', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9001);

    // Compass arrow + hot/cold readout — the clearest possible "which way do I go" signal.
    this.arrowText = ctx.label(cam.width / 2, 118, '➤', {
      fontSize: '30px', color: '#facc15', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9001);
    this.tempText = ctx.label(cam.width / 2, 150, 'COLD', {
      fontSize: '13px', color: '#60a5fa', fontStyle: 'bold', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9001);

    // Duck the stage track and start the diegetic loop. Kill any other instance of this
    // key first — a chapter beat may have fired a one-shot 'sfx_ultraphonk' stinger (e.g.
    // a "woken up by blasting phonk" jolt) moments before this mode starts; if that
    // instance is still playing, it drowns out the proximity-controlled loop below at a
    // constant volume, making the hunt sound the same everywhere regardless of distance.
    ctx.audioController.duckStageMusic(0.05, 800);
    try { ctx.sound.stopByKey('sfx_ultraphonk'); } catch { /* not supported by this sound manager */ }
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
      // SHIFT, not SPACE — SPACE is already the global dash key (PlayerController), and
      // holding it here would fire a one-time dash instead of sustaining the slow-down,
      // making the puzzle look broken (dash-jerk once, then nothing on continued hold).
      this.slowKey = ctx.physics.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
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

  private nearestUnfound(): { dist: number; dx: number; angle: number } | null {
    const player = this.ctx.player;
    let best: { dist: number; dx: number; angle: number } | null = null;
    this.speakerZones.forEach(({ spot }) => {
      if (this.foundIds.has(spot.id)) return;
      const d = Phaser.Math.Distance.Between(player.x as number, player.y as number, spot.x, spot.y);
      if (!best || d < best.dist) {
        best = {
          dist: d,
          dx: spot.x - (player.x as number),
          angle: Phaser.Math.Angle.Between(player.x as number, player.y as number, spot.x, spot.y),
        };
      }
    });
    return best;
  }

  private updateProximityAudio(): void {
    const nearest = this.nearestUnfound();
    const dist = nearest?.dist ?? Infinity;
    // Shorter max range than the room's diagonal so the loop actually reads as
    // "hot/cold" as you approach, instead of sitting near-max volume the whole hunt.
    const maxDist = 350;
    const closeness = Phaser.Math.Clamp(1 - dist / maxDist, 0, 1);

    if (this.loopSound) {
      const vol = 0.08 + closeness ** 1.6 * 0.85;
      const sound = this.loopSound as Phaser.Sound.WebAudioSound;
      sound.volume = vol;
      // Directional cue: pan toward whichever side the nearest speaker is on.
      if (nearest && typeof sound.pan === 'number') {
        sound.pan = Phaser.Math.Clamp(nearest.dx / 300, -1, 1);
      }
    }

    // Compass arrow — points straight at the nearest unfound speaker at all times.
    if (nearest && this.arrowText) {
      this.arrowText.setRotation(nearest.angle);
    }
    if (this.tempText) {
      let label = 'COLD'; let color = '#60a5fa';
      if (closeness >= 0.85) { label = 'BURNING'; color = '#ef4444'; }
      else if (closeness >= 0.55) { label = 'HOT'; color = '#f97316'; }
      else if (closeness >= 0.25) { label = 'WARM'; color = '#facc15'; }
      this.tempText.setText(label).setColor(color);
    }
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
        this.startExtract(s.spot.id, s.spot);
        return;
      }
      if (!s.spot.requiresExtract) {
        this.markFound(s.spot.id);
      }
    }
  }

  private startExtract(id: string, spot: SpeakerSpot): void {
    this.extractingId = id;
    this.extractProgress = 0;
    // No key to press — you just have to stay put. "HOLD TO EXTRACT" alone reads like a
    // button prompt, which it isn't, so spell out "don't move" and back it with a
    // persistent progress bar (the old one-shot toast faded out long before 1.5s was up,
    // leaving zero feedback for most of the hold).
    const barW = 70;
    this.extractLabel = this.ctx.label(spot.x, spot.y - 46, "DON'T MOVE", {
      fontSize: '12px', color: '#facc15', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(9002);
    this.extractBarBg = this.ctx.add.rectangle(spot.x, spot.y - 32, barW, 8, 0x1a1a1a).setStrokeStyle(1, 0x000000).setDepth(9002);
    this.extractBarFill = this.ctx.add.rectangle(spot.x - barW / 2, spot.y - 32, 1, 8, 0x4ade80).setOrigin(0, 0.5).setDepth(9003);
  }

  private clearExtractUI(): void {
    this.extractLabel?.destroy(); this.extractLabel = null;
    this.extractBarBg?.destroy(); this.extractBarBg = null;
    this.extractBarFill?.destroy(); this.extractBarFill = null;
  }

  private updateExtract(delta: number): void {
    const player = this.ctx.player;
    const spot = this.speakerZones.find(z => z.spot.id === this.extractingId)?.spot;
    if (!spot) { this.extractingId = null; this.clearExtractUI(); return; }
    const d = Phaser.Math.Distance.Between(player.x as number, player.y as number, spot.x, spot.y);
    if (d > ZONE_RADIUS) {
      this.extractingId = null;
      this.extractProgress = 0;
      this.clearExtractUI();
      return;
    }
    this.extractProgress += delta;
    if (this.extractBarFill) {
      const barW = 70;
      this.extractBarFill.width = barW * Phaser.Math.Clamp(this.extractProgress / EXTRACT_HOLD_MS, 0, 1);
    }
    if (this.extractProgress >= EXTRACT_HOLD_MS) {
      const id = this.extractingId;
      this.extractingId = null;
      this.extractProgress = 0;
      this.clearExtractUI();
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
    this.arrowText?.setVisible(false);
    this.tempText?.setVisible(false);
    // Freeze the player in place for the puzzle — PlayerController still runs every
    // frame (this mode doesn't own input exclusively), and WASD/dash would otherwise
    // fight the lockpick. `body.moves = false` holds position no matter what velocity
    // PlayerController sets later in the same frame.
    this.ctx.player.setVelocity(0, 0);
    (this.ctx.player.body as Phaser.Physics.Arcade.Body).moves = false;
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
    const label = this.ctx.label(0, -52, "HOLD [SHIFT] TO SLOW DOWN", { fontSize: '13px', color: '#facc15', fontStyle: 'bold' }).setOrigin(0.5);
    const goalLabel = this.ctx.label(0, -32, 'Get the marker into the green and keep it there.', {
      fontSize: '11px', color: '#9aa0a8',
    }).setOrigin(0.5);
    const segmentText = this.ctx.label(0, 32, `SEGMENT 1/${LOCKPICK_SEGMENTS}`, {
      fontSize: '12px', color: '#facc15', fontStyle: 'bold',
    }).setOrigin(0.5);
    const holdBarBg = this.ctx.add.rectangle(0, 50, 140, 6, 0x1a1a1a).setStrokeStyle(1, 0x000000);
    const holdBarFill = this.ctx.add.rectangle(-70, 50, 1, 6, 0x4ade80).setOrigin(0, 0.5);
    this.lockpickGraphics = this.ctx.add.container(cx, cy, [track, zone, indicator, label, goalLabel, segmentText, holdBarBg, holdBarFill]).setScrollFactor(0).setDepth(9500);
    this.lockpickIndicator = indicator;
    this.lockpickSegmentText = segmentText;
    this.lockpickHoldBarFill = holdBarFill;
    (this.lockpickGraphics as any).__zone = zone;
  }

  private pickNewZone(): void {
    this.lockpickZoneCenter = Phaser.Math.FloatBetween(0.2, 0.8);
  }

  private updateLockpick(delta: number): void {
    const dt = delta / 1000;
    const slowing = this.slowKey?.isDown;
    this.lockpickSweepPos += this.lockpickSweepSpeed * dt * (slowing ? LOCKPICK_SLOW_FACTOR : 1);
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
        // +0.2, not +0.4 — at +0.4/segment, segment 3's slowed sweep rate crossed the
        // zone in ~1.07s in the worst case (zone landing near the sine wave's steepest
        // point), which is LESS than LOCKPICK_HOLD_MS (1.2s) — mathematically impossible
        // to complete regardless of skill, even holding SHIFT the whole time with zero
        // slip. +0.2 combined with the widened zone (0.30) keeps segment 3's worst-case
        // transit at ~1.5s, comfortably above the hold requirement.
        this.lockpickSweepSpeed += 0.2;
        this.pickNewZone();
        try { this.ctx.sound.play('ui_select', { volume: 0.7 }); } catch {}
        if (this.lockpickSegmentsDone >= LOCKPICK_SEGMENTS) {
          this.finishLockpick();
          return;
        }
        this.lockpickSegmentText?.setText(`SEGMENT ${this.lockpickSegmentsDone + 1}/${LOCKPICK_SEGMENTS}`);
      }
    } else {
      // Slip decays progress instead of wiping it, so a brief overshoot isn't a full restart.
      this.lockpickHoldMs = Math.max(0, this.lockpickHoldMs - delta * 2);
      if (this.lockpickIndicator) this.lockpickIndicator.fillColor = 0xffffff;
    }

    if (this.lockpickHoldBarFill) {
      this.lockpickHoldBarFill.width = 140 * Phaser.Math.Clamp(this.lockpickHoldMs / LOCKPICK_HOLD_MS, 0, 1);
    }
  }

  private finishLockpick(): void {
    this.lockpickActive = false;
    (this.ctx.player.body as Phaser.Physics.Arcade.Body).moves = true;
    this.lockpickGraphics?.destroy();
    this.lockpickGraphics = null;
    this.lockpickSegmentText = null;
    this.lockpickHoldBarFill = null;
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
    if (this.ctx.player.body) (this.ctx.player.body as Phaser.Physics.Arcade.Body).moves = true;
    this.overlay?.destroy(); this.overlay = null;
    this.hudText?.destroy(); this.hudText = null;
    this.hintText?.destroy(); this.hintText = null;
    this.arrowText?.destroy(); this.arrowText = null;
    this.tempText?.destroy(); this.tempText = null;
    this.timerEvent?.remove(); this.timerEvent = null;
    this.extractTimer?.remove(); this.extractTimer = null;
    this.clearExtractUI();
    this.speakerZones.forEach(z => z.marker.destroy());
    this.speakerZones = [];
    this.herringZones.forEach(h => h.marker.destroy());
    this.herringZones = [];
    this.barricadeSprite?.destroy(); this.barricadeSprite = null;
    this.barricadeBody?.clear(true, true);
    this.barricadeBody = null;
    this.lockpickGraphics?.destroy(); this.lockpickGraphics = null;
    this.lockpickSegmentText = null;
    this.lockpickHoldBarFill = null;
    this.slowKey?.reset();
    this.slowKey = null;
    if (this.loopSound) { this.loopSound.stop(); this.loopSound.destroy(); this.loopSound = null; }
    this.onCompleteCallback = null;
  }
}

export const speakerHuntMode = new SpeakerHuntMode();
export default speakerHuntMode;

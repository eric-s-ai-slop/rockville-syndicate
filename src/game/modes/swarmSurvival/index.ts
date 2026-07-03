import Phaser from 'phaser';
import type { GameMode, ModeContext, ModeResult } from '../types';

// ─── swarmSurvival ──────────────────────────────────────────────────────────────
// Theme-neutral wave-survival combat mode. Bugs (Ch11) are the first skin, but the
// engine knows nothing about bugs — all flavor (enemy glyphs, labels, tuning, wave
// timeline) arrives via config, so other chapters can reskin it (paparazzi, zombies,
// drones…) with zero new code. Same generalization pattern as silentDrive/storyFractures.
//
// The combat verb is deliberately NOT bossFight's QTE or passive coin auto-fire:
//   • Primary  [J] — an active melee SWAT in the player's facing direction (arc test).
//   • Secondary[K] — a scarce radial BURST that knocks back everything nearby; refills
//                    slowly on a timer.
//   • Dodge    [SPACE] — the existing player dash + its i-frames (via ctx.isPlayerInvuln).
//
// Enemies are emoji Text objects (matching the chapter's existing 🦟 fly visuals in
// cabinCollapse) moved by hand each frame — no physics bodies, no wall collision (they
// fly), no collider-arg pitfalls. Contact/swat/burst are all plain distance+arc tests.
//
// HP is mode-owned (NOT ctx.damagePlayer, which drives the global game-over path): the
// meter hits 0 → 'lose' → the beat's loseGoto, exactly like speakerHunt. Surviving the
// full wave timeline → 'win' falls through.

interface EnemyTypeSpec {
  hp: number;
  speed: number;          // px/sec toward the player
  contactDamage: number;  // HP drained per contact tick
  behavior: 'homing' | 'straight' | 'zigzag';
  emoji: string;
  fontSize?: string;
}

interface WaveSpec {
  atMs: number;           // when (from mode start) the wave begins spawning
  enemyType: string;      // key into enemyTypes
  count: number;
  spawnOverMs?: number;   // stagger the count across this window (default: instant)
}

export interface SwarmSurvivalConfig {
  theme: {
    label: string;          // HUD title, e.g. 'BUG SWARM'
    primaryLabel: string;   // e.g. 'SWAT [J]'
    secondaryLabel: string; // e.g. 'BUG BOMB [K]'
    hudColor?: string;
  };
  survival: { durationMs: number; playerHp: number };
  primary: { damage: number; reach: number; arcDeg: number; cooldownMs: number; knockback: number };
  secondary: { charges: number; damage: number; radius: number; cooldownMs: number };
  waves: WaveSpec[];
  enemyTypes: Record<string, EnemyTypeSpec>;
}

interface Enemy {
  obj: Phaser.GameObjects.Text;
  spec: EnemyTypeSpec;
  hp: number;
  phase: number;          // per-enemy offset so zigzag/homing don't sync up
  contactCdUntil: number;
}

const CONTACT_RADIUS = 26;   // player-center to enemy-center for a contact tick
const HIT_IFRAME_MS = 550;   // mode-owned i-frames after a landed hit (anti drain-lock)
const KILL_KNOCKBACK = 40;

export class SwarmSurvivalMode implements GameMode {
  id = 'swarmSurvival';
  private ctx!: ModeContext;
  private config!: SwarmSurvivalConfig;
  private onCompleteCallback: ((result: ModeResult) => void) | null = null;
  private resolved = false;

  private hp = 0;
  private maxHp = 0;
  private hurtUntil = 0;

  private enemies: Enemy[] = [];
  // Last non-zero move direction (normalized). Plain fields, not a Phaser.Math.Vector2 —
  // this class is instantiated as a singleton at import time, before Phaser is available
  // in the jsdom test env, so a Phaser object as a field initializer would throw on load.
  private facingX = 1;
  private facingY = 0;

  private swatKey: Phaser.Input.Keyboard.Key | null = null;
  private burstKey: Phaser.Input.Keyboard.Key | null = null;
  private swatReadyAt = 0;
  private burstCharges = 0;
  private burstRechargeAccum = 0;

  private timers: Phaser.Time.TimerEvent[] = [];
  private elapsed = 0;

  // HUD
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private hitFlash: Phaser.GameObjects.Rectangle | null = null;
  private titleText: Phaser.GameObjects.Text | null = null;
  private hpLabel: Phaser.GameObjects.Text | null = null;
  private hpBarBg: Phaser.GameObjects.Rectangle | null = null;
  private hpBarFill: Phaser.GameObjects.Rectangle | null = null;
  private timerText: Phaser.GameObjects.Text | null = null;
  private burstText: Phaser.GameObjects.Text | null = null;
  private burstBarBg: Phaser.GameObjects.Rectangle | null = null;
  private burstBarFill: Phaser.GameObjects.Rectangle | null = null;
  // All edge/corner HUD lives in this one container. It's anchored at the screen centre
  // and scaled by 1/zoom so children placed at (screenX-cx, screenY-cy) land on true
  // screen pixels regardless of the chapter's camera zoom (Ch11 runs at 2.0). A plain
  // scrollFactor(0) object gets flung off-screen because camera zoom pivots on centre.
  private hudContainer: Phaser.GameObjects.Container | null = null;

  private static readonly HP_BAR_W = 180;
  private static readonly BURST_BAR_W = 150;

  preload(_ctx: ModeContext): void {}

  start(ctx: ModeContext, config: SwarmSurvivalConfig, onComplete: (result: ModeResult) => void): void {
    this.ctx = ctx;
    this.config = config;
    this.onCompleteCallback = onComplete;
    this.resolved = false;
    this.enemies = [];
    this.elapsed = 0;
    this.timers = [];
    this.facingX = 1;
    this.facingY = 0;

    this.maxHp = config.survival.playerHp;
    this.hp = this.maxHp;
    this.burstCharges = config.secondary.charges;
    this.burstRechargeAccum = 0;
    this.swatReadyAt = 0;
    this.hurtUntil = 0;

    const kb = ctx.physics.scene.input.keyboard!;
    this.swatKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.burstKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.K);

    this.buildHud();

    // Duck stage music for the fight; the chapter is expected to restore it after.
    try { ctx.audioController.duckStageMusic(0.12, 600); } catch {}

    // Schedule the wave timeline.
    config.waves.forEach(wave => {
      this.timers.push(ctx.time.delayedCall(wave.atMs, () => this.runWave(wave)));
    });
    // Survive the whole timeline → win.
    this.timers.push(ctx.time.delayedCall(config.survival.durationMs, () => this.resolve('win')));
  }

  // ── HUD ────────────────────────────────────────────────────────────────────

  private buildHud(): void {
    const cam = this.ctx.cameras.main;
    const cx = cam.width / 2, cy = cam.height / 2;
    const zoom = cam.zoom || 1;
    const color = this.config.theme.hudColor ?? '#facc15';

    // Full-screen tint & flash. Sized 2× and centred so camera zoom (which over-scales
    // from the centre) still covers the whole viewport — a uniform tint over-covering is
    // visually identical, so these don't need the container treatment.
    this.overlay = this.ctx.add.rectangle(cx, cy, cam.width * 2, cam.height * 2, 0x1a0d0d, 0.18)
      .setScrollFactor(0).setDepth(9000);
    this.hitFlash = this.ctx.add.rectangle(cx, cy, cam.width * 2, cam.height * 2, 0xef4444, 0)
      .setScrollFactor(0).setDepth(9600);

    // Zoom-compensated HUD container (see field comment). Local coords = screen px - centre.
    this.hudContainer = this.ctx.add.container(cx, cy).setScrollFactor(0).setScale(1 / zoom).setDepth(9001);

    // title — top centre, ~78px down to clear the app's DOM banner.
    this.titleText = this.ctx.label(cx - cx, 78 - cy, this.config.theme.label, {
      fontSize: '16px', color, fontStyle: 'bold', backgroundColor: '#0b0808d0',
      padding: { x: 10, y: 5 }, stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);

    // "HP" caption sits left of the bar so the meter reads as health, not a mystery gauge.
    this.hpLabel = this.ctx.label(20 - cx, 72 - cy, 'HP', {
      fontSize: '12px', color: '#e2e8f0', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0, 0.5);
    const W = SwarmSurvivalMode.HP_BAR_W;
    const barX = 48; // clears the "HP" caption
    this.hpBarBg = this.ctx.add.rectangle(barX - cx, 72 - cy, W, 16, 0x2a0a0a).setOrigin(0, 0.5)
      .setStrokeStyle(2, 0x000000);
    this.hpBarFill = this.ctx.add.rectangle((barX + 2) - cx, 72 - cy, W - 4, 12, 0x22c55e).setOrigin(0, 0.5);

    this.timerText = this.ctx.label((cam.width - 20) - cx, 72 - cy, '', {
      fontSize: '15px', color: '#e2e8f0', fontStyle: 'bold', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(1, 0.5);

    this.burstText = this.ctx.label(20 - cx, 96 - cy, '', {
      fontSize: '13px', color, fontStyle: 'bold', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0, 0.5);

    // Spray recharge bar — fills as the next charge cooks, so the scarce secondary reads
    // as "coming back" instead of a silent number.
    const BW = SwarmSurvivalMode.BURST_BAR_W;
    this.burstBarBg = this.ctx.add.rectangle(20 - cx, 114 - cy, BW, 8, 0x1a1208).setOrigin(0, 0.5)
      .setStrokeStyle(1, 0x000000);
    this.burstBarFill = this.ctx.add.rectangle(21 - cx, 114 - cy, BW - 2, 6, 0xf59e0b).setOrigin(0, 0.5);

    this.hudContainer.add([this.titleText, this.hpLabel, this.hpBarBg, this.hpBarFill, this.timerText, this.burstText, this.burstBarBg, this.burstBarFill]);
    this.buildControls(cx, cy);
    this.refreshHud();
  }

  private buildControls(cx: number, cy: number): void {
    const cam = this.ctx.cameras.main;
    // Persistent on-screen control legend (key-caps + labels) along the bottom.
    const items = [
      { key: 'WASD', label: 'Move' },
      { key: 'J', label: (this.config.theme.primaryLabel.split('[')[0].trim() || 'Swat') },
      { key: 'K', label: (this.config.theme.secondaryLabel.split('[')[0].trim() || 'Bomb') },
      { key: 'SPACE', label: 'Dodge' },
    ];
    const gap = 20;
    // First pass: build the caps/labels and measure total width.
    const parts = items.map(it => {
      const capW = 12 + it.key.length * 9;
      const cap = this.ctx.add.rectangle(0, 0, capW, 22, 0x0b0808, 0.9).setStrokeStyle(1, 0x9aa0a8);
      const keyTxt = this.ctx.label(0, 0, it.key, { fontSize: '12px', color: '#e2e8f0', fontStyle: 'bold' }).setOrigin(0.5);
      const lbl = this.ctx.label(0, 0, it.label, { fontSize: '12px', color: '#c9ced6' }).setOrigin(0, 0.5);
      return { cap, keyTxt, lbl, capW, lblW: lbl.width };
    });
    const totalW = parts.reduce((w, p) => w + p.capW + 6 + p.lblW + gap, 0) - gap;
    // Second pass: lay out centred along the bottom, converting screen px -> container-local.
    const screenY = cam.height - 24;
    let x = cx - totalW / 2;
    for (const p of parts) {
      p.cap.setPosition((x + p.capW / 2) - cx, screenY - cy);
      p.keyTxt.setPosition((x + p.capW / 2) - cx, screenY - cy);
      x += p.capW + 6;
      p.lbl.setPosition(x - cx, screenY - cy);
      x += p.lblW + gap;
      this.hudContainer!.add([p.cap, p.keyTxt, p.lbl]);
    }
  }

  private refreshHud(): void {
    const W = SwarmSurvivalMode.HP_BAR_W;
    if (this.hpBarFill) {
      const frac = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
      this.hpBarFill.width = (W - 4) * frac;
      this.hpBarFill.fillColor = frac > 0.5 ? 0x22c55e : frac > 0.25 ? 0xf59e0b : 0xef4444;
    }
    if (this.timerText) {
      const remain = Math.max(0, this.config.survival.durationMs - this.elapsed);
      this.timerText.setText(`SURVIVE  ${Math.ceil(remain / 1000)}s`);
    }
    if (this.burstText) {
      const full = '●'.repeat(this.burstCharges);
      const empty = '○'.repeat(Math.max(0, this.config.secondary.charges - this.burstCharges));
      this.burstText.setText(`${this.config.theme.secondaryLabel}  ${full}${empty}`);
    }
    if (this.burstBarFill) {
      const BW = SwarmSurvivalMode.BURST_BAR_W - 2;
      const atMax = this.burstCharges >= this.config.secondary.charges;
      // At max: bar reads full & green ("ready"). Charging: amber fill toward next charge.
      const frac = atMax ? 1 : Phaser.Math.Clamp(this.burstRechargeAccum / this.config.secondary.cooldownMs, 0, 1);
      this.burstBarFill.width = Math.max(1, BW * frac);
      this.burstBarFill.fillColor = atMax ? 0x22c55e : 0xf59e0b;
    }
  }

  // ── Waves & spawning ─────────────────────────────────────────────────────────

  private runWave(wave: WaveSpec): void {
    if (this.resolved) return;
    const spec = this.config.enemyTypes[wave.enemyType];
    if (!spec) { console.warn(`[swarmSurvival] unknown enemyType: ${wave.enemyType}`); return; }
    const window = wave.spawnOverMs ?? 0;
    for (let i = 0; i < wave.count; i++) {
      const delay = window > 0 ? (window / wave.count) * i : 0;
      this.timers.push(this.ctx.time.delayedCall(delay, () => this.spawnEnemy(spec)));
    }
  }

  private spawnEnemy(spec: EnemyTypeSpec): void {
    if (this.resolved) return;
    const cam = this.ctx.cameras.main;
    const px = this.ctx.player.x as number;
    const py = this.ctx.player.y as number;
    // Spawn just outside the visible area, on a ring around the player, so they fly in.
    const ringR = Math.max(cam.width, cam.height) * 0.62;
    const ang = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const x = px + Math.cos(ang) * ringR;
    const y = py + Math.sin(ang) * ringR;

    const obj = this.ctx.label(x, y, spec.emoji, { fontSize: spec.fontSize ?? '20px' })
      .setOrigin(0.5).setDepth(50);
    this.enemies.push({ obj, spec, hp: spec.hp, phase: Phaser.Math.FloatBetween(0, Math.PI * 2), contactCdUntil: 0 });
  }

  // ── Per-frame ────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    if (this.resolved) return;
    this.elapsed += delta;

    this.updateFacing();
    if (this.swatKey && Phaser.Input.Keyboard.JustDown(this.swatKey)) this.trySwat(time);
    if (this.burstKey && Phaser.Input.Keyboard.JustDown(this.burstKey)) this.tryBurst();
    this.rechargeBurst(delta);
    this.updateEnemies(time, delta);
    this.refreshHud();

    if (this.hp <= 0) this.resolve('lose');
  }

  private updateFacing(): void {
    const body = this.ctx.player.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;
    const vx = body.velocity.x, vy = body.velocity.y;
    const mag = Math.hypot(vx, vy);
    if (mag > 1) { this.facingX = vx / mag; this.facingY = vy / mag; }
  }

  private rechargeBurst(delta: number): void {
    if (this.burstCharges >= this.config.secondary.charges) return;
    this.burstRechargeAccum += delta;
    if (this.burstRechargeAccum >= this.config.secondary.cooldownMs) {
      this.burstRechargeAccum = 0;
      this.burstCharges = Math.min(this.config.secondary.charges, this.burstCharges + 1);
    }
  }

  // ── Verbs ──────────────────────────────────────────────────────────────────

  private trySwat(time: number): void {
    if (time < this.swatReadyAt) return;
    this.swatReadyAt = time + this.config.primary.cooldownMs;

    const p = this.config.primary;
    const px = this.ctx.player.x as number;
    const py = this.ctx.player.y as number;
    const facingAng = Math.atan2(this.facingY, this.facingX);
    const halfArc = Phaser.Math.DegToRad(p.arcDeg) / 2;

    this.drawSwatArc(px, py, facingAng, p.reach, halfArc);
    try { this.ctx.sound.play('ui_select', { volume: 0.4 }); } catch {}

    for (const e of [...this.enemies]) {
      const dx = (e.obj.x as number) - px;
      const dy = (e.obj.y as number) - py;
      const dist = Math.hypot(dx, dy);
      if (dist > p.reach) continue;
      const diff = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - facingAng));
      if (diff > halfArc) continue;
      // Knock the enemy outward along the swing (config knockback is in px), then damage.
      const n = dist > 0.001 ? 1 / dist : 0;
      e.obj.x = (e.obj.x as number) + dx * n * p.knockback;
      e.obj.y = (e.obj.y as number) + dy * n * p.knockback;
      this.damageEnemy(e, p.damage);
    }
  }

  private tryBurst(): void {
    if (this.burstCharges <= 0) return;
    this.burstCharges -= 1;
    const s = this.config.secondary;
    const px = this.ctx.player.x as number;
    const py = this.ctx.player.y as number;

    this.drawBurstRing(px, py, s.radius);
    this.ctx.cameras.main.shake(120, 0.006);
    try { this.ctx.sound.play('ui_select', { volume: 0.7 }); } catch {}

    for (const e of [...this.enemies]) {
      const dx = (e.obj.x as number) - px;
      const dy = (e.obj.y as number) - py;
      const dist = Math.hypot(dx, dy);
      if (dist > s.radius) continue;
      const n = dist > 0.001 ? 1 / dist : 0;
      e.obj.x = (e.obj.x as number) + dx * n * s.radius * 0.5;
      e.obj.y = (e.obj.y as number) + dy * n * s.radius * 0.5;
      this.damageEnemy(e, s.damage);
    }
  }

  private damageEnemy(e: Enemy, amount: number): void {
    e.hp -= amount;
    if (e.hp <= 0) {
      this.killEnemy(e);
    } else {
      // brief flinch pop
      this.ctx.tweens.add({ targets: e.obj, scale: 1.4, duration: 70, yoyo: true });
    }
  }

  private killEnemy(e: Enemy): void {
    const idx = this.enemies.indexOf(e);
    if (idx >= 0) this.enemies.splice(idx, 1);
    const splat = this.ctx.label(e.obj.x as number, e.obj.y as number, '💥', { fontSize: '16px' })
      .setOrigin(0.5).setDepth(51);
    this.ctx.tweens.add({ targets: splat, scale: 1.6, alpha: 0, duration: 260, onComplete: () => splat.destroy() });
    e.obj.destroy();
  }

  private drawSwatArc(x: number, y: number, ang: number, reach: number, halfArc: number): void {
    const arc = this.ctx.add.arc(x, y, reach, Phaser.Math.RadToDeg(ang - halfArc), Phaser.Math.RadToDeg(ang + halfArc), false, 0xffffff, 0.28)
      .setDepth(45);
    this.ctx.tweens.add({ targets: arc, alpha: 0, duration: 150, onComplete: () => arc.destroy() });
  }

  private drawBurstRing(x: number, y: number, radius: number): void {
    // Draw the ring at 1/6 its final size, then scale up 6× — Phaser's Arc radius isn't
    // a clean tween target, but scale is.
    const ring = this.ctx.add.circle(x, y, radius / 6, 0xffffff, 0).setStrokeStyle(3, 0xfde047, 0.9).setDepth(46);
    this.ctx.tweens.add({ targets: ring, scale: 6, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
  }

  // ── Enemy movement & contact ─────────────────────────────────────────────────

  private updateEnemies(time: number, delta: number): void {
    const dt = delta / 1000;
    const px = this.ctx.player.x as number;
    const py = this.ctx.player.y as number;

    for (const e of this.enemies) {
      const ex = e.obj.x as number;
      const ey = e.obj.y as number;
      let dx = px - ex;
      let dy = py - ey;
      const dist = Math.hypot(dx, dy) || 1;
      dx /= dist; dy /= dist;

      if (e.spec.behavior === 'zigzag') {
        // Weave perpendicular to the approach vector.
        const wobble = Math.sin(time / 180 + e.phase) * 0.6;
        const nx = -dy, ny = dx;
        e.obj.x = ex + (dx + nx * wobble) * e.spec.speed * dt;
        e.obj.y = ey + (dy + ny * wobble) * e.spec.speed * dt;
      } else {
        // homing & straight both drive toward the player (straight = no re-aim wobble).
        e.obj.x = ex + dx * e.spec.speed * dt;
        e.obj.y = ey + dy * e.spec.speed * dt;
      }

      // Contact tick.
      const cd = Math.hypot((e.obj.x as number) - px, (e.obj.y as number) - py);
      if (cd <= CONTACT_RADIUS && time >= e.contactCdUntil) {
        e.contactCdUntil = time + 600;
        this.onPlayerContact(e, time);
      }
    }
  }

  private onPlayerContact(e: Enemy, time: number): void {
    // Dash i-frames (shared with the rest of the game) fully dodge the hit.
    if (this.ctx.isPlayerInvuln()) {
      this.ctx.showPassiveIconText(this.ctx.player.x as number, (this.ctx.player.y as number) - 40, 'DODGED ✨', '#60a5fa');
      return;
    }
    // Mode-owned i-frames stop a cluster from draining the whole bar in one frame-cluster.
    if (time < this.hurtUntil) return;
    this.hurtUntil = time + HIT_IFRAME_MS;

    this.hp = Math.max(0, this.hp - e.spec.contactDamage);
    this.flashHit();
    this.flashPlayerHurt();
    this.ctx.showDamageNumber((this.ctx.player.x as number) + Phaser.Math.Between(-14, 14), (this.ctx.player.y as number) - 28, e.spec.contactDamage, '#ef4444');
    this.ctx.cameras.main.shake(90, 0.006);
    // Nudge the biting enemy off so it re-approaches instead of sitting on the player.
    const dx = (e.obj.x as number) - (this.ctx.player.x as number);
    const dy = (e.obj.y as number) - (this.ctx.player.y as number);
    const n = (Math.hypot(dx, dy) || 1);
    e.obj.x = (e.obj.x as number) + (dx / n) * KILL_KNOCKBACK;
    e.obj.y = (e.obj.y as number) + (dy / n) * KILL_KNOCKBACK;
  }

  private flashPlayerHurt(): void {
    // Tint the character red for a beat — unmistakable "I got bitten" feedback in-world.
    const p = this.ctx.player as Phaser.GameObjects.Sprite;
    try {
      p.setTint(0xff5555);
      this.ctx.time.delayedCall(140, () => { try { p.clearTint(); } catch { /* torn down */ } });
    } catch { /* player may not support tint */ }
  }

  private flashHit(): void {
    if (!this.hitFlash) return;
    this.hitFlash.setAlpha(0.4);
    this.ctx.tweens.add({ targets: this.hitFlash, alpha: 0, duration: 220 });
  }

  // ── Resolution ────────────────────────────────────────────────────────────────

  private resolve(outcome: 'win' | 'lose'): void {
    if (this.resolved) return;
    this.resolved = true;
    this.timers.forEach(t => t.remove());
    this.timers = [];
    try { this.ctx.audioController.resumeStageMusic(); } catch {}

    if (this.titleText) {
      this.titleText.setText(outcome === 'win' ? 'YOU HELD THE LINE' : 'OVERRUN');
      this.titleText.setColor(outcome === 'win' ? '#4ade80' : '#ef4444');
    }
    const cb = this.onCompleteCallback;
    this.onCompleteCallback = null;
    this.ctx.time.delayedCall(900, () => cb?.({ outcome }));
  }

  teardown(): void {
    this.timers.forEach(t => t.remove());
    this.timers = [];
    this.enemies.forEach(e => e.obj.destroy());
    this.enemies = [];
    this.overlay?.destroy(); this.overlay = null;
    this.hitFlash?.destroy(); this.hitFlash = null;
    // Destroying the container destroys all HUD children (title/HP/timer/burst/controls).
    this.hudContainer?.destroy(); this.hudContainer = null;
    this.titleText = null; this.hpLabel = null; this.hpBarBg = null; this.hpBarFill = null;
    this.timerText = null; this.burstText = null; this.burstBarBg = null; this.burstBarFill = null;
    this.swatKey?.reset(); this.swatKey = null;
    this.burstKey?.reset(); this.burstKey = null;
    this.onCompleteCallback = null;
  }
}

export const swarmSurvivalMode = new SwarmSurvivalMode();
export default swarmSurvivalMode;

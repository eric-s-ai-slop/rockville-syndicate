import Phaser from 'phaser';
import type { GameMode, ModeContext, ModeResult } from '../types';
import { Beat } from '../../../data/chapters';

// ─── cabinCollapse ────────────────────────────────────────────────────────────
// The actual boss of Ch11 (Cabin From Hell) — an ambient, undefeatable background
// mode that renders the cabin's four failing systems (water/AC/bugs/illness) as
// a small HUD and escalates them by watching narrator dialogue lines via
// onDialogue(). It cannot be won; Day 5's illness line maxes it out and it
// self-resolves. Re-registered (fresh minigame beat) after every foreground
// interruption and every changeScene, since the engine tears activeMode down
// unconditionally on both. See shenandoah_cabin_mechanic.md.

interface CabinCollapseMeters {
  water: number;
  ac: number;
  bugs: number;
  illness: number; // 0-4
}

interface CabinCollapseConfig {
  startDay: number;
  meters: CabinCollapseMeters;
}

interface MeterRow {
  key: keyof CabinCollapseMeters;
  icon: string;
  max: number;
  bar: Phaser.GameObjects.Rectangle;
  track: Phaser.GameObjects.Rectangle;
}

const METER_DEFS: { key: keyof CabinCollapseMeters; icon: string; max: number }[] = [
  { key: 'water', icon: '💧', max: 100 },
  { key: 'ac', icon: '🌡️', max: 100 },
  { key: 'bugs', icon: '🦟', max: 100 },
  { key: 'illness', icon: '🤒', max: 4 },
];

const DECK_FLY_SPOTS = [
  { x: 560, y: 260 }, { x: 620, y: 340 }, { x: 520, y: 420 }, { x: 660, y: 220 }, { x: 600, y: 460 },
];

export class CabinCollapseMode implements GameMode {
  id = 'cabinCollapse';
  private ctx!: ModeContext;
  private onCompleteCallback: ((result: ModeResult) => void) | null = null;
  private meters!: CabinCollapseMeters;
  private resolved = false;

  private hudContainer: Phaser.GameObjects.Container | null = null;
  private rows: MeterRow[] = [];
  private flySprites: Phaser.GameObjects.Text[] = [];
  private flyTweens: Phaser.Tweens.Tween[] = [];

  preload(_ctx: ModeContext): void {}

  start(ctx: ModeContext, config: CabinCollapseConfig, onComplete: (result: ModeResult) => void): void {
    this.ctx = ctx;
    this.onCompleteCallback = onComplete;
    this.meters = { ...config.meters };
    this.resolved = false;
    this.rows = [];

    const cam = ctx.cameras.main;
    const rowH = 20;
    const x0 = cam.width - 130;
    const y0 = 20;

    const items: Phaser.GameObjects.GameObject[] = [];
    METER_DEFS.forEach((def, i) => {
      const y = i * rowH;
      const icon = ctx.label(-58, y, def.icon, { fontSize: '13px' }).setOrigin(0.5);
      const track = ctx.add.rectangle(0, y, 90, 10, 0x1f2933).setOrigin(0, 0.5).setStrokeStyle(1, 0x000000);
      const value = this.meters[def.key];
      const pct = Phaser.Math.Clamp(value / def.max, 0, 1);
      const bar = ctx.add.rectangle(0, y, 90 * pct, 10, this.barColor(def.key, pct)).setOrigin(0, 0.5);
      items.push(icon, track, bar);
      this.rows.push({ key: def.key, icon: def.icon, max: def.max, bar, track });
    });

    this.hudContainer = ctx.add.container(x0, y0, items).setScrollFactor(0).setDepth(9800);
  }

  private barColor(key: keyof CabinCollapseMeters, pct: number): number {
    if (key === 'illness') return pct > 0.5 ? 0xef4444 : 0xf59e0b;
    return pct < 0.3 ? 0xef4444 : pct < 0.6 ? 0xf59e0b : 0x4ade80;
  }

  private refreshRow(key: keyof CabinCollapseMeters): void {
    const row = this.rows.find(r => r.key === key);
    if (!row) return;
    const value = this.meters[key];
    const pct = Phaser.Math.Clamp(value / row.max, 0, 1);
    this.ctx.tweens.add({ targets: row.bar, width: 90 * pct, duration: 500 });
    row.bar.fillColor = this.barColor(key, pct);
  }

  update(_time: number, _delta: number): void {
    // Ambient jitter only — no gameplay tick.
  }

  onDialogue(beat: Extract<Beat, { type: 'dialogue' }>): void {
    if (this.resolved) return;
    const text = beat.lines.join(' ').toLowerCase();

    if (text.includes('water is out') || text.includes('water out again') || text.includes("water's out")) {
      this.meters.water = Math.max(0, this.meters.water - 40);
      this.refreshRow('water');
      this.toast('The water is out. Again.');
    }
    if (text.includes('maharko') && (text.includes('sick') || text.includes('bed-bound'))) {
      this.meters.illness = Math.max(this.meters.illness, 1);
      this.refreshRow('illness');
    }
    if (text.includes('lanternflies')) {
      this.meters.bugs = Math.min(100, this.meters.bugs + 20);
      this.refreshRow('bugs');
      this.spawnDeckFlies();
    }
    if (text.includes('ac died') || (text.includes('ac') && text.includes('ninety'))) {
      this.meters.ac = Math.max(0, this.meters.ac - 60);
      this.refreshRow('ac');
      this.toast('The AC is dead.');
    }
    if (text.includes('jordan is sick')) {
      this.meters.illness = Math.max(this.meters.illness, 2);
      this.refreshRow('illness');
    }
    if (text.includes('nick f is sick')) {
      this.meters.illness = Math.max(this.meters.illness, 3);
      this.refreshRow('illness');
    }
    if (text.includes('alex is sick') && text.includes('leo is sick')) {
      this.meters.illness = 4;
      this.refreshRow('illness');
      this.flashAndResolve();
    }
  }

  private toast(msg: string): void {
    const cam = this.ctx.cameras.main;
    this.ctx.showPassiveIconText(cam.width - 130, 100, msg, '#f59e0b');
  }

  private spawnDeckFlies(): void {
    this.clearFlies();
    const count = Math.max(2, Math.round(this.meters.bugs / 20));
    DECK_FLY_SPOTS.slice(0, count).forEach(spot => {
      const fly = this.ctx.label(spot.x, spot.y, '🦟', { fontSize: '14px' }).setDepth(spot.y);
      this.flySprites.push(fly);
      const tween = this.ctx.tweens.add({
        targets: fly,
        x: spot.x + Phaser.Math.Between(-30, 30),
        y: spot.y + Phaser.Math.Between(-20, 20),
        duration: Phaser.Math.Between(1200, 2200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.flyTweens.push(tween);
    });
  }

  private clearFlies(): void {
    this.flyTweens.forEach(t => t.stop());
    this.flyTweens = [];
    this.flySprites.forEach(f => f.destroy());
    this.flySprites = [];
  }

  private flashAndResolve(): void {
    this.rows.forEach(r => {
      this.ctx.tweens.add({ targets: r.bar, fillColor: { from: r.bar.fillColor, to: 0xef4444 } as any, duration: 300 });
    });
    this.ctx.time.delayedCall(1500, () => this.resolve());
  }

  private resolve(): void {
    if (this.resolved) return;
    this.resolved = true;
    const cb = this.onCompleteCallback;
    this.onCompleteCallback = null;
    cb?.({ outcome: 'lose' }); // hygiene marker only — not a routing signal, see mechanic doc
  }

  teardown(): void {
    this.hudContainer?.destroy();
    this.hudContainer = null;
    this.rows = [];
    this.clearFlies();
    this.onCompleteCallback = null;
  }
}

export const cabinCollapseMode = new CabinCollapseMode();
export default cabinCollapseMode;

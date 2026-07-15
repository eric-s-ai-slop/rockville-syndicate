import Phaser from 'phaser';
import type { ModeContext, ModeResult } from '../types';
import { BEN_GAME_DEPTH as D, BenArcadeMode } from '../benArcade/shared';
import { circuitCurrent, graphiteState } from '../benArcade/logic';
import WORKBENCH_URL from '../../../assets/chapters/bens_life/minigames/circuit/engineering-workbench.png';

export interface BenCircuitLabConfig {
  holdSeconds?: number;
}

type Path = 'long' | 'medium' | 'short';

const WORKBENCH_KEY = 'ben_circuit_workbench';
const PATH_Y: Record<Path, number> = { long: 365, medium: 410, short: 458 };
const PATH_RESISTANCE: Record<Path, number> = { long: 5.2, medium: 2.8, short: 1.55 };
const PATH_COPY: Record<Path, string> = {
  long: '1  LONG — COOL / DIM', medium: '2  MEDIUM — BALANCED', short: '3  SHORT — HOT / BRIGHT',
};

export class BenCircuitLabMode extends BenArcadeMode<BenCircuitLabConfig> {
  id = 'benCircuitLab';
  capturesPlayerMovement = true;

  private path: Path = 'long';
  private powered = false;
  private heat = 0;
  private bright = 0;
  private stable = 0;
  private hold = 6;
  private round = 1;
  private strikes = 0;
  private transitioning = false;
  private pathButtons = new Map<Path, Phaser.GameObjects.Rectangle>();
  private glow: Phaser.GameObjects.Ellipse | null = null;
  private roundText: Phaser.GameObjects.Text | null = null;
  private instruction: Phaser.GameObjects.Text | null = null;
  private status: Phaser.GameObjects.Text | null = null;
  private brightnessFill: Phaser.GameObjects.Rectangle | null = null;
  private brightnessTarget: Phaser.GameObjects.Rectangle | null = null;
  private heatFill: Phaser.GameObjects.Rectangle | null = null;
  private stabilityFill: Phaser.GameObjects.Rectangle | null = null;
  private brightnessLabel: Phaser.GameObjects.Text | null = null;
  private heatLabel: Phaser.GameObjects.Text | null = null;
  private stabilityLabel: Phaser.GameObjects.Text | null = null;
  private powerButton: Phaser.GameObjects.Rectangle | null = null;
  private powerText: Phaser.GameObjects.Text | null = null;
  private layoutScale = 1;
  private layoutOffsetX = 0;
  private layoutOffsetY = 0;

  preload(ctx: ModeContext): void {
    if (!ctx.textures.exists(WORKBENCH_KEY)) ctx.physics.scene.load.image(WORKBENCH_KEY, WORKBENCH_URL);
  }

  start(ctx: ModeContext, config: BenCircuitLabConfig | undefined, done: (result: ModeResult) => void): void {
    this.begin(ctx, done);
    this.configureResponsiveLayout();
    this.hold = config?.holdSeconds ?? 6;
    this.path = 'long'; this.powered = false; this.heat = 0; this.bright = 0; this.stable = 0;
    this.round = 1; this.strikes = 0; this.transitioning = false; this.pathButtons.clear();
    this.drawLab();
    this.selectPath('long');
    this.bind('keydown', (event) => {
      if (event.key === '1') this.selectPath('long');
      if (event.key === '2') this.selectPath('medium');
      if (event.key === '3') this.selectPath('short');
      if (event.key === ' ') { event.preventDefault(); this.powered = true; }
    });
    this.bind('keyup', (event) => { if (event.key === ' ') this.powered = false; });
  }

  update(_time: number, delta: number): void {
    if (this.ended) return;
    const dt = Math.min(delta, 40) / 1000;
    const resistance = PATH_RESISTANCE[this.path];
    const voltage = [5, 9, 12][this.round - 1];
    const current = this.powered && !this.transitioning ? circuitCurrent(voltage, resistance) : 0;
    const state = graphiteState(current, this.heat, dt);
    this.bright = state.brightness;
    this.heat = this.powered && !this.transitioning ? state.heat : Math.max(0, this.heat - dt * 14);
    const targetMin = [18, 38, 62][this.round - 1];
    const targetMax = [48, 72, 88][this.round - 1];
    const inTarget = this.powered && this.bright >= targetMin && this.bright <= targetMax && this.heat < 92;
    if (inTarget && !this.transitioning) this.stable += dt;
    else if (!this.transitioning) this.stable = Math.max(0, this.stable - dt * 0.5);
    this.updateVisuals(voltage, resistance, targetMin, targetMax, inTarget);

    if (this.heat >= 110 && !this.transitioning) {
      this.strikes++; this.powered = false; this.heat = 25; this.stable = 0;
      this.status?.setText(`GRAPHITE OVERHEATED — FAILURE ${this.strikes}/3`).setColor('#fca5a5');
      this.ctx.cameras.main.shake(240, 0.012);
      if (this.strikes >= 3) this.finish('lose', { reason: 'graphite-failure', round: this.round });
    }
    if (this.stable >= this.hold && !this.transitioning) this.completeRound();
  }

  private drawLab(): void {
    this.track(this.ctx.add.rectangle(this.ss.zx(460), this.ss.zy(330), this.ss.s(920), this.ss.s(660), 0x020617, 1)
      .setScrollFactor(0).setDepth(D));
    this.track(this.ctx.add.image(this.ss.zx(460), this.ss.zy(371), WORKBENCH_KEY)
      .setDisplaySize(this.ss.s(920), this.ss.s(518)).setScrollFactor(0).setDepth(D + 1));
    this.track(this.ctx.add.rectangle(this.ss.zx(460), this.ss.zy(46), this.ss.s(920), this.ss.s(92), 0x090504, 0.92)
      .setScrollFactor(0).setDepth(D + 12));
    this.track(this.ctx.label(this.ss.zx(24), this.ss.zy(18), 'LIVE CIRCUIT LAB // 12V CAR BATTERY', {
      fontSize: `${this.ss.s(15)}px`, color: '#fdba74', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(D + 14));
    this.roundText = this.track(this.ctx.label(this.ss.zx(895), this.ss.zy(18), '', {
      fontSize: `${this.ss.s(12)}px`, color: '#f8fafc', align: 'right', fontStyle: 'bold',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(D + 14)) as Phaser.GameObjects.Text;
    this.instruction = this.track(this.ctx.label(this.ss.zx(460), this.ss.zy(70), 'CHOOSE A PATH • HOLD POWER • RELEASE TO COOL • FILL THE GREEN STABILITY BAR', {
      fontSize: `${this.ss.s(11)}px`, color: '#fef08a', align: 'center', fontStyle: 'bold',
      stroke: '#020617', strokeThickness: this.ss.s(4),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 14)) as Phaser.GameObjects.Text;

    (['long', 'medium', 'short'] as Path[]).forEach((path) => {
      const y = PATH_Y[path];
      const button = this.track(this.ctx.add.rectangle(this.ss.zx(500), this.ss.zy(y), this.ss.s(370), this.ss.s(34), 0x0f172a, 0.38)
        .setScrollFactor(0).setDepth(D + 6).setStrokeStyle(this.ss.s(2), 0x64748b, 0.7)
        .setInteractive({ useHandCursor: true }));
      button.on('pointerdown', () => this.selectPath(path));
      this.pathButtons.set(path, button);
      this.track(this.ctx.label(this.ss.zx(500), this.ss.zy(y), PATH_COPY[path], {
        fontSize: `${this.ss.s(10)}px`, color: '#f8fafc', fontStyle: 'bold',
        stroke: '#020617', strokeThickness: this.ss.s(4),
      }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 7));
    });
    this.glow = this.track(this.ctx.add.ellipse(this.ss.zx(500), this.ss.zy(PATH_Y.long), this.ss.s(390), this.ss.s(54), 0xf97316, 0)
      .setScrollFactor(0).setDepth(D + 5));

    this.track(this.ctx.add.rectangle(this.ss.zx(460), this.ss.zy(580), this.ss.s(900), this.ss.s(132), 0x090504, 0.9)
      .setScrollFactor(0).setDepth(D + 10).setStrokeStyle(this.ss.s(2), 0x9a3412, 0.9));
    this.makeMeterTracks();
    this.makePowerButton();
    this.status = this.track(this.ctx.label(this.ss.zx(460), this.ss.zy(518), 'SELECT A PATH, THEN HOLD SPACE OR THE POWER BUTTON', {
      fontSize: `${this.ss.s(12)}px`, color: '#fef08a', fontStyle: 'bold', align: 'center',
      stroke: '#020617', strokeThickness: this.ss.s(4),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 13)) as Phaser.GameObjects.Text;
  }

  private makeMeterTracks(): void {
    this.track(this.ctx.add.rectangle(this.ss.zx(80), this.ss.zy(560), this.ss.s(220), this.ss.s(16), 0x1e293b, 1)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 11));
    this.brightnessTarget = this.track(this.ctx.add.rectangle(this.ss.zx(80), this.ss.zy(560), this.ss.s(40), this.ss.s(22), 0x22c55e, 0.42)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 12)) as Phaser.GameObjects.Rectangle;
    this.brightnessFill = this.track(this.ctx.add.rectangle(this.ss.zx(80), this.ss.zy(560), this.ss.s(220), this.ss.s(12), 0xfacc15, 1)
      .setOrigin(0, 0.5).setScale(0, 1).setScrollFactor(0).setDepth(D + 13)) as Phaser.GameObjects.Rectangle;
    this.brightnessLabel = this.track(this.ctx.label(this.ss.zx(80), this.ss.zy(542), '', {
      fontSize: `${this.ss.s(9)}px`, color: '#fde68a', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 13)) as Phaser.GameObjects.Text;

    this.track(this.ctx.add.rectangle(this.ss.zx(345), this.ss.zy(560), this.ss.s(220), this.ss.s(16), 0x1e293b, 1)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 11));
    this.heatFill = this.track(this.ctx.add.rectangle(this.ss.zx(345), this.ss.zy(560), this.ss.s(220), this.ss.s(12), 0xef4444, 1)
      .setOrigin(0, 0.5).setScale(0, 1).setScrollFactor(0).setDepth(D + 13)) as Phaser.GameObjects.Rectangle;
    this.heatLabel = this.track(this.ctx.label(this.ss.zx(345), this.ss.zy(542), '', {
      fontSize: `${this.ss.s(9)}px`, color: '#fecaca', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 13)) as Phaser.GameObjects.Text;

    this.track(this.ctx.add.rectangle(this.ss.zx(80), this.ss.zy(615), this.ss.s(485), this.ss.s(18), 0x1e293b, 1)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 11));
    this.stabilityFill = this.track(this.ctx.add.rectangle(this.ss.zx(80), this.ss.zy(615), this.ss.s(485), this.ss.s(14), 0x22c55e, 1)
      .setOrigin(0, 0.5).setScale(0, 1).setScrollFactor(0).setDepth(D + 13)) as Phaser.GameObjects.Rectangle;
    this.stabilityLabel = this.track(this.ctx.label(this.ss.zx(80), this.ss.zy(594), '', {
      fontSize: `${this.ss.s(9)}px`, color: '#bbf7d0', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 13)) as Phaser.GameObjects.Text;
  }

  private makePowerButton(): void {
    this.powerButton = this.track(this.ctx.add.rectangle(this.ss.zx(740), this.ss.zy(585), this.ss.s(260), this.ss.s(70), 0x9a3412, 1)
      .setScrollFactor(0).setDepth(D + 12).setStrokeStyle(this.ss.s(3), 0xfdba74, 1)
      .setInteractive({ useHandCursor: true })) as Phaser.GameObjects.Rectangle;
    this.powerButton.on('pointerdown', () => { this.powered = true; });
    this.powerButton.on('pointerup', () => { this.powered = false; });
    this.powerButton.on('pointerout', () => { this.powered = false; });
    this.powerText = this.track(this.ctx.label(this.ss.zx(740), this.ss.zy(585), 'HOLD TO POWER\nOR HOLD SPACE', {
      fontSize: `${this.ss.s(12)}px`, color: '#fff7ed', fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 13)) as Phaser.GameObjects.Text;
  }

  private selectPath(path: Path): void {
    if (this.transitioning) return;
    this.path = path;
    this.pathButtons.forEach((button, candidate) => button
      .setFillStyle(candidate === path ? 0x7c2d12 : 0x0f172a, candidate === path ? 0.76 : 0.38)
      .setStrokeStyle(this.ss.s(candidate === path ? 4 : 2), candidate === path ? 0xfacc15 : 0x64748b, candidate === path ? 1 : 0.7));
    this.glow?.setPosition(this.ss.zx(500), this.ss.zy(PATH_Y[path]));
    this.status?.setText(`${path.toUpperCase()} PATH SELECTED — HOLD POWER`).setColor('#fef08a');
  }

  private updateVisuals(voltage: number, resistance: number, targetMin: number, targetMax: number, inTarget: boolean): void {
    this.roundText?.setText(`ROUND ${this.round}/3   •   FAILURES ${this.strikes}/3\n${voltage}V  •  ${resistance.toFixed(2)}Ω`);
    this.brightnessFill?.setScale(this.bright / 100, 1);
    this.heatFill?.setScale(this.heat / 120, 1).setFillStyle(this.heat > 90 ? 0xffffff : this.heat > 70 ? 0xf97316 : 0xef4444, 1);
    this.stabilityFill?.setScale(Math.min(1, this.stable / this.hold), 1);
    this.brightnessTarget?.setPosition(this.ss.zx(80 + targetMin / 100 * 220), this.ss.zy(560))
      .setDisplaySize(this.ss.s((targetMax - targetMin) / 100 * 220), this.ss.s(22));
    this.brightnessLabel?.setText(`BRIGHTNESS ${Math.round(this.bright)}%   •   GREEN TARGET ${targetMin}–${targetMax}%`);
    this.heatLabel?.setText(`HEAT ${Math.round(this.heat)}%   •   RELEASE BEFORE 100%`);
    this.stabilityLabel?.setText(`STABILITY ${this.stable.toFixed(1)} / ${this.hold}s   •   FILL THIS BAR TO PASS`);
    this.glow?.setFillStyle(this.heat > 95 ? 0xffffff : 0xf97316, Math.min(0.62, this.bright / 150));
    this.powerButton?.setFillStyle(this.powered ? 0xea580c : 0x9a3412, 1);
    this.powerText?.setText(this.powered ? 'POWER ON\nRELEASE TO COOL' : 'HOLD TO POWER\nOR HOLD SPACE');
    if (!this.powered || this.transitioning) return;
    if (this.heat > 82) this.status?.setText('HEAT HIGH — RELEASE POWER TO COOL').setColor('#fca5a5');
    else if (this.bright < targetMin) this.status?.setText('TOO DIM — CHOOSE A SHORTER PATH').setColor('#fde68a');
    else if (this.bright > targetMax) this.status?.setText('TOO BRIGHT — CHOOSE A LONGER PATH').setColor('#fca5a5');
    else if (inTarget) this.status?.setText('GOOD RANGE — KEEP THE GREEN STABILITY BAR FILLING').setColor('#86efac');
  }

  private completeRound(): void {
    this.transitioning = true; this.powered = false;
    this.status?.setText(`ROUND ${this.round} COMPLETE`).setColor('#86efac');
    this.ctx.cameras.main.flash(180, 249, 115, 22, false);
    this.after(700, () => {
      if (this.round >= 3) {
        this.finish('win', { strikes: this.strikes, heat: Math.round(this.heat) });
        return;
      }
      this.round++; this.stable = 0; this.heat = 10; this.bright = 0; this.transitioning = false;
      this.selectPath('long');
      this.status?.setText(`ROUND ${this.round} — TARGET IS BRIGHTER. SELECT A PATH.`).setColor('#fef08a');
    });
  }

  private configureResponsiveLayout(): void {
    const cam = this.ctx.cameras.main; const base = this.ss;
    this.layoutScale = Math.min(cam.width / 920, cam.height / 660);
    this.layoutOffsetX = (cam.width - 920 * this.layoutScale) / 2;
    this.layoutOffsetY = (cam.height - 660 * this.layoutScale) / 2;
    this.ss = {
      z: base.z,
      zx: (x) => base.zx(this.layoutOffsetX + x * this.layoutScale),
      zy: (y) => base.zy(this.layoutOffsetY + y * this.layoutScale),
      s: (size) => base.s(size * this.layoutScale),
    };
  }
}

export const benCircuitLabMode = new BenCircuitLabMode();

import Phaser from 'phaser';
import type { GameMode, ModeContext, ModeResult } from '../types';
import { screenSpace, type ScreenSpace } from '../screenSpace';
import { coughInterval, normalizedDirection } from './logic';

export interface BenHazardModeConfig {
  title?: string;
  durationMs?: number;
  speed?: number;
  hazardCount?: number;
  successText?: string;
  failureText?: string;
}

const D = 9600;

interface CoughCloud {
  object: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  age: number;
  telegraphMs: number;
  activeMs: number;
  radius: number;
}

interface Carrier {
  object: Phaser.GameObjects.Arc;
  icon: Phaser.GameObjects.Text;
  x: number;
  y: number;
  vx: number;
  vy: number;
  infected: boolean;
}

export class BenHazardMode implements GameMode<BenHazardModeConfig> {
  id = 'benHazard';
  harnessForceComplete = (result: ModeResult = { outcome: 'win' }) => this.resolve(result.outcome === 'lose' ? 'lose' : 'win');

  private ctx!: ModeContext;
  private config!: Required<BenHazardModeConfig>;
  private ss!: ScreenSpace;
  private complete: ((result: ModeResult) => void) | null = null;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private timers: Phaser.Time.TimerEvent[] = [];
  private keyDown?: (event: KeyboardEvent) => void;
  private keyUp?: (event: KeyboardEvent) => void;
  private ended = false;
  private elapsed = 0;
  private nextCough = 900;
  private nextInfection = 7200;
  private player = { x: 460, y: 450 };
  private direction = { x: 0, y: 0 };
  private clouds: CoughCloud[] = [];
  private carriers: Carrier[] = [];
  private tissues: Array<{ object: Phaser.GameObjects.Rectangle; x: number; y: number }> = [];
  private playerDot: Phaser.GameObjects.Arc | null = null;
  private playerLabel: Phaser.GameObjects.Text | null = null;
  private timerText: Phaser.GameObjects.Text | null = null;
  private feedback: Phaser.GameObjects.Text | null = null;
  private chainText: Phaser.GameObjects.Text | null = null;
  private nearMisses = 0;
  private combo = 0;

  preload(_ctx: ModeContext): void {}

  start(ctx: ModeContext, config: BenHazardModeConfig | undefined, onComplete: (result: ModeResult) => void): void {
    this.ctx = ctx;
    this.config = {
      title: config?.title ?? 'PATIENT ZERO', durationMs: config?.durationMs ?? 36000,
      speed: config?.speed ?? 230, hazardCount: config?.hazardCount ?? 8,
      successText: config?.successText ?? 'SURVIVED OCEAN CITY', failureText: config?.failureText ?? 'PATIENT: IMMEDIATE',
    };
    this.ss = screenSpace(ctx.cameras.main);
    this.complete = onComplete;
    this.objects = [];
    this.timers = [];
    this.clouds = [];
    this.carriers = [];
    this.tissues = [];
    this.elapsed = 0;
    this.nextCough = 900;
    this.nextInfection = 7200;
    this.nearMisses = 0;
    this.combo = 0;
    this.ended = false;
    this.player = { x: 460, y: 450 };
    this.direction = { x: 0, y: 0 };
    this.buildArena();
    this.bindControls();
  }

  update(_time: number, delta: number): void {
    if (this.ended) return;
    this.elapsed += delta;
    const dt = Math.min(delta, 50) / 1000;
    const { x: dx, y: dy } = normalizedDirection(this.direction.x, this.direction.y);
    this.player.x = Phaser.Math.Clamp(this.player.x + dx * this.config.speed * dt, 105, 815);
    this.player.y = Phaser.Math.Clamp(this.player.y + dy * this.config.speed * dt, 175, 535);
    this.playerDot?.setPosition(this.ss.zx(this.player.x), this.ss.zy(this.player.y));
    this.playerLabel?.setPosition(this.ss.zx(this.player.x), this.ss.zy(this.player.y));

    if (this.elapsed >= this.nextCough) {
      this.spawnCough();
      this.nextCough = this.elapsed + coughInterval(this.elapsed, this.config.durationMs);
    }
    if (this.elapsed >= this.nextInfection) {
      this.infectCarrier();
      this.nextInfection += 7200;
    }

    this.updateCarriers(dt);
    this.updateClouds(delta);
    this.checkTissues();
    const remaining = Math.max(0, this.config.durationMs - this.elapsed);
    this.timerText?.setText(`TIME UNTIL ERIC GETS SICK: ${(remaining / 1000).toFixed(1)}s`);
    this.chainText?.setText(`TRANSMISSION CHAIN: ${this.carriers.filter((person) => person.infected).length + 1}   NEAR MISSES: ${this.nearMisses}`);
    if (remaining <= 0) this.resolve('win');
  }

  teardown(): void {
    this.ended = true;
    if (this.keyDown) window.removeEventListener('keydown', this.keyDown);
    if (this.keyUp) window.removeEventListener('keyup', this.keyUp);
    this.keyDown = undefined;
    this.keyUp = undefined;
    this.timers.forEach((timer) => timer.remove(false));
    this.timers = [];
    this.objects.forEach((object) => {
      try { this.ctx.tweens.killTweensOf(object); object.destroy(); } catch { /* scene shutdown */ }
    });
    this.objects = [];
    this.clouds = [];
    this.carriers = [];
    this.tissues = [];
    this.complete = null;
    this.playerLabel = null;
  }

  private buildArena(): void {
    const cam = this.ctx.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    this.track(this.ctx.add.rectangle(this.ss.zx(cx), this.ss.zy(cy), this.ss.s(cam.width * 2), this.ss.s(cam.height * 2), 0x101827, 1)
      .setScrollFactor(0).setDepth(D));
    this.track(this.ctx.add.rectangle(this.ss.zx(cx), this.ss.zy(cy + 22), this.ss.s(730), this.ss.s(380), 0x172033, 1)
      .setScrollFactor(0).setDepth(D + 1).setStrokeStyle(this.ss.s(3), 0x475569, 1));
    this.track(this.ctx.label(this.ss.zx(cx), this.ss.zy(cy - cam.height * 0.42), this.config.title, {
      fontSize: `${this.ss.s(21)}px`, color: '#facc15', fontStyle: 'bold', stroke: '#000000', strokeThickness: this.ss.s(4),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 5));
    this.track(this.ctx.label(this.ss.zx(140), this.ss.zy(205), 'BEN\nCOUGH SOURCE', {
      fontSize: `${this.ss.s(11)}px`, color: '#bef264', align: 'center', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 4));
    this.track(this.ctx.add.circle(this.ss.zx(140), this.ss.zy(260), this.ss.s(24), 0x65a30d, 1)
      .setScrollFactor(0).setDepth(D + 3).setStrokeStyle(this.ss.s(3), 0xd9f99d, 1));
    this.playerDot = this.track(this.ctx.add.circle(this.ss.zx(this.player.x), this.ss.zy(this.player.y), this.ss.s(15), 0x38bdf8, 1)
      .setScrollFactor(0).setDepth(D + 5).setStrokeStyle(this.ss.s(3), 0xe0f2fe, 1)) as Phaser.GameObjects.Arc;
    this.playerLabel = this.track(this.ctx.label(this.ss.zx(this.player.x), this.ss.zy(this.player.y), 'E', {
      fontSize: `${this.ss.s(10)}px`, color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 6)) as Phaser.GameObjects.Text;
    this.timerText = this.track(this.ctx.label(this.ss.zx(cx), this.ss.zy(cy + cam.height * 0.39), '', {
      fontSize: `${this.ss.s(14)}px`, color: '#facc15', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 5)) as Phaser.GameObjects.Text;
    this.chainText = this.track(this.ctx.label(this.ss.zx(cx), this.ss.zy(cy - cam.height * 0.32), '', {
      fontSize: `${this.ss.s(11)}px`, color: '#a3e635', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 5)) as Phaser.GameObjects.Text;
    this.feedback = this.track(this.ctx.label(this.ss.zx(cx), this.ss.zy(cy + cam.height * 0.27), 'WASD / ARROWS — RED RINGS WARN WHERE THE NEXT COUGH LANDS', {
      fontSize: `${this.ss.s(11)}px`, color: '#94a3b8', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 5)) as Phaser.GameObjects.Text;
    for (let i = 0; i < 4; i++) this.makeCarrier(i);
    for (let i = 0; i < this.config.hazardCount / 2; i++) this.makeTissue(i);
  }

  private bindControls(): void {
    const set = (key: string, pressed: boolean) => {
      if (['arrowleft', 'a'].includes(key)) this.direction.x = pressed ? -1 : (this.direction.x < 0 ? 0 : this.direction.x);
      if (['arrowright', 'd'].includes(key)) this.direction.x = pressed ? 1 : (this.direction.x > 0 ? 0 : this.direction.x);
      if (['arrowup', 'w'].includes(key)) this.direction.y = pressed ? -1 : (this.direction.y < 0 ? 0 : this.direction.y);
      if (['arrowdown', 's'].includes(key)) this.direction.y = pressed ? 1 : (this.direction.y > 0 ? 0 : this.direction.y);
    };
    this.keyDown = (event) => { set(event.key.toLowerCase(), true); };
    this.keyUp = (event) => { set(event.key.toLowerCase(), false); };
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
  }

  private spawnCough(): void {
    const infected = this.carriers.filter((person) => person.infected);
    const source = infected.length > 0 && Math.random() > 0.45 ? infected[Phaser.Math.Between(0, infected.length - 1)] : null;
    const sourceX = source?.x ?? 140;
    const sourceY = source?.y ?? 260;
    const prediction = Math.min(160, Phaser.Math.Distance.Between(sourceX, sourceY, this.player.x, this.player.y));
    const angle = Phaser.Math.Angle.Between(sourceX, sourceY, this.player.x, this.player.y) + Phaser.Math.FloatBetween(-0.38, 0.38);
    const x = Phaser.Math.Clamp(sourceX + Math.cos(angle) * prediction, 120, 800);
    const y = Phaser.Math.Clamp(sourceY + Math.sin(angle) * prediction, 190, 520);
    const radius = Phaser.Math.Between(38, 55);
    const object = this.track(this.ctx.add.circle(this.ss.zx(x), this.ss.zy(y), this.ss.s(radius), 0xef4444, 0.12)
      .setScrollFactor(0).setDepth(D + 2).setStrokeStyle(this.ss.s(3), 0xfb7185, 0.9)) as Phaser.GameObjects.Arc;
    this.clouds.push({ object, x, y, age: 0, telegraphMs: 720, activeMs: 1150, radius });
    this.ctx.tweens.add({ targets: object, scale: 1.18, yoyo: true, repeat: 1, duration: 180 });
  }

  private updateClouds(delta: number): void {
    for (let index = this.clouds.length - 1; index >= 0; index--) {
      const cloud = this.clouds[index];
      cloud.age += delta;
      if (cloud.age >= cloud.telegraphMs) {
        cloud.object.setFillStyle(0x84cc16, 0.62).setStrokeStyle(this.ss.s(2), 0xd9f99d, 0.85);
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, cloud.x, cloud.y);
        if (distance < cloud.radius + 12) return this.resolve('lose');
        if (distance < cloud.radius + 32 && cloud.age - delta < cloud.telegraphMs) {
          this.nearMisses++;
          this.combo++;
          this.feedback?.setText(`COUGH DODGED ×${this.combo}`).setColor('#86efac');
        }
      }
      if (cloud.age >= cloud.telegraphMs + cloud.activeMs) {
        cloud.object.destroy();
        this.clouds.splice(index, 1);
      }
    }
  }

  private makeCarrier(index: number): void {
    const x = 330 + index * 135;
    const y = index % 2 ? 280 : 420;
    const object = this.track(this.ctx.add.circle(this.ss.zx(x), this.ss.zy(y), this.ss.s(13), 0x64748b, 1)
      .setScrollFactor(0).setDepth(D + 3).setStrokeStyle(this.ss.s(2), 0xcbd5e1, 1)) as Phaser.GameObjects.Arc;
    const icon = this.track(this.ctx.label(this.ss.zx(x), this.ss.zy(y - 23), 'OK', {
      fontSize: `${this.ss.s(9)}px`, color: '#cbd5e1', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 4)) as Phaser.GameObjects.Text;
    this.carriers.push({ object, icon, x, y, vx: index % 2 ? 24 : -22, vy: index % 3 ? 18 : -16, infected: false });
  }

  private updateCarriers(dt: number): void {
    this.carriers.forEach((person) => {
      person.x += person.vx * dt;
      person.y += person.vy * dt;
      if (person.x < 260 || person.x > 790) person.vx *= -1;
      if (person.y < 220 || person.y > 500) person.vy *= -1;
      person.object.setPosition(this.ss.zx(person.x), this.ss.zy(person.y));
      person.icon.setPosition(this.ss.zx(person.x), this.ss.zy(person.y - 23));
      if (person.infected && Phaser.Math.Distance.Between(this.player.x, this.player.y, person.x, person.y) < 26) this.resolve('lose');
    });
  }

  private infectCarrier(): void {
    const person = this.carriers.find((candidate) => !candidate.infected);
    if (!person) return;
    person.infected = true;
    person.object.setFillStyle(0x65a30d).setStrokeStyle(this.ss.s(2), 0xd9f99d, 1);
    person.icon.setText('SICK').setColor('#bef264');
    this.feedback?.setText('ANOTHER PERSON HAS ACQUIRED SICK STATUS').setColor('#facc15');
    this.ctx.cameras.main.shake(100, 0.003);
  }

  private makeTissue(index: number): void {
    const x = 260 + ((index * 173) % 500);
    const y = 240 + ((index * 97) % 250);
    const object = this.track(this.ctx.add.rectangle(this.ss.zx(x), this.ss.zy(y), this.ss.s(24), this.ss.s(14), 0xf1f5f9, 0.85)
      .setScrollFactor(0).setDepth(D + 2).setAngle(index * 37)) as Phaser.GameObjects.Rectangle;
    this.tissues.push({ object, x, y });
  }

  private checkTissues(): void {
    if (this.tissues.some((tissue) => Phaser.Math.Distance.Between(this.player.x, this.player.y, tissue.x, tissue.y) < 20)) this.resolve('lose');
  }

  private resolve(outcome: 'win' | 'lose'): void {
    if (this.ended) return;
    this.ended = true;
    this.feedback?.setText(outcome === 'win' ? `${this.config.successText} — DID NOT SURVIVE THE FOLLOWING WEEK` : this.config.failureText)
      .setColor(outcome === 'win' ? '#86efac' : '#fca5a5');
    const callback = this.complete;
    const timer = this.ctx.time.delayedCall(800, () => callback?.({ outcome, data: { survivedMs: this.elapsed, nearMisses: this.nearMisses } }));
    this.timers.push(timer);
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.objects.push(object);
    return object;
  }
}

export const benHazardMode = new BenHazardMode();
export default benHazardMode;

import Phaser from 'phaser';
import type { GameMode, ModeContext, ModeResult } from '../types';
import { screenSpace, type ScreenSpace } from '../screenSpace';
import {
  ELECTRICAL_SEQUENCE,
  ROOF_REQUIRED,
  RUST_ESCAPE,
  clampMeter,
  exactSelection,
  nextSequenceStep,
  poolMissTier,
  type BenMemoryScenario,
} from './logic';

export interface BenMemoryGameModeConfig {
  scenario?: BenMemoryScenario;
  title?: string;
  prompt?: string;
  items?: string[];
  required?: string[];
  durationMs?: number;
  successText?: string;
  failureText?: string;
  /** Legacy config support for older chapter drafts. */
  kind?: 'selection' | 'timing';
  forcedOutcome?: 'win' | 'lose';
}

const D = 9600;

type Button = { box: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text };

export class BenMemoryGameMode {
  id = 'benMemoryGame';
  harnessForceComplete = (result: ModeResult = { outcome: 'win' }) => {
    this.resolve(result.outcome === 'lose' ? 'lose' : 'win');
  };

  private ctx!: ModeContext;
  private config!: BenMemoryGameModeConfig;
  private scenario: BenMemoryScenario = 'roofPlanner';
  private ss!: ScreenSpace;
  private complete: ((result: ModeResult) => void) | null = null;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private timers: Phaser.Time.TimerEvent[] = [];
  private listener?: (event: KeyboardEvent) => void;
  private keyUpListener?: (event: KeyboardEvent) => void;
  private ended = false;
  private elapsed = 0;
  private feedback: Phaser.GameObjects.Text | null = null;
  private status: Phaser.GameObjects.Text | null = null;

  private selected = new Set<string>();
  private rustProgress = 0;
  private volume = 18;
  private proximity = 0;
  private rustPhase: 'play' | 'escape' = 'play';
  private escapeStartedAt = 0;
  private sequenceStep = 0;
  private sequenceButtons: Button[] = [];
  private timingMarker = 0;
  private timingDirection = 1;
  private timingBar: Phaser.GameObjects.Rectangle | null = null;
  private poolPhase: 'snap' | 'shot' = 'snap';
  private poolChoices = new Set<number>();
  private poolSetupObjects: Phaser.GameObjects.GameObject[] = [];
  private charge = 0;
  private charging = false;
  private chargeBar: Phaser.GameObjects.Rectangle | null = null;

  preload(_ctx: ModeContext): void {}

  start(ctx: ModeContext, config: BenMemoryGameModeConfig, onComplete: (result: ModeResult) => void): void {
    this.ctx = ctx;
    this.config = config;
    this.scenario = config.scenario ?? (config.kind === 'timing' ? 'poolShot' : this.inferScenario(config.title));
    this.complete = onComplete;
    this.ss = screenSpace(ctx.cameras.main);
    this.objects = [];
    this.timers = [];
    this.selected.clear();
    this.elapsed = 0;
    this.ended = false;
    this.sequenceStep = 0;
    this.escapeStartedAt = 0;
    this.sequenceButtons = [];
    this.makeShell();

    if (this.scenario === 'roofPlanner') this.startRoofPlanner();
    else if (this.scenario === 'rustPanic') this.startRustPanic();
    else if (this.scenario === 'poolShot') this.startPoolShot();
    else this.startElectrical();
  }

  update(_time: number, delta: number): void {
    if (this.ended) return;
    this.elapsed += delta;
    if (this.scenario === 'rustPanic') this.updateRust(delta);
    if (this.scenario === 'poolShot') this.updatePool(delta);
    if (this.scenario === 'electrical') this.updateElectrical(delta);
    if (this.config.durationMs && this.elapsed >= this.config.durationMs) this.timeout();
  }

  teardown(): void {
    this.ended = true;
    if (this.listener) window.removeEventListener('keydown', this.listener);
    if (this.keyUpListener) window.removeEventListener('keyup', this.keyUpListener);
    this.listener = undefined;
    this.keyUpListener = undefined;
    this.timers.forEach((timer) => timer.remove(false));
    this.timers = [];
    this.objects.forEach((object) => {
      try {
        this.ctx.tweens.killTweensOf(object);
        object.destroy();
      } catch { /* scene shutdown */ }
    });
    this.objects = [];
    this.complete = null;
    this.feedback = null;
    this.status = null;
    this.timingBar = null;
    this.chargeBar = null;
  }

  private inferScenario(title = ''): BenMemoryScenario {
    if (title.includes('LOCK')) return 'rustPanic';
    if (title.includes('COLLEEN')) return 'poolShot';
    if (title.includes('ELECTRICAL')) return 'electrical';
    return 'roofPlanner';
  }

  private makeShell(): void {
    const cam = this.ctx.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    this.track(this.ctx.add.rectangle(this.ss.zx(cx), this.ss.zy(cy), this.ss.s(cam.width * 2), this.ss.s(cam.height * 2), 0x080d14, 1)
      .setScrollFactor(0).setDepth(D));
    this.track(this.ctx.label(this.ss.zx(cx), this.ss.zy(cy - cam.height * 0.42), this.config.title ?? 'BEN OPERATION', {
      fontSize: `${this.ss.s(21)}px`, color: '#facc15', fontStyle: 'bold', stroke: '#000000', strokeThickness: this.ss.s(4),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 3));
    this.track(this.ctx.label(this.ss.zx(cx), this.ss.zy(cy - cam.height * 0.34), this.config.prompt ?? '', {
      fontSize: `${this.ss.s(13)}px`, color: '#cbd5e1', align: 'center', wordWrap: { width: this.ss.s(cam.width * 0.82) },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 3));
    this.feedback = this.track(this.ctx.label(this.ss.zx(cx), this.ss.zy(cy + cam.height * 0.38), '', {
      fontSize: `${this.ss.s(13)}px`, color: '#94a3b8', align: 'center', fontStyle: 'bold',
      wordWrap: { width: this.ss.s(cam.width * 0.86) },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 4)) as Phaser.GameObjects.Text;
  }

  private startRoofPlanner(): void {
    const cam = this.ctx.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    const items = this.config.items ?? ['Screwdriver', 'Spare key', 'Crowbar', ...ROOF_REQUIRED];
    this.status = this.track(this.ctx.label(this.ss.zx(cx), this.ss.zy(cy - cam.height * 0.24), 'OPERATION SLOTS: 0 / 3', {
      fontSize: `${this.ss.s(13)}px`, color: '#86efac', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 3)) as Phaser.GameObjects.Text;
    items.forEach((item, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = cx + (col - 1) * 190;
      const y = cy - 48 + row * 72;
      const button = this.makeButton(x, y, 168, 52, item, () => {
        if (!ROOF_REQUIRED.includes(item as typeof ROOF_REQUIRED[number])) {
          this.feedback?.setText(`BEN: “${item}? That’s not gonna work, dude.”`).setColor('#fca5a5');
          this.shake(button.box);
          return;
        }
        if (this.selected.has(item)) this.selected.delete(item); else this.selected.add(item);
        const active = this.selected.has(item);
        button.box.setFillStyle(active ? 0x166534 : 0x1e293b);
        button.box.setStrokeStyle(this.ss.s(2), active ? 0x4ade80 : 0x64748b, 1);
        button.text.setColor(active ? '#dcfce7' : '#e2e8f0');
        this.status?.setText(`OPERATION SLOTS: ${this.selected.size} / 3`);
        this.feedback?.setText(active ? `${item.toUpperCase()} ATTACHED TO PLAN` : `${item.toUpperCase()} REMOVED`).setColor('#86efac');
      });
    });
    this.makeButton(cx, cy + 130, 190, 42, 'EXECUTE OPERATION', () => {
      const required = this.config.required ?? [...ROOF_REQUIRED];
      if (exactSelection(this.selected, required)) this.resolve('win', { selected: [...this.selected] });
      else {
        this.feedback?.setText('The plan is not unreasonable enough yet.').setColor('#fca5a5');
        this.ctx.cameras.main.shake(100, 0.003);
      }
    }, 0x92400e);
    this.feedback?.setText('Sensible tools will be reviewed and rejected.');
  }

  private startRustPanic(): void {
    const cam = this.ctx.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    this.rustProgress = 8;
    this.volume = 18;
    this.proximity = 0;
    this.rustPhase = 'play';
    this.status = this.track(this.ctx.label(this.ss.zx(cx), this.ss.zy(cy - cam.height * 0.24), '', {
      fontSize: `${this.ss.s(13)}px`, color: '#e2e8f0', align: 'left', lineSpacing: this.ss.s(7),
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(D + 3)) as Phaser.GameObjects.Text;
    const actions = [
      { label: '1  MINE', rust: 8, volume: 7 },
      { label: '2  SHOOT', rust: 15, volume: 18 },
      { label: '3  SHOUT CALLOUT', rust: 11, volume: 28 },
      { label: '4  MUTE MIC', rust: -2, volume: -34 },
    ];
    actions.forEach((action, index) => this.makeButton(cx + (index - 1.5) * 145, cy + 72, 130, 46, action.label, () => {
      if (this.rustPhase !== 'play') return;
      this.rustProgress = clampMeter(this.rustProgress + action.rust);
      this.volume = clampMeter(this.volume + action.volume);
      this.feedback?.setText(action.volume > 20 ? 'BEN HAS FORGOTTEN HE HAS A BEDROOM DOOR' : action.label.replace(/^\[.\] /, '')).setColor(action.volume > 20 ? '#fb7185' : '#86efac');
      try { this.ctx.sound.play('ui_select'); } catch { /* optional */ }
    }));
    this.listener = (event) => {
      const index = Number(event.key) - 1;
      if (this.rustPhase === 'play' && index >= 0 && index < actions.length) {
        const action = actions[index];
        this.rustProgress = clampMeter(this.rustProgress + action.rust);
        this.volume = clampMeter(this.volume + action.volume);
      } else if (this.rustPhase === 'escape') {
        const escapeIndex = ['q', 'w', 'e', 'r'].indexOf(event.key.toLowerCase());
        if (escapeIndex >= 0) this.chooseEscape(escapeIndex);
      }
    };
    window.addEventListener('keydown', this.listener);
    this.feedback?.setText('Make Rust progress. Keep the house from learning about it.');
  }

  private updateRust(delta: number): void {
    if (this.rustPhase === 'play') {
      const dt = delta / 1000;
      this.volume = clampMeter(this.volume - 5 * dt);
      this.proximity = clampMeter(this.proximity + (5.2 + this.volume * 0.105) * dt);
      this.status?.setText(
        `RUST PROGRESS     ${this.meter(this.rustProgress)} ${Math.round(this.rustProgress)}%\n` +
        `BEN’S VOLUME      ${this.meter(this.volume)} ${Math.round(this.volume)}%\n` +
        `MICHAEL PROXIMITY ${this.meter(this.proximity)} ${Math.round(this.proximity)}%`,
      );
      if (this.proximity >= 100) this.beginEscape();
      return;
    }
    const remaining = Math.max(0, 9000 - (this.elapsed - this.escapeStartedAt));
    this.status?.setText(`DOOR HANDLE MOVING  ${Math.max(0, remaining / 1000).toFixed(1)}s\nCOMBO: ${this.sequenceStep}/4`);
    if (remaining <= 0) this.resolve('lose', { rustProgress: Math.round(this.rustProgress), caughtAtStep: this.sequenceStep });
  }

  private beginEscape(): void {
    if (this.rustPhase === 'escape') return;
    this.rustPhase = 'escape';
    this.escapeStartedAt = this.elapsed;
    this.feedback?.setText('MICHEAL IS PICKING MY LOCK — Q W E R!').setColor('#facc15');
    this.ctx.cameras.main.shake(180, 0.006);
    const cam = this.ctx.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    this.sequenceButtons = RUST_ESCAPE.map((label, index) => this.makeButton(
      cx + (index - 1.5) * 150, cy + 150, 138, 48, `${'QWER'[index]}  ${label}`, () => this.chooseEscape(index), 0x7f1d1d,
    ));
  }

  private chooseEscape(index: number): void {
    if (this.rustPhase !== 'escape' || this.ended) return;
    const result = nextSequenceStep(RUST_ESCAPE, this.sequenceStep, RUST_ESCAPE[index]);
    this.sequenceStep = result.completed;
    if (result.correct) {
      this.sequenceButtons[index]?.box.setFillStyle(0x166534);
      this.sequenceButtons[index]?.text.setColor('#dcfce7');
      this.feedback?.setText(`${RUST_ESCAPE[index].toUpperCase()} ✓`).setColor('#86efac');
    } else {
      this.feedback?.setText('WRONG ORDER — BEN GETS TANGLED IN THE HEADSET').setColor('#fca5a5');
      this.ctx.cameras.main.shake(90, 0.004);
    }
    if (result.done) this.resolve('win', { rustProgress: Math.round(this.rustProgress) });
  }

  private startPoolShot(): void {
    const cam = this.ctx.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    this.poolPhase = 'snap';
    this.poolChoices.clear();
    this.poolSetupObjects = [];
    this.status = this.track(this.ctx.label(this.ss.zx(cx), this.ss.zy(cy - 110), 'COLLEEN RESPONSE MODEL — 0 / 3 VARIABLES OPTIMIZED', {
      fontSize: `${this.ss.s(14)}px`, color: '#e2e8f0', align: 'center', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 3)) as Phaser.GameObjects.Text;
    const rows = [
      ['REPLY DELAY', ['NOW', '3 HOURS', 'NEXT FISCAL QUARTER']],
      ['FACE VISIBLE', ['100%', '2%', 'ONE CONCERNED EYE']],
      ['CAPTION', ['HEY', 'NO CAPTION', 'CEILING PHOTO']],
    ] as const;
    rows.forEach(([label, options], row) => {
      this.poolSetupObjects.push(this.track(this.ctx.label(this.ss.zx(cx - 300), this.ss.zy(cy - 35 + row * 68), label, {
        fontSize: `${this.ss.s(10)}px`, color: '#c4b5fd', fontStyle: 'bold',
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 3)));
      options.forEach((option, col) => {
        const button = this.makeButton(cx - 90 + col * 175, cy - 35 + row * 68, 160, 44, option, () => {
          if (this.poolChoices.has(row) || this.poolPhase !== 'snap') return;
          this.poolChoices.add(row);
          button.box.setFillStyle(0x166534);
          button.text.setColor('#dcfce7');
          this.status?.setText(`COLLEEN RESPONSE MODEL — ${this.poolChoices.size} / 3 VARIABLES OPTIMIZED`);
          const replies = ['Colleen sends a ceiling.', 'Colleen sends 2% more face than last time.', 'Colleen sends a darker ceiling.'];
          this.feedback?.setText(replies[row]).setColor('#facc15');
          if (this.poolChoices.size === rows.length) {
            this.poolPhase = 'shot';
            this.feedback?.setText('ANALYSIS COMPLETE. COLLEEN INTEREST: STATISTICALLY UNCHANGED.').setColor('#facc15');
            const timer = this.ctx.time.delayedCall(800, () => this.buildPoolTiming());
            this.timers.push(timer);
          }
        }, 0x312e81);
        this.poolSetupObjects.push(button.box, button.text);
      });
    });
    this.feedback?.setText('Optimize a response to an image containing almost no information.');
  }

  private buildPoolTiming(): void {
    this.poolSetupObjects.forEach((object) => {
      try { object.destroy(); } catch { /* already destroyed */ }
      const index = this.objects.indexOf(object);
      if (index >= 0) this.objects.splice(index, 1);
    });
    this.poolSetupObjects = [];
    const cam = this.ctx.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    this.config.prompt = 'Hit this pool ball for Colleen.';
    this.status?.setText('COLLEEN INTEREST: 0.0%\nCINEMATIC IMPORTANCE: 100%');
    this.track(this.ctx.add.rectangle(this.ss.zx(cx), this.ss.zy(cy + 30), this.ss.s(520), this.ss.s(18), 0x1e293b, 1)
      .setScrollFactor(0).setDepth(D + 2).setStrokeStyle(this.ss.s(2), 0x94a3b8, 1));
    this.track(this.ctx.add.rectangle(this.ss.zx(cx), this.ss.zy(cy + 30), this.ss.s(54), this.ss.s(30), 0x16a34a, 0.45)
      .setScrollFactor(0).setDepth(D + 2));
    this.timingBar = this.track(this.ctx.add.rectangle(this.ss.zx(cx - 250), this.ss.zy(cy + 30), this.ss.s(8), this.ss.s(40), 0xfacc15, 1)
      .setScrollFactor(0).setDepth(D + 4)) as Phaser.GameObjects.Rectangle;
    this.makeButton(cx, cy + 120, 180, 46, 'TAKE THE SHOT', () => this.takePoolShot(), 0x7c3aed);
    this.listener = (event) => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        this.takePoolShot();
      }
    };
    window.addEventListener('keydown', this.listener);
    this.feedback?.setText('Stop the marker in the green. This cannot save the ball.');
  }

  private updatePool(delta: number): void {
    if (this.poolPhase !== 'shot' || !this.timingBar) return;
    this.timingMarker += this.timingDirection * delta * 0.00065;
    if (this.timingMarker >= 1 || this.timingMarker <= 0) {
      this.timingMarker = Phaser.Math.Clamp(this.timingMarker, 0, 1);
      this.timingDirection *= -1;
    }
    const cam = this.ctx.cameras.main;
    this.timingBar?.setX(this.ss.zx(cam.width / 2 - 250 + this.timingMarker * 500));
  }

  private takePoolShot(): void {
    if (this.ended || this.poolPhase !== 'shot') return;
    const tier = poolMissTier(this.timingMarker);
    const copy = tier === 'tragic'
      ? 'PERFECT TIMING. THE CUE PASSES 2MM ABOVE THE BALL.'
      : tier === 'spectacular'
        ? 'THE CUE CLEARS THE BALL AND MOST OF THE TABLE.'
        : 'THE CUE NEARLY LEAVES BEN’S HANDS. THE BALL REMAINS SAFE.';
    this.feedback?.setText(copy).setColor('#facc15');
    this.ctx.cameras.main.shake(tier === 'historic' ? 260 : 120, tier === 'historic' ? 0.012 : 0.004);
    this.resolve('lose', { missTier: tier }, 900);
  }

  private startElectrical(): void {
    const cam = this.ctx.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    this.sequenceStep = 0;
    this.charge = 0;
    const colors = [0x334155, 0x7c2d12, 0x3f3f46, 0x1f2937];
    ELECTRICAL_SEQUENCE.forEach((label, index) => {
      this.makeButton(cx + (index - 1.5) * 155, cy - 5, 142, 60, `${index + 1}. ${label}`, () => this.chooseElectrical(label), colors[index]);
    });
    this.status = this.track(this.ctx.label(this.ss.zx(cx), this.ss.zy(cy - 100), 'CIRCUIT: 0 / 4\nSUBSTITUTE ATTENTION: 0%', {
      fontSize: `${this.ss.s(14)}px`, color: '#e2e8f0', align: 'center', lineSpacing: this.ss.s(8),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 3)) as Phaser.GameObjects.Text;
    this.track(this.ctx.add.rectangle(this.ss.zx(cx), this.ss.zy(cy + 105), this.ss.s(360), this.ss.s(14), 0x1e293b, 1)
      .setScrollFactor(0).setDepth(D + 2));
    this.chargeBar = this.track(this.ctx.add.rectangle(this.ss.zx(cx - 180), this.ss.zy(cy + 105), 1, this.ss.s(14), 0xfacc15, 1)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 3)) as Phaser.GameObjects.Rectangle;
    this.listener = (event) => {
      if ((event.key === ' ' || event.key === 'Enter') && this.sequenceStep === ELECTRICAL_SEQUENCE.length) {
        event.preventDefault();
        this.charging = true;
      }
    };
    this.keyUpListener = (event) => {
      if (event.key === ' ' || event.key === 'Enter') this.charging = false;
    };
    window.addEventListener('keydown', this.listener);
    window.addEventListener('keyup', this.keyUpListener);
    this.feedback?.setText('Connect the apparatus in order. What could go wrong?');
  }

  private chooseElectrical(label: string): void {
    if (this.sequenceStep >= ELECTRICAL_SEQUENCE.length || this.ended) return;
    const result = nextSequenceStep(ELECTRICAL_SEQUENCE, this.sequenceStep, label);
    this.sequenceStep = result.completed;
    this.status?.setText(`CIRCUIT: ${this.sequenceStep} / 4\nSUBSTITUTE ATTENTION: 0%`);
    if (result.correct) {
      this.feedback?.setText(`${label.toUpperCase()} CONNECTED — ${this.sequenceStep === 2 ? 'SPARKS!' : 'CURRENT PATH EXTENDED'}`).setColor('#86efac');
      if (this.sequenceStep >= 2) this.spark();
    } else {
      this.feedback?.setText('WRONG CONTACT — THE GRAPHITE SNAPS. BEN FINDS ANOTHER PENCIL.').setColor('#fca5a5');
      this.ctx.cameras.main.shake(120, 0.006);
    }
    if (result.done) this.feedback?.setText('HOLD SPACE / ENTER INSIDE THE GLOW ZONE').setColor('#facc15');
  }

  private updateElectrical(delta: number): void {
    if (this.sequenceStep !== ELECTRICAL_SEQUENCE.length) return;
    const dt = delta / 1000;
    this.charge = clampMeter(this.charge + (this.charging ? 32 : -16) * dt);
    const width = 360 * this.charge / 100;
    this.chargeBar?.setSize(this.ss.s(Math.max(1, width)), this.ss.s(14));
    this.chargeBar?.setFillStyle(this.charge > 72 ? 0xffffff : this.charge > 45 ? 0xfacc15 : 0xf97316);
    this.status?.setText(`GRAPHITE BRIGHTNESS: ${Math.round(this.charge)}%\nSUBSTITUTE ATTENTION: 0%`);
    if (this.charge > 45 && Math.random() < 0.08) this.spark();
    if (this.charge >= 100) this.resolve('win', { brightness: 100 });
  }

  private spark(): void {
    const cam = this.ctx.cameras.main;
    const cx = cam.width / 2 + Phaser.Math.Between(-80, 80);
    const cy = cam.height / 2 + 75 + Phaser.Math.Between(-16, 16);
    const spark = this.track(this.ctx.add.star(this.ss.zx(cx), this.ss.zy(cy), 5, this.ss.s(2), this.ss.s(10), 0xffffff, 1)
      .setScrollFactor(0).setDepth(D + 5));
    this.ctx.tweens.add({ targets: spark, alpha: 0, scale: 2.2, duration: 180 });
  }

  private timeout(): void {
    if (this.scenario === 'roofPlanner') {
      ROOF_REQUIRED.forEach((item) => this.selected.add(item));
      this.resolve('win', { autoFilled: true, selected: [...this.selected] });
    } else if (this.scenario === 'poolShot') this.takePoolShot();
    else this.resolve('lose', { timedOut: true });
  }

  private resolve(outcome: 'win' | 'lose', data: Record<string, unknown> = {}, delay = 650): void {
    if (this.ended) return;
    this.ended = true;
    this.charging = false;
    const success = this.config.successText ?? (this.scenario === 'electrical' ? 'EXPERIMENT COMPLETE — ADULT INTERVENTION: NONE' : 'OPERATION COMPLETE');
    const failure = this.config.failureText ?? 'BEN COMMITS TO THE FAILURE';
    if (this.scenario !== 'poolShot') this.feedback?.setText(outcome === 'win' ? success : failure).setColor(outcome === 'win' ? '#86efac' : '#fca5a5');
    const callback = this.complete;
    const timer = this.ctx.time.delayedCall(delay, () => callback?.({ outcome, data: { scenario: this.scenario, ...data } }));
    this.timers.push(timer);
  }

  private makeButton(x: number, y: number, width: number, height: number, label: string, onClick: () => void, color = 0x1e293b): Button {
    const box = this.track(this.ctx.add.rectangle(this.ss.zx(x), this.ss.zy(y), this.ss.s(width), this.ss.s(height), color, 1)
      .setScrollFactor(0).setDepth(D + 2).setStrokeStyle(this.ss.s(2), 0x64748b, 1).setInteractive({ useHandCursor: true }));
    const text = this.track(this.ctx.label(this.ss.zx(x), this.ss.zy(y), label, {
      fontSize: `${this.ss.s(11)}px`, color: '#e2e8f0', align: 'center', fontStyle: 'bold', wordWrap: { width: this.ss.s(width - 12) },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 3));
    box.on('pointerover', () => box.setStrokeStyle(this.ss.s(2), 0xfacc15, 1));
    box.on('pointerout', () => box.setStrokeStyle(this.ss.s(2), 0x64748b, 1));
    box.on('pointerdown', onClick);
    return { box, text };
  }

  private meter(value: number): string {
    const filled = Math.round(value / 10);
    return `${'#'.repeat(filled)}${'-'.repeat(10 - filled)}`;
  }

  private shake(object: Phaser.GameObjects.Rectangle): void {
    const originalX = object.x;
    this.ctx.tweens.add({ targets: object, x: originalX + this.ss.s(5), yoyo: true, repeat: 3, duration: 35 });
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.objects.push(object);
    return object;
  }
}

export const benMemoryGameMode: GameMode<BenMemoryGameModeConfig> = new BenMemoryGameMode();
export default benMemoryGameMode;

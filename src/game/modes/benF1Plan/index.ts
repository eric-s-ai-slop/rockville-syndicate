import Phaser from 'phaser';
import type { GameMode, ModeContext, ModeResult } from '../types';
import { screenSpace, type ScreenSpace } from '../screenSpace';
import { allocatedTotal } from './logic';
import CAREER_PLAN_URL from '../../../assets/chapters/bens_life/minigames/f1/career-plan-room.png';

export interface BenF1PlanStep {
  prompt: string;
  options: string[];
  reveal: string;
}

export interface BenF1PlanModeConfig {
  title?: string;
  /** Retained for typed compatibility; the full presentation now owns its five canonical stages. */
  steps?: BenF1PlanStep[];
}

const D = 9600;
const CAREER_PLAN_KEY = 'ben_f1_career_plan_room';
type Phase = 'neck' | 'budget' | 'bridge' | 'equipment' | 'dubai';

export class BenF1PlanMode implements GameMode<BenF1PlanModeConfig> {
  id = 'benF1Plan';
  capturesPlayerMovement = true;
  harnessForceComplete = (_result: ModeResult = { outcome: 'win' }) => this.resolve();

  private ctx!: ModeContext;
  private complete: ((result: ModeResult) => void) | null = null;
  private ss!: ScreenSpace;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private phaseObjects: Phaser.GameObjects.GameObject[] = [];
  private timers: Phaser.Time.TimerEvent[] = [];
  private keyDown?: (event: KeyboardEvent) => void;
  private keyUp?: (event: KeyboardEvent) => void;
  private ended = false;
  private phase: Phase = 'neck';
  private phaseElapsed = 0;
  private balance = 0;
  private balanceInput = 0;
  private balanceMarker: Phaser.GameObjects.Rectangle | null = null;
  private progress: Phaser.GameObjects.Text | null = null;
  private prompt: Phaser.GameObjects.Text | null = null;
  private reveal: Phaser.GameObjects.Text | null = null;
  private controlHint: Phaser.GameObjects.Text | null = null;
  private stageDots: Phaser.GameObjects.Arc[] = [];
  private allocated = new Set<string>();
  private equipmentIndex = 0;
  private phaseLocked = false;
  private playerMoves = true;

  preload(ctx: ModeContext): void {
    if (!ctx.textures.exists(CAREER_PLAN_KEY)) ctx.physics.scene.load.image(CAREER_PLAN_KEY, CAREER_PLAN_URL);
  }

  start(ctx: ModeContext, config: BenF1PlanModeConfig | undefined, onComplete: (result: ModeResult) => void): void {
    this.ctx = ctx;
    this.complete = onComplete;
    this.ss = screenSpace(ctx.cameras.main);
    this.objects = [];
    this.phaseObjects = [];
    this.timers = [];
    this.stageDots = [];
    this.ended = false;
    this.playerMoves = this.ctx.player.body?.moves ?? true;
    this.ctx.player.setVelocity(0, 0);
    this.ctx.player.body.moves = false;
    this.makeShell(config?.title ?? 'THE BRIDGE-BORN CHAMPION');
    this.bindControls();
    this.startNeck();
  }

  update(time: number, delta: number): void {
    if (this.ended || this.phase !== 'neck') return;
    this.phaseElapsed += delta;
    const pull = Math.sin(time * 0.0031) * 34 + Math.sin(time * 0.0067) * 13;
    this.balance += (pull + this.balanceInput * 62) * delta / 1000;
    this.balance *= Math.pow(0.992, delta / 16.67);
    this.balance = Phaser.Math.Clamp(this.balance, -100, 100);
    const cam = this.ctx.cameras.main;
    this.balanceMarker?.setX(this.ss.zx(cam.width / 2 + this.balance * 2.15));
    if (Math.abs(this.balance) > 88) {
      this.balance *= -0.35;
      this.reveal?.setText('BEN’S HEAD HAS BEEN AERODYNAMICALLY CORRECTED.').setColor('#fb7185');
      this.ctx.cameras.main.shake(120, 0.005);
    }
    const remaining = Math.max(0, 7 - this.phaseElapsed / 1000);
    this.prompt?.setText(`KEEP BEN’S NECK CENTERED — ${remaining.toFixed(1)}s`);
    if (remaining <= 0 && !this.phaseLocked) {
      this.phaseLocked = true;
      this.reveal?.setText('G-FORCE TRAINING: CERTIFIED BY BEN').setColor('#86efac');
      this.after(700, () => this.startBudget());
    }
  }

  teardown(): void {
    this.ended = true;
    if (this.ctx?.player?.body) {
      this.ctx.player.setVelocity(0, 0);
      this.ctx.player.body.moves = this.playerMoves;
    }
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
    this.phaseObjects = [];
    this.complete = null;
  }

  private makeShell(title: string): void {
    const cam = this.ctx.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    this.track(this.ctx.add.rectangle(this.ss.zx(cx), this.ss.zy(cy), this.ss.s(cam.width * 2), this.ss.s(cam.height * 2), 0x171229, 1)
      .setScrollFactor(0).setDepth(D));
    this.track(this.ctx.add.image(this.ss.zx(cx), this.ss.zy(cy + 40), CAREER_PLAN_KEY)
      .setDisplaySize(this.ss.s(cam.width), this.ss.s(Math.min(cam.height, cam.width * 941 / 1672)))
      .setScrollFactor(0).setDepth(D + 1));
    this.track(this.ctx.add.rectangle(this.ss.zx(cx), this.ss.zy(cy), this.ss.s(cam.width), this.ss.s(cam.height), 0x0f071d, 0.46)
      .setScrollFactor(0).setDepth(D + 2));
    this.track(this.ctx.add.rectangle(this.ss.zx(cx), this.ss.zy(cy - cam.height * 0.39), this.ss.s(cam.width), this.ss.s(cam.height * 0.2), 0x090512, 0.9)
      .setScrollFactor(0).setDepth(D + 3));
    this.track(this.ctx.label(this.ss.zx(cx), this.ss.zy(cy - cam.height * 0.43), title, {
      fontSize: `${this.ss.s(21)}px`, color: '#facc15', fontStyle: 'bold', stroke: '#000000', strokeThickness: this.ss.s(4),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 5));
    this.progress = this.track(this.ctx.label(this.ss.zx(cx), this.ss.zy(cy - cam.height * 0.34), '', {
      fontSize: `${this.ss.s(11)}px`, color: '#c4b5fd', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 5)) as Phaser.GameObjects.Text;
    this.prompt = this.track(this.ctx.label(this.ss.zx(cx), this.ss.zy(cy - cam.height * 0.25), '', {
      fontSize: `${this.ss.s(15)}px`, color: '#f8fafc', align: 'center', fontStyle: 'bold', wordWrap: { width: this.ss.s(cam.width * 0.84) },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 5)) as Phaser.GameObjects.Text;
    this.reveal = this.track(this.ctx.label(this.ss.zx(cx), this.ss.zy(cy + cam.height * 0.36), '', {
      fontSize: `${this.ss.s(13)}px`, color: '#86efac', align: 'center', fontStyle: 'bold', wordWrap: { width: this.ss.s(cam.width * 0.84) },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 5)) as Phaser.GameObjects.Text;
    this.controlHint = this.track(this.ctx.label(this.ss.zx(cx), this.ss.zy(cy + cam.height * 0.27), '', {
      fontSize: `${this.ss.s(12)}px`, color: '#fef08a', align: 'center', fontStyle: 'bold',
      stroke: '#090512', strokeThickness: this.ss.s(5),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 6)) as Phaser.GameObjects.Text;
    for (let i = 0; i < 5; i++) {
      this.stageDots.push(this.track(this.ctx.add.circle(this.ss.zx(cx + (i - 2) * 34), this.ss.zy(cy - cam.height * 0.29), this.ss.s(6), 0x6d28d9, 1)
        .setScrollFactor(0).setDepth(D + 6).setStrokeStyle(this.ss.s(2), 0xc4b5fd, 0.8)) as Phaser.GameObjects.Arc);
    }
  }

  private bindControls(): void {
    const set = (key: string, pressed: boolean) => {
      if (!['arrowleft', 'a', 'arrowright', 'd'].includes(key)) return;
      const direction = ['arrowleft', 'a'].includes(key) ? -1 : 1;
      if (pressed) this.balanceInput = direction;
      else if (this.balanceInput === direction) this.balanceInput = 0;
    };
    this.keyDown = (event) => set(event.key.toLowerCase(), true);
    this.keyUp = (event) => set(event.key.toLowerCase(), false);
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
  }

  private startNeck(): void {
    this.setPhase('neck', 1, 'G-FORCE TRAINING');
    this.phaseElapsed = 0;
    this.balance = 0;
    const cam = this.ctx.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    this.phaseTrack(this.ctx.add.rectangle(this.ss.zx(cx), this.ss.zy(cy + 30), this.ss.s(470), this.ss.s(18), 0x312e81, 1)
      .setScrollFactor(0).setDepth(D + 2).setStrokeStyle(this.ss.s(2), 0x8b5cf6, 1));
    this.phaseTrack(this.ctx.add.rectangle(this.ss.zx(cx), this.ss.zy(cy + 30), this.ss.s(72), this.ss.s(32), 0x16a34a, 0.5)
      .setScrollFactor(0).setDepth(D + 2));
    this.balanceMarker = this.phaseTrack(this.ctx.add.rectangle(this.ss.zx(cx), this.ss.zy(cy + 30), this.ss.s(10), this.ss.s(48), 0xfacc15, 1)
      .setScrollFactor(0).setDepth(D + 4)) as Phaser.GameObjects.Rectangle;
    this.phaseTrack(this.ctx.label(this.ss.zx(cx), this.ss.zy(cy + 95), 'A / D OR ← / → — RESIST THE BANDS', {
      fontSize: `${this.ss.s(11)}px`, color: '#cbd5e1', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 4));
    this.controlHint?.setText('HOLD A / D OR ← / → TO PUSH THE YELLOW MARKER INTO THE GREEN CENTER');
    this.reveal?.setText('Ben has attached resistance bands directly to his head.').setColor('#c4b5fd');
  }

  private startBudget(): void {
    this.setPhase('budget', 2, 'THE $15 / HOUR BUDGET');
    this.allocated.clear();
    this.prompt?.setText('Fund Ben’s racing career. Summer budget: $3,600.');
    this.controlHint?.setText('CLICK ANY THREE EXPENSES');
    this.reveal?.setText('Select three necessities. Ben will resolve any arithmetic conflict.').setColor('#c4b5fd');
    const cam = this.ctx.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    const entries = [
      ['FOOD', 800], ['HOUSING', 2000], ['TRANSPORT', 1000], ['RACING SUIT', 1200], ['KART', 7000],
    ] as const;
    entries.forEach(([label, cost], index) => {
      const button = this.makeButton(cx + (index - 2) * 145, cy + 35, 132, 58, `${label}\n$${cost.toLocaleString()}`, () => {
        if (this.allocated.has(label)) return;
        this.allocated.add(label);
        button.setFillStyle(0x166534);
        const total = allocatedTotal(entries.map(([name, cost]) => ({ name, cost })), this.allocated);
        this.reveal?.setText(`ALLOCATED: $${total.toLocaleString()} / $3,600`).setColor(total > 3600 ? '#fb7185' : '#86efac');
        if (this.allocated.size >= 3 && !this.phaseLocked) {
          this.phaseLocked = true;
          this.prompt?.setText('BUDGET DOES NOT BALANCE');
          this.reveal?.setText('BEN REMOVES HOUSING FROM THE BUDGET. PROBLEM SOLVED.').setColor('#facc15');
          this.after(900, () => this.startBridge());
        }
      });
    });
  }

  private startBridge(): void {
    this.setPhase('bridge', 3, 'BRIDGE HOUSING');
    this.prompt?.setText('Choose the least impossible place for Ben’s sleeping bag.');
    this.controlHint?.setText('CLICK ONE SLEEPING LOCATION');
    this.reveal?.setText('Every available location is beneath active infrastructure.').setColor('#c4b5fd');
    const cam = this.ctx.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    this.phaseTrack(this.ctx.add.rectangle(this.ss.zx(cx), this.ss.zy(cy - 15), this.ss.s(680), this.ss.s(42), 0x64748b, 1)
      .setScrollFactor(0).setDepth(D + 2));
    const zones = [
      ['HIGHWAY RUNOFF', 'DAMP, BUT FREE'], ['DIRECTLY UNDER TRAFFIC', 'EXCELLENT ACCESS TO RACING'], ['MYSTERY CONCRETE', 'HOUSING PROBLEM: SOLVED'],
    ] as const;
    zones.forEach(([label, result], index) => this.makeButton(cx + (index - 1) * 220, cy + 78, 200, 62, label, () => {
      if (this.phaseLocked) return;
      this.phaseLocked = true;
      this.prompt?.setText('SLEEPING BAG PLACED');
      this.reveal?.setText(`${result}. HOUSING PROBLEM: SOLVED.`).setColor('#facc15');
      this.ctx.cameras.main.shake(100, 0.003);
      this.after(850, () => this.startEquipment());
    }, 0x334155));
  }

  private startEquipment(): void {
    this.setPhase('equipment', 4, 'EQUIPMENT UNBOXING');
    this.equipmentIndex = 0;
    this.prompt?.setText('Open Ben’s first professional racing purchase.');
    this.controlHint?.setText('CLICK THE EQUIPMENT CRATE FOUR TIMES');
    this.reveal?.setText('The box is suspiciously kart-shaped only in Ben’s imagination.').setColor('#c4b5fd');
    const cam = this.ctx.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    const crate = this.makeButton(cx, cy + 40, 300, 130, 'CLICK TO OPEN\nRACING EQUIPMENT', () => {
      const reveals = ['RACING SUIT ✓', 'GLOVES ✓', 'HELMET, POSSIBLY ✓', 'KART: NOT FOUND'];
      const copy = reveals[Math.min(this.equipmentIndex, reveals.length - 1)];
      crate.setText(copy);
      this.reveal?.setText(copy === 'KART: NOT FOUND' ? 'BEN: “THE KART COMES LATER.”' : 'A professional-looking object has appeared.').setColor(copy.includes('NOT') ? '#facc15' : '#86efac');
      this.equipmentIndex++;
      if (this.equipmentIndex >= reveals.length && !this.phaseLocked) {
        this.phaseLocked = true;
        this.after(900, () => this.startDubai());
      }
    }, 0x7c2d12);
  }

  private startDubai(): void {
    this.setPhase('dubai', 5, 'DESTINATION: DUBAI');
    this.prompt?.setText('Ask how any of this leads to Formula One.');
    this.controlHint?.setText('CLICK “WHEN DOES DUBAI HAPPEN?”');
    this.reveal?.setText('Ben has prepared a complete answer.').setColor('#c4b5fd');
    const cam = this.ctx.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    this.phaseTrack(this.ctx.add.circle(this.ss.zx(cx + 245), this.ss.zy(cy - 5), this.ss.s(58), 0xfacc15, 0.9)
      .setScrollFactor(0).setDepth(D + 1));
    this.makeButton(cx, cy + 75, 320, 58, 'WHEN DOES DUBAI HAPPEN?', () => {
      if (this.phaseLocked) return;
      this.phaseLocked = true;
      this.clearPhase();
      const water = this.phaseTrack(this.ctx.add.rectangle(this.ss.zx(cx), this.ss.zy(cy + 85), this.ss.s(cam.width), this.ss.s(170), 0x0284c7, 1)
        .setScrollFactor(0).setDepth(D + 1));
      const yacht = this.phaseTrack(this.ctx.add.rectangle(this.ss.zx(-100), this.ss.zy(cy + 30), this.ss.s(250), this.ss.s(55), 0xf8fafc, 1)
        .setScrollFactor(0).setDepth(D + 3));
      this.ctx.tweens.add({ targets: yacht, x: this.ss.zx(cx), duration: 900, ease: 'Cubic.Out' });
      this.ctx.tweens.add({ targets: water, alpha: { from: 0.2, to: 1 }, duration: 500 });
      this.prompt?.setText('DUBAI BITCHES');
      this.reveal?.setText('DUBAI BITCHES ADDED TO GROUP VOCABULARY').setColor('#facc15');
      this.ctx.cameras.main.flash(350, 250, 204, 21, false);
      this.after(1500, () => this.resolve());
    }, 0x92400e);
  }

  private setPhase(phase: Phase, number: number, label: string): void {
    this.clearPhase();
    this.phase = phase;
    this.phaseLocked = false;
    this.progress?.setText(`PLAN STAGE ${number}/5 — ${label}`);
    this.stageDots.forEach((dot, index) => dot.setFillStyle(index < number ? 0xfacc15 : 0x6d28d9, 1).setScale(index === number - 1 ? 1.35 : 1));
  }

  private clearPhase(): void {
    this.phaseObjects.forEach((object) => {
      try { this.ctx.tweens.killTweensOf(object); object.destroy(); } catch { /* already destroyed */ }
      const index = this.objects.indexOf(object);
      if (index >= 0) this.objects.splice(index, 1);
    });
    this.phaseObjects = [];
  }

  private makeButton(x: number, y: number, width: number, height: number, label: string, onClick: () => void, color = 0x312e81): Phaser.GameObjects.Rectangle & { setText(text: string): void } {
    const box = this.phaseTrack(this.ctx.add.rectangle(this.ss.zx(x), this.ss.zy(y), this.ss.s(width), this.ss.s(height), color, 1)
      .setScrollFactor(0).setDepth(D + 2).setStrokeStyle(this.ss.s(2), 0x8b5cf6, 1).setInteractive({ useHandCursor: true }));
    const text = this.phaseTrack(this.ctx.label(this.ss.zx(x), this.ss.zy(y), label, {
      fontSize: `${this.ss.s(11)}px`, color: '#ede9fe', align: 'center', fontStyle: 'bold', wordWrap: { width: this.ss.s(width - 14) },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 3));
    box.on('pointerover', () => box.setStrokeStyle(this.ss.s(3), 0xfacc15, 1));
    box.on('pointerout', () => box.setStrokeStyle(this.ss.s(2), 0x8b5cf6, 1));
    box.on('pointerdown', onClick);
    return Object.assign(box, { setText: (next: string) => { text.setText(next); } });
  }

  private resolve(): void {
    if (this.ended) return;
    this.ended = true;
    this.progress?.setText('CAREER PLAN: FULLY DOCUMENTED');
    this.prompt?.setText('VIABILITY: NOT ASSESSED');
    const callback = this.complete;
    this.after(650, () => callback?.({ outcome: 'win', data: { stages: 5, housing: 'bridge', kart: false, destination: 'Dubai' } }));
  }

  private after(ms: number, callback: () => void): void {
    const timer = this.ctx.time.delayedCall(ms, callback);
    this.timers.push(timer);
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.objects.push(object);
    return object;
  }

  private phaseTrack<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.track(object);
    this.phaseObjects.push(object);
    return object;
  }
}

export const benF1PlanMode = new BenF1PlanMode();
export default benF1PlanMode;

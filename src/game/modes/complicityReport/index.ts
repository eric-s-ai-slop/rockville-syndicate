import type { GameMode, ModeContext, ModeResult } from '../types';
import { mariaBrookeStats } from '../mariaBrookeStats';

export class ComplicityReportMode implements GameMode {
  id = 'complicityReport';

  private ctx!: ModeContext;
  private onCompleteCallback!: (result: ModeResult) => void;
  private started = false;
  private modeEnded = false;
  private allObjects: Phaser.GameObjects.GameObject[] = [];

  preload(_ctx: ModeContext): void {}

  start(ctx: ModeContext, _config: unknown, onComplete: (result: ModeResult) => void): void {
    this.ctx = ctx;
    this.onCompleteCallback = onComplete;
    this.started = false;
    this.modeEnded = false;
    this.allObjects = [];

    const cam = ctx.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;

    const overlay = ctx.add.container(cx, cy).setDepth(9999).setScrollFactor(0);
    this.track(overlay);

    const bg = ctx.add.rectangle(0, 0, cam.width, cam.height, 0x000000, 1);
    overlay.add(bg);

    const lines: string[] = [];
    
    if (mariaBrookeStats.laughs > 0) {
      lines.push(`You laughed ${mariaBrookeStats.laughs} times.`);
    } else {
      lines.push(`You didn't laugh.`);
    }

    if (mariaBrookeStats.truthsTyped > 0) {
      const phaseStr = mariaBrookeStats.firstTruthPhase === 'early' ? 'early' 
                     : mariaBrookeStats.firstTruthPhase === 'mid' ? 'in the middle' 
                     : 'too late';
      lines.push(`You typed the truth — ${phaseStr}.`);
    } else {
      lines.push(`You said nothing.`);
    }

    if (mariaBrookeStats.lookUps > 0) {
      lines.push(`You looked up at Ben ${mariaBrookeStats.lookUps} times.`);
    }

    lines.push(`Ben blocked the account at 3:51 PM.`);
    lines.push(`The Maria Brooke thing is still funny though.`);

    let y = -((lines.length * 30) / 2);
    
    lines.forEach((text, i) => {
      const t = ctx.label(0, y + i * 30, text, { fontSize: '13px', color: '#e2e8f0', align: 'center' }).setOrigin(0.5);
      t.setAlpha(0);
      overlay.add(t);
      ctx.tweens.add({ targets: t, alpha: 1, duration: 1500, delay: 1000 + i * 1500 });
    });

    const btn = ctx.add.rectangle(0, cy - 60, 120, 30, 0x1e293b).setInteractive({ useHandCursor: true });
    btn.setAlpha(0);
    overlay.add(btn);
    const btnText = ctx.label(0, cy - 60, 'Continue', { fontSize: '11px', color: '#94a3b8' }).setOrigin(0.5);
    btnText.setAlpha(0);
    overlay.add(btnText);

    ctx.tweens.add({ targets: [btn, btnText], alpha: 1, duration: 1000, delay: 1000 + lines.length * 1500 + 1000 });

    btn.on('pointerdown', () => {
      this.resolve();
    });

    this.started = true;
  }

  update(_time: number, _delta: number): void {
    if (!this.started || this.modeEnded) return;
  }

  teardown(): void {
    this.started = false;
    this.allObjects.forEach(o => { try { (o as any).destroy(); } catch {} });
    this.allObjects = [];
  }

  private track<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.allObjects.push(obj);
    return obj;
  }

  private resolve(): void {
    if (this.modeEnded) return;
    this.modeEnded = true;
    this.onCompleteCallback({ outcome: 'win' });
  }
}

export const complicityReportMode = new ComplicityReportMode();

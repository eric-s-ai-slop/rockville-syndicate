import type { GameMode, ModeContext, ModeResult } from '../types';
import { mariaBrookeStats } from '../mariaBrookeStats';

// Above world geometry AND the scene letterbox bars (depth 9500). This card is a
// full-screen takeover, not a framed panel.
const D = 9600;

export class ComplicityReportMode implements GameMode {
  id = 'complicityReport';

  private ctx!: ModeContext;
  private onCompleteCallback!: (result: ModeResult) => void;
  private started = false;
  private modeEnded = false;
  private allObjects: Phaser.GameObjects.GameObject[] = [];
  private keyListener?: (e: KeyboardEvent) => void;

  preload(_ctx: ModeContext): void {}

  start(ctx: ModeContext, _config: unknown, onComplete: (result: ModeResult) => void): void {
    this.ctx = ctx;
    this.onCompleteCallback = onComplete;
    this.started = false;
    this.modeEnded = false;
    this.allObjects = [];

    const cam = ctx.cameras.main;
    const W = cam.width;
    const H = cam.height;
    const cx = W / 2;
    const cy = H / 2;
    // Camera zoom (default 2.0) scales scrollFactor(0) objects, so keep the whole
    // layout within the zoomed-visible extent (visW × visH) or it spills off-screen.
    const visW = W / cam.zoom;
    const visH = H / cam.zoom;

    // Full-screen black takeover — oversized + scrollFactor(0) so it always covers
    // the viewport regardless of camera scroll or zoom. Opaque fill (fillAlpha 1);
    // we fade the object alpha from 0→1 (object alpha multiplies the fill, so a
    // transparent fill could never be faded up to opaque).
    const bg = ctx.add.rectangle(cx, cy, W * 2, H * 2, 0x000000, 1)
      .setScrollFactor(0).setDepth(D).setAlpha(0);
    this.track(bg);
    ctx.tweens.add({ targets: bg, alpha: 1, duration: 700 });

    // Assemble the indictment from what the player actually did this run.
    const s = mariaBrookeStats;
    const lines: string[] = [];

    lines.push(s.laughs > 0
      ? `You laughed ${s.laughs} ${s.laughs === 1 ? 'time' : 'times'}.`
      : `You didn't laugh.`);

    if (s.truthsTyped > 0) {
      const phaseStr = s.firstTruthPhase === 'early' ? 'early'
                     : s.firstTruthPhase === 'mid' ? 'in the middle'
                     : 'too late';
      lines.push(`You typed the truth — ${phaseStr}.`);
    } else {
      lines.push(`You said nothing.`);
    }

    if (s.lookUps > 0) {
      lines.push(`You looked up at Ben ${s.lookUps} ${s.lookUps === 1 ? 'time' : 'times'}.`);
    }

    lines.push(`Ben blocked the account at 3:51 PM.`);
    lines.push(`The Maria Brooke thing is still funny though.`);

    // Wrap each line to the visible width so nothing clips at high camera zoom
    // (a scrollFactor(0) object renders at size * zoom, so its usable width is
    // camW / zoom = visW), then lay the stack out centered by measured height.
    const wrapW = Math.min(visW * 0.9, 460);
    const lineH = 18;
    const gap = 10;

    const texts = lines.map((text, i) => {
      const isClosingLine = i === lines.length - 1;
      return ctx.label(cx, 0, text, {
        fontSize: '13px',
        color: isClosingLine ? '#94a3b8' : '#e2e8f0',
        align: 'center',
        wordWrap: { width: wrapW },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 1).setAlpha(0);
    });

    const heights = texts.map(t => Math.max(1, t.getWrappedText().length) * lineH);
    const totalH = heights.reduce((a, b) => a + b, 0) + gap * (texts.length - 1);
    let y = cy - (totalH + 60) / 2;

    let lastDelay = 700;
    texts.forEach((t, i) => {
      const delay = 700 + i * 1500;
      lastDelay = delay;
      t.setY(y + heights[i] / 2);
      this.track(t);
      ctx.tweens.add({ targets: t, alpha: 1, duration: 1200, delay });
      y += heights[i] + gap;
    });

    // Continue button — fades in after the last line lands; interactive only then
    // (so the player can't skip the card by clicking dead space early).
    const btnY = y + 24;
    const btn = ctx.add.rectangle(cx, btnY, 120, 30, 0x1e293b)
      .setScrollFactor(0).setDepth(D + 1).setStrokeStyle(1, 0x475569).setAlpha(0);
    const btnText = ctx.label(cx, btnY, 'Continue', { fontSize: '12px', color: '#94a3b8' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(D + 2).setAlpha(0);
    this.track(btn);
    this.track(btnText);
    btn.on('pointerover', () => btn.setFillStyle(0x334155));
    btn.on('pointerout', () => btn.setFillStyle(0x1e293b));
    btn.on('pointerdown', () => this.resolve());
    ctx.tweens.add({
      targets: [btn, btnText], alpha: 1, duration: 900, delay: lastDelay + 1300,
      onComplete: () => btn.setInteractive({ useHandCursor: true }),
    });

    // Keyboard parity: Enter / Space dismisses once the card is up.
    this.keyListener = (e: KeyboardEvent) => {
      if (this.modeEnded) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.resolve(); }
    };
    window.addEventListener('keydown', this.keyListener);

    this.started = true;
  }

  update(_time: number, _delta: number): void {
    if (!this.started || this.modeEnded) return;
  }

  teardown(): void {
    this.started = false;
    if (this.keyListener) {
      window.removeEventListener('keydown', this.keyListener);
      this.keyListener = undefined;
    }
    this.allObjects.forEach(o => { try { (o as Phaser.GameObjects.GameObject & { destroy(): void }).destroy(); } catch { /* skip */ } });
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

import Phaser from 'phaser';
import type { GameMode, ModeContext, ModeResult } from '../types';
import { BEN_CLAIMS, type BenClaim, type Verdict } from './claims';
import {
  buildRound,
  scoreSort,
  promptDuration,
  DEFAULT_ROUND,
  type RoundConfig,
} from './round';

// Full-screen takeover, above world geometry and the scene letterbox (depth 9500).
const D = 9600;

const COLOR_CAN = 0x16a34a;
const COLOR_CANT = 0xdc2626;
const COLOR_BG = 0x0b1208;

// Claim card auto-shrinks between these sizes to keep long claims from
// overflowing their fixed slot (see cardTopY in start()).
const CARD_FONT_MAX = 22;
const CARD_FONT_MIN = 13;
const CARD_MAX_LINES = 3;

/** Chapter-tunable knobs; everything falls back to DEFAULT_ROUND. */
export interface BenTriviaConfig {
  count?: number;
  perPromptMs?: number;
  minPromptMs?: number;
  strikesAllowed?: number;
  seed?: number;
}

/**
 * "Common Ben L" — an action trivia sort. A claim drops in; the player slams Ben
 * onto the CAN (left) or CAN'T (right) pad before the timer empties. Three strikes
 * (wrong sorts + timeouts) loses the run; clearing the deck wins it.
 *
 * Self-contained UI (own key listener + clickable pads) rather than driving the
 * player sprite — blocking minigames freeze WASD via dialogueOpen, so the token is
 * a mode-owned avatar. Mirrors complicityReport's takeover conventions.
 */
export class BenTriviaMode implements GameMode<BenTriviaConfig> {
  id = 'benTrivia';

  private ctx!: ModeContext;
  private onCompleteCallback!: (result: ModeResult) => void;
  private started = false;
  private modeEnded = false;
  private awaiting = false;

  private allObjects: Phaser.GameObjects.GameObject[] = [];
  private keyListener?: (e: KeyboardEvent) => void;
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private barTween: Phaser.Tweens.Tween | null = null;

  private cfg!: RoundConfig;
  private deck: BenClaim[] = [];
  private index = 0;
  private score = 0;
  private strikes = 0;
  private streak = 0;
  private maxStreak = 0;

  // Layout anchors resolved in start().
  private cx = 0;
  private cardTopY = 0;
  private barLeft = 0;
  private barW = 0;
  private canX = 0;
  private cantX = 0;
  private padY = 0;

  // Live UI refs.
  private cardText: Phaser.GameObjects.Text | null = null;
  private timerBar: Phaser.GameObjects.Rectangle | null = null;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private strikeText: Phaser.GameObjects.Text | null = null;
  private streakText: Phaser.GameObjects.Text | null = null;
  private feedbackText: Phaser.GameObjects.Text | null = null;
  private token: Phaser.GameObjects.Arc | null = null;
  private tokenLabel: Phaser.GameObjects.Text | null = null;

  preload(_ctx: ModeContext): void {}

  start(ctx: ModeContext, config: BenTriviaConfig | undefined, onComplete: (result: ModeResult) => void): void {
    this.ctx = ctx;
    this.onCompleteCallback = onComplete;
    this.started = false;
    this.modeEnded = false;
    this.awaiting = false;
    this.allObjects = [];
    this.index = 0;
    this.score = 0;
    this.strikes = 0;
    this.streak = 0;
    this.maxStreak = 0;

    this.cfg = {
      count: config?.count ?? DEFAULT_ROUND.count,
      perPromptMs: config?.perPromptMs ?? DEFAULT_ROUND.perPromptMs,
      minPromptMs: config?.minPromptMs ?? DEFAULT_ROUND.minPromptMs,
      strikesAllowed: config?.strikesAllowed ?? DEFAULT_ROUND.strikesAllowed,
      seed: config?.seed ?? DEFAULT_ROUND.seed,
    };
    this.deck = buildRound(BEN_CLAIMS, this.cfg);

    const cam = ctx.cameras.main;
    const W = cam.width;
    const H = cam.height;
    this.cx = W / 2;
    const cy = H / 2;
    // scrollFactor(0) objects render at size * zoom, so the usable extent is
    // camW / zoom. Keep the whole layout inside it or it spills off-screen.
    const visW = W / cam.zoom;
    const visH = H / cam.zoom;

    // Opaque takeover: oversized so it always covers the viewport; fade alpha up.
    const bg = ctx.add.rectangle(this.cx, cy, W * 2, H * 2, COLOR_BG, 1)
      .setScrollFactor(0).setDepth(D).setAlpha(0);
    this.track(bg);
    ctx.tweens.add({ targets: bg, alpha: 1, duration: 400 });

    // Title.
    this.track(ctx.label(this.cx, cy - visH * 0.34, 'CAN BEN…?', {
      fontSize: '20px', color: '#facc15', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2));

    // HUD row.
    this.scoreText = this.track(ctx.label(this.cx - visW * 0.42, cy - visH * 0.42, '', {
      fontSize: '12px', color: '#cbd5e1',
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 2)) as Phaser.GameObjects.Text;
    this.streakText = this.track(ctx.label(this.cx, cy - visH * 0.42, '', {
      fontSize: '12px', color: '#4ade80', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2)) as Phaser.GameObjects.Text;
    this.strikeText = this.track(ctx.label(this.cx + visW * 0.42, cy - visH * 0.42, '', {
      fontSize: '12px', color: '#f87171', fontStyle: 'bold',
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(D + 2)) as Phaser.GameObjects.Text;

    // Claim card. Top-anchored (origin y=0) at a fixed slot so long, multi-line
    // claims ("pretend to be drunk at home alone on parents alc (Embarrassing)")
    // grow downward only — a center anchor would expand upward into the HUD row
    // and downward into the timer bar/token for long text. showCard() also
    // shrinks the font for long claims to keep the whole card in its slot.
    const wrapW = Math.min(visW * 0.9, 480);
    this.cardTopY = cy - visH * 0.24;
    this.cardText = this.track(ctx.label(this.cx, this.cardTopY, '', {
      fontSize: `${CARD_FONT_MAX}px`, color: '#f8fafc', fontStyle: 'bold', align: 'center',
      wordWrap: { width: wrapW },
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(D + 2)) as Phaser.GameObjects.Text;

    // Timer bar (background track + shrinking fill).
    this.barW = Math.min(visW * 0.6, 320);
    this.barLeft = this.cx - this.barW / 2;
    const barY = cy + visH * 0.08;
    this.track(ctx.add.rectangle(this.cx, barY, this.barW, 8, 0x1e293b)
      .setScrollFactor(0).setDepth(D + 1));
    this.timerBar = this.track(ctx.add.rectangle(this.barLeft, barY, this.barW, 8, 0xfacc15)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 2)) as Phaser.GameObjects.Rectangle;

    // Pads.
    this.padY = cy + visH * 0.28;
    const padW = Math.min(visW * 0.34, 150);
    const padH = 48;
    this.canX = this.cx - visW * 0.24;
    this.cantX = this.cx + visW * 0.24;
    this.makePad(this.canX, this.padY, padW, padH, COLOR_CAN, 'CAN  ✓', 'can');
    this.makePad(this.cantX, this.padY, padW, padH, COLOR_CANT, "CAN'T  ✗", 'cant');

    // Ben token — the avatar the player flings onto a pad.
    this.token = this.track(ctx.add.circle(this.cx, this.padY - padH * 1.4, 16, 0x1d4ed8)
      .setScrollFactor(0).setDepth(D + 3).setStrokeStyle(2, 0xbfdbfe)) as Phaser.GameObjects.Arc;
    this.tokenLabel = this.track(ctx.label(this.cx, this.padY - padH * 1.4, 'BEN', {
      fontSize: '10px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 4)) as Phaser.GameObjects.Text;

    // Feedback line (per-answer flash).
    this.feedbackText = this.track(ctx.label(this.cx, cy + visH * 0.16, '', {
      fontSize: '16px', color: '#facc15', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 4)) as Phaser.GameObjects.Text;

    // Keyboard: ←/A = CAN, →/D = CAN'T.
    this.keyListener = (e: KeyboardEvent) => {
      if (this.modeEnded || !this.awaiting) return;
      const k = e.key.toLowerCase();
      if (e.key === 'ArrowLeft' || k === 'a') { e.preventDefault(); this.choose('can'); }
      else if (e.key === 'ArrowRight' || k === 'd') { e.preventDefault(); this.choose('cant'); }
    };
    window.addEventListener('keydown', this.keyListener);

    this.updateHud();
    // Brief beat before the first card so the takeover fade reads.
    ctx.time.delayedCall(450, () => this.showCard());
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
    this.clearTimers();
    this.allObjects.forEach((o) => {
      try { (o as Phaser.GameObjects.GameObject & { destroy(): void }).destroy(); } catch { /* skip */ }
    });
    this.allObjects = [];
    this.onCompleteCallback = null as unknown as (result: ModeResult) => void;
  }

  private makePad(x: number, y: number, w: number, h: number, color: number, text: string, verdict: Verdict) {
    const pad = this.ctx.add.rectangle(x, y, w, h, color, 0.85)
      .setScrollFactor(0).setDepth(D + 1).setStrokeStyle(2, 0xffffff, 0.6)
      .setInteractive({ useHandCursor: true });
    pad.on('pointerover', () => pad.setFillStyle(color, 1));
    pad.on('pointerout', () => pad.setFillStyle(color, 0.85));
    pad.on('pointerdown', () => { if (this.awaiting) this.choose(verdict); });
    this.track(pad);
    this.track(this.ctx.label(x, y, text, {
      fontSize: '15px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2));
  }

  private showCard(): void {
    if (this.modeEnded) return;
    if (this.index >= this.deck.length) {
      this.resolve('win');
      return;
    }
    const claim = this.deck[this.index];
    this.setCardText(claim.text);
    this.feedbackText?.setText('');

    // Reset the token to center-above-pads.
    if (this.token && this.tokenLabel) {
      this.token.setPosition(this.cx, this.padY - 48 * 1.4).setFillStyle(0x1d4ed8);
      this.tokenLabel.setPosition(this.cx, this.padY - 48 * 1.4);
    }

    // Reset + run the timer.
    const dur = promptDuration(this.cfg, this.index, this.deck.length);
    if (this.timerBar) {
      this.timerBar.setScale(1, 1);
      this.barTween = this.ctx.tweens.add({
        targets: this.timerBar, scaleX: 0, duration: dur, ease: 'Linear',
      });
    }
    this.timerEvent = this.ctx.time.delayedCall(dur, () => this.onTimeout());
    this.awaiting = true;
  }

  private choose(chosen: Verdict): void {
    if (this.modeEnded || !this.awaiting) return;
    this.awaiting = false;
    this.clearTimers();

    const claim = this.deck[this.index];
    const correct = scoreSort(claim, chosen);
    this.flingToken(chosen, correct);

    if (correct) {
      this.score++;
      this.streak++;
      this.maxStreak = Math.max(this.maxStreak, this.streak);
      this.feedbackText?.setText(this.streak >= 3 ? `LOCKED IN ×${this.streak}` : 'CAN ✓').setColor('#4ade80');
      this.ctx.showPassiveIconText(this.cx, this.padY - 90, '✓', '#4ade80');
      this.safePlay('ui_select');
    } else {
      this.registerStrike('COMMON BEN L');
    }
    this.afterAnswer();
  }

  private onTimeout(): void {
    if (this.modeEnded || !this.awaiting) return;
    this.awaiting = false;
    this.clearTimers();
    // A timeout counts as a wrong sort; fling toward the correct pad so it reads.
    const claim = this.deck[this.index];
    this.flingToken(claim.answer, false);
    this.registerStrike('TOO SLOW — BEN L');
    this.afterAnswer();
  }

  private registerStrike(msg: string): void {
    this.strikes++;
    this.streak = 0;
    this.feedbackText?.setText(msg).setColor('#f87171');
  }

  private afterAnswer(): void {
    this.updateHud();
    this.index++;
    this.ctx.time.delayedCall(750, () => {
      if (this.modeEnded) return;
      if (this.strikes >= this.cfg.strikesAllowed) {
        this.resolve('lose');
      } else {
        this.showCard();
      }
    });
  }

  /** Sets the card copy, shrinking the font until it fits CARD_MAX_LINES. */
  private setCardText(text: string): void {
    if (!this.cardText) return;
    this.cardText.setFontSize(CARD_FONT_MAX).setText(text);
    let size = CARD_FONT_MAX;
    while (this.cardText.getWrappedText().length > CARD_MAX_LINES && size > CARD_FONT_MIN) {
      size -= 2;
      this.cardText.setFontSize(size);
    }
  }

  private flingToken(toward: Verdict, correct: boolean): void {
    if (!this.token || !this.tokenLabel) return;
    const targetX = toward === 'can' ? this.canX : this.cantX;
    const color = correct ? 0x22c55e : 0xef4444;
    this.token.setFillStyle(color);
    this.ctx.tweens.add({ targets: [this.token, this.tokenLabel], x: targetX, y: this.padY, duration: 220, ease: 'Back.easeIn' });
  }

  private updateHud(): void {
    this.scoreText?.setText(`✓ ${this.score}/${this.deck.length}`);
    this.streakText?.setText(this.streak >= 2 ? `🔥 ${this.streak}` : '');
    const remaining = this.cfg.strikesAllowed - this.strikes;
    this.strikeText?.setText(`L: ${'✗'.repeat(this.strikes)}${'·'.repeat(Math.max(0, remaining))}`);
  }

  private clearTimers(): void {
    if (this.timerEvent) { this.timerEvent.remove(false); this.timerEvent = null; }
    if (this.barTween) { this.barTween.stop(); this.barTween = null; }
  }

  private safePlay(key: string): void {
    try { this.ctx.sound.play(key); } catch { /* asset may be absent — non-fatal */ }
  }

  private track<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.allObjects.push(obj);
    return obj;
  }

  private resolve(outcome: 'win' | 'lose'): void {
    if (this.modeEnded) return;
    this.modeEnded = true;
    this.awaiting = false;
    this.clearTimers();
    const cb = this.onCompleteCallback;
    // Let the final feedback land before handing control back.
    this.ctx.time.delayedCall(500, () => {
      cb?.({ outcome, data: { score: this.score, strikes: this.strikes, maxStreak: this.maxStreak } });
    });
  }
}

export const benTriviaMode = new BenTriviaMode();
export default benTriviaMode;

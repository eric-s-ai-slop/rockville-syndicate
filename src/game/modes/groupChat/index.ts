import type { GameMode, ModeContext, ModeResult } from '../types';
import { TIMELINE, PHASE_DIVIDER_INDEX, PressurePoint } from './timeline';
import { parseMessage } from './parser';
import { GROUP_REACTIONS, InterventionPhase, PUSHBACK_ESCALATION, ABSORB_REACTIONS } from './reactions';
import { mariaBrookeStats } from '../mariaBrookeStats';

// Scene actors/props depth-sort by Y (hundreds). Chat UI must sit far above
// all world geometry, below the scene letterbox bars (depth 9500).
const D = 9000;

export interface GroupChatConfig {
  timelineEndsAtMs?: number;
  finalPromptTimeoutMs?: number;
  complicityMax?: number;
}

interface MessageEntry {
  container: Phaser.GameObjects.Container;
  bottomY: number;
}

export class GroupChatMode implements GameMode {
  id = 'groupChat';

  private ctx!: ModeContext;
  private cfg!: Required<GroupChatConfig>;
  private onCompleteCallback!: (result: ModeResult) => void;

  // State
  private started = false;
  private playerInput = '';
  private complicity = 0;
  private saidTrueThing = false;
  private saidTrueThingAt: InterventionPhase | null = null;
  private groupReactionFiring = false;
  private timelineIndex = 0;
  private modeEnded = false;
  private finalPromptShown = false;
  private finalPromptElapsed = 0;

  private benResolve = 15;
  private benResolveTarget = 15;
  private pushCount = 0;
  private messagesSent = 0;
  private jokesSent = 0;
  private truthsTyped = 0;
  private pressuresIgnored = 0;
  private lastAbsorbAt = 0;
  private inPressure = false;
  private activePressure: PressurePoint | null = null;
  private pressureElapsed = 0;
  private pressureResolvedIds = new Set<string>();

  // UI refs
  private resolveFill!: Phaser.GameObjects.Rectangle;
  private resolveLabel!: Phaser.GameObjects.Text;
  private pressureBanner: Phaser.GameObjects.Container | null = null;
  private backdrop!: Phaser.GameObjects.Rectangle;
  private chatFrame!: Phaser.GameObjects.Rectangle;
  private inputText!: Phaser.GameObjects.Text;
  private meterFill!: Phaser.GameObjects.Rectangle;
  private messages: MessageEntry[] = [];
  private typingIndicator: Phaser.GameObjects.Container | null = null;
  private finalPromptOverlay: Phaser.GameObjects.Container | null = null;
  private closeAppButton: Phaser.GameObjects.Container | null = null;
  private allObjects: Phaser.GameObjects.GameObject[] = [];
  private maskGfx: Phaser.GameObjects.Graphics | null = null;
  private msgMask: Phaser.Display.Masks.GeometryMask | null = null;
  private meterTrackW = 0;

  // Layout (computed once in start(), shared by all render helpers)
  private L = {
    cx: 0, cy: 0,
    frameLeft: 0, frameRight: 0, frameTop: 0, frameBottom: 0,
    frameW: 0, frameH: 0,
    msgAreaTop: 0, msgAreaBottom: 0, msgPad: 14,
  };

  // Timers
  private timelineTicker!: Phaser.Time.TimerEvent;
  private finalPromptTimer!: Phaser.Time.TimerEvent;
  private keyListener!: (event: KeyboardEvent) => void;

  preload(_ctx: ModeContext): void {
    // sfx_message_ding is loaded globally in ChapterScene
  }

  start(ctx: ModeContext, config: GroupChatConfig, onComplete: (result: ModeResult) => void): void {
    this.ctx = ctx;
    this.cfg = {
      timelineEndsAtMs:    config?.timelineEndsAtMs    ?? 61000,
      finalPromptTimeoutMs: config?.finalPromptTimeoutMs ?? 20000,
      complicityMax:       config?.complicityMax       ?? 100,
    };
    this.onCompleteCallback = onComplete;

    // Reset all state for this run (singleton — must be clean on each start)
    this.started = false;
    this._startTime = Date.now();
    this.playerInput = '';
    this.complicity = 0;
    this.saidTrueThing = false;
    this.saidTrueThingAt = null;
    this.groupReactionFiring = false;
    this.timelineIndex = 0;
    this.modeEnded = false;
    this.finalPromptShown = false;
    this.finalPromptElapsed = 0;
    this.messages = [];
    this.typingIndicator = null;
    this.finalPromptOverlay = null;
    this.closeAppButton = null;
    this.allObjects = [];

    this.benResolve = 15;
    this.benResolveTarget = 15;
    this.pushCount = 0;
    this.messagesSent = 0;
    this.jokesSent = 0;
    this.truthsTyped = 0;
    this.pressuresIgnored = 0;
    this.lastAbsorbAt = 0;
    this.inPressure = false;
    this.activePressure = null;
    this.pressureElapsed = 0;
    this.pressureResolvedIds.clear();

    ctx.showLetterbox(800);

    const cam = ctx.cameras.main;
    const W = cam.width;
    const H = cam.height;
    const cx = W / 2;
    const cy = H / 2;
    // Camera zoom shrinks the on-screen visible extent — size the panel to the
    // VISIBLE area, not the full camera dimensions, or it spills off-screen.
    const visW = W / cam.zoom;
    const visH = H / cam.zoom;

    // --- Layout geometry (shared via this.L) ---------------------------------
    const frameW = Math.min(600, visW - 36);
    const frameH = Math.min(560, visH - 40);
    const frameLeft = cx - frameW / 2;
    const frameRight = cx + frameW / 2;
    const frameTop = cy - frameH / 2;
    const frameBottom = cy + frameH / 2;
    const HEADER_H = 38;
    const GOAL_H = 40;
    const INPUT_H = 34;
    const REACT_H = 34;
    const msgAreaTop = frameTop + HEADER_H + GOAL_H + 30;
    const msgAreaBottom = frameBottom - INPUT_H - REACT_H - 16;
    this.L = {
      cx, cy, frameLeft, frameRight, frameTop, frameBottom, frameW, frameH,
      msgAreaTop, msgAreaBottom, msgPad: 14,
    };

    // Black backdrop
    this.backdrop = ctx.add.rectangle(cx, cy, W, H, 0x000000, 0).setDepth(D).setScrollFactor(0);
    ctx.tweens.add({ targets: this.backdrop, alpha: 0.82, duration: 400 });
    this.track(this.backdrop);

    // Chat window frame
    this.chatFrame = ctx.add.rectangle(cx, cy, frameW, frameH, 0x0f1722).setDepth(D + 10).setScrollFactor(0);
    this.chatFrame.setStrokeStyle(2, 0x2b3a4d);
    this.track(this.chatFrame);

    // Top UI solid background to hide messages scrolling underneath
    const uiBgH = HEADER_H + GOAL_H + 30;
    this.track(ctx.add.rectangle(cx, frameTop + uiBgH / 2, frameW - 2, uiBgH, 0x0f1722).setDepth(D + 16).setScrollFactor(0));

    // Header bar
    this.track(ctx.add.rectangle(cx, frameTop + HEADER_H / 2, frameW, HEADER_H, 0x1b2735).setDepth(D + 17).setScrollFactor(0));
    this.track(ctx.add.circle(frameLeft + 18, frameTop + HEADER_H / 2, 5, 0x22c55e).setDepth(D + 18).setScrollFactor(0));
    this.track(ctx.label(frameLeft + 32, frameTop + HEADER_H / 2, 'The Boys', { fontSize: '14px', color: '#e5e7eb', fontStyle: 'bold' })
      .setDepth(D + 18).setScrollFactor(0).setOrigin(0, 0.5));
    this.track(ctx.label(frameRight - 14, frameTop + HEADER_H / 2, '6 members', { fontSize: '10px', color: '#64748b' })
      .setDepth(D + 18).setScrollFactor(0).setOrigin(1, 0.5));

    // Goal / how-to-play strip
    const goalY = frameTop + HEADER_H + GOAL_H / 2;
    this.track(ctx.add.rectangle(cx, goalY, frameW, GOAL_H, 0x131c27).setDepth(D + 17).setScrollFactor(0));
    this.track(ctx.label(frameLeft + 14, goalY - 9, "Ben's getting catfished. Type the truth to warn him — or stay in the bit.",
      { fontSize: '11px', color: '#cbd5e1' }).setDepth(D + 18).setScrollFactor(0).setOrigin(0, 0.5));
    this.track(ctx.label(frameLeft + 14, goalY + 9, 'Type + Enter to send  ·  click a reaction to play along',
      { fontSize: '10px', color: '#7c8aa0' }).setDepth(D + 18).setScrollFactor(0).setOrigin(0, 0.5));

    // Resolve Bar
    const resolveBarY = frameTop + HEADER_H + GOAL_H + 12;
    this.track(ctx.label(frameLeft + 14, resolveBarY, 'BEN', { fontSize: '10px', color: '#64748b', fontStyle: 'bold' }).setDepth(D + 18).setScrollFactor(0).setOrigin(0, 0.5));
    const resolveTrackX = frameLeft + 42;
    const resolveTrackW = frameW - 140;
    this.track(ctx.add.rectangle(resolveTrackX, resolveBarY, resolveTrackW, 6, 0x1b2735).setDepth(D + 17).setScrollFactor(0).setOrigin(0, 0.5));
    this.resolveFill = ctx.add.rectangle(resolveTrackX, resolveBarY, 0, 6, 0x22c55e).setDepth(D + 18).setScrollFactor(0).setOrigin(0, 0.5);
    this.track(this.resolveFill);
    this.resolveLabel = ctx.label(resolveTrackX + resolveTrackW + 8, resolveBarY, 'not going', { fontSize: '10px', color: '#94a3b8' }).setDepth(D + 18).setScrollFactor(0).setOrigin(0, 0.5);
    this.track(this.resolveLabel);

    // Clip mask so messages never spill outside the chat frame.
    // We create the graphics object here and update its geometry in update() 
    // so it perfectly tracks the camera even if the camera is lerping.
    this.maskGfx = ctx.make.graphics({});
    this.msgMask = this.maskGfx.createGeometryMask();

    // Bottom UI solid background to hide messages spawning and sliding up
    const uiBottomH = frameBottom - msgAreaBottom;
    this.track(ctx.add.rectangle(cx, frameBottom - uiBottomH / 2, frameW - 2, uiBottomH, 0x0f1722).setDepth(D + 16).setScrollFactor(0));

    // Input bar
    const inputBarY = frameBottom - REACT_H - INPUT_H / 2 - 6;
    const inputBar = ctx.add.rectangle(cx, inputBarY, frameW - 28, INPUT_H, 0x1b2735).setDepth(D + 17).setScrollFactor(0);
    inputBar.setStrokeStyle(1, 0x33455a);
    this.track(inputBar);
    this.inputText = ctx.label(frameLeft + 24, inputBarY, 'Type a message…', { fontSize: '12px', color: '#64748b' })
      .setDepth(D + 18).setScrollFactor(0).setOrigin(0, 0.5);
    this.track(this.inputText);

    // Reaction buttons row
    const emojis = ['💀', '😭', '❤️', '…'];
    const reactY = frameBottom - REACT_H / 2 - 4;
    this.track(ctx.label(frameLeft + 16, reactY, 'react:', { fontSize: '10px', color: '#64748b' })
      .setDepth(D + 18).setScrollFactor(0).setOrigin(0, 0.5));
    const reactStartX = frameLeft + 64;
    emojis.forEach((emoji, i) => {
      const ex = reactStartX + i * 46;
      const btn = ctx.add.rectangle(ex, reactY, 38, 26, 0x1b2735).setDepth(D + 17).setScrollFactor(0).setInteractive({ useHandCursor: true });
      btn.setStrokeStyle(1, 0x33455a);
      btn.on('pointerover', () => btn.setFillStyle(0x2b3a4d));
      btn.on('pointerout',  () => btn.setFillStyle(0x1b2735));
      btn.on('pointerdown', () => this.sendReaction(emoji));
      this.track(btn);
      this.track(ctx.label(ex, reactY, emoji, { fontSize: '13px' }).setDepth(D + 18).setScrollFactor(0).setOrigin(0.5));
    });

    // Complicity meter — thin labelled bar on the right of the reaction row
    const meterLabelX = reactStartX + emojis.length * 46 + 6;
    this.track(ctx.label(meterLabelX, reactY - 9, 'COMPLICITY', { fontSize: '8px', color: '#7c8aa0' })
      .setDepth(D + 18).setScrollFactor(0).setOrigin(0, 0.5));
    const meterTrackX = meterLabelX;
    const meterTrackW = frameRight - 16 - meterTrackX;
    this.track(ctx.add.rectangle(meterTrackX, reactY + 6, meterTrackW, 6, 0x1b2735).setDepth(D + 17).setScrollFactor(0).setOrigin(0, 0.5));
    this.meterFill = ctx.add.rectangle(meterTrackX, reactY + 6, 0, 6, 0x991b1b).setDepth(D + 18).setScrollFactor(0).setOrigin(0, 0.5);
    this.track(this.meterFill);
    this.meterTrackW = meterTrackW;

    // Keyboard capture
    this.keyListener = (e: KeyboardEvent) => this.handleKey(e);
    window.addEventListener('keydown', this.keyListener);

    // Timeline ticker
    this.timelineTicker = ctx.time.addEvent({ delay: 100, callback: this.tickTimeline, callbackScope: this, loop: true });

    // Final prompt timer
    this.finalPromptTimer = ctx.time.delayedCall(this.cfg.timelineEndsAtMs, () => {
      if (!this.modeEnded) this.showFinalPrompt();
    });

    // Mark ready — until now update() must no-op, because the scene sets
    // activeMode before start() runs (start is deferred behind the intro
    // dialogue). An early update() would touch undefined cfg/meterFill and
    // throw every frame, killing the Phaser loop.
    this.started = true;
  }

  update(_time: number, delta: number): void {
    if (!this.started || this.modeEnded) return;

    if (this.maskGfx) {
      const cam = this.ctx.cameras.main;
      this.maskGfx.clear();
      this.maskGfx.fillStyle(0xffffff);
      this.maskGfx.fillRect(this.L.frameLeft + 2 + cam.scrollX, this.L.frameTop + 2 + cam.scrollY, this.L.frameW - 4, this.L.frameH - 4);
    }

    this.benResolveTarget = Math.min(100, this.benResolveTarget + delta * 0.0005);
    this.benResolve += (this.benResolveTarget - this.benResolve) * 0.08;
    
    const trackW = this.L.frameW - 140;
    this.resolveFill.width = (this.benResolve / 100) * trackW;
    
    let resolveColor = 0x22c55e;
    let resolveText = 'not going';
    if (this.benResolve > 66) {
      resolveColor = 0xef4444;
      resolveText = "he's gonna go";
    } else if (this.benResolve > 33) {
      resolveColor = 0xf59e0b;
      resolveText = "tempted";
    }
    this.resolveFill.setFillStyle(resolveColor);
    this.resolveLabel.setText(resolveText);

    if (this.benResolve >= 100 && !this.finalPromptShown) {
      this.showFinalPrompt();
    }

    if (this.inPressure && this.activePressure) {
      this.pressureElapsed += delta;
      
      if (this.pressureBanner) {
        const barFill = this.pressureBanner.getByName('countdownBar') as Phaser.GameObjects.Rectangle;
        if (barFill) {
          const remaining = Math.max(0, this.activePressure.windowMs - this.pressureElapsed);
          const ratio = remaining / this.activePressure.windowMs;
          barFill.width = ratio * 300;
        }
      }

      if (this.pressureElapsed >= this.activePressure.windowMs) {
        this.resolveWindow('timeout');
      }
    }

    // Complicity tick
    if (!this.groupReactionFiring) {
      this.complicity = Math.min(this.cfg.complicityMax, this.complicity + delta * 0.001);
      this.meterFill.width = (this.complicity / this.cfg.complicityMax) * this.meterTrackW;
    }

    // Final prompt timeout
    if (this.finalPromptShown) {
      this.finalPromptElapsed += delta;
      if (this.finalPromptElapsed >= this.cfg.finalPromptTimeoutMs) {
        this.resolve(false);
      }
    }
  }

  teardown(): void {
    this.started = false;
    window.removeEventListener('keydown', this.keyListener);
    this.timelineTicker?.remove();
    this.finalPromptTimer?.remove();
    this.allObjects.forEach(o => { try { (o as Phaser.GameObjects.GameObject & { destroy(): void }).destroy(); } catch {} });
    this.allObjects = [];
    this.messages = [];
    this.typingIndicator = null;
    this.finalPromptOverlay = null;
    this.closeAppButton = null;
    this.msgMask?.destroy();
    this.msgMask = null;
    this.maskGfx?.destroy();
    this.maskGfx = null;
    if (this.pressureBanner) { this.pressureBanner.destroy(); this.pressureBanner = null; }
    this.ctx.hideLetterbox(800);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private track<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.allObjects.push(obj);
    return obj;
  }

  private handleKey(e: KeyboardEvent): void {
    if (this.modeEnded || this.finalPromptShown) return;
    if (e.key === 'Backspace') {
      this.playerInput = this.playerInput.slice(0, -1);
    } else if (e.key === 'Enter') {
      if (this.playerInput.trim()) this.sendPlayerMessage();
    } else if (e.key.length === 1 && this.playerInput.length < 120) {
      this.playerInput += e.key;
    }
    this.updateInputDisplay();
  }

  private updateInputDisplay(): void {
    if (!this.inputText) return;
    this.inputText.setText(this.playerInput ? this.playerInput + '▏' : 'Type a message…');
    this.inputText.setColor(this.playerInput ? '#e5e7eb' : '#64748b');
  }

  private _startTime = 0;

  private tickTimeline(): void {
    if (this.inPressure) return;
    if (this.modeEnded || this.groupReactionFiring) return;
    if (this.timelineIndex >= TIMELINE.length) {
      if (!this.finalPromptShown) this.showFinalPrompt();
      return;
    }
    const elapsed = Date.now() - this._startTime;
    const next = TIMELINE[this.timelineIndex];
    if (elapsed >= next.t) {
      this.timelineIndex++;
      
      if (next.resolve) {
        this.benResolveTarget = Phaser.Math.Clamp(this.benResolveTarget + next.resolve, 0, 100);
      }

      this.spawnMessage(next.speaker, next.text, next.thread, next.photo);

      if (next.duck) {
        try { this.ctx.audioController.duckStageMusic(); } catch { /* skip */ }
      }

      if (next.pressure && !this.pressureResolvedIds.has(next.pressure.id)) {
        this.openPressure(next.pressure);
      }
    }
  }

  private spawnMessage(speaker: string, text: string, thread: 'dm' | 'gc', photo?: boolean): void {
    // Play ding
    try { this.ctx.sound.play('sfx_message_ding', { volume: 0.3 }); } catch {}

    // Show typing indicator briefly, then swap for real message
    this.showTypingIndicator(thread === 'dm' ? 700 : 400, () => {
      const isDm = thread === 'dm';
      const bubbleFill = isDm
        ? (speaker === 'Ben' ? 0x3b1e1e : 0x223a52)
        : 0x1e2a38;
      const nameColor = isDm ? (speaker === 'Ben' ? '#fca5a5' : '#93c5fd') : this.speakerColor(speaker);
      const displayText = photo ? '📷 photo' : text;
      this.addBubble({ side: 'left', name: speaker, nameColor, body: displayText, fill: bubbleFill });
    });
  }

  /** Build one chat bubble, content-sized and aligned to its side, then place + scroll. */
  private addBubble(opts: { side: 'left' | 'right'; name: string; nameColor: string; body: string; fill: number }): void {
    const { ctx, L } = this;
    const lineH = 16;
    const padX = 10, padTop = 8, padBottom = 8, nameGap = 14;
    const maxBubbleW = Math.round(L.frameW * 0.7);
    const maxChars = Math.max(16, Math.floor((maxBubbleW - padX * 2) / 6.2));
    const wrapped = this.wrapText(opts.body, maxChars);

    // Width fits the longest line (or the name), capped at maxBubbleW
    let longest = opts.name.length * 6.2;
    for (let i = 0; i < wrapped.length; i++) {
      const len = wrapped[i].length * 6.2;
      if (len > longest) {
        longest = len;
      }
    }

    const bubbleW = Math.min(maxBubbleW, Math.max(70, Math.round(longest) + padX * 2));
    const bubbleH = padTop + nameGap + wrapped.length * lineH + padBottom;

    const nextY = this.nextMessageY(bubbleH);
    const cxBubble = opts.side === 'left'
      ? L.frameLeft + L.msgPad + bubbleW / 2
      : L.frameRight - L.msgPad - bubbleW / 2;

    const container = ctx.add.container(cxBubble, nextY).setDepth(D + 15).setScrollFactor(0);
    const bubble = ctx.add.rectangle(0, 0, bubbleW, bubbleH, opts.fill).setStrokeStyle(1, 0x33455a);
    container.add(bubble);
    container.add(ctx.label(-bubbleW / 2 + padX, -bubbleH / 2 + padTop, opts.name,
      { fontSize: '10px', color: opts.nameColor, fontStyle: 'bold' }).setOrigin(0, 0));
    wrapped.forEach((line, i) => {
      container.add(ctx.label(-bubbleW / 2 + padX, -bubbleH / 2 + padTop + nameGap + i * lineH, line,
        { fontSize: '11px', color: '#e2e8f0' }).setOrigin(0, 0));
    });
    if (this.msgMask) container.setMask(this.msgMask);

    container.setAlpha(0);
    ctx.tweens.add({ targets: container, alpha: 1, duration: 150 });
    this.messages.push({ container, bottomY: nextY + bubbleH / 2 });
    this.track(container);
    this.scrollMessages();
  }

  private showTypingIndicator(durationMs: number, onDone: () => void): void {
    const { ctx, L } = this;
    const indicatorY = L.msgAreaBottom - 6;

    if (this.typingIndicator) { this.typingIndicator.destroy(); this.typingIndicator = null; }

    const container = ctx.add.container(L.frameLeft + L.msgPad + 14, indicatorY).setDepth(D + 15).setScrollFactor(0);
    for (let i = 0; i < 3; i++) {
      const dot = ctx.add.circle(i * 11, 0, 3, 0x6b7280);
      container.add(dot);
      ctx.tweens.add({ targets: dot, alpha: 0.2, duration: 300, yoyo: true, repeat: -1, delay: i * 100 });
    }
    if (this.msgMask) container.setMask(this.msgMask);
    this.typingIndicator = container;
    this.track(container);

    ctx.time.delayedCall(durationMs, () => {
      if (this.typingIndicator === container) {
        container.destroy();
        this.typingIndicator = null;
      }
      onDone();
    });
  }

  private nextMessageY(bubbleH: number): number {
    if (this.messages.length === 0) return this.L.msgAreaTop + bubbleH / 2 + 4;
    const last = this.messages[this.messages.length - 1];
    return last.bottomY + bubbleH / 2 + 8;
  }

  private scrollMessages(): void {
    if (this.messages.length === 0) return;
    const last = this.messages[this.messages.length - 1];
    const overflow = last.bottomY - this.L.msgAreaBottom;
    if (overflow <= 0) return;
    this.messages.forEach(m => {
      m.bottomY -= overflow;
      this.ctx.tweens.add({ targets: m.container, y: m.container.y - overflow, duration: 120 });
    });
  }

  private pauseStart = 0;

  private openPressure(p: PressurePoint): void {
    this.inPressure = true;
    this.activePressure = p;
    this.pressureElapsed = 0;
    this.pauseStart = Date.now();

    this.showTypingIndicator(p.windowMs + 1000, () => {});

    const banner = this.ctx.add.container(this.L.cx, this.L.frameTop + 140).setDepth(D + 19).setScrollFactor(0);
    const bg = this.ctx.add.rectangle(0, 0, 340, 60, 0x450a0a).setStrokeStyle(2, 0xef4444);
    banner.add(bg);
    banner.add(this.ctx.label(0, -10, p.prompt, { fontSize: '13px', color: '#fca5a5', fontStyle: 'bold' }).setOrigin(0.5));
    
    const barTrack = this.ctx.add.rectangle(0, 12, 300, 6, 0x7f1d1d).setOrigin(0.5);
    banner.add(barTrack);
    const barFill = this.ctx.add.rectangle(-150, 12, 300, 6, 0xf87171).setOrigin(0, 0.5);
    barFill.setName('countdownBar');
    banner.add(barFill);

    this.ctx.tweens.add({
      targets: banner,
      scaleX: 1.02, scaleY: 1.02,
      duration: 500, yoyo: true, repeat: -1
    });

    this.pressureBanner = banner;
    this.track(banner);
  }

  private resolveWindow(kind: 'truth' | 'played_along' | 'timeout'): void {
    if (!this.activePressure) return;

    if (kind === 'truth') {
      this.knockDownResolve();
      this.fireEscalatingPushback();
      this.pushCount++;
      
      const benLine = this.activePressure.benLine;
      const resolveGain = this.activePressure.resolveOnIgnore;
      this.ctx.time.delayedCall(1600, () => {
        this.spawnMessage('Ben', benLine, 'dm');
        this.benResolveTarget = Phaser.Math.Clamp(this.benResolveTarget + resolveGain, 0, 100);
      });
    } else {
      this.pressuresIgnored++;
      this.spawnMessage('Ben', this.activePressure.benLine, 'dm');
      this.benResolveTarget = Phaser.Math.Clamp(this.benResolveTarget + this.activePressure.resolveOnIgnore, 0, 100);
    }

    this.closePressure();
  }

  private closePressure(): void {
    const pauseDuration = Date.now() - this.pauseStart;
    this._startTime += pauseDuration;
    
    if (this.pressureBanner) {
      this.pressureBanner.destroy();
      this.pressureBanner = null;
    }
    
    if (this.typingIndicator) {
      this.typingIndicator.destroy();
      this.typingIndicator = null;
    }

    if (this.activePressure) {
      this.pressureResolvedIds.add(this.activePressure.id);
    }
    
    this.inPressure = false;
    this.activePressure = null;
  }

  private knockDownResolve(): void {
    this.benResolveTarget = Math.max(0, this.benResolveTarget - 28);
    this.ctx.tweens.add({
      targets: this.resolveFill,
      alpha: 0.2, duration: 100, yoyo: true, repeat: 2
    });
  }

  private fireEscalatingPushback(): void {
    const idx = Math.min(this.pushCount, PUSHBACK_ESCALATION.length - 1);
    const reactions = PUSHBACK_ESCALATION[idx];
    if (reactions.length === 0) return;

    this.groupReactionFiring = true;
    reactions.forEach((r, i) => {
      this.ctx.time.delayedCall(800 + i * 500, () => {
        this.spawnMessage(r.speaker, r.text, 'gc');
      });
    });
    this.ctx.time.delayedCall(800 + reactions.length * 500 + 400, () => {
      this.groupReactionFiring = false;
    });
  }

  private sendPlayerMessage(): void {
    const msg = this.playerInput.trim();
    this.playerInput = '';
    this.updateInputDisplay();

    this.messagesSent++;
    const result = parseMessage(msg);
    if (result === 'true') this.truthsTyped++;

    if (result === 'joke') {
      this.complicity = Math.min(this.cfg.complicityMax, this.complicity + 3);
      this.jokesSent++;
    }

    if (this.inPressure) {
      this.spawnPlayerMessage(msg);
      if (result === 'true') {
        if (!this.saidTrueThing) {
          this.saidTrueThing = true;
          this.saidTrueThingAt = this.timelineIndex <= PHASE_DIVIDER_INDEX ? 'early' : 'mid';
        }
        this.resolveWindow('truth');
      } else {
        this.resolveWindow('played_along');
      }
      return;
    }

    if (result === 'true' && !this.saidTrueThing) {
      this.saidTrueThing = true;
      const phase = this.timelineIndex <= PHASE_DIVIDER_INDEX ? 'early' : 'mid';
      this.saidTrueThingAt = phase;
      this.triggerGroupReaction(phase);
    }

    // Render player message
    this.spawnPlayerMessage(msg);

    // Off-topic/neutral lines still get absorbed so typing always feels heard —
    // a single dismissive reply, cooldown-gated, with no timeline pause.
    if (result === 'neutral' && !this.groupReactionFiring && Date.now() - this.lastAbsorbAt > 6000) {
      this.lastAbsorbAt = Date.now();
      const r = ABSORB_REACTIONS[Math.floor(Math.random() * ABSORB_REACTIONS.length)];
      this.ctx.time.delayedCall(800, () => {
        if (!this.modeEnded) this.spawnMessage(r.speaker, r.text, 'gc');
      });
    }
  }

  private sendReaction(emoji: string): void {
    this.complicity = Math.min(this.cfg.complicityMax, this.complicity + 5);
    this.jokesSent++;
    this.spawnPlayerMessage(emoji);

    if (this.inPressure) {
      this.resolveWindow('played_along');
    }
  }

  private spawnPlayerMessage(text: string): void {
    this.addBubble({ side: 'right', name: 'You', nameColor: '#86efac', body: text, fill: 0x1d4e20 });
  }

  private triggerGroupReaction(phase: InterventionPhase): void {
    this.groupReactionFiring = true;
    const reactions = GROUP_REACTIONS[phase];
    reactions.forEach((r, i) => {
      this.ctx.time.delayedCall(1200 + i * 600, () => {
        this.spawnMessage(r.speaker, r.text, 'gc');
      });
    });
    this.ctx.time.delayedCall(1200 + reactions.length * 600 + 400, () => {
      this.groupReactionFiring = false;
    });
  }

  private showFinalPrompt(): void {
    if (this.modeEnded || this.finalPromptShown) return;
    this.finalPromptShown = true;
    this.finalPromptElapsed = 0;

    const { ctx, L } = this;

    const overlay = ctx.add.container(L.cx, L.cy).setDepth(D + 20).setScrollFactor(0);
    const bg = ctx.add.rectangle(0, 0, Math.min(460, L.frameW - 40), 130, 0x0f172a).setStrokeStyle(2, 0x475569);
    overlay.add(bg);
    overlay.add(
      ctx.label(0, -42, "Ben's about to skip practice for her.", { fontSize: '13px', color: '#e5e7eb', fontStyle: 'bold' }).setOrigin(0.5)
    );
    overlay.add(
      ctx.label(0, -22, 'Last chance: type the truth (Enter)', { fontSize: '11px', color: '#94a3b8' }).setOrigin(0.5)
    );
    overlay.add(
      ctx.label(0, -6, 'or close the app and say nothing.', { fontSize: '11px', color: '#94a3b8' }).setOrigin(0.5)
    );

    this.finalPromptOverlay = overlay;
    this.track(overlay);

    // Close app button — created as TOP-LEVEL objects with setScrollFactor(0),
    // NOT as children of the overlay container. Phaser does not apply a
    // container's scrollFactor to its children's input hit-testing, so an
    // interactive child inside a scrollFactor(0) container has its hit area
    // offset by the (scrolled) world camera and becomes unclickable. The
    // reaction buttons work precisely because they are top-level + scrollFactor 0.
    const btnY = L.cy + 34;
    const btn = ctx.add.rectangle(L.cx, btnY, 180, 32, 0x7f1d1d)
      .setDepth(D + 21).setScrollFactor(0)
      .setInteractive({ useHandCursor: true }).setStrokeStyle(1, 0xef4444);
    btn.on('pointerover', () => btn.setFillStyle(0x991b1b));
    btn.on('pointerout',  () => btn.setFillStyle(0x7f1d1d));
    btn.on('pointerdown', () => this.resolve(false));
    this.track(btn);
    this.track(ctx.label(L.cx, btnY, 'Close app', { fontSize: '11px', color: '#fca5a5' })
      .setDepth(D + 22).setScrollFactor(0).setOrigin(0.5));

    // Player can still type — Enter during final prompt counts as late
    window.removeEventListener('keydown', this.keyListener);
    this.keyListener = (e: KeyboardEvent) => {
      if (this.modeEnded) return;
      if (e.key === 'Backspace') {
        this.playerInput = this.playerInput.slice(0, -1);
      } else if (e.key === 'Enter') {
        if (this.playerInput.trim()) {
          const msg = this.playerInput.trim();
          this.playerInput = '';
          this.updateInputDisplay();
          const result = parseMessage(msg);
          if (result === 'true') this.truthsTyped++;
          if (result === 'true' && !this.saidTrueThing) {
            this.saidTrueThing = true;
            this.saidTrueThingAt = 'late';
            this.triggerGroupReaction('late');
          }
          this.spawnPlayerMessage(msg);
          this.resolve(true);
        }
      } else if (e.key.length === 1 && this.playerInput.length < 120) {
        this.playerInput += e.key;
      }
      this.updateInputDisplay();
    };
    window.addEventListener('keydown', this.keyListener);
  }

  private resolve(playerActed: boolean): void {
    if (this.modeEnded) return;
    this.modeEnded = true;

    // Feed the end-of-chapter complicity report (read by the complicityReport
    // mode). Overwritten fresh each run; lookUps is owned by the (future)
    // look-up choice beats, so we deliberately don't reset/touch it here.
    mariaBrookeStats.laughs = this.jokesSent;
    mariaBrookeStats.truthsTyped = this.truthsTyped;
    mariaBrookeStats.firstTruthPhase = this.saidTrueThingAt;
    mariaBrookeStats.messagesSent = this.messagesSent;
    mariaBrookeStats.pressureIgnored = this.pressuresIgnored;
    mariaBrookeStats.finalResolve = Math.round(this.benResolve);

    if (!playerActed && !this.saidTrueThing) {
      this.onCompleteCallback({
        outcome: 'lose',
        data: { 
          saidTrueThing: false, 
          complicity: Math.round(this.complicity),
          messagesSent: this.messagesSent,
          jokesSent: this.jokesSent,
          pushCount: this.pushCount,
          finalResolve: Math.round(this.benResolve)
        },
      });
    } else {
      this.onCompleteCallback({
        outcome: 'win',
        data: {
          saidTrueThing: this.saidTrueThing,
          when: this.saidTrueThingAt,
          complicity: Math.round(this.complicity),
          messagesSent: this.messagesSent,
          jokesSent: this.jokesSent,
          pushCount: this.pushCount,
          finalResolve: Math.round(this.benResolve)
        },
      });
    }
  }

  private speakerColor(name: string): string {
    const map: Record<string, string> = {
      'Eric': '#c8e89a', 'Jordan': '#f97316', 'Nick F': '#f59e0b',
      'Nick H': '#a78bfa', 'Maharko': '#22d3ee', 'Ben': '#84cc16',
    };
    return map[name] ?? '#9ca3af';
  }

  private wrapText(text: string, maxLen: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      if ((current + (current ? ' ' : '') + word).length > maxLen) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = current ? `${current} ${word}` : word;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [''];
  }
}

export const groupChatMode = new GroupChatMode();

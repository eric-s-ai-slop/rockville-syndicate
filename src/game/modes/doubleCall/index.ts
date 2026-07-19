import Phaser from 'phaser';
import type { GameMode, ModeContext, ModeResult } from '../types';
import { screenSpace } from '../screenSpace';
import { nextTypedState, incrementPressCount, nextFakeDigit } from './logic';

// Full-screen takeover, above world geometry and the scene letterbox (depth 9500).
const D = 9600;

export type Pt = { x: number; y: number };

export type TypedReplyEntry =
  | { kind: 'exact'; text: string }
  | { kind: 'chip'; text: string }
  | { kind: 'auto'; text: string };

export interface DoubleCallConfig {
  variant: 'ringOnly' | 'founding' | 'rerun' | 'unsent' | 'capital' | 'reply';

  leftPhone?: Pt;
  rightPhone?: Pt;

  ring?: {
    left: boolean;
    right: boolean;
    callerIdLeft?: string;
    durationMs: number;
    darkenIsland?: { x: number; y: number; w: number; h: number };
  };

  wire?: {
    field1Label: string;
    field2Label: string;
    typing: 'full' | 'autofill' | 'oneKey';
    blindWaitMs?: number;
    deadAirHoldMs?: number;
    ringPanMs?: number;
  };
  run?: 'routine' | 'voicemail' | 'ben';

  typedReply?: TypedReplyEntry[];

  unsent?: {
    minStillMs: number;
    rewindLine: string;
    walkAwayHoldMs: number;
    closeSfx?: string;
  };

  capital?: {
    oldThreadName: string;
    newThreadName: string;
    memberCount: number;
    driftMs: number;
    postRenameHoldMs: number;
  };

  reply?: {
    threadHeader?: string;
    incoming?: { sender: string; text: string };
    draft?: { text: string; holdMs: number; deleteCharByChar: true };
    reply?: { kind: 'exact'; text: string };
    codaExit?: { doorPoint: Pt; finalHoldMs: number };
  };
}

/**
 * doubleCall — the one new mode for Origins. One machine, six variant configs:
 * the same two-field wiring interface the player operates in Act II is the mode
 * that rang the phones uncredited behind Act I (`ringOnly`, background), the mode
 * the player refuses in Scene 10 (`unsent`), and the phone the player answers in
 * the coda (`reply`). Never emits 'lose' — there is no fail state, only rewind.
 */
export class DoubleCallMode {
  id = 'doubleCall';

  private ctx!: ModeContext;
  private onCompleteCallback: ((result: ModeResult) => void) | null = null;
  private modeEnded = false;
  private allObjects: Phaser.GameObjects.GameObject[] = [];
  private activeTweens: Phaser.Tweens.Tween[] = [];
  private timers: Phaser.Time.TimerEvent[] = [];
  private keyListeners: Array<(e: KeyboardEvent) => void> = [];

  // Site-frame (wiring UI) live refs, rebuilt per pass.
  private field1Text: Phaser.GameObjects.Text | null = null;
  private field2Text: Phaser.GameObjects.Text | null = null;
  private buttonRect: Phaser.GameObjects.Rectangle | null = null;
  private buttonLabel: Phaser.GameObjects.Text | null = null;
  private siteFrameObjects: Phaser.GameObjects.GameObject[] = [];

  // Phone-panel (message bubble) live refs.
  private phoneObjects: Phaser.GameObjects.GameObject[] = [];
  private bubbleY = 0;

  preload(_ctx: ModeContext): void {
    // sfx keys are loaded (or silently skipped) globally by ChapterScene.
  }

  start(ctx: ModeContext, config: DoubleCallConfig, onComplete: (result: ModeResult) => void): void {
    this.ctx = ctx;
    this.onCompleteCallback = onComplete;
    this.modeEnded = false;
    this.allObjects = [];
    this.activeTweens = [];
    this.timers = [];
    this.field1Text = null;
    this.field2Text = null;
    this.buttonRect = null;
    this.buttonLabel = null;
    this.siteFrameObjects = [];
    this.phoneObjects = [];

    switch (config.variant) {
      case 'ringOnly': this.startRingOnly(config); break;
      case 'founding': this.startFounding(config); break;
      case 'rerun': this.startRerun(config); break;
      case 'unsent': this.startUnsent(config); break;
      case 'capital': this.startCapital(config); break;
      case 'reply': this.startReply(config); break;
    }
  }

  update(_time: number, _delta: number): void {
    // All timing here is timer/tween-driven; no per-frame polling needed.
  }

  teardown(): void {
    this.removeAllKeyListeners();
    this.timers.forEach(t => { try { t.remove(false); } catch { /* already gone */ } });
    this.timers = [];
    this.activeTweens.forEach(t => { try { t.stop(); } catch { /* already gone */ } });
    this.activeTweens = [];
    this.allObjects.forEach(o => { try { (o as { destroy(): void }).destroy(); } catch { /* already gone */ } });
    this.allObjects = [];
    this.siteFrameObjects = [];
    this.phoneObjects = [];
    this.onCompleteCallback = null;
  }

  // ─── shared helpers ─────────────────────────────────────────────────────────

  private track<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.allObjects.push(obj);
    return obj;
  }

  private trackTween(t: Phaser.Tweens.Tween): Phaser.Tweens.Tween {
    this.activeTweens.push(t);
    return t;
  }

  /** All keydown listeners are tracked here and swept on teardown/site-frame
   *  changes — a mode with this many overlapping input phases (typing, button
   *  press, typed-reply grammar, walk-away) leaks listeners easily otherwise. */
  private addKeyListener(fn: (e: KeyboardEvent) => void): void {
    this.keyListeners.push(fn);
    window.addEventListener('keydown', fn);
  }

  private removeAllKeyListeners(): void {
    this.keyListeners.forEach(fn => window.removeEventListener('keydown', fn));
    this.keyListeners = [];
  }

  private removeKeyListener(fn: (e: KeyboardEvent) => void): void {
    window.removeEventListener('keydown', fn);
    this.keyListeners = this.keyListeners.filter(l => l !== fn);
  }

  private safePlay(key: string, config?: Phaser.Types.Sound.SoundConfig): void {
    try { this.ctx.sound.play(key, config); } catch { /* asset may be absent — degrade silently */ }
  }

  /** Screen-space layout helpers, fraction-of-visible-area based (benTrivia pattern),
   *  scaled through screenSpace() per the root gotcha (scrollFactor(0) at zoom≠1). */
  private layout() {
    const cam = this.ctx.cameras.main;
    const { s } = screenSpace(cam);
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    const visW = s(cam.width);
    const visH = s(cam.height);
    return {
      cx, cy, visW, visH, s,
      at: (fx: number, fy: number) => ({ x: cx + fx * visW, y: cy + fy * visH }),
    };
  }

  private resolve(data?: Record<string, unknown>): void {
    if (this.modeEnded) return;
    this.modeEnded = true;
    const cb = this.onCompleteCallback;
    cb?.({ outcome: 'win', data: { variant: (data?.variant as string) ?? 'doubleCall', ...data } });
  }

  private delay(ms: number, fn: () => void): void {
    this.timers.push(this.ctx.time.delayedCall(ms, fn));
  }

  private narrate(speakerId: string, line: string, done?: () => void): void {
    const speaker = resolveSpeakerLite(speakerId);
    this.ctx.onStoryDialogue({
      speakerName: speaker.name,
      speakerEmoji: speaker.emoji,
      speakerColor: speaker.color,
      lines: [line],
    }, () => done?.());
  }

  // ─── ringOnly — the planted evidence, background ───────────────────────────

  private startRingOnly(cfg: DoubleCallConfig): void {
    const ring = cfg.ring!;
    const pulses: Phaser.GameObjects.Arc[] = [];

    if (ring.left && cfg.leftPhone) {
      pulses.push(this.makeRingGlow(cfg.leftPhone));
      if (ring.callerIdLeft) {
        this.track(this.ctx.label(cfg.leftPhone.x, cfg.leftPhone.y - 22, ring.callerIdLeft, {
          fontSize: '9px', color: '#fde047', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(500));
      }
    }
    if (ring.right && cfg.rightPhone) {
      pulses.push(this.makeRingGlow(cfg.rightPhone));
    }
    if (ring.darkenIsland) {
      const r = ring.darkenIsland;
      const overlay = this.ctx.add.rectangle(r.x, r.y, r.w, r.h, 0x000000, 1).setDepth(400);
      this.track(overlay);
      overlay.setAlpha(0);
      this.trackTween(this.ctx.tweens.add({ targets: overlay, alpha: 0.85, duration: 800 }));
    }

    this.safePlay('sfx_phone_ring', { loop: true, volume: 0.5 });

    this.delay(ring.durationMs, () => {
      try { this.ctx.sound.stopByKey('sfx_phone_ring'); } catch { /* skip */ }
      pulses.forEach(p => p.destroy());
      this.resolve({ variant: 'ringOnly' });
    });
  }

  private makeRingGlow(pt: Pt): Phaser.GameObjects.Arc {
    const glow = this.ctx.add.circle(pt.x, pt.y, 10, 0xfde047, 0.6).setDepth(500);
    this.track(glow);
    this.trackTween(this.ctx.tweens.add({
      targets: glow, scale: { from: 0.8, to: 1.6 }, alpha: { from: 0.7, to: 0.1 },
      duration: 500, repeat: -1, yoyo: false,
    }));
    return glow;
  }

  // ─── founding — Scene 5, M3, the archetype ──────────────────────────────────

  private startFounding(cfg: DoubleCallConfig): void {
    const wire = cfg.wire!;
    this.buildSiteFrame(wire.field1Label, wire.field2Label, wire.typing, () => {
      this.pressButton(() => {
        this.teardownSiteFrame();
        this.safePlay('sfx_connect_thunk');
        // "Nothing happens in this room." — one full second of nothing, enforced.
        this.delay(1000, () => {
          this.runFoundingRingPan(cfg, wire.ringPanMs ?? 5200, () => {
            this.chargedBlindWait(wire.blindWaitMs ?? 8000, () => {
              this.safePlay('sfx_phone_buzz');
              this.showBubble('nick_f', 'bro why did jacob call me');
              this.delay(900, () => {
                this.runTypedReplies(cfg.typedReply ?? [], () => {
                  this.resolve({ variant: 'founding' });
                });
              });
            });
          });
        });
      });
    });
  }

  private runFoundingRingPan(cfg: DoubleCallConfig, panMs: number, done: () => void): void {
    const cam = this.ctx.cameras.main;
    const origX = this.ctx.player.x;
    const origY = this.ctx.player.y;
    const left = cfg.leftPhone ?? { x: origX - 400, y: origY };
    const right = cfg.rightPhone ?? { x: origX + 400, y: origY };
    const leftGlow = this.makeRingGlow(left);
    const rightGlow = this.makeRingGlow(right);
    this.safePlay('sfx_phone_ring', { loop: true, volume: 0.5 });

    const leg = panMs * 0.4;
    cam.pan(left.x, left.y, leg, 'Sine.easeInOut');
    this.delay(leg, () => {
      cam.pan(right.x, right.y, leg, 'Sine.easeInOut');
      this.delay(leg, () => {
        cam.pan(origX, origY, panMs * 0.2, 'Sine.easeInOut');
        this.delay(panMs * 0.2, () => {
          try { this.ctx.sound.stopByKey('sfx_phone_ring'); } catch { /* skip */ }
          leftGlow.destroy();
          rightGlow.destroy();
          done();
        });
      });
    });
  }

  /** The blind wait, made "charged, not empty" per the FUN AUDIT: a blinking
   *  cursor and a breathing pulse rather than a blank hold. */
  private chargedBlindWait(ms: number, done: () => void): void {
    const { at, s } = this.layout();
    const p = at(0, 0.32);
    const cursor = this.track(this.ctx.label(p.x, p.y, '_', {
      fontSize: `${s(22)}px`, color: '#e5e7eb', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2));
    this.trackTween(this.ctx.tweens.add({
      targets: cursor, alpha: { from: 1, to: 0.15 }, duration: 480, yoyo: true, repeat: -1,
    }));
    this.delay(ms, () => {
      cursor.destroy();
      done();
    });
  }

  // ─── rerun — Scene 6, M4, same wiring, three modified rules ─────────────────

  private startRerun(cfg: DoubleCallConfig): void {
    const wire = cfg.wire!;
    if (cfg.run === 'routine') {
      this.runRoutinePass('full', wire.field1Label, wire.field2Label, () => {
        this.runRoutinePass('autofill', wire.field1Label, wire.field2Label, () => {
          this.runRoutinePass('oneKey', wire.field1Label, wire.field2Label, () => {
            this.resolve({ variant: 'rerun', run: 'routine' });
          });
        });
      });
      return;
    }
    if (cfg.run === 'voicemail') {
      this.buildSiteFrame(wire.field1Label, wire.field2Label, wire.typing, () => {
        this.pressButton(() => {
          this.teardownSiteFrame();
          this.runVoicemailNight(cfg, wire.deadAirHoldMs ?? 6000, () => {
            this.resolve({ variant: 'rerun', run: 'voicemail' });
          });
        });
      });
      return;
    }
    if (cfg.run === 'ben') {
      this.buildSiteFrame(wire.field1Label, wire.field2Label, wire.typing, () => {
        this.pressButton(() => {
          this.teardownSiteFrame();
          this.narrate('narrator_eric', 'Nothing happens in this room. Remember?', () => {
            this.showBubble('nick_f', 'Bro Ben just called me');
            this.delay(700, () => {
              this.runTypedReplies(cfg.typedReply ?? [], () => {
                this.resolve({ variant: 'rerun', run: 'ben' });
              });
            });
          });
        });
      });
    }
  }

  private runRoutinePass(typing: 'full' | 'autofill' | 'oneKey', l1: string, l2: string, done: () => void): void {
    this.buildSiteFrame(l1, l2, typing, () => {
      this.pressButton(() => {
        this.teardownSiteFrame();
        this.delay(typing === 'full' ? 300 : 120, done);
      });
    });
  }

  private runVoicemailNight(cfg: DoubleCallConfig, deadAirMs: number, done: () => void): void {
    const cam = this.ctx.cameras.main;
    const left = cfg.leftPhone ?? { x: this.ctx.player.x - 400, y: this.ctx.player.y };
    const right = cfg.rightPhone ?? { x: this.ctx.player.x + 400, y: this.ctx.player.y };
    const mid = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
    if (cfg.ring?.darkenIsland) {
      const r = cfg.ring.darkenIsland;
      const overlay = this.ctx.add.rectangle(r.x, r.y, r.w, r.h, 0x000000, 1).setDepth(400);
      this.track(overlay);
      overlay.setAlpha(0);
      this.trackTween(this.ctx.tweens.add({ targets: overlay, alpha: 0.85, duration: 600 }));
    }
    cam.pan(mid.x, mid.y, 1400, 'Sine.easeInOut');
    this.safePlay('sfx_phone_ring', { loop: false });
    this.delay(1600, () => {
      this.narrate('jacob', '"Hi, you\'ve reached Jacob—"', () => {
        // The dead air — bone-dry, uncuttable, no narration overlaps it.
        this.delay(deadAirMs, () => {
          cam.pan(this.ctx.player.x, this.ctx.player.y, 1000, 'Sine.easeInOut');
          this.delay(1000, done);
        });
      });
    });
  }

  // ─── unsent — Scene 10, M5, the un-placed call ──────────────────────────────

  private startUnsent(cfg: DoubleCallConfig): void {
    const wire = cfg.wire!;
    const unsent = cfg.unsent!;
    let pressedCount = 0;
    let inputEnabled = false;
    let holdStart: number | null = null;
    let resolved = false;

    // The button (ENTER/SPACE/click) routes through buildSiteFrame's own
    // 'oneKey' wiring — pressing it is the rewind, never mode completion.
    this.buildSiteFrameGhosted(wire.field1Label, wire.field2Label, () => {
      if (this.modeEnded || !inputEnabled) return;
      pressedCount = incrementPressCount(pressedCount);
      this.showUnsentRewind(unsent.rewindLine);
    });

    this.delay(unsent.minStillMs, () => { inputEnabled = true; });

    const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);

    const checkWalkAway = () => {
      if (holdStart === null || resolved) return;
      const held = Date.now() - holdStart;
      if (held >= unsent.walkAwayHoldMs) {
        resolved = true;
        this.walkAwayFromDesk(unsent.closeSfx, () => {
          this.resolve({ variant: 'unsent', pressedCount });
        });
      }
    };

    this.addKeyListener((e: KeyboardEvent) => {
      if (this.modeEnded || !inputEnabled) return;
      const k = e.key.toLowerCase();
      if (MOVE_KEYS.has(k)) {
        if (holdStart === null) holdStart = Date.now();
        this.delay(unsent.walkAwayHoldMs + 20, checkWalkAway);
      }
    });
  }

  private showUnsentRewind(line: string): void {
    const { cx, cy } = this.layout();
    const black = this.ctx.add.rectangle(cx, cy, 4000, 4000, 0x000000, 1)
      .setScrollFactor(0).setDepth(D + 10).setAlpha(0);
    const label = this.ctx.label(cx, cy, line, {
      fontSize: '15px', color: '#f8fafc', align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 11).setAlpha(0);
    this.trackTween(this.ctx.tweens.add({ targets: [black, label], alpha: 1, duration: 250 }));
    this.delay(250 + 2200, () => {
      this.trackTween(this.ctx.tweens.add({
        targets: [black, label], alpha: 0, duration: 300,
        onComplete: () => { black.destroy(); label.destroy(); },
      }));
    });
  }

  private walkAwayFromDesk(closeSfx: string | undefined, done: () => void): void {
    this.teardownSiteFrame();
    const player = this.ctx.player;
    this.trackTween(this.ctx.tweens.add({
      targets: player, y: player.y + 48, duration: 500, ease: 'Sine.easeOut',
      onComplete: () => {
        if (closeSfx) this.safePlay(closeSfx);
        this.delay(400, done);
      },
    }));
  }

  // ─── capital — Scene 9, the rename ──────────────────────────────────────────

  private startCapital(cfg: DoubleCallConfig): void {
    const capital = cfg.capital!;
    const { at, s } = this.layout();
    const oldRowPos = at(0, -0.18);
    const newRowPos = at(0, 0.06);

    const oldDot = this.track(this.ctx.add.circle(oldRowPos.x - s(90), oldRowPos.y, s(5), 0x22c55e).setScrollFactor(0).setDepth(D + 2));
    this.track(this.ctx.label(oldRowPos.x - s(72), oldRowPos.y, capital.oldThreadName, {
      fontSize: `${s(14)}px`, color: '#e5e7eb',
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 2));

    let newDot: Phaser.GameObjects.Arc | null = null;
    let newLabel: Phaser.GameObjects.Text | null = null;
    let lit = 0;
    const total = capital.memberCount;
    const step = capital.driftMs / Math.max(total, 1);

    const spawnMember = () => {
      lit++;
      if (!newDot) {
        newDot = this.track(this.ctx.add.circle(newRowPos.x - s(90), newRowPos.y, s(5), 0x64748b).setScrollFactor(0).setDepth(D + 2)) as Phaser.GameObjects.Arc;
        newLabel = this.track(this.ctx.label(newRowPos.x - s(72), newRowPos.y, '', {
          fontSize: `${s(14)}px`, color: '#94a3b8',
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(D + 2)) as Phaser.GameObjects.Text;
      }
      newLabel?.setText('•'.repeat(lit));
      // The old thread thins as the new one thickens — a color drift, not words.
      oldDot.setFillStyle(0x475569);
      if (lit >= total) {
        this.delay(600, () => this.blinkRename(newLabel!, capital.newThreadName, capital.postRenameHoldMs, () => {
          this.resolve({ variant: 'capital' });
        }));
      } else {
        this.delay(step, spawnMember);
      }
    };
    this.delay(700, spawnMember);
  }

  private blinkRename(label: Phaser.GameObjects.Text, newName: string, holdMs: number, done: () => void): void {
    this.trackTween(this.ctx.tweens.add({
      targets: label, alpha: 0, duration: 200, yoyo: true, repeat: 2,
      onComplete: () => {
        label.setText(newName).setColor('#facc15').setFontStyle('bold');
        // The post-rename hold — no sound, no motion, no caption. Survived, not skipped.
        this.delay(holdMs, done);
      },
    }));
  }

  // ─── reply — Scene 0 draft + Scene 11 coda ──────────────────────────────────

  private startReply(cfg: DoubleCallConfig): void {
    const reply = cfg.reply!;
    if (reply.draft) {
      this.runDraftDeleteBeat(reply.draft, () => this.resolve({ variant: 'reply', mode: 'draft' }));
      return;
    }
    // Coda: incoming + typed reply.
    const { at, s } = this.layout();
    if (reply.threadHeader) {
      this.track(this.ctx.label(at(0, -0.32).x, at(0, -0.32).y, reply.threadHeader, {
        fontSize: `${s(13)}px`, color: '#94a3b8', fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2));
    }
    if (reply.incoming) {
      this.showBubble(reply.incoming.sender.toLowerCase(), reply.incoming.text, reply.incoming.sender);
    }
    this.delay(600, () => {
      const target = reply.reply?.text ?? '';
      this.runTypedReplies([{ kind: 'exact', text: target }], () => {
        if (reply.codaExit) {
          this.runCodaExit(reply.codaExit, () => this.resolve({ variant: 'reply', mode: 'coda' }));
        } else {
          this.resolve({ variant: 'reply', mode: 'incoming' });
        }
      });
    });
  }

  private runDraftDeleteBeat(draft: NonNullable<DoubleCallConfig['reply']>['draft'], done: () => void): void {
    if (!draft) { done(); return; }
    const { at, s } = this.layout();
    const p = at(0, 0.18);
    const composeText = this.track(this.ctx.label(p.x, p.y, '', {
      fontSize: `${s(14)}px`, color: '#e5e7eb', wordWrap: { width: s(320) },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2)) as Phaser.GameObjects.Text;

    let i = 0;
    const typeNext = () => {
      i++;
      composeText.setText(draft.text.slice(0, i));
      if (i < draft.text.length) {
        this.delay(40, typeNext);
      } else {
        this.delay(draft.holdMs, () => deleteOne());
      }
    };
    const deleteOne = () => {
      const cur = composeText.text;
      if (cur.length > 0) {
        composeText.setText(cur.slice(0, -1));
        this.delay(45, deleteOne);
      } else {
        composeText.destroy();
        done();
      }
    };
    typeNext();
  }

  private runCodaExit(exit: NonNullable<DoubleCallConfig['reply']>['codaExit'], done: () => void): void {
    if (!exit) { done(); return; }
    this.teardownPhonePanel();
    const cam = this.ctx.cameras.main;
    const player = this.ctx.player;
    // Small desk-glow decal survives while the player walks out.
    const glow = this.ctx.add.circle(player.x, player.y, 6, 0xfacc15, 0.9).setDepth(300);
    this.track(glow);
    this.trackTween(this.ctx.tweens.add({
      targets: player, x: exit.doorPoint.x, y: exit.doorPoint.y, duration: 1400, ease: 'Sine.easeInOut',
      onComplete: () => {
        this.delay(exit.finalHoldMs, () => {
          cam.fadeOut(1500, 0, 0, 0);
          this.delay(1520, done);
        });
      },
    }));
  }

  // ─── shared: the wiring site-frame (two fields + button) ───────────────────

  private buildSiteFrame(label1: string, label2: string, typing: 'full' | 'autofill' | 'oneKey', onWired: () => void): void {
    const { at, s } = this.layout();
    const bg = this.ctx.add.rectangle(at(0, 0).x, at(0, 0).y, s(2400), s(1400), 0x05060a, 1)
      .setScrollFactor(0).setDepth(D).setAlpha(0);
    this.track(bg);
    this.siteFrameObjects.push(bg);
    this.trackTween(this.ctx.tweens.add({ targets: bg, alpha: 0.92, duration: 300 }));

    // The dialer site itself — a plain (non-`stage_`) screen-space image, card-sized
    // behind the two fields + button. 12_asset_wireup.md §4: no text/logo on the
    // image, all field/ghost/button labels render on top via ctx.label().
    if (this.ctx.textures.exists('prop_dialer_site')) {
      const card = at(0, 0.04);
      const dialerCard = this.ctx.add.image(card.x, card.y, 'prop_dialer_site')
        .setDisplaySize(s(420), s(300)).setScrollFactor(0).setDepth(D + 0.5).setAlpha(0);
      this.track(dialerCard);
      this.siteFrameObjects.push(dialerCard);
      this.trackTween(this.ctx.tweens.add({ targets: dialerCard, alpha: 1, duration: 300 }));
    }

    const f1 = at(0, -0.14);
    const f2 = at(0, 0.04);
    const btn = at(0, 0.22);

    const card1 = this.track(this.ctx.label(f1.x, f1.y - s(18), label1, {
      fontSize: `${s(11)}px`, color: '#94a3b8', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2));
    this.siteFrameObjects.push(card1);
    const field1Box = this.track(this.ctx.add.rectangle(f1.x, f1.y, s(220), s(30), 0x1b2735)
      .setStrokeStyle(s(1), 0x334155).setScrollFactor(0).setDepth(D + 1));
    this.siteFrameObjects.push(field1Box);
    this.field1Text = this.track(this.ctx.label(f1.x, f1.y, '', {
      fontSize: `${s(14)}px`, color: '#e5e7eb',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2)) as Phaser.GameObjects.Text;
    this.siteFrameObjects.push(this.field1Text);

    const card2 = this.track(this.ctx.label(f2.x, f2.y - s(18), label2, {
      fontSize: `${s(11)}px`, color: '#94a3b8', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2));
    this.siteFrameObjects.push(card2);
    const field2Box = this.track(this.ctx.add.rectangle(f2.x, f2.y, s(220), s(30), 0x1b2735)
      .setStrokeStyle(s(1), 0x334155).setScrollFactor(0).setDepth(D + 1));
    this.siteFrameObjects.push(field2Box);
    this.field2Text = this.track(this.ctx.label(f2.x, f2.y, '', {
      fontSize: `${s(14)}px`, color: '#e5e7eb',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2)) as Phaser.GameObjects.Text;
    this.siteFrameObjects.push(this.field2Text);

    this.buttonRect = this.track(this.ctx.add.rectangle(btn.x, btn.y, s(120), s(34), 0x374151)
      .setScrollFactor(0).setDepth(D + 1).setInteractive({ useHandCursor: true })) as Phaser.GameObjects.Rectangle;
    this.siteFrameObjects.push(this.buttonRect);
    this.buttonLabel = this.track(this.ctx.label(btn.x, btn.y, 'CONNECT', {
      fontSize: `${s(12)}px`, color: '#6b7280', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 2)) as Phaser.GameObjects.Text;
    this.siteFrameObjects.push(this.buttonLabel);

    const TARGET_LEN = 10;
    let f1Filled = 0;
    let f2Filled = 0;
    let armed = false;

    const armButton = () => {
      if (armed) return;
      armed = true;
      this.buttonRect?.setFillStyle(0x16a34a);
      this.buttonLabel?.setColor('#f0fdf4');
      this.buttonRect?.on('pointerdown', () => onWired());
    };

    if (typing === 'oneKey') {
      this.field1Text.setText(nextFakeDigit(0).repeat(TARGET_LEN));
      this.field2Text.setText(nextFakeDigit(1).repeat(TARGET_LEN));
      armButton();
      this.addKeyListener((e: KeyboardEvent) => {
        if (this.modeEnded) return;
        if ((e.key === 'Enter' || e.key === ' ') && armed) { e.preventDefault(); onWired(); }
      });
      return;
    }

    if (typing === 'autofill') {
      // Ghosted pre-fill; the type-along still advances per keypress (confirming).
      const ghost1 = Array.from({ length: TARGET_LEN }, (_, i) => nextFakeDigit(i)).join('');
      const ghost2 = Array.from({ length: TARGET_LEN }, (_, i) => nextFakeDigit(i + 3)).join('');
      this.field1Text.setText(ghost1).setColor('#475569');
      this.field2Text.setText(ghost2).setColor('#475569');
      this.addKeyListener((e: KeyboardEvent) => {
        if (this.modeEnded) return;
        if (e.key === 'Enter' || e.key === ' ') { if (armed) { e.preventDefault(); onWired(); } return; }
        if (f1Filled < 1) { f1Filled = 1; this.field1Text?.setColor('#e5e7eb'); this.safePlay('sfx_key_clack'); return; }
        if (f2Filled < 1) { f2Filled = 1; this.field2Text?.setColor('#e5e7eb'); this.safePlay('sfx_key_clack'); armButton(); }
      });
      return;
    }

    // 'full' — type-along: any key emits the next correct digit.
    this.addKeyListener((e: KeyboardEvent) => {
      if (this.modeEnded) return;
      if (e.key === 'Enter' || e.key === ' ') { if (armed) { e.preventDefault(); onWired(); } return; }
      if (f1Filled < TARGET_LEN) {
        f1Filled++;
        this.field1Text?.setText(Array.from({ length: f1Filled }, (_, i) => nextFakeDigit(i)).join(''));
        this.safePlay('sfx_key_clack');
        return;
      }
      if (f2Filled < TARGET_LEN) {
        f2Filled++;
        this.field2Text?.setText(Array.from({ length: f2Filled }, (_, i) => nextFakeDigit(i + 3)).join(''));
        this.safePlay('sfx_key_clack');
        if (f2Filled === TARGET_LEN) armButton();
      }
    });
  }

  /** Scene 10's already-ghosted variant: fields autofilled from the start, button
   *  live immediately, no confirm keypresses required (the machine remembers your
   *  habits and hands them back as a favor). `onPress` fires on every ENTER/SPACE/
   *  click — the caller (startUnsent) decides what a press means (the rewind). */
  private buildSiteFrameGhosted(label1: string, label2: string, onPress: () => void): void {
    this.buildSiteFrame(label1, label2, 'oneKey', onPress);
    this.field1Text?.setColor('#64748b');
    this.field2Text?.setColor('#64748b');
  }

  private pressButton(done: () => void): void {
    this.removeAllKeyListeners();
    done();
  }

  private teardownSiteFrame(): void {
    this.siteFrameObjects.forEach(o => { try { (o as { destroy(): void }).destroy(); } catch { /* skip */ } });
    this.siteFrameObjects = [];
    this.field1Text = null;
    this.field2Text = null;
    this.buttonRect = null;
    this.buttonLabel = null;
    this.removeAllKeyListeners();
  }

  // ─── shared: phone message bubbles ──────────────────────────────────────────

  private showBubble(speakerId: string, text: string, labelOverride?: string): void {
    const { at, s } = this.layout();
    if (this.phoneObjects.length === 0) this.bubbleY = at(0, 0.22).y;
    const speaker = resolveSpeakerLite(speakerId);
    const pos = at(0, 0);
    const line = this.track(this.ctx.label(pos.x, this.bubbleY, `${labelOverride ?? speaker.name.toUpperCase()}: ${text}`, {
      fontSize: `${s(13)}px`, color: speaker.color, wordWrap: { width: s(340) },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 3)) as Phaser.GameObjects.Text;
    this.phoneObjects.push(line);
    this.bubbleY += s(26);
    this.safePlay('sfx_phone_buzz', { volume: 0.4 });
  }

  private teardownPhonePanel(): void {
    this.phoneObjects.forEach(o => { try { (o as { destroy(): void }).destroy(); } catch { /* skip */ } });
    this.phoneObjects = [];
  }

  // ─── shared: typed-reply grammar (why / omw / 💀 chip) ──────────────────────

  private runTypedReplies(entries: TypedReplyEntry[], done: () => void): void {
    if (entries.length === 0) { done(); return; }
    const [entry, ...rest] = entries;
    const next = () => this.runTypedReplies(rest, done);

    if (entry.kind === 'auto') {
      this.typeAutoReply(entry.text, next);
      return;
    }
    if (entry.kind === 'chip') {
      this.showChip(entry.text, next);
      return;
    }
    // 'exact' — the player must press the real keys, in order. Wrong keys shake.
    this.awaitExactTyping(entry.text, next);
  }

  private typeAutoReply(text: string, done: () => void): void {
    const { at, s } = this.layout();
    const pos = at(0, 0.22);
    const label = this.track(this.ctx.label(pos.x, pos.y, 'ERIC: ', {
      fontSize: `${s(13)}px`, color: '#93c5fd',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 3)) as Phaser.GameObjects.Text;
    let i = 0;
    const step = () => {
      i++;
      label.setText(`ERIC: ${text.slice(0, i)}`);
      if (i < text.length) this.delay(90, step);
      else this.delay(500, done);
    };
    step();
  }

  private awaitExactTyping(target: string, done: () => void): void {
    const { at, s } = this.layout();
    const pos = at(0, 0.22);
    // Without this, the scene just sits there waiting for an exact string with
    // zero on-screen clue what to type — reads as frozen rather than blocked.
    this.track(this.ctx.label(pos.x, pos.y - s(16), `(type: ${target})`, {
      fontSize: `${s(10)}px`, color: '#64748b', fontStyle: 'italic',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 3));
    const field = this.track(this.ctx.label(pos.x, pos.y, `ERIC: ${'_'.repeat(target.length)}`, {
      fontSize: `${s(14)}px`, color: '#93c5fd', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 3)) as Phaser.GameObjects.Text;

    let typed = '';
    const listener = (e: KeyboardEvent) => {
      if (this.modeEnded) return;
      const key = e.key.toLowerCase();
      if (key === 'enter') {
        if (typed === target) {
          this.removeKeyListener(listener);
          done();
        }
        return;
      }
      if (key.length !== 1) return;
      const result = nextTypedState(target, typed, key);
      if (result.advanced) {
        typed = result.typed;
        field.setText(`ERIC: ${typed}${'_'.repeat(target.length - typed.length)}`);
        this.safePlay('sfx_key_clack');
        if (result.complete) {
          // Auto-send on completion for short exact replies (why/omw): one ENTER,
          // or the completing keystroke itself, sends.
          this.delay(150, () => {
            if (this.modeEnded) return;
            this.removeKeyListener(listener);
            done();
          });
        }
      } else {
        // Wrong key: a 1px shake, no sound, no state change.
        this.trackTween(this.ctx.tweens.add({
          targets: field, x: field.x + 2, duration: 40, yoyo: true, repeat: 1,
        }));
      }
    };
    this.addKeyListener(listener);
  }

  private showChip(text: string, done: () => void): void {
    const { at, s } = this.layout();
    const pos = at(0, 0.3);
    const chip = this.ctx.add.rectangle(pos.x, pos.y, s(60), s(34), 0x1b2735)
      .setStrokeStyle(s(1), 0x475569).setScrollFactor(0).setDepth(D + 3).setInteractive({ useHandCursor: true });
    const chipLabel = this.ctx.label(pos.x, pos.y, text, {
      fontSize: `${s(20)}px`,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 4);
    this.track(chip);
    this.track(chipLabel);

    const send = () => {
      chip.destroy();
      chipLabel.destroy();
      this.removeKeyListener(enterListener);
      done();
    };
    chip.on('pointerdown', send);
    const enterListener = (e: KeyboardEvent) => {
      if (this.modeEnded) return;
      if (e.key === 'Enter') send();
    };
    this.addKeyListener(enterListener);
  }
}

/** Tiny local speaker resolver so the mode doesn't import the full chapters
 *  module (which would create a circular dependency back into game code). */
function resolveSpeakerLite(id: string): { name: string; emoji: string; color: string } {
  const table: Record<string, { name: string; emoji: string; color: string }> = {
    narrator: { name: 'The Group Chat', emoji: '💬', color: '#c8e89a' },
    narrator_eric: { name: 'Eric', emoji: '💬', color: '#c8e89a' },
    nick_f: { name: 'Nick F', emoji: '🗨️', color: '#60a5fa' },
    nick_h: { name: 'Nick H', emoji: '🗨️', color: '#f472b6' },
    jacob: { name: 'Jacob', emoji: '🗨️', color: '#a3a3a3' },
    eric: { name: 'Eric', emoji: '🗨️', color: '#93c5fd' },
    ben: { name: 'Ben Bersofsky', emoji: '🧪', color: '#84cc16' },
    maharko: { name: 'Maharko', emoji: '🏎️', color: '#22d3ee' },
  };
  return table[id] ?? { name: id.toUpperCase(), emoji: '🗨️', color: '#c8e89a' };
}

export const doubleCallMode: GameMode<DoubleCallConfig> = new DoubleCallMode();
export default doubleCallMode;

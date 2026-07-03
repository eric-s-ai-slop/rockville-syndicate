import Phaser from 'phaser';
import type { GameMode, ModeContext, ModeResult } from '../types';

// ─── storyFractures ──────────────────────────────────────────────────────────
// Foreground minigame for the UMBC chapter (parking lot). Maharko tells the
// group his version of the night; the player marks the details that don't add
// up. Mark every fracture -> win (the truth reassembles). Miss any by the end of
// the review window -> lose (the group lets the blur stand). Both endings are
// narratively valid; losing is the chapter's actual ending, so it's never punitive.
//
// Reuses already-loaded assets (the ModeContext facade exposes no loader):
//   stage_parking_lot_night  backdrop image
//   sfx_parking_ambient      cricket/night loop
//   ui_select                fracture-marked "clink"
//   sfx_knock                fracture-missed hollow tone
//   victory_jingle           win sting
//
// The engine freezes the player and shows the beat's introLines before start().

interface StorySegment {
  speaker?: string;
  text: string;
  fractureId?: string;
  fractureHint?: string;
}

interface StoryFracturesConfig {
  storySegments: StorySegment[];
  /** Characters per second for the reveal. */
  scrollSpeed?: number;
  /** ms to pause at the end for final clicks before resolving. */
  reviewWindow?: number;
  allowReplay?: boolean;
  maxAttempts?: number;
  /** Win overlay text. Defaults to the original UMBC/Maharko copy if omitted. */
  winTitle?: string;
  winBody?: string;
  /** Lose overlay text. Defaults to the original UMBC/Maharko copy if omitted. */
  loseBody?: string;
}

const DEPTH = {
  bg: 9000,
  scrim: 9001,
  text: 9100,
  hud: 9200,
  overlay: 9500,
  flash: 9800,
};

const GOLD = '#facc15';
const DIM = '#9aa0a8';
const RED = '#ef4444';
const INK = '#e8eaed';

// One rendered story paragraph + its fracture metadata.
interface SegmentView {
  seg: StorySegment;
  label: Phaser.GameObjects.Text;
  hint?: Phaser.GameObjects.Text;
  revealed: boolean;
  found: boolean;
}

export class StoryFracturesMode implements GameMode<StoryFracturesConfig> {
  id = 'storyFractures';

  private ctx!: ModeContext;
  private cfg!: StoryFracturesConfig;
  private onComplete: ((r: ModeResult) => void) | null = null;

  // tuning (filled from config in start)
  private scrollSpeed = 35;
  private reviewWindow = 3000;
  private allowReplay = true;
  private maxAttempts = 3;

  // run state
  private phase: 'idle' | 'revealing' | 'review' | 'resolved' = 'idle';
  private attempts = 0;
  private segViews: SegmentView[] = [];
  private foundFractures = new Set<string>();
  private totalFractures = 0;

  // reveal cursor
  private revealIndex = 0;       // which segment is currently typing
  private revealChars = 0;       // chars shown in the current segment
  private interSegmentWait = 0;  // ms pause between segments

  // bookkeeping for teardown
  private objs: Phaser.GameObjects.GameObject[] = [];
  private timers: Phaser.Time.TimerEvent[] = [];
  private ambient: Phaser.Sound.BaseSound | null = null;
  private counter: Phaser.GameObjects.Text | null = null;
  private ekgGraphics: Phaser.GameObjects.Graphics | null = null;
  private ekgTime = 0;
  private ekgSpiking = false;
  
  private bgImage: Phaser.GameObjects.Image | null = null;
  private textContainer: Phaser.GameObjects.Container | null = null;

  preload(): void {
    // No-op: all assets are loaded by ChapterScene. The facade has no loader.
  }

  start(ctx: ModeContext, config: StoryFracturesConfig, onComplete: (r: ModeResult) => void): void {
    this.ctx = ctx;
    this.cfg = config;
    this.onComplete = onComplete;

    this.scrollSpeed = config.scrollSpeed ?? 35;
    this.reviewWindow = config.reviewWindow ?? 3000;
    this.allowReplay = config.allowReplay ?? true;
    this.maxAttempts = config.maxAttempts ?? 3;
    this.totalFractures = new Set(
      config.storySegments.filter(s => s.fractureId).map(s => s.fractureId!)
    ).size;

    this.attempts = 0;
    this.ambient = this.playLoop('sfx_parking_ambient', 0.25);
    this.buildRun();
  }

  update(_time: number, delta: number): void {
    if (this.ekgGraphics) {
      this.ekgTime += delta;
      this.ekgGraphics.clear();
      const color = this.ekgSpiking ? 0xef4444 : 0x22d3ee; // red or cyan
      const amp = this.ekgSpiking ? 35 : 12;
      
      this.ekgGraphics.lineStyle(2, color, 0.9);
      this.ekgGraphics.beginPath();
      const startX = this.ctx.cameras.main.width / 2 - 250;
      const startY = 35;
      
      for (let i = 0; i < 500; i += 4) {
        let yOffset = 0;
        const cycle = (this.ekgTime + i * 2) % (this.ekgSpiking ? 200 : 1000);
        if (cycle > 100 && cycle < 160) {
          const qrs = cycle - 100;
          if (qrs < 10) yOffset = -amp * 0.4;
          else if (qrs < 30) yOffset = amp * 2.0;
          else yOffset = -amp * 0.7;
        }
        if (this.ekgSpiking) yOffset += (Math.random() - 0.5) * 12;
        
        if (i === 0) this.ekgGraphics.moveTo(startX + i, startY - yOffset);
        else this.ekgGraphics.lineTo(startX + i, startY - yOffset);
      }
      this.ekgGraphics.strokePath();
    }

    if (this.phase !== 'revealing') return;

    // Inter-segment pause so paragraphs land one at a time.
    if (this.interSegmentWait > 0) {
      this.interSegmentWait -= delta;
      return;
    }

    const view = this.segViews[this.revealIndex];
    if (!view) return;

    this.revealChars += (this.scrollSpeed * delta) / 1000;
    const full = view.seg.text;
    const shown = Math.min(full.length, Math.floor(this.revealChars));
    view.label.setText(full.slice(0, shown));

    if (shown >= full.length) {
      this.completeSegment(view);
      this.revealIndex += 1;
      this.revealChars = 0;
      this.interSegmentWait = view.seg.fractureId ? 1000 : 280; // wait longer if fracture to give time to react
      
      if (this.revealIndex < this.segViews.length) {
        // Scroll container if needed
        const nextView = this.segViews[this.revealIndex];
        const globalY = nextView.label.getData('origY') + (this.textContainer?.y || 0);
        const cam = this.ctx.cameras.main;
        if (globalY > cam.height - 150 && this.textContainer) {
          const shift = globalY - (cam.height - 150);
          this.ctx.tweens.add({
            targets: this.textContainer,
            y: this.textContainer.y - shift,
            duration: 400,
            ease: 'Sine.easeInOut'
          });
        }
      } else {
        // If the last segment is NOT a fracture, we can enter review/win immediately.
        // If it IS a fracture, completeSegment sets a timer that handles the win/lose.
        if (!view.seg.fractureId) this.enterReview();
      }
    }
  }

  teardown(): void {
    this.clearRun();
    if (this.ambient) {
      try { this.ambient.stop(); this.ambient.destroy(); } catch { /* already gone */ }
      this.ambient = null;
    }
    this.onComplete = null;
    this.phase = 'idle';
    this.ctx.cameras.main.setZoom(this.ctx.chapter?.cameraZoom ?? 2.0);
  }

  // ── run lifecycle ──────────────────────────────────────────────────────────

  private buildRun(): void {
    this.attempts += 1;
    this.phase = 'revealing';
    this.foundFractures.clear();
    this.segViews = [];
    this.revealIndex = 0;
    this.revealChars = 0;
    this.interSegmentWait = 0;
    this.ekgTime = 0;
    this.ekgSpiking = false;

    const cam = this.ctx.cameras.main;
    cam.setZoom(1);
    const vw = cam.width;
    const vh = cam.height;
    const wrapW = Math.min(vw * 0.74, 660);
    const leftX = (vw - wrapW) / 2;

    // Backdrop: parking lot image (cover) + dark scrim for legibility.
    if (this.ctx.textures.exists('stage_parking_lot_night')) {
      const img = this.ctx.add.image(vw / 2, vh / 2, 'stage_parking_lot_night')
        .setScrollFactor(0).setDepth(DEPTH.bg).setTint(0x4a4f5a);
      const src = this.ctx.textures.get('stage_parking_lot_night').getSourceImage() as HTMLImageElement;
      const cover = Math.max(vw / src.width, vh / src.height);
      img.setDisplaySize(src.width * cover, src.height * cover);
      this.bgImage = img;
      this.track(img);
    }
    this.track(
      this.ctx.add.rectangle(vw / 2, vh / 2, vw, vh, 0x05070a, 0.82)
        .setScrollFactor(0).setDepth(DEPTH.scrim)
    );

    // Speaker label + counter HUD.
    const speaker = this.cfg.storySegments[0]?.speaker ?? 'Maharko';
    this.track(
      this.ctx.label(leftX, 64, speaker, {
        fontSize: '20px', color: GOLD, fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
      }).setScrollFactor(0).setDepth(DEPTH.hud)
    );
    this.counter = this.ctx.label(leftX + wrapW, 66, '', {
      fontSize: '15px', color: DIM, stroke: '#000000', strokeThickness: 3,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH.hud);
    this.track(this.counter);
    this.updateCounter();

    this.ekgGraphics = this.ctx.add.graphics().setScrollFactor(0).setDepth(DEPTH.hud);
    this.track(this.ekgGraphics);

    this.textContainer = this.ctx.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH.text);
    this.track(this.textContainer);

    // Story paragraphs, stacked. Pre-measure with full text, then blank for reveal.
    let y = 112;
    for (const seg of this.cfg.storySegments) {
      const label = this.ctx.label(leftX, y, seg.text, {
        fontSize: '17px', color: INK, stroke: '#000000', strokeThickness: 3,
        wordWrap: { width: wrapW },
      } as Phaser.Types.GameObjects.Text.TextStyle);
      this.textContainer.add(label);
      this.track(label);

      const view: SegmentView = { seg, label, revealed: false, found: false };

      if (seg.fractureId) {
        // No hint anymore, the jitter is the hint!
      }

      view.label.setData('origX', leftX);
      view.label.setData('origY', y);
      this.segViews.push(view);
      y += label.height + 16;
      label.setText(''); // blank until revealed; position already fixed
    }

    // Footer instruction.
    this.track(
      this.ctx.label(vw / 2, vh - 40, 'When the lie detector spikes, smash the glitching lie!', {
        fontSize: '14px', color: '#22d3ee', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.hud)
    );
  }

  /** Destroy everything created for the current run (keeps the mode instance). */
  private clearRun(): void {
    this.timers.forEach(t => t.destroy());
    this.timers = [];
    this.objs.forEach(o => o.destroy());
    this.objs = [];
    this.segViews = [];
    this.counter = null;
    this.textContainer = null;
  }

  // ── reveal + marking ─────────────────────────────────────────────────────────

  private completeSegment(view: SegmentView): void {
    view.revealed = true;
    if (!view.seg.fractureId) return;

    this.ekgSpiking = true;
    this.playOnce('sfx_knock', 1.0); // sharp heartbeat
    
    view.label.setColor(RED);
    view.label.setInteractive({ useHandCursor: true });
    
    // Make the text violently jitter
    const jitterTween = this.ctx.tweens.add({
      targets: view.label,
      x: { value: { getEnd: (t: any, k: any, v: any) => view.label.getData('origX') + (Math.random() - 0.5) * 40 } },
      y: { value: { getEnd: (t: any, k: any, v: any) => view.label.getData('origY') + (Math.random() - 0.5) * 40 } },
      duration: 60,
      yoyo: true,
      repeat: -1,
    });

    let clicked = false;
    const checkClick = (pointer: any) => {
      if (clicked) return;
      
      const worldX = (this.textContainer ? this.textContainer.x : 0) + view.label.getData('origX');
      const worldY = (this.textContainer ? this.textContainer.y : 0) + view.label.getData('origY');
      const w = view.label.width;
      const h = view.label.height;
      const padding = 60; // Forgiving hit box to account for the jitter

      if (
        pointer.x >= worldX - padding &&
        pointer.x <= worldX + w + padding &&
        pointer.y >= worldY - padding &&
        pointer.y <= worldY + h + padding
      ) {
        clicked = true;
        this.ctx.physics.scene.input.off('pointerdown', checkClick);
        this.ekgSpiking = false;
        jitterTween.stop();
        view.label.setPosition(view.label.getData('origX'), view.label.getData('origY'));
        view.label.disableInteractive();
        this.markFracture(view);
      }
    };
    
    // Listen globally but mathematically restrict to the text's bounding box
    this.ctx.physics.scene.input.on('pointerdown', checkClick);

    // Short reaction window (2.8 seconds)
    this.addTimer(2800, () => {
      this.ctx.physics.scene.input.off('pointerdown', checkClick);
      if (!clicked) {
        this.ekgSpiking = false;
        jitterTween.stop();
        view.label.setPosition(view.label.getData('origX'), view.label.getData('origY'));
        view.label.setColor(DIM);
        view.label.disableInteractive();
        
        // Instant fail if you miss a fracture
        this.resolveLose();
      }
    });
  }

  private markFracture(view: SegmentView): void {
    if (view.found || !view.seg.fractureId) return;
    if (this.phase !== 'revealing' && this.phase !== 'review') return;

    view.found = true;
    this.foundFractures.add(view.seg.fractureId);
    this.playOnce('ui_select', 0.5);

    view.label.setColor(GOLD);
    this.ctx.tweens.add({
      targets: view.label, scale: 1.08, duration: 120, yoyo: true, ease: 'Quad.easeOut',
    });
    this.updateCounter();

    // Crumbling background effect (Idea 4)
    if (this.bgImage && this.totalFractures > 0) {
      const targetAlpha = 1 - (this.foundFractures.size / this.totalFractures);
      this.ctx.tweens.add({
        targets: this.bgImage,
        alpha: targetAlpha,
        duration: 400,
        ease: 'Sine.easeOut'
      });
    }

    if (this.foundFractures.size >= this.totalFractures) {
      this.resolveWin();
    }
  }

  private updateCounter(): void {
    this.counter?.setText(`FRACTURES  ${this.foundFractures.size} / ${this.totalFractures}`);
    if (this.foundFractures.size >= this.totalFractures) this.counter?.setColor(GOLD);
  }

  // ── resolution ───────────────────────────────────────────────────────────────

  private enterReview(): void {
    if (this.phase !== 'revealing') return;
    this.phase = 'review';
    
    // In the new hybrid mode, if we reach the end of the story without losing,
    // it means all fractures were successfully smashed!
    this.resolveWin();
  }

  private resolveWin(): void {
    if (this.phase === 'resolved') return;
    this.phase = 'resolved';
    this.ctx.tweens.killTweensOf(this.segViews.map(v => v.label));

    const cam = this.ctx.cameras.main;
    const flash = this.ctx.add.rectangle(cam.width / 2, cam.height / 2, cam.width, cam.height, 0xffffff, 0)
      .setScrollFactor(0).setDepth(DEPTH.flash);
    this.track(flash);
    this.ctx.tweens.add({ targets: flash, alpha: 0.85, duration: 120, yoyo: true });
    this.playOnce('victory_jingle', 0.5);
    if (this.ambient) this.ctx.tweens.add({ targets: this.ambient, volume: 0, duration: 600 });

    this.showOverlay(
      this.cfg.winTitle ?? 'The story couldn’t hold.',
      this.cfg.winBody ?? (
        'Ben said “you’re next” to three girls. Maharko was close enough to hear it. '
        + 'The frat guys pulled Ben off. Maharko knew right then.'
      ),
      GOLD,
    );
    this.addTimer(2800, () => this.finish('win'));
  }

  private resolveLose(): void {
    if (this.phase === 'resolved') return;
    this.phase = 'resolved';

    // Dim-red pulse on what was missed.
    this.segViews.filter(v => v.seg.fractureId && !v.found).forEach(v => {
      this.ctx.tweens.killTweensOf(v.label);
      v.label.setColor(RED).setAlpha(0.6);
      this.ctx.tweens.add({ targets: v.label, alpha: 0.95, duration: 500, yoyo: true, repeat: 1 });
    });
    this.playOnce('sfx_knock', 0.5);
    if (this.ambient) this.ctx.tweens.add({ targets: this.ambient, volume: 0, duration: 600 });

    this.showOverlay(
      '',
      this.cfg.loseBody ?? 'What Maharko saw — or didn’t see — was never asked again.',
      DIM,
    );

    const canReplay = this.allowReplay && this.attempts < this.maxAttempts;
    if (canReplay) {
      this.showButton(-90, 'Listen again', () => this.replay());
      this.showButton(90, 'Let it go', () => this.finish('lose'));
    } else {
      this.showButton(0, 'Continue', () => this.finish('lose'));
    }
  }

  private replay(): void {
    this.clearRun();
    if (this.ambient && !this.ambient.isPlaying) {
      try { this.ambient.play(); } catch { /* ctx not ready */ }
    }
    if (this.ambient) (this.ambient as Phaser.Sound.WebAudioSound).setVolume?.(0.25);
    this.buildRun();
  }

  private finish(outcome: 'win' | 'lose'): void {
    const cb = this.onComplete;
    this.onComplete = null;
    cb?.({ outcome });
  }

  // ── UI helpers ───────────────────────────────────────────────────────────────

  private showOverlay(title: string, body: string, bodyColor: string): void {
    const cam = this.ctx.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;

    this.track(
      this.ctx.add.rectangle(cx, cy, cam.width, cam.height, 0x05070a, 0.55)
        .setScrollFactor(0).setDepth(DEPTH.overlay)
    );
    if (title) {
      this.track(
        this.ctx.label(cx, cy - 70, title, {
          fontSize: '22px', color: bodyColor, fontStyle: 'bold', stroke: '#000000', strokeThickness: 5,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.overlay + 1)
      );
    }
    this.track(
      this.ctx.label(cx, cy, body, {
        fontSize: '17px', color: INK, align: 'center', stroke: '#000000', strokeThickness: 4,
        wordWrap: { width: Math.min(cam.width * 0.7, 560) },
      } as Phaser.Types.GameObjects.Text.TextStyle).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.overlay + 1)
    );
  }

  private showButton(dx: number, text: string, onClick: () => void): void {
    const cam = this.ctx.cameras.main;
    const x = cam.width / 2 + dx;
    const y = cam.height / 2 + 90;
    const btn = this.ctx.label(x, y, text, {
      fontSize: '16px', color: INK, fontStyle: 'bold', backgroundColor: '#1b2330',
      padding: { x: 14, y: 8 }, stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.overlay + 2).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setColor(GOLD));
    btn.on('pointerout', () => btn.setColor(INK));
    btn.on('pointerdown', onClick);
    this.track(btn);
  }

  // ── plumbing ─────────────────────────────────────────────────────────────────

  private track<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.objs.push(o);
    return o;
  }

  private addTimer(delay: number, cb: () => void): void {
    this.timers.push(this.ctx.time.delayedCall(delay, cb));
  }

  private playOnce(key: string, volume: number): void {
    try { this.ctx.sound.play(key, { volume }); } catch { /* key not loaded */ }
  }

  private playLoop(key: string, volume: number): Phaser.Sound.BaseSound | null {
    try {
      const s = this.ctx.sound.add(key, { loop: true, volume });
      s.play();
      return s;
    } catch { return null; }
  }
}

export const storyFracturesMode = new StoryFracturesMode();
export default storyFracturesMode;

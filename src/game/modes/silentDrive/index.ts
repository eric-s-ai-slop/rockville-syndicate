import Phaser from 'phaser';
import type { GameMode, ModeContext, ModeResult } from '../types';

// Generalized for Ch11 (Cabin From Hell) reuse — was previously hardcoded to
// Ch3b's Maharko/Ben car-ride scene. `config` is now optional; omitting it
// (or any individual field) falls back to the original Ch3b content, so
// existing callers with no config keep working unchanged.

export interface SilentDriveConfig {
  title?: string;
  askerId?: string;
  askerLabel?: string;
  askerColor?: string;
  responderId?: string;
  responderLabel?: string;
  responderColor?: string;
  promptOptions?: string[];
  responsePool?: string[];
  rounds?: number;
}

const DEFAULT_TITLE = 'THE DRIVE BACK';
const DEFAULT_ASKER_LABEL = 'Maharko';
const DEFAULT_ASKER_COLOR = '#a78bfa';
const DEFAULT_RESPONDER_LABEL = 'Ben';
const DEFAULT_RESPONDER_COLOR = '#94a3b8';
const DEFAULT_PROMPTS = [
  'Are you good?',
  'What was that back there?',
  'Ben, talk to me.',
  'Did something happen?',
  'Look at me.',
];
const DEFAULT_RESPONSES = ['...'];
const DEFAULT_ROUNDS = 3;

export class SilentDriveMode implements GameMode {
  id = 'silentDrive';
  private ctx!: ModeContext;
  private onCompleteCallback: ((result: ModeResult) => void) | null = null;

  private attempts = 0;
  private maxRounds = DEFAULT_ROUNDS;
  private title = DEFAULT_TITLE;
  private askerLabel = DEFAULT_ASKER_LABEL;
  private askerColor = DEFAULT_ASKER_COLOR;
  private responderLabel = DEFAULT_RESPONDER_LABEL;
  private responderColor = DEFAULT_RESPONDER_COLOR;
  private prompts = DEFAULT_PROMPTS;
  private responses = DEFAULT_RESPONSES;

  private scrim!: Phaser.GameObjects.Rectangle;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private isProcessing = false;

  preload(_ctx: ModeContext): void {}

  start(ctx: ModeContext, config: SilentDriveConfig | undefined, onComplete: (result: ModeResult) => void): void {
    this.ctx = ctx;
    this.onCompleteCallback = onComplete;
    this.attempts = 0;
    this.isProcessing = false;

    this.title = config?.title ?? DEFAULT_TITLE;
    this.askerLabel = config?.askerLabel ?? DEFAULT_ASKER_LABEL;
    this.askerColor = config?.askerColor ?? DEFAULT_ASKER_COLOR;
    this.responderLabel = config?.responderLabel ?? DEFAULT_RESPONDER_LABEL;
    this.responderColor = config?.responderColor ?? DEFAULT_RESPONDER_COLOR;
    this.prompts = config?.promptOptions?.length ? config.promptOptions : DEFAULT_PROMPTS;
    this.responses = config?.responsePool?.length ? config.responsePool : DEFAULT_RESPONSES;
    this.maxRounds = config?.rounds ?? DEFAULT_ROUNDS;

    const cam = ctx.cameras.main;
    const vw = cam.width;
    const vh = cam.height;

    this.scrim = ctx.add.rectangle(vw / 2, vh / 2, vw, vh, 0x05070a, 0.95).setScrollFactor(0).setDepth(10000);

    const title = ctx.label(vw / 2, 100, this.title, {
      fontSize: '24px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10000);
    this.optionTexts.push(title);

    this.renderOptions();
  }

  update(_time: number, _delta: number): void {}

  teardown(): void {
    this.scrim?.destroy();
    this.optionTexts.forEach(t => t.destroy());
    this.optionTexts = [];
    this.onCompleteCallback = null;
  }

  private renderOptions(): void {
    this.optionTexts.forEach(t => t.destroy());
    this.optionTexts = [];

    const cam = this.ctx.cameras.main;
    const vw = cam.width;
    const vh = cam.height;
    const startY = vh / 2 - 50;

    const available = Phaser.Utils.Array.Shuffle([...this.prompts]).slice(0, Math.min(3, this.prompts.length));

    available.forEach((text, i) => {
      const t = this.ctx.label(vw / 2, startY + i * 60, text, {
        fontSize: '18px', color: '#94a3b8', fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(10001);

      t.setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setColor('#ffffff'));
      t.on('pointerout', () => t.setColor('#94a3b8'));
      t.on('pointerdown', () => this.handlePick(text));

      this.optionTexts.push(t);
    });
  }

  private handlePick(text: string): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    this.optionTexts.forEach(t => t.destroy());
    this.optionTexts = [];

    const cam = this.ctx.cameras.main;
    const vw = cam.width;
    const vh = cam.height;

    const askerLine = this.ctx.label(vw / 2, vh / 2 - 40, `${this.askerLabel}: "${text}"`, {
      fontSize: '18px', color: this.askerColor,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10001);
    this.optionTexts.push(askerLine);

    this.ctx.time.delayedCall(1200, () => {
      const response = Phaser.Utils.Array.GetRandom(this.responses);
      const responderLine = this.ctx.label(vw / 2, vh / 2 + 20, `${this.responderLabel}: "${response}"`, {
        fontSize: '18px', color: this.responderColor,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(10001);
      this.optionTexts.push(responderLine);

      this.ctx.time.delayedCall(1500, () => {
        this.attempts++;
        if (this.attempts >= this.maxRounds) {
          if (this.onCompleteCallback) this.onCompleteCallback({ outcome: 'win' });
        } else {
          this.isProcessing = false;
          this.renderOptions();
        }
      });
    });
  }
}

export const silentDriveMode = new SilentDriveMode();
export default silentDriveMode;

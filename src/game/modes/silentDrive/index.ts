import Phaser from 'phaser';
import type { GameMode, ModeContext, ModeResult } from '../types';

export class SilentDriveMode implements GameMode {
  id = 'silentDrive';
  private ctx!: ModeContext;
  private onCompleteCallback: ((result: ModeResult) => void) | null = null;
  
  private attempts = 0;
  private maxAttempts = 3;
  private bgImg!: Phaser.GameObjects.Image;
  private scrim!: Phaser.GameObjects.Rectangle;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  
  private isProcessing = false;

  private prompts = [
    "Are you good?",
    "What was that back there?",
    "Ben, talk to me.",
    "Did something happen?",
    "Look at me."
  ];

  preload(ctx: ModeContext): void {}

  start(ctx: ModeContext, config: any, onComplete: (result: ModeResult) => void): void {
    this.ctx = ctx;
    this.onCompleteCallback = onComplete;
    this.attempts = 0;
    this.isProcessing = false;

    const cam = ctx.cameras.main;
    const vw = cam.width;
    const vh = cam.height;

    // Background
    if (this.ctx.textures.exists('maharko_camero_raw_png') || this.ctx.textures.exists('maharko_camero_raw_jpg')) {
        // We use a dark scrim since there is no interior art
    }
    
    this.scrim = ctx.add.rectangle(vw/2, vh/2, vw, vh, 0x05070a, 0.95).setScrollFactor(0).setDepth(10000);
    
    const title = ctx.label(vw/2, 100, "THE DRIVE BACK", {
        fontSize: '24px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10000);
    this.optionTexts.push(title); // Just to clean it up later

    this.renderOptions();
  }

  update(time: number, delta: number): void {}

  teardown(): void {
    this.scrim?.destroy();
    this.optionTexts.forEach(t => t.destroy());
    this.optionTexts = [];
    this.onCompleteCallback = null;
  }

  private renderOptions() {
    this.optionTexts.forEach(t => t.destroy());
    this.optionTexts = [];

    const cam = this.ctx.cameras.main;
    const vw = cam.width;
    const vh = cam.height;

    const startY = vh / 2 - 50;

    // Pick 3 random prompts
    const available = Phaser.Utils.Array.Shuffle([...this.prompts]).slice(0, 3);

    available.forEach((text, i) => {
        const t = this.ctx.label(vw/2, startY + i * 60, text, {
            fontSize: '18px', color: '#94a3b8', fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(10001);
        
        t.setInteractive({ useHandCursor: true });
        
        t.on('pointerover', () => t.setColor('#ffffff'));
        t.on('pointerout', () => t.setColor('#94a3b8'));
        
        t.on('pointerdown', () => this.handlePick(text));

        this.optionTexts.push(t);
    });
  }

  private handlePick(text: string) {
      if (this.isProcessing) return;
      this.isProcessing = true;

      // Clear options
      this.optionTexts.forEach(t => t.destroy());
      this.optionTexts = [];

      const cam = this.ctx.cameras.main;
      const vw = cam.width;
      const vh = cam.height;

      // Show Maharko's line
      const maharkoLabel = this.ctx.label(vw/2, vh/2 - 40, `Maharko: "${text}"`, {
          fontSize: '18px', color: '#a78bfa'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(10001);
      this.optionTexts.push(maharkoLabel);

      this.ctx.time.delayedCall(1200, () => {
          // Ben's response
          const benLabel = this.ctx.label(vw/2, vh/2 + 20, `Ben: "..."`, {
            fontSize: '18px', color: '#94a3b8'
          }).setOrigin(0.5).setScrollFactor(0).setDepth(10001);
          this.optionTexts.push(benLabel);

          this.ctx.time.delayedCall(1500, () => {
              this.attempts++;
              if (this.attempts >= this.maxAttempts) {
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

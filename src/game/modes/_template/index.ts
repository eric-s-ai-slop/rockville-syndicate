import Phaser from 'phaser';
import type { GameMode, ModeContext, ModeResult } from '../types';
import { screenSpace } from '../screenSpace';

export class TemplateMode implements GameMode {
  // Unique identifier for the mode, referenced by { type: 'minigame', modeId: 'template' } in chapter configuration.
  id = 'template';
  private ctx!: ModeContext;
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private onCompleteCallback: ((result: ModeResult) => void) | null = null;
  private spaceKey: Phaser.Input.Keyboard.Key | null = null;
  private statusText: Phaser.GameObjects.Text | null = null;

  /**
   * Preload assets specific to this minigame mode.
   * This is called automatically by ChapterScene during Phaser preloading.
   */
  preload(_ctx: ModeContext): void {
    // Example: ctx.load.image('special_item', 'assets/...');
  }

  /**
   * Start the minigame mode execution.
   * Call onComplete exactly once when the minigame resolves (win, lose, or skip).
   */
  start(ctx: ModeContext, _config: unknown, onComplete: (result: ModeResult) => void): void {
    this.ctx = ctx;
    this.onCompleteCallback = onComplete;

    // Freeze regular movement while playing if blocking (this is a blocking minigame by default)
    // Note: If running in background (with background: true beat config), do not freeze or block.
    
    // Set up a simple instruction text.
    // scrollFactor(0) HUD trap: the camera runs zoomed (~2.0), and scrollFactor(0) does
    // NOT cancel zoom — anything off camera-center renders displaced and zoom-inflated.
    // Always run screen coordinates through zx/zy and sizes/fonts through s().
    const cam = ctx.cameras.main;
    const { zx, zy, s } = screenSpace(cam);
    const cx = cam.width / 2;
    const cy = cam.height / 2;

    this.statusText = ctx.label(zx(cx), zy(cy - 80), 'PRESS SPACE WITHIN 3 SECONDS!', {
      fontSize: `${s(20)}px`,
      color: '#facc15',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: s(4)
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10000);

    // Setup input listeners
    this.spaceKey = ctx.physics.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Setup a 3-second timer
    this.timerEvent = ctx.time.addEvent({
      delay: 3000,
      callback: () => {
        this.resolveMinigame('lose');
      },
      callbackScope: this
    });
  }

  /**
   * Optional update tick, forwarded from the host scene's update() loop.
   */
  update(_time: number, _delta: number): void {
    if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.resolveMinigame('win');
    }
  }

  /**
   * Clean up all sprites, timers, UI, and event listeners created by this mode.
   * This is called automatically when the minigame resolves or the scene shuts down.
   */
  teardown(): void {
    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }
    if (this.statusText) {
      this.statusText.destroy();
      this.statusText = null;
    }
    if (this.spaceKey) {
      this.spaceKey.reset();
      this.spaceKey = null;
    }
    this.onCompleteCallback = null;
  }

  private resolveMinigame(outcome: 'win' | 'lose') {
    const callback = this.onCompleteCallback;
    if (callback) {
      // Show feedback
      if (this.statusText) {
        this.statusText.setText(outcome === 'win' ? 'SUCCESS!' : 'TIME UP!');
        this.statusText.setColor(outcome === 'win' ? '#4ade80' : '#ef4444');
      }
      
      // Delay slightly before finishing so the user sees the outcome
      this.ctx.time.delayedCall(800, () => {
        callback({ outcome });
      });
    }
  }
}

export const templateMode = new TemplateMode();
export default templateMode;

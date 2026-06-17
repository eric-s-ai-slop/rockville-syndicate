import Phaser from 'phaser';
import type { GameMode, ModeContext, ModeResult } from '../types';

export class FratAggroMode implements GameMode {
  id = 'fratAggro';
  private ctx!: ModeContext;
  private onCompleteCallback: ((result: ModeResult) => void) | null = null;
  
  private markerContainer!: Phaser.GameObjects.Container;
  private isModeOver = false;

  preload(ctx: ModeContext): void {}

  start(ctx: ModeContext, config: any, onComplete: (result: ModeResult) => void): void {
    this.ctx = ctx;
    this.onCompleteCallback = onComplete;
    this.isModeOver = false;

    // UI: Create the yellow marker over Ben
    const ben = this.getSprite('ben');
    if (ben) {
      this.markerContainer = this.createMarker(ben.x as number, ben.y as number, 'Confront Ben');
      ben.setInteractive({ useHandCursor: true });
      ben.on('pointerdown', () => this.handleBenClick());
    }

    // Camera follows the player
    ctx.cameras.main.startFollow(ctx.player, true, 0.1, 0.1);
  }

  update(time: number, delta: number): void {
    if (this.isModeOver) return;
    const ben = this.getSprite('ben');
    if (!ben) return;

    // Check distance between player and Ben
    const dist = Phaser.Math.Distance.Between(this.ctx.player.x as number, this.ctx.player.y as number, ben.x as number, ben.y as number);
    
    // Automatically trigger if close enough
    if (dist <= 80) {
      this.handleBenClick(true);
    }
  }

  teardown(): void {
    if (this.markerContainer) {
      this.markerContainer.destroy();
    }
    
    const ben = this.getSprite('ben');
    if (ben) {
      ben.disableInteractive();
      ben.off('pointerdown');
    }

    this.onCompleteCallback = null;
  }

  private handleBenClick(autoTriggered: boolean = false) {
    if (this.isModeOver) return;

    const ben = this.getSprite('ben');
    if (!ben) return;

    // If manually clicked but too far
    if (!autoTriggered) {
      const dist = Phaser.Math.Distance.Between(this.ctx.player.x as number, this.ctx.player.y as number, ben.x as number, ben.y as number);
      if (dist > 80) {
        this.ctx.showBubbleText(this.ctx.player as any, "I need to get closer.", '#ffffff');
        return;
      }
    }

    this.isModeOver = true;
    
    // Face each other
    if ((this.ctx.player as Phaser.GameObjects.Sprite).setFlipX) {
      (this.ctx.player as Phaser.GameObjects.Sprite).setFlipX((ben.x as number) < (this.ctx.player.x as number));
    }
    if ((ben as Phaser.GameObjects.Sprite).setFlipX) {
      (ben as Phaser.GameObjects.Sprite).setFlipX((this.ctx.player.x as number) < (ben.x as number));
    }

    this.ctx.showBubbleText(this.ctx.player as any, "Ben. What are you doing.", '#ffffff');
    
    if (this.markerContainer) {
      this.markerContainer.destroy();
    }
    
    this.ctx.time.delayedCall(1500, () => {
      if (this.onCompleteCallback) this.onCompleteCallback({ outcome: 'win' });
    });
  }

  private getSprite(actorId: string): any {
    const objs = this.ctx.actorSprites[actorId];
    if (!objs?.[0]) return undefined;
    return objs[0];
  }

  private createMarker(x: number, y: number, labelText: string): Phaser.GameObjects.Container {
    const s = (this.ctx as any).scene || this.ctx; // Use scene if available for adding complex objects
    const ring = this.ctx.add.circle(0, 0, 22, 0xfacc15, 0).setStrokeStyle(3, 0xfacc15, 0.9);
    const dot = this.ctx.add.circle(0, 0, 6, 0xfacc15, 0.9);
    const parts: Phaser.GameObjects.GameObject[] = [ring, dot];
    if (labelText) {
      const lbl = this.ctx.label(0, -36, labelText, {
        fontSize: '11px', color: '#fbbf24', fontStyle: 'bold',
        backgroundColor: '#0b1208e0', padding: { x: 7, y: 4 }, stroke: '#000000', strokeThickness: 2
      }).setOrigin(0.5);
      parts.push(lbl);
    }
    const container = this.ctx.add.container(x, y + 10, parts).setDepth(8000);
    this.ctx.tweens.add({ targets: ring, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 1100, repeat: -1, ease: 'Sine.easeOut' });
    this.ctx.tweens.add({ targets: container, y: y - 6 + 10, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return container;
  }
}

export const fratAggroMode = new FratAggroMode();
export default fratAggroMode;

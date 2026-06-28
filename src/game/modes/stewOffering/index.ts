import Phaser from 'phaser';
import type { GameMode, ModeContext, ModeResult } from '../types';

export class StewOfferingMode implements GameMode {
  id = 'stewOffering';
  private ctx!: ModeContext;
  private onCompleteCallback: ((result: ModeResult) => void) | null = null;
  
  private targetNpcs = ['girl1', 'girl2', 'girl3'];
  private interacted = new Set<string>();
  private offersCompleted = 0;
  private isMoving = false;
  
  private uiText: Phaser.GameObjects.Text | null = null;

  preload(ctx: ModeContext): void {}

  start(ctx: ModeContext, config: any, onComplete: (result: ModeResult) => void): void {
    this.ctx = ctx;
    this.onCompleteCallback = onComplete;
    this.interacted.clear();
    this.offersCompleted = 0;
    this.isMoving = false;

    // Center camera on Ben so it follows him
    const ben = this.getSprite('ben');
    const cam = ctx.cameras.main;
    
    if (ben) {
      cam.startFollow(ben, true, 0.05, 0.05);
    }

    const zoom = cam.zoom || 1.0;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    
    const txt = ctx.label(0, 0, 'OFFER STEW: 0 / 3\n(Click people to offer stew)', {
      fontSize: '20px',
      color: '#facc15',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);

    const bg = ctx.add.graphics();
    bg.fillStyle(0x0a0a0a, 0.85);
    bg.lineStyle(2, 0xfacc15, 0.5);
    bg.fillRoundedRect(-txt.width/2 - 15, -txt.height/2 - 10, txt.width + 30, txt.height + 20, 6);
    bg.strokeRoundedRect(-txt.width/2 - 15, -txt.height/2 - 10, txt.width + 30, txt.height + 20, 6);

    // Position at top center, scaled by inverse zoom to maintain visual size. Lowered Y to avoid CSS clipping.
    const targetX = cx;
    const targetY = (80 - cy) / zoom + cy;

    this.uiText = ctx.add.container(targetX, targetY, [bg, txt])
      .setScrollFactor(0)
      .setDepth(15000)
      .setScale(1 / zoom) as any;

    // Use txt as the updatable element
    (this.uiText as any)._txt = txt;

    if (ben) {
      ben.setInteractive({ useHandCursor: true });
      ben.on('pointerdown', () => {
        if (!this.isMoving) {
          ctx.showBubbleText(ben as any, "I should offer the stew to the others.", "#facc15");
        }
      });
    }

    // Make NPCs clickable and pulse them
    this.targetNpcs.forEach(id => {
      const sprite = this.getSprite(id);
      if (sprite) {
        sprite.setInteractive({ useHandCursor: true });
        sprite.on('pointerdown', () => this.handleNpcClick(id));
        
        // Add a pulsing glow to make it obvious they are targets
        ctx.tweens.add({
          targets: sprite,
          alpha: 0.6,
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    });
    // Allow clicking the floor to move Ben
    this.ctx.physics.scene.input.on('pointerdown', this.handleFloorClick, this);
  }

  update(time: number, delta: number): void {}

  teardown(): void {
    this.ctx.physics.scene.input.off('pointerdown', this.handleFloorClick, this);
    if (this.uiText) {
      this.uiText.destroy();
      this.uiText = null;
    }
    this.targetNpcs.forEach(id => {
      const sprite = this.getSprite(id);
      if (sprite) {
        sprite.disableInteractive();
        sprite.off('pointerdown');
        this.ctx.tweens.killTweensOf(sprite); // stop pulsing
        (sprite as any).setAlpha?.(1);
      }
    });
    const ben = this.getSprite('ben');
    if (ben) {
      ben.disableInteractive();
      ben.off('pointerdown');
    }
    this.ctx.cameras.main.stopFollow();
    // Resume following the player
    this.ctx.cameras.main.startFollow(this.ctx.player, true, 0.1, 0.1);
    this.onCompleteCallback = null;
  }

  private handleFloorClick(pointer: Phaser.Input.Pointer, currentlyOver: any[]) {
    // If we clicked on an interactive sprite (like a girl or UI), do nothing
    if (currentlyOver.length > 0) return;
    if (this.isMoving) return;

    const ben = this.getSprite('ben');
    if (!ben) return;

    this.isMoving = true;
    const targetX = pointer.worldX;
    const targetY = pointer.worldY;

    const dist = Phaser.Math.Distance.Between(ben.x as number, ben.y as number, targetX, targetY);
    const duration = Math.max(300, Math.min(dist * 6, 1500));

    if ((ben as Phaser.GameObjects.Sprite).setFlipX) {
      (ben as Phaser.GameObjects.Sprite).setFlipX(targetX < (ben.x as number));
    }

    const benNameplate = this.ctx.actorSprites['ben']?.[1] as Phaser.GameObjects.Text | undefined;
    const benShadow = this.ctx.actorSprites['ben']?.[2] as Phaser.GameObjects.Image | undefined;

    this.ctx.tweens.add({
      targets: ben,
      x: targetX,
      y: targetY,
      duration,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const s = ben as Phaser.GameObjects.Sprite;
        if (s.setDepth) s.setDepth(s.y);
        if (benNameplate) {
          benNameplate.setPosition(s.x, s.y - 38);
          benNameplate.setDepth(s.y + 200);
        }
        if (benShadow) {
          benShadow.setPosition(s.x, s.y + 18);
          benShadow.setDepth(s.y - 1);
        }
      },
      onComplete: () => {
        this.isMoving = false;
      }
    });
  }

  private handleNpcClick(npcId: string) {
    if (this.isMoving || this.interacted.has(npcId)) return;
    this.isMoving = true;
    
    const ben = this.getSprite('ben');
    const target = this.getSprite(npcId);
    if (!ben || !target) {
      this.isMoving = false;
      return;
    }

    const dist = Phaser.Math.Distance.Between(ben.x as number, ben.y as number, target.x as number, target.y as number);
    const duration = Math.max(300, Math.min(dist * 6, 1500)); // Ensure duration is at least 300ms

    this.ctx.tweens.killTweensOf(target); // stop the pulse
    (target as any).setAlpha?.(1);

    // Flip Ben towards target
    if ((ben as Phaser.GameObjects.Sprite).setFlipX) {
      (ben as Phaser.GameObjects.Sprite).setFlipX((target.x as number) < (ben.x as number));
    }

    const benNameplate = this.ctx.actorSprites['ben']?.[1] as Phaser.GameObjects.Text | undefined;
    const benShadow = this.ctx.actorSprites['ben']?.[2] as Phaser.GameObjects.Image | undefined;

    this.ctx.tweens.add({
      targets: ben,
      x: (target.x as number) + ((target.x as number) > (ben.x as number) ? -40 : 40),
      y: target.y,
      duration,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const s = ben as Phaser.GameObjects.Sprite;
        if (s.setDepth) s.setDepth(s.y);
        if (benNameplate) {
          benNameplate.setPosition(s.x, s.y - 38);
          benNameplate.setDepth(s.y + 200);
        }
        if (benShadow) {
          benShadow.setPosition(s.x, s.y + 18);
          benShadow.setDepth(s.y - 1);
        }
      },
      onComplete: () => {
        this.offerStew(npcId, target);
      }
    });
  }

  private offerStew(npcId: string, target: Phaser.GameObjects.GameObject) {
    const ben = this.getSprite('ben');
    this.interacted.add(npcId);
    
    // Bubble dialogue and audio
    if (ben) {
      this.ctx.showBubbleText(ben as any, "You're next.", '#ffffff');
      this.ctx.sound.play('sfx_ben_youre_next');
    }
    
    this.ctx.time.delayedCall(800, () => {
      this.ctx.showBubbleText(target as any, '?', '#ef4444');
      
      // NPC walks away
      const walkAwayX = (target as any).x + (Math.random() > 0.5 ? 150 : -150);
      const walkAwayY = (target as any).y + (Math.random() > 0.5 ? 100 : -100);
      
      if ((target as any).setFlipX) {
        (target as any).setFlipX(walkAwayX < (target as any).x);
      }
      
      const targetNameplate = this.ctx.actorSprites[npcId]?.[1] as Phaser.GameObjects.Text | undefined;
      const targetShadow = this.ctx.actorSprites[npcId]?.[2] as Phaser.GameObjects.Image | undefined;

      this.ctx.tweens.add({
        targets: target,
        x: walkAwayX,
        y: walkAwayY,
        duration: 2000,
        ease: 'Sine.easeOut',
        onUpdate: () => {
          const s = target as Phaser.GameObjects.Sprite;
          if (s.setDepth) s.setDepth(s.y);
          if (targetNameplate) {
            targetNameplate.setPosition(s.x, s.y - 38);
            targetNameplate.setDepth(s.y + 200);
          }
          if (targetShadow) {
            targetShadow.setPosition(s.x, s.y + 18);
            targetShadow.setDepth(s.y - 1);
          }
        }
      });
      
      this.offersCompleted++;
      if (this.uiText && (this.uiText as any)._txt) {
        (this.uiText as any)._txt.setText(`OFFER STEW: ${this.offersCompleted} / 3\n(Click people to offer stew)`);
      }
      
      this.isMoving = false;
      
      if (this.offersCompleted >= 3) {
        if (this.uiText) {
          this.uiText.destroy();
          this.uiText = null;
        }
        this.ctx.time.delayedCall(1500, () => {
          if (this.onCompleteCallback) this.onCompleteCallback({ outcome: 'win' });
        });
      }
    });
  }

  private getSprite(actorId: string): Phaser.GameObjects.Sprite | Phaser.GameObjects.Image | undefined {
    const objs = this.ctx.actorSprites[actorId];
    if (!objs?.[0]) return undefined;
    return objs[0] as Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  }
}

export const stewOfferingMode = new StewOfferingMode();
export default stewOfferingMode;

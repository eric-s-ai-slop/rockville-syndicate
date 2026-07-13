import Phaser from 'phaser';
import type { GameMode, ModeContext, ModeResult } from '../types';
import { Beat } from '../../../data/chapters';

export class PoolPartyMode implements GameMode {
  id = 'poolParty';
  private ctx!: ModeContext;

  start(ctx: ModeContext, config: any, onComplete: (result: ModeResult) => void): void {
    this.ctx = ctx;
    // This mode runs in the background concurrently with other story beats.
    // The BeatEngine advances immediately on start, but the mode remains active.
  }

  update(time: number, delta: number): void {
    // No-op for background ticker
  }

  teardown(): void {
    // Cleanup pool party state
  }

  onDialogue(beat: Extract<Beat, { type: 'dialogue' }>): void {
    const linesJoined = beat.lines.join(' ');

    // 1. Jacob enters the pool
    if (linesJoined.includes('Jacob Lebby enters the pool.')) {
      const jacob = this.ctx.propSprites.get('hero_jacob_sheet') as Phaser.GameObjects.Sprite | undefined;
      const jacobName = this.ctx.poolNameplates?.get('hero_jacob_sheet');
      if (jacob) {
        jacob.setTexture('npc_jacob_pool_sheet');
        if (jacob.play) {
          jacob.play('walk_side_npc_jacob_pool', true);
        }
        this.ctx.tweens.add({
          targets: jacob,
          x: 350,
          y: 390,
          duration: 2000,
          onUpdate: () => {
            jacob.setDepth(jacob.y);
            if (jacobName) {
              jacobName.setPosition(jacob.x, jacob.y - 38);
              jacobName.setDepth(jacob.y + 200);
            }
          },
          onComplete: () => {
            if (jacob.play) {
              jacob.play('idle_front_npc_jacob_pool', true);
            }
          }
        });
      }
    }

    // 2. Sam Ferretti appears at the gate
    if (linesJoined.includes('Then: Sam Ferretti appears at the gate.')) {
      const sam = this.ctx.propSprites.get('npc_sam_pool') as Phaser.GameObjects.Sprite | undefined;
      const samName = this.ctx.poolNameplates?.get('npc_sam_pool');
      if (sam) {
        sam.setPosition(480, 680).setVisible(true).setDepth(680);
        if (samName) {
          samName.setPosition(480, 680 - 38).setVisible(true).setDepth(680 + 200);
        }
        if (sam.play) {
          sam.play('walk_side_npc_sam_pool', true);
        }
        this.ctx.tweens.add({
          targets: sam,
          x: 760,
          y: 680,
          duration: 2500,
          onUpdate: () => {
            sam.setDepth(sam.y);
            if (samName) {
              samName.setPosition(sam.x, sam.y - 38);
              samName.setDepth(sam.y + 200);
            }
          },
          onComplete: () => {
            if (sam.play) {
              sam.play('idle_front_npc_sam_pool', true);
            }
          }
        });
      }
    }
  }

  onCameraPan(beat: Extract<Beat, { type: 'cameraPan' }>): void {
    // 1. Anastasia & Sophia arrival pan (x: 650, y: 428)
    if (beat.x === 650 && beat.y === 428) {
      const anastasia = this.ctx.propSprites.get('npc_anastasia_pool') as Phaser.GameObjects.Sprite | undefined;
      const sophia = this.ctx.propSprites.get('npc_sophia_pool') as Phaser.GameObjects.Sprite | undefined;
      const anastasiaName = this.ctx.poolNameplates?.get('npc_anastasia_pool');
      const sophiaName = this.ctx.poolNameplates?.get('npc_sophia_pool');

      if (anastasia && sophia) {
        anastasia.setVisible(false);
        sophia.setVisible(false);
        if (anastasiaName) anastasiaName.setVisible(false);
        if (sophiaName) sophiaName.setVisible(false);

        // Spawn + walk when camera reaches the hot tub (exactly at 1200ms)
        this.ctx.time.delayedCall(1200, () => {
          anastasia.setPosition(480, 650).setVisible(true).setDepth(650);
          sophia.setPosition(450, 660).setVisible(true).setDepth(660);
          if (anastasiaName) anastasiaName.setPosition(480, 650 - 38).setVisible(true).setDepth(650 + 200);
          if (sophiaName) sophiaName.setPosition(450, 660 - 38).setVisible(true).setDepth(660 + 200);

          if (anastasia.play) {
            anastasia.play('walk_side_npc_anastasia_pool', true);
          }
          if (sophia.play) {
            sophia.play('walk_side_npc_sophia_pool', true);
          }

          this.ctx.tweens.add({
            targets: anastasia,
            x: 650,
            y: 418,
            duration: 2500,
            onUpdate: () => {
              anastasia.setDepth(anastasia.y);
              if (anastasiaName) {
                anastasiaName.setPosition(anastasia.x, anastasia.y - 38);
                anastasiaName.setDepth(anastasia.y + 200);
              }
            },
            onComplete: () => {
              if (anastasia.play) {
                anastasia.play('submerged_idle_npc_anastasia_pool', true);
              }
            }
          });

          this.ctx.tweens.add({
            targets: sophia,
            x: 622,
            y: 498,
            duration: 2500,
            onUpdate: () => {
              sophia.setDepth(sophia.y);
              if (sophiaName) {
                sophiaName.setPosition(sophia.x, sophia.y - 38);
                sophiaName.setDepth(sophia.y + 200);
              }
            },
            onComplete: () => {
              if (sophia.play) {
                sophia.play('submerged_idle_npc_sophia_pool', true);
              }
            }
          });
        });
      }
    }

    // 2. Jacob arrival pan (x: 464, y: 654)
    if (beat.x === 464 && beat.y === 654) {
      const jacob = this.ctx.propSprites.get('hero_jacob_sheet') as Phaser.GameObjects.Sprite | undefined;
      const jacobName = this.ctx.poolNameplates?.get('hero_jacob_sheet');

      if (jacob) {
        jacob.setVisible(false);
        if (jacobName) jacobName.setVisible(false);

        // Spawn + walk when camera reaches the gate (exactly at 1400ms)
        this.ctx.time.delayedCall(1400, () => {
          jacob.setPosition(464, 654).setVisible(true).setDepth(654);
          if (jacobName) jacobName.setPosition(464, 654 - 38).setVisible(true).setDepth(654 + 200);

          if (jacob.play) {
            jacob.play('walk_back_jacob', true);
          }

          this.ctx.tweens.add({
            targets: jacob,
            y: 520,
            duration: 2000,
            onUpdate: () => {
              jacob.setDepth(jacob.y);
              if (jacobName) {
                jacobName.setPosition(jacob.x, jacob.y - 38);
                jacobName.setDepth(jacob.y + 200);
              }
            },
            onComplete: () => {
              if (jacob.play) {
                jacob.play('idle_front_jacob', true);
              }
            }
          });
        });
      }
    }
  }
}

export const poolPartyMode = new PoolPartyMode();
export default poolPartyMode;

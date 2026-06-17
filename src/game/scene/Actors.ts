import Phaser from 'phaser';
import type ChapterScene from '../ChapterScene';
import { ActorPlacement, resolveSpeaker } from '../../data/chapters';

export class Actors {
  private scene: ChapterScene;

  constructor(scene: ChapterScene) {
    this.scene = scene;
  }

  public placeActors(actors?: ActorPlacement[]) {
    (actors ?? this.scene.getActiveSceneConfig().actors).forEach((actor: ActorPlacement) => {
      // R5: if this slot is the player's hero, use the understudy if one is defined
      let renderAs = actor.id;
      if (actor.id === this.scene.playerClass.id) {
        if (actor.understudyId) {
          renderAs = actor.understudyId;
        } else {
          return; // skip — no understudy, slot stays empty (player is here)
        }
      }

      const speaker = resolveSpeaker(renderAs);
      // Prefer an explicit sprite key (e.g. an extra reusing another character's
      // sheet); otherwise the character's own processed sheet.
      const sheetKey = (actor.spriteKey && this.scene.textures.exists(actor.spriteKey))
        ? actor.spriteKey
        : `hero_${renderAs}_sheet`;
      const scale = actor.spriteScale ?? 0.5;
      let sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
      if (this.scene.textures.exists(sheetKey)) {
        const s = this.scene.add.sprite(actor.x, actor.y, sheetKey, 0);
        // R4: NPCs use a single static frame — no idle animation cycling
        s.setFrame(0);
        if (actor.id.startsWith('girl')) {
          s.setBlendMode(Phaser.BlendModes.MULTIPLY);
        }
        s.setScale(scale).setDepth(actor.y);
        sprite = s;
      } else {
        const g = this.scene.make.graphics({ x: 0, y: 0 });
        g.fillStyle(parseInt(speaker.color.replace('#', ''), 16), 1);
        g.fillCircle(20, 20, 20);
        g.generateTexture(`actor_${renderAs}`, 40, 40);
        g.destroy();
        sprite = this.scene.add.image(actor.x, actor.y, `actor_${renderAs}`).setScale(1).setDepth(actor.y);
      }
      // Nameplate floats above, well above Y-sorted range
      const nameplate = this.scene.label(actor.x, actor.y - 38, actor.nameOverride ?? speaker.name, {
        fontSize: '12px', color: speaker.color, fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 4
      }).setOrigin(0.5).setDepth(actor.y + 200);
      // Shadow at feet
      const shadow = this.scene.add.image(actor.x, actor.y + 18, 'shadow_ellipse')
        .setAlpha(0.28).setScale(0.7).setDepth(actor.y - 1);
      // Store under original id so hideActor() still works correctly
      this.scene.actorSprites[actor.id] = [sprite, nameplate, shadow];
    });
  }

  /** Hide an ambient actor (used when that character becomes the boss). */
  public hideActor(id: string) {
    (this.scene.actorSprites[id] ?? []).forEach(o => (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(false));
  }

  public applyDirectionalAnim(sprite: Phaser.GameObjects.Sprite, id: string, vx: number, vy: number, facesLeftByDefault = false) {
    const moving = vx !== 0 || vy !== 0;
    let dir: 'front' | 'side' | 'back' = 'front';

    if (moving) {
      if (Math.abs(vx) >= Math.abs(vy) && vx !== 0) {
        dir = 'side';
        // sprites are drawn facing right; flip when moving left (account for per-char default)
        const movingLeft = vx < 0;
        sprite.setFlipX(facesLeftByDefault ? !movingLeft : movingLeft);
      } else {
        dir = vy > 0 ? 'front' : 'back';   // down = toward camera (front), up = away (back)
        sprite.setFlipX(false);
      }
      // Save last direction in sprite data
      sprite.setData('lastDir', dir);
    } else {
      // Retain last direction if available
      dir = sprite.getData('lastDir') || 'front';
    }

    if (moving) {
      const base = 'walk_';
      const key = `${base}${dir === 'side' ? 'side' : dir}_${id}`;
      const fallback = `walk_${id}`;
      const finalKey = this.scene.anims.exists(key) ? key : fallback;
      if (sprite.anims.currentAnim?.key !== finalKey) sprite.play(finalKey, true);
    } else {
      sprite.anims.stop();
      const base = 'idle_';
      const key = `${base}${dir === 'side' ? 'side' : dir}_${id}`;
      const fallback = `idle_${id}`;
      const finalKey = this.scene.anims.exists(key) ? key : fallback;
      if (this.scene.anims.exists(finalKey)) {
        const anim = this.scene.anims.get(finalKey);
        if (anim && anim.frames && anim.frames.length > 0) {
          sprite.setFrame(anim.frames[0].frame.name);
        } else {
          sprite.setFrame(0);
        }
      } else {
        sprite.setFrame(0);
      }
    }
  }
}

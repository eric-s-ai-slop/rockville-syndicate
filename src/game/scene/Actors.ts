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
        if (sheetKey.endsWith('_raw')) {
          const s = this.scene.add.image(actor.x, actor.y, sheetKey);
          if (actor.id.startsWith('girl')) {
            s.setBlendMode(Phaser.BlendModes.MULTIPLY);
          }
          s.setScale(scale).setDepth(actor.y);
          sprite = s;
        } else {
          const s = this.scene.add.sprite(actor.x, actor.y, sheetKey, 0);
          // R4: NPCs use a single static frame — no idle animation cycling
          s.setFrame(0);
          if (actor.id.startsWith('girl')) {
            s.setBlendMode(Phaser.BlendModes.MULTIPLY);
          }
          s.setScale(scale).setDepth(actor.y);
          sprite = s;
        }
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

  /** Show an ambient actor. */
  public showActor(id: string) {
    (this.scene.actorSprites[id] ?? []).forEach(o => (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(true));
  }

  /** Tween a static actor to a new point, playing its walk anim en route and
   *  settling back to the static idle frame (R4) on arrival. Actors don't have
   *  a real pathfinder — this is a straight-line walk, meant for short story
   *  beats ("Jacob crosses to the booth"), not general navigation. */
  public moveActor(id: string, targetX: number, targetY: number, durationMs: number, onDone?: () => void) {
    const entry = this.scene.actorSprites[id];
    const sprite = entry?.[0] as (Phaser.GameObjects.Sprite | Phaser.GameObjects.Image) | undefined;
    const nameplate = entry?.[1] as Phaser.GameObjects.Text | undefined;
    const shadow = entry?.[2] as Phaser.GameObjects.Image | undefined;
    if (!sprite || !nameplate || !shadow) { onDone?.(); return; }

    // NPCs loaded through an explicit spriteKey (e.g. npc_chris_rivas_sheet)
    // register their walk anim under the full sheet key, not the actor id —
    // see SpriteLoader's npcSheets loop; heroes register under their character
    // id (SpriteLoader's main hero loop). Resolve whichever applies.
    const placement = this.scene.getActiveSceneConfig().actors?.find(a => a.id === id);
    const animId = placement?.spriteKey ?? id;
    const isSprite = sprite instanceof Phaser.GameObjects.Sprite;
    if (isSprite && Math.abs(targetX - sprite.x) > 1) {
      sprite.setFlipX(targetX < sprite.x);
    }
    if (isSprite) {
      const walkKey = `walk_${animId}`;
      if (this.scene.anims.exists(walkKey)) sprite.play(walkKey, true);
    }

    this.scene.tweens.add({
      targets: sprite, x: targetX, y: targetY, duration: durationMs, ease: 'Linear',
      onUpdate: () => {
        nameplate.setPosition(sprite.x, sprite.y - 38).setDepth(sprite.y + 200);
        shadow.setPosition(sprite.x, sprite.y + 18).setDepth(sprite.y - 1);
        sprite.setDepth(sprite.y);
      },
      onComplete: () => {
        if (isSprite) {
          sprite.anims.stop();
          sprite.setFrame(0);
        }
        onDone?.();
      },
    });
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

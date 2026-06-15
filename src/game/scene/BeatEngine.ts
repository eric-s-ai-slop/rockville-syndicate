import Phaser from 'phaser';
import type ChapterScene from '../ChapterScene';
import { Beat, resolveSpeaker } from '../../data/chapters';
import { getMode } from '../modes';
import type { ModeContext, ModeResult } from '../modes/types';

export class BeatEngine {
  public scene: ChapterScene;

  constructor(scene: ChapterScene) {
    this.scene = scene;
  }

  public startBeat(index: number) {
    if (index >= this.scene.chapter.beats.length) return;
    this.scene.beatIndex = index;
    this.scene.beatActive = true;
    const beat = this.scene.chapter.beats[index];

    switch (beat.type) {
      case 'dialogue': return this.runDialogueBeat(beat);
      case 'choice': return this.runChoiceBeat(beat);
      case 'walkTo': return this.runWalkToBeat(beat);
      case 'cameraPan': return this.runCameraPanBeat(beat);
      case 'bossFight': return this.runBossFightAsMinigame(beat);
      case 'chase': return this.scene.runChaseBeat(beat);
      case 'wait': return this.scene.time.delayedCall(beat.ms, () => this.advanceBeat());
      case 'ledger': this.scene.applyLedger(beat.delta, beat.note); return this.advanceBeat();
      case 'minigame': return this.runMinigameBeat(beat);
      case 'endChapter': return this.scene.runEndChapter();
    }
  }

  public advanceBeat() {
    this.scene.beatActive = false;
    this.startBeat(this.scene.beatIndex + 1);
  }

  public gotoBeatId(id: string) {
    const idx = this.scene.chapter.beats.findIndex(b => b.id === id);
    this.startBeat(idx >= 0 ? idx : this.scene.beatIndex + 1);
  }

  public freeze() {
    this.scene.dialogueOpen = true;
    if (this.scene.player) {
      this.scene.player.setVelocity(0, 0);
    }
  }

  public unfreeze() {
    this.scene.dialogueOpen = false;
  }

  private runDialogueBeat(beat: Extract<Beat, { type: 'dialogue' }>) {
    this.freeze();

    if (this.scene.activeMode?.onDialogue) {
      this.scene.activeMode.onDialogue(beat);
    }

    const s = resolveSpeaker(beat.speaker);
    this.scene.onStoryDialogue(
      {
        speakerName: s.name, speakerEmoji: s.emoji, speakerColor: s.color,
        portraitDataUrl: this.scene.portraitDataUrls[beat.speaker],
        lines: beat.lines,
      },
      () => { this.unfreeze(); this.advanceBeat(); }
    );
  }

  private runChoiceBeat(beat: Extract<Beat, { type: 'choice' }>) {
    this.freeze();
    this.scene.movementFrozen = true;
    const s = resolveSpeaker(beat.speaker);
    this.scene.onStoryDialogue(
      {
        speakerName: s.name, speakerEmoji: s.emoji, speakerColor: s.color,
        portraitDataUrl: this.scene.portraitDataUrls[beat.speaker],
        lines: [beat.prompt],
        choices: beat.options.map(o => ({ text: o.text })),
      },
      (choiceIndex?: number) => {
        this.scene.movementFrozen = false;
        const opt = beat.options[choiceIndex ?? 0];
        if (opt.ledgerDelta) this.scene.applyLedger(opt.ledgerDelta, opt.text);
        const proceed = () => {
          this.unfreeze();
          if (opt.goto) this.gotoBeatId(opt.goto); else this.advanceBeat();
        };
        if (opt.reactionLines && opt.reactionLines.length) {
          const rs = resolveSpeaker(opt.reactionSpeaker ?? beat.speaker);
          this.scene.onStoryDialogue(
            {
              speakerName: rs.name, speakerEmoji: rs.emoji, speakerColor: rs.color,
              portraitDataUrl: this.scene.portraitDataUrls[opt.reactionSpeaker ?? beat.speaker],
              lines: opt.reactionLines,
            },
            proceed
          );
        } else {
          proceed();
        }
      }
    );
  }

  private runWalkToBeat(beat: Extract<Beat, { type: 'walkTo' }>) {
    const radius = beat.radius ?? 60;
    this.scene.walkTarget = { x: beat.x, y: beat.y, radius, markerLabel: beat.markerLabel, marker: this.makeWalkMarker(beat.x, beat.y, beat.markerLabel) };
  }

  private makeWalkMarker(x: number, y: number, labelText?: string): Phaser.GameObjects.Container {
    const ring = this.scene.add.circle(0, 0, 22, 0xfacc15, 0).setStrokeStyle(3, 0xfacc15, 0.9);
    const dot = this.scene.add.circle(0, 0, 6, 0xfacc15, 0.9);
    const parts: Phaser.GameObjects.GameObject[] = [ring, dot];
    if (labelText) {
      const lbl = this.scene.label(0, -36, labelText, {
        fontSize: '11px', color: '#fbbf24', fontStyle: 'bold',
        backgroundColor: '#0b1208e0', padding: { x: 7, y: 4 }, stroke: '#000000', strokeThickness: 2
      }).setOrigin(0.5);
      parts.push(lbl);
    }
    const container = this.scene.add.container(x, y, parts).setDepth(8000);
    this.scene.tweens.add({ targets: ring, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 1100, repeat: -1, ease: 'Sine.easeOut' });
    this.scene.tweens.add({ targets: container, y: y - 6, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return container;
  }

  public clearWalkTarget() {
    this.scene.walkTarget?.marker?.destroy();
    this.scene.walkTarget = null;
  }

  private runCameraPanBeat(beat: Extract<Beat, { type: 'cameraPan' }>) {
    this.freeze();
    this.scene.movementFrozen = true;
    this.scene.showLetterbox();
    const cam = this.scene.cameras.main;
    cam.stopFollow();
    cam.pan(beat.x, beat.y, beat.durationMs, 'Sine.easeInOut', true);

    if (this.scene.activeMode?.onCameraPan) {
      this.scene.activeMode.onCameraPan(beat);
    }

    // Use delayedCall for timing guarantee — pan callback p===1 is unreliable at short distances.
    this.scene.time.delayedCall(beat.durationMs + (beat.holdMs ?? 600), () => {
      this.scene.hideLetterbox();
      if (this.scene.player) {
        cam.startFollow(this.scene.player, true, 0.1, 0.1);
      }
      this.scene.movementFrozen = false;
      this.unfreeze();
      this.advanceBeat();
    });
  }

  public buildModeContext(): ModeContext {
    const s = this.scene;
    return {
      player: s.player,
      cameras: s.cameras,
      time: s.time,
      tweens: s.tweens,
      physics: s.physics,
      sound: s.sound,
      add: s.add,
      make: s.make,
      textures: s.textures,
      anims: s.anims,
      projectiles: s.projectiles,
      enemies: s.enemies,
      enemyProjectiles: s.enemyProjectiles,
      lootShards: s.lootShards,
      walls: s.walls,
      audioController: s.audioController,
      label: (x, y, text, style) => s.label(x, y, text, style),
      showLetterbox: (dur) => s.showLetterbox(dur),
      hideLetterbox: (dur) => s.hideLetterbox(dur),
      showBubbleText: (target, text, color) => s.showBubbleText(target, text, color),
      showPassiveIconText: (x, y, text, color) => s.showPassiveIconText(x, y, text, color),
      showDamageNumber: (x, y, amount, color) => s.showDamageNumber(x, y, amount, color),
      setControlsInverted: (inverted) => s.setControlsInverted(inverted),
      triggerQTE: (boss, cb) => s.onTriggerQTE(boss, cb),
      logMessage: (msg) => s.onMessageLog(msg),
      onStoryDialogue: (payload, done) => s.onStoryDialogue(payload, done),
      get currentLevelIndex() { return s.currentLevelIndex; },
      set currentLevelIndex(val) { s.currentLevelIndex = val; },
      get spawnedBoss() { return s.spawnedBoss; },
      set spawnedBoss(val) { s.spawnedBoss = val; },
      get isBossActive() { return s.isBossActive; },
      set isBossActive(val) { s.isBossActive = val; },
      get qteActive() { return s.qteActive; },
      set qteActive(val) { s.qteActive = val; },
      hideActor: (id) => s.hideActor(id),
      damagePlayer: (amount, source) => s.damagePlayer(amount, source),
      get playerClass() { return s.playerClass; },
      chapter: s.chapter,
      applyDirectionalAnim: (sprite, id, vx, vy, facesLeftByDefault) => s.applyDirectionalAnim(sprite, id, vx, vy, facesLeftByDefault),
      propSprites: s.propSprites,
      poolNameplates: s.poolNameplates,
    };
  }

  private runMinigameBeat(beat: Extract<Beat, { type: 'minigame' }>) {
    const mode = getMode(beat.modeId);
    if (!mode) {
      console.warn(`[BeatEngine] Unknown minigame modeId: ${beat.modeId}`);
      return this.advanceBeat();
    }

    const context = this.buildModeContext();

    if (beat.background) {
      this.scene.activeMode = mode;
      if (mode.preload) {
        try {
          mode.preload(context);
        } catch (err) {
          console.error(`[BeatEngine] Preload failed for background mode ${beat.modeId}:`, err);
        }
      }
      mode.start(context, beat.config, (result) => {
        try {
          mode.teardown();
        } catch (err) {
          console.error(`[BeatEngine] Teardown failed for background mode ${beat.modeId}:`, err);
        }
        if (this.scene.activeMode === mode) {
          this.scene.activeMode = null;
        }
      });
      return this.advanceBeat();
    }

    this.freeze();
    this.scene.activeMode = mode;

    const launchMode = () => {
      if (mode.preload) {
        try {
          mode.preload(context);
        } catch (err) {
          console.error(`[BeatEngine] Preload failed for mode ${beat.modeId}:`, err);
        }
      }
      mode.start(context, beat.config, (result) => {
        try {
          mode.teardown();
        } catch (err) {
          console.error(`[BeatEngine] Teardown failed for mode ${beat.modeId}:`, err);
        }
        this.scene.activeMode = null;
        this.unfreeze();
        this.advanceBeat();
      });
    };

    if (beat.introLines && beat.introLines.length) {
      const s = resolveSpeaker('vs');
      this.scene.onStoryDialogue(
        {
          speakerName: s.name,
          speakerEmoji: s.emoji,
          speakerColor: s.color,
          portraitDataUrl: undefined,
          lines: beat.introLines,
        },
        () => launchMode()
      );
    } else {
      launchMode();
    }
  }

  private runBossFightAsMinigame(beat: Extract<Beat, { type: 'bossFight' }>) {
    const mode = getMode('bossFight');
    if (!mode) {
      console.warn(`[BeatEngine] bossFight mode not registered`);
      return this.advanceBeat();
    }

    this.freeze();

    const context = this.buildModeContext();
    this.scene.activeMode = mode;

    mode.start(context, beat, (result) => {
      try {
        mode.teardown();
      } catch (err) {
        console.error(`[BeatEngine] Teardown failed for bossFight:`, err);
      }
      this.scene.activeMode = null;
      this.unfreeze();
      this.advanceBeat();
    });
  }
}

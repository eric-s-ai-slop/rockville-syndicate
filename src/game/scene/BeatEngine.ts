import Phaser from 'phaser';
import type ChapterScene from '../ChapterScene';
import { Beat, resolveSpeaker } from '../../data/chapters';
import { getMode } from '../modes';
import type { ModeContext, ModeResult } from '../modes/types';
import { onceModeCompletion } from '../modes/lifecycle';
import { setRoseSilence } from '../progress';
import { mariaBrookeStats } from '../modes/mariaBrookeStats';

export class BeatEngine {
  public scene: ChapterScene;
  private lastMinigameResult: ModeResult | null = null;

  constructor(scene: ChapterScene) {
    this.scene = scene;
  }

  public startBeat(index: number) {
    if (index >= this.scene.chapter.beats.length) return;
    this.scene.beatIndex = index;
    this.scene.beatActive = true;
    const beat = this.scene.chapter.beats[index];
    if (import.meta.env.DEV) this.scene.recordPlaytestBeatStart?.(index, beat.type);

    switch (beat.type) {
      case 'dialogue': return this.runDialogueBeat(beat);
      case 'choice': return this.runChoiceBeat(beat);
      case 'walkTo': return this.runWalkToBeat(beat);
      case 'cameraPan': return this.runCameraPanBeat(beat);
      case 'hideActor': this.scene.hideActor(beat.id); return this.advanceBeat();
      case 'showActor': this.scene.showActor(beat.id); return this.advanceBeat();
      case 'moveActor': return this.scene.moveActor(beat.id, beat.x, beat.y, beat.durationMs, () => this.advanceBeat());
      case 'bossFight': return this.runBossFightAsMinigame(beat);
      case 'chase': return this.scene.runChaseBeat(beat);
      case 'sfx': {
        const { key, volume = 0.7, seek = 0 } = beat;
        try { if (this.scene.cache.audio.exists(key)) this.scene.sound.play(key, { volume, seek }); } catch {}
        return this.advanceBeat();
      }
      case 'wait': return this.scene.time.delayedCall(beat.ms, () => this.advanceBeat());
      case 'ledger': {
        this.scene.applyLedger(beat.delta, beat.note);
        try { if (this.scene.cache.audio.exists('sfx_ledger')) this.scene.sound.play('sfx_ledger', { volume: 0.7 }); } catch {}
        return this.advanceBeat();
      }
      case 'minigame': return this.runMinigameBeat(beat);
      case 'routeOnMinigame': return this.runRouteOnMinigame(beat);
      case 'stopAllAudio': this.scene.stopAllAudio(beat.fadeMs); return this.advanceBeat();
      case 'screenTint': {
        this.scene.setScreenTint(beat.color, beat.alpha, beat.durationMs, () => this.advanceBeat());
        return;
      }
      case 'changeScene': return this.scene.transitionToScene(beat.sceneIndex, beat.transitionMs, () => this.advanceBeat());
      case 'changeMusic': this.scene.audioController.crossfadeToMusic(beat.key); return this.advanceBeat();
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
        if (opt.sideEffect === 'rose_silence') setRoseSilence();
        else if (opt.sideEffect === 'maria_lookup') mariaBrookeStats.lookUps++;
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
    
    // Create the persistent HUD task popup
    let taskUi: Phaser.GameObjects.Container | undefined;
    if (beat.markerLabel) {
      const txt = this.scene.label(15, 10, `Task: ${beat.markerLabel}`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#facc15',
        fontStyle: 'bold'
      });
      const bg = this.scene.add.graphics();
      bg.fillStyle(0x0a0a0a, 0.85);
      bg.lineStyle(2, 0xfacc15, 0.5);
      bg.fillRoundedRect(0, 0, txt.width + 30, txt.height + 20, 6);
      bg.strokeRoundedRect(0, 0, txt.width + 30, txt.height + 20, 6);

      // Account for Phaser 3 camera zoom scaling on scrollFactor(0) objects
      const cam = this.scene.cameras.main;
      const cx = cam.width / 2;
      const cy = cam.height / 2;
      const zoom = cam.zoom || 1;
      
      const targetX = (20 - cx) / zoom + cx;
      const targetY = (60 - cy) / zoom + cy;
      const startX = (-250 - cx) / zoom + cx;

      taskUi = this.scene.add.container(startX, targetY, [bg, txt])
        .setScrollFactor(0)
        .setDepth(15000)
        .setScale(1 / zoom);
      
      // Slide in animation
      this.scene.tweens.add({
        targets: taskUi,
        x: targetX,
        duration: 400,
        ease: 'Back.easeOut'
      });
    }

    this.scene.walkTarget = { 
      x: beat.x, 
      y: beat.y, 
      radius, 
      markerLabel: beat.markerLabel, 
      marker: this.makeWalkMarker(beat.x, beat.y, beat.markerLabel),
      taskUi 
    };
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
    if (this.scene.walkTarget?.taskUi) {
      const ui = this.scene.walkTarget.taskUi;
      const cam = this.scene.cameras.main;
      const cx = cam.width / 2;
      const zoom = cam.zoom || 1;
      const offX = (-250 - cx) / zoom + cx;

      this.scene.tweens.add({
        targets: ui,
        x: offX,
        duration: 300,
        ease: 'Power2',
        onComplete: () => ui.destroy()
      });
    }
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
      if (beat.resumeFollow !== false && this.scene.player) {
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
      isPlayerInvuln: () => s.playerController.isInvuln(s.time.now),
      triggerQTE: (boss, cb) => s.onTriggerQTE(boss, cb),
      logMessage: (msg) => s.onMessageLog(msg),
      onStoryDialogue: (payload, done) => s.onStoryDialogue(payload, done),
      mountExternalGame: (opts, onDone) => s.mountExternalGame(opts, onDone),
      unmountExternalGame: () => s.unmountExternalGame(),
      get currentLevelIndex() { return s.currentLevelIndex; },
      set currentLevelIndex(val) { s.currentLevelIndex = val; },
      get spawnedBoss() { return s.spawnedBoss; },
      set spawnedBoss(val) { s.spawnedBoss = val; },
      get isBossActive() { return s.isBossActive; },
      set isBossActive(val) { s.isBossActive = val; },
      get qteActive() { return s.qteActive; },
      set qteActive(val) { s.qteActive = val; },
      hideActor: (id) => s.hideActor(id),
      showActor: (id) => s.showActor(id),
      damagePlayer: (amt, src) => s.damagePlayer(amt, src),
      get playerClass() { return s.playerClass; },
      chapter: s.chapter,
      applyDirectionalAnim: (sprite, id, vx, vy, facesLeftByDefault) => s.applyDirectionalAnim(sprite, id, vx, vy, facesLeftByDefault),
      propSprites: s.propSprites,
      poolNameplates: s.poolNameplates,
      actorSprites: s.actorSprites,
    };
  }

  private runRouteOnMinigame(beat: Extract<Beat, { type: 'routeOnMinigame' }>) {
    const data = this.lastMinigameResult?.data as Record<string, unknown> | undefined;
    const saidTrueThing = data?.saidTrueThing === true;
    const when = saidTrueThing ? (data?.when as string | undefined) : undefined;
    const target = (when && beat.cases[when]) ? beat.cases[when] : beat.default;
    if (target) this.gotoBeatId(target); else this.advanceBeat();
  }

  private runMinigameBeat(beat: Extract<Beat, { type: 'minigame' }>) {
    const mode = getMode(beat.modeId);
    if (!mode) {
      console.warn(`[BeatEngine] Unknown minigame modeId: ${beat.modeId}`);
      return this.advanceBeat();
    }

    const context = this.buildModeContext();

    if (beat.background) {
      // There is one active-mode slot. A new background beat replaces the
      // previous scene-local mode rather than leaving its singleton alive.
      this.scene.teardownActiveMode();
      this.scene.activeMode = mode;
      this.scene.activeModeBeatIndex = this.scene.beatIndex;
      this.scene.activeModeBackground = true;
      if (mode.preload) {
        try {
          mode.preload(context);
        } catch (err) {
          console.error(`[BeatEngine] Preload failed for background mode ${beat.modeId}:`, err);
        }
      }
      const launchBeatIndex = this.scene.beatIndex;
      const onComplete = onceModeCompletion((_result: ModeResult) => {
        // An old timer must not tear down a newer run of the same singleton.
        const ownsMode = this.scene.activeMode === mode && this.scene.activeModeBeatIndex === launchBeatIndex;
        if (ownsMode) {
          try {
            mode.teardown();
          } catch (err) {
            console.error(`[BeatEngine] Teardown failed for background mode ${beat.modeId}:`, err);
          }
          this.scene.activeMode = null;
          this.scene.activeModeBeatIndex = null;
          this.scene.activeModeBackground = false;
        }
      });
      // See GameMode.harnessForceComplete: lets the E2E/gauntlet harness force this
      // mode to resolve instead of waiting out its full real-time timeline.
      mode.harnessForceComplete = onComplete;
      mode.start(context, beat.config, onComplete);
      return this.advanceBeat();
    }

    this.freeze();
    // A foreground mode owns the active-mode slot and must end any
    // scene-local background mode before taking over the screen.
    this.scene.teardownActiveMode();

    const launchMode = () => {
      if (mode.preload) {
        try {
          mode.preload(context);
        } catch (err) {
          console.error(`[BeatEngine] Preload failed for mode ${beat.modeId}:`, err);
        }
      }
      // Only now — not before intro-lines dialogue gates on the player's click —
      // does the mode become `activeMode`. ChapterScene.update() calls
      // `activeMode.update()` unconditionally every frame; setting this before
      // mode.start() runs let it call update() on an uninitialized mode (ctx
      // unset, zones empty) during the intro card, throwing every frame and
      // wedging the game loop.
      this.scene.activeMode = mode;
      this.scene.activeModeBeatIndex = this.scene.beatIndex;
      this.scene.activeModeBackground = false;
      const onComplete = onceModeCompletion((result: ModeResult) => {
        this.lastMinigameResult = result;
        try {
          mode.teardown();
        } catch (err) {
          console.error(`[BeatEngine] Teardown failed for mode ${beat.modeId}:`, err);
        }
        this.scene.activeMode = null;
        this.scene.activeModeBeatIndex = null;
        this.scene.activeModeBackground = false;
        this.unfreeze();
        // On a loss, optionally jump back to a designated beat (e.g. restart the
        // car scene) instead of advancing into the post-win narration.
        if (result?.outcome === 'lose' && beat.loseGoto) {
          this.gotoBeatId(beat.loseGoto);
        } else {
          this.advanceBeat();
        }
      });
      // See GameMode.harnessForceComplete: lets the E2E/gauntlet harness force this
      // mode to resolve instead of waiting out its full real-time timeline.
      mode.harnessForceComplete = onComplete;
      mode.start(context, beat.config, onComplete);
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
    this.scene.teardownActiveMode();

    const context = this.buildModeContext();
    this.scene.activeMode = mode;
    this.scene.activeModeBeatIndex = this.scene.beatIndex;
    this.scene.activeModeBackground = false;

    const onComplete = onceModeCompletion((_result: ModeResult) => {
      try {
        mode.teardown();
      } catch (err) {
        console.error(`[BeatEngine] Teardown failed for bossFight:`, err);
      }
      this.scene.activeMode = null;
      this.scene.activeModeBeatIndex = null;
      this.scene.activeModeBackground = false;
      this.unfreeze();
      this.advanceBeat();
    });
    // See GameMode.harnessForceComplete: lets the E2E/gauntlet harness force this
    // mode to resolve instead of waiting out its full real-time timeline.
    mode.harnessForceComplete = onComplete;
    mode.start(context, beat, onComplete);
  }
}

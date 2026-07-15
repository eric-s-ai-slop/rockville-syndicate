import Phaser from 'phaser';
import { GameMode, ModeContext, ModeResult } from '../types';

export interface CarRideResponse {
  text: string;
  correct: boolean;
}

export interface CarRidePhase {
  id: number;
  defense: string;
  responses: CarRideResponse[];
}

export interface CarRideConfig {
  bossName: string;
  bossTitle: string;
  timer: number;
  phases: CarRidePhase[];
  combatBarks: string[];
  deathQuote: string;
  /** Actor id whose sprite speaks the barks/defenses (defaults to 'maharko', the mode's original chapter5b use). */
  actorId?: string;
}

interface CarRideRuntime {
  updateFn?: (delta: number) => void;
  cleanupFn?: () => void;
}

export const carRideMode: GameMode<CarRideConfig> = {
  id: 'carRide',

  start(ctx: ModeContext, config: CarRideConfig, onComplete: (result: ModeResult) => void) {
    ctx.player.setVelocity(0, 0);
    ctx.showLetterbox();

    // Pan to wherever the player is when the beat fires ("back seat" framing) —
    // derive from the player's current position, not a chapter-specific world
    // coordinate, so this reads correctly on maps of any size.
    ctx.cameras.main.pan(ctx.player.x, ctx.player.y, 1000, 'Sine.easeInOut');

    // Timer setup
    let timeRemaining = config.timer;
    let currentPhaseIndex = 0;
    let isWaitingForResponse = false;
    let isTransitioning = false;

    // UI elements — positioned from the camera viewport (benTrivia's pattern), not
    // a hardcoded map-width-dependent x, so framing holds across chapters.
    const cam = ctx.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    const visH = cam.height / cam.zoom;

    const timerBarBg = ctx.add.rectangle(cx, 20, 400, 10, 0x000000).setScrollFactor(0).setDepth(20000);
    const timerBar = ctx.add.rectangle(cx - 200, 20, 400, 10, 0x00ff00).setScrollFactor(0).setDepth(20001).setOrigin(0, 0.5);
    const timerLabel = ctx.label(cx, 35, 'DRIVE HOME', { fontSize: '10px', color: '#ffffff' }).setScrollFactor(0).setDepth(20000).setOrigin(0.5);

    const opponentId = config.actorId ?? 'maharko';
    const opponentSprite = ctx.actorSprites[opponentId]?.[0] as Phaser.GameObjects.Sprite | undefined;

    // Intro animation (simulate bossFight intro)
    const overlayText = ctx.label(cx, cy - visH * 0.05, config.bossName.toUpperCase(), {
      fontSize: '48px', color: '#ef4444', fontStyle: 'bold', stroke: '#000000', strokeThickness: 6
    }).setScrollFactor(0).setDepth(20000).setAlpha(0).setOrigin(0.5).setScale(0.5);

    const subtitle = ctx.label(cx, cy + visH * 0.05, config.bossTitle, {
      fontSize: '18px', color: '#ffffff', stroke: '#000000', strokeThickness: 3
    }).setScrollFactor(0).setDepth(20000).setAlpha(0).setOrigin(0.5);

    ctx.tweens.add({
      targets: overlayText,
      scale: 1,
      alpha: 1,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        ctx.tweens.add({
          targets: subtitle,
          alpha: 1,
          duration: 300,
          onComplete: () => {
            ctx.cameras.main.flash(200, 255, 255, 255);
            ctx.cameras.main.shake(200, 0.01);
            ctx.time.delayedCall(1500, () => {
              ctx.tweens.add({
                targets: [overlayText, subtitle],
                alpha: 0,
                duration: 300,
                onComplete: () => startNextPhase()
              });
            });
          }
        });
      }
    });

    let barksTimer: Phaser.Time.TimerEvent;

    const scheduleBark = () => {
      if (barksTimer) barksTimer.remove();
      barksTimer = ctx.time.addEvent({
        delay: Phaser.Math.Between(5000, 8000),
        callback: () => {
          if (!isWaitingForResponse && !isTransitioning && opponentSprite) {
            const bark = Phaser.Utils.Array.GetRandom(config.combatBarks);
            ctx.showBubbleText(opponentSprite, bark, '#ffffff');
          }
          scheduleBark();
        }
      });
    };

    let gameOverTriggered = false;

    const triggerLose = () => {
      if (gameOverTriggered) return;
      gameOverTriggered = true;
      if (barksTimer) barksTimer.remove();
      ctx.onStoryDialogue({
        speakerName: 'The Group Chat',
        speakerEmoji: '💬',
        speakerColor: '#c8e89a',
        lines: ["The car arrived home. You didn't get to say all of it."]
      }, () => {
        onComplete({ outcome: 'lose' });
      });
    };

    const startNextPhase = () => {
      if (gameOverTriggered) return;
      if (currentPhaseIndex >= config.phases.length) {
        gameOverTriggered = true;
        if (barksTimer) barksTimer.remove();
        if (opponentSprite) ctx.showBubbleText(opponentSprite, config.deathQuote, '#ef4444');
        ctx.time.delayedCall(3000, () => {
          ctx.cameras.main.fadeOut(1000, 0, 0, 0);
          ctx.time.delayedCall(1200, () => {
            ctx.cameras.main.fadeIn(500, 0, 0, 0);
            onComplete({ outcome: 'win' });
          });
        });
        return;
      }

      isTransitioning = false;
      isWaitingForResponse = false;
      const phase = config.phases[currentPhaseIndex];
      
      if (opponentSprite) {
        ctx.showBubbleText(opponentSprite, phase.defense, '#ffffff');
      }

      // Wait a moment before showing options
      ctx.time.delayedCall(2000, () => {
        if (gameOverTriggered) return;
        isWaitingForResponse = true;
        
        ctx.onStoryDialogue({
          speakerName: 'You',
          speakerEmoji: '🗨️',
          speakerColor: '#6ee7b7',
          lines: ["(Choose a response...)"],
          choices: phase.responses.map(r => ({ text: r.text }))
        }, (choiceIndex?: number) => {
          if (gameOverTriggered) return;
          isWaitingForResponse = false;
          const chosen = phase.responses[choiceIndex ?? 0];
          
          if (chosen.correct) {
            // Success
            ctx.cameras.main.flash(200, 100, 255, 100);
            ctx.cameras.main.shake(200, 0.01);
            ctx.logMessage(`Phase ${phase.id} broken!`);
            if (opponentSprite) {
              ctx.showDamageNumber(opponentSprite.x, opponentSprite.y - 40, phase.id, '#00ff00');
            }
            // Transition
            isTransitioning = true;
            ctx.time.delayedCall(1500, () => {
              currentPhaseIndex++;
              startNextPhase();
            });
          } else {
            // Fail
            ctx.cameras.main.flash(200, 255, 0, 0);
            ctx.damagePlayer(15, 'Wrong response');
            ctx.logMessage(`Wrong — ${config.bossName} doubles down`);
            if (opponentSprite) {
              const bark = Phaser.Utils.Array.GetRandom(config.combatBarks);
              ctx.showBubbleText(opponentSprite, bark, '#ef4444');
            }
            
            // Re-show same phase after a delay
            isTransitioning = true;
            ctx.time.delayedCall(2000, () => {
              startNextPhase();
            });
          }
        });
      });

      scheduleBark();
    };

    const updateTimer = (delta: number) => {
      if (gameOverTriggered) return;
      
      timeRemaining -= delta;
      if (timeRemaining <= 0) {
        timeRemaining = 0;
        triggerLose();
      }

      const ratio = Math.max(0, timeRemaining / config.timer);
      timerBar.width = 400 * ratio;
      
      if (ratio > 0.5) timerBar.fillColor = 0x00ff00;
      else if (ratio > 0.25) timerBar.fillColor = 0xffff00;
      else timerBar.fillColor = 0xff0000;
    };

    // Store references on mode instance for update/teardown
    const runtime = this as typeof carRideMode & CarRideRuntime;
    runtime.updateFn = updateTimer;
    runtime.cleanupFn = () => {
      if (barksTimer) barksTimer.remove();
      timerBarBg.destroy();
      timerBar.destroy();
      timerLabel.destroy();
      overlayText.destroy();
      subtitle.destroy();
      ctx.hideLetterbox();
    };
  },

  update(time: number, delta: number) {
    const runtime = this as typeof carRideMode & CarRideRuntime;
    if (runtime.updateFn) {
      runtime.updateFn(delta);
    }
  },

  teardown() {
    const runtime = this as typeof carRideMode & CarRideRuntime;
    if (runtime.cleanupFn) {
      runtime.cleanupFn();
    }
  }
};

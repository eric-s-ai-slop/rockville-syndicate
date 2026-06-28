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
}

export const carRideMode: GameMode<CarRideConfig> = {
  id: 'carRide',

  start(ctx: ModeContext, config: CarRideConfig, onComplete: (result: ModeResult) => void) {
    ctx.player.setVelocity(0, 0);
    ctx.showLetterbox();
    
    // Pan to back seat
    ctx.cameras.main.pan(460, 360, 1000, 'Sine.easeInOut');

    // Timer setup
    let timeRemaining = config.timer;
    let currentPhaseIndex = 0;
    let isWaitingForResponse = false;
    let isTransitioning = false;
    
    // UI elements
    const timerBarBg = ctx.add.rectangle(460, 20, 400, 10, 0x000000).setScrollFactor(0).setDepth(20000);
    const timerBar = ctx.add.rectangle(260, 20, 400, 10, 0x00ff00).setScrollFactor(0).setDepth(20001).setOrigin(0, 0.5);
    const timerLabel = ctx.label(460, 35, 'DRIVE HOME', { fontSize: '10px', color: '#ffffff' }).setScrollFactor(0).setDepth(20000).setOrigin(0.5);

    const maharkoActor = ctx.chapter.scenes?.[ctx.currentLevelIndex]?.actors?.find(a => a.id === 'maharko');
    const maharkoSprite = ctx.actorSprites['maharko']?.[0] as Phaser.GameObjects.Sprite | undefined;

    // Intro animation (simulate bossFight intro)
    const overlayText = ctx.label(460, 330, config.bossName.toUpperCase(), { 
      fontSize: '48px', color: '#ef4444', fontStyle: 'bold', stroke: '#000000', strokeThickness: 6 
    }).setScrollFactor(0).setDepth(20000).setAlpha(0).setOrigin(0.5).setScale(0.5);
    
    const subtitle = ctx.label(460, 370, config.bossTitle, { 
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
          if (!isWaitingForResponse && !isTransitioning && maharkoSprite) {
            const bark = Phaser.Utils.Array.GetRandom(config.combatBarks);
            ctx.showBubbleText(maharkoSprite, bark, '#ffffff');
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
        if (maharkoSprite) ctx.showBubbleText(maharkoSprite, config.deathQuote, '#ef4444');
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
      
      if (maharkoSprite) {
        ctx.showBubbleText(maharkoSprite, phase.defense, '#ffffff');
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
            if (maharkoSprite) {
              ctx.showDamageNumber(maharkoSprite.x, maharkoSprite.y - 40, phase.id, '#00ff00');
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
            ctx.logMessage("Wrong — Maharko doubles down");
            if (maharkoSprite) {
              const bark = Phaser.Utils.Array.GetRandom(config.combatBarks);
              ctx.showBubbleText(maharkoSprite, bark, '#ef4444');
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
    (this as any).updateFn = updateTimer;
    (this as any).cleanupFn = () => {
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
    if ((this as any).updateFn) {
      (this as any).updateFn(delta);
    }
  },

  teardown() {
    if ((this as any).cleanupFn) {
      (this as any).cleanupFn();
    }
  }
};

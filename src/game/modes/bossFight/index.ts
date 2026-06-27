import Phaser from 'phaser';
import { GameMode, ModeContext, ModeResult } from '../types';
import { BOSSES, BossConfig, WEAPONS } from '../../../data/entities';

export class BossFightMode implements GameMode<any> {
  public readonly id = 'bossFight';

  private ctx!: ModeContext;
  private onCompleteCallback?: (result: ModeResult) => void;

  // Boss specific state
  private bossData: BossConfig | null = null;
  private currentBossHp = 0;
  private lastBossAttackTime = 0;
  private bossHpBg: Phaser.GameObjects.Rectangle | null = null;
  private bossHpFill: Phaser.GameObjects.Rectangle | null = null;
  private bossNameLabel: Phaser.GameObjects.Text | null = null;
  private bossShadow: Phaser.GameObjects.Image | null = null;
  private bossHitFlashing = false;
  private qteTimerEvent: Phaser.Time.TimerEvent | null = null;
  private isFightActive = false;

  preload(ctx: ModeContext) {
    // Assets are preloaded by ChapterScene
  }

  start(ctx: ModeContext, config: any, onComplete: (result: ModeResult) => void) {
    this.ctx = ctx;
    this.onCompleteCallback = onComplete;
    this.isFightActive = true;

    // config might be empty or might contain bossId, arena, and introLines.
    const bossId = config?.bossId ?? BOSSES[ctx.currentLevelIndex % BOSSES.length].id;
    const actorToHide = config?.hideActorId ?? bossId.replace('boss_', '');
    this.ctx.hideActor(actorToHide);

    const bossConfig = BOSSES.find(b => b.id === bossId) ?? BOSSES[0];
    const intro = config?.introLines ?? [];

    const launchFight = () => {
      ctx.audioController.startBossMusic();
      // Freeze movement and dialog
      // Note: BeatEngine has freeze/unfreeze but ModeContext has physics and dialogOpen is handled outside.
      // We can just set player velocity to 0 and handle freeze/unfreeze ourselves or set dialogOpen.
      // But wait! Is there a freeze/unfreeze helper?
      // We can set player velocity to 0 and pause update.
      ctx.player.setVelocity(0, 0);
      ctx.showLetterbox();
      
      const cam = ctx.cameras.main;
      const ax = config?.arena ? config.arena.x : ctx.chapter.map.width / 2;
      const ay = config?.arena ? config.arena.y - (config.arena.h ?? 0) / 2 + 60 : 120;
      
      cam.stopFollow();
      cam.pan(ax, ay, 550, 'Sine.easeInOut', true);

      ctx.time.delayedCall(550, () => {
        const cx = cam.width / 2;
        const cy = cam.height / 2;
        const nameLabel = ctx.label(cx, cy - 30, bossConfig.name.toUpperCase(), {
          fontSize: '28px', color: '#ef4444', fontStyle: 'bold',
          stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setScrollFactor(0).setDepth(12000).setScale(3).setAlpha(0);
        
        const titleLabel = ctx.label(cx, cy + 14, bossConfig.title, {
          fontSize: '13px', color: '#fca5a5', fontStyle: 'italic',
          stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setScrollFactor(0).setDepth(12000).setAlpha(0);
        
        cam.flash(80, 239, 68, 68);
        cam.shake(160, 0.018);

        ctx.tweens.add({
          targets: nameLabel, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut',
          onComplete: () => {
            ctx.tweens.add({ targets: titleLabel, alpha: 1, duration: 200 });
          }
        });

        ctx.time.delayedCall(900, () => {
          ctx.tweens.add({
            targets: [nameLabel, titleLabel], alpha: 0, y: '-=20', duration: 300,
            onComplete: () => { nameLabel.destroy(); titleLabel.destroy(); }
          });
          ctx.hideLetterbox(300);
          ctx.time.delayedCall(320, () => {
            cam.startFollow(ctx.player, true, 0.1, 0.1);
            this.summonBossMatch(bossId, config?.arena);
            if (bossId === 'boss_audrey') {
              ctx.setControlsInverted(true);
              ctx.logMessage('🩸 Red Pee Bladder Syndrome: controls are REVERSED for this entire fight.');
            }
          });
        });
      });
    };

    if (intro.length) {
      // Freeze logic for dialogue
      ctx.player.setVelocity(0, 0);
      ctx.onStoryDialogue(
        { speakerName: 'VS', speakerEmoji: '⚔️', speakerColor: '#ef4444', lines: intro },
        () => launchFight()
      );
    } else {
      launchFight();
    }
  }

  update(time: number, delta: number) {
    if (!this.isFightActive) return;
    this.handleBossAI(time);
    this.updateBossHpBarPosition();
  }

  teardown() {
    this.isFightActive = false;
    this.destroyBossHpBar();
    if (this.bossShadow) { this.bossShadow.destroy(); this.bossShadow = null; }
    if (this.ctx.spawnedBoss) { this.ctx.spawnedBoss.destroy(); this.ctx.spawnedBoss = null; }
    this.ctx.isBossActive = false;
    this.bossHitFlashing = false;
    this.ctx.setControlsInverted(false);
    this.ctx.audioController.stopBossMusic();
    if (this.qteTimerEvent) { this.qteTimerEvent.destroy(); this.qteTimerEvent = null; }
  }

  private summonBossMatch(bossConfigId: string, arena?: { x: number; y: number; w: number; h: number }) {
    if (this.ctx.isBossActive) return;

    if (this.ctx.spawnedBoss) {
      this.ctx.spawnedBoss.destroy();
      this.ctx.spawnedBoss = null;
    }
    this.destroyBossHpBar();
    if (this.bossShadow) { this.bossShadow.destroy(); this.bossShadow = null; }

    this.ctx.isBossActive = true;
    const config = BOSSES.find(b => b.id === bossConfigId) ?? BOSSES[this.ctx.currentLevelIndex % BOSSES.length];
    this.bossData = config;
    this.currentBossHp = config.maxHp;
    this.lastBossAttackTime = this.ctx.time.now;

    this.ctx.logMessage(`⚠️ BOSS INCOMING: ${config.name} — ${config.title}!`);

    const ax = arena ? arena.x : this.ctx.chapter.map.width / 2;
    const ay = arena ? arena.y : this.ctx.chapter.map.height / 2;
    const spawnX = ax;
    const spawnY = arena ? arena.y - arena.h / 2 + 60 : 120;

    const bossId = config.id.replace('boss_', '');
    const bossSheetKey = `boss_${bossId}_sheet`;
    const bossRawKey = config.id;
    let bossTex: string;
    let bossScale: number;

    if (this.ctx.textures.exists(bossSheetKey)) {
      bossTex = bossSheetKey;
      bossScale = 0.85;
    } else if (this.ctx.textures.exists(bossRawKey)) {
      bossTex = bossRawKey;
      bossScale = 0.55;
    } else {
      bossTex = 'enemy_grunter';
      bossScale = 1.6;
    }

    this.ctx.spawnedBoss = this.ctx.physics.add.sprite(spawnX, spawnY, bossTex, 0);
    if (this.ctx.textures.exists(bossSheetKey)) {
      this.ctx.spawnedBoss.play(`idle_boss_${bossId}`, true);
    }
    this.ctx.spawnedBoss.setScale(bossScale).setCollideWorldBounds(true).setDrag(400, 400);
    this.ctx.spawnedBoss.setDepth(spawnY);

    this.bossShadow = this.ctx.add.image(spawnX, spawnY + 28, 'shadow_ellipse')
      .setAlpha(0.4).setScale(1.1).setDepth(spawnY - 1);

    this.ctx.showBubbleText(this.ctx.spawnedBoss, config.combatBarks[0], '#f43f5e');
    this.ctx.cameras.main.flash(500, 239, 68, 68);
    this.ctx.cameras.main.shake(400, 0.015);

    const barW = 220;
    this.bossHpBg = this.ctx.add.rectangle(this.ctx.spawnedBoss.x, this.ctx.spawnedBoss.y - 90, barW, 14, 0x1a0606)
      .setStrokeStyle(2, 0xef4444, 0.9).setDepth(10000);
    this.bossHpFill = this.ctx.add.rectangle(this.ctx.spawnedBoss.x - barW / 2 + 2, this.ctx.spawnedBoss.y - 90, barW - 4, 10, 0xef4444)
      .setOrigin(0, 0.5).setDepth(10001);
    this.bossNameLabel = this.ctx.label(this.ctx.spawnedBoss.x, this.ctx.spawnedBoss.y - 104, `${config.name} — ${config.title}`, {
      fontSize: '12px', color: '#fca5a5', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(10002);

    this.ctx.physics.add.overlap(this.ctx.projectiles, this.ctx.spawnedBoss, (a: any, b: any) => {
      const projectile = this.ctx.projectiles.contains(a) ? a : b;
      if (projectile === this.ctx.spawnedBoss) return;
      projectile.destroy();
      const weapon = WEAPONS[this.ctx.currentLevelIndex % WEAPONS.length];
      this.damageBoss(weapon.attackPower * 0.6, true);
    });

    this.qteTimerEvent = this.ctx.time.addEvent({
      delay: config.id === 'boss_ben_umbc' ? 5000 : 9000,
      callback: this.triggerBossQTEQuest,
      callbackScope: this,
      loop: true
    });
  }

  private damageBoss(amount: number, isPhysical: boolean = false) {
    if (!this.ctx.isBossActive || !this.bossData || !this.ctx.spawnedBoss) return;
    
    if (isPhysical && this.bossData.id === 'boss_ben_umbc') {
      // Show 0 damage number and a small flash
      this.ctx.showDamageNumber(
        this.ctx.spawnedBoss.x + Phaser.Math.Between(-20, 20),
        this.ctx.spawnedBoss.y - 50,
        0,
        '#6b7280'
      );

      // Show the shield.jpg to visually explain the 0 damage
      const isFx = this.ctx.textures.exists('shield_fx');
      const shieldTex = isFx ? 'shield_fx' : (this.ctx.textures.exists('shield_raw') ? 'shield_raw' : 'plasma_shield');
      const shieldFlash = this.ctx.add.sprite(this.ctx.spawnedBoss.x, this.ctx.spawnedBoss.y, shieldTex, isFx ? 0 : undefined);
      shieldFlash.setOrigin(0.5).setScale(0.8).setDepth(1500).setAlpha(0.9);
      this.ctx.tweens.add({
        targets: shieldFlash,
        scale: 1.2,
        alpha: 0,
        duration: 350,
        ease: 'Cubic.easeOut',
        onComplete: () => shieldFlash.destroy()
      });

      if (!this.bossHitFlashing && this.ctx.spawnedBoss) {
        this.bossHitFlashing = true;
        this.ctx.spawnedBoss.setTintFill(0x6b7280); // Grey flash for deflection
        this.ctx.time.delayedCall(50, () => { this.ctx.spawnedBoss?.clearTint(); this.bossHitFlashing = false; });
      }

      // Show log message periodically to avoid spam
      if (Math.random() < 0.15) {
        this.ctx.logMessage("Physical attacks do nothing to his self-justifications!");
      }
      return;
    }

    this.currentBossHp = Math.max(0, this.currentBossHp - amount);
    this.updateBossHpBar();
    const dmgVal = Math.round(amount);
    this.ctx.showDamageNumber(
      this.ctx.spawnedBoss.x + Phaser.Math.Between(-20, 20),
      this.ctx.spawnedBoss.y - 50,
      dmgVal,
      amount >= 30 ? '#facc15' : '#f87171'
    );
    if (!this.bossHitFlashing && this.ctx.spawnedBoss) {
      this.bossHitFlashing = true;
      this.ctx.spawnedBoss.setTintFill(0xffffff);
      this.ctx.time.delayedCall(80, () => { this.ctx.spawnedBoss?.clearTint(); this.bossHitFlashing = false; });
    }
    if (this.currentBossHp <= 0) this.defeatBossSuccess();
  }

  private updateBossHpBar() {
    if (!this.bossHpFill || !this.bossData || !this.ctx.spawnedBoss) return;
    const barW = 220;
    const ratio = Phaser.Math.Clamp(this.currentBossHp / this.bossData.maxHp, 0, 1);
    this.bossHpFill.width = (barW - 4) * ratio;
    const color = ratio > 0.5 ? 0x4ade80 : ratio > 0.25 ? 0xfacc15 : 0xef4444;
    this.bossHpFill.setFillStyle(color);
  }

  private updateBossHpBarPosition() {
    if (!this.ctx.spawnedBoss) return;
    this.ctx.spawnedBoss.setDepth(this.ctx.spawnedBoss.y);
    if (this.bossShadow) {
      this.bossShadow.setPosition(this.ctx.spawnedBoss.x, this.ctx.spawnedBoss.y + 28);
      this.bossShadow.setDepth(this.ctx.spawnedBoss.y - 1);
    }
    const barW = 220;
    const bx = this.ctx.spawnedBoss.x;
    const by = this.ctx.spawnedBoss.y - 90;
    this.bossHpBg?.setPosition(bx, by);
    this.bossHpFill?.setPosition(bx - barW / 2 + 2, by);
    this.bossNameLabel?.setPosition(bx, by - 14);
  }

  private destroyBossHpBar() {
    this.bossHpBg?.destroy(); this.bossHpBg = null;
    this.bossHpFill?.destroy(); this.bossHpFill = null;
    this.bossNameLabel?.destroy(); this.bossNameLabel = null;
  }

  private triggerBossQTEQuest() {
    if (!this.ctx.isBossActive || !this.bossData || !this.ctx.spawnedBoss || this.ctx.qteActive) return;
    this.ctx.qteActive = true;
    this.ctx.physics.pause();
    this.ctx.spawnedBoss.setVelocity(0, 0);
    this.ctx.logMessage(`⚡ [QTE]: Audit ${this.bossData.name} — choose your counter!`);
    this.ctx.triggerQTE(this.bossData, (success: boolean) => {
      this.ctx.qteActive = false;
      this.ctx.physics.resume();
      this.lastBossAttackTime = this.ctx.time.now;
      if (success && this.ctx.spawnedBoss && this.bossData) {
        const dmg = this.bossData.weaknessQTE.damage;
        this.ctx.logMessage(`🔥 AUDIT SUCCESS! ${this.bossData.name} -${dmg} BIQ!`);
        this.ctx.cameras.main.flash(300, 34, 197, 94);
        this.ctx.cameras.main.shake(300, 0.02);
        this.ctx.showBubbleText(this.ctx.spawnedBoss, 'CALLED OUT ON LOGS! MY B.I.Q. IS PLUMMETING! 💀', '#10b981');
        this.damageBoss(dmg, false);
      } else {
        this.ctx.logMessage(`💥 AUDIT FAILED — ${this.bossData?.name} counters!`);
        this.ctx.cameras.main.flash(350, 239, 68, 68);
        this.ctx.damagePlayer(35, 'Failed QTE');
      }
    });
  }

  private defeatBossSuccess() {
    if (!this.ctx.spawnedBoss || !this.bossData) return;
    this.ctx.logMessage(`🏆 ${this.bossData.name} logged and archived in the group chat!`);

    // Performance Optimization: Use a built-in ParticleEmitter instead of spawning 24 separate 
    // Arcade Physics bodies for a purely visual explosion. This completely bypasses physics calculations and heavy GC per object.
    const particles = this.ctx.add.particles(this.ctx.spawnedBoss.x, this.ctx.spawnedBoss.y, 'particle_dot', {
      speed: { min: 100, max: 400 },
      angle: { min: 0, max: 360 },
      scale: { start: 2, end: 0 },
      tint: 0xfacc15,
      lifespan: 1000,
      emitting: false
    });
    particles.explode(24);
    this.ctx.time.delayedCall(1200, () => particles.destroy());

    for (let i = 0; i < 10; i++) {
      const shard = this.ctx.physics.add.sprite(
        this.ctx.spawnedBoss.x + Phaser.Math.Between(-30, 30),
        this.ctx.spawnedBoss.y + Phaser.Math.Between(-30, 30),
        this.ctx.textures.exists('shard_sheet') ? 'shard_sheet' : 'loot_shard',
        this.ctx.textures.exists('shard_sheet') ? 0 : undefined
      );
      shard.setScale(this.ctx.textures.exists('shard_sheet') ? 0.18 : 1)
        .setTint(0xfacc15).setVelocity(Phaser.Math.Between(-150, 150), Phaser.Math.Between(-150, 150)).setDrag(100, 100);
      this.ctx.lootShards.add(shard);
    }

    this.destroyBossHpBar();
    this.bossShadow?.destroy();
    this.bossShadow = null;
    this.ctx.spawnedBoss.destroy();
    this.ctx.spawnedBoss = null;
    this.ctx.isBossActive = false;
    this.bossHitFlashing = false;
    this.ctx.setControlsInverted(false);
    this.ctx.audioController.stopBossMusic();
    this.ctx.player.play('victory_' + this.ctx.playerClass.id, true);

    if (this.qteTimerEvent) { this.qteTimerEvent.destroy(); this.qteTimerEvent = null; }

    this.ctx.time.delayedCall(1200, () => {
      this.ctx.cameras.main.fadeOut(400, 0, 0, 0);
      this.ctx.time.delayedCall(420, () => {
        this.ctx.cameras.main.fadeIn(300, 0, 0, 0);
        this.isFightActive = false;
        if (this.onCompleteCallback) {
          this.onCompleteCallback({ outcome: 'win' });
        }
      });
    });
  }

  private getPooledBullet(x: number, y: number): Phaser.Physics.Arcade.Sprite {
    let proj = this.ctx.enemyProjectiles.getFirstDead(false) as Phaser.Physics.Arcade.Sprite;
    if (proj) {
      proj.setActive(true).setVisible(true);
      proj.setPosition(x, y);
      proj.setAlpha(1).setRotation(0).setScale(1).clearTint();
      if (proj.body) {
        const body = proj.body as Phaser.Physics.Arcade.Body;
        body.reset(x, y);
        body.setAllowGravity(true);
      }
    } else {
      proj = this.ctx.physics.add.sprite(x, y, 'bullet');
      this.ctx.enemyProjectiles.add(proj);
    }
    return proj;
  }

  private handleBossAI(time: number) {
    if (!this.ctx.spawnedBoss || !this.bossData || this.ctx.qteActive) return;

    const targetAngle = Phaser.Math.Angle.Between(this.ctx.spawnedBoss.x, this.ctx.spawnedBoss.y, this.ctx.player.x, this.ctx.player.y);
    const bossSpeed = 80 + this.ctx.currentLevelIndex * 15;
    const vx = Math.cos(targetAngle) * bossSpeed;
    const vy = Math.sin(targetAngle) * bossSpeed;
    this.ctx.spawnedBoss.setVelocity(vx, vy);

    const bossIdForAnim = this.bossData.id.replace('boss_', '');
    const atkKey = `attack_boss_${bossIdForAnim}`;

    const isAttacking = this.ctx.spawnedBoss.anims.currentAnim?.key === atkKey && this.ctx.spawnedBoss.anims.isPlaying;

    if (!isAttacking) {
      const facesLeftByDefault = bossIdForAnim === 'nick_f';
      this.ctx.applyDirectionalAnim(this.ctx.spawnedBoss, `boss_${bossIdForAnim}`, vx, vy, facesLeftByDefault);
    }

    if (time - this.lastBossAttackTime > 2000) {
      this.lastBossAttackTime = time;
      if (this.ctx.anims.exists(atkKey)) this.ctx.spawnedBoss.play(atkKey, true);

      switch (this.bossData.id) {
        case 'boss_eric': this.fireBossCoinAttack(); break;
        case 'boss_audrey': this.teleportKidneyStrike(); break;
        case 'boss_florida': this.deployTireTreadTether(); break;
        case 'boss_ben': this.unleashHeyAoE(); break;
        case 'boss_nick_f': this.dischargeRefundRosterChecks(); break;
        case 'boss_ben_umbc': {
          const rand = Math.random();
          if (rand < 0.25) this.unleashRationalizationWave();
          else if (rand < 0.50) this.gaslightLasers();
          else if (rand < 0.75) this.echoChamber();
          else this.deflectionShield();
          break;
        }
      }
    }

    // Phase bark
    const hpRatio = this.currentBossHp / this.bossData.maxHp;
    const phase = hpRatio < 0.33 ? 1 : hpRatio < 0.66 ? 2 : 3;
    if (Math.random() < 0.005) {
      const phaseBarks = this.bossData.phaseBarks;
      const phaseBark = phaseBarks[phase] ?? this.bossData.combatBarks[Math.floor(Math.random() * this.bossData.combatBarks.length)];
      this.ctx.showBubbleText(this.ctx.spawnedBoss, phaseBark, '#ef4444');
    }
  }

  private fireBossCoinAttack() {
    if (!this.ctx.spawnedBoss) return;
    this.ctx.logMessage('💸 Eric Huang casting index fees!');
    for (let i = 0; i < 5; i++) {
      const coin = this.ctx.add.circle(this.ctx.player.x + Phaser.Math.Between(-150, 150), this.ctx.player.y - 300, 12, 0xfacc15);
      this.ctx.physics.add.existing(coin);
      (coin.body as Phaser.Physics.Arcade.Body).setVelocityY(350);
      this.ctx.physics.add.overlap(this.ctx.player, coin, () => { coin.destroy(); this.ctx.damagePlayer(18, 'Gold Extortion Coin'); });
      this.ctx.time.delayedCall(2000, () => { if (coin.active) coin.destroy(); });
    }
  }

  private teleportKidneyStrike() {
    if (!this.ctx.spawnedBoss) return;
    this.ctx.logMessage('🩸 Audrey teleports — Kidney Punch incoming!');
    const targetX = this.ctx.player.x;
    const targetY = this.ctx.player.y;
    const ring = this.ctx.add.circle(targetX, targetY, 40, 0xef4444, 0.3);
    this.ctx.time.delayedCall(700, () => {
      ring.destroy();
      if (!this.ctx.spawnedBoss) return;
      this.ctx.spawnedBoss.x = targetX;
      this.ctx.spawnedBoss.y = targetY;
      if (Phaser.Math.Distance.Between(this.ctx.player.x, this.ctx.player.y, targetX, targetY) < 60) {
        this.ctx.damagePlayer(25, 'Kidney Punch');
        this.ctx.cameras.main.flash(400, 239, 68, 68);
      }
    });
  }

  private deployTireTreadTether() {
    if (!this.ctx.spawnedBoss) return;
    this.ctx.logMessage('🏎️ Florida Syndicate — Mustang Crowd Control!');
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 4) * i;
      const proj = this.ctx.physics.add.sprite(this.ctx.spawnedBoss.x, this.ctx.spawnedBoss.y, 'bullet');
      proj.setTint(0x374151).setVelocity(Math.cos(angle) * 320, Math.sin(angle) * 320);
      this.ctx.enemyProjectiles.add(proj);
      this.ctx.time.delayedCall(2000, () => { if (proj.active) proj.destroy(); });
    }
  }

  private unleashHeyAoE() {
    if (!this.ctx.spawnedBoss) return;
    this.ctx.logMessage('🔊 Michael Bersofsky bellows "HEY!!!"');
    this.ctx.cameras.main.shake(300, 0.02);
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI / 6) * i;
      const ringB = this.ctx.physics.add.sprite(this.ctx.spawnedBoss.x, this.ctx.spawnedBoss.y, 'bullet');
      ringB.setTint(0x6b7280).setScale(1.2).setVelocity(Math.cos(angle) * 250, Math.sin(angle) * 250);
      this.ctx.enemyProjectiles.add(ringB);
      this.ctx.time.delayedCall(3000, () => { if (ringB.active) ringB.destroy(); });
    }
  }

  private unleashRationalizationWave() {
    if (!this.ctx.spawnedBoss) return;
    this.ctx.logMessage('🌊 Ben deploys Rationalization Wave: "I was just having fun!"');
    this.ctx.showBubbleText(this.ctx.spawnedBoss, "I was just having fun!", '#ef4444');
    
    // Shoot 16 fast projectiles in a circle
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI / 8) * i;
      const proj = this.getPooledBullet(this.ctx.spawnedBoss.x, this.ctx.spawnedBoss.y);
      proj.setTint(0xef4444).setScale(1.5).setDepth(1500);
      const body = proj.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.setAllowGravity(false);
        body.setVelocity(Math.cos(angle) * 350, Math.sin(angle) * 350);
      }
      this.ctx.time.delayedCall(2500, () => { if (proj.active) { proj.setActive(false).setVisible(false); if (body) body.stop(); } });
    }
  }

  private gaslightLasers() {
    if (!this.ctx.spawnedBoss) return;
    this.ctx.logMessage('⚡ Ben fires Gaslight Lasers: "You\'re overreacting!"');
    this.ctx.showBubbleText(this.ctx.spawnedBoss, "You're overreacting!", '#facc15');
    
    // Fire 5 rapid projectiles directly at player
    for (let i = 0; i < 5; i++) {
      this.ctx.time.delayedCall(i * 150, () => {
        if (!this.ctx.spawnedBoss || this.ctx.qteActive) return; // Don't fire if QTE is up
        const targetAngle = Phaser.Math.Angle.Between(this.ctx.spawnedBoss.x, this.ctx.spawnedBoss.y, this.ctx.player.x, this.ctx.player.y);
        const proj = this.getPooledBullet(this.ctx.spawnedBoss.x, this.ctx.spawnedBoss.y);
        proj.setTint(0xfacc15).setScale(1.8).setDepth(1500);
        const body = proj.body as Phaser.Physics.Arcade.Body;
        if (body) {
          body.setAllowGravity(false);
          body.setVelocity(Math.cos(targetAngle) * 450, Math.sin(targetAngle) * 450);
        }
        this.ctx.time.delayedCall(2000, () => { if (proj.active) { proj.setActive(false).setVisible(false); if (body) body.stop(); } });
      });
    }
  }

  private echoChamber() {
    if (!this.ctx.spawnedBoss) return;
    this.ctx.logMessage('🌀 Ben summons Echo Chamber: "They loved me!"');
    this.ctx.showBubbleText(this.ctx.spawnedBoss, "They loved me!", '#22d3ee');
    
    const targetX = this.ctx.player.x;
    const targetY = this.ctx.player.y;
    
    // Spawn projectiles in a large ring around the player that collapse inward
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI / 6) * i;
      const startX = targetX + Math.cos(angle) * 400;
      const startY = targetY + Math.sin(angle) * 400;
      const proj = this.ctx.physics.add.sprite(startX, startY, 'bullet');
      this.ctx.enemyProjectiles.add(proj);
      proj.setTint(0x22d3ee).setScale(1.2).setDepth(1500);
      
      const inwardAngle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);
      const body = proj.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.setAllowGravity(false);
        body.setVelocity(Math.cos(inwardAngle) * 200, Math.sin(inwardAngle) * 200);
      }
      this.ctx.time.delayedCall(3000, () => { if (proj.active) proj.destroy(); });
    }
  }

  private deflectionShield() {
    if (!this.ctx.spawnedBoss) return;
    this.ctx.logMessage('🛡️ Ben raises Deflection Shield: "She was totally into it!"');
    this.ctx.showBubbleText(this.ctx.spawnedBoss, "She was totally into it!", '#c084fc');
    
    // Spawn spinning projectiles around Ben
    for (let i = 0; i < 6; i++) {
      const angleOffset = (Math.PI / 3) * i;
      const proj = this.ctx.physics.add.sprite(this.ctx.spawnedBoss.x, this.ctx.spawnedBoss.y, 'bullet');
      this.ctx.enemyProjectiles.add(proj);
      proj.setTint(0xc084fc).setScale(2.0).setDepth(1500);
      
      const body = proj.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.setAllowGravity(false);
      }
      
      let orbitTime = 0;
      const orbitEvent = this.ctx.time.addEvent({
        delay: 20,
        loop: true,
        callback: () => {
          if (!proj.active || !this.ctx.spawnedBoss || this.ctx.qteActive) return; // Pause spinning during QTE
          orbitTime += 0.05;
          const currentAngle = angleOffset + orbitTime;
          proj.setPosition(
            this.ctx.spawnedBoss.x + Math.cos(currentAngle) * 60,
            this.ctx.spawnedBoss.y + Math.sin(currentAngle) * 60
          );
          if (proj.body) proj.body.updateFromGameObject(); // Sync physics body
        }
      });
      this.ctx.time.delayedCall(4000, () => { if (proj.active) proj.destroy(); orbitEvent.destroy(); });
    }
  }

  private dischargeRefundRosterChecks() {
    if (!this.ctx.spawnedBoss) return;
    this.ctx.logMessage('💸 Nick Farrar drops Refund Checks — 5% Robinhood fee active!');
    for (let i = 0; i < 6; i++) {
      const check = this.ctx.add.rectangle(
        this.ctx.player.x + Phaser.Math.Between(-200, 200),
        this.ctx.player.y + Phaser.Math.Between(-200, 200),
        24, 14, 0x10b981
      );
      this.ctx.physics.add.existing(check);
      this.ctx.tweens.add({ targets: check, scale: 1.4, alpha: 0.1, duration: 1800, onComplete: () => check.destroy() });
      this.ctx.physics.add.overlap(this.ctx.player, check, () => { check.destroy(); this.ctx.damagePlayer(15, 'Refund Interest Fee'); });
    }
  }
}

export const bossFightMode = new BossFightMode();

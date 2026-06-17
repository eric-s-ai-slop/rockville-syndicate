import Phaser from 'phaser';
import { BossConfig, CharacterClass } from '../../data/entities';
import { ChapterConfig } from '../../data/chapters';
import { AudioController } from '../scene/AudioController';

export interface ModeResult {
  outcome?: 'win' | 'lose' | 'skip';
  data?: unknown;
}

export interface ModeContext {
  player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  cameras: Phaser.Cameras.Scene2D.CameraManager;
  time: Phaser.Time.Clock;
  tweens: Phaser.Tweens.TweenManager;
  physics: Phaser.Physics.Arcade.ArcadePhysics;
  sound: Phaser.Sound.BaseSoundManager;
  add: Phaser.GameObjects.GameObjectFactory;
  make: Phaser.GameObjects.GameObjectCreator;
  textures: Phaser.Textures.TextureManager;
  anims: Phaser.Animations.AnimationManager;
  
  // Game state & groups
  projectiles: Phaser.Physics.Arcade.Group;
  enemies: Phaser.Physics.Arcade.Group;
  enemyProjectiles: Phaser.Physics.Arcade.Group;
  lootShards: Phaser.Physics.Arcade.Group;
  walls: Phaser.Physics.Arcade.StaticGroup;
  
  // Scene custom helpers
  audioController: AudioController;
  label(x: number, y: number, text: string, style?: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text;
  showLetterbox(durationMs?: number): void;
  hideLetterbox(durationMs?: number): void;
  showBubbleText(target: Phaser.GameObjects.GameObject, text: string, color?: string): void;
  showPassiveIconText(x: number, y: number, text: string, color: string): void;
  showDamageNumber(x: number, y: number, amount: number, color: string): void;
  setControlsInverted(inverted: boolean): void;
  triggerQTE(boss: BossConfig, callback: (success: boolean) => void): void;
  logMessage(msg: string): void;
  onStoryDialogue(payload: any, done: (choiceIndex?: number) => void): void;

  // Boss & Level metadata/state
  currentLevelIndex: number;
  spawnedBoss: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null;
  isBossActive: boolean;
  qteActive: boolean;

  // Scene actions & data
  hideActor(id: string): void;
  showActor(id: string): void;
  damagePlayer(amount: number, source: string): void;
  playerClass: CharacterClass;
  chapter: ChapterConfig;
  applyDirectionalAnim(sprite: Phaser.GameObjects.Sprite, id: string, vx: number, vy: number, facesLeftByDefault?: boolean): void;
  propSprites: Map<string, Phaser.GameObjects.Sprite | Phaser.GameObjects.Image>;
  poolNameplates: Map<string, Phaser.GameObjects.Text>;
  actorSprites: Record<string, Phaser.GameObjects.GameObject[]>;
}

export interface GameMode<Cfg = unknown> {
  id: string;
  /** Register assets needed by this mode (called during scene preload). */
  preload?(ctx: ModeContext): void;
  /** Begin the mode. Call onComplete exactly once when the mode resolves. */
  start(ctx: ModeContext, config: Cfg, onComplete: (result: ModeResult) => void): void;
  /** Per-frame tick while the mode is active (forwarded from scene update()). */
  update?(time: number, delta: number): void;
  /** Restore the scene to story state (remove sprites, listeners, UI). */
  teardown(): void;
  /** Optional beat hooks */
  onDialogue?(beat: any): void;
  onCameraPan?(beat: any): void;
}

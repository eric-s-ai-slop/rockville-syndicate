import type Phaser from 'phaser';
import type { ActorPlacement, ChapterConfig, MapConfig } from '../../data/chapters';
import type { CharacterClass } from '../../data/entities';

export type SceneLabel = (
  x: number,
  y: number,
  text: string,
  style?: Phaser.Types.GameObjects.Text.TextStyle,
) => Phaser.GameObjects.Text;

export type PropSprite = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;

interface PhaserFactories {
  add: Phaser.Scene['add'];
  textures: Phaser.Scene['textures'];
}

export interface ActorsContext extends PhaserFactories {
  actorSprites: Record<string, Phaser.GameObjects.GameObject[]>;
  anims: Phaser.Scene['anims'];
  make: Phaser.Scene['make'];
  playerClass: CharacterClass;
  tweens: Phaser.Scene['tweens'];
  getActiveSceneConfig(): { map: MapConfig; actors: ActorPlacement[] };
  label: SceneLabel;
}

export interface AtmosphereContext extends PhaserFactories {
  cameras: Phaser.Scene['cameras'];
  particleEmitters: Phaser.GameObjects.Particles.ParticleEmitter[];
  time: Phaser.Scene['time'];
  tweens: Phaser.Scene['tweens'];
  label: SceneLabel;
}

export interface AudioContext {
  bossMusic: Phaser.Sound.BaseSound | null;
  bossMusicSting: Phaser.Sound.BaseSound | null;
  cache: Phaser.Scene['cache'];
  chapter: ChapterConfig;
  footstepKeys: string[];
  load: Phaser.Scene['load'];
  sound: Phaser.Scene['sound'];
  stageMusic: Phaser.Sound.BaseSound | null;
  time: Phaser.Scene['time'];
  tweens: Phaser.Scene['tweens'];
  getActiveSceneConfig(): { map: MapConfig; actors: ActorPlacement[] };
}

export interface ChaseContext extends PhaserFactories {
  cache: Phaser.Scene['cache'];
  cameras: Phaser.Scene['cameras'];
  chapter: ChapterConfig;
  physics: Phaser.Scene['physics'];
  player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  propSprites: Map<string, PropSprite>;
  sound: Phaser.Scene['sound'];
  time: Phaser.Scene['time'];
  tweens: Phaser.Scene['tweens'];
  advanceBeat(): void;
  applyDirectionalAnim(sprite: Phaser.GameObjects.Sprite, id: string, vx: number, vy: number, facesLeftByDefault?: boolean): void;
  freeze(): void;
  label: SceneLabel;
  showBubbleText(anchor: Phaser.GameObjects.GameObject, text: string, colorHex?: string): void;
  unfreeze(): void;
}

export interface MapBuilderContext extends PhaserFactories {
  anims: Phaser.Scene['anims'];
  chapter: ChapterConfig;
  mapCollidables: Phaser.GameObjects.Rectangle[];
  particleEmitters: Phaser.GameObjects.Particles.ParticleEmitter[];
  physics: Phaser.Scene['physics'];
  playerClass: CharacterClass;
  poolNameplates: Map<string, Phaser.GameObjects.Text>;
  propAspects: Record<string, number>;
  propSprites: Map<string, PropSprite>;
  time: Phaser.Scene['time'];
  walls: Phaser.Physics.Arcade.StaticGroup;
  label: SceneLabel;
  showAreaTitle(title: string): void;
}

export interface PlayerControllerContext extends PhaserFactories {
  applyDirectionalAnim(sprite: Phaser.GameObjects.Sprite, id: string, vx: number, vy: number, facesLeftByDefault?: boolean): void;
  currentLevelIndex: number;
  enemies: Phaser.Physics.Arcade.Group;
  footstepKeys: string[];
  isBossActive: boolean;
  onMessageLog(message: string): void;
  player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  playerClass: CharacterClass;
  projectiles: Phaser.Physics.Arcade.Group;
  qteActive: boolean;
  showBubbleText(anchor: Phaser.GameObjects.GameObject, text: string, colorHex?: string): void;
  sound: Phaser.Scene['sound'];
  spawnedBoss: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null;
  time: Phaser.Scene['time'];
  tweens: Phaser.Scene['tweens'];
  wasdKeys: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
    F: Phaser.Input.Keyboard.Key;
  };
}

export interface SpriteLoaderContext {
  anims: Phaser.Scene['anims'];
  chapter: ChapterConfig;
  make: Phaser.Scene['make'];
  playerClass: CharacterClass;
  portraitDataUrls: Record<string, string>;
  textures: Phaser.Scene['textures'];
}

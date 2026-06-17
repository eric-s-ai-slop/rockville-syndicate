import Phaser from 'phaser';
import { MapBuilder } from './scene/MapBuilder';
import { Actors } from './scene/Actors';
import { AudioController } from './scene/AudioController';
import { BeatEngine } from './scene/BeatEngine';
import type { GameMode } from './modes/types';
import { getMode } from './modes';
import {
  CharacterClass,
  CHARACTER_CLASSES,
  EnemyConfig,
  BOSSES,
  BossConfig,
  LORE_BARKS,
  WEAPONS,
  ENEMIES,
  NPC_CHARACTERS
} from '../data/entities';
import plasmaShieldImg from '../assets/images/plasma_shield_1781235159690.jpg';
import shieldImg from '../assets/images/shield.jpg';
import heroEricImg from '../assets/images/hero_eric_1781236098529.jpg';
import heroJacobImg from '../assets/images/hero_jacob_1781236113357.jpg';
import heroNickFImg from '../assets/images/hero_nick_f_1781236122782.jpg';
import heroNickHImg from '../assets/images/hero_nick_h_1781236135006.jpg';
import heroJordanImg from '../assets/images/hero_jordan.jpg';
import heroMaharkoImg from '../assets/images/hero_maharko.jpg';
import enemyTicketmasterImg from '../assets/images/enemy_ticketmaster.jpg';
import enemyDishesImg from '../assets/images/enemy_dishes.jpg';
import enemyZombieImg from '../assets/images/enemy_zombie.jpg';
import enemyFratBroImg from '../assets/images/enemy_frat_bro.jpg';
import neighborhoodMapImg from '../assets/images/neighborhood_map.jpg';
import bossEricImg from '../assets/images/boss_eric.jpg';
import bossAudreyImg from '../assets/images/boss_audrey.jpg';
import bossFloridaImg from '../assets/images/boss_florida.jpg';
// The boss_ben fight is actually Michael Bersofsky (Ben's dad) — use his sheet.
import bossBenImg from '../assets/images/micheal_bersofsky.jpg';
// boss_ben_umbc is Ben himself (UMBC chapter) — use the ben portrait.
import bossBenUmbcImg from '../assets/images/boss_ben.jpg';
import bossNickFImg from '../assets/images/boss_nick_f.jpg';
import coinImg from '../assets/images/coin.jpg';
import shardImg from '../assets/images/shard.jpg';
import { preprocessShowcaseSheet, preprocessColumnFirstSheet, preprocessFemalePoolSheet } from './SpritePreprocessor';
import { extractPropSubject } from './PropExtractor';
import { buildFurnitureAtlas, furnitureFrame, furnitureAspect, FURNITURE_ATLAS_KEY } from './furnitureCatalog';
import { buildPackAtlas, packFrame, packSize, PACK_ATLAS_KEY } from './packSpriteAtlas';
import { ChapterConfig, Beat, ActorPlacement, resolveSpeaker, MapConfig, CHAPTERS } from '../data/chapters';
import {
  CHAPTER_MUSIC_KEY, STAGE_MUSIC_URL, BOSS_MUSIC_URL, BOSS_LOOP_URL,
  THEME_FOOTSTEP, FOOTSTEP_URLS,
  UI_SELECT_URL, VICTORY_JINGLE_URL, KNOCK_URL,
  CROWD_MURMUR_URL, CRICKET_AMBIENT_URL,
} from './audio';

// ─── R1/R2: Stage & car prop images (Vite ?url for special-char filenames) ──────
import propHospitalBedUrl from '../assets/images/game_decor/stages/audrey_hopsital/hospital_bed.jpg?url';
import propIvDripUrl from '../assets/images/game_decor/stages/audrey_hopsital/iv-drip.jpg?url';
import propCabinetUrl from '../assets/images/game_decor/stages/audrey_hopsital/cabinant.jpg?url';
import propRedToiletUrl from '../assets/images/game_decor/stages/audrey_hopsital/red_toliet(evidence).jpg?url';
import propJungleGymUrl from '../assets/images/game_decor/stages/beall/jungle gym.jpg?url';
import propWatchwaterUrl from '../assets/images/game_decor/stages/dingdongditchben/watchwater_scene.jpg?url';
import propWatchwaterOpenUrl from '../assets/images/game_decor/stages/dingdongditchben/watchwater_scene_open.jpg?url';
import propJordanMustangUrl from "../assets/images/game_decor/special/cars/jordan's mustang.jpg?url";
import propMaharkoCameroUrl from "../assets/images/game_decor/special/cars/maharko's camero.jpg?url";
import propNickFCorollaUrl from "../assets/images/game_decor/special/cars/nick f's corolla.jpg?url";

import natureFlower1Url from '../assets/images/game_decor/nature/Flower 1/Flower 1 - RED.png?url';
import natureFlower2Url from '../assets/images/game_decor/nature/Flower 2/Flower 2 - MAGENTA.png?url';
import natureBush1Url from '../assets/images/game_decor/nature/Bush 1/Bush 1 - GREEN.png?url';
import natureBush2Url from '../assets/images/game_decor/nature/Bush 1/Bush 1 - WARM GREEN.png?url';

// Sprint 2: LimeZu furniture tilesheet — sliced into the furniture_atlas at runtime.
import interiors48Url from '../assets/images/game_decor/Interiors_free/48x48/Interiors_free_48x48.png?url';

// Ch3b: UMBC Incident stage images + NPC silhouette
import umbcBasementStageUrl  from '../assets/chapters/umbc incident/umbc_basement.jpg?url';
import parkingLotNightUrl    from '../assets/chapters/umbc incident/stage_parking_log_night.jpg?url';
import npcGirlSilhouetteUrl  from '../assets/images/npc_girl_silhouette.jpg?url';

// Ch9: Suds & Soles Pool Party character portraits + map
import ericPoolUrl       from '../assets/chapters/SUMMER2026_FIRSTPOOLPARTY/Eric(pool).jpg?url';
import nickHPoolUrl      from '../assets/chapters/SUMMER2026_FIRSTPOOLPARTY/Nick_H(Pool).jpg?url';
import jacobPoolUrl      from '../assets/chapters/SUMMER2026_FIRSTPOOLPARTY/jacob(pool).jpg?url';
import nickFPoolUrl      from '../assets/chapters/SUMMER2026_FIRSTPOOLPARTY/nick_f(pool).jpg?url';
import anastasiaPoolUrl  from '../assets/chapters/SUMMER2026_FIRSTPOOLPARTY/anastasia(pool).jpg?url';
import sophiaPoolUrl     from '../assets/chapters/SUMMER2026_FIRSTPOOLPARTY/sophia(pool).jpg?url';
import samPoolUrl        from '../assets/chapters/SUMMER2026_FIRSTPOOLPARTY/sam_f(pool).jpg?url';
import poolMapDayUrl     from '../assets/chapters/SUMMER2026_FIRSTPOOLPARTY/pool_map(day).jpg?url';
import poolMapNightUrl   from '../assets/chapters/SUMMER2026_FIRSTPOOLPARTY/pool_map(night).jpg?url';

// RUN-3: owner-added asset-pack JPGs (gray bg, extracted at runtime via packSpriteAtlas)
import packTollboothUrl from '../assets/images/game_decor/special/toolbooth.jpg?url';
import packRailUrl from '../assets/images/game_decor/special/rail.jpg?url';
import packPoolUrl from '../assets/images/game_decor/special/pool.jpg?url';
import packArcadeUrl from '../assets/images/game_decor/special/arcade cab.jpg?url';

export interface StoryDialoguePayload {
  speakerName: string;
  speakerEmoji: string;
  speakerColor: string;
  /** Base64 PNG extracted from the character's sprite sheet frame 0. */
  portraitDataUrl?: string;
  lines: string[];
  /** When present, the box shows choice buttons after the last line. */
  choices?: { text: string }[];
}

export default class ChapterScene extends Phaser.Scene {
  public playerClass!: CharacterClass;
  public currentLevelIndex: number = 0;
  private onGoldChange!: (gold: number) => void;
  private onHpChange!: (hp: number) => void;
  public onMessageLog!: (msg: string) => void;
  public onTriggerQTE!: (boss: BossConfig, callback: (success: boolean) => void) => void;
  private onLevelCompleted!: () => void;
  private onGameOver!: () => void;
  private onNpcInteract!: (npcId: string, resume: () => void) => void;

  // Story / chapter system
  public chapter!: ChapterConfig;
  public onStoryDialogue!: (payload: StoryDialoguePayload, done: (choiceIndex?: number) => void) => void;
  public onLedgerChange!: (total: number, note: string) => void;
  public ledgerTotal: number = 0;
  public beatIndex: number = 0;
  public beatActive: boolean = false;
  // Active walkTo target the player must reach to advance.
  public walkTarget: { x: number; y: number; radius: number; markerLabel?: string; marker?: Phaser.GameObjects.Container; taskUi?: Phaser.GameObjects.Container } | null = null;
  public propAspects: Record<string, number> = {};
  public actorSprites: Record<string, Phaser.GameObjects.GameObject[]> = {};

  public player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private controlsInverted: boolean = false;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
    F: Phaser.Input.Keyboard.Key;
  };
  private isDashing: boolean = false;
  private dashCooldown: boolean = false;
  private lastFired: number = 0;
  private lastBossAttackTime: number = 0;
  private activeGold: number = 0;
  private activeHp: number = 100;
  private isAttackingAnim: boolean = false;
  private enemyHitCooldowns = new Map<any, number>();
  private enemyFlashCooldowns = new Map<any, number>();

  // Status effects
  private brainrotLevel: number = 0;
  private subZeroActive: boolean = false;
  private subZeroActivatedOnce: boolean = false;
  private brainrotBar!: Phaser.GameObjects.Rectangle;
  private brainrotFill!: Phaser.GameObjects.Rectangle;
  private brainrotLabel!: Phaser.GameObjects.Text;

  // Groups
  public projectiles!: Phaser.Physics.Arcade.Group;
  public enemies!: Phaser.Physics.Arcade.Group;
  public enemyProjectiles!: Phaser.Physics.Arcade.Group;
  public lootShards!: Phaser.Physics.Arcade.Group;
  public walls!: Phaser.Physics.Arcade.StaticGroup;



  // R8: pre-boss chase phase — pursuer separate from spawnedBoss
  private chaseSprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null = null;
  private chaseShadow: Phaser.GameObjects.Image | null = null;
  private chaseActive: boolean = false;
  private chaseCooldown: number = 0;
  private chaseTimer: Phaser.Time.TimerEvent | null = null;
  private chasePursuerId: string | null = null;

  // Game state
  public spawnedBoss: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null = null;
  public isBossActive: boolean = false;
  private bossHitFlashing: boolean = false; // throttle — still used to prevent double-shake
  // True while the React QTE modal is open — combat must fully pause (boss AI,
  // auto-fire, AND damage from in-flight delayed attacks).
  public qteActive: boolean = false;
  private enemiesLeftToSpawn: number = 15;
  private enemiesKilledCount: number = 0;
  private levelStarted: boolean = false;

  // Collider references for map objects (need to store for enemy collision setup)
  public mapCollidables: Phaser.GameObjects.Rectangle[] = [];

  // All game objects created during map build — used for teardown on changeScene
  private mapObjects: Phaser.GameObjects.GameObject[] = [];
  // Index into chapter.scenes[] for the currently active location
  public currentSceneIndex: number = 0;

  // Shadow sprites that follow moving entities
  private playerShadow: Phaser.GameObjects.Image | null = null;

  // Phase C: per-chapter atmosphere
  private ambientOverlay: Phaser.GameObjects.Rectangle | null = null;
  private vignetteOverlay: Phaser.GameObjects.Image | null = null;
  private fakeLights: Phaser.GameObjects.Image[] = [];
  public particleEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  // Phase D
  private letterboxTop: Phaser.GameObjects.Rectangle | null = null;
  private letterboxBottom: Phaser.GameObjects.Rectangle | null = null;
  private lastFootstepTime: number = 0;
  public portraitDataUrls: Record<string, string> = {};

  // Phase E — audio
  public stageMusic: Phaser.Sound.BaseSound | null = null;
  public bossMusic: Phaser.Sound.BaseSound | null = null;     // Techno-Tetris loop
  public bossMusicSting: Phaser.Sound.BaseSound | null = null; // Prowler one-shot sting
  public footstepKeys: string[] = [];

  // R1: map of propKey → image sprite for runtime texture swaps (e.g. door open)
  public propSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  public poolNameplates: Map<string, Phaser.GameObjects.Text> = new Map();

  // NPC interaction system
  private npcs: Array<{
    id: string;
    sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
    prompt: Phaser.GameObjects.Text;
  }> = [];
  public dialogueOpen: boolean = false;
  public movementFrozen: boolean = false;
  private eKey!: Phaser.Input.Keyboard.Key;
  private lastMoveAngle: number = 0;

  // Subsystems
  public mapBuilder!: MapBuilder;
  public actorsSystem!: Actors;
  public audioController!: AudioController;
  public beatEngine!: BeatEngine;
  public activeMode: GameMode | null = null;

  constructor() {
    super({ key: 'ChapterScene' });
    this.mapBuilder = new MapBuilder(this);
    this.actorsSystem = new Actors(this);
    this.audioController = new AudioController(this);
    this.beatEngine = new BeatEngine(this);
  }

  public init(data: {
    hero?: CharacterClass;
    chapter?: ChapterConfig;
    playerHp?: number;
    onHpChange?: (hp: number) => void;
    onMessageLog?: (msg: string) => void;
    onTriggerQTE?: (boss: BossConfig, callback: (success: boolean) => void) => void;
    onChapterCompleted?: () => void;
    onGameOver?: () => void;
    onStoryDialogue?: (payload: StoryDialoguePayload, done: (choiceIndex?: number) => void) => void;
    onLedgerChange?: (total: number, note: string) => void;
  }) {
    if (!data || !data.hero || !data.chapter) return;

    this.chapter = data.chapter;
    this.playerClass = data.chapter.protagonistOverride
      ? (this.resolveHero(data.chapter.protagonistOverride) ?? data.hero)
      : data.hero;
    this.currentLevelIndex = data.chapter.index - 1;
    this.activeHp = data.playerHp ?? this.playerClass.maxHp;
    this.activeGold = 0;
    this.onHpChange = data.onHpChange ?? (() => {});
    this.onGoldChange = () => {};
    this.onMessageLog = data.onMessageLog ?? (() => {});
    this.onTriggerQTE = data.onTriggerQTE!;
    this.onLevelCompleted = data.onChapterCompleted ?? (() => {});
    this.onGameOver = data.onGameOver!;
    this.onNpcInteract = () => {};
    this.onStoryDialogue = data.onStoryDialogue ?? ((_p, done) => done());
    this.onLedgerChange = data.onLedgerChange ?? (() => {});

    this.isDashing = false;
    this.dashCooldown = false;
    this.lastBossAttackTime = 0;
    this.spawnedBoss = null;
    this.isBossActive = false;
    this.chaseSprite = null;
    this.chaseShadow = null;
    this.chaseActive = false;
    this.chaseCooldown = 0;
    this.levelStarted = false;
    this.enemyHitCooldowns.clear();
    this.mapCollidables = [];
    this.mapObjects = [];
    this.currentSceneIndex = 0;
    this.npcs = [];
    this.dialogueOpen = false;
    this.lastMoveAngle = 0;
    this.ledgerTotal = 0;
    this.beatIndex = 0;
    this.beatActive = false;
    this.walkTarget = null;
    this.playerShadow = null;
    this.ambientOverlay = null;
    this.vignetteOverlay = null;
    this.fakeLights = [];
    this.particleEmitters = [];
    this.letterboxTop = null;
    this.letterboxBottom = null;
    this.lastFootstepTime = 0;
    this.portraitDataUrls = {};
    this.bossMusicSting = null;
    this.propSprites = new Map();
  }

  private resolveHero(id: string): CharacterClass | undefined {
    return CHARACTER_CLASSES.find(c => c.id === id);
  }

  private safeLoadImage(key: string, url: string) {
    if (!this.textures.exists(key)) {
      this.load.image(key, url);
    }
  }

  private registerAnim(id: string, sheetKey: string, animName: string, frames: number[], frameRate: number, repeat: number) {
    const key = `${animName}_${id}`;
    if (this.anims.exists(key)) this.anims.remove(key);

    let validFrames = frames;
    if (this.textures.exists(sheetKey)) {
      const tex = this.textures.get(sheetKey);
      if (tex && typeof tex.frameTotal === 'number') {
        const maxFrame = tex.frameTotal - 1;
        validFrames = frames.filter(f => f <= maxFrame);
      }
    }
    if (validFrames.length === 0) validFrames = [0];

    this.anims.create({
      key,
      frames: validFrames.map(f => ({ key: sheetKey, frame: f })),
      frameRate,
      repeat
    });
  }

  public preload() {
    // Load all assets in one batch to avoid Phaser's batch-transition stall (default limit is 32)
    this.load.maxParallelDownloads = 256;
    this.createProceduralTextures();
    this.safeLoadImage('plasma_shield', plasmaShieldImg);
    this.safeLoadImage('shield_raw', shieldImg);
    this.safeLoadImage('hero_eric_raw_jpg', heroEricImg);
    this.safeLoadImage('hero_jacob_raw_jpg', heroJacobImg);
    this.safeLoadImage('hero_nick_f_raw_jpg', heroNickFImg);
    this.safeLoadImage('hero_nick_h_raw_jpg', heroNickHImg);
    this.safeLoadImage('hero_jordan_raw_jpg', heroJordanImg);
    this.safeLoadImage('hero_maharko_raw_jpg', heroMaharkoImg);
    this.safeLoadImage('neighborhood_map', neighborhoodMapImg);
    // Boss images
    this.safeLoadImage('boss_eric', bossEricImg);
    this.safeLoadImage('boss_audrey', bossAudreyImg);
    this.safeLoadImage('boss_florida', bossFloridaImg);
    this.safeLoadImage('boss_ben', bossBenImg);
    this.safeLoadImage('boss_ben_umbc', bossBenUmbcImg);
    this.safeLoadImage('boss_nick_f', bossNickFImg);
    // Projectile / loot images
    this.safeLoadImage('coin_img', coinImg);
    this.safeLoadImage('shard_img', shardImg);
    // Enemy sprite sheets — BFS-processed in create() with procedural fallback
    this.safeLoadImage('enemy_ticketmaster_raw', enemyTicketmasterImg);
    this.safeLoadImage('enemy_dishes_raw', enemyDishesImg);
    this.safeLoadImage('enemy_zombie_raw', enemyZombieImg);
    this.safeLoadImage('enemy_frat_bro_raw', enemyFratBroImg);
    // R1: hospital props (Ch3)
    this.safeLoadImage('prop_hospital_bed', propHospitalBedUrl);
    this.safeLoadImage('prop_iv_drip', propIvDripUrl);
    this.safeLoadImage('prop_cabinet', propCabinetUrl);
    this.safeLoadImage('prop_red_toilet', propRedToiletUrl);
    // R1: jungle gym (Ch4)
    this.safeLoadImage('prop_jungle_gym', propJungleGymUrl);
    // R1: watchwater house (Ch6)
    this.safeLoadImage('prop_watchwater', propWatchwaterUrl);
    this.safeLoadImage('prop_watchwater_open', propWatchwaterOpenUrl);

    this.safeLoadImage('stage_umbc_basement', umbcBasementStageUrl);
    this.safeLoadImage('stage_parking_lot_night', parkingLotNightUrl);
    // Ben has no playable-roster hero sprite; reuse his UMBC portrait (a 1376×768
    // showcase sheet, same format as the hero art) so he renders as a real,
    // animated character instead of a colored blob in the basement.
    this.safeLoadImage('hero_ben_raw_jpg', bossBenUmbcImg);
    this.safeLoadImage('hero_girl1_raw', npcGirlSilhouetteUrl);
    this.safeLoadImage('hero_girl2_raw', npcGirlSilhouetteUrl);
    this.safeLoadImage('hero_girl3_raw', npcGirlSilhouetteUrl);
    this.audioController.safeLoadAudio('sfx_crowd_murmur', CROWD_MURMUR_URL);
    this.audioController.safeLoadAudio('sfx_parking_ambient', CRICKET_AMBIENT_URL);
    // Voiced one-off: Ben's "You're next." Drop the MP3 at public/voice/ben_youre_next.mp3.
    // Loaded by URL (not a bundler import) so a missing file fails gracefully.
    this.audioController.safeLoadAudio('sfx_ben_youre_next', '/voice/ben_youre_next.mp3');
    // Ch9: Suds & Soles Pool Party (character portraits + map images)
    this.safeLoadImage('npc_eric_pool',      ericPoolUrl);
    this.safeLoadImage('npc_nick_h_pool',    nickHPoolUrl);
    this.safeLoadImage('npc_jacob_pool',     jacobPoolUrl);
    this.safeLoadImage('npc_nick_f_pool',    nickFPoolUrl);
    this.safeLoadImage('npc_anastasia_pool', anastasiaPoolUrl);
    this.safeLoadImage('npc_sophia_pool',    sophiaPoolUrl);
    this.safeLoadImage('npc_sam_pool',       samPoolUrl);
    this.safeLoadImage('prop_pool_map_day',  poolMapDayUrl);
    this.safeLoadImage('prop_pool_map_night', poolMapNightUrl);
    // R2: crew cars
    this.safeLoadImage('prop_jordan_mustang', propJordanMustangUrl);
    this.safeLoadImage('prop_maharko_camero', propMaharkoCameroUrl);
    this.safeLoadImage('prop_nick_f_corolla', propNickFCorollaUrl);

    // R16: Nature flora
    this.safeLoadImage('nature_flower_1', natureFlower1Url);
    this.safeLoadImage('nature_flower_2', natureFlower2Url);
    this.safeLoadImage('nature_bush_1', natureBush1Url);
    this.safeLoadImage('nature_bush_2', natureBush2Url);

    // Sprint 2: LimeZu furniture sheet (sliced into furniture_atlas in create())
    this.safeLoadImage('interiors48', interiors48Url);

    // RUN-3: asset-pack JPGs — color-keyed + sliced into pack_atlas in create()
    this.safeLoadImage('pack_tollbooth', packTollboothUrl);
    this.safeLoadImage('pack_rail', packRailUrl);
    this.safeLoadImage('pack_pool', packPoolUrl);
    this.safeLoadImage('pack_arcade', packArcadeUrl);

    // Phase E — audio
    this.loadChapterAudio();

    // Preload active/referenced game modes
    if (this.chapter?.beats) {
      this.chapter.beats.forEach((beat) => {
        if (beat.type === 'minigame') {
          const mode = getMode(beat.modeId);
          if (mode && mode.preload) {
            const context = this.beatEngine.buildModeContext();
            try {
              mode.preload(context);
            } catch (err) {
              console.error(`[ChapterScene] Preload failed for mode ${beat.modeId}:`, err);
            }
          }
        }
      });
    }
  }

  private safeLoadAudio(key: string, url: string) {
    try { this.load.audio(key, url); } catch { /* missing file — skip silently */ }
  }

  private loadChapterAudio() {
    // Chapter-level music key, falling back to scene 0's per-scene music key
    // (multi-location chapters like UMBC have no chapter-level key — they drive
    // music entirely through scenes[].music).
    const musicKey = CHAPTER_MUSIC_KEY[this.chapter.id]
      ?? this.chapter.scenes?.[0]?.music;
    const musicUrl = musicKey ? STAGE_MUSIC_URL[musicKey] : undefined;
    if (musicKey && musicUrl) this.safeLoadAudio(musicKey, musicUrl);

    // Pre-load music for every later scene that specifies its own key so the
    // changeScene crossfade has the track ready.
    for (const scene of this.chapter.scenes ?? []) {
      if (scene.music && scene.music !== musicKey) {
        const url = STAGE_MUSIC_URL[scene.music];
        if (url) this.safeLoadAudio(scene.music, url);
      }
    }
    this.safeLoadAudio('boss_sting', BOSS_MUSIC_URL);
    this.safeLoadAudio('boss_loop', BOSS_LOOP_URL);

    const variant = THEME_FOOTSTEP[(this.getActiveSceneConfig().map as any).theme ?? 'apartment'] ?? 'carpet';
    this.footstepKeys = (FOOTSTEP_URLS[variant] ?? []).map((url, i) => {
      const key = `footstep_${i}`;
      this.safeLoadAudio(key, url);
      return key;
    });

    this.safeLoadAudio('ui_select', UI_SELECT_URL);
    this.safeLoadAudio('victory_jingle', VICTORY_JINGLE_URL);
    this.safeLoadAudio('sfx_knock', KNOCK_URL);
  }

  private preloadNextChapterAudio() {
    this.time.delayedCall(2000, () => {
      const currentIndex = CHAPTERS.findIndex(c => c.id === this.chapter.id);
      if (currentIndex >= 0 && currentIndex < CHAPTERS.length - 1) {
        const nextChapter = CHAPTERS[currentIndex + 1];
        const nextMusicKey = CHAPTER_MUSIC_KEY[nextChapter.id];
        const nextMusicUrl = nextMusicKey ? STAGE_MUSIC_URL[nextMusicKey] : undefined;
        if (nextMusicKey && nextMusicUrl && !this.cache.audio.exists(nextMusicKey)) {
          this.load.audio(nextMusicKey, nextMusicUrl);
          this.load.start();
        }
      }
    });
  }

  public create() {
    if (!this.playerClass) return;

    // Sprint 2: slice the LimeZu furniture sheet into the furniture_atlas (furn_* frames)
    buildFurnitureAtlas(this, 'interiors48');
    // RUN-3: extract + color-key owner asset packs into the pack_atlas
    buildPackAtlas(this);
    this.preloadNextChapterAudio();

    // Process prop textures to remove backgrounds and cache aspect ratios
    // Car props are excluded — they are showcase JPEGs with grid layouts, rendered procedurally
    const PROP_SHEET_KEYS = [
        'bg_hospital_room',
        'bg_cars_01',
    ];
    for (const key of PROP_SHEET_KEYS) {
        if (this.textures.exists(key)) {
            this.propAspects[key] = extractPropSubject(this, key, 30);
        }
    }

    // Car showcase JPEGs: extract the connected sprite near the center and crop to its
    // bounding box so the full 1408×768 showcase grid isn't shown at map-prop scale.
    // prop_jungle_gym is also a showcase sheet — crop to the main dome view.
    const CAR_PROP_KEYS = ['prop_jordan_mustang', 'prop_maharko_camero', 'prop_nick_f_corolla'];
    for (const key of CAR_PROP_KEYS) {
        if (this.textures.exists(key)) {
            this.propAspects[key] = this.extractCropSubject(key);
        }
    }

    this.generatePropsAtlas();

    const heroIds = ['eric', 'jacob', 'nick_f', 'nick_h', 'jordan', 'maharko', 'ben'];
    heroIds.forEach(id => {
      const sheetKey = `hero_${id}_sheet`;
      if (this.textures.exists(sheetKey)) return;

      const rawKey = this.textures.exists(`hero_${id}_raw_png`) ? `hero_${id}_raw_png` : `hero_${id}_raw_jpg`;

      try {
        const image = this.textures.get(rawKey).getSourceImage() as HTMLImageElement;
        const processed = preprocessShowcaseSheet(image, id);

        const cleanKey = `hero_${id}_clean_canvas`;
        this.textures.addCanvas(cleanKey, processed.canvas);
        const canvasSource = this.textures.get(cleanKey).getSourceImage() as HTMLImageElement;
        this.textures.addSpriteSheet(sheetKey, canvasSource, {
          frameWidth: processed.frameWidth,
          frameHeight: processed.frameHeight
        });

        this.registerAnim(id, sheetKey, 'idle_front', processed.idleFrontFrames, 4, -1);
        this.registerAnim(id, sheetKey, 'idle_side', processed.idleSideFrames, 4, -1);
        this.registerAnim(id, sheetKey, 'idle_back', processed.idleBackFrames, 4, -1);
        this.registerAnim(id, sheetKey, 'walk_front', processed.walkFrontFrames, 8, -1);
        this.registerAnim(id, sheetKey, 'walk_side', processed.walkSideFrames, 8, -1);
        this.registerAnim(id, sheetKey, 'walk_back', processed.walkBackFrames, 8, -1);
        this.registerAnim(id, sheetKey, 'idle', processed.idleFrontFrames, 4, -1); // Fallback
        this.registerAnim(id, sheetKey, 'walk', processed.walkFrames, 8, -1); // Fallback
        this.registerAnim(id, sheetKey, 'attack', processed.attackFrames, 12, 0);
        this.registerAnim(id, sheetKey, 'hurt', processed.hurtFrames, 8, 0);
        this.registerAnim(id, sheetKey, 'victory', processed.victoryFrames, 6, -1);
        this.registerAnim(id, sheetKey, 'defeat', processed.defeatFrames, 4, 0);
      } catch (err) {
        console.error(`[GameScene] Spritesheet error for ${id}:`, err);
        const fallbackSource = this.textures.get(rawKey).getSourceImage() as HTMLImageElement;
        this.textures.addSpriteSheet(sheetKey, fallbackSource, { frameWidth: 128, frameHeight: 128 });
        this.registerAnim(id, sheetKey, 'idle_front', [0], 4, -1);
        this.registerAnim(id, sheetKey, 'idle_side', [0], 4, -1);
        this.registerAnim(id, sheetKey, 'idle_back', [0], 4, -1);
        this.registerAnim(id, sheetKey, 'walk_front', [0], 8, -1);
        this.registerAnim(id, sheetKey, 'walk_side', [0], 8, -1);
        this.registerAnim(id, sheetKey, 'walk_back', [0], 8, -1);
        this.registerAnim(id, sheetKey, 'idle', [0], 4, -1);
        this.registerAnim(id, sheetKey, 'walk', [0], 8, -1);
        this.registerAnim(id, sheetKey, 'attack', [0], 12, 0);
        this.registerAnim(id, sheetKey, 'hurt', [0], 8, 0);
        this.registerAnim(id, sheetKey, 'victory', [0], 6, -1);
        this.registerAnim(id, sheetKey, 'defeat', [0], 4, 0);
      }
    });

    // Process enemy showcase sheets
    ['ticketmaster', 'dishes', 'zombie'].forEach(id => {
      const rawKey = `enemy_${id}_raw`;
      const sheetKey = `enemy_${id}_sheet`;
      if (!this.textures.exists(rawKey) || this.textures.exists(sheetKey)) return;
      try {
        const image = this.textures.get(rawKey).getSourceImage() as HTMLImageElement;
        const processed = preprocessShowcaseSheet(image, id);
        const cleanKey = `enemy_${id}_clean_canvas`;
        this.textures.addCanvas(cleanKey, processed.canvas);
        const src = this.textures.get(cleanKey).getSourceImage() as HTMLImageElement;
        this.textures.addSpriteSheet(sheetKey, src, {
          frameWidth: processed.frameWidth,
          frameHeight: processed.frameHeight
        });
        this.registerAnim(id, sheetKey, 'idle', processed.idleFrontFrames, 4, -1);
        this.registerAnim(id, sheetKey, 'walk', processed.walkFrames, 6, -1);
        this.registerAnim(id, sheetKey, 'attack', processed.attackFrames, 10, 0);
        this.registerAnim(id, sheetKey, 'hurt', processed.hurtFrames, 8, 0);
        this.registerAnim(id, sheetKey, 'defeat', processed.defeatFrames, 4, 0);
      } catch (err) {
        console.error(`[GameScene] Enemy spritesheet error for ${id}:`, err);
        try {
          const image = this.textures.get(rawKey).getSourceImage() as HTMLImageElement;
          const processed = preprocessColumnFirstSheet(image, id);
          const cleanKey = `enemy_${id}_clean_canvas`;
          this.textures.addCanvas(cleanKey, processed.canvas);
          const src = this.textures.get(cleanKey).getSourceImage() as HTMLImageElement;
          this.textures.addSpriteSheet(sheetKey, src, { frameWidth: processed.frameWidth, frameHeight: processed.frameHeight });
          this.registerAnim(id, sheetKey, 'idle', processed.idleFrontFrames, 4, -1);
          this.registerAnim(id, sheetKey, 'walk', processed.walkFrames, 6, -1);
          this.registerAnim(id, sheetKey, 'attack', processed.attackFrames, 10, 0);
          this.registerAnim(id, sheetKey, 'hurt', processed.hurtFrames, 8, 0);
          this.registerAnim(id, sheetKey, 'defeat', processed.defeatFrames, 4, 0);
        } catch (err2) {
          const fallbackSource = this.textures.get(rawKey).getSourceImage() as HTMLImageElement;
          this.textures.addSpriteSheet(sheetKey, fallbackSource, { frameWidth: 128, frameHeight: 128 });
        }
      }
    });

    // Process girl silhouettes as sprite sheets, removing white background
    // (Removed: We now use Phaser.BlendModes.MULTIPLY on the raw textures directly)

    // Process boss_ben_umbc as a showcase sheet
    if (this.textures.exists('boss_ben_umbc') && !this.textures.exists('boss_ben_umbc_sheet')) {
      try {
        const image = this.textures.get('boss_ben_umbc').getSourceImage() as HTMLImageElement;
        const processed = preprocessColumnFirstSheet(image, 'boss_ben_umbc');
        const cleanKey = 'boss_ben_umbc_clean';
        this.textures.addCanvas(cleanKey, processed.canvas);
        const src = this.textures.get(cleanKey).getSourceImage() as HTMLImageElement;
        this.textures.addSpriteSheet('boss_ben_umbc_sheet', src, { frameWidth: processed.frameWidth, frameHeight: processed.frameHeight });
        this.registerAnim('boss_ben_umbc', 'boss_ben_umbc_sheet', 'idle', processed.idleFrontFrames, 4, -1);
        this.registerAnim('boss_ben_umbc', 'boss_ben_umbc_sheet', 'walk', processed.walkFrames, 8, -1);
        this.registerAnim('boss_ben_umbc', 'boss_ben_umbc_sheet', 'attack', processed.attackFrames, 12, 0);
        this.registerAnim('boss_ben_umbc', 'boss_ben_umbc_sheet', 'hurt', processed.hurtFrames, 8, 0);
        this.registerAnim('boss_ben_umbc', 'boss_ben_umbc_sheet', 'defeat', processed.defeatFrames, 4, 0);
      } catch (err) {
        console.error('[GameScene] Boss ben umbc spritesheet error:', err);
      }
    }

    // Process boss showcase sheets — column-first format (columns = categories, rows = frames)
    ['eric', 'audrey', 'florida', 'ben', 'nick_f', 'frat_bro'].forEach(bossId => {
      // NOTE: frat_bro is included here because it's a column-first sheet like bosses.
      const rawKey = bossId === 'frat_bro' ? 'enemy_frat_bro_raw' : `boss_${bossId}`;
      const sheetKey = bossId === 'frat_bro' ? 'enemy_frat_bro_sheet' : `boss_${bossId}_sheet`;
      const animId = bossId === 'frat_bro' ? 'frat_bro' : `boss_${bossId}`;
      
      if (!this.textures.exists(rawKey) || this.textures.exists(sheetKey)) return;
      try {
        const image = this.textures.get(rawKey).getSourceImage() as HTMLImageElement;
        const processed = preprocessColumnFirstSheet(image, bossId);
        const cleanKey = bossId === 'frat_bro' ? 'enemy_frat_bro_clean_canvas' : `boss_${bossId}_clean_canvas`;
        this.textures.addCanvas(cleanKey, processed.canvas);
        const src = this.textures.get(cleanKey).getSourceImage() as HTMLImageElement;
        this.textures.addSpriteSheet(sheetKey, src, { frameWidth: processed.frameWidth, frameHeight: processed.frameHeight });
        this.registerAnim(animId, sheetKey, 'idle_front', processed.idleFrontFrames, 3, -1);
        this.registerAnim(animId, sheetKey, 'idle_side', processed.idleSideFrames, 3, -1);
        this.registerAnim(animId, sheetKey, 'idle_back', processed.idleBackFrames, 3, -1);
        this.registerAnim(animId, sheetKey, 'walk_front', processed.walkFrontFrames, 8, -1);
        this.registerAnim(animId, sheetKey, 'walk_side', processed.walkSideFrames, 8, -1);
        this.registerAnim(animId, sheetKey, 'walk_back', processed.walkBackFrames, 8, -1);
        this.registerAnim(animId, sheetKey, 'idle', processed.idleFrontFrames, 3, -1);
        this.registerAnim(animId, sheetKey, 'walk', processed.walkFrames, 8, -1);
        this.registerAnim(animId, sheetKey, 'attack', processed.attackFrames, 10, 0);
        this.registerAnim(animId, sheetKey, 'hurt', processed.hurtFrames, 8, 0);
        this.registerAnim(animId, sheetKey, 'defeat', processed.defeatFrames, 4, 0);
      } catch (err) {
        console.error(`[GameScene] Boss/Enemy spritesheet error for ${bossId}:`, err);
      }
    });

    // Process coin and shard showcase sheets → use frame 0 as projectile/loot sprite
    ['coin', 'shard'].forEach(id => {
      const rawKey = `${id}_img`;
      const sheetKey = `${id}_sheet`;
      if (!this.textures.exists(rawKey) || this.textures.exists(sheetKey)) return;
      try {
        const image = this.textures.get(rawKey).getSourceImage() as HTMLImageElement;
        const processed = preprocessShowcaseSheet(image, id);
        const cleanKey = `${id}_clean_canvas`;
        this.textures.addCanvas(cleanKey, processed.canvas);
        const src = this.textures.get(cleanKey).getSourceImage() as HTMLImageElement;
        this.textures.addSpriteSheet(sheetKey, src, { frameWidth: processed.frameWidth, frameHeight: processed.frameHeight });
      } catch (err) {
        console.error(`[GameScene] ${id} spritesheet error:`, err);
      }
    });

    // Process pool party character sheets
    ['eric', 'nick_h', 'jacob', 'nick_f', 'anastasia', 'sophia', 'sam'].forEach(id => {
      const rawKey = `npc_${id}_pool`;
      const sheetKey = `npc_${id}_pool_sheet`;
      if (!this.textures.exists(rawKey) || this.textures.exists(sheetKey)) return;
      try {
        const image = this.textures.get(rawKey).getSourceImage() as HTMLImageElement;
        const processed = (id === 'anastasia' || id === 'sophia')
          ? preprocessFemalePoolSheet(image, id)
          : preprocessShowcaseSheet(image, id);
        const cleanKey = `npc_${id}_pool_clean_canvas`;
        this.textures.addCanvas(cleanKey, processed.canvas);
        const src = this.textures.get(cleanKey).getSourceImage() as HTMLImageElement;
        this.textures.addSpriteSheet(sheetKey, src, {
          frameWidth: processed.frameWidth,
          frameHeight: processed.frameHeight
        });

        const prefix = `npc_${id}_pool`;
        this.registerAnim(prefix, sheetKey, 'idle_front', processed.idleFrontFrames, 4, -1);
        this.registerAnim(prefix, sheetKey, 'idle_side', processed.idleSideFrames, 4, -1);
        this.registerAnim(prefix, sheetKey, 'idle_back', processed.idleBackFrames, 4, -1);
        this.registerAnim(prefix, sheetKey, 'walk_front', processed.walkFrontFrames, 8, -1);
        this.registerAnim(prefix, sheetKey, 'walk_side', processed.walkSideFrames, 8, -1);
        this.registerAnim(prefix, sheetKey, 'walk_back', processed.walkBackFrames, 8, -1);
        this.registerAnim(prefix, sheetKey, 'idle', processed.idleFrontFrames, 4, -1);
        this.registerAnim(prefix, sheetKey, 'walk', processed.walkFrames, 8, -1);

        if (processed.submergedIdleFrames) {
          this.registerAnim(prefix, sheetKey, 'submerged_idle', processed.submergedIdleFrames, 4, -1);
        }
        if (processed.submergedSwimFrames) {
          this.registerAnim(prefix, sheetKey, 'submerged_swim', processed.submergedSwimFrames, 4, -1);
        }
      } catch (err) {
        console.error(`[GameScene] Pool character spritesheet error for ${id}:`, err);
      }
    });

    // Damage shield: shield.jpg is a showcase sheet -> extract frame 0 as a single clean icon.
    if (this.textures.exists('shield_raw') && !this.textures.exists('shield_fx')) {
      try {
        const image = this.textures.get('shield_raw').getSourceImage() as HTMLImageElement;
        const processed = preprocessShowcaseSheet(image, 'shield');
        this.textures.addCanvas('shield_fx_canvas', processed.canvas);
        const src = this.textures.get('shield_fx_canvas').getSourceImage() as HTMLImageElement;
        this.textures.addSpriteSheet('shield_fx', src, {
          frameWidth: processed.frameWidth, frameHeight: processed.frameHeight,
        });
      } catch (err) {
        console.error('[ChapterScene] shield_fx processing failed:', err);
      }
    }

    const { map } = this.getActiveSceneConfig();
    this.physics.world.setBounds(0, 0, map.width, map.height);
    this.cameras.main.setBackgroundColor(map.backdrop);

    this.projectiles = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.enemyProjectiles = this.physics.add.group();
    this.lootShards = this.physics.add.group();
    this.walls = this.physics.add.staticGroup();

    this.buildMapLayer(map);

    const hasPoolSheet = this.textures.exists(`npc_${this.playerClass.id}_pool_sheet`);
    const sheetKey = (this.chapter.usePoolSheet && hasPoolSheet) ? `npc_${this.playerClass.id}_pool_sheet` : 'hero_' + this.playerClass.id + '_sheet';
    this.player = this.physics.add.sprite(map.playerSpawn.x, map.playerSpawn.y, sheetKey, 0);
    this.player.setScale(0.5);
    this.player.setCircle(22, 42, 45);
    this.player.setCollideWorldBounds(true);
    this.player.setDrag(500, 500);
    if (this.chapter.usePoolSheet && hasPoolSheet) {
      this.player.play(`idle_front_npc_${this.playerClass.id}_pool`, true);
    } else {
      this.player.play('idle_' + this.playerClass.id, true);
    }
    this.player.setDepth(this.player.y);

    // Shadow under the player — follows in update()
    this.playerShadow = this.add.image(this.player.x, this.player.y + 18, 'shadow_ellipse')
      .setAlpha(0.35).setScale(0.85).setDepth(this.player.y - 1);

    // Close, cozy camera — see a room / street at a time.
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    const zoomLevel = this.chapter.cameraZoom ?? 2.0;
    this.cameras.main.setZoom(zoomLevel);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasdKeys = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      SPACE: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      F: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F)
    };
    this.eKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.collider(this.projectiles, this.walls, (p: any) => p.destroy());
    this.physics.add.collider(this.enemyProjectiles, this.walls, (p: any) => p.destroy());
    this.wireMapColliders();

    this.physics.add.overlap(this.player, this.enemyProjectiles, this.handleProjectileHitPlayer, undefined, this);

    this.placeActors();

    this.levelStarted = true;

    // Keep camera-anchored HUD in place when the viewport resizes
    this.scale.on('resize', this.repositionHUD, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.repositionHUD, this));

    // Ensure the canvas has keyboard focus (Phaser 3 uses window listeners, but
    // Chrome requires the canvas to have tabindex + focus to capture keys)
    this.input.on('pointerdown', () => this.game.canvas.focus());
    this.time.delayedCall(100, () => {
      this.game.canvas.setAttribute('tabindex', '0');
      this.game.canvas.focus();
    });

    // Fade in from black over 600ms for smooth chapter entry
    this.cameras.main.fadeIn(600, 0, 0, 0);

    // Extract portraits from processed sprite sheets (synchronous canvas read)
    this.extractPortraits();

    // Start stage music (fade in over 1.2 s to not blast the player)
    this.startStageMusic();

    // Kick off the story.
    this.time.delayedCall(300, () => this.startBeat(0));

    // Clean up audio when the scene shuts down
    this.events.once('shutdown', () => {
      this.stageMusic?.destroy();
      this.bossMusic?.destroy();
      this.bossMusicSting?.destroy();
      this.stageMusic = null;
      this.bossMusic = null;
      this.bossMusicSting = null;
      this.chaseSprite?.destroy(); this.chaseSprite = null;
      this.chaseShadow?.destroy(); this.chaseShadow = null;
      this.chaseActive = false;
      this.setControlsInverted(false);
      if (this.activeMode) {
        try {
          this.activeMode.teardown();
        } catch (err) {
          console.error('[ChapterScene] activeMode teardown failed:', err);
        }
        this.activeMode = null;
      }
    });
  }

  // ─── Multi-scene helpers ──────────────────────────────────────────────────────

  public getActiveSceneConfig(): { map: MapConfig; actors: ActorPlacement[] } {
    const s = this.chapter.scenes?.[this.currentSceneIndex];
    return s ?? { map: this.chapter.map, actors: this.chapter.actors };
  }

  /** Snapshot the display list, build the map + atmosphere, record what was added. */
  private buildMapLayer(map: MapConfig) {
    const before = new Set<Phaser.GameObjects.GameObject>(this.children.list);
    this.buildMapFromConfig(map);
    this.buildAtmosphere(map);
    this.mapObjects = this.children.list.filter(o => !before.has(o));
  }

  /** Add per-object physics colliders for mapCollidables. Call after every map build. */
  private wireMapColliders() {
    this.mapCollidables.forEach(obj => {
      this.physics.add.collider(this.player, obj as any);
      this.physics.add.collider(this.enemies, obj as any);
      this.physics.add.collider(this.projectiles, obj as any, (p: any) => p.destroy());
      this.physics.add.collider(this.enemyProjectiles, obj as any, (p: any) => p.destroy());
    });
  }

  /** Tear down all map visuals, physics, and actor sprites — ready for a new scene. */
  public teardownMap() {
    // Static walls group: clear + destroy all members
    this.walls.clear(true, true);

    // Physics-backed solid rectangles (mapCollidables)
    this.mapCollidables.forEach(obj => { try { obj.destroy(); } catch {} });
    this.mapCollidables = [];

    // Every visual created during buildMapLayer (backdrop, floor, rects, images, graphics…)
    this.mapObjects.forEach(obj => { try { if (obj.active) obj.destroy(); } catch {} });
    this.mapObjects = [];

    // Atmosphere tracked refs (also in mapObjects, but null them out)
    this.ambientOverlay = null;
    this.vignetteOverlay = null;
    this.fakeLights = [];
    this.particleEmitters.forEach(e => { try { e.destroy(); } catch {} });
    this.particleEmitters = [];
    this.propSprites = new Map();
    this.poolNameplates = new Map();

    // Actor sprites
    Object.values(this.actorSprites).flat().forEach(obj => {
      try { (obj as Phaser.GameObjects.GameObject).destroy(); } catch {}
    });
    this.actorSprites = {};
  }

  /** Fade out → swap map → fade in. Advances the beat when complete. */
  public transitionToScene(sceneIndex: number, transitionMs = 500, onDone?: () => void) {
    const half = transitionMs / 2;
    this.movementFrozen = true;
    this.cameras.main.fadeOut(half, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.teardownMap();
      this.currentSceneIndex = sceneIndex;
      const { map, actors } = this.getActiveSceneConfig();

      this.physics.world.setBounds(0, 0, map.width, map.height);
      this.cameras.main.setBackgroundColor(map.backdrop);

      this.buildMapLayer(map);
      this.wireMapColliders();
      this.player.setPosition(map.playerSpawn.x, map.playerSpawn.y);
      this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

      this.actorsSystem.placeActors(actors);

      // If the new scene specifies its own music, crossfade during the black frame.
      const sceneMusic = this.chapter.scenes?.[sceneIndex]?.music;
      if (sceneMusic) this.audioController.crossfadeToMusic(sceneMusic);

      this.cameras.main.fadeIn(half, 0, 0, 0);
      this.cameras.main.once('camerafadeincomplete', () => {
        this.movementFrozen = false;
        onDone?.();
      });
    });
  }

  // ─── Map building (data-driven) ───────────────────────────────────────────────

  public buildMapFromConfig(map: MapConfig) {
    this.mapBuilder.buildMapFromConfig(map);
  }

  public buildNeighborhoodMap() {
    this.mapBuilder.buildNeighborhoodMap();
  }

  public scatterNature(map: MapConfig) {
    this.mapBuilder.scatterNature(map);
  }

  public drawFloorLines(map: MapConfig) {
    this.mapBuilder.drawFloorLines(map);
  }

  public drawDecorativeRect(x: number, y: number, w: number, h: number, fill: number, stroke: number, propType?: string, propKey?: string) {
    this.mapBuilder.drawDecorativeRect(x, y, w, h, fill, stroke, propType, propKey);
  }

  public tryDrawFurniture(x: number, y: number, w: number, h: number, name: string, propType?: string): boolean {
    return this.mapBuilder.tryDrawFurniture(x, y, w, h, name, propType);
  }

  public drawFurnitureSprite(x: number, y: number, w: number, h: number, frame: string, name: string, propType?: string) {
    this.mapBuilder.drawFurnitureSprite(x, y, w, h, frame, name, propType);
  }

  public drawPackSprite(x: number, y: number, w: number, h: number, frameName: string, tallBias = 0): boolean {
    return this.mapBuilder.drawPackSprite(x, y, w, h, frameName, tallBias);
  }

  public drawPropShape(x: number, y: number, w: number, h: number, fill: number, stroke: number, propType?: string, propKey?: string) {
    this.mapBuilder.drawPropShape(x, y, w, h, fill, stroke, propType, propKey);
  }

  public addMapObject(x: number, y: number, w: number, h: number, fillColor: number, strokeColor: number, propType?: string, propKey?: string): Phaser.GameObjects.Rectangle {
    return this.mapBuilder.addMapObject(x, y, w, h, fillColor, strokeColor, propType, propKey);
  }

  public createWall(x: number, y: number, w: number, h: number) {
    this.mapBuilder.createWall(x, y, w, h);
  }

  public createRoomLabel(_x: number, _y: number, _name: string, _detail: string, _colorHex: string) {
    this.mapBuilder.createRoomLabel(_x, _y, _name, _detail, _colorHex);
  }

  // Higher-DPI text rendering. Phaser draws text to a texture at the font's
  // pixel size and then scales it to the canvas — without bumping resolution,
  // small fonts come out blurry. Render at device pixel ratio (min 2x).
  public get textRes(): number {
    return Math.max(2, Math.ceil((typeof window !== 'undefined' ? window.devicePixelRatio : 1) * 2));
  }

  /** Crisp text helper — applies resolution + a readable default font. */
  public label(
    x: number,
    y: number,
    text: string,
    style: Phaser.Types.GameObjects.Text.TextStyle = {}
  ): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      fontFamily: 'Yoster, monospace',
      resolution: this.textRes,
      ...style
    });
  }

  // ─── Brainrot HUD ─────────────────────────────────────────────────────────

  private buildBrainrotHUD() {
    const cam = this.cameras.main;
    const cx = cam.width - 160;
    const cy = 24;

    this.brainrotBar = this.add.rectangle(cx, cy, 120, 12, 0x1e293b)
      .setStrokeStyle(1.5, 0x7c3aed, 0.8)
      .setScrollFactor(0)
      .setDepth(100);

    this.brainrotFill = this.add.rectangle(cx - 60, cy, 0, 10, 0xa78bfa)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(101);

    this.brainrotLabel = this.label(cx, cy - 13, 'BRAINROT', {
      fontSize: '11px', color: '#c4b5fd', fontStyle: 'bold',
      stroke: '#0b1208', strokeThickness: 3
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(102);
  }

  private lastCanvasW = 0;
  private lastCanvasH = 0;

  /** Resize the game to match its container whenever that container changes. */
  private syncCanvasToParent() {
    const parent = this.game.canvas?.parentElement;
    if (!parent) return;
    const w = parent.offsetWidth;
    const h = parent.offsetHeight;
    if (w < 1 || h < 1) return;
    if (w === this.lastCanvasW && h === this.lastCanvasH) return;
    this.lastCanvasW = w;
    this.lastCanvasH = h;
    this.scale.resize(w, h);
    this.repositionHUD();
  }

  /** Reposition camera-anchored HUD when the viewport size changes. */
  private repositionHUD() {
    const cam = this.cameras.main;
    const w = cam.width;
    const h = cam.height;
    const cx = w - 160;
    const cy = 24;
    if (this.brainrotBar) this.brainrotBar.setPosition(cx, cy);
    if (this.brainrotFill) this.brainrotFill.setPosition(cx - 60, cy);
    if (this.brainrotLabel) this.brainrotLabel.setPosition(cx, cy - 13);
    // Resize screen-space atmosphere overlays to new viewport
    if (this.ambientOverlay) this.ambientOverlay.setPosition(w / 2, h / 2).setSize(w, h);
    if (this.vignetteOverlay) this.vignetteOverlay.setPosition(w / 2, h / 2).setDisplaySize(w, h);
  }

  private updateBrainrotHUD() {
    if (!this.brainrotFill) return;
    const fillW = (this.brainrotLevel / 100) * 120;
    this.brainrotFill.setSize(fillW, 10);
    const alpha = this.brainrotLevel > 0 ? 1 : 0.3;
    this.brainrotFill.setAlpha(alpha);
    this.brainrotLabel.setAlpha(alpha);
    this.brainrotBar.setAlpha(alpha > 0.3 ? 1 : 0.3);
  }

  public applyDirectionalAnim(sprite: Phaser.GameObjects.Sprite, id: string, vx: number, vy: number, facesLeftByDefault = false) {
    this.actorsSystem.applyDirectionalAnim(sprite, id, vx, vy, facesLeftByDefault);
  }

  // ─── Update Loop ─────────────────────────────────────────────────────────────

  public update(time: number, _delta: number) {
    if (!this.levelStarted) return;
    if (this.activeMode?.update) {
      this.activeMode.update(time, _delta);
    }

    // Keep the canvas glued to its container every rendered frame. Phaser's RAF
    // loop is the most reliable ticker available — more dependable than
    // ResizeObserver or setInterval, which some embedded/headless contexts
    // throttle or never fire. The guard makes this a cheap no-op when unchanged.
    this.syncCanvasToParent();

    // Y-sort player depth so they walk behind/in front of same-Y props
    this.player.setDepth(this.player.y);
    if (this.playerShadow) {
      this.playerShadow.setPosition(this.player.x, this.player.y + 18);
      this.playerShadow.setDepth(this.player.y - 1);
    }

    // While a story beat owns the screen (dialogue/choice/cutscene), freeze play.
    const hasPoolSheet = this.textures.exists(`npc_${this.playerClass.id}_pool_sheet`);
    const animId = (this.chapter.usePoolSheet && hasPoolSheet) ? `npc_${this.playerClass.id}_pool` : this.playerClass.id;

    if (this.movementFrozen) {
      this.player.setVelocity(0, 0);
      this.wasdKeys.SPACE.reset();
      this.applyDirectionalAnim(this.player, animId, 0, 0, this.playerClass.id === 'nick_f');
      return;
    }

    let vx = 0;
    let vy = 0;
    const speed = this.playerClass.speed;

    if (this.wasdKeys.W.isDown || this.cursors.up.isDown) vy = -speed;
    else if (this.wasdKeys.S.isDown || this.cursors.down.isDown) vy = speed;
    if (this.wasdKeys.A.isDown || this.cursors.left.isDown) vx = -speed;
    else if (this.wasdKeys.D.isDown || this.cursors.right.isDown) vx = speed;

    if (vx !== 0 || vy !== 0) {
      this.lastMoveAngle = Math.atan2(vy, vx);
    }

    if (!this.isDashing && !this.isAttackingAnim) {
      this.player.setVelocity(vx, vy);
      const facesLeftByDefault = this.playerClass.id === 'nick_f';
      this.applyDirectionalAnim(this.player, animId, vx, vy, facesLeftByDefault);
    } else if (this.isAttackingAnim) {
      this.player.setVelocity(vx, vy);
    }

    if (this.dialogueOpen) {
      this.wasdKeys.SPACE.reset();
    } else {
      if (Phaser.Input.Keyboard.JustDown(this.wasdKeys.SPACE)) {
        this.executeDash(vx, vy);
      }
    }

    // Footstep dust puff + sound every 250ms while moving
    if ((vx !== 0 || vy !== 0) && time - this.lastFootstepTime > 250 && this.textures.exists('particle_dot')) {
      this.lastFootstepTime = time;
      if (this.footstepKeys.length) {
        const key = this.footstepKeys[Math.floor(Math.random() * this.footstepKeys.length)];
        try { this.sound.play(key, { volume: 0.12 }); } catch { /* audio not ready */ }
      }
      const puff = this.add.image(
        this.player.x + Phaser.Math.Between(-6, 6),
        this.player.y + 14,
        'particle_dot'
      ).setAlpha(0.5).setScale(0.8).setDepth(this.player.y - 2).setTint(0xbbaa99);
      this.tweens.add({ targets: puff, alpha: 0, scale: 1.8, y: puff.y + 8, duration: 320, onComplete: () => puff.destroy() });
    }

    // walkTo beat: advance when the player reaches the marked spot.
    if (this.walkTarget) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.walkTarget.x, this.walkTarget.y);
      if (d <= this.walkTarget.radius) {
        const wasDoor = this.walkTarget.markerLabel?.includes('front door');
        this.clearWalkTarget();
        const doorSfx = this.chapter.ambientSfx?.onDoor;
        if (wasDoor && doorSfx && this.cache.audio.exists(doorSfx)) {
          [0, 150, 300].forEach(ms => this.time.delayedCall(ms, () => { try { this.sound.play(doorSfx, { volume: 0.6 }); } catch {} }));
        }
        this.advanceBeat();
      }
    }

    // R8: chase pursuer AI — runs independently of the boss combat system.
    if (this.chaseActive && !this.dialogueOpen && this.chaseSprite) {
      this.handleChaseAI();
    }

    // Combat only exists inside a bossFight beat — and pauses while a QTE modal is up.
    if (this.isBossActive && !this.qteActive && this.spawnedBoss) {
      const nearest = this.findNearestEnemy();
      if (nearest) this.fireWeapon(time, nearest.x, nearest.y);
    }
  }

  // ─── Story Beat Engine ─────────────────────────────────────────────────────────

  public startBeat(index: number) {
    this.beatEngine.startBeat(index);
  }

  public advanceBeat() {
    this.beatEngine.advanceBeat();
  }

  public gotoBeatId(id: string) {
    this.beatEngine.gotoBeatId(id);
  }

  public freeze() {
    this.beatEngine.freeze();
  }

  public unfreeze() {
    this.beatEngine.unfreeze();
  }

  public clearWalkTarget() {
    this.beatEngine.clearWalkTarget();
  }



  // ─── R8: Chase phase ──────────────────────────────────────────────────────────

  public runChaseBeat(beat: Extract<Beat, { type: 'chase' }>) {
    const config = BOSSES.find(b => b.id === beat.pursuerId) ?? BOSSES[0];
    const cam = this.cameras.main;
    this.chasePursuerId = config.id.replace('boss_', '');

    // Brief cinematic flash + "RUN!!" label
    this.freeze();
    cam.flash(180, 239, 68, 68);
    cam.shake(280, 0.022);

    const cx = cam.width / 2, cy = cam.height / 2;
    const runLabel = this.label(cx, cy - 40, 'RUN!!', {
      fontSize: '44px', color: '#ef4444', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 10,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(12000).setAlpha(0).setScale(0.4);

    // R1: swap watchwater house to "door opened" texture when RUN flashes
    if (this.chapter.chaseTextureSwaps) {
      this.chapter.chaseTextureSwaps.forEach(swap => {
        const sprite = this.propSprites.get(swap.propKey);
        if (sprite) {
          if (this.textures.exists(swap.targetTexture)) {
            sprite.setTexture(swap.targetTexture);
          } else if (swap.fallbackTexture && this.textures.exists(swap.fallbackTexture)) {
            sprite.setTexture(swap.fallbackTexture);
          }
        }
      });
    }

    this.tweens.add({
      targets: runLabel, alpha: 1, scale: 1, duration: 220, ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(700, () => {
          this.tweens.add({ targets: runLabel, alpha: 0, y: '-=24', duration: 280,
            onComplete: () => runLabel.destroy() });
        });
      },
    });

    // Resolve texture — same logic as summonBossMatch
    const bossId = config.id.replace('boss_', '');
    const sheetKey = `boss_${bossId}_sheet`;
    const rawKey = config.id;
    let bossTex: string, bossScale: number;
    if (this.textures.exists(sheetKey))      { bossTex = sheetKey;  bossScale = 0.85; }
    else if (this.textures.exists(rawKey))   { bossTex = rawKey;    bossScale = 0.55; }
    else                                     { bossTex = 'enemy_grunter'; bossScale = 1.6; }

    // Spawn pursuer at the house door
    this.chaseSprite = this.physics.add.sprite(440, 310, bossTex, 0);
    if (this.textures.exists(sheetKey)) this.chaseSprite.play(`idle_boss_${bossId}`, true);
    this.chaseSprite.setScale(bossScale).setCollideWorldBounds(true).setDrag(200, 200);

    this.chaseShadow = this.add.image(440, 338, 'shadow_ellipse')
      .setAlpha(0.4).setScale(1.1);

    this.showBubbleText(this.chaseSprite, '"HEY!!!"', '#ef4444');

    // Catch = instant fight
    this.physics.add.overlap(this.player, this.chaseSprite, () => {
      if (!this.chaseActive) return;
      cam.shake(120, 0.014);
      cam.flash(80, 239, 68, 68);
      this.endChase();
    });

    this.chaseActive = true;
    // Give player a beat to orient before unfreeze
    this.time.delayedCall(850, () => this.unfreeze());

    // End chase after durationMs — feeds straight into the bossFight beat
    this.chaseTimer = this.time.delayedCall(beat.durationMs, () => this.endChase());
  }

  private handleChaseAI() {
    if (!this.chaseSprite) return;
    const angle = Phaser.Math.Angle.Between(
      this.chaseSprite.x, this.chaseSprite.y, this.player.x, this.player.y
    );
    const speed = 235; // faster than any hero (max player speed is 250; stays threatening)
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    this.chaseSprite.setVelocity(vx, vy);
    this.chaseSprite.setDepth(this.chaseSprite.y);

    const facesLeftByDefault = this.chasePursuerId === 'nick_f';
    this.applyDirectionalAnim(this.chaseSprite, `boss_${this.chasePursuerId}`, vx, vy, facesLeftByDefault);

    if (this.chaseShadow) {
      this.chaseShadow.setPosition(this.chaseSprite.x, this.chaseSprite.y + 28);
      this.chaseShadow.setDepth(this.chaseSprite.y - 1);
    }
  }

  private endChase() {
    if (!this.chaseActive) return;
    this.chaseActive = false;
    if (this.chaseTimer) {
      this.chaseTimer.remove();
      this.chaseTimer = null;
    }
    if (this.chaseSprite) { this.chaseSprite.destroy(); this.chaseSprite = null; }
    if (this.chaseShadow) { this.chaseShadow.destroy(); this.chaseShadow = null; }
    this.advanceBeat();
  }

  // ─── Audio helpers ────────────────────────────────────────────────────────────

  public startStageMusic() {
    this.audioController.startStageMusic();
  }

  public startBossMusic() {
    this.audioController.startBossMusic();
  }

  public startBossLoop(fadeDuration: number = 600) {
    this.audioController.startBossLoop(fadeDuration);
  }

  public stopBossMusic() {
    this.audioController.stopBossMusic();
  }

  public applyLedger(delta: number, note: string) {
    this.ledgerTotal += delta;
    this.onLedgerChange(this.ledgerTotal, note);
    this.showPassiveIconText(this.player.x, this.player.y - 40, `+$${delta.toFixed(2)} — ${note}`, '#fbbf24');
  }

  public runEndChapter() {
    this.player.play('victory_' + this.playerClass.id, true);
    this.cameras.main.flash(400, 200, 232, 154);
    // Fade out stage music and play victory jingle
    if (this.stageMusic?.isPlaying) {
      this.tweens.add({ targets: this.stageMusic, volume: 0, duration: 800 });
    }
    try { this.sound.play('victory_jingle', { volume: 0.6 }); } catch { /* skip */ }
    this.time.delayedCall(1200, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.time.delayedCall(520, () => this.onLevelCompleted());
    });
  }

  // ─── Actor placement ──────────────────────────────────────────────────────────

  public placeActors() {
    this.actorsSystem.placeActors();
  }

  public hideActor(id: string) {
    this.actorsSystem.hideActor(id);
  }

  private updateEnemyAI(time: number) {
    this.enemies.getChildren().forEach((obj: any) => {
      if (!obj.active) return;
      const config: EnemyConfig = obj.getData('config');
      if (!config) return;

      const dist = Phaser.Math.Distance.Between(obj.x, obj.y, this.player.x, this.player.y);
      const angle = Phaser.Math.Angle.Between(obj.x, obj.y, this.player.x, this.player.y);
      const spd: number = obj.getData('speed') ?? config.speed;

      switch (config.aiType) {
        case 'shooter':
          this.aiShooter(obj, dist, angle, spd, time);
          break;
        case 'charger':
          this.aiCharger(obj, dist, angle, spd, time);
          break;
        case 'grunter':
          this.aiGrunter(obj, dist, angle, spd, time);
          break;
        case 'heavy':
          this.aiHeavy(obj, dist, angle, spd, time);
          break;
        default:
          // Simple chase fallback
          obj.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);
      }

      // Occasional random bark
      if (Math.random() < 0.001) {
        const barks: string[] = config.barks ?? [];
        if (barks.length > 0) {
          this.showBubbleText(obj, barks[Math.floor(Math.random() * barks.length)], '#fca5a5');
        }
      }
    });
  }

  // Ticketmaster: hold at range, fires ticket bolt every 2.5s
  private aiShooter(enemy: any, dist: number, angle: number, spd: number, time: number) {
    const PREFERRED_RANGE = 300;
    const FLEE_RANGE = 150;

    if (dist > PREFERRED_RANGE) {
      enemy.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);
    } else if (dist < FLEE_RANGE) {
      enemy.setVelocity(-Math.cos(angle) * spd * 0.8, -Math.sin(angle) * spd * 0.8);
    } else {
      enemy.setVelocity(0, 0);
    }

    const lastShot: number = enemy.getData('lastShootTime') ?? 0;
    if (time - lastShot > 2500 && dist < PREFERRED_RANGE + 80) {
      enemy.setData('lastShootTime', time);
      this.fireEnemyTicket(enemy, angle);
    }
  }

  private fireEnemyTicket(enemy: any, angle: number) {
    for (let i = -1; i <= 1; i++) {
      const spread = angle + (i * 0.18);
      const bolt = this.physics.add.sprite(enemy.x, enemy.y, 'ticket_bolt');
      bolt.setVelocity(Math.cos(spread) * 280, Math.sin(spread) * 280);
      bolt.setDepth(5);
      this.enemyProjectiles.add(bolt);
      this.time.delayedCall(2500, () => { if (bolt.active) bolt.destroy(); });
    }
    if (Math.random() < 0.3) {
      this.showBubbleText(enemy, 'Service fee: BULLETS.', '#93c5fd');
    }
  }

  // Galaxy Gas Zombie: slow approach, then burst charge at 400px
  private aiCharger(enemy: any, dist: number, angle: number, spd: number, time: number) {
    const isCharging: boolean = enemy.getData('isCharging') ?? false;
    const lastCharge: number = enemy.getData('lastChargeTime') ?? 0;

    if (isCharging) {
      // Charge is handled by the velocity set when charge started; just let it coast
      if (time - lastCharge > 800) {
        enemy.setData('isCharging', false);
      }
      return;
    }

    if (dist < 400 && time - lastCharge > 3000) {
      // Initiate charge
      enemy.setData('isCharging', true);
      enemy.setData('lastChargeTime', time);
      enemy.setVelocity(Math.cos(angle) * spd * 2.5, Math.sin(angle) * spd * 2.5);
      this.showBubbleText(enemy, '*HISS* B12 INCOMING!', '#a78bfa');
      this.cameras.main.shake(80, 0.006);
    } else {
      // Normal slow approach
      enemy.setVelocity(Math.cos(angle) * spd * 0.7, Math.sin(angle) * spd * 0.7);
    }
  }

  // Dish stack: normal approach + fork throw when in range
  private aiGrunter(enemy: any, dist: number, angle: number, spd: number, time: number) {
    enemy.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);

    const lastFork: number = enemy.getData('lastForkTime') ?? 0;
    if (dist < 260 && time - lastFork > 3000) {
      enemy.setData('lastForkTime', time);
      this.throwFork(enemy, angle);
    }
  }

  private throwFork(enemy: any, angle: number) {
    const fork = this.physics.add.sprite(enemy.x, enemy.y, 'fork_proj');
    fork.setVelocity(Math.cos(angle) * 220, Math.sin(angle) * 220);
    fork.setRotation(angle);
    fork.setDepth(5);
    this.enemyProjectiles.add(fork);
    this.time.delayedCall(2000, () => { if (fork.active) fork.destroy(); });
    if (Math.random() < 0.4) {
      this.showBubbleText(enemy, 'RINSE THE DISHES!!!', '#fef3c7');
    }
  }

  // Frat Bro: slow melee, AoE shout at close range
  private aiHeavy(enemy: any, dist: number, angle: number, spd: number, time: number) {
    enemy.setVelocity(Math.cos(angle) * spd * 0.65, Math.sin(angle) * spd * 0.65);

    const lastShout: number = enemy.getData('lastShoutTime') ?? 0;
    if (dist < 110 && time - lastShout > 5000) {
      enemy.setData('lastShoutTime', time);
      this.fraternityShout(enemy);
    }
  }

  private fraternityShout(enemy: any) {
    this.showBubbleText(enemy, 'BRO!! UMBC RULES BRO!!', '#fef08a');
    this.cameras.main.shake(200, 0.01);
    // Radial shockwave visual
    const ring = this.add.circle(enemy.x, enemy.y, 10, 0xd97706, 0.5).setDepth(6);
    this.tweens.add({
      targets: ring,
      scaleX: 10, scaleY: 10, alpha: 0,
      duration: 600,
      onComplete: () => ring.destroy()
    });
    const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
    if (dist < 130) {
      const pushAngle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      this.player.setVelocity(Math.cos(pushAngle) * 500, Math.sin(pushAngle) * 500);
      this.damagePlayer(8, 'Frat Bro Shout AoE');
    }
  }

  // ─── Dash ─────────────────────────────────────────────────────────────────

  private executeDash(vx: number, vy: number) {
    if (this.dashCooldown || this.isDashing) return;

    if (this.playerClass.id === 'nick_f' && Math.random() < 0.05) {
      this.onMessageLog('⚠️ Keys locked in the C55 AMG — dash failed!');
      this.dashCooldown = true;
      this.showBubbleText(this.player, 'KEYS LOCKED IN C55 AMG 💀', '#ef4444');
      this.time.delayedCall(4000, () => { this.dashCooldown = false; });
      return;
    }

    this.isDashing = true;
    this.dashCooldown = true;

    const dashFactor = this.playerClass.id === 'nick_f' ? 3.0 : 2.2;
    const dashX = vx === 0 && vy === 0 ? this.playerClass.speed * dashFactor : vx * dashFactor;
    const dashY = vx === 0 && vy === 0 ? 0 : vy * dashFactor;

    this.player.setVelocity(dashX, dashY);

    try {
      const shieldFlash = this.add.sprite(this.player.x, this.player.y, 'plasma_shield');
      shieldFlash.setOrigin(0.5).setScale(0.12).setDepth(15).setAlpha(0.7);
      this.tweens.add({
        targets: shieldFlash,
        scale: 0.55, alpha: 0,
        x: this.player.x + dashX * 0.12,
        y: this.player.y + dashY * 0.12,
        duration: 350,
        onComplete: () => shieldFlash.destroy()
      });
    } catch {}

    for (let i = 0; i < 4; i++) {
      this.time.delayedCall(i * 60, () => {
        const ghost = this.add.sprite(this.player.x, this.player.y, this.player.texture.key, this.player.frame.name);
        ghost.setScale(this.player.scaleX).setAlpha(0.6 - i * 0.15).setRotation(this.player.rotation);
        this.tweens.add({ targets: ghost, alpha: 0, scale: 0.8, duration: 300, onComplete: () => ghost.destroy() });
      });
    }

    this.time.delayedCall(220, () => { this.isDashing = false; });
    this.time.delayedCall(this.playerClass.id === 'nick_f' ? 900 : 1500, () => { this.dashCooldown = false; });
  }

  // ─── Weapons ──────────────────────────────────────────────────────────────

  private findNearestEnemy(): { x: number; y: number } | null {
    let nearest: { x: number; y: number } | null = null;
    let nearestDist = Infinity;
    const candidates: any[] = this.isBossActive && this.spawnedBoss
      ? [this.spawnedBoss]
      : (this.enemies.getChildren() as any[]);
    candidates.forEach(obj => {
      if (!obj.active) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, obj.x, obj.y);
      if (d < nearestDist) { nearestDist = d; nearest = { x: obj.x, y: obj.y }; }
    });
    return nearestDist < 700 ? nearest : null;
  }

  private fireWeapon(time: number, targetX?: number, targetY?: number) {
    const weapon = WEAPONS[this.currentLevelIndex % WEAPONS.length];
    if (time < this.lastFired + weapon.cooldown) return;
    this.lastFired = time;

    this.isAttackingAnim = true;
    this.player.play('attack_' + this.playerClass.id, true);
    this.time.delayedCall(220, () => { this.isAttackingAnim = false; });

    const useCoinSheet = this.textures.exists('coin_sheet');
    const texKey = useCoinSheet ? 'coin_sheet' : 'bullet';
    const frame = useCoinSheet ? 0 : undefined;
    const projectile = this.projectiles.create(this.player.x, this.player.y, texKey, frame);
    if (!projectile) return;

    projectile.setScale(useCoinSheet ? 0.22 : 0.35).setTint(0xfbbf24).setActive(true).setVisible(true);
    const body = projectile.body as Phaser.Physics.Arcade.Body;
    if (body) { body.setGravity(0, 0); body.setAllowGravity(false); }

    const targetAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, targetX ?? this.player.x + Math.cos(this.lastMoveAngle), targetY ?? this.player.y + Math.sin(this.lastMoveAngle));
    // Face player toward firing direction (no free rotation — just flip horizontally)
    this.player.setFlipX(Math.cos(targetAngle) < 0);

    projectile.setVelocity(Math.cos(targetAngle) * 650, Math.sin(targetAngle) * 650);
    projectile.setRotation(targetAngle + Math.PI / 2);

    if (Math.random() < 0.12) {
      this.showBubbleText(this.player, weapon.unleashedQuote, '#facc15');
    }

    this.time.delayedCall(2000, () => { if (projectile?.active) projectile.destroy(); });
  }

  // ─── Enemy Spawning ───────────────────────────────────────────────────────

  private spawnLevelEnemy() {
    if (this.isBossActive || !this.levelStarted) return;

    if (this.enemiesLeftToSpawn <= 0) {
      return;
    }

    this.enemiesLeftToSpawn--;
    const config = ENEMIES[Math.floor(Math.random() * ENEMIES.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist = 350 + Math.random() * 200;
    const sx = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * dist, 50, 950);
    const sy = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * dist, 50, 950);

    const texKey = this.textures.exists(`enemy_${config.id}_sheet`) ? `enemy_${config.id}_sheet` : `enemy_${config.id}`;
    const enemy = this.physics.add.sprite(sx, sy, texKey);
    enemy.setDrag(150, 150);
    // Scale up enemies so they're clearly visible against the map
    enemy.setScale(1.8);
    // Apply distinctive color tint so each enemy type is easy to ID at a glance
    enemy.setTint(parseInt(config.color));
    enemy.setData('id', config.id);
    enemy.setData('name', config.name);
    enemy.setData('hp', config.hp);
    enemy.setData('maxHp', config.hp);
    enemy.setData('attack', config.attack);
    enemy.setData('speed', config.speed);
    enemy.setData('config', config);
    this.enemies.add(enemy);

    // Play idle anim if sheet loaded
    if (this.textures.exists(`enemy_${config.id}_sheet`)) {
      if (this.anims.exists(`idle_${config.id}`)) enemy.play(`idle_${config.id}`);
    }

    if (Math.random() < 0.3) {
      const bark = config.barks[Math.floor(Math.random() * config.barks.length)];
      this.showBubbleText(enemy, bark, '#fca5a5');
    }
  }



  public setControlsInverted(on: boolean) {
    if (on === this.controlsInverted) return;          // idempotent
    const { W, S, A, D } = this.wasdKeys;
    this.wasdKeys.W = S; this.wasdKeys.S = W;
    this.wasdKeys.A = D; this.wasdKeys.D = A;           // swap is its own inverse
    this.controlsInverted = on;
  }



  // ─── Damage & Status Effects ───────────────────────────────────────────────

  public damagePlayer(damage: number, source: string) {
    // In-flight delayed attacks (e.g. Kidney Punch) must not land mid-QTE.
    if (this.qteActive) return;
    try {
      const isFx = this.textures.exists('shield_fx');
      const shieldTex = isFx ? 'shield_fx'
                      : this.textures.exists('shield_raw') ? 'shield_raw'
                      : 'plasma_shield';

      const fx = this.add.sprite(this.player.x, this.player.y, shieldTex, isFx ? 0 : undefined);

      const startScale = isFx ? 0.45 : 0.1;
      const endScale = isFx ? 1.0 : 0.55;

      fx.setOrigin(0.5).setScale(startScale).setDepth(20).setAlpha(0.95);
      this.tweens.add({ targets: fx, scale: endScale, alpha: 0, duration: 380, onComplete: () => fx.destroy() });
    } catch {}

    let finalDmg = damage;
    if (this.playerClass.id === 'jacob') {
      if (this.subZeroActive) {
        finalDmg = Math.floor(damage * 0.5); // Sub-Zero: immune to pain
      } else {
        finalDmg = Math.floor(damage * 2.5); // Loss Aversion penalty
      }
    } else if (this.playerClass.id === 'nick_h') {
      finalDmg = Math.floor(damage * 0.4);
    }

    // Brainrot from Galaxy Gas Zombie source
    if (source.toLowerCase().includes('zombie') || source.toLowerCase().includes('b12') || source.toLowerCase().includes('galaxy')) {
      this.brainrotLevel = Math.min(100, this.brainrotLevel + 20);
      this.updateBrainrotHUD();
      if (this.brainrotLevel >= 100) {
        this.onMessageLog('🧠 SKIBIDI PROTOCOL: Brainrot maxed! BIQ collapsing!');
        this.cameras.main.flash(300, 167, 139, 250);
        this.showPassiveIconText(this.player.x, this.player.y - 40, 'SKIBIDI PROTOCOL 🧠', '#a78bfa');
      }
    }

    this.activeHp -= finalDmg;
    this.onHpChange(Math.max(0, this.activeHp));

    // Sub-Zero awakening for Jacob
    if (this.playerClass.id === 'jacob' && !this.subZeroActivatedOnce) {
      const hpThreshold = this.playerClass.maxHp * 0.3;
      if (this.activeHp <= hpThreshold && this.activeHp > 0) {
        this.activateSubZero();
      }
    }

    if (this.activeHp > 0) {
      this.isAttackingAnim = false;
      this.player.play('hurt_' + this.playerClass.id, true);
    } else {
      this.player.play('defeat_' + this.playerClass.id, true);
    }

    if (finalDmg > 12) {
      this.cameras.main.shake(150, 0.012);
      this.cameras.main.flash(80, 239, 68, 68, true);
    }

    this.showDamageNumber(this.player.x + Phaser.Math.Between(-18, 18), this.player.y - 30, finalDmg, '#ef4444');
    this.onMessageLog(`💔 ${this.playerClass.name} hit by ${source} (-${finalDmg} HP).`);

    if (this.activeHp <= 0) {
      this.onMessageLog('💀 SOCIAL COLLAPSE: The Rockville Core abandoned you to go to sleep!');
      this.physics.pause();
      this.setControlsInverted(false);
      this.onGameOver();
    }
  }

  private activateSubZero() {
    this.subZeroActive = true;
    this.subZeroActivatedOnce = true;
    this.player.setTint(0x38bdf8);
    this.cameras.main.flash(500, 56, 189, 248);
    this.cameras.main.shake(600, 0.025);
    this.onMessageLog('🥷 SUB-ZERO AWAKENED! Jacob enters Mortal Kombat mode. Damage: +50%, Pain: OFF.');
    this.showBubbleText(this.player, "I'M FUCKING SUBZERO!!!", '#38bdf8');
    this.showPassiveIconText(this.player.x, this.player.y - 50, 'SUB-ZERO ACTIVATED 🥷', '#38bdf8');
    // Ice particles burst
    for (let i = 0; i < 8; i++) {
      const ang = (Math.PI / 4) * i;
      const shard = this.add.rectangle(this.player.x, this.player.y, 8, 3, 0x38bdf8);
      this.physics.add.existing(shard);
      (shard.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(ang) * 200, Math.sin(ang) * 200);
      this.time.delayedCall(600, () => shard.destroy());
    }
  }

  // ─── Combat Callbacks ─────────────────────────────────────────────────────

  private handleProjectileHitEnemy(proj: any, enemy: any) {
    proj.destroy();
    const atkBonus = (this.playerClass.id === 'jacob' && this.subZeroActive) ? 1.5 : 1.0;
    const currHp = (enemy.getData('hp') as number) - Math.floor(this.playerClass.attack * atkBonus);
    enemy.setData('hp', currHp);
    const lastFlash = this.enemyFlashCooldowns.get(enemy) ?? 0;
    if (this.time.now - lastFlash > 120) {
      this.enemyFlashCooldowns.set(enemy, this.time.now);
      enemy.setTint(0xffffff);
      this.time.delayedCall(100, () => {
        if (enemy.active) enemy.setTint(parseInt((enemy.getData('config') as EnemyConfig).color));
      });
    }

    if (currHp <= 0) {
      const config: EnemyConfig = enemy.getData('config');
      this.onMessageLog(`💥 ${enemy.getData('name')} eliminated! ${config.deathQuote}`);
      const shardTex = this.textures.exists('shard_sheet') ? 'shard_sheet' : 'loot_shard';
      const shardFrame = this.textures.exists('shard_sheet') ? 0 : undefined;
      const shard = this.physics.add.sprite(enemy.x, enemy.y, shardTex, shardFrame);
      shard.setScale(this.textures.exists('shard_sheet') ? 0.18 : 1).setTint(0x34d399);
      this.lootShards.add(shard);
      enemy.destroy();
      this.enemiesKilledCount++;
    } else if (Math.random() < 0.15) {
      const config: EnemyConfig = enemy.getData('config');
      const bark = config.barks[Math.floor(Math.random() * config.barks.length)];
      this.showBubbleText(enemy, bark, '#fca5a5');
    }
  }

  private handleEnemyMeleeHit(_player: any, enemy: any) {
    const now = this.time.now;
    const lastHit = this.enemyHitCooldowns.get(enemy) ?? 0;
    if (now - lastHit < 600) return;
    this.enemyHitCooldowns.set(enemy, now);

    const config: EnemyConfig = enemy.getData('config');
    const attackDmg = enemy.getData('attack') as number;
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
    this.player.setVelocity(Math.cos(angle) * 300, Math.sin(angle) * 300);
    this.damagePlayer(attackDmg, config?.name ?? 'Enemy');
    enemy.setVelocity(0, 0);
  }

  private handleProjectileHitPlayer(_player: any, proj: any) {
    proj.destroy();
    this.damagePlayer(12, 'Boss Projectile');
  }

  private handleCollectLoot(_player: any, shard: any) {
    shard.destroy();
    const gold = Phaser.Math.Between(15, 35);
    this.activeGold += gold;
    this.onGoldChange(this.activeGold);
    this.showPassiveIconText(this.player.x, this.player.y - 30, `+$${gold} Gold!`, '#10b981');

    if (Math.random() < 0.25) {
      const barks = LORE_BARKS;
      this.onMessageLog(`🔓 "${barks[Math.floor(Math.random() * barks.length)]}"`);
    }
  }

  // ─── UI Helpers ───────────────────────────────────────────────────────────

  public showBubbleText(anchor: Phaser.GameObjects.GameObject, text: string, colorHex = '#ffffff') {
    const sprite = anchor as Phaser.Physics.Arcade.Sprite;
    if (!sprite?.x || !sprite?.y) return;
    const container = this.add.container(sprite.x, sprite.y - 45).setDepth(2000);
    const label = this.label(0, 0, text, {
      fontSize: '12px', color: colorHex,
      backgroundColor: '#0b1208e6', padding: { x: 9, y: 5 },
      stroke: '#000000', strokeThickness: 2,
      align: 'center', wordWrap: { width: 220 }
    }).setOrigin(0.5);
    container.add(label);
    this.tweens.add({ targets: container, y: container.y - 40, alpha: 0, duration: 1900, onComplete: () => container.destroy() });
  }

  public showPassiveIconText(x: number, y: number, text: string, color: string) {
    const label = this.label(x, y, text, {
      fontSize: '13px', color,
      stroke: '#000000', strokeThickness: 4, fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(2000);
    this.tweens.add({ targets: label, y: y - 50, alpha: 0, duration: 1300, onComplete: () => label.destroy() });
  }

  // ─── Phase D: Cinematic helpers ───────────────────────────────────────────

  /** Tween black bars in from top and bottom — "cutscene" signal. */
  public showLetterbox(durationMs = 350) {
    const cam = this.cameras.main;
    const barH = Math.round(cam.height * 0.10);
    if (!this.letterboxTop) {
      this.letterboxTop = this.add.rectangle(cam.width / 2, 0, cam.width * 4, barH * 2, 0x000000)
        .setScrollFactor(0).setDepth(9500).setOrigin(0.5, 1).setAlpha(0);
    }
    if (!this.letterboxBottom) {
      this.letterboxBottom = this.add.rectangle(cam.width / 2, cam.height, cam.width * 4, barH * 2, 0x000000)
        .setScrollFactor(0).setDepth(9500).setOrigin(0.5, 0).setAlpha(0);
    }
    this.tweens.add({ targets: this.letterboxTop, alpha: 1, y: barH, duration: durationMs, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: this.letterboxBottom, alpha: 1, y: cam.height - barH, duration: durationMs, ease: 'Sine.easeOut' });
  }

  public hideLetterbox(durationMs = 350) {
    if (!this.letterboxTop && !this.letterboxBottom) return;
    const cam = this.cameras.main;
    this.tweens.add({
      targets: [this.letterboxTop, this.letterboxBottom], alpha: 0, duration: durationMs, ease: 'Sine.easeIn',
      onComplete: () => {
        this.letterboxTop?.destroy(); this.letterboxTop = null;
        this.letterboxBottom?.destroy(); this.letterboxBottom = null;
        void cam;
      }
    });
  }

  /** Floating damage number rising from a world position. */
  public showDamageNumber(x: number, y: number, amount: number, color: string) {
    const isBig = amount >= 25;
    const txt = this.label(x, y, `-${amount}`, {
      fontSize: isBig ? '16px' : '13px',
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: isBig ? 5 : 3,
    }).setOrigin(0.5).setDepth(3000);
    if (isBig) txt.setScale(1.4);
    this.tweens.add({
      targets: txt,
      y: y - 55,
      alpha: 0,
      scale: isBig ? 1.0 : 1,
      duration: 900,
      ease: 'Sine.easeOut',
      onComplete: () => txt.destroy(),
    });
  }

  /** Extract frame-0 portrait data URLs from processed sprite sheets (sync canvas read). */
  private extractPortraits() {
    const ids = [
      this.playerClass.id,
      ...this.chapter.actors.map(a => a.id),
    ];
    for (const id of ids) {
      if (this.portraitDataUrls[id]) continue;
      const sheetKey = `hero_${id}_sheet`;
      const bossKey = `boss_${id}_sheet`;
      const texKey = this.textures.exists(sheetKey) ? sheetKey
        : this.textures.exists(bossKey) ? bossKey
        : null;
      if (!texKey) continue;
      try {
        const frame = this.textures.get(texKey).get(0);
        const src = frame.source.image as HTMLCanvasElement | HTMLImageElement;
        const pc = document.createElement('canvas');
        pc.width = 64; pc.height = 64;
        const pctx = pc.getContext('2d')!;
        pctx.imageSmoothingEnabled = false;
        pctx.drawImage(
          src as CanvasImageSource,
          frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight,
          0, 0, 64, 64
        );
        this.portraitDataUrls[id] = pc.toDataURL('image/png');
      } catch { /* sheet may not be sliced yet; emoji fallback used */ }
    }
  }

  // ─── Phase C: Atmosphere ──────────────────────────────────────────────────

  private buildAtmosphere(map: MapConfig) {
    const theme = map.theme ?? 'apartment';
    const cam = this.cameras.main;
    const w = cam.width;
    const h = cam.height;

    // Per-theme ambient overlay: [color, alpha]
    const overlayConfigs: Record<string, [number, number]> = {
      apartment:     [0x3d1200, 0.10],
      highway_night: [0x020c28, 0.55],
      hospital:      [0xe8ffff, 0.05],
      park:          [0xffcc60, 0.07],
      florida:       [0xff5000, 0.15],
      suburb_night:  [0x010408, 0.42],
      cabin:         [0x5a1e00, 0.12],
    };

    // Per-theme vignette alpha
    const vignetteAlphas: Record<string, number> = {
      apartment:     0.35,
      highway_night: 0.60,
      hospital:      0.22,
      park:          0.22,
      florida:       0.32,
      suburb_night:  0.62,
      cabin:         0.45,
    };

    const [overlayColor, overlayAlpha] = overlayConfigs[theme] ?? [0x000000, 0];
    const vigAlpha = vignetteAlphas[theme] ?? 0.30;

    // Full-viewport color-grade overlay — depth 800 (above Y-sorted chars ~700)
    this.ambientOverlay = this.add.rectangle(w / 2, h / 2, w, h, overlayColor, overlayAlpha)
      .setScrollFactor(0)
      .setDepth(800);

    // Vignette — screen-space stretched to viewport
    if (vigAlpha > 0 && this.textures.exists('vignette')) {
      this.vignetteOverlay = this.add.image(w / 2, h / 2, 'vignette')
        .setDisplaySize(w, h)
        .setAlpha(vigAlpha)
        .setScrollFactor(0)
        .setDepth(6000);
    }

    this.buildFakeLights(theme, map.width, map.height);
    this.startAmbientParticles(theme, map.width, map.height);
  }

  private buildFakeLights(theme: string, mapW: number, mapH: number) {
    if (!this.textures.exists('light_glow')) return;

    type LightDef = { x: number; y: number; scale: number; tint: number; alpha: number };

    const lightsByTheme: Partial<Record<string, LightDef[]>> = {
      apartment: [
        { x: mapW * 0.25, y: mapH * 0.30, scale: 3.0, tint: 0xffdd88, alpha: 0.18 },
        { x: mapW * 0.70, y: mapH * 0.25, scale: 2.2, tint: 0x88ccff, alpha: 0.22 }, // TV glow
      ],
      highway_night: [
        { x: mapW * 0.20, y: mapH * 0.50, scale: 4.5, tint: 0xff9900, alpha: 0.30 }, // toll booth
        { x: mapW * 0.80, y: mapH * 0.50, scale: 3.5, tint: 0xffffff, alpha: 0.20 }, // headlight
      ],
      hospital: [
        { x: mapW * 0.50, y: mapH * 0.30, scale: 5.0, tint: 0xeeffff, alpha: 0.12 }, // overhead
        { x: mapW * 0.80, y: mapH * 0.20, scale: 2.5, tint: 0xffeecc, alpha: 0.15 }, // window beam
      ],
      park: [
        { x: mapW * 0.50, y: mapH * 0.50, scale: 6.0, tint: 0xffcc44, alpha: 0.10 }, // golden-hour fill
      ],
      florida: [
        { x: mapW * 0.10, y: mapH * 0.50, scale: 4.0, tint: 0xff4400, alpha: 0.22 }, // sunset
        { x: mapW * 0.90, y: mapH * 0.50, scale: 3.0, tint: 0xff8800, alpha: 0.18 },
      ],
      suburb_night: [
        { x: mapW * 0.35, y: mapH * 0.20, scale: 2.5, tint: 0xffeeaa, alpha: 0.35 }, // porch light
        { x: mapW * 0.60, y: mapH * 0.15, scale: 2.0, tint: 0xaaccff, alpha: 0.20 }, // window glow
      ],
      cabin: [
        { x: mapW * 0.50, y: mapH * 0.55, scale: 3.5, tint: 0xff6600, alpha: 0.28 }, // firepit
        { x: mapW * 0.75, y: mapH * 0.65, scale: 2.5, tint: 0x00ffee, alpha: 0.15 }, // hot tub
        { x: mapW * 0.20, y: mapH * 0.25, scale: 2.0, tint: 0xffdd88, alpha: 0.18 }, // lamp
      ],
    };

    const defs = lightsByTheme[theme] ?? [];
    for (const def of defs) {
      const img = this.add.image(def.x, def.y, 'light_glow')
        .setScale(def.scale)
        .setTint(def.tint)
        .setAlpha(def.alpha)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(850);
      this.fakeLights.push(img);
    }
  }

  private startAmbientParticles(theme: string, mapW: number, mapH: number) {
    if (!this.textures.exists('particle_dot')) return;

    type EmitterConfig = {
      x: number; y: number; quantity: number;
      speedX?: [number, number]; speedY?: [number, number];
      lifespan: number; scale: { start: number; end: number };
      alpha: { start: number; end: number };
      tint: number; frequency: number;
      bounce?: boolean;
    };

    const makeEmitter = (cfg: EmitterConfig) => {
      const em = this.add.particles(cfg.x, cfg.y, 'particle_dot', {
        x: { min: 0, max: cfg.x > mapW * 0.1 ? mapW * 0.8 : 0 },
        speedX: cfg.speedX ? { min: cfg.speedX[0], max: cfg.speedX[1] } : { min: -8, max: 8 },
        speedY: cfg.speedY ? { min: cfg.speedY[0], max: cfg.speedY[1] } : { min: -20, max: -5 },
        lifespan: cfg.lifespan,
        scale: { start: cfg.scale.start, end: cfg.scale.end },
        alpha: { start: cfg.alpha.start, end: cfg.alpha.end },
        tint: cfg.tint,
        quantity: cfg.quantity,
        frequency: cfg.frequency,
        blendMode: Phaser.BlendModes.ADD,
      });
      em.setDepth(860);
      this.particleEmitters.push(em);
    };

    if (theme === 'apartment' || theme === 'cabin') {
      // Slow dust motes drifting through interior light
      makeEmitter({
        x: mapW * 0.5, y: mapH * 0.5,
        quantity: 1, frequency: 350,
        speedX: [-12, 12], speedY: [-15, -3],
        lifespan: 4500,
        scale: { start: 0.5, end: 0.1 },
        alpha: { start: 0.35, end: 0 },
        tint: 0xffffcc,
      });
    }

    if (theme === 'cabin') {
      // Fireflies drifting upward
      makeEmitter({
        x: mapW * 0.5, y: mapH * 0.5,
        quantity: 1, frequency: 600,
        speedX: [-25, 25], speedY: [-30, -8],
        lifespan: 3500,
        scale: { start: 0.7, end: 0.0 },
        alpha: { start: 0.9, end: 0 },
        tint: 0x88ff44,
      });
      // Fire ember sparks rising from firepit center
      makeEmitter({
        x: mapW * 0.50, y: mapH * 0.58,
        quantity: 1, frequency: 180,
        speedX: [-18, 18], speedY: [-55, -25],
        lifespan: 1200,
        scale: { start: 0.6, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: 0xff5500,
      });
    }

    if (theme === 'park') {
      // Fireflies at dusk
      makeEmitter({
        x: mapW * 0.5, y: mapH * 0.5,
        quantity: 1, frequency: 700,
        speedX: [-20, 20], speedY: [-18, -5],
        lifespan: 4000,
        scale: { start: 0.8, end: 0 },
        alpha: { start: 0.85, end: 0 },
        tint: 0xaaff66,
      });
    }

    if (theme === 'highway_night' || theme === 'suburb_night') {
      // Drifting dust / light streaks
      makeEmitter({
        x: mapW * 0.5, y: mapH * 0.5,
        quantity: 1, frequency: 900,
        speedX: [-5, 5], speedY: [-8, 8],
        lifespan: 5000,
        scale: { start: 0.3, end: 0 },
        alpha: { start: 0.25, end: 0 },
        tint: 0xaaccff,
      });
    }

    if (theme === 'florida') {
      // Heat shimmer particles drifting up from road
      makeEmitter({
        x: mapW * 0.5, y: mapH * 0.7,
        quantity: 1, frequency: 400,
        speedX: [-10, 10], speedY: [-35, -15],
        lifespan: 2000,
        scale: { start: 0.4, end: 0 },
        alpha: { start: 0.45, end: 0 },
        tint: 0xff8833,
      });
    }
  }

  /** BotW-style area title toast — bottom-left, fades in then out. Screen-space. */
  public showAreaTitle(title: string) {
    const cam = this.cameras.main;
    const sy = cam.height - 56;

    const accent = this.add.rectangle(18, sy, 3, 22, 0xfacc15)
      .setScrollFactor(0).setDepth(4999).setOrigin(0, 0.5).setAlpha(0);
    const lbl = this.label(28, sy, title.toUpperCase(), {
      fontSize: '13px', color: '#f1f5f9', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4, letterSpacing: 3
    }).setScrollFactor(0).setDepth(5000).setAlpha(0).setOrigin(0, 0.5);

    this.tweens.add({
      targets: [lbl, accent], alpha: 1, duration: 450, ease: 'Sine.easeOut',
      onComplete: () => {
        this.time.delayedCall(2200, () => {
          this.tweens.add({
            targets: [lbl, accent], alpha: 0, duration: 700, ease: 'Sine.easeIn',
            onComplete: () => { lbl.destroy(); accent.destroy(); }
          });
        });
      }
    });
  }

  // ─── Procedural Textures ──────────────────────────────────────────────────

  /**
   * BFS-extracts the connected non-background region closest to the image centre,
   * makes everything else transparent, then crops the canvas to that bounding box.
   * The texture source is replaced in-place so subsequent add.image() calls show
   * only the extracted subject at its natural size. Returns subject aspect ratio.
   */
  private extractCropSubject(textureKey: string, tolerance = 30): number {
    if (!this.textures.exists(textureKey)) return 1;
    const texture = this.textures.get(textureKey);
    const src = texture.getSourceImage();

    // Draw source onto a canvas we can read pixels from.
    let canvas: HTMLCanvasElement;
    if (src instanceof HTMLCanvasElement) {
      canvas = src;
    } else if (src instanceof HTMLImageElement) {
      canvas = document.createElement('canvas');
      canvas.width = src.naturalWidth || src.width;
      canvas.height = src.naturalHeight || src.height;
      canvas.getContext('2d', { willReadFrequently: true })!.drawImage(src, 0, 0);
    } else {
      return 1;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 1;
    const W = canvas.width, H = canvas.height;
    const imgData = ctx.getImageData(0, 0, W, H);
    const d = imgData.data;
    const bgR = d[0], bgG = d[1], bgB = d[2];

    const isBg = (x: number, y: number) => {
      const i = (y * W + x) * 4;
      if (d[i + 3] === 0) return true;
      const dr = d[i] - bgR, dg = d[i + 1] - bgG, db = d[i + 2] - bgB;
      return Math.sqrt(dr * dr + dg * dg + db * db) <= tolerance;
    };

    // Find seed near centre.
    const cx = W >> 1, cy = H >> 1;
    let sx = -1, sy = -1;
    outer: for (let r = 0; r < Math.min(cx, cy); r += 2) {
      for (let ddx = -r; ddx <= r; ddx++) {
        for (let ddy = -r; ddy <= r; ddy++) {
          if (Math.abs(ddx) === r || Math.abs(ddy) === r) {
            const px = cx + ddx, py = cy + ddy;
            if (px >= 0 && px < W && py >= 0 && py < H && !isBg(px, py)) {
              sx = px; sy = py; break outer;
            }
          }
        }
      }
    }
    if (sx === -1) return W / H;

    // BFS to collect subject pixels and track bounding box.
    const visited = new Uint8Array(W * H);
    const queue: [number, number][] = [[sx, sy]];
    visited[sy * W + sx] = 1;
    let minX = sx, maxX = sx, minY = sy, maxY = sy;
    const subject = new Set<number>();
    subject.add(sy * W + sx);
    const DX = [-1, 1, 0, 0], DY = [0, 0, -1, 1];
    while (queue.length) {
      const [x, y] = queue.shift()!;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      for (let i = 0; i < 4; i++) {
        const nx = x + DX[i], ny = y + DY[i];
        if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
          const idx = ny * W + nx;
          if (!visited[idx]) {
            visited[idx] = 1;
            if (!isBg(nx, ny)) { subject.add(idx); queue.push([nx, ny]); }
          }
        }
      }
    }

    // Make non-subject pixels transparent.
    for (let i = 0; i < W * H; i++) {
      if (!subject.has(i)) d[i * 4 + 3] = 0;
    }
    ctx.putImageData(imgData, 0, 0);

    // Crop to bounding box.
    const cW = maxX - minX + 1, cH = maxY - minY + 1;
    const crop = document.createElement('canvas');
    crop.width = cW; crop.height = cH;
    crop.getContext('2d')!.drawImage(canvas, minX, minY, cW, cH, 0, 0, cW, cH);

    // Register the cropped canvas as a separate Phaser texture. Mutating the
    // original texture's glTexture in-place nulls Phaser 3.90's GLTexture wrapper
    // object, causing MultiPipeline.flush to crash with "Cannot read properties of
    // null (reading 'webGLTexture')". A new key avoids touching the GL state at all.
    try {
      const cropKey = textureKey + '_crop';
      if (this.textures.exists(cropKey)) this.textures.remove(cropKey);
      this.textures.addCanvas(cropKey, crop);
    } catch { /* ignore */ }
    return cW / cH;
  }

  private generatePropsAtlas() {
    if (this.textures.exists('small_props_atlas')) return;
    const propKeys = [
      // Only small images that fit in the 1024×1024 atlas.
      // The 1408×768 showcase sheets (prop_hospital_bed, iv_drip, cabinet, red_toilet, jungle_gym)
      // are wider than 1024px and corrupt all frame coordinates when packed — excluded.
      // Cars are also excluded: extracted+cropped in create() and rendered via direct texture.
      'prop_watchwater', 'prop_watchwater_open'
    ];
    let loadedProps = propKeys.filter(k => this.textures.exists(k));
    if (loadedProps.length === 0) return;

    const atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = 1024;
    atlasCanvas.height = 1024;
    const ctx = atlasCanvas.getContext('2d')!;

    let currentX = 0;
    let currentY = 0;
    let rowHeight = 0;
    const atlasFrames: Record<string, {x: number, y: number, w: number, h: number}> = {};

    for (const key of loadedProps) {
      const img = this.textures.get(key).getSourceImage() as HTMLImageElement;
      if (!img) continue;

      if (currentX + img.width > atlasCanvas.width) {
        currentX = 0;
        currentY += rowHeight;
        rowHeight = 0;
      }

      ctx.drawImage(img, currentX, currentY);
      atlasFrames[key] = {x: currentX, y: currentY, w: img.width, h: img.height};

      currentX += img.width;
      rowHeight = Math.max(rowHeight, img.height);
    }

    this.textures.addAtlas('small_props_atlas', atlasCanvas as unknown as HTMLImageElement, {
      frames: Object.entries(atlasFrames).map(([k, v]) => ({
        filename: k,
        frame: { x: v.x, y: v.y, w: v.w, h: v.h },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: v.w, h: v.h },
        sourceSize: { w: v.w, h: v.h }
      }))
    });
  }

  private createProceduralTextures() {
    // Vignette: radial gradient, transparent center → dark edges
    if (!this.textures.exists('vignette')) {
      const vc = document.createElement('canvas');
      vc.width = 256; vc.height = 256;
      const vctx = vc.getContext('2d')!;
      const vg = vctx.createRadialGradient(128, 128, 40, 128, 128, 128);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(0.55, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,1)');
      vctx.fillStyle = vg;
      vctx.fillRect(0, 0, 256, 256);
      this.textures.addCanvas('vignette', vc);
    }

    // Soft radial blob for fake point lights (tinted + ADD blend at light sources)
    if (!this.textures.exists('light_glow')) {
      const lc = document.createElement('canvas');
      lc.width = 128; lc.height = 128;
      const lctx = lc.getContext('2d')!;
      const lg = lctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      lg.addColorStop(0, 'rgba(255,255,255,0.9)');
      lg.addColorStop(0.35, 'rgba(255,240,210,0.35)');
      lg.addColorStop(1, 'rgba(255,230,200,0)');
      lctx.fillStyle = lg;
      lctx.fillRect(0, 0, 128, 128);
      this.textures.addCanvas('light_glow', lc);
    }

    // Tiny white circle for ambient particle emitters
    if (!this.textures.exists('particle_dot')) {
      const gp = this.make.graphics({});
      gp.fillStyle(0xffffff, 1).fillCircle(4, 4, 4);
      gp.generateTexture('particle_dot', 8, 8);
      gp.destroy();
    }

    // Shadow ellipse — soft stacked ovals, generated once and reused everywhere
    if (!this.textures.exists('shadow_ellipse')) {
      const gShadow = this.make.graphics({});
      for (let i = 5; i >= 1; i--) {
        gShadow.fillStyle(0x000000, 0.07 * i);
        gShadow.fillEllipse(40, 15, 16 * i, 7 * i);
      }
      gShadow.generateTexture('shadow_ellipse', 80, 30);
      gShadow.destroy();
    }

    if (this.textures.exists('bullet')) return;

    // Enemy textures — 48px, high-contrast so they read clearly over the map
    // Ticketmaster: blue bot silhouette with barcode stripes
    const gTm = this.make.graphics({});
    gTm.fillStyle(0x1e40af, 1).fillRect(8, 4, 32, 38);
    gTm.lineStyle(2.5, 0x60a5fa, 1).strokeRect(8, 4, 32, 38);
    gTm.fillStyle(0x000000, 1).fillCircle(8, 24, 6).fillCircle(40, 24, 6);
    gTm.fillStyle(0x60a5fa, 1);
    [14, 19, 23, 27, 32, 36].forEach(x => gTm.fillRect(x, 10, 2, 26));
    gTm.generateTexture('enemy_ticketmaster', 48, 48); gTm.destroy();

    // Dishes: stacked plates with angry red border
    const gDish = this.make.graphics({});
    [36, 30, 24, 18, 12].forEach((y, i) => {
      const w = 32 - i * 3;
      const x = (48 - w) / 2;
      gDish.fillStyle(i % 2 === 0 ? 0xe2e8f0 : 0xc4b5fd, 1).fillEllipse(24, y, w, 10);
      gDish.lineStyle(1.5, 0xef4444, 1).strokeEllipse(24, y, w, 10);
    });
    gDish.generateTexture('enemy_dishes', 48, 48); gDish.destroy();

    // Zombie: purple haze circle with glowing eyes
    const gZombie = this.make.graphics({});
    gZombie.fillStyle(0x4c1d95, 1).fillCircle(24, 26, 18);
    gZombie.lineStyle(3, 0xa78bfa, 1).strokeCircle(24, 26, 18);
    // Head
    gZombie.fillStyle(0x6d28d9, 1).fillCircle(24, 16, 10);
    gZombie.lineStyle(1.5, 0xc4b5fd, 1).strokeCircle(24, 16, 10);
    // Glowing green eyes
    gZombie.fillStyle(0x22c55e, 1).fillCircle(19, 14, 3.5).fillCircle(29, 14, 3.5);
    gZombie.lineStyle(1, 0x4ade80, 1).strokeCircle(19, 14, 3.5).strokeCircle(29, 14, 3.5);
    gZombie.generateTexture('enemy_zombie', 48, 48); gZombie.destroy();

    // Frat bro: beefy amber figure with red UMBC hat
    const gFrat = this.make.graphics({});
    // Body
    gFrat.fillStyle(0x92400e, 1).fillRect(10, 20, 28, 24);
    gFrat.lineStyle(2, 0xfbbf24, 1).strokeRect(10, 20, 28, 24);
    // Head
    gFrat.fillStyle(0xd97706, 1).fillCircle(24, 14, 10);
    gFrat.lineStyle(2, 0xfef08a, 1).strokeCircle(24, 14, 10);
    // Hat
    gFrat.fillStyle(0xdc2626, 1).fillRect(14, 4, 20, 6).fillRect(12, 8, 24, 4);
    gFrat.generateTexture('enemy_frat_bro', 48, 48); gFrat.destroy();

    // Boss textures
    const gBE = this.make.graphics({});
    gBE.fillStyle(0x1e1b4b, 1).fillCircle(24, 24, 22).lineStyle(3, 0x6366f1, 1).strokeCircle(24, 24, 22);
    gBE.fillStyle(0x10b981, 1).fillRect(16, 18, 16, 12).lineStyle(1, 0xffffff, 1).strokeRect(16, 18, 16, 12);
    gBE.generateTexture('boss_boss_eric', 48, 48); gBE.destroy();

    const gBA = this.make.graphics({});
    gBA.fillStyle(0x831843, 1).fillCircle(24, 24, 22).lineStyle(3, 0xec4899, 1).strokeCircle(24, 24, 22);
    gBA.fillStyle(0xfbcfe8, 1).fillCircle(16, 16, 3).fillCircle(32, 16, 3);
    gBA.generateTexture('boss_boss_audrey', 48, 48); gBA.destroy();

    const gBF = this.make.graphics({});
    gBF.fillStyle(0x7c2d12, 1).fillRect(8, 12, 32, 24).lineStyle(2, 0xea580c, 1).strokeRect(8, 12, 32, 24);
    gBF.fillStyle(0x000000, 1).fillRect(6, 6, 6, 8).fillRect(36, 6, 6, 8).fillRect(6, 34, 6, 8).fillRect(36, 34, 6, 8);
    gBF.generateTexture('boss_boss_florida', 48, 48); gBF.destroy();

    const gBB = this.make.graphics({});
    gBB.fillStyle(0x1e3a8a, 1).fillCircle(24, 24, 22).lineStyle(3, 0x2563eb, 1).strokeCircle(24, 24, 22);
    gBB.fillStyle(0xef4444, 1).fillCircle(24, 28, 5).fillStyle(0xffffff, 1).fillCircle(16, 16, 3.5).fillCircle(32, 16, 3.5);
    gBB.generateTexture('boss_boss_ben', 48, 48); gBB.destroy();

    const gBN = this.make.graphics({});
    gBN.fillStyle(0x881337, 1).fillCircle(24, 24, 22).lineStyle(3, 0xf43f5e, 1).strokeCircle(24, 24, 22);
    gBN.fillStyle(0x059669, 1).fillRect(14, 16, 20, 16).lineStyle(1.5, 0xffffff, 1).strokeRect(14, 16, 20, 16);
    gBN.generateTexture('boss_boss_nick_f', 48, 48); gBN.destroy();

    // Projectiles
    const gBullet = this.make.graphics({});
    gBullet.fillStyle(0xeab308, 1).fillCircle(8, 8, 4.5).lineStyle(1, 0xffffff, 1).strokeCircle(8, 8, 4.5);
    gBullet.generateTexture('bullet', 16, 16); gBullet.destroy();

    // Ticket bolt (Ticketmaster ranged attack)
    const gTicket = this.make.graphics({});
    gTicket.fillStyle(0x1d4ed8, 1).fillRect(2, 4, 12, 8).lineStyle(1, 0x93c5fd, 1).strokeRect(2, 4, 12, 8);
    gTicket.fillStyle(0xfbbf24, 1).fillRect(5, 5, 2, 6).fillRect(9, 5, 2, 6);
    gTicket.generateTexture('ticket_bolt', 16, 16); gTicket.destroy();

    // Fork (Dishes ranged attack)
    const gFork = this.make.graphics({});
    gFork.fillStyle(0xe2e8f0, 1).fillRect(7, 2, 2, 12);
    gFork.fillRect(5, 2, 2, 4).fillRect(9, 2, 2, 4);
    gFork.lineStyle(1, 0x94a3b8, 1).strokeRect(7, 2, 2, 12);
    gFork.generateTexture('fork_proj', 16, 16); gFork.destroy();

    // Loot shard
    const gShard = this.make.graphics({});
    gShard.fillStyle(0x10b981, 1).fillTriangle(8, 2, 2, 14, 14, 14).lineStyle(1, 0xffffff, 1).strokeTriangle(8, 2, 2, 14, 14, 14);
    gShard.generateTexture('loot_shard', 16, 16); gShard.destroy();
  }

  // ─── NPC Setup ───────────────────────────────────────────────────────────────

  private setupNPCs() {
    const heroNpcData = [
      { id: 'eric',   x: 180,  y: 180,  name: 'Eric Huang',     color: '#818cf8' },
      { id: 'nick_f', x: 840,  y: 180,  name: 'Nick Farrar',    color: '#f59e0b' },
      { id: 'nick_h', x: 180,  y: 820,  name: 'Nick Hedgecock', color: '#4ade80' },
      { id: 'jacob',  x: 840,  y: 820,  name: 'Jacob Lebby',    color: '#67e8f9' },
    ];

    heroNpcData.forEach(npc => {
      if (npc.id === this.playerClass.id) return; // don't duplicate the player

      const sheetKey = `hero_${npc.id}_sheet`;
      const hasSheet = this.textures.exists(sheetKey);

      let sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
      if (hasSheet) {
        const s = this.add.sprite(npc.x, npc.y, sheetKey, 0);
        s.play(`idle_${npc.id}`, true);
        s.setScale(0.42).setDepth(5).setAlpha(0.92);
        sprite = s;
      } else {
        // fallback: draw a simple colored circle placeholder
        const g = this.make.graphics({ x: 0, y: 0 });
        g.fillStyle(parseInt(npc.color.replace('#', ''), 16), 1);
        g.fillCircle(24, 24, 24);
        g.generateTexture(`npc_fallback_${npc.id}`, 48, 48);
        g.destroy();
        sprite = this.add.image(npc.x, npc.y, `npc_fallback_${npc.id}`)
          .setScale(1.0).setDepth(5).setAlpha(0.88);
      }

      this.label(npc.x, npc.y - 54, npc.name, {
        fontSize: '12px', color: npc.color, fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 4, padding: { x: 4, y: 2 }
      }).setOrigin(0.5).setDepth(6);

      const prompt = this.makeTalkPrompt(npc.x, npc.y - 72);
      this.npcs.push({ id: npc.id, sprite, prompt });
    });

    // Jordan — shadow admin, always present, placed in the center park area
    NPC_CHARACTERS.forEach(npc => {
      const texKey = 'jordan_npc';
      if (!this.textures.exists(texKey)) {
        // Procedural silhouette: dark hoodie figure
        const g = this.make.graphics({ x: 0, y: 0 });
        g.fillStyle(0x1a1a2e, 1);
        g.fillCircle(24, 10, 10); // head
        g.fillStyle(0xf97316, 1);
        g.fillCircle(24, 10, 7); // orange tint
        g.fillStyle(0x1a1a2e, 1);
        g.fillRect(14, 20, 20, 28); // body
        g.fillStyle(0xf97316, 0.4);
        g.fillRect(14, 20, 20, 28);
        g.generateTexture(texKey, 48, 56);
        g.destroy();
      }

      const sprite = this.add.image(500, 490, texKey)
        .setScale(1.3)
        .setDepth(5)
        .setAlpha(0.92);

      this.label(500, 490 - 44, npc.name, {
        fontSize: '12px', color: npc.color, fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 4, padding: { x: 4, y: 2 }
      }).setOrigin(0.5).setDepth(6);

      this.label(500, 490 - 60, npc.title, {
        fontSize: '10px', color: '#cbd5b8',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(6);

      const prompt = this.makeTalkPrompt(500, 490 - 78);
      this.npcs.push({ id: npc.id, sprite, prompt });
    });
  }

  /** Shared "[ E ] Talk" floating prompt, hidden until the player is in range. */
  private makeTalkPrompt(x: number, y: number): Phaser.GameObjects.Text {
    return this.label(x, y, '[ E ] Talk', {
      fontSize: '11px', color: '#fbbf24', fontStyle: 'bold',
      backgroundColor: '#1a2e10f0', padding: { x: 7, y: 4 },
      stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(7).setVisible(false);
  }
}

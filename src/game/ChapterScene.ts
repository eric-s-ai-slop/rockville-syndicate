import Phaser from 'phaser';
import { MapBuilder } from './scene/MapBuilder';
import { Actors, type ActorVisualState } from './scene/Actors';
import { AudioController } from './scene/AudioController';
import { BeatEngine } from './scene/BeatEngine';
import { PlayerController } from './scene/PlayerController';
import { Atmosphere } from './scene/Atmosphere';
import { SpriteLoader } from './scene/SpriteLoader';
import type { GameMode, ModeResult } from './modes/types';
import { getMode } from './modes';
import { hitStop } from './modes/hitStop';
import { screenSpace } from './modes/screenSpace';
import { mariaBrookeStats, type MariaBrookeStatsSnapshot } from './modes/mariaBrookeStats';
import {
  CharacterClass,
  CHARACTER_CLASSES,
  BOSSES,
  BossConfig,
  LORE_BARKS,
  POWER_UPS,
  DIFFICULTY_MODS,
} from '../data/entities';
import { getProgress, getSettings, saveProgressData, type ProgressData } from './settings';
import plasmaShieldImg from '../assets/images/plasma_shield_1781235159690.jpg';
import shieldImg from '../assets/images/shield.jpg';
import heroEricImg from '../assets/images/hero_eric_1781236098529.jpg';
import heroJacobImg from '../assets/images/hero_jacob_1781236113357.jpg';
import heroNickFImg from '../assets/images/hero_nick_f_1781236122782.jpg';
import heroNickHImg from '../assets/images/hero_nick_h_1781236135006.jpg';
import heroJordanImg from '../assets/images/hero_jordan.jpg';
import heroMaharkoImg from '../assets/images/hero_maharko.jpg';
import npcAlexSheet from '../assets/images/npc_alex_sheet.jpg';
import npcBenjiSheet from '../assets/images/npc_benji_sheet.jpg';
import npcRoseSheet from '../assets/images/npc_rose_sheet.jpg';
import npcRoseSisterSheet from '../assets/images/npc_rose_sister_sheet.jpg';
import stageCarInterior from '../assets/images/game_decor/stages/stage_car_interior.jpg';
import stageFloridaHouseNight from '../assets/images/game_decor/stages/stage_florida_house_night.jpg';
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
import { extractPropSubject } from './PropExtractor';
import { buildFurnitureAtlas } from './furnitureCatalog';
import { buildPackAtlas } from './packSpriteAtlas';
import { ChapterConfig, Beat, ActorPlacement, resolveSpeaker, MapConfig, CHAPTERS } from '../data/chapters';
import {
  CHAPTER_MUSIC_KEY, STAGE_MUSIC_URL, BOSS_MUSIC_URL, BOSS_LOOP_URL,
  THEME_FOOTSTEP, FOOTSTEP_URLS,
  UI_SELECT_URL, VICTORY_JINGLE_URL, KNOCK_URL,
  CROWD_MURMUR_URL, CRICKET_AMBIENT_URL,
  SFX_MESSAGE_DING_URL, ULTRAPHONK_URL,
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

// Ch0: Maria Brooke stage images
import stageWjClassroomUrl from '../assets/chapters/maria_brooke/stage_wj_classroom.jpg?url';
import stageWjTrackUrl     from '../assets/chapters/maria_brooke/stage_wj_track.jpg?url';

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

// Ch11: Cabin From Hell — OC balcony + Shenandoah cabin stage images
import stageOcBalconyNightUrl from '../assets/images/game_decor/stages/stage_oc_balcony_night.jpg?url';
import stageCabinInteriorUrl  from '../assets/images/game_decor/stages/stage_cabin_interior.jpg?url';
import stageCabinDeckUrl      from '../assets/images/game_decor/stages/stage_cabin_deck.jpg?url';

// Ch12: Origins — McDonald's / void islands / Dogwood Park stage images + dialer prop
import stageMcdonaldsNightUrl   from '../assets/images/game_decor/stages/origins/stage_mcdonalds_night.jpg?url';
import stageEricRoomPresentUrl  from '../assets/images/game_decor/stages/origins/stage_eric_room_present.jpg?url';
import stageVoidNickfRoomUrl    from '../assets/images/game_decor/stages/origins/stage_void_nickf_room.jpg?url';
import stageVoidJacobRoomUrl    from '../assets/images/game_decor/stages/origins/stage_void_jacob_room.jpg?url';
import stageVoidEricRoomUrl     from '../assets/images/game_decor/stages/origins/stage_void_eric_room.jpg?url';
import stageDogwoodLookoutUrl   from '../assets/images/game_decor/stages/origins/stage_dogwood_lookout_night.jpg?url';
import propDialerSiteUrl        from '../assets/images/game_decor/stages/origins/prop_dialer_site.jpg?url';
import npcChrisRivasSheet       from '../assets/images/npc_chris_rivas_sheet.jpg';

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

export interface PlaytestSnapshotSafety {
  branchSafe: boolean;
  unsafeReasons: string[];
  activeModeId: string | null;
  activeModeBackground: boolean;
  chaseActive: boolean;
  qteActive: boolean;
  externalMode: boolean;
}

export interface PlaytestSceneSnapshot {
  version: 1;
  sceneIndex: number;
  beatIndex: number;
  beatActive: boolean;
  player: { x: number; y: number; velocityX: number; velocityY: number } | null;
  hp: number;
  shardsCollected: number;
  ledgerTotal: number;
  actors: ActorVisualState[];
  progress: ProgressData;
  mariaBrookeStats: MariaBrookeStatsSnapshot;
  safety: PlaytestSnapshotSafety;
}

export interface PlaytestBeatTraceEntry {
  sequence: number;
  beatIndex: number;
  beatType: string;
  sceneIndex: number;
  timestamp: number;
}

export default class ChapterScene extends Phaser.Scene {
  public playerClass!: CharacterClass;
  public currentLevelIndex: number = 0;
  private onGoldChange!: (gold: number) => void;
  private onHpChange!: (hp: number) => void;
  public onMessageLog!: (msg: string) => void;
  public onTriggerQTE!: (boss: BossConfig, callback: (success: boolean, damage: number) => void) => void;
  private onLevelCompleted!: (stats: { shardsCollected: number; ledgerTotal: number; hpRemaining: number }) => void;
  public shardsCollected: number = 0;
  private onGameOver!: () => void;
  private onNpcInteract!: (npcId: string, resume: () => void) => void;

  // Story / chapter system
  public chapter!: ChapterConfig;
  public onStoryDialogue!: (payload: StoryDialoguePayload, done: (choiceIndex?: number) => void) => void;
  public clearStoryDialogue!: () => void;
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
  /** Edge-detects the gamepad dash button — Phaser's gamepad plugin has no JustDown helper. */
  private gamepadDashWasDown: boolean = false;
  public wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
    F: Phaser.Input.Keyboard.Key;
  };
  // Player movement / dash / weapon subsystem
  public playerController!: PlayerController;

  // Active power-up cleanup fns (cleared on teardown / chapter transition)
  private activePowerUpCleanups: Array<() => void> = [];
  private lastBossAttackTime: number = 0;
  private activeGold: number = 0;
  private activeHp: number = 100;

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
  private levelStarted: boolean = false;

  // Collider references for map objects (need to store for enemy collision setup)
  public mapCollidables: Phaser.GameObjects.Rectangle[] = [];

  // All game objects created during map build — used for teardown on changeScene
  private mapObjects: Phaser.GameObjects.GameObject[] = [];
  // Index into chapter.scenes[] for the currently active location
  public currentSceneIndex: number = 0;

  // Shadow sprites that follow moving entities
  private playerShadow: Phaser.GameObjects.Image | null = null;

  // Phase C: per-chapter atmosphere. Emitters are shared (MapBuilder also
  // contributes); the overlays/letterbox live in the Atmosphere subsystem.
  public particleEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  public portraitDataUrls: Record<string, string> = {};

  // Phase E — audio
  public stageMusic: Phaser.Sound.BaseSound | null = null;
  public bossMusic: Phaser.Sound.BaseSound | null = null;     // Techno-Tetris loop
  public bossMusicSting: Phaser.Sound.BaseSound | null = null; // Prowler one-shot sting
  public footstepKeys: string[] = [];

  // R1: map of propKey → image sprite for runtime texture swaps (e.g. door open)
  public propSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  public poolNameplates: Map<string, Phaser.GameObjects.Text> = new Map();

  public dialogueOpen: boolean = false;
  public movementFrozen: boolean = false;
  
  public mountExternalGame: (opts: { gameId: string; config?: unknown }, onDone: (r: ModeResult) => void) => void = () => {};
  public unmountExternalGame: () => void = () => {};

  // Subsystems
  public mapBuilder!: MapBuilder;
  public actorsSystem!: Actors;
  public audioController!: AudioController;
  public beatEngine!: BeatEngine;
  public atmosphere!: Atmosphere;
  public spriteLoader!: SpriteLoader;
  public activeMode: GameMode | null = null;
  /** Beat index that launched activeMode; null means a direct toolkit launch. */
  public activeModeBeatIndex: number | null = null;
  /** True when activeMode belongs to a background beat and must not block flow. */
  public activeModeBackground = false;
  /** DEV-only bounded trace consumed by the terminal playtest evidence harness. */
  public playtestBeatTrace: PlaytestBeatTraceEntry[] = [];
  private playtestBeatTraceSequence = 0;
  /** The delayed story kickoff must be cancellable when the agent restores a save. */
  private initialBeatTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: 'ChapterScene' });
    this.mapBuilder = new MapBuilder(this);
    this.actorsSystem = new Actors(this);
    this.audioController = new AudioController(this);
    this.beatEngine = new BeatEngine(this);
    this.atmosphere = new Atmosphere(this);
  }

  public init(data: {
    hero?: CharacterClass;
    chapter?: ChapterConfig;
    playerHp?: number;
    onHpChange?: (hp: number) => void;
    onMessageLog?: (msg: string) => void;
    onTriggerQTE?: (boss: BossConfig, callback: (success: boolean, damage: number) => void) => void;
    onChapterCompleted?: (stats: { shardsCollected: number; ledgerTotal: number; hpRemaining: number }) => void;
    onGameOver?: () => void;
    onStoryDialogue?: (payload: StoryDialoguePayload, done: (choiceIndex?: number) => void) => void;
    clearStoryDialogue?: () => void;
    mountExternalGame?: (opts: { gameId: string; config?: unknown }, onDone: (r: ModeResult) => void) => void;
    unmountExternalGame?: () => void;
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
    this.shardsCollected = 0;
    this.onGameOver = data.onGameOver!;
    this.onNpcInteract = () => {};
    this.onStoryDialogue = data.onStoryDialogue ?? ((_p, done) => done());
    this.clearStoryDialogue = data.clearStoryDialogue ?? (() => {});
    this.mountExternalGame = data.mountExternalGame ?? (() => {});
    this.unmountExternalGame = data.unmountExternalGame ?? (() => {});
    this.onLedgerChange = data.onLedgerChange ?? (() => {});

    if (!this.playerController) {
      this.playerController = new PlayerController(this);
    }
    this.playerController.reset();
    this.lastBossAttackTime = 0;
    this.spawnedBoss = null;
    this.isBossActive = false;
    this.chaseSprite = null;
    this.chaseShadow = null;
    this.chaseActive = false;
    this.chaseCooldown = 0;
    this.levelStarted = false;
    this.mapCollidables = [];
    this.mapObjects = [];
    this.currentSceneIndex = 0;
    this.dialogueOpen = false;
    this.ledgerTotal = 0;
    this.beatIndex = 0;
    this.beatActive = false;
    this.walkTarget = null;
    this.playerShadow = null;
    this.atmosphere?.resetMapVisuals();
    this.atmosphere?.resetLetterbox();
    this.particleEmitters = [];
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

  public preload() {
    // Load all assets in one batch to avoid Phaser's batch-transition stall (default limit is 32)
    this.load.maxParallelDownloads = 256;
    this.spriteLoader = new SpriteLoader(this);
    this.spriteLoader.createProceduralTextures();
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

    this.safeLoadImage('stage_wj_classroom', stageWjClassroomUrl);
    this.safeLoadImage('stage_wj_track', stageWjTrackUrl);
    this.safeLoadImage('stage_umbc_basement', umbcBasementStageUrl);
    this.safeLoadImage('stage_parking_lot_night', parkingLotNightUrl);
    this.safeLoadImage('npc_alex_sheet_raw_jpg', npcAlexSheet);
    this.safeLoadImage('npc_benji_sheet_raw_jpg', npcBenjiSheet);
    this.safeLoadImage('npc_rose_sheet_raw_jpg', npcRoseSheet);
    this.safeLoadImage('npc_rose_sister_sheet_raw_jpg', npcRoseSisterSheet);
    this.safeLoadImage('stage_car_interior', stageCarInterior);
    this.safeLoadImage('stage_florida_house_night', stageFloridaHouseNight);
    // Ben has no playable-roster hero sprite; reuse his UMBC portrait (a 1376×768
    // showcase sheet, same format as the hero art) so he renders as a real,
    // animated character instead of a colored blob in the basement.
    this.safeLoadImage('hero_ben_raw_jpg', bossBenUmbcImg);
    this.safeLoadImage('hero_girl1_raw_jpg', npcGirlSilhouetteUrl);
    this.safeLoadImage('hero_girl2_raw_jpg', npcGirlSilhouetteUrl);
    this.safeLoadImage('hero_girl3_raw_jpg', npcGirlSilhouetteUrl);
    this.audioController.safeLoadAudio('sfx_message_ding', SFX_MESSAGE_DING_URL);

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
    // Ch11: Cabin From Hell
    this.safeLoadImage('stage_oc_balcony_night', stageOcBalconyNightUrl);
    this.safeLoadImage('stage_cabin_interior', stageCabinInteriorUrl);
    this.safeLoadImage('stage_cabin_deck', stageCabinDeckUrl);
    this.audioController.safeLoadAudio('sfx_ultraphonk', ULTRAPHONK_URL);

    // Ch12: Rockville Syndicate: Origins
    this.safeLoadImage('stage_mcdonalds_night', stageMcdonaldsNightUrl);
    this.safeLoadImage('stage_eric_room_present', stageEricRoomPresentUrl);
    this.safeLoadImage('stage_void_nickf_room', stageVoidNickfRoomUrl);
    this.safeLoadImage('stage_void_jacob_room', stageVoidJacobRoomUrl);
    this.safeLoadImage('stage_void_eric_room', stageVoidEricRoomUrl);
    this.safeLoadImage('stage_dogwood_lookout_night', stageDogwoodLookoutUrl);
    this.safeLoadImage('prop_dialer_site', propDialerSiteUrl);
    this.safeLoadImage('npc_chris_rivas_sheet_raw_jpg', npcChrisRivasSheet);

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

    // Pre-load music for every `changeMusic` beat's target key so a mid-scene
    // crossfade has the track ready (crossfadeToMusic no-ops on an unloaded key).
    for (const beat of this.chapter.beats ?? []) {
      if (beat.type === 'changeMusic') {
        const url = STAGE_MUSIC_URL[beat.key];
        if (url) this.safeLoadAudio(beat.key, url);
      }
    }
    this.safeLoadAudio('boss_sting', BOSS_MUSIC_URL);
    this.safeLoadAudio('boss_loop', BOSS_LOOP_URL);

    const variant = THEME_FOOTSTEP[this.getActiveSceneConfig().map.theme ?? 'apartment'] ?? 'carpet';
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
            this.propAspects[key] = this.spriteLoader.extractCropSubject(key);
        }
    }

    this.spriteLoader.generatePropsAtlas();

    this.spriteLoader.processCharacterSheets();

    const { map } = this.getActiveSceneConfig();
    // Player is confined by physics world bounds + perimeter walls — NOT camera
    // bounds. Camera bounds clamp scroll and jam the map to one side on wide
    // viewports (off-center map + blank fill). See CLAUDE.md §4. Do not re-add.
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

    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.collider(this.projectiles, this.walls,
      (p) => (p as Phaser.GameObjects.GameObject).destroy());
    this.physics.add.collider(this.enemyProjectiles, this.walls,
      (p) => (p as Phaser.GameObjects.GameObject).destroy());
    this.wireMapColliders();

    this.physics.add.overlap(this.player, this.enemyProjectiles, this.handleProjectileHitPlayer, undefined, this);
    this.physics.add.overlap(this.player, this.lootShards, this.handleCollectLoot, undefined, this);

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
    this.spriteLoader.extractPortraits();

    // Start stage music (fade in over 1.2 s to not blast the player)
    this.startStageMusic();

    // Reset per-chapter complicity accumulators so replays start clean — lookUps
    // is set by in-chapter look-up choices that run before the minigame.
    if (this.chapter.id === 'maria_brooke') mariaBrookeStats.reset();

    // Kick off the story.
    const urlParams = new URLSearchParams(window.location.search);
    const startBeatParam = urlParams.get('beat');
    let startBeatIndex = 0;
    if (startBeatParam) {
      const idx = parseInt(startBeatParam, 10);
      if (!Number.isNaN(idx)) {
        startBeatIndex = idx;
      } else {
        const idIdx = this.chapter.beats.findIndex(b => b.id === startBeatParam);
        if (idIdx >= 0) startBeatIndex = idIdx;
      }
    }
    
    this.initialBeatTimer = this.time.delayedCall(300, () => {
      this.initialBeatTimer = null;
      this.startBeat(startBeatIndex);
    });

    // Clean up audio when the scene shuts down
    this.events.once('shutdown', () => {
      this.audioController.destroy();
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
      // Clear all active power-up timers/effects so they don't bleed into the next chapter.
      this.activePowerUpCleanups.forEach(fn => fn());
      this.activePowerUpCleanups = [];
      if (this.activeMode) {
        try {
          this.activeMode.teardown();
        } catch (err) {
          console.error('[ChapterScene] activeMode teardown failed:', err);
        }
        this.activeMode = null;
        this.activeModeBeatIndex = null;
        this.activeModeBackground = false;
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
    this.atmosphere.build(map);
    this.mapObjects = this.children.list.filter(o => !before.has(o));
  }

  /** Add per-object physics colliders for mapCollidables. Call after every map build. */
  private wireMapColliders() {
    // Phaser's TypeScript types don't expose Rectangle as ArcadeColliderType even though
    // the rectangles have static physics bodies — cast once at the loop level.
    this.mapCollidables.forEach((obj: Phaser.GameObjects.Rectangle) => {
      const wall = obj as unknown as Phaser.Types.Physics.Arcade.ArcadeColliderType;
      this.physics.add.collider(this.player, wall);
      this.physics.add.collider(this.enemies, wall);
      this.physics.add.collider(this.projectiles, wall,
        (p) => (p as Phaser.GameObjects.GameObject).destroy());
      this.physics.add.collider(this.enemyProjectiles, wall,
        (p) => (p as Phaser.GameObjects.GameObject).destroy());
    });
  }

  /** Tear down all map visuals, physics, and actor sprites — ready for a new scene. */
  public teardownMap() {
    // Static walls group: clear + destroy all members
    if (this.walls?.children) {
      this.walls.clear(true, true);
    }

    // Physics-backed solid rectangles (mapCollidables)
    this.mapCollidables.forEach(obj => { try { obj.destroy(); } catch {} });
    this.mapCollidables = [];

    // Every visual created during buildMapLayer (backdrop, floor, rects, images, graphics…)
    this.mapObjects.forEach(obj => { try { if (obj.active) obj.destroy(); } catch {} });
    this.mapObjects = [];

    // Atmosphere tracked refs (also in mapObjects, but null them out)
    this.atmosphere.resetMapVisuals();
    this.atmosphere.resetScreenTint();
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
      // No camera bounds — see note in create(). Re-adding off-centers the map.
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

  /** Instant warp to a scene without transitions. Clears old map and builds the new one immediately. */
  public warpToScene(sceneIndex: number) {
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
    this.movementFrozen = false;

    const sceneMusic = this.chapter.scenes?.[sceneIndex]?.music;
    if (sceneMusic) this.audioController.crossfadeToMusic(sceneMusic);
  }

  /** Direct launcher for minigames. Preloads, setups contexts, and starts mode cleanly. */
  public launchMode(modeId: string, config: any = {}) {
    const mode = getMode(modeId);
    if (!mode) throw new Error(`Unknown minigame modeId: ${modeId}`);

    if (this.activeMode) {
      try { this.activeMode.teardown(); } catch {}
      this.activeMode = null;
      this.activeModeBeatIndex = null;
      this.activeModeBackground = false;
    }

    const context = this.beatEngine.buildModeContext();
    if (mode.preload) {
      try {
        mode.preload(context);
      } catch (err) {
        console.error(`[ChapterScene] Preload failed for mode ${modeId}:`, err);
      }
    }

    this.activeMode = mode;
    this.activeModeBeatIndex = null;
    this.activeModeBackground = false;
    const onComplete = (result: ModeResult) => {
      try {
        mode.teardown();
      } catch (err) {
        console.error(`[ChapterScene] Teardown failed for mode ${modeId}:`, err);
      }
      if (this.activeMode === mode) {
        this.activeMode = null;
        this.activeModeBeatIndex = null;
        this.activeModeBackground = false;
      }
      console.log(`[ChapterScene] Direct mode ${modeId} completed:`, result);
    };
    // Stored so external tooling (the Playwright agent harness) can force this
    // mode to resolve early — see the doc comment on GameMode.harnessForceComplete.
    mode.harnessForceComplete = onComplete;
    mode.start(context, config, onComplete);
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
    // eslint-disable-next-line no-restricted-syntax -- the one sanctioned raw add.text: this IS the label() helper
    return this.add.text(x, y, text, {
      fontFamily: 'Yoster, monospace',
      resolution: this.textRes,
      ...style
    });
  }

  // ─── Brainrot HUD ─────────────────────────────────────────────────────────

  private buildBrainrotHUD() {
    const cam = this.cameras.main;
    const { zx, zy, s } = screenSpace(cam);
    const cx = cam.width - 160;
    const cy = 24;

    this.brainrotBar = this.add.rectangle(zx(cx), zy(cy), s(120), s(12), 0x1e293b)
      .setStrokeStyle(s(1.5), 0x7c3aed, 0.8)
      .setScrollFactor(0)
      .setDepth(100);

    this.brainrotFill = this.add.rectangle(zx(cx - 60), zy(cy), 0, s(10), 0xa78bfa)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(101);

    this.brainrotLabel = this.label(zx(cx), zy(cy - 13), 'BRAINROT', {
      fontSize: `${s(11)}px`, color: '#c4b5fd', fontStyle: 'bold',
      stroke: '#0b1208', strokeThickness: s(3)
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
    const { zx, zy } = screenSpace(cam);
    const w = cam.width;
    const h = cam.height;
    const cx = w - 160;
    const cy = 24;
    if (this.brainrotBar) this.brainrotBar.setPosition(zx(cx), zy(cy));
    if (this.brainrotFill) this.brainrotFill.setPosition(zx(cx - 60), zy(cy));
    if (this.brainrotLabel) this.brainrotLabel.setPosition(zx(cx), zy(cy - 13));
    // Resize screen-space atmosphere overlays to new viewport
    this.atmosphere.repositionOverlays(w, h);
  }

  private updateBrainrotHUD() {
    if (!this.brainrotFill) return;
    const { s } = screenSpace(this.cameras.main);
    const fillW = s((this.brainrotLevel / 100) * 120);
    this.brainrotFill.setSize(fillW, s(10));
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

    // Gamepad: left stick (with deadzone) or D-pad drives movement, A button dashes.
    let gamepadDashJustDown = false;
    const pad = this.input.gamepad?.total ? this.input.gamepad.getPad(0) : null;
    if (pad) {
      const deadzone = 0.2;
      const sx = pad.leftStick.x, sy = pad.leftStick.y;
      if (vx === 0) {
        if (pad.left) vx = -speed;
        else if (pad.right) vx = speed;
        else if (Math.abs(sx) > deadzone) vx = sx > 0 ? speed : -speed;
      }
      if (vy === 0) {
        if (pad.up) vy = -speed;
        else if (pad.down) vy = speed;
        else if (Math.abs(sy) > deadzone) vy = sy > 0 ? speed : -speed;
      }
      const dashDown = pad.A;
      gamepadDashJustDown = dashDown && !this.gamepadDashWasDown;
      this.gamepadDashWasDown = dashDown;
    }

    // Delegate movement → dash → footsteps → auto-fire to PlayerController
    this.playerController.update(time, vx, vy, animId, this.dialogueOpen, gamepadDashJustDown);

    // walkTo beat: advance when the player reaches the marked spot.
    if (this.walkTarget) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.walkTarget.x, this.walkTarget.y);
      if (d <= this.walkTarget.radius) {
        const wasDoor = this.walkTarget.markerLabel?.includes('front door');
        this.clearWalkTarget();
        const doorSfx = this.chapter.ambientSfx?.onDoor;
        if (wasDoor && doorSfx && this.cache.audio.exists(doorSfx)) {
          [0, 150, 300].forEach(ms => this.time.delayedCall(ms, () => { try { this.sound.play(doorSfx, { volume: 0.6 * getSettings().sfxVolume }); } catch {} }));
        }
        this.advanceBeat();
      }
    }

    // R8: chase pursuer AI — runs independently of the boss combat system.
    if (this.chaseActive && !this.dialogueOpen && this.chaseSprite) {
      this.handleChaseAI();
    }

  }

  // ─── Story Beat Engine ─────────────────────────────────────────────────────────

  public startBeat(index: number) {
    this.beatEngine.startBeat(index);
  }

  /** Record only structural beat identity; never narrative/config payloads. */
  public recordPlaytestBeatStart(index: number, beatType: string): void {
    if (!import.meta.env.DEV) return;
    this.playtestBeatTrace.push({
      sequence: ++this.playtestBeatTraceSequence,
      beatIndex: index,
      beatType,
      sceneIndex: this.currentSceneIndex,
      timestamp: Date.now(),
    });
    if (this.playtestBeatTrace.length > 256) {
      this.playtestBeatTrace.splice(0, this.playtestBeatTrace.length - 256);
    }
  }

  /**
   * Restore an exact narrative position after a toolkit save/load.
   *
   * A newly created scene schedules its normal beat-0 kickoff during create().
   * A restore can happen before that 300ms timer fires, so simply assigning
   * beatIndex and calling startBeat() is racy: the pending kickoff later
   * rewinds the engine and can resurrect an old walkTo target. Cancel the
   * kickoff and clear all completion state before starting the saved beat.
   */
  public restoreBeat(index: number) {
    this.initialBeatTimer?.remove(false);
    this.initialBeatTimer = null;
    this.beatEngine.clearWalkTarget();
    this.beatEngine.unfreeze();
    this.movementFrozen = false;
    this.beatEngine.startBeat(index);
  }

  /**
   * Capture the state needed to replay a choice branch from the same visible
   * point. This is a dev-tool seam, not a second persistence format: progress
   * is copied from the unified settings store and restored through that store.
   */
  public capturePlaytestSnapshot(): PlaytestSceneSnapshot {
    const activeModeId = this.activeMode?.id ?? null;
    const externalMode = activeModeId === 'battleiq-battle';
    const unsafeReasons: string[] = [];
    if (activeModeId) {
      unsafeReasons.push(
        `${this.activeModeBackground ? 'Background' : 'Foreground'} mode "${activeModeId}" is active and cannot be reconstructed safely.`,
      );
    }
    if (externalMode) unsafeReasons.push('An external iframe mode is mounted and cannot be restored in memory.');
    if (this.chaseActive) unsafeReasons.push('A chase is active and its timer/pursuer state is not snapshotted.');
    if (this.qteActive) unsafeReasons.push('A QTE is active and its React bridge state is not snapshotted.');
    if (this.isBossActive && !activeModeId) unsafeReasons.push('A boss encounter is active without an owned foreground mode.');

    const progress = getProgress();
    const progressCopy: ProgressData = {
      ...progress,
      completedChapters: [...progress.completedChapters],
      ...(progress.runRecords ? { runRecords: progress.runRecords.map(record => ({ ...record })) } : {}),
      ...(progress.chapterBests ? { chapterBests: { ...progress.chapterBests } } : {}),
    };
    const velocity = this.player?.body?.velocity;

    return {
      version: 1,
      sceneIndex: this.currentSceneIndex,
      beatIndex: this.beatIndex,
      beatActive: this.beatActive,
      player: this.player
        ? {
            x: this.player.x,
            y: this.player.y,
            velocityX: velocity?.x ?? 0,
            velocityY: velocity?.y ?? 0,
          }
        : null,
      hp: this.activeHp,
      shardsCollected: this.shardsCollected,
      ledgerTotal: this.ledgerTotal,
      actors: this.actorsSystem.snapshotRenderedState(),
      progress: progressCopy,
      mariaBrookeStats: mariaBrookeStats.snapshot(),
      safety: {
        branchSafe: unsafeReasons.length === 0,
        unsafeReasons,
        activeModeId,
        activeModeBackground: this.activeModeBackground,
        chaseActive: this.chaseActive,
        qteActive: this.qteActive,
        externalMode,
      },
    };
  }

  /** Restore a safe in-memory branch snapshot captured by the playtest bridge. */
  public restorePlaytestSnapshot(snapshot: PlaytestSceneSnapshot): void {
    if (!snapshot.safety.branchSafe) {
      throw new Error(
        `Cannot restore unsafe branch save: ${snapshot.safety.unsafeReasons.join('; ')} ` +
        'Start a fresh natural run for this branch.',
      );
    }

    if (this.activeMode) {
      try { this.activeMode.teardown(); } catch {}
      this.activeMode = null;
      this.activeModeBeatIndex = null;
      this.activeModeBackground = false;
    }
    if (this.chaseTimer) {
      this.chaseTimer.remove();
      this.chaseTimer = null;
    }
    this.chaseSprite?.destroy();
    this.chaseShadow?.destroy();
    this.chaseSprite = null;
    this.chaseShadow = null;
    this.chaseActive = false;
    this.chasePursuerId = null;
    this.qteActive = false;
    this.isBossActive = false;
    this.spawnedBoss?.destroy();
    this.spawnedBoss = null;
    this.enemies?.clear(true, true);
    this.enemyProjectiles?.clear(true, true);
    this.projectiles?.clear(true, true);
    this.lootShards?.clear(true, true);
    this.activePowerUpCleanups.forEach(fn => fn());
    this.activePowerUpCleanups = [];
    this.setControlsInverted(false);
    this.clearStoryDialogue();
    this.beatEngine.clearWalkTarget();

    this.warpToScene(snapshot.sceneIndex);
    if (this.player && snapshot.player) {
      this.player.setPosition(snapshot.player.x, snapshot.player.y);
      this.player.setVelocity(snapshot.player.velocityX, snapshot.player.velocityY);
    }
    this.activeHp = snapshot.hp;
    this.onHpChange(snapshot.hp);
    this.shardsCollected = snapshot.shardsCollected;
    this.ledgerTotal = snapshot.ledgerTotal;
    this.onLedgerChange(snapshot.ledgerTotal, 'Restore Quick Save');
    this.actorsSystem.restoreRenderedState(snapshot.actors);
    saveProgressData(snapshot.progress);
    mariaBrookeStats.restore(snapshot.mariaBrookeStats);

    // This cancels the newly-created scene's delayed beat-0 kickoff and then
    // recreates the exact saved dialogue/choice/walk boundary.
    this.restoreBeat(snapshot.beatIndex);
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
    if (this.cache.audio.exists('boss_sting')) {
      // Seek past the initial 0.7s of quiet buildup so the loud 'VWOMP' hits instantly
      this.sound.play('boss_sting', { volume: 1.2 * getSettings().musicVolume, seek: 0.7 });
    }
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

  /** Hard-cut all music to silence (deliberate "the air leaves the room" beat). */
  public stopAllAudio(fadeMs?: number) {
    this.audioController.stopAllAudio(fadeMs);
  }

  public applyLedger(delta: number, note: string) {
    this.ledgerTotal += delta;
    this.onLedgerChange(this.ledgerTotal, note);
    this.showPassiveIconText(this.player.x, this.player.y - 40, `+$${delta.toFixed(2)} — ${note}`, '#fbbf24');
  }

  public runEndChapter() {
    if (!this.chapter.quietEnd) {
      this.player.play('victory_' + this.playerClass.id, true);
      this.cameras.main.flash(400, 200, 232, 154);
    }
    // Fade out stage music and play victory jingle
    if (this.stageMusic?.isPlaying) {
      this.tweens.add({ targets: this.stageMusic, volume: 0, duration: 800 });
    }
    if (!this.chapter.quietEnd) {
      try { this.sound.play('victory_jingle', { volume: 0.6 * getSettings().sfxVolume }); } catch { /* skip */ }
    }
    this.time.delayedCall(1200, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.time.delayedCall(520, () => this.onLevelCompleted({
        shardsCollected: this.shardsCollected,
        ledgerTotal: this.ledgerTotal,
        hpRemaining: this.activeHp,
      }));
    });
  }

  // ─── Actor placement ──────────────────────────────────────────────────────────

  public placeActors() {
    this.actorsSystem.placeActors();
  }

  public hideActor(id: string) {
    this.actorsSystem.hideActor(id);
  }

  public showActor(id: string) {
    this.actorsSystem.showActor(id);
  }

  public moveActor(id: string, x: number, y: number, durationMs: number, onDone?: () => void) {
    this.actorsSystem.moveActor(id, x, y, durationMs, onDone);
  }

  // Dash, weapon, and footstep logic lives in PlayerController (scene/PlayerController.ts).

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

    // Dash i-frames — show a dodge bark but deal no damage.
    if (this.playerController.isInvuln(this.time.now)) {
      const barks = ['AURA +1', 'NaTaKa', 'jestermaxxed', 'SIGMA DODGE', 'main character moment', 'rizz check passed'];
      this.showPassiveIconText(this.player.x, this.player.y - 40, barks[Math.floor(Math.random() * barks.length)] + ' ✨', '#60a5fa');
      return;
    }

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

    let finalDmg = Math.round(damage * DIFFICULTY_MODS[getSettings().difficulty].playerDamageTaken);
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
      this.playerController.cancelAttackAnim();
      this.player.play('hurt_' + this.playerClass.id, true);
    } else {
      this.player.play('defeat_' + this.playerClass.id, true);
    }

    if (finalDmg > 12) {
      this.cameras.main.shake(150, 0.012);
      this.cameras.main.flash(80, 239, 68, 68, true);
      hitStop(this, 70, 0.05);
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
    // Ice particles burst - Performance Optimization
    // Bypassed Arcade Physics entirely with a WebGL ParticleEmitter to eliminate GC churn for visual effects
    const particles = this.add.particles(this.player.x, this.player.y, 'particle_dot', {
      speed: 200,
      lifespan: 600,
      scale: { start: 1.5, end: 0 },
      tint: 0x38bdf8,
      emitting: false
    });
    particles.explode(8);
    this.time.delayedCall(700, () => particles.destroy());
  }

  // ─── Combat Callbacks ─────────────────────────────────────────────────────

  private handleProjectileHitPlayer(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    proj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
  ) {
    (proj as Phaser.GameObjects.GameObject).destroy();
    this.damagePlayer(12, 'Boss Projectile');
  }

  private handleCollectLoot(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    shardObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
  ) {
    const shard = shardObj as Phaser.GameObjects.GameObject;
    const powerUpId = shard.getData('powerUpId') as string | undefined;
    shard.destroy();

    if (powerUpId) {
      this.applyPowerUp(powerUpId);
      return;
    }

    this.shardsCollected += 1;
    const gold = Phaser.Math.Between(15, 35);
    this.activeGold += gold;
    this.onGoldChange(this.activeGold);
    this.showPassiveIconText(this.player.x, this.player.y - 30, `+$${gold} Gold!`, '#10b981');

    if (Math.random() < 0.25) {
      const barks = LORE_BARKS;
      this.onMessageLog(`🔓 "${barks[Math.floor(Math.random() * barks.length)]}"`);
    }
  }

  public applyPowerUp(id: string): void {
    const pu = POWER_UPS.find(p => p.id === id);
    if (!pu) return;

    this.onMessageLog(`✨ POWER-UP: ${pu.name} — ${pu.quote}`);
    this.showBubbleText(this.player, pu.quote.slice(0, 60), '#c4b5fd');
    this.showPassiveIconText(this.player.x, this.player.y - 50, `🎁 ${pu.name}`, '#8b5cf6');

    const cleanup: Array<() => void> = [];

    switch (pu.effectType) {
      case 'invincibility': {
        this.playerController.playerInvulnUntil = this.time.now + pu.durationMs;
        this.player.setTint(0x8b5cf6);
        const timer = this.time.delayedCall(pu.durationMs, () => { this.player.clearTint(); });
        cleanup.push(() => { timer.destroy(); this.player.clearTint(); this.playerController.playerInvulnUntil = 0; });
        break;
      }
      case 'heal': {
        const healed = Math.min(this.playerClass.maxHp, this.activeHp + Math.round(this.playerClass.maxHp * 0.6));
        this.activeHp = healed;
        this.onHpChange(healed);
        this.cameras.main.flash(250, 16, 185, 129);
        break;
      }
      case 'speed_boost': {
        const origSpeed = this.playerClass.speed;
        this.playerClass.speed = Math.round(origSpeed * 2.5);
        // galaxy_gas also inverts controls for the "B12 depleting" joke
        if (pu.id === 'galaxy_gas') this.setControlsInverted(true);
        const timer = this.time.delayedCall(pu.durationMs, () => {
          this.playerClass.speed = origSpeed;
          if (pu.id === 'galaxy_gas') this.setControlsInverted(false);
        });
        cleanup.push(() => { timer.destroy(); this.playerClass.speed = origSpeed; if (pu.id === 'galaxy_gas') this.setControlsInverted(false); });
        break;
      }
      case 'defense_buff': {
        // Double weapon damage by halving cooldown; remove dash cooldown gate.
        const origCooldown = this.playerClass.attack;
        this.playerClass.attack = origCooldown * 2;
        this.playerController.resetDashCooldown();
        const timer = this.time.delayedCall(pu.durationMs, () => { this.playerClass.attack = origCooldown; });
        cleanup.push(() => { timer.destroy(); this.playerClass.attack = origCooldown; });
        break;
      }
      case 'poison_aura': {
        // Tick nearby enemies/boss with periodic AoE damage
        const tickEvent = this.time.addEvent({
          delay: 800,
          loop: true,
          callback: () => {
            const range = 120;
            const targets: Phaser.GameObjects.Sprite[] = this.isBossActive && this.spawnedBoss
              ? [this.spawnedBoss]
              : (this.enemies.getChildren() as Phaser.GameObjects.Sprite[]);
            targets.forEach(t => {
              if (!t.active) return;
              if (Phaser.Math.Distance.Between(this.player.x, this.player.y, t.x, t.y) < range) {
                this.showDamageNumber(t.x, t.y - 20, 8, '#84cc16');
                if (t === this.spawnedBoss) {
                  // Can't call bossFight.damageBoss directly, but a boss projectile-hit workaround exists
                  // — instead just show visual; real damage via projectile overlap is the primary path
                } else {
                  const currHp = (t.getData('hp') as number ?? 0) - 8;
                  t.setData('hp', currHp);
                  if (currHp <= 0) t.destroy();
                }
              }
            });
          }
        });
        this.player.setTint(0x84cc16);
        const timer = this.time.delayedCall(pu.durationMs, () => { tickEvent.destroy(); this.player.clearTint(); });
        cleanup.push(() => { timer.destroy(); tickEvent.destroy(); this.player.clearTint(); });
        break;
      }
      case 'brainrot_clear': {
        this.brainrotLevel = 0;
        this.updateBrainrotHUD();
        this.cameras.main.flash(200, 16, 185, 129);
        break;
      }
    }

    const cleanupAll = () => { cleanup.forEach(fn => fn()); };
    this.activePowerUpCleanups.push(cleanupAll);
  }

  // ─── UI Helpers ───────────────────────────────────────────────────────────

  public showBubbleText(anchor: Phaser.GameObjects.GameObject, text: string, colorHex = '#ffffff') {
    this.atmosphere.showBubbleText(anchor, text, colorHex);
  }

  public showPassiveIconText(x: number, y: number, text: string, color: string) {
    this.atmosphere.showPassiveIconText(x, y, text, color);
  }

  // ─── Phase D: Cinematic helpers ───────────────────────────────────────────

  /** Tween black bars in from top and bottom — "cutscene" signal. */
  public showLetterbox(durationMs = 350) {
    this.atmosphere.showLetterbox(durationMs);
  }

  public hideLetterbox(durationMs = 350) {
    this.atmosphere.hideLetterbox(durationMs);
  }

  /** Tween a full-viewport dark overlay in/out — "night has fallen" cue for a beat sequence. */
  public setScreenTint(color: number, alpha: number, durationMs = 500, onComplete?: () => void) {
    this.atmosphere.setScreenTint(color, alpha, durationMs, onComplete);
  }

  /** Floating damage number rising from a world position. */
  public showDamageNumber(x: number, y: number, amount: number, color: string) {
    this.atmosphere.showDamageNumber(x, y, amount, color);
  }

  // ─── Phase C: Atmosphere ──────────────────────────────────────────────────

  /** BotW-style area title toast — bottom-left, fades in then out. Screen-space. */
  public showAreaTitle(title: string) {
    this.atmosphere.showAreaTitle(title);
  }

}

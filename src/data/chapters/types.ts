import { CHARACTER_CLASSES, NPC_CHARACTERS } from '../entities';
import type { ModeConfigMap } from '../../contracts/mode-configs';

export interface Speaker {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

// Extra speakers that aren't playable heroes or roaming NPCs.
const EXTRA_SPEAKERS: Speaker[] = [
  { id: 'narrator', name: 'The Group Chat', emoji: '💬', color: '#c8e89a' },
  { id: 'narrator_eric', name: 'Eric', emoji: '💬', color: '#c8e89a' },
  { id: 'audrey', name: 'Audrey', emoji: '🇨🇦', color: '#f472b6' },
  { id: 'maharko', name: 'Maharko', emoji: '🏎️', color: '#22d3ee' },
  { id: 'ben', name: 'Ben Bersofsky', emoji: '🧪', color: '#84cc16' },
  { id: 'michael_bersofsky', name: 'Michael Bersofsky', emoji: '🚪', color: '#ef4444' },
  { id: 'emily', name: 'Emily (Spain GF)', emoji: '✈️', color: '#f9a8d4' },
  { id: 'caleb', name: 'Caleb Allentuck', emoji: '🫧', color: '#a78bfa' },
  { id: 'vs', name: 'VS', emoji: '⚔️', color: '#ef4444' },
  { id: 'anastasia', name: 'Anastasia', emoji: '💅', color: '#f472b6' },
  { id: 'sophia', name: 'Sophia', emoji: '🌸', color: '#c084fc' },
  { id: 'sam_ferretti', name: 'Sam Ferretti', emoji: '🤢', color: '#94a3b8' },
  { id: 'sean', name: 'Sean', emoji: '🏃', color: '#6ee7b7' },
  { id: 'alex', name: 'Alex', emoji: '🌴', color: '#fbbf24' },
  { id: 'leo', name: 'Leo', emoji: '🪨', color: '#a3a3a3' },
  { id: 'benji', name: 'Benji', emoji: '🚬', color: '#f97316' },
  { id: 'chris_rivas', name: 'Chris Rivas', emoji: '🍔', color: '#fde047' },
];

export function resolveSpeaker(id: string): Speaker {
  const hero = CHARACTER_CLASSES.find(c => c.id === id);
  if (hero) return { id: hero.id, name: hero.name, emoji: hero.emoji, color: hero.color };
  const npc = NPC_CHARACTERS.find(c => c.id === id);
  if (npc) return { id: npc.id, name: npc.name, emoji: npc.emoji, color: npc.color };
  const extra = EXTRA_SPEAKERS.find(s => s.id === id);
  if (extra) return extra;
  return { id, name: id, emoji: '🗨️', color: '#c8e89a' };
}

// ─── Map config ─────────────────────────────────────────────────────────────────

/** Per-chapter visual theme — drives floor pattern and ambient lighting in Phase C. */
export type MapTheme =
  | 'apartment'
  | 'highway_night'
  | 'hospital'
  | 'park'
  | 'florida'
  | 'suburb_night'
  | 'cabin'
  | 'pool_party'
  | 'void';

export interface MapRect {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: number;
  stroke?: number;
  /**
   * Semantic prop type — drives better procedural rendering when no sprite is
   * loaded. Removing all in-world text labels; this is the source of truth for
   * what a rect *is*.
   */
  propType?: 'couch' | 'tv' | 'desk' | 'counter' | 'sink' | 'fridge' | 'bed'
           | 'rug' | 'door' | 'window' | 'wall' | 'car' | 'tree' | 'road'
           | 'guardrail' | 'tollbooth' | 'firepit' | 'hottub' | 'arcade'
           | 'barrier_arm' | 'cone'
           | 'bench' | 'junglebox';
  /**
   * When a prop sprite sheet is loaded under this key, render the sprite
   * instead of a procedural shape. Physics body remains the same rectangle.
   */
  propKey?: string;
  /** Solid rects become collidable walls/objects. */
  solid?: boolean;
  /** Solid rects with invisible:true get physics but no visual (background image handles the look). */
  invisible?: boolean;
}

export interface RoomLabel {
  x: number;
  y: number;
  name: string;
  detail: string;
  color: string;
}

export interface MapConfig {
  width: number;
  height: number;
  /** Floor / ground colour the whole map (and the overscan beyond it) sits on. */
  backdrop: number;
  /** Visual theme — selects floor pattern and ambient settings. */
  theme?: MapTheme;
  /** Shown as a fading area-title toast when the chapter starts (replaces permanent room signs). */
  areaTitle?: string;
  /**
   * Suppress the procedural nature scatter (flowers/bushes) that outdoor themes
   * (park/cabin/florida/etc.) normally get. Set this on an indoor scene that
   * reuses an outdoor-flavored theme (e.g. 'cabin' for lighting/floor grade)
   * purely for its ambience, so wild flora doesn't render inside a building.
   */
  noNatureScatter?: boolean;
  rects: MapRect[];
  labels: RoomLabel[];
  playerSpawn: { x: number; y: number };
  composition?: {
    allowPlayerOutsideRoom?: boolean;
    focusRect?: { x: number; y: number; width: number; height: number };
  };
}

// ─── Actors ──────────────────────────────────────────────────────────────────────

export interface ActorPlacement {
  /** Matches a hero id (uses processed sheet) or any id (falls back to a tinted blob). */
  id: string;
  x: number;
  y: number;
  /** Override the displayed nameplate (defaults to the resolved speaker name). */
  nameOverride?: string;
  /**
   * Explicit texture/sheet key to render this actor with, used when the actor id
   * has no `hero_<id>_sheet` of its own (e.g. reusing `enemy_frat_bro_sheet` for
   * frat extras). Falls back to `hero_<id>_sheet`, then a tinted blob.
   */
  spriteKey?: string;
  /** Render scale for the sprite (defaults to 0.5). Use to size oversized art
   *  such as a tall silhouette down to NPC height. */
  spriteScale?: number;
  /**
   * If the player's chosen hero matches `id`, place this character's sprite at
   * the same position instead of leaving the slot empty (R5 roster presence).
   */
  understudyId?: string;
}

// ─── Beats ─────────────────────────────────────────────────────────────────────

export interface ChoiceOption {
  text: string;
  /** Dollars added to the running Ledger gag when chosen. */
  ledgerDelta?: number;
  /** Lines spoken in reaction to this choice before the story continues. */
  reactionSpeaker?: string;
  reactionLines?: string[];
  /** Jump to the beat with this id instead of falling through. */
  goto?: string;
  /** Custom side-effect ID to trigger when this option is selected. */
  sideEffect?: string;
}

export type Beat = { id?: string } & (
  | { type: 'dialogue'; speaker: string; lines: string[] }
  | { type: 'choice'; speaker: string; prompt: string; options: ChoiceOption[] }
  | { type: 'walkTo'; x: number; y: number; radius?: number; markerLabel?: string }
  | { type: 'cameraPan'; x: number; y: number; durationMs: number; holdMs?: number; resumeFollow?: boolean }
  | { type: 'hideActor'; id: string }
  | { type: 'showActor'; id: string }
  | { type: 'moveActor'; id: string; x: number; y: number; durationMs: number }
  | { type: 'bossFight'; bossId: string; arena: { x: number; y: number; w: number; h: number }; hideActorId?: string; introLines?: string[] }
  | {
      [K in Exclude<keyof ModeConfigMap, 'bossFight'>]: {
        type: 'minigame';
        modeId: K;
        config?: ModeConfigMap[K];
        introLines?: string[];
        background?: boolean;
        loseGoto?: string;
      }
    }[Exclude<keyof ModeConfigMap, 'bossFight'>]
  | { type: 'routeOnMinigame'; cases: Record<string, string>; default?: string }
  | { type: 'chase'; pursuerId: string; durationMs: number }
  | { type: 'sfx'; key: string; volume?: number; seek?: number }
  | { type: 'wait'; ms: number }
  | { type: 'ledger'; delta: number; note: string }
  | { type: 'stopAllAudio'; fadeMs?: number }
  | { type: 'screenTint'; color: number; alpha: number; durationMs?: number }
  | { type: 'changeScene'; sceneIndex: number; transitionMs?: number }
  | { type: 'changeMusic'; key: string; fadeMs?: number }
  | { type: 'endChapter' }
);

// ─── Chapter ─────────────────────────────────────────────────────────────────────

/** A single location within a chapter — map layout + who's present. */
export interface ChapterSceneConfig {
  map: MapConfig;
  actors: ActorPlacement[];
  /** Phaser audio key for this scene's stage music. Overrides the chapter-level
   *  CHAPTER_MUSIC_KEY when set. Crossfades on changeScene. */
  music?: string;
}

export interface ChapterConfig {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  location: string;
  description: string;
  kind: 'chapter' | 'interlude' | 'epilogue' | 'flashback';
  /** Force a specific protagonist for this chapter regardless of crew pick. */
  protagonistOverride?: string;
  /** Single-map chapters: use map + actors directly. Multi-location chapters: use scenes[]. */
  map: MapConfig;
  actors: ActorPlacement[];
  /**
   * Optional multi-scene override. If present, scenes[0] is used as the initial location.
   * A `changeScene` beat transitions to scenes[N].
   * scenes[] takes precedence over the top-level map/actors fields when present.
   */
  scenes?: ChapterSceneConfig[];
  beats: Beat[];
  cameraZoom?: number;
  /** Suppress the end-of-chapter victory celebration (jingle, flash, victory anim).
   *  The chapter fades out silently. */
  quietEnd?: boolean;
  /**
   * Renders as a redacted/CLASSIFIED card on the chapter-select screen that
   * must have its seal broken (two clicks: intact -> cracked -> broken)
   * before it can be played. The agent CLI auto-breaks the seal for these
   * chapters when driving them (see `navigateToChapter`'s `classified` option
   * in e2e_tests/helpers.ts and cli.ts's auto-detection off this field).
   */
  classified?: boolean;
  usePoolSheet?: boolean;
  ambientSfx?: { onDoor?: string };
  chaseTextureSwaps?: Array<{ propKey: string; targetTexture: string; fallbackTexture?: string }>;
  poolNameplatesConfigs?: Array<{ id: string; key: string; startHidden?: boolean }>;
}

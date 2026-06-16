import { CHARACTER_CLASSES, NPC_CHARACTERS } from '../entities';

export interface Speaker {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

// Extra speakers that aren't playable heroes or roaming NPCs.
const EXTRA_SPEAKERS: Speaker[] = [
  { id: 'narrator', name: 'The Group Chat', emoji: '💬', color: '#c8e89a' },
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
  | 'cabin';

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
  /** @deprecated Legacy label field — ignored by renderer since Phase B. Use propType instead. */
  tag?: string;
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
  rects: MapRect[];
  labels: RoomLabel[];
  playerSpawn: { x: number; y: number };
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
}

export type Beat = { id?: string } & (
  | { type: 'dialogue'; speaker: string; lines: string[] }
  | { type: 'choice'; speaker: string; prompt: string; options: ChoiceOption[] }
  | { type: 'walkTo'; x: number; y: number; radius?: number; markerLabel?: string }
  | { type: 'cameraPan'; x: number; y: number; durationMs: number; holdMs?: number }
  | { type: 'bossFight'; bossId: string; arena: { x: number; y: number; w: number; h: number }; introLines?: string[] }
  | { type: 'minigame'; modeId: string; config?: unknown; introLines?: string[]; background?: boolean }
  | { type: 'chase'; pursuerId: string; durationMs: number }
  | { type: 'wait'; ms: number }
  | { type: 'ledger'; delta: number; note: string }
  | { type: 'endChapter' }
);

// ─── Chapter ─────────────────────────────────────────────────────────────────────

export interface ChapterConfig {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  location: string;
  description: string;
  kind: 'chapter' | 'interlude' | 'epilogue';
  /** Force a specific protagonist for this chapter regardless of crew pick. */
  protagonistOverride?: string;
  map: MapConfig;
  actors: ActorPlacement[];
  beats: Beat[];
  cameraZoom?: number;
  usePoolSheet?: boolean;
  ambientSfx?: { onDoor?: string };
  chaseTextureSwaps?: Array<{ propKey: string; targetTexture: string; fallbackTexture?: string }>;
  poolNameplatesConfigs?: Array<{ id: string; key: string; startHidden?: boolean }>;
}

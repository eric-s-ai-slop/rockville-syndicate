// Unified persistence layer (save schema v2).
//
// This module is the SINGLE source of truth for everything we persist: player
// settings (audio, accessibility, difficulty), story progress, AND Hall of
// Records run history. All live in one versioned localStorage blob
// (`omega-save-v2`) so we never again drift into the four-fragmented-keys
// situation the v1 build had.
//
// Design notes:
// - A module-level singleton holds the parsed save in memory. Reads are cheap and
//   synchronous; writes update the cache, persist, then notify subscribers.
// - `useSettings()` is the React entry point (built on useSyncExternalStore so it
//   is StrictMode- and concurrent-safe). Phaser code reads the same singleton via
//   `getSettings()` and can subscribe via `subscribeSettings()`.
// - On first load with no v2 blob, we migrate the legacy v1 keys, then write v2.
//   Corrupt JSON anywhere falls back to defaults rather than throwing.

import { useSyncExternalStore } from 'react';
import type { RunRecord } from './scoring';

export type Difficulty = 'easy' | 'normal' | 'hard';
export type TextScale = 1 | 1.25 | 1.5;

export interface Settings {
  /** Master gain applied on top of music/sfx, 0..1. */
  masterVolume: number;
  /** Stage/boss music gain, 0..1. */
  musicVolume: number;
  /** UI + gameplay sound-effect gain, 0..1. */
  sfxVolume: number;
  /** Hard mute — silences everything regardless of the volume sliders. */
  muted: boolean;
  textScale: TextScale;
  /** Per-character dialogue reveal speed in ms (lower = faster). */
  textSpeedMs: number;
  difficulty: Difficulty;
  colorBlind: boolean;
  /** Honor prefers-reduced-motion: dampen screen shake, flashes, big tweens. */
  reduceMotion: boolean;
}

/** Story progress — was the `omega-progress-v1` blob in the legacy build. */
export interface ProgressData {
  completedChapters: string[];
  hero?: string;
  /** When true, all chapters are selectable regardless of completion order. */
  freePlay?: boolean;
  /** Chapter-specific story flag (Rose's silence ending). */
  rose_silence?: boolean;
  /** Hall of Records: up to 100 most-recent run records (newest first). */
  runRecords?: RunRecord[];
  /** Per-chapter personal best score, keyed by chapterId. */
  chapterBests?: Record<string, number>;
}

interface SaveV2 {
  version: 2;
  settings: Settings;
  progress: ProgressData;
}

const SAVE_KEY = 'omega-save-v2';

// Legacy v1 keys — read once during migration, then left in place as a harmless
// backup. Do not write to these anymore.
const LEGACY_PROGRESS_KEY = 'omega-progress-v1';
const LEGACY_MUTED_KEY = 'omega-muted';
const LEGACY_COLORBLIND_KEY = 'omega-colorblind';
const LEGACY_TEXTSCALE_KEY = 'omega-textscale';

export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 1,
  musicVolume: 1,
  sfxVolume: 1,
  muted: false,
  textScale: 1,
  textSpeedMs: 28,
  difficulty: 'normal',
  colorBlind: false,
  reduceMotion: false,
};

const DEFAULT_PROGRESS: ProgressData = { completedChapters: [] };

// ── Sanitizers ──────────────────────────────────────────────────────────────
// Every value that crosses the storage boundary is clamped/validated so a hand-
// edited or partially-written blob can never inject a bad type downstream.

function clamp01(n: unknown, fallback: number): number {
  return typeof n === 'number' && isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback;
}

function asTextScale(v: unknown): TextScale {
  return v === 1.5 || v === '1.5' ? 1.5 : v === 1.25 || v === '1.25' ? 1.25 : 1;
}

function asDifficulty(v: unknown): Difficulty {
  return v === 'easy' || v === 'hard' ? v : 'normal';
}

function sanitizeSettings(raw: unknown): Settings {
  const s = (raw ?? {}) as Partial<Settings>;
  return {
    masterVolume: clamp01(s.masterVolume, DEFAULT_SETTINGS.masterVolume),
    musicVolume: clamp01(s.musicVolume, DEFAULT_SETTINGS.musicVolume),
    sfxVolume: clamp01(s.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
    muted: typeof s.muted === 'boolean' ? s.muted : DEFAULT_SETTINGS.muted,
    textScale: asTextScale(s.textScale),
    textSpeedMs:
      typeof s.textSpeedMs === 'number' && isFinite(s.textSpeedMs)
        ? Math.max(0, Math.min(200, s.textSpeedMs))
        : DEFAULT_SETTINGS.textSpeedMs,
    difficulty: asDifficulty(s.difficulty),
    colorBlind: typeof s.colorBlind === 'boolean' ? s.colorBlind : DEFAULT_SETTINGS.colorBlind,
    reduceMotion:
      typeof s.reduceMotion === 'boolean' ? s.reduceMotion : DEFAULT_SETTINGS.reduceMotion,
  };
}

function sanitizeRunRecord(r: unknown): RunRecord | null {
  if (!r || typeof r !== 'object') return null;
  const rec = r as Partial<RunRecord>;
  if (typeof rec.chapterId !== 'string' || typeof rec.heroId !== 'string') return null;
  if (typeof rec.score !== 'number' || !isFinite(rec.score)) return null;
  return {
    chapterId: rec.chapterId,
    heroId: rec.heroId,
    score: Math.max(0, Math.round(rec.score)),
    shardsCollected: typeof rec.shardsCollected === 'number' ? Math.max(0, rec.shardsCollected) : 0,
    ledgerTotal: typeof rec.ledgerTotal === 'number' ? rec.ledgerTotal : 0,
    hpRemaining: typeof rec.hpRemaining === 'number' ? rec.hpRemaining : 0,
    difficulty: rec.difficulty === 'easy' || rec.difficulty === 'hard' ? rec.difficulty : 'normal',
    date: typeof rec.date === 'string' ? rec.date : new Date().toISOString(),
  };
}

function sanitizeProgress(raw: unknown): ProgressData {
  const p = (raw ?? {}) as Partial<ProgressData>;

  const runRecords: RunRecord[] = Array.isArray(p.runRecords)
    ? (p.runRecords.map(sanitizeRunRecord).filter(Boolean) as RunRecord[])
    : [];

  const rawBests = p.chapterBests;
  const chapterBests: Record<string, number> = {};
  if (rawBests && typeof rawBests === 'object') {
    for (const [k, v] of Object.entries(rawBests)) {
      if (typeof v === 'number' && isFinite(v)) chapterBests[k] = Math.max(0, Math.round(v));
    }
  }

  return {
    completedChapters: Array.isArray(p.completedChapters)
      ? p.completedChapters.filter((c): c is string => typeof c === 'string')
      : [],
    hero: typeof p.hero === 'string' ? p.hero : undefined,
    freePlay: typeof p.freePlay === 'boolean' ? p.freePlay : false,
    rose_silence: typeof p.rose_silence === 'boolean' ? p.rose_silence : false,
    runRecords,
    chapterBests,
  };
}

// ── Migration ─────────────────────────────────────────────────────────────────

function readLegacy(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Build a v2 save from the four legacy keys. Missing keys fall back to defaults. */
function migrateFromLegacy(): SaveV2 {
  let progress = DEFAULT_PROGRESS;
  const legacyProgress = readLegacy(LEGACY_PROGRESS_KEY);
  if (legacyProgress) {
    try {
      progress = sanitizeProgress(JSON.parse(legacyProgress));
    } catch {
      progress = DEFAULT_PROGRESS;
    }
  }

  const settings = sanitizeSettings({
    ...DEFAULT_SETTINGS,
    muted: readLegacy(LEGACY_MUTED_KEY) === 'true',
    colorBlind: readLegacy(LEGACY_COLORBLIND_KEY) === 'true',
    textScale: asTextScale(readLegacy(LEGACY_TEXTSCALE_KEY)),
  });

  return { version: 2, settings, progress };
}

/** Parse the v2 blob, or migrate, or fall back to defaults. Never throws. */
function readSave(): SaveV2 {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    // localStorage unavailable (private mode / SSR) — pure-default, no persist.
    return { version: 2, settings: { ...DEFAULT_SETTINGS }, progress: { ...DEFAULT_PROGRESS } };
  }

  if (!raw) {
    const migrated = migrateFromLegacy();
    writeSave(migrated); // persist the migrated shape so we only migrate once
    return migrated;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SaveV2>;
    return {
      version: 2,
      settings: sanitizeSettings(parsed.settings),
      progress: sanitizeProgress(parsed.progress),
    };
  } catch {
    // Corrupt blob — defaults, no crash. Overwrite so the corruption clears.
    const fresh: SaveV2 = {
      version: 2,
      settings: { ...DEFAULT_SETTINGS },
      progress: { ...DEFAULT_PROGRESS },
    };
    writeSave(fresh);
    return fresh;
  }
}

function writeSave(save: SaveV2): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // ignore (private mode / quota) — persistence is a nicety, not load-bearing
  }
}

// ── Singleton store + pub/sub ───────────────────────────────────────────────

let cache: SaveV2 = readSave();
const listeners = new Set<() => void>();

function notify(): void {
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ── Public API: settings ────────────────────────────────────────────────────

export function getSettings(): Settings {
  return cache.settings;
}

export function saveSettings(next: Settings): void {
  cache = { ...cache, settings: sanitizeSettings(next) };
  writeSave(cache);
  notify();
}

/** Patch a subset of settings; unspecified fields are preserved. */
export function updateSettings(partial: Partial<Settings>): Settings {
  cache = { ...cache, settings: sanitizeSettings({ ...cache.settings, ...partial }) };
  writeSave(cache);
  notify();
  return cache.settings;
}

/** Subscribe to settings changes (returns an unsubscribe fn). For Phaser/non-React code. */
export const subscribeSettings = subscribe;

/**
 * The effective music gain after master + mute are folded in (0 when muted).
 * Multiply your per-track target by this. SFX uses {@link effectiveSfxVolume}.
 */
export function effectiveMusicVolume(s: Settings = cache.settings): number {
  return s.muted ? 0 : s.masterVolume * s.musicVolume;
}

export function effectiveSfxVolume(s: Settings = cache.settings): number {
  return s.muted ? 0 : s.masterVolume * s.sfxVolume;
}

// ── React hook ──────────────────────────────────────────────────────────────

/** Subscribe a React component to the live settings object. */
export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, getSettings);
}

// ── Public API: progress (used by progress.ts) ──────────────────────────────

export function getProgress(): ProgressData {
  return cache.progress;
}

export function saveProgressData(next: ProgressData): void {
  cache = { ...cache, progress: sanitizeProgress(next) };
  writeSave(cache);
  notify();
}

// ── Public API: Hall of Records ─────────────────────────────────────────────

/**
 * Append a run record to history (capped at 100 entries) and update the
 * per-chapter personal best if this score is higher. Returns the new best.
 */
export function saveRunRecord(record: RunRecord): number {
  const prog = cache.progress;
  const existing = prog.runRecords ?? [];
  const bests = { ...(prog.chapterBests ?? {}) };
  const prev = bests[record.chapterId] ?? 0;
  const newBest = Math.max(prev, record.score);
  bests[record.chapterId] = newBest;
  const next: ProgressData = {
    ...prog,
    runRecords: [record, ...existing].slice(0, 100),
    chapterBests: bests,
  };
  saveProgressData(next);
  return newBest;
}

/** Return the personal best score for a chapter (0 if never played). */
export function getChapterBest(chapterId: string): number {
  return cache.progress.chapterBests?.[chapterId] ?? 0;
}

/** Return all run records (newest first). */
export function getRunRecords(): RunRecord[] {
  return cache.progress.runRecords ?? [];
}

// ── Test seam ───────────────────────────────────────────────────────────────

/** Re-read from localStorage and refresh the cache. Tests use this after seeding keys. */
export function _reloadFromStorage(): void {
  cache = readSave();
  notify();
}

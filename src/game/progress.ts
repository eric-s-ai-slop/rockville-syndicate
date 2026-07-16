// Persistent chapter progress. As of save-schema-v2 this is a thin facade over
// the unified store in `settings.ts` — progress now lives in the single
// `omega-save-v2` blob alongside player settings. The public API here is
// unchanged so existing callers keep working.

import { CHAPTERS } from '../data/chapters';
import { getProgress, saveProgressData, type ProgressData } from './settings';

export type Progress = ProgressData;

export function loadProgress(): Progress {
  // Return a copy so callers can't mutate the cached store in place.
  return { ...getProgress() };
}

export function saveProgress(progress: Progress): void {
  saveProgressData(progress);
}

export function markChapterComplete(chapterId: string): Progress {
  const progress = loadProgress();
  if (!progress.completedChapters.includes(chapterId)) {
    progress.completedChapters = [...progress.completedChapters, chapterId];
  }
  saveProgress(progress);
  return progress;
}

export function setRoseSilence(): void {
  const progress = loadProgress();
  progress.rose_silence = true;
  saveProgress(progress);
}

export function rememberHero(heroId: string): void {
  const progress = loadProgress();
  progress.hero = heroId;
  saveProgress(progress);
}

export function resetProgress(): void {
  // Clear story progress but preserve hero/settings continuity is not desired
  // here — a full story reset wipes progress fields to defaults.
  saveProgress({ completedChapters: [] });
}

/**
 * A chapter is unlocked if it's the first, the previous shipping chapter is
 * complete, or freePlay is on. Non-shipping chapters never gate player content.
 */
export function isChapterUnlocked(chapterId: string, completed: string[], freePlay = false): boolean {
  if (freePlay) return true;
  const idx = CHAPTERS.findIndex(c => c.id === chapterId);
  if (idx <= 0) return true;
  const prev = CHAPTERS.slice(0, idx).reverse().find(chapter => chapter.deployment === 'shipping');
  if (!prev) return true;
  return completed.includes(prev.id);
}

export function setFreePlay(enabled: boolean): Progress {
  const progress = loadProgress();
  progress.freePlay = enabled;
  saveProgress(progress);
  return progress;
}

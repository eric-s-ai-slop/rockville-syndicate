// Persistent chapter progress, stored in localStorage so the story remembers
// how far the player has gotten between sessions.

import { CHAPTERS } from '../data/chapters';

const KEY = 'omega-progress-v1';

export interface Progress {
  completedChapters: string[];
  hero?: string;
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { completedChapters: [] };
    const parsed = JSON.parse(raw) as Progress;
    return {
      completedChapters: Array.isArray(parsed.completedChapters) ? parsed.completedChapters : [],
      hero: typeof parsed.hero === 'string' ? parsed.hero : undefined,
    };
  } catch {
    return { completedChapters: [] };
  }
}

export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // ignore (private mode / quota) — progress is a nicety, not load-bearing
  }
}

export function markChapterComplete(chapterId: string): Progress {
  const progress = loadProgress();
  if (!progress.completedChapters.includes(chapterId)) {
    progress.completedChapters.push(chapterId);
  }
  saveProgress(progress);
  return progress;
}

export function rememberHero(heroId: string): void {
  const progress = loadProgress();
  progress.hero = heroId;
  saveProgress(progress);
}

export function resetProgress(): void {
  saveProgress({ completedChapters: [] });
}

/** A chapter is unlocked if it's the first, or the previous chapter is complete. */
export function isChapterUnlocked(chapterId: string, completed: string[]): boolean {
  const idx = CHAPTERS.findIndex(c => c.id === chapterId);
  if (idx <= 0) return true;
  const prev = CHAPTERS[idx - 1];
  return completed.includes(prev.id);
}

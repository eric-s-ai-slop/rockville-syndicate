import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => {
  return {
    default: {
      Scene: class {},
      GameObjects: {
        Sprite: class {},
        Image: class {},
        Text: class {}
      }
    }
  };
});

import { ALL_CHAPTERS, CHAPTERS, PRODUCTION_CHAPTERS, PRODUCTION_CHAPTER_MANIFEST } from './chapters';
import { BOSSES } from './entities';
import { getMode } from '../game/modes';
import { CHAPTER_MUSIC_KEY } from '../game/audio';

// Chapters that intentionally play no stage music. Keep this list short and
// justified — it is the escape hatch for the music-coverage check below.
// origins: cold open is scored by room tone; music enters per-scene at scenes[1]
const INTENTIONALLY_SILENT = new Set<string>(['origins']);

describe('chapters data', () => {
  it('should have chapters defined', () => {
    expect(CHAPTERS).toBeDefined();
    expect(CHAPTERS.length).toBeGreaterThan(0);
  });

  it('chapter ids should be unique', () => {
    expect(new Set(CHAPTERS.map(chapter => chapter.id)).size).toBe(CHAPTERS.length);
  });

  it('classifies every chapter and keeps the production manifest shipping-only', () => {
    expect(ALL_CHAPTERS.every(chapter => ['shipping', 'development', 'internal'].includes(chapter.deployment))).toBe(true);
    expect(PRODUCTION_CHAPTERS.every(chapter => chapter.deployment === 'shipping')).toBe(true);
    expect(PRODUCTION_CHAPTER_MANIFEST.map(chapter => chapter.id)).toEqual(PRODUCTION_CHAPTERS.map(chapter => chapter.id));
    expect(PRODUCTION_CHAPTER_MANIFEST.some(chapter => chapter.id === 'fixture-playtest')).toBe(false);
  });

  it('keeps flashback chapters grouped before the main story', () => {
    const firstMainStoryIndex = CHAPTERS.findIndex(chapter => chapter.kind !== 'flashback');
    expect(firstMainStoryIndex).toBeGreaterThan(0);
    expect(CHAPTERS.slice(0, firstMainStoryIndex).map(chapter => chapter.id)).toContain('bens_life');
    expect(CHAPTERS.slice(firstMainStoryIndex).some(chapter => chapter.kind === 'flashback')).toBe(false);
  });

  it('chapters should have valid properties', () => {
    CHAPTERS.forEach(chapter => {
      expect(chapter).toHaveProperty('id');
      expect(chapter).toHaveProperty('title');
      expect(chapter).toHaveProperty('beats');
    });
  });

  it('every registered chapter has a positive playtime estimate', () => {
    CHAPTERS.forEach(chapter => {
      const estimate = chapter.estimatedMinutes;
      expect(estimate, `${chapter.id} should declare estimatedMinutes`).toBeDefined();
      expect(estimate!.min, `${chapter.id} should have a positive minimum`).toBeGreaterThan(0);
      expect(estimate!.max, `${chapter.id} should have a maximum >= minimum`).toBeGreaterThanOrEqual(estimate!.min);
    });
  });

  it('all chapter beats should be valid and resolve dependencies', () => {
    CHAPTERS.forEach(chapter => {
      // 1. Gather all beat IDs inside the chapter for goto resolution
      const beatIds = new Set<string>();
      chapter.beats.forEach(beat => {
        if (beat.id) beatIds.add(beat.id);
      });

      // 2. Iterate through all beats to validate minigames, bossFights, and gotos
      chapter.beats.forEach((beat, idx) => {
        const pathContext = `Chapter ${chapter.id} [${chapter.title}] Beat index ${idx}`;

        // Assert minigames reference a registered modeId
        if (beat.type === 'minigame') {
          const mode = getMode(beat.modeId);
          expect(mode, `${pathContext} references unknown minigame modeId: "${beat.modeId}"`).toBeDefined();
        }

        // Assert bossFight beats reference a valid bossId
        if (beat.type === 'bossFight') {
          const boss = BOSSES.find(b => b.id === beat.bossId);
          expect(boss, `${pathContext} references unknown bossId: "${beat.bossId}"`).toBeDefined();
        }

        // Assert goto references resolve to a real beat id in the same chapter
        if (beat.type === 'choice') {
          beat.options.forEach((opt, optIdx) => {
            if (opt.goto) {
              expect(beatIds.has(opt.goto), `${pathContext} Choice Option ${optIdx} ("${opt.text}") has dangling goto: "${opt.goto}"`).toBe(true);
            }
          });
        }
      });
    });
  });

  // Every chapter must resolve to a stage-music track, or be explicitly
  // allowlisted as silent. Music comes from the chapter-level key or, for
  // multi-scene chapters, scenes[0].music — mirroring AudioController's lookup
  // (`CHAPTER_MUSIC_KEY[id] ?? scenes?.[0]?.music`). This catches the class of
  // bug where a chapter ships playing nothing (e.g. rose_florida).
  it('every chapter resolves to stage music (or is explicitly silent)', () => {
    CHAPTERS.forEach(chapter => {
      const hasChapterMusic = !!CHAPTER_MUSIC_KEY[chapter.id];
      const hasSceneMusic = !!chapter.scenes?.[0]?.music;
      const isSilent = INTENTIONALLY_SILENT.has(chapter.id);
      expect(
        hasChapterMusic || hasSceneMusic || isSilent,
        `Chapter "${chapter.id}" [${chapter.title}] has no stage music: add a CHAPTER_MUSIC_KEY entry, set scenes[0].music, or add it to INTENTIONALLY_SILENT.`
      ).toBe(true);
    });
  });

  // The choice-goto check above covers one of several beat fields that point at
  // other beat ids. minigame.loseGoto and routeOnMinigame.cases/default are the
  // others — a typo there silently dead-ends a run, so validate them too.
  it('all beat-to-beat references (loseGoto, routeOnMinigame) resolve', () => {
    CHAPTERS.forEach(chapter => {
      const beatIds = new Set<string>();
      chapter.beats.forEach(beat => { if (beat.id) beatIds.add(beat.id); });

      chapter.beats.forEach((beat, idx) => {
        const ctx = `Chapter ${chapter.id} [${chapter.title}] Beat index ${idx}`;

        if (beat.type === 'minigame' && beat.loseGoto) {
          expect(beatIds.has(beat.loseGoto), `${ctx} has dangling loseGoto: "${beat.loseGoto}"`).toBe(true);
        }

        if (beat.type === 'routeOnMinigame') {
          Object.entries(beat.cases).forEach(([key, target]) => {
            expect(beatIds.has(target), `${ctx} routeOnMinigame case "${key}" has dangling target: "${target}"`).toBe(true);
          });
          if (beat.default) {
            expect(beatIds.has(beat.default), `${ctx} routeOnMinigame default has dangling target: "${beat.default}"`).toBe(true);
          }
        }
      });
    });
  });
});

import { describe, expect, it } from 'vitest';
import { deriveCoverageManifest } from './coverageManifest';
import { CHAPTERS } from '../../src/data/chapters';
import type { ChapterConfig } from '../../src/data/chapters/types';

// Minimal, valid MapConfig shared by every synthetic chapter below — content
// doesn't matter for deriveCoverageManifest (it only reads chapter.beats and
// chapter.scenes), but the type requires a full ChapterConfig.
const MINIMAL_MAP = {
  width: 100,
  height: 100,
  backdrop: 0x000000,
  rects: [],
  labels: [],
  playerSpawn: { x: 0, y: 0 },
};

function makeChapter(overrides: Partial<ChapterConfig> & Pick<ChapterConfig, 'beats'>): ChapterConfig {
  return {
    id: 'synthetic',
    index: 0,
    deployment: 'development',
    title: 'Synthetic',
    subtitle: '',
    location: '',
    description: '',
    kind: 'chapter',
    map: MINIMAL_MAP,
    actors: [],
    ...overrides,
  };
}

describe('deriveCoverageManifest — synthetic chapter', () => {
  it('counts every beat shape, including goto-only branch blocks, and defaults scenes to 1', () => {
    const chapter = makeChapter({
      beats: [
        { type: 'dialogue', speaker: 'narrator', lines: ['hi'] },
        {
          type: 'choice',
          speaker: 'narrator',
          prompt: 'pick one',
          options: [
            { text: 'a' },
            { text: 'b' },
            { text: 'c', goto: 'branch' },
          ],
        },
        { id: 'rejoin', type: 'dialogue', speaker: 'narrator', lines: ['back on track'] },
        { type: 'walkTo', x: 1, y: 1 },
        { type: 'minigame', modeId: 'benTrivia' },
        { type: 'minigame', modeId: 'poolParty', background: true },
        { type: 'bossFight', bossId: 'boss_eric', arena: { x: 0, y: 0, w: 1, h: 1 } },
        { type: 'endChapter' },
        // Unreachable by fall-through (after endChapter) — only reachable via
        // option c's goto above. Still counted: the manifest is an upper
        // bound, not a reachability trace.
        { id: 'branch', type: 'walkTo', x: 2, y: 2 },
        {
          type: 'choice',
          speaker: 'narrator',
          prompt: 'converge',
          options: [{ text: 'continue', goto: 'rejoin' }],
        },
      ],
    });

    expect(deriveCoverageManifest(chapter)).toEqual({
      choiceBeats: 2,
      choiceOptions: 4,
      foregroundModes: 2,
      backgroundModes: 1,
      walkTargets: 2,
      scenes: 1,
      hasEndChapter: true,
    });
  });

  it('counts scenes from chapter.scenes.length when present', () => {
    const chapter = makeChapter({
      beats: [{ type: 'endChapter' }],
      scenes: [
        { map: MINIMAL_MAP, actors: [] },
        { map: MINIMAL_MAP, actors: [] },
        { map: MINIMAL_MAP, actors: [] },
      ],
    });
    expect(deriveCoverageManifest(chapter).scenes).toBe(3);
  });

  it('returns all-zero counts and hasEndChapter false for a chapter with no beats', () => {
    const chapter = makeChapter({ beats: [] });
    expect(deriveCoverageManifest(chapter)).toEqual({
      choiceBeats: 0,
      choiceOptions: 0,
      foregroundModes: 0,
      backgroundModes: 0,
      walkTargets: 0,
      scenes: 1,
      hasEndChapter: false,
    });
  });
});

describe('deriveCoverageManifest — real CHAPTERS list', () => {
  it('every shipped/registered chapter has hasEndChapter true', () => {
    for (const chapter of CHAPTERS) {
      expect(deriveCoverageManifest(chapter).hasEndChapter, `${chapter.title} should end with endChapter`).toBe(true);
    }
  });

  it('every chapter has non-negative totals and at least one scene', () => {
    for (const chapter of CHAPTERS) {
      const manifest = deriveCoverageManifest(chapter);
      expect(manifest.choiceBeats).toBeGreaterThanOrEqual(0);
      expect(manifest.choiceOptions).toBeGreaterThanOrEqual(0);
      expect(manifest.foregroundModes).toBeGreaterThanOrEqual(0);
      expect(manifest.backgroundModes).toBeGreaterThanOrEqual(0);
      expect(manifest.walkTargets).toBeGreaterThanOrEqual(0);
      expect(manifest.scenes).toBeGreaterThanOrEqual(1);
    }
  });

  it('choiceOptions is at least choiceBeats for every chapter (every choice has >=1 option)', () => {
    for (const chapter of CHAPTERS) {
      const manifest = deriveCoverageManifest(chapter);
      expect(manifest.choiceOptions).toBeGreaterThanOrEqual(manifest.choiceBeats);
    }
  });

  // Registered in DEV/test contexts (src/data/chapters/index.ts's INCLUDE_FIXTURES
  // gate) — verified numbers against src/data/chapters/chapterFixture.playtest.ts:
  // one foreground `minigame` (benTrivia) + one `bossFight` (boss_eric) = 2
  // foregroundModes; one background `minigame` (poolParty) = 1 backgroundModes;
  // the main choice + the actor-state save boundary + the branch-block's
  // single-option converge choice + the background-mode save-safety boundary
  // = 4 choiceBeats; one `walkTo` = 1 walkTargets; top-level `scenes: [...]`
  // has 2 entries.
  it('the fixture chapter (fixture-playtest) matches its known beat vocabulary', () => {
    const fixture = CHAPTERS.find((c) => c.id === 'fixture-playtest');
    expect(fixture, 'fixture-playtest should be registered in this (non-production) test context').toBeDefined();
    expect(deriveCoverageManifest(fixture!)).toEqual({
      choiceBeats: 4,
      choiceOptions: 7,
      foregroundModes: 2,
      backgroundModes: 1,
      walkTargets: 1,
      scenes: 2,
      hasEndChapter: true,
    });
  });
});

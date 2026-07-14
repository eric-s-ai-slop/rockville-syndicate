import { describe, expect, it } from 'vitest';
import { CHAPTERS, themeCapabilities, validateAllChapterMaps, validateCameraComposition, validateChapterMaps } from './index';

describe('chapter map validation', () => {
  it('defines capabilities for every map theme', () => {
    for (const chapter of CHAPTERS) {
      const maps = chapter.scenes?.map((scene) => scene.map) ?? [chapter.map];
      for (const map of maps) if (map.theme) expect(themeCapabilities[map.theme]).toBeDefined();
    }
  });

  it('keeps all registered maps, spawns, rects, and targets in bounds', () => {
    expect(validateAllChapterMaps(CHAPTERS)).toEqual([]);
  });

  it('reports invalid dimensions and spawns', () => {
    const chapter = structuredClone(CHAPTERS[0]);
    const map = chapter.scenes?.[0]?.map ?? chapter.map;
    map.width = -1;
    map.playerSpawn.x = 99999;
    expect(validateChapterMaps(chapter).join('\n')).toContain('dimensions must be positive');
    expect(validateChapterMaps(chapter).join('\n')).toContain('playerSpawn is outside map bounds');
  });

  it('checks configured focus framing unless intentional outside-room composition is allowed', () => {
    const map = { ...CHAPTERS[0].map, composition: { focusRect: { x: 100, y: 100, width: 200, height: 200 } } };
    expect(validateCameraComposition(map, { x: 0, y: 0, width: 400, height: 400 })).toEqual([]);
    expect(validateCameraComposition(map, { x: 250, y: 250, width: 200, height: 200 }).join('\n')).toContain('focusRect');
    expect(validateCameraComposition({ ...map, composition: { ...map.composition, allowPlayerOutsideRoom: true } }, { x: 250, y: 250, width: 200, height: 200 })).toEqual([]);
  });
});

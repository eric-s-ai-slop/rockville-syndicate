import type { Beat, ChapterConfig, MapConfig, MapTheme } from './types';

export const themeCapabilities: Record<MapTheme, { environment: 'outdoor' | 'indoor' | 'void'; allowsNatureScatter: boolean }> = {
  apartment: { environment: 'indoor', allowsNatureScatter: false },
  hospital: { environment: 'indoor', allowsNatureScatter: false },
  void: { environment: 'void', allowsNatureScatter: false },
  highway_night: { environment: 'outdoor', allowsNatureScatter: true },
  park: { environment: 'outdoor', allowsNatureScatter: true },
  florida: { environment: 'outdoor', allowsNatureScatter: true },
  cabin: { environment: 'outdoor', allowsNatureScatter: true },
  suburb_night: { environment: 'outdoor', allowsNatureScatter: true },
  pool_party: { environment: 'outdoor', allowsNatureScatter: false },
};

export function mapBounds(map: MapConfig) {
  return { x: 0, y: 0, width: map.width, height: map.height };
}

export interface EffectiveViewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Validate the camera framing contract for an intentionally composed map. */
export function validateCameraComposition(map: MapConfig, viewport: EffectiveViewport): string[] {
  const focus = map.composition?.focusRect;
  if (!focus) return [];
  const containsFocus = focus.x >= viewport.x && focus.y >= viewport.y
    && focus.x + focus.width <= viewport.x + viewport.width
    && focus.y + focus.height <= viewport.y + viewport.height;
  if (containsFocus || map.composition?.allowPlayerOutsideRoom === true) return [];
  return ['effective camera viewport does not contain the configured focusRect'];
}

function inside(map: MapConfig, x: number, y: number): boolean {
  return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x <= map.width && y <= map.height;
}

function mapsFor(chapter: ChapterConfig): MapConfig[] {
  return chapter.scenes?.map((scene) => scene.map) ?? [chapter.map];
}

function allBeatTargets(chapter: ChapterConfig): Array<{ index: number; type: string; x: number; y: number }> {
  return chapter.beats.flatMap((beat: Beat, index) =>
    beat.type === 'walkTo' || beat.type === 'cameraPan' ? [{ index, type: beat.type, x: beat.x, y: beat.y }] : [],
  );
}

export function validateChapterMaps(chapter: ChapterConfig): string[] {
  const errors: string[] = [];
  const maps = mapsFor(chapter);
  for (const [index, map] of maps.entries()) {
    const theme = map.theme;
    if (theme && !themeCapabilities[theme]) errors.push(`${chapter.id} scene ${index}: unknown map theme ${theme}`);
    if (!(map.width > 0 && map.height > 0)) errors.push(`${chapter.id} scene ${index}: map dimensions must be positive`);
    if (map.composition?.focusRect) {
      const focus = map.composition.focusRect;
      if (!(focus.width > 0 && focus.height > 0)) errors.push(`${chapter.id} scene ${index}: focusRect dimensions must be positive`);
      if (focus.x < 0 || focus.y < 0 || focus.x + focus.width > map.width || focus.y + focus.height > map.height) errors.push(`${chapter.id} scene ${index}: focusRect exceeds map bounds`);
    }
    if (!inside(map, map.playerSpawn.x, map.playerSpawn.y)) errors.push(`${chapter.id} scene ${index}: playerSpawn is outside map bounds`);
    for (const rect of map.rects) {
      if (!(rect.w > 0 && rect.h > 0)) errors.push(`${chapter.id} scene ${index}: rect dimensions must be positive`);
      const tolerance = 14; // perimeter walls intentionally straddle the map edge
      if (rect.x - rect.w / 2 < -tolerance || rect.y - rect.h / 2 < -tolerance || rect.x + rect.w / 2 > map.width + tolerance || rect.y + rect.h / 2 > map.height + tolerance) errors.push(`${chapter.id} scene ${index}: rect exceeds map bounds`);
    }
  }
  for (const target of allBeatTargets(chapter)) {
    if (!maps.some((map) => inside(map, target.x, target.y))) errors.push(`${chapter.id} beat ${target.index} ${target.type}: target (${target.x},${target.y}) is outside every scene map`);
  }
  return errors;
}

export function validateAllChapterMaps(chapters: ChapterConfig[]): string[] {
  return chapters.flatMap(validateChapterMaps);
}

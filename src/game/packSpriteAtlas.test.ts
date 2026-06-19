import { describe, it, expect, vi } from 'vitest';
import { buildPackAtlas, packSize, packFrame, PACK_ATLAS_KEY } from './packSpriteAtlas';

describe('packSpriteAtlas - packSize', () => {
  it('returns undefined for unknown frames initially', () => {
    expect(packSize('tollbooth_front')).toBeUndefined();
  });

  it('populates natural sizes when atlas is built (cached branch)', () => {
    const mockScene = {
      textures: {
        exists: vi.fn((key: string) => key === PACK_ATLAS_KEY)
      }
    } as any;

    // Trigger the cached branch which populates the dictionaries from PACK_ENTRIES
    buildPackAtlas(mockScene);

    expect(packSize('tollbooth_front')).toEqual({ w: 690, h: 195 });
    expect(packSize('pack_cone')).toEqual({ w: 42, h: 72 });
  });

  it('returns undefined for non-existent frames', () => {
    expect(packSize('not_a_real_frame')).toBeUndefined();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { packFrame, buildPackAtlas, PACK_ATLAS_KEY } from './packSpriteAtlas';
import Phaser from 'phaser';

describe('packSpriteAtlas', () => {
  describe('packFrame', () => {
    it('should return null for frames that have not been built', () => {
      expect(packFrame('non_existent_frame')).toBeNull();
    });

    it('should return a truthy value if the frame exists in the built pack frames', () => {
      // Mock scene to trigger the early return in buildPackAtlas
      // This populates the internal builtPackFrames Set with PACK_ENTRIES.
      const mockScene = {
        textures: {
          exists: vi.fn((key) => key === PACK_ATLAS_KEY)
        }
      } as unknown as Phaser.Scene;

      buildPackAtlas(mockScene);

      // Verify that known entries from PACK_ENTRIES now return a truthy value (not null).
      // This safely covers both implementations (returning the frame name or returning PACK_ATLAS_KEY).
      expect(packFrame('tollbooth_front')).not.toBeNull();
      expect(packFrame('hottub')).not.toBeNull();
      expect(packFrame('jungle_gym')).not.toBeNull();
    });

    it('should still return null for frames that were not built even after others are built', () => {
      expect(packFrame('another_non_existent')).toBeNull();
    });
  });
});

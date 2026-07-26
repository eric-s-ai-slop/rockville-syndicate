import { describe, expect, it } from 'vitest';
import { CHAPTER_ASSETS, getChapterAssets } from '.';

describe('chapter asset manifests', () => {
  describe('getChapterAssets', () => {
    it('returns only the selected chapter manifest', () => {
      expect(getChapterAssets('maria_brooke').map(asset => asset.key)).toEqual([
        'stage_wj_classroom',
        'stage_wj_track',
      ]);
      expect(getChapterAssets('origins').map(asset => asset.key)).toContain('prop_dialer_site');
    });

    it('returns the EMPTY_MANIFEST singleton for unknown or empty chapter IDs', () => {
      const empty1 = getChapterAssets('spotify_insurgency');
      const empty2 = getChapterAssets('unknown_chapter');
      const empty3 = getChapterAssets('');

      expect(empty1).toEqual([]);
      expect(empty1).toBe(empty2);
      expect(empty1).toBe(empty3);
    });
  });

  it('does not register the same Phaser key twice within a chapter', () => {
    for (const [chapterId, assets] of Object.entries(CHAPTER_ASSETS)) {
      const keys = assets.map(asset => asset.key);
      expect(new Set(keys).size, chapterId).toBe(keys.length);
    }
  });

  it('covers the chapter-specific keys consumed by chapter configs and modes', () => {
    const expected: Record<string, string[]> = {
      red_pee_bladder: ['prop_hospital_bed', 'prop_iv_drip', 'prop_cabinet', 'prop_red_toilet'],
      umbc_incident: ['stage_umbc_basement', 'stage_parking_lot_night', 'hero_ben_raw_jpg'],
      florida_highway_duel: ['prop_jordan_mustang', 'prop_maharko_camero'],
      rose_florida: ['stage_car_interior', 'stage_florida_house_night', 'npc_rose_sheet_raw_jpg'],
      ding_dong_ditch_ben: ['prop_watchwater', 'prop_watchwater_open', 'prop_maharko_camero', 'prop_nick_f_corolla'],
      suds_and_soles_pool_party: ['prop_pool_map_day', 'prop_pool_map_night', 'npc_eric_pool'],
      cabin_from_hell_2025: ['stage_oc_balcony_night', 'stage_cabin_interior', 'stage_cabin_deck'],
      origins: ['stage_mcdonalds_night', 'stage_dogwood_lookout_night', 'prop_dialer_site', 'npc_chris_rivas_sheet_raw_jpg'],
    };

    for (const [chapterId, keys] of Object.entries(expected)) {
      const actual = new Set(getChapterAssets(chapterId).map(asset => asset.key));
      for (const key of keys) expect(actual.has(key), `${chapterId}: ${key}`).toBe(true);
    }
  });
});

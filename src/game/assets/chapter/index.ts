import { cabinFromHellAssets } from './cabinFromHell';
import { dingDongDitchCarAssets, floridaHighwayAssets, nickFCorollaAsset } from './cars';
import { dingDongDitchAssets } from './dingDongDitch';
import { mariaBrookeAssets } from './mariaBrooke';
import { originsAssets } from './origins';
import { poolPartyAssets } from './poolParty';
import { redPeeBladderAssets } from './redPeeBladder';
import { roseFloridaAssets } from './roseFlorida';
import type { ChapterAssetManifest } from './types';
import { umbcIncidentAssets } from './umbcIncident';

const CHAPTER_ASSETS: Readonly<Record<string, ChapterAssetManifest>> = {
  maria_brooke: mariaBrookeAssets,
  nyc_1am_drive: [nickFCorollaAsset],
  red_pee_bladder: redPeeBladderAssets,
  umbc_incident: umbcIncidentAssets,
  florida_highway_duel: floridaHighwayAssets,
  rose_florida: roseFloridaAssets,
  ding_dong_ditch_ben: [...dingDongDitchAssets, ...dingDongDitchCarAssets],
  suds_and_soles_pool_party: poolPartyAssets,
  cabin_from_hell_2025: cabinFromHellAssets,
  origins: originsAssets,
};

const EMPTY_MANIFEST: ChapterAssetManifest = [];

/** Returns only the static images needed by the active chapter. */
export function getChapterAssets(chapterId: string): ChapterAssetManifest {
  return CHAPTER_ASSETS[chapterId] ?? EMPTY_MANIFEST;
}

export { CHAPTER_ASSETS };
export type { ChapterAssetManifest, ChapterImageAsset } from './types';

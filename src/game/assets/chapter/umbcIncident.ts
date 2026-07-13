import basementUrl from '../../../assets/chapters/umbc incident/umbc_basement.jpg?url';
import parkingLotUrl from '../../../assets/chapters/umbc incident/stage_parking_log_night.jpg?url';
import girlSilhouetteUrl from '../../../assets/images/npc_girl_silhouette.jpg?url';
import benUrl from '../../../assets/images/boss_ben.jpg';
import type { ChapterAssetManifest } from './types';

export const umbcIncidentAssets = [
  { key: 'stage_umbc_basement', url: basementUrl },
  { key: 'stage_parking_lot_night', url: parkingLotUrl },
  { key: 'hero_ben_raw_jpg', url: benUrl },
  { key: 'hero_girl1_raw_jpg', url: girlSilhouetteUrl },
  { key: 'hero_girl2_raw_jpg', url: girlSilhouetteUrl },
  { key: 'hero_girl3_raw_jpg', url: girlSilhouetteUrl },
] as const satisfies ChapterAssetManifest;

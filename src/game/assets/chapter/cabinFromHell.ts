import ocBalconyNightUrl from '../../../assets/images/game_decor/stages/stage_oc_balcony_night.jpg?url';
import cabinInteriorUrl from '../../../assets/images/game_decor/stages/stage_cabin_interior.jpg?url';
import cabinDeckUrl from '../../../assets/images/game_decor/stages/stage_cabin_deck.jpg?url';
import alexSheet from '../../../assets/images/npc_alex_sheet.jpg';
import benjiSheet from '../../../assets/images/npc_benji_sheet.jpg';
import girlSilhouetteUrl from '../../../assets/images/npc_girl_silhouette.jpg?url';
import type { ChapterAssetManifest } from './types';

export const cabinFromHellAssets = [
  { key: 'stage_oc_balcony_night', url: ocBalconyNightUrl },
  { key: 'stage_cabin_interior', url: cabinInteriorUrl },
  { key: 'stage_cabin_deck', url: cabinDeckUrl },
  { key: 'npc_alex_sheet_raw_jpg', url: alexSheet },
  { key: 'npc_benji_sheet_raw_jpg', url: benjiSheet },
  { key: 'hero_girl1_raw_jpg', url: girlSilhouetteUrl },
  { key: 'hero_girl2_raw_jpg', url: girlSilhouetteUrl },
  { key: 'hero_girl3_raw_jpg', url: girlSilhouetteUrl },
] as const satisfies ChapterAssetManifest;

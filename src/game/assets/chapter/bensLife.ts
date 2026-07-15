import stage51MonroeUrl from '../../../assets/chapters/bens_life/stage_51_monroe_roof_landing.jpg?url';
import quarantineBedroomUrl from '../../../assets/chapters/bens_life/stage_quarantine_bedroom.jpg?url';
import oceanCityRentalUrl from '../../../assets/chapters/bens_life/stage_ocean_city_rental.jpg?url';
import mahargosPoolRoomUrl from '../../../assets/chapters/bens_life/stage_mahargos_pool_room.jpg?url';
import halloweenPartyUrl from '../../../assets/chapters/bens_life/stage_halloween_party.jpg?url';
import juniorClassroomUrl from '../../../assets/chapters/bens_life/stage_junior_classroom.jpg?url';
import f1BossArenaUrl from '../../../assets/chapters/bens_life/stage_f1_boss_arena.jpg?url';
import engineeringClassroomUrl from '../../../assets/chapters/bens_life/stage_engineering_classroom.jpg?url';
import scenicOverlookUrl from '../../../assets/chapters/bens_life/stage_scenic_overlook.jpg?url';
import benPortraitUrl from '../../../assets/images/boss_ben.jpg?url';
import girlSilhouetteUrl from '../../../assets/images/npc_girl_silhouette.jpg?url';
import alexSheetUrl from '../../../assets/images/npc_alex_sheet.jpg?url';
import benjiSheetUrl from '../../../assets/images/npc_benji_sheet.jpg?url';
import type { ChapterAssetManifest } from './types';

export const bensLifeAssets = [
  { key: 'stage_bens_51_monroe', url: stage51MonroeUrl },
  { key: 'stage_bens_quarantine_bedroom', url: quarantineBedroomUrl },
  { key: 'stage_bens_ocean_city_rental', url: oceanCityRentalUrl },
  { key: 'stage_bens_mahargos_pool_room', url: mahargosPoolRoomUrl },
  { key: 'stage_bens_halloween_party', url: halloweenPartyUrl },
  { key: 'stage_bens_junior_classroom', url: juniorClassroomUrl },
  { key: 'stage_bens_f1_boss_arena', url: f1BossArenaUrl },
  { key: 'stage_bens_engineering_classroom', url: engineeringClassroomUrl },
  { key: 'stage_bens_scenic_overlook', url: scenicOverlookUrl },
  { key: 'hero_ben_raw_jpg', url: benPortraitUrl },
  { key: 'hero_girl1_raw_jpg', url: girlSilhouetteUrl },
  { key: 'hero_girl2_raw_jpg', url: girlSilhouetteUrl },
  { key: 'hero_girl3_raw_jpg', url: girlSilhouetteUrl },
  { key: 'npc_alex_sheet_raw_jpg', url: alexSheetUrl },
  { key: 'npc_benji_sheet_raw_jpg', url: benjiSheetUrl },
] as const satisfies ChapterAssetManifest;

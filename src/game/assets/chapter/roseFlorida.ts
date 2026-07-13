import alexSheet from '../../../assets/images/npc_alex_sheet.jpg';
import benjiSheet from '../../../assets/images/npc_benji_sheet.jpg';
import roseSheet from '../../../assets/images/npc_rose_sheet.jpg';
import roseSisterSheet from '../../../assets/images/npc_rose_sister_sheet.jpg';
import carInterior from '../../../assets/images/game_decor/stages/stage_car_interior.jpg';
import floridaHouseNight from '../../../assets/images/game_decor/stages/stage_florida_house_night.jpg';
import type { ChapterAssetManifest } from './types';

export const roseFloridaAssets = [
  { key: 'npc_alex_sheet_raw_jpg', url: alexSheet },
  { key: 'npc_benji_sheet_raw_jpg', url: benjiSheet },
  { key: 'npc_rose_sheet_raw_jpg', url: roseSheet },
  { key: 'npc_rose_sister_sheet_raw_jpg', url: roseSisterSheet },
  { key: 'stage_car_interior', url: carInterior },
  { key: 'stage_florida_house_night', url: floridaHouseNight },
] as const satisfies ChapterAssetManifest;

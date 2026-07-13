import mcdonaldsNightUrl from '../../../assets/images/game_decor/stages/origins/stage_mcdonalds_night.jpg?url';
import ericRoomPresentUrl from '../../../assets/images/game_decor/stages/origins/stage_eric_room_present.jpg?url';
import voidNickfRoomUrl from '../../../assets/images/game_decor/stages/origins/stage_void_nickf_room.jpg?url';
import voidJacobRoomUrl from '../../../assets/images/game_decor/stages/origins/stage_void_jacob_room.jpg?url';
import voidEricRoomUrl from '../../../assets/images/game_decor/stages/origins/stage_void_eric_room.jpg?url';
import dogwoodLookoutUrl from '../../../assets/images/game_decor/stages/origins/stage_dogwood_lookout_night.jpg?url';
import dialerSiteUrl from '../../../assets/images/game_decor/stages/origins/prop_dialer_site.jpg?url';
import chrisRivasSheet from '../../../assets/images/npc_chris_rivas_sheet.jpg';
import type { ChapterAssetManifest } from './types';

export const originsAssets = [
  { key: 'stage_mcdonalds_night', url: mcdonaldsNightUrl },
  { key: 'stage_eric_room_present', url: ericRoomPresentUrl },
  { key: 'stage_void_nickf_room', url: voidNickfRoomUrl },
  { key: 'stage_void_jacob_room', url: voidJacobRoomUrl },
  { key: 'stage_void_eric_room', url: voidEricRoomUrl },
  { key: 'stage_dogwood_lookout_night', url: dogwoodLookoutUrl },
  { key: 'prop_dialer_site', url: dialerSiteUrl },
  { key: 'npc_chris_rivas_sheet_raw_jpg', url: chrisRivasSheet },
] as const satisfies ChapterAssetManifest;

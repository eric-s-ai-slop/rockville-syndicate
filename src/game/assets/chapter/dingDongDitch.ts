import watchwaterUrl from '../../../assets/images/game_decor/stages/dingdongditchben/watchwater_scene.jpg?url';
import watchwaterOpenUrl from '../../../assets/images/game_decor/stages/dingdongditchben/watchwater_scene_open.jpg?url';
import type { ChapterAssetManifest } from './types';

export const dingDongDitchAssets = [
  { key: 'prop_watchwater', url: watchwaterUrl },
  { key: 'prop_watchwater_open', url: watchwaterOpenUrl },
] as const satisfies ChapterAssetManifest;

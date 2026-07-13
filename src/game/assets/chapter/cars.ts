import jordanMustangUrl from "../../../assets/images/game_decor/special/cars/jordan's mustang.jpg?url";
import maharkoCameroUrl from "../../../assets/images/game_decor/special/cars/maharko's camero.jpg?url";
import nickFCorollaUrl from "../../../assets/images/game_decor/special/cars/nick f's corolla.jpg?url";
import type { ChapterAssetManifest } from './types';

export const jordanMustangAsset = { key: 'prop_jordan_mustang', url: jordanMustangUrl } as const;
export const maharkoCameroAsset = { key: 'prop_maharko_camero', url: maharkoCameroUrl } as const;
export const nickFCorollaAsset = { key: 'prop_nick_f_corolla', url: nickFCorollaUrl } as const;

export const floridaHighwayAssets = [jordanMustangAsset, maharkoCameroAsset] as const satisfies ChapterAssetManifest;
export const dingDongDitchCarAssets = [maharkoCameroAsset, nickFCorollaAsset] as const satisfies ChapterAssetManifest;

import hospitalBedUrl from '../../../assets/images/game_decor/stages/audrey_hopsital/hospital_bed.jpg?url';
import ivDripUrl from '../../../assets/images/game_decor/stages/audrey_hopsital/iv-drip.jpg?url';
import cabinetUrl from '../../../assets/images/game_decor/stages/audrey_hopsital/cabinant.jpg?url';
import redToiletUrl from '../../../assets/images/game_decor/stages/audrey_hopsital/red_toliet(evidence).jpg?url';
import type { ChapterAssetManifest } from './types';

export const redPeeBladderAssets = [
  { key: 'prop_hospital_bed', url: hospitalBedUrl },
  { key: 'prop_iv_drip', url: ivDripUrl },
  { key: 'prop_cabinet', url: cabinetUrl },
  { key: 'prop_red_toilet', url: redToiletUrl },
] as const satisfies ChapterAssetManifest;

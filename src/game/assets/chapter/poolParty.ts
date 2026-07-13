import ericPoolUrl from '../../../assets/chapters/SUMMER2026_FIRSTPOOLPARTY/Eric(pool).jpg?url';
import nickHPoolUrl from '../../../assets/chapters/SUMMER2026_FIRSTPOOLPARTY/Nick_H(Pool).jpg?url';
import jacobPoolUrl from '../../../assets/chapters/SUMMER2026_FIRSTPOOLPARTY/jacob(pool).jpg?url';
import nickFPoolUrl from '../../../assets/chapters/SUMMER2026_FIRSTPOOLPARTY/nick_f(pool).jpg?url';
import anastasiaPoolUrl from '../../../assets/chapters/SUMMER2026_FIRSTPOOLPARTY/anastasia(pool).jpg?url';
import sophiaPoolUrl from '../../../assets/chapters/SUMMER2026_FIRSTPOOLPARTY/sophia(pool).jpg?url';
import samPoolUrl from '../../../assets/chapters/SUMMER2026_FIRSTPOOLPARTY/sam_f(pool).jpg?url';
import poolMapDayUrl from '../../../assets/chapters/SUMMER2026_FIRSTPOOLPARTY/pool_map(day).jpg?url';
import poolMapNightUrl from '../../../assets/chapters/SUMMER2026_FIRSTPOOLPARTY/pool_map(night).jpg?url';
import type { ChapterAssetManifest } from './types';

export const poolPartyAssets = [
  { key: 'npc_eric_pool', url: ericPoolUrl },
  { key: 'npc_nick_h_pool', url: nickHPoolUrl },
  { key: 'npc_jacob_pool', url: jacobPoolUrl },
  { key: 'npc_nick_f_pool', url: nickFPoolUrl },
  { key: 'npc_anastasia_pool', url: anastasiaPoolUrl },
  { key: 'npc_sophia_pool', url: sophiaPoolUrl },
  { key: 'npc_sam_pool', url: samPoolUrl },
  { key: 'prop_pool_map_day', url: poolMapDayUrl },
  { key: 'prop_pool_map_night', url: poolMapNightUrl },
] as const satisfies ChapterAssetManifest;

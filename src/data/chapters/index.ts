import { ChapterConfig } from './types';
import chapterMariaBrooke from './chapter0.maria-brooke';
import chapter1 from './chapter1.spotify-insurgency';
import chapter2 from './chapter2.operation-inertia';
import chapter3 from './chapter3.red-pee-bladder-strike';
import chapter4 from './chapter4.jungle-gym-gambit';
import chapter5 from './chapter5.florida-highway-duel';
import chapter5b from './chapter5b.rose';
import chapterUmbc from './chapter3b.umbc-incident';
import chapter6 from './chapter6.ding-dong-ditch-ben';
import chapter7 from './chapter7.spain-betrayal';
import chapter8 from './chapter8.the-cabin';
import chapter9 from './chapter9.pool-party';
import chapter11 from './chapter11.cabin-from-hell';

export * from './types';

export const CHAPTERS: ChapterConfig[] = [
  chapterMariaBrooke,
  chapter1,
  chapter2,
  chapter3,
  chapter4,
  chapter5,
  chapter5b,
  chapterUmbc,
  chapter6,
  chapter7,
  chapter8,
  chapter9,
  chapter11,
];

export function getChapter(id: string): ChapterConfig | undefined {
  return CHAPTERS.find(c => c.id === id);
}

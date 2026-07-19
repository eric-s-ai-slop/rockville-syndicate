import { ChapterConfig, ChapterDeployment } from './types';
import chapterFixturePlaytest from './chapterFixture.playtest';
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
import chapter12 from './chapter12.origins';
import chapter13BensLife from './chapter13.bens-life';

export * from './types';
export * from './mapValidation';

/** The complete ordered registry. Runtime lists are derived from this array. */
export const ALL_CHAPTERS: ChapterConfig[] = [
  chapterMariaBrooke,
  chapter13BensLife,
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
  chapterFixturePlaytest,
  chapter12,
];

export const PRODUCTION_CHAPTERS = ALL_CHAPTERS.filter(chapter => chapter.deployment === 'shipping');

export interface ProductionChapterManifestEntry {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  kind: ChapterConfig['kind'];
  deployment: ChapterDeployment;
  estimatedMinutes: { min: number; max: number };
  seal: 'classified' | 'external' | null;
}

/** Small, stable metadata surface for release validation; excludes beats/maps/assets. */
export const PRODUCTION_CHAPTER_MANIFEST: ProductionChapterManifestEntry[] = PRODUCTION_CHAPTERS.map(chapter => ({
  id: chapter.id,
  index: chapter.index,
  title: chapter.title,
  subtitle: chapter.subtitle,
  kind: chapter.kind,
  deployment: chapter.deployment,
  estimatedMinutes: chapter.estimatedMinutes!,
  seal: chapter.seal ?? (chapter.classified ? 'classified' : null),
}));

const INCLUDE_NON_SHIPPING =
  typeof import.meta.env !== 'undefined'
    ? import.meta.env.DEV
    : process.env.NODE_ENV !== 'production';

/** Player-facing in production; tooling retains internal chapters in dev/tsx. */
export const CHAPTERS: ChapterConfig[] = INCLUDE_NON_SHIPPING ? ALL_CHAPTERS : PRODUCTION_CHAPTERS;

import { ChapterConfig } from './types';
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

// DEV-only fixture chapter: exercises every Beat type for the playtest harness.
// Included in the Vite dev server and the Node/tsx agent CLI (both need it to
// drive the fixture), excluded from production builds.
//
// `import.meta.env` only exists under Vite's transform (browser build + vitest,
// which also runs through Vite) — under plain `tsx` (e2e_tests/agent/cli.ts)
// it is `undefined` at runtime, so the `typeof` guard is required to avoid a
// throw there. Verified: under tsx, `process.env.NODE_ENV` is also `undefined`
// (not `'production'`), so the fallback correctly evaluates to `true` there too.
const INCLUDE_FIXTURES =
  typeof import.meta.env !== 'undefined'
    ? import.meta.env.DEV
    : process.env.NODE_ENV !== 'production';

export const CHAPTERS: ChapterConfig[] = [
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
  ...(INCLUDE_FIXTURES ? [chapterFixturePlaytest] : []),
  chapter12,
];

export function getChapter(id: string): ChapterConfig | undefined {
  return CHAPTERS.find(c => c.id === id);
}

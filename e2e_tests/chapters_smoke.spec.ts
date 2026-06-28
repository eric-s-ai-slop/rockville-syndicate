import { test, expect } from '@playwright/test';
import { navigateToChapter } from './helpers';

const CHAPTERS: Array<{ title: string; classified?: boolean }> = [
  { title: 'Maria Brooke' },
  { title: 'The Spotify Family Insurgency' },
  { title: 'Operation Inertia' },
  { title: 'The Red Pee Bladder Strike' },
  { title: 'The Jungle Gym Gambit' },
  { title: 'The Florida Highway Duel' },
  { title: 'Rose', classified: true },
  { title: 'The UMBC Incident', classified: true },
  { title: 'Operation Ding Dong Ditch Ben' },
  { title: 'The Spain Betrayal' },
  { title: 'The Cabin' },
  { title: 'The Suds & Soles Pool Party' },
];

for (const { title, classified } of CHAPTERS) {
  test(`smoke: ${title}`, async ({ page }) => {
    test.setTimeout(60000);
    await navigateToChapter(page, title, { classified });
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 });
  });
}

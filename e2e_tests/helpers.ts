import { Page } from '@playwright/test';

/**
 * From the chapter-select screen, break every CLASSIFIED chapter's redaction
 * seal. Seals take two interactions each: intact -> cracked -> broken, and the
 * card label reads "CLICK TO CRACK SEAL" then "SHATTER SEAL" before the real
 * title is revealed. There can be more than one sealed card on screen, and a
 * redacted card hides its title, so we simply break them all by repeatedly
 * clicking whatever seal label is currently showing. FREE PLAY must be enabled
 * first so the cards are unlocked.
 */
export async function breakSeal(page: Page): Promise<void> {
  for (let i = 0; i < 10; i++) {
    const label = page.getByText(/CLICK TO CRACK SEAL|SHATTER SEAL/).first();
    if (!(await label.isVisible().catch(() => false))) break;
    await label.click();
    await page.waitForTimeout(400);
  }
}

import { test, expect } from '@playwright/test';

test('game loads and basic flow works', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Project Omega/);

  // Wait for the hero select screen to be visible
  await expect(page.getByText('Choose your crew member', { exact: false })).toBeVisible({ timeout: 10000 });

  // Click the first hero card (Eric)
  await page.getByRole('button', { name: /Eric/i }).first().click();

  // Wait for the "Begin the Story" button
  await expect(page.getByRole('button', { name: /Begin the Story/i })).toBeVisible();
  await page.getByRole('button', { name: /Begin the Story/i }).click();

  // Should navigate to chapter select
  await expect(page.getByText('LINEAR')).toBeVisible();

  // Unlock all chapters so a known, non-classified chapter is clickable
  // (in LINEAR mode only the first flashback is unlocked initially).
  await page.getByText('FREE PLAY').click();

  // Begin Act I — "The Spotify Family Insurgency" / The Extortion Crisis
  await page.getByText(/The Spotify Family Insurgency/).first().click();

  // Wait a short time for the canvas to boot
  await page.waitForTimeout(1000);

  // Verify that the game canvas renders
  await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
});

import { test, expect } from '@playwright/test';

test('test stewOffering minigame', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Select Eric
  await page.getByRole('button', { name: /Eric/i }).first().click();
  await page.getByRole('button', { name: /Begin the Story/i }).click();
  await page.getByText('FREE PLAY').click();
  await page.getByText('CLICK TO BREAK SEAL').click();
  await page.waitForTimeout(800);
  await page.getByText('The UMBC Incident').first().click();
  
  await page.waitForTimeout(2000);
  
  // Advance to stewOffering mode
  const advanceToStewOffering = async () => {
    let attempts = 0;
    while (attempts < 100) {
      const isStewOffering = await page.evaluate(() => {
        const scene = (window as any).__OMEGA_GAME__?.scene.getScene('ChapterScene');
        return scene?.activeMode?.id === 'stewOffering';
      });
      if (isStewOffering) return true;

      const isDialogOpen = await page.locator('p.font-pixel').isVisible();
      if (isDialogOpen) {
        await page.keyboard.press('Space');
      } else {
        await page.evaluate(() => {
          const scene = (window as any).__OMEGA_GAME__?.scene.getScene('ChapterScene');
          if (scene && scene.walkTarget) {
            scene.player.x = scene.walkTarget.x;
            scene.player.y = scene.walkTarget.y;
          }
        });
      }
      await page.waitForTimeout(250);
      attempts++;
    }
    return false;
  };

  const reached = await advanceToStewOffering();
  expect(reached).toBe(true);
  console.log('Reached stewOffering minigame!');

  // Now let's try to click the girls programmatically
  await page.evaluate(() => {
    const scene = (window as any).__OMEGA_GAME__.scene.getScene('ChapterScene');
    const stewMode = scene.activeMode;
    stewMode.handleNpcClick('girl1');
  });

  await page.waitForTimeout(3000);

  const offersCompleted = await page.evaluate(() => {
    const scene = (window as any).__OMEGA_GAME__.scene.getScene('ChapterScene');
    return scene.activeMode.offersCompleted;
  });

  console.log('Offers completed after girl1:', offersCompleted);

  await page.evaluate(() => {
    const scene = (window as any).__OMEGA_GAME__.scene.getScene('ChapterScene');
    scene.activeMode.handleNpcClick('girl2');
  });

  await page.waitForTimeout(3000);

  await page.evaluate(() => {
    const scene = (window as any).__OMEGA_GAME__.scene.getScene('ChapterScene');
    scene.activeMode.handleNpcClick('girl3');
  });

  await page.waitForTimeout(3000);

  const isModeOver = await page.evaluate(() => {
    const scene = (window as any).__OMEGA_GAME__.scene.getScene('ChapterScene');
    return scene.activeMode?.id !== 'stewOffering'; // Should have moved to next beat
  });

  console.log('Mode is over:', isModeOver);
  expect(isModeOver).toBe(true);
});

import { test, expect } from '@playwright/test';

test('test stewOffering minigame by clicking', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Select Eric
  await page.getByRole('button', { name: /Eric/i }).first().click();
  await page.getByRole('button', { name: /Begin the Story/i }).click();
  await page.getByText('FREE PLAY').click();
  const breakSeal = page.getByText('CLICK TO BREAK SEAL');
  if (await breakSeal.isVisible()) {
    await breakSeal.click();
    await page.waitForTimeout(800);
  }
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

  await page.waitForTimeout(1000);

  // Click the girls by their coordinates in the game
  // girl1 is at (100, 100). The canvas might be scaled.
  // We can just click the center of the bounding box of the sprites.
  await page.evaluate(() => {
    const scene = (window as any).__OMEGA_GAME__.scene.getScene('ChapterScene');
    
    // Simulate a pointerdown event on girl1
    const girl1 = scene.actorSprites['girl1'][0];
    girl1.emit('pointerdown');
  });

  await page.waitForTimeout(4000);

  await page.evaluate(() => {
    const scene = (window as any).__OMEGA_GAME__.scene.getScene('ChapterScene');
    const girl2 = scene.actorSprites['girl2'][0];
    girl2.emit('pointerdown');
  });

  await page.waitForTimeout(4000);

  await page.evaluate(() => {
    const scene = (window as any).__OMEGA_GAME__.scene.getScene('ChapterScene');
    const girl3 = scene.actorSprites['girl3'][0];
    girl3.emit('pointerdown');
  });

  await page.waitForTimeout(4000);

  const isModeOver = await page.evaluate(() => {
    const scene = (window as any).__OMEGA_GAME__.scene.getScene('ChapterScene');
    return scene.activeMode?.id !== 'stewOffering'; 
  });

  console.log('Mode is over:', isModeOver);
  expect(isModeOver).toBe(true);
});

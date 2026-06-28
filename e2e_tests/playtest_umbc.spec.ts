import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { breakSeal } from './helpers';

// Screenshots are written next to this spec under a gitignored output folder.
const ARTIFACT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '__screenshots__');

test('playtest UMBC chapter and capture screenshots', async ({ page }) => {
  // Set a long timeout for the entire test
  test.setTimeout(120000);

  // Set viewport to standard size
  await page.setViewportSize({ width: 1024, height: 768 });

  console.log('Navigating to /...');
  await page.goto('/');
  await expect(page).toHaveTitle(/Project Omega/);

  // 1. Choose crew member (Eric)
  console.log('Selecting Eric...');
  await page.getByRole('button', { name: /Eric/i }).first().click();

  // 2. Begin the Story
  console.log('Beginning story...');
  await page.getByRole('button', { name: /Begin the Story/i }).click();
  await expect(page.getByText('LINEAR')).toBeVisible();

  // 3. Toggle Free Play to unlock all chapters
  console.log('Enabling Free Play...');
  await page.getByText('FREE PLAY').click();

  // Checkpoint 1: Sealed chapter card screenshot
  console.log('Taking sealed card screenshot...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'sealed.png') });

  // Checkpoint 2: Break the redaction seal (crack -> shatter)
  console.log('Clicking to break seal...');
  await breakSeal(page);
  console.log('Taking break seal screenshot...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'break.png') });

  // 4. Click the newly revealed "The UMBC Incident" card to start chapter 6
  console.log('Entering The UMBC Incident...');
  await page.getByText('The UMBC Incident').first().click();
  
  // Wait for canvas to load
  await page.waitForTimeout(2000);
  await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });

  // Helper to advance game flow. Presses through dialogue, walks to markers by
  // teleporting onto the walk target, and auto-completes the intermediate
  // interactive minigames (stewOffering / fratAggro / silentDrive) that sit
  // between the screenshots we care about by invoking their completion callback.
  const SKIPPABLE_MODES = ['stewOffering', 'fratAggro', 'silentDrive'];
  const advanceFlow = async (targetCondition: () => boolean, maxSeconds = 45) => {
    let attempts = 0;
    const maxAttempts = maxSeconds * 4; // 250ms check interval
    while (attempts < maxAttempts) {
      const isTarget = await page.evaluate(targetCondition);
      if (isTarget) return true;

      // Auto-complete any skippable foreground minigame that is blocking flow.
      const skipped = await page.evaluate((skippable) => {
        const scene = (window as any).__OMEGA_GAME__?.scene.getScene('ChapterScene');
        const mode = scene?.activeMode;
        if (mode && skippable.includes(mode.id) && typeof mode.onCompleteCallback === 'function') {
          mode.onCompleteCallback({ outcome: 'win' });
          return true;
        }
        return false;
      }, SKIPPABLE_MODES);

      if (!skipped) {
        // Check if React dialogue box is visible in the DOM
        const isDialogOpen = await page.locator('p.font-pixel').first().isVisible();

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
      }
      await page.waitForTimeout(250);
      attempts++;
    }
    throw new Error('Timeout waiting for target condition');
  };

  // 5. Play dialogue up to Ben's "try this stew" line (a voiced dialogue beat).
  console.log('Playing up to the "try this stew" line...');
  await advanceFlow(() => {
    const p = document.querySelector('p.font-pixel');
    return p ? p.innerHTML.includes('try this stew') : false;
  });
  await page.waitForTimeout(300);
  console.log('Taking voice screenshot...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'voice.png') });

  // 6. Play dialogue up to the boss fight
  console.log('Advancing to Boss Fight intro...');
  await advanceFlow(() => {
    const scene = (window as any).__OMEGA_GAME__?.scene.getScene('ChapterScene');
    return scene ? scene.isBossActive : false;
  });
  await page.waitForTimeout(500);
  console.log('Taking boss fight screenshot...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'boss.png') });

  // 7. Auto-damage the boss to win the fight
  console.log('Instantly defeating the boss...');
  await page.evaluate(() => {
    const scene = (window as any).__OMEGA_GAME__.scene.getScene('ChapterScene');
    if (scene.activeMode && scene.activeMode.id === 'bossFight') {
      scene.activeMode.damageBoss(1200);
    }
  });
  await page.waitForTimeout(1000); // Wait for boss death animation and dialogue to return

  // 8. Play dialogues until the scene crossfades to Parking Lot (sceneIndex 1)
  console.log('Advancing to parking lot scene transition...');
  await advanceFlow(() => {
    const scene = (window as any).__OMEGA_GAME__?.scene.getScene('ChapterScene');
    return scene ? scene.currentSceneIndex === 1 : false;
  });
  await page.waitForTimeout(1000); // Wait for scene transition fade
  console.log('Taking crossfade scene screenshot...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'crossfade.png') });

  // 9. Play dialogue until storyFractures minigame starts (revealing phase)
  console.log('Advancing to storyFractures minigame...');
  await advanceFlow(() => {
    const scene = (window as any).__OMEGA_GAME__?.scene.getScene('ChapterScene');
    return (scene && scene.activeMode && scene.activeMode.id === 'storyFractures' && scene.activeMode.phase === 'revealing') || false;
  });
  
  // Wait 3.5 seconds for story to scroll and reveal mid-reveal text
  await page.waitForTimeout(3500);
  console.log('Taking mid_reveal screenshot...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mid_reveal.png') });

  // 10. Click the first fracture (index 1: "I was over by the speakers...")
  console.log('Clicking the first fracture line...');
  const coord = await page.evaluate(() => {
    const scene = (window as any).__OMEGA_GAME__.scene.getScene('ChapterScene');
    const view = scene.activeMode.segViews[1];
    const label = view.label;
    const rect = scene.game.canvas.getBoundingClientRect();
    const scaleX = rect.width / scene.game.scale.width;
    const scaleY = rect.height / scene.game.scale.height;
    return {
      x: rect.left + (label.x + label.width / 4) * scaleX,
      y: rect.top + (label.y + label.height / 2) * scaleY
    };
  });
  await page.mouse.click(coord.x, coord.y);
  await page.waitForTimeout(500);
  console.log('Taking fracture click screenshot...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'fracture_click.png') });

  // 11. Programmatically mark the other 3 fractures to win the game
  console.log('Programmatically marking the remaining fractures...');
  await page.evaluate(() => {
    const scene = (window as any).__OMEGA_GAME__.scene.getScene('ChapterScene');
    scene.activeMode.segViews.forEach((v) => {
      if (v.seg.fractureId && !v.found) {
        scene.activeMode.markFracture(v);
      }
    });
  });
  await page.waitForTimeout(1000);
  console.log('Taking win overlay screenshot...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'win_overlay.png') });

  // 12. Trigger lose overlay to capture the lose screenshot
  console.log('Triggering lose overlay...');
  await page.evaluate(() => {
    const scene = (window as any).__OMEGA_GAME__.scene.getScene('ChapterScene');
    // Clear win state and trigger lose directly
    scene.activeMode.phase = 'review';
    scene.activeMode.resolveLose();
  });
  await page.waitForTimeout(1000);
  console.log('Taking lose overlay screenshot...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'lose_overlay.png') });

  console.log('All playtest screenshots successfully generated!');
});

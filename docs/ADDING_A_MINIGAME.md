# How to Add a Minigame Mode

Adding a new interactive minigame segment is a localized process. Follow this step-by-step recipe.

---

## 1. Copy the Template Mode
Copy the reference `_template` mode to a new folder named after your game mode:
```bash
cp -r src/game/modes/_template/ src/game/modes/myNewMinigame/
```

## 2. Implement the GameMode Interface
Open `src/game/modes/myNewMinigame/index.ts` and customize the implementation. Make sure to:
- Assign a unique string to the `id` field (e.g. `myNewMinigame`).
- Implement the key GameMode lifecycle hooks:
  - `preload(ctx)`: Load images, audio, or json maps.
  - `start(ctx, config, onComplete)`: Set up physics colliders, sprites, input keys, and timers. Always call `onComplete` exactly once when the game mode ends.
  - `update(time, delta)`: Handle active player movement, hit detection, or ticker updates.
  - `teardown()`: Clean up sprites, sounds, timers, and keys to prevent leaks.

## 3. Register the Mode in the Registry
Open [src/game/modes/index.ts](file:///Users/erichuang/Projects/ai-slop/project-omega_-the-rockville-syndicate/src/game/modes/index.ts) and register your mode:
```typescript
import { myNewMinigameMode } from './myNewMinigame';
// ...
registerMode(myNewMinigameMode);
```

## 4. Insert the Beat in the Chapter Configuration
Add a `minigame` beat to the desired chapter file in `src/data/chapters/`:
```typescript
{
  type: 'minigame',
  modeId: 'myNewMinigame',
  config: { someParam: 123 }, // Passed to mode.start as the second argument
  introLines: ['Get ready to play!', 'Press SPACE to win.'], // Optional dialog prefix
  background: false // Set to true if this mode runs concurrently without blocking story beats
}
```

## 5. Verify the Implementation
1. Verify types compile:
   ```bash
   npm run lint
   ```
2. Verify existing unit/E2E tests pass:
   ```bash
   npm test
   ```
3. Run the local dev server and play through the chapter:
   ```bash
   npm run dev
   ```

---

## ModeContext API Reference

Registered modes receive a `ModeContext` façade upon starting, which exposes the following safe scene API subsets:

### Core Phaser References
* `player`: The protagonist Phaser Sprite.
* `cameras`: The Phaser camera manager.
* `time`: Timer events and clocks.
* `tweens`: Tween manager.
* `physics`: Arcade physics manager.
* `sound`: Audio playback manager.
* `add`: Sprite and shapes factory.
* `make`: GameObject creator.
* `textures`: Texture cache.
* `anims`: Global animation player.

### Groups & World Bounds
* `projectiles`: Physics group containing player bullets.
* `enemies`: Physics group containing enemy entities.
* `enemyProjectiles`: Physics group containing enemy bullets.
* `lootShards`: Physics group containing lootable shards.
* `walls`: Static physics group containing wall boundaries.

### Helper Methods
* `label(x, y, text, style)`: Spawn high-res UI text labels (drawn at max DPR).
* `showLetterbox(dur)` / `hideLetterbox(dur)`: Trigger cinematic aspect ratio panels.
* `showBubbleText(target, text, color)`: Floating dialogue speech bubbles above sprites.
* `showPassiveIconText(x, y, text, color)`: Pop up passive floating messages.
* `showDamageNumber(x, y, amount, color)`: Spawn falling numbers.
* `setControlsInverted(inverted)`: Enable/disable player movement inversion status.
* `triggerQTE(boss, callback)`: Invoke the React Quick Time Event interface.
* `logMessage(msg)`: Log actions into the overlay HUD message board.
* `onStoryDialogue(payload, done)`: Push dialog windows to the React overlay interface.
* `hideActor(id)`: Hide story actors during active combat/mini-games.
* `damagePlayer(amount, source)`: Reduce player health.
* `applyDirectionalAnim(sprite, id, vx, vy, left)`: Walk-facing animation controller.
* `propSprites`: Map of all placed scenery/scenarios.
* `poolNameplates`: Map of in-world custom nameplates.

### Metadata
* `currentLevelIndex`: Current level stage index.
* `spawnedBoss`: Active boss sprite reference.
* `isBossActive`: True if combat is active.
* `qteActive`: True if QTE is running.
* `playerClass`: Character description object.
* `chapter`: Active Chapter configuration object.

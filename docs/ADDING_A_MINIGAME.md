# How to Add a Minigame Mode

Adding a new interactive minigame segment is a localized process. Follow this step-by-step recipe.

---

## 1. Copy the Template Mode

```bash
cp -r src/game/modes/_template/ src/game/modes/myNewMinigame/
```

## 2. Implement the GameMode Interface

Open `src/game/modes/myNewMinigame/index.ts` and customize the implementation:

- Assign a unique string to the `id` field (e.g. `'myNewMinigame'`).
- Implement the `GameMode<YourConfig>` lifecycle hooks:
  - `preload(ctx)`: Load images, audio, or JSON maps.
  - `start(ctx, config, onComplete)`: Set up physics colliders, sprites, input keys, and timers. Call `onComplete` **exactly once** when the mode ends.
  - `update(time, delta)`: Per-frame movement, hit detection, ticker updates.
  - `teardown()`: Clean up sprites, sounds, timers, and input listeners to prevent leaks.

Type your config via the generic: `GameMode<{ someParam: number }>`. Avoid `config: any`.

### Optional narrative hooks

If your mode needs to react while a story beat fires during its runtime:

```typescript
onDialogue(beat: Extract<Beat, { type: 'dialogue' }>): void { ... }
onCameraPan(beat: Extract<Beat, { type: 'cameraPan' }>): void { ... }
```

## 3. Register the Mode

Open `src/game/modes/index.ts` and register:

```typescript
import { myNewMinigameMode } from './myNewMinigame';
registerMode(myNewMinigameMode);
```

## 4. Insert the Beat in the Chapter Configuration

Add a `minigame` beat to the desired chapter file in `src/data/chapters/`:

```typescript
{
  type: 'minigame',
  modeId: 'myNewMinigame',
  config: { someParam: 123 },       // Passed to mode.start as the second argument
  introLines: ['Get ready!'],        // Optional dialogue prefix before mode.start
  background: false                  // true = run concurrently, don't block story beats
}
```

## 5. Verify

```bash
npm run lint        # tsc --noEmit
npm test            # vitest unit suite
npm run dev         # play through the chapter
```

Write at least one unit test covering your mode's pure logic (routing, scoring, state machines). See `src/game/modes/bossFight/bossFight.test.ts` for a reference.

---

## ModeContext API Reference

Registered modes receive a `ModeContext` façade upon starting. **Only interact with the scene through this façade** — never reach into `ChapterScene` internals directly.

### Core Phaser References

| Property | Type | Description |
|----------|------|-------------|
| `player` | `SpriteWithDynamicBody` | The protagonist Phaser sprite |
| `cameras` | `CameraManager` | Phaser camera manager |
| `time` | `Clock` | Timer events and clocks |
| `tweens` | `TweenManager` | Tween manager |
| `physics` | `ArcadePhysics` | Arcade physics manager |
| `sound` | `BaseSoundManager` | Audio playback manager |
| `add` | `GameObjectFactory` | Sprite and shapes factory |
| `make` | `GameObjectCreator` | GameObject creator |
| `textures` | `TextureManager` | Texture cache |
| `anims` | `AnimationManager` | Global animation player |

### Groups & World

| Property | Description |
|----------|-------------|
| `projectiles` | Physics group — player bullets |
| `enemies` | Physics group — enemy entities |
| `enemyProjectiles` | Physics group — enemy bullets |
| `lootShards` | Physics group — collectible shards |
| `walls` | Static physics group — wall boundaries |

### Helper Methods

| Method | Description |
|--------|-------------|
| `label(x, y, text, style?)` | Spawn high-res UI text (DPR-aware — always use this, never `add.text`) |
| `showLetterbox(dur?)` / `hideLetterbox(dur?)` | Cinematic aspect-ratio bars |
| `showBubbleText(target, text, color)` | Floating speech bubble above a sprite |
| `showPassiveIconText(x, y, text, color)` | Pop-up floating message |
| `showDamageNumber(x, y, amount, color)` | Falling damage number |
| `setControlsInverted(on)` | Flip WASD movement direction |
| `triggerQTE(boss, callback)` | Invoke the React QTE interface |
| `logMessage(msg)` | Append to the overlay HUD message board |
| `onStoryDialogue(payload, done)` | Push a dialogue window to the React overlay |
| `mountExternalGame(opts, onDone)` / `unmountExternalGame()` | Load/unload external JS minigame |
| `damagePlayer(amount, source)` | Reduce player HP (respects i-frames and QTE lock) |
| `hideActor(id)` / `showActor(id)` | Hide/show a story actor sprite |
| `applyDirectionalAnim(sprite, id, vx, vy, facesLeft?)` | Apply walk-facing animation |
| `audioController` | Direct reference to `AudioController` |

### Scene Data

| Property | Description |
|----------|-------------|
| `currentLevelIndex` | Current level stage index |
| `spawnedBoss` | Active boss sprite, or `null` |
| `isBossActive` | `true` during boss combat |
| `qteActive` | `true` while QTE modal is open |
| `playerClass` | Character class stats object |
| `chapter` | Full `ChapterConfig` for the active chapter |
| `propSprites` | `Map<string, Sprite | Image>` — all placed scenery |
| `poolNameplates` | `Map<string, Text>` — in-world nameplates |
| `actorSprites` | `Record<string, GameObject[]>` — story actor sprites |

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

Export a named config interface and use it in the generic, for example
`GameMode<MyNewMinigameConfig>`. Avoid `config: any`.

### Optional narrative hooks

If your mode needs to react while a story beat fires during its runtime:

```typescript
onDialogue(beat: Extract<Beat, { type: 'dialogue' }>): void { ... }
onCameraPan(beat: Extract<Beat, { type: 'cameraPan' }>): void { ... }
```

## 3. Register the Mode

Add the mode ID/config pair to `ModeConfigMap` and the runtime ID to `MODE_IDS`
in `src/contracts/mode-configs.ts`, then open `src/game/modes/index.ts` and register:

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
  background: false,                 // true = run concurrently, don't block story beats
  loseGoto: 'some-beat-id'           // Optional: on outcome:'lose', jump here instead of advancing
}
```

## 5. The Result Contract (win/lose + context)

A mode reports its outcome by calling `onComplete(result)` **exactly once**. That
is the *only* thing a mode does to end — do **not** call `teardown()` yourself; the
host calls it (and unfreezes the scene) automatically right after `onComplete`.

```typescript
interface ModeResult {
  outcome?: 'win' | 'lose' | 'skip';
  data?: unknown;   // free-form context: score, streak, which choice, etc.
}
```

- **`outcome`** drives narrative routing. On `'lose'`, if the beat set `loseGoto`,
  the host jumps to that beat (e.g. restart a scene); otherwise it advances
  normally. `'win'` / `'skip'` always advance.
- **`data`** is your "little extra context" — carry a score, max streak, or the
  option the player picked. It's stored on the scene as the last minigame result
  for later beats/logic to read. Keep it a plain serializable object.

The host wraps mode completion with `onceModeCompletion`, so duplicate callbacks
cannot advance the story or tear down twice. Still guard your mode's own resolve
path with a `modeEnded` flag when it performs local work before calling the host
(see `complicityReport` and `benTrivia`):

```typescript
private resolve(outcome: 'win' | 'lose') {
  if (this.modeEnded) return;
  this.modeEnded = true;
  this.onComplete({ outcome, data: { score: this.score } });
}
```

## 6. Gotchas Worth Knowing Up Front

These bit the `benTrivia` build and aren't obvious from the interface:

- **Blocking minigames freeze the player.** A non-`background` beat calls
  `freeze()`, which sets `dialogueOpen=true` and zeroes player velocity — WASD
  movement is dead for the mode's duration. If your minigame needs player-driven
  motion, **don't** rely on the frozen player sprite: render your own avatar/token
  and move it via tweens, and read input from a `window` `keydown` listener (remove
  it in `teardown()`). See `benTrivia` for the pattern.
- **`preload()` may run twice** — once during the scene's preload phase and again
  at beat start. Phaser's keyed `load.*` calls are idempotent, so this is fine as
  long as `preload` only registers assets and does no side effects.
- **`teardown()` is called for you** on completion *and* on scene shutdown. It must
  destroy every object/timer/tween/listener you created — track them in an array
  and null your `onComplete` ref. Leaks here bleed into the next scene.
- **Full-screen UI (takeover) conventions.** For a card/quiz/overlay mode, copy
  `complicityReport`/`benTrivia`: depth ≥ `9600` (above the letterbox at 9500) and
  `setScrollFactor(0)` on everything. `scrollFactor(0)` does NOT cancel camera zoom —
  positions render displaced and sizes render at `size * zoom`. Import
  **`screenSpace()` from `src/game/modes/screenSpace.ts`** and run coords through
  `zx()/zy()` and sizes/fonts through `s()` (see `_template/`). Use an oversized
  opaque bg rect so it covers the viewport at any scroll/zoom.
- **Always use `ctx.label(...)`, never `add.text`** — `label()` applies the DPR
  resolution fix; raw text renders blurry.
- **Variable-length text (CSV/data-driven copy) needs top-anchoring + auto-shrink,
  not a fixed center anchor.** If your card/prompt text length varies (e.g. a
  quiz drawing from a content file), a `setOrigin(0.5)` block wraps to N lines and
  grows both up *and* down from its anchor — a long line silently collides with
  whatever's below it (timer bar, buttons, token). `benTrivia`'s longest claim
  ("pretend to be drunk at home alone on parents alc (Embarrassing)") wrapped to 5
  lines and overlapped the pads until fixed. The pattern: `setOrigin(0.5, 0)` at a
  fixed top-Y so it only grows downward, plus shrink the font size in a loop until
  `text.getWrappedText().length` fits a line cap. See `setCardText()` in
  `benTrivia/index.ts`.

## 7. Playtest Before You Wire It Into a Chapter

You don't need to commit to a host chapter to try a mode out. `getMode()` /
`registerMode()` make it reachable the moment it's registered — the chapter beat
is just *one* entry point.

Fastest loop, no permanent chapter edits:

1. Temporarily insert a `minigame` beat as the **first** beat of any chapter you
   can already reach in dev (e.g. `src/data/chapters/chapter0.maria-brooke.ts`).
2. `npm run dev`, click through character select into that chapter. Since the
   scene reloads chapter data on each full page load, edits to the beat/config
   take effect on refresh — no dev-server restart needed for beat changes (do
   restart if you touched non-chapter source, per the CLAUDE.md caching note).
3. In the browser devtools console, `window.__OMEGA_GAME__` (dev-only global) lets
   you introspect live state without guessing from the screen:
   ```js
   const scene = window.__OMEGA_GAME__.scene.getScene('ChapterScene');
   scene.beatIndex;        // which beat is active
   scene.activeMode?.id;   // the running mode's id, or null
   ```
4. **Revert the temporary beat** once you're done — `git diff --stat` on the
   chapter file should show no changes before you move on to picking its real
   home (or wiring it there for real).

## 8. Verify

```bash
npm run lint        # tsc --noEmit
npm run agent:check -- src/game/modes/myNewMinigame/index.ts
npm run dev         # play through the chapter
```

Write at least one unit test covering your mode's pure logic (routing, scoring,
state machines). The conformance suite also verifies that the registry matches
`MODE_IDS` and that every registered mode exposes its lifecycle. See
`src/game/modes/bossFight/bossFight.test.ts` for a reference.

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

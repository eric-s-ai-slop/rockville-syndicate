# TASK-04 — Dash bug: pressing Space to advance dialogue must not trigger a dash

## Goal
"After chatting and clicking space, it makes you dash, which shouldn't happen." When the player presses **Space**
to advance/close a dialogue, the same key press currently leaks into the gameplay update and fires a dash the
instant the dialogue closes. Stop that.

## House Rules (must follow)
- Don't change physics/collision rects. No new deps; Phaser 3.88.2.
- Done = `tsc --noEmit` clean + `npm run build` clean. Surgical diff (this is a tiny, targeted fix).

## Root cause
Dialogue is advanced by a **DOM keydown listener** in `src/components/DialogueBox.tsx` (it listens for
`Space`/`Enter`/`KeyE`). Meanwhile Phaser tracks the physical Space key independently in `ChapterScene`.

`src/game/ChapterScene.ts > update()`:
```ts
// While a story beat owns the screen, freeze play.
if (this.dialogueOpen) {
  this.player.setVelocity(0, 0);
  return;                              // ← early return: Space "just down" is never consumed here
}
...
if (Phaser.Input.Keyboard.JustDown(this.wasdKeys.SPACE)) {
  this.executeDash(vx, vy);           // ← fires on the first frame after dialogue closes
}
```
Because `update()` early-returns while `dialogueOpen` is true, Phaser's Space key transitions to "down" during the
dialogue but `JustDown` is never read/consumed. The frame the dialogue closes, `JustDown(SPACE)` reads `true` and a
dash fires.

## Implementation
Consume the Space key state every frame while dialogue is open, so a press used for dialogue can't be re-read as a
fresh dash afterward. In the `if (this.dialogueOpen)` block, reset the key before returning:

```ts
if (this.dialogueOpen) {
  this.player.setVelocity(0, 0);
  // Consume any Space/dash input used to advance dialogue so it doesn't leak into a dash
  // on the frame the dialogue closes.
  this.wasdKeys.SPACE.reset();
  return;
}
```

`Phaser.Input.Keyboard.Key.reset()` clears `isDown`/`_justDown` tracking, so on the next frame the key must be
physically pressed *again* to register a new `JustDown`. This is the minimal, correct fix.

### Extra hardening (recommended, still tiny)
A player can also hold Space across the close. To be safe, also require the key to have been released since the
dialogue closed before allowing the next dash — but `reset()` already covers the reported bug. Only add this if
the simple fix still mis-fires in testing:
- Track a `private dashInputArmed = true;` field. Set `false` in the `dialogueOpen` block; in the dash check,
  require `this.dashInputArmed`; re-arm it on a frame where `this.wasdKeys.SPACE.isDown === false`.

Prefer the one-line `reset()` fix unless testing shows it's insufficient.

## Do NOT
- Don't change `DialogueBox.tsx` (its `e.preventDefault()` is fine; the leak is on the Phaser side).
- Don't remove the dash feature or change the dash key.
- Don't touch the movement/animation block (another task owns it).

## Acceptance criteria
- Walk up to an NPC / trigger dialogue, press Space repeatedly to read through it; when the last line closes the
  player does **not** dash.
- Pressing Space during normal gameplay (no dialogue) still dashes as before.
- `npx tsc --noEmit` and `npm run build` clean.

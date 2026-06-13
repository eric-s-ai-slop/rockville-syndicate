# TASK-06 — Audrey fight: controls inverted from the start, always inverted

## Goal
The Audrey boss fight (Chapter 3 `red_pee_bladder`, `bossId: 'boss_audrey'`) must have **inverted controls for the
entire fight** — inverted the moment the fight begins and staying inverted until the fight ends — to make it
harder. Today inversion is only a temporary 4.5s debuff applied when her "Kidney Punch" lands.

## House Rules (must follow)
- Don't change physics/collision rects. No new deps; Phaser 3.88.2.
- Done = `tsc --noEmit` clean + `npm run build` clean. Surgical diff.

## How control inversion already works
`src/game/ChapterScene.ts` stores movement keys in `this.wasdKeys` (W/S/A/D + SPACE). Movement reads them in
`update()`. There's already a temporary inversion used by Audrey's attack:

`triggerRedPeeBladderInversion()` (~line 2032):
```ts
private triggerRedPeeBladderInversion() {
  this.onMessageLog('⚠️ Red Pee Bladder Strike! Controls reversed for 4.5s!');
  this.cameras.main.flash(400, 239, 68, 68);
  const { W, S, A, D } = this.wasdKeys;
  this.wasdKeys.W = S; this.wasdKeys.S = W;
  this.wasdKeys.A = D; this.wasdKeys.D = A;
  this.time.delayedCall(4500, () => {
    this.wasdKeys.W = W; this.wasdKeys.S = S;
    this.wasdKeys.A = A; this.wasdKeys.D = D;
    this.onMessageLog('⚙️ Controls normalized.');
  });
}
```
It works by **swapping the key object references**. This is brittle to stack with a permanent inversion (a temp
swap during an already-swapped state can restore to the wrong mapping). So implement permanent inversion with an
explicit, idempotent state instead of nested swaps.

## Implementation

### 1. Add an explicit inversion flag + helpers
Add a class field:
```ts
private controlsInverted: boolean = false;
```
Add two idempotent helpers (place them near `triggerRedPeeBladderInversion`):
```ts
private setControlsInverted(on: boolean) {
  if (on === this.controlsInverted) return;          // idempotent
  const { W, S, A, D } = this.wasdKeys;
  this.wasdKeys.W = S; this.wasdKeys.S = W;
  this.wasdKeys.A = D; this.wasdKeys.D = A;           // swap is its own inverse
  this.controlsInverted = on;
}
```
(Swapping twice returns to normal, so a single swap toggles state; the flag tracks current direction so callers
can't double-apply.)

### 2. Invert from the start of the Audrey fight
The cleanest hook that does NOT collide with TASK-03 (which edits `summonBossMatch`/`handleBossAI`) is
`runBossFightBeat()` (~line 1376). Inside `launchFight()`, right where the fight actually begins — after
`this.summonBossMatch(beat.bossId, beat.arena);` is called (inside the final `delayedCall`, ~line 1432) — apply
inversion for Audrey:
```ts
this.summonBossMatch(beat.bossId, beat.arena);
if (beat.bossId === 'boss_audrey') {
  this.setControlsInverted(true);
  this.onMessageLog('🩸 Red Pee Bladder Syndrome: controls are REVERSED for this entire fight.');
}
```

### 3. Restore on fight end
Normalize controls when the boss is defeated, in `defeatBossSuccess()` (~line 2238) — add near where it sets
`this.isBossActive = false;`:
```ts
this.setControlsInverted(false);
```
Also normalize in any other fight-exit path to be safe (e.g. game-over / scene shutdown). Check `shutdown()` /
the game-over flow and call `this.setControlsInverted(false)` there too so a later chapter never starts inverted.

### 4. Reconcile with the temporary Kidney-Punch debuff
`triggerRedPeeBladderInversion()` would now *un-invert* for 4.5s (since base state is already inverted) — the
opposite of intended. Two acceptable options:
- **Simplest:** since the whole Audrey fight is now inverted, make `teleportKidneyStrike()` (~line 2014) **stop
  calling** `triggerRedPeeBladderInversion()` (keep the damage + flash). The permanent inversion supersedes it.
- **Or:** repurpose the strike to a different brief debuff (e.g. extra camera flash / brief speed cut) so it still
  feels punishing without touching the now-permanent inversion.

Pick the simplest (remove the temp inversion call). Leave `triggerRedPeeBladderInversion` defined or delete it if
now unused — but if you delete it, make sure nothing else references it (`grep`).

## Acceptance criteria
- Entering the Audrey fight, W/S and A/D are reversed immediately and stay reversed for the whole fight.
- After defeating Audrey (and on game-over), controls return to normal — and the **next** chapter is not inverted.
- No double-invert / wrong-mapping bugs from the old Kidney-Punch debuff.
- `npx tsc --noEmit` and `npm run build` clean.

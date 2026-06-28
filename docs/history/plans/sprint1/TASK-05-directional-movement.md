> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# TASK-05 — Directional movement: fix Nick F side-to-side, implement front/back facing for all characters

## Goal
1. **"Side-to-side movement is still messed up with Nick F."** Diagnose and fix Nick F's horizontal facing/anim so
   he faces the correct way and uses the right frames when moving left/right.
2. **"Front-back movement isn't implemented with any character. Implement."** When a character moves up or down,
   they should face/animate toward (down = front) or away (up = back) — not stay locked to a side-facing pose.

Apply to the **player** (all heroes) and reuse the same logic for **bosses/pursuer** where practical.

## House Rules (must follow)
- Don't change physics/collision rects. No new deps; Phaser 3.88.2. Graceful fallback if a sheet is missing.
- Done = `tsc --noEmit` clean + `npm run build` clean. Surgical diff.

## What exists today
`src/game/SpritePreprocessor.ts > preprocessShowcaseSheet()` returns frame-index arrays:
`idleFrontFrames, idleSideFrames, idleBackFrames, walkFrames, runFrames, attackFrames, hurtFrames, ...`.
**But** side/back are currently just **copies of front** (~lines 347–348):
```ts
idleSideFrames.push(...idleFrontFrames);
idleBackFrames.push(...idleFrontFrames);
```
and there is a **single** `walk` row reused for every direction. `ChapterScene.create()` registers only
`idle_<id>`, `walk_<id>`, `attack_<id>`, `hurt_<id>`, `victory_<id>`, `defeat_<id>` (~line 399). Movement in
`update()` (~lines 1176–1206) only does horizontal facing:
```ts
if (vx < 0) this.player.setFlipX(true);
else if (vx > 0) this.player.setFlipX(false);
...
this.player.play('walk_' + this.playerClass.id) / 'idle_' + ...
```
So vertical movement shows the same side-facing walk → "front/back not implemented."

## Step A — Diagnose Nick F first (don't guess)
Run the game, enter a chapter as Nick F (and compare with another hero), watch left/right movement. Likely causes,
in order of probability:
1. **Source art faces left, not right.** The codebase assumes sprites are drawn facing right (`setFlipX(vx<0)`).
   If Nick F's extracted frames face left, his horizontal facing is inverted vs everyone else. Fix with a
   **per-character facing offset** (see Step C) rather than a global flip.
2. **Bad frame extraction** for his sheet (HANDOFF references "R12 — Nick-F anim frame clamp (console warns)").
   Check the dev console for animation frame warnings when Nick F is active. If his `walkFrames` indices are out of
   range or empty, the preprocessor mis-sliced his sheet. Tighten the fallback so out-of-range frames are clamped
   and empty arrays fall back to `[0]` (the preprocessor already has end-of-function guards ~line 392; verify they
   cover Nick F and add clamping in `registerAnim` ~line 266 if frames exceed the sheet's frame count).
Record what you actually observe and fix that specific cause. Don't apply a blind global flip — it would break the
other heroes.

## Step B — Make the preprocessor expose real directional frames (when the sheet has them)
Showcase sheets are laid out in rows (`rowsData[]`). The current mapping is row0=idleFront, row1=walk, row2=attack
(see comments ~line 216). Many of these sheets contain **directional** rows (front/side/back walk). Extend the
preprocessor to populate `idleSide`/`idleBack` and add `walkFront`/`walkSide`/`walkBack` arrays **when extra rows
exist**, with graceful fallback to the current single-walk behaviour when they don't:

- Add to `SlicedSpriteSheet`: `walkFrontFrames`, `walkSideFrames`, `walkBackFrames` (number[]).
- When `rows.length` indicates additional walk rows are present, map them to front/side/back. When not, set all
  three to the existing `walkFrames` (so behaviour is unchanged for sheets without directional art).
- Stop blindly copying front → side/back for idle **only if** distinct rows are found; otherwise keep the copy.

> Be conservative: if you can't reliably detect distinct directional rows for a given sheet, **fall back to the
> single walk row**. A wrong directional mapping looks worse than reusing one walk. The acceptance bar is "vertical
> movement faces the right way," which Step C achieves even with a single walk row.

## Step C — Directional facing/anim system in `ChapterScene`
Register the directional walk anims in `create()` (next to the existing `registerAnim` calls, ~line 399), guarded
so missing arrays just reuse `walk`:
```ts
this.registerAnim(id, sheetKey, 'walk_front', processed.walkFrontFrames ?? processed.walkFrames, 8, -1);
this.registerAnim(id, sheetKey, 'walk_side',  processed.walkSideFrames  ?? processed.walkFrames, 8, -1);
this.registerAnim(id, sheetKey, 'walk_back',  processed.walkBackFrames  ?? processed.walkFrames, 8, -1);
// likewise idle_front / idle_side / idle_back from idleFront/Side/Back frames
```

Add a helper and call it from the movement block in `update()` (replace the inline flip + walk/idle play, ~lines
1185–1199). It chooses direction from the **dominant axis** of the velocity:
```ts
private applyDirectionalAnim(sprite: Phaser.GameObjects.Sprite, id: string, vx: number, vy: number, facesLeftByDefault = false) {
  const moving = vx !== 0 || vy !== 0;
  let dir: 'front' | 'side' | 'back';
  if (Math.abs(vx) >= Math.abs(vy)) {
    dir = 'side';
    // sprites are drawn facing right; flip when moving left (account for per-char default)
    const movingLeft = vx < 0;
    sprite.setFlipX(facesLeftByDefault ? !movingLeft : movingLeft);
  } else {
    dir = vy > 0 ? 'front' : 'back';   // down = toward camera (front), up = away (back)
    sprite.setFlipX(false);
  }
  const base = moving ? 'walk_' : 'idle_';
  const key = `${base}${dir === 'side' ? 'side' : dir}_${id}`;
  const fallback = `${moving ? 'walk_' : 'idle_'}${id}`;
  const finalKey = this.anims.exists(key) ? key : fallback;   // graceful fallback to single walk/idle
  if (sprite.anims.currentAnim?.key !== finalKey) sprite.play(finalKey, true);
}
```
- `facesLeftByDefault` is the **per-character** fix from Step A. Define a small map of which hero/boss sheets face
  left (set Nick F's value based on what you observed). Most are `false`.
- Keep the existing guards: don't override animation while `isDashing`/`isAttackingAnim` (the surrounding code
  already gates these — preserve that structure; only replace the flip + play lines).

### Bosses / pursuer
`handleBossAI()` (~line 1972) and `handleChaseAI()` (~line 1514) set velocity + `setFlipX(Math.cos(angle)<0)`.
Route them through `applyDirectionalAnim(this.spawnedBoss, bossId, vx, vy, facesLeft)` too, so bosses also face
front/back. (Coordinate with TASK-03 if both merge: TASK-03 adds walk/idle play in `handleBossAI`; this task's
helper supersedes it. Whoever merges second should call `applyDirectionalAnim` and delete the simpler play-calls —
note this in the PR. Per MASTER_PLAN, TASK-03 merges before TASK-05, so this task wins and replaces TASK-03's
boss-anim play lines with `applyDirectionalAnim`.)

## Constraints / cautions
- **Do not change `fireWeapon`'s aim-facing override during combat** (it intentionally flips toward the target —
  documented in the gotchas). Only the locomotion facing changes.
- If directional art genuinely isn't separable from a sheet, shipping "correct facing + single walk anim" (no
  distinct back-walk cycle) is an acceptable result — the explicit user ask is that up/down no longer shows a
  wrong sideways pose, and that Nick F's left/right is correct.

## Acceptance criteria
- Nick F faces and animates correctly moving left and right (matches the other heroes' convention).
- Every hero, moving up vs down, faces away vs toward the camera (front/back), not a locked side pose.
- Bosses/pursuer also face their movement direction.
- No console animation-frame warnings for any hero (incl. Nick F).
- `npx tsc --noEmit` and `npm run build` clean; `npm test` still passes (SpritePreprocessor has unit tests —
  update them if you change its output shape). Note in the PR what you observed for Nick F and which heroes you
  spot-checked for front/back.
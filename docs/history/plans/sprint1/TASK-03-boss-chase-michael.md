# TASK-03 — Boss animations + Michael chase: correct anims, door-on-RUN, knock SFX, catch = instant fight

## Goal (Chapter 6 `ding_dong_ditch_ben`, plus all boss fights)
1. **Bosses don't animate.** Michael (`boss_ben`) and Nick F (`boss_nick_f`) — and every boss — just slide around
   on their idle frame. They must play **walk/run while moving** and **attack while attacking**. ("Michael's
   assets aren't correct, he should be using the running asset when running"; "Nick F boss fight assets aren't
   correct either like Michael's.")
2. **Knock SFX** when the player reaches the front door in Ch6.
3. **Door opens when "RUN" appears** (the chase start = when Michael comes out), not later when the fight launches.
4. **If Michael catches the player during the chase, go straight to the boss fight immediately** — don't wait out
   the chase timer.

## House Rules (must follow)
- Don't change physics/collision rects. Every asset load has a graceful fallback (`safeLoadAudio` +
  `this.cache.audio.exists` / `this.textures.exists` guards). No new deps; Phaser 3.88.2.
- Done = `tsc --noEmit` clean + `npm run build` clean. Surgical diff.

## Background: how boss sprites/anims already work
In `ChapterScene.create()` each boss showcase sheet is processed and these anims are registered (~line 444):
`idle_boss_<id>`, `walk_boss_<id>`, `attack_boss_<id>`, `hurt_boss_<id>`, `defeat_boss_<id>`
(via `registerAnim('boss_<id>', sheetKey, 'walk'|...)`). So the **walk/attack animations already exist** — the AI
just never plays them. (Note: heroes/bosses currently have no separate "run" row; `walk` IS the run cycle. Use
`walk_boss_<id>` as the running animation. A future task may add a distinct run row — don't block on it.)

Boss is spawned in `summonBossMatch()` (~line 2087) and only ever does `this.spawnedBoss.play('idle_boss_<id>')`.
Boss movement happens in `handleBossAI()` (~line 1972). The chase pursuer is separate: `runChaseBeat()` (~line
1451) + `handleChaseAI()` (~line 1514).

---

## Part 1 — Animate bosses while moving / attacking

### `handleBossAI()` (~line 1972)
It sets velocity toward the player and flips X but never changes animation. After computing `bossSpeed`/velocity,
play the walk (run) anim when the boss is actually moving, and idle when not:
```ts
const bossId = this.bossData.id.replace('boss_', '');
const moving = Math.abs(this.spawnedBoss.body.velocity.x) > 5 || Math.abs(this.spawnedBoss.body.velocity.y) > 5;
const walkKey = `walk_boss_${bossId}`;
const idleKey = `idle_boss_${bossId}`;
if (moving && this.anims.exists(walkKey)) {
  if (this.spawnedBoss.anims.currentAnim?.key !== walkKey) this.spawnedBoss.play(walkKey, true);
} else if (this.anims.exists(idleKey)) {
  if (this.spawnedBoss.anims.currentAnim?.key !== idleKey) this.spawnedBoss.play(idleKey, true);
}
```
Guard every `play()` with `this.anims.exists(...)` so the procedural-fallback boss (no sheet) never throws.

### Attack animation
In the attack switch inside `handleBossAI()` (the `if (time - this.lastBossAttackTime > 2000)` block, ~line 1981),
play the attack anim once when an attack triggers, then let it fall back to walk/idle:
```ts
const atkKey = `attack_boss_${bossId}`;
if (this.anims.exists(atkKey)) this.spawnedBoss.play(atkKey, true);
```
Add this right before/after the `switch (this.bossData.id)`. The attack anim is registered with `repeat: 0`
(plays once), so the `moving`/idle logic above naturally takes over on the next frames. Don't fight it — the
per-frame `currentAnim?.key !== walkKey` guard already avoids stomping a still-playing one-shot attack if you order
it so the attack `play` wins on its trigger frame (it will, since it runs after).

> This single change fixes **both** "Michael's assets aren't correct when running" and "Nick F assets aren't
> correct like Michael's" — they share `handleBossAI`.

### `summonBossMatch()` — leave the initial `play('idle_boss_<id>')` as is (it's the spawn pose). No other change.

---

## Part 2 — Knock SFX at the door (Ch6)

### Audio wiring (`src/game/audio.ts`)
Append a clearly-labeled block **at the end of the file** (keeps merges clean):
```ts
// ── KNOCK (TASK-03) ──
// Light wood rap for the Ch6 door approach, played 3x in quick succession = knocking.
import knockUrl from '../assets/audio/kenney_impact-sounds/Audio/impactWood_light_001.ogg?url';
export const KNOCK_URL = knockUrl;
```
**Use `impactWood_light_001.ogg`** (decided by the project owner). Play it **3× in quick succession** (see the
trigger below) so it reads as knocking rather than a single thud. Import via `?url`.

### Load it (`ChapterScene.ts > loadChapterAudio()`, ~line 341)
```ts
this.safeLoadAudio('sfx_knock', KNOCK_URL);
```
(import `KNOCK_URL` from `./audio` alongside the existing audio imports.)

### Trigger it
The Ch6 beat sequence (in `src/data/chapters.ts`, ~line 986) is:
`walkTo {x:440,y:440} "Approach the front door"` → maharko dialogue ("WE KNOW WHAT YOU DID") → narrator ("The door
opens") → `chase` → `bossFight`.

Play the knock when the player **reaches the door**, i.e. when that `walkTo` completes. Cleanest hook: in
`ChapterScene`, when a `walkTo` beat with that marker resolves. The simplest robust approach: in `runWalkToBeat`
(find it via the `case 'walkTo'` in `startBeat`, ~line 1256) detect the door marker and, on arrival, play the knock.
If `runWalkToBeat` only sets the target, add the play in the arrival handler in `update()` (~line 1223 where
`walkTarget` is reached and `advanceBeat()` is called):
```ts
if (d <= this.walkTarget.radius) {
  const wasDoor = this.walkTarget.markerLabel?.includes('front door');  // or a dedicated flag
  this.clearWalkTarget();
  if (wasDoor && this.chapter.id === 'ding_dong_ditch_ben' && this.cache.audio.exists('sfx_knock')) {
    // three quick raps
    [0, 150, 300].forEach(ms => this.time.delayedCall(ms, () => { try { this.sound.play('sfx_knock', { volume: 0.6 }); } catch {} }));
  }
  this.advanceBeat();
}
```
Check the actual `walkTarget` shape (it stores `markerLabel`? if not, stash a boolean when starting the door
walkTo). Keep it guarded so other chapters/markers are unaffected.

---

## Part 3 — Door opens when "RUN" appears (move it earlier)

Today the house swaps to its "door opened" texture inside `runBossFightBeat() > launchFight()` (~line 1384):
```ts
if (this.chapter.id === 'ding_dong_ditch_ben') {
  const houseSprite = this.propSprites.get('prop_watchwater');
  if (houseSprite && this.textures.exists('prop_watchwater_open')) houseSprite.setTexture('prop_watchwater_open');
}
```
But the **chase** beat (where the giant "RUN!!" label appears, in `runChaseBeat`, ~line 1461) runs *before* the
boss fight. Michael "comes out" at RUN.

**Move that door-open block out of `launchFight()` and into `runChaseBeat()`** — place it right after the "RUN!!"
label tween is set up (so the door visibly opens as RUN flashes). Remove it from `launchFight()` to avoid doing it
twice (harmless if it stays, but cleaner to move). Keep the same guards.

> If TASK-01 (prop extraction) has merged, the watchwater texture may now be `prop_watchwater_open` /
> `prop_watchwater_open_clean`. Check both: prefer `'prop_watchwater_open_clean'` if it exists, else
> `'prop_watchwater_open'`. Watchwater is intentionally excluded from TASK-01's sheet list, so plain keys should
> still exist — but guard with `this.textures.exists(...)` either way.

---

## Part 4 — Catch during chase = instant fight

`runChaseBeat()` sets up a contact overlap that currently only knocks the player back (~line 1495) and ends the
chase only on the `durationMs` timer (~line 1511):
```ts
this.physics.add.overlap(this.player, this.chaseSprite, () => {
  if (this.chaseCooldown > this.time.now) return;
  ...knockback + shake + flash...
});
...
this.time.delayedCall(beat.durationMs, () => this.endChase());
```
`endChase()` (~line 1529) destroys the pursuer and calls `advanceBeat()` → which runs the next beat = the
`bossFight`. So "catch → fight immediately" = **on contact, end the chase now** instead of (or in addition to) the
knockback.

Change the overlap to trigger an immediate transition when Michael catches the player:
```ts
this.physics.add.overlap(this.player, this.chaseSprite, () => {
  if (!this.chaseActive) return;             // guard against double-fire
  cam.shake(120, 0.014);
  cam.flash(80, 239, 68, 68);
  this.chaseActive = false;                  // stop the AI immediately
  this.endChase();                           // destroys pursuer + advanceBeat() → bossFight
});
```
Also **cancel the `durationMs` timer** so it can't double-advance. Capture it and remove it in `endChase`, or guard
`endChase` to be idempotent:
```ts
private endChase() {
  if (!this.chaseSprite && !this.chaseActive) return;  // idempotent: ignore a second call
  this.chaseActive = false;
  if (this.chaseSprite) { this.chaseSprite.destroy(); this.chaseSprite = null; }
  if (this.chaseShadow) { this.chaseShadow.destroy(); this.chaseShadow = null; }
  this.advanceBeat();
}
```
Capturing the delayedCall handle and `.remove()`-ing it on catch is cleaner if `advanceBeat()` isn't safe to call
twice — verify `beatActive`/`beatIndex` guards in `advanceBeat`/`startBeat` (~line 1248) and make `endChase`
idempotent as above so the surviving timer is a no-op.

> Design note: the chase contact previously was "never lethal, knockback only." The user explicitly wants catching
> to drop you straight into the fight. Replace the knockback behaviour with the instant-fight transition.

---

## Part 5 — Pursuer running animation (carries Part 1's intent into the chase)
`runChaseBeat`/`handleChaseAI` spawn the pursuer and only `play('idle_boss_<id>')`. In `handleChaseAI()` (~line
1514), play the walk/run anim while chasing (the pursuer is always moving):
```ts
const walkKey = `walk_boss_${bossId}`;   // bossId available from runChaseBeat scope; recompute here:
// const bossId = (this.bossData?.id ?? 'ben').replace('boss_',''); // pursuer is boss_ben
if (this.anims.exists(walkKey) && this.chaseSprite.anims.currentAnim?.key !== walkKey) {
  this.chaseSprite.play(walkKey, true);
}
```
`bossId` for the chase is derived from `beat.pursuerId` in `runChaseBeat`; the simplest path is to store the
resolved `bossId` on a field (e.g. `this.chasePursuerId`) when spawning, then use it in `handleChaseAI`. Guard with
`this.anims.exists`.

## Acceptance criteria
- During the Michael (Ch6) and Nick F (Ch7) fights, the boss visibly **walks/runs** while chasing and plays an
  **attack** animation when it attacks — not a frozen idle frame.
- Walking up to Ben's door triggers an audible knock.
- The house door opens at the moment the "RUN!!" label flashes (chase start), not at fight launch.
- Getting touched by Michael during the chase **immediately** starts the boss fight (no waiting out the timer).
- No crashes if any sheet/audio is missing (procedural fallbacks still work).
- `npx tsc --noEmit` and `npm run build` clean. Note which chapters you visually verified.

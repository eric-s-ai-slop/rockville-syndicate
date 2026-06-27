# Track A — Combat Depth & Game Feel (Execution Spec)

**Budget:** ~16 engineering hours (part of a 50h improvement pass).
**Audience lens:** This is an inside-joke game **for the friend group**. Every mechanic
below must deepen the *gameplay* while **amplifying — never sanding down — the comedy**.
The boss movesets, power-ups, and QTE lines are the jokes; mechanics are the delivery system.

## Why this track
Combat today is characterful but mechanically passive. Confirmed by reading the code:
- **Offense is fully automated.** The player only steers; the weapon auto-fires at the
  nearest target every `cooldown` ms (`ChapterScene.fireWeapon`, called from
  `ChapterScene.ts:1297-1300`). There is no aiming, timing, or resource to manage.
- **The boss is predictable.** It homes in a straight line at constant speed
  (`bossFight/index.ts:391-398`) and attacks on a flat 2000ms timer
  (`bossFight/index.ts:410`).
- **Most attacks have no telegraph.** They fire on a `logMessage` with no wind-up, so
  dodging is pure reaction (exceptions: `teleportKidneyStrike` ring, `echoChamber`).
- **One QTE type.** A multiple-choice "audit" every 9s (`bossFight/index.ts:200-206`).
- **No defensive skill expression.** A dash exists (`executeDash`, `ChapterScene.ts:1654`)
  but grants **no i-frames** — `damagePlayer` is only gated by `qteActive`
  (`ChapterScene.ts:1805-1807`).
- **Two whole systems are defined but unwired:** `POWER_UPS` (`entities.ts:381`, 9 items,
  referenced nowhere) and per-boss `qtePool` (`entities.ts:77`, only `boss_ben_umbc` has one).

## Hard rules (from CLAUDE.md / HANDOFF — do not violate)
- `npx tsc --noEmit` **and** `vite build` must be clean before any item is "done".
- **Never change physics/collision rects.** Dash/i-frames change velocity & a damage gate,
  not body sizes — keep it that way.
- Route all `add.text` through the `label()` helper; square corners only (no `rounded`).
- Every new asset needs a graceful fallback; filenames with spaces/parens use `?url` imports.
- Side effects never go inside React `setState` updaters (StrictMode double-invokes).
- Combat lives inside the `bossFight` mode + scene; respect the `ModeContext` façade
  (`modes/types.ts`) — modes touch the scene only through it.

---

## A1 — Attack telegraphs (~4h)

**Goal:** Make every boss attack *readable and fair* with a short flavored wind-up, so
dodging becomes a skill instead of a coin flip. This is the single biggest fairness win.

**Current state:** `handleBossAI` (`bossFight/index.ts:410-428`) calls the attack method
immediately when the 2s timer elapses. Projectiles spawn the same frame. Only
`teleportKidneyStrike` (ring) and `echoChamber` (collapse) read as telegraphed.

**Design:**
1. Add a reusable `telegraph(x, y, opts)` helper on the boss mode (private), drawing a
   short tween — a pulsing decal / expanding ring / charge-up tint on the boss — for a
   `windupMs` window, then invoking a callback that fires the actual attack.
2. Give each attack a **flavored tell** that sells the joke a beat before it lands:
   - `fireBossCoinAttack` (Eric) — coins *shimmer/stack* above before raining.
   - `teleportKidneyStrike` (Audrey) — already has a ring; keep, lengthen slightly.
   - `deployTireTreadTether` (Florida/Jordan) — tire-screech shake + skid decal.
   - `unleashHeyAoE` (Ben) — boss inhales/scales up, "HEY..." bubble, *then* the shout ring.
   - `dischargeRefundRosterChecks` (Nick F) — "Processing refund…" bubble + green flicker.
   - UMBC Ben's four moves — each gets a 250–400ms tell matching its existing bark.
3. Standardize a **wind-up duration per attack** (≈300–450ms). Telegraph duration should
   scale *inversely* with difficulty (see A3): Hard = shorter tells.

**Implementation:**
- Add `private telegraph(x, y, color, windupMs, onFire): void` to `BossFightMode`.
- Wrap each attack body: telegraph first, fire in the callback. Keep the existing
  `ctx.spawnedBoss`/`qteActive` null-guards inside the callback (the boss may die or a QTE
  may open during the wind-up — bail if so).
- Reuse existing primitives: `ctx.add.circle`, `ctx.tweens.add`, `ctx.cameras.main.shake`,
  `ctx.showBubbleText`. No new assets required (graceful by construction).

**Acceptance:**
- Every boss attack shows a visible tell ≥250ms before damage can occur.
- A standing player who reacts to the tell can avoid most projectile attacks.
- No attack fires after the boss is destroyed or while `qteActive` is true.
- `tsc`/`build` clean.

**Risk:** Low. Pure additive timing; no physics/rect changes.

---

## A2 — Dash i-frames (make the existing dodge matter) (~3h)

**Goal:** Turn the dash from "move faster" into a real dodge with invulnerability frames,
so skilled play can punish telegraphed attacks (pairs with A1).

**Current state:** `executeDash` (`ChapterScene.ts:1654-1696`) sets `isDashing` for 220ms
with a cooldown (1500ms; 900ms for Nick F). `damagePlayer` (`ChapterScene.ts:1805`) only
early-returns on `qteActive` — dashing through a projectile still hurts.

**Design:**
1. Add `private playerInvulnUntil = 0` to the scene.
2. In `executeDash`, set `this.playerInvulnUntil = this.time.now + DASH_IFRAME_MS`
   (≈260ms — slightly longer than the 220ms dash so the exit frame is safe).
3. In `damagePlayer`, after the `qteActive` guard, add:
   `if (this.time.now < this.playerInvulnUntil) { /* whiff fx */ return; }`
4. **Friends flavor:** a successful dodge shows a tiny floating bark via
   `showPassiveIconText` — e.g. "AURA +1", "NaTaKa", "jestermaxxed" — randomized, so
   clean dodges feel rewarding and on-brand.
5. **Readability:** brief blue after-image/alpha pulse on the player while invulnerable
   (reuse the dash visual if one exists; else a quick `setAlpha` flicker tween).

**Implementation:** All in `ChapterScene.ts`; no `ModeContext` change needed (the boss mode
already calls `ctx.damagePlayer`, which now respects i-frames automatically).

**Acceptance:**
- Dashing through a boss projectile during the i-frame window deals 0 damage and shows the
  dodge bark.
- Outside the window, damage applies normally (including the per-class modifiers at
  `ChapterScene.ts:1823-1832`).
- Dash cooldown still prevents spam; Nick F's shorter cooldown still applies.
- Inverted-controls fight (Audrey) still dashes in the correct (inverted) direction.

**Risk:** Low. One new timestamp + one guard line. Watch interaction with A4's
`invincibility` power-up (both should funnel through the same early-return).

---

## A3 — Real difficulty system (~3h)

**Goal:** Replace the cosmetic `difficulty` label (`entities.ts:7`, currently just `'Normal'`
text) with a true Easy / Normal / Hard system the friend group can pick — so the
non-gamers can finish and the sweats can suffer.

**Current state:** No global difficulty. Boss tuning is hard-coded:
HP `config.maxHp`; speed `80 + currentLevelIndex*15` (`bossFight/index.ts:395`);
attack cadence `2000` (`:410`); QTE interval `9000`/`5000` (`:201`).
Settings persistence already exists via `omega-progress-v1` (`src/game/progress.ts`).

**Design:**
1. Define a `Difficulty = 'easy' | 'normal' | 'hard'` with a multiplier table:
   | knob | easy | normal | hard |
   |---|---|---|---|
   | boss HP ×| 0.75 | 1.0 | 1.35 |
   | boss speed ×| 0.85 | 1.0 | 1.2 |
   | attack-interval ×| 1.3 | 1.0 | 0.75 |
   | player damage taken ×| 0.6 | 1.0 | 1.4 |
   | QTE timer ×| 1.4 | 1.0 | 0.7 |
   | telegraph windup ×| 1.3 | 1.0 | 0.7 |
2. Persist `difficulty` in the progress blob (`progress.ts`); default `normal`.
3. Expose it as a chunky 3-state pixel switch on the start/hero screen
   (`GameLayout.tsx` / `ChapterSelect.tsx`) — square, matches the existing R9 aesthetic.
4. Plumb the multipliers into the boss mode via `ModeContext` (add a read-only
   `difficultyMods` object to the façade) and into `damagePlayer` (player-damage ×).
5. **Friends flavor:** name the tiers in-lore — e.g. **"D1 Consumerism" (easy) /
   "Normal" / "ARE YOU 291 LIQUID?" (hard)** — keep the enum stable underneath.

**Implementation:**
- `entities.ts`: add `DIFFICULTY_MODS: Record<Difficulty, {...}>`.
- `progress.ts`: read/write `difficulty` (with the A-track-wide save guard from C3 if that
  ships; otherwise a local `try/catch` + default).
- `types.ts`: add `difficultyMods` to `ModeContext`; wire in `BeatEngine.ts:256`-style façade.
- `bossFight/index.ts`: apply HP at spawn (`config.maxHp * mods.hp`), speed in
  `handleBossAI`, cadence on the 2000ms check, QTE delay on the timer.
- `ChapterScene.damagePlayer`: `finalDmg *= mods.playerDamageTaken`.

**Acceptance:**
- Switching difficulty visibly changes boss HP bar length, aggression, and survivability.
- Choice persists across reload.
- Default run (normal) plays identically to today (multipliers = 1.0).

**Risk:** Medium — touches the façade and several call sites. Keep multipliers in one table
so tuning is a single edit. Verify freeplay (any chapter) still spawns correctly.

---

## A4 — Wire the `POWER_UPS` drops (~4h)  ⭐ highest comedy ROI

**Goal:** Make boss/enemy fights drop the **already-written** inside-joke power-ups. The
content exists in your voice (`entities.ts:381-450`) and is referenced nowhere — this is
pure wiring with huge payoff for the friend audience.

**Current state:** Loot shards drop on boss defeat (`bossFight/index.ts:336-346`) and enemy
kills (`ChapterScene.ts:~1920`), but `handleCollectLoot` (`ChapterScene.ts:1953`) just
destroys them — they grant nothing. `POWER_UPS` defines 9 effects with `effectType`,
`durationMs`, and a `quote`:
- `suspicious_stew` → invincibility (7s) · `harpers_ferry_elixir` → full heal
- `mancera_red_tobacco` → poison aura (10s) · `galaxy_gas` → +speed but inverted (6s)
- `motor_oil_17_in_1` → double damage + no dash CD (8s) · `fck_it_we_ball` → invincible (8s)
- `accutane`, `brainrot_flush`, etc.

**Design:**
1. Some fraction of drops (config per difficulty) become a **power-up pickup** instead of a
   plain shard — render with a distinct tint/icon and the item name floating above.
2. On pickup: show the item's `quote` via `showBubbleText`/`logMessage`, apply the effect
   for `durationMs`, and show an active-buff indicator (reuse `showPassiveIconText`).
3. Map `effectType` → behavior, reusing systems that already exist:
   - `invincibility` → set `playerInvulnUntil` (A2) far ahead for the duration.
   - `heal` → restore HP toward `playerClass.maxHp` (the HP/ledger HUD already exists).
   - `speed_boost` → temp `playerClass.speed` bump **and** `setControlsInverted(true)` for
     `galaxy_gas` (the inversion system already exists at `ChapterScene.ts:1793`) — leans
     into the joke; clear on expiry.
   - `defense_buff` (`motor_oil`) → damage ×2 on `fireWeapon` + zero dash cooldown.
   - `poison_aura` → periodic AoE tick on nearby enemies/boss.
   - `brainrot_clear` (`brainrot_flush`) → reset `brainrotLevel` (system at
     `ChapterScene.ts:1836`).
4. **Single source of truth:** add a small `applyPowerUp(id)` method on the scene with a
   `Map<effectType, () => cleanup>` so timers/cleanup are centralized and can't leak across
   chapter transitions (clear all on `teardown`/scene shutdown).

**Implementation:** Mostly `ChapterScene.ts` (pickup + `applyPowerUp` + active-buff HUD);
small drop-table change in `bossFight/index.ts` and the enemy-death path. Add a unit test
for `applyPowerUp` effect→state mapping (pairs with E3).

**Acceptance:**
- At least 4 power-ups are obtainable and visibly change play (invuln, heal, double-damage,
  galaxy-gas speed+invert).
- Each shows its lore `quote` on pickup.
- Effects expire cleanly; no buff persists into the next chapter; controls un-invert.
- Graceful fallback if a power-up icon texture is missing (tinted shard).

**Risk:** Medium. Timer/cleanup hygiene is the main hazard — centralize and clear on
teardown. Reuse existing invuln/inversion/brainrot systems rather than new ones.

---

## A5 — QTE variety + fix the latent damage bug (~2h)

**Goal:** Stop repeat fights from asking the identical "audit" question, and fix a real
inconsistency where the *shown* QTE and the *applied* damage can disagree.

**Current state:** `GameLayout.tsx:210-215` already picks a random entry from `boss.qtePool`
when present, but **only `boss_ben_umbc` defines a pool** (`entities.ts:669`). Worse,
`bossFight/index.ts:305` applies `this.bossData.weaknessQTE.damage` — the *base* value — even
when a different pool entry (with its own `damage`) was displayed. So harder/easier pool
questions don't actually change the damage dealt.

**Design:**
1. **Author 2–4 `qtePool` entries per boss** in `entities.ts`, in-voice. Examples to match
   each boss's bit: Eric → "Justify the $4.50 Spotify charge"; Audrey → red-pee/galaxy-gas
   lore; Florida/Jordan → gas-money ledger; Nick F → Spain-betrayal / refund logic.
   Keep `weaknessQTE` as the canonical fallback.
2. **Fix the damage path:** have the selected QTE flow its own `damage` back to the mode.
   Cleanest: change the `triggerQTE` callback contract to pass the chosen QTE (or its
   damage) into the success callback, instead of re-reading `weaknessQTE.damage`. Update
   `ModeContext.triggerQTE` signature in `types.ts`, the façade in `BeatEngine.ts:256`, the
   `onTriggerQTE` impl, and the consumer in `bossFight/index.ts:300-310`.
3. *(Optional stretch)* add a second QTE *kind* — a reflex timing-bar variant — selected
   per-boss, so it's not always multiple-choice. Gate behind remaining time.

**Acceptance:**
- Every boss has ≥2 distinct QTE questions; repeats within a fight are minimized.
- The damage applied always matches the QTE that was shown (verify Easy/Hard pool entries
  with different `damage` deal different amounts).
- `weaknessQTE` still works as fallback for any boss without a pool.

**Risk:** Low-medium. The signature change touches 4 files but is mechanical. Mostly content
authoring (the fun part for this audience).

---

## Recommended build order
1. **A1 (telegraphs)** — establishes fairness; everything else builds on readable attacks.
2. **A2 (dash i-frames)** — gives the player the counter-tool A1 makes meaningful.
3. **A5 (QTE fix + pool)** — small code fix + content; independent, good momentum.
4. **A4 (power-ups)** — biggest comedy payoff; depends on A2's invuln plumbing.
5. **A3 (difficulty)** — do last so its multipliers can scale A1 windups, A4 drop rates, and
   A2/`damagePlayer` in one consistent table.

## Verification gate (per item)
- `npx tsc --noEmit` clean · `vite build` clean.
- Manual: run `npm run dev` (port 3324), play a boss fight per touched chapter. Preview
  `canvasH` can be 0 in headless — open the URL directly for interactive combat checks.
- Confirm no physics/collision rects changed (`git diff` should show no body-size edits).
- Re-run `npm test` (94 baseline) + any new A4/A5 unit tests.

## Budget & fit
A1 4h · A2 3h · A3 3h · A4 4h · A5 2h = **16h**. Leaves ~34h of the 50h pass for the other
tracks (content/visual polish — which matters most for the friend audience — plus settings,
audio, and tech-debt). Track B (real prop sprites, flora, dialogue polish) is the natural
next deep-dive given the audience.

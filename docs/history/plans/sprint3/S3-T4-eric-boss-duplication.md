> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# S3-T4 — Multiple copies of the Eric boss

> Fresh agent: read **Global House Rules** in `plans/sprint3/MASTER_PLAN_S3.md` first. Surgical diff only.

## Symptom (owner's words)
"There are multiple copies of Eric boss." (Eric = `boss_eric`, the Chapter 1 `spotify_insurgency` boss. Eric is also
`BOSSES[0]`, the default fallback boss.)

## Your region (do not touch anything else)
`src/game/ChapterScene.ts`, two named methods only:
- `private summonBossMatch(bossConfigId?, arena?)` — around **L2411** (the head of it).
- `private spawnLevelEnemy()` — around **L2243** (the auto-summon trigger).

Locate by method name. Do not edit other methods.

## Root cause
`summonBossMatch()` is **not idempotent**:
```ts
private summonBossMatch(bossConfigId?: string, arena?: ...) {
  this.isBossActive = true;                       // set, but never checked first
  const config = BOSSES.find(b => b.id === bossConfigId) ?? BOSSES[this.currentLevelIndex % BOSSES.length];
  ...
  this.spawnedBoss = this.physics.add.sprite(...); // overwrites ref; old sprite is NEVER destroyed
  // (HP bar, name label, etc. likewise re-created)
}
```
If `summonBossMatch` is called more than once for a fight, each call spawns a **new** sprite and overwrites
`this.spawnedBoss`, leaving the previous sprite orphaned on the map — visible "duplicate" bosses. Chapter 1 reaches a
boss via the wave-clear path in `spawnLevelEnemy()`:
```ts
if (this.enemiesLeftToSpawn <= 0) {
  if (this.enemies.countActive() === 0 && !this.isBossActive) { this.summonBossMatch(); }
  return;
}
```
plus the scripted boss path can also fire `summonBossMatch(beat.bossId, ...)`. Any overlap of triggers (or a re-entry
before `isBossActive` is observed) produces a second Eric. Because Eric is the `BOSSES[0]` / modulo default, mis-routed
summons disproportionately spawn *Eric*.

## The fix (make summoning single-instance, defensively)
1. **Idempotency guard at the very top of `summonBossMatch`**, before any state mutation:
   ```ts
   // Already have a live boss — never spawn a second.
   if (this.isBossActive && this.spawnedBoss && this.spawnedBoss.active) return;
   ```
2. **Defensive cleanup of any stale instance** (covers an edge where `isBossActive` was reset but a sprite lingered):
   right after the guard, if `this.spawnedBoss` exists, destroy it and its associated UI before creating the new one,
   e.g.:
   ```ts
   if (this.spawnedBoss) { this.spawnedBoss.destroy(); this.spawnedBoss = undefined as any; }
   // and destroy/clear the boss HP bar + name label if your codebase keeps refs (bossHpBg/bossHpFill exist ~L142)
   ```
   Keep this minimal — only destroy refs that already exist as fields; do not invent new teardown.
3. Confirm `isBossActive = true` is still set after the guard (so the existing `spawnLevelEnemy` check keeps blocking
   re-summons). Leave `spawnLevelEnemy`'s logic intact unless step 1+2 prove insufficient; if you do touch it, the only
   acceptable change is tightening the existing `!this.isBossActive` guard — nothing else.

## Accept criteria
- Chapter 1: clearing the waves spawns **exactly one** Eric. No second/overlapping Eric sprite appears at any point of
  the fight.
- Other chapters still spawn their correct single boss.
- `npx tsc --noEmit` and `npm run build` clean.

## Verify
`npm run dev`, play Chapter 1 (`spotify_insurgency`) to the boss, confirm a single Eric. Then jump to another chapter's
boss to confirm normal bosses still appear once. Note in your PR which trigger you observed causing the dup (helps the
architect confirm). **Rebase on `main`** before finalizing and re-locate `summonBossMatch` by name — task S3-T3 edits the
adjacent method `dischargeRefundRosterChecks` (~L2407), so confirm your hunk doesn't overlap.
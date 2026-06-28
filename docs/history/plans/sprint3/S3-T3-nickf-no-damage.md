> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# S3-T3 — Nick F deals no damage (Spain betrayal boss fight)

> Fresh agent: read **Global House Rules** in `plans/sprint3/MASTER_PLAN_S3.md` first. Surgical diff only.

## Symptom (owner's words)
"Nick F doesn't do damage in the Spain betrayal boss fight."

## Context
- The Spain betrayal chapter's boss is **Nick F** (`boss_nick_f`).
- Boss damage comes **only** from each boss's special-attack method (dispatched in `handleBossAI()`'s
  `switch (this.bossData.id)`). There is no generic boss-body→player melee damage. So if Nick F's special does no
  damage, Nick F does *zero* damage.
- Nick F's special is `dischargeRefundRosterChecks()` — case `'boss_nick_f'`.

## Your region (do not touch anything else)
**Only** the method `private dischargeRefundRosterChecks()` in `src/game/ChapterScene.ts` (around **L2394–2407**).
Locate it by name, not line number.

## Root cause
```ts
private dischargeRefundRosterChecks() {
  if (!this.spawnedBoss) return;
  this.onMessageLog('💸 Nick Farrar drops Refund Checks — 5% Robinhood fee active!');
  for (let i = 0; i < 6; i++) {
    const check = this.add.rectangle( /* x,y near player */ 24, 14, 0x10b981);
    this.physics.add.existing(check);   // <-- THIS LINE IS MISSING
    this.tweens.add({ targets: check, scale: 1.4, alpha: 0.1, duration: 1800, onComplete: () => check.destroy() });
    this.physics.add.overlap(this.player, check, () => { check.destroy(); this.damagePlayer(15, 'Refund Interest Fee'); });
  }
}
```
The check rectangle is created with `this.add.rectangle(...)` but **never given a physics body**. `physics.add.overlap`
requires both objects to have Arcade bodies, so the overlap callback never fires and `damagePlayer` is never called.
Compare the working pattern in `fireBossCoinAttack()` (Eric), which calls `this.physics.add.existing(coin)` before its
overlap.

## The fix
Add the missing body. Immediately after the `check` rectangle is created and before (or right where it logically
belongs, before the overlap), insert:

```ts
this.physics.add.existing(check);
```

That alone restores damage. Recommended small hardening while you're in this exact method:
- The checks are stationary and rely on the player walking into them. Confirm they still spawn near the player
  (they use `this.player.x/y + Phaser.Math.Between(-200, 200)`); leave that as-is.
- Optional: set the body to non-immovable isn't needed; the overlap is what matters. Do **not** add velocity or change
  the spawn pattern — keep the fix minimal so it merges cleanly.

## Accept criteria
- In the Spain betrayal fight, standing in / walking through the green refund checks deals 15 damage ("Refund Interest
  Fee" appears) and the player HP drops. Nick F is now a real threat.
- No other boss attack changes behavior.
- `npx tsc --noEmit` and `npm run build` clean.

## Verify
`npm run dev`, reach the Spain betrayal boss (use Free Play / the chapter-select toggle to jump there), let Nick F cast
refund checks, walk into one, confirm HP drops and the damage log line appears. Note in your PR.

## Out-of-region note
If during verification you notice **other** bosses also dropping no-body projectiles, do NOT fix them here — list them
in your PR description so the architect can route a sibling task. (Known good: `fireBossCoinAttack` adds a body. Suspect
to *flag, not fix*: `unleashHeyAoE`, `deployTireTreadTether` use `this.physics.add.sprite('bullet')` which already has
a body, so they're fine.)
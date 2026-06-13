# SCRATCHPAD — Project Omega: The Rockville Syndicate

This file is the working notepad for the current agent session. Updated as work progresses.
For canonical next-steps, see `HANDOFF.md`. For phase specs, see `VISUAL_OVERHAUL_PLAN.md`.

---

## Session start: 2026-06-12

---

## CURRENT TASK: P0 — Boss Fight Soft-Lock

### Bug summary
Chapter 1 soft-locks after the Eric boss-intro cinematic. The player is frozen staring at an
empty room. `beatIndex: 9, beatActive: true, dialogueOpen: true, isBossActive: false` — meaning
`freeze()` ran but `summonBossMatch` never fired.

### Root cause (confirmed)
`runBossFightBeat` → `launchFight()` hangs the entire downstream sequence on `cam.pan()`'s
callback firing with `p === 1`.

**The callback never fires `p === 1` in some cases:**
- If the camera is already positioned at or very near `(ax, ay)`, Phaser's pan tween may
  complete instantly or skip the `p === 1` tick entirely (fires `p < 1` then jumps past 1).
- Chapter 1 arena: `beat.arena` is likely undefined or camera already nearby, making `ax/ay`
  equal to current position → pan duration effectively 0 → callback fires at `p = 0` or `p = 1`
  in the same tick before the callback registration finishes.

**Call chain that hangs:**
```
launchFight()
  freeze()
  showLetterbox()
  cam.stopFollow()
  cam.pan(ax, ay, 550, ..., callback)  ← this callback may never reach p===1
    [HUNG HERE — everything below never runs]
    → name-slam labels
    → delayedCall(900) → hideLetterbox(300)
    → delayedCall(320) → startFollow + unfreeze() + summonBossMatch()
```

**Secondary bug (Suspect B):** Name-slam labels use `cam.midPoint.x/y` (world coords) with
`.setScrollFactor(0)` (screen-space rendering). With 2× zoom these land off-screen. Fix: use
`cam.width / 2` and `cam.height / 2` for screen-space coords.

**Suspect C:** `freeze()` is called twice on the intro path:
  1. Before the VS dialogue (`this.freeze()` at line ~1182)
  2. Again inside `launchFight()` at line ~1141
  `freeze()` is idempotent (just pauses physics + sets flag), so harmless. `unfreeze()` is only
  called once (inside `launchFight`'s delayed chain) — pairing is fine.

### Fix (implemented ✅)
**In `launchFight()`:** Remove the pan callback dependency. Fire the name-slam sequence via a
`delayedCall(550, ...)` timed to match the pan duration, with a `delayedCall(100, ...)` safety
margin added (total 650ms). The pan still plays visually; the sequence just no longer waits for
`p === 1` to tick.

**Label coords fixed:** `cam.midPoint.x/y` → `cam.width / 2` (nameLabel) and same for titleLabel.
Both already have `setScrollFactor(0)` so screen-space placement is correct now.

**Also check:** `runCameraPanBeat` uses the same `progress === 1` pattern. Added a watchdog
`delayedCall` fallback there too (belt-and-suspenders: callback still fires if it reaches 1,
but a timer also fires if it doesn't within `durationMs + 200ms`).

### Verification
- [x] `npx tsc --noEmit` — zero errors
- [x] Logic review: `delayedCall(550)` fires unconditionally; pan still plays visually
- [ ] Full interactive play-through: Ch1 boss fight start → finish (blocked by preview canvasH=0 issue)
- [ ] Confirm letterbox cleans up after `cameraPan` beats (Ch2/Ch5)
- [ ] Confirm damage numbers appear in Eric fight
- [ ] Repeat smoke-test for Ch3, Ch5, Ch6, Ch7 bossFight beats

**Preview environment note:** `canvasH=0` in the preview container prevents full interactive testing.
`window.__OMEGA_GAME__` also unavailable (likely `import.meta.env.DEV` scope issue in preview).
Logic and TS compilation verified. Visual test should be done in a real browser (open http://localhost:3000).

---

---

## FIX 2 — DialogueBox: choices never appeared on choice beats

**Bug:** On any `choice` beat, pressing Space did nothing while the prompt was typing.
Choices only appeared after the full typewriter animation (~600ms), but the user pressing
Space (their trained "advance" key) saw no effect and thought the game was stuck.

**Root cause:** The keyboard handler checked `if (showChoices) return` BEFORE checking
for Space, so Space was swallowed without doing anything. `showChoices` is true from the
start of a choice beat (it depends on being on the last line, which is always true for a
single-prompt choice beat).

**Fix (`src/components/DialogueBox.tsx`):**
- Extracted `skipTypewriter()` helper — clears interval, sets full text, returns whether
  it actually did anything
- Reordered `handleAdvance`: `skipTypewriter()` runs first; only then checks `showChoices`
- Reordered keyboard handler: Space/Enter/E always call `handleAdvance` first (regardless
  of `showChoices`), then number keys are checked for choices

**Result:** One Space press instantly skips the typewriter and shows choices. Second Space
press (while choices are visible) correctly does nothing — user must press 1/2/3.

---

## WORK QUEUE (from HANDOFF.md §2)

| # | Task | Status |
|---|------|--------|
| 0 | P0 — Fix boss fight soft-lock (`runBossFightBeat`) | ✅ Fixed + TS clean |
| 1 | Phase D QA sweep (letterbox cleanup, title card, damage numbers) | ⬜ Pending |
| 2 | Phase E — Audio (stage music, SFX, mute toggle) | ✅ Done — TS clean, 🔊 in header |
| 3 | Phase A revisit — LimeZu real tilesets for interiors | ⬜ Pending |
| 4 | Phase F — UI skin (pixel font, portraits, title polish) | ✅ Done — font-display everywhere, theme accent strips, GameScene.ts deleted |
| 5 | Bug: Eric "freezes character" = StrictMode double-advance | ✅ Fixed + verified live |
| 6 | Bug: player sprite not facing movement direction | ✅ Fixed + verified live |

---

## BUG FIX (2nd session) — "Eric freezes character" was a beat-skip, not a freeze

**Real root cause (NOT the boss fight — that was already fine):** `advanceStory`/`chooseStory`
in `GameLayout.tsx` called `prev.done()` **inside the `setActiveStory` updater**. The app is
wrapped in `<StrictMode>`, which double-invokes state updaters in dev → `done()` → `advanceBeat()`
fired **twice**, skipping one beat each dialogue. Because the skipped beats were `walkTo` beats,
the engine landed on the wrong beat with a **stale `walkTarget`** still set → desynced, soft-lock-
feeling confrontation with Eric.

Reproduced live via `__OMEGA_GAME__` + click-driving the dialogue:
- Before fix: `b0->b2` (skipped walkTo b1), `b2->b5` (skipped ledger+dialogue)
- After fix: `b0->b1->b2->b4->b5->b6->b7` — every transition advances exactly one beat.

**Fix:** Mirror `activeStory` into `activeStoryRef`; in advance/choose, read the ref, compute the
next state, then call `setActiveStory(...)` and `cur.done()` **outside** any updater. Null the ref
before calling `done()` so a re-entrant call is idempotent. Side effects must never live in a
setState updater.

**Sprite facing fix (`ChapterScene.ts` update()):** added `setFlipX(vx<0 ? true : vx>0 ? false :
keep)` before the dash/attack branch. Sprites are drawn facing right. Verified: vx=-150→flipX=true,
vx=+150→flipX=false. (Note: during boss combat `fireWeapon` overrides flip to face the aim target —
that's intentional.)

---

## NOTES / GOTCHAS ENCOUNTERED

- `cam.pan()` callback with `p === 1` is unreliable when target ≈ current position. Prefer
  `delayedCall(duration)` for timing guarantees; use the pan callback only as a bonus if it fires.
- `runCameraPanBeat` has the same vulnerability — same fix pattern applies.
- Name-slam labels: any `setScrollFactor(0)` object must be positioned with `cam.width/2`,
  `cam.height/2` (screen px), never `cam.midPoint` (world coords).
- `src/data.ts` had one pending change: added `"DRINK THE STEW"` to `LORE_BARKS` array.

---

## KEY FILES

| File | Role |
|------|------|
| `src/game/ChapterScene.ts` | Main scene: beat engine, camera, boss system |
| `src/data/chapters.ts` | All 8 chapters: beats, actors, map configs |
| `src/components/GameLayout.tsx` | Root state machine |
| `src/components/DialogueBox.tsx` | Typewriter dialogue + choices |
| `HANDOFF.md` | Canonical next-steps + asset inventory |
| `VISUAL_OVERHAUL_PLAN.md` | Phase specs |
| `storyboard/storyboard_0-8.txt` | All lore and dialogue source |

---

## ARCHITECTURE REMINDERS

- Depth order: floor −200 · props/chars Y-sorted · overlay 800 · lights 850 · particles 860 ·
  bubble text 2000 · damage numbers 3000 · area title 5000 · vignette 6000 · walk markers 8000 ·
  letterbox 9500 · boss HP 10000–10002 · boss name slam 12000
- `freeze()` = `dialogueOpen=true` + `physics.pause()` (idempotent)
- `unfreeze()` = `dialogueOpen=false` + `physics.resume()`
- Boss fight ends at `bossBeatResolve()` → `advanceBeat()`
- Dev hook: `window.__OMEGA_GAME__.scene.getScene('ChapterScene')`
- Teleport shortcut for testing:
  `s = window.__OMEGA_GAME__.scene.getScene('ChapterScene'); s.player.setPosition(s.walkTarget.x, s.walkTarget.y)`
- Audio assets have spaces/parens in filenames — import via Vite `?url` imports

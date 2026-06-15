# S3-T7 — Per-chapter QA sweep (fan-out across the agent fleet)

> This is how "get rid of EVERY single bug" is executed with ~50 non-communicating agents **without** them trampling
> each other. It is a **read-only, docs-only** task. You write NO game code. You produce ONE report file.

## Why this shape
Six code tasks (S3-T1…T6) can't absorb 50 agents — and parallel code edits to `ChapterScene.ts` conflict. A QA sweep
can absorb the whole fleet: assign **one chapter per agent**, each agent plays only its chapter and writes only its own
report file. Disjoint files = zero merge conflicts = perfect parallelism. The architect triages all reports into a
region-partitioned **Sprint 3.5 fix wave**.

## Your assignment
You are assigned **exactly one `<chapter> × <lens>` cell** (given to you when dispatched) — one chapter to play, and
one *lens* (bug class) to obsess over while you play it. A focused agent finds more than a generalist skimming
everything. The lenses:

| lens | you hunt only for |
|------|-------------------|
| `visual` | broken/garbled sprites, background-boxed props, wrong scale/aspect, Y-sort/depth glitches, missing assets (gray boxes / `__MISSING`) |
| `audio` | sounds that don't stop, don't play, wrong volume, music/SFX/dialogue imbalance, missing track |
| `combat` | boss/enemy dealing no damage or infinite damage, attacks with no body, duplicate spawns, soft-locks (fight never ends), QTE failures |
| `flow` | dialogue that won't advance, choices that don't register, beats firing twice/never, camera stuck, controls unresponsive (ch3 inversion is intentional) |
| `console` | every devtools warning/error verbatim, especially `Texture has no frame N` |

If you were dispatched with **no lens** (a generalist pass), cover all five and use `freeplay` as your lens slug.

The chapters:

| # | id | name | known watch-items |
|---|----|------|-------------------|
| 1 | `spotify_insurgency` | Eric / Spotify | boss duplication (being fixed in S3-T4) |
| 2 | `nyc_1am_drive` | I-95 Northbound | car asset (S3-T5) |
| 3 | `red_pee_bladder` | Audrey / hospital | inverted controls (intended), Audrey sprite (S3-T6) |
| 4 | `jungle_gym_gambit` | park | — |
| 5 | `florida_highway_duel` | Florida | mustang/camero car assets (S3-T5) |
| 6 | `ding_dong_ditch_ben` | Michael chase | chase→fight handoff, knock SFX, door-open |
| 7 | `spain_betrayal` | Nick F | boss damage (S3-T3) |
| 8 | `cabin_basye` | cabin | reuses ch1 music (no ch8 track) |

(Interludes/epilogues if present: treat each as its own assignment.)

## Method (drive the real game, capture evidence)
1. `npm run dev`, open the game, use the chapter-select **Free Play** toggle to jump to your chapter.
2. Play it **start to finish**: intro dialogue → exploration/waves → any chase → boss fight → victory.
3. At each step, watch for and record:
   - **Visual:** broken/garbled sprites, missing or background-boxed props, wrong scale/aspect, Y-sort/depth glitches,
     off-screen or stuck actors, missing assets (gray boxes / `__MISSING`).
   - **Audio:** sounds that don't stop, don't play, wrong volume, music/SFX/dialogue imbalance, missing track.
   - **Combat:** boss/enemy that deals no damage or infinite damage, player can't damage boss, attacks with no body,
     duplicate spawns, soft-locks (fight never ends), QTE failures.
   - **Flow:** dialogue that won't advance, choices that don't register, beats that fire twice or never, camera stuck,
     controls unresponsive (note: ch3 inversion is intentional).
   - **Console:** open devtools; record every warning/error (especially `Texture has no frame N`).
4. Capture a screenshot for each visual bug.

## Deliverable — ONE uniquely-named file, no code
Create **`plans/sprint3/qa/<chapter-id>__<lens>.md`** — e.g. `plans/sprint3/qa/spain_betrayal__combat.md`,
`plans/sprint3/qa/nyc_1am_drive__visual.md`, or for a generalist `plans/sprint3/qa/cabin_basye__freeplay.md`.

> **CRITICAL — filename collision is the one way this fan-out breaks.** Many agents run at once. The `__<lens>` suffix
> is what keeps every agent's file distinct so there are **zero merge conflicts**. Use the EXACT chapter id and lens
> slug you were dispatched with. Never write the bare `<chapter-id>.md` — always include the `__<lens>` suffix. If two
> agents ever share a cell, append your agent id: `<chapter-id>__<lens>__<agent-id>.md`.

Open a docs-only PR. Touch nothing else. Use this exact template:

```markdown
# QA Report — <chapter-id> (<name>) — lens: <lens>
Agent: <id>  |  Date: <date>  |  Build: <git short sha>

## Verdict: PASS | PASS-WITH-ISSUES | FAIL

## Steps played
1. <what you did> → <what you saw>
...

## Bugs found
### BUG-1 — <one-line title>
- Severity: blocker | major | minor | polish
- Where: <screen/phase, approx coords or actor>
- Repro: <exact steps>
- Expected vs actual:
- Evidence: <screenshot filename / console line>
- Suspected area (optional): <file/method if you can guess>

### BUG-2 — ...

## Console warnings/errors
- <verbatim lines>

## Notes / things that felt off (not necessarily bugs)
- <friction, surprises>
```

## Rules
- **Do not edit any `.ts`/`.tsx`/`.json` game file.** Report only. If you think you know the fix, write it in
  "Suspected area" — do not implement it (that causes conflicts; the architect schedules fixes).
- Keep your report to YOUR assigned chapter, and lead with YOUR lens. Still log a blocker from another lens if it stops
  you from finishing the chapter — but don't go hunting outside your lens; another agent owns each cell.
- Severity honestly: a soft-lock or no-damage boss is a **blocker**; a slightly-off color is **polish**.
- **One file, the exact `<chapter-id>__<lens>.md` name.** This is the whole conflict-avoidance contract.

## What happens next
The architect collects all `qa/*.md`, dedupes, and emits Sprint 3.5 fix tasks — each scoped to a disjoint file/region,
exactly like S3-T1…T6 — so the fix wave is also conflict-free.

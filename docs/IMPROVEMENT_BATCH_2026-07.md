# Focused Improvement Batch — July 2026

Approved plan for a gameplay/content + code-structure batch. Verified against source at
commit `3a64ce3` (stale `docs/archive/TRACK_*.md` used only as input). Status legend:
⬜ not started · 🔨 in progress · ✅ done.

## Context

Repo tooling (CI, ESLint 9, Vitest, Playwright) is in good shape, so this batch targets
gameplay & content plus code structure. Fresh code assessment found:

- **Two finished, registered, never-deployed minigames**: `benTrivia` (polished, tested,
  landed in `3a64ce3`) and `carRide` (built for chapter 5b, which switched to the external
  battleiq mode, stranding its configs as dead consts).
- **A real content bug**: Chapter 8's final choice `goto`s to three sequential ending beats
  with no converge jump — picking ending 1 plays all three endings back-to-back. Confirmed
  as a bug, not intentional montage.
- **Flat middle chapters**: Ch1–7 are ~150–190 lines of dialogue→bossFight; Ch2 has zero
  interactive beats besides one choice.
- **Dead combat content**: power-ups only drop from a boss's *death* shards
  (`src/game/modes/bossFight/index.ts:367`), so all 6 POWER_UPS are unreachable during
  actual combat. `qtePool` and `phaseBarks` already work — no work needed there.
- **Oversized files with clean extraction seams**: `src/data/entities.ts` (1320 ln, ~350 of
  which are provably dead exports) and `src/components/GameLayout.tsx` (1087 ln, ~380 of
  which are pure presentational UI).
- **The `sfx` beat type** is used exactly once in the whole game; ledger beats (the
  signature running gag) are silent. Kenney SFX packs are already vendored.

Decisions made: fix the Ch8 endings bug; carRide's home is **Ch2** (not restoring it to 5b);
benTrivia's home is **Ch8**.

## Items (ordered by impact/effort)

### ⬜ 1. Wire benTrivia into Chapter 8 + fix the triple-ending bug (S/M)

**File:** `src/data/chapters/chapter8.the-cabin.ts` (only file required).

- Ch8 has an unused `propType: 'arcade'` prop at (750,560) — perfect diegetic host
  ("bootleg Ben trivia arcade cabinet at the cabin at 3AM").
- Insert after Maharko's "hot tub hits different at 3AM" beat and before the final choice:
  `walkTo` (750,560, marker "🕹️") → setup dialogue →
  `{ type: 'minigame', modeId: 'benTrivia', config: {...}, introLines: [...], loseGoto: 'bt_lose' }`
  → `bt_win` flavor dialogue → final choice (give it an `id`).
- Lose path: `bt_lose` block placed **after** `endChapter` (reachable only via `loseGoto`):
  shame dialogue + `ledger` gag + single-option `choice` with `goto` back to the
  final-choice id. This is the converge mechanism — `routeOnMinigame`
  (`src/game/scene/BeatEngine.ts:286`) is hardcoded to groupChat's payload and must NOT
  be used here.
- **Endings bug fix**: fold each ending's narrator lines into that option's
  `reactionLines`, `goto` all three options to a new `id: 'finale'` on the existing
  "the villain was Inertia" beat, delete the three `ending_*` dialogue beats.
- Playtest per `docs/ADDING_A_MINIGAME.md` §7 before finalizing pacing.
- While playtesting, eyeball the TV/cabinet prop pair at (480,300): chapter8 stacks a
  `propType: 'tv'` rect AND a `propKey: 'furn_cabinet_tall'` rect at identical coords
  (160×44). Tune rect sizes only if it reads badly (same pattern in chapter1 lines 30–31).

**Verified implementation details:**

- Beat type shape (`src/data/chapters/types.ts:140–155`): `Beat = { id?: string } & (...)`.
  Any beat can carry an `id`; only `ChoiceOption.goto` and minigame `loseGoto` can jump.
  **Dialogue beats cannot `goto`.**
- `BenTriviaConfig` (`src/game/modes/benTrivia/index.ts:26`):
  `{ count?, perPromptMs?, minPromptMs?, strikesAllowed?, seed? }`, defaults
  `16 / 3500 / 1800 / 3` (`round.ts:19`). For a shorter epilogue gag, `{ count: 12 }` is
  reasonable; tune in playtest.
- Minigame outcome flow: win falls through to the next beat; lose jumps to `loseGoto`.

### ⬜ 2. Game-wide SFX pass via existing `sfx` beat + auto-ledger sound (S)

**Files:** `src/game/audio.ts`, `src/game/scene/AudioController.ts`,
`src/game/scene/BeatEngine.ts`, 3–4 chapter files.

- Register 3–5 Kenney one-shots in `audio.ts` (e.g. `handleCoins.ogg` → `sfx_ledger`,
  creak, doorClose, metalClick from the vendored kenney_rpg-audio pack).
- Load them in `AudioController.loadChapterAudio()` via the existing `safeLoadAudio`
  pattern (like `sfx_knock`).
- In `BeatEngine`'s `case 'ledger'`: auto-play `sfx_ledger` (guard `cache.audio.exists`,
  mirror the existing `sfx` case's volume handling). This sounds every ledger gag
  game-wide in one line.
- Sprinkle 4–6 `sfx` beats into flat chapters (Ch2 toll booth click, Ch4 jungle-gym creak,
  Ch1 door, Ch8 creaks).
- **Rejected from stale TRACK_D:** "cabin epilogue track" — `cabin_basye` → `music_ch7`
  mapping is deliberate (comment at `src/game/audio.ts:49`), no unused asset exists.

### ⬜ 3. Boss-fight depth: mid-fight power-up drops + phase escalation (S/M, playtest-gated)

**File:** `src/game/modes/bossFight/index.ts`.

- In `damageBoss()`: detect phase-threshold crossings (66%/33% of effective maxHp). On
  crossing: spawn 1–2 loot shards with `powerUpId` (extract a
  `spawnShards(n, powerUpChance)` helper from the death-shard code at lines ~355–374 and
  reuse in both places), and fire the phase bark deterministically via `showBubbleText`
  (currently a 0.5%/frame roll).
- In `handleBossAI()`: scale `attackInterval` by phase (×1.0/×0.85/×0.7 as HP drops).
  Note `phase` is inverted (1 = lowest HP, line ~467) — keep that convention.
- Pickup path already works (`ChapterScene.ts:1278–1282` applies `powerUpId` shards).
  Respect the overlap-arg-order gotcha (identify objects by group membership).
- Playtest Ch1 (Eric) and Ch6 on normal difficulty for feel. Extract the phase-threshold
  logic as a pure function and unit-test it.

### ⬜ 4. De-formularize Chapter 2 with carRide + small Ch4 touches (M)

**Files:** `src/data/chapters/chapter2.operation-inertia.ts`,
`src/data/chapters/chapter4.jungle-gym-gambit.ts`, possibly
`src/game/modes/carRide/carRide.ts`, cleanup in `src/data/chapters/chapter5b.rose.ts`.

- **Playtest carRide standalone first** (docs §7 pattern: temporary minigame beat). Known
  risk: it pans to hardcoded (460,360) — if framing is off on Ch2's 880-wide map, fix
  carRide to derive center from `ctx.cameras.main` (benTrivia's newer pattern).
- Author a `CarRideConfig` in Ch2: boss "Nick H — The Sleep Goblin", 3 timed phases
  (Bedtime Veto defenses), insert as
  `{ type: 'minigame', modeId: 'carRide', config, loseGoto: 'jacob_melt' }`; lose block
  after `endChapter` converging back (same pattern as item 1).
- Ch4: add a `walkTo` (climb the jungle gym), one `sfx` creak, and a `goto` mini-branch on
  the existing choice. Pure data.
- Delete the stranded `carRideConfigA`/`carRideConfigC` consts and stale
  "[MINIGAME — carRide]" comments in chapter5b.rose.ts (it uses battleiq; Ch2 is carRide's
  home).

### ⬜ 5. Split entities.ts into domain modules + delete dead exports (M, mechanical)

**Files:** new `src/data/entities/` dir replacing `src/data/entities.ts`.

- `types.ts` (interfaces), `heroes.ts` (CHARACTER_CLASSES, NPC_CHARACTERS), `bosses.ts`
  (BOSSES), `combat.ts` (WEAPONS, POWER_UPS, DIFFICULTY_MODS), `barks.ts` (LORE_BARKS),
  `index.ts` barrel. All ~7 importers (`…/data/entities`) resolve unchanged to
  `entities/index.ts`.
- **Delete dead exports** (zero references outside the file, verified): `ENEMIES`/
  `EnemyConfig`, `STATUS_EFFECTS`/`StatusEffect`, `LOOT_SHARDS`/`LootShard`,
  `EPISODIC_LEVELS`.
- Also delete the dead `src/game/modes/classroomAmbience/` directory (not registered in
  `modes/index.ts`, zero references).
- Sequence after item 3 (both touch bossFight's import surface).

### ⬜ 6. Extract SettingsModal, HallOfRecords, ChapterCompleteScreen from GameLayout (M)

**Files:** `src/components/GameLayout.tsx` → new `src/components/SettingsModal.tsx`,
`HallOfRecords.tsx`, `ChapterCompleteScreen.tsx`.

- Three pure-presentational blocks (~380 lines total: settings modal ~866–1073, hall of
  records ~758–838, complete screen ~669–756) move out with narrow props; they use
  `useSettings`/`updateSettings`/`playUi`/`getRunRecords` directly.
- **Do NOT touch** the React↔Phaser bridge `useEffect` (~lines 178–318), QTE overlay,
  dialogue wiring, or refs — the CLAUDE.md StrictMode gotcha lives there. GameLayout drops
  to ~700 lines.
- Run existing `GameLayout.test.tsx` after.

## Implementation notes

- Read `CLAUDE.md` first — its "Hard-Won Gotchas" section is binding (StrictMode setState
  side-effect trap, `label()` for all Phaser text, overlap-arg identification by group
  membership, no camera bounds, per-track audio mixes as inline conditionals, full
  dev-server restart after edits).
- `routeOnMinigame` (BeatEngine.ts:286) is hardcoded to groupChat's payload — do not use
  it for benTrivia/carRide routing; use `loseGoto` + after-`endChapter` blocks as
  described in items 1 and 4.
- Branch before committing.

## Sequencing

- Independent: 1, 2, 3, 4, 6. Sequenced: 5 after 3.
- Suggested order: **Session A** items 1+2 (visible content wins). **Session B** items 3+4
  (combat/minigame, playtest-heavy). **Session C** items 5+6 (structure).

## Verification

1. `npm run lint` (tsc) + `npm run lint:es` after every item — items 5/6 live or die by tsc.
2. `npm test` — extend `src/data/chapters.test.ts` content linter to validate `loseGoto`
   and choice-`goto` targets against beat ids if not already covered; add unit test for
   the extracted phase-threshold function (item 3).
3. `npm run e2e` locally (some full-playthrough specs are CI-skipped).
4. Manual playtest on `npm run dev` (port 3324) with **full server restart** after edits
   (Vite transform cache gotcha): Ch8 trivia win AND lose paths + each of the three endings
   plays alone; Ch2 carRide win/lose; one boss fight per difficulty for item 3 feel; ledger
   SFX audible. Use `window.__OMEGA_GAME__` for state inspection.

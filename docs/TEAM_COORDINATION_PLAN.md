# Project Omega — 100-Hour Improvement Plan (3-Engineer Coordination Doc)

**This is the doc the team lead runs the project from.** It assigns lanes, sequences the
work into phases, maps dependencies, and sets the merge rules that keep three people out of
each other's way. Per-item engineering detail lives in the linked track specs.

- **Budget:** ~100 engineering hours, **3 engineers in parallel** (~33h each).
- **Audience:** an inside-joke game **for the friend group**. North star: *every chapter
  lands for the people who lived it, and the combat is actually fun to play.* Mechanics
  exist to deliver the comedy — never sand the jokes down to make something "cleaner."
- **Spec index — all tracks now have execution-ready specs:**
  - Track A — combat depth → [`COMBAT_DEPTH_PLAN.md`](./COMBAT_DEPTH_PLAN.md)
  - Track B — content & visuals → [`TRACK_B_CONTENT_VISUAL.md`](./TRACK_B_CONTENT_VISUAL.md)
  - Track C — systems, UI, settings, a11y → [`TRACK_C_SYSTEMS_UI.md`](./TRACK_C_SYSTEMS_UI.md)
  - Track D — audio → [`TRACK_D_AUDIO.md`](./TRACK_D_AUDIO.md)
  - Track E — tech debt, perf, tests → [`TRACK_E_TECHDEBT_PERF.md`](./TRACK_E_TECHDEBT_PERF.md)
  - Track F — signature feature → [`TRACK_F_SIGNATURE_FEATURE.md`](./TRACK_F_SIGNATURE_FEATURE.md)
  - Track G — architecture & maintainability → [`ARCHITECTURE_AND_MAINTAINABILITY.md`](./ARCHITECTURE_AND_MAINTAINABILITY.md)

> ### ⚠️ Read this first: the handoff docs are stale
> `HANDOFF.md` and `plans/sprint3/qa/*` describe an **earlier build**. While speccing this
> plan we confirmed several "TODO" items are **already done** — adjust scope accordingly:
> - **Furniture atlas is built & wired** (`furnitureCatalog.ts` + `MapBuilder.drawPropShape`).
>   Track B1 is *coverage*, not greenfield.
> - **Boss-music sting→loop crossfade is done** (`AudioController.startBossMusic`). Track D shrank.
> - **Mute / color-blind / text-scale toggles already exist** (`GameLayout.tsx:48-50`), but in
>   *separate* localStorage keys. Track C *consolidates*, doesn't build from scratch.
> - **The leaderboard server (`server.ts`) is dead code** — the client never calls it, and the
>   game is **all-local by decision** (no server leaderboard). Track F's records feature is
>   `localStorage`-only; the leaderboard API is flagged for removal in Track G2.
> - **The Ch6 knock `?url` bug the QA reports flag is already fixed** (`audio.ts:129`).
>
> **Rule for every engineer: verify against the code, never the handoff.** (Codified in Track G.)

---

## 0. Non-negotiables (apply to every PR, every lane)

From `CLAUDE.md` / live code — these are hard rules, not preferences:
- `npx tsc --noEmit` **and** `vite build` must be clean before a PR merges.
- **Never change physics/collision rects.** Visual/animation changes only around bodies.
- Every new image/audio asset needs a **graceful fallback**; filenames with spaces/parens
  use Vite **`?url` imports**, never hand-built paths.
- **No side effects inside React `setState` updaters** (StrictMode double-invokes in dev).
- Route all Phaser `add.text` through the **`label()`** helper; **square corners only**.
- No Phaser 4 APIs, no new heavy deps.
- `npm test` (94 tests baseline) stays green; new logic ships with new tests.

---

## 1. The three lanes (ownership map)

Balanced to ~33h each and partitioned to **minimize contention on `ChapterScene.ts`** (2,691
lines — the file everyone is tempted to touch).

### 🟥 Engineer A — Combat & Core Systems  *(owns `ChapterScene.ts` + `modes/bossFight/`)*
The only person who edits `ChapterScene.ts` freely. Everything combat, plus the perf work
that lives in the scene/preload path.
- **Track A** — combat depth (16h) — see `COMBAT_DEPTH_PLAN.md`
- **G1** — shrink the `ChapterScene` god object (extract PlayerController / AssetPipeline / PowerUps) (5h)
- **E2** — boot-time perf: profile & cache the in-browser sprite slicer (5h)
- **E3 (combat)** — unit tests for bossFight damage/QTE/power-up logic (4h)
- **G4** — targeted type-safety pass (kill `any` in modes/overlaps) (2h)
- **B4** — Nick-F anim frame clamp (kills the `no frame "96"` warning) (1h)
- **P0** — define the `ModeContext.difficultyMods` contract (1h)
- *Heaviest lane by design — owns the hot file + biggest refactor. F is the relief valve if A overruns.*

### 🟩 Engineer B — Content, Visuals & Audio  *(owns `data/chapters/*`, `MapBuilder.ts`, `audio.ts`, assets)*
The **friend-facing lane** — and the safest place to parallelize, because it's mostly
per-chapter *data files* with near-zero merge conflict. This is where the game "lands."
- **B1** — real prop sprites for interiors (cabin/apartment/hospital stop being colored boxes) (6h)
- **B2** — outdoor flora scatter (Ch2/4/5/8) (3h)
- **B3** — migrate deprecated `tag:` → `propType`/`propKey` (2h)
- **B5** — dialogue micro-polish (portrait pop-in on speaker change) (1h)
- **Track D** — audio: Ch8 cabin track + diegetic SFX (~5h; crossfade already done — see `TRACK_D_AUDIO.md`)
- **G2** — repo & docs hygiene (root cleanup, archive stale docs) (split w/ C, ~1.5h)
- **Full 11-chapter QA pass** — does each chapter land, visually + narratively (8h)
- Buffer (5h)

### 🟦 Engineer C — Systems, UI, Accessibility & Signature Feature  *(owns `GameLayout.tsx`, `ChapterSelect.tsx`, `DialogueBox.tsx`, `progress.ts`, `index.css`)*
Owns the shared foundation everyone depends on, the player-facing settings, and the one
big stretch feature.
- **P0 foundation** — save-blob schema v2 (migration + corrupt guard) + a single settings store (4h)
- **C1** — settings panel: volume / music / SFX / text-speed / difficulty (3h)
- **C2** — accessibility: text-scale, color-blind accent, reduce-motion (caps shake/flash), keyboard nav (3h)
- **A3 (UI side)** — the difficulty switch + persistence (logic side is Engineer A) (2h)
- **E1** — console hygiene: fix `borderColor`/`borderLeft` shorthand warning, `willReadFrequently` (2h)
- **G3** — quality gate: ESLint + CI (tsc/lint/test/build on PR) — **Phase 0** (3h)
- **G2** — repo & docs hygiene (split w/ B, ~1.5h)
- **Track F** — one signature feature (~10–16h, see §6 + `TRACK_F_SIGNATURE_FEATURE.md`)
- Buffer (3h)

---

## 2. Phase plan (sequencing across the three engineers)

Don't fork all three lanes on hour 1 — a tiny shared foundation prevents rework.

### Phase 0 — Foundation & alignment (Day 1, ~4h, **blocking**)
Build the shared pieces multiple lanes depend on, then fork.
| Who | Task |
|---|---|
| C | Save schema v2 + migration + corrupt-blob guard in `progress.ts`; settings store (single source of truth for volume/text-speed/difficulty/a11y) |
| C | **G3 — ESLint + CI gate** (tsc/lint/test/build on PR). Do this *before* lanes fork so the green bar is automatic for parallel work. |
| A | Define `ModeContext.difficultyMods` shape in `modes/types.ts` + façade stub in `BeatEngine.ts` |
| B | Asset audit: what art/audio already exists on disk vs. what B1/B2/D need (avoids mid-sprint asset surprises) |

Phase-2 maintainability (after Phase-1 churn settles): **G1** scene refactor + **G4** type
safety (A), **G2** repo/docs hygiene (B+C). See `ARCHITECTURE_AND_MAINTAINABILITY.md`.
**Gate:** schema + settings store merged to `main` before Phase 1 forks.

### Phase 1 — Parallel build (the bulk, ~70h of the 100)
All three lanes run concurrently on their Track work (A: 23h · B: 20h · C: 10h of build).
Engineer C finishes build earliest by design → rolls into the Phase-2 signature feature.

### Phase 2 — Signature feature, integration & QA (~26h)
| Who | Task |
|---|---|
| C | Track F signature feature (16h) |
| A | E3 combat tests + integration support (10h) |
| B | Full 11-chapter QA pass + buffer (12h) |
**Gate:** full playthrough of all 11 chapters on all 3 difficulties before "done."

---

## 3. Master work breakdown

| Item | Lane | Phase | h | Files | Depends on |
|---|---|---|---|---|---|
| Save schema v2 + settings store | C | 0 | 4 | `progress.ts`, settings store | — |
| `difficultyMods` contract | A | 0 | 1 | `modes/types.ts`, `BeatEngine.ts` | — |
| Asset audit | B | 0 | 1 | (assets) | — |
| A1 telegraphs | A | 1 | 4 | `bossFight/index.ts` | — |
| A2 dash i-frames | A | 1 | 3 | `ChapterScene.ts` | — |
| A5 QTE pool + damage fix | A | 1 | 2 | `entities.ts`, `types.ts`, `BeatEngine.ts`, `bossFight`, `GameLayout.tsx`* | — |
| A4 power-ups | A | 1 | 4 | `ChapterScene.ts`, `bossFight`, `entities.ts` | A2 |
| A3 difficulty (logic) | A | 1 | 1 | `bossFight`, `ChapterScene.ts` | P0 contract |
| A3 difficulty (UI/persist) | C | 1 | 2 | `GameLayout.tsx`/`ChapterSelect.tsx`, settings store | P0 save |
| B1 interior prop sprites | B | 1 | 6 | `MapBuilder.ts`, `chapters/*`, `furnitureCatalog.ts` | — |
| B2 outdoor flora | B | 1 | 3 | `MapBuilder.ts`, `chapters/*` | — |
| B3 `tag:`→`propType` | B | 1 | 2 | `chapters/*` | — |
| B5 dialogue polish | B | 1 | 1 | `DialogueBox.tsx`** | — |
| B4 frame clamp | A | 1 | 1 | `ChapterScene.ts` | — |
| D audio (Ch8/crossfade/SFX) | B | 1 | 8 | `audio.ts`, `AudioController.ts` | — |
| C1 settings panel | C | 1 | 3 | `GameLayout.tsx`, settings store | P0 |
| C2 accessibility | C | 1 | 3 | `GameLayout.tsx`, `index.css`, `ChapterScene.ts`*** | P0 |
| E1 console hygiene | C | 1 | 2 | `ChapterSelect.tsx`, `SpritePreprocessor.ts` | — |
| E2 boot perf | A | 2 | 5 | `SpritePreprocessor.ts`, `ChapterScene.ts` | — |
| E3 combat tests | A | 2 | 4 | `bossFight/*.test.ts` (new) | A1/A4/A5 |
| F signature feature | C | 2 | 16 | `modes/*` (isolated) | — |
| 11-chapter QA pass | B | 2 | 8 | — | all |

\* A5 touches `GameLayout.tsx` (QTE modal) — **coordinate with Engineer C**, who owns that file.
\** B5 touches `DialogueBox.tsx` — owned by C; small, hand off or pair.
\*** C2 reduce-motion needs to cap `cam.shake`/`flash` in `ChapterScene.ts` — **Engineer A makes that edit** (hot-file rule), C provides the flag.

---

## 4. Dependency graph (the cross-lane edges that bite)

```
P0: save schema v2 ─┬─▶ A3 difficulty persistence (C)
   (Engineer C)     └─▶ C1 settings panel, C2 a11y (C)

P0: difficultyMods ──▶ A3 difficulty logic (A) ──▶ scales A1 windups,
   contract (A)                                     A4 drop rates, damagePlayer

A2 dash i-frames (A) ──▶ A4 power-ups reuse the invuln gate (A)

Reduce-motion flag (C, C2) ──▶ shake/flash caps in ChapterScene (A makes the edit)

A5 QTE (A) ──▶ touches GameLayout QTE modal (C's file) — coordinate
B5 dialogue (A-authored?) ──▶ DialogueBox (C's file) — hand to C
```

**Reading:** Engineer C's Phase-0 output is the critical path. If it slips, A3 and all of
Track C slip. Protect it — C does *nothing else* until schema + settings store are merged.

---

## 5. Merge & file-ownership rules

The whole reason for the lane design. Enforce these:

1. **`ChapterScene.ts` has one owner: Engineer A.** B4, C2's shake caps, E2 — any change here
   is made by or routed through A. Other lanes do **not** open PRs against this file without
   coordinating; they'll lose the merge race against a 2,691-line file.
2. **Content lane is conflict-free by construction.** `data/chapters/*.ts` are independent
   files — B (and any extra hands) can work different chapters simultaneously.
3. **Shared files with two stakeholders** (`GameLayout.tsx`, `types.ts`, `BeatEngine.ts`,
   `entities.ts`): the file *owner* (per §1) reviews every cross-lane PR touching it.
4. **Rebase daily.** Short-lived branches per item; merge to `main` as each item passes its
   gate. No week-long mega-branches.
5. **Keep PRs item-sized.** One work-breakdown row ≈ one PR. Easier review, smaller conflicts.

---

## 6. Track F — pick ONE signature feature (Engineer C, Phase 2)

Full detail + acceptance criteria in [`TRACK_F_SIGNATURE_FEATURE.md`](./TRACK_F_SIGNATURE_FEATURE.md).
**Decide before Phase 2 starts.**
1. ⭐ **"Syndicate Hall of Records" — local (~9h, recommended)** — compute a real run score
   (shards + Ledger + boss-clear + difficulty), persist **personal bests in `localStorage`**
   (Track C save blob), and show a records screen that races the hardcoded in-joke "ghost"
   scores (ERH 3333…). **All local — no server leaderboard** (user decision). Highest
   feature-per-hour; fits budget cleanly.
2. **A brand-new chapter (~14–16h)** — most friend-pleasing *content*; the authoring pipeline
   is fully documented (`docs/chapter-pipeline/`). Needs the hours freed elsewhere; watch the
   "new minigame mode" scope trap.
3. **New Game+ / Boss Rush (~10h)** — replayability showcase of the combat work; reuses the
   whole `bossFight` system; pairs with Option 1's scoring.

**F is also the cut reservoir:** if Phase-1 estimates slip, shrink or drop F first — it's the
only item with no downstream dependencies.

---

## 7. Definition of Done (per item) & QA plan

**Per item:** `tsc` clean · `vite build` clean · `npm test` green · no physics-rect diff ·
manual check in the live game (`npm run dev`, port 3324; open the URL directly for
interactive combat — headless preview can report `canvasH=0`).

**Phase-2 full QA (Engineer B, 8h):** play **all 11 chapters** (0,1,2,3,3b,4,5,5b,6,7,8,9)
end-to-end on **Easy/Normal/Hard**, checking the friend-facing bar:
- Every prop renders as art, not a colored box (B1).
- Every boss attack has a readable tell; dash i-frames work; power-ups drop & expire clean.
- Difficulty visibly changes the fight and persists across reload.
- Audio: Ch8 has its own track; boss sting→loop crossfades; door/knock SFX fire.
- No console errors (the border-shorthand and frame-clamp warnings are gone).
- Settings + accessibility toggles work and persist.

Log results in a `docs/qa/` report per chapter (follow the existing QA report format).

---

## 8. Risk register & cut list

| Risk | Mitigation |
|---|---|
| `ChapterScene.ts` merge hell | Single-owner rule (§5.1); item-sized PRs; daily rebase |
| Phase-0 foundation slips → blocks A3 + C | C does foundation first, nothing else, day 1 |
| A3 difficulty touches many call sites | One multiplier table in `entities.ts`; tune in one place |
| A4 power-up timers leak across chapters | Centralize in `applyPowerUp` + clear all on teardown |
| Estimates run long | Cut order: **F → B2 flora → A5 reflex-QTE stretch → C2 nice-to-haves** |
| Asset gaps (no Ch8 track, missing furniture art) | Phase-0 asset audit surfaces these before sprint |

**If the team lands ~80h of the 100:** ship A (combat) + B1/B3/B4 (visuals) + C1 (settings) +
D1/D2 (audio) + E1 (hygiene) + full QA. That alone transforms the friend experience; F and
the deeper a11y/perf work are the trim.

---

## 9. At-a-glance load balance

| Engineer | Phase 0 | Phase 1 | Phase 2 | Total |
|---|---|---|---|---|
| 🟥 A — Combat/Core | 1 | 17 (A 16 · B4 1) | 16 (E2 5 · E3 4 · G1 5 · G4 2) | **34** |
| 🟩 B — Content/Visual/Audio | 1 | 17 (B 12 · D 5) | 15 (QA 8 · G2 1.5 · buf 5.5) | **33** |
| 🟦 C — Systems/UI/Stretch | 7 (P0 4 · G3 3) | 12 (C 10 · A3-UI 2) | 14 (F 12 · G2 1.5 · buf 0.5) | **33** |

*(A is the heaviest at ~34h by design — it owns the hot file and the biggest refactor. If A
overruns, Track F on Engineer C is the relief valve: cut/shrink it and C picks up A's E3/G4.)*

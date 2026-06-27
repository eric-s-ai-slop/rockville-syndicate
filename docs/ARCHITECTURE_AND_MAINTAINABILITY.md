# Track G — Architecture, Best Practices & Maintainability (Execution Spec)

**Budget:** ~12h, split across engineers · **Phase:** 0 (tooling/docs) + 2 (refactors).
This track keeps the codebase healthy *while* five lanes change it in parallel, and leaves it
more maintainable than we found it. Read this **before** writing code in any lane.

---

## 1. Architecture assessment — what's good, keep it

The codebase is in genuinely good shape and follows a clear pattern. **Don't fight it:**
- **Thin orchestrator + subsystems.** `ChapterScene` delegates to `MapBuilder`, `Actors`,
  `AudioController`, `BeatEngine`. New scene behavior should become a subsystem, not another
  method on the scene.
- **Mode registry + `ModeContext` façade** (`modes/index.ts`, `modes/types.ts`). Minigames
  touch the scene *only* through the façade. This is the right seam — extend the façade, don't
  reach around it.
- **Data-driven content.** Chapters are declarative configs (`data/chapters/*.ts`); entities/
  bosses/weapons/power-ups are data (`entities.ts`). Prefer adding data over adding code.
- **Defensive asset loading.** `safeLoadImage`/`safeLoadAudio` + existence checks + procedural
  fallbacks everywhere. Every new asset must follow this.
- **Deterministic procedural scatter** (seeded RNG) so visuals don't shimmer between runs.

## 2. The recurring traps (read these or repeat them)

These are the failure modes that have already bitten this project — some documented in
`CLAUDE.md`, some found during this planning pass:

1. **Documentation drift — the #1 team hazard.** `HANDOFF.md` and the `plans/sprint3/qa/`
   reports describe an *earlier* build. Many "TODO" items are **already done** (furniture
   atlas, boss-music crossfade, the Ch6 knock `?url` fix, text-scale/color-blind toggles).
   **Rule: verify against the code, never trust a handoff.** Every PR that changes behavior
   updates the living docs in the *same* PR (see G3).
2. **God objects.** `ChapterScene.ts` is 2,691 lines; `SpritePreprocessor.ts` is 1,382. They're
   the merge-conflict epicenter and the hardest files to reason about. Single-owner them
   (Engineer A) and shrink the scene (G1).
3. **React StrictMode double-invoke.** Never put a side effect inside a `setState` updater —
   it fires twice in dev and skipped every other beat once. Mirror to a ref, run the effect
   outside the updater. (`CLAUDE.md`; the most expensive bug this project has had.)
4. **Phaser overlap/collider arg position is unreliable.** Identify the intended object by
   group membership (`group.contains(a) ? a : b`), never by argument index. A past bug
   destroyed the boss instead of the projectile.
5. **In-browser boot processing is heavy.** The startup JPG slicer causes the recurring
   `ReadPixels`/`willReadFrequently` warnings and slow first paint (Track E2).
6. **Fragmented persistence.** Four separate localStorage keys (`omega-progress-v1`,
   `omega-muted`, `omega-colorblind`, `omega-textscale`) with no versioning/migration. Unify
   (Track C P0). **Rule: all persisted state goes through the save/settings module — no new
   ad-hoc keys.**
7. **Latent correctness bugs found this pass** (fix opportunistically in the owning lane):
   - `loadProgress()` drops `rose_silence` on read though `setRoseSilence()` writes it
     (`progress.ts:21-25`).
   - QTE applies `weaknessQTE.damage` even when a different `qtePool` entry was shown
     (`bossFight/index.ts:305`) — Track A5.
   - Cabin interior props render as boxes despite a working atlas — propType-mapping gap
     (Track B1).
8. **`any` creep.** `config: any` in modes, `(a: any, b: any)` overlap callbacks,
   `(this.scene.chapter.map as any)`. Erodes the type safety the rest of the project relies on
   (G4).

---

## 3. Maintainability work items

### G1 — Shrink the `ChapterScene` god object (~5h, Engineer A — owns the file)
**Goal:** Bring `ChapterScene.ts` from ~2,700 lines toward a thin orchestrator by extracting
cohesive responsibilities into modules, following the existing subsystem pattern.
**Candidates to extract** (each is self-contained today):
- **Player controller** — movement, dash/i-frames (Track A2), auto-fire (`fireWeapon`),
  footsteps → `scene/PlayerController.ts`.
- **Boot asset pipeline** — the `preprocess*`/atlas orchestration in `create()`/`preload()`
  (`ChapterScene.ts:536-838`) → `scene/AssetPipeline.ts` (pairs with E2's caching).
- **Power-up system** (Track A4) → `scene/PowerUps.ts` from the start, not inline.
**Rules:** behavior-preserving; move, don't rewrite; keep the public methods the
`ModeContext`/`BeatEngine` call. Land in small PRs, one extraction each, `tsc`+`build`+play
after every move. Do this in **Phase 2** so it doesn't churn under Track A's Phase-1 edits.
**Acceptance:** scene materially smaller; no behavior change; all chapters play; tests green.

### G2 — Repo & docs hygiene (~3h, Engineer B/C)
**Goal:** A clean root and a single source of truth for docs.
- **Root clutter:** debug/throwaway scripts live at repo root — `debug_preprocess.js`,
  `debug_preprocess.cjs`, `find_green.cjs`, `inspect_colors.cjs`, `inspect_sheet_columns.cjs`,
  `bench_rows.ts`. Move to `scripts/dev/` or delete if dead. Confirm `dist/`, `db_data/`,
  `test-results/`, and `scripts/voicegen/.venv-tts/` are git-ignored (they should not be tracked).
- **`battleiq/`** (standalone legacy JS prototype): either document it as the `external` mode's
  payload or archive it; don't leave it ambiguous.
- **Leaderboard server is now dead code (user decision: all-local).** The `/api/leaderboard`
  GET/POST + `db_data/leaderboard.json` in `server.ts` are unused — the client never called
  them and Track F is `localStorage`-only. Remove the endpoints + the seed/DB code (keep
  `server.ts` purely as the static bundle host + Vite middleware), and drop the `db_data`
  volume from `docker-compose.yml`/`Dockerfile`/README. Verify the build still serves the SPA.
- **Docs single-source-of-truth:** `HANDOFF.md` + the scattered `plans/sprint*/qa/` are
  *historical*. Add a one-line banner to each marking it archived, and make `CLAUDE.md` +
  `ARCHITECTURE.md` + this doc set the living reference. Add the **"verify against code, not
  docs"** rule to `CLAUDE.md`.
**Acceptance:** clean `ls` at root; nothing build-output tracked in git; every doc is clearly
either "living" or "archived."

### G3 — Quality gate: lint + CI (~3h, Engineer C)
**Goal:** Make the green bar automatic instead of manual, so three parallel engineers can't
silently regress it.
- **ESLint** with `typescript-eslint` (the project has none beyond `tsc`). Minimal,
  high-signal ruleset: `no-floating-promises`, `no-unused-vars`, `no-explicit-any` (warn),
  `react-hooks/exhaustive-deps`. Wire into `npm run lint` alongside `tsc --noEmit`.
- **CI** (GitHub Actions): on PR run `tsc --noEmit` + eslint + `vitest run` + `vite build`.
  This is the automated form of the existing "hard rules" gate — enforce it for every lane.
- Optionally fail CI on `console.log` in `src/` (warnings are fine via the logger) to keep the
  console clean after E1.
**Acceptance:** `npm run lint` runs eslint+tsc; CI blocks a PR that breaks types/tests/build/lint.

### G4 — Targeted type-safety pass (~2h, Engineer A)
**Goal:** Remove the worst `any`s that undercut the façade's guarantees.
- Type `GameMode`/`ModeContext` mode configs via the existing generic `GameMode<Cfg>` instead
  of `config: any` (each mode declares its config shape).
- Replace `(a: any, b: any)` overlap callbacks with typed sprites + the mandated
  group-membership disambiguation (kills trap #4 *and* the `any`).
- Type the `(chapter.map as any).theme` access (theme is on `MapConfig` already).
**Acceptance:** the named `any`s are gone; `no-explicit-any` warnings drop; `tsc` clean.

---

## 4. Forward-looking conventions (apply in every lane, every PR)

A short contract to put in `CONTRIBUTING.md` (create it as part of G2/G3):

1. **Keep `ChapterScene` thin.** New behavior → a `scene/` subsystem or a `modes/` mode, not a
   new method on the scene.
2. **Minigames talk to the scene only through `ModeContext`.** Need something new? Add it to
   the façade with a clear name; don't reach into scene internals.
3. **Data over code.** Prefer extending chapter configs / `entities.ts` to hardcoding in the
   scene. Chapters use the pipeline in `docs/chapter-pipeline/`.
4. **Every asset:** `safeLoad*` + existence check + fallback; `?url` import for any filename
   with spaces/parens.
5. **Persisted state** goes through the save/settings module (Track C P0) — never a new
   ad-hoc `localStorage` key.
6. **No side effects in `setState` updaters** (StrictMode). Mirror to a ref.
7. **Phaser overlaps:** identify by group membership, never argument order.
8. **All Phaser text via `label()`; square corners; `image-rendering: pixelated`.**
9. **New logic ships with a test** — especially anything in `modes/` or `BeatEngine`.
10. **One work-item per PR; rebase daily; respect file ownership** (`TEAM_COORDINATION_PLAN.md`
    §5). The 2,700-line scene is owned by one person.
11. **Update the living docs in the same PR** as the behavior change. Drift is how we got here.

## Budget
G1 5 (A, Phase 2) · G2 3 (B/C, Phase 0+2) · G3 3 (C, Phase 0) · G4 2 (A, Phase 2) = 13h.
G3 (CI/lint) is highest-leverage for a parallel team — **do it in Phase 0** so the gate exists
before the lanes fork.

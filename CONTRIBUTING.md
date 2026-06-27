# Contributing — Project Omega: The Rockville Syndicate

This is the working contract for the 100-hour, 3-engineer improvement pass. It encodes the
conventions that keep parallel work from colliding and the codebase maintainable. The full
plan lives in [`docs/`](docs/README.md) — start with
[`docs/TEAM_COORDINATION_PLAN.md`](docs/TEAM_COORDINATION_PLAN.md).

> **Rule zero: verify against the code, never the handoff.** `HANDOFF.md` and the
> `plans/sprint3/qa/*` reports describe an *earlier* build — several "TODO"s are already done.
> Trust the source.

## The green bar (every PR must pass)

Run before opening a PR — CI enforces all of these:

```bash
npm run lint        # tsc --noEmit (types)
npm run lint:es     # eslint (style/quality)
npm test            # vitest unit suite (94+ tests)
npm run build       # vite client + esbuild server bundle
```

Or all at once: `npm run ci`.

## Hard rules (non-negotiable — from CLAUDE.md + hard-won bugs)

1. **Never change physics/collision rects.** Visual/animation size ≠ body size. The renderer
   already draws art larger than the body — keep the body fixed.
2. **No side effects inside React `setState` updaters.** `<StrictMode>` double-invokes updaters
   in dev; this skipped every other story beat once. Mirror to a ref, run the effect outside.
3. **Phaser overlap/collider callbacks: identify by group membership**, never argument order
   (`group.contains(a) ? a : b`). Positional assumptions have destroyed the wrong object.
4. **Every asset:** `safeLoadImage`/`safeLoadAudio` + an existence check + a graceful fallback.
   Filenames with spaces/parens use Vite **`?url` imports**, never hand-built paths.
5. **All Phaser text through the `label()` helper** (DPR-aware); **square corners only**
   (no `rounded-*`, no `RoundedRect`); `image-rendering: pixelated`.
6. **Persisted state goes through the save/settings module** (`omega-save-v2`) — never a new
   ad-hoc `localStorage` key. (Pre-foundation legacy keys are migrated, not extended.)
7. **No Phaser 4 APIs, no new heavy runtime deps.** Dev tooling (eslint, etc.) is fine.

## Architecture conventions (keep it maintainable)

- **Keep `ChapterScene` thin.** New scene behavior → a `src/game/scene/` subsystem
  (`MapBuilder`, `Actors`, `AudioController`, `BeatEngine`) or a `src/game/modes/` mode — not a
  new method on the 2,700-line scene.
- **Minigames talk to the scene only through `ModeContext`** (`modes/types.ts`). Need something
  new? Add it to the façade with a clear name; don't reach into scene internals.
- **Data over code.** Prefer extending chapter configs (`data/chapters/*.ts`) and `entities.ts`
  to hardcoding. New chapters use the pipeline in [`docs/chapter-pipeline/`](docs/chapter-pipeline/).
- **New logic ships with a test** — especially anything in `modes/` or `BeatEngine`.
- **Update the living docs in the same PR** as the behavior change. Doc drift is how the old
  handoffs became unreliable.

## Working in parallel (lanes & merges)

The lanes, ownership, and phase plan are in
[`docs/TEAM_COORDINATION_PLAN.md`](docs/TEAM_COORDINATION_PLAN.md). The rules that matter:

- **`ChapterScene.ts` has one owner (Engineer A).** It's the merge-conflict epicenter. Other
  lanes route changes to it through A, or hand off the task.
- **One work-item per PR.** Small PRs, reviewed by the file owner, merged as each passes the gate.
- **Rebase daily.** No week-long mega-branches.
- **Content (`data/chapters/*`) is conflict-free** — multiple people can work different
  chapters at once.

## Branch & commit

- Branch per item: `track-<x>/<short-slug>` (e.g. `track-a/dash-iframes`).
- Don't commit to `main` directly; don't commit build output (`dist/`, `db_data/`,
  `test-results/`) — they're git-ignored.
- Keep commit messages imperative and scoped to the item.

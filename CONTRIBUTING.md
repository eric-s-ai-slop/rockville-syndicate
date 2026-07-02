# Contributing — Project Omega: The Rockville Syndicate

Conventions that keep the codebase maintainable and parallel work from colliding.
The technical design lives in [`ARCHITECTURE.md`](ARCHITECTURE.md); the hard-won gotchas are in [`CLAUDE.md`](CLAUDE.md).

> **Rule zero: verify against the code, never the docs.** Files under `docs/archive/` are archived
> and describe earlier builds — many "TODO" items there are already done. Trust the source.

---

## The green bar (every PR must pass)

Run before opening a PR — CI enforces all four:

```bash
npm run lint        # tsc --noEmit
npm run lint:es     # eslint
npm test            # vitest (140+ tests)
npm run build       # vite client + esbuild server bundle
```

Or all at once: `npm run ci`.

CI runs automatically on every push and PR to `main` (see `.github/workflows/ci.yml`).

---

## Hard rules (non-negotiable)

1. **No side effects inside React `setState` updaters.** `<StrictMode>` double-invokes updaters
   in dev — this skipped every other story beat once. Mirror to a ref, run the effect outside.
2. **Phaser overlap/collider callbacks: identify by group membership**, never argument order
   (`group.contains(a) ? a : b`). Positional assumptions have destroyed the wrong object.
3. **Every asset:** `safeLoadImage`/`safeLoadAudio` + an existence check + a graceful fallback.
   Filenames with spaces/parens use Vite **`?url` imports**, never hand-built paths.
4. **All Phaser text through the `label()` helper** (DPR-aware). No `RoundedRect`, no `rounded-*`
   Tailwind classes on Phaser canvases. `image-rendering: pixelated`.
5. **All persistence goes through `src/game/settings.ts`** (`omega-save-v2`). Never add a new
   ad-hoc `localStorage` key. Settings, progress, and Hall of Records all live in one blob.
6. **No Phaser 4 APIs, no new heavy runtime deps.** Dev tooling (eslint plugins, etc.) is fine.
7. **Canvas sizing is driven from `scene.update()` via `syncCanvasToParent()`** — don't add
   ResizeObserver or setInterval alternatives; they're unreliable in embedded contexts.
8. **Do NOT call `cameras.main.setBounds(0,0,1000,1000)`** — it reintroduces black bars on wide
   viewports. Players are confined via physics world bounds + perimeter walls.

---

## Architecture conventions

- **Keep `ChapterScene` thin** (~2,700 lines). New behavior → a `src/game/scene/` subsystem
  (`MapBuilder`, `Actors`, `AudioController`, `BeatEngine`, `PlayerController`) or a
  `src/game/modes/` mode — not a new method on the scene.
- **Minigames talk to the scene only through `ModeContext`** (`modes/types.ts`). Need something
  new? Extend the façade; don't reach into scene internals.
- **Data over code.** Prefer extending chapter configs (`data/chapters/*.ts`) and `entities.ts`
  to hardcoding. New chapters use the pipeline in [`docs/chapter-pipeline/`](docs/chapter-pipeline/).
- **New logic ships with a test** — especially anything in `modes/` or `BeatEngine`.
- **Update the living docs in the same PR** as the behavior change. Drift is how the old
  handoffs became unreliable. Living docs: `CLAUDE.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`,
  `README.md`, `ROADMAP.md`, and the directory cheat sheets `src/data/chapters/CLAUDE.md`
  and `src/game/modes/CLAUDE.md` (the mode table is enforced by `modesDoc.test.ts`).

---

## Branch & commit

- Branch per item: `track-<x>/<short-slug>` (e.g. `track-a/dash-iframes`).
- Don't commit to `main` directly; don't commit build output (`dist/`, `test-results/`) —
  they're git-ignored.
- Keep commit messages imperative and scoped to the item.

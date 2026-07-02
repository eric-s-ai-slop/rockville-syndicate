> **ARCHIVED** — Historical planning/handoff doc. May not reflect current code; verify against the source before acting on any item.

# Handoff: `ExternalGameMode` — an iframe pipeline for ingesting standalone games as minigames

> **For an AI agent (Gemini) executing cold.** Read fully before starting. This builds a **reusable pipeline** so that a standalone web game (vanilla JS/HTML/CSS — e.g. the `battleiq/` project) can be dropped into Omega and played as a self-contained **minigame**, sandboxed in an iframe, with near-zero per-game work. The Undertale battle is the **first ingest**, used to prove the pipeline.

---

## 0. Context — the real goal

Omega's owner has a friend who keeps shipping new games/features in a **separate vanilla-JS game** (no modules, DOM-driven, global singletons — `battleiq/` is the example). The goal is **not** to lovingly rebuild each one natively; it's a **cheap, repeatable pipeline** to absorb whatever he ships.

**Strategy: sandbox his game in an iframe, don't port it.** An iframe gives a fully isolated global scope, DOM, keyboard, and CSS — so his code can't collide with or break Omega, and you run *his actual code* rather than a hand-copied transcription. **No cooperation from him** — he's a competitor and must not know his game is being ingested. A shim *you* write (`omega-bridge.js`, layered on top, never editing his files) drives his game and detects win/lose by reverse-engineering his shipped code (see Phase 4). When he updates his game you **re-copy his files and re-verify the shim's hooks** — minutes of upkeep, not a re-port. (Contrast native porting, where every change he makes means re-transcribing his logic by hand.)

**Tradeoffs (accepted):** an iframe minigame looks/feels like *his* game (its own art/audio/fonts), not Omega's, and doesn't share Omega's save/state. That's fine — these minigames are standalone and not connected to each other. Reserve native porting (see `docs/TURN_BATTLE_GAMEMODE_PLAN.md`) only for a feature you later decide must feel first-class.

**The seam already exists.** Omega has a `GameMode` contract (`src/game/modes/types.ts`), a registry (`src/game/modes/index.ts`), and a `minigame` beat dispatched by `BeatEngine`. This plan adds **one** generic `ExternalGameMode` + a React iframe overlay, then each new game is config, not code.

---

## 1. Ground Rules

1. **Re-locate code by grep, not by line numbers here** — they drift.
2. **The iframe is DOM, so React owns it.** It must be mounted by `GameLayout.tsx` (like the existing QTE modal / `DialogueBox`), NOT inside the Phaser canvas. The `GameMode` signals React to mount it via a `ModeContext` bridge callback — model this on the existing `triggerQTE` flow (`onTriggerQTE` in `GameLayout.tsx`, exposed on `ModeContext`, assigned in `ChapterScene`).
3. **Honor the StrictMode setState gotcha** (`CLAUDE.md`): never run side effects inside a React `setState` updater (`<StrictMode>` double-invokes). Mirror state into a ref, read it, then `setState` + side-effects **outside** the updater. The iframe mount/`complete`/unmount path is callback-driven — it WILL bite otherwise. Copy the `activeStory`/`activeStoryRef` pattern.
4. **Never edit the friend's source files.** All Omega-side glue lives in a separate wrapper + shim layered *on top*, so re-copying his updated game stays a drop-in operation.
5. **Validate `postMessage` origin + a shared token** on both ends. Same-origin (served by Vite), so reject anything else.
6. **Verify after every phase:** `npm run lint` clean, `npm test` green, and for runtime phases `npm run dev` + actually play the minigame. Commit per phase on a branch off `main`.

---

## 2. The contract (define this first — everything depends on it)

**Folder convention.** Each ingested game lives under Vite's static dir:
```
public/minigames/<gameId>/
  index.html          # WRAPPER you write — loads his game + the shim. Never his original index.
  omega-bridge.js     # the shim (layered glue; see Phase 3)
  <his files…>        # his game, copied verbatim (game.js, battle.js, style.css, assets…)
  manifest.json       # { id, title, entry, launchModes?: string[] }  (optional metadata)
```
Vite serves `public/` at the web root, so this is reachable at `/minigames/<gameId>/index.html` in dev and prod.

**postMessage protocol** (the *only* coupling):
- **Parent → iframe:** `{ source: 'omega', token, type: 'start', config }` — `config` is the per-invocation payload (e.g. `{ launch: 'battle', enemyId: 'eric' }`).
- **iframe → parent:**
  - `{ source: 'omega-game', token, type: 'ready' }` — sent when the shim has loaded and is waiting (parent shows spinner until this).
  - `{ source: 'omega-game', token, type: 'complete', result: { outcome: 'win'|'lose'|'skip', data? } }` — the only required outbound message. Parent resolves the mode with this.
  - `{ source: 'omega-game', token, type: 'error', message }` — optional; parent treats as `skip` + logs.

The `complete` message is posted by **your shim**, which synthesizes it by wrapping the source game's own win/lose functions (see Phase 4) — the source author is never involved and must not know. Keep this protocol documented in `docs/INGESTING_AN_EXTERNAL_GAME.md` (Phase 6).

---

## 3. Phase plan

### Phase 1 — `ExternalGameFrame` React overlay + bridge
- Add `src/components/ExternalGameFrame.tsx`: full-screen overlay rendering `<iframe src="/minigames/<gameId>/index.html">`. Responsibilities:
  - On mount: `window.addEventListener('message', …)` with **origin + token validation**; on iframe load (or on `ready`) post `start` with the config.
  - **Focus the iframe on mount** so his game receives keyboard input; restore focus to the app on unmount (this is the keyboard-isolation win — but you must hand focus over).
  - Show a loading spinner until `ready`; on `complete`, call the resolve callback and unmount.
  - Provide a dev escape hatch (e.g. Esc → `skip`) and an optional timeout so a misbehaving game can never soft-lock the story.
- Add the bridge to `ModeContext` (`src/game/modes/types.ts`): `mountExternalGame(opts: { gameId: string; config?: unknown }, onDone: (r: ModeResult) => void): void` and `unmountExternalGame(): void`. Wire them in `GameLayout.tsx` (new React state + render `<ExternalGameFrame>`), assign to the scene in `ChapterScene` like `onTriggerQTE`. **Apply the ref-mirror setState rule.**
- **DoD:** with a hardcoded test page in `public/minigames/_probe/` that posts `ready` then `complete` on a keypress, the overlay mounts, focuses, resolves, and unmounts cleanly. Lint/tests green.

### Phase 2 — `createExternalGameMode` factory + registry
- Add `src/game/modes/external/index.ts` exporting `createExternalGameMode(opts: { id: string; gameId: string }): GameMode`. Its `start(ctx, config, onComplete)`:
  - Suspend Omega: `ctx.player.setVelocity(0,0)`, mark battle/active so the scene `update()` and input are gated (mirror how `bossFight` freezes). Optionally duck Omega music via `ctx.audioController`.
  - `ctx.mountExternalGame({ gameId: opts.gameId, config }, (result) => { ctx.unmountExternalGame(); onComplete(result); })`.
  - `teardown()`: ensure `unmountExternalGame()`, restore input/music, resume scene.
- Register instances in `src/game/modes/index.ts`, one per ingested game:
  ```ts
  registerMode(createExternalGameMode({ id: 'battleiq-battle', gameId: 'battleiq' }));
  ```
  The registered mode `id` is the `modeId` chapters reference; the existing characterization test already validates that `minigame` beats point at a registered `modeId`.
- **DoD:** a chapter beat `{ type:'minigame', modeId:'<probe>', config:{…} }` launches the `_probe` page through the real mode and resolves back into the story. Lint/tests/e2e green.

### Phase 3 — The reusable shim + wrapper convention
- Author `omega-bridge.js` (the shim) — a small, game-agnostic file that:
  - Listens for the `start` message (validates token), reads `config`, and invokes the game's entry point / deep-link (e.g. boots straight into a battle with `config.enemyId`).
  - Hooks the game's win/lose endpoints to post `complete` with the right `outcome`. Keep hook points configurable so re-copying his game only needs the hook names re-checked.
  - Posts `ready` once wired.
- Author the wrapper `index.html` — loads his game's scripts/styles **plus** `omega-bridge.js`. If his game uses absolute asset paths, add a `<base href="/minigames/<gameId>/">`. **You never touch his original files**, so his next update = re-copy his files, keep your `index.html` + `omega-bridge.js`.
- **DoD:** the shim + wrapper are documented and proven against the `_probe`, ready to wrap a real game.

### Phase 4 — First ingest: the BattleIQ battle
> **No cooperation from the source author.** The friend is a competitor and must not know his game is being ingested. The shim does everything by reverse-engineering his *shipped* code — calling his globals and wrapping his functions from inside the iframe. Never ask him to add hooks; never rely on a launch param he'd have to implement.

- Copy the needed `battleiq/` files into `public/minigames/battleiq/` (verbatim). **Note:** BattleIQ boots into an overworld, and `battle.js` depends on globals `game`, `GAME_DATA`, `bulletHell`, `pixelArt`, `audio`, `controlsHUD`.
- **`omega-bridge.js` drives his game directly (the only route):** the wrapper loads the battle-relevant files (`battle.js`, `bulletHell.js`, `data.js`, `assets.js`, `audio.js`), and the shim:
  - Minimally stubs whatever globals the battle path needs (`game`, `controlsHUD`) so a battle can run without his overworld.
  - On `start`, calls his entry directly: `battleController.startBattle(config.enemyId)`.
  - **Wraps his own win/lose functions to detect completion** — monkey-patch `battleController.winBattle`, `triggerGameOver` (and `showVictoryScreen`) so your wrapper posts `complete: { outcome }` after his original runs. He added nothing; you intercepted his code from outside.
  - Be **defensive**: feature-detect the entry/hook names (try the known set, `console.warn` if none match) so a rename on his side fails loudly and is a quick fix, not a silent break.
- **Maintenance reality:** because the hooks are his internal names, when he ships changes you re-copy his files and re-verify the hook names. That's shim upkeep (minutes), not a re-port — but it IS recurring since he's actively changing his game.
- Register `battleiq-battle` (Phase 2) and add a `minigame` beat to a chapter (recommend **Chapter 1 / Eric** — easy to reach for testing).
- **DoD:** from Chapter 1, the story hands off to the BattleIQ battle in the iframe, you play a full fight, and win/lose returns to the story. Verify in `npm run dev`; screenshot.

### Phase 5 — Robustness & polish
- Loading spinner + error UI; the Esc/timeout escape hatch; confirm focus returns to Omega after teardown; confirm unmounting the iframe stops his game's loops/audio (it should — the iframe's world is destroyed on unmount).
- Pause/duck Omega's music during the minigame; resume after.
- Confirm teardown is idempotent and runs on scene shutdown (so leaving a chapter mid-minigame can't leak an iframe).
- **DoD:** stress it — launch, finish, relaunch; leave mid-game; trigger the escape hatch. No leaks, no stuck input, story always resumes.

### Phase 6 — Document the pipeline (the actual deliverable) + safety net
- `docs/INGESTING_AN_EXTERNAL_GAME.md` — the cold recipe (see §4 below), the `postMessage` protocol, the manifest format, the focus/keyboard notes, and **how to reverse-engineer a new game's entry + win/lose hooks from its source** (the shim does this with no cooperation from the author).
- A `public/minigames/_template/` example game (trivial: a button that posts `complete: win`) + matching `omega-bridge.js`, as the copy-me reference.
- Extend `src/data/chapters.test.ts`: every external `minigame` beat's `modeId` is registered (already covered) **and** a referenced `gameId` has a `public/minigames/<gameId>/` folder (add a lightweight existence check).
- **DoD:** following the doc, ingesting the `_template` (or a second real game) takes minutes; deliberately referencing a missing `gameId` fails the test.

---

## 4. The per-game pipeline (what "ingesting" looks like after this is built)

This is the payoff — each new game from the friend:

1. **Drop** his files into `public/minigames/<gameId>/`.
2. **Wrap**: add `index.html` (loads his game + shim) and `omega-bridge.js` (point it at his entry + win/lose hooks). Don't edit his files.
3. **Register**: one line in `src/game/modes/index.ts` — `registerMode(createExternalGameMode({ id, gameId }))`.
4. **Place**: add a `{ type:'minigame', modeId:'<id>', config:{…} }` beat to a chapter.
5. **Verify**: `npm run lint && npm test`, then `npm run dev` and play it.

Updating an existing ingest when he changes his game = **redo step 1** (re-copy), re-check the hook names in step 2. Minutes.

## 5. File layout
```
src/components/ExternalGameFrame.tsx     # iframe overlay + postMessage + focus mgmt
src/game/modes/external/index.ts         # createExternalGameMode factory
src/game/modes/types.ts                  # + mountExternalGame/unmountExternalGame on ModeContext
src/game/modes/index.ts                  # register each ingested game
src/components/GameLayout.tsx             # render <ExternalGameFrame> + wire bridge (ref-mirror setState!)
src/game/ChapterScene.ts                 # assign bridge to scene (like onTriggerQTE)
public/minigames/<gameId>/               # per game: index.html (wrapper) + omega-bridge.js + his files
public/minigames/_template/              # copy-me reference
docs/INGESTING_AN_EXTERNAL_GAME.md       # the recipe
```

## 6. Reuse — don't reinvent
- `triggerQTE` in `GameLayout.tsx` — the exact model for a React overlay driven by a `ModeContext` callback that resolves back to a mode.
- `bossFight` mode — model for suspending the scene (player freeze, input gate) while a mode owns the screen, and for clean `teardown`.
- The registry + characterization test — already validate `modeId`s; just extend for `gameId` folders.
- Vite `public/` static serving — no build wiring needed; files are served at `/minigames/...`.

## 7. Verification
1. `npm run lint` after each change; `npm test` + `npm run e2e`.
2. `npm run dev` → reach the chapter with the external `minigame` beat → play to a win and to a loss → confirm the story resumes with the right outcome both times. Test the Esc escape hatch and a mid-game chapter-exit (no leaked iframe).
3. Re-ingest test: change a trivial thing in the `_template` files, re-copy, confirm it still launches — proving the drop-in update path.

## 8. Risk & sequencing
- Phases 1–3 build the reusable machinery (the real value); do them against the `_probe`/`_template` before touching BattleIQ.
- Phase 4 is the first real ingest — its risk is BattleIQ-specific: the shim must reverse-engineer his entry + win/lose hooks from his source (no cooperation, he can't know). Make the hooks defensive/feature-detected so his future renames fail loudly. Expect recurring shim upkeep as he changes his game.
- The StrictMode setState gotcha and **iframe focus management** are the two most likely bug sources — call them out in review.

## Effort
Reusable pipeline (Phases 1–3, 5–6): **~3–5 days.** First BattleIQ ingest (Phase 4): **~1–2 days** (less if the friend adds a launch param, more if a harness is needed). Every subsequent game: **~1–3 days.**
```

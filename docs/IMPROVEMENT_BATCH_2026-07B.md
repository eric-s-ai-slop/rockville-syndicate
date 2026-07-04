# Improvement Batch 2026-07B — Agent Hygiene Pass

Execution plan for small, independent cleanup tasks. Written for low-context agents:
every task is self-contained — the files, decisions, and verification commands are
already specified. **Do not explore beyond what a task names. Do not bundle tasks into
one commit. If a verification step fails, stop and report; do not improvise.**

Ground rules for every task:

- Work on `main` unless told otherwise; one commit per task, message given in the task.
- The green bar must pass before committing: `npm run lint && npm run lint:es && npm test`
- **Concurrency check first**: run `git status --short`. If a file your task touches is
  already modified (` M`), STOP and report — another session owns it right now.
- Never touch `docs/archive/**`, `battleiq/**` (except Task 4's single named file), or
  `public/minigames/**`.

Status legend: `[ ]` open · `[~]` in progress (put your session/PR here) · `[x]` done

---

## Task 1 — [ ] Verify the E2E suite is stable

**Goal:** Confirm `npm run e2e` passes twice consecutively, so the CI e2e gate can be
trusted. No code changes expected.

1. Ensure nothing is running on port 3324 (`lsof -ti:3324` — if a PID appears, STOP and
   report; another session's dev server is up and Playwright results would be polluted).
2. Run `npx playwright install --with-deps chromium` (idempotent).
3. Run `npm run e2e`. Record pass/fail per spec file.
4. Run `npm run e2e` again. Record results.
5. **Both runs fully green** → append a dated line to the "Done" section of `ROADMAP.md`:
   `✅ E2E suite verified stable (2 consecutive green runs, <date>)`. Commit:
   `docs: record E2E stability verification`.
6. **Any spec failed or flaked** (passed one run, failed the other) → do NOT fix it.
   Write the spec name, error output, and which run(s) failed into a new section
   "Flaky/failing E2E specs" at the top of `ROADMAP.md` under Tech Debt, marked 🔴.
   Commit: `docs: record flaky E2E specs for triage`.

**Done when:** ROADMAP.md records the outcome, committed, green bar passes.

---

## Task 2 — [ ] Zero-warning ESLint baseline

**Goal:** `npm run lint:es` exits with **0 errors, 0 warnings**, so any future warning is
signal. Current state (measured 2026-07-04): 0 errors, 162 warnings — 70 `no-explicit-any`,
57 `no-unused-vars`, 33 `no-console`, 1 `prefer-const`, 1 `exhaustive-deps`.

Decisions are pre-made — do not relitigate them:

- `@typescript-eslint/no-explicit-any`: change `'warn'` → `'off'` in `eslint.config.js`
  (in the main rules block). Keep the `// Track G4` comment but reword to: "off — too many
  legacy `any`s for a useful warning; re-enable per-directory when a typed pass happens."
- `prefer-const`: run `npm run lint:fix` (it autofixes these).
- `@typescript-eslint/no-unused-vars`: fix each remaining warning **mechanically only**:
  prefix the unused identifier with `_` (allowed by config) — do NOT delete parameters,
  reorder signatures, or remove imports that are re-exported. If a fix would change any
  runtime behavior, skip it and instead prefix with `_`.
- `react-hooks/exhaustive-deps` in `src/components/GameLayout.tsx`: **do NOT touch** —
  that is Task 3. If it is the only warning left after your pass, that is success for
  this task.
- `no-console` warnings: replace `console.log` with `console.warn` ONLY if the message is
  an error/diagnostic; if it's debug spam, delete the line.

Steps: apply the config change → `npm run lint:fix` → fix remaining warnings per the
rules above → run the full green bar → commit
`chore: zero-warning eslint baseline (except GameLayout exhaustive-deps)`.

**Done when:** `npm run lint:es` output shows at most 1 warning (the GameLayout
exhaustive-deps one), and `npm test` still passes 223+.

---

## Task 3 — [ ] Fix the `exhaustive-deps` warning in GameLayout (CARE REQUIRED)

**Goal:** Resolve the one real stale-closure risk. This is the only task in the batch
that can break gameplay — read before editing.

**Preconditions:** `git status --short` must show `src/components/GameLayout.tsx` clean.
Read the "Never call a side effect inside a React `setState` updater" gotcha in root
`CLAUDE.md` §4 first — the app runs `<StrictMode>`, updaters double-invoke in dev, and
this exact file had a beat-skipping bug from it.

1. Run `npm run lint:es 2>&1 | grep -A2 exhaustive-deps` to find the exact hook and
   missing deps.
2. Prefer, in order: (a) add the missing dep if it is a stable ref/setState function;
   (b) mirror the changing value into a `useRef` updated in its own effect, and read the
   ref inside the callback (the file already uses this pattern — copy it); (c) only if
   both are impossible, keep the suppression but add a comment explaining the stale value
   is intentional and why it is safe.
3. Do NOT restructure the component, extract hooks, or "clean up while you're here."
4. Verify: green bar, then `npm run e2e` — the chapter smoke specs exercise the
   React↔Phaser bridge this file owns. Both must pass.
5. Commit: `fix: resolve exhaustive-deps stale-closure risk in GameLayout`.

**Done when:** `npm run lint:es` is fully 0/0, unit + E2E green.

---

## Task 4 — [ ] Crumb cleanup (single commit)

**Goal:** Remove scaffold leftovers. Exactly these three changes, nothing else:

1. `git rm "battleiq/battle (1).js"` — accidental duplicate-download file in the
   reference-only legacy dir. (This file is the ONE sanctioned exception to the
   "never touch battleiq/" rule; nothing imports it — verify with
   `grep -rn "battle (1)" --include="*.js" --include="*.html" battleiq public` → must
   return nothing except possibly the file itself.)
2. `.env.example`: rewrite the comments to describe reality — `GEMINI_API_KEY` is read by
   `server.ts` via dotenv for server-side Gemini calls; `APP_URL` is the hosted base URL.
   Delete the "AI Studio automatically injects / Secrets panel" sentences. Keep both keys
   and their placeholder values.
3. Leave `metadata.json` untouched (it may still be read by the hosting platform).

Verify green bar (nothing should be affected), commit:
`chore: remove stray battleiq duplicate, fix .env.example scaffold comments`.

**Done when:** the file is gone, `.env.example` has no AI Studio references, green bar
passes.

---

## Task 5 — [ ] Converge hand-rolled zoom math onto `screenSpace()`

**Goal:** Replace per-mode zoom-compensation math with the shared helper
`src/game/modes/screenSpace.ts` (see its doc comment). One mode per commit.

**Preconditions per mode:** the mode's files must be clean in `git status --short`.
As of 2026-07-04, `speakerHunt` and `swarmSurvival` were mid-edit by another session —
check before starting each.

For each of `speakerHunt/index.ts`, `benTrivia/index.ts`, `groupChat/index.ts`,
`stewOffering/index.ts`, `swarmSurvival/index.ts`:

1. Find the local zoom math (`grep -n "cam.zoom" <file>`): patterns like
   `const z = cam.zoom || 1` + `zx`/`zy` closures, or `visW = W / cam.zoom`.
2. Import `{ screenSpace }` from `'../screenSpace'`; replace the local derivation with
   `const { z, zx, zy, s } = screenSpace(cam);` and substitute usages 1:1
   (`w / z` → `s(w)`, local `zx(...)` → helper `zx(...)`). Where a mode only uses
   `visW/visH`, replace with `s(cam.width)` / `s(cam.height)`.
3. **Behavior must be identical** — this is a pure refactor. No layout-value changes, no
   renames beyond the substitution.
4. Verify: green bar, then launch `npm run dev` and playtest the mode's chapter
   (mode→chapter mapping is the table in `src/game/modes/CLAUDE.md`) far enough to see
   the mode's HUD render correctly positioned. If you cannot playtest, run the relevant
   e2e spec instead (`chapter0_minigames.spec.ts` covers groupChat).
5. Commit per mode: `refactor(<modeId>): use shared screenSpace() helper`.

**Done when:** `grep -rn "cam.zoom" src/game/modes --include="*.ts" | grep -v screenSpace`
returns only comments (no arithmetic), all modes verified.

---

## Explicitly OUT of scope for this batch

- Git LFS migration for `src/assets/` (deferred until remote-agent workflows are routine).
- Splitting `ChapterScene.ts` / `SpritePreprocessor.ts` (split only when a feature forces it).
- Anything in `docs/archive/` or `battleiq/` beyond Task 4's named file.

When all tasks are `[x]`: move this file to `docs/archive/`, update the ROADMAP link,
and run `npm test` (the docs link drift-guard will catch a stale pointer).

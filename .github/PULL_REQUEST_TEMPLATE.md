## What & why

<!-- One or two sentences. Link the ROADMAP.md item if applicable. -->

## Green bar

- [ ] `npm run lint` (tsc) — 0 errors
- [ ] `npm run lint:es` — 0 errors
- [ ] `npm test` — all passing
- [ ] Playtested on `npm run dev` (port 3324) if the change is player-visible (full server restart after edits — Vite caches transforms)

## Gotcha check (CLAUDE.md §4 — lint enforces some, not all)

- [ ] No side effects inside React `setState` updaters (StrictMode double-invokes them)
- [ ] Phaser overlap/collider callbacks identify objects by group membership, not argument order
- [ ] Content changes: `goto`/`loseGoto`/`modeId`/`bossId` targets exist (`npm test` runs the content linter)
- [ ] Living docs updated in this PR if behavior changed (incl. `src/data/chapters/CLAUDE.md` / `src/game/modes/CLAUDE.md`)

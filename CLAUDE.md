# Project Omega — Agent Guide

React 19 + Phaser **3.88.2** (not Phaser 4) + Vite + TypeScript + Tailwind v4. This is an AI-developed story RPG based on the owner's friend-group adventures.

## Start here

Route work before searching broadly:

```bash
npm run agent:map -- --target=<domain>
```

Run without a target to list supported domains. The map returns canonical entrypoints, related contracts, a short recipe, and verification commands. Code is canonical; `ARCHITECTURE.md` and `ROADMAP.md` are living references. Ignore `docs/archive/` and `docs/chapter-pipeline/working/` unless history or a draft is explicitly requested.

## Commands

- `npm run dev` — local server on port 3324
- `npm run lint` — TypeScript typecheck
- `npm run lint:es` — ESLint and mechanized repository invariants
- `npm test` — Vitest
- `npm run e2e` — Playwright
- `npm run build` — production build
- `npm run check:agent` — compact full validation
- `npm run agent:check -- <changed-file...>` — compact focused validation
- `npm run agent -- --help` — terminal playtesting toolkit
- `npm run agent:validate-chapter -- <id>` — validate one chapter
- `npm run agent:scaffold-chapter -- <index> <slug>` — create a minimal unregistered chapter
- `npm run agent:scaffold-mode -- <id>` — scaffold a minigame
- `npm run agent -- --gauntlet --playtest-smoke` — all-chapter harness smoke test

## Where work lives

- `src/data/chapters/` — typed chapter maps and beats; read its scoped `CLAUDE.md` when editing there.
- `src/data/entities/` — heroes, bosses, weapons, power-ups, and barks.
- `src/game/ChapterScene.ts` — Phaser lifecycle and subsystem wiring.
- `src/game/scene/contracts.ts` — narrow structural contracts for scene subsystems.
- `src/game/scene/` — actors, audio, beats, chase, maps, player control, sprites, and atmosphere.
- `src/game/assets/chapter/` — typed chapter-specific image manifests; shared assets remain in `ChapterScene`.
- `src/game/modes/` — isolated minigames behind `GameMode`/`ModeContext`; read its scoped `CLAUDE.md`.
- `src/game/settings.ts` — the only persistence layer (`omega-save-v2`).
- `src/components/GameLayout.tsx` — React↔Phaser host bridge.
- `src/components/game/` — focused story/QTE bridge hooks and tests.
- `e2e_tests/agent/` — terminal agent, protocol, validation, and evidence tooling.
- `docs/AGENT_TOOLKIT.md` and `docs/ADDING_A_MINIGAME.md` — detailed recipes, loaded only when relevant.

## Permanent invariants

- Persist only through `src/game/settings.ts`; never add `localStorage` keys. ESLint enforces this.
- Never run side effects inside React `setState` updaters. Mirror live bridge state into a ref, update state, then invoke `done()` or other effects outside the updater.
- Keep `ChapterScene.syncCanvasToParent()` running every frame. Leave the React ResizeObserver backup in place.
- Never set main camera bounds. Physics bounds and perimeter walls confine the player; camera bounds reintroduce wide-screen black bars. ESLint enforces this.
- Create Phaser text through `label()`, never raw `add.text`. ESLint enforces this.
- For any `scrollFactor(0)` HUD object, use `screenSpace()` for coordinates **and** sizes/fonts/strokes; scroll cancellation does not cancel camera zoom.
- Phaser overlap/collider callback argument order is not stable. Identify objects by group membership.
- Fade rectangles must have `fillAlpha: 1`; set object `alpha: 0` initially and tween object alpha.
- Player art faces right. Preserve movement flip and the boss-combat aim-facing override.
- `map.theme` drives procedural decoration; do not use indoor themes for outdoor or void scenes.
- Fix unusually quiet tracks with a per-track target in `AudioController.ts`, not by changing the global mix. Use audio `seek` when a visual must align with a sting's delayed peak.
- `battleiq/` is a read-only legacy prototype. The served adaptation is `public/minigames/battleiq/`; do not edit either without explicit scope.
- Phaser's dev game handle is `window.__OMEGA_GAME__`. Restart Vite after edits when served transforms appear stale.

## Extension rules

Prefer declarative chapter/entity configuration over new engine branches. New minigames implement `GameMode` and use the `ModeContext` façade rather than reaching into scene internals. Add capabilities to the façade deliberately. Keep comments for non-obvious reasons and invariants, not descriptions that repeat the code.

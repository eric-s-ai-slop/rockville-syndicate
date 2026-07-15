# Project Omega — Agent Guide

React 19 + Phaser **3.88.2** (not Phaser 4) + Vite + TypeScript + Tailwind v4. This is an AI-developed story RPG based on the owner's friend-group adventures.

## Route by intent

Use an existing route before broad search or writing a helper. Load detailed documentation only after the route identifies it.

| Intent | First move |
| --- | --- |
| Find chapter code | `npm run -s agent:map -- --target=chapter --id=<chapter-id>` |
| Find mode or domain code | `npm run -s agent:map -- --target=mode --id=<mode-id>` or `--target=<domain>`; run without a target to list domains |
| Diagnose a localized visual/runtime bug | Run `npm run agent:restart-check`, then `npm run agent -- --chapter <id> --diagnostic --repl`; prefer `advance-to`, or use acknowledged `goto`, then `observe --shot` / `screenshot --annotate`. Read `docs/AGENT_TOOLKIT.md` §1. |
| Playtest a full chapter | Read `.agents/skills/playtesting/SKILL.md`, then use `--playtest --repl --checkpoints`; diagnostic evidence cannot prove completion |
| Validate changed code | `npm run -s agent:check -- <changed-file...>`; use `npm run -s check:agent` for the final full gate |
| Inspect registrations | `npm run -s agent:registry`; add `--symbols` only for exact AST declaration ranges |
| Server output looks stale | `npm run agent:restart-check` |
| Create content | `npm run agent:scaffold-chapter -- <index> <slug>` or `npm run agent:scaffold-mode -- <id>` |
| Audit QA evidence | `npm run agent:qa-audit -- <report> [transcript]` |
| Anything else or cross-cutting | Map the nearest domain if useful, inspect canonical code with `rg`, follow the nearest scoped guide, and validate changed files with `agent:check`. This router guides discovery; it does not limit development. |

Standard project commands remain `npm run dev`, `npm run lint`, `npm run lint:es`, `npm test`, `npm run e2e`, and `npm run build`. Code is canonical; `ARCHITECTURE.md` and `ROADMAP.md` are living references. Ignore `docs/archive/` and `docs/chapter-pipeline/working/` unless history or a draft is explicitly requested.

## Agent tooling freeze

Treat the current routing, validation, registry, boundary, and playtesting tools as frozen infrastructure. Change them only to fix a demonstrated bug/drift or after the same workflow failure has recurred at least three times with evidence. Preserve compact default output and opt into expensive detail such as AST ranges. Do not add a general AST dependency graph, parallel validation framework, or speculative abstraction without a measured token/time saving that outweighs its maintenance cost.

Before creating a browser/debug script, test-only runtime hook, or new agent command, check the intent router and the relevant existing command's `--help`. If the existing workflow fails, report that concrete gap; do not silently build a parallel path.

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

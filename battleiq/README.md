# battleiq/ — Legacy Prototype (Reference Only)

This is the standalone vanilla-JS prototype that predates the React 19 + Phaser rewrite.
**Do not edit it, and do not delete it casually** — it is kept as the original source of
the BattleIQ battle system.

## How it relates to the live game

The game does **not** load this directory. The copy that actually ships is
[`public/minigames/battleiq/`](../public/minigames/battleiq/), which was adapted from this
source with two additions:

- `index.html` — the iframe entry point (loads `data.js`, `assets.js`, `audio.js`,
  `bulletHell.js`, `battle.js`, `omega-bridge.js`).
- `omega-bridge.js` — a postMessage shim that wraps the win/lose handlers so the host game
  can react.

The host side lives in the main codebase:

- `src/game/modes/external/index.ts` — `createExternalGameMode()` factory; registered as
  `battleiq-battle` in `src/game/modes/index.ts`.
- `src/components/ExternalGameFrame.tsx` — mounts the iframe at
  `/minigames/battleiq/index.html`, runs the `ready` → `start` → `complete` postMessage
  handshake, and unmounts on completion.
- `src/data/chapters/chapter5b.rose.ts` — the only chapter using it (two
  `modeId: 'battleiq-battle'` beats).

Several files here (`battle.js`, `bulletHell.js`, `data.js`, `game.js`, `overworld.js`)
have diverged from the served copy — the `public/` versions are the live ones. If the
in-game battle needs a change, edit `public/minigames/battleiq/`, not this directory.

## Tooling

- Excluded from ESLint (`battleiq/**` in `eslint.config.js`).
- Plain `.js`, no build step, not part of the TypeScript project.

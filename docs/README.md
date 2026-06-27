# Project Omega — Improvement Plan Index

This folder holds the **100-hour, 3-engineer improvement plan**. If you're the lead agent
delegating the work, read in this order:

1. **[TEAM_COORDINATION_PLAN.md](TEAM_COORDINATION_PLAN.md)** — the master doc. Lanes,
   ownership, phase plan, dependency graph, merge rules, load table, risk/cut list. **Start here.**
2. **[../CONTRIBUTING.md](../CONTRIBUTING.md)** — the working contract every engineer follows
   (the green bar, hard rules, conventions, branch/merge rules).
3. The per-track specs (execution-ready, anchored to `file:line`):

| Track | Spec | Lane (owner) | Budget |
|---|---|---|---|
| A — Combat depth | [COMBAT_DEPTH_PLAN.md](COMBAT_DEPTH_PLAN.md) | 🟥 A | 16h |
| B — Content & visuals | [TRACK_B_CONTENT_VISUAL.md](TRACK_B_CONTENT_VISUAL.md) | 🟩 B | ~13h + QA |
| C — Systems, UI, settings, a11y | [TRACK_C_SYSTEMS_UI.md](TRACK_C_SYSTEMS_UI.md) | 🟦 C | 14h |
| D — Audio | [TRACK_D_AUDIO.md](TRACK_D_AUDIO.md) | 🟩 B | ~5h |
| E — Tech debt, perf, tests | [TRACK_E_TECHDEBT_PERF.md](TRACK_E_TECHDEBT_PERF.md) | 🟥 A / 🟦 C | 11h |
| F — Signature feature (local) | [TRACK_F_SIGNATURE_FEATURE.md](TRACK_F_SIGNATURE_FEATURE.md) | 🟦 C | ~9–16h |
| G — Architecture & maintainability | [ARCHITECTURE_AND_MAINTAINABILITY.md](ARCHITECTURE_AND_MAINTAINABILITY.md) | all | ~13h |

## Day-one foundation (already scaffolded in this repo)
The Phase-0 quality gate is **already dropped in** — the lead just needs `npm install`:
- `eslint.config.js` + `npm run lint:es` / `lint:fix` / `ci` scripts (Track G3)
- `.github/workflows/ci.yml` — typecheck · lint · test · build on every PR (Track G3)
- `CONTRIBUTING.md` — the conventions contract (Track G §4)

Remaining Phase-0 work (Engineer C, day one): the save-schema-v2 + unified settings store
(Track C P0) — the single persistence layer everything else builds on.

## ⚠️ Before delegating: the handoff docs are stale
`../HANDOFF.md` and `plans/sprint3/qa/*` describe an **earlier build**. Confirmed-done-already:
furniture atlas, boss-music crossfade, mute/colorblind/textscale toggles, the Ch6 knock fix.
**Decision: the game is all-local — no server leaderboard** (the `server.ts` leaderboard is dead
code, slated for removal in G2). Every spec reflects this; the rule is **verify against code,
never the handoff.**

## Key opportunistic wins called out across the specs
- `POWER_UPS` (`entities.ts:381`) — 9 inside-joke items fully written, **wired nowhere** (A4).
- QTE applies `weaknessQTE.damage` even when a `qtePool` entry was shown
  (`bossFight/index.ts:305`) — latent bug fixed in A5.
- `loadProgress()` drops `rose_silence` on read (`progress.ts`) — fix in C P0.
- Player offense is fully auto-fire (`ChapterScene.ts:1299`); a dash exists but has **no
  i-frames** — A1/A2 make combat skill-based.

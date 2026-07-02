# Chapter Authoring Reference

Dense cheat sheet for editing/adding chapters. Types are canonical in [types.ts](types.ts) —
if this table and the code disagree, the code wins (and update this file in the same PR).

## Beat types (`Beat` union, types.ts)

Any beat may carry `id?: string` (jump target). Beats run top-to-bottom; each falls through
to the next unless a jump redirects.

| type | fields | notes |
|------|--------|-------|
| `dialogue` | `speaker`, `lines[]` | Cannot jump. Speaker = any id (see Speakers) |
| `choice` | `speaker`, `prompt`, `options[]` | Option: `text`, `ledgerDelta?`, `reactionSpeaker?`, `reactionLines?`, `goto?`, `sideEffect?` |
| `walkTo` | `x`, `y`, `radius?`, `markerLabel?` | Blocks until player reaches point |
| `cameraPan` | `x`, `y`, `durationMs`, `holdMs?` | |
| `bossFight` | `bossId`, `arena{x,y,w,h}`, `hideActorId?`, `introLines?` | Runs the bossFight mode — NOT via `minigame` beat. `bossId` from `BOSSES` in `src/data/entities.ts` |
| `minigame` | `modeId`, `config?`, `introLines?`, `background?`, `loseGoto?` | See `src/game/modes/CLAUDE.md` for the mode table |
| `routeOnMinigame` | `cases{}`, `default?` | ⚠️ HARDCODED to groupChat's payload (`saidTrueThing`+`when`, BeatEngine `runRouteOnMinigame`). Do NOT use for other modes — use `loseGoto` |
| `chase` | `pursuerId`, `durationMs` | Jumpscare chase (Ch6). Tonally reserved — don't dilute |
| `sfx` | `key`, `volume?` (0.7), `seek?` | Silently skipped if key not loaded. `seek` skips quiet buildups |
| `wait` | `ms` | |
| `ledger` | `delta`, `note` | The running money gag |
| `stopAllAudio` | `fadeMs?` | |
| `changeScene` | `sceneIndex`, `transitionMs?` | Multi-scene chapters only (`scenes[]`) |
| `endChapter` | — | |

## Routing patterns

- **Win/lose on a minigame**: win falls through to the next beat; lose jumps to `loseGoto`.
- **Converge pattern** (branch that must rejoin): put the branch block AFTER `endChapter`
  (unreachable by fall-through), end it with a single-option `choice` whose `goto` points
  back to the main-line beat id. Dialogue beats cannot `goto`.
- **Choice endings**: distinct endings go in each option's `reactionLines`, then all
  options `goto` a shared beat id — otherwise ending beats fall through into each other.

## Speakers

`resolveSpeaker` (types.ts) checks, in order: heroes `eric | nick_f | nick_h | jacob` →
NPC `jordan` → extras `narrator | audrey | maharko | ben | michael_bersofsky | emily |
caleb | vs | anastasia | sophia | sam_ferretti | sean | alex`. Unknown ids still render
(generic 🗨️ bubble) — no crash, but check spelling.

## Map config

- `theme`: `apartment | highway_night | hospital | park | florida | suburb_night | cabin |
  pool_party`. ⚠️ Theme drives procedural decor — an indoor theme on an outdoor/void scene
  draws floor planks over your backdrop.
- `rects`: `propType` (semantic, drives procedural draw — full list in types.ts) and/or
  `propKey` (sprite from the furniture atlas, e.g. `furn_bed_double`); `solid` = collidable;
  `invisible` = physics only.
- `playerSpawn`, `labels[]` (fading area toasts), `backdrop` (fill color).
- Multi-scene: top-level `scenes[]` overrides `map`/`actors`; `changeScene` transitions.

## Audio

- Stage music: add `chapterId → music key` in `CHAPTER_MUSIC_KEY` (`src/game/audio.ts`);
  per-scene override via `music:` on a scene config. Quiet tracks get inline volume
  conditionals in `AudioController.ts`, never a global default change.
- Keys loaded for every chapter (usable in `sfx` beats): `sfx_knock`, `sfx_door_open`,
  `ui_select`, `victory_jingle`, `boss_sting`, `boss_loop`.

## Register + verify

1. Create `chapterN.slug.ts` exporting a `ChapterConfig`; import + append in [index.ts](index.ts).
2. `npm test` — `src/data/chapters.test.ts` content-lints all chapters: dangling `goto`/
   `loseGoto`/`bossId`/`modeId` refs and music coverage.
3. Playtest at `npm run dev` (port 3324); restart the server after edits (Vite cache).

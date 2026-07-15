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
| `hideActor` / `showActor` | `id` | Toggles visibility of a placed actor (sprite, nameplate, shadow). Use to keep a static actor (e.g. someone who "arrives" mid-scene) out of frame until the beat where they're narrated as showing up |
| `moveActor` | `id`, `x`, `y`, `durationMs` | Straight-line tween of a placed actor to a new point, playing its walk anim en route (resolves the anim key from the actor's `spriteKey` if set, else its id) and settling back to the static idle frame on arrival. Blocking (advances on arrival). Not pathfinding — line-of-sight only |
| `bossFight` | `bossId`, `arena{x,y,w,h}`, `hideActorId?`, `introLines?` | Runs the bossFight mode — NOT via `minigame` beat. `bossId` from `BOSSES` in `src/data/entities/` |
| `minigame` | `modeId`, `config?`, `introLines?`, `background?`, `loseGoto?` | `modeId` and `config` are a mapped union from `src/contracts/mode-configs.ts`; see `src/game/modes/CLAUDE.md` |
| `routeOnMinigame` | `cases{}`, `default?` | ⚠️ HARDCODED to groupChat's payload (`saidTrueThing`+`when`, BeatEngine `runRouteOnMinigame`). Do NOT use for other modes — use `loseGoto` |
| `chase` | `pursuerId`, `durationMs` | Jumpscare chase (Ch6). Tonally reserved — don't dilute |
| `sfx` | `key`, `volume?` (0.7), `seek?` | Silently skipped if key not loaded. `seek` skips quiet buildups |
| `wait` | `ms` | |
| `ledger` | `delta`, `note` | The running money gag |
| `stopAllAudio` | `fadeMs?` | |
| `screenTint` | `color`, `alpha`, `durationMs?` | Full-screen tint overlay (Atmosphere.setScreenTint) |
| `changeScene` | `sceneIndex`, `transitionMs?` | Multi-scene chapters only (`scenes[]`); tears down `activeMode` unconditionally |
| `changeMusic` | `key`, `fadeMs?` | Crossfades stage music mid-scene (no `changeScene` needed). `key` must already be loaded (`STAGE_MUSIC_URL`) |
| `endChapter` | — | |

## Routing patterns

- **Win/lose on a minigame**: win falls through to the next beat; lose jumps to `loseGoto`.
- **Converge pattern** (branch that must rejoin): put the branch block AFTER `endChapter`
  (unreachable by fall-through), end it with a single-option `choice` whose `goto` points
  back to the main-line beat id. Dialogue beats cannot `goto`.
- **Choice endings**: distinct endings go in each option's `reactionLines`, then all
  options `goto` a shared beat id — otherwise ending beats fall through into each other.

Chapter-select seals: use `classified: true` for the in-world redaction treatment. Use
`seal: 'external'` when a chapter is meant to read as a boundary outside the game's fiction
(currently Origins); it retains the two-step interaction but uses the external seal treatment.
Set `estimatedMinutes: { min, max }` to the approximate first-play duration range shown on the
chapter-select card (for example, Spotify is `{ min: 1, max: 3 }`).

## Speakers

`resolveSpeaker` (types.ts) checks, in order: heroes `eric | nick_f | nick_h | jacob` →
NPC `jordan` → extras `narrator | audrey | maharko | ben | michael_bersofsky | sophie | linden |
cara | nick_cox | matthew | substitute | emily | caleb | vs | anastasia | sophia | sam_ferretti |
sean | alex | leo | benji`. Unknown ids still render
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

1. Run `npm run agent:scaffold-chapter -- <index> <kebab-case-slug>` (or create `chapterN.slug.ts` manually), then replace its TODO content.
2. Put chapter-only image keys/URLs in a manifest under `src/game/assets/chapter/` and map the chapter id in its `index.ts`; keep truly shared assets centralized.
3. Add music or an intentional-silence justification, import + append in [index.ts](index.ts), and add the finished title to the README chapter table.
4. `npm test` — `src/data/chapters.test.ts` content-lints all chapters: dangling `goto`/
   `loseGoto`/`bossId`/`modeId` refs and music coverage.
5. Playtest at `npm run dev` (port 3324); restart the server after edits (Vite cache).

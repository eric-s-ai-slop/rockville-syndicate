# Minigame Modes Reference

Dense cheat sheet for the mode registry. The contract is canonical in [types.ts](types.ts)
(`GameMode`, `ModeContext`, `ModeResult`); registration lives in [index.ts](index.ts). To
build a new mode, copy [_template/](_template/) and follow `docs/ADDING_A_MINIGAME.md`.

## Registered modes

| modeId | invoked from | config | kind |
|--------|-------------|--------|------|
| `bossFight` | the `bossFight` BEAT type (never a `minigame` beat) | from the beat: `bossId`, `arena`, `hideActorId?`, `introLines?` | blocking |
| `groupChat` | Ch0 | inline in chapter0 | blocking |
| `complicityReport` | Ch0 | inline in chapter0 | blocking (fullscreen card, depth 9500+) |
| `basementScene` | Ch3b ×2 | none | background |
| `stewOffering` | Ch3b | none | blocking |
| `fratAggro` | Ch3b | none | blocking |
| `silentDrive` | Ch3b | none | blocking |
| `storyFractures` | Ch3b | inline in chapter3b | blocking |
| `battleiq-battle` | Ch5b ×2 | `{ enemyId }` → iframe (`external` factory) | blocking, suspends Omega |
| `poolParty` | Ch9 | none | background |
| `benTrivia` | — unwired (planned: Ch8) | `BenTriviaConfig` ([benTrivia/index.ts](benTrivia/index.ts)): `count?`, `perPromptMs?`, `minPromptMs?`, `strikesAllowed?`, `seed?` (defaults 16/3500/1800/3) | blocking |
| `carRide` | — unwired (planned: Ch2) | `CarRideConfig` ([carRide/carRide.ts](carRide/carRide.ts)): boss name, timed phases, responses, barks | blocking |

`classroomAmbience/` exists on disk but is NOT registered — dead code, slated for deletion.

## Lifecycle & outcome

- `start(ctx, config, onComplete)` → run → call `onComplete({ outcome, data? })` exactly once.
- In the hosting chapter: **win falls through** to the next beat, **lose jumps** to the
  minigame beat's `loseGoto`. There is no generic multi-outcome router — `routeOnMinigame`
  is hardcoded to groupChat's payload (`BeatEngine.runRouteOnMinigame`); do not use it for
  other modes.
- `background: true` modes run concurrently with story beats (react via `onDialogue()`),
  and must not freeze the player.
- `external` modes mount an iframe (`ExternalGameFrame.tsx`, postMessage handshake
  ready→start→complete) and duck the music. Payloads live in `public/minigames/<gameId>/`.

## Hard rules (full list in root CLAUDE.md)

- All text through the scene's `label()` helper — raw `add.text` renders blurry.
- Overlap/collider callbacks: identify objects by group membership
  (`group.contains(a) ? a : b`), never argument position.
- Derive layout from `ctx.cameras.main` center/size (benTrivia is the reference pattern);
  don't hardcode coordinates — maps vary 880–1000px wide.
- Clean up everything in `end()`/teardown: tweens, timers, temporary depth-9000+ UI.
- Playtest before wiring into a chapter: temporarily insert your `minigame` beat as the
  first beat of any chapter (`docs/ADDING_A_MINIGAME.md` §7), then revert.

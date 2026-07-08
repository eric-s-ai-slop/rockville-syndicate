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
| `silentDrive` | Ch3b, Ch11 | optional — `title?`, `askerId?/askerLabel?/askerColor?`, `responderId?/responderLabel?/responderColor?`, `promptOptions?`, `responsePool?`, `rounds?` (all fall back to Ch3b's original Maharko/Ben content) | blocking |
| `storyFractures` | Ch3b, Ch11 | inline `storySegments[]` per call site — see [storyFractures/index.ts](storyFractures/index.ts) | blocking |
| `battleiq-battle` | Ch5b ×2 | `{ enemyId }` → iframe (`external` factory) | blocking, suspends Omega |
| `poolParty` | Ch9 | none | background |
| `benTrivia` | — unwired | `BenTriviaConfig` ([benTrivia/index.ts](benTrivia/index.ts)): `count?`, `perPromptMs?`, `minPromptMs?`, `strikesAllowed?`, `seed?` (defaults 16/3500/1800/3) | blocking |
| `carRide` | — unwired (planned: Ch2) | `CarRideConfig` ([carRide/carRide.ts](carRide/carRide.ts)): boss name, timed phases, responses, barks | blocking |
| `speakerHunt` | Ch11 ×3 (Nights 1-3) | `SpeakerHuntConfig` ([speakerHunt/index.ts](speakerHunt/index.ts)): `night`, `speakers[]`, `redHerrings?`, `locked?`, `barricade`, `timeLimitMs` | blocking |
| `cabinCollapse` | Ch11, re-registered ~6x | `CabinCollapseConfig` ([cabinCollapse/index.ts](cabinCollapse/index.ts)): `startDay`, `meters{water,ac,bugs,illness}` | background, unwinnable by design |
| `swarmSurvival` | Ch11 Day-4 grill run (`day4_grill_orders`; lose→loseGoto that beat) | `SwarmSurvivalConfig` ([swarmSurvival/index.ts](swarmSurvival/index.ts)): `theme`, `survival{durationMs,playerHp}`, `primary`, `secondary`, `waves[]`, `enemyTypes{}` — theme-neutral wave-survival combat (SWAT [J] arc + BURST [K] radial + SPACE dodge); enemies are emoji Text, HP is mode-owned (lose→loseGoto) |
| `doubleCall` | Ch12 (`origins`) — Act I `ringOnly` bg, Scene 5 `founding`, Scene 6 `rerun` ×3, Scene 9 `capital`, Scene 10 `unsent`, Scene 0/11 `reply` | `DoubleCallConfig` ([doubleCall/index.ts](doubleCall/index.ts)): `variant` (`ringOnly\|founding\|rerun\|unsent\|capital\|reply`) + per-variant `ring/wire/typedReply/unsent/capital/reply` configs — one wiring interface reused across the chapter with rules changing; never emits `'lose'` (Scene 10's rewind is internal, not a `loseGoto`) | blocking |

## Lifecycle & outcome

- `start(ctx, config, onComplete)` → run → call `onComplete({ outcome, data? })` exactly once.
- In the hosting chapter: **win falls through** to the next beat, **lose jumps** to the
  minigame beat's `loseGoto`. There is no generic multi-outcome router — `routeOnMinigame`
  is hardcoded to groupChat's payload (`BeatEngine.runRouteOnMinigame`); do not use it for
  other modes.
- `background: true` modes run concurrently with story beats (react via `onDialogue()`),
  and must not freeze the player.
- `activeMode` is torn down on **every** `changeScene` transition, not just when another
  mode displaces it (`ChapterScene.transitionToScene`). A background mode that must
  survive a scene change needs a fresh `minigame` beat re-registering it after the
  `changeScene` beat.
- `external` modes mount an iframe (`ExternalGameFrame.tsx`, postMessage handshake
  ready→start→complete) and duck the music. Payloads live in `public/minigames/<gameId>/`.

## Hard rules (full list in root CLAUDE.md)

- All text through the scene's `label()` helper — raw `add.text` renders blurry.
- Overlap/collider callbacks: identify objects by group membership
  (`group.contains(a) ? a : b`), never argument position.
- Derive layout from `ctx.cameras.main` center/size (benTrivia is the reference pattern);
  don't hardcode coordinates — maps vary 880–1000px wide.
- Any `scrollFactor(0)` HUD element must compensate for camera zoom — position AND
  size/font, or it renders displaced/off-screen. **Use `screenSpace()` from
  [screenSpace.ts](screenSpace.ts)** (`zx`/`zy` for coords, `s` for sizes); `_template/`
  shows the pattern. Don't hand-roll the math — hand-rolled versions bit
  `complicityReport`, `speakerHunt`, and `Atmosphere.setScreenTint` independently.
- Clean up everything in `end()`/teardown: tweens, timers, temporary depth-9000+ UI.
- Playtest before wiring into a chapter: temporarily insert your `minigame` beat as the
  first beat of any chapter (`docs/ADDING_A_MINIGAME.md` §7), then revert.

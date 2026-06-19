# carRide Minigame Mode — Implementation Spec

> **For the developer building this mode.** This is a new GameMode built from `_template`. It implements a four-phase dialogue battle with a countdown timer. The mode is triggered by a `minigame` beat in `chapter5b.rose.ts`.

---

## modeId

```
'carRide'
```

## Directory

```
src/game/modes/carRide/
  index.ts    — exports the mode class, registers it
  carRide.ts  — the GameMode implementation
```

Register in `src/game/modes/index.ts` alongside the other modes.

---

## What It Is

A pure dialogue battle. No shooting, no dodging. The player faces Maharko in the back seat of a moving car. Maharko delivers a defense (text appears). The player has a timed menu of three responses. The correct response breaks the defense and advances to the next phase. Wrong responses cost time (the timer ticks faster) and player HP. Four phases. A 3-minute countdown timer represents the drive home. Timer expiry = lose.

The fight is the argument. The mechanic IS the chapter's thesis: trying to break through to someone who will not concede, in a closed space, while the clock runs.

---

## Config Schema

The `minigame` beat passes a `config` object. The mode consumes this shape:

```typescript
interface CarRideConfig {
  bossName: string;       // 'Maharko'
  bossTitle: string;      // 'The Florida Wildcard'
  timer: number;          // 180000 (ms) — the drive home
  phases: CarRidePhase[]; // exactly 4 phases
  combatBarks: string[];  // 6-7 lines, spoken randomly between phases
  deathQuote: string;     // delivered after the fourth phase breaks
}

interface CarRidePhase {
  id: number;             // 1-4
  defense: string;        // Maharko's defense line (shown when phase begins)
  responses: CarRideResponse[];  // exactly 3
}

interface CarRideResponse {
  text: string;           // the player's response option
  correct: boolean;       // only one should be true per phase
}
```

Two configs exist in `chapter5b.rose.ts`:
- `carRideConfigA` — Option A path. Phases: need → liked me → into it → cockblock.
- `carRideConfigC` — Option C path. Phases: photos → need → liked me → cockblock.

The mode does not need to know which config it received — it just consumes `config.phases` in order.

---

## GameMode Lifecycle

### `preload(ctx: ModeContext)`
- No assets to load. The car scene's sprites are already placed by the chapter. The mode overlays UI on top.

### `start(ctx: ModeContext, config: CarRideConfig, onComplete: (result: ModeResult) => void)`

**Setup:**
1. Freeze player movement (`ctx.player.setVelocity(0, 0)`).
2. Show letterbox (`ctx.showLetterbox()`).
3. Camera pan to center on the back seat arena (`ctx.cameras.main.pan(...)`).
4. Display boss name + title overlay (same animation as bossFight mode — scale-in name, fade-in title, camera flash + shake).
5. After intro animation, begin the fight loop.

**Fight loop:**
1. Display Phase 1's `defense` text as a speech bubble above Maharko's sprite (use `ctx.showBubbleText` on `ctx.spawnedBoss` — but wait, there's no spawned boss in this mode. Use the Maharko actor sprite instead. The mode needs a reference to the Maharko actor. Get it via `ctx.chapter.scenes[ctx.currentSceneIndex].actors.find(a => a.id === 'maharko')` — or pass the actor sprite reference through the config. Simplest: find the Maharko sprite in the scene by id.)
   - **Alternative:** Don't use the in-world sprite. Render a dedicated Maharko portrait/avatar in the UI overlay. Cleaner, doesn't depend on actor system. Recommend this.
2. After the defense text displays (~2 seconds), show the three response options as clickable buttons (or keyboard 1/2/3) in a React overlay.
   - Use `ctx.onStoryDialogue` to push the defense line as a dialogue window, then use a separate mechanism for the response menu. Or build a custom React overlay. The mode has access to `ctx` — if the project has a QTE modal, adapt it. If not, use `ctx.onStoryDialogue` with a structured payload that the React layer interprets as a choice menu.
   - **Simplest path:** Use the existing `ctx.triggerQTE` mechanism, but adapted for three arbitrary text options instead of the standard QTE format. This requires extending the QTE component or building a parallel one. Flag for developer.
3. When the player selects a response:
   - **If correct:** Play a "defense broken" animation (camera flash green, Maharko sprite flashes/shakes, `ctx.showDamageNumber` with the phase number). Advance to the next phase. Display the next defense text.
   - **If wrong:** Play a "defense holds" animation (camera flash red, player takes damage via `ctx.damagePlayer(15, 'Wrong response')`, Maharko barks a combat line). The phase does NOT advance. The same defense re-displays after a beat. The player can try again, but the timer keeps ticking.
4. Between phases, randomly display a `combatBarks` line as a speech bubble (same as bossFight mode's combat barks).
5. Timer ticks down throughout. Display a thin timer bar at the top of the screen, labeled "DRIVE HOME". Depletes left-to-right.

**Win condition:**
- All four phases broken (all four correct responses selected). Play the `deathQuote` as Maharko's final line. Camera fade. Call `onComplete({ outcome: 'win' })`.

**Lose condition (timer):**
- Timer reaches 0. Whatever phases weren't broken stand. Display a narrator line: "The car arrived home. You didn't get to say all of it." Call `onComplete({ outcome: 'lose' })`.

**Lose condition (player HP):**
- Player HP reaches 0 (from too many wrong responses). Same as timer lose. Call `onComplete({ outcome: 'lose' })`.
- **Recommend generous player HP** (100+ HP, 15 damage per wrong answer = ~6 wrong answers before death). The pressure should be time, not damage.

### `update(time: number, delta: number)`
- Decrement the timer by `delta`.
- Update the timer bar UI.
- Check for timer expiry → trigger lose.
- Check for player HP <= 0 → trigger lose.
- Handle any combat bark scheduling (random interval, ~5-8 seconds between barks).

### `teardown()`
- Destroy all UI elements (timer bar, response menu, speech bubbles, overlays).
- Hide letterbox (`ctx.hideLetterbox()`).
- Resume player movement.
- Stop any scheduled timers.

---

## ModeContext API Usage

Methods the mode will use (from the confirmed API):

```
ctx.player.setVelocity(0, 0)         — freeze player
ctx.showLetterbox()                  — cinematic bars in
ctx.hideLetterbox(durationMs)        — bars out
ctx.cameras.main.pan(x, y, ms, ...)  — camera to back seat
ctx.cameras.main.flash(ms, r, g, b)  — green for correct, red for wrong
ctx.cameras.main.shake(ms, intensity)— on phase break
ctx.showBubbleText(sprite, text, color) — Maharko's defense + barks
ctx.showDamageNumber(x, y, amount, color) — phase number on break
ctx.damagePlayer(amount, source)     — wrong response penalty
ctx.label(x, y, text, style)         — timer bar, boss name overlay
ctx.time.delayedCall(ms, fn)         — phase transitions, animation timing
ctx.time.addEvent({...})             — timer countdown
ctx.tweens.add({...})                — UI animations
ctx.onStoryDialogue(payload, done)   — push defense text to React overlay (if using dialogue system)
ctx.logMessage(msg)                  — log to HUD ("Phase 1 broken!", "Wrong — Maharko doubles down")
```

**What does NOT exist on ModeContext** (do not attempt to use):
- No `getScene()`, `getCamera()`, `playSound()`, `createButton()`
- No cross-mode state storage
- No direct React bridge beyond `onStoryDialogue` and `triggerQTE`

---

## Implementation Notes

1. **Response menu UI.** The existing `ctx.triggerQTE` is designed for the standard QTE format (question + 3 options + correct answer + damage). The carRide mode's needs are similar but not identical (4 sequential QTEs, no damage on correct, time penalty on wrong). Two paths:
   - **(a)** Extend the QTE component to accept a "carRide mode" flag that changes the rendering and feedback. Reusable.
   - **(b)** Build a dedicated React overlay for the response menu, triggered via `ctx.onStoryDialogue` with a custom payload. More isolated.
   - Developer's choice. Path (a) is less code if the QTE component is flexible. Path (b) is cleaner if the QTE component is tightly coupled to bossFight.

2. **Maharko sprite.** The mode needs a visual reference for Maharko during the fight. Three options:
   - Use the in-world Maharko actor sprite (already placed in the car scene). The mode overlays UI on top. The sprite stays in the back seat. Speech bubbles attach to it.
   - Render a dedicated Maharko portrait in the UI overlay (larger, more prominent). Requires a portrait asset.
   - No sprite — just text. The defense lines and barks display as full-screen text cards. Cheapest, least visual.
   - **Recommend option 1** (use the in-world sprite). The car scene is already built. The player sees Maharko in the back seat while arguing with him. The speech bubbles attach to his sprite. No new assets needed.

3. **Timer bar.** A thin horizontal bar at the top of the screen. Label: "DRIVE HOME" or no label (the depletion is self-explanatory). Color: depletes from green → yellow → red as time runs out. Use `ctx.label` + `ctx.add.rectangle` for the bar. Update width in `update()`.

4. **Win/lose outcome handling.** The `onComplete` callback returns `{ outcome: 'win' | 'lose' }`. The chapter's beat sequence continues after the minigame regardless of outcome — both A and C paths lead to the post-fight narrator beat, then the last line, then endChapter. The difference is narrative: on win, the narrator says "You said it." On lose, the narrator should say something like "You tried. You ran out of time." 
   - **The current chapter file doesn't branch on minigame outcome.** Both win and lose fall through to the same post-fight narrator beat. If you want different narration for win vs. lose, the schema agent would need to add a `routeOnMinigame` beat after the minigame. Flagging this as a potential enhancement — for now, the post-fight narration is the same either way, which is thematically correct ("you said it, the car kept moving anyway" works for both win and lose).

5. **No boss music.** The mechanic spec recommends no music during this fight — just the car engine, low in the mix. The mode should NOT call `ctx.audioController.startBossMusic()`. If ambient audio is needed, it's handled at the scene level (Scene 2 has no music per the chapter config).

---

## Registration

In `src/game/modes/index.ts`, add:

```typescript
import { CarRideMode } from './carRide';
// ...
registerMode(new CarRideMode());
```

Follow the pattern in `docs/ADDING_A_MINIGAME.md`.

---

## Difficulty Tuning

- **Timer:** 180000ms (3 minutes). Tight but winnable. The player needs to read 4 defenses, consider 3 options each, and select. Average ~40 seconds per phase including reading time.
- **Player HP:** 100. Wrong response = 15 damage. ~6 wrong answers before death. The pressure is time, not damage.
- **Wrong response penalty:** In addition to HP damage, the timer does NOT pause during the "wrong response" animation (~2 seconds of red flash + bark). This makes wrong answers cost time as well as HP.
- **Combat bark frequency:** Every 6-8 seconds, random bark from `combatBarks[]`. Not during defense text display or response selection — only during the "waiting" window between phases.

---

## Open Questions for Developer

1. **Response menu UI:** Use existing QTE component (extended) or build dedicated overlay?
2. **Maharko visual:** Use in-world sprite or dedicated portrait?
3. **Win/lose branching:** Does the chapter need different post-fight narration for win vs. lose? (Currently same — thematically correct but could be enhanced.)
4. **Sound design:** Confirm no boss music. Any SFX for correct/wrong responses? (Recommend: subtle UI click for correct, low thud for wrong. Existing Kenney impact sounds would work.)

# Maria Brooke — Interactive Pressure Loop (Implementation Plan)

**Goal:** Make the group-chat minigame *actively* tense instead of passively watchable. The
theme stays the same ("nothing you do changes the outcome"), but the player should now *feel*
the futility through interaction: a visible **Ben resolve meter** that your truth-messages knock
down and the group instantly snaps back up, plus a handful of **timed "act now" pressure moments**
where the chat freezes on a knife-edge and the group dynamically turns on you the harder you push.

**Scope:** ONLY the interactive pressure loop (resolve meter + pressure moments + escalating group
pushback + the scoring that feeds it). A trimmed timeline and an end-of-run "complicity report" card
are explicitly **out of scope** for this pass (note them as TODOs, don't build them).

---

## 0. Files in play

```
src/game/modes/groupChat/
  index.ts        # GroupChatMode — main class. Most work happens here.
  timeline.ts     # TIMELINE[] scripted messages. ADD resolve deltas + pressure markers.
  parser.ts       # parseMessage() → 'true' | 'joke' | 'neutral'. No change needed.
  reactions.ts    # GROUP_REACTIONS by phase. ADD escalating pushback sets.
```

Consumers that MUST keep working unchanged:
- `src/game/scene/BeatEngine.ts` → `runMinigameBeat()` calls `start(ctx, config, onComplete)` and
  stores the `ModeResult` in `this.lastMinigameResult`.
- The `routeOnMinigame` beat in `src/data/chapters/chapter0.maria-brooke.ts` reads
  `result.data.saidTrueThing` (boolean) and `result.data.when` (`'early'|'mid'|'late'`). **Do not
  break this contract** — keep returning those two fields. New fields may be added alongside.

---

## 1. Hard constraints / gotchas (read before touching index.ts)

These already exist in the file and MUST be preserved:

1. **`this.started` guard.** `start()` sets `this.scene.activeMode` *before* it actually runs (the
   scene sets activeMode, then defers `start()` behind the intro dialogue). `update()` must early-
   return `if (!this.started || this.modeEnded) return;`. Any new per-frame logic goes *after* that
   guard. Set `this.started = true` only at the very end of `start()`.
2. **Singleton reset.** `groupChatMode` is a singleton. Every new field you add MUST be reset at the
   top of `start()` alongside the existing block (`this.complicity = 0`, etc.). Forgetting this =
   stale state on replay.
3. **Depth.** All UI uses base `const D = 9000` (above world geometry, below letterbox at 9500).
   New UI elements: use `D + 11/12/13`. New overlays (pressure banner): `D + 18`.
4. **Mask offset.** The message clip mask is offset by `cam.scrollX/scrollY` because bubbles are
   `scrollFactor(0)` but the mask graphics is world-space. Any new clipped element follows the same
   pattern. The resolve bar and pressure banner are NOT inside the message area, so they don't need
   the mask.
5. **Timeline clock.** `tickTimeline()` uses real time: `Date.now() - this._startTime`. Pressure
   pauses must work by *shifting* `_startTime` (see §4), NOT by pausing a Phaser timer.
6. **`this.L` layout object** holds shared geometry (`cx, cy, frameLeft, frameRight, frameTop,
   frameBottom, frameW, frameH, msgAreaTop, msgAreaBottom, msgPad`). Reuse it; don't recompute
   camera dimensions in helpers.

---

## 2. Data model changes

### 2a. `timeline.ts` — annotate messages

Extend `TimelineMessage` with two optional fields:

```ts
export interface TimelineMessage {
  t: number;
  thread: 'dm' | 'gc';
  speaker: string;
  text: string;
  photo?: boolean;
  resolve?: number;   // delta applied to Ben's resolve when THIS message spawns (e.g. +8)
  pressure?: PressurePoint;  // if set, the timeline PAUSES here until resolved (see below)
}

export interface PressurePoint {
  id: string;            // 'kart', 'photo', 'volleyball', 'skip'
  prompt: string;        // banner text, e.g. "Ben's about to skip practice. Say something?"
  windowMs: number;      // how long the player has before it auto-resolves (e.g. 5000)
  benLine: string;       // the line Ben sends if the player does nothing / plays along
  resolveOnIgnore: number; // resolve jump if window expires or player jokes (e.g. +22)
}
```

**Tuning the `resolve` deltas:** Ben starts at ~15. Spread positive deltas across the timeline so
that, with no player intervention, resolve naturally crosses ~85 by the final pressure point and
hits 100 at the end. Suggested anchor points (apply on the relevant existing messages):
- Maria's flirty / hook lines (`survey`, `im just here now`, `volleyball game saturday`): +6 to +10
- Ben's "into it" lines (`only in rentals`, `wait fr what time`, `maybe i can skip track`): +8 to +12
- The frown `"I didn't get to see you :("` (the existing `PHASE_DIVIDER_INDEX`): +14 (big jump)

**Pressure points (4 total)** — attach `pressure` to these existing messages:
| id          | attach to (approx t) | prompt                                                     |
|-------------|----------------------|------------------------------------------------------------|
| `kart`      | Ben "oh u meant track lmao" (~22.5s) | "Ben thinks she's real. Say something?"        |
| `photo`     | Ben sends photo (~26.5s)             | "He just sent his face. Step in?"              |
| `volleyball`| Maria's frown (~47.5s)               | "She's reeling him in. This is the moment."    |
| `skip`      | Ben "maybe i can skip track" (~54.5s)| "Ben's about to skip practice for her. Last call." |

Export a helper if convenient: `PRESSURE_IDS = ['kart','photo','volleyball','skip']`.

### 2b. `reactions.ts` — escalating pushback

The current `GROUP_REACTIONS` is keyed by phase (`early|mid|late`). Add a parallel set keyed by
**how many times the player has already pushed**, so the group turns on you progressively. Example:

```ts
export const PUSHBACK_ESCALATION: Reaction[][] = [
  // 1st time you break rank — dismissive
  [ {speaker:'Jordan',text:'wait what',color:'#f97316'}, {speaker:'Nick F',text:'lmao ok',color:'#f59e0b'} ],
  // 2nd time — annoyed
  [ {speaker:'Maharko',text:'bro chill',color:'#22d3ee'}, {speaker:'Eric',text:'ur killing it',color:'#c8e89a'} ],
  // 3rd time — cold / freeze-out
  [ {speaker:'Jordan',text:'...',color:'#f97316'} ],
  // 4th+ — silence (empty array → no reply, which is the worst reaction)
  [],
];
```

Keep the existing `GROUP_REACTIONS` (still used to decide `when` = early/mid/late for routing).

---

## 3. New state on `GroupChatMode` (index.ts)

Add fields (and **reset every one** at the top of `start()`):

```ts
private benResolve = 15;          // 0..100
private benResolveTarget = 15;    // tweened-toward value for smooth bar movement
private pushCount = 0;            // how many times the player has sent a 'true' message
private messagesSent = 0;
private jokesSent = 0;
private inPressure = false;       // a pressure window is currently open
private activePressure: PressurePoint | null = null;
private pressureElapsed = 0;      // ms elapsed in current window
private pressureResolvedIds = new Set<string>();

// UI refs
private resolveFill!: Phaser.GameObjects.Rectangle;
private resolveLabel!: Phaser.GameObjects.Text;
private pressureBanner: Phaser.GameObjects.Container | null = null;
```

---

## 4. Pause/resume the timeline for pressure windows

The ticker is real-time (`Date.now() - this._startTime`). To "pause" at a pressure point without a
Phaser timer:

- When `tickTimeline()` is about to spawn a message whose `pressure` is set AND its id is not in
  `pressureResolvedIds`: **spawn the message normally**, then call `openPressure(msg.pressure)` and
  set `this.inPressure = true`. Do **not** advance `timelineIndex` past it yet — guard the top of
  `tickTimeline()` with `if (this.inPressure) return;`.
- While `inPressure`, accumulate `pressureElapsed += delta` in `update()`.
- Resolve the window (player acted, played along, or timed out) → `closePressure()`:
  - record id in `pressureResolvedIds`
  - **shift the clock** so elapsed time during the pause doesn't fast-forward the timeline:
    `this._startTime += pauseDurationMs;` (capture `Date.now()` at open, compute delta at close).
  - `this.inPressure = false`, clear banner.
  - Now the ticker resumes from the same logical timeline position.

This keeps `tickTimeline()`'s real-time math intact and avoids touching Phaser's clock.

---

## 5. The pressure-moment flow (`openPressure` / `closePressure`)

```
openPressure(p):
  inPressure = true
  activePressure = p
  pressureElapsed = 0
  pauseStart = Date.now()
  show "Ben is typing…" indicator (reuse showTypingIndicator's dots, but persistent)
  show pressure banner: p.prompt + a draining countdown bar (width = remaining/windowMs)
  banner pulses (tween scale/alpha) to draw the eye

update() while inPressure:
  pressureElapsed += delta
  update countdown bar width
  if pressureElapsed >= activePressure.windowMs: resolveWindow('timeout')

player sends a message during the window (hook in sendPlayerMessage / sendReaction):
  if parse == 'true':  resolveWindow('truth')
  else (joke/neutral/reaction): resolveWindow('played_along')

resolveWindow(kind):
  if kind == 'truth':
     knockDownResolve()          // see §6 — big visible drop, then snap-back
     fireEscalatingPushback()    // PUSHBACK_ESCALATION[min(pushCount, last)]
     pushCount++
     // Ben STILL sends his line after the dogpile (futility):
     delay ~1.6s then spawn activePressure.benLine as a Ben DM, +resolveOnIgnore
  else: // timeout or played_along
     spawn activePressure.benLine as Ben DM
     bumpResolve(activePressure.resolveOnIgnore)
     if kind == 'played_along' and joke: complicity += 5
  closePressure()

closePressure():
  pauseDuration = Date.now() - pauseStart
  this._startTime += pauseDuration
  hide banner + typing indicator
  inPressure = false; activePressure = null
```

**Important:** the player can still freely type *outside* pressure windows (existing behavior). The
pressure windows just add focused decision spikes with a timer and escalating consequences.

---

## 6. Ben resolve meter — render + behavior

### Render (in `start()`, after the goal strip, above the message area)
A thin horizontal bar spanning the frame width, just under the goal strip. Reduce `msgAreaTop` by
~22px to make room.

```
label (left):  "BEN"
track rect:    full width, dark (0x1b2735)
fill rect:     origin (0,0.5), left-anchored, width = (benResolve/100)*trackW
               color lerps green(0x22c55e low) → amber → red(0xef4444 high)
label (right): dynamic — "not going" (<33) / "tempted" (33–66) / "he's gonna go" (>66)
```
Depth `D + 12`, `scrollFactor(0)`. Track refs in `this.allObjects` via `this.track()`.

### Behavior (in `update()`, after the started/ended guard)
- **Passive drift:** `benResolveTarget = min(100, benResolveTarget + delta * 0.0008)` (slow climb so
  it always trends toward "he goes").
- **Per-message deltas:** when `spawnMessage` fires for a timeline entry with `resolve`, do
  `benResolveTarget = clamp(benResolveTarget + msg.resolve, 0, 100)`.
- **Smooth the bar:** `benResolve += (benResolveTarget - benResolve) * 0.08` each frame; set fill
  width + color from `benResolve`.
- **End condition:** when `benResolve >= 100` OR the timeline is exhausted → go to the existing
  final prompt / resolve sequence (don't double-fire; guard with `finalPromptShown`).

### `knockDownResolve()` (the core "futility" beat)
```
benResolveTarget = max(0, benResolveTarget - 28)   // visible, satisfying drop
flash the fill bar white briefly (tween tint)
// then the snap-back is delivered by the pushback + Ben's line afterward,
// which push resolveOnIgnore (+22) back ON TOP, netting a gain.
```
Net effect across a pressure point where you spoke up: a sharp dip, a beat of hope, then it climbs
back *past* where it was. That asymmetry is the whole point — make it readable on the bar.

---

## 7. Hook points in existing methods

- **`start()`**: reset all new fields; build resolve bar + (hidden) pressure banner container;
  shrink `this.L.msgAreaTop` to fit the bar.
- **`tickTimeline()`**: add `if (this.inPressure) return;` at top; apply `msg.resolve`; trigger
  `openPressure` when a pressure message spawns.
- **`update()`**: after the guard — drive resolve smoothing + drift; if `inPressure`, advance
  `pressureElapsed` and the countdown bar, check timeout; check end condition.
- **`sendPlayerMessage()`**: increment `messagesSent`; if `inPressure`, route to `resolveWindow`
  based on parse result (truth vs played-along). Keep the existing `saidTrueThing`/`when` logic for
  routing — that still determines the coda.
- **`sendReaction()`**: increment `jokesSent`; if `inPressure`, treat as `played_along`.
- **`resolve()` (final payload)**: keep `{ saidTrueThing, when, complicity }`; ADD
  `{ messagesSent, jokesSent, pushCount, finalResolve: Math.round(this.benResolve) }` for future use.
- **`teardown()`**: destroy `pressureBanner`; null the new UI refs. (Mask + letterbox handling stays.)

---

## 8. Acceptance criteria (how to know it's done)

1. A **BEN resolve bar** is visible above the chat, starts low/green, and climbs over the run.
2. Hitting one of the **4 pressure points** freezes the timeline, shows "Ben is typing…" + a
   prompt banner + a draining countdown.
3. Typing the truth during a window: bar **visibly drops**, the group **dogpiles** (escalating each
   time), then Ben sends his line and the bar climbs back **higher** than before.
4. Ignoring / playing along / letting the timer run out: Ben sends his line, bar jumps, no dogpile.
5. The group's pushback gets colder each successive time you speak up (dismissive → annoyed →
   "..." → silence).
6. Outcome is still **inevitable**: Ben always ends up committed; the existing coda routing
   (`saidTrueThing` + `when` early/mid/late) is unchanged and still selects the right ending.
7. Replaying the chapter starts clean (no stale resolve/pressure state — singleton reset verified).
8. No console errors; `npm run lint` passes.

## 9. Out of scope (leave as TODO comments)
- Trimming/recompressing the 61s timeline.
- End-of-run "complicity report" summary card.
- Audio cues for pressure windows (could reuse `sfx_message_ding`; a dedicated sting is a stretch).

## 10. Manual test path
Character select → Eric → Begin → FLASHBACKS → Maria Brooke → walk the classroom beats → intro
dialogue → minigame. (Dev shortcut: in console, `window.__OMEGA_GAME__.scene.getScene('ChapterScene')
.beatEngine.startBeat(17)` jumps straight to the minigame beat; press Enter to clear the intro
dialogue.) Verify the 8 acceptance criteria above.

# Chapter Pipeline — Step 2b Output: Mechanic Spec

**Chapter:** Maria Brooke
**Mode chosen:** Concept C — new minigame mode `groupChat`
**Date:** 2026-06-18

---

## CONCEPT SELECTION — WHY C

Three concepts were proposed (A: standard bossFight variant, B: modified bossFight with no projectiles, C: new `groupChat` minigame mode). Concept C was selected. Reasoning, in order of weight:

1. **The chapter identity forces it.** "A nature documentary where the subject is also a member of the film crew, and doesn't know he's in the episode." A and B keep the player as the camera operator — separate from the action. C makes the player a member of the film crew. That's the entire brief in one sentence.

2. **The last line only lands if you were laughing.** "The Maria Brooke thing is still funny though." In A and B, the line lands as a contradiction the *game* is making — the game let you fight the bit, then tells you the bit is still funny. That's incoherent. In C, the line lands as a contradiction *you* are making — you reacted with 💀 to Ben sending his face, you watched "I didn't get to see you :(" scroll past, you didn't type anything, and now the narrator says it's still funny. The line is about you.

3. **The parser IS the mechanic.** The brief's choice — "say something now, or stay quiet" — only has weight if the player literally types the words themselves. A button that says "say something true" is a QTE. A blank text field is a choice.

4. **B is half-honest and half-honest is worse than either.** B removes the gun but keeps the arena. That says "this is a fight, just an unusual one." The brief isn't a fight. B would feel like a boss fight missing its boss — players would think it's broken. C commits to its own shape.

### Risks acknowledged

- **Parser feels unresponsive** → lenient keyword set + fallback for earnest 20+ character messages.
- **Complicity meter reads as health bar** → no threshold, never triggers lose state, labeled BIT INTEGRITY as a callback to the HP bar it's replacing.
- **"Doing nothing" feels boring** → tight message timeline (4–8s spacing), typing indicators, player is reading the whole time.
- **Engineering cost** → acknowledged as real; not a blocker per user direction.

### Open question flagged for Step 3

Player can type at any point in the timeline, not just the final moment. The final prompt is still climactic, but a player who types "it's a catfish" right after Ben sends his face gets a different (smaller, earlier) acknowledgment than the one who waits. This is intentional — the chapter's argument is that there were a dozen moments where someone could have said something, and nobody did. Constraining to the final moment only would narrow the argument.

Post-fight narration should vary based on `payload.when` (early / mid / late / silent) — giving four possible endings, all valid, none of which save Ben. This is a story call for the schema agent, not a mechanic call.

---

## BEAT CONFIG

```typescript
{
  type: 'minigame',
  modeId: 'groupChat',
  config: {
    timelineEndsAtMs: 61000,        // when the final prompt appears
    finalPromptTimeoutMs: 20000,    // how long the player has at the final prompt
    complicityMax: 100,
  },
  introLines: [
    "You're in the chat. You've been in the chat since the first message.",
    "Ben is about to skip track practice for a girl who doesn't exist. Say something, or don't.",
  ],
  background: false,
}
```

---

## MODE SPEC

### `modeId`
`groupChat`

### `preload(ctx)`
No sprites to load. The mode is built entirely from `ctx.add.rectangle`, `ctx.label`, `ctx.add.graphics`, and tweens. One sound to load:
```
ctx.sound.add('sfx_message_ding')   // soft notification sound, ~200ms, infectious — must already be in audio.ts
```
If `sfx_message_ding` is not present, mode falls back to no sound (do not crash). Flag in asset spec that this sfx is required.

### `start(ctx, config, onComplete)`

**Cinematic open (0–800ms):**
1. `ctx.showLetterbox(800)` — bars slide in
2. Create black backdrop rect filling the screen: `ctx.add.rectangle(460, 330, 920, 660, 0x000000)` with depth 50
3. Tween backdrop alpha 0→1 over 400ms
4. At 400ms, build the chat window:

**Chat window layout (centered, depth 60):**
- Outer frame: `{ x: 460, y: 330, w: 620, h: 540, fill: 0x111827, stroke: 0x374151 }` — dark navy
- Header bar: `{ x: 460, y: 78, w: 620, h: 36, fill: 0x1f2937 }` with `ctx.label(460, 78, 'The Boys', { fontSize: 14, color: '#e5e7eb' })` centered
- Message area: roughly y=96 to y=480, content scrolls upward as new messages arrive
- Input bar: `{ x: 460, y: 528, w: 580, h: 32, fill: 0x1f2937, stroke: 0x374151 }` — text field visual
- Input bar text: `ctx.label(460, 528, 'Type a message...', { fontSize: 12, color: '#6b7280' })` — placeholder, swaps to player text as they type
- Four emoji buttons: row at y=560, evenly spaced across x=240–680. Each is a `{ w: 36, h: 28, fill: 0x1f2937 }` rect with a label inside (`💀`, `😭`, `❤️`, `…`). Hover effect: fill → `0x374151` on pointerover, back on pointerout.

**Complicity meter (left edge, depth 70):**
- Vertical bar: `{ x: 100, y: 330, w: 8, h: 440, fill: 0x1f2937 }` — empty track
- Inner fill: `{ x: 100, y: 552, w: 8, h: 0, fill: 0x991b1b }` — grows upward from bottom as complicity increases (y decreases, h increases). Start h=0.
- Label: `ctx.label(100, 100, 'BIT INTEGRITY', { fontSize: 10, color: '#6b7280' })` rotated -90deg above the meter

**State initialized:**
```
this.messages = []              // array of {speaker, text, isDM, element refs, arrivedAtMs}
this.playerInput = ''           // current text in input bar
this.complicity = 0             // 0..config.complicityMax
this.saidTrueThing = false      // set true on first parser hit
this.saidTrueThingAt = null     // 'early' | 'mid' | 'late' | null
this.groupReactionFiring = false // pauses timeline while group reacts
this.timelineIndex = 0          // which message is next
this.modeEnded = false
this.typingIndicator = null     // ref to current typing dots
```

**Input registered:**
- `ctx.input.keyboard.on('keydown', ...)` — capture printable chars into `playerInput`, ignore keys when final prompt is open. ENTER sends the message. BACKSPACE deletes.
- Each emoji button: `button.on('pointerdown', ...)` — fires `this.sendReaction(emoji)`
- Final prompt "Close app" button: created hidden, made visible when timeline ends

**Timeline loop initialized:**
- `ctx.time.addEvent({ delay: 100, callback: this.tickTimeline, callbackScope: this, loop: true })` — checks every 100ms whether the next message in the timeline is due

**Final prompt timer:**
- `ctx.time.delayedCall(config.timelineEndsAtMs, this.showFinalPrompt, [], this)`
- If player hasn't said a true thing by then, the final prompt is the last chance.

### `update(time, delta)`

This mode is event-driven, not physics-driven. `update` does three things:

1. **Complicity tick.** If `!this.modeEnded` and `!this.groupReactionFiring`:
   - `this.complicity = Math.min(config.complicityMax, this.complicity + delta * 0.001)` — +1/sec base
   - Update meter fill: `this.meterFill.height = (this.complicity / 100) * 440; this.meterFill.y = 552 - this.meterFill.height`

2. **Scroll check.** If any message bottom is below y=480 (bottom of message area), shift all messages up by the overflow. Implemented as a tween on the y of each message container for smoothness.

3. **Final prompt timeout.** If `this.finalPromptShown` and `!this.modeEnded`, track elapsed time since prompt shown. At `config.finalPromptTimeoutMs`, auto-resolve as silent (lose path).

### `teardown()`

Destroy everything created in `start`:
- Backdrop rect
- Chat window frame, header, message area background, input bar, emoji buttons, all message containers, typing indicator
- Complicity meter (track, fill, label)
- Final prompt overlay (if shown)
- All `ctx.time` events added by this mode (timeline ticker, delayed calls)
- All `ctx.input.keyboard` listeners registered by this mode
- All `ctx.input.on('pointerdown')` listeners on emoji buttons
- `ctx.hideLetterbox(800)` — bars slide out

Verify no leaks — the mode must leave the engine in the same state it found it, except for whatever the next beat creates.

---

### ModeContext API calls used

```
ctx.add.rectangle          — chat window, message bubbles, meter, buttons
ctx.add.graphics           — typing indicator dots (or use rects)
ctx.label                  — all text (header, messages, input, meter label, intro)
ctx.tweens.add             — message slide-in, typing dot fade, meter fill lerp, button hover
ctx.time.addEvent          — timeline ticker
ctx.time.delayedCall       — scheduled message arrivals, final prompt
ctx.input.keyboard         — capture player typing
ctx.input.on('pointerdown')— emoji buttons, close-app button
ctx.sound.play             — sfx_message_ding on each message arrival (if available)
ctx.showLetterbox          — cinematic open
ctx.hideLetterbox          — cinematic close (in teardown)
ctx.cameras.main.fade      — optional, fade to black before teardown
ctx.playerClass            — player's display name (for their sent messages)
```

No physics. No projectiles. No enemies. No walls. No `ctx.triggerQTE` — the choice is the text field itself.

### Win path

Player sends a message that the parser flags as a true-thing attempt at any point during the timeline (including the final prompt). On parser hit:
1. `this.saidTrueThing = true`
2. `this.saidTrueThingAt` set to `'early'` (before "I didn't get to see you :("), `'mid'` (after that message but before final prompt), or `'late'` (at final prompt)
3. Group reaction fires (see **Group Reaction** section below)
4. Timeline continues — Ben still skips track, Sean still tells him, etc.
5. When the final prompt resolves (either by player action or timeout), call:
   ```
   onComplete({
     outcome: 'win',
     payload: {
       saidTrueThing: true,
       when: this.saidTrueThingAt,
       complicity: Math.round(this.complicity),
     }
   })
   ```

The schema agent (Step 3) can use `payload.when` to vary the post-fight narration: early interventions get one extra line, late interventions get a different one.

### Lose path

Player never sends a true-thing message. They may have reacted with emoji, sent jokes, or stayed entirely silent. When the final prompt resolves (player clicks "Close app" OR timeout fires):
```
onComplete({
  outcome: 'lose',
  payload: {
    saidTrueThing: false,
    complicity: Math.round(this.complicity),
  }
})
```

Both outcomes play the same story beats afterward — Ben still skips track, Sean still tells him, Ben still blocks the account, Ben still comes back. The win/lose distinction is purely about whether the post-fight narration acknowledges that the player tried.

### Config schema

```typescript
interface GroupChatConfig {
  timelineEndsAtMs?: number;       // default 61000
  finalPromptTimeoutMs?: number;   // default 20000
  complicityMax?: number;          // default 100
}
```

All optional. Beat config can pass `{}` and mode uses defaults.

---

## MESSAGE TIMELINE

Each message has: arrival time (ms from mode start), speaker, text, thread (`'dm'` for Ben↔Maria, `'gc'` for group chat), and an optional `photo` flag.

DM-thread messages render with a small `🔒 DM` tag and a slightly different bubble color (`0x1e3a5f` for Maria, `0x3b1e1e` for Ben). Group-chat messages use `0x1f2937` with the speaker's name in their canonical color.

| t (ms) | Thread | Speaker | Text |
|--------|--------|---------|------|
| 1500 | dm | Maria Brooke | "hey! im doing a survey for walter johnson, heard you went there?" |
| 4000 | dm | Maria Brooke | "wait nvm the survey ended yesterday lol" |
| 6500 | dm | Ben | "oh lol u sure" |
| 8500 | dm | Maria Brooke | "yeah im just here now" |
| 10000 | gc | Jordan | "lmaooo he opened" |
| 11500 | gc | Nick F | "bro is hooked" |
| 13500 | dm | Ben | "u got snap?" |
| 15500 | dm | Maria Brooke | "no i stopped using it" |
| 17000 | gc | Maharko | "DEAD the door is closed and he dont even know" |
| 19000 | dm | Ben | "into racing too but only in rentals... gettin pretty good tho" |
| 21000 | dm | Maria Brooke | "oh track?" |
| 22500 | dm | Ben | "oh u meant track lmao" |
| 24000 | gc | Eric | "😭😭😭 the kart moment" |
| 26500 | dm | Ben | *(sends photo — no caption)* |
| 28000 | gc | Nick H | "💀💀💀" |
| 29500 | gc | Jordan | "lmaooo he really sent his face" |
| 32000 | dm | Maria Brooke | "wait do u know ethan rosner? he said he knows u" |
| 34000 | dm | Ben | "nah idk him" |
| 35500 | dm | Maria Brooke | "hes a senior i think" |
| 37000 | dm | Ben | "oh wait maybe" |
| 39500 | dm | Maria Brooke | "btw i have a volleyball game saturday if u wanna come" |
| 41500 | dm | Ben | "wait fr? what time" |
| 43500 | dm | Maria Brooke | "like 2" |
| 45000 | dm | Ben | "i have a track meet at WJ that day :/" |
| 47500 | dm | Maria Brooke | "I didn't get to see you :(" |
| 49000 | gc | Jordan | "oh no" |
| 50500 | gc | Eric | "she got him" |
| 52000 | gc | Nick F | "lmaooo ben is cooked" |
| 54500 | dm | Ben | "wait actually maybe i can skip track" |
| 56500 | dm | Ben | "yeah im just gonna go to her game" |
| 58000 | gc | Eric | "LMFAOOO" |
| 59000 | gc | Jordan | "this is the greatest thing ive ever seen" |
| 59800 | gc | Nick H | "💀" |
| 60500 | gc | Maharko | "ben is bout to skip practice for a girl that doesnt exist" |
| 61000 | — | *(final prompt)* | "Sean's at practice in twenty minutes. Type something — or close the app." |

Each message arrival:
1. Show typing indicator for 700ms (Maria/Ben) or 400ms (group chat) at the appropriate bubble position
2. Play `sfx_message_ding` (volume 0.3 — quiet, ambient)
3. Replace typing indicator with the message bubble
4. Tween bubble alpha 0→1 and y +8→0 over 150ms
5. Scroll older messages up if overflow

The `47500` message ("I didn't get to see you :(") is the **phase divider** — used to classify player interventions as `early` vs `mid` vs `late`.

---

## PARSER SPEC

The parser runs on every message the player sends. It returns one of three classifications: `'true'`, `'joke'`, `'neutral'`.

**True-thing detection — direct keyword hits (case-insensitive, substring match):**
```
'catfish'
'not real'
"doesn't exist" | 'doesnt exist' | 'does not exist'
'fake'                              // CAREFUL: see false-positive filter below
'made her up' | 'made up' | 'made her'
"it's eric" | 'its eric' | 'by eric' | 'eric made'
'shes not real' | "she's not real"
'this isnt real' | "this isn't real"
'tell him'
'not a real person'
'stop this' | 'stop it'
```

**False-positive filter for `'fake'`:**
If message contains `'fake'` but also contains `'lmao'`, `'lmfao'`, `'bro'`, `'bruh'`, `'lol'`, `'💀'`, `'😭'`, or `'😂'` → downgrade to `'joke'`. (e.g. "lmao this is so fake 💀" is group-chat banter, not an intervention.)

**Fallback attempt detection:**
If no direct hit, the message is flagged as `'attempted'` (counts as `'true'`) IF ALL of the following are true:
- Length ≥ 20 characters
- Contains no emoji (`💀😭❤️😂🥲🔥💯`)
- Contains no slang (`lmao`, `lmfao`, `lmaooo`, `bro`, `bruh`, `lol`, `dead`, `damn`, `cooked`, `fr`, `ngl`, `wild`, `crazy`, `insane`, `based`, `cap`, `no cap`)
- Contains at least one assertion keyword: `'not'`, `'fake'`, `'real'`, `'eric'`, `'stop'`, `'dont'`, `"don't"`, `'should'`, `'tell'`, `'truth'`, `'wrong'`, `'lie'`

This catches things like `"dude you need to tell him the truth"` or `"this is going too far honestly"` even if no exact keyword hit.

**Joke detection:**
If the message contains any slang token or emoji and no assertion keyword → `'joke'`. Adds +3 to complicity.

**Neutral:**
Anything that doesn't classify as `'true'` or `'joke'` (e.g. `"wait what?"`, `"huh?"`, `"???"`). No complicity change. No flag set.

---

## GROUP REACTION TO PLAYER INTERVENTION

When the parser fires `'true'` for the first time:

1. `this.groupReactionFiring = true` — timeline pauses (next scheduled message doesn't fire until reactions finish)
2. Player's message appears in the chat (group-chat thread, labeled with `ctx.playerClass.name`)
3. After 1200ms pause, fire 2–3 group reactions in rapid succession (600ms apart), drawn from a tier based on `this.saidTrueThingAt`:

**Early intervention (before "I didn't get to see you :("):**
- Jordan: "wait what"
- Nick F: "lmao ok"
- Eric: "stfu"

**Mid intervention (after "I didn't get to see you :(" but before final prompt):**
- Jordan: "bro chill"
- Maharko: "ur killing the vibe"
- Eric: "lol ok"

**Late intervention (at final prompt):**
- Jordan: "..."
- *(no further reactions — the chat goes quiet, which is the worst reaction of all)*

4. After last reaction fires, `this.groupReactionFiring = false` — timeline resumes
5. If player tries to send a second true-thing message, no additional reaction fires. The group has already moved on. The second message just appears silently in the chat. This is intentional — saying it twice doesn't help, and the game should make that feel true.

---

## COMPLICITY METER BEHAVIOR

- **Base tick:** +1/sec while mode is active and not in group-reaction pause
- **+5** per emoji reaction sent by player
- **+3** per joke message sent by player (parser classification)
- **+0** per true-thing message (you don't get more complicit for saying the true thing — that's the point)
- **+0** per neutral message
- **+0** for doing nothing (the base tick already covers this)
- **Max:** `config.complicityMax` (default 100)
- **Never triggers lose state.** The meter is a record, not a health bar.
- **Visual:** red fill (`0x991b1b`) grows upward from bottom of vertical track. Label "BIT INTEGRITY" rotated -90° at top.
- **Exposed in `onComplete` payload** so post-fight narration can reference it if desired (e.g. a high-complicity playthrough could get a different last-line variant).

---

## INTRO LINES

```typescript
introLines: [
  "You're in the chat. You've been in the chat since the first message.",
  "Ben is about to skip track practice for a girl who doesn't exist. Say something, or don't.",
],
```

The first line names what the player is walking into: complicity by presence. The second names what's actually at stake — not the mechanic (typing), the moral thing (saying something true when it costs you).

---

## DIFFICULTY NOTE

**This mode is fair on first attempt by design.** There is no skill ceiling. The timeline runs ~61 seconds. The player has sixty-one seconds of opportunities to type. The parser is lenient — direct keyword hits, plus a fallback for any earnest 20+ character message. The player cannot die. The complicity meter cannot kill them.

The "difficulty" is not mechanical. It is social. The game is constantly inviting the player to react — emoji buttons are right there, glowing softly. The meter is filling. The group is laughing. The bit is funny. The pressure to play along is the actual antagonist. A player who reacts to five messages and types "lmaooo ben is cooked" has not failed — they've played the mode exactly as the group wanted them to. That playthrough is a valid ending. It's the ending most players will get on first attempt, because it's the path of least resistance.

A player who types "it's a catfish, eric made her up" the moment Ben sends his face has done something harder than any boss fight in this game. They broke rank. The group pushed back. The outcome didn't change. The chapter notes that they did it anyway.

**Should it be hard?** No. It should be *tempting*. Those are different things, and only one of them is the chapter's actual subject.

**Is there a version of "losing" that still feels like a valid ending?** Yes — every version of losing is a valid ending. That's the whole design.

---

## WHAT THIS MODE NEEDS

**New code:**
- `src/game/modes/groupChat/` — new folder
  - `index.ts` — exports the `GameMode` implementation
  - `timeline.ts` — the message timeline data (table above, as a typed array)
  - `parser.ts` — the parser logic (pure function, fully unit-testable)
  - `reactions.ts` — the group-reaction tiers
- Register in mode registry (per Step 5 integration checklist)

**New assets:**
- `sfx_message_ding` — soft notification sound, ~200ms, infectious. Should feel like a real Instagram DM notification. One short audio file. Required for the mode to feel right — flag in Step 4 asset spec.

**New UI (procedural, no sprite needed):**
- Chat window frame, header, message bubbles, input bar, emoji buttons, complicity meter — all drawn with `ctx.add.rectangle` and `ctx.label`. No sprite atlas work.
- Typing indicator: three small circles, animated via tween (alpha pulse, staggered). Pure code.

**No new sprites. No new textures. No new animations.** This mode is built from rectangles and text. That's the right shape for a chapter about a chat interface — the visual minimalism matches the subject.

---

## HANDOFF NOTES

- **To Step 3 (SCHEMA):** write the beat that fires this minigame and the post-fight narration beats that read the `onComplete` payload. Consider varying narration by `payload.when` (early/mid/late/silent) — four possible endings, all valid, none of which save Ben.
- **To Step 4 (ASSETS):** one required sfx (`sfx_message_ding`). No sprites, no textures, no music changes specific to this mode (chapter music continues underneath).
- **To Step 5 (INTEGRATION):** new mode folder registration, audio.ts entry for the new sfx, typecheck, playtest the four ending variants.
- **To the developer:** parser is a pure function — unit-testable in isolation. Timeline data is a typed array — easy to tweak in `timeline.ts` without touching mode code. Complicity meter values are constants — easy to rebalance.

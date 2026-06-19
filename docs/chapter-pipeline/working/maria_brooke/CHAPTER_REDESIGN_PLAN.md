# Maria Brooke — Chapter Redesign Plan ("The Complicit Witness")

This plan reshapes the Maria Brooke flashback from "walk desk-to-desk reading narration" into a
tense, voyeuristic piece about being *in the chat* while a friend gets catfished in real life. It is
written as a handoff: it states the design guardrails, then breaks the work into modules with
concrete engine integration so they can be built incrementally.

**You do not have to build all of it.** Modules are tagged **[CORE]** (the redesign's backbone),
**[HIGH-VALUE]** (big payoff, low risk), or **[STRETCH]**. A suggested phasing is in §6.

---

## 1. Non-negotiable design principles (the guardrails)

The narrative's power is a specific, fragile thing. Mechanics must serve it, not fight it. Three
rules that any implementation MUST respect:

1. **The player is the complicit witness — never the puppet master.** You are *in the chat*. You can
   react or stay silent; you cannot author the catfish or run the prank. (We may add a tiny optional
   "help land one line" spike — §5.O — but it must stay a 10-second garnish, not the spine.)
2. **The outcome never changes. Futility is the point.** This is "a playable recollection" (the
   game's own tagline) — a memory that already happened. Ben always falls for it, always skips, Sean
   always breaks the bit, Ben always blocks the account. Player choices change **how you feel, what
   you notice, and what you learn about yourself** — the *flavor* and the *self-knowledge* — but
   NEVER the events. Do **not** add branching that lets the player "save" Ben. The existing coda
   routing (`saidTrueThing` + `when` → early/mid/late/silent) is exactly the right altitude: same
   ending, different shade. Keep that model.
3. **Silence must be a felt choice, not an absence.** Doing nothing should be the easy, socially
   rewarded path — and the mechanics should make the player *notice* they took it.

---

## 2. The redesigned rhythm: the phone vs. the room

The current chapter is one channel: narrator text triggered by walking to spots. The redesign runs
**two channels in tension** —

- **THE PHONE** — the DM/group-chat (the existing `groupChat` minigame). Where the joke lives.
- **THE ROOM** — the classroom: friends snickering and glancing at Ben, Ben grinning at his phone
  15 feet away, oblivious; Sean's chair. Where the real person is.

The drama is the *gap* between them. The chapter should cut back and forth so the player feels both
the pull of the bit and the weight of the room. Skeleton (replaces most of the current scene-0
walk/dialogue beats):

```
COLD OPEN (room):     short, no walking. Establish: Eric's phone under the desk, Ben across the room,
                      the account is 3 hours old. End on the first ding.
PHONE beat 1:         groupChat opens — the hook messages. (existing mode)
ROOM cutaway 1:       cameraPan to the boys; laugh bubbles; glance at Ben. (M1)
LOOK-UP choice 1:     stay on phone / look up at Ben. (M2)
PHONE beat 2:         the kart slip; the photo. Group "looks at you" pressure point. (M3)
ROOM cutaway 2:       Ben smiling at his phone, alone.
... escalate ...
THE FROWN:            "I didn't get to see you :(" — the bit stops being funny. Audio shift. (M4)
PHONE beat 3:         Ben says he'll skip. Final pressure point.
THE SILENCE:          Sean clocks it. Music + dings CUT. (M4/M5) — the climax.
TRACK SCENE:          (existing scene 1) Sean breaks the bit to Ben.
CODA:                 (existing routeOnMinigame codas) + REPORT CARD. (M6)
```

Net: fewer, more deliberate movements; constant phone↔room cutting; the player mostly *planted and
watching* rather than pathfinding between desks.

---

## 3. Engine building blocks that already exist (reuse these)

Confirmed in the codebase — author with these before writing new systems:

- **`choice` beat** (`types.ts`): `{ type:'choice', speaker, prompt, options: ChoiceOption[] }`.
  Each `ChoiceOption` has `text`, optional `goto` (jump to a beat `id`), `reactionLines` +
  `reactionSpeaker` (lines spoken after the pick), and `ledgerDelta`. **Both options can converge**
  (one `goto`s a short witness beat that flows back, the other falls through) → perfect for
  "look up vs stay on phone" without branching the story.
- **`cameraPan` beat**: `{ type:'cameraPan', x, y, durationMs, holdMs? }` — cut to Ben / the empty
  chair / the boys.
- **`stopAllAudio` beat**: already dispatches `sound.stopAll()` + `audioController.pauseStageMusic()`
  → the silence beat (M4) is mostly authoring.
- **`minigame` beat** + **`routeOnMinigame` beat**: how `groupChat` is launched and how codas are
  selected. The report card (M6) is a new `minigame`-style mode run before `endChapter`.
- **`ModeContext` / scene helpers**: `showBubbleText(actorGO, text, color)` for speech bubbles over
  actors, `showActor(id)` / `hideActor(id)`, `label()`, `cameras`, `sound`, `tweens`,
  `actorSprites[id]`. Use these for room reactions instead of new infra.
- **`AudioController`**: `crossfadeToMusic(key)`, `pauseStageMusic()`. Music keys: `music_maria_brooke`
  (Flashbacks slowed) and sfx `sfx_message_ding` are already loaded.

---

## 4. Module breakdown

### M1 — Phone↔Room cutaway rhythm  **[CORE]**
Make the room *react live* during/between phone beats: friends snicker (laugh bubbles), heads turn
toward Ben, Ben grins at his phone unaware.

- **Authoring-only version (do this first):** between phone beats, sequence `cameraPan` →
  `showBubbleText` over the boys (e.g. Jordan "💀", Nick F "he's so down bad") → short `wait` →
  `cameraPan` back. No new beat type required.
- **Optional polish (new):** a lightweight **background minigame mode** `classroomAmbience`
  (`background: true` so it doesn't block beats) that, on a timer, pops occasional laugh bubbles over
  random boys and nudges them to glance at Ben. Mirrors the `poolParty` background-mode pattern.
  Register in `modes/index.ts`. Keep it cosmetic — it must never gate progression.

### M2 — "Look up from your phone" choice  **[CORE]**
A recurring micro-choice that embodies the theme: keep watching the screen (safe, complicit) vs.
look up at Ben / Sean's empty chair (uncomfortable truth). **Looking up changes nothing** — it just
shows you something that makes it worse and makes you carry it.

- **Build:** pure `choice` beats. ~3 of them, placed at rising-tension moments.
  - Option A "keep watching" → `reactionLines` (a beat of the bit continuing), falls through.
  - Option B "look up" → `goto` a short id'd beat: `cameraPan` to Ben grinning / the empty chair +
    one quiet narrator line, then flows back into the same next beat.
- **Track** which option the player picks (see §7) — feeds the report card, NOT the ending.

### M3 — Silence is socially expensive  **[CORE]** (evolve the existing pressure loop)
Gemini already added a Ben-resolve meter + timed pressure points to `groupChat`. **Reframe** them so
each pressure point is "the group just did something funny and is *looking at you*, expecting a
reaction":

- On a pressure point: show a short prompt like *"They're all looking at you. 😏"* + the existing
  countdown.
- **React** (type a joke / tap an emoji) → easy, instant social reward, complicity up, the boys
  affirm you ("LMAOO right"). **Stay silent** (let the timer run) → a beat of awkwardness, someone
  clocks it ("you good?"), then the bit rolls on anyway.
- Keep the existing truth-path (parser `'true'` → group dogpile, resolve dip-then-snap-back). The new
  framing just makes *not reacting* legible and uncomfortable instead of invisible.
- This is mostly copy + small UX on top of the existing `groupChat` pressure system — **no contract
  changes** (still returns `saidTrueThing`/`when`/`complicity`, plus add counts per §7).

### M4 — Audio layer + the silence beat  **[HIGH-VALUE]** (cheapest big win)
Sound does most of the tension work and the chapter barely uses it.

- **Texture:** keep `sfx_message_ding` per incoming message (already done); keep `music_maria_brooke`
  (Flashbacks slowed) under the whole sequence.
- **The frown (the turn):** when `"I didn't get to see you :("` lands, duck the music (tween volume
  down) — the bit audibly loses its air.
- **The silence beat (the climax):** the instant Sean clocks it, fire a `stopAllAudio` beat (already
  exists) — kill music + dings dead. Hold the silence for a beat before the track scene. The
  whiplash from "LMFAOOO" to nothing is the emotional peak. Optionally a single low sting on the cut.

### M5 — The Sean turn as the climax  **[HIGH-VALUE]**
Sean is the moral fulcrum — he breaks the bit only because it finally costs something in *his* world.
Right now it's two dialogue lines. Stage it as a climax:

- In the phone, show the chat going **quiet**: the rapid-fire laugh reactions stop; a "Sean is
  typing…" indicator hangs; then nothing. (The worst reaction is silence.)
- Pair with M4's `stopAllAudio`. Then a tight `cameraPan` and the existing track-scene confrontation.
- Keep Ben's blocking the account as the cold button it already is (two taps, no confrontation).

### M6 — Cold complicity report card  **[HIGH-VALUE]**
End on an indictment, not a score. A new end-card mode reads the run's stats and states them flatly.

- **Build:** a new minigame-style mode `complicityReport` (own folder under `modes/`, follow the
  `groupChat` structure + the §"hard constraints" gotchas). Run it as a `minigame` beat **after** the
  coda dialogue and **before** `endChapter`.
- **Copy style — factual, quiet, damning. Example:**
  > You laughed 7 times.
  > You typed the truth once — four minutes too late.
  > You looked up at Ben twice.
  > Ben blocked the account at 3:51 PM.
  > The Maria Brooke thing is still funny though.
- Lines are assembled from the tracked stats (§7). Fade them in one at a time over the ducked/again-
  silent track. Then `endChapter`.

### M7 — Trim the walk padding  **[CORE]**
Cut the current walk-to-desk beats down to 2–3 *meaningful* movements (or replace with cutaways).
Walking to a spot to trigger text is the main source of "boring." Movement should mean something
(e.g., the one time you *cross the room toward Ben* and stop yourself).

### Optional spikes **[STRETCH]** — borrow the energy, not the backbone
- **O1 — "Help land one line" (Eric):** ONE ~10s moment where Eric is mid-message and you pick which
  of 3 phrasings sells it. Makes you complicit *by your own hand*, once. A `choice` beat. Do not let
  it grow into a whole writing game (that would violate Principle 1).
- **O2 — "Don't laugh out loud" (room):** ONE ~15s beat where a laugh is bubbling and you have to
  *not* react / shush, or risk the teacher glancing over. A tiny timed input. Comedic spike only —
  keep it to one beat so it doesn't turn the chapter into slapstick (Principle 2).

---

## 5. Stat tracking (`ChapterStats`)

The report card (M6) and the look-up choices (M2) need stats that span the whole chapter, not just
the minigame. Add a small, explicit accumulator:

- A lightweight per-run store — e.g. a `ChapterStats` object stashed on the scene (or a module
  singleton reset at chapter start). Fields:
  `laughs` (reactions/jokes sent), `truthsTyped`, `firstTruthPhase` (early/mid/late/null),
  `lookUps` (M2 option B count), `pressureIgnored`, `finalResolve`, plus fixed beats like the
  block time string.
- `groupChat`'s `resolve()` payload already returns `complicity`, `saidTrueThing`, `when`,
  `messagesSent`, `jokesSent` — fold those in. M2 choice beats and M3 reactions increment the rest.
- **Reset at chapter start** (singleton hygiene — same discipline as the `groupChat` reset).

---

## 6. Suggested phasing (max impact, least risk)

1. **Phase 1 (the feel):** M4 (audio + silence) + M7 (trim walks) + M5 (stage the Sean turn). Mostly
   authoring + audio; transforms tone immediately with little new code.
2. **Phase 2 (the theme as a verb):** M2 (look-up choices) + M3 (silence-is-expensive reframe). Uses
   `choice` beats and the existing pressure loop.
3. **Phase 3 (the payoff):** M5 stat plumbing + M6 (report card). New mode + `ChapterStats`.
4. **Phase 4 (polish/garnish):** M1 background ambience mode; optional O1/O2 spikes.

Phase 1 alone will already make it feel like a different chapter.

---

## 7. Preserve these contracts & gotchas (do not regress)

From hard-won fixes this cycle — any new code MUST respect:

1. **`routeOnMinigame` payload is sacred.** `groupChat` must keep returning
   `result.data.saidTrueThing` (bool) + `result.data.when` (`early|mid|late`). The codas depend on
   it. Add new fields alongside; never rename these.
2. **`started` guard.** Any minigame mode (`groupChat`, new `complicityReport`, `classroomAmbience`)
   must early-return in `update()` until `start()` finishes — the scene sets `activeMode` *before*
   `start()` runs (deferred behind intro dialogue). Forgetting this froze the whole Phaser loop.
3. **Singleton reset.** Modes are singletons. Reset every field at the top of `start()`. Same for
   `ChapterStats`.
4. **Depth.** Minigame UI uses base `D = 9000` (above world, below letterbox 9500). Overlays D+18/20.
5. **Mask scroll offset.** Clipped chat UI offsets its mask by `cam.scrollX/scrollY` (bubbles are
   `scrollFactor(0)`, mask is world-space). Reuse the pattern for any new clipped panel.
6. **No `cameras.main.setBounds`.** It off-centers the map on wide viewports (CLAUDE.md §4). Player
   is confined by `physics.world.setBounds` + perimeter walls only. The `cameraPan` beats scroll the
   camera freely — that's fine and expected.
7. **No side effects inside React `setState` updaters** (StrictMode double-invoke) — relevant if the
   report card or any new overlay routes through the React dialogue bridge.

---

## 8. Explicitly OUT OF SCOPE (and why)

- **Outcome branching / "save Ben" paths.** The futility is the whole point (Principle 2). Branching
  the events would convert a haunting story about powerlessness into a puzzle you can win, which
  deflates it. Branch *flavor and self-knowledge*, never *events*.
- **Player-as-puppet-master as the spine** (the full "help Eric write the catfish" game). Violates
  Principle 1. Allowed only as the one-shot O1 garnish.
- **Full "suppress the laugh" stealth game.** Allowed only as the one-shot O2 spike; as a backbone it
  makes the player the prank's protector and turns the chapter into slapstick.

---

## 9. Acceptance criteria

1. The chapter cuts between phone and room repeatedly; the room visibly reacts (faces/bubbles/glances
   at Ben) — it is no longer pure narrator text triggered by walking.
2. At least 3 "look up vs stay on phone" choices exist; looking up shows a quiet, worse truth and
   **does not change the ending**.
3. Pressure points read as "the group is looking at you"; staying silent is visibly awkward, not
   invisible.
4. Music ducks at the frown; **all audio cuts** at the Sean turn; the silence is held before the
   track scene.
5. The chapter ends on a cold, factual complicity report assembled from real run stats.
6. Walk-to-desk padding is reduced to ≤3 meaningful movements.
7. The four codas still select correctly via the unchanged `routeOnMinigame` contract.
8. Replaying the chapter starts clean (all stats/singletons reset); no console errors; `npm run lint`
   passes; map stays centered on wide viewports.

---

## 10. Manual test path
Character select → Eric → (FREE PLAY) → FLASHBACKS → Maria Brooke → play through. Dev shortcut to the
phone minigame: `window.__OMEGA_GAME__.scene.getScene('ChapterScene').beatEngine.startBeat(<idx>)`
(find the `minigame` beat index), press Enter to clear intro dialogue. Verify the §9 criteria.

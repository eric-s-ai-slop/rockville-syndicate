# Origins — Phase 5: MECHANICS (implementation-ready)

Process: `../../MAGNUM_OPUS.md` Phase 5, specs in `../../02b_MECHANIC.md` format plus
the added field **"the prose passage it implements."** Inputs: `05_structure.md` §6
(mechanic slots, verbs), the four approved prose batches in `06_scenes/`, and the real
engine (`src/data/chapters/types.ts` Beat union, `src/game/modes/CLAUDE.md` registry,
`docs/ADDING_A_MINIGAME.md`, `src/game/modes/_template/index.ts`). Everything below was
verified against the code on 2026-07-06 — including three engine facts that shape these
specs:

1. **`cameraPan` freezes the player and re-follows the player after `holdMs`**
   (`BeatEngine.runCameraPanBeat`: `stopFollow → pan → delayedCall(durationMs+holdMs)
   → startFollow(player)`). So: a long `holdMs` pan is THE tool for "hands removed"
   protected silences; and the camera cannot sit on a far island during a dialogue
   block unless the player is standing near it (maps in `08_maps.md` place the player
   accordingly).
2. **`wait` beats do NOT freeze the player.** The coda's "you can still move and there
   is nowhere to go" hold is literally a stack of `wait` beats — the engine already
   does exactly what the prose orders.
3. **`endChapter` hard-plays `victory_jingle` + a green camera flash + a victory
   animation** (`ChapterScene.runEndChapter`). The ending spec bans all three. The
   build guide (09) specs a tiny engine change (`quietEnd` flag). This is not optional.

**Design law (restated, binding):** the mechanic is the scene's emotional conflict made
playable, never a fun game bolted on. Nothing below has a fail-state that punishes —
this is a memory; per MAGNUM_OPUS, "losing" rewinds with *"That's not how it happened."*
**No `bossFight` beat appears anywhere in this chapter** (structure §6 ruling).

---

## 0. THE ONE NEW MODE: `doubleCall`

Every interactive mechanic in this chapter that plain beats can't carry is **one new
mode with variant configs** — the repetition-with-variation requirement (structure §6)
made literal in the code: the same mode that rings the phones behind Act I, uncredited,
is the mode the player operates in Act II, is the mode the player refuses in Scene 10,
is the phone the player answers in the coda. One machine, one registry entry, rules
changing. A future reader of `modes/index.ts` sees exactly what Eric built: one tool.

- **modeId:** `doubleCall`
- **Folder:** `src/game/modes/doubleCall/` (copy `_template/`), registered in
  `src/game/modes/index.ts` (`registerMode(doubleCallMode)`) **and added to the mode
  table in `src/game/modes/CLAUDE.md`** — `modesDoc.test.ts` fails otherwise.
- **Invocation:** always a `minigame` beat: `{ type: 'minigame', modeId: 'doubleCall',
  config: {...}, background: <per variant> }`. `loseGoto` is never used. The mode
  **never emits `outcome: 'lose'`** — the Scene 10 rewind is internal (below).
  `routeOnMinigame` is never used (it is hardcoded to groupChat's payload).

### 0.1 Config shape

```typescript
// src/game/modes/doubleCall/index.ts
export type Pt = { x: number; y: number };

export interface DoubleCallConfig {
  variant: 'ringOnly' | 'founding' | 'rerun' | 'unsent' | 'capital' | 'reply';

  // World-space staging coordinates (void map; see 08_maps.md L2 for values).
  leftPhone?: Pt;         // Nick F's phone (ring glow anchor)
  rightPhone?: Pt;        // Jacob's phone (ring glow anchor)

  // ── ringOnly (background, Act I — the planted evidence) ──
  ring?: {
    left: boolean; right: boolean;   // which phones pulse
    callerIdLeft?: string;           // 'JACOB' — a tiny caller-ID label over the LEFT
                                     // phone only. Jacob's side NEVER shows an ID
                                     // (Scene 3 subtext note: staging protection #1).
    durationMs: number;              // pulse+sfx run, then silent self-complete
    darkenIsland?: { x: number; y: number; w: number; h: number };
                                     // voicemail night: overlay rect alpha-tweened to
                                     // 0.85 over Jacob's island ("the right room is
                                     // dark"). CONSTRUCT WITH fillAlpha 1, tween alpha
                                     // (root CLAUDE.md rectangle gotcha).
  };

  // ── founding / rerun (the wiring interface) ──
  wire?: {
    field1Label: string;             // contact card text: 'NICK F'
    field2Label: string;             // 'JACOB' — or 'BEN' on the Ben run
    typing: 'full' | 'autofill' | 'oneKey';
    // 'full'   = every keypress types the next digit of a fake number (type-along;
    //            the player cannot mistype — any key emits the next character).
    // 'autofill' = ghosts pre-filled; one keypress confirms each field.
    // 'oneKey' = fields fill instantly; only the button press remains.
    // M3 uses 'full'. M4 runs walk full → autofill → oneKey: "by the second one it
    // stops framing your hands... That speed is not a design shortcut. That speed is
    // the finding."
    blindWaitMs?: number;            // founding: the protected blind wait (~8000)
    deadAirHoldMs?: number;          // voicemail run: the protected nothing (~6000)
    ringPanMs?: number;              // camera pan L→R showing both phones ring
  };
  run?: 'routine' | 'voicemail' | 'ben';   // rerun sub-variant (one beat per run)

  // ── typed replies (rerun 'ben' + reply) ──
  typedReply?: Array<
    | { kind: 'exact'; text: string }      // player must press the actual keys:
                                           // 'why' = w,h,y ; 'omw' = o,m,w. Wrong keys
                                           // do nothing (a 1px shake, no sound).
    | { kind: 'chip'; text: string }       // one suggestion chip (💀); ENTER/click sends
    | { kind: 'auto'; text: string }       // era-Eric types it himself, player watches
                                           // ('what did he want' in M3)
  >;

  // ── unsent (Scene 10, M5) ──
  unsent?: {
    minStillMs: number;              // input ignored for first ~1500ms (no accidental
                                     // instant resolution; NOT a visible timer)
    rewindLine: string;              // 'That's not how it happened.' — rendered with NO
                                     // speaker tag, no sting, white on black
    walkAwayHoldMs: number;          // any WASD/arrow key held this long (~500ms)
                                     // = stand up (the mode tweens ctx.player two steps
                                     // back from the desk — blocking modes freeze
                                     // physics movement, so the mode moves the sprite
                                     // itself; benTrivia keydown-listener pattern)
    closeSfx?: string;               // 'sfx_laptop_close' — the era's last sound
  };

  // ── capital (Scene 9) ──
  capital?: {
    oldThreadName: string;           // 'electric vehicle squad' — exact, once
    newThreadName: string;           // 'Sub Zero Squad' — rendered as the chat header,
                                     // never spoken
    memberCount: number;             // names arrive as light, one at a time, +1
    driftMs: number;                 // the lights-changing passage (~12000)
    postRenameHoldMs: number;        // ≥ 8000 — NAMED PROTECTED SILENCE, not skippable
  };

  // ── reply (Scene 0 draft + Scene 11 coda) ──
  reply?: {
    threadHeader?: string;           // Scene 11: 'Sub Zero Squad'. Scene 0: OMIT —
                                     // showing the name in Scene 0 pre-fires Scene 9's
                                     // recognition beat. Compose field only.
    incoming?: { sender: string; text: string };  // { 'JACOB', 'who tryna go to mcdonalds tn?' }
    draft?: { text: string; holdMs: number; deleteCharByChar: true };
                                     // Scene 0: 'I need to tell you guys something.'
                                     // auto-typed, held, deleted ONE CHARACTER AT A
                                     // TIME (the prose is explicit)
    reply?: { kind: 'exact'; text: string };      // 'omw'
    codaExit?: { doorPoint: Pt; finalHoldMs: number };
                                     // Scene 11 only: after send, the mode dismisses
                                     // the big phone UI leaving a small phone-glow
                                     // decal on the desk, tweens ctx.player to the
                                     // door, holds on the empty room + glow for
                                     // finalHoldMs (~4000), then cam.fadeOut(1500) and
                                     // onComplete. (The glow must survive until the
                                     // fade completes — teardown after onComplete
                                     // destroys it invisibly. This is why the mode
                                     // owns the exit, not beats.)
  };
}
```

### 0.2 ModeContext usage (only real API — verified against ADDING_A_MINIGAME.md)

- **All UI is screen-space:** `setScrollFactor(0)`, depth ≥ 9600, and **every**
  coordinate through `screenSpace(ctx.cameras.main)`'s `zx()/zy()`, every size/font/
  stroke through `s()`. The phone panel and the two-field site frame are the exact
  class of HUD that has bitten three modes before (root CLAUDE.md). `_template/`
  demonstrates; do not hand-roll.
- **All text via `ctx.label()`** — never `add.text`.
- Ring glows / island-darken overlays are **world-space** (`ctx.add.circle` /
  `ctx.add.rectangle` at map coords, alpha tweens via `ctx.tweens`). Rectangles that
  will fade: construct `fillAlpha: 1`, tween `alpha` (root CLAUDE.md gotcha).
- Camera moves inside the mode via `ctx.cameras.main.pan(...)` (founding variant's
  L→R ring pan). Note the host's follow-cam: `BeatEngine` re-follows the player after
  its own pans, and the player is seated at the desk during founding/rerun, so the mode
  must pan out AND back to the desk before completing.
- Keyboard: a `window` `keydown` listener added in `start()`, removed in `teardown()`
  (benTrivia pattern — blocking modes freeze WASD at the physics layer, so raw keys
  are the input channel).
- Audio: `ctx.sound.play(key)` for ring/buzz/click; **no music, ever, from this mode**.
- Narration that the prose interleaves *inside* an interaction (e.g. "This is the part
  you do. Not watch — do.") is pushed by the mode via `ctx.onStoryDialogue(payload,
  done)` with lines passed in config — the words stay in the chapter file, the mode
  stays content-free. Where the prose puts narration *between* interactions, split into
  separate `minigame` beats instead (Scene 6 is three beats, not one — see M4).
- Completion: `onComplete({ outcome: 'win', data: { variant, pressedCount? } })`
  exactly once, guarded by a `modeEnded` flag. Never `'lose'`.

### 0.3 New-asset flags (detail belongs to Phase 8 — names only)

`sfx_phone_ring` (loopable, diegetic, dry), `sfx_phone_buzz` (one short buzz — also the
coda's single protected sound), `sfx_laptop_close`, optional `sfx_key_clack`, optional
`sfx_nose_exhale` (M1; a dialogue-staged "(a single nose-exhale.)" line is the free
fallback). One music track `music_origins` (Act I only). Phone/site UI needs **no art**
— rectangles + `label()` per the register of every other mode. `sfx` beats silently
skip unloaded keys, so missing assets degrade gracefully.

---

## M1 — Scene 1: "THE SCOREBOARD" (verb: performing upward)

**The prose passage it implements:** *"Nick H's eyes flick — very briefly — to
Maharko's face, checking whether the agreement scored. This is the thing to watch
tonight. Every line the Nicks say has a follow-up glance attached, submitted upward,
and Maharko's face is the scoreboard: a nose-exhale is a point; nothing is nothing."*

**BUILD CLASSIFICATION: (a) existing beats only.** `walkTo` + single-option `choice` +
`cameraPan` + `sfx`/staging dialogue. No mode.

**The loop.** The player (Eric, unacknowledged — he wasn't there; he owns the telling)
walks the reenactment: `walkTo` the door, `walkTo` the booth. Then, three times across
the scene, at the exact moments the prose marks a bid, the beat stream offers a
single-option choice — `[ Check the scoreboard. ]` — and the accept triggers a short
`cameraPan` to Maharko (durationMs ~700, holdMs ~900) plus the result:
1. After Nick H's "It's the carbonation." → *(a single nose-exhale.)* — one point.
2. After Nick F's "the Pike locations just care more" → *(nothing.)* — nothing.
3. After the "who's at a McDonald's at three in the morning" detonation → *(two
   nose-exhales. A standing ovation.)*
Results render as one flat Group-Chat staging line each (or `sfx_nose_exhale` if Phase
8 supplies it). Late in the scene the player also `walkTo`s the pickup counter while
Chris orders — the player physically walks Chris's clean path once before the booth
gets to erase him.

**Win/lose:** none. The glances cannot be declined (single option) and cannot score
differently — ruling 1: the story is invariant; only the looking is playable.

**The emotional argument.** The scene's cruelty is an audition, and the audition's unit
of currency is the upward glance. Making the glance the player's ONLY verb in the
founding scene teaches the machine's physics in the hands before any narrator explains
it: you say the thing, then you look up to see if it landed. The player is not asked to
be cruel — they are asked to check whether cruelty scored, which is worse, and which is
what actually happened in that booth.

**Guardrails:** the two firings of the McDonald's irony stay uncaptioned (no glance
choice attaches to them); the choice text never varies; no option ever mocks Chris
(his four protected beats are dialogue, untouched by M1).

---

## M2 — Scene 3: "THE WORKING MODEL" (verb: laughing along / building the fake Jacob)

**The prose passage it implements:** *"By October, the calls are an institution, and
the group has a complete working model of Jacob: he calls because he misses them; he
says nothing because he panics; he denies it because he's committed to the bit. / It is
a rich, funny, fully coherent picture of a person, and they built it together, out of
the parts of him that arrived by phone. / Jacob has never once been consulted on it."*

**BUILD CLASSIFICATION: (a) existing beats** (`choice` ×3, converging) **plus the
`doubleCall` `ringOnly` background variant** for the planted evidence (both phones
pulsing, incoming, same instant, never captioned).

**The loop.** The GC overlay is dialogue beats (verbatim texts as `dialogue` lines from
`nick_f`/`eric`/`nick_h`). Three times — once per recurrence — the player, holding the
group's voice, picks the group's next read of Jacob. Each `choice` (speaker:
`narrator`, prompt flat: "The chat settles what this was.") offers 2–3 options that are
ALL wrong and all warm — drawn only from the model the narrator will later name:
- Recurrence 1: "he just misses you guys" / "he wanted to hear your voice"
- Recurrence 2 (the silent call): "he panicked" / "he's committed to the bit"
- Recurrence 3 (the voicemail): "at least he was creative" *(canon — this option, when
  picked, IS Nick H's verbatim; the other option "the prep on this guy" routes to the
  same verbatim via `reactionLines`)*
Every option falls through to the same next beat (`goto` convergence; ruling 1 — no
branch changes the story). `reactionLines` supply the group's riff on whichever clause
the player contributed. The model gets fully assembled regardless; the player chose
which brick they personally laid.

**Win/lose:** none. There is no option that questions the calls — *"Why would I call
you?"* is the era's security system, and the menu enforces it: the true read is not on
the menu, exactly as it was not in the room.

**The emotional argument.** The snap (Scene 5) must convict the player too ("you
believed the wrong caller"). A player who merely watched Act I can acquit themselves;
a player who PICKED "he panicked" cannot. The choice beats are the chapter doing to the
players what Eric did to the group: offering only wrong readings, warmly.

**Guardrails:** all invented option/reaction lines stay teasing-sideways, indicting the
group's read, never minting a new blow on Jacob (Scene 3 subtext notes). The double-ring
(`ringOnly` beats) is NEVER referenced by any option, reaction, or caption. Eric's one
overlay text ("what did he want") is a plain dialogue beat — no choice wraps it.

---

## THE REVEAL-PAN — Scene 5 (not a numbered slot; the chapter's hinge)

**The prose passage it implements:** *"It doesn't cut and it doesn't fade. It pans …
And the dark gives way, the way dark does when it was never empty. Only unlit. / A
third island."* Plus the handoff: *"The speaker label … has changed. It does not
change back."*

**BUILD CLASSIFICATION: (a) existing beats + one one-line data change.** No mode.

**Mechanism (full map spec in `08_maps.md` §L2):**
1. Scene 4 ends held on the empty dark: `cameraPan(1200, 620)` + long `holdMs`, then
   the narrator's *"There is nothing there."*, then `wait`.
2. **`changeScene` hidden inside the blackness.** Engine scenes 3 (Act I void) and 4
   (Act II void) are the SAME map geometry; the Act I config renders Eric's island in
   near-black fills, the Act II config renders it lit. The transition fires while the
   camera is aimed at pure black and the Act II player spawn is the same dark point
   (1200, 620) the camera was holding — both frames are identical black, so the cut is
   imperceptible. The pan the player then experiences is real and continuous.
3. `stopAllAudio` with `fadeMs: 0` — the prose demands a cut, not a fade ("the way a
   fridge you never consciously heard goes off").
4. The handoff: `dialogue` speaker `narrator` ("For the other record—") immediately
   followed by `dialogue` speaker **`narrator_eric`** ("—there is no other record. /
   There's mine."). `narrator_eric` is a NEW entry in `EXTRA_SPEAKERS` (types.ts):
   `{ id: 'narrator_eric', name: 'Eric', emoji: '💬', color: '#c8e89a' }` — **the same
   emoji and color as `narrator`**. Same voice, new name: the ceremony is the label and
   nothing else, exactly as the prose orders. Every narration beat from here to the
   coda uses `narrator_eric`.
5. The reveal pan: `cameraPan(1200, 1150, 3800)` — straight DOWN into the dark the Act
   I camera crossed but never descended into, landing on coordinates that have been in
   the map (both scene configs) since first load.
6. `walkTo(1200, 1180, markerLabel: 'Sit down.')` — the player crosses the void into
   the lit room on foot. Then M3 fires.

**Why it's honest:** the island's rects exist at identical coordinates in the Act I
scene config (dark fills) — anyone who opens the chapter file, or noclips, finds the
room was always there. The camera-bounds ban is untouched; the player is confined by
invisible perimeter walls per house rules.

---

## M3 — Scene 5: THE FIRST WIRING (verb: wiring two people together) — THE ARCHETYPE

**The prose passage it implements:** *"Two fields. That is the entire interface. A
field for the first number. A field for the second number. Under them, one gray button.
/ Sit down. … This is the part you do. Not watch — do. Take your time. The chapter will
wait. It's been waiting two years." … "Wait. / Keep waiting. The scene will not skip
this. He waited blind every single time, and tonight, so do you."*

**BUILD CLASSIFICATION: (b) the new mode.** `{ type: 'minigame', modeId: 'doubleCall',
config: { variant: 'founding', wire: { field1Label: 'NICK F', field2Label: 'JACOB',
typing: 'full', blindWaitMs: 8000, ringPanMs: 5200 }, typedReply: [{ kind: 'auto',
text: 'what did he want' }], leftPhone, rightPhone }, background: false }`. No
`introLines` (the narration before it is beats; the mode opens on the interface, dry).

**The loop, in order (nothing skippable):**
1. The site frame rises: two empty fields, one gray button, a contact card reading
   NICK F beside field 1. No title bar, no URL — the tool is never named (bible rule).
2. **Type the first number.** Type-along: every keypress emits the next digit of a
   fake number. The player's hands do the thing; the game supplies the digits (nobody
   should type a real phone number, and the player must not be able to fail).
3. Field 2, contact card JACOB ("a contact so old it has survived three phones" — one
   staging line via `onStoryDialogue`). Same type-along.
4. **The button.** ENTER (or click). *"Nothing happens in this room."* — one full
   second of nothing, enforced.
5. The mode pans the camera the length of the void — left island: Nick F's phone
   pulses, `sfx_phone_ring`; right island: Jacob's phone pulses, same instant — then
   back to the desk. The two rooms play their argument INAUDIBLY (no dialogue beats
   fire; the player watches mouths they already know the lines to — the prose is
   explicit that none of it reaches this room).
6. **The blind wait.** `blindWaitMs` of nothing at the desk. No progress bar, no
   prompt. This is the first named protected silence of Act II; the mode ignores all
   input.
7. `sfx_phone_buzz`. The phone panel lights: **NICK F: bro why did jacob call me** —
   character-identical to its Scene 3 render.
8. `typedReply` kind `'auto'`: era-Eric types **what did he want** himself, animated,
   ~90ms/char. The player only wired tonight; the typing becomes theirs in Scene 6 —
   that M3→M4 escalation is contractual (Scene 5 subtext notes).
9. `onComplete({ outcome: 'win', data: { variant: 'founding' } })`. The motive
   narration ("I thought I could milk a lot more content out of Jacob…", "I saw so much
   potential in this.") plays AFTER the mode, as beats.

**Win/lose:** win only. There is no way to fail to place a call that only ever needed
two fields and a button — *"A child could have caught it"* (Scene 7) requires the
interface to be trivially, insultingly easy. The ease is the finding.

**The emotional argument.** The chapter's biggest moment is one person alone in a room,
and the engine's biggest tool would be a cutscene. Refusing the cutscene is the design:
the player's hands perform the founding act, in silence, and then wait blind exactly as
long as the operator did, so that when the text they laughed at twenty minutes ago
arrives as a delivery receipt, it is confirming THEIR delivery.

**Audio rule (absolute):** no music anywhere in the scene; the only sounds are the
diegetic ring, buzz, and optional key clacks. Any sting kills the reveal (subtext note:
"THE DRY IS ABSOLUTE").

---

## M4 — Scene 6: THE RE-RUN (verb: same wiring, modified rules)

**The prose passages it implements:** *"Type the numbers. Press the button. Again. …
by the second one it stops framing your hands; by the third it stops holding on the
rings. … That speed is not a design shortcut. That speed is the finding."* — and —
*"And then the other thing on the line. The main thing. … Nothing. / Hold it. / Keep
holding."* — and — *"The reply field opens. / This part is yours. The chapter will not
send it for you, and it will not move on until you do."*

**BUILD CLASSIFICATION: (b) the same mode, three beats, config deltas only.** This is
the repetition-with-variation contract executed as literal config reuse:

```typescript
// Beat A — the routine (the un-framed repeats)
{ type: 'minigame', modeId: 'doubleCall', config: { variant: 'rerun', run: 'routine',
  wire: { field1Label: 'NICK F', field2Label: 'JACOB', typing: 'full' } } }
// …dialogue beats (the nine-days / "jacob's been quiet" / weather narration)…

// Beat B — the voicemail night (the player causes the dead air)
{ type: 'minigame', modeId: 'doubleCall', config: { variant: 'rerun', run: 'voicemail',
  wire: { typing: 'autofill', deadAirHoldMs: 6000 },
  ring: { left: true, right: true, darkenIsland: { /* Jacob's island rect */ } } } }
// …the Oct 10 verbatim texts, character-identical, as dialogue beats…

// Beat C — the Ben night (the player types the cover-up)
{ type: 'minigame', modeId: 'doubleCall', config: { variant: 'rerun', run: 'ben',
  wire: { field1Label: 'JACOB', field2Label: 'BEN', typing: 'oneKey' },
  typedReply: [ { kind: 'exact', text: 'why' }, { kind: 'chip', text: '💀' } ] } }
```

**The loop / how each run modifies the rules:**
- **routine:** full type-along once; the mode then repeats the wiring twice more with
  `autofill` then `oneKey` pacing inside the same beat, each faster, camera not moving
  — the de-framing of the hands is done BY the mode, on schedule.
- **voicemail:** the wiring is quick; then the mode does the one thing Act I couldn't —
  puts the camera in the middle of the void, *inside the call*: ring (right island now
  dark under the `darkenIsland` overlay), **"Hi, you've reached Jacob—"** (dialogue
  beat is NOT re-rendered in full — Scene 3 owns the single full render; the mode plays
  the ring `sfx` and the beat stream supplies the truncated line), then
  `deadAirHoldMs` of NOTHING. No input accepted; no narration overlaps the hold
  (subtext: "the player must be given long enough to want it to end. That wanting is
  the complicity."). Then the Oct 10 texts land, same order, same spelling.
- **ben:** field 2 reads BEN. Press. *"Nothing happens in this room. Remember?"* Then
  **NICK F: Bro Ben just called me** — and the reply field opens and the mode BLOCKS.
  The player must type `why` (three real keys, lowercase) and send, then send the 💀
  chip. The chapter does not move until both are sent. (Batch 3 open call #3 offered a
  gentler pre-filled-draft variant; **default per prose = forced typing**. If Eric
  softens it, the change is `typedReply[0].kind: 'exact' → 'chip'` — one word.)
  Then Nick F's two verbatim texts fall (dialogue beats), and the mode completes.

**Win/lose:** win only, all three. You cannot fail to do what was, at every step, easy
— *"That's the part I'd apologize for first … not that it was cruel. That it was
easy."* The mode's job is to make sure the player's hands learn exactly how little it
felt like.

**The emotional argument.** Scene 5 made the player wire; Scene 6 makes the meaning
arrive through the hands three more times with the rules shifting under them: speed
(the routine), silence (they cause the dead air the group graded as genius), and
finally authorship of the cover-up itself (they type the skull at the man who guessed
right). Every text on screen is character-identical to Act I; only the seat changed.

---

## M5 — Scene 10: THE UN-PLACED CALL (verb: not doing it)

**The prose passage it implements:** *"The button is right there. / Press it, if you
want. The chapter won't stop you. / (If you press it: black. One line, no voice, no
name in front of it — **That's not how it happened.** — and the chair again, and the
fields, and the ghosts.) … Stand up. / That's it. That's the whole mechanic. The chair
pushing back. Two steps away from the desk. … Walk away from a machine that still
works."*

**BUILD CLASSIFICATION: (b) same mode, `unsent` variant.**
`{ type: 'minigame', modeId: 'doubleCall', config: { variant: 'unsent', wire: {
field1Label: 'NICK F', field2Label: 'JACOB', typing: 'autofill' }, unsent: {
minStillMs: 1500, rewindLine: "That's not how it happened.", walkAwayHoldMs: 500,
closeSfx: 'sfx_laptop_close' } }, background: false }`. No `loseGoto` — there is no
lose.

**The loop:**
1. The site frame rises one last time. Autofill has already ghosted both numbers ("the
   machine remembering your habits and handing them back as a favor"). The button is
   live. **No prompt of any kind renders. No timer. Nothing pulses.** The mode simply
   waits, past `minStillMs`, indefinitely.
2. **If the player presses** (ENTER/SPACE/click): full-screen black rect (constructed
   `fillAlpha: 1`, alpha 0→1 over 250ms), the unattributed line via `ctx.label()` —
   white, small, centered, no speaker tag, no sting — held ~2200ms, then the black
   lifts and the chair, the fields, and the ghosts are exactly as they were. Counted
   in `data.pressedCount`, never punished, repeatable forever. This is the
   MAGNUM_OPUS rewind, not a fail state: the memory refuses the input the way the
   record refuses it.
3. **The only input the era accepts:** hold any movement key `walkAwayHoldMs`. The mode
   tweens `ctx.player` two steps back from the desk (blocking modes freeze physics
   movement — the sprite is tweened, the WASD press is read from the window listener;
   the player's fingers still perform *walking*), the site frame closes with
   `closeSfx` — **the laptop click, the era's last diegetic sound; nothing may sound
   after it until the coda's buzz** — and the mode resolves
   `{ outcome: 'win', data: { pressedCount } }`.

**Win/lose:** win only, and the win is refusal. Do NOT soften the rewind into a
dialogue refusal, a confirm modal, or a choice beat — availability of a menu would
imply Eric weighed one (Scene 10 subtext note, protected).

**The emotional argument.** M3 taught the hands the ritual; M4 made it reflex; M5
weaponizes the reflex — the interface the player has operated three times sits there
autofilled, and every habit the chapter installed says press. The design accepts
nothing but standing up, because that is the only thing that happened. And the closing
narration then refuses the player their redemption read ("walking away from a machine
you built, after it works, isn't stopping. It's shipping.") — the mechanic must not
feel noble, only quiet.

---

## M6 — Scene 11: THE REPLY (verb: answering)

**The prose passage it implements:** *"**JACOB: who tryna go to mcdonalds tn?** …
The reply field is open. / This is yours. Last one. / Type it. Three letters,
lowercase. / **ERIC: omw**"*

**BUILD CLASSIFICATION: (b) same mode, `reply` variant.**
`{ type: 'minigame', modeId: 'doubleCall', config: { variant: 'reply', reply: {
threadHeader: 'Sub Zero Squad', incoming: { sender: 'JACOB', text: 'who tryna go to
mcdonalds tn?' }, reply: { kind: 'exact', text: 'omw' }, codaExit: { doorPoint: {x,y
from L0 map}, finalHoldMs: 4000 } } }, background: false }`.

**The loop:** the buzz has already fired (a single `sfx` beat — the coda's one
protected sound). The phone turns over: thread header **Sub Zero Squad**, one incoming
line, sender JACOB. The reply field opens. The player types `o`, `m`, `w` — the same
typed-reply grammar as Scene 6's `why`; the rhyme (first typed word covered the crime,
last one answers the summons) is real and NEVER captioned. ENTER sends. **Nothing
lands after it** — no read receipt, no second text, no reaction. The mode then owns
the exit (see `codaExit` in §0.1): phone UI shrinks to a small desk-glow decal, the
player sprite walks to the door and out, the empty room + lit phone hold
`finalHoldMs`, camera fades to black inside the mode, `onComplete(win)` — and the next
beat is `endChapter` with the `quietEnd` flag (**no `victory_jingle`, no flash, no
victory animation — engine change specced in 09**, standing chapter rule: the game
never tells you that you won, because you didn't).

**Win/lose:** win only. Three keys. It cannot be failed and it cannot be skipped.

**The emotional argument.** The chapter asks "You were made. Does it matter?" and then
refuses to answer it — the only answer the record supports is that the group keeps
existing at Eric, so the player's last act is the record's own recurring ritual: one
small lowercase yes, typed by the same hands that typed the skull. It is one degree
above cold and it must stay that size: the silence before it (a 25-second `wait` stack
the player can wander through) has to win.

---

## M-SLOT SUMMARY TABLE

| Slot | Scene | Verb | Build | Engine surface |
|---|---|---|---|---|
| M1 | 1 | performing upward | (a) beats | `walkTo` + single-option `choice` + `cameraPan` + staging line/`sfx` |
| M2 | 3 | building the fake Jacob | (a) beats (+`ringOnly` bg) | `choice` ×3, all-wrong options, converge |
| reveal | 5 | re-attribution | (a) beats + data | hidden `changeScene` in blackness + `cameraPan` down + `narrator_eric` speaker |
| M3 | 5 | wiring two people | **(b) new mode** | `doubleCall` `variant:'founding'` |
| M4 | 6 | same wiring, new rules | (b) same mode ×3 beats | `variant:'rerun'`, `run: routine/voicemail/ben`, typed `why`+💀 |
| M5 | 10 | not doing it | (b) same mode | `variant:'unsent'`, internal rewind, walk-away input |
| M6 | 11 | answering | (b) same mode | `variant:'reply'`, typed `omw`, mode-owned exit |
| — | 3/4 | the planted evidence | (b) same mode, background | `variant:'ringOnly'`, `background: true` |
| — | 9 | the rename | (b) same mode | `variant:'capital'`, post-rename hold ≥8s |
| — | 0 | the deleted draft | (b) same mode (optional) | `variant:'reply'` with `draft` only; fallback = staging dialogue |

One new mode. Everything else is the existing beat grammar. No bossFight. No
`victory_jingle`. No `ledger` beats anywhere in this chapter — the money gag is a
different chapter's laugh and it would cost this one its silence.

---

## FUN AUDIT (Eric's directive: "this has to be fun to play") — binding on the build

The design law ("never a fun game bolted on") protects against tonal betrayal, NOT
against tedium. Both must hold. The honest risk in the specs above: too much passive
watching/waiting/single-option walking. The fix is not to add arcade minigames — it's to
lean into the ONE fantasy this material already contains that is inherently fun:
**you are a prank operator getting away with it.** Operating the double-call is gleeful
the way a heist is gleeful. Make Act I and Scene 5 genuinely, mischievously FUN so the
turn has something to ruin. **The fun is the trap. A tedious chapter can't spring it.**

Binding adjustments (the cheap agent implements these; they override any "keep it spare"
reading that produces dead air the player merely endures rather than feels):

1. **The wiring interface must be JUICY, not a form.** M3/M4: satisfying key-clacks per
   digit, the two contact cards snapping in, a good chunky "connect" thunk on the button,
   the two phones lighting across the void with a rewarding sync. Operating it should feel
   like flipping the switch on a Rube Goldberg machine you built. Diegetic-clean, but
   tactile. (Phase 8: `sfx_key_clack`, `sfx_connect_thunk`, ring/buzz are not optional
   polish here — they ARE the fun.)

2. **The group chat is the reward feed — make it POP.** In Act I / Scene 3, after you
   wire a call, the GC blowing up ("bro why did jacob call me") should land like a slot
   machine paying out — quick, staggered message-in sfx, the guys riffing. The player
   should feel the mischievous dopamine of "it worked, watch them lose it." This is the
   engine of Act I fun and the source of the later horror (you enjoyed this).

3. **Fix the three tedium-risk spots specifically:**
   - **M1 scoreboard (Scene 1):** upgrade from single-option "check the scoreboard" to a
     light *read-the-room* beat — the player picks WHICH bid to make (2–3 options), then
     sees Maharko's face score it (exhale = hit, nothing = whiff). Outcome never changes
     the story (ruling 1 holds — all roads converge), but the player is playing the
     audition, not watching it. Getting a "hit" off Maharko should feel good — that's the
     point; you're meant to enjoy climbing before you learn what the ladder is.
   - **M3 the 8-second blind wait (Scene 5):** this is the single biggest fun risk. KEEP
     the blind wait — it's thematically load-bearing — but it must be *charged*, not
     empty. Fill it with mounting anticipation, not a blank screen: the cursor blinking,
     a faint held tone, the sense of a fuse burning. The player should be leaning in
     ("did it work??"), which is tension, not boredom. If 8s tests as too long in
     playtest, tune DOWN to the shortest duration that still reads as "he waited blind"
     (5s floor) — playtest-for-feel (Phase 9) owns the final number. Tedium here is a
     bug, not fidelity.
   - **M4 the re-runs (Scene 6):** the escalating auto-speed (full → autofill → oneKey)
     is good — it should feel like the machine getting *slicker under your hands*, a
     mastery curve. Make that speed-up feel earned and a little thrilling before it
     curdles. The voicemail dead-air hold stays (it's the flinch), but everything around
     it should have momentum so the silence hits a moving target.

4. **Momentum between beats.** Keep walking segments SHORT (the maps in `08_maps.md`
   should place interaction points close; long treks across empty rooms are the classic
   art-game tedium tax). When in doubt, cut a walk, keep a mechanic.

5. **What "fun" means here (so nobody optimizes the soul out of it):** engaging,
   tactile, mischievous, satisfying to operate — the fun of a good prank and a clever
   machine. NOT: score-chasing, twitch challenge, or a bolted-on arcade game. The back
   half (Scenes 7–11) is allowed to stop being fun; by then the fun has done its job.
   The Larry-David/Office comedy carries the laughs; the operator-mechanic carries the
   play. Front-loaded, exactly like the pacing map.

**Playtest gate (Phase 9):** the cold-read test already checks meaning. ADD a fun test —
someone plays Act I and Scene 5 and reports whether operating the double-call felt
*gleeful*. If it felt like homework, the trap won't spring and the chapter fails on its
own terms. Tune until Act I is a blast.

---

## ASSUMPTIONS MADE HERE (veto points for Eric)

1. **Type-along, not free typing** for phone numbers (M3/M4): any key emits the next
   correct character. Free typing risks failure states the scene forbids; the exception
   is `why` / `omw`, which are short enough to demand the real keys.
2. **The 💀 is a chip, not typed** (no sane keyboard path to an emoji): one ENTER/click
   on the rendered skull. The prose's "Now the other one." supports a single tap.
3. **Scene 6 is three `minigame` beats, not one**, so narration stays in `beats[]` and
   the cheap agent never scripts dialogue inside the mode beyond the few in-interaction
   lines passed via config.
4. **`narrator_eric` keeps the narrator's bubble color/emoji** — "same voice, new
   name" implemented literally. Alternative (Eric's hero color) would make the handoff
   louder than the prose orders.
5. **M5 rewind is internal to the mode** (black + line + restore), not a `loseGoto`
   rewind — no beat re-entry, no way to leave the scene in a half-state.
6. **Scene 0's typed-and-deleted message uses the `reply` variant with `draft`
   config** (recommended — PhonePanel exists anyway); acceptable fallback is pure
   staging dialogue if Eric wants Scene 0 mode-free.

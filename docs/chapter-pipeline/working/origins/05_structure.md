# Origins — Phase 3: STRUCTURE (Eric's rulings of 2026-07-06 locked)

## RULINGS LOCKED (override anything below that conflicts)
1. **Player identity does not change the story.** "Whoever they play, it shouldn't
   change the story." ⇒ The chapter runs one fixed narrative for everyone. Implement via
   `protagonistOverride: 'eric'` for a single authored spine (the "you are in Eric's
   hands" thesis), but do NOT gate any branch/dialogue on who's playing — no
   player-identity mechanic. The story is invariant; only the authorship is the point.
2. **Reveal lands at ~40% (end of Act I).** Confirmed — live under the knowledge.
3. **VOICE: keep the polished present-day game voice** (chapter0 flashback convention
   UPHELD). Era scenes do NOT use lowercase/archive voice. ⚠️ This overrides §7's voice
   convention and Pass 3's recommendation — DELETE the archive-voice plan. Verbatim
   archive lines may still be quoted where canon (e.g. "why is Jacob at McDonald's at
   2am"), but rendered in normal game-dialogue style, not raw-text styling. The
   confession is carried by STAGING and the narrator handoff, not by a voice-gap.
4. **Ending: keep as drafted** — cold silence → Sub Zero Squad lights up → Jacob texts
   "who tryna go to mcdonalds tn?" → player replies "omw." Blessed.

---

# (original draft follows)

# Origins — Phase 3: STRUCTURE (draft for Eric's approval)

Process: `../../MAGNUM_OPUS.md` Phase 3. Inputs: `01_story_bible.md` (facts),
`02_primary_sources.md` (verbatim), `03_interiors_and_voices.md` (era voices),
`04_meaning.md` (FINAL thesis — authorship over machine; cold ending with pilot light).
Engine envelope: `types.ts` beat grammar — `scenes[]` + `changeScene`, `cameraPan`,
`stopAllAudio`, `wait`, `screenTint`, `changeMusic`, `protagonistOverride`, minigame
slots. Everything below invents STAGING only; every fact cites the bible or sources.

---

## 1. THE SHAPE — the same era told twice, hinged on one phone

The bible forces the shape; no template survives contact with these three facts:

1. **The audience is the group.** They lived the era once already — from the wrong
   side. Ten shipped chapters have trained them to read every chapter as shared memory.
   So the chapter can DO to the players what Eric did to the group: run the era in
   their native register first, then reveal it was staged. The form re-enacts the crime.
2. **The double-call is a ritual that recurs** (~weekly, summer 2024 → Feb 2025), and
   the archive preserves distinct occurrences that each mean something different
   (founding text → voicemail phantom → Ben's blast radius → call-log argument →
   wind-down). Repetition-with-variation isn't a device we impose; it's the historical
   record. The ritual is the chapter's spine and its escalation ladder.
3. **Eric authored it alone and blind** (never heard a call; all feedback via GC). Per
   the Phase 2 camera rule, the biggest moments frame Eric-alone. The natural pivot is
   a **perspective inversion**: the exact moment the chapter stops being the group's
   memory and becomes Eric's confession.

**Therefore: not a frame narrative with flashback wrapper — a HINGED CHAPTER.**
Act I plays the era as the group remembers it (a normal-feeling Omega chapter, comedy
forward). At the hinge, the teller steps out from behind the narrator, and Acts II–III
replay and continue the SAME era from the operator's room — same ritual, same lines,
new meaning. A thin present-day frame (60-second cold open, 60-second coda) holds the
confession context and the pilot-light ending. The double-call recurs five times across
the chapter; its meaning walks the ladder: **joke → myth → collateral → authorship →
abandonment.**

## 2. WHERE THE REVEAL SITS

**Placement: end of Act I, ~40% through the chapter** (Scene 5 of 11). Reasoning: the
reveal is not the climax — it's the FLOOR the real chapter stands on. The masterpiece
material (complicity, the call-log argument, Dogwood, the wind-down) only works on a
player who already knows. Spending 60% of the runtime *under* the knowledge beats
spending it *before* the knowledge. The shipped-chapter instinct (reveal as finale)
would waste everything the bible has.

**What the player experiences before understanding it (Act I):** a chapter that looks
exactly like every other chapter. The Group Chat narrates. The McDonald's night plays
as remembered comedy. "Jacob keeps calling Nick F" plays as the group experienced it —
weird, funny, a bit. **Planted evidence, visible but illegible:** in the Act I call
scenes, staged as two lit bedroom-islands in a void (Nick F's room / Jacob's room,
cameraPan between them), BOTH phones visibly ring with incoming calls. The player reads
past it — a ringing phone on the caller's side parses as "calling." The proof is on
screen the whole time and disbelieved, exactly like Jacob's call logs. On replay (and
this chapter will be replayed), Act I is unbearable.

**The exact snap (Scene 5):** mid-beat, at the top of what should be the next narrator
time-cut. `stopAllAudio`. The Group Chat starts a line — and Eric's speaker takes over
mid-thought: the narrator of this chapter has been Eric the whole time. Then
`changeScene` to a third lit island the void has been hiding all along: **Eric's
bedroom, between the other two.** The first double call replays from inside it. The
founding text arrives on his screen: **"bro why did jacob call me"** — and the player,
who laughed at that line twenty minutes ago, is now the person it confirms receipt to.
The frame snaps not on new information but on re-attribution: *you already saw all of
this. You just believed the wrong caller.* — which is the thesis, made structural.

## 3. ORDERED SCENE LIST (emotional ladder — temperature must climb)

Temperatures are emotional load (1 = light, 10 = maximum), not difficulty.
`[M#]` = mechanic slot (see §6). Engine locations in §4.

### PRESENT FRAME — cold open
**Scene 0 — "The Last Save Slot."** *Eric's room, present day. Eric alone.*
Job: signal in 60 seconds that this chapter is not an adventure — it is addressed to
you. Minimal: desk, laptop light, one or two lines in canonical (present-day) Eric
voice that curdle the admin diction into something plainer. No joke lands fully.
Draws on: the secret held two years; "the artifact is the ending" (bible).
Temp: 2, but wrong — quiet in a way no chapter has opened.

### ACT I — THE STORY AS THE GROUP TELLS IT (Office register, comedy forward)
**Scene 1 — "Two Ladders, One McDonald's."** *McDonald's interior, 3am, summer 2024.
Nick F, Nick H, Maharko inside; Jacob + Chris walk in.* [M1]
Job: the founding cruelty, funny the way it was funny AND legible as cruelty — the
audition performed upward (Nicks punching down to impress Maharko; Jacob distancing
from Chris one rung further down). Staged as a REENACTMENT: the Nicks' trophy telling,
performed for Eric — the player walks a night Eric never attended, because that's how
Eric owns it. Draws on: bible Pass 1 status geometry; tone-canon (no verbatim survives);
Chris's fade begins here and is allowed to be visible as a fade (ethics: Chris gets
presence, not a punchline). Temp: 3 — laughter with a wire in it.

**Scene 2 — "The Trophy."** *Night street / car, a few weeks later. Nick F, Nick H,
Eric.*
Job: hand Eric the material; let the player hear the joke indict its tellers — "why is
Jacob at McDonald's at 2am, what a loser," told by two men who were also at McDonald's
at 2am. The player should notice before anyone on screen does (bible flags this
exactly). Ends on Eric going quiet in a way Act I can't explain yet — the camera holds
him one beat too long (camera rule, first firing). Draws on: the telling; Eric's
motive line stays UNSAID here (it belongs to the hinge). Temp: 4.

**Scene 3 — "The Bit That Runs Itself."** *Two-island void: Nick F's room / Jacob's
room. GC overlay.* [M2]
Job: the ritual as the group knew it — recurrences 1 and 2. "bro why did jacob call me"
lands as comedy; the Oct 10 voicemail phantom plays ("He just called me and had a voice
script—" / "at least he was creative" / "but how do you not have anything better to
do") and the group builds a fake Jacob out of dead air. BOTH phones ring incoming;
nobody on screen or holding the controller reads it. Draws on: sources Oct 6/Oct 10
verbatim; bible voicemail-trap mechanic. Temp: 5 — funniest stretch of the chapter,
increasingly itchy.

**Scene 4 — "The Wrong Man Confesses For You."** *Same two-island void; Ben's number
on screen.*
Job: recurrence 3 — the blast radius. Ben calls Nick F: Jacob is spamming him and he
thinks the group is behind it. **He is right**, and the truth bounces off contempt:
"Bro Jacob is a LOSER." Eric types "why" "💀" in the GC overlay. First crack the
player can feel: someone said the true thing and it did not matter. Draws on: Oct 6
verbatim, confirmed real-time dumb-play. Temp: 6.
**— ACT BREAK (the hinge is sprung, not marked) —**

### ACT II — THE SNAP AND THE RE-RUN (Succession register takes the wheel)
**Scene 5 — "The Third Island."** *THE REVEAL. Eric's bedroom, summer 2024 — a third
lit island between the two the player already knows.* [M3 — the archetype slot]
Job: authorship. `stopAllAudio`; Eric displaces the narrator mid-line; the void pans
to the room that was always there. The player, as Eric, places the first double call —
two numbers, both ring, neither dialed — and waits, blind, until the founding text
arrives: "bro why did jacob call me." The chapter's biggest moment is one person alone
in a room, amused ("I saw so much potential in this" — on-record motive, said plainly,
no admin varnish, because the admin doesn't exist yet). Draws on: bible Pass 2 scene 1
(two-screen staging, feedback only via GC); hammer-before-nail. Temp: 8 — vertigo.

**Scene 6 — "Dead Air, With Applause."** *Three-island void; ritual re-run with
knowledge.* [M4 — M3 repeated, rules modified]
Job: complicity. Recurrences replay from the operator's side: the voicemail trap
(the player hears what Nick F can't — nothing; an empty line — while the GC credits
Jacob with "creativity"), and Ben's accusation re-seen as Eric lived it: watching the
wrong man take the fall in real time and typing "💀". Same lines as Act I, verbatim,
unbearable now. Draws on: Oct 6/Oct 10 corrected mechanic; "the group invented Jacob's
ingenuity out of a technical artifact." Temp: 8.5 — the laugh and the flinch, same beat.

**Scene 7 — "The Call Logs."** *A real hangout, mid-era, night. The group + Jacob;
player-Eric present.*
Job: the wound, named: Jacob wasn't fooled — he was disbelieved. He argues (heated,
"in a joking way — or at least that's how WE saw it"); he offers the call logs; the
room brushes him aside before evidence enters it; the one person who knows stands there
and says nothing. The trick was protected by contempt, not cleverness — and the player
holds the silence. Draws on: bible call-log argument (corrected: proof offered, never
looked at); Pass 3 answer 1 (protest received as bit). Temp: 9.
**— ACT BREAK —**

### ACT III — THE MACHINE OUTLIVES ITS OPERATOR (Ferrante register closes)
**Scene 8 — "First Time For Everybody."** *Dogwood Park lookout, night → drive to
McDonald's. The group + Jacob; Maharko long-distance.*
Job: warmth and cruelty as one current, on screen at once. Jacob drives HIMSELF to his
own hazing; takes his first-ever hit; Eric — first face-to-face of the era with the
man he's been operating remotely — "just pretended like this was my first time too":
camouflage and kindness in one unresolvable image (the bible's ambiguity, preserved,
not adjudicated). Maharko's verdict lands from Florida ("no way you guys are acc
hanging out with jacob he is such a loser") and Nick F's hedge ("i don't think he's a
loser, but he's def not a winner") shows the machine grading its own output. Draws on:
bible Dogwood scene; Maharko exile facts; verbatim gold. Temp: 9, but warm — the ache.

**Scene 9 — "The Capital."** *GC space / void — the quarantine chat.*
Job: the moment of no return, per Phase 2: the chat they built to CONTAIN Jacob becomes
Sub Zero Squad — the room the whole syndicate lives in today. Short scene, mostly
staging and one held silence; the players recognize their own home chat forming and
feel the floor move under the present, not the past. Draws on: bible Sub Zero Squad
record. Temp: 9.5 — quietest big moment in the chapter.

**Scene 10 — "Self-Sustaining."** *Eric's bedroom island, Feb 2025.* [M5]
Job: abandonment — the ladder's last rung. The Feb 4 bit plays ("WHO TREKS TO
MCDONALDS AT 3 AM" / "IS IT THE BIG L?") with Eric running the cruelty warmly,
on-record, no machine required — then the operator looks at the tool and doesn't place
the call. "It had become a self-sustaining system." The calls stop; nobody notices;
the not-noticing is the proof nobody ever understood. Camera rule fires hardest here:
Eric alone, closing a laptop. Draws on: wind-down record; Feb 4 verbatim. Temp: 9 —
dread gone still.

### PRESENT FRAME — coda
**Scene 11 — "Does It Matter."** *Eric's room, present day. Then everyone's.* [M6]
Job: the question, the silence, the pilot light. Spec in §7. Temp: cold, then one
degree above cold.

**Scene count: 12 (0–11). Acts: cold open + I (4) + II (3) + III (3) + coda.**

## 4. ENGINE LOCATIONS (scenes[] economy — Phase 6 finalizes)

Six maps serve twelve story-scenes:
- **L0 Eric's room, present day** (Scenes 0, 11) — `apartment` theme.
- **L1 McDonald's interior, 3am** (Scene 1) — no shipped theme; likely `suburb_night`
  + heavy rects/backdrop art, `noNatureScatter`. Phase 6 decision; flag for
  `Atmosphere.ts` risk per root CLAUDE.md.
- **L2 The void of islands** (Scenes 3, 4, 5, 6, 9, 10) — ONE map, black backdrop, two
  lit bedroom islands; **Eric's island exists in the map from the first visit but sits
  outside every Act I cameraPan path** — the reveal is a pan to coordinates that were
  always there (bible's split-location simultaneity note, MAGNUM_OPUS Phase 6). This is
  the chapter's signature set and the reveal's physical mechanism.
- **L3 Night street/car** (Scene 2) — `highway_night` or `suburb_night`.
- **L4 Dogwood lookout** (Scene 8) — `park` theme, night.
- (Scene 9 reuses L2 or a minimal GC-space variant — Phase 6.)

## 5. PACING MAP

```
Temp 10|                                    ┌7┐        ┌9┐
      9|                              ┌6┐───┘ └──┌8┐───┘ └─┌10┐
      8|                        ┌5┐───┘          └─┘        └──┐
      7|                        │REVEAL                        │
      6|                  ┌4┐───┘                              │
      5|            ┌3┐───┘                                    │
      4|      ┌2┐───┘                                          │
      3|┌1┐───┘                                             ┌11┐ ← silence, then +1°
      2|┘0┐───┘                                             └──┘
       └────────────────────────────────────────────────────────
        cold  ACT I (comedy density high)  ACT II  ACT III  coda
```

- **Comedy density** front-loaded: Scenes 1–4 carry the chapter's laughs (Office
  register, verbatim archive humor). After the snap, jokes recur only as echoes of
  Act I lines — nothing new is funny in Acts II–III except Scene 8's warm-cruel bit
  and Scene 10's Feb 4 performance, both of which hurt.
- **Music map (Phase 8 executes):** stage music through Act I → `stopAllAudio` at the
  snap (Scene 5 opens in silence; the double-call plays dry) → sparse/low from Scene 6
  → out entirely from Scene 9 on. **No `victory_jingle` fires anywhere in this
  chapter.** Silence placements: the snap, Jacob's brushed-aside proof (Scene 7), the
  unplaced call (Scene 10), and the coda's long hold.
- **Wait-beat budget:** Scenes 7, 9, 10, 11 each carry at least one protected `wait` —
  the Phase 4 prose will mark them; the Phase 7 compression contract makes them
  uncuttable.

## 6. MECHANIC SLOTS (verbs only — Phase 5 designs; nothing here is a mechanic)

- **[M1] Scene 1 — verb: performing upward.** The audition: cruelty as a bid for
  Maharko's approval. Social verb: choosing a target to climb.
- **[M2] Scene 3 — verb: laughing along / building the fake Jacob.** The group-chat
  stage; the player participates in the myth so the snap convicts them too.
- **[M3] Scene 5 — verb: wiring two people together.** THE archetype slot
  (MAGNUM_OPUS Phase 5 names it): two numbers, both ring, wait blind for GC feedback.
  Must be an interaction, not a cutscene.
- **[M4] Scene 6 — verb: same wiring, modified rules** (repetition-with-variation
  requirement): the no-answer/voicemail variant — the player causes dead air and
  watches meaning get invented from it. The meaning shift must arrive through the hands.
- **[M5] Scene 10 — verb: not doing it.** The ritual offered one last time; walking
  away IS the input. (Losing states rewind, per MAGNUM_OPUS — "that's not how it
  happened.")
- **[M6] Scene 11 — verb: answering.** One small reply. See §7.
- **No bossFight anywhere.** The antagonist is the machine, and the player is its
  operator; a boss would name the wrong villain. (Chapter 11 already proved a no-boss
  chapter ships.)

## 7. FRAME DEVICE SPEC (how the confession is delivered)

- **`protagonistOverride: 'eric'`.** Whoever is playing — Nick F, Jacob, anyone — this
  chapter forces them into Eric's body. The engine constraint (one protagonist per
  chapter) becomes the thesis: *nobody gets to choose who they are in this one; nobody
  did.* Ruling 1 made mechanical.
- **The narrator handoff.** Act I is narrated by The Group Chat, standard register —
  the chapter impersonates a normal chapter. At the snap, Eric's speaker takes the
  narration mid-line and keeps it to the end: the teller steps on stage, and the group
  retroactively understands who has been telling them this story (and, implicitly, who
  built the artifact they're holding). Eric-as-author foregrounded per ruling 1.
- **Reenactment convention.** Scenes Eric didn't attend (1, 2 partially) are framed as
  the story AS TOLD TO HIM — Act I is honest about being secondhand, which pays off
  when Act II reveals what firsthand actually looked like: a man alone, reading texts.
- **Voice convention (needs ruling, §8):** era scenes in archive voice (lowercase,
  "bro", 💀, "Apperantly"); frame scenes (0, 11) and post-snap narration in canonical
  present-day voices. The audible gap is the confession: "we were not yet the people
  the game says we are."
- **Jacob's opacity is a formal rule.** The game never renders Jacob's interior —
  no thought bubbles, no narrator claims about his feelings, his protest always fully
  articulate and never received (ethics gate + Pass 3). The player feels the wall Eric
  felt. The chapter does not commit one more fiction about Jacob while confessing the
  others.

## 8. THE LAST 60 SECONDS (cold, with a pilot light)

Beat-level plan (Scene 11):

1. **The confession bottoms out.** Eric, present day, plain voice — no "simply," no
   eras, no service-framing. The last true thing said out loud, then nothing left to
   say. (Exact lines are Phase 4's problem; the shape is: he does not ask forgiveness
   and no one grants it.)
2. **The question.** Delivered once, plainly — Eric's line or a final narrator card:
   **"You were made. Does it matter?"** No answer offered.
3. **The silence.** `stopAllAudio` (if anything is still playing) → `screenTint` toward
   dark → `wait` beats held past comfortable — the room stays interactive but empty;
   the player can walk and there is nowhere to go. This is the earned-silence ending
   MAGNUM_OPUS demands, and it must be long enough to feel like the chapter ended here.
4. **The pilot light.** One `sfx` buzz. The phone lights: the group chat — *Sub Zero
   Squad, the origin artifact itself* — and one incoming line, the group's real
   recurring ritual: **"who tryna go to mcdonalds tn?"** Proposed sender: **Jacob**
   (staging invention, grounded in the inversion record: Jacob-as-instigator now —
   NYC bribe, "JACOB JUST CALLED NICK A BITCH"). The person Eric made is the one who
   summons him. The crime scene became the clubhouse.
5. **[M6] The answer that isn't the answer.** The player's last act is one small reply
   (Phase 5 designs it; candidate shape: typing "omw" — two lowercase letters and a
   walk out the door). No dialogue after. No jingle — ever. Fade on the empty room
   with the phone light on.

The warmth is one incoming text. The question is not answered; the group simply keeps
existing at Eric, which is the only answer the record supports.

---

## DECISIONS ERIC MUST RULE ON (sharpest five)

1. **`protagonistOverride: 'eric'` — everyone plays as Eric, all chapter.** The
   strongest authorship move available and it costs something real: Jacob plays his
   own manufacturing from inside the hand that did it. Approve, or let each player
   stay their own hero (weaker thesis, gentler experience)?
2. **The narrator handoff** — Eric displacing The Group Chat mid-line at the snap
   implies this chapter's narrator (and by echo, maybe every chapter's) was Eric all
   along. Ratify that implication, or keep the narrator neutral and reveal authorship
   by staging alone?
3. **Reveal at ~40% (end of Act I).** The chapter spends its longer half UNDER the
   knowledge — complicity over surprise. Alternative: reveal at ~60–70% for more
   comedy runway and a shorter, sharper reckoning. Which half of the chapter do you
   want to live in?
4. **The voice convention** (carried from Pass 3, now load-bearing): era scenes in
   archive voice, frame in canonical voice — breaking the chapter0 flashback
   convention. Break or keep? This ruling touches every line in Phase 4.
5. **The coda text** — sender = Jacob, line = "who tryna go to mcdonalds tn?", player
   replies "omw." Bless this exact staging (it is the entire pilot light), or specify
   the warmth beat you want instead. (Related, lower stakes: chapter slot — "Chapter
   Ω" after 11, or index 12 with kind: 'epilogue'? Phase 0 left it open.)

# Origins — BUILD HANDOFF (Phase 7 execution guide)

**Audience:** a competent coding agent who makes ZERO creative decisions. Every word,
silence, coordinate, and config below is decided. Where the source docs give exact
lines, transcribe them exactly (spelling included — "Apperantly" is canon). Where this
guide says ASSUMPTION, Eric can veto; build the stated default unless told otherwise.

**Source-of-truth order** (if anything conflicts): the four prose files in
`06_scenes/` → `07_mechanics.md` → `08_maps.md` → this file → `05_structure.md`.
The prose files' **SUBTEXT NOTES are contracts**, restated per scene below.

---

## 0. VERIFICATION STAMP (checked against live source, 2026-07-07)

Every engine claim below was confirmed against the actual code. Build with confidence:

- **`ChapterConfig` fields exist** (`types.ts`): `subtitle` (REQUIRED string), `kind`
  (`'chapter'|'interlude'|'epilogue'|'flashback'` — `'chapter'` valid), `protagonistOverride?`,
  `cameraZoom?`. `quietEnd` does NOT exist yet — §3's add is correct and necessary.
- **`MapTheme`** is a clean string-literal union (apartment/highway_night/hospital/park/
  florida/suburb_night/cabin/pool_party). Adding `'void'` is a one-line append; works.
- **`EXTRA_SPEAKERS`** `narrator` = `{id:'narrator', name:'The Group Chat', emoji:'💬',
  color:'#c8e89a'}`. The `narrator_eric` spec (same emoji+color) is exactly consistent. ✓
- **`ben` speaker exists** = "Ben Bersofsky" (emoji 🧪). `maharko` exists. `chris_rivas`
  is unknown → `resolveSpeaker` returns a generic 🗨️ bubble named by the id (renders
  fine, no crash) — matches the handoff. ✓
- **`runEndChapter()`** (`ChapterScene.ts` ~L1160): L1161 victory anim, L1162
  `flash(400,200,232,154)` (green), L1167 `victory_jingle`. §3's three-line guard is
  accurate — wrap exactly those.
- **Per-scene music:** `ChapterSceneConfig.music?` exists; `scenes[]` + `changeScene`
  confirmed. Runtime + test lookup is `CHAPTER_MUSIC_KEY[id] ?? scenes?.[0]?.music`.
  Because Origins' `scenes[0]` (cold open) is silent and music enters at `scenes[1]`,
  the music-coverage test (`src/data/chapters.test.ts` L84) WILL fail unless `'origins'`
  is in `INTENTIONALLY_SILENT` — §1 row 8 is correct and required. (NOTE the real test
  path is `src/data/chapters.test.ts`, not `src/data/chapters/chapters.test.ts`.)
- **`chaptersDoc.test.ts`** asserts `ch.title` appears in root `README.md` — §1 row 10
  required. **`modesDoc.test.ts`** exists (needs the CLAUDE.md mode row). `screenSpace.ts`
  and `_template/` exist. ✓

**One design item to eyeball (not a correctness bug):** §9 assumption #9 sets the 3am
McDonald's to `theme: 'hospital'`. Theme drives procedural decor, so hospital may draw
hospital-specific props over the diner. `08_maps.md` chose it for the sterile-tile look;
if it renders wrong in playtest, the fix is rects/backdrop over a neutral theme (or the
new `'void'` + hand-placed props) — flagged for the Phase 9 playtest, not a blocker.

Net: no gaps that would stall the build. Proceed.

---

## 1. WHAT IS BEING BUILT

One chapter + one mode + five small support edits:

| # | File | Change |
|---|---|---|
| 1 | `src/data/chapters/chapter12.origins.ts` | NEW — the chapter (id `'origins'`, `scenes[]` per `08_maps.md` §1, beats per §5 below) |
| 2 | `src/data/chapters/index.ts` | import + append `chapter12` to `CHAPTERS` (after `chapter11`) |
| 3 | `src/game/modes/doubleCall/` | NEW mode — full spec in `07_mechanics.md` §0 (copy `_template/`, implement variants) |
| 4 | `src/game/modes/index.ts` | `registerMode(doubleCallMode)` |
| 5 | `src/game/modes/CLAUDE.md` | add a `doubleCall` row to the mode table (**`modesDoc.test.ts` fails without it**) |
| 6 | `src/data/chapters/types.ts` | (a) add `'void'` to the `MapTheme` union; (b) add `{ id: 'narrator_eric', name: 'Eric', emoji: '💬', color: '#c8e89a' }` to `EXTRA_SPEAKERS` (same emoji+color as `narrator` — intentional, do not "fix") |
| 7 | `src/game/audio.ts` | add `music_origins` to `STAGE_MUSIC_URL` (track import per Phase 8; placeholder = reuse an existing url with a `// TODO(phase8)` until the track lands). **Do NOT add a `CHAPTER_MUSIC_KEY` entry** — music is per-scene only (scenes[1..3]) |
| 8 | `src/data/chapters.test.ts` | add `'origins'` to `INTENTIONALLY_SILENT` with comment: `// origins: cold open is scored by room tone; music enters per-scene at scenes[1]` |
| 9 | `src/game/ChapterScene.ts` + `types.ts` | the `quietEnd` change (§3 below) — **required**, the ending bans the victory jingle |
| 10 | `README.md` (root) | add the chapter title to the chapter table (**`chaptersDoc.test.ts` fails without it** — it checks `ch.title` appears in README) |

`battleiq/` is not touched. No `localStorage`. No changes to `settings.ts` (this
chapter persists nothing new).

## 2. CHAPTER SLOT (Phase 0 decision — proposed resolution)

**Proposal: index 12, appended after chapter 11.**

```typescript
const chapter12: ChapterConfig = {
  id: 'origins',
  index: 12,
  title: 'Rockville Syndicate: Origins',
  subtitle: 'The Twelfth Slot',
  location: 'Rockville, MD — summer 2024 → tonight',
  description:
    'The only story Eric never pitched. Two phones ring at the same time, all era, ' +
    'in frame, and everyone believes the wrong caller. Play it together.',
  kind: 'chapter',
  protagonistOverride: 'eric',
  // cameraZoom: default (2.0) — the 08_maps geometry assumes it
  quietEnd: true,                     // see §3
  scenes: [ /* 11 entries per 08_maps.md §1 */ ],
  map: /* copy of scenes[0].map */, actors: [],
  beats: [ /* §5 */ ],
};
```

- ASSUMPTION (flag to Eric): `kind: 'chapter'`, not `'epilogue'` — the chapter-select
  fiction (Scene 0's untitled twelfth tile) lives in the prose, not the menu. If Eric
  wants the menu itself to play along (empty title / 'Ω'), that is a one-line title
  change; ship the explicit title by default so the save UI stays usable.
- `protagonistOverride: 'eric'` is RULED (structure ruling 1). No dialogue, choice, or
  branch may test which hero was picked.

## 3. THE `quietEnd` ENGINE CHANGE (small, required)

`ChapterScene.runEndChapter()` (line ~1160) hard-plays `victory_' + class` anim, a
green `cameras.main.flash`, and `victory_jingle`. The Origins ending spec (structure
§8, scene 11 subtext) bans all three, forever, for this chapter.

- Add to `ChapterConfig` (types.ts): `/** Suppress the end-of-chapter victory
  celebration (jingle, flash, victory anim). The chapter fades out silently. */
  quietEnd?: boolean;`
- In `runEndChapter()`: wrap the victory-anim line, the flash line, and the
  `sound.play('victory_jingle', …)` line in `if (!this.chapter.quietEnd) { … }`. The
  stage-music fadeout, `fadeOut`, and `onLevelCompleted` path stay unconditional.
- Do not change any other chapter's behavior (flag defaults false/undefined).

## 4. VERBATIM LINES THAT MUST APPEAR (canon — transcribe, never paraphrase)

Texts render as `dialogue` beats from the named speaker, spelling/caps/lowercase exact:

1. `NICK F: bro why did jacob call me` (Scenes 3 AND 5 — character-identical both times)
2. `ERIC: what did he want` (Scene 3 beat; Scene 5 auto-typed in-mode)
3. `NICK F: He just called me and had a voice script to pretend i went to his voicemail`
4. `NICK H: at least he was creative`
5. `NICK H: but how do you not have anything better to do`
   (3–5 in exact order, Scenes 3 AND 6, identical renders)
6. `NICK F: Bro Ben just called me`
7. `ERIC: why` then `ERIC: 💀` (Scene 4 beats; Scene 6 typed by the player)
8. `NICK F: Apperantly Jacob is spamming him and he thinks were causing it` (spelling!)
9. `NICK F: Bro Jacob is a LOSER`
10. `MAHARKO: no way you guys are acc hanging out with jacob he is such a loser`
11. `NICK F: i don't think he's a loser, but he's def not a winner`
12. `ERIC: bro i was just taking a walk getting something for my girl and then GUESS WHO I SEE WALK TO THE FIVE GUYS`
13. `ERIC: WHO TREKS TO MCDONALDS AT 3 AM`
14. `NICK F: IS IT THE BIG L?`
15. Jacob's voicemail, ONCE in full (Scene 3 only): `"Hi, you've reached Jacob. I
    can't come to the phone right now. Leave a message and I'll call you back.
    Thanks."` — Scene 6 renders only `"Hi, you've reached Jacob—"` then cuts.
16. Eric's motive, plain, Scene 5: `"I thought I could milk a lot more content out of
    Jacob than just letting them meet him once."` and `"I saw so much potential in
    this."`
17. `"It had become a self-sustaining system."` (Scene 10)
18. `"You were made. / Does it matter?"` (Scene 11, spoken by `eric`, once, never
    answered)
19. Chat names: `electric vehicle squad` (Scene 9, exactly once) and `Sub Zero Squad`
    (Scene 9 header + Scene 11 header — rendered as headers, never spoken)
20. `JACOB: who tryna go to mcdonalds tn?` then `ERIC: omw` (Scene 11; omw typed by
    the player, nothing after it)

## 5. SCENE-BY-SCENE TRANSLATION TABLE

Beat lists are ordered and complete at the structural level; dialogue "…" means
transcribe the quoted lines from the named prose passage (file + scene given). Narrator
speaker ids: Act I = `narrator` ("The Group Chat"); from the Scene 5 handoff to the
Scene 11 question = `narrator_eric`; Scene 0 and post-question Scene 11 = NO narrator
at all. Staging italics from the prose become short `narrator`/`narrator_eric` lines
ONLY where marked "staging line" — otherwise they are camera/wait/sfx beats, not text.

---

### SCENE 0 — "The Last Save Slot" → scenes[0] (L0) — prose: `scene_00_and_01.md`

Beats:
1. `screenTint(0x000014, 0.35, 800)` · `wait 1800` (room tone; NO music — enforced by
   scene config)
2. `minigame doubleCall { variant:'reply', reply:{ draft:{ text:'I need to tell you
   guys something.', holdMs: 2500, deleteCharByChar: true } } }` — no thread header
   (do NOT render "Sub Zero Squad" here)
3. `dialogue eric`: "So. The summer Maharko left for Florida. What happened was, I
   simply—"
4. `wait 2400` ← PROTECTED (the pause after "I simply—")
5. `dialogue eric`: "You're going to laugh at the first part."
6. `wait 1000`
7. `dialogue eric`: "You should. It was funny. That was never the problem."
8. `sfx ui_select` (pressing enter on the slot) · `screenTint(0x000000, 1.0, 600)` ·
   `changeScene(1, 400)`

**COMPRESSION CONTRACT — Scene 0**
- NO music and NO narrator anywhere in this scene. The narrator's absence IS the cold
  open. First `narrator` line of the chapter is Scene 1 beat 1.
- The typed message is deleted one character at a time (mode behavior, not optional).
- He never says what the thing is; no beat may name the calls, the website, or Jacob.
- Line 7 is the LAST spoken line before the narrator arrives — nothing between it and
  the scene change but the click and the dark.

---

### SCENE 1 — "Two Ladders, One McDonald's" → scenes[1] (L1) — prose: `scene_00_and_01.md`

Music enters here (scenes[1].music = 'music_origins' — the needle drop is the chapter
impersonating a normal chapter). Beats, in prose order:
1. `dialogue narrator` ×2: the opening ("Summer 2024. Rockville Pike…" / "Tonight, the
   lobby is not empty.")
2. `walkTo(450, 480, markerLabel:'the lobby')` → `walkTo(330, 320, markerLabel:'the
   booth by the window')`
3. Booth intro: `dialogue narrator` (parking-lot deposition line); the V.O. frame:
   `dialogue nick_f` "Okay, so it's like two in the morning—" / `dialogue nick_h`
   "Three." / `dialogue nick_f` "—it's three in the morning…" (transcribe) ·
   `dialogue narrator` "You're getting this night the way everyone got this night:
   secondhand…"
4. Maharko Sprite bit (`maharko`, `nick_h`, `maharko`) — then **M1 glance #1**:
   `choice narrator prompt:'' options:[{ text:'[ Check the scoreboard. ]' }]` →
   `cameraPan(150, 185, 700, holdMs 900)` → `dialogue narrator`: "(a single
   nose-exhale.)" — then Nick F's ice line → **glance #2** (same shape) →
   `dialogue narrator`: "(nothing.)"
5. Headlights: `dialogue narrator` "Then: headlights." · `cameraPan(470, 660, 1200,
   holdMs 1400)` (the Camry, between the lines) · `sfx sfx_door_open` (the chime)
6. Jacob + Chris enter; Nick F maître-d' beat; the hover ("There is room in the
   booth… Nobody moves over." — staging line, `narrator`); Jacob's "Chris was hungry.
   I was up anyway, so I drove us."; Nick H couplet ("At least he drove himself." /
   "But like — who's at a McDonald's at three in the morning, man?") → detonation →
   **M1 glance #3** → `dialogue narrator`: "(two nose-exhales. A standing ovation.)"
7. Chris at the counter: `walkTo(700, 200, markerLabel:'the counter')` (the player
   walks Chris's path) · `dialogue narrator`: Chris intro ("…the only person who will
   enter this McDonald's tonight because he wanted food.") · staging line: the two
   thank-yous
8. "Who's the friend?" exchange; Jacob's floor-drop about Chris; `dialogue narrator`
   ladder line ("from inside a ladder all anyone ever looks is up")
9. Maharko: "You're the same as junior year, bro." → Jacob's full evidence answer
   (complete, verbatim from prose) → booth receives it as a bit →
   `dialogue narrator`: "For the record: it wasn't a bit. / For the other record — the
   one this group actually keeps — it was."
10. `dialogue chris_rivas` (unknown id renders fine, or use nameOverride actor +
    speaker id 'chris_rivas'): "Jacob. Food." · Jacob's return line ("We're around all
    summer…") · Nick F "Yes. Dude. For sure. For sure, for sure." · narrator
    "…completely, and not at all."
11. Exit: `cameraPan(470, 660, 1200, holdMs 1600)` (the Camry signals — staging line)
    · `dialogue narrator`: Chris's epitaph ("That is the last time the group ever sees
    Chris Rivas…")
12. `wait 1800` → the booth goes up: `dialogue nick_f/nick_h` reprise lines ("BRO." /
    "The stats class." / "'I'm around all summer' — bro, he came BACK…") ·
    `dialogue maharko`: "He'd come back tomorrow if you texted him." · V.O. reprise
    couplet ("WHO is at a McDonald's at three in the morning?" / "On a Tuesday.")
13. FINAL HOLD: `cameraPan(215, 240, 800, holdMs 3000)` ← PROTECTED (the booth at
    3:11, one second longer than comfortable) · `dialogue narrator`: "The Nicks will
    tell this story for weeks… / Eventually they'll tell it to exactly the right
    person. / That's next." · `changeScene(2, 500)`

**COMPRESSION CONTRACT — Scene 1**
- The McDonald's irony (the tellers are ALSO there at 3am) fires twice (Nick H live;
  the V.O. reprise) and is NEVER captioned — no narrator wink, no character noticing.
  The only underline is the held final pan (beat 13).
- Chris Rivas's four protected beats must ALL survive: the wanted-food intro, the two
  thank-yous, "Jacob. Food.", the factual exit epitaph. Cut none.
- Nobody ever offers Jacob the seat — no beat may stage anyone shifting over.
- Jacob's lines stay complete and evidenced and are received as a bit.
- "(Nobody is charting it yet.)" is the scene's single hidden plant — keep it as a
  flat narrator aside at beat 10's hover moment; add no second plant; never explain it.
- Eric is not present and not mentioned. No beat references him.

---

### SCENE 2 — "The Trophy" → scenes[2] (L3) — prose: `scene_02_03_04.md`

Beats: narrator opening (reuses "For no reason. That's important." about THEM — keep
exact) → "In the back seat: Eric." / "You know Eric." (that is the WHOLE intro) → the
polished retelling (transcribe the Nick F/Nick H run, including both impressions and
"It is one in the morning… technically, a Friday" as a staging line) → Eric's two
participation lines ("Wait — go back…", "And he drove himself.") → Maharko impression
+ verdict quote → staging line: "Eric's laugh comes half a beat late." → Eric:
"Who else have you told?" → Nick F "Bro, everyone. This story kills…" / Nick H "It
works without context. That's how you know it's good." → carbonation argument (2
lines max) → narrator closer ("It's a good story… it never occurs to either of them
that it's worth anything.") → FINAL HOLD `cameraPan(470, 380, 700, holdMs 3200)` ←
PROTECTED, NOTHING plays over it → `changeScene(3, 500)`.

**COMPRESSION CONTRACT — Scene 2**
- **The motive line stays unsaid — absolute.** Nothing may gesture at "milk more
  content" (that is Scene 5's). What this scene shows: the late laugh, the phone
  turned over and back (staging line, once), the going-quiet.
- "Who else have you told?" is Eric's LAST spoken line (the audit-as-appetite plant).
  One plant; do not add; do not explain.
- The final held shot has no narrator and no music swell over it (music continues at
  stage level underneath; no changeMusic).
- No character notices the 1am/parked-car echo; the only underline is the narrator's
  placement reuse.

---

### SCENE 3 — "The Bit That Runs Itself" → scenes[3] (L2_ACT1) — prose: `scene_02_03_04.md`

Beats:
1. `dialogue narrator` opening ("Two bedrooms, eleven-forty…" and — EXACT —
   "Between them: nothing. Rockville, presumably.")
2. Room tours: `walkTo(560, 620)` (frames left island) → narrator left-room lines →
   `walkTo(1840, 620)` → narrator right-room lines (the made bed, the textbook, the
   keys with a hook)
3. **Recurrence 1:** `minigame doubleCall { variant:'ringOnly', ring:{ left:true,
   right:true, callerIdLeft:'JACOB', durationMs: 5200 } , leftPhone, rightPhone },
   background: true` · simultaneity staging line, ONCE, plainly ("at the same moment,
   a phone lights up in each one, and both of them start ringing") ·
   `cameraPan(360,620,…)` → the call (`nick_f`/`jacob` dialogue, transcribe: "Why
   would I call you?" exchange complete) → GC texts: verbatim #1
   (`bro why did jacob call me`), `eric` `what did he want`, `NICK F: NOTHING bro` /
   `he said I called HIM`, `nick_h` "he just wanted to hear your voice", `NICK F:
   STOP` → **M2 choice #1** (options: "he just misses you guys" / "he wanted to hear
   your voice" — converge; reactionLines per 07 §M2) → narrator founding-document
   line ("It feels like a Wednesday.")
4. Montage: narrator time lines ("It happens again the next week… then three in one
   week."), incl. `jacob's been quiet` as a GC dialogue line
5. **Recurrence 2 (the silent call):** `ringOnly` beat again → both answer, nobody
   speaks: `wait 2500` ← protected (two bedrooms breathing) → "…I can hear you, bro."
   / "You called me. You go first." exchange → `he did it again` /
   `called and said NOTHING for like a full minute` → **M2 choice #2** ("he
   panicked" / "he's committed to the bit")
6. Narrator working-model passage ("…they built it together, out of the parts of him
   that arrived by phone. / Jacob has never once been consulted on it.")
7. **Recurrence 3 (the voicemail masterpiece):** `ringOnly` beat with
   `darkenIsland` over Jacob's island (right room dark, phone face-down) →
   `cameraPan(360,620)` Nick F mid-game answers on speaker: "Jacob! My guy. Talk to
   me." → `dialogue jacob` the voicemail IN FULL, once (verbatim #15) →
   `cameraPan(2040,620, holdMs 2000)` the phone ringing at nobody → Nick F "No way."
   → verbatim texts #3/#4/#5 in exact order — with **M2 choice #3** inserted so that
   the picked option ROUTES INTO Nick H's canon lines (see 07 §M2; both options
   converge on the identical verbatim pair)
8. Narrator "first respect he's ever been paid here… He wasn't there for it." → final
   ring staging (`ringOnly`, right only, short) → narrator: "So far, the bit has only
   ever rung two phones. / The week after, it finds a third."
   (NO scene change — Scene 4 continues on this scenes[3] index.)

**COMPRESSION CONTRACT — Scene 3**
- **The planted evidence is ordnance:** both phones ring incoming at the same instant
  in every recurrence; caller-ID renders on Nick F's side ONLY; the simultaneity is
  stated in words exactly once (beat 3) and never again; every ring is buried at speed
  under the next funny beat. NO zoom, caption, or sting on the double-ring, ever.
- Jacob exterior only: room, posture, complete sentences. Never flustered — not
  received. No narration about his feelings.
- The voicemail greeting: full render ONCE, politeness intact ("Thanks."), not funny
  in itself; the comedy is Nick F's awe.
- Oct-10 texts: verbatim, exact order (#3 → #4 → #5).
- "Between them: nothing. Rockville, presumably." — exact, once, unexplained.
- "it finds a third" refers to a phone; keep the ambiguity; no beat may clarify.
- Eric in the overlay: ONE text ("what did he want") then overlay-silence from him for
  the rest of the scene. Nothing points at this.

---

### SCENE 4 — "The Wrong Man Confesses For You" → scenes[3] continued — prose: `scene_02_03_04.md`

Beats: narrator opening ("…for the first time all era, the screen doesn't say JACOB.")
→ "The screen says BEN." → narrator Ben intro ("He used to be around… Nobody remembers
deciding that, either.") → the full Ben call, transcribed (`ben` speaker exists:
"Ben Bersofsky") — all five protected Ben beats in order — intercut ONCE with
`cameraPan(2040, 620, 2600, holdMs 2400)`: Jacob on the bed watching his phone ring,
not answering (`ringOnly { ring:{ right:true } }` under it; "He looks tired." as the
ONLY descriptive line) → Nick F covers the mic: "This is insane." → Ben's exit
("Yeah. Okay. Good night, Nick.") + narrator politeness epitaph → GC: verbatim #6 →
"(The reply comes fast.)" staging line, neutral, ONCE → `eric` `why` then `💀`
(#7) → verbatim #8, #9 → narrator: "Run the exchange back, if you want… Those two
sentences never touch. Nobody needs them to." → overlay-still staging; lamp off →
narrator: "For the record: that is the last time Ben ever calls anyone in this
group. / For the other record —" → **THE BROKEN COUPLET: the sentence stops; the
narrator does not come back** → `cameraPan(1200, 620, 2200, holdMs 2600)` ←
PROTECTED (the held empty dark, one pan-width wide) → `dialogue narrator`: "There is
nothing there." → `wait 1600` → `changeScene(4, 400)`   ◄ the hidden cut, camera on
black, ACT2 spawn = (1200, 620).

**COMPRESSION CONTRACT — Scene 4**
- Ben's five protected beats, all present: "Sorry — I know it's late."; "Fourteen
  times since Tuesday — I counted, that's not a guess."; "I know the shape of it.";
  "Tell them I asked them to stop… Just tell them I asked."; the narrator's factual
  exit epitaph. Cut any one and stop — you have broken the chapter.
- Eric's `why` / `💀` are staged FLAT: one neutral staging line, zero further
  attention, no beat lingers, no sfx on them. (Their weight is Scene 6's job.)
- The Ben-describes-the-ringing beat plays while the player WATCHES Jacob not
  answering — keep the pan under Ben's "That's him. While I'm on with you…" line, and
  bury it immediately under "This is insane."
- "Why would Jacob be calling YOU?" stays; it is the third firing of the load-bearing
  question; never name the motif.
- The broken couplet, the silence after it, the held dark, and "There is nothing
  there." land flat: no italic wink, no music change, no sting. The scene's last
  audio state = stage music still playing (it dies at the top of Scene 5, as a CUT).

---

### SCENE 5 — "The Third Island" → scenes[4] (L2_ACT2) — prose: `scene_05_06_07.md`

Beats:
1. `wait 1200` (black; the transition just happened invisibly)
2. `stopAllAudio { fadeMs: 0 }` ← A CUT, not a fade. No music from here to the coda's
   end. NOTHING may re-introduce music in scenes[4..10] (no changeMusic beats exist
   past this point; scene configs 4–10 have no `music` keys).
3. `dialogue narrator`: "For the other record—"
4. `dialogue narrator_eric`: "—there is no other record. / There's mine." ← THE
   HANDOFF. From this beat to Scene 11's question, every narration beat uses
   `narrator_eric`. The label change is the entire ceremony — no sfx, no tint, no pan
   on it.
5. `dialogue narrator_eric`: the one-lie passage ("A minute ago I told you there was
   nothing there… Everything else, I just let you believe.")
6. **THE REVEAL PAN:** `cameraPan(1200, 1150, 3800, holdMs 2000)` (down into the dark;
   the island is lit in this scene config and was dark-filled at these exact
   coordinates in scenes[3])
7. `dialogue narrator_eric`: "I told you once what was between them… It was my
   bedroom." + the room-tour narration + the no-admin passage ("…I was a guy at a
   desk with a browser tab open.") + the site description (the game does NOT name the
   website — transcribe the gray-interface passage) + the fire-axe/back-seat passage
8. `walkTo(1200, 1180, markerLabel: 'Sit down.')`
9. `dialogue narrator_eric`: "This is the part you do. Not watch — do. Take your time.
   The chapter will wait. It's been waiting two years."
10. **M3:** `minigame doubleCall { variant:'founding', wire:{ field1Label:'NICK F',
    field2Label:'JACOB', typing:'full', blindWaitMs: 8000, ringPanMs: 5200 },
    typedReply:[{ kind:'auto', text:'what did he want' }], leftPhone:{x:436,y:554},
    rightPhone:{x:1972,y:566} }` — in-mode narration lines (contact-card asides,
    "Nothing happens in this room…", the inaudible-argument passage, "Wait. / Keep
    waiting.") passed via config per 07 §0.2; the founding text renders in-mode,
    character-identical to Scene 3
11. `dialogue narrator_eric`: the receipt passage ("The founding document… Delivery
    confirmed.") → the laugh staging (one line) → the motive, verbatim #16, then:
    "That's it. That's the founding principle… Not hate… Not loneliness. Not revenge.
    Content. / I saw so much potential in this."
12. `dialogue narrator_eric`: the closing conviction ("So now you know the thing Act I
    knew and didn't say… You believed the wrong caller. / Which — I want to be fair
    to you — is exactly what everyone did.")  ← Batch 3 open call #1: DEFAULT = keep
    the full spoken conviction; if Eric rules "silent," end the beat at "You believed
    the wrong caller."
13. Staging line: "He does not close the tab." (NO scene change — Scene 6 continues.)

**COMPRESSION CONTRACT — Scene 5**
- THE DRY IS ABSOLUTE: `stopAllAudio` fadeMs 0 at the top; zero music all scene; only
  diegetic sounds (ring, buzz, optional key clacks). Any sting anywhere = broken.
- The handoff is the speaker label completing the broken couplet: same bubble
  color/emoji, new name, no flash. Do not "improve" it.
- The blind wait (in-mode, 8000ms) is protected: no progress UI, no skip, no
  narration inside it.
- Era-Eric types "what did he want" HIMSELF (auto) — the player only wires in M3.
- One-lie discipline: only "There is nothing there" is named a lie; nothing else in
  Act I gets retconned as one ("I just let you believe" stays).
- Jacob inaudible and exterior; the silent replay adds NO new Jacob footage.
- Motive lines land plain and cold — no apology anywhere in this chapter.
- The retroactive every-chapter implication stays at exactly one gesture ("the voice
  that has told you every chapter of your life") — do not state it elsewhere.

---

### SCENE 6 — "Dead Air, With Applause" → scenes[4] continued — prose: `scene_05_06_07.md`

Beats:
1. `dialogue narrator_eric`: "So now we do the era again… The only thing different is
   where you're sitting." + the overlay-was-staging passage + the autofill line
2. `dialogue narrator_eric`: the no-schedule passage ("Once a week, on average —
   bursty… there was no reason. That's important." → "The cause is sitting in your
   chair.")
3. **M4a:** `minigame doubleCall { variant:'rerun', run:'routine', wire:{ …,
   typing:'full' } }` (mode internally repeats at 'autofill' then 'oneKey' pace —
   "that speed is the finding")
4. `dialogue` GC line `jacob's been quiet` → `dialogue narrator_eric`: the weather
   passage ("He hadn't gone quiet. I'd had a busy week… The man had weather, and the
   weather was me.") ← this passage stays SEPARATE from the voicemail beats (contract)
5. `dialogue narrator_eric`: "Now the night you already know." + the dark-room staging
   ("You can see that. The operator couldn't. Type the numbers anyway. He did.")
6. **M4b:** `minigame doubleCall { variant:'rerun', run:'voicemail', wire:{
   typing:'autofill', deadAirHoldMs: 6000 }, ring:{ left:true, right:true,
   darkenIsland:{ x:2040, y:620, w:320, h:240 } } }` — in-mode: the mid-void camera
   move, ring, `"Hi, you've reached Jacob—"` (truncated — Scene 3 owns the full
   render), then the NOTHING, held ← PROTECTED, no narration overlaps the hold
7. Verbatim texts #3/#4/#5, same order, same spelling, same speed as Scene 3
8. `dialogue narrator_eric`: the applause-for-dead-air passage ("They built him out of
   silence… And then they will grade him.") → re-read staging of #5 → the inventory
   passage ("One of the three of us did not have anything better to do…")
9. `dialogue narrator_eric`: "Then there's the other night." + field-two-says-BEN
   staging + the don't-ask-me-why-Ben passage ("I don't remember deciding… They get
   done, and then narrated.")
10. **M4c:** `minigame doubleCall { variant:'rerun', run:'ben', wire:{
    field1Label:'JACOB', field2Label:'BEN', typing:'oneKey' }, typedReply:[
    { kind:'exact', text:'why' }, { kind:'chip', text:'💀' } ] }` — in-mode:
    "Nothing happens in this room. Remember?"; the no-island phone passage; verbatim
    #6 lands; the reply field BLOCKS until the player types `why` and sends `💀`
    ← Batch 3 open call #3: DEFAULT = forced typing; Eric may soften to a pre-filled
    send (change `kind:'exact'` → `kind:'chip'`)
11. `dialogue narrator_eric`: the counterintelligence passage ("…play dumb in four
    characters and let the room do the rest… a policy for correct people at the bottom
    of the ladder.") → verbatim #8, #9 (dialogue beats, same spelling) →
    `dialogue narrator_eric`: the watched-it-live passage ending "…not that it was
    cruel. That it was easy."
12. Staging: left island back to its game; right lamp off; the tab stays open →
    `dialogue narrator_eric`: "Up to here, everything I did, I did to people I
    couldn't see. / The next part, I did in person." → `changeScene(5, 600)`

**COMPRESSION CONTRACT — Scene 6**
- Verbatim re-runs are character-identical to Act I (order, spelling "Apperantly",
  speed). Meaning shift = seat + hands ONLY. No new inflection, zoom, or sting on any
  old line.
- The dead-air hold: bone-dry, uncuttable, no overlapping narration; the player must
  want it to end.
- M4 escalates through the hands exactly three ways: unframed speed, caused dead air,
  typed skull. The typed skull is the batch's hardest beat and is uncuttable.
- Voicemail NOT re-rendered in full.
- Indictments land up the ladder (Eric, glancingly Nick H), never on Jacob; no new
  cruelty minted.
- "I don't remember deciding" — no motive for the Ben targeting may be invented.
- The weather passage stays separate from the voicemail passage (no merging).
- No fourth firing of the "nobody remembers deciding" motif.

---

### SCENE 7 — "The Call Logs" → scenes[5] (L1, booth actors) — prose: `scene_05_06_07.md`

Beats: narrator_eric opening ("Mid-era… A booth you know.") → seat inventory
narration (four seats taken; the strange mercy; the dragged chair) → the who-knew-what
inventory ("…And the end of the table knew everything, and had a Sprite.") → the
argument, transcribed in full: Nick F's warm question → Jacob's complete denial →
"Why would I be calling YOU, bro?" → Jacob's symmetry argument ("…when you ask it,
it's obvious, and when I ask it, it's funny.") → detonation + narrator_eric
transcoding passage ("He was heated. We logged it as delivery… I knew the true thing,
and I was in the booth.") → Jacob "I'm not doing a bit." → `nick_h` "That's the bit."
← Batch 3 open call #2: DEFAULT = keep as Nick H's; alternatives (soften/reassign)
only on Eric's ruling → narrator_eric door-closing line → the call-logs offer,
transcribed ("Okay. Fine. Look — I'll show you. Call logs." + the incoming/date/time
speech) → Nick F past-the-phone: "Bro. Nobody wants to see your phone. It's fine. We
love the bit." → `nick_h` "The prep is crazy." → narrator_eric trial passage
("Evidence offered, never entered…") + carbonation pivot (one line, reusing the
Scene 1–2 trivia) → Jacob holds the phone out ("Then one more.") → the look-around
staging ending on Eric → narrator_eric: "Say it… I have had them every night for two
years." → **THE SILENCE:** `cameraPan(215, 240, 800, holdMs 8000)` ← PROTECTED — no
input, no prompt, no music, no narration inside; the letterboxed freeze IS the
hands-removed staging → Jacob puts the phone away (staging line) → "And then he
stays." passage → narrator_eric the finding, in full ("Jacob was never fooled… The
shield was already at the table when I sat down.") → the Ben rhyme passage, ONCE
("two men, both outside, both correct…") → the parking-lot/friendship couplet ("It
was also friendship…") ending "…He got two years to choose. He built a video game
instead." → FINAL HOLD `cameraPan(215, 240, 800, holdMs 3200)` → `changeScene(6, 600)`

**COMPRESSION CONTRACT — Scene 7**
- ERIC'S UNBROKEN SILENCE: no dialogue choice, no timer bar, no "stay silent" button —
  the availability of a choice would imply Eric weighed one. It is a camera hold and
  nothing else.
- The log screen is NEVER rendered — not to the table, not to the camera, not blurred.
  The brush-aside completes before any evidence is visible.
- Jacob's protest: complete sentences, evidence, symmetry argument, heat — none of it
  received. Never write what he wants, fears, or concludes; the look, the held-out
  phone, and the staying are the entire text.
- The opacity-rule line ("…it is done inventing things it doesn't know about Jacob")
  appears exactly once, inside the look beat.
- No line claims this is Eric's first hangout or first meeting — "First time this
  chapter has put me in a room with him" is the outer limit (Dogwood owns the firsts).
- The Ben rhyme is named exactly once, here, never re-explained later.
- The final couplet is the batch's last line; NOTHING plays after it; Scene 8 opens
  cold without referencing it.

---

### SCENE 8 — "First Time For Everybody" → scenes[6] (L4) then scenes[7] (L1) — prose: `scene_08_09_10_11.md`

Beats (scenes[6], the lookout): narrator_eric owns the step-back ("This one is out of
order… The first hangout.") → roof staging + invitation-on-the-record passage →
headlights: `cameraPan(470, 660…)` + `sfx` car door → Jacob climbs (narration; static
actor per 08_maps §7 staging note) → the hold-both passage ("…it was a hazing, and he
supplied his own transportation to it… Keep both hands full.") → "He came! Bro. He
CAME." / "You invited me." → the joint: Jacob "I've never done this." → Nick F
"That's fine, man. There's a first time for everybody." → the coaching + cough +
cheer ("Nobody is being cruel on this roof tonight. Save that sentence.") → Nick H
"Better than Nick's first one." exchange → **the audience-of-one line:**
`dialogue eric`: "Same, for what it's worth. First one." (staging line before it:
low, to Jacob only, under the music — via narrator_eric or beat placement; NO
reaction from the Nicks) → narrator_eric two-candidates passage IN FULL, unresolved
("One: camouflage… Two: kindness… I'm not going to pick… That's the water this whole
group drinks.") → Jacob's hands bit ("These are my hands…") + warm detonation →
"somebody's hungry" → `changeScene(7, 600)`.

Beats (scenes[7], the booth): seating-without-ceremony staging ("no vote, no toast…
One night the geometry just includes you.") → the fries bit ("These are the best
fries I've ever had. I understand everything now.") + the realest-minute passage →
**THE SPLIT-FRAME:** staging line (three phones lighting, face-down; "Not Jacob's.")
→ `dialogue maharko` verbatim #10 → staging (nobody's face changes; Jacob mid-story,
second act) → `dialogue nick_f` verbatim #11 → `cameraPan(215, 240, 800, holdMs
3500)` ← PROTECTED: both things, one frame; the pan must land while the story and the
texts coexist — do NOT cut away between the laughter and the texts →
narrator_eric verdict passage in full (Maharko-as-consistent first, then the hedge
read: "…That is the machine at cruising altitude… What it is still like.") →
parking-lot exit (the Camry signals; "You've seen it. It still does what it does.") →
narrator_eric closing fact ("He was on that roof because of me… It was a good night.
Real, all of it, all the way down. It was also a yield. / Both. The whole time. That's
the chapter. From here on, it's just the paperwork.") → `changeScene(8, 700)`

**COMPRESSION CONTRACT — Scene 8**
- The split-frame hold is the scene's thesis: warmth and cruelty in ONE frame, no cut
  between Jacob's laughing story and the lit phones/hedge. Sequentializing them into
  separated staging kills the scene.
- The pretended first time is never adjudicated: the two-candidates narration is the
  outer limit; no tell (look, beat, cue) may lean either way; the line is low, to
  Jacob only, unheard by the Nicks.
- Verbatim #10/#11 exact, lowercase, as texts, landing on three phones and never on
  Jacob's; Maharko framed as consistent, not crueler.
- The warmth stays unlampshaded (coaching, cheer, hands bit landing because it lands);
  Jacob never written grateful, nervous, or moved.
- Four-for-four seating happens WITHOUT ceremony; no line notices Jacob having a seat.
- The narrator formally retires the pointing ("I'll stop pointing at it" / "from here
  you count them yourself") — Scenes 9–11 must not re-explain the transcoding or
  both-things motifs.
- Batch 4 open call #1 (texts staged live at the booth) — DEFAULT = as drafted.

---

### SCENE 9 — "The Capital" → scenes[8] (L2_CHAT) — prose: `scene_08_09_10_11.md`

Beats: narrator_eric: "One more thing got built that year…" → **the mode:**
`minigame doubleCall { variant:'capital', capital:{ oldThreadName:'electric vehicle
squad', newThreadName:'Sub Zero Squad', memberCount: 6, driftMs: 12000,
postRenameHoldMs: 8000 } }` — in-mode narration via config: the quarantine passage
("A room you build so that a person can be let in without being let in…"), the
time line ("nothing, nothing, nothing, everything"), the lights-changing passage;
messages render as LIGHT, never words; the rename blink; then the protected hold →
after mode: narrator_eric: "You know that chat. / It's on your phone. Your actual
phone — the one next to you right now…" (the chapter's ONLY reach out of the fiction)
→ "…It just became everything else on top, the way a fort becomes a city, and nobody
was ever told. / Now you have been." → `wait 2000` → narrator_eric: "If you were
waiting for the moment of no return, it wasn't a call and it wasn't a night. It was a
rename. / The machine had a capital now. The next thing it stopped needing was me."
→ `changeScene(9, 700)`

**COMPRESSION CONTRACT — Scene 9**
- THE POST-RENAME HOLD (≥8s, in-mode): no sound, no motion, no caption; survived, not
  skipped. Nothing scored anywhere in this scene.
- No dialogue, no legible message content — light only; not one text invented.
- "electric vehicle squad" exactly once; "Sub Zero Squad" as a header, never spoken.
- The direct address fires once and never reprises in Scenes 10–11.
- No hand, no thumb, no dates — the record's unknowns stay unknown.
- Scene 10 must not open by repeating the closing couplet.

---

### SCENE 10 — "Self-Sustaining" → scenes[9] (L2_WINTER) — prose: `scene_08_09_10_11.md`

Beats: narrator_eric: "February 2025. Last one…" (the coat-pockets passage) →
`dialogue narrator`— no: staging line "A Tuesday." via narrator_eric, FLAT, once →
"the bit, running clean, with the machine nowhere in sight. Watch." → verbatim #12,
#13 (`eric`), #14 (`nick_f`) as dialogue beats, caps exact → narrator_eric the full
read ("Read the caps… the bit didn't run on facts. It ran on the seat… And 'the Big
L.' We had a name for him. With a definite article, like a landmark…") ending with the
errand-of-love passage ("…Both currents, one sidewalk, no machine required. The
machine had done its work: the work was me.") → `wait 1500` → narrator_eric: "Now the
part you're actually here for, which is the part where nothing happens." + the
autofill-ghosts staging → **M5:** `minigame doubleCall { variant:'unsent', wire:{
field1Label:'NICK F', field2Label:'JACOB', typing:'autofill' }, unsent:{ minStillMs:
1500, rewindLine:"That's not how it happened.", walkAwayHoldMs: 500,
closeSfx:'sfx_laptop_close' } }` — in-mode narration (config): the what-the-calls-
were-for passage → "It had become a self-sustaining system." (#17) + the
systems-verdict passage → "So. The fields are full of ghosts… Stand up." — then the
mode waits; button live; rewind on press; walk-away resolves; **the laptop click is
the last sound** → after mode: narrator_eric: "The calls stopped that month. Now the
important part. Here is everything that happened next: / Nothing." + the not-noticing
passage in full ("…They were weather. The weather cleared, and you don't text the
chat about a clear day. / He was never even acquitted… Some of you had it on the
books until about an hour ago.") → the island-hold staging → narrator_eric: "Don't
hand me anything for the call I didn't place… walking away from a machine you built,
after it works, isn't stopping. It's shipping. / The product was live. The system
sustained itself. The author signed off — without, it goes without saying, signing."
← Batch 4 open call #3: DEFAULT = keep "It's shipping." → `screenTint(0x000000,
1.0, 1200)` (the island light goes out) → `changeScene(10, 600)`

**COMPRESSION CONTRACT — Scene 10**
- THE UN-PLACED CALL: no prompt, no timer, no narration inside the stillness; button
  available throughout; the rewind is black + the exact unattributed line, no voice
  tag, no sting; do not soften into a dialogue refusal.
- The laptop click: era's last diegetic sound; NOTHING may sound after it until the
  coda's single buzz (the `screenTint`/`changeScene` are silent).
- Feb 4 verbatim exact — caps, all three lines, in order, Five Guys discrepancy
  intact and named once by narration only.
- "A Tuesday." flat, once, uncaptioned.
- "Some of you had it on the books until about an hour ago" — singular, unnamed; do
  not sharpen to a name.
- "It's shipping" must survive compression ahead of almost everything else — it is
  the anti-catharsis guard. "Signed off — without signing" is the scene's last line
  before the light goes.

---

### SCENE 11 — "Does It Matter" → scenes[10] (L0) — prose: `scene_08_09_10_11.md`

Beats:
1. `screenTint(0x000014, 0.35, 800)` · `wait 1500` (where you came in; phone
   face-down; NO narration — the narrator is nearly done)
2. `dialogue eric`: "So. The summer Maharko left for Florida. What happened was—"
3. `wait 1400` (no word arrives to make it smaller)
4. `dialogue eric`: "—I did it. The calls were me. Both phones, every time, all eight
   months. Jacob never called anyone. Nobody ever called anyone. There was a website,
   and there was me, and I thought he'd be good content. / And he was. / That's the
   whole sentence. It was never long. It was just heavy."
   ← Batch 4 open call #2: DEFAULT = say it (as drafted). The colder alternative
   (stop at the dash a second time) is a delete-one-beat change if Eric rules for it.
5. `wait 1200`
6. `dialogue eric`: "You were made. / Does it matter?"  ← the narrator (and all
   narration) RETIRES after this beat. Every remaining beat is staging: no dialogue,
   no caption, no epilogue card, from anyone, ever.
7. `stopAllAudio { fadeMs: 400 }` (whatever room tone was left)
8. `screenTint(0x000000, 0.55, 2000)` (the room steps down to shapes)
9. **THE LONG HOLD:** `wait 25000` ← PROTECTED and deliberately over-long. `wait`
   beats do NOT freeze the player (verified) — the room stays walkable, the door is
   solid, nothing prompts, nothing glows, nothing spawns. Do not shorten below 20000.
10. `sfx sfx_phone_buzz` — ONE buzz, once, the coda's only sound
11. **M6:** `minigame doubleCall { variant:'reply', reply:{ threadHeader:'Sub Zero
    Squad', incoming:{ sender:'JACOB', text:'who tryna go to mcdonalds tn?' },
    reply:{ kind:'exact', text:'omw' }, codaExit:{ doorPoint:{ x:350, y:505 },
    finalHoldMs: 4000 } } }` — the mode owns everything from the phone turning over to
    the fade: type `omw`, send, phone set down face-up (glow decal), keys, the walk
    out, the hold on the empty room with the small light, `fadeOut(1500)`
12. `endChapter` — with `quietEnd: true` on the chapter config: **no victory_jingle,
    no flash, no victory animation** (§3). The fade lands on black; `onLevelCompleted`
    fires normally.

**COMPRESSION CONTRACT — Scene 11**
- The narrator retires at the question — nothing spoken/rendered as text after beat 6
  except the two texts inside the mode.
- The completed sentence keeps its seams: same opening words as Scene 0, the dash
  where "simply" used to live, no apology (an apology is a request; nothing is
  requested).
- The long hold must read as the actual ending; the buzz arrives after the chapter is
  over. Every wait in beats 3–9 is protected.
- One buzz. No ringtone, no swell, no jingle, ever. Face-down → turned over → left
  face-up is the entire prop language.
- Jacob's opacity to the last frame: sender + one line; no meaning assigned, no
  warmth added ("he forgives" / "he knows" are forbidden), no reply after `omw`.
- The pilot light stays small: nothing after the fade — no second text, no heart, no
  chime, no group laughter.

---

## 6. ETHICS GUARDRAILS (restated tight — these are hard gates)

1. **Jacob opacity is a formal rule:** exterior only, everywhere. No thought bubbles,
   no narrator claims about his feelings, protests always fully articulate and never
   received. The chapter commits no new fiction about Jacob while confessing the
   others.
2. **Nothing named:** the website is never named (no name, no URL, no logo). The
   spectrum speculation does not exist in this chapter in any form. The Nov 19 "Jacob
   fiction" and the "Jacob 2.0" GPT do not appear in any form.
3. **Cruelty only via canon verbatim, framed to indict its speakers** ("Jacob is a
   LOSER", "the big L", the hedge, Maharko's verdict). No invented insult may exceed
   the archive's register, and none may land a new blow on Jacob. New cruelty, where
   invented (Scene 7), is DISMISSAL, never mockery.
4. **Chris Rivas and Ben are protected by their named beats** (Scene 1 contract;
   Scene 4 contract). Cutting any one recommits the crime on the previous victim.
5. **No `victory_jingle`, no bossFight, no `chase`, no `ledger` beats anywhere.**
6. **Nothing new is funny after Scene 4.** Acts II–III may only re-run Act I lines
   verbatim; the two exceptions (Scene 8 warm-cruel texture, Scene 10's Feb 4
   performance) are already in the prose. Add no jokes.

## 7. TEST / VERIFY

1. `npm run lint` — tsc. (The `'void'` MapTheme addition and `quietEnd` field must
   compile; no `any` on the mode config.)
2. `npm test` — `chapters.test.ts` ref-lints beats (no dangling `goto`/`modeId`;
   `doubleCall` must be registered before the chapter lands or the test fails),
   music coverage (needs the `INTENTIONALLY_SILENT` entry), `modesDoc.test.ts`
   (needs the CLAUDE.md row), `chaptersDoc.test.ts` (needs the README title).
   Write at least one unit test for `doubleCall` pure logic (variant state machine:
   typed-reply matcher, unsent rewind counter) per `docs/ADDING_A_MINIGAME.md` §8.
3. **Mode playtest before wiring** (ADDING_A_MINIGAME §7): temporarily insert each
   variant as the first beat of a reachable chapter; verify with
   `window.__OMEGA_GAME__` (`scene.activeMode?.id`); revert (git diff clean).
4. **Playtest the chapter at port 3324** (`npm run dev`; full restart after edits —
   Vite transform cache; verify served code with
   `curl localhost:3324/src/data/chapters/chapter12.origins.ts | grep doubleCall`).
   Walkthrough checklist: (a) Scene 0 opens with NO music and NO narrator; (b) in
   scenes[3], walk the full corridor and confirm the third island is not visible at
   any point, at multiple window sizes; (c) the Scene 4→5 transition shows no visible
   cut (pure black both sides); (d) the reveal pan lands on the lit island; (e) music
   never returns after the snap; (f) Scene 6 blocks until `why` + 💀 are sent; (g)
   Scene 10's button rewinds with the exact line and walk-away resolves; (h) Scene 11:
   the player can walk during the 25s hold, the door is solid, ONE buzz, `omw` typed,
   NO jingle at the end.
5. **Cold-read check** (MAGNUM_OPUS Phase 9): someone who hasn't read these docs plays
   it once and is asked only: "when did you realize, and what did the ringing phones
   mean in Act I?" If they noticed the double-ring being *pointed at*, a caption or
   sting leaked in — find it and delete it.

## 8. DO NOT (the gotchas that WILL bite this exact build)

- **Do NOT position any HUD/phone/site UI without `screenSpace()`** — every doubleCall
  surface is `scrollFactor(0)` at camera zoom 2.0; run coords through `zx()/zy()`,
  sizes/fonts/strokes through `s()` (`_template/` shows it). Hand-rolled math has
  bitten three modes.
- **Do NOT use raw `add.text`** — `ctx.label()` / the scene `label()` helper only.
- **Do NOT build fade overlays as `add.rectangle(…, alpha 0)`** — construct with
  `fillAlpha: 1` and tween the object's `alpha` (Scene 10's rewind black, the
  darkenIsland overlay, any mode fade).
- **Do NOT call `cameras.main.setBounds` anywhere** — confinement is invisible walls
  (lint-enforced; re-adding bounds reintroduces the black-bars bug).
- **Do NOT run side effects inside React `setState` updaters** if you touch
  `GameLayout.tsx` for any reason — StrictMode double-invokes (the beat-skip bug).
  You should not need to touch React at all.
- **Do NOT rely on hot reload** — restart `npm run dev` after non-chapter edits and
  `curl`-verify (chapter-beat edits reload on refresh; mode/source edits often don't).
- **Do NOT give the void map an undefined theme** — `Atmosphere` defaults to
  `'apartment'` (planks + warm glows over your black). Use the new `'void'` literal.
- **Do NOT let `routeOnMinigame` near this chapter** — it is hardcoded to groupChat's
  payload. doubleCall routes nothing; wins always fall through.
- **Do NOT re-register background `ringOnly` expecting it to survive `changeScene`**
  — `activeMode` is torn down on every transition; each recurrence gets its own beat.
- **Do NOT add music, stings, jingles, captions, zooms, or new jokes** anywhere the
  contracts above say silence. When in doubt in this chapter, the answer is: quieter.

## 9. CONSOLIDATED ASSUMPTIONS AWAITING ERIC'S VETO (build defaults in bold)

1. Chapter slot/menu: **index 12, kind 'chapter', explicit title** (vs. untitled 'Ω').
2. Scene 5 ending: **full spoken conviction** (Batch 3 call #1).
3. "That's the bit.": **Nick H keeps it** (Batch 3 call #2).
4. Scene 6 skull: **forced typing** (Batch 3 call #3).
5. Scene 8 texts live at the booth: **as drafted** (Batch 4 call #1).
6. Scene 11 sentence: **completed, "—I did it."** (Batch 4 call #2).
7. "It's shipping.": **kept** (Batch 4 call #3).
8. `narrator_eric` = narrator's color/emoji, name "Eric" (07 §assumptions).
9. McDonald's theme = **'hospital'** (08 §3); void theme = new `'void'` literal.
10. The `quietEnd` engine change (§3) — required by the ending spec, but it touches
    `ChapterScene.ts`, so flag it.
11. Long-hold durations: Scene 11 hold **25s**; Scene 7 silence **8s**; Scene 9
    post-rename **8s**; Scene 5 blind wait **8s**; Scene 6 dead air **6s**.

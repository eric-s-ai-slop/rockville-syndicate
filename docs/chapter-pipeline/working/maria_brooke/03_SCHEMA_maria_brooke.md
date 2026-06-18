# Chapter Pipeline — Step 3 Output: Schema (ChapterConfig + Beats)

**Chapter:** Maria Brooke
**Chapter Index:** 7 (before Spotify Family Emergency — adjust if Spotify is already Ch7)
**Date:** 2026-06-18

---

## STEP 1 — READ CONFIRMATION

**What this chapter is doing emotionally:** The player is placed inside a group chat where a friend is being catfished by another friend, and the joke is funny until it isn't. The chapter's argument is that complicity is a collective, sustained act — not a single decision but a thousand small ones (a 💀 reaction, a "lmaooo," a closed mouth). The boss fight is the moment of choice: when Ben says he's going to skip track practice for a girl who doesn't exist, the player has sixty-one seconds to type something true or stay silent. Neither choice saves Ben. The choice is only about who the player is. The denouement — Sean telling Ben, Ben blocking the account, Ben coming back mad at the wrong people, the group glad to see him — happens *to* the player, not *because of* the player. The last line ("The Maria Brooke thing is still funny though.") lands differently depending on whether the player said something or didn't, because the player knows which part is still funny. That's the whole design.

**Structural shape:** Two scenes. Scene 0 (classroom) is the setup — the bit unfolds, the player walks the room, the chat panel on the wall and Ben's phone glow on the floor give the player parallel views of the fiction. The minigame fires at the chapter's peak, when Ben says he's skipping track. Scene 1 (track) is the collapse — Sean tells Ben, Ben blocks the account, the anger lands wrong. The classroom framing returns for the coda: Ben comes back, the group is glad, the last line lands.

### Ambiguities resolved with user

- **Chapter number:** Ch7 (before Spotify Family Emergency).
- **Sean:** Added to canonical speaker ids. Flagged for Step 5.
- **Branching:** Four coda variants written (`coda_early`, `coda_mid`, `coda_late`, `coda_silent`), routed via an auto-resolved `choice` beat that reads minigame payload. Step 5 implements routing.
- **Nick F** welcomes Ben back in coda. Confirmed.
- **Replay structure:** Classroom shows the bit unfolding (observer); minigame replays it from inside (participant). Intentional — the choice is sharper because the player already knows how it ends.

---

## STEP 2 — BEAT OUTLINE (approved)

**Scene 0 — Classroom (setup + minigame)**

1. [NARRATOR] — Open: classroom, Period 4, the bit begins.
2. [WALKTO] — Player to chat panel on wall.
3. [NARRATOR] — Maria's first DM. The pretext that disappears.
4. [ERIC] — Eric watches it land. The group assembles.
5. [WALKTO] — Player to Ben's phone glow.
6. [NARRATOR + JORDAN] — Kart moment. Ben inflates, corrects, undersells.
7. [WALKTO] — Player back to chat panel.
8. [NARRATOR + NICK F] — Ben sends his face. The fiction takes something real.
9. [WALKTO] — Player to Ben's phone.
10. [NARRATOR] — Ethan Rosner gambit. Volleyball game. "I didn't get to see you :("
11. [NARRATOR] — One line. The bit stopped being funny.
12. [WALKTO] — Player to chat panel.
13. [NARRATOR + ERIC] — Ben says he's going to skip track. The bit is still running.
14. [MINIGAME — groupChat] — 61 seconds. Type or don't.
15. [NARRATOR] — Bridge: Ben skipped. Sean's at practice. The machine moves.
16. [CHANGE SCENE] — Classroom → track.

**Scene 1 — Track (denouement part 1)**

17. [NARRATOR] — Track. Two people. The conversation that closes both loops.
18. [SEAN] — Tells Ben. Both things. Practical, not heroic.
19. [BEN] — Quiet. The math is internal.
20. [SEAN] — One more line. He's done.
21. [NARRATOR] — Ben blocks the account. No confrontation. Just a block.
22. [CHANGE SCENE] — Track → classroom.

**Scene 0 — Classroom (coda)**

23. [NARRATOR] — Ben came back. The group is glad.
24. [NICK F] — Welcomes him back. Casual. Warm.
25. [BEN] — One line. He's fine. The anger landed elsewhere.
26. [ROUTING CHOICE] — Auto-route based on minigame payload.
27. [NARRATOR, id: coda_early] — Early intervention acknowledgment.
28. [NARRATOR, id: coda_mid] — Mid intervention acknowledgment.
29. [NARRATOR, id: coda_late] — Late intervention acknowledgment.
30. [NARRATOR, id: coda_silent] — Silent acknowledgment (shortest).
31. [NARRATOR] — Last line from brief.
32. [END CHAPTER]

---

## STEP 3 — CHAPTER CONFIG + BEATS

```typescript
import { C } from './palette';

const chapter7: ChapterConfig = {
  id: 'maria_brooke',
  index: 7,
  title: 'Maria Brooke',
  subtitle: 'Act II — The Bit',
  location: 'Walter Johnson High School — Period 4',
  description:
    'Eric catfishes Ben through a fake Instagram account named Maria Brooke while the entire group watches and cheers in real time. When the fiction touches something real, the player is already in the chat.',
  kind: 'chapter',

  scenes: [
    {
      // ──────────────────────────────────────────────────────────
      // SCENE 0 — CLASSROOM
      // ──────────────────────────────────────────────────────────
      map: {
        width: 920,
        height: 660,
        backdrop: C.floorTile,
        theme: 'hospital',
        areaTitle: 'Walter Johnson High School — Period 4',
        rects: [
          // Background image (covers full map, invisible)
          {
            x: 460, y: 330, w: 920, h: 660,
            fill: 0x000000, propKey: 'stage_wj_classroom',
            invisible: true,
          },
          // Border walls
          { x: 460, y: 8,   w: 920, h: 16, fill: C.wall, solid: true },
          { x: 460, y: 652, w: 920, h: 16, fill: C.wall, solid: true },
          { x: 8,   y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
          { x: 912, y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
          // Procedural overlays (engine-rendered)
          // Group chat panel — left wall, mid-height
          {
            x: 80, y: 330, w: 90, h: 360,
            fill: C.tv, propType: 'tv', solid: true,
          },
          // Ben's phone glow — right side open floor
          {
            x: 800, y: 500, w: 60, h: 60,
            fill: 0x1e3a5f, propType: 'tv', solid: false,
          },
        ],
        labels: [],
        playerSpawn: { x: 460, y: 620 },
      },
      actors: [
        { id: 'eric',    x: 110, y: 360 },
        { id: 'jordan',  x: 290, y: 360 },
        { id: 'nick_f',  x: 470, y: 490 },
        { id: 'maharko', x: 290, y: 620 },
        { id: 'nick_h',  x: 110, y: 620 },
        { id: 'sean',    x: 470, y: 620 },
      ],
    },
    {
      // ──────────────────────────────────────────────────────────
      // SCENE 1 — TRACK
      // ──────────────────────────────────────────────────────────
      map: {
        width: 1200,
        height: 660,
        backdrop: C.grass,
        theme: 'park',
        areaTitle: 'Track Practice — WJ',
        rects: [
          {
            x: 600, y: 330, w: 1200, h: 660,
            fill: 0x000000, propKey: 'stage_wj_track',
            invisible: true,
          },
          // Border walls
          { x: 600, y: 8,   w: 1200, h: 16, fill: C.wall, solid: true },
          { x: 600, y: 652, w: 1200, h: 16, fill: C.wall, solid: true },
          { x: 8,   y: 330, w: 16,   h: 660, fill: C.wall, solid: true },
          { x: 1192, y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
          // Bleachers (left)
          {
            x: 80, y: 390, w: 100, h: 220,
            fill: 0x334155, propType: 'bench', solid: true,
          },
          // Bleachers (right)
          {
            x: 1120, y: 390, w: 100, h: 220,
            fill: 0x334155, propType: 'bench', solid: true,
          },
        ],
        labels: [],
        playerSpawn: { x: 600, y: 620 },
      },
      actors: [
        { id: 'sean', x: 420, y: 610 },
        { id: 'ben',  x: 780, y: 610 },
      ],
    },
  ],

  // Required at top level — same as scenes[0]
  map: {
    width: 920, height: 660, backdrop: C.floorTile, theme: 'hospital',
    areaTitle: 'Walter Johnson High School — Period 4',
    rects: [
      { x: 460, y: 330, w: 920, h: 660, fill: 0x000000, propKey: 'stage_wj_classroom', invisible: true },
      { x: 460, y: 8,   w: 920, h: 16, fill: C.wall, solid: true },
      { x: 460, y: 652, w: 920, h: 16, fill: C.wall, solid: true },
      { x: 8,   y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
      { x: 912, y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
      { x: 80,  y: 330, w: 90,  h: 360, fill: C.tv, propType: 'tv', solid: true },
      { x: 800, y: 500, w: 60,  h: 60,  fill: 0x1e3a5f, propType: 'tv', solid: false },
    ],
    labels: [],
    playerSpawn: { x: 460, y: 620 },
  },
  actors: [
    { id: 'eric',    x: 110, y: 360 },
    { id: 'jordan',  x: 290, y: 360 },
    { id: 'nick_f',  x: 470, y: 490 },
    { id: 'maharko', x: 290, y: 620 },
    { id: 'nick_h',  x: 110, y: 620 },
    { id: 'sean',    x: 470, y: 620 },
  ],

  beats: [
    // ──────────────────────────────────────────────────────────────
    // SCENE 0 — CLASSROOM (setup + minigame)
    // ──────────────────────────────────────────────────────────────

    // 1. NARRATOR — Open: classroom, Period 4, the bit begins.
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Period 4. Walter Johnson. The fluorescent lights do their thing.',
        'Eric has his phone under the desk. He has had his phone under the desk for eleven minutes.',
        'A new Instagram account called Maria Brooke just sent Ben a message.',
        'The account is three hours old. The account has one post. The account is Eric.',
      ],
    },

    // 2. WALKTO — Player to chat panel on wall.
    {
      type: 'walkTo',
      x: 80, y: 330, radius: 100,
      markerLabel: 'Watch the chat',
    },

    // 3. NARRATOR — Maria's first DM. The pretext that disappears.
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The first message is a survey for Walter Johnson alumni.',
        'The survey ended yesterday. The girl is just here now.',
        'It is the cleanest opening Eric has ever written.',
      ],
    },

    // 4. ERIC — Eric watches it land. The group assembles.
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        'She opened cold. The pretext did its job and disappeared.',
        'I simply built a person who could exist.',
        'The era of Maria Brooke begins now.',
      ],
    },

    // 5. WALKTO — Player to Ben's phone glow (right floor).
    {
      type: 'walkTo',
      x: 800, y: 500, radius: 80,
      markerLabel: 'See Ben\'s phone',
    },

    // 6. NARRATOR + JORDAN — Kart moment. Ben inflates, corrects, undersells.
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Ben is into racing. Only in rentals. But getting pretty good.',
        'Maria asks if he means track.',
        'Ben corrects himself in the same breath.',
        'The slip confirms what the group already knew.',
      ],
    },
    {
      type: 'dialogue',
      speaker: 'jordan',
      lines: [
        'He said rentals.',
        'Then he said track.',
        'Then he said lmao.',
        'The record corrects itself.',
      ],
    },

    // 7. WALKTO — Player back to chat panel.
    {
      type: 'walkTo',
      x: 80, y: 330, radius: 100,
      markerLabel: 'Back to the chat',
    },

    // 8. NARRATOR + NICK F — Ben sends his face. The fiction takes something real.
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Ben sends a photo.',
        'No caption. Just his face.',
        'To Eric.',
      ],
    },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        'Honestly though he really just sent his face.',
        'Like just the face. No context.',
        'I feel like that\'s kind of brave honestly.',
      ],
    },

    // 9. WALKTO — Player to Ben's phone.
    {
      type: 'walkTo',
      x: 800, y: 500, radius: 80,
      markerLabel: 'See the DMs',
    },

    // 10. NARRATOR — Ethan Rosner gambit. Volleyball game. Schedule shifts.
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Maria drops a name. Ethan Rosner. A junior on Ben\'s track team.',
        'Ben doesn\'t know him. She says he\'s a senior.',
        'The small-world construction is deliberate. She is one degree from real.',
        'Then she mentions her volleyball game Saturday.',
      ],
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Ben has a track meet at WJ that day.',
        'He tells her he can\'t make it.',
        'She responds: "I didn\'t get to see you :("',
        'The fiction has weight now.',
      ],
    },

    // 11. NARRATOR — One line. The bit stopped being funny.
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Up until that message it was a bit.',
        'After that message it was something the group had done to someone.',
      ],
    },

    // 12. WALKTO — Player to chat panel.
    {
      type: 'walkTo',
      x: 80, y: 330, radius: 100,
      markerLabel: 'Watch this',
    },

    // 13. NARRATOR + ERIC — Ben says he's going to skip track. The bit is still running.
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Ben types: wait actually maybe i can skip track.',
        'Ben types: yeah im just gonna go to her game.',
        'Sean is at practice in twenty minutes.',
      ],
    },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        'The bit is still running.',
        'I simply did not anticipate how far it would carry.',
      ],
    },

    // 14. MINIGAME — groupChat. The player is pulled into the chat.
    {
      type: 'minigame',
      modeId: 'groupChat',
      config: {
        timelineEndsAtMs: 61000,
        finalPromptTimeoutMs: 20000,
        complicityMax: 100,
      },
      introLines: [
        'You\'re in the chat. You\'ve been in the chat since the first message.',
        'Ben is about to skip track practice for a girl who doesn\'t exist. Say something, or don\'t.',
      ],
      background: false,
    },

    // 15. NARRATOR — Bridge: Ben skipped. Sean's at practice. The machine moves.
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Ben skipped.',
        'Sean is at practice.',
        'The machine moves on its own schedule.',
      ],
    },

    // 16. CHANGE SCENE — Classroom → track.
    {
      type: 'changeScene',
      sceneIndex: 1,
      transitionMs: 900,
    },

    // ──────────────────────────────────────────────────────────────
    // SCENE 1 — TRACK (denouement part 1)
    // ──────────────────────────────────────────────────────────────

    // 17. NARRATOR — Track. Two people. The conversation that closes both loops.
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Track practice. WJ.',
        'Two people on the bottom straight.',
        'Sean was in the chat. Sean was laughing.',
        'Sean was laughing right up until it cost something in his world.',
      ],
    },

    // 18. SEAN — Tells Ben. Both things. Practical, not heroic.
    {
      type: 'dialogue',
      speaker: 'sean',
      lines: [
        'Bro. The Maria girl.',
        'That\'s a catfish.',
        'It\'s Eric. He made the account.',
        'You were about to skip practice for her.',
        'I\'m not gonna let you skip practice for a girl that doesn\'t exist.',
      ],
    },

    // 19. BEN — Quiet. The math is internal.
    {
      type: 'dialogue',
      speaker: 'ben',
      lines: [
        '...',
        'Eric?',
      ],
    },

    // 20. SEAN — One more line. He's done.
    {
      type: 'dialogue',
      speaker: 'sean',
      lines: [
        'Yeah.',
        'That\'s all I got bro. Do what you want with it.',
      ],
    },

    // 21. NARRATOR — Ben blocks the account. No confrontation. Just a block.
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Ben blocks the account.',
        'No message. No confrontation.',
        'The fiction ends on his end with two taps and a closed app.',
      ],
    },

    // 22. CHANGE SCENE — Track → classroom.
    {
      type: 'changeScene',
      sceneIndex: 0,
      transitionMs: 900,
    },

    // ──────────────────────────────────────────────────────────────
    // SCENE 0 — CLASSROOM (coda)
    // ──────────────────────────────────────────────────────────────

    // 23. NARRATOR — Ben came back. The group is glad.
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Ben comes back.',
        'The group is glad to see him. Genuinely glad.',
        'He finds out it was Eric. He already knows.',
        'His anger lands on Nick F and Jordan.',
        'Eric exists in a different category.',
      ],
    },

    // 24. NICK F — Welcomes him back. Casual. Warm.
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        'Yo Ben welcome back bro.',
        'Honestly though we missed you man.',
        'Like genuinely. It was weird without you.',
      ],
    },

    // 25. BEN — One line. He's fine. The anger landed elsewhere.
    {
      type: 'dialogue',
      speaker: 'ben',
      lines: [
        'Yeah I\'m good.',
        'Nick F and Jordan are still on some shit though.',
      ],
    },

    // 26. ROUTING BEAT — auto-route based on minigame payload.
    // Engine reads payload.when from the groupChat minigame outcome.
    // If saidTrueThing === false → goto 'coda_silent'
    // Else if when === 'early'   → goto 'coda_early'
    // Else if when === 'mid'     → goto 'coda_mid'
    // Else if when === 'late'    → goto 'coda_late'
    // No player input. This beat is invisible — fires instantly.
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: '',            // empty — no UI rendered, auto-resolved
      options: [
        { text: '', goto: 'coda_silent' },
        { text: '', goto: 'coda_early'  },
        { text: '', goto: 'coda_mid'    },
        { text: '', goto: 'coda_late'   },
      ],
    },

    // 27. CODA — EARLY (player said something before "I didn't get to see you :(")
    {
      id: 'coda_early',
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'You said something early.',
        'Right after Ben sent his face. Before the volleyball game. Before the frown.',
        'You typed it. You hit send. You broke rank.',
        'Jordan said "wait what." Nick F said "lmao ok." Eric said "stfu."',
        'The chat moved on in eleven seconds.',
        'It didn\'t change anything. You said it anyway.',
      ],
    },

    // 28. CODA — MID (player said something after "I didn't get to see you :(")
    {
      id: 'coda_mid',
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'You said something in the middle.',
        'After the frown. Before the final message. When the bit was already bleeding.',
        'Jordan said "bro chill." Maharko said "ur killing the vibe." Eric said "lol ok."',
        'The chat moved on in eight seconds.',
        'It didn\'t change anything. You said it anyway.',
      ],
    },

    // 29. CODA — LATE (player said something at the final prompt)
    {
      id: 'coda_late',
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'You said something at the end.',
        'After Ben said he was skipping. After the chat filled up with laugh reactions.',
        'Jordan said "...".',
        'Then nothing. The chat went quiet, which was the worst reaction of all.',
        'It didn\'t change anything. You said it anyway.',
      ],
    },

    // 30. CODA — SILENT (player never sent a true-thing message)
    {
      id: 'coda_silent',
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'You watched.',
        'That\'s all.',
      ],
    },

    // 31. NARRATOR — Last line from brief.
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'He came back.',
        'Honestly? We missed him.',
        'The Maria Brooke thing is still funny though.',
      ],
    },

    // 32. END CHAPTER
    {
      type: 'endChapter',
    },
  ],
};
```

---

## NOTES ON THE BEATS

**One line I'm least confident about:**

Eric's line at beat 13 — *"The bit is still running. I simply did not anticipate how far it would carry."* This is the only beat where Eric breaks his admin voice slightly and admits something close to surprise. I think it works — he's still framing it as a system observation, not an apology, and "I simply did not anticipate" is the closest Eric gets to acknowledging a consequence. But it's the line where his voice is thinnest. If you want him tighter, replace with: *"The bit is still running. The era continues."* That's pure Eric, no crack. Your call.

**Coordinates I estimated:**

- `stage_wj_classroom` and `stage_wj_track` prop keys — flagged in 2a as needing registration. Map design says backgrounds are `highschool.jpg` and `rm_track.jpg`. Step 5 integration handles the key registration in the texture loader.
- Group chat panel position (x: 80, y: 330) and Ben's phone glow (x: 800, y: 500) — taken from 2a's coordinate notes. May need fine-tuning after playtest against the actual background images.
- All walkTo radii (80–100px) are standard "get near" triggers per schema guidance.

**Judgment calls not fully specified by the brief:**

1. **The routing beat (beat 26).** The Beat schema's `choice` type requires player input, but here we want auto-routing. I've structured it as a `choice` with empty prompt and empty option text — Step 5 implements the auto-resolution by reading the minigame payload and calling the `goto` on the matching option. If the engine can't do this, the fallback is to write a custom routing beat type. Flagged for Step 5.

2. **Ben's silence in the classroom.** Brief says he's present via DMs and the chat panel. I kept him physically in the classroom but silent — he has no `dialogue` beats in Scene 0. He only speaks in Scene 1 (track) and Scene 0 coda. This makes the coda's "Yeah I'm good. Nick F and Jordan are still on some shit though." land harder — it's the first time we hear his actual voice after watching the fiction operate on him for an hour.

3. **Sean's voice.** Brief describes him as practical, not heroic — he tells Ben because the consequence touched his world. I wrote him with "bro" and short sentences — closer to Nick F's warmth than Eric's admin voice. He's not in the canonical character profile list (he's new), so I built his voice from the brief's description. Step 5 should add him to the voice profiles if he'll appear in other chapters.

4. **The four coda variants are uneven in length.** `coda_early` is six lines. `coda_silent` is two. This is intentional — the silence is the path of least resistance, and the chapter should make the acknowledgment of having acted feel proportionally heavier. A player who broke rank early gets more text because they did something harder.

5. **No ledger beats.** Chapter isn't about money. The Ledger gag doesn't fit anywhere naturally. Skipping it.

6. **The narrator's "The era of Maria Brooke begins now."** (beat 4, echoing Eric). This is the narrator picking up Eric's signature phrase and feeding it back to him — the narrator is complicit too, and uses Eric's own language to mock him gently. If this feels too on-the-nose, cut it.

---

## HANDOFF NOTES

- **To Step 4 (ASSETS):** No new sprites. Two background images needed: `stage_wj_classroom` (from `highschool.jpg`) and `stage_wj_track` (from `rm_track.jpg`). One required sfx: `sfx_message_ding` (per mechanic spec). No new music — chapter uses existing classroom/track themes.
- **To Step 5 (INTEGRATION):**
  - Register `stage_wj_classroom` and `stage_wj_track` texture keys
  - Add `sfx_message_ding` to `audio.ts`
  - Add `sean` to canonical speaker ids (both in schema type and in voice profiles if applicable)
  - Implement auto-routing for beat 26 (read minigame payload, call matching `goto`)
  - Register `groupChat` mode in mode registry
  - Typecheck, playtest all four coda variants
- **Open question for the dev:** Does the engine persist minigame `onComplete` payload to the beat runner so the next beat can read it? If no, the routing beat needs a different mechanism (e.g. a global flag set by the mode). Flag this early.

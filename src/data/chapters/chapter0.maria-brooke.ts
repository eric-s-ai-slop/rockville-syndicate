import { ChapterConfig } from './types';
import { C } from './palette';

const chapterMariaBrooke: ChapterConfig = {
  id: 'maria_brooke',
  index: 1,
  title: 'Maria Brooke',
  subtitle: 'Flashback — The Bit',
  location: 'Richard Montgomery High School — Period 4',
  description:
    'Eric catfishes Ben through a fake Instagram account named Maria Brooke while the entire group watches and cheers in real time. When the fiction touches something real, the player is already in the chat.',
  kind: 'flashback',
  estimatedMinutes: { min: 6, max: 10 },

  scenes: [
    {
      // SCENE 0 — CLASSROOM
      map: {
        width: 920,
        height: 660,
        backdrop: C.floorTile,
        theme: 'hospital',
        areaTitle: 'Richard Montgomery High School — Period 4',
        rects: [
          { x: 460, y: 330, w: 920, h: 660, fill: 0x000000, propKey: 'stage_wj_classroom', invisible: true },
          { x: 460, y: 8,   w: 920, h: 16,  fill: C.wall, solid: true },
          { x: 460, y: 652, w: 920, h: 16,  fill: C.wall, solid: true },
          { x: 8,   y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
          { x: 912, y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
          { x: 80,  y: 330, w: 90,  h: 360, fill: C.tv,   propType: 'tv',  solid: true  },
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
        { id: 'sean',    x: 470, y: 620, spriteKey: 'hero_nick_f_sheet' },
      ],
    },
    {
      // SCENE 1 — TRACK
      map: {
        width: 1200,
        height: 660,
        backdrop: C.grass,
        theme: 'park',
        areaTitle: 'Track Practice — RM',
        rects: [
          { x: 600, y: 330, w: 1200, h: 660, fill: 0x000000, propKey: 'stage_wj_track', invisible: true },
          { x: 600, y: 8,   w: 1200, h: 16,  fill: C.wall, solid: true },
          { x: 600, y: 652, w: 1200, h: 16,  fill: C.wall, solid: true },
          { x: 8,   y: 330, w: 16,   h: 660, fill: C.wall, solid: true },
          { x: 1192, y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
          { x: 80,   y: 390, w: 100, h: 220, fill: 0x334155, propType: 'bench', solid: true },
          { x: 1120, y: 390, w: 100, h: 220, fill: 0x334155, propType: 'bench', solid: true },
        ],
        labels: [],
        playerSpawn: { x: 600, y: 620 },
      },
      actors: [
        { id: 'sean', x: 420, y: 530, spriteKey: 'hero_nick_f_sheet' },
        { id: 'ben',  x: 780, y: 530 },
      ],
    },
  ],

  // Top-level map/actors mirror scenes[0] (required by ChapterConfig)
  map: {
    width: 920,
    height: 660,
    backdrop: C.floorTile,
    theme: 'hospital',
    areaTitle: 'Richard Montgomery High School — Period 4',
    rects: [
      { x: 460, y: 330, w: 920, h: 660, fill: 0x000000, propKey: 'stage_wj_classroom', invisible: true },
      { x: 460, y: 8,   w: 920, h: 16,  fill: C.wall, solid: true },
      { x: 460, y: 652, w: 920, h: 16,  fill: C.wall, solid: true },
      { x: 8,   y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
      { x: 912, y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
      { x: 80,  y: 330, w: 90,  h: 360, fill: C.tv,   propType: 'tv',  solid: true  },
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
    { id: 'sean',    x: 470, y: 620, spriteKey: 'hero_nick_f_sheet' },
  ],

  beats: [
    // ── SCENE 0 — CLASSROOM (setup + minigame) ───────────────────────────────

    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Period 4. Richard Montgomery. The fluorescent lights do their thing.',
        'Eric has his phone under the desk. He has had his phone under the desk for eleven minutes.',
        'A new Instagram account called Maria Brooke just sent Ben a message.',
        'The account is three hours old. The account has one post. The account is Eric.',
      ],
    },
    {
      type: 'walkTo',
      x: 80, y: 330, radius: 100,
      markerLabel: 'Watch the chat',
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The first message is a survey for Richard Montgomery alumni.',
        'The survey ended yesterday. The girl is just here now.',
        'It is the cleanest opening Eric has ever written.',
      ],
    },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        'She opened cold. The pretext did its job and disappeared.',
        'I simply built a person who could exist.',
        'The era of Maria Brooke begins now.',
      ],
    },
    {
      type: 'walkTo',
      x: 800, y: 500, radius: 80,
      markerLabel: "See Ben's phone",
    },
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
    {
      type: 'walkTo',
      x: 80, y: 330, radius: 100,
      markerLabel: 'Back to the chat',
    },
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
        "I feel like that's kind of brave honestly.",
      ],
    },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: 'He sent his face with no caption. The chat is losing it. Ben is a few seats away, looking at his phone.',
      options: [
        {
          text: 'Keep watching the chat',
          reactionSpeaker: 'narrator',
          reactionLines: ['You keep watching the chat. It is very funny. It keeps being funny.'],
        },
        {
          text: 'Look up at Ben',
          sideEffect: 'maria_lookup',
          reactionSpeaker: 'narrator',
          reactionLines: [
            'You look up.',
            'Ben is smiling at his phone the way you smile when someone finally writes back.',
            'You look back down at the chat.',
          ],
        },
      ],
    },
    {
      type: 'walkTo',
      x: 800, y: 500, radius: 80,
      markerLabel: 'See the DMs',
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "Maria drops a name. Ethan Rosner. A junior on Ben's track team.",
        "Ben doesn't know him. She says he's a senior.",
        'The small-world construction is deliberate. She is one degree from real.',
        'Then she mentions her volleyball game Saturday.',
      ],
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Ben has a track meet at RM that day.',
        "He tells her he can't make it.",
        'She responds: "I didn\'t get to see you :("',
        'The fiction has weight now.',
      ],
    },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: '"I didn\'t get to see you :(" Maharko is wheezing. Ben hasn\'t looked up from his phone in a while.',
      options: [
        {
          text: 'Keep watching',
          reactionSpeaker: 'narrator',
          reactionLines: ['You keep watching. The frown does its work.'],
        },
        {
          text: 'Look up at Ben',
          sideEffect: 'maria_lookup',
          reactionSpeaker: 'narrator',
          reactionLines: [
            'You look up.',
            'He is typing something, deleting it, typing it again.',
            'He wants to get the wording right. For her.',
          ],
        },
      ],
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Up until that message it was a bit.',
        'After that message it was something the group had done to someone.',
      ],
    },
    {
      type: 'walkTo',
      x: 80, y: 330, radius: 100,
      markerLabel: 'Watch this',
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "Ben types: wait actually maybe i can skip track.",
        "Ben types: yeah im just gonna go to her game.",
        "Sean is at practice in twenty minutes.",
      ],
    },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: 'Ben just said he\'d skip practice for her. Sean\'s seat is already empty.',
      options: [
        {
          text: 'Keep watching',
          reactionSpeaker: 'narrator',
          reactionLines: ['You keep watching. Somebody types LMFAOOO. It might have been you.'],
        },
        {
          text: 'Look up at Ben',
          sideEffect: 'maria_lookup',
          reactionSpeaker: 'narrator',
          reactionLines: [
            'You look up.',
            'Ben is already packing his bag. He looks happy. He looks like he is going somewhere.',
          ],
        },
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
    {
      type: 'minigame',
      modeId: 'groupChat',
      config: {
        timelineEndsAtMs: 90000,
        finalPromptTimeoutMs: 20000,
        complicityMax: 100,
      },
      introLines: [
        "You're in the chat. You've been in the chat since the first message.",
        "Ben is about to skip track practice for a girl who doesn't exist. Say something, or don't.",
      ],
      background: false,
    },
    {
      // The bit peaks ("LMFAOOO") — then the air leaves the room. The cut holds
      // through the Sean confrontation and never lifts again this chapter.
      type: 'stopAllAudio',
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Ben skipped.',
        "Sean is at practice.",
        'The machine moves on its own schedule.',
      ],
    },
    {
      type: 'changeScene',
      sceneIndex: 1,
      transitionMs: 900,
    },

    // ── SCENE 1 — TRACK (denouement) ─────────────────────────────────────────

    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Track practice. RM.',
        'Two people on the bottom straight.',
        'Sean was in the chat. Sean was laughing.',
        'Sean was laughing right up until it cost something in his world.',
      ],
    },
    {
      type: 'dialogue',
      speaker: 'sean',
      lines: [
        'Bro. The Maria girl.',
        "That's a catfish.",
        "It's Eric. He made the account.",
        'You were about to skip practice for her.',
        "I'm not gonna let you skip practice for a girl that doesn't exist.",
      ],
    },
    {
      type: 'dialogue',
      speaker: 'ben',
      lines: [
        '...',
        'Eric?',
      ],
    },
    {
      type: 'dialogue',
      speaker: 'sean',
      lines: [
        'Yeah.',
        "That's all I got bro. Do what you want with it.",
      ],
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Ben blocks the account.',
        'No message. No confrontation.',
        'The fiction ends on his end with two taps and a closed app.',
      ],
    },
    {
      type: 'changeScene',
      sceneIndex: 0,
      transitionMs: 900,
    },

    // ── SCENE 0 — CLASSROOM (coda) ────────────────────────────────────────────

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
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        'Yo Ben welcome back bro.',
        'Honestly though we missed you man.',
        'Like genuinely. It was weird without you.',
      ],
    },
    {
      type: 'dialogue',
      speaker: 'ben',
      lines: [
        "Yeah I'm good.",
        "Nick F and Jordan are still on some shit though.",
      ],
    },

    // Auto-route based on minigame payload (saidTrueThing + when)
    {
      type: 'routeOnMinigame',
      cases: {
        early: 'coda_early',
        mid:   'coda_mid',
        late:  'coda_late',
      },
      default: 'coda_silent',
    },

    {
      id: 'coda_early',
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'You said something early.',
        "Right after Ben sent his face. Before the volleyball game. Before the frown.",
        'You typed it. You hit send. You broke rank.',
        'Jordan said "wait what." Nick F said "lmao ok." Eric said "stfu."',
        'The chat moved on in eleven seconds.',
        "It didn't change anything. You said it anyway.",
      ],
    },
    {
      id: 'coda_mid',
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'You said something in the middle.',
        "After the frown. Before the final message. When the bit was already bleeding.",
        'Jordan said "bro chill." Maharko said "ur killing the vibe." Eric said "lol ok."',
        'The chat moved on in eight seconds.',
        "It didn't change anything. You said it anyway.",
      ],
    },
    {
      id: 'coda_late',
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'You said something at the end.',
        'After Ben said he was skipping. After the chat filled up with laugh reactions.',
        'Jordan said "...".',
        'Then nothing. The chat went quiet, which was the worst reaction of all.',
        "It didn't change anything. You said it anyway.",
      ],
    },
    {
      id: 'coda_silent',
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'You watched.',
        "That's all.",
      ],
    },

    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'He came back.',
        'Honestly? We missed him.',
      ],
    },
    {
      // Cold complicity report — assembled from what the player actually did this
      // run (mariaBrookeStats, populated by groupChat). Delivers the closing line
      // as an indictment instead of a throwaway narrator aside.
      type: 'minigame',
      modeId: 'complicityReport',
      config: {},
    },
    {
      type: 'endChapter',
    },
  ],
};

export default chapterMariaBrooke;

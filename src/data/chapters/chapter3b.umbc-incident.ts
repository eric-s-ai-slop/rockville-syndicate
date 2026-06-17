import { ChapterConfig } from './types';
import { C } from './palette';

const chapter3b: ChapterConfig = {
  id: 'umbc_incident',
  index: 6,
  title: 'The UMBC Incident',
  subtitle: 'Act III — The Pariah Event',
  location: 'UMBC Frat Basement / Parking Lot at Night',
  description:
    'Ben washes out of LMU, goes to a UMBC frat party with Maharko, and burns his last bridge — while the person who brought him there tells a story that keeps himself out of the ashes.',
  kind: 'chapter',

  map: {
    width: 920,
    height: 660,
    backdrop: C.floorTile,
    theme: 'apartment',
    areaTitle: 'UMBC Frat Basement',
    rects: [
      { x: 460, y: 8,   w: 920, h: 16,  fill: C.wall, solid: true },
      { x: 460, y: 652, w: 920, h: 16,  fill: C.wall, solid: true },
      { x: 8,   y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
      { x: 912, y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
      { x: 870, y: 400, w: 40,  h: 60,  fill: C.door,  propType: 'door',                               solid: false },
    ],
    labels: [],
    playerSpawn: { x: 460, y: 580 },
  },

  actors: [
    { id: 'ben',     x: 120, y: 100 },
    { id: 'maharko', x: 150, y: 480 },
    // Anonymous silhouettes — the tall portrait art is scaled down to NPC height.
    { id: 'girl1',   x: 100, y: 100, nameOverride: '???', spriteKey: 'hero_girl1_raw', spriteScale: 0.06 },
    { id: 'girl2',   x: 800, y: 100, nameOverride: '???', spriteKey: 'hero_girl2_raw', spriteScale: 0.06 },
    { id: 'girl3',   x: 800, y: 500, nameOverride: '???', spriteKey: 'hero_girl3_raw', spriteScale: 0.06 },
    // Frat extras reuse the enemy_frat_bro showcase sheet.
    { id: 'frat1',   x: 700, y: 550, nameOverride: 'Frat Guy', spriteKey: 'enemy_frat_bro_sheet' },
    { id: 'frat2',   x: 800, y: 550, nameOverride: 'Frat Guy', spriteKey: 'enemy_frat_bro_sheet' },
    { id: 'frat3',   x: 750, y: 600, nameOverride: 'Frat Guy', spriteKey: 'enemy_frat_bro_sheet' },
  ],

  scenes: [
    {
      // 'music_umbc_basement' = "Beauty and a Beat" — wire in audio.ts when file is ready
      music: 'music_umbc_basement',
      map: {
        width: 920,
        height: 660,
        backdrop: C.floorTile,
        theme: 'apartment',
        areaTitle: 'UMBC Frat Basement',
        rects: [
          { x: 460, y: 330, w: 920, h: 660, fill: 0x000000, propKey: 'stage_umbc_basement', solid: false },
          { x: 460, y: 8,   w: 920, h: 16,  fill: C.wall, solid: true },
          { x: 460, y: 652, w: 920, h: 16,  fill: C.wall, solid: true },
          { x: 8,   y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
          { x: 912, y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
      { x: 870, y: 400, w: 40,  h: 60,  fill: C.door,  propType: 'door',                               solid: false },
        ],
        labels: [],
        playerSpawn: { x: 460, y: 580 },
      },
      actors: [
        { id: 'ben',     x: 120, y: 100 },
        { id: 'maharko', x: 150, y: 480 },
        // Anonymous silhouettes — the tall portrait art is scaled down to NPC height.
        { id: 'girl1',   x: 100, y: 100, nameOverride: '???', spriteScale: 0.06 },
        { id: 'girl2',   x: 800, y: 100, nameOverride: '???', spriteScale: 0.06 },
        { id: 'girl3',   x: 800, y: 500, nameOverride: '???', spriteScale: 0.06 },
        // Frat extras reuse the enemy_frat_bro showcase sheet.
        { id: 'frat1',   x: 700, y: 550, nameOverride: 'Frat Guy', spriteKey: 'enemy_frat_bro_sheet' },
        { id: 'frat2',   x: 800, y: 550, nameOverride: 'Frat Guy', spriteKey: 'enemy_frat_bro_sheet' },
        { id: 'frat3',   x: 750, y: 600, nameOverride: 'Frat Guy', spriteKey: 'enemy_frat_bro_sheet' },
      ],
    },
    {
      music: 'music_ch2', // Nightcall — Kavinsky; crossfades in on changeScene
      map: {
        width: 920,
        height: 660,
        backdrop: C.floorTile,
        theme: 'suburb_night',
        areaTitle: 'Parking Lot at Night',
        rects: [
          { x: 460, y: 330, w: 920, h: 660, fill: 0x000000, propKey: 'stage_parking_lot_night', solid: false },
          { x: 460, y: 8,   w: 920, h: 16,  fill: C.wall, solid: true },
          { x: 460, y: 652, w: 920, h: 16,  fill: C.wall, solid: true },
          { x: 8,   y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
          { x: 912, y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
          { x: 200, y: 350, w: 180, h: 80,  fill: 0x2d3748, propType: 'car', propKey: 'maharko_camero', solid: true },
        ],
        labels: [],
        playerSpawn: { x: 460, y: 580 },
      },
      actors: [
        { id: 'maharko', x: 460, y: 300 },
        { id: 'eric',    x: 350, y: 250 },
        { id: 'nick_f',  x: 570, y: 250 },
      ],
    },
  ],

  beats: [

    // ── SCENE 0: UMBC FRAT BASEMENT ──────────────────────────────────────────

    // Background mode: drives Ben + Maharko sprite movement throughout scene 0.
    // Restarted after the boss fight so post-boss dialogue can trigger exit tweens.
    { type: 'minigame', modeId: 'basementScene', background: true },

    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The chat was quiet for three days.',
        'Then the news arrived. Ben flunked out.',
        'No one was surprised.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        'The process simply requires participation.',
        "Eric doesn't debate the transcript.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        'I mean.',
        'Saw it coming sophomore year.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Maharko texted him as a fallback.',
        'Nick H was the first choice.',
        'Ben said yes before the message finished loading.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The Audi S5. Travis Scott. The stew in the back.',
        'Ben was performing before they even got there.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The basement smelled like stale beer.',
        '"Beauty and a Beat" on loop.',
        'The girls drifted at the edges.',
      ]
    },
    { type: 'cameraPan', x: 460, y: 280, durationMs: 1200, holdMs: 500 },
    { type: 'walkTo', x: 150, y: 130, radius: 80, markerLabel: 'Find Ben' },
    {
      type: 'dialogue',
      speaker: 'ben',
      lines: [
        'Hey, try this stew I brought.',
        "It's a thing. You'll like it.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Ben moved through the room.',
        'Then the freeze-frame.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'ben',
      lines: [
        "You're next.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Finger over his mouth.',
        'Shhh.',
        'In the background: Maharko. Watching.',
      ]
    },
    {
      type: 'bossFight',
      bossId: 'boss_ben_umbc',
      arena: { x: 460, y: 330, w: 760, h: 520 },
      introLines: [
        'BEN — The Ghost at the Party',
        'Cut through the version of the night he told himself.',
      ]
    },

    // Re-register basementScene so post-boss dialogue triggers exit tweens.
    { type: 'minigame', modeId: 'basementScene', background: true },

    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The frat guys appeared.',
        '"Get your boy and leave."',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'maharko',
      lines: [
        'Bro. Come on.',
        "We're leaving right now.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "Ben left on Maharko's arm.",
        "Travis Scott didn't play on the drive back.",
        'Nobody said anything.',
      ]
    },
    { type: 'changeScene', sceneIndex: 1, transitionMs: 800 },

    // ── SCENE 1: PARKING LOT ─────────────────────────────────────────────────

    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Four days. Ben went dark.',
        'No texts. Not in the group chat.',
        'The group noticed. Nobody named it.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        'Has anyone heard from Ben?',
        "He hasn't responded to anything since Thursday.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        'I called him. Went to voicemail.',
        'Honestly, maybe he just needs some space. Something happened.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        'Something happened.',
        'Maharko knows.',
      ]
    },
    { type: 'walkTo', x: 460, y: 320, radius: 80, markerLabel: 'Find Maharko' },
    {
      type: 'dialogue',
      speaker: 'maharko',
      lines: [
        'Okay. Look.',
        'I need to tell you guys something about UMBC.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        'What happened.',
      ]
    },
    {
      type: 'minigame',
      modeId: 'storyFractures',
      background: false,
      introLines: [
        "MAHARKO'S STORY — The Version He Told",
        'Mark the fractures. The truth is in the details.',
      ],
      config: {
        storySegments: [
          {
            speaker: 'Maharko',
            text: 'So we were at UMBC. Frat party. Ben brought the stew, as usual. He was drinking, having a good time.',
          },
          {
            speaker: 'Maharko',
            text: 'I was over by the speakers, talking to some guys.',
            fractureId: 'location',
            fractureHint: 'Were you?',
          },
          {
            speaker: 'Maharko',
            text: "I saw Ben talking to a couple girls, but I didn't think anything of it.",
            fractureId: 'count',
            fractureHint: 'A couple?',
          },
          {
            speaker: 'Maharko',
            text: 'Next thing I know, some frat guys come up to me and say "get your boy and leave."',
          },
          {
            speaker: 'Maharko',
            text: "I was like, what? I didn't see anything.",
            fractureId: 'blindness',
            fractureHint: 'Nothing?',
          },
          {
            speaker: 'Maharko',
            text: 'They said he was being inappropriate. I had to steer him out. He was drunk, barely walking.',
          },
          {
            speaker: 'Maharko',
            text: "On the drive back, he didn't say much. I didn't know what happened until later.",
            fractureId: 'timing',
            fractureHint: 'Later?',
          },
        ],
        scrollSpeed: 35,
        reviewWindow: 3000,
        allowReplay: true,
        maxAttempts: 3,
      },
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Nick F looked at Eric.',
        'Eric looked at Nick F.',
        'The math was silent: he was close enough to hear that.',
      ]
    },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: "What do you do with the crack in Maharko's story?",
      options: [
        {
          text: '"You heard him say \'you\'re next.\' How close were you standing?"',
          reactionSpeaker: 'maharko',
          reactionLines: [
            'What are you, the police now?',
            'I was at the speakers, bro.',
          ],
        },
        {
          text: '"He actually said that? What the hell."',
          reactionSpeaker: 'nick_f',
          reactionLines: [
            'Yeah. What the hell, Ben.',
          ],
        },
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Ben went quiet after that.',
        'The group let the distance grow.',
        "What Maharko saw — or didn't see — was never asked again.",
      ]
    },
    { type: 'endChapter' },

  ],
};

export default chapter3b;

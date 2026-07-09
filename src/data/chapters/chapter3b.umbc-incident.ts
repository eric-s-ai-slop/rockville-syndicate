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
  classified: true,

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
    { id: 'girl1',   x: 100, y: 100, nameOverride: '???', spriteKey: 'npc_girl_sheet' },
    { id: 'girl2',   x: 800, y: 100, nameOverride: '???', spriteKey: 'npc_girl_sheet' },
    { id: 'girl3',   x: 700, y: 280, nameOverride: '???', spriteKey: 'npc_girl_sheet' },
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
        { id: 'ben',     x: 120, y: 100, spriteKey: 'boss_ben_umbc_sheet' },
        { id: 'maharko', x: 150, y: 480 },
        // Anonymous silhouettes — the tall portrait art is scaled down to NPC height.
        { id: 'girl1',   x: 100, y: 100, nameOverride: '???', spriteKey: 'npc_girl_sheet' },
        { id: 'girl2',   x: 800, y: 100, nameOverride: '???', spriteKey: 'npc_girl_sheet' },
        { id: 'girl3',   x: 700, y: 280, nameOverride: '???', spriteKey: 'npc_girl_sheet' },
        // Frat extras reuse the enemy_frat_bro showcase sheet.
        { id: 'frat1',   x: 700, y: 550, nameOverride: 'Frat Guy', spriteKey: 'enemy_frat_bro_sheet' },
        { id: 'frat2',   x: 800, y: 550, nameOverride: 'Frat Guy', spriteKey: 'enemy_frat_bro_sheet' },
        { id: 'frat3',   x: 750, y: 600, nameOverride: 'Frat Guy', spriteKey: 'enemy_frat_bro_sheet' },
      ],
    },
    {
      music: 'music_ch2', // Nightcall — Kavinsky
      map: {
        width: 920,
        height: 660,
        backdrop: 0x05070a,
        theme: 'highway_night',
        areaTitle: 'Car Interior',
        rects: [],
        labels: [],
        playerSpawn: { x: 460, y: 580 },
      },
      actors: [],
    },
    {
      music: 'music_ch2',
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
      ]
    },
    { type: 'minigame', modeId: 'stewOffering', background: false },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Then the freeze-frame.',
      ]
    },
    { type: 'minigame', modeId: 'fratAggro', background: false },
    {
      type: 'bossFight',
      bossId: 'boss_ben_umbc',
      hideActorId: 'ben',
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

    // ── SCENE 1: CAR INTERIOR ─────────────────────────────────────────────────

    { type: 'minigame', modeId: 'silentDrive', background: false },

    { type: 'changeScene', sceneIndex: 2, transitionMs: 800 },

    // ── SCENE 2: PARKING LOT ─────────────────────────────────────────────────

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
      id: 'story_fractures',
      modeId: 'storyFractures',
      background: false,
      introLines: [
        "MAHARKO'S STORY — The Version He Told",
        'Mark the fractures. The truth is in the details.',
      ],
      config: {
        storySegments: [
          { speaker: 'Maharko', text: "So we got to the UMBC basement party around 11." },
          { speaker: 'Maharko', text: "It was packed. Humid. You couldn't even hear yourself think." },
          { speaker: 'Maharko', text: "Ben brought the stew, like always, and started pouring it strong." },
          { speaker: 'Maharko', text: "I grabbed a cup. Actually, I was pouring some of it out for people too, just to be nice.", fractureId: 'stew_complicity' },
          { speaker: 'Maharko', text: "I was across the room from Ben the whole night.", fractureId: 'location' },
          
          { speaker: 'Maharko', text: "Ben was getting sloppy. Just drifting through the crowd." },
          { speaker: 'Maharko', text: "At one point, I saw him talking to a couple of girls.", fractureId: 'count' },
          { speaker: 'Maharko', text: "I assumed they were into him. I couldn't hear a word they were saying.", fractureId: 'action' },
          
          { speaker: 'Maharko', text: "I was just minding my own business." },
          { speaker: 'Maharko', text: "I had absolutely no idea what was going on until the frat guys grabbed me.", fractureId: 'blindness' },
          
          { speaker: 'Maharko', text: "They said, 'Get your boy and leave.'" },
          { speaker: 'Maharko', text: "I tried to ask what happened, but they just shoved us." },
          
          { speaker: 'Maharko', text: "I had to drag him up the stairs. I was basically saving him." },
          
          { speaker: 'Maharko', text: "We blasted Travis Scott in the car to forget the awkwardness.", fractureId: 'music' },
          { speaker: 'Maharko', text: "I swear to god, I thought he just drank too much." },
          { speaker: 'Maharko', text: "I am completely innocent here. I didn't see him do anything.", fractureId: 'innocence' },
          { speaker: 'Maharko', text: "I didn't actually find out the real reason we got kicked out until the next day.", fractureId: 'timing' },
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

import { ChapterConfig } from './types';
import { C } from './palette';

const chapter4: ChapterConfig = {
  id: 'jungle_gym_gambit',
  index: 4,
  title: 'The Jungle Gym Gambit',
  subtitle: 'Interlude II — The Three Rules',
  location: 'Beall Elementary School, Rockville',
  description:
    'Nick H has a location. He has three rules. He has a 🐔. Jacob claims $3,900 in liquid reserves and absolute immunity to FOMO.',
  kind: 'interlude',
  map: {
    width: 840,
    height: 620,
    backdrop: C.grass,
    theme: 'park',
    areaTitle: 'Beall',
    rects: [
      // park ground / clearing
      { x: 420, y: 310, w: 600, h: 400, fill: 0x1a3d1a },
      // jungle gym structure
      { x: 420, y: 220, w: 140, h: 60, fill: 0x92400e, stroke: 0xd97706, propType: 'junglebox', solid: true },
      { x: 340, y: 250, w: 16, h: 80, fill: 0x92400e, solid: true },
      { x: 500, y: 250, w: 16, h: 80, fill: 0x92400e, solid: true },
      { x: 420, y: 290, w: 140, h: 14, fill: 0xb45309, solid: true },
      // bench
      { x: 600, y: 350, w: 100, h: 24, fill: 0x78350f, stroke: 0x92400e, propType: 'bench', solid: true },
      // extra decor
      { x: 600, y: 300, w: 40, h: 40, fill: 0x14532d, propKey: 'furn_plant_tall' },
      { x: 200, y: 350, w: 40, h: 40, fill: 0x14532d, propKey: 'furn_plant_tall' },
      // trees
      { x: 140, y: 200, w: 60, h: 60, fill: 0x14532d },
      { x: 700, y: 180, w: 60, h: 60, fill: 0x14532d },
      { x: 120, y: 450, w: 60, h: 60, fill: 0x14532d },
      { x: 720, y: 460, w: 60, h: 60, fill: 0x166534 },
      // street behind
      { x: 420, y: 580, w: 840, h: 80, fill: 0x374151 },
      { x: 420, y: 580, w: 840, h: 4, fill: 0xfbbf24 },
      // nick h's tucson (parked)
      { x: 180, y: 560, w: 80, h: 44, fill: 0x1e293b, stroke: 0x4ade80 },
    ],
    labels: [
      { x: 420, y: 80, name: '1202 PRINCETON PLACE', detail: 'The mystery destination', color: '#f59e0b' },
      { x: 420, y: 480, name: 'THE CLEARING', detail: 'Jacob arrived. He has questions.', color: '#c8e89a' },
    ],
    playerSpawn: { x: 420, y: 480 }
  },
  actors: [
    { id: 'nick_h', x: 420, y: 340, understudyId: 'eric' },
    { id: 'jacob', x: 420, y: 420, understudyId: 'maharko' },
  ],
  beats: [
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Nick H has a location. He will not say what it is.',
        'He issues three rules to Jacob Lebby before revealing it.',
        'Rule one: I sit in my seat.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        'Three rules. First: I sit in my seat. No argument.',
        'Second: ??',
        'Third: I smoke whatever you give me.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        "What's rule two?",
        'What is this location? Why are there monkey bars?',
        "I'm 13x liquid and I don't FOMO. I'm not desperate for this.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        '🐔',
        '🐔🐔',
        '🐔🐔🐔🐔🐔',
      ]
    },
    { type: 'walkTo', x: 420, y: 290, radius: 60, markerLabel: 'Climb the jungle gym' },
    { type: 'sfx', key: 'sfx_creak' },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: 'The chicken emojis have been deployed. Jacob\'s FOMO meter is at critical mass. What does he do?',
      options: [
        {
          text: '"Okay FINE. What is this place. Why are we here."',
          reactionSpeaker: 'nick_h',
          reactionLines: [
            "Welcome to 1202 Princeton Place. The Jungle Gym.",
            "Rule two was: don't ask what rule two is. You failed.",
          ]
        },
        {
          text: '"I told you. I am $3,900 liquid. I don\'t need this."',
          ledgerDelta: 0,
          reactionSpeaker: 'nick_h',
          reactionLines: [
            '🐔🐔🐔🐔🐔🐔🐔🐔',
            "You drove here, Jacob. You're standing on the jungle gym.",
          ],
          goto: 'jacob_stalls'
        },
        {
          text: '"Is Audrey going to be here?"',
          reactionSpeaker: 'nick_h',
          reactionLines: [
            "She lives in Canada, Jacob.",
            "She has a boyfriend. 🐔",
          ]
        },
      ]
    },
    {
      id: 'converge',
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'I drove an hour for a JUNGLE GYM.',
        "Why didn't you just TELL me what this was.",
        "...Fine. I'm sitting. What are we smoking.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        "Loooove it here. Loooooove UMD.",
        "The Chicken Barrage wins every time.",
        "By the way — we're not giving you rule two.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The jungle gym session lasted two hours.',
        "Jacob's $3,900 in liquid reserves remained undeployed.",
        "The chicken emoji has a 100% conversion rate on Jacob. It has never failed.",
      ]
    },
    { type: 'endChapter' },

    // ── "I'm 13x liquid" branch — placed after endChapter (unreachable by
    // fall-through), reached via the choice's goto; converges back below. ──────
    {
      id: 'jacob_stalls',
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        "Actually, you know what, I'm walking back to my car.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        '🐔🐔🐔🐔🐔🐔🐔🐔🐔🐔🐔🐔',
        "The car's locked. I have the keys. Sit.",
      ]
    },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: 'Jacob weighs his options.',
      options: [
        { text: '(Concede.)', goto: 'converge' }
      ]
    },
  ]
};

export default chapter4;

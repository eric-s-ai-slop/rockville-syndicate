import { ChapterConfig } from './types';
import { C } from './palette';

const chapter5: ChapterConfig = {
  id: 'florida_highway_duel',
  index: 5,
  title: 'The Florida Highway Duel',
  subtitle: 'Act III — The Puppetmaster and the Camaro',
  location: 'Boca Raton, FL',
  description:
    "Jordan holds shadow admin privileges over Maharko. Maharko's SOL dropped 40%. Jordan's 5.0 Mustang is in the parking lot. This ends one way.",
  kind: 'chapter',
  map: {
    width: 960,
    height: 640,
    backdrop: 0x111827,
    theme: 'florida',
    areaTitle: 'Boca Raton, Florida',
    rects: [
      // main highway (horizontal)
      { x: 480, y: 320, w: 960, h: 200, fill: 0x1c1c1c },
      { x: 480, y: 320, w: 960, h: 4, fill: 0xfbbf24 },
      // road lanes
      { x: 480, y: 270, w: 960, h: 4, fill: 0xffffff },
      { x: 480, y: 370, w: 960, h: 4, fill: 0xffffff },
      // Meat Market building (left side)
      { x: 140, y: 170, w: 220, h: 180, fill: 0x1e293b, stroke: 0xf59e0b, solid: true },
      { x: 140, y: 120, w: 220, h: 40, fill: 0xb45309 },
      // parking lot
      { x: 140, y: 490, w: 260, h: 120, fill: 0x374151 },
      { x: 140, y: 490, w: 260, h: 4, fill: 0x6b7280 },
      // Jordan's 5.0 Mustang (red)
      { x: 140, y: 510, w: 90, h: 50, fill: 0x991b1b, stroke: 0xef4444, propType: 'car', propKey: 'prop_jordan_mustang' },
      // Maharko's Camaro (black)
      { x: 280, y: 510, w: 90, h: 50, fill: 0x111827, stroke: 0x22d3ee, propType: 'car', propKey: 'prop_maharko_camero' },
      // palm trees
      { x: 700, y: 170, w: 24, h: 100, fill: 0x92400e },
      { x: 700, y: 120, w: 50, h: 50, fill: 0x14532d },
      { x: 820, y: 180, w: 24, h: 100, fill: 0x92400e },
      { x: 820, y: 130, w: 50, h: 50, fill: 0x166534 },
      // Boca skyline (background rects)
      { x: 750, y: 200, w: 80, h: 160, fill: 0x1e3a5f, stroke: 0x3b82f6 },
      { x: 850, y: 180, w: 60, h: 180, fill: 0x1e3a5f, stroke: 0x3b82f6 },
      // guardrails
      { x: 480, y: 230, w: 960, h: 8, fill: 0x4b5563, stroke: 0x9ca3af, propType: 'guardrail' },
      { x: 480, y: 410, w: 960, h: 8, fill: 0x4b5563, stroke: 0x9ca3af, propType: 'guardrail' },
    ],
    labels: [
      { x: 480, y: 80, name: 'BOCA RATON, FL', detail: 'Jordan\'s dominion', color: '#22d3ee' },
      { x: 480, y: 560, name: 'THE HIGHWAY', detail: 'Mustang always wins first turn', color: '#ef4444' },
      { x: 140, y: 80, name: 'MEAT MARKET', detail: 'Jordan absorbs 15% of your Aura here', color: '#f59e0b' },
    ],
    playerSpawn: { x: 480, y: 490 }
  },
  actors: [
    { id: 'jordan', x: 250, y: 440, understudyId: 'nick_f' },
    { id: 'maharko', x: 380, y: 440, understudyId: 'jacob' },
  ],
  beats: [
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Boca Raton, Florida. Maharko moved here specifically because of Jordan.',
        "He broke up with his girlfriend Nelly and Jordan's gravity did the rest.",
        "He drops his Meat Market paycheck into $SOL. Market crashes 40% in 6 hours.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'maharko',
      lines: [
        "JORDAN I'M DOWN BAD. SOL JUST CRASHED. I PUT IN MY WHOLE CHECK.",
        "Let's take the Camaro to Miami. I need to clear my head.",
        "I have headers coming. Once I get headers this car will—",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jordan',
      lines: [
        "No. We're not going to Miami.",
        "We're going to the 5.0 spot. Get in.",
        "And I'm not paying for your gas.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'maharko',
      lines: [
        "But I literally just — you know what, you're right. The 5.0 spot.",
        "Wait... was going to the 5.0 spot MY idea? Did I suggest this?",
        "I feel like I suggested this.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Jordan did not suggest the 5.0 spot. Maharko did not suggest the 5.0 spot.',
        "Jordan used an Inception dialogue tree. Maharko now believes the plan was his.",
        "The Mustang pulls out of the Meat Market parking lot. The Camaro follows.",
      ]
    },
    { type: 'cameraPan', x: 480, y: 320, durationMs: 2000, holdMs: 1000 },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'On the highway: Jordan revs the 5.0.',
        "Crowd control. The parking lot disperses. Absolute dominance.",
        "Maharko decides to race. The Camaro does not win.",
      ]
    },
    {
      type: 'bossFight',
      bossId: 'boss_florida',
      arena: { x: 480, y: 320, w: 900, h: 180 },
      introLines: [
        'JORDAN DIVBAND — The Puppetmaster',
        "5.0 Mustang. First-turn win guaranteed. Prove the storyboard wrong.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'maharko',
      lines: [
        "Bro you GAPPED me.",
        "That was not fair. You had a run on me.",
        "Just wait until I get headers. JUST WAIT UNTIL I GET HEADERS.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jordan',
      lines: [
        "Maharko. You don't need headers.",
        "You need to stop putting your paycheck in crypto.",
        "Also you owe me $40 for dinner.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The headers never arrived.',
        "Jordan siphoned 15% of Maharko's Aura across the evening.",
        "Maharko believes every decision he made tonight was his own.",
      ]
    },
    { type: 'endChapter' },
  ]
};

export default chapter5;

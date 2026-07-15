import { ChapterConfig } from './types';
import { C } from './palette';

const chapter7: ChapterConfig = {
  id: 'spain_betrayal',
  index: 8,
  title: 'The Spain Betrayal',
  subtitle: 'Act V — The Agent Buyback',
  location: 'Commons 1522 (Group Chat)',
  description:
    "Nick F collected $273.28 from everyone. The Cabin was booked. Then: a Zelle notification, a one-way ticket, and a message that changed everything.",
  kind: 'chapter',
  estimatedMinutes: { min: 3, max: 5 },
  map: {
    width: 900,
    height: 640,
    backdrop: C.floorWood,
    theme: 'apartment',
    areaTitle: 'Commons Apartment 1522',
    rects: [
      // apartment walls (same as ch1)
      { x: 450, y: 16, w: 884, h: 16, fill: C.wall, solid: true },
      { x: 450, y: 624, w: 884, h: 16, fill: C.wall, solid: true },
      { x: 16, y: 320, w: 16, h: 628, fill: C.wall, solid: true },
      { x: 884, y: 320, w: 16, h: 628, fill: C.wall, solid: true },
      // rug
      { x: 450, y: 380, w: 360, h: 220, fill: C.rug, propType: 'rug', propKey: 'furn_rug_large' },
      // couch
      { x: 450, y: 300, w: 200, h: 40, fill: C.couch, stroke: 0xef4444, propType: 'couch', solid: true, propKey: 'furn_couch_long' },
      // Nick F's "Cabin Budget" spreadsheet (desk)
      { x: 160, y: 160, w: 180, h: 60, fill: C.desk, stroke: 0x64748b, propType: 'desk', solid: true, propKey: 'furn_desk' },
      // TV showing Spain flight
      { x: 450, y: 240, w: 140, h: 26, fill: C.tv, stroke: 0xef4444, propType: 'tv' },
      // Google Doc printout table
      { x: 710, y: 200, w: 200, h: 120, fill: 0x1e3a5f, stroke: 0x3b82f6, propType: 'desk', solid: true, propKey: 'furn_desk' },
      // Zelle notification (glowing)
      { x: 160, y: 320, w: 180, h: 60, fill: 0x0f2a1e, stroke: 0x22c55e },
      // front door
      { x: 450, y: 614, w: 60, h: 18, fill: C.door, stroke: 0x92400e, propType: 'door' },
      // extra decor
      { x: 60, y: 200, w: 40, h: 80, fill: C.rug, propKey: 'furn_bookshelf' },
      { x: 80, y: 400, w: 40, h: 40, fill: C.rug, propKey: 'furn_plant_tall' },
      { x: 840, y: 400, w: 40, h: 40, fill: C.rug, propKey: 'furn_plant_tall' },
      { x: 710, y: 160, w: 40, h: 40, fill: C.rug, propKey: 'furn_chair' },
      { x: 710, y: 240, w: 40, h: 40, fill: C.rug, propKey: 'furn_chair' },
      { x: 160, y: 200, w: 40, h: 40, fill: C.rug, propKey: 'furn_chair' },
    ],
    labels: [
      { x: 160, y: 110, name: 'THE EVIDENCE WALL', detail: 'All receipts. All Zelles.', color: '#22c55e' },
      { x: 710, y: 140, name: "NICK F'S GOOGLE DOC", detail: 'Option H: Basye, VA — chosen', color: '#3b82f6' },
      { x: 450, y: 550, name: 'THE GREAT BETRAYAL', detail: 'Apartment 1522', color: '#ef4444' },
    ],
    playerSpawn: { x: 450, y: 500 }
  },
  actors: [
    { id: 'nick_f', x: 300, y: 400, understudyId: 'nick_h' },
    { id: 'maharko', x: 550, y: 420, understudyId: 'jacob' },
    { id: 'jordan', x: 650, y: 380, understudyId: 'nick_h' },
    { id: 'eric', x: 160, y: 240, understudyId: 'jacob' },
  ],
  beats: [
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "The cabin was real. Nick F built a 9-option Google Doc.",
        "Option H: Basye, VA. Four bedrooms, hot tub, firepit, arcade. $273.28 per person.",
        "He collected the money. All eight shares. Via Zelle.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        "So... I have a situation.",
        "Emily is in Spain. I should go visit. It's actually an International Business trip.",
        "The cabin... is going to have to wait.",
      ]
    },
    { type: 'ledger', delta: 273.28, note: "Nick F's Cabin Fund — now stranded in Spain" },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        'You collected $273.28 from eight people.',
        '$2,186.24 total. You have a flight to Ibiza booked.',
        'The refund will arrive when, exactly?',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        "I'll process it when I land. It's just a quick trip.",
        "Besides, I already found a new date for the cabin. August.",
        "Trust the process.",
      ]
    },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: 'Eric initiates the Agent Buyback. Choose your counter-attack.',
      options: [
        {
          text: 'Present forensic Zelle receipts. Demand refund in 24 hours.',
          reactionSpeaker: 'nick_f',
          reactionLines: [
            "I'll get to it. I'm in the boarding lounge.",
            "The money is not lost. It's invested in morale.",
          ]
        },
        {
          text: 'Threaten a Japan trip with the Boca Syndicate.',
          reactionSpeaker: 'nick_f',
          reactionLines: [
            "You're going to Japan? Really.",
            "...Okay I'll process the refunds.",
          ]
        },
        {
          text: 'Cast Infinite Deferral. Accept August. Move on.',
          ledgerDelta: -273.28,
          reactionSpeaker: 'maharko',
          reactionLines: [
            "We are NOT accepting August.",
            "We paid. We want the cabin. RIGHT NOW.",
          ]
        },
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jordan',
      lines: [
        'Nick. The math is irrefutable. Eight payments. Eight refunds owed.',
        'The Japan threat is a bluff and you know it.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        "You know what? Fine. FINE.",
        "You want the cabin? We're doing the cabin. NEW DATE. LOCKED IN.",
        "Now somebody needs to stop me before I spend this on phonk speakers.",
      ]
    },
    {
      type: 'bossFight',
      bossId: 'boss_nick_f',
      arena: { x: 450, y: 350, w: 860, h: 560 },
      introLines: [
        'NICK FARRAR — The Kinetic Warlord',
        'Defeat him before he books a second flight.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        "Okay. Refunds processing. 3-5 business decades.",
        "The cabin is August. Basye, VA. Hot tub. Arcade. Firepit.",
        "This was always the plan. I never left.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "The Infinite Deferral spell was cast anyway.",
        "The $273.28 remained in Nick F's inventory until May 15, 2026.",
        "On that day: 'WE IN THERE. THE CABIN IS SAVED.'",
      ]
    },
    { type: 'endChapter' },
  ]
};

export default chapter7;

import { ChapterConfig } from './types';
import { C } from './palette';

const chapter1: ChapterConfig = {
  id: 'spotify_insurgency',
  index: 1,
  deployment: 'shipping',
  title: 'The Spotify Family Insurgency',
  subtitle: 'Act I — The Extortion Crisis',
  location: 'Commons Apartment 1522',
  description:
    'Eric charges $4.50 a month for a Spotify Family plan that costs $3.33. Jordan has the math. Tonight, the ledger gets audited.',
  kind: 'chapter',
  estimatedMinutes: { min: 1, max: 3 },
  map: {
    width: 920,
    height: 660,
    backdrop: C.floorWood,
    theme: 'apartment',
    areaTitle: 'Commons Apartment 1522',
    rects: [
      // outer apartment shell
      { x: 460, y: 16, w: 880, h: 16, fill: C.wall, solid: true },
      { x: 460, y: 644, w: 880, h: 16, fill: C.wall, solid: true },
      { x: 16, y: 330, w: 16, h: 640, fill: C.wall, solid: true },
      { x: 904, y: 330, w: 16, h: 640, fill: C.wall, solid: true },
      // living-room rug
      { x: 460, y: 380, w: 320, h: 200, fill: C.rug, propType: 'rug', propKey: 'furn_rug_large' },
      // couch (top of living room)
      { x: 460, y: 300, w: 180, h: 40, fill: C.couch, stroke: 0xef4444, propType: 'couch', solid: true, propKey: 'furn_couch_long' },
      // TV (Heated Rivalry)
      { x: 460, y: 250, w: 120, h: 24, fill: C.tv, stroke: 0x8d6e63, propType: 'tv' },
      { x: 460, y: 250, w: 120, h: 24, fill: C.tv, stroke: 0x8d6e63, propKey: 'furn_cabinet_tall' },
      // Eric's command desk (top-left)
      { x: 180, y: 150, w: 140, h: 50, fill: C.desk, stroke: 0x64748b, propType: 'desk', solid: true, propKey: 'furn_desk' },
      { x: 180, y: 190, w: 40, h: 40, fill: C.desk, stroke: 0x64748b, propKey: 'furn_chair' },
      // kitchen counter + sink (top-right)
      { x: 720, y: 150, w: 150, h: 44, fill: C.counter, stroke: 0x94a3b8, propType: 'counter', solid: true },
      { x: 760, y: 150, w: 48, h: 36, fill: C.sink, stroke: 0x38bdf8, propType: 'sink' },
      // fridge
      { x: 860, y: 150, w: 40, h: 60, fill: C.fridge, stroke: 0x94a3b8, propType: 'fridge', solid: true },
      // front door (bottom center)
      { x: 460, y: 636, w: 60, h: 18, fill: C.door, stroke: 0x92400e, propType: 'door' },
      // Extra decor
      { x: 60, y: 400, w: 40, h: 80, fill: C.rug, propKey: 'furn_bookshelf' },
      { x: 80, y: 150, w: 40, h: 40, fill: C.rug, propKey: 'furn_plant_tall' },
      { x: 460, y: 360, w: 60, h: 40, fill: C.rug, propKey: 'furn_coffee_table' },
    ],
    labels: [
      { x: 250, y: 110, name: 'THE COMMAND DESK', detail: "Eric's Spotify throne", color: '#818cf8' },
      { x: 795, y: 110, name: 'THE KITCHEN', detail: '25 forks, 0 clean', color: '#38bdf8' },
      { x: 620, y: 600, name: 'LIVING ROOM', detail: 'Apartment 1522', color: '#c8e89a' },
    ],
    playerSpawn: { x: 460, y: 560 }
  },
  actors: [
    { id: 'eric', x: 250, y: 215, understudyId: 'nick_f' },
    { id: 'jordan', x: 600, y: 430, understudyId: 'maharko' },
    { id: 'nick_h', x: 520, y: 330, nameOverride: 'Nick H (asleep)', understudyId: 'jacob' },
  ],
  beats: [
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Apartment 1522. The dishes are a public-health emergency. The Spotify situation is worse.',
        'Eric charges everyone $4.50 a month for the Family plan. Jordan has been doing math.',
        'Walk over to Jordan. He has something to show you.',
      ]
    },
    { type: 'sfx', key: 'sfx_door_close' },
    { type: 'walkTo', x: 600, y: 460, radius: 70, markerLabel: 'Talk to Jordan' },
    {
      type: 'dialogue',
      speaker: 'jordan',
      lines: [
        'I ran the numbers. The plan is $20 a month, split six ways. That is $3.33 per person.',
        "Eric charges $4.50. That's a 35% markup on a streaming service he didn't build.",
        'I posted the forensic ledger in the GC. Everyone saw it. He went offline for two hours.',
      ]
    },
    { type: 'ledger', delta: 4.5, note: 'Spotify overcharge (per month)' },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: ['Eric is at the Command Desk. Time to confront the Admin himself.']
    },
    { type: 'walkTo', x: 250, y: 270, radius: 70, markerLabel: 'Confront Eric' },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        'So yes — I charge $4.50 for Spotify. The plan costs $3.33. I am aware of the discrepancy.',
        "I don't debate spreadsheets. You cannot gaslight a calculator.",
        'I simply blamed Joe Biden for inflation and moved on. The $4.50 era continues.',
      ]
    },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: 'How do you open the audit?',
      options: [
        {
          text: 'Present the forensic ledger: $20 ÷ 6 = $3.33.',
          reactionSpeaker: 'eric',
          reactionLines: ['That number means nothing to me. THE MATH IS EMOTIONAL.']
        },
        {
          text: 'Just Zelle him the $4.50 and keep the peace.',
          ledgerDelta: 4.5,
          reactionSpeaker: 'eric',
          reactionLines: ['Smart. A subscriber who understands their place. Pleasure doing business.']
        },
        {
          text: 'Threaten to switch everyone to Apple Music Lossless.',
          reactionSpeaker: 'eric',
          reactionLines: ['You wouldn\'t. The Dolby Atmos is a bluff. ...Is it a bluff?']
        },
      ]
    },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: ['Fine. You want to audit me? Then audit me. I AM THE AUDIT.']
    },
    {
      type: 'bossFight',
      bossId: 'boss_eric',
      arena: { x: 460, y: 360, w: 760, h: 520 },
      introLines: ['Eric Huang — The Spotify Insurgent', 'Land the audit. Deplete his BIQ.']
    },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        'FINE. FINE. You get nothing. I\'m migrating everyone to Apple Music out of spite.',
        '...The refund will process in 3-5 business decades.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: ['The $4.50 era is over. The ledger remembers. One down.']
    },
    { type: 'endChapter' },
  ]
};

export default chapter1;

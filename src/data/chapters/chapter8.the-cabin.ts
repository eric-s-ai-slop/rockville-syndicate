import { ChapterConfig } from './types';
import { C } from './palette';

const chapter8: ChapterConfig = {
  id: 'cabin_basye',
  index: 9,
  deployment: 'shipping',
  title: 'The Cabin',
  subtitle: 'Epilogue — ARE YOU 291 LIQUID?',
  location: 'Basye, Virginia',
  description:
    "The cabin survived Spain. Four bedrooms. Hot tub. Arcade. Firepit. $273.28 per person. The Bed Draft awaits. The Syndicate is whole.",
  kind: 'epilogue',
  estimatedMinutes: { min: 5, max: 8 },
  map: {
    width: 960,
    height: 700,
    backdrop: 0x2d1a0a,
    theme: 'cabin',
    areaTitle: 'Basye, Virginia',
    rects: [
      // cabin exterior walls
      { x: 480, y: 16, w: 944, h: 16, fill: 0x5c3d1e, solid: true },
      { x: 480, y: 684, w: 944, h: 16, fill: 0x5c3d1e, solid: true },
      { x: 16, y: 350, w: 16, h: 700, fill: 0x5c3d1e, solid: true },
      { x: 944, y: 350, w: 16, h: 700, fill: 0x5c3d1e, solid: true },
      // main cabin floor (wood)
      { x: 480, y: 350, w: 920, h: 660, fill: 0x3a2210 },
      // BEDROOM A (top-left — best bed)
      { x: 170, y: 160, w: 260, h: 200, fill: 0x4a2e14, stroke: 0xd97706 },
      { x: 170, y: 160, w: 160, h: 80, fill: 0xffffff, stroke: 0x9ca3af, propType: 'bed', solid: true, propKey: 'furn_bed_double' },
      { x: 70, y: 160, w: 40, h: 40, fill: 0xffffff, stroke: 0x9ca3af, propKey: 'furn_nightstand' },
      { x: 270, y: 160, w: 40, h: 40, fill: 0xffffff, stroke: 0x9ca3af, propKey: 'furn_nightstand' },
      // BEDROOM B (top-right — second best)
      { x: 790, y: 160, w: 260, h: 200, fill: 0x4a2e14, stroke: 0xb45309 },
      { x: 790, y: 160, w: 160, h: 80, fill: 0xfafafa, stroke: 0x9ca3af, propType: 'bed', solid: true, propKey: 'furn_bed_double' },
      { x: 690, y: 160, w: 40, h: 40, fill: 0xffffff, stroke: 0x9ca3af, propKey: 'furn_nightstand' },
      { x: 890, y: 160, w: 40, h: 40, fill: 0xffffff, stroke: 0x9ca3af, propKey: 'furn_nightstand' },
      // BEDROOM C (mid-right)
      { x: 790, y: 400, w: 260, h: 160, fill: 0x3d2210, stroke: 0x78350f },
      { x: 790, y: 400, w: 140, h: 70, fill: 0xe2e8f0, stroke: 0x9ca3af, propType: 'bed', propKey: 'furn_bed_single' },
      { x: 700, y: 400, w: 40, h: 40, fill: 0xffffff, stroke: 0x9ca3af, propKey: 'furn_nightstand' },
      // BEDROOM D — the bad bed (share)
      { x: 170, y: 400, w: 260, h: 160, fill: 0x2d1a08, stroke: 0x78350f },
      { x: 170, y: 400, w: 220, h: 60, fill: 0xd1d5db, stroke: 0x9ca3af, propType: 'bed', solid: true, propKey: 'furn_bed_double' },
      { x: 40, y: 400, w: 40, h: 40, fill: 0xffffff, stroke: 0x9ca3af, propKey: 'furn_nightstand' },
      // Living room / common area
      { x: 480, y: 350, w: 300, h: 180, fill: 0x3d2210, propType: 'rug', propKey: 'furn_rug_large' },
      { x: 480, y: 300, w: 160, h: 44, fill: 0x111827, stroke: 0x8d6e63, propType: 'tv' },
      { x: 480, y: 300, w: 160, h: 44, fill: 0x111827, stroke: 0x8d6e63, propKey: 'furn_cabinet_tall' },
      { x: 480, y: 360, w: 120, h: 36, fill: C.couch, stroke: 0xb45309, propType: 'couch', solid: true, propKey: 'furn_couch' },
      // Extra decor living room
      { x: 480, y: 420, w: 40, h: 40, fill: C.couch, propKey: 'furn_plant_tall' },
      { x: 380, y: 360, w: 40, h: 40, fill: C.couch, propKey: 'furn_plant_tall' },
      { x: 580, y: 360, w: 40, h: 40, fill: C.couch, propKey: 'furn_plant_tall' },
      { x: 60, y: 100, w: 40, h: 40, fill: C.couch, propKey: 'furn_wardrobe' },
      { x: 900, y: 100, w: 40, h: 40, fill: C.couch, propKey: 'furn_wardrobe' },
      // hot tub (bottom center)
      { x: 480, y: 580, w: 160, h: 100, fill: 0x0369a1, stroke: 0x38bdf8, propType: 'hottub' },
      { x: 480, y: 580, w: 144, h: 84, fill: 0x0284c7, stroke: 0x7dd3fc },
      // firepit (outside, bottom)
      { x: 480, y: 660, w: 80, h: 80, fill: 0x7c2d12, stroke: 0xef4444, propType: 'firepit' },
      // arcade machine
      { x: 750, y: 560, w: 60, h: 80, fill: 0x1e1b4b, stroke: 0x818cf8, propType: 'arcade' },
      // kitchen / food area
      { x: 210, y: 580, w: 160, h: 80, fill: C.counter, stroke: 0x94a3b8, propType: 'counter', solid: true },
      // front door (entry)
      { x: 480, y: 676, w: 70, h: 18, fill: C.door, stroke: 0x92400e, propType: 'door' },
    ],
    labels: [
      { x: 170, y: 80, name: 'BEDROOM A', detail: 'First one in gets it', color: '#d97706' },
      { x: 790, y: 80, name: 'BEDROOM B', detail: 'Second place', color: '#b45309' },
      { x: 170, y: 350, name: 'BEDROOM D', detail: 'Worst smelling person sleeps here', color: '#6b7280' },
      { x: 480, y: 200, name: 'BASYE, VA — THE CABIN', detail: 'Option H. $273.28 per head.', color: '#c8e89a' },
    ],
    playerSpawn: { x: 480, y: 620 }
  },
  actors: [
    { id: 'nick_f', x: 340, y: 380 },
    { id: 'nick_h', x: 560, y: 380 },
    { id: 'jacob', x: 480, y: 450 },
    { id: 'jordan', x: 680, y: 420 },
    { id: 'maharko', x: 300, y: 450 },
    { id: 'eric', x: 630, y: 350 },
  ],
  beats: [
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "May 15, 2026. Nick F drops a message.",
        '"WE IN THERE. THE CABIN IS SAVED." — Nick Farrar, 11:43 PM.',
        "Basye, Virginia. Four bedrooms. Arcade. Hot tub. Firepit. The Syndicate is whole.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        "WELCOME TO THE CABIN. Option H. The dream.",
        "Rules: No solo grocery shopping. (Jordan, I'm looking at you.)",
        "And before ANYONE picks a bed —",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        "ARE YOU 291 LIQUID?",
      ]
    },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: "Nick F's gatekeeping check. Are you 291 liquid? Answer truthfully.",
      options: [
        {
          text: '"I\'m 13x that." — Jacob',
          reactionSpeaker: 'eric',
          reactionLines: [
            'Jacob. 291 liquid means willing to spend, not capacity to spend.',
            'You have $3,900 and have not deployed a dollar of it since 2023.',
          ]
        },
        {
          text: '"I check my brokerage..." — Eric',
          reactionSpeaker: 'eric',
          reactionLines: [
            "I have $250. Someone front me $40.",
            "I will repay it in 3-5 business decades.",
          ]
        },
        {
          text: '"Dolby Atmos. Lossless Audio. Let\'s go." — Nick F',
          reactionSpeaker: 'nick_h',
          reactionLines: [
            "Nobody asked about Apple Music.",
            "Put on the Ultraphonk and let's do the Bed Draft.",
          ]
        },
      ]
    },
    { type: 'ledger', delta: 273.28, note: 'Cabin entry fee — Basye, VA' },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "The Bed Draft. Free-for-all. First to reach a bed claims it.",
        "The loser shares a bed with the worst-smelling party member.",
        "On your mark.",
      ]
    },
    { type: 'walkTo', x: 170, y: 160, radius: 80, markerLabel: '🏆 CLAIM BED A' },
    { type: 'sfx', key: 'sfx_creak' },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        "BED A. KING SIZE. CLAIMED.",
        "Wait, I got here first. This is mine. MINE.",
        "The Bed Draft protocol is clear. First in, first served.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        "I was HERE first. I had my hand on the post.",
        "Sub-Zero does not share a bed. I have standards.",
        "I WILL pay the Jacob Tax if that's what it takes.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        "I love it here. Loooove Basye, VA.",
        "I claimed Bed C. I'm going to sleep at 10 PM and nobody can stop me.",
        "The Sleep Goblin has found his lair.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "It is 3:00 AM. The Ultraphonk playlist is active.",
        '"Y\'all already weren\'t gonna be allowed to sleep. Now NO one is sleeping. ALL 4 days."',
        "Eric and Alex have locked in Hyperphonk.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        "Nobody is sleeping. That's the new rule.",
        "The Hyperphonk doesn't stop until we figure out who took the last of the blueberry pancakes.",
        "Nick F. It was Nick F. He bought $300 in S'mores and nothing else.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        "The S'mores were a COMMUNAL investment.",
        "And for the record, the salmon was for everyone.",
        "The Grocery Raid Ban is discriminatory and I'm appealing it.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'maharko',
      lines: [
        "I haven't eaten since we got here.",
        "Jordan ate my food. I know he did. I just can't prove it.",
        "Also the hot tub hits different at 3AM.",
      ]
    },
    { type: 'sfx', key: 'sfx_creak' },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: "The final night. The group is whole. The cabin is real. How does it end?",
      options: [
        {
          text: 'Hot tub. Firepit. Phonk until dawn. This is what it was always about.',
          reactionSpeaker: 'narrator',
          reactionLines: [
            "The Syndicate gathered at the firepit at 4:17 AM.",
            "Nobody talked about girls. Nobody talked about money.",
            "They just existed. The Physics of Friendship — in equilibrium.",
            "Rockville. UMD. Shepherd. Boca. Spain. The highway at 2AM.",
            "The Spotify overcharge. The red pee. The $100 at Baltimore. The video Jordan sent to Ben.",
            "All of it. All of them. Here. At the firepit. 4:17 AM. Basye, Virginia.",
          ],
          goto: 'finale'
        },
        {
          text: 'Jacob calls his $1,500 bet on Audrey. Audrey does not pick up.',
          reactionSpeaker: 'jacob',
          reactionLines: [
            "She'll text back. The 10-year plan is on track.",
            "Sub-Zero doesn't chase. Sub-Zero WAITS.",
            "...I'm going to text her again.",
            "Jacob texted Audrey at 4:19 AM from the cabin hot tub.",
            "She responded three months later with 'lol'.",
            "The $1,500 contract remains active. 8 years, 3 months remain.",
          ],
          goto: 'finale'
        },
        {
          text: 'Deploy the Decades Schism. Where does the Syndicate go from here?',
          ledgerDelta: 0,
          reactionSpeaker: 'eric',
          reactionLines: [
            "I can't. And I'm not going to decades. ts is buns.",
            "...I'm leaving the chat.",
            "Eric left the chat at 4:22 AM.",
            "He rejoined at 4:23 AM and said 'goodnight.'",
            "The Syndicate endures.",
          ],
          goto: 'finale'
        },
      ]
    },
    {
      id: 'finale',
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "The true villain was never Ben.",
        "It was never Ticketmaster, or Eric's Spotify margin, or Audrey's boyfriend.",
        "The villain was Inertia. And tonight, Inertia lost.",
      ]
    },
    { type: 'endChapter' },
  ]
};

export default chapter8;

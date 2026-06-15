import { ChapterConfig } from './types';
import { C } from './palette';

const chapter2: ChapterConfig = {
  id: 'nyc_1am_drive',
  index: 2,
  title: 'Operation Inertia',
  subtitle: 'Interlude I — The Baltimore Checkpoint',
  location: 'I-95 Northbound',
  description:
    'Nick F calls WTM at 1:00 AM. Destination: New York City. Jacob invests $100. Everything dissolves at the Baltimore toll.',
  kind: 'interlude',
  map: {
    width: 880,
    height: 620,
    backdrop: 0x060b14,
    theme: 'highway_night',
    areaTitle: 'I-95 Northbound',
    rects: [
      // highway road (vertical, center)
      { x: 440, y: 310, w: 180, h: 580, fill: 0x1c1c1c },
      { x: 440, y: 310, w: 4, h: 580, fill: 0xfbbf24 },
      // road lanes dashes
      { x: 380, y: 100, w: 4, h: 60, fill: 0xffffff },
      { x: 380, y: 250, w: 4, h: 60, fill: 0xffffff },
      { x: 380, y: 400, w: 4, h: 60, fill: 0xffffff },
      { x: 500, y: 100, w: 4, h: 60, fill: 0xffffff },
      { x: 500, y: 250, w: 4, h: 60, fill: 0xffffff },
      { x: 500, y: 400, w: 4, h: 60, fill: 0xffffff },
      // tollbooth — Baltimore checkpoint
      { x: 440, y: 200, w: 200, h: 50, fill: 0x374151, stroke: 0xf59e0b, propType: 'tollbooth', solid: true },
      // Nick F's C55 AMG (top of road)
      { x: 440, y: 320, w: 60, h: 90, fill: 0x111827, stroke: 0xf59e0b, propType: 'car', propKey: 'prop_nick_f_corolla' },
      { x: 440, y: 320, w: 50, h: 30, fill: 0x1e3a5f },
      // shoulder grass
      { x: 160, y: 310, w: 260, h: 620, fill: 0x0d2010 },
      { x: 720, y: 310, w: 260, h: 620, fill: 0x0d2010 },
      // trees on shoulder
      { x: 100, y: 200, w: 40, h: 40, fill: 0x14532d },
      { x: 200, y: 380, w: 40, h: 40, fill: 0x166534 },
      { x: 760, y: 180, w: 40, h: 40, fill: 0x14532d },
      { x: 820, y: 400, w: 40, h: 40, fill: 0x166534 },
      // barrier arm + cones at the toll line (non-solid decor)
      { x: 440, y: 225, w: 150, h: 20, fill: 0xdc2626, propType: 'barrier_arm' },
      { x: 370, y: 225, w: 20, h: 30, fill: 0xf97316, propType: 'cone' },
      { x: 510, y: 225, w: 20, h: 30, fill: 0xf97316, propType: 'cone' },
      // guardrails
      { x: 360, y: 310, w: 8, h: 560, fill: 0x4b5563, stroke: 0x9ca3af, propType: 'guardrail', solid: true },
      { x: 520, y: 310, w: 8, h: 560, fill: 0x4b5563, stroke: 0x9ca3af, propType: 'guardrail', solid: true },
    ],
    labels: [
      { x: 440, y: 80, name: 'NYC: 225 MILES', detail: '1:14 AM — full tank, zero plan', color: '#f59e0b' },
      { x: 440, y: 540, name: 'ROCKVILLE, MD', detail: 'Where we started', color: '#6b7280' },
      { x: 160, y: 310, name: 'SHOULDER OF DEFEAT', detail: 'Nick H territory', color: '#4ade80' },
    ],
    playerSpawn: { x: 440, y: 480 }
  },
  actors: [
    { id: 'nick_f', x: 380, y: 340, understudyId: 'jordan' },
    { id: 'nick_h', x: 500, y: 340, understudyId: 'maharko' },
    { id: 'jacob', x: 440, y: 390, understudyId: 'jordan' },
    { id: 'eric', x: 440, y: 460, understudyId: 'maharko' },
  ],
  beats: [
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'August, 2025. Nick F drops "WTM" at 12:47 AM. The move: drive to New York City.',
        'Jacob Lebby invests $100 into the venture without asking any questions.',
        'Nick H is in the car. This is already a mistake.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        "I'm on my way! C55 is fueled. NYC by 4AM, back by 8. This is completely reasonable.",
        "Dolby Atmos on the speakers. Mancera Red Tobacco on the neck. We're going.",
      ]
    },
    { type: 'ledger', delta: 100, note: 'Jacob — NYC investment (non-refundable)' },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        "I'm 13x liquid. This $100 is nothing. Let's get it.",
        'Do they have Long John Silvers in New York?',
      ]
    },
    { type: 'cameraPan', x: 440, y: 200, durationMs: 1600, holdMs: 800 },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        'Wait.',
        "...We're at the Baltimore toll. It's 1:52 AM.",
        'I need to sleep.',
      ]
    },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: "Nick H initiates Bedtime Protocol. He's offering $40 to turn around. What do you do?",
      options: [
        {
          text: 'Accept the $40 bribe. The group turns back.',
          ledgerDelta: -100,
          reactionSpeaker: 'jacob',
          reactionLines: [
            "I JUST PUT IN A HUNDRED DOLLARS. WE'RE TWO HOURS FROM NYC.",
            "I'm getting hot now. I'm actually getting hot.",
          ]
        },
        {
          text: 'Override Nick H. Push to NYC.',
          reactionSpeaker: 'nick_h',
          reactionLines: [
            "Absolutely not. I'm not doing this. The Tucson is going home.",
            'The Bedtime Veto is absolute. This conversation is over.',
          ]
        },
        {
          text: 'Let Eric decide with cold math.',
          reactionSpeaker: 'eric',
          reactionLines: [
            'We have burned 90 minutes. Gas: $22. Jacob\'s "investment": $100. We are at Baltimore.',
            'The expected value of continuing is negative. The Bedtime Veto wins on forensic grounds.',
          ]
        },
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        "I'll give everyone $40 and we call it a night.",
        'This was never going to happen. You knew that.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        "You guys don't understand. $100. GONE. Systemic melt. I'm actually in a melt right now.",
        "Sub-zero moment incoming. I'm blocking everyone.",
        "...Goodnight.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The C55 AMG turns around at Exit 49, Baltimore.',
        'Jacob rejoins the group chat six hours later and says "good morning" as if nothing happened.',
        "The $100 was never recovered. It lives in the Ledger now.",
      ]
    },
    { type: 'endChapter' },
  ]
};

export default chapter2;

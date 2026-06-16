import { ChapterConfig } from './types';
import { C } from './palette';

const chapter3: ChapterConfig = {
  id: 'red_pee_bladder',
  index: 3,
  title: 'The Red Pee Bladder Strike',
  subtitle: 'Act II — The 10-Year Phantom Reveals Herself',
  location: 'Shepherd University, WV',
  description:
    'August 16, 2025. Jacob drops a status update with photographic evidence. The group demands answers via 20 Questions.',
  kind: 'chapter',
  protagonistOverride: 'jacob',
  map: {
    width: 860,
    height: 640,
    backdrop: 0xe8e0d4,
    theme: 'hospital',
    areaTitle: 'Shepherd University Clinic',
    rects: [
      // hospital room walls
      { x: 430, y: 16, w: 844, h: 16, fill: 0xd1d5db, solid: true },
      { x: 430, y: 624, w: 844, h: 16, fill: 0xd1d5db, solid: true },
      { x: 16, y: 320, w: 16, h: 640, fill: 0xd1d5db, solid: true },
      { x: 844, y: 320, w: 16, h: 640, fill: 0xd1d5db, solid: true },
      // hospital bed
      { x: 430, y: 280, w: 200, h: 100, fill: 0xffffff, stroke: 0x9ca3af, propType: 'bed', solid: true, propKey: 'prop_hospital_bed' },
      // IV drip
      { x: 590, y: 230, w: 12, h: 80, fill: 0x9ca3af },
      { x: 590, y: 190, w: 30, h: 40, fill: 0xbfdbfe, stroke: 0x93c5fd, propType: 'sink', propKey: 'prop_iv_drip' },
      // toilet (evidence room)
      { x: 700, y: 300, w: 60, h: 70, fill: 0xf8fafc, stroke: 0x94a3b8, propType: 'tv', propKey: 'prop_red_toilet' },
      { x: 700, y: 265, w: 60, h: 20, fill: 0xe2e8f0, stroke: 0x94a3b8 },
      // window
      { x: 160, y: 200, w: 120, h: 80, fill: 0xbfdbfe, stroke: 0x93c5fd, propType: 'window' },
      // decor
      { x: 280, y: 280, w: 40, h: 40, fill: 0xffffff, stroke: 0x9ca3af, propKey: 'furn_chair' },
      { x: 300, y: 220, w: 40, h: 40, fill: 0xffffff, stroke: 0x9ca3af, propKey: 'furn_nightstand' },
      { x: 100, y: 400, w: 40, h: 40, fill: 0xffffff, stroke: 0x9ca3af, propKey: 'furn_plant_small' },
      // doctor's station
      { x: 220, y: 400, w: 160, h: 50, fill: 0xf1f5f9, stroke: 0x64748b, propType: 'desk', solid: true, propKey: 'furn_desk' },
      // floor tile pattern
      { x: 430, y: 320, w: 820, h: 600, fill: 0xf8fafc },
    ],
    labels: [
      { x: 430, y: 100, name: "SHEPHERD UNIVERSITY CLINIC", detail: "Spelld right or Jacob takes damage", color: '#6b7280' },
      { x: 700, y: 180, name: 'EXHIBIT A', detail: '"my pee is red"', color: '#ef4444' },
      { x: 220, y: 360, name: 'INTERROGATION ZONE', detail: '20 yes/no questions remaining', color: '#818cf8' },
    ],
    playerSpawn: { x: 430, y: 500 }
  },
  actors: [
    { id: 'nick_f', x: 300, y: 450 },
    { id: 'nick_h', x: 200, y: 450 },
    { id: 'eric', x: 560, y: 450 },
  ],
  beats: [
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'August 16, 2025. Jacob drops the following status update in the group chat:',
        '"My pee is red 😐" — with photographic evidence.',
        'The group does not offer sympathy. They open an investigation.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        'Okay. 20 questions. Yes or No only.',
        'Did you get hit in the lower back or abdomen?',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        "I got in a fight. My bladder got hit. That's all I'm saying.",
        "No I'm not telling you who it was. Ask your questions.",
      ]
    },
    {
      type: 'choice',
      speaker: 'eric',
      prompt: 'Interrogation: narrow down the assailant. Pick your question wisely.',
      options: [
        {
          text: 'Was it someone we know personally?',
          reactionSpeaker: 'jacob',
          reactionLines: [
            '...You might have met him.',
            "It's not Bryce. That's all I'll say.",
          ]
        },
        {
          text: 'Does this person have any relation to Audrey?',
          reactionSpeaker: 'jacob',
          reactionLines: [
            'ZERO relation to Audrey.',
            "Why would you even — stop.",
          ]
        },
        {
          text: 'Was this at Shepherd University?',
          reactionSpeaker: 'jacob',
          reactionLines: [
            "...You're getting warm.",
            "I'm done answering questions. I need my phone back.",
          ]
        },
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        "Bro this is actually insane. Your pee is LITERALLY RED.",
        "Did you take a photo? Send it to the GC right now.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        "Jacob… are you okay? Actually genuinely.",
        "...Is this about Audrey?",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        "IT HAS NOTHING TO DO WITH AUDREY.",
        "She just… may have been in the vicinity. Of the fight. Coincidentally.",
        'Sub-Zero mode: activated.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The investigation concludes. The assailant: Audrey.',
        'The 10-Year Phantom has materialized. And she threw hands.',
        'Jacob is hospitalized. Day 4.5. Diagnosis: internal bleeding + delusion.',
      ]
    },
    {
      type: 'bossFight',
      bossId: 'boss_audrey',
      arena: { x: 430, y: 320, w: 780, h: 500 },
      introLines: [
        'AUDREY — The 10-Year Phantom',
        'Bladder Strike confirmed. Controls will be reversed.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        "I'm fine. The doctors said I'm fine.",
        'She just... hit me in the bladder. It happens.',
        "I'm still going to marry her in 10 years. The $1,500 bet stands.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        'Jacob. The math: $1,500 bet. 10 years. She hospitalized you.',
        "You cannot gaslight a urologist.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Jacob was awarded the "Lebby Redemption Arc" buff upon discharge.',
        'He lost 20 lbs. His confidence increased.',
        "He texted Audrey the same night. She left him on delivered for 3 months.",
      ]
    },
    { type: 'endChapter' },
  ]
};

export default chapter3;

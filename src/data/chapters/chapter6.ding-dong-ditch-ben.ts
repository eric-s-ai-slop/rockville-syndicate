import { ChapterConfig } from './types';
import { C } from './palette';

const chapter6: ChapterConfig = {
  id: 'ding_dong_ditch_ben',
  index: 7,
  title: 'Operation Ding Dong Ditch Ben',
  subtitle: 'Act IV — The Pariah Zone',
  location: '12 Watchwater Way',
  description:
    "Midnight. The party has intel. The getaway car is running. Maharko must deliver the finishing blow.",
  kind: 'chapter',
  map: {
    width: 880,
    height: 660,
    backdrop: 0x060a0f,
    theme: 'suburb_night',
    areaTitle: '12 Watchwater Way',
    rects: [
      // street
      { x: 440, y: 600, w: 880, h: 120, fill: 0x1c1c1c },
      { x: 440, y: 600, w: 880, h: 4, fill: 0xfbbf24 },
      // sidewalk
      { x: 440, y: 530, w: 880, h: 30, fill: 0x374151 },
      // Ben's house (12 Watchwater Way)
      { x: 440, y: 300, w: 280, h: 280, fill: 0x1a2e1a, stroke: 0x84cc16, solid: true, propKey: 'prop_watchwater' },
      { x: 440, y: 170, w: 280, h: 50, fill: 0x166534 },
      // front door
      { x: 440, y: 435, w: 50, h: 60, fill: 0x78350f, stroke: 0xef4444, propType: 'door' },
      // windows (glowing faintly)
      { x: 340, y: 280, w: 50, h: 50, fill: 0xfef3c7, stroke: 0xfcd34d },
      { x: 540, y: 280, w: 50, h: 50, fill: 0xfef3c7, stroke: 0xfcd34d },
      { x: 340, y: 360, w: 50, h: 50, fill: 0x0f1a0f },
      { x: 540, y: 360, w: 50, h: 50, fill: 0x0f1a0f },
      // house mailbox
      { x: 330, y: 470, w: 20, h: 30, fill: 0x374151, stroke: 0x84cc16, propType: 'car' },
      // getaway car (Tucson, parked on street)
      { x: 680, y: 595, w: 120, h: 56, fill: 0x1e293b, stroke: 0x4ade80, propType: 'car', propKey: 'prop_maharko_camero' },
      // C55 AMG (Nick F's)
      { x: 200, y: 595, w: 120, h: 56, fill: 0x111827, stroke: 0xf59e0b, propType: 'car', propKey: 'prop_nick_f_corolla' },
      // neighboring yard trees
      { x: 150, y: 280, w: 80, h: 80, fill: 0x0f2a0f, propType: 'tree' },
      { x: 730, y: 300, w: 80, h: 80, fill: 0x0f2a0f, propType: 'tree' },
      // street lamp (dim circle above)
      { x: 150, y: 490, w: 12, h: 80, fill: 0x374151 },
      { x: 730, y: 490, w: 12, h: 80, fill: 0x374151 },
    ],
    labels: [
      { x: 440, y: 100, name: '12 WATCHWATER WAY', detail: 'The Pariah Zone — Enter at own risk', color: '#ef4444' },
      { x: 680, y: 560, name: 'EXTRACT POINT', detail: 'Sprint here after the shout', color: '#4ade80' },
    ],
    playerSpawn: { x: 440, y: 570 }
  },
  actors: [
    { id: 'maharko', x: 340, y: 500, understudyId: 'jacob' },
    { id: 'jordan', x: 540, y: 500, understudyId: 'nick_h' },
    { id: 'nick_f', x: 680, y: 570, understudyId: 'nick_h' },
    { id: 'eric', x: 200, y: 570, understudyId: 'jacob' },
  ],
  ambientSfx: { onDoor: 'sfx_knock' },
  chaseTextureSwaps: [
    { propKey: 'prop_watchwater', targetTexture: 'prop_watchwater_open_clean', fallbackTexture: 'prop_watchwater_open' }
  ],
  beats: [
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "12 Watchwater Way. The Pariah Zone.",
        "Ben Bersofsky: blacklisted. UMBC Pariah Event. Omega clearance required to discuss.",
        "The party has pulled up at 12:01 AM. Maharko is the designated finisher.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'maharko',
      lines: [
        "His light is ON. He's awake.",
        "I can see him through the window. He's on his phone.",
        "Bro is he racing a go-kart? Wait—",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        "Okay. One shot. Maharko, you're up.",
        "Go to the door. Say the words. Sprint back.",
        "Jordan — get the video.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jordan',
      lines: [
        "I got it. Recording.",
        "...Wait my phone is buffering.",
        "Okay. I'm good. Go.",
      ]
    },
    { type: 'walkTo', x: 440, y: 440, radius: 50, markerLabel: 'Approach the front door' },
    {
      type: 'dialogue',
      speaker: 'maharko',
      lines: [
        "WE KNOW WHAT YOU DID.",
        "BEN BERSOFSKY. WE KNOW WHAT YOU DID AT UMBC.",
        "THE SYNDICATE SENDS ITS REGARDS.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The door opens.',
        'It is not Ben.',
      ]
    },
    { type: 'chase', pursuerId: 'boss_ben', durationMs: 7000 },
    {
      type: 'bossFight',
      bossId: 'boss_ben',
      arena: { x: 440, y: 400, w: 860, h: 560 },
      introLines: [
        'MICHAEL BERSOFSKY — The Pariah Father',
        '"HEY!" — AoE Fear Spell incoming. Run.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jordan',
      lines: [
        "OKAY I GOT THE VID— wait.",
        "I... I fat-fingered it.",
        "I sent the video to Ben.",
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        "JORDAN. JORDAN WHAT DID YOU DO.",
        "GET IN THE CAR. GET IN THE CAR RIGHT NOW.",
        "GO GO GO —",
      ]
    },
    { type: 'ledger', delta: 0, note: 'Heat Level: MAXIMUM (Ben has the footage)' },
    { type: 'walkTo', x: 680, y: 595, radius: 60, markerLabel: 'Sprint to getaway car' },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Ben received the video.',
        'Ben cast: Police Threat.',
        "The party laid low for a week. Jordan never lived it down.",
      ]
    },
    { type: 'endChapter' },
  ]
};

export default chapter6;

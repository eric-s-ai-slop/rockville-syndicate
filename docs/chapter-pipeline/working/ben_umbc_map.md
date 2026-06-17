// SCENES for "ben_umbc.md" — two locations: Frat Basement (boss fight) and Parking Lot (confession)

import { C } from './palette';

// -----------------------------------------------------------------------------
// SCENE 0: UMBC Frat Basement
// -----------------------------------------------------------------------------
const basementMap = {
  width: 920,
  height: 660,
  backdrop: C.floorTile,        // dark tile floor
  theme: 'apartment',           // indoor carpet footstep (good enough)
  areaTitle: 'UMBC Frat Basement',
  rects: [
    // Border walls
    { x: 460, y: 8, w: 920, h: 16, fill: C.wall, solid: true },
    { x: 460, y: 652, w: 920, h: 16, fill: C.wall, solid: true },
    { x: 8, y: 330, w: 16, h: 660, fill: C.wall, solid: true },
    { x: 912, y: 330, w: 16, h: 660, fill: C.wall, solid: true },

    // Large rug in center
    {
      x: 460,
      y: 330,
      w: 400,
      h: 260,
      fill: C.rug,
      propType: 'rug',
      propKey: 'furn_rug_large',
      solid: false,
    },

    // Table with stew (desk)
    {
      x: 300,
      y: 300,
      w: 100,
      h: 60,
      fill: C.desk,
      propType: 'desk',
      propKey: 'furn_desk',
      solid: true,
    },

    // Couch against back wall
    {
      x: 460,
      y: 120,
      w: 300,
      h: 80,
      fill: C.couch,
      propType: 'couch',
      propKey: 'furn_couch_long',
      solid: true,
    },

    // Door prop (visual only, right wall)
    {
      x: 870,
      y: 400,
      w: 40,
      h: 60,
      fill: C.door,
      propType: 'door',
      solid: false,
    },
  ],
  labels: [],
  playerSpawn: { x: 460, y: 580 },
};

const basementActors = [
  // Main characters
  { id: 'ben', x: 460, y: 280 },                     // center – boss
  { id: 'maharko', x: 150, y: 480, nameOverride: 'Maharko' },

  // Three unnamed girls (shadowy figures at edges)
  { id: 'girl1', x: 100, y: 100, nameOverride: '???' },
  { id: 'girl2', x: 800, y: 100, nameOverride: '???' },
  { id: 'girl3', x: 800, y: 500, nameOverride: '???' },

  // Frat guys (background)
  { id: 'frat1', x: 700, y: 550, nameOverride: 'Frat Guy' },
  { id: 'frat2', x: 800, y: 550, nameOverride: 'Frat Guy' },
  { id: 'frat3', x: 750, y: 600, nameOverride: 'Frat Guy' },
];

// -----------------------------------------------------------------------------
// SCENE 1: Parking Lot at Night
// -----------------------------------------------------------------------------
const parkingLotMap = {
  width: 920,
  height: 660,
  backdrop: C.floorTile,        // dark concrete
  theme: 'suburb_night',        // concrete footstep
  areaTitle: 'Parking Lot at Night',
  rects: [
    // Border walls (to keep player in frame)
    { x: 460, y: 8, w: 920, h: 16, fill: C.wall, solid: true },
    { x: 460, y: 652, w: 920, h: 16, fill: C.wall, solid: true },
    { x: 8, y: 330, w: 16, h: 660, fill: C.wall, solid: true },
    { x: 912, y: 330, w: 16, h: 660, fill: C.wall, solid: true },

    // Parked car (Maharko's Camaro as placeholder)
    {
      x: 200,
      y: 350,
      w: 180,
      h: 80,
      fill: 0x2d3748,            // dark gray car body
      propType: 'car',
      propKey: 'maharko_camero',
      solid: true,
    },
    // Maybe a cone or line? Not needed.
  ],
  labels: [],
  playerSpawn: { x: 460, y: 580 },
};

const parkingLotActors = [
  { id: 'maharko', x: 460, y: 300, nameOverride: 'Maharko' },
  { id: 'eric', x: 350, y: 250, nameOverride: 'Eric' },
  { id: 'nickf', x: 570, y: 250, nameOverride: 'Nick F' },
];

// -----------------------------------------------------------------------------
// FINAL SCENES ARRAY
// -----------------------------------------------------------------------------
export const scenes = [
  {
    map: basementMap,
    actors: basementActors,
  },
  {
    map: parkingLotMap,
    actors: parkingLotActors,
  },
];

// Top-level fields (backward compatibility – copy Scene 0)
export const map = basementMap;
export const actors = basementActors;

// -----------------------------------------------------------------------------
// BOSS ARENA SUGGESTION (for scene 0)
// -----------------------------------------------------------------------------
/*
Boss arena (scene 0): { x: 460, y: 330, w: 760, h: 520 }
  – centers on the rug area, covers most of the open floor.
  – Ben stands at (460, 280) inside the arena.
  – Maharko and the girls are at the edges, outside the arena.
*/

// All propKey values used are in the confirmed list:
//   furn_rug_large, furn_desk, furn_couch_long, maharko_camero
// No unknown propKeys.
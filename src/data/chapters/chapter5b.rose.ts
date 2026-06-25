import { ChapterConfig } from './types';
import { C } from './palette';

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER 5b — ROSE
// "Florida, July 4th — The Closed System"
//
// A three-scene chapter: party → lawn → car.
// The player is alongside the group in real time as Maharko feeds a 16-year-old
// alcohol and makes out with her in a moving car. The player's agency is a single
// lose-lose choice after the makeout. The chapter uses a new carRide minigame mode
// for the confrontation (Options A and C). Option B (silence) skips the fight and
// carries heavier consequences.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── carRide minigame configs ─────────────────────────────────────────────────
// The carRide mode is built by a developer from the mechanic spec (Step 2b).
// The mode consumes this config object: four phases, each with a defense and three
// responses (one correct). A 3-minute timer ticks down. Correct responses break
// the defense and advance. Wrong responses cost time and HP. Timer expiry = lose.

const carRideConfigA = {
  bossName: 'Maharko',
  bossTitle: 'The Florida Wildcard',
  timer: 180000, // 3 minutes — the drive home
  phases: [
    {
      id: 1,
      defense: "I needed this. You don't understand what it's been like.",
      responses: [
        { text: "Need doesn't create right.", correct: true },
        { text: "I get it. We've all been desperate.", correct: false },
        { text: "Calm down, bro.", correct: false },
      ],
    },
    {
      id: 2,
      defense: "She liked me, bro. I could tell.",
      responses: [
        { text: "A half-conscious 16-year-old can't like you in a way that means anything.", correct: true },
        { text: "Maybe she did. Who knows.", correct: false },
        { text: "That's between you and her.", correct: false },
      ],
    },
    {
      id: 3,
      defense: "She's into it. Look at her. Look.",
      responses: [
        { text: "That's incapacitation, not consent.", correct: true },
        { text: "She's drunk, not dead.", correct: false },
        { text: "I'm not looking.", correct: false },
      ],
    },
    {
      id: 4,
      defense: "Stop cockblocking me. I swear to god.",
      responses: [
        { text: "I'm not going to stop.", correct: true },
        { text: "Fine. Do what you want.", correct: false },
        { text: "Calm down, you're being aggressive.", correct: false },
      ],
    },
  ],
  combatBarks: [
    "Bro you weren't even there when I met her.",
    "Stop tripping. She's into it.",
    "I haven't had a W in months, let me have this.",
    "Why are you doing this in the car, bro? Read the room.",
    "Alex already tried this. Look where it got him.",
    "You don't get it. You're from Rockville.",
  ],
  deathQuote: "Whatever, bro. You said your piece. The car's still moving.",
};

// Config C is the same fight but Phase 1 is about Nick F's photos (the player just
// confronted Nick F in Option C). The remaining phases shift down.
const carRideConfigC = {
  bossName: 'Maharko',
  bossTitle: 'The Florida Wildcard',
  timer: 180000,
  phases: [
    {
      id: 1,
      defense: "Bro, Nick F deleted the photos. It didn't happen. Why are you still on this?",
      responses: [
        { text: "Deleting the photos doesn't undo what happened.", correct: true },
        { text: "You're right. If there's no photos, there's no proof.", correct: false },
        { text: "I'm not the one you need to explain this to.", correct: false },
      ],
    },
    {
      id: 2,
      defense: "I needed this. You don't understand what it's been like.",
      responses: [
        { text: "Need doesn't create right.", correct: true },
        { text: "I get it. We've all been desperate.", correct: false },
        { text: "Calm down, bro.", correct: false },
      ],
    },
    {
      id: 3,
      defense: "She liked me, bro. I could tell.",
      responses: [
        { text: "A half-conscious 16-year-old can't like you in a way that means anything.", correct: true },
        { text: "Maybe she did. Who knows.", correct: false },
        { text: "That's between you and her.", correct: false },
      ],
    },
    {
      id: 4,
      defense: "Stop cockblocking me. I swear to god.",
      responses: [
        { text: "I'm not going to stop.", correct: true },
        { text: "Fine. Do what you want.", correct: false },
        { text: "Calm down, you're being aggressive.", correct: false },
      ],
    },
  ],
  combatBarks: [
    "Bro you weren't even there when I met her.",
    "Stop tripping. She's into it.",
    "I haven't had a W in months, let me have this.",
    "Why are you doing this in the car, bro? Read the room.",
    "Alex already tried this. Look where it got him.",
    "You don't get it. You're from Rockville.",
    "Nick F already deleted the pics. It's over. Let it go.",
  ],
  deathQuote: "Whatever, bro. You said your piece. The car's still moving.",
};

// ─── Chapter ──────────────────────────────────────────────────────────────────

const chapter5b: ChapterConfig = {
  id: 'rose_florida',
  index: 6,
  title: 'Rose',
  subtitle: 'Florida, July 4th — The Closed System',
  location: 'Boca Raton, FL',
  description:
    "July 4th, 2024. Nick F visits Maharko in Florida. At a party, Maharko feeds a 16-year-old named Rose alcohol until she's half-conscious — and the car ride home is a closed system nobody can leave.",
  kind: 'chapter',

  // ════════════════════════════════════════════════════════════════════════════
  // SCENES — three locations: party → lawn → car
  // Top-level map/actors below are a copy of scenes[0] (required by the type).
  // ════════════════════════════════════════════════════════════════════════════
  scenes: [
    // ── Scene 0 — The Party ────────────────────────────────────────────────
    {
      map: {
        width: 920,
        height: 660,
        backdrop: C.floorWood,
        theme: 'apartment',
        areaTitle: 'July 4th Party — Boca Raton',
        rects: [
          // border walls
          { x: 460, y: 8,   w: 920, h: 16,  fill: C.wall, solid: true },
          { x: 460, y: 652, w: 920, h: 16,  fill: C.wall, solid: true },
          { x: 8,   y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
          { x: 912, y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
          // TV on back wall
          { x: 460, y: 50, w: 100, h: 30, fill: C.tv, propType: 'tv', solid: true },
          // Cabinet (back-left)
          { x: 340, y: 70, w: 80, h: 40, fill: C.desk, propType: 'desk', propKey: 'furn_cabinet_tall', solid: true },
          // Plant (top-left)
          { x: 80, y: 100, w: 40, h: 80, fill: 0x2d5016, propType: 'tree', propKey: 'furn_plant_tall', solid: true },
          // Couch (living room)
          { x: 180, y: 290, w: 200, h: 70, fill: C.couch, propType: 'couch', propKey: 'furn_couch_long', solid: true },
          // Kitchen counter
          { x: 720, y: 250, w: 200, h: 50, fill: C.counter, propType: 'counter', solid: true },
          // Sink
          { x: 630, y: 250, w: 60, h: 50, fill: C.sink, propType: 'sink', solid: true },
          // Fridge
          { x: 850, y: 150, w: 60, h: 80, fill: C.fridge, propType: 'fridge', solid: true },
          // Rug (center, not solid)
          { x: 460, y: 480, w: 320, h: 140, fill: C.rug, propType: 'rug' },
        ],
        labels: [],
        playerSpawn: { x: 460, y: 600 },
      },
      actors: [
        { id: 'maharko',     x: 320, y: 230 },
        { id: 'jordan',      x: 270, y: 200 },
        { id: 'rose',        x: 180, y: 270, nameOverride: 'Rose', spriteKey: 'npc_rose_sheet' },
        { id: 'alex',        x: 430, y: 360, nameOverride: 'Alex', spriteKey: 'npc_alex_sheet' },
        { id: 'nick_f',      x: 460, y: 560 },
        { id: 'benji',       x: 700, y: 340, nameOverride: 'Benji', spriteKey: 'npc_benji_sheet' },
        { id: 'rose_sister', x: 800, y: 200, nameOverride: "Rose's Sister", spriteKey: 'npc_rose_sister_sheet' },
        { id: 'party1',      x: 520, y: 200, nameOverride: 'Partygoer', spriteKey: 'enemy_frat_bro_sheet' },
        { id: 'party2',      x: 750, y: 390, nameOverride: 'Partygoer', spriteKey: 'enemy_frat_bro_sheet' },
        { id: 'party3',      x: 380, y: 510, nameOverride: 'Partygoer', spriteKey: 'enemy_frat_bro_sheet' },
      ],
    },

    // ── Scene 1 — The Lawn ─────────────────────────────────────────────────
    {
      map: {
        width: 920,
        height: 660,
        backdrop: C.grass,
        theme: 'florida',
        areaTitle: 'The Lawn — End of Night',
        rects: [
          // border walls
          { x: 460, y: 8,   w: 920, h: 16,  fill: C.wall, solid: true },
          { x: 460, y: 652, w: 920, h: 16,  fill: C.wall, solid: true },
          { x: 8,   y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
          { x: 912, y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
          // Background Stage
          { x: 460, y: 330, w: 920, h: 660, fill: 0x000000, propKey: 'stage_florida_house_night', invisible: true },
          // House wall (background)
          { x: 460, y: 70, w: 600, h: 80, fill: C.wall, propType: 'wall', solid: true },
          // Tree (left, framing)
          { x: 120, y: 200, w: 60, h: 120, fill: 0x2d5016, propType: 'tree', solid: true },
          // Walkway (bottom, visual)
          { x: 460, y: 560, w: 300, h: 80, fill: C.floorTile, propType: 'road' },
        ],
        labels: [],
        playerSpawn: { x: 460, y: 580 },
      },
      actors: [
        { id: 'rose',    x: 460, y: 380, nameOverride: 'Rose', spriteKey: 'npc_rose_sheet' },
        { id: 'maharko', x: 410, y: 340 },
        { id: 'nick_f',  x: 560, y: 400 },
        { id: 'jordan',  x: 370, y: 390 },
        { id: 'alex',    x: 600, y: 440, nameOverride: 'Alex', spriteKey: 'npc_alex_sheet' },
      ],
    },

    // ── Scene 2 — The Car ──────────────────────────────────────────────────
    {
      map: {
        width: 920,
        height: 660,
        backdrop: C.floorTile,
        theme: 'highway_night',
        areaTitle: 'Back Seat — Going Home',
        rects: [
          // border walls (car body)
          { x: 460, y: 8,   w: 920, h: 16,  fill: C.wall, solid: true },
          { x: 460, y: 652, w: 920, h: 16,  fill: C.wall, solid: true },
          { x: 8,   y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
          { x: 912, y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
          // Background Stage
          { x: 460, y: 330, w: 920, h: 660, fill: 0x000000, propKey: 'stage_car_interior', invisible: true },
          // Windshield (top, dark, not solid)
          { x: 460, y: 50, w: 700, h: 40, fill: C.tv, propType: 'window', invisible: true },
          // Front-left seat (driver — visual only)
          { x: 330, y: 160, w: 160, h: 90, fill: C.couch, propType: 'car', invisible: true },
          // Front console
          { x: 460, y: 160, w: 40, h: 90, fill: C.desk, propType: 'car', invisible: true },
          // Front-right seat (passenger — visual only)
          { x: 590, y: 160, w: 160, h: 90, fill: C.couch, propType: 'car', invisible: true },
          // Front-back divider (SOLID — blocks forward movement)
          { x: 460, y: 255, w: 760, h: 20, fill: C.desk, propType: 'car', solid: true, invisible: true },
          // Back-left seat (visual only)
          { x: 250, y: 320, w: 200, h: 60, fill: C.couch, propType: 'car', invisible: true },
          // Back-right seat (visual only)
          { x: 670, y: 320, w: 200, h: 60, fill: C.couch, propType: 'car', invisible: true },
          // Left door — LOCKED (solid)
          { x: 25, y: 420, w: 20, h: 100, fill: C.door, propType: 'door', solid: true, invisible: true },
          // Right door — LOCKED (solid)
          { x: 895, y: 420, w: 20, h: 100, fill: C.door, propType: 'door', solid: true, invisible: true },
          // Rear window (bottom, dark, not solid)
          { x: 460, y: 610, w: 700, h: 30, fill: C.tv, propType: 'window', invisible: true },
        ],
        labels: [],
        playerSpawn: { x: 550, y: 460 },
      },
      actors: [
        // Front seats — the two observers.
        // nick_f_front: non-canonical id so the engine doesn't hide it when the
        // player picks Nick F as their hero. Renders with Nick F's sprite + nameplate.
        { id: 'nick_f_front', x: 330, y: 160, spriteKey: 'hero_nick_f_sheet', nameOverride: 'Nick F' },
        { id: 'jordan',       x: 590, y: 160 },
        // Back seats — the drama
        { id: 'maharko', x: 300, y: 350 },
        { id: 'rose',    x: 380, y: 360, nameOverride: 'Rose', spriteKey: 'npc_rose_sheet' },
        { id: 'alex',    x: 720, y: 350, nameOverride: 'Alex', spriteKey: 'npc_alex_sheet' },
      ],
    },
  ],

  // ════════════════════════════════════════════════════════════════════════════
  // BEATS
  // ════════════════════════════════════════════════════════════════════════════
  beats: [
    // ── SCENE 0 — THE PARTY ──────────────────────────────────────────────────

    // 1. [NARRATOR] Cold open
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "July 4th, 2024. Nick F is in Florida.",
        "Boca Raton. Maharko's territory. Jordan's here too.",
        "Benji brought two girls to the party. One of them is 16.",
      ]
    },

    // 2. [NARRATOR] The age, the knowledge, the first move
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "Alex tells Maharko. Alex tells Nick F.",
        "Rose is 16.",
        "Maharko walks over anyway. First drink in hand.",
      ]
    },

    // 3. [WALKTO] Player approaches Maharko
    {
      type: 'walkTo',
      x: 320,
      y: 230,
      radius: 80,
      markerLabel: 'Find Maharko'
    },

    // 4. [DIALOGUE — Maharko] First move, charming and wrong
    {
      type: 'dialogue',
      speaker: 'maharko',
      lines: [
        "Bro, it's literally a party. She came to have fun.",
        "I'm just being friendly. It's like when you offer someone a seat at lunch — you're not gonna make them stand.",
      ]
    },

    // 5. [NARRATOR] The ramp
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "All night, Maharko feeds her.",
        "Most of what she drank came from him. He stays sober.",
        "Jordan is with him the whole time. Jordan says nothing.",
      ]
    },

    // 6. [DIALOGUE — Maharko] The "I need this" foreshadow
    {
      type: 'dialogue',
      speaker: 'maharko',
      lines: [
        "Bro, I haven't had a W in months. Let me have this.",
        "It's literally one drink. Chill.",
      ]
    },

    // 7. [NARRATOR] Bridge to lawn
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "Outside. End of the night.",
      ]
    },

    // 8. [CHANGE SCENE] Party → Lawn
    {
      type: 'changeScene',
      sceneIndex: 1,
      transitionMs: 800
    },

    // ── SCENE 1 — THE LAWN ───────────────────────────────────────────────────

    // 9. [CAMERA PAN] Reveal Rose on the ground
    {
      type: 'cameraPan',
      x: 460,
      y: 380,
      durationMs: 1200,
      holdMs: 800
    },

    // 10. [NARRATOR] The lawn photo, born
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "Rose is on the ground. Super wasted.",
        "Maharko is pulling her up.",
        "Nick F takes a photo.",
      ]
    },

    // 11. [DIALOGUE — Maharko] Lawn defense (80% accurate analogy, 20% wrong)
    {
      type: 'dialogue',
      speaker: 'maharko',
      lines: [
        "She's fine, bro. She just needs air.",
        "It's like when you help someone up at the gym — you're not gonna leave them on the floor.",
      ]
    },

    // 12. [NARRATOR] The witnesses, named by presence
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "Jordan is here. Jordan says nothing.",
        "Alex is here. Watching.",
        "Rose's sister is inside. Getting lit. Doesn't know.",
      ]
    },

    // 13. [NARRATOR] Bridge to car
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "The car. Going home.",
      ]
    },

    // 14. [CHANGE SCENE] Lawn → Car
    {
      id: 'car_scene_start',
      type: 'changeScene',
      sceneIndex: 2,
      transitionMs: 1000
    },

    // ── SCENE 2 — THE CAR ────────────────────────────────────────────────────

    // 15. [NARRATOR] The closed system, geometry laid out
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "Nick F is driving. Jordan in the front passenger seat.",
        "Back seat: Maharko, Rose, Alex.",
        "You're in the back seat too.",
      ]
    },

    // 16. [DIALOGUE — Alex] The one who tried, speaks
    {
      type: 'dialogue',
      speaker: 'alex',
      lines: [
        "She's 16, Maharko.",
        "Stop.",
      ]
    },

    // 17. [DIALOGUE — Maharko] The confession, the threat
    {
      type: 'dialogue',
      speaker: 'maharko',
      lines: [
        "Dude I need this, stop cockblocking me.",
      ]
    },

    // 18. [NARRATOR] Alex backs down, shown not explained
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "Alex stopped talking.",
        "The car kept moving.",
      ]
    },

    // 19. [NARRATOR] The makeout
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "Maharko makes out with Rose.",
        "She is half-conscious.",
        "Nick F, front seat, takes photos. Multiple.",
        "He says nothing.",
        "Jordan is present. Jordan says nothing.",
      ]
    },

    // 20. [NARRATOR] The no-win frame (verbatim from brief)
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "The car is moving. You don't live here.",
        "Alex tried. Alex stopped trying.",
        "Jordan is in the car. Jordan hasn't said a word.",
        "Nick F has his phone up.",
        "Rose is 16. She is half-conscious in the back seat.",
        "There is no move you can make in this car that doesn't cost you something you can't get back.",
      ]
    },

    // 21. [CHOICE] The lose-lose
    {
      id: 'the_choice',
      type: 'choice',
      speaker: 'narrator',
      prompt: "The car is moving. Rose is in the back seat. What do you do?",
      options: [
        {
          text: "Push hard. Confront Maharko directly.",
          reactionSpeaker: 'maharko',
          reactionLines: [
            "Bro, you're really doing this right now? In the car?",
            "Read the room.",
          ],
          goto: 'fight_a'
        },
        {
          text: "Stay silent. Let the car keep moving.",
          reactionSpeaker: 'narrator',
          reactionLines: [
            "You said nothing.",
            "The car kept moving.",
          ],
          goto: 'silence_path'
        },
        {
          text: "Turn on Nick F. Demand he delete the photos.",
          reactionSpeaker: 'nick_f',
          reactionLines: [
            "Bro, what? I'm literally just documenting.",
            "You want me to delete? Fine. Whatever.",
            "But this didn't happen then.",
          ],
          goto: 'fight_c'
        },
      ]
    },

    // ══════════════════════════════════════════════════════════════════════════
    // BRANCH A — Confront Maharko
    // ══════════════════════════════════════════════════════════════════════════

    // 22a. [MINIGAME — carRide] The four-phase dialogue battle
    {
      id: 'fight_a',
      type: 'minigame',
      modeId: 'battleiq-battle',
      config: { enemyId: 'maharko_boss' },
      loseGoto: 'car_scene_start',
      introLines: [
        'MAHARKO — The Florida Wildcard',
        'Defeat him before the car gets home.',
      ]
    },

    // 23a. [NARRATOR] Post-fight — the hollow win
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "You said it.",
        "The car kept moving anyway.",
        "Rose is still in the back seat. The photos are still on Nick F's phone.",
        "The car arrived home.",
      ]
    },

    // 24a. [NARRATOR] A/C last line
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "Rose is 16.",
        "She is in the back seat of a car going home.",
        "She does not know about the photos.",
      ]
    },

    // 25a. [END]
    { type: 'endChapter' },

    // ══════════════════════════════════════════════════════════════════════════
    // BRANCH C — Turn on Nick F, then fight Maharko
    // ══════════════════════════════════════════════════════════════════════════

    // 22c. [MINIGAME — carRide] Same fight, Phase 1 is about the photos
    {
      id: 'fight_c',
      type: 'minigame',
      modeId: 'battleiq-battle',
      config: { enemyId: 'maharko_boss' },
      loseGoto: 'car_scene_start',
      introLines: [
        'MAHARKO — The Florida Wildcard',
        'Defeat him before the car gets home.',
      ]
    },

    // 23c. [NARRATOR] Post-fight — the evidence is gone, the car kept moving
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "You turned on Nick F.",
        "He deleted the photos. Or said he did.",
        "Maharko gets to say it didn't happen now. The record is gone.",
        "The car kept moving. Rose is still in the back seat.",
        "The car arrived home.",
      ]
    },

    // 24c. [NARRATOR] A/C last line (same as Branch A)
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "Rose is 16.",
        "She is in the back seat of a car going home.",
        "She does not know about the photos.",
      ]
    },

    // 25c. [END]
    { type: 'endChapter' },

    // ══════════════════════════════════════════════════════════════════════════
    // BRANCH B — Stay silent
    // ══════════════════════════════════════════════════════════════════════════

    // 26. [NARRATOR] The indictment — narrator turns on the player
    {
      id: 'silence_path',
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "You stayed silent.",
        "The car kept moving.",
        "Alex tried. You didn't.",
        "Jordan said nothing. You said nothing.",
        "The car arrived home.",
        "You are one of them now.",
      ]
    },

    // 27. [NARRATOR] B last line — heavier, names the player
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "Rose is 16.",
        "She is in the back seat of a car going home.",
        "She does not know about the photos.",
        "You are in the back seat with her.",
        "You said nothing.",
      ]
    },

    // 28. [END]
    { type: 'endChapter' },
  ],

  // ════════════════════════════════════════════════════════════════════════════
  // TOP-LEVEL map + actors — copy of scenes[0] (required by the type)
  // ════════════════════════════════════════════════════════════════════════════
  map: {
    width: 920,
    height: 660,
    backdrop: C.floorWood,
    theme: 'apartment',
    areaTitle: 'July 4th Party — Boca Raton',
    rects: [
      { x: 460, y: 8,   w: 920, h: 16,  fill: C.wall, solid: true },
      { x: 460, y: 652, w: 920, h: 16,  fill: C.wall, solid: true },
      { x: 8,   y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
      { x: 912, y: 330, w: 16,  h: 660, fill: C.wall, solid: true },
      { x: 460, y: 50, w: 100, h: 30, fill: C.tv, propType: 'tv', solid: true },
      { x: 340, y: 70, w: 80, h: 40, fill: C.desk, propType: 'desk', propKey: 'furn_cabinet_tall', solid: true },
      { x: 80, y: 100, w: 40, h: 80, fill: 0x2d5016, propType: 'tree', propKey: 'furn_plant_tall', solid: true },
      { x: 180, y: 290, w: 200, h: 70, fill: C.couch, propType: 'couch', propKey: 'furn_couch_long', solid: true },
      { x: 720, y: 250, w: 200, h: 50, fill: C.counter, propType: 'counter', solid: true },
      { x: 630, y: 250, w: 60, h: 50, fill: C.sink, propType: 'sink', solid: true },
      { x: 850, y: 150, w: 60, h: 80, fill: C.fridge, propType: 'fridge', solid: true },
      { x: 460, y: 480, w: 320, h: 140, fill: C.rug, propType: 'rug' },
    ],
    labels: [],
    playerSpawn: { x: 460, y: 600 },
  },
  actors: [
    { id: 'maharko',     x: 320, y: 230 },
    { id: 'jordan',      x: 270, y: 200 },
    { id: 'rose',        x: 180, y: 270, nameOverride: 'Rose', spriteKey: 'npc_rose_sheet' },
    { id: 'alex',        x: 430, y: 360, nameOverride: 'Alex', spriteKey: 'npc_alex_sheet' },
    { id: 'nick_f',      x: 460, y: 560 },
    { id: 'benji',       x: 700, y: 340, nameOverride: 'Benji', spriteKey: 'npc_benji_sheet' },
    { id: 'rose_sister', x: 800, y: 200, nameOverride: "Rose's Sister", spriteKey: 'npc_rose_sister_sheet' },
    { id: 'party1',      x: 520, y: 200, nameOverride: 'Partygoer', spriteKey: 'enemy_frat_bro_sheet' },
    { id: 'party2',      x: 750, y: 390, nameOverride: 'Partygoer', spriteKey: 'enemy_frat_bro_sheet' },
    { id: 'party3',      x: 380, y: 510, nameOverride: 'Partygoer', spriteKey: 'enemy_frat_bro_sheet' },
  ],
};

export default chapter5b;

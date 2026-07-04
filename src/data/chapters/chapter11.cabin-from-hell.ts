import { ChapterConfig } from './types';
import { C } from './palette';

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER 11 — CABIN FROM HELL
// "Summer 2025 — Ocean City & Shenandoah Cabin"
//
// Siege/anthology. Act 1 (OC balcony, one scene) seeds the curse disguised as a
// normal bad night out. Act 2 (the cabin, two scenes) runs it as a continuous
// siege — two mirrored escalation ladders (contagion, prank war) converging on
// Day 5 when the prank war's operator becomes the illness's newest casualty.
// No bossFight anywhere — the antagonist was never a person. See
// docs/chapter-pipeline/working/cabin_from_hell_2025/ for the full brief, map
// design, and mechanic spec this file translates.
//
// STEP 3 OUTPUT — STAGING FILE. Not yet moved into src/data/chapters/ or
// registered in index.ts; speakerHunt/cabinCollapse/generalized silentDrive do
// not exist in code yet. See flags at the bottom of this file before Step 5.
// ═══════════════════════════════════════════════════════════════════════════════

const chapter11: ChapterConfig = {
  id: 'cabin_from_hell_2025',
  index: 11,
  title: 'Cabin From Hell',
  subtitle: 'Act I — The Balcony / Act II — The Siege',
  location: 'Ocean City, MD & Shenandoah, VA',
  description:
    "Summer 2025. Eight friends outgrow Ocean City, flee to a one-bathroom cabin in Shenandoah, and spend four days losing a war they didn't all agree to fight. They leave a day early. The cabin wins.",
  kind: 'chapter',

  // ════════════════════════════════════════════════════════════════════════════
  // SCENES — three locations: OC balcony → cabin interior → cabin deck
  // Top-level map/actors below are a copy of scenes[0] (required by the type).
  // ════════════════════════════════════════════════════════════════════════════
  scenes: [
    {
      // Scene 0 — OC Balcony
      map: {
        width: 700,
        height: 660,
        backdrop: C.floorTile,
        theme: 'suburb_night',
        areaTitle: 'The Balcony — One Floor Up',
        rects: [
          { x: 350, y: 8, w: 700, h: 16, fill: C.wall, solid: true, invisible: true },
          { x: 350, y: 652, w: 700, h: 16, fill: C.wall, solid: true, invisible: true },
          { x: 8, y: 330, w: 16, h: 660, fill: C.wall, solid: true, invisible: true },
          { x: 692, y: 330, w: 16, h: 660, fill: C.wall, solid: true, invisible: true },
          { x: 350, y: 330, w: 700, h: 660, fill: 0x000000, propKey: 'stage_oc_balcony_night', invisible: true },
          { x: 350, y: 622, w: 700, h: 40, fill: C.wall, propType: 'wall', solid: true, invisible: true },
          { x: 350, y: 48, w: 700, h: 16, fill: 0x64748b, propType: 'guardrail', solid: true, invisible: true },
          { x: 550, y: 500, w: 80, h: 60, fill: C.desk, propType: 'desk', invisible: true, solid: true },
        ],
        labels: [],
        playerSpawn: { x: 350, y: 590 },
      },
      music: 'music_ch11_spins', // "The Spins" — Mac Miller; crossfades to music_ch11_space_song at the turn
      actors: [
        { id: 'benji', x: 250, y: 560, nameOverride: 'Benji', spriteKey: 'npc_benji_sheet' },
        { id: 'maharko', x: 400, y: 320 },
        { id: 'girl_chopped', x: 460, y: 160, nameOverride: 'the chopped girl', spriteKey: 'npc_girl_sheet' },
        { id: 'girl_nonchopped', x: 260, y: 150, nameOverride: 'the other girl', spriteKey: 'npc_girl_sheet' },
      ],
    },
    {
      // Scene 1 — Cabin Interior
      map: {
        width: 1200,
        height: 800,
        backdrop: C.floorWood,
        theme: 'cabin',
        noNatureScatter: true, // indoor scene — 'cabin' theme is otherwise treated as outdoor
        areaTitle: 'The Shenandoah Cabin',
        // All furniture/wall rects below are collision-only (invisible: true) — the
        // stage_cabin_interior backdrop already paints the full furnished floorplan
        // (dining table, couches, TV, kitchen, bathroom, both bedrooms). Duplicate
        // visible props here would double-render on top of the painted art.
        //
        // Wall coordinates below were measured directly from the backdrop art (pixel
        // edge-detection on stage_cabin_interior.jpg, not eyeballed) — the previous
        // rects were unaligned placeholders, which is why the player could walk
        // through painted walls and get blocked by invisible ones in open floor.
        rects: [
          { x: 600, y: 8, w: 1200, h: 16, fill: C.wall, solid: true, invisible: true },
          { x: 176, y: 792, w: 312, h: 16, fill: C.wall, solid: true, invisible: true },
          { x: 803, y: 792, w: 753, h: 16, fill: C.wall, solid: true, invisible: true },
          { x: 13, y: 400, w: 26, h: 800, fill: C.wall, solid: true, invisible: true },
          { x: 1188, y: 400, w: 25, h: 800, fill: C.wall, solid: true, invisible: true },
          { x: 600, y: 400, w: 1200, h: 800, fill: 0x000000, propKey: 'stage_cabin_interior', invisible: true },
          // North wall — the clock/window/TV band is a wall, not floor. Sealed all the
          // way up to the outer top wall (was only 21px thick down to y:163.5, leaving
          // a ~147px unenclosed void between it and the top wall — a player who dashed
          // through the thin strip landed in that void with no way back out). Also
          // widened a few px past the corridor's left wall to close a seam gap there.
          { x: 375, y: 99, w: 702, h: 171, fill: C.wall, solid: true, invisible: true },
          // Hallway (corridor) left wall, 3 segments — gaps are the living-room-open
          // threshold and two doorways into the kitchen/entry room.
          { x: 730, y: 197, w: 19, h: 342, fill: C.wall, solid: true, invisible: true },
          { x: 730, y: 535, w: 19, h: 119, fill: C.wall, solid: true, invisible: true },
          { x: 730, y: 741, w: 19, h: 111, fill: C.wall, solid: true, invisible: true },
          // Hallway right wall, 4 segments — gaps are the 3 bedroom/bathroom doors.
          { x: 863, y: 117, w: 23, h: 182, fill: C.wall, solid: true, invisible: true },
          { x: 863, y: 335, w: 23, h: 70, fill: C.wall, solid: true, invisible: true },
          { x: 863, y: 505, w: 23, h: 90, fill: C.wall, solid: true, invisible: true },
          { x: 863, y: 716, w: 23, h: 161, fill: C.wall, solid: true, invisible: true },
          // Top bedroom / bathroom divider, and bathroom / bottom bedroom divider.
          { x: 1025, y: 312, w: 300, h: 17, fill: C.wall, solid: true, invisible: true },
          { x: 1025, y: 472, w: 300, h: 16, fill: C.wall, solid: true, invisible: true },
          // Top bedroom furniture
          { x: 1002, y: 180, w: 120, h: 160, fill: C.desk, propType: 'bed', solid: true, invisible: true },
          { x: 905, y: 150, w: 59, h: 66, fill: C.desk, propType: 'desk', solid: true, invisible: true },
          { x: 1105, y: 150, w: 59, h: 66, fill: C.desk, propType: 'desk', solid: true, invisible: true },
          // Bathroom fixtures
          { x: 1002, y: 378, w: 43, h: 83, fill: 0xffffff, solid: true, invisible: true },
          { x: 1062, y: 372, w: 45, h: 71, fill: 0xe2e8f0, propType: 'sink', solid: true, invisible: true },
          { x: 1140, y: 400, w: 71, h: 125, fill: 0xe2e8f0, solid: true, invisible: true },
          // Bottom bedroom furniture (Eric & Alex's room)
          { x: 1087, y: 581, w: 148, h: 83, fill: C.desk, propType: 'bed', solid: true, invisible: true },
          { x: 1087, y: 726, w: 148, h: 81, fill: C.desk, propType: 'bed', solid: true, invisible: true },
          { x: 914, y: 521, w: 76, h: 71, fill: C.desk, propType: 'desk', solid: true, invisible: true },
          { x: 1132, y: 655, w: 57, h: 54, fill: C.desk, propType: 'desk', solid: true, invisible: true },
          // Kitchen
          { x: 580, y: 650, w: 220, h: 40, fill: C.counter, propType: 'counter', solid: true, invisible: true },
          { x: 690, y: 600, w: 50, h: 70, fill: C.fridge, propType: 'fridge', solid: true, invisible: true },
          { x: 470, y: 600, w: 50, h: 40, fill: C.sink, propType: 'sink', solid: true, invisible: true },
          // Living / dining room seating
          { x: 198, y: 295, w: 112, h: 194, fill: C.desk, propType: 'desk', solid: true, invisible: true },
          { x: 360, y: 430, w: 133, h: 110, fill: 0x8b1a1a, propType: 'couch', solid: true, invisible: true },
          { x: 605, y: 271, w: 119, h: 165, fill: C.couch, propType: 'couch', solid: true, invisible: true },
        ],
        labels: [],
        playerSpawn: { x: 650, y: 740 },
      },
      music: 'music_ch11_space_song', // "Space Song" — Beach House; continues from the Act 1 turn
      actors: [
        // understudyId === own id: keep the whole roster present even when the player IS
        // one of them (Day-4 grill task requires the player to walk up to Nick F — so if
        // the player is Nick F there must still be a Nick F NPC in the cabin, i.e. two of
        // them). Without this, Actors.placeActors() skips the slot the player occupies.
        // Coords aligned to the painted furniture in stage_cabin_interior.jpg (1200×800):
        // Eric & Alex sit on their two single beds (bottom-right room); Jordan & Maharko
        // lie in the shared double bed (top-right room); the healthy crew is on the living-
        // room seating and by the entry door — none of them float in the walkways anymore.
        { id: 'eric', x: 1050, y: 590, understudyId: 'eric' },                              // upper single bed
        { id: 'alex', x: 1050, y: 730, spriteKey: 'npc_alex_sheet' },                       // lower single bed
        { id: 'jordan', x: 968, y: 195 },                                                   // double bed, left pillow
        { id: 'maharko', x: 1035, y: 195, nameOverride: 'Maharko (bed-bound)' },            // double bed, right pillow
        { id: 'nick_h', x: 610, y: 300, understudyId: 'nick_h' },                           // green couch
        { id: 'nick_f', x: 330, y: 435, understudyId: 'nick_f' },                           // red armchair (sick — legs quit)
        { id: 'leo', x: 405, y: 445, spriteKey: 'npc_benji_sheet' }, // TEMP STAND-IN — no Leo sheet exists yet; second red armchair
        { id: 'benji', x: 335, y: 685, nameOverride: 'Benji (smoking)', spriteKey: 'npc_benji_sheet' }, // by the entry door
      ],
    },
    {
      // Scene 2 — Cabin Deck
      map: {
        width: 800,
        height: 600,
        backdrop: C.floorWood,
        theme: 'cabin',
        areaTitle: 'The Deck — Blue Ridge Overlook',
        // Collision-only — stage_cabin_deck backdrop already paints the gazebo
        // table/chairs, the Adirondack chair, and the grill.
        rects: [
          { x: 400, y: 8, w: 800, h: 16, fill: 0x64748b, propType: 'guardrail', solid: true, invisible: true },
          { x: 8, y: 300, w: 16, h: 600, fill: 0x64748b, propType: 'guardrail', solid: true, invisible: true },
          { x: 400, y: 592, w: 800, h: 16, fill: 0x64748b, propType: 'guardrail', solid: true, invisible: true },
          { x: 792, y: 139, w: 16, h: 262, fill: C.wall, solid: true, invisible: true },
          { x: 792, y: 481, w: 16, h: 222, fill: C.wall, solid: true, invisible: true },
          { x: 400, y: 300, w: 800, h: 600, fill: 0x000000, propKey: 'stage_cabin_deck', invisible: true },
          { x: 150, y: 100, w: 20, h: 20, fill: 0x1e293b, solid: true, invisible: true },
          { x: 450, y: 100, w: 20, h: 20, fill: 0x1e293b, solid: true, invisible: true },
          { x: 150, y: 380, w: 20, h: 20, fill: 0x1e293b, solid: true, invisible: true },
          { x: 450, y: 380, w: 20, h: 20, fill: 0x1e293b, solid: true, invisible: true },
          { x: 300, y: 240, w: 60, h: 60, fill: C.desk, propType: 'desk', solid: true, invisible: true },
          { x: 680, y: 120, w: 60, h: 50, fill: 0x1a1a1a, propType: 'firepit', solid: true, invisible: true },
          { x: 150, y: 500, w: 40, h: 40, fill: 0x8b1a1a, propType: 'bench', solid: true, invisible: true },
        ],
        labels: [],
        playerSpawn: { x: 740, y: 320 },
      },
      music: 'music_ch11_space_song',
      actors: [],
    },
  ],

  // Required by the type — mirrors scenes[0].
  map: {
    width: 700,
    height: 660,
    backdrop: C.floorTile,
    theme: 'suburb_night',
    areaTitle: 'The Balcony — One Floor Up',
    rects: [
      { x: 350, y: 8, w: 700, h: 16, fill: C.wall, solid: true, invisible: true },
      { x: 350, y: 652, w: 700, h: 16, fill: C.wall, solid: true, invisible: true },
      { x: 8, y: 330, w: 16, h: 660, fill: C.wall, solid: true, invisible: true },
      { x: 692, y: 330, w: 16, h: 660, fill: C.wall, solid: true, invisible: true },
      { x: 350, y: 330, w: 700, h: 660, fill: 0x000000, propKey: 'stage_oc_balcony_night', invisible: true },
      { x: 350, y: 622, w: 700, h: 40, fill: C.wall, propType: 'wall', solid: true, invisible: true },
      { x: 350, y: 48, w: 700, h: 16, fill: 0x64748b, propType: 'guardrail', solid: true, invisible: true },
      { x: 550, y: 500, w: 80, h: 60, fill: C.desk, propType: 'desk', invisible: true, solid: true },
    ],
    labels: [],
    playerSpawn: { x: 350, y: 590 },
  },
  actors: [
    { id: 'benji', x: 250, y: 560, nameOverride: 'Benji', spriteKey: 'npc_benji_sheet' },
    { id: 'maharko', x: 400, y: 320 },
    { id: 'girl_chopped', x: 460, y: 160, nameOverride: 'the chopped girl', spriteKey: 'npc_girl_sheet' },
    { id: 'girl_nonchopped', x: 260, y: 150, nameOverride: 'the other girl', spriteKey: 'npc_girl_sheet' },
  ],

  // ════════════════════════════════════════════════════════════════════════════
  // BEATS
  // ════════════════════════════════════════════════════════════════════════════
  beats: [
    // ─── ACT 1 — OCEAN CITY ─────────────────────────────────────────────────

    {
      id: 'act1_start',
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "Summer 2025. Eight of them, one condo, cig summer.",
        "This is the last one. Everybody knows it and nobody says it.",
      ],
    },

    // The spins — pure, unguarded "we made it" energy. No dread yet; that's earned
    // a few beats from now, not announced up front.
    { type: 'dialogue', speaker: 'leo', lines: ["We're here. I already feel like a different person."] },
    { type: 'dialogue', speaker: 'nick_f', lines: ["This is exactly what we needed. I feel like this is going to be the best week of the summer."] },
    { type: 'dialogue', speaker: 'maharko', lines: ["Bro it's literally going to be the best week of the summer and it hasn't even started."] },

    { type: 'dialogue', speaker: 'narrator', lines: ["H2O. Same door, same line, same nineteen-dollar cover."] },
    { type: 'dialogue', speaker: 'narrator', lines: ["Wrong crowd tonight. Younger. Louder. Not theirs anymore."] },
    { type: 'dialogue', speaker: 'benji', lines: ["This song was old two summers ago."] },
    { type: 'dialogue', speaker: 'eric', lines: ["That's it. That's the tell.", "We're too old for this.", "The H2O Era is over."] },
    { type: 'dialogue', speaker: 'narrator', lines: ["Nobody's counting how the night finds its crack yet. It already has."] },
    { type: 'changeMusic', key: 'music_ch11_space_song' }, // The Spins → Space Song, right at the turn

    { type: 'dialogue', speaker: 'narrator', lines: ["The bars work better. The fakes hold. The night gets its legs back."] },
    {
      type: 'dialogue',
      speaker: 'maharko',
      lines: ["Bro, I'm being so serious right now, it's like a drought.", "It's like the Rockies commercial. The two months. I'm in month two."],
    },
    { type: 'dialogue', speaker: 'jordan', lines: ["You've said 'month two' for four months."] },
    { type: 'dialogue', speaker: 'maharko', lines: ["Statistically that means I'm due."] },

    { type: 'walkTo', x: 350, y: 400, radius: 90, markerLabel: 'Head up to the balcony' },
    { type: 'cameraPan', x: 380, y: 155, durationMs: 1400, holdMs: 700 },

    {
      type: 'dialogue',
      speaker: 'benji',
      lines: ["(lights one, exhales) Evening.", "So — are we talking to them, or are we just looking?"],
    },
    { type: 'dialogue', speaker: 'maharko', lines: ["We're talking. Bro, it's literally now or never."] },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "The other girl is right there. Sober-adjacent, unbothered, watching this happen like weather.",
        "The chopped girl is not.",
        // ANCHOR NEEDED — brief flags this scene as needing a specific line/detail. Placeholder below.
        "She's got a red cup she keeps forgetting is empty and a laugh two seconds ahead of every joke.",
      ],
    },

    {
      type: 'choice',
      speaker: 'maharko',
      prompt: "The chopped girl is into it. The other girl might be, if you tried. Benji already opened the door.",
      options: [
        {
          text: 'Kiss the chopped girl.',
          reactionSpeaker: 'narrator',
          reactionLines: [
            "He does. Nobody upstairs claps, but Jordan will bring it up for the rest of the year.",
            "Four days from now, this is the only version of tonight anyone remembers.",
          ],
          goto: 'act2_open',
        },
        {
          text: 'Hold out for the other girl.',
          reactionSpeaker: 'narrator',
          reactionLines: [
            "She lets him talk for a while. It doesn't go anywhere, but it doesn't have to.",
            "Maharko walks back downstairs down bad in a much smaller, much survivable way.",
          ],
          goto: 'ending_b',
        },
        {
          text: "Don't go up at all.",
          reactionSpeaker: 'narrator',
          reactionLines: [
            "Benji's still in the shirt. Benji didn't go up to hook up, and neither does Maharko, this time.",
            "The trip four days from now is just a cabin trip.",
          ],
          goto: 'ending_c',
        },
      ],
    },

    // Main line only reachable via Choice 1, Option A.
    { id: 'act2_open', type: 'dialogue', speaker: 'narrator', lines: ["Four days later. A one-bathroom cabin in Shenandoah."] },
    { type: 'changeScene', sceneIndex: 1, transitionMs: 900 },

    // ─── ACT 2 — THE SIEGE ──────────────────────────────────────────────────
    // The spins already happened, back in OC — this act opens already mid-curdle,
    // not with another burst of hype. Leo's AC line here is a small dramatic-irony
    // callback (the AC dies Day 3), not a tone reset.

    { type: 'dialogue', speaker: 'leo', lines: ["Didn't even need the AC on the drive down. Good sign."] },

    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "The trip didn't start here. It just gets a building now.",
        "Two cars, one destination. Car 1 — Eric, Alex, Maharko, Jordan — pulls in first.",
      ],
    },

    { type: 'dialogue', speaker: 'eric', lines: ["This one. Alex and I are taking this one.", "Simply the most efficient claim — first car, first pick."] },
    { type: 'dialogue', speaker: 'alex', lines: ["The room's ours."] },
    { type: 'dialogue', speaker: 'narrator', lines: ["Maharko and Jordan take the other. The rest of the house is the living room, whenever Car 2 gets here."] },
    { type: 'dialogue', speaker: 'jordan', lines: ["Just to clarify — one bathroom. Eight people. That's the whole math."] },
    { type: 'dialogue', speaker: 'narrator', lines: ["The geometry locks before Car 2 even arrives. It will matter more than anyone in this room thinks."] },

    { type: 'minigame', modeId: 'cabinCollapse', config: { startDay: 2, meters: { water: 100, ac: 100, bugs: 15, illness: 0 } }, introLines: ["The cabin has been failing since you arrived.", "You just haven't noticed yet."], background: true },

    { type: 'minigame', modeId: 'silentDrive', config: {
      title: 'THE CALL FROM URGENT CARE',
      askerId: 'jordan', askerLabel: 'Jordan', askerColor: '#a78bfa',
      responderId: 'nick_h', responderLabel: 'Nick H', responderColor: '#94a3b8',
      promptOptions: ['What happened?', 'Is he okay?', 'Should we come get you?', 'How long is this going to take?', 'Do you need anything?'],
      responsePool: ['Kidney stones, apparently.', "He's fine. Loud about it, but fine.", "No, stay — we've still got to grab groceries.", 'No idea. Rural urgent care hours.', 'Just... time, I guess.'],
      rounds: 3,
    }, introLines: ["Jordan's phone buzzes.", "Car 2's pin is dropped on a hospital."], background: false },

    { type: 'dialogue', speaker: 'jordan', lines: ["Kidney stones. Leo. They'll be here by nine."] },

    { type: 'minigame', modeId: 'cabinCollapse', config: { startDay: 2, meters: { water: 100, ac: 100, bugs: 15, illness: 0 } }, introLines: [], background: true },

    // Day 2
    { id: 'day2_open', type: 'dialogue', speaker: 'narrator', lines: ["Day two. The water is out."] },
    { type: 'dialogue', speaker: 'narrator', lines: ["Maharko is sick. Bed-bound. The trip's first real bill comes due, and it's his."] },
    { type: 'dialogue', speaker: 'maharko', lines: ["Bro it's like — it's like when a server goes down. It's not, like, permanent. It's a patch issue."] },
    { type: 'dialogue', speaker: 'benji', lines: ["(exhales) Chef's down. Burgers it is."] },

    { type: 'dialogue', speaker: 'narrator', lines: ["Someone opens the west door for air."] },
    { type: 'changeScene', sceneIndex: 2, transitionMs: 700 },
    { type: 'dialogue', speaker: 'narrator', lines: ["The deck. Or what used to be the deck — the lanternflies have taken it, and nobody's contesting that anymore."] },
    { type: 'dialogue', speaker: 'benji', lines: ["(lights another one, doesn't move) Guess we're inside."] },
    { type: 'dialogue', speaker: 'narrator', lines: ["He's the only one still out here. Cig summer doesn't check the weather."] },
    { type: 'changeScene', sceneIndex: 1, transitionMs: 700 },

    // Night 1
    { type: 'dialogue', speaker: 'narrator', lines: ["Night falls on Day two. Eric and Alex have a plan and an iPad."] },
    { type: 'dialogue', speaker: 'eric', lines: ["Phase one is diagnostic. We're establishing the plan works.", "Simply a proof of concept."] },
    { type: 'dialogue', speaker: 'alex', lines: ["It's hidden."] },

    { type: 'minigame', modeId: 'speakerHunt', config: {
      night: 1,
      // Spread across the living room's four corners (measured against the wall/
      // furniture rects in scene 1's map) instead of clustered in one pocket near the
      // kitchen — the real speaker sits opposite the entryway, herrings cover the rest.
      speakers: [{ x: 650, y: 480, id: 'rung1_tv' }],
      redHerrings: [
        { x: 90, y: 230, bark: 'Someone checks behind the grandfather clock. Nothing.' },
        { x: 200, y: 650, bark: 'Nick H checks under the rug. Nothing.' },
        { x: 550, y: 230, bark: 'Someone checks the recliner. Nothing.' },
      ],
      barricade: { doorX: 863, doorY: 593 },
      timeLimitMs: 60000,
    }, introLines: ["Eric and Alex flip the switch.", "Somewhere in the living room, Ultraphonk starts blasting."], background: false, loseGoto: 'night1_found_it_late' },

    { id: 'night1_aftermath', type: 'dialogue', speaker: 'nick_h', lines: ["I mean.", "It was in the ottoman. Of course it was in the ottoman."] },
    { type: 'dialogue', speaker: 'alex', lines: ["The door's barricaded."] },
    { type: 'stopAllAudio', fadeMs: 200 },
    { type: 'dialogue', speaker: 'narrator', lines: ["Everyone goes to bed."] },
    { type: 'changeScene', sceneIndex: 1, transitionMs: 1800 },
    { type: 'screenTint', color: 0x000000, alpha: 0.94, durationMs: 400 },
    { type: 'sfx', key: 'sfx_ultraphonk', volume: 1.0 },
    { type: 'dialogue', speaker: 'nick_h', lines: ["Somewhere, another one starts.", "Someone has to get up."] },

    // Pitch black for the "waking up" beat above; lift it back to normal before the
    // hunt starts so the room reads as merely dim (speakerHunt's own 0.55 overlay
    // handles the "searching in the dark" look) rather than unnavigably black.
    { type: 'screenTint', color: 0x03050f, alpha: 0, durationMs: 500 },

    { type: 'minigame', modeId: 'speakerHunt', config: {
      night: 1,
      speakers: [{ x: 150, y: 400, id: 'rung1_second' }],
      barricade: { doorX: 863, doorY: 593 },
      timeLimitMs: 75000,
    }, introLines: ["Half-asleep. It's close, though."], background: false, loseGoto: 'night1_second_found_late' },
    { id: 'night1_after_second', type: 'dialogue', speaker: 'nick_h', lines: ["There.", "Back to bed."] },

    { type: 'minigame', modeId: 'cabinCollapse', config: { startDay: 3, meters: { water: 50, ac: 100, bugs: 20, illness: 1 } }, introLines: [], background: true },

    // Day 3
    { type: 'dialogue', speaker: 'narrator', lines: ["Day three. The AC died overnight — the living room is ninety degrees. The bedrooms are still cool.", "Water's out again. Jordan is sick now.", "Nobody's saying the word yet, but the trip has started keeping score."] },
    { type: 'dialogue', speaker: 'jordan', lines: ["Statistically, this was always going to happen. I shared a bed with the source event."] },
    { type: 'dialogue', speaker: 'narrator', lines: ["Jordan, Maharko, Nick F, and Leo do shrooms. Eric, Alex, and Benji go hike it off, offstage.", "Nick H stays behind. Nick H is the trip setter."] },

    { type: 'minigame', modeId: 'storyFractures', config: {
      storySegments: [
        { speaker: 'nick_h', text: "You're doing great, man. Real steady." },
        { speaker: 'nick_h', text: 'So, full disclosure — you peed yourself about ten minutes ago.', fractureId: 'peed', fractureHint: "That didn't happen." },
        { speaker: 'nick_f', text: '...I did?' },
        { speaker: 'nick_h', text: "Yeah. The bathroom's actually right there now — Jordan and Maharko's bed. That's the bathroom.", fractureId: 'bathroom_bed', fractureHint: 'That is definitely a bed.' },
        { speaker: 'jordan', text: '(from the bed, not moving) ...yeah that tracks.' },
        { speaker: 'nick_h', text: 'Also — quick heads up — your hands have been a different color this whole conversation.', fractureId: 'hands', fractureHint: 'His hands are normal.' },
        { speaker: 'nick_h', text: "You've actually been standing here for like forty minutes.", fractureId: 'time', fractureHint: "It's been four minutes, tops." },
        { speaker: 'nick_f', text: "I don't feel good." },
      ],
      reviewWindow: 4000,
      allowReplay: true,
      maxAttempts: 3,
      winTitle: 'Nick F believed all of it.',
      winBody: 'The peed pants, the color-shifting hands, the bed that was actually the bathroom — none of it was real. '
        + 'Nick H made it all up on the spot, and Nick F caught every lie anyway.',
      loseBody: 'Whatever Nick F actually noticed, he never got the chance to say it. Nick H just kept talking.',
    }, introLines: ['Nick H is the trip setter.', 'Nick F is not doing great.'], background: false, loseGoto: 'nickf_freakout_believes_it' },

    { id: 'freakout_aftermath', type: 'dialogue', speaker: 'benji', lines: ["(back from the hike, lights one) I go away for two hours."] },

    { type: 'minigame', modeId: 'cabinCollapse', config: { startDay: 3, meters: { water: 25, ac: 40, bugs: 20, illness: 2 } }, introLines: [], background: true },

    // Night 2
    { type: 'dialogue', speaker: 'narrator', lines: ["Night two."] },
    { type: 'dialogue', speaker: 'eric', lines: ["Phase two. We're incorporating lessons learned.", "The Escalation Era begins."] },
    { type: 'dialogue', speaker: 'alex', lines: ["Two, this time."] },

    { type: 'minigame', modeId: 'speakerHunt', config: {
      night: 2,
      speakers: [
        { x: 300, y: 220, id: 'rung2_pullout', requiresExtract: true },
        { x: 600, y: 580, id: 'rung2_corner', requiresExtract: true },
      ],
      barricade: { doorX: 863, doorY: 593 },
      timeLimitMs: 90000,
    }, introLines: ["Night two.", "It's under someone this time."], background: false, loseGoto: 'night2_found_it_late' },

    { id: 'night2_aftermath', type: 'dialogue', speaker: 'leo', lines: ["I'm fine.", "I just found a speaker inside my own pillow. That's all that happened."] },
    { type: 'stopAllAudio', fadeMs: 200 },
    { type: 'dialogue', speaker: 'narrator', lines: ["Everyone goes to bed."] },
    { type: 'changeScene', sceneIndex: 1, transitionMs: 1800 },
    { type: 'screenTint', color: 0x000000, alpha: 0.94, durationMs: 400 },
    { type: 'sfx', key: 'sfx_ultraphonk', volume: 1.0 },
    { type: 'dialogue', speaker: 'leo', lines: ["It's already going again.", "Somebody has to get up."] },

    // Same lift-before-hunt as Night 1 — pitch black for the wake-up beat, then back
    // to normal so the room is merely dim during the searchable minigame.
    { type: 'screenTint', color: 0x03050f, alpha: 0, durationMs: 500 },

    { type: 'minigame', modeId: 'speakerHunt', config: {
      night: 2,
      speakers: [{ x: 420, y: 560, id: 'rung2_second' }],
      barricade: { doorX: 863, doorY: 593 },
      timeLimitMs: 75000,
    }, introLines: ["Half-asleep. It's close, though."], background: false, loseGoto: 'night2_second_found_late' },
    { id: 'night2_after_second', type: 'dialogue', speaker: 'leo', lines: ["Found it.", "I'm never sleeping again."] },

    { type: 'minigame', modeId: 'cabinCollapse', config: { startDay: 4, meters: { water: 25, ac: 40, bugs: 30, illness: 2 } }, introLines: [], background: true },

    // Day 4
    { type: 'dialogue', speaker: 'narrator', lines: ["Day four. Nick F is sick now. Maharko still down. Jordan still bed-bound.", "Water's out most of the day.", "Three bodies in. The house is doing the math faster than anyone left in it."] },
    { type: 'dialogue', speaker: 'nick_f', lines: ["Honestly though, it's probably nothing. I feel like it's just — the trip catching up. In a fun way."] },

    // ── Day-4 GRILL RUN — the swarmSurvival ambush. Nick F (too sick to cook) hands off
    //    grill duty; the player walks to the deck door, the map switches to the deck
    //    (scene 2), and the swarm is revealed OUTSIDE. Because the fight is on scene 2, a
    //    loss has to return to Nick F's order INSIDE (scene 1) — so the loseGoto anchor is
    //    a changeScene(1) that rebuilds the cabin before re-giving the order. Jumping a
    //    scene-1 dialogue over the deck map (or re-running the walkTos against deck coords)
    //    would glitch. On the first pass the player is already in the cabin, so the anchor
    //    fade just reads as a soft time-cut. Lose → loseGoto: 'day4_grill_orders'.
    { type: 'dialogue', speaker: 'narrator', lines: ["Somebody still has to feed eight people. The chef rotation is down to whoever can stand upright — and the grill's already lit out on the deck."] },
    { id: 'day4_grill_orders', type: 'changeScene', sceneIndex: 1, transitionMs: 600 },
    { type: 'walkTo', x: 340, y: 520, radius: 90, markerLabel: 'Check on Nick F' },
    { type: 'dialogue', speaker: 'nick_f', lines: [
      "Oh thank god. Dude — the dogs are already on the grill out on the deck. I put 'em on, then my legs quit.",
      "Go flip 'em before they turn into charcoal pucks. I'd do it myself but I physically cannot stand up right now.",
    ] },
    { type: 'walkTo', x: 120, y: 430, radius: 80, markerLabel: 'Head out to the deck' },
    { type: 'changeScene', sceneIndex: 2, transitionMs: 700 },
    { type: 'dialogue', speaker: 'narrator', lines: [
      "The deck door swings open — and the deck is gone.",
      "Where the railing used to be there's a living wall of wings, and every one of them just clocked you.",
    ] },
    { type: 'minigame', modeId: 'swarmSurvival',
      introLines: ["Swat with J. Bug-bomb with K. Dash with SPACE. Hold the deck until the dogs are done."],
      loseGoto: 'day4_grill_orders',
      config: {
        theme: { label: 'GRILL DUTY', primaryLabel: 'SWAT [J]', secondaryLabel: 'BUG BOMB [K]', hudColor: '#a3e635' },
        survival: { durationMs: 60000, playerHp: 100 },
        primary: { damage: 1, reach: 60, arcDeg: 100, cooldownMs: 340, knockback: 55 },
        secondary: { charges: 2, damage: 3, radius: 120, cooldownMs: 10000 },
        waves: [
          { atMs: 0, enemyType: 'gnat', count: 8, spawnOverMs: 2500 },
          { atMs: 8000, enemyType: 'gnat', count: 12, spawnOverMs: 3500 },
          { atMs: 18000, enemyType: 'mosquito', count: 8, spawnOverMs: 3000 },
          { atMs: 27000, enemyType: 'gnat', count: 12, spawnOverMs: 3500 },   // overlaps the mosquitoes
          { atMs: 36000, enemyType: 'mosquito', count: 9, spawnOverMs: 3000 },
          { atMs: 45000, enemyType: 'wasp', count: 5, spawnOverMs: 2500 },     // spike: fast, tanky
          { atMs: 50000, enemyType: 'gnat', count: 18, spawnOverMs: 5000 },    // final crescendo
        ],
        enemyTypes: {
          gnat: { hp: 1, speed: 80, contactDamage: 8, behavior: 'zigzag', emoji: '🪰' },
          mosquito: { hp: 2, speed: 118, contactDamage: 14, behavior: 'homing', emoji: '🦟' },
          wasp: { hp: 3, speed: 138, contactDamage: 18, behavior: 'homing', emoji: '🐝' },
        },
      },
    },
    { type: 'dialogue', speaker: 'narrator', lines: ["The dogs are... mostly hot dogs. You grab the tray and get back through the door before the swarm pours in after you."] },
    { type: 'changeScene', sceneIndex: 1, transitionMs: 700 },
    { type: 'dialogue', speaker: 'nick_f', lines: [
      "My hero. Genuinely. That's going in the group chat.",
      "(beat) ...I still feel like absolute garbage though.",
    ] },

    { type: 'dialogue', speaker: 'narrator', lines: ["Eric notices the bathroom door can be forced open with a fork. It's hard. It's very hard. He files it anyway."] },
    { type: 'dialogue', speaker: 'eric', lines: ["Simply an infrastructure observation.", "The Bathroom Era starts tonight."] },

    // Night 3 — Choice 2
    { type: 'dialogue', speaker: 'narrator', lines: ["Night three. The last room. There's nowhere left to escalate to but here."] },
    {
      type: 'choice',
      speaker: 'eric',
      prompt: 'The fork works. The bathroom is the one room the living room can\'t get into without it. The plan is ready.',
      options: [
        {
          text: 'Lock the speaker in the bathroom.',
          reactionSpeaker: 'alex',
          reactionLines: ["It's locked. It's loud. It's done."],
          goto: 'night3_hunt',
        },
        {
          text: 'Skip it. Night two was enough.',
          reactionSpeaker: 'eric',
          reactionLines: ["We had the room. We had the fork.", "Simply choosing not to close the loop."],
          goto: 'day5_open',
        },
        {
          text: 'Hide it in the sick room instead.',
          reactionSpeaker: 'narrator',
          reactionLines: [
            "Jordan and Maharko, already down, now also under Ultraphonk.",
            "It's funny for about ten seconds. Then it's just mean.",
          ],
          goto: 'day5_open',
        },
      ],
    },

    { id: 'night3_hunt', type: 'minigame', modeId: 'speakerHunt', config: {
      night: 3,
      speakers: [{ x: 895, y: 390, id: 'rung3_bathroom' }],
      locked: { doorX: 863, doorY: 415 },
      barricade: { doorX: 863, doorY: 593 },
      timeLimitMs: 180000,
    }, introLines: ["Night three.", "This time, it's behind a locked door."], background: false },

    { type: 'dialogue', speaker: 'nick_h', lines: ["Fifteen minutes. Someone Googled how door locks work. We won."] },
    { type: 'dialogue', speaker: 'alex', lines: ["The door's barricaded.", "(beat) So's the bathroom, technically. We'll fix that."] },
    { type: 'stopAllAudio', fadeMs: 200 },
    { type: 'dialogue', speaker: 'narrator', lines: ["Everyone goes to bed. This one has to be the last one."] },
    { type: 'changeScene', sceneIndex: 1, transitionMs: 1800 },
    { type: 'screenTint', color: 0x000000, alpha: 0.94, durationMs: 400 },
    { type: 'sfx', key: 'sfx_ultraphonk', volume: 1.0 },
    { type: 'dialogue', speaker: 'eric', lines: ["(from the dark) We never actually found the first one, did we.", "Simply an oversight. The Cabin Era ends anyway."] },
    { type: 'screenTint', color: 0x03050f, alpha: 0, durationMs: 900 },

    { type: 'minigame', modeId: 'cabinCollapse', config: { startDay: 4, meters: { water: 25, ac: 40, bugs: 30, illness: 3 } }, introLines: [], background: true },

    // Day 5 — Fusion & Retreat (convergence point for both Choice 2 branches)
    { id: 'day5_open', type: 'dialogue', speaker: 'narrator', lines: [
      "Day five. Alex is sick. Leo is sick.",
      "The operator and the casualty are the same person now. That's the fusion.",
    ] },
    { type: 'dialogue', speaker: 'alex', lines: ["The bit's over.", "Turns out I was never immune. I just had a job."] },
    { type: 'dialogue', speaker: 'leo', lines: ["So. Kidney stones on the way in.", "This on the way out.", "I'm fine."] },
    { type: 'dialogue', speaker: 'narrator', lines: ["The water's not coming back on time. Nobody's chef. Nobody's fixing the AC.", "There's no vote. There's just a look that goes around the room."] },
    { type: 'dialogue', speaker: 'benji', lines: ["(still smoking, still in the shirt) So are we leaving, or are we just looking?"] },
    { type: 'dialogue', speaker: 'eric', lines: ["We're leaving.", "(quieter) The Cabin Era's over."] },
    { type: 'dialogue', speaker: 'narrator', lines: [
      "They pack the car the way they packed it five days ago, minus whoever's too sick to carry anything.",
      "The water comes back on at noon. Nobody's there to see it.",
    ] },

    { type: 'dialogue', speaker: 'narrator', lines: ["The villain was the cabin.", "And the cabin won."] },
    { type: 'endChapter' },

    // ─── ALTERNATE ENDINGS (Choice 1, Options B/C) — after endChapter, unreachable by fall-through ───

    { id: 'ending_b', type: 'dialogue', speaker: 'narrator', lines: [
      "Nothing happens on that balcony. Maharko walks it off, the way he always does.",
      "Four days later there's still a cabin trip. It rains twice. The bathroom line is annoying and nothing else is wrong.",
      "The villain needed a way in. Nobody gave it one.",
    ] },
    { type: 'endChapter' },

    { id: 'ending_c', type: 'dialogue', speaker: 'narrator', lines: [
      "Nobody goes upstairs. Benji finishes his cigarette and they head back down.",
      "The cabin trip happens exactly as booked. Boring, a little too hot, over on schedule.",
      "Maharko stays down bad the whole way home. That's the worst thing that happens to anybody.",
    ] },
    { type: 'endChapter' },

    // ─── LOSE-TIMEOUT REACTIONS (speakerHunt, non-punitive — converge back to fall-through) ───

    { id: 'night1_found_it_late', type: 'dialogue', speaker: 'nick_h', lines: ["Took forever. Found it anyway."] },
    { type: 'choice', speaker: 'narrator', prompt: '', options: [{ text: 'Continue', goto: 'night1_aftermath' }] },

    { id: 'night2_found_it_late', type: 'dialogue', speaker: 'leo', lines: ["Two speakers, way too long. Got 'em both eventually."] },
    { type: 'choice', speaker: 'narrator', prompt: '', options: [{ text: 'Continue', goto: 'night2_aftermath' }] },

    { id: 'night1_second_found_late', type: 'dialogue', speaker: 'nick_h', lines: ["Took a while, half-asleep. Found it anyway."] },
    { type: 'choice', speaker: 'narrator', prompt: '', options: [{ text: 'Continue', goto: 'night1_after_second' }] },

    { id: 'night2_second_found_late', type: 'dialogue', speaker: 'leo', lines: ["Took forever this time. Found it anyway."] },
    { type: 'choice', speaker: 'narrator', prompt: '', options: [{ text: 'Continue', goto: 'night2_after_second' }] },

    { id: 'nickf_freakout_believes_it', type: 'dialogue', speaker: 'nick_f', lines: ["(genuinely tries to use Jordan and Maharko's bed as the bathroom, is stopped)"] },
    { type: 'choice', speaker: 'narrator', prompt: '', options: [{ text: 'Continue', goto: 'freakout_aftermath' }] },
  ],
};

export default chapter11;

// ═══════════════════════════════════════════════════════════════════════════════
// FLAGS FOR STEP 5 / REVIEW
// ═══════════════════════════════════════════════════════════════════════════════
//
// LEAST CONFIDENT LINE: the placeholder detail about the chopped girl ("a red cup
// she keeps forgetting is empty...") — stands in for the brief's [ANCHOR NEEDED]
// flag. Swap for real material.
//
// JUDGMENT CALLS MADE (not fully specified by the brief):
// - Choice 1's Options B/C are written as genuine short alternate chapters that
//   end early (per the brief's own "the siege doesn't happen, but neither does
//   the story"), rather than a compressed version of Act 2. Flagged in the
//   outline discussion — revisit if you want B/C to still show some of the cabin.
// - Nick F's storyFractures troll lines (hands/time) are placeholders beyond the
//   brief's one confirmed anchor ("you peed yourself") — same anchor gap as above.
// - `girl_chopped`/`girl_nonchopped` are placement-only actor ids (non-canonical,
//   never used as a dialogue speaker) per the map design's own convention.
//
// ENGINE / MODE GAPS (blocking Step 5, not this step):
// - `speakerHunt`, `cabinCollapse` don't exist as modes yet — need building per
//   shenandoah_cabin_mechanic.md.
// - `silentDrive` exists but is hardcoded to different characters — needs the
//   generalized config (title/askerId/responderId/promptOptions/responsePool)
//   built into the actual mode file before this config will do anything.
// - `stage_oc_balcony_night`, `stage_cabin_interior`, `stage_cabin_deck` need
//   `safeLoadImage` calls added to ChapterScene.ts once final art exists —
//   stage_cabin_interior's current draft was flagged as a structural mismatch
//   and may still need regenerating (see map design doc).
// - This file lives in docs/chapter-pipeline/working/ for review. Per the
//   schema pipeline's own rule, it must be moved into src/data/chapters/ and
//   registered in index.ts as a real chapter file, not imported from here.

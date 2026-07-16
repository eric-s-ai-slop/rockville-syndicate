import type { ChapterConfig, ChapterSceneConfig, MapConfig, MapRect, ActorPlacement } from './types';
import { C } from './palette';

const W = 920;
const H = 660;

function stageMap(propKey: string, theme: MapConfig['theme'], areaTitle: string, playerSpawn: { x: number; y: number }, rects: MapRect[] = []): MapConfig {
  return {
    width: W,
    height: H,
    backdrop: C.floorTile,
    theme,
    noNatureScatter: true,
    areaTitle,
    rects: [
      { x: W / 2, y: H / 2, w: W, h: H, fill: 0x000000, propKey },
      // The commissioned backdrop already paints every door, desk, table, and wall.
      // These rectangles exist only for collision; procedural art would cover it.
      ...rects.map((rect) => ({ ...rect, invisible: true })),
    ],
    labels: [],
    playerSpawn,
  };
}

function scene(map: MapConfig, actors: ActorPlacement[], music: string): ChapterSceneConfig {
  return { map, actors, music };
}

const scene0 = scene(
  stageMap('stage_bens_51_monroe', 'apartment', '51 Monroe — Roof Access', { x: 460, y: 560 }, [
    { x: 460, y: 150, w: 180, h: 38, fill: C.door, propType: 'door', solid: true },
    { x: 460, y: 600, w: 170, h: 90, fill: C.wall, propType: 'wall', solid: true },
  ]),
  [
    { id: 'ben', x: 460, y: 250, nameOverride: 'Ben', spriteKey: 'hero_ben_sheet', understudyId: 'jacob' },
    { id: 'nick_f', x: 220, y: 360, nameOverride: 'Nick F', understudyId: 'nick_h' },
    { id: 'eric', x: 700, y: 380, nameOverride: 'Eric', understudyId: 'jacob' },
  ],
  'music_bens_the_box',
);

const scene1 = scene(
  stageMap('stage_bens_quarantine_bedroom', 'apartment', 'Quarantine — Ben’s Bedroom', { x: 460, y: 570 }, [
    { x: 700, y: 190, w: 240, h: 110, fill: C.desk, propType: 'desk', solid: true },
    { x: 210, y: 190, w: 240, h: 120, fill: C.rug, propType: 'bed', solid: true },
    { x: 460, y: 90, w: 110, h: 32, fill: C.door, propType: 'door', solid: true },
  ]),
  [
    { id: 'ben', x: 690, y: 270, nameOverride: 'Ben', spriteKey: 'hero_ben_sheet', understudyId: 'jacob' },
    { id: 'michael_bersofsky', x: 460, y: 120, nameOverride: 'Michael', spriteKey: 'hero_jacob_sheet' },
    { id: 'jordan', x: 140, y: 420, nameOverride: 'Jordan', understudyId: 'nick_h' },
    { id: 'maharko', x: 760, y: 430, nameOverride: 'Maharko', understudyId: 'jacob' },
  ],
  'music_ch6',
);

const scene2 = scene(
  stageMap('stage_bens_ocean_city_rental', 'florida', 'Ocean City — The Rental', { x: 460, y: 570 }, [
    { x: 740, y: 185, w: 100, h: 150, fill: C.fridge, propType: 'fridge', solid: true },
    { x: 220, y: 190, w: 220, h: 90, fill: C.couch, propType: 'couch', solid: true },
  ]),
  [
    { id: 'ben', x: 520, y: 250, nameOverride: 'Ben', spriteKey: 'hero_ben_sheet', understudyId: 'jacob' },
    { id: 'sophie', x: 180, y: 360, nameOverride: 'Sophie', spriteKey: 'npc_girl_sheet' },
    { id: 'linden', x: 350, y: 420, nameOverride: 'Linden', spriteKey: 'npc_girl_sheet' },
    { id: 'cara', x: 760, y: 360, nameOverride: 'Cara', spriteKey: 'npc_girl_sheet' },
    { id: 'eric', x: 600, y: 470, nameOverride: 'Eric', understudyId: 'jacob' },
  ],
  'music_bens_rubbin_off_the_paint',
);

const scene3 = scene(
  stageMap('stage_bens_mahargos_pool_room', 'pool_party', 'Mahargo’s House — Pool Room', { x: 460, y: 570 }, [
    { x: 470, y: 315, w: 330, h: 150, fill: C.floorWood, stroke: 0xc08457, propType: 'counter', solid: true },
  ]),
  [
    { id: 'ben', x: 470, y: 490, nameOverride: 'Ben', spriteKey: 'hero_ben_sheet', understudyId: 'jacob' },
    { id: 'jordan', x: 170, y: 360, nameOverride: 'Jordan', understudyId: 'nick_h' },
    { id: 'sean', x: 760, y: 360, nameOverride: 'Sean', spriteKey: 'enemy_frat_bro_sheet' },
    { id: 'maharko', x: 260, y: 500, nameOverride: 'Maharko', understudyId: 'jacob' },
  ],
  'music_bens_turban',
);

const scene4 = scene(
  stageMap('stage_bens_halloween_party', 'apartment', 'Halloween Party — Who Invited This Kid?', { x: 460, y: 570 }, [
    { x: 160, y: 220, w: 180, h: 100, fill: C.couch, propType: 'couch', solid: true },
    { x: 760, y: 220, w: 180, h: 100, fill: C.couch, propType: 'couch', solid: true },
  ]),
  [
    { id: 'ben', x: 460, y: 410, nameOverride: 'Ben', spriteKey: 'hero_ben_sheet', understudyId: 'jacob' },
    { id: 'nick_cox', x: 660, y: 270, nameOverride: 'Nick Cox', spriteKey: 'npc_alex_sheet' },
    { id: 'eric', x: 220, y: 430, nameOverride: 'Eric', understudyId: 'jacob' },
    { id: 'jordan', x: 760, y: 430, nameOverride: 'Jordan', understudyId: 'nick_h' },
  ],
  'music_bens_turban',
);

const scene5 = scene(
  stageMap('stage_bens_junior_classroom', 'apartment', 'Junior Year — The Whiteboard', { x: 460, y: 570 }, [
    { x: 460, y: 255, w: 400, h: 44, fill: 0xf8fafc, stroke: 0x0f172a, propType: 'window', solid: true },
    { x: 460, y: 430, w: 300, h: 80, fill: C.desk, propType: 'desk', solid: true },
  ]),
  [
    { id: 'jordan', x: 260, y: 420, nameOverride: 'Jordan', understudyId: 'nick_h' },
    { id: 'ben', x: 700, y: 430, nameOverride: 'Ben', spriteKey: 'hero_ben_sheet', understudyId: 'jacob' },
    { id: 'matthew', x: 640, y: 260, nameOverride: 'Matthew', spriteKey: 'npc_benji_sheet' },
  ],
  'music_bens_money_so_big',
);

const scene6 = scene(
  stageMap('stage_bens_f1_boss_arena', 'highway_night', 'Ben’s Formula One Career Plan', { x: 460, y: 570 }, [
    { x: 460, y: 430, w: 500, h: 160, fill: 0x111827, propType: 'road', solid: true },
  ]),
  [
    { id: 'ben', x: 460, y: 250, nameOverride: 'Ben — Future F1 Driver', spriteKey: 'hero_ben_sheet', understudyId: 'jacob' },
    { id: 'sean', x: 170, y: 520, nameOverride: 'Sean', spriteKey: 'enemy_frat_bro_sheet' },
  ],
  'music_bens_money_so_big',
);

const scene7 = scene(
  stageMap('stage_bens_engineering_classroom', 'apartment', 'Senior Year — Engineering Class', { x: 460, y: 570 }, [
    { x: 460, y: 370, w: 340, h: 120, fill: C.floorWood, propType: 'desk', solid: true },
    { x: 180, y: 230, w: 150, h: 100, fill: C.desk, propType: 'desk', solid: true },
  ]),
  [
    { id: 'ben', x: 460, y: 450, nameOverride: 'Ben', spriteKey: 'hero_ben_sheet', understudyId: 'jacob' },
    { id: 'substitute', x: 760, y: 220, nameOverride: 'Long-Term Substitute', spriteKey: 'hero_jacob_sheet' },
    { id: 'eric', x: 220, y: 470, nameOverride: 'Eric', understudyId: 'jacob' },
  ],
  'music_ch11_spins',
);

const scene8 = scene(
  stageMap('stage_bens_scenic_overlook', 'highway_night', 'I-270 Scenic Overlook', { x: 460, y: 570 }, [
    { x: 100, y: 350, w: 80, h: 420, fill: C.wall, propType: 'guardrail', solid: true },
    { x: 820, y: 350, w: 80, h: 420, fill: C.wall, propType: 'guardrail', solid: true },
  ]),
  [
    { id: 'ben', x: 400, y: 400, nameOverride: 'Ben', spriteKey: 'hero_ben_sheet', understudyId: 'jacob' },
    { id: 'maharko', x: 590, y: 400, nameOverride: 'Maharko', understudyId: 'jacob' },
  ],
  'music_ch11_space_song',
);

const chapter13BensLife: ChapterConfig = {
  id: 'bens_life',
  index: 13,
  title: 'Ben’s Life',
  subtitle: 'The Only Known Man With a Sippy Cup and a Car Battery',
  location: '51 Monroe → I-270 Scenic Overlook',
  description: 'A chronological roast compilation of Ben’s locked doors, impossible plans, and increasingly portable hazards.',
  kind: 'flashback',
  estimatedMinutes: { min: 12, max: 18 },
  map: scene0.map,
  actors: scene0.actors,
  scenes: [scene0, scene1, scene2, scene3, scene4, scene5, scene6, scene7, scene8],
  cameraZoom: 2,
  beats: [
    { type: 'dialogue', speaker: 'narrator', lines: ['This was the first unmistakable Ben incident.', 'The door was locked. Ben responded by designing a military operation.'] },
    { type: 'dialogue', speaker: 'ben', lines: ['I can get onto the roof.', 'The only issue is the final door.'] },
    { type: 'dialogue', speaker: 'nick_f', lines: ['It is a normal locked door.', 'Ben had a different interpretation of the word normal.'] },
    { type: 'walkTo', x: 460, y: 180, radius: 75, markerLabel: 'Approach the locked roof door' },
    {
      type: 'minigame', modeId: 'benRoofHeist', config: { levels: 3 },
      introLines: ['Ben opens the tactical simulator.', 'Build the operation. Test the physics. Breach the completely ordinary door.'],
    },
    { type: 'dialogue', speaker: 'narrator', lines: ['The plan is complete.', 'The door remains locked.'] },
    { type: 'dialogue', speaker: 'ben', lines: ['My phone is about to die.', 'It has been about to die for two years.'] },
    { type: 'sfx', key: 'sfx_message_ding', volume: 0.5 },
    { type: 'changeScene', sceneIndex: 1, transitionMs: 850 },

    { type: 'dialogue', speaker: 'narrator', lines: ['Quarantine. His parents blocked the internet after eight.', 'Ben built a Raspberry Pi and treated the router like a hostile government.'] },
    { type: 'dialogue', speaker: 'ben', lines: ['I have to get ready for bed.', 'This process will take one hour for reasons I will not explain.'] },
    { type: 'dialogue', speaker: 'jordan', lines: ['He is back on Rust.', 'He is also extremely loud.'] },
    { type: 'walkTo', x: 690, y: 270, radius: 70, markerLabel: 'Check Ben’s late-night operation' },
    {
      type: 'minigame', modeId: 'benRustRaid', config: { raidSeconds: 42, panicSeconds: 24, lootGoal: 6 },
      introLines: ['The Rust base is being raided.', 'Michael is coming down the hallway. Save what you can, then reach the bed.'],
    },
    { type: 'sfx', key: 'sfx_door_open', volume: 0.7 },
    { type: 'dialogue', speaker: 'ben', lines: ['MICHEAL IS PICKING MY LOCK.'] },
    { type: 'dialogue', speaker: 'narrator', lines: ['The spelling was preserved.', 'So was the panic.'] },
    { type: 'choice', speaker: 'jordan', prompt: 'Ben muted himself but left the camera on. What does the group do?', options: [
      { text: 'Tell Ben immediately.', reactionSpeaker: 'jordan', reactionLines: ['We tell him. Eventually.'] },
      { text: 'Say nothing and keep watching.', reactionSpeaker: 'maharko', reactionLines: ['Bro, this is live television.'] },
      { text: 'Ask if everyone can see this.', reactionSpeaker: 'narrator', reactionLines: ['Everyone could see it. That was the problem.'] },
    ] },
    { type: 'changeScene', sceneIndex: 2, transitionMs: 850 },

    { type: 'dialogue', speaker: 'narrator', lines: ['Summer after sophomore year. Ocean City.', 'The Brooks were already unrecoverable. The wife beater was apparently a uniform.'] },
    { type: 'dialogue', speaker: 'ben', lines: ['Watch this.', 'No, seriously. Watch this.'] },
    { type: 'walkTo', x: 520, y: 250, radius: 75, markerLabel: 'See what Ben is about to do' },
    { type: 'dialogue', speaker: 'narrator', lines: ['Ben drank toilet water through a straw in front of three girls.', 'The group has never found a second explanation.'] },
    { type: 'sfx', key: 'sfx_ben_straw_slurp', volume: 0.8 },
    {
      type: 'minigame', modeId: 'benOutbreak', config: { durationSeconds: 58 },
      loseGoto: 'ocean_city_after', introLines: ['Keep Eric’s exposure below 100%.', 'Click rooms to move Eric. Vent green rooms. Click contaminated garbage.'],
    },
    { id: 'ocean_city_after', type: 'dialogue', speaker: 'narrator', lines: ['Eric either survives the room or becomes PATIENT: IMMEDIATE.', 'Either way, he still gets sick the following week.', 'TRANSMISSION CHAIN: COMPLETELY UNVERIFIED. BLAME ASSIGNED TO BEN ANYWAY.'] },
    { type: 'dialogue', speaker: 'ben', lines: ['G-force training.', 'You have to strengthen the neck.'] },
    { type: 'dialogue', speaker: 'maharko', lines: ['Bro, it is literally a resistance band around his head.', 'He is training like the wall is moving.'] },
    { type: 'changeScene', sceneIndex: 3, transitionMs: 850 },

    { type: 'dialogue', speaker: 'narrator', lines: ['Junior year. Mahargo’s pool room.', 'Colleen had sent Ben half a ceiling. Ben began the analysis.'] },
    { type: 'dialogue', speaker: 'ben', lines: ['How long should I wait to respond?', 'How much of my face should be visible?'] },
    { type: 'dialogue', speaker: 'sean', lines: ['Ben needs a reply delay, a camera angle, and an exact percentage of face.', 'We are about to optimize a response to a ceiling.'] },
    { type: 'walkTo', x: 470, y: 315, radius: 90, markerLabel: 'Take the pool shot for Colleen' },
    { type: 'dialogue', speaker: 'jordan', lines: ['Hit this pool ball for Colleen.'] },
    {
      type: 'minigame', modeId: 'benPoolShot', config: { rounds: 3 },
      introLines: ['Three shots. Real physics. Keep Ben in frame if you can.'],
    },
    { type: 'dialogue', speaker: 'narrator', lines: ['The footage was reviewed more carefully than the shot.', 'The failure still felt romantic.'] },
    { type: 'changeScene', sceneIndex: 4, transitionMs: 850 },

    { type: 'dialogue', speaker: 'narrator', lines: ['Halloween party. The room was full of people who had been invited.', 'Nick Cox saw Ben and found the exception.'] },
    { type: 'dialogue', speaker: 'nick_cox', lines: ['Who invited this kid?'] },
    { type: 'dialogue', speaker: 'narrator', lines: ['The line entered the archive immediately.'] },
    { type: 'dialogue', speaker: 'ben', lines: ['Dude, I’m so drunk.', 'Parents’ alc.'] },
    { type: 'choice', speaker: 'sean', prompt: 'Ben says he is hip. How does the group classify this?', options: [
      { text: 'A bold social claim.', reactionSpeaker: 'sean', reactionLines: ['How are you hip? Benjamin got no play.'] },
      { text: 'A cry for help.', reactionSpeaker: 'jordan', reactionLines: ['He is home alone.'] },
      { text: 'A new historical artifact.', reactionSpeaker: 'narrator', reactionLines: ['The group names it parents’ alc and moves on.'] },
    ] },
    { type: 'dialogue', speaker: 'eric', lines: ['Maria Brooke was a separate chapter.', 'Ben almost skipped track practice for a fictional volleyball game.'] },
    { type: 'changeScene', sceneIndex: 5, transitionMs: 850 },

    { type: 'dialogue', speaker: 'narrator', lines: ['The classroom whiteboard became a public document.', 'Things Ben Can Do. Things Ben Can’t Do. No context supplied.'] },
    { type: 'dialogue', speaker: 'jordan', lines: ['We need categories.', 'The categories are not legally binding.'] },
    { id: 'whiteboard_retry', type: 'walkTo', x: 460, y: 255, radius: 95, markerLabel: 'Read the whiteboard' },
    { type: 'minigame', modeId: 'benTrivia', config: { count: 18, perPromptMs: 3000, minPromptMs: 1800, strikesAllowed: 6, seed: 13 }, loseGoto: 'whiteboard_retry', introLines: ['Sort all 18 claims.', 'Six mistakes ends the attempt. The board must be completed to continue.'] },
    { id: 'whiteboard_after', type: 'choice', speaker: 'jordan', prompt: 'The board is full. What gets added to the archive?', options: [
      { text: 'One accurate thing Ben can do.', reactionSpeaker: 'jordan', reactionLines: ['One genuine ability. Defended under protest.'] },
      { text: 'Another impossible rule.', reactionSpeaker: 'narrator', reactionLines: ['The board becomes more official.'] },
      { text: 'Send the photograph to Ben.', reactionSpeaker: 'ben', reactionLines: ['Why is everybody sending me this?'] },
    ] },
    { type: 'dialogue', speaker: 'narrator', lines: ['Brown grocery bag. Peanut butter and jelly.', 'Then the sippy cup appeared, and the equipment progression became impossible to defend.'] },
    { type: 'changeScene', sceneIndex: 6, transitionMs: 850 },

    { type: 'dialogue', speaker: 'narrator', lines: ['Ben did not merely like Formula One.', 'He had a complete career plan. Sean heard the plan first.'] },
    { type: 'dialogue', speaker: 'sean', lines: ['He gets a job at a racing facility far away.', 'It pays around fifteen dollars an hour.', 'He sleeps under a bridge. Then he buys the suit.'] },
    { type: 'minigame', modeId: 'benF1Plan', config: { title: 'THE BRIDGE-BORN CHAMPION' }, introLines: ['Ask the next question.', 'Every answer removes another normal option.'] },
    { type: 'dialogue', speaker: 'ben', lines: ['The kart comes later.', 'Bitches on yachts.'] },
    { type: 'dialogue', speaker: 'narrator', lines: ['CAREER PLAN: FULLY DOCUMENTED.', 'VIABILITY: NOT ASSESSED.'] },
    { type: 'changeScene', sceneIndex: 7, transitionMs: 850 },

    { type: 'dialogue', speaker: 'narrator', lines: ['Senior year. Ben brought a car battery into engineering class.', 'This was the natural endpoint of the equipment arc.'] },
    { type: 'walkTo', x: 460, y: 430, radius: 90, markerLabel: 'Inspect Ben’s classroom workbench' },
    { type: 'dialogue', speaker: 'ben', lines: ['I can make the graphite glow.', 'Watch the substitute. He does not care.'] },
    { type: 'minigame', modeId: 'benCircuitLab', config: { holdSeconds: 6 }, introLines: ['Choose the graphite path.', 'Control the current. Keep it glowing without destroying the pencil.'] },
    { type: 'dialogue', speaker: 'narrator', lines: ['The graphite became extremely bright and began smoking.', 'The substitute remained at the desk.'] },
    { type: 'changeScene', sceneIndex: 8, transitionMs: 950 },

    { type: 'dialogue', speaker: 'narrator', lines: ['One story was different because Eric was not there.', 'Maharko remembers the overlook.'] },
    { type: 'dialogue', speaker: 'maharko', lines: ['Ben asked me to turn off the lights.', 'Then he said, “Dude, dude, just go to sleep.”'] },
    { type: 'walkTo', x: 400, y: 400, radius: 90, markerLabel: 'Sit with Ben at the overlook' },
    { type: 'dialogue', speaker: 'maharko', lines: ['He said he could not go home.', 'So we stayed there in the dark for a while.'] },
    { type: 'dialogue', speaker: 'narrator', lines: ['The memory lets the silence stand.', 'Eventually, Maharko drove Ben home.'] },
    { type: 'dialogue', speaker: 'narrator', lines: ['Ben drifted from the group.', 'The Dubai bitches are still waiting.'] },
    { type: 'endChapter' },
  ],
};

export default chapter13BensLife;

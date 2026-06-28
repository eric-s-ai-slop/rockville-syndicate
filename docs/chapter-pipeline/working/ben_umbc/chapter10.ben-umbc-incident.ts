// ========================================================
// CHAPTER 3: THE UMBC INCIDENT
// ========================================================

import { ChapterConfig } from '../../../src/data/chapters/types';
import { C } from '../../../src/data/chapters/palette';
import { scenes } from './ben_umbc_map';

export const map = scenes[0].map;
export const actors = scenes[0].actors;

export const chapter3: ChapterConfig = {
  id: 'umbc_incident',
  index: 6,
  title: 'The UMBC Incident',
  subtitle: 'Act III — The Pariah Event',
  location: 'UMBC Frat Basement / Parking Lot at Night',
  description:
    'Ben washes out of LMU, goes to a UMBC frat party with Maharko, and burns his last bridge — while the person who brought him there tells a story that keeps himself out of the ashes.',
  kind: 'chapter',

  map: scenes[0].map,
  actors: scenes[0].actors,
  scenes: scenes,

  beats: [

    // ── SCENE 0: UMBC FRAT BASEMENT ──────────────────────────────────────────

    // 1. NARRATOR — LMU verdict
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The chat was quiet for three days.',
        'Then the news arrived. Ben flunked out.',
        'No one was surprised.',
      ]
    },

    // 2. ERIC — not cruel, just certain
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        'The process simply requires participation.',
        "Eric doesn't debate the transcript.",
      ]
    },

    // 3. NICK H
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        'I mean.',
        'Saw it coming sophomore year.',
      ]
    },

    // 4. NARRATOR — the invite
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Maharko texted him as a fallback.',
        'Nick H was the first choice.',
        'Ben said yes before the message finished loading.',
      ]
    },

    // 5. NARRATOR — the drive
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The Audi S5. Travis Scott. The stew in the back.',
        'Ben was performing before they even got there.',
      ]
    },

    // 6. NARRATOR — basement setting
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The basement smelled like stale beer.',
        '"Beauty and a Beat" on loop.',
        'The girls drifted at the edges.',
      ]
    },

    // 7. CAMERA PAN — reveal Ben at center
    { type: 'cameraPan', x: 460, y: 280, durationMs: 1200, holdMs: 500 },

    // 8. WALKTO — find Ben
    { type: 'walkTo', x: 380, y: 350, radius: 80, markerLabel: 'Find Ben' },

    // 9. BEN — stew offer
    {
      type: 'dialogue',
      speaker: 'ben',
      lines: [
        'Hey, try this stew I brought.',
        "It's a thing. You'll like it.",
      ]
    },

    // 10. NARRATOR — freeze-frame
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Ben moved through the room.',
        'Then the freeze-frame.',
      ]
    },

    // 11. BEN — the line
    {
      type: 'dialogue',
      speaker: 'ben',
      lines: [
        "You're next.",
      ]
    },

    // 12. NARRATOR — the shhh + Maharko watching
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Finger over his mouth.',
        'Shhh.',
        'In the background: Maharko. Watching.',
      ]
    },

    // 13. BOSS FIGHT — Ben's self-justifications
    // NOTE: requires new BossConfig 'boss_ben_umbc' in entities.ts (see bottom of file)
    {
      type: 'bossFight',
      bossId: 'boss_ben_umbc',
      arena: { x: 460, y: 330, w: 760, h: 520 },
      introLines: [
        'BEN — The Ghost at the Party',
        'Cut through the version of the night he told himself.',
      ]
    },

    // 14. NARRATOR — frat guys intervene
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The frat guys appeared.',
        '"Get your boy and leave."',
      ]
    },

    // 15. MAHARKO — active, steering Ben out (not retrospective)
    {
      type: 'dialogue',
      speaker: 'maharko',
      lines: [
        'Bro. Come on.',
        "We're leaving right now.",
      ]
    },

    // 16. NARRATOR — the drive back
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        "Ben left on Maharko's arm.",
        "Travis Scott didn't play on the drive back.",
        'Nobody said anything.',
      ]
    },

    // 17. CHANGE SCENE — parking lot
    { type: 'changeScene', sceneIndex: 1, transitionMs: 800 },

    // ── SCENE 1: PARKING LOT ─────────────────────────────────────────────────

    // 18. NARRATOR — four days, Ben dark
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Four days. Ben went dark.',
        'No texts. Not in the group chat.',
        'The group noticed. Nobody named it.',
      ]
    },

    // 19. ERIC — clocking the silence
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        'Has anyone heard from Ben?',
        "He hasn't responded to anything since Thursday.",
      ]
    },

    // 20. NICK F
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        'I called him. Went to voicemail.',
        'Honestly, maybe he just needs some space. Something happened.',
      ]
    },

    // 21. ERIC
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        'Something happened.',
        'Maharko knows.',
      ]
    },

    // 22. WALKTO — find Maharko
    { type: 'walkTo', x: 460, y: 320, radius: 80, markerLabel: 'Find Maharko' },

    // 23. MAHARKO — opens the confession
    {
      type: 'dialogue',
      speaker: 'maharko',
      lines: [
        'Okay. Look.',
        'I need to tell you guys something about UMBC.',
      ]
    },

    // 24. ERIC
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        'What happened.',
      ]
    },

    // 25. MINIGAME — storyFractures
    {
      type: 'minigame',
      modeId: 'storyFractures',
      background: false,
      introLines: [
        "MAHARKO'S STORY — The Version He Told",
        'Mark the fractures. The truth is in the details.',
      ],
      config: {
        storySegments: [
          {
            speaker: 'Maharko',
            text: 'So we were at UMBC. Frat party. Ben brought the stew, as usual. He was drinking, having a good time.',
          },
          {
            speaker: 'Maharko',
            text: 'I was over by the speakers, talking to some guys.',
            fractureId: 'location',
            fractureHint: 'Were you?',
          },
          {
            speaker: 'Maharko',
            text: "I saw Ben talking to a couple girls, but I didn't think anything of it.",
            fractureId: 'count',
            fractureHint: 'A couple?',
          },
          {
            speaker: 'Maharko',
            text: 'Next thing I know, some frat guys come up to me and say "get your boy and leave."',
          },
          {
            speaker: 'Maharko',
            text: "I was like, what? I didn't see anything.",
            fractureId: 'blindness',
            fractureHint: 'Nothing?',
          },
          {
            speaker: 'Maharko',
            text: 'They said he was being inappropriate. I had to steer him out. He was drunk, barely walking.',
          },
          {
            speaker: 'Maharko',
            text: "On the drive back, he didn't say much. I didn't know what happened until later.",
            fractureId: 'timing',
            fractureHint: 'Later?',
          },
        ],
        scrollSpeed: 35,
        reviewWindow: 3000,
        allowReplay: true,
        maxAttempts: 3,
      }
    },

    // 26. NARRATOR — the look
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Nick F looked at Eric.',
        'Eric looked at Nick F.',
        'The math was silent: he was close enough to hear that.',
      ]
    },

    // 27. CHOICE — push or let go
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: "What do you do with the crack in Maharko's story?",
      options: [
        {
          text: '"You heard him say \'you\'re next.\' How close were you standing?"',
          reactionSpeaker: 'maharko',
          reactionLines: [
            'What are you, the police now?',
            'I was at the speakers, bro.',
          ],
        },
        {
          text: '"He actually said that? What the hell."',
          reactionSpeaker: 'nick_f',
          reactionLines: [
            'Yeah. What the hell, Ben.',
          ],
        },
      ]
    },

    // 28. NARRATOR — last line, verbatim from brief
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Ben went quiet after that.',
        'The group let the distance grow.',
        "What Maharko saw — or didn't see — was never asked again.",
      ]
    },

    // 29. END CHAPTER
    { type: 'endChapter' },

  ],
};

export default chapter3;

// ============================================================
// ENTITIES.TS ADDITION — paste into src/data/entities.ts
// boss_ben is already taken (Michael Bersofsky, Ch6).
// This chapter needs a new entry: boss_ben_umbc.
// ============================================================

/*
{
  id: 'boss_ben_umbc',
  name: 'Ben Bersofsky',
  title: 'The Ghost at the Party',
  maxHp: 1200,
  combatBarks: [
    "I was just having fun.",
    "She was into it.",
    "Everyone was drinking. It wasn't like that.",
    "You don't know what happened in there.",
    "Maharko was right there. Ask him.",
    "I didn't do anything wrong.",
  ],
  weaknessQTE: {
    question: 'Ben deploys Phase 2: "She was into it." What breaks through?',
    options: [
      '"You\'re next." Three girls. A pattern.',
      'He was drunk — it doesn\'t count when you\'re drunk.',
      'She smiled at him first. That\'s on her.',
    ],
    correctAnswer: '"You\'re next." Three girls. A pattern.',
    damage: 50,
  },
  actions: [
    '"I Was Just Having Fun" — AoE rationalization wave',
    '"She Was Into It" — targeted deflection, reduces incoming damage 30%',
    '"Maharko Was There Too" — deflection shield, must be broken before Ben takes damage',
  ],
  phaseBarks: {
    2: "You don't understand. You weren't there.",
    1: '...',  // Final phase: silence. Ben stops fighting. One last hit lands.
  },
},
*/

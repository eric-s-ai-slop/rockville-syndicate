export interface PressurePoint {
  id: string;
  prompt: string;
  windowMs: number;
  benLine: string;
  resolveOnIgnore: number;
}

export interface TimelineMessage {
  t: number;
  thread: 'dm' | 'gc';
  speaker: string;
  text: string;
  photo?: boolean;
  resolve?: number;
  pressure?: PressurePoint;
  /** When this message spawns, duck the stage music down and leave it there
   *  (the bit "loses its air"). Set on the turn — the chapter's tonal pivot. */
  duck?: boolean;
}

// The Maria Brooke catfish, beat for beat. Four movements:
//   1. THE HOOK      — Maria opens, Ben bites, the GC goes live.
//   2. THE PERFORMANCE — Ben flexes for a girl who doesn't exist. The GC feeds.
//   3. THE REEL-IN   — Maria gets personal. Ben opens up. It starts to mean something.
//   4. THE TURN      — the bit loses its air (duck). Ben chooses her over track.
// Pressure points are the player's chances to break the fiction. The resolve
// values + resolveOnIgnore are tuned so Ben's commitment bar tracks the story
// and crests right at the skip. Staying in the bit pushes him there faster.
export const TIMELINE: TimelineMessage[] = [
  // ── 1. THE HOOK ───────────────────────────────────────────────────────────
  { t: 1500,  thread: 'dm', speaker: 'Maria Brooke', text: "heyy this is gonna sound random but are you ben? i think we have mutuals", resolve: 4 },
  { t: 4500,  thread: 'gc', speaker: 'Eric',         text: "he opened it. we are LIVE 🎬" },
  { t: 6500,  thread: 'dm', speaker: 'Ben',          text: "haha yeah thats me, whats up" },
  { t: 8500,  thread: 'gc', speaker: 'Jordan',       text: "BRO he said whats up in 2 seconds 😭" },
  { t: 10500, thread: 'dm', speaker: 'Maria Brooke', text: "lol nothing i just saw your name on someones story. you go to RM?", resolve: 6 },
  { t: 12800, thread: 'dm', speaker: 'Ben',          text: "yeah RM, u?" },
  { t: 14500, thread: 'dm', speaker: 'Maria Brooke', text: "wootton. im a senior 👀", resolve: 6 },
  { t: 16500, thread: 'gc', speaker: 'Nick F',       text: "an OLDER girl. bro is gonna lose his mind" },
  { t: 18500, thread: 'dm', speaker: 'Ben',          text: "oh word thats cool" },
  { t: 20000, thread: 'dm', speaker: 'Ben',          text: "wait you got snap?" },
  { t: 21500, thread: 'gc', speaker: 'Jordan',       text: "NO bro do not ask for the snap 😭" },
  { t: 23000, thread: 'dm', speaker: 'Maria Brooke', text: "no i stopped using snap lol, ig only", resolve: 4 },
  { t: 24800, thread: 'dm', speaker: 'Maria Brooke', text: "someone told me you run track and you're like actually fast?", resolve: 6, pressure: {
      id: 'flex', prompt: "Ben thinks she's real. He's about to perform. Say something?", windowMs: 5000, benLine: "lol who's hyping me up", resolveOnIgnore: 14
  } },

  // ── 2. THE PERFORMANCE ────────────────────────────────────────────────────
  { t: 26800, thread: 'dm', speaker: 'Ben',          text: "lol who told you that 😅 but yeah i run the 800 and 4x4" },
  { t: 28800, thread: 'dm', speaker: 'Ben',          text: "oh yeah i race karts too, gettin pretty good ngl 🏎️" },
  { t: 30500, thread: 'gc', speaker: 'Eric',         text: "the KART flex 😭 hes listing hobbies for a folder of pixels" },
  { t: 32200, thread: 'dm', speaker: 'Maria Brooke', text: "ok flex 😏 send a pic? i wanna see who im talking to", resolve: 6 },
  { t: 34200, thread: 'dm', speaker: 'Ben',          text: "(sends photo — no caption)", photo: true, pressure: {
      id: 'photo', prompt: "He just sent his actual face. Step in?", windowMs: 5000, benLine: "hope that wasn't a weird pic to send", resolveOnIgnore: 12
  } },
  { t: 36200, thread: 'gc', speaker: 'Nick H',       text: "💀💀💀 NOT the photo" },
  { t: 37700, thread: 'gc', speaker: 'Jordan',       text: "he sent his face UNPROMPTED. unprompted!!" },
  { t: 39700, thread: 'dm', speaker: 'Maria Brooke', text: "awww you're cute 🥹 do you have a gf?", resolve: 8 },
  { t: 41700, thread: 'dm', speaker: 'Ben',          text: "nah single rn lol" },
  { t: 43200, thread: 'gc', speaker: 'Maharko',      text: "the door is CLOSED and he doesnt even know" },
  { t: 44700, thread: 'dm', speaker: 'Maria Brooke', text: "good to know 😌", resolve: 8 },

  // ── 3. THE REEL-IN ────────────────────────────────────────────────────────
  { t: 47200, thread: 'dm', speaker: 'Maria Brooke', text: "wait do you know ethan rosner? he says he knows you" },
  { t: 49200, thread: 'dm', speaker: 'Ben',          text: "oh wait the senior? maybe yeah" },
  { t: 51000, thread: 'dm', speaker: 'Maria Brooke', text: "yeah he was hyping you up actually, said you're a good dude" },
  { t: 52700, thread: 'dm', speaker: 'Ben',          text: "lol thats nice of him fr" },
  { t: 54200, thread: 'gc', speaker: 'Eric',         text: "ethan rosner is also me btw 🙂" },
  { t: 55700, thread: 'gc', speaker: 'Jordan',       text: "you ARE the entire school at this point 😭" },
  { t: 57700, thread: 'dm', speaker: 'Maria Brooke', text: "i have a volleyball game saturday if you wanna come watch :)", resolve: 10, pressure: {
      id: 'volleyball', prompt: "She's setting the trap. He'll say yes to anything now.", windowMs: 5000, benLine: "wait should i go to that", resolveOnIgnore: 12
  } },
  { t: 59700, thread: 'dm', speaker: 'Ben',          text: "wait for real?? what time" },
  { t: 61200, thread: 'dm', speaker: 'Maria Brooke', text: "like 2 :)" },
  { t: 62700, thread: 'dm', speaker: 'Ben',          text: "damn i have a track meet at RM saturday :/" },

  // ── 4. THE TURN ───────────────────────────────────────────────────────────
  // The air leaves the room here. Music ducks and never comes back this chapter.
  { t: 64700, thread: 'dm', speaker: 'Maria Brooke', text: "aw man :( i really wanted to finally meet you", resolve: 14, duck: true, pressure: {
      id: 'meet', prompt: "He's about to give something up for her. This is the moment.", windowMs: 5500, benLine: "i feel bad now, she sounds bummed", resolveOnIgnore: 14
  } },
  { t: 66200, thread: 'gc', speaker: 'Jordan',       text: "oh no" },
  { t: 67400, thread: 'gc', speaker: 'Eric',         text: "...she got him" },
  { t: 69200, thread: 'dm', speaker: 'Ben',          text: "no wait maybe i can move some stuff around", resolve: 12, pressure: {
      id: 'skip', prompt: "Ben's about to skip practice for her. Last call.", windowMs: 5500, benLine: "ill just tell coach im sick", resolveOnIgnore: 18
  } },
  { t: 71200, thread: 'dm', speaker: 'Ben',          text: "yeah honestly im just gonna skip the meet and come to your game" },
  { t: 73200, thread: 'gc', speaker: 'Eric',         text: "LMFAOOO HES ACTUALLY SKIPPING" },
  { t: 74400, thread: 'gc', speaker: 'Jordan',       text: "ben no 😭" },
  { t: 75400, thread: 'gc', speaker: 'Nick H',       text: "💀" },
  { t: 76400, thread: 'gc', speaker: 'Maharko',      text: "hes about to skip practice for a girl that doesnt exist" },
];

export const PHASE_DIVIDER_INDEX = TIMELINE.findIndex(m => m.duck === true);

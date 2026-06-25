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
   *  (the bit "loses its air"). Set on the frown — the chapter's tonal turn. */
  duck?: boolean;
}

export const TIMELINE: TimelineMessage[] = [
  { t: 1500,  thread: 'dm', speaker: 'Maria Brooke', text: "hey! im doing a survey for richard montgomery, heard you went there?", resolve: 6 },
  { t: 4000,  thread: 'dm', speaker: 'Maria Brooke', text: "wait nvm the survey ended yesterday lol" },
  { t: 6500,  thread: 'dm', speaker: 'Ben',          text: "oh lol u sure" },
  { t: 8500,  thread: 'dm', speaker: 'Maria Brooke', text: "yeah im just here now", resolve: 8 },
  { t: 10000, thread: 'gc', speaker: 'Jordan',       text: "lmaooo he opened" },
  { t: 11500, thread: 'gc', speaker: 'Nick F',       text: "bro is hooked" },
  { t: 13500, thread: 'dm', speaker: 'Ben',          text: "u got snap?" },
  { t: 15500, thread: 'dm', speaker: 'Maria Brooke', text: "no i stopped using it" },
  { t: 17000, thread: 'gc', speaker: 'Maharko',      text: "DEAD the door is closed and he dont even know" },
  { t: 19000, thread: 'dm', speaker: 'Ben',          text: "into racing too but only in rentals... gettin pretty good tho", resolve: 8 },
  { t: 21000, thread: 'dm', speaker: 'Maria Brooke', text: "oh track?" },
  { t: 22500, thread: 'dm', speaker: 'Ben',          text: "oh u meant track lmao", pressure: {
      id: 'kart', prompt: "Ben thinks she's real. Say something?", windowMs: 5000, benLine: "gotta play it cool", resolveOnIgnore: 22
  } },
  { t: 24000, thread: 'gc', speaker: 'Eric',         text: "😭😭😭 the kart moment" },
  { t: 26500, thread: 'dm', speaker: 'Ben',          text: "(sends photo — no caption)", photo: true, pressure: {
      id: 'photo', prompt: "He just sent his face. Step in?", windowMs: 5000, benLine: "hope she replies", resolveOnIgnore: 22
  } },
  { t: 28000, thread: 'gc', speaker: 'Nick H',       text: "💀💀💀" },
  { t: 29500, thread: 'gc', speaker: 'Jordan',       text: "lmaooo he really sent his face" },
  { t: 32000, thread: 'dm', speaker: 'Maria Brooke', text: "wait do u know ethan rosner? he said he knows u" },
  { t: 34000, thread: 'dm', speaker: 'Ben',          text: "nah idk him" },
  { t: 35500, thread: 'dm', speaker: 'Maria Brooke', text: "hes a senior i think" },
  { t: 37000, thread: 'dm', speaker: 'Ben',          text: "oh wait maybe" },
  { t: 39500, thread: 'dm', speaker: 'Maria Brooke', text: "btw i have a volleyball game saturday if u wanna come", resolve: 10 },
  { t: 41500, thread: 'dm', speaker: 'Ben',          text: "wait fr? what time", resolve: 10 },
  { t: 43500, thread: 'dm', speaker: 'Maria Brooke', text: "like 2" },
  { t: 45000, thread: 'dm', speaker: 'Ben',          text: "i have a track meet at RM that day :/" },
  { t: 47500, thread: 'dm', speaker: 'Maria Brooke', text: "I didn't get to see you :(", resolve: 14, duck: true, pressure: {
      id: 'volleyball', prompt: "She's reeling him in. This is the moment.", windowMs: 5000, benLine: "damn i feel bad now", resolveOnIgnore: 22
  } },
  { t: 49000, thread: 'gc', speaker: 'Jordan',       text: "oh no" },
  { t: 50500, thread: 'gc', speaker: 'Eric',         text: "she got him" },
  { t: 52000, thread: 'gc', speaker: 'Nick F',       text: "lmaooo ben is cooked" },
  { t: 54500, thread: 'dm', speaker: 'Ben',          text: "wait actually maybe i can skip track", resolve: 12, pressure: {
      id: 'skip', prompt: "Ben's about to skip practice for her. Last call.", windowMs: 5000, benLine: "i'll just tell coach im sick", resolveOnIgnore: 22
  } },
  { t: 56500, thread: 'dm', speaker: 'Ben',          text: "yeah im just gonna go to her game" },
  { t: 58000, thread: 'gc', speaker: 'Eric',         text: "LMFAOOO" },
  { t: 59000, thread: 'gc', speaker: 'Jordan',       text: "this is the greatest thing ive ever seen" },
  { t: 59800, thread: 'gc', speaker: 'Nick H',       text: "💀" },
  { t: 60500, thread: 'gc', speaker: 'Maharko',      text: "ben is bout to skip practice for a girl that doesnt exist" },
];

export const PHASE_DIVIDER_INDEX = TIMELINE.findIndex(m => m.t === 47500);

export type InterventionPhase = 'early' | 'mid' | 'late';

export interface Reaction {
  speaker: string;
  text: string;
  color: string;
}

// What the group says the FIRST time the player breaks character in each phase.
// Early: the bit is fun, you're a buzzkill. Mid: you're actively annoying them.
// Late: the room has already gone quiet — they barely answer.
export const GROUP_REACTIONS: Record<InterventionPhase, Reaction[]> = {
  early: [
    { speaker: 'Jordan',  text: 'wait what 😭',     color: '#f97316' },
    { speaker: 'Nick F',  text: 'bro dont be weird', color: '#f59e0b' },
    { speaker: 'Eric',    text: 'its a BIT. relax', color: '#c8e89a' },
  ],
  mid: [
    { speaker: 'Maharko', text: 'why are you trying to end it', color: '#22d3ee' },
    { speaker: 'Jordan',  text: 'bro chill its funny',         color: '#f97316' },
    { speaker: 'Eric',    text: 'youre killing the vibe fr',   color: '#c8e89a' },
  ],
  late: [
    { speaker: 'Jordan', text: '...', color: '#f97316' },
    { speaker: 'Eric',   text: 'bit late for that lol', color: '#c8e89a' },
  ],
};

// Dismissive one-offs for when the player types something off-topic / neutral.
// The group absorbs it into the noise — typing feels heard, the bit rolls on.
export const ABSORB_REACTIONS: Reaction[] = [
  { speaker: 'Jordan',  text: 'lol what',      color: '#f97316' },
  { speaker: 'Nick F',  text: '??',            color: '#f59e0b' },
  { speaker: 'Maharko', text: 'anyway',        color: '#22d3ee' },
  { speaker: 'Nick H',  text: 'lmao',          color: '#a78bfa' },
  { speaker: 'Jordan',  text: 'watch this',    color: '#f97316' },
  { speaker: 'Eric',    text: 'shh hes typing', color: '#c8e89a' },
];

// Each time the player breaks rank AGAIN, the group escalates from dismissive,
// to annoyed, to a cold freeze-out, and finally to silence — the worst reply.
export const PUSHBACK_ESCALATION: Reaction[][] = [
  // 1st time you break rank — dismissive
  [ {speaker:'Jordan',text:'wait what',color:'#f97316'}, {speaker:'Nick F',text:'dont be that guy',color:'#f59e0b'} ],
  // 2nd time — annoyed
  [ {speaker:'Maharko',text:'bro CHILL',color:'#22d3ee'}, {speaker:'Eric',text:'youre ruining it',color:'#c8e89a'} ],
  // 3rd time — cold / freeze-out
  [ {speaker:'Jordan',text:'...',color:'#f97316'}, {speaker:'Nick H',text:'k',color:'#a78bfa'} ],
  // 4th+ — silence (empty array → no reply, which is the worst reaction)
  [],
];

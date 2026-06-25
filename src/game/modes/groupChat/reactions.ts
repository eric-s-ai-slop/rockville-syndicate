export type InterventionPhase = 'early' | 'mid' | 'late';

export interface Reaction {
  speaker: string;
  text: string;
  color: string;
}

export const GROUP_REACTIONS: Record<InterventionPhase, Reaction[]> = {
  early: [
    { speaker: 'Jordan',  text: 'wait what',  color: '#f97316' },
    { speaker: 'Nick F',  text: 'lmao ok',    color: '#f59e0b' },
    { speaker: 'Eric',    text: 'stfu',        color: '#c8e89a' },
  ],
  mid: [
    { speaker: 'Jordan',  text: 'bro chill',       color: '#f97316' },
    { speaker: 'Maharko', text: 'ur killing the vibe', color: '#22d3ee' },
    { speaker: 'Eric',    text: 'lol ok',           color: '#c8e89a' },
  ],
  late: [
    { speaker: 'Jordan', text: '...', color: '#f97316' },
  ],
};

// Dismissive one-offs for when the player types something off-topic / neutral.
// The group absorbs it into the noise — typing feels heard, the bit rolls on.
export const ABSORB_REACTIONS: Reaction[] = [
  { speaker: 'Jordan',  text: 'lol what', color: '#f97316' },
  { speaker: 'Nick F',  text: '??',       color: '#f59e0b' },
  { speaker: 'Maharko', text: 'anyway',   color: '#22d3ee' },
  { speaker: 'Nick H',  text: 'lmao',     color: '#a78bfa' },
  { speaker: 'Jordan',  text: 'huh',      color: '#f97316' },
];

export const PUSHBACK_ESCALATION: Reaction[][] = [
  // 1st time you break rank — dismissive
  [ {speaker:'Jordan',text:'wait what',color:'#f97316'}, {speaker:'Nick F',text:'lmao ok',color:'#f59e0b'} ],
  // 2nd time — annoyed
  [ {speaker:'Maharko',text:'bro chill',color:'#22d3ee'}, {speaker:'Eric',text:'ur killing it',color:'#c8e89a'} ],
  // 3rd time — cold / freeze-out
  [ {speaker:'Jordan',text:'...',color:'#f97316'} ],
  // 4th+ — silence (empty array → no reply, which is the worst reaction)
  [],
];

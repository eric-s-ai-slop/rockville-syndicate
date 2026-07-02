export interface CharacterClass {
  id: string;
  name: string;
  title: string;
  role: string;
  spriteName: string;
  difficulty: string;
  hp: number;
  maxHp: number;
  attack: number;
  speed: number;
  biq: number;
  relicName: string;
  relicDesc: string;
  description: string;
  specialSkill: string;
  weakness: string;
  npcLines: string[][];  // each inner array is one conversation you can have with this character
  emoji: string;
  color: string;
}

export interface NpcCharacter {
  id: string;
  name: string;
  title: string;
  emoji: string;
  color: string;
  npcLines: string[][];
}

export interface Weapon {
  id: string;
  name: string;
  description: string;
  attackPower: number;
  cooldown: number;
  ammoType?: string;
  unleashedQuote: string;
  icon: string;
}

export interface PowerUp {
  id: string;
  name: string;
  description: string;
  effectType: 'invincibility' | 'heal' | 'poison_aura' | 'speed_boost' | 'defense_buff' | 'brainrot_clear';
  quote: string;
  durationMs: number;
}

export interface BossConfig {
  id: string;
  name: string;
  title: string;
  maxHp: number;
  combatBarks: string[];
  weaknessQTE: {
    question: string;
    options: string[];
    correctAnswer: string;
    damage: number;
  };
  qtePool?: {
    question: string;
    options: string[];
    correctAnswer: string;
    damage: number;
  }[];
  actions: string[];
  phaseBarks: { [phase: number]: string };
}

export interface DifficultyMods {
  bossHp: number;
  bossSpeed: number;
  attackInterval: number;
  playerDamageTaken: number;
  qteTimer: number;
  telegraphWindup: number;
  powerUpDropRate: number;
}

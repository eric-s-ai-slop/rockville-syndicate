import { DifficultyMods, Weapon, PowerUp } from './types';

// ─── Difficulty ───────────────────────────────────────────────────────────────

export const DIFFICULTY_MODS: Record<'easy' | 'normal' | 'hard', DifficultyMods> = {
  easy:   { bossHp: 0.75, bossSpeed: 0.85, attackInterval: 1.3,  playerDamageTaken: 0.6, qteTimer: 1.4, telegraphWindup: 1.3, powerUpDropRate: 0.35 },
  normal: { bossHp: 1.0,  bossSpeed: 1.0,  attackInterval: 1.0,  playerDamageTaken: 1.0, qteTimer: 1.0, telegraphWindup: 1.0, powerUpDropRate: 0.20 },
  hard:   { bossHp: 1.35, bossSpeed: 1.2,  attackInterval: 0.75, playerDamageTaken: 1.4, qteTimer: 0.7, telegraphWindup: 0.7, powerUpDropRate: 0.10 },
};

// ─── Weapons ──────────────────────────────────────────────────────────────────

export const WEAPONS: Weapon[] = [
  {
    id: 'spreadsheet_laser',
    name: 'Spreadsheet Laser',
    description: 'Fires laser-guided forensic data columns. Bypasses corporate shielding.',
    attackPower: 15,
    cooldown: 350,
    ammoType: 'Rows',
    unleashedQuote: '$20 divided by 6 is $3.33. The math is absolute.',
    icon: '📊'
  },
  {
    id: 'hebrew_hammer',
    name: 'Hebrew Hammer',
    description: 'Heavy gavel. Massive splash damage. Knocks goons into the Pariah Zone.',
    attackPower: 35,
    cooldown: 800,
    unleashedQuote: 'I demand my $100 back representing my capital reserves!',
    icon: '🔨'
  },
  {
    id: 'c55_amg_dash',
    name: 'C55 AMG Piston',
    description: 'Launches a chrome V8 cylinder. Best smelling projectile of the whole GC.',
    attackPower: 25,
    cooldown: 500,
    ammoType: 'Engine Oil',
    unleashedQuote: 'Best smelling gangster in the whole GC is coming through!',
    icon: '🚗'
  },
  {
    id: 'mustang_roar',
    name: 'Mustang 5.0 Roar',
    description: 'Devastating sound cone. Disperses crowds. "Just wait until I get headers."',
    attackPower: 18,
    cooldown: 600,
    unleashedQuote: 'Just wait until I get headers!',
    icon: '🏎️'
  },
  {
    id: 'chicken_barrage',
    name: 'Chicken Barrage 🐔',
    description: 'Toxic poultry cluster. Triggers target\'s FOMO and forces commitment.',
    attackPower: 10,
    cooldown: 250,
    ammoType: 'Eggs',
    unleashedQuote: '🐔 YOU CHICKEN?! SHOW UP OR LOSE B.I.Q. FOREVER!!!',
    icon: '🐔'
  }
];

// ─── Power-Ups ─────────────────────────────────────────────────────────────────

export const POWER_UPS: PowerUp[] = [
  {
    id: 'suspicious_stew',
    name: 'Ben Ber\'s Suspicious Stew',
    description: 'Temporary invincibility. Screen warps. Personality begins assimilating into Ben variant.',
    effectType: 'invincibility',
    quote: 'Ben Ber: "It\'s been cooked in pristine Tupperware. It is sentient."',
    durationMs: 7000
  },
  {
    id: 'harpers_ferry_elixir',
    name: 'Harpers Ferry Elixir',
    description: 'Full HP restore. Sourced from the West Virginia blizzards by Eric.',
    effectType: 'heal',
    quote: '"Harper\'s Ferry has a magical healing syrup that heals all ailments. Trust."',
    durationMs: 0
  },
  {
    id: 'mancera_red_tobacco',
    name: 'Mancera Red Tobacco Intense',
    description: 'AoE poison aura. +50 Aura. Acquired off eBay. "Best smelling gangster."',
    effectType: 'poison_aura',
    quote: 'Nick Farrar: "Smells like premium eBay investment. Get mogged."',
    durationMs: 10000
  },
  {
    id: 'galaxy_gas',
    name: 'Galaxy Gas (Nitrous Oxide)',
    description: '+150% speed but WASD inverted. B12 depleting. Brainrot contagion active.',
    effectType: 'speed_boost',
    quote: '*HISS* B12 levels collapsing! Skibidi protocol engaged!',
    durationMs: 6000
  },
  {
    id: 'motor_oil_17_in_1',
    name: '17-in-1 Motor Oil',
    description: 'Doubles damage. Removes all dash cooldowns. Standard C55 AMG maintenance.',
    effectType: 'defense_buff',
    quote: '"Standard operating maintenance for the C55 AMG engine."',
    durationMs: 8000
  },
  {
    id: 'accutane',
    name: 'Accutane (Skin Purge)',
    description: 'Cures Acne debuff but inflicts Tired. Nick F uses as excuse to avoid daytime raids.',
    effectType: 'defense_buff',
    quote: 'Nick F: "Can\'t come out. Sun sensitivity is through the roof right now."',
    durationMs: 5000
  },
  {
    id: 'fck_it_we_ball',
    name: '"Fck It We Ball" Fit',
    description: 'Legendary Nick F armor. Grants immunity to logic for 8 seconds. High-risk WTM mode.',
    effectType: 'invincibility',
    quote: 'Nick F equips the Fck It We Ball fit. Logic resistance: IMMUNE.',
    durationMs: 8000
  },
  {
    id: 'brainrot_flush',
    name: 'B12 Supplement (Brainrot Flush)',
    description: 'Clears the Brainrot meter. Restores access to high-level rhetorical spells.',
    effectType: 'brainrot_clear',
    quote: '"Eric, Jacob\'s Skibidi Protocol is degrading our entire BIQ stat line."',
    durationMs: 0
  }
];

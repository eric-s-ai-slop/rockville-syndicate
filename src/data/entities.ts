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

export interface EnemyConfig {
  id: string;
  name: string;
  type: string;
  aiType: 'shooter' | 'charger' | 'grunter' | 'heavy';
  hp: number;
  attack: number;
  speed: number;
  color: string;
  barks: string[];
  deathQuote: string;
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
  actions: string[];
  phaseBarks: { [phase: number]: string };
}

export interface StatusEffect {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  durationMs: number;
}

export interface LootShard {
  id: string;
  title: string;
  text: string;
  rarity: 'common' | 'rare' | 'legendary';
}

// ─── Characters ───────────────────────────────────────────────────────────────

export const CHARACTER_CLASSES: CharacterClass[] = [
  {
    id: 'eric',
    name: 'Eric Huang',
    title: 'The Extortion Economist',
    role: 'Ranged Marksman / Tactician',
    spriteName: 'eric',
    difficulty: 'Normal',
    hp: 120,
    maxHp: 120,
    attack: 18,
    speed: 150,
    biq: 180,
    relicName: 'Spotify Admin Masterkey',
    relicDesc: '+$3 Gold every 4s. Cannot be gaslighted by a calculator.',
    description: 'Master of spreadsheets who charges $4.50 for a plan that costs $3.33. Wields "Blame Joe Biden" as a defensive spell.',
    specialSkill: 'WTM Logistical Infiltration / Corporate Gaslighting',
    weakness: 'Hard data audits and the number 3.33.',
    emoji: '📊',
    color: '#818cf8',
    npcLines: [
      [
        "So yes — I charge $4.50 for Spotify. The plan costs $3.33.",
        "Jordan did the math. Posted it in the GC. Everyone saw it.",
        "I don't debate spreadsheets. You cannot gaslight a calculator. I simply blamed Joe Biden and moved on.",
        "The $4.50 era continued for six more months."
      ],
      [
        "The dishes situation at 1522 is a public health emergency.",
        "I called an Emergency Meeting in the GC. Rinse. Solids. Off. Before. Loading. Three words.",
        "Nick H said 'I'm not having 25 different forks in the sink.' I watched him personally put 25 forks in the sink.",
        "The Eric Enraged debuff activates when the sink reaches capacity. It cancels all WTM participation."
      ],
      [
        "Jacob says he's 13x liquid. $3,900 in his account.",
        "Has never voluntarily spent any of it. Has to be bribed with McDonald's to drive an hour to College Park.",
        "One time he offered to buy everyone McDonald's to force a hangout. He drove an hour. For a McChicken.",
        "That's not a flex. That's sunk cost paralysis with extra sodium."
      ],
      [
        "DECADES nightclub. Nick F renamed the GC 'DECADES OR DEATH' and expected everyone to just comply.",
        "I typed 'i can't. and i'm not going to decades 💀. ts is buns.' and left the conversation.",
        "Was I right? Yes. Did the group go anyway and have a mediocre time? Also yes.",
        "I'm tired. [leaves conversation]"
      ]
    ]
  },
  {
    id: 'nick_f',
    name: 'Nick Farrar',
    title: 'The Kinetic Warlord',
    role: 'High-Speed Melee DPS',
    spriteName: 'nick_f',
    difficulty: 'Hard (Speedruns)',
    hp: 100,
    maxHp: 100,
    attack: 24,
    speed: 250,
    biq: 85,
    relicName: 'C55 AMG Spare Keys',
    relicDesc: '+50% dash velocity. 5% chance dash fails because keys got locked in the ignition.',
    description: 'Equipped with the "Fck It We Ball" fit. Best smelling gangster of the whole GC. Will spontaneously cancel the cabin to fly to Spain.',
    specialSkill: 'Mancera Poison Cloud / Group Chat Rebrand',
    weakness: 'Logistical paperwork and Airbnb check-out receipts.',
    emoji: '🚗',
    color: '#f59e0b',
    npcLines: [
      [
        "ARE YOU 291 LIQUID? I ask this before every trip. Before the cabin, before Medellín, before the NYC drive at 1 AM.",
        "Jacob always says 'I'm 13x liquid!' which means $3,900 he will absolutely not deploy.",
        "Eric opens his brokerage, sees $250, and immediately demands someone front him $40.",
        "The 291 Liquid check has never once produced a satisfactory answer."
      ],
      [
        "The cabin. Basye, Virginia. Option H on the Google Doc. Four bedrooms. Hot tub. Firepit.",
        "$273.28 per person. Non-negotiable. I sent a Zelle request with a 2% late fee clause.",
        "I may have cancelled it to fly to Spain to visit Emily. For International Business purposes.",
        "I said I'd refund everyone through Robinhood. The money is definitely in there somewhere."
      ],
      [
        "Mancera Red Tobacco Intense. I bought it off eBay.",
        "I am literally the best smelling gangster in this entire GC. This is not a subjective statement.",
        "Nick H doesn't understand fragrance. Jacob uses an $8 cologne. Eric uses whatever was at CVS.",
        "None of them have Aura. I have Aura. The cologne is why."
      ],
      [
        "Looney Tuesdays. The rule is simple: dress URBAN. That is the entire rule.",
        "Jacob showed up in a denim jacket and cowboy boots. He called it 'country formal.'",
        "I said that was a dress code violation. He said 'this is my look.' I said 'College Park does not accept this look.'",
        "He was not let in. The look did not pass the vibe check."
      ]
    ]
  },
  {
    id: 'nick_h',
    name: 'Nick Hedgecock',
    title: 'The Sleep Goblin',
    role: 'Indestructible Meat Shield / Tank',
    spriteName: 'nick_h',
    difficulty: 'Easy (Comfort)',
    hp: 200,
    maxHp: 200,
    attack: 12,
    speed: 110,
    biq: 83,
    relicName: 'Bedtime Veto Cushion',
    relicDesc: '+60% damage reduction. Stats drop 50% past 10:30 PM. Uses the Hyundai Tucson as getaway car.',
    description: 'Inertia incarnate. Triggers Chicken Barrage 🐔 to force ridiculous choices, then crashes at 10:30 PM sharp.',
    specialSkill: '🐔 Chicken Provocation / Bedtime Veto Absolute',
    weakness: 'Surprise plans and "The Boiling Frog" incremental gaslight.',
    emoji: '🐔',
    color: '#4ade80',
    npcLines: [
      [
        "It's 10 PM. I'm going to sleep.",
        "If your plan starts after 10 PM, I was never part of that plan. The plan is fictional to me.",
        "Eric calls me the Sleep Goblin. I prefer 'Strategic Reallocation of Energy.'",
        "The Sleep Goblin cannot be reasoned with after 10:30. That's just law."
      ],
      [
        "🐔🐔🐔",
        "The chicken emoji is not a joke. It is a legally binding challenge.",
        "If you receive the chicken emoji, you have exactly one option: show up. Failure to appear results in permanent BIQ loss.",
        "Jacob once blocked the entire GC after receiving the chicken emoji. He came back 18 hours later and said 'goodnight' like nothing happened."
      ],
      [
        "The Washington Commanders are a legitimate NFL franchise with a promising future.",
        "This is not a debate I am willing to have.",
        "Jacob mentioned the score from last Sunday. We don't talk to Jacob anymore.",
        "The Commanders will win the Super Bowl. I have said this for four consecutive seasons. I will say it again."
      ],
      [
        "Eric and Nick F wanted to drive to Harpers Ferry in a blizzard to get a 'healing elixir.'",
        "The elixir supposedly cures all ailments. They said it would fix my cold.",
        "I was on a win streak in 2K. This 2K was not going to play itself.",
        "I cast Bedtime Veto. The Harpers Ferry Elixir Quest remains uncompleted to this day."
      ]
    ]
  },
  {
    id: 'jacob',
    name: 'Jacob Lebby',
    title: 'Sub-Zero Flaker',
    role: 'High-Risk Volatile Berserker',
    spriteName: 'jacob',
    difficulty: 'Ultra-Hard (Chaos)',
    hp: 150,
    maxHp: 150,
    attack: 30,
    speed: 140,
    biq: 130,
    relicName: '13x Liquid Reserves',
    relicDesc: 'Starts with $3,900 Gold. +250% incoming damage from Loss Aversion. Sub-Zero persona unlocks at <30% HP.',
    description: 'Runs on Sub-Zero Mortal Kombat energy. Undergoes Systemic Melts but can freeze the overworld with the "Blocked" ultimate.',
    specialSkill: 'Systemic Melt / "I\'m Muting This GC" Reset Escape',
    weakness: 'Audrey texting "He has a boyfriend." Dollar store cologne detection.',
    emoji: '❄️',
    color: '#67e8f9',
    npcLines: [
      [
        "I'm 13x liquid. I have $3,900 in reserves. Nick asked if I was 291 liquid and I said I'm 13x that.",
        "He said that wasn't the point of the question.",
        "I still don't know what the point was.",
        "The $3,900 is safely in my checking account where it will remain untouched for the foreseeable future."
      ],
      [
        "Audrey and I are going to get married. I've done the Universal Math.",
        "10-year horizon. I have a $1,500 contract with Nick H. If she marries me within a decade, I win $1,500.",
        "She lives in Canada. Has a boyfriend. Responds in two-word sentences.",
        "The math is the math. The contract is legally binding."
      ],
      [
        "I'M FUCKING SUBZERO.",
        "Ice cold. Eric begged me to come to College Park. I drove to Virginia Beach at 6 AM instead.",
        "He pressed further. I said 'Blocked. Fck off.' The conversation ended.",
        "The Sub-Zero awakening happened after Makayla and Audrey fumbles coincided in the same week. You can only lose the bag so many times before you become the bag."
      ],
      [
        "Chris Rivas and I hang out constantly. We have a very active social dynamic.",
        "If the GC asks where I am, I'm with Chris Rivas. That is my answer.",
        "Nick F once ran a Forensic Audit on the Chris Rivas claim.",
        "The audit located me at Montgomery Mall. Alone. At a Chick-fil-A. The Chris Rivas alibi did not hold."
      ]
    ]
  }
];

// ─── Non-Playable NPCs ────────────────────────────────────────────────────────

export const NPC_CHARACTERS: NpcCharacter[] = [
  {
    id: 'jordan',
    name: 'Jordan',
    title: 'Shadow Admin of the Meat Market',
    emoji: '🕶️',
    color: '#f97316',
    npcLines: [
      [
        "I ran the numbers. Eric charges $4.50 for a plan that costs $3.33. That's a 35% markup on a streaming service.",
        "I posted the forensic ledger in the GC. Everyone saw it. Eric went offline for two hours.",
        "He came back and said 'blame Joe Biden.' I archived that response as Exhibit A."
      ],
      [
        "The Mustang versus the Camaro. This is not a car debate — this is a philosophical conflict.",
        "Maharko said 'just wait until I get headers.' I've been waiting 14 months.",
        "Meanwhile, 5.0 liters of naturally aspirated displacement continues to print first-turn wins."
      ],
      [
        "The Rose Incident is not something I discuss lightly. It is a permanent leash. A BIQ killswitch.",
        "I'm not going to use it unless the situation calls for it. That situation may or may not be tonight.",
        "It was a UMBC party. That's all I'll say."
      ],
      [
        "Nick F cancelled the cabin to visit Emily in Spain. He booked the flight two weeks before the trip.",
        "He said 'the cabin will happen.' He said this from 30,000 feet over the Atlantic.",
        "The $273.28 is still outstanding. I have the receipts. I will always have the receipts."
      ]
    ]
  }
];

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

// ─── Enemies ──────────────────────────────────────────────────────────────────

export const ENEMIES: EnemyConfig[] = [
  {
    id: 'ticketmaster',
    name: 'Ticketmaster Scalper Bot',
    type: 'swarmer',
    aiType: 'shooter',
    hp: 40,
    attack: 8,
    speed: 90,
    color: '0x1e3a8a',
    barks: [
      'Digital queue locks in 90 seconds!',
      'Service fee: $847.50. Non-negotiable.',
      'Verified Fan Pre-Sale is CLOSED.',
      'You have been removed from the queue.',
      'Tame Impala Deadbeat Tour — SOLD OUT.',
      'Processing fee: Yes. Refund: No.'
    ],
    deathQuote: 'Checkout session expired!'
  },
  {
    id: 'dishes',
    name: 'Unwashed Dish Stack',
    type: 'grunt',
    aiType: 'grunter',
    hp: 60,
    attack: 12,
    speed: 70,
    color: '0xb45309',
    barks: [
      'Rinse solids off before loading!',
      'I\'m not having 25 forks in the sink!',
      'Emergency Meeting: Dish Protocol!',
      'This is a BIOHAZARD.',
      'Eric is triggered. Enraged debuff active.',
      'WTM raid cancelled due to dish pile.'
    ],
    deathQuote: 'Plate shattered. Forensic cleanup required.'
  },
  {
    id: 'zombie',
    name: 'Galaxy Gas Zombie',
    type: 'charger',
    aiType: 'charger',
    hp: 50,
    attack: 15,
    speed: 90,
    color: '0x4338ca',
    barks: [
      '*HISS* Where is my B12?!',
      'Ohio rizz incoming! Skibidi!',
      'Brainrot contagion spreading!',
      'Did you just say "rizz"? I\'m voting no.',
      '*HISS* Galaxy Gas Feedback Loop activated!',
      'Caleb sent me. The chaos vortex grows.'
    ],
    deathQuote: '*HISS* B12 depleted...'
  },
  {
    id: 'frat_bro',
    name: 'UMBC Frat Bro',
    type: 'heavy',
    aiType: 'heavy',
    hp: 100,
    attack: 20,
    speed: 65,
    color: '0x15803d',
    barks: [
      'BRO! UMBC RULES BRO!',
      'Ben Ber is our patron saint!',
      'Have you tried Galaxy Gas bro??',
      'BRO I went to a UMBC frat with Ben!',
      'Maharko told us you\'d be here.',
      'Bro is this the Pariah Zone??'
    ],
    deathQuote: 'BRO... The BIQ damage...'
  }
];

// ─── Bosses ───────────────────────────────────────────────────────────────────

export const BOSSES: BossConfig[] = [
  {
    id: 'boss_eric',
    name: 'Eric Huang',
    title: 'The Spotify Insurgent',
    maxHp: 800,
    combatBarks: [
      'I am charging structural index fees!',
      'Blame Joe Biden for inflation!',
      '1000 pennies is literally $10, don\'t be stupid.',
      'Check the Beli list! You need to accept my invite!',
      'Crazy 8 Game Pigeon invite: sent. Argument over.',
      'I\'m tired. I\'m bailing.',
      'I am the Spotify Admin. I hold the passwords.',
      'The math is objective. You are emotional.',
      'You can\'t gaslight a calculator. But I can.',
      'I\'m not going to DECADES. ts is buns.'
    ],
    weaknessQTE: {
      question: 'Eric is demanding $4.50/month. Jordan has uncovered the core forensic ledger. Choose your audit formula:',
      options: [
        '$20 divided by 6 is $3.33 — you hold a 35% Spotify margin!',
        'Blame Joe Biden for inflation rate hikes',
        'Switch us all to Apple Music Lossless Dolby Atmos',
        'Zelle him $10 and call it even'
      ],
      correctAnswer: '$20 divided by 6 is $3.33 — you hold a 35% Spotify margin!',
      damage: 300
    },
    actions: [
      'Drops static $4.50 Service Fee coins from the heavens',
      'Launches "Corporate Gaslighting" projectiles that strip your Gold cache',
      'Casts "I\'m Tired" to pause all combat briefly'
    ],
    phaseBarks: {
      2: 'You think you can audit ME?! I AM THE AUDIT.',
      1: 'Fine. FINE. You get nothing. I\'m migrating everyone to Apple Music out of spite.'
    }
  },
  {
    id: 'boss_audrey',
    name: 'Audrey (Shadow Audrey)',
    title: 'The 10-Year Phantom',
    maxHp: 1000,
    combatBarks: [
      'Canada is cold. Just like my texts.',
      'He has a boyfriend.',
      'That\'s Google Maps, you aren\'t actually here.',
      'KIDNEY PUNCH.',
      'Photo evidence of the toilet or it didn\'t happen.',
      'Goodnight.',
      'I only respond in two-word sentences.',
      'Jacob has mathematically calculated I will marry him in 10 years. LOL.',
      'April Fools.',
      'The $1,500 bet is still running.'
    ],
    weaknessQTE: {
      question: 'Jacob is cornered by the Red Pee Bladder Strike. Audrey prepares a Kidney Punch. Engage the 20-Questions extraction:',
      options: [
        'Is the assailant a Richard Montgomery high schooler?',
        'Pre-buy the Frederick Rejuvenation Syrup for $1,500',
        '"12 is the age of consent in some places idk why you people care" (PARTY WIPE)',
        'Trigger the "April Fools!" social safety net evasion'
      ],
      correctAnswer: 'Trigger the "April Fools!" social safety net evasion',
      damage: 400
    },
    actions: [
      'High-elevation leap attacks (Red Pee Bladder Strike)',
      'Kidney Punch — temporarily inverts WASD for 4.5 seconds',
      'Reads Jacob\'s texts then leaves him on Delivered for 3 months'
    ],
    phaseBarks: {
      2: 'I\'m logging off. Goodnight.',
      1: 'I\'m moving to Canada permanently. This never happened.'
    }
  },
  {
    id: 'boss_florida',
    name: 'Jordan & Maharko',
    title: 'The Florida Syndicate',
    maxHp: 1200,
    combatBarks: [
      'I drive the 5.0 Mustang with Crowd Control!',
      'Just wait until I get HEADERS. Just wait.',
      'I\'m sinking my Meat Market paycheck into $SOL!',
      'Shadow Admin: Maharko absorbs all damage for me.',
      'Holy consumerism, Myat! 💀',
      'My car handles the parking lot. Check the Mustang.',
      'Jordan used Inception dialogue. Maharko thinks this was his idea.',
      'The Rose Incident is classified. Do not proceed.',
      'Are you 291 liquid?',
      'Maharko attended UMBC parties with Ben. Contagion: active.'
    ],
    weaknessQTE: {
      question: 'Jordan is channeling "Shadow Admin," forcing Maharko to absorb all incoming fire. Play the lethal asset:',
      options: [
        'Apply OpenAI subscription gaslighting',
        'Superimpose C55 AMG over Maharko\'s Camaro Instagram post',
        'Deploy the "Rose Incident (Statutory Threat)" to drop Maharko\'s BIQ to 0',
        'Ask Maharko if his gas-to-maintenance ratio is financially stable'
      ],
      correctAnswer: 'Deploy the "Rose Incident (Statutory Threat)" to drop Maharko\'s BIQ to 0',
      damage: 500
    },
    actions: [
      'Jordan\'s Mustang tread attacks — 5.0 Crowd Control AoE',
      'Shadow Admin: Maharko absorbs all damage (must deplete Maharko first)',
      'Sinkhole Solana crash — drains 15% of player gold'
    ],
    phaseBarks: {
      2: 'MAHARKO. You are absorbing hits. This was your idea.',
      1: 'Fine. THE ROSE INCIDENT IS A LIE. It never happened. Jordan is driving to Key West.'
    }
  },
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
        "He was drunk — it doesn't count when you're drunk.",
        'She smiled at him first.',
      ],
      correctAnswer: '"You\'re next." Three girls. A pattern.',
      damage: 50,
    },
    actions: [
      '"I Was Just Having Fun" — AoE rationalization wave',
      '"She Was Into It" — targeted deflection, reduces incoming damage 30%',
      '"Maharko Was There Too" — deflection shield, must be broken first',
    ],
    phaseBarks: {
      2: "You don't understand. You weren't there.",
      1: '...',
    },
  },
  {
    id: 'boss_ben',
    name: 'Michael Bersofsky',
    title: 'Operation Ding Dong Ditch Hostile Entity',
    maxHp: 1500,
    combatBarks: [
      'HEY!!!',
      'GET BACK IN THE GETAWAY CAR NOW.',
      'Who is banging on my door at midnight?!',
      'I am casting police notifications!',
      'Ben Ber is racing a go-kart in the parking lot. At 12:38 AM.',
      'You fat-fingered the video send. It went DIRECTLY TO BEN.',
      'WE KNOW WHAT YOU DID.',
      'Heat Level: MAXIMUM.',
      'The party must lay low for a week.',
      'I am Benjamin\'s father and I have a landline phone.'
    ],
    weaknessQTE: {
      question: 'Michael Bersofsky breaches 12 Watchwater Way with the "HEY!" AoE fear spell. How do you escape containment?',
      options: [
        'Mash SPACEBAR to start the Hyundai Tucson getaway engine!',
        'Eat the radioactive Tupperware stew to assimilate',
        'Show him your 123Test IQ score of 85 ("Basically a B")',
        'Tell him you\'re hanging out with Chris Rivas'
      ],
      correctAnswer: 'Mash SPACEBAR to start the Hyundai Tucson getaway engine!',
      damage: 600
    },
    actions: [
      '"HEY!" AoE radial fear blast from front door',
      'Police Threat — inflicts maximum Heat Level',
      'Fat-Finger RNG — video sent directly to Ben, +500% Heat'
    ],
    phaseBarks: {
      2: 'HEY!!! HEYYYY!!!',
      1: 'Ben Ber. Racing never stops. BEN BER.'
    }
  },
  {
    id: 'boss_nick_f',
    name: 'Nick Farrar',
    title: 'The Cabin Betrayer / Spain-Bound Aerial Architect',
    maxHp: 2000,
    combatBarks: [
      'I\'m flying to Madrid. Adios.',
      'Are you 291 liquid?',
      'Refund checks? Never heard of them.',
      'Cabin pushed to August. Infinite Deferral active.',
      'I\'m the best smelling gangster of the entire GC!',
      'Robinhood cash sweep: 5% interest fee applied.',
      'The Zelle audit is still running. $273.28 locked.',
      'Agent Buyback denied. Spain was worth it.',
      'Roster Bloat: I\'m inviting 15 random high schoolers.',
      'WE IN THERE. THE CABIN IS SAVED. Wait, no it\'s not.'
    ],
    weaknessQTE: {
      question: 'Nick F hovers in an Airbus to Spain, draining your checking balance. Mount the Boca-Syndicate Mutiny:',
      options: [
        'Launch an "Agent Buyback" lawsuit demanding receipts and the $273.28',
        'Wear Country Formal boots to trigger local ridicule',
        'Play the Heated Rivalry watch-party bait loop',
        'Invite the 15 random H2O high schoolers to overwhelm his roster'
      ],
      correctAnswer: 'Launch an "Agent Buyback" lawsuit demanding receipts and the $273.28',
      damage: 750
    },
    actions: [
      'Drops cascading "Refund Check" landmines from altitude',
      '"Infinite Deferral" — postpones all QTE damage to "August"',
      'Roster Bloat gravity anchors — restricts movement',
      '5% Robinhood interest fee drains Gold per second'
    ],
    phaseBarks: {
      2: 'The Japan Bluff is activated. It was never real.',
      1: 'WE IN THERE. THE CABIN IS SAVED. Basye, VA. Option H. 4 bedrooms. Hot tub. Firepit. FOR REAL THIS TIME.'
    }
  }
];

// ─── Levels ───────────────────────────────────────────────────────────────────

export const EPISODIC_LEVELS = [
  {
    id: 1,
    title: 'The Spotify Family Insurgency',
    subtitle: 'Act I: The Extortion Crisis',
    location: 'Rockville Hub / Commons Apt 1522',
    bossId: 'boss_eric',
    description: 'Jordan uncovers the math: Eric charges $4.50 for a plan that costs $3.33. Reclaim the margins before he buys another Spotify fractional share.',
    difficulty: 'Easy',
    enemyScaling: 1.0
  },
  {
    id: 2,
    title: 'The Red Pee Bladder Strike',
    subtitle: 'Act II: The 10-Year Phantom',
    location: 'Shepherd University (The Exile Zone)',
    bossId: 'boss_audrey',
    description: 'Jacob\'s pee is red. He got in a fight. His bladder got hit. Evade Audrey\'s Kidney Punches, survive Internal Bleeding, and retrieve toilet photo evidence for the GC.',
    difficulty: 'Medium',
    enemyScaling: 1.2
  },
  {
    id: 3,
    title: 'The Florida Syndicate Highway Duel',
    subtitle: 'Act III: Mustang vs. Camaro',
    location: 'The Meat Market (Boca Raton)',
    bossId: 'boss_florida',
    description: 'Jordan\'s 5.0 guarantees first-turn wins. Maharko says "just wait until I get headers." Deploy the Rose Incident to collapse Maharko\'s BIQ and expose Jordan.',
    difficulty: 'Hard',
    enemyScaling: 1.5
  },
  {
    id: 4,
    title: 'Operation Ding Dong Ditch Ben',
    subtitle: 'Act IV: The Watchwater Raid',
    location: '12 Watchwater Way (The Pariah Zone)',
    bossId: 'boss_ben',
    description: 'Mash the interact button at midnight. Shout "WE KNOW WHAT YOU DID." Sprint back to the Tucson before Michael Bersofsky\'s "HEY!" AoE catches you.',
    difficulty: 'Expert',
    enemyScaling: 2.0
  },
  {
    id: 5,
    title: 'The Spain Flight Cabin Betrayal',
    subtitle: 'Act V: The Final Deferral',
    location: 'Basye, VA → Madrid, Spain (Nick F\'s orbit)',
    bossId: 'boss_nick_f',
    description: 'Nick F cancelled the cabin to visit Emily in Spain. He pocketed the refunds. Ground his plane, override Infinite Deferral, and recover the $273.28 once and for all.',
    difficulty: 'Legendary',
    enemyScaling: 2.5
  }
];

// ─── Status Effects ───────────────────────────────────────────────────────────

export const STATUS_EFFECTS: StatusEffect[] = [
  {
    id: 'brainrot',
    name: 'BRAINROT',
    icon: '🧠',
    color: '#a78bfa',
    description: 'Galaxy Gas B12 depletion. Dialogue options replaced with Gen-Alpha slang.',
    durationMs: 8000
  },
  {
    id: 'internal_bleeding',
    name: 'INTERNAL BLEEDING',
    icon: '🩸',
    color: '#ef4444',
    description: 'Audrey\'s Kidney Punch landed. WASD controls inverted for 4.5s.',
    durationMs: 4500
  },
  {
    id: 'jestermaxxing',
    name: 'JESTERMAXXING',
    icon: '🤡',
    color: '#f59e0b',
    description: 'Acting like a clown for female NPC attention. -30 BIQ.',
    durationMs: 6000
  },
  {
    id: 'sub_zero',
    name: 'SUB-ZERO ACTIVATED',
    icon: '🥷',
    color: '#38bdf8',
    description: 'Jacob\'s ultimate defensive stance. Emotionally numb. +50% damage output.',
    durationMs: 10000
  },
  {
    id: 'bedtime_veto',
    name: 'BEDTIME VETO',
    icon: '😴',
    color: '#64748b',
    description: 'It is past 10:30 PM. Nick H\'s stats dropped 50%. Inertia: maximum.',
    durationMs: -1
  },
  {
    id: 'loss_aversion',
    name: 'LOSS AVERSION',
    icon: '💸',
    color: '#fbbf24',
    description: 'Jacob took a hit. Psychological damage multiplied by 2.5x.',
    durationMs: 3000
  },
  {
    id: 'ben_assimilation',
    name: 'BEN BER ASSIMILATION',
    icon: '☣️',
    color: '#84cc16',
    description: 'Suspicious Stew absorbed. Personality shifting toward Ben variant.',
    durationMs: 12000
  },
  {
    id: 'heat_level',
    name: 'HEAT LEVEL: MAX',
    icon: '🚨',
    color: '#f97316',
    description: 'Michael Bersofsky has called the police. Party must lay low for one week.',
    durationMs: 15000
  }
];

// ─── Loot Shards ──────────────────────────────────────────────────────────────

export const LOOT_SHARDS: LootShard[] = [
  {
    id: 'spotify_ledger',
    title: 'The Spotify Forensic Ledger',
    text: 'Eric\'s own spreadsheet. $20/6 = $3.33. He was charging $4.50. 35% margin confirmed. He blamed Joe Biden.',
    rarity: 'legendary'
  },
  {
    id: 'discord_12yo',
    title: 'The 12-Year-Old Discord Log',
    text: 'Jacob accidentally rizzed a 12-year-old on Discord. Eric now holds permanent blackmail leverage. Jacob hit Block immediately but it was too late.',
    rarity: 'legendary'
  },
  {
    id: 'cabin_receipts',
    title: 'The Airbnb Cabin Receipts ($273.28)',
    text: 'Nick F collected the money. Cancelled for Spain. "Agent Buyback" mutiny initiated by the Boca Syndicate (Eric + Alex). Money never returned.',
    rarity: 'legendary'
  },
  {
    id: 'rose_incident',
    title: 'The Rose Incident (Statutory)',
    text: 'Maharko kissed Rose at a UMBC party. Rose was 16. Maharko was 20. Jordan holds this as a permanent leash. BIQ drops to 0.0 upon deployment.',
    rarity: 'legendary'
  },
  {
    id: 'unsent_letter',
    title: 'The Unsent Project Archive',
    text: 'An anonymous love letter from July 5th addressed to "Lebby." Jacob believes it\'s from Audrey. Nick F used Photoshop to prove it\'s AI-generated.',
    rarity: 'rare'
  },
  {
    id: '123test_results',
    title: 'The 123Test IQ Results',
    text: 'Nick F: 85. Nick H: 83. Both rationalized as "basically a B" to prevent ego damage. Eric\'s result classified.',
    rarity: 'rare'
  },
  {
    id: 'heated_rivalry_tape',
    title: '"Heated Rivalry" Watch Party Lore',
    text: 'Gay hockey romance. The party secretly loves it. It grants +50 Cohesion and max Stamina. The "sus" factor is irrelevant. The plot is, in fact, good.',
    rarity: 'rare'
  },
  {
    id: 'maria_brooke_op',
    title: 'Maria Brooke Investigation File',
    text: 'Ben claimed to pull a 10/10 named Maria Brooke. Eric reverse-image searched the selfies. Catfish confirmed. Ben deployed Weaponized Delusion to deny it. BIQ: 0.0.',
    rarity: 'rare'
  },
  {
    id: 'bed_draft_protocol',
    title: 'Cabin Bed Draft (Battle Royale)',
    text: 'Upon arrival at Basye VA: free-for-all race to claim beds. Loser shares a bed with the worst-smelling party member. Nick F smells the best (Mancera). You do not want to lose.',
    rarity: 'common'
  },
  {
    id: 'wtm_probe',
    title: '"WTM" Quest Log Entry',
    text: 'Someone dropped "WTM" in the chat. 75% chance an NPC responds "I\'m tired" or demands a $50 deposit. Nick H offered $40 to turn back to Rockville from Baltimore.',
    rarity: 'common'
  },
  {
    id: 'caleb_vortex',
    title: 'The Chaos Vortex Warning',
    text: 'DEVELOPER ALERT: Caleb Allentuck and Ben Bersofsky must never occupy the same active party slot. Chaos Vortex accelerates Brainrot by 400%. Cognitive casualties guaranteed.',
    rarity: 'common'
  },
  {
    id: 'jacob_tax',
    title: 'The Jacob Lebby Dynamic Pricing Tax',
    text: 'Nick F raises Jacob\'s cabin entry fee in real-time based on complaint volume. $300 → $350 → $351.36142. Jacob complained.',
    rarity: 'common'
  },
  {
    id: 'grocery_raid_ban',
    title: 'Nick F\'s Grocery Ban Notice',
    text: 'Nick F is permanently banned from solo grocery shopping. Last trip: 3 lbs blueberry pancakes, raw salmon, $300 of S\'mores. Maharko starved. Maharko got food poisoning.',
    rarity: 'common'
  },
  {
    id: 'sub_zero_awakening',
    title: 'Sub-Zero Awakening Certificate',
    text: 'After fumbling Makayla AND Audrey simultaneously, Jacob\'s Lover Boy subclass shattered. Nick H dubbed him "Sub-Zero." Jacob responded: "I\'M FUCKING SUBZERO!!!"',
    rarity: 'rare'
  },
  {
    id: 'decades_schism',
    title: 'The Decades Schism File',
    text: 'Nick F renamed the GC to "DECADES." Eric typed "I can\'t. And I\'m not going to decades 💀. ts is buns." Then Eric LEFT THE CHAT. The UI glitched. The game entered Limbo.',
    rarity: 'legendary'
  }
];

// ─── All combat barks across the game ────────────────────────────────────────

export const LORE_BARKS = [
  // Classic one-liners
  "I'm 13x liquid!",
  "Blame Joe Biden",
  "D1 Consumerism 💀",
  "sybau",
  "holy consumer 💀",
  "Goodnight",
  "Just wait until I get headers",
  "I'm not living under a communist building",
  "Ben Ber. Racing never stops.",
  "best smelling gangster of the whole gc",
  "Dolby atmos, lossless audio!",
  "I'M FUCKING SUBZERO!!!",
  "Blocked. Fck off.",
  "April Fools! (Safety check)",
  "We know what you did at 12 Watchwater!",
  "So handsome!",
  "1000 pennies is $10.",
  "Are you 291 liquid?",
  "Y'all already weren't sleeping. Now NO ONE is sleeping. ALL 4 days!",
  "Get jestermaxxed!",
  "Is she chopped?",
  "He has a boyfriend in Canada",
  // From storyboard_0
  "WTM?",
  "I'm tired. I'm bailing.",
  "$50 upfront deposit required",
  "Skibidi protocol: ENGAGED",
  "The delusion tax is real",
  "Financial leverage: Spotify admin holds the passwords",
  // From storyboard_1
  "KA BAND — COP CHEVY TAHOE BLACK!",
  "Mommy Mobile deployed. Street cred: zero.",
  "Rinse solids off BEFORE loading the dishwasher",
  "This 2K won't play itself",
  "I'm turning around. I'm going home.",
  "Wait— Jacob's still on Find My. He's not turning around.",
  // From storyboard_2
  "IQ of 85 is basically a B",
  "The political compass says you're a libtard",
  "Dress code: URBAN. Country Formal barred from entry.",
  "Crazy 8 invite SENT. Argument nullified.",
  "Let's play Cup Pong. Settle this.",
  // From storyboard_3
  "*HISS* B12 is GONE",
  "Galaxy Gas feedback loop: active",
  "I'm muting this GC. Just fck off all of you.",
  "...Goodnight. (rejoins 2 hours later)",
  "Nigeria.",
  // From storyboard_4
  "Hyperphonk after 3 AM. Party HP: zero.",
  "Apple Music: 2 dollars. Lossless Dolby Atmos. Windows app.",
  "Jestermaxxed into oblivion",
  "Looney Tuesdays entry denied — not URBAN enough",
  "Jacob wore Country Formal to a nightclub",
  // From storyboard_5
  "eBay Mancera cologne: $300. Worth it.",
  "Last Birthday Cake by Toskovat: invested in girls",
  "Dollar store cologne detected. Public shame activated.",
  "Accept the Beli invite within 24h or no Honeypig",
  "I'm migrating into Aidan's room. Aidan is deleted.",
  // From storyboard_6
  "Shadow Admin absorbing all your damage",
  "Maharko thinks this was his idea. Inception success.",
  "Just wait until I get headers! JUST WAIT!",
  "$SOL crashed 40%. Maharko is in panic mode.",
  "AI slop superimposed on the Camaro. Resale: destroyed.",
  // From storyboard_7
  "Maharko attended UMBC parties with BEN BERSOFSKY",
  "Pariah contagion: BIQ permanently lowered",
  "The Rose Incident exists. Deploy carefully.",
  "Jordan: Shadow Admin of the Meat Market",
  "DRINK THE STEW",
  // From storyboard_8
  "April Fools! (romance tree permanently locked)",
  "THE MIDDLETOWN MOGGER. (crickets)",
  "Sub-Zero awakened after losing Makayla AND Audrey",
  "Cabin saved. Option H. Basye VA. Hot tub. Firepit. REAL.",
  "Jordan fat-fingered the video. It went to Ben directly.",
  "Heat Level: MAXIMUM. Lay low for one week.",
  "Jacob: 'I'm going to Virginia Beach at 6 AM.' Blocked. Fck off.",
  "The Japan trip is a BLUFF. The Bluff stat is maxed.",
  "WE IN THERE."
];

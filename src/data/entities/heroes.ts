import { CharacterClass, NpcCharacter } from './types';

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

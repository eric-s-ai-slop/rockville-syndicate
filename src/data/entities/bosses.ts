import { BossConfig } from './types';

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
    qtePool: [
      {
        question: 'Eric is demanding $4.50/month. Jordan has uncovered the core forensic ledger. Choose your audit formula:',
        options: [
          '$20 divided by 6 is $3.33 — you hold a 35% Spotify margin!',
          'Blame Joe Biden for inflation rate hikes',
          'Switch us all to Apple Music Lossless Dolby Atmos',
          'Zelle him $10 and call it even'
        ],
        correctAnswer: '$20 divided by 6 is $3.33 — you hold a 35% Spotify margin!',
        damage: 300,
      },
      {
        question: 'Eric charges $10/month for YouTube Premium Family. The plan costs $22.99 for 6 users. Expose the margin:',
        options: [
          '"$22.99 ÷ 6 = $3.83 max. You owe me $6.17 back."',
          '"YouTube just went up. Blame Joe Biden."',
          '"I\'ll just use an ad blocker. Checkmate."',
          '"Fine. Here\'s $10. Stop the emails."'
        ],
        correctAnswer: '"$22.99 ÷ 6 = $3.83 max. You owe me $6.17 back."',
        damage: 250,
      },
      {
        question: 'Eric refuses to send the Spotify invite until you Zelle first. He holds the admin key. Counter:',
        options: [
          '"The invite should come before the Zelle. You hold the keys."',
          '"I\'ll just make my own account for $11. See you never."',
          '"Fine. $4.50. Here. Happy now?"',
          '"Blame Joe Biden for payment friction."'
        ],
        correctAnswer: '"The invite should come before the Zelle. You hold the keys."',
        damage: 200,
      },
      {
        question: 'Eric invokes the Crazy 8 Game Pigeon doctrine: "Argument over — I sent an invite." Deploy the rebuttal:',
        options: [
          '"Game Pigeon isn\'t a legally binding contract, Eric."',
          '"I accept the invite and counter-bet $50."',
          '"Check the Beli list — I\'m rated 6/10 at Crazy 8."',
          '"I\'m tired. I\'m bailing."'
        ],
        correctAnswer: '"Game Pigeon isn\'t a legally binding contract, Eric."',
        damage: 280,
      },
    ],
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
    qtePool: [
      {
        question: 'Jacob is cornered by the Red Pee Bladder Strike. Audrey prepares a Kidney Punch. Engage the 20-Questions extraction:',
        options: [
          'Is the assailant a Richard Montgomery high schooler?',
          'Pre-buy the Frederick Rejuvenation Syrup for $1,500',
          '"12 is the age of consent in some places idk why you people care" (PARTY WIPE)',
          'Trigger the "April Fools!" social safety net evasion'
        ],
        correctAnswer: 'Trigger the "April Fools!" social safety net evasion',
        damage: 400,
      },
      {
        question: 'Audrey has logged off mid-sentence — 3rd time this fight. Break through the Canada Defence:',
        options: [
          'Screenshot the "Goodnight." text and paste it into the forensic ledger',
          'Send a Crazy 8 Game Pigeon invite to re-open comms',
          'Invoke the $1,500 Frederick healing bet to force a reply',
          'Wait 3 months and try again after the read receipt resets'
        ],
        correctAnswer: 'Screenshot the "Goodnight." text and paste it into the forensic ledger',
        damage: 350,
      },
      {
        question: 'Audrey invokes the Galaxy Gas defence — controls inverted, Jacob is confused. Counter-play:',
        options: [
          'Reverse the inversion by hitting the "Red Pee" evidence toggle',
          'Breathe through the B12 loss — wait for the effect to expire',
          'Ask Jacob if his pee is still red. It re-focuses him.',
          'Galaxy Gas is a myth. Deny its existence.'
        ],
        correctAnswer: 'Reverse the inversion by hitting the "Red Pee" evidence toggle',
        damage: 300,
      },
    ],
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
    qtePool: [
      {
        question: 'Jordan is channeling "Shadow Admin," forcing Maharko to absorb all incoming fire. Play the lethal asset:',
        options: [
          'Apply OpenAI subscription gaslighting',
          'Superimpose C55 AMG over Maharko\'s Camaro Instagram post',
          'Deploy the "Rose Incident (Statutory Threat)" to drop Maharko\'s BIQ to 0',
          'Ask Maharko if his gas-to-maintenance ratio is financially stable'
        ],
        correctAnswer: 'Deploy the "Rose Incident (Statutory Threat)" to drop Maharko\'s BIQ to 0',
        damage: 500,
      },
      {
        question: 'Jordan claims the Mustang has superior cornering to the C55 AMG. Counter the gas-money ledger audit:',
        options: [
          '"Your gas-to-payload ratio on a 5.0 at Boca prices is $340/month. Receipts."',
          '"Jordan\'s car wins at Meat Market parking. We must respect this."',
          '"Maharko says the Camaro handles better. Ally engaged."',
          '"Switch to a Prius. Counterculture play. +50 irony stat."'
        ],
        correctAnswer: '"Your gas-to-payload ratio on a 5.0 at Boca prices is $340/month. Receipts."',
        damage: 420,
      },
      {
        question: 'Maharko invokes the "I was there" defence — he attended UMBC with Ben. Expose the loyalty conflict:',
        options: [
          '"You drove Ben to the party. You saw the stew. Your BIQ is forfeit."',
          '"Maharko\'s Camaro is cooler than Jordan\'s Mustang. Divide and conquer."',
          '"Ask Maharko about the Inception dialogue. He thinks it was his idea."',
          '"Invoke the $SOL crash to destabilize Jordan\'s savings. Economic warfare."'
        ],
        correctAnswer: '"You drove Ben to the party. You saw the stew. Your BIQ is forfeit."',
        damage: 460,
      },
    ],
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
      damage: 200,
    },
    qtePool: [
      {
        question: 'Ben deploys Phase 2: "She was into it." What breaks through?',
        options: [
          '"You\'re next." Three girls. A pattern.',
          "He was drunk — it doesn't count when you're drunk.",
          'She smiled at him first.',
        ],
        correctAnswer: '"You\'re next." Three girls. A pattern.',
        damage: 200,
      },
      {
        question: 'Ben rationalizes: "I was just having fun." Confront him:',
        options: [
          'The others were visibly uncomfortable.',
          'You were just trying to show off your dance moves.',
          'You brought the stew as an excuse.',
        ],
        correctAnswer: 'The others were visibly uncomfortable.',
        damage: 200,
      },
      {
        question: 'Ben deflects: "Maharko was right there. Ask him." Expose the lie:',
        options: [
          'Maharko said you poured the stew strong.',
          'Maharko told you to slow down.',
          'Maharko didn\'t see anything.',
        ],
        correctAnswer: 'Maharko said you poured the stew strong.',
        damage: 200,
      },
      {
        question: 'Ben claims: "You don\'t know what happened in there." Provide evidence:',
        options: [
          'The frat guys literally kicked you out.',
          'Nick F tried calling you for four days.',
          'You stopped texting the group chat.',
        ],
        correctAnswer: 'The frat guys literally kicked you out.',
        damage: 200,
      }
    ],
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
    qtePool: [
      {
        question: 'Michael Bersofsky breaches 12 Watchwater Way with the "HEY!" AoE fear spell. How do you escape containment?',
        options: [
          'Mash SPACEBAR to start the Hyundai Tucson getaway engine!',
          'Eat the radioactive Tupperware stew to assimilate',
          'Show him your 123Test IQ score of 85 ("Basically a B")',
          'Tell him you\'re hanging out with Chris Rivas'
        ],
        correctAnswer: 'Mash SPACEBAR to start the Hyundai Tucson getaway engine!',
        damage: 600,
      },
      {
        question: 'Ben Ber is racing a go-kart in the parking lot at 12:38 AM. Michael has the landline. Defuse:',
        options: [
          'Tell Michael the go-kart is a "motorized Tupperware transport vehicle." Technical truth.',
          'Blame the go-kart on the Hyundai Tucson\'s shadow. It was just parked nearby.',
          'Show Michael the GC receipts — Ben initiated the raid, not us.',
          'Ring the doorbell again. Double down. Heat Level already maxed.'
        ],
        correctAnswer: 'Show Michael the GC receipts — Ben initiated the raid, not us.',
        damage: 550,
      },
      {
        question: 'Michael has activated the Police Notification Protocol. Heat Level: Maximum. Suppress the broadcast:',
        options: [
          'Sprint to the Tucson. Yield. The party lives to raid another day.',
          'Stand your ground — invoke the "first offence" BIQ discount.',
          'Tell Michael you\'re Jacob\'s cousin visiting from Frederick.',
          'Ring the bell a third time. The disrespect is the message.'
        ],
        correctAnswer: 'Sprint to the Tucson. Yield. The party lives to raid another day.',
        damage: 500,
      },
    ],
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
    qtePool: [
      {
        question: 'Nick F hovers in an Airbus to Spain, draining your checking balance. Mount the Boca-Syndicate Mutiny:',
        options: [
          'Launch an "Agent Buyback" lawsuit demanding receipts and the $273.28',
          'Wear Country Formal boots to trigger local ridicule',
          'Play the Heated Rivalry watch-party bait loop',
          'Invite the 15 random H2O high schoolers to overwhelm his roster'
        ],
        correctAnswer: 'Launch an "Agent Buyback" lawsuit demanding receipts and the $273.28',
        damage: 750,
      },
      {
        question: 'Nick F invokes "Infinite Deferral" — the cabin is postponed to August. Again. Pin him:',
        options: [
          '"August has come and gone four times. Name a date or forfeit the $273.28."',
          '"Spain counts as the cabin trip. Emily is technically the group chat."',
          '"I will personally drive to the cabin alone. Option H. No Nick F."',
          '"Wear the Country Formal boots. The country will provide clarity."'
        ],
        correctAnswer: '"August has come and gone four times. Name a date or forfeit the $273.28."',
        damage: 680,
      },
      {
        question: 'Nick F claims he\'s "291 liquid" but the Zelle audit shows $273.28 missing. Present the receipts:',
        options: [
          '"Zelle history: May 4th. $273.28. Sent. You. Never. Returned it."',
          '"You\'re 291 liquid in Mancera Red Tobacco. That\'s not FDIC-insured."',
          '"Are you even 291 liquid with the Robinhood 5% interest fee active?"',
          '"The cabin was never real. None of this was real. I\'m going home."'
        ],
        correctAnswer: '"Zelle history: May 4th. $273.28. Sent. You. Never. Returned it."',
        damage: 600,
      },
      {
        question: 'Nick F activates Roster Bloat — 15 H2O high schoolers flood the group chat. Restore order:',
        options: [
          '"I am removing all 15. This is a closed GC. Receipts or it didn\'t happen."',
          '"Let the high schoolers audit Nick F. They have nothing to lose."',
          '"Invite them all to the cabin. Chaos is the only justice."',
          '"Country Formal the group chat. Fashion heals all wounds."'
        ],
        correctAnswer: '"I am removing all 15. This is a closed GC. Receipts or it didn\'t happen."',
        damage: 650,
      },
    ],
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

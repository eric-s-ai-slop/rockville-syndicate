/**
 * BattleIQ: The Rockville Chronicles - Global Game Data
 * Houses lore databases, player stats, enemy stats, item definitions, and map grids.
 */

const GAME_DATA = {
    // Current Act names & goals
    CHAPTERS: [
        {
            id: 1,
            title: "ACT I: The Shepherdstown Siege",
            objective: "Rescue Jacob from his dorm and unblock the group chat!",
            startMap: "shepherdstown"
        },
        {
            id: 2,
            title: "ACT II: The Rockville Playground",
            objective: "Solve Farrar's locked keys issue and wake up Hedgecock!",
            startMap: "rockville"
        },
        {
            id: 3,
            title: "ACT III: Commons Room 1522",
            objective: "Infiltrate South Campus Commons 1 and Audit Eric Huang!",
            startMap: "commons"
        },
        {
            id: 4,
            title: "ACT IV: Final Cabin (Basye, VA)",
            objective: "Defeat Ben Bersofsky and prevent the permanent chat block!",
            startMap: "cabin"
        }
    ],

    // Player Party Members (REBALANCED 2026-06-11: HP cut by ~50%, rounded to 50.
    // Each character has unique starting items themed around their personality.
    // 'uniqueItems' are items ONLY that member can use (locked to them).)
    PLAYERS: {
        farrar: {
            id: "farrar",
            name: "Nick Farrar",
            title: "The Hype Warlord",
            maxHp: 60,   // Was 120 — halved
            hp: 60,
            maxMp: 60,
            mp: 60,
            atk: 35,
            def: 10,
            speed: 14,
            color: "#4df3ff",
            avatar: "🚗",
            locked: true,  // 2026-06-11: Starting character is locked by default
            inventory: ["boom_manual", "fragance", "hype_sticker", "boom_v2"],  // 2026-06-11: Added boom_v2 (4th unique item)
            uniqueItems: ["boom_manual", "fragance", "hype_sticker", "boom_v2"],

            acts: [
                { id: "boom", name: "BOOM!", cost: 10, dmg: 15, successMsg: "Nick yells BOOM! Hype radiates. Enemy takes 15 damage.", desc: "Hype up the party! Boosts ATK of all members." },
                { id: "rebrand", name: "GC Rebrand", cost: 15, dmg: 10, successMsg: "Chat renamed! Enemy is disoriented. Takes 10 damage.", desc: "Rename the conversation, confusing the enemy and reducing accuracy." },
                { id: "otw", name: "I'm On My Way!", cost: 12, dmg: 8, successMsg: "BOOM, I'm on my way! Enemy takes 8 damage. Hype aura persists.", desc: "Faintly start moving. Increases party evasion but has 40% lag risk." }
            ]
        },
        hedgecock: {
            id: "hedgecock",
            name: "Nick Hedgecock",
            title: "The Strategic Anchor",
            maxHp: 75,   // Was 150 — halved
            hp: 75,
            maxMp: 50,
            mp: 50,
            atk: 20,
            def: 22,
            speed: 8,
            color: "#4dff8a",
            avatar: "💤",
            inventory: ["maki_platter", "sleep_pill", "b12_stack", "b12_stack_xl"],  // 2026-06-11: Added b12_stack_xl (4th unique item)
            uniqueItems: ["maki_platter", "sleep_pill", "b12_stack", "b12_stack_xl"],
            acts: [
                { id: "safespace", name: "Safe Space", cost: 15, pacify: true, successMsg: "Safe space established. Enemy is calmed (pacified).", desc: "Creates a protective envelope. Party absorbs 50% damage." },
                { id: "looney", name: "Looney Tuesday", cost: 20, dmg: 12, successMsg: "It's Looney Tuesday! Enemy is barraged. Takes 12 damage.", desc: "Rally the party! Completely heals a sleeping or debuffed member." },
                { id: "chicken_barrage", name: "Chicken Emoji", cost: 10, dmg: 18, successMsg: "🐔🐔🐔 Enemy is psychologically devastated! Takes 18 damage.", desc: "Launch a psychological chicken barrage. Critically hurts emotional targets." }
            ]
        },
        maharko: {
            id: "maharko",
            name: "Myat Maharko",
            title: "D1 Consumerism Critic",
            maxHp: 50,   // Was 100 — halved
            hp: 50,
            maxMp: 70,
            mp: 70,
            atk: 30,
            def: 12,
            speed: 13,
            color: "#ffbe4d",
            avatar: "🧻",
            inventory: ["holy_cross", "find_my", "crypto_bag", "crypto_pump"],  // 2026-06-11: Added crypto_pump (4th unique item)
            uniqueItems: ["holy_cross", "find_my", "crypto_bag", "crypto_pump"],
            acts: [
                { id: "ben_pose", name: "Ben Pose", cost: 20, dmg: 20, successMsg: "Maharko channels Ben's aura! Enemy stunned and takes 20 damage.", desc: "Channel Ben's aura! 50% chance to completely stun the target." },
                { id: "stalk", name: "Location Grab", cost: 12, dmg: 14, successMsg: "Location acquired. Enemy exposed. Takes 14 damage.", desc: "Stalk coordinates via Find My workarounds. Increases party critical chance." },
                { id: "consumer", name: "Holy Consumer!", cost: 8, dmg: 25, successMsg: "Holy Consumer! The cultural critique is lethal. 25 damage!", desc: "Lethal cultural critique. Deals double damage to rich or flashy foes." }
            ]
        },
        lebby: {
            id: "lebby",
            name: "Jacob Lebby",
            title: "Sub-Zero",
            maxHp: 100,  // Was 200 — halved
            hp: 100,
            maxMp: 40,
            mp: 40,
            atk: 15,
            def: 5,
            speed: 6,
            color: "#b0c4de",
            avatar: "🐮",
            inventory: ["liquid_flex", "audrey_number", "stack_50", "audrey_date"],  // 2026-06-11: Added audrey_date (4th unique item)
            uniqueItems: ["liquid_flex", "audrey_number", "stack_50", "audrey_date"],
            acts: [
                { id: "liquid_flex", name: "Liquid Flex", cost: 15, dmg: 10, successMsg: "Flex $3,900! Enemy is unimpressed. Takes 10 damage.", desc: "Flex $3,900. Absorbs damage using money. Triggers a shield." },
                { id: "mute_gc", name: "Mute GC", cost: 20, dmg: 5, successMsg: "Jacob mutes the GC. Enemy is confused. Takes 5 damage.", desc: "Mutes the chat for 1 turn. Completely stops enemy turn." },
                { id: "nigeria", name: "Nigeria Deflect", cost: 10, dmg: 15, successMsg: "Nigeria?! The enemy is baffled. Takes 15 damage.", desc: "Bizarre geopolitical response. Confuses and blinds attacker." }
            ]
        },

        // ============================================================================
        // 2026-06-11: ERIC ADDED TO PLAYERS — Required for Eric to be a valid
        // starting character option. Stats balance between Lebby and Hedgecock
        // so he feels like a fast, mid-tier business-tank.
        // ============================================================================
        eric: {
            id: "eric",
            name: "Eric Huang",
            title: "The Extortion Economist",
            maxHp: 90,   // Mid-tier HP
            hp: 90,
            maxMp: 80,   // High MP for a savvy business brain
            mp: 80,
            atk: 25,     // Solid mid-range ATK
            def: 12,
            speed: 15,   // Fastest of the group (C55 speed)
            color: "#b0a8d4",
            avatar: "💸",
            inventory: ["apple_music", "dividend_check", "market_drip", "spotify_premium"],  // 2026-06-11: 4th item added
            uniqueItems: ["apple_music", "dividend_check", "market_drip", "spotify_premium"],
            acts: [
                { id: "spotify_drain", name: "Spotify Drain", cost: 12, dmg: 18, successMsg: "Eric forces the group plan onto Spotify Premium. Enemy loses 1 MP and takes 18 damage.", desc: "Lock everyone into his streaming service. Drains enemy MP and deals damage." },
                { id: "mad_max_dump", name: "Mad Max Movie Dump", cost: 18, dmg: 22, successMsg: "Eric recites the ENTIRE plot of Mad Max: Fury Road. Enemy is bored to tears. 22 damage.", desc: "Force his favorite movie on the enemy. Stuns for 1 turn if it lands." },
                { id: "a_list_cancel", name: "A-List Cancel", cost: 8, dmg: 10, successMsg: "Eric cancels his AMC A-List. The group loses the movie night. Enemy debuffed.", desc: "Cancel plans to make the enemy miss a turn. Debuffs enemy ATK." }
            ]
        }
    },


    // ============================================================================
    // STARTING CHARACTER OPTIONS
    // The player picks one of these at game start. Each option determines the
    // initial party[0] and their starting items.
    // HP matches the PLAYERS table (cut by 50% from original).
    // 2026-06-11: Added Eric and Maharko as additional starting options.
    // ============================================================================
    STARTING_CHARACTERS: [
        {
            id: "farrar",
            name: "Nick Farrar",
            title: "The Hype Warlord",
            description: "High ATK, high speed. Front-loaded damage dealer. Best for aggressive play.",
            avatar: "🚗",
            color: "#4df3ff",
            stats: { hp: 60, mp: 60, atk: 35, def: 10, spd: 14 },
            startingItems: ["boom_manual", "fragance", "hype_sticker"]
        },
        {
            id: "lebby",
            name: "Jacob Lebby",
            title: "Sub-Zero",
            description: "Highest HP, tanky, social damage. Best for survivability and brute force.",
            avatar: "🐮",
            color: "#b0c4de",
            stats: { hp: 100, mp: 40, atk: 15, def: 5, spd: 6 },
            startingItems: ["liquid_flex", "audrey_number", "stack_50", "audrey_date"]
        },
        {
            id: "hedgecock",
            name: "Nick Hedgecock",
            title: "The Strategic Anchor",
            description: "Highest DEF, balanced, defensive. Best for turtling and outlasting opponents.",
            avatar: "💤",
            color: "#4dff8a",
            stats: { hp: 75, mp: 50, atk: 20, def: 22, spd: 8 },
            startingItems: ["maki_platter", "sleep_pill", "b12_stack", "b12_stack_xl"]
        },
        {
            id: "eric",
            name: "Eric Huang",
            title: "The Extortion Economist",
            description: "Fast, mid-tier, MP-heavy. Best for utility debuffs and streaming-service warfare.",
            avatar: "💸",
            color: "#b0a8d4",
            stats: { hp: 90, mp: 80, atk: 25, def: 12, spd: 15 },
            startingItems: ["apple_music", "dividend_check", "market_drip", "spotify_premium"]
        },
        {
            id: "maharko",
            name: "Myat Maharko",
            title: "D1 Consumerism Critic",
            description: "Lowest HP, but devastating debuffs and crits. High-skill, high-reward glass cannon.",
            avatar: "🧻",
            color: "#ffbe4d",
            stats: { hp: 50, mp: 70, atk: 30, def: 12, spd: 13 },
            startingItems: ["holy_cross", "find_my", "crypto_bag", "crypto_pump"]
        }
    ],




    // Battle Enemies Database
    // 2026-06-11: HP cut by ~50%, rounded to nearest 50.
    // Eric's boss also has its HP reduced to make the late-game less of a slog.
    ENEMIES: {
        jacob: {
            name: "Jacob Lebby (Cow Mode)",
            maxHp: 50,   // 2026-06-11: -50% HP (was 100) for snappier fights
            hp: 50,
            atk: 12,
            def: 6,
            speed: 5,
            mood: "VOLATILE",
            memberId: "lebby",
            // 2026-06-11: WEAKNESS SYSTEM — Jacob is weak to Hedgecock's Safe Space
            // (calming emotional volatility). Using this act does 1.5x damage.
            weaknessActId: "safespace",

            dialogues: [
                "Just fuck off all of you! I'm muting this gc!",
                "Audrey literally hasn't messaged me in weeks...",
                "I am FUCKING Sub-Zero! My rizz is calculated!",
                "You guys are too chicken to pull up to Shepherd!"
            ],
            acts: [
                { id: "bribe", name: "Bribe ($100 Cash)", successMsg: "Jacob eyes the cash. 'Fine, I'll pay for the whole NYC trip.'", pacify: true },
                { id: "chatgpt", name: "ChatGPT Mockery", successMsg: "You read his custom GPT output. Jacob blushes: 'I sound like Jacob Lebby!'", dmg: 20 },  // 15→20
                { id: "comfort", name: "Offer Clean Shave", successMsg: "You tell him he looks better clean shaven. Easing his anxiety.", pacify: true }
            ],
            bulletPattern: "cow_melt"
        },
        hedgecock_boss: {
            name: "Nick Hedgecock (Sleep Goblin)",
            maxHp: 75,   // 2026-06-11: -50% HP (was 150) for snappier fights
            hp: 75,
            atk: 20,
            def: 18,
            speed: 10,
            mood: "CHRONICALLY TIRED",
            memberId: "hedgecock",
            // 2026-06-11: WEAKNESS SYSTEM — Hedgecock is weak to Farrar's BOOM!
            // (hype energy wakes him up from the Sleep Goblin state). 1.5x damage.
            weaknessActId: "boom",

            dialogues: [
                "Guys I'm sooooo tired. I'm content with living in Baltimore.",
                "Clause Sleep First, Ask Questions Later is in effect.",
                "Is Jacob delusional? Anastasia thinks so.",
                "I'm too tired to move... I'm a human parking brake."
            ],
            acts: [
                { id: "maki", name: "Feed Maki Sushi", successMsg: "Hedgecock gobbles down maki sushi and wakes up completely!", pacify: true },
                { id: "tire_off", name: "Challenge: Tired-Off", successMsg: "You scream 'IM SOOOO TIRED' louder than him. He collapses into a heap.", pacify: true },
                { id: "pregame", name: "Suggest Pregame", successMsg: "You suggest a pregame at Commons to save money. He gets excited!", dmg: 28 }  // 20→28
            ],
            bulletPattern: "bedtime_chicken"
        },
        eric: {
            name: "Eric (Extortion Economist)",
            maxHp: 125,  // 2026-06-11: -50% HP (was 250) for snappier fights
            hp: 125,
            atk: 35,
            def: 25,
            speed: 16,
            mood: "EXTORTIONIST",
            memberId: "maharko",
            // 2026-06-11: WEAKNESS SYSTEM — Eric is weak to Maharko's Holy Consumer
            // (cultural criticism exposes his consumerism). 1.5x damage.
            weaknessActId: "consumer",

            dialogues: [
                "ITS 4.50! Blame Joe Biden. It's just business guys.",
                "1000 pennies is 10 bucks. Buy Apple Music if you're broke.",
                "UR NEVER GETTING MY LOCATION!",
                "Market dividends are coming in... time to cancel AMC A-List.",
                "It's just business guys. I'm a businessman."
            ],
            acts: [
                { id: "audit", name: "Audit (Present Math)", successMsg: "You project '20 / 6 = 3.33' onto the wall. His extortion ledger crumbles! Now try SPARE.", pacify: true },
                { id: "lorde_expose", name: "Music 204 Plagiarism Expose", successMsg: "You expose his copied ChatGPT Lorde concert reviews. He panics!", dmg: 18 },  // 12→18
                { id: "crazy8", name: "Play Crazy 8 Game", successMsg: "You launch Crazy 8 at 1:58 AM, exploiting his 'I'm Tired' weakness.", dmg: 26 }  // 18→26
            ],
            bulletPatterns: [
                { id: "spotify_crazy8",  tell: "ITS 4.50! Blame Joe Biden. It's just business guys." },
                { id: "a_list_barrage",  tell: "I canceled my AMC A-List! Market dividendos are coming in!" },
                { id: "inflation_rain",  tell: "1000 pennies is 10 bucks. Inflation is real." },
                { id: "location_lockdown", tell: "UR NEVER GETTING MY LOCATION! Stalk me again, I dare you." },
                { id: "tired_zzz",       tell: "I'm sooooo tired. Just one more turn then I'm done." }
            ],
            bulletPattern: "spotify_crazy8"
        },

        // ============================================================================
        // 2026-06-11: MAHARKO BOSS ENTRY — Critical addition for the dynamic boss
        // selection system. Previously referenced in setNextDynamicBoss() but missing
        // from this table, causing "the next boss" placeholder + broken bullets/sprite
        // when the queue picked this slot. Stats sit between Hedgecock (150/20) and
        // Eric (250/35) so she feels like a mid-tier challenge.
        // ============================================================================
        maharko_boss: {
            name: "Myat Maharko (D1 Critic Mode)",
            // 2026-06-24: HP raised to 260 (was 100). At ~35 dmg/hit this is a 7-8
            // round fight, so the player survives multiple bullet-hell rounds and
            // chips the boss down — instead of dying in the first round and having
            // the whole minigame end after a single hit. ATK/DEF bumped to match.
            maxHp: 260,
            hp: 260,
            atk: 32,
            def: 16,
            speed: 13,
            mood: "STALKING",
            memberId: "maharko",  // When defeated, Maharko auto-joins the party
            // 2026-06-11: Maharko is weak to Hedgecock's "Looney Tuesday" — the lunacy
            // expose takes down her crypto-bro persona for 1.5x damage.
            weaknessActId: "looney",

            dialogues: [
                "IYKYK, I can see your location on Find My. Don't even try.",
                "Your crypto bag is EMPTY. Cope harder, peasant.",
                "I have TP for days. Don't test me on supply logistics.",
                "This D1 energy isn't going to suppress itself, bro.",
                "I'M NOT STALKING, I just have Find My enabled. Completely different."
            ],
            acts: [
                { id: "find_my_expose", name: "Expose Find My", successMsg: "You expose her Find My tracking on the projector. She panics: 'HOW DID YOU KNOW MY LOCATION?!'", dmg: 22 },
                { id: "tp_flush", name: "Flush TP Cache", successMsg: "You flush the entire toilet paper supply down the drain. Maharko looks defeated and exposed.", pacify: true },
                { id: "audit_d1", name: "Audit D1 Trades", successMsg: "You audit her D1 trades. The 0.4% returns are devastating to her ego. 28 damage!", dmg: 28 }
            ],
            bulletPattern: "crypto_stalk"
        },

        ben: {
            name: "Ben Bersofsky (First of his Name)",
            maxHp: 330,  // 2026-06-11: +50% HP (was 220) per user request — final boss HP boost
            hp: 330,
            atk: 40,     // 2026-06-11: +5 ATK buff (was 35) for harder bullet hell
            def: 35,     // 2026-06-11: +5 DEF buff (was 30) for harder hits
            speed: 12,
            mood: "F1 CALCULATED",  // 2026-06-11: Updated mood to match F1 theme
            memberId: null,
            // 2026-06-11: WEAKNESS SYSTEM — Ben is weak to Jacob's Nigeria Deflect
            // (bizarre deflections shatter his alchemical defenses). 1.5x damage.
            weaknessActId: "nigeria",

            dialogues: [
                "Racing never stops. Ben Ber is here.",
                "I salvaged the stew... the stew endures. The stew is alive.",
                "I will block US if Jacob spams me again.",
                "Catfish? Maria Brooke is real!"
            ],
            acts: [
                { id: "stew_spill", name: "Spill Suspicious Stew", successMsg: "You tip over the cauldron. Ben's alchemical assimilation network breaks!", dmg: 80 },  // 60→80
                { id: "block_threat", name: "Threaten to Block GC", successMsg: "You threaten to block him from the winner squad. He falters.", dmg: 55 },  // 40→55
                { id: "hyperphunk", name: "Play Hyperphunk Sped-Up", successMsg: "The heavy 3 AM bass drop shatters his psychological barrier!", pacify: true }
            ],
            bulletPattern: "f1_pitstop"  // 2026-06-11: Renamed (logic unchanged, ID updated for flavor)
        }
    },




    // Consumable Items
    // ============================================================================
    // 2026-06-11 REBALANCE: Healing is much weaker. New negative-effect items
    // (Spicy Leftovers, Galaxy Gas, Mystery Juice, etc.) can HURT the user.
    // PERSONAL INVENTORY: shared items can be used by anyone. Unique items
    // (with ownerId) can only be used by their owner.
    // ============================================================================
    ITEMS: [
        // === SHARED ITEMS (any member can use) ===
        { id: "maki", name: "Maki Sushi", desc: "Hand-formed Masterpiece. Heals 30 HP and cures Sleep.", heal: 30, mpHeal: 0, cureSleep: true },
        { id: "bleaf", name: "Gleaf Cartridge", desc: "Spark the pen. Restores 15 MP. 20% sleep risk (you're not tired bro).", heal: 0, mpHeal: 15, sleepRisk: true },
        { id: "b12", name: "B12 Vitamins", desc: "Essential brain support. Heals 15 HP + 10 MP. Cures brainrot.", heal: 15, mpHeal: 10, cureDebuff: true },
        { id: "bribe_50", name: "$50 Cashback Note", desc: "Larping refunds. Instantly heals 25 HP of wallet health.", heal: 25, mpHeal: 0 },
        { id: "stroganoff", name: "Beef Stroganoff", desc: "Cooked with last of the milk. Heals party 50 HP, hurts Maharko for 30.", heal: 50, mpHeal: 25, maharkoDmg: 30 },

        // === NEGATIVE-EFFECT ITEMS (2026-06-11: damage values slightly buffed) ===
        // These items can HURT the user. Use at your own risk.
        { id: "spicy_leftovers", name: "Spicy Leftovers 🍛", desc: "Smells off. Heals 10 HP, but DEALS 8 POISON damage over 3 turns.", heal: 10, poisonDmg: 8, poisonTurns: 3 },
        { id: "galaxy_gas", name: "Galaxy Gas Cartridge 🌌", desc: "Brainrot juice. DEALS 12 HP, restores 30 MP. Applies Brainrot (DEF -30% for 2 turns).", dmg: 12, mpHeal: 30, brainrot: true, brainrotTurns: 2 },
        { id: "mystery_juice", name: "Mystery Juice 🧃", desc: "Capri Sun. 50/50: either heals 15 HP or deals 20 HP. Gamble!", gamble: true, heal: 15, dmg: 20 },
        { id: "expired_adderall", name: "Expired Adderall 💊", desc: "+25% ATK for 1 turn, but -10% MAX HP for the rest of battle.", atkBoost: 1.25, duration: 1, maxHpPenalty: 0.10, desc2: "Cafeteria stimulants. Risky." },
        { id: "moldy_bread", name: "Moldy Bread 🍞", desc: "Heals 2 HP, inflicts Sick (ATK -50% for 2 turns).", heal: 2, sick: true, sickTurns: 2 },


        // === FARRAR UNIQUE ITEMS ===
        { id: "boom_manual", name: "BOOM Manual", desc: "[Farrar Only] The literal Hype Bible. +50% ATK this turn.", ownerId: "farrar", atkBoost: 1.5, duration: 1, mpHeal: 0, selfAtkBoost: true },
        { id: "fragance", name: "eBay Fragance", desc: "[Farrar Only] 'Best smelling gangster of the whole gc'. Deflects 1 incoming attack.", ownerId: "farrar", mpHeal: 0, deflect: 1 },
        { id: "hype_sticker", name: "Hype Sticker ✨", desc: "[Farrar Only] Sticks to the player. +15% ATK, +5% crit. Permanent this battle.", ownerId: "farrar", atkBoost: 0.15, critBoost: 0.05, duration: 99 },

        // === HEDGECOCK UNIQUE ITEMS ===
        { id: "maki_platter", name: "Maki Platter", desc: "[Hedgecock Only] Heals party 100 HP + cures sleep + 20 MP. Big dinner.", ownerId: "hedgecock", heal: 100, mpHeal: 20, cureSleep: true, fullParty: true },
        { id: "sleep_pill", name: "Sleep Pill", desc: "[Hedgecock Only] 'Bedtime Protocol' activated. Stuns the enemy for 1 turn.", ownerId: "hedgecock", mpHeal: 0, stunEnemy: 1 },
        { id: "b12_stack", name: "B12 Stack 💊", desc: "[Hedgecock Only] Mega-vitamin dose. +30 MP, cures ALL debuffs.", ownerId: "hedgecock", mpHeal: 30, cureDebuff: true, fullCure: true },

        // === JACOB UNIQUE ITEMS ===
        { id: "liquid_flex", name: "Liquid Flex", desc: "[Jacob Only] Flex $3,900. Creates a 50-damage shield for 2 turns.", ownerId: "lebby", mpHeal: 0, shield: 50, duration: 2 },
        { id: "audrey_number", name: "Audrey's Number", desc: "[Jacob Only] The forbidden call. Instantly pacifies the boss (if pacifiable).", ownerId: "lebby", mpHeal: 0, instantPacify: true },
        { id: "stack_50", name: "$50 Stack 💵", desc: "[Jacob Only] Folded bills. Heals 25 HP, +10 MP. The LFG starter pack.", ownerId: "lebby", heal: 25, mpHeal: 10 },

        // === MAHARKO UNIQUE ITEMS ===
        { id: "holy_cross", name: "Holy Cross", desc: "[Maharko Only] Critical hit rate doubled for 3 turns.", ownerId: "maharko", mpHeal: 0, critBoost: 1.0, duration: 3 },
        { id: "find_my", name: "Find My Beacon", desc: "[Maharko Only] Stalks enemy. Reveals the next 2 attack patterns.", ownerId: "maharko", mpHeal: 0, revealPatterns: 2 },
        { id: "crypto_bag", name: "Crypto Bag 🪙", desc: "[Maharko Only] HODL! Heals 20 HP. 50% chance to find BONK token for +1 crit.", ownerId: "maharko", heal: 20, critBoost: 0.5, critDuration: 1 },

        // === FARRAR 4TH UNIQUE ITEM (2026-06-11) ===
        { id: "boom_v2", name: "BOOM V2 Manual", desc: "[Farrar Only] The sequel to BOOM!. +75% ATK this turn AND restores 20 MP.", ownerId: "farrar", atkBoost: 1.75, duration: 1, mpHeal: 20, selfAtkBoost: true },

        // === HEDGECOCK 4TH UNIQUE ITEM (2026-06-11) ===
        { id: "b12_stack_xl", name: "B12 Stack XL 💊💊", desc: "[Hedgecock Only] Double the B12! Heals party 40 HP + +60 MP + cures ALL debuffs.", ownerId: "hedgecock", heal: 40, mpHeal: 60, cureDebuff: true, fullCure: true, fullParty: true },

        // === JACOB 4TH UNIQUE ITEM (2026-06-11) ===
        { id: "audrey_date", name: "Audrey Date Ticket", desc: "[Jacob Only] The reservation you finally made. Pacifies any boss + heals party 50 HP.", ownerId: "lebby", heal: 50, mpHeal: 0, instantPacify: true, fullParty: true },

        // === ERIC 4 UNIQUE ITEMS (2026-06-11) ===
        { id: "apple_music", name: "Apple Music Trial", desc: "[Eric Only] 'Apple Music > Spotify'. Forces everyone to switch. +30 MP, drains 10 MP from enemy.", ownerId: "eric", mpHeal: 30 },
        { id: "dividend_check", name: "Dividend Check 💰", desc: "[Eric Only] Quarterly returns. Heals 35 HP, +15 MP, +10% ATK for 3 turns.", ownerId: "eric", heal: 35, mpHeal: 15, atkBoost: 0.10, duration: 3 },
        { id: "market_drip", name: "Market Drip", desc: "[Eric Only] Steady gains. Restores 5 MP per turn for 3 turns. Self discipline.", ownerId: "eric", mpHeal: 5, mpDripTurns: 3, mpDrip: 5 },
        { id: "spotify_premium", name: "Spotify Premium", desc: "[Eric Only] No ads, no compromises. Heals 20 HP, +40 MP, cures all debuffs.", ownerId: "eric", heal: 20, mpHeal: 40, cureDebuff: true, fullCure: true },

        // === MAHARKO 4TH UNIQUE ITEM (2026-06-11) ===
        { id: "crypto_pump", name: "Crypto Pump 🚀", desc: "[Maharko Only] When the chart goes up! +100% crit for 2 turns + restores 30 MP.", ownerId: "maharko", mpHeal: 30, critBoost: 1.0, critDuration: 2 },

        // === DEBUG ITEM ===
        { id: "intent", name: "Intentional Game Design", desc: "[DEBUG ITEM] One-shots the boss. Refills each turn. Use for testing.", heal: 0, mpHeal: 0, debugMaxDamage: true }
    ],




    // Overworld Tile Map Specification
    MAPS: {
        shepherdstown: {
            theme: "brick",
            width: 20,
            height: 15,
            tileSize: 32,
            tiles: [
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,2,2,2,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1],
                [1,2,3,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                [1,2,2,2,1,0,0,0,0,4,0,0,0,0,0,0,0,0,1,1],
                [1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                [1,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,1,1],
                [1,0,0,0,0,0,1,5,5,5,5,5,1,0,0,0,0,0,1,1],
                [1,0,0,0,0,0,1,5,5,5,5,5,1,0,0,0,0,0,1,1],
                // Dorm door added at row 10, col 9 (was a wall, now walkable)
                [1,0,0,0,0,0,1,1,1,0,1,1,1,0,0,0,0,0,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            ],
            playerStart: { x: 5, y: 5 },
            triggers: [
                { x: 2, y: 2, type: "npc", id: "suitmate", text: "I'm Jacob's suitemate. He went to Potomac Place dorm to mop the floor in a cow suit.", name: "Suitemate" },
                { x: 9, y: 9, type: "npc", id: "jacob", text: "F off! I'm muting this gc. I spent $50 on New York and they said it was forfeit!", name: "Jacob Lebby", triggerBattle: "act_boss" },

                { x: 17, y: 13, type: "exit", nextMap: "rockville", text: "Heading to Rockville Playground..." }
            ]
        },

        rockville: {
            theme: "playground",
            width: 20,
            height: 15,
            tileSize: 32,

            tiles: [
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,1],
                [1,0,5,5,5,0,0,0,0,1,1,0,0,0,0,0,0,0,1,1],
                [1,0,5,5,5,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,1,1],
                [1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,0,1,1],
                [1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                [1,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,1,1],
                [1,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            ],
            playerStart: { x: 2, y: 8 },
            triggers: [
                // 2026-06-11: REPLACED D1 Joe with Audrey (Jacob's love interest).
                // 2026-06-11: When player IS Jacob, extra branches are added: "Ask her to Maki",
                // "Confess your feelings", and "What would you say to Jacob about the GC?".
                // The branches are dynamically expanded at interaction time.
                { x: 3, y: 3, type: "npc", id: "audrey", name: "Audrey", text: "Oh hey! Jacob told me about the GC drama. He's been so stressed about you all. What do you want to say to me?", useBranching: true, branches: (function() {
                    const baseBranches = [
                        { label: "Tell her about the GC", reply: "Wait, they're still doing that? Tell Jacob I'm here for him. We're in this together." },
                        { label: "Ask about Jacob", reply: "He's at Shepherd, moping in a cow suit apparently. He keeps texting me, but never calls. *smiles* Boys, right?" },
                        { label: "Ask about Maki plans", reply: "Maki? Love it. Jacob keeps saying he'll take me but never follows through. You all should pin him down for me. *giggles*" },
                        { label: "Mention Ben's stew", reply: "Oh god, the stew. Ben tried to serve it at a pregame. Eric refused. Jacob ate three bowls. I took one bite. Never again." },
                        { label: "Ask about D1 trades", reply: "D1? Is that the day-trading thing Maharko keeps posting about? I don't get it. Jacob tried to explain once and I think I lost brain cells." },
                        {
                            label: "Switch to Jacob",
                            reply: "Oh hold on... *picks up phone* Jacob? Can you come over here? Yeah, they're right here. *hands over the phone*",
                            nextSpeaker: "Jacob Lebby",
                            nextBranches: [
                                { label: "Reassure him", reply: "Audrey wants to go to Maki with you! She basically already said yes in her head. Just ask her, bro." },
                                { label: "Pump him up", reply: "You're Sub-Zero, Jacob! Walk over there. Be confident. I'll back you up. BOOM!" },
                                { label: "Tell him to back out", reply: "Actually Jacob... maybe focus on school first? Audrey will still be there in a few months. *sighs*" }
                            ]
                        },
                        { label: "Say goodbye", reply: "Aight, peace! Tell Jacob I said hi. *winks*" }
                    ];
                    // 2026-06-11: If the player IS Jacob, add 3 extra Jacob-specific branches.
                    if (typeof game !== "undefined" && game && game.startingCharId === "lebby") {
                        baseBranches.splice(2, 0, // insert after "Ask about Jacob"
                            { label: "Ask her to Maki (date!)", reply: "Maki? Together? Just us? ... *blushes* Pick me up at 7." },
                            { label: "Confess your feelings", reply: "Jacob... I... ugh. Look, just unblock the GC, okay? *smiles* Maybe ask me at Maki." },
                            { label: "What would you say to Jacob about the GC?", reply: "You'd say 'I'm done being Sub-Zero.' And I'd say 'finally.'" }
                        );
                    }
                    return baseBranches;
                })() },


                // Jacob (sub-zero mode) waiting to join the party after the player beat him in Act I
                { x: 5, y: 2, type: "recruit", memberId: "lebby", name: "Jacob Lebby", text: "You beat me! Fine... I'll unblock the GC. I'm in. Sub-Zero is joining the party. No more muting." },
                // Hedgecock moved to (17, 5) which is a walkable tile (was previously stuck inside walls)
                { x: 17, y: 5, type: "npc", id: "hedgecock", name: "Nick Hedgecock", text: "1. I sit in my seat. 2. ? 3. I smoke whatever you give me. But it's past 10 PM. I'm tired...", triggerBattle: "act_boss" },

                { x: 17, y: 13, type: "exit", nextMap: "commons", text: "Proceeding to UMD South Campus Commons..." },
                // Back exit: return to Shepherdstown (unlocked after beating this act's boss)
                { x: 2, y: 13, type: "back", nextMap: "shepherdstown", text: "Heading back to Shepherdstown..." }
            ]


        },
        commons: {


            theme: "dorm",
            width: 20,
            height: 15,
            tileSize: 32,

            tiles: [
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                [1,0,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,0,1,1],
                [1,0,1,2,2,2,2,1,0,0,0,0,1,2,2,2,1,0,1,1],
                [1,0,1,2,2,2,2,1,0,0,0,0,1,2,2,2,1,0,1,1],
                [1,0,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,0,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                [1,0,1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,0,1,1],
                [1,0,1,2,2,2,1,0,0,0,0,0,0,1,2,2,1,0,1,1],
                [1,0,1,2,2,2,1,0,0,0,0,0,0,1,2,2,1,0,1,1],
                [1,0,1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,0,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            ],
            playerStart: { x: 9, y: 7 },
            triggers: [
                { x: 9, y: 3, type: "npc", id: "eric", name: "Eric Huang", text: "ITS 4.50! Don't complain about 50 cents. It's just business guys. Blame Joe Biden.", triggerBattle: "act_boss" },

                // Hedgecock (Strategic Anchor) waiting to join the party after the player beat him in Act II
                { x: 14, y: 4, type: "recruit", memberId: "hedgecock", name: "Nick Hedgecock", text: "Wake me up at 2:30 AM? Fine. I'm in. Anastasia says I need more friends anyway. Just don't expect me past 10 PM." },
                { x: 17, y: 13, type: "exit", nextMap: "cabin", text: "Driving out to the deep mountains of Basye, Virginia..." },
                // Back exit: return to Rockville Playground
                { x: 2, y: 13, type: "back", nextMap: "rockville", text: "Heading back to Rockville Playground..." }
            ]
        },
        cabin: {

            theme: "wood",
            width: 20,
            height: 15,
            tileSize: 32,


            tiles: [
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                [1,0,0,5,5,5,5,0,0,0,0,0,5,5,5,5,0,0,1,1],
                [1,0,0,5,5,5,5,0,0,0,0,0,5,5,5,5,0,0,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                [1,0,0,0,0,5,1,1,1,1,1,1,5,0,0,0,0,0,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                [1,0,0,0,0,0,0,9,0,0,0,9,0,0,0,0,0,0,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                [1,0,0,0,0,5,1,1,1,1,1,1,5,0,0,0,0,0,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            ],

            playerStart: { x: 2, y: 11 },
            triggers: [
                { x: 9, y: 8, type: "npc", id: "ben", name: "Ben Bersofsky", text: "Racing never stops. I am preparing the final block of the whole GC!", triggerBattle: "ben" },
                // 2026-06-11: MAHARKO IS NOW AN INTERACTIVE NPC (not just a recruit trigger).
                // He has 4 conversation branches. If the player picks "Join my party",
                // they're shown the manual remove-member menu if the party is full.
                { x: 4, y: 5, type: "npc", id: "maharko", name: "Myat Maharko", text: "*standing off to the side* Yo, you actually audited Eric. IYKYK. *chews on gold chain* What's the play?", useBranching: true, branches: [
                    { label: "What did you find on Find My?", reply: "Eric's been hiding $4.50/day from the group. The betrayal runs deep. *adjusts chain*" },
                    { label: "Why do you carry toilet paper?", reply: "Defensive measure. People in this GC are messy. *shrug* You coming or not?" },
                    { label: "Join my party", reply: "Alright. I'll be your Consumerism Critic. *steps forward* IYKYK, the cabin brings enlightenment.", action: "recruit" },
                    { label: "Never mind", reply: "Your loss. *steps back into the shadows*" }
                ] },
                // 2026-06-11: ERIC IS NOW AN INTERACTIVE NPC IN THE CABIN.
                // Players who didn't pick Eric as a starting character (and didn't
                // get him as the recruit on Eric-boss defeat — which auto-recruits
                // Maharko by lore) can NOW manually recruit Eric here. 3
                // conversation branches with a "Join my party" action. Paired
                // with the existing Maharko NPC, the cabin becomes a real
                // recruitment hub for the final Ben fight.
                { x: 2, y: 4, type: "npc", id: "eric", name: "Eric Huang", text: "*adjusts tie* You actually made it to the cabin. IYKYK this is unprecedented. *briefcase in hand* What's the move?", useBranching: true, branches: [
                    { label: "Why $4.50 for parking?", reply: "$3.50 is the lot fee, $1 is the convenience surcharge. It's just business guys. Blame Joe Biden. *taps briefcase*" },
                    { label: "What's your D1 strategy?", reply: "D1 trades? Buy low, sell high. Market dividends are coming in. IYKYK. *doesn't look up from phone*" },
                    { label: "Join my party", reply: "Alright. I'll be your Extortion Economist. *straightens tie* 4.50% commission. Non-negotiable.", action: "recruit" },
                    { label: "Never mind", reply: "Your loss. *goes back to checking his portfolio*" }
                ] },
                // Back exit: return to UMD South Campus Commons
                { x: 2, y: 13, type: "back", nextMap: "commons", text: "Heading back to UMD South Campus Commons..." }
            ]
        }
    }
};




// Node check
if (typeof module !== 'undefined') {
    module.exports = GAME_DATA;
}

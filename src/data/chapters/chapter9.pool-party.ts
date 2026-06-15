import { ChapterConfig } from './types';

const chapter9: ChapterConfig = {
  id: 'suds_and_soles_pool_party',
  index: 9,
  title: 'The Suds & Soles Pool Party',
  subtitle: 'Act VII — Heat Waves & Social Miscalculations',
  location: "Nick F's Backyard — Rockville, MD",
  description:
    "Nick F throws a pool party. Jacob is trapped by a 5K marathon. Anastasia breaks Eric's motion monopoly. The hot tub sees a 10% revelation. The pool sees an Urban Cap Incident.",
  kind: 'chapter',

  map: {
    width: 1080,
    height: 760,
    backdrop: 0x0a1a0a,
    theme: 'pool_party' as any,
    areaTitle: "Nick F's Backyard — June 13, 2026",

    rects: [
      // ── Background: pool map overhead render (night version) ─────────────────
      { x: 540, y: 380, w: 1080, h: 760, fill: 0x0a1a0a, propKey: 'prop_pool_map_night' },

      // ── Boundary walls (invisible — pool_map fence/tree edge handles the look) ──
      { x: 540, y: 50,  w: 1080, h: 100, fill: 0x1a3a1a, solid: true, invisible: true },
      { x: 540, y: 748, w: 1080, h: 24,  fill: 0x1a3a1a, solid: true, invisible: true },
      { x: 12,  y: 380, w: 24,  h: 760, fill: 0x1a3a1a, solid: true, invisible: true },
      { x: 1068, y: 380, w: 24, h: 760, fill: 0x1a3a1a, solid: true, invisible: true },

      // ── Pool water collision (oval approximated — center-left of yard) ─────────
      { x: 352, y: 390, w: 420, h: 185, fill: 0x0891b2, solid: true, invisible: true },
      { x: 352, y: 308, w: 290, h: 98,  fill: 0x0891b2, solid: true, invisible: true },
      { x: 352, y: 468, w: 290, h: 92,  fill: 0x0891b2, solid: true, invisible: true },

      // ── Hot tub collision (connected right side of pool) ─────────────────────
      { x: 622, y: 470, w: 120, h: 105, fill: 0x0284c7, solid: true, invisible: true },

      // ── Character portrait rects ──────────────────────────────────────────────
      // Eric — hot tub (with everyone, motion arbitrage observer)
      { x: 570, y: 470, w: 58, h: 78, fill: 0x1e3a5f, propKey: 'npc_eric_pool' },
      // Nick F — BBQ grill (left side of yard, feeding everyone)
      { x: 118, y: 462, w: 58, h: 78, fill: 0x1e3a5f, propKey: 'npc_nick_f_pool' },
      // Nick H — hot tub area (right of pool)
      { x: 598, y: 440, w: 58, h: 78, fill: 0x1e3a5f, propKey: 'npc_nick_h_pool' },
      // Anastasia — hot tub (with Nick H)
      { x: 650, y: 418, w: 58, h: 78, fill: 0x1e3a5f, propKey: 'npc_anastasia_pool' },
      // Sophia — hot tub (with Anastasia)
      { x: 622, y: 498, w: 58, h: 78, fill: 0x1e3a5f, propKey: 'npc_sophia_pool' },
      // Jacob — lower deck near entrance gate (arrived late, street clothes + cap)
      { x: 464, y: 654, w: 58, h: 78, fill: 0x1e3a5f, propKey: 'hero_jacob_sheet' },
      // Sam Ferretti — patio spectator (starts at gate or chairs)
      { x: 760, y: 680, w: 40, h: 40, fill: 0xffffff, stroke: 0x9ca3af, propKey: 'furn_chair' },
      { x: 760, y: 680, w: 58, h: 78, fill: 0x1e3a5f, propKey: 'npc_sam_pool' },
    ],

    labels: [
      { x: 540, y: 728, name: "NICK F'S BACKYARD", detail: 'June 13, 2026 — The Suds & Soles Pool Party', color: '#c8e89a' },
    ],

    playerSpawn: { x: 480, y: 645 },
  },

  actors: [],

  beats: [
    // ── OPENING NARRATION ──────────────────────────────────────────────────────
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'June 13, 2026. Rockville, MD. Nick F\'s backyard.',
        'The decision was simple: a pool party. The execution? Exactly as chaotic as expected.',
        'The pool is sitting at 87 degrees. The supply chain is a mess. The group chat is already spiraling.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Eric, who spent the afternoon testing Gemini Pro 3.1 AI agents, has the infrastructure to bring half of Rockville.',
        'He has chosen not to deploy it. This is called "Motion Arbitrage."',
        'Explore the backyard. When you\'re ready to start the party, head to Nick F\'s grill.',
      ]
    },

    // ── PLAYER EXPLORES, THEN WALKS TO GRILL ──────────────────────────────────
    { type: 'walkTo', x: 118, y: 462, radius: 95, markerLabel: '🍖 Find Nick F at the Grill' },

    // ── ACT I: THE LOGISTICS CRISIS ────────────────────────────────────────────
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        'Okay. Okay. I need a headcount. Who confirmed? Who said "omw" in the last three hours?',
        'The pool is 87 degrees. I need ice. I need Red Bulls. I need chips. WHERE ARE THE CHIPS.',
        'I\'m firing questions into the GC every 10 minutes and getting single emoji responses back.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        'I have hotdogs. The Franks are secured. That\'s all I have confirmed.',
        'If nobody brings ice, we\'re swimming in a warm bathtub all night.',
        'Eric. You\'re the closest. What are you actually contributing here?',
      ]
    },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: 'The supply check. What do you bring to the party?',
      options: [
        {
          text: 'Deploy the nuclear option: 20 lbs of ice. Right now.',
          ledgerDelta: 15,
          reactionSpeaker: 'eric',
          reactionLines: [
            '20 lbs. Executed. Done. [ICE DROP] has been deployed.',
            'I have made my contribution. The pool is now an asset class.',
            'Do not ask me to bring chips. That is a separate deployment entirely.',
          ]
        },
        {
          text: 'Assign Jacob one specific job: 4 Peach Red Bulls.',
          reactionSpeaker: 'nick_f',
          reactionLines: [
            'Perfect. One task. Four Peach Red Bulls. I\'m texting him right now.',
            '"Jacob. 4 Peach Red Bulls. That\'s it. That\'s the whole job."',
            '...He reacted with a thumbs up. That\'s either great or very, very bad.',
          ]
        },
        {
          text: 'Hoard your motion. You will observe and analyze.',
          reactionSpeaker: 'eric',
          reactionLines: [
            'I operate on Motion Arbitrage. My network is a finite resource.',
            'I will not deploy into an unproven 87-degree pool environment.',
            'I will sit here. I will watch. And when the time is right — I will act.',
          ]
        },
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The ice drop lands. Eric\'s 20 lbs begins cooling the pool from 87 toward something survivable.',
        'Nick F lays the Franks on the grill. The party has a food supply and a cooling system.',
        'Everything else is unraveling in real time in the group chat.',
      ]
    },

    // ── ACT II: THE SUDS & SOLES BLOCKADE ─────────────────────────────────────
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Meanwhile, on the other side of Rockville: Jacob\'s entire street has been annexed.',
        'The annual "Suds & Soles" 5K marathon has deployed police tape, orange cones,',
        'and approximately 10,000 runners directly through his block. He cannot leave.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'YO. I\'m literally blocked in. Police tape everywhere. Can\'t get my car out.',
        'There is a literal 5K marathon happening outside my window right now. This is insane.',
        'I think I\'m just gonna eat dinner with my grandma and watch the Knicks game. I\'ll sit this one out.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        'Jacob. It\'s a 5K. It ends. They will clear the street.',
        'You live 12 minutes away. The math works.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'Nah I\'m probably good man. Nick, I heard there might be "bathroom rules" at this party.',
        'I don\'t do bathroom rules. I have a decorum policy.',
        'Plus the Knicks game is on. I\'m like 50/50. Who\'s even there?',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        'The boys and girls.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Three words.',
        '"The boys AND girls."',
        'Jacob has acquired new information. His entire threat model is being recalculated.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'Girls? Girls are there?',
        '...Are they single.',
      ]
    },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: 'Jacob needs confirmation. The next move matters.',
      options: [
        {
          text: '"Yeah, they\'re single." — Confirm the intel.',
          reactionSpeaker: 'jacob',
          reactionLines: [
            'Say less. I\'m on my way.',
            'THE STREETS WILL OPEN. The 5K cannot contain me.',
            'Give me 30 minutes. Actually — 10. I\'m leaving right now.',
          ]
        },
        {
          text: '"Not sure, just come through." — Soft confirm.',
          reactionSpeaker: 'jacob',
          reactionLines: [
            '"Not sure" means yes. I am reading between the lines.',
            'I\'m coming. I don\'t need more information than this.',
            'Send me the address. I\'m getting in my car.',
          ]
        },
        {
          text: 'Leave him on read. Let the information marinate.',
          reactionSpeaker: 'narrator',
          reactionLines: [
            'The read receipt does the work.',
            'Jacob has seen it. The data has been processed.',
            'Five minutes later — "omw."',
          ]
        },
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Jacob Lebby\'s [Suds & Soles Paralysis] is instantly cured.',
        'The marathon blockade, which couldn\'t be defeated by any physical force, opens in exactly 10 minutes.',
        'The streets did not change. Jacob simply decided they were navigable. They became navigable.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'He also had one assigned task: 4 Peach Red Bulls. Confirmed with a thumbs-up emoji.',
        'We will return to this.',
      ]
    },

    // ── ACT III: THE ARRIVALS ──────────────────────────────────────────────────
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The core crew is already at the house. The vibes are forming.',
        'And then — Anastasia arrives.',
        'Nick H\'s girlfriend. In possession of an ability Eric has never encountered before.',
      ]
    },
    { type: 'cameraPan', x: 650, y: 428, durationMs: 1200, holdMs: 2700 },
    {
      type: 'dialogue',
      speaker: 'anastasia',
      lines: [
        'Hey! We made it! I brought Sophia — hope that\'s okay.',
        'Oh my god the pool is so clean. Is it warm?',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Anastasia has activated [VIP Access].',
        'She has bypassed Eric\'s Motion Arbitrage and introduced a new faction into the party.',
        'The gender ratio of the entire event has been permanently altered.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        'Anastasia has deployed into my social network without a motion expenditure.',
        'She invited Sophia directly. Zero gatekeeping check. Zero approval from the motion hierarchy.',
        'I acknowledge this. She has leveled past me. Respect.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'sophia',
      lines: [
        'Omg the pool is so nice!! Is that a projector?! For the hot tub?!',
        'We are absolutely watching something good in that hot tub later. This is non-negotiable.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Then: Sam Ferretti appears at the gate.',
        'He doesn\'t look great.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'sam_ferretti',
      lines: [
        'Hey guys. I\'m here!',
        'YOOO Whats up!!!',
        ':D',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        'Sam you don\'t have to get in anything. Grab a chair. The Franks are almost done.',
        'Actually — FRANKS ARE DONE. Get a plate. Everyone was about to starve.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The Franks land. The ice drop had already cooled the pool to 67 degrees.',
        'Starvation: neutralized. Pool biome: optimal.',
        'The party is now officially operational.',
      ]
    },

    // ── ACT IV: THE JACOB ARRIVAL ──────────────────────────────────────────────
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        '9:00 PM. A car appears at the gate.',
        'Jacob has arrived.',
        'Nick F opens his mental inventory. Jacob had ONE task. One item.',
      ]
    },
    { type: 'cameraPan', x: 464, y: 654, durationMs: 1400, holdMs: 2200 },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'YOOO! I made it! The streets just... opened up. Like 10 minutes after I decided I was coming.',
        'Nick I told you the 5K couldn\'t stop me. Sub-Zero is HERE.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        'Jacob.',
        'You had one job.',
        '...Where are the Peach Red Bulls.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'Oh. Yeah. I... didn\'t get those.',
        'I got my own beers though. I brought a 6-pack for myself. That\'s fine right?',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Nick F\'s [Silent Disappointment] passive activates.',
        'He does not yell. He does not flip the grill. He simply drops his shoulders approximately 3 inches.',
        'The rage is absorbed internally. The party has momentum. It continues.',
      ]
    },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: 'The Red Bull Deficit is official. What is the right response?',
      options: [
        {
          text: '"Jacob I literally texted you. Four. Peach. Red Bulls."',
          reactionSpeaker: 'jacob',
          reactionLines: [
            'I know. I KNOW. I had to navigate an active 5K marathon. Give me some grace.',
            'I brought myself. That\'s the contribution. I AM the Red Bull energy.',
          ]
        },
        {
          text: 'Let it go. Absorb the disappointment. The party has momentum.',
          reactionSpeaker: 'nick_f',
          reactionLines: [
            'It\'s fine. The Franks saved us anyway. We didn\'t need Red Bulls.',
            'We have ice. We have Franks. We have each other.',
            '...We really needed those Red Bulls though.',
          ]
        },
        {
          text: 'Inspect Jacob\'s full loadout. Hold him accountable.',
          reactionSpeaker: 'jacob',
          reactionLines: [
            'Alright fine: no Red Bulls. Also no swim trunks. I\'m in street clothes.',
            'I have a 6-pack that\'s only for me, a baseball cap, and a lot of energy.',
            'Sub-Zero improvises. That is the brand. That\'s always been the brand.',
          ]
        },
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Jacob\'s full inventory: [Self-Sustaining Beer x6], [Street Clothes], [Baseball Cap].',
        'Not present: [Swim Trunks], [Peach Red Bulls x4].',
        'Nick F\'s [Silent Disappointment] passive reaches maximum charge.',
      ]
    },

    // ── ACT V: THE HOT TUB AREA ───────────────────────────────────────────────
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'As the night deepens, the group migrates from the pool deck to the hot tub.',
        'The projector fires up. On screen: the New York Knicks.',
        'The vibes are immaculate.',
      ]
    },
    { type: 'walkTo', x: 600, y: 445, radius: 100, markerLabel: '🌊 Join the crew at the Hot Tub' },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        'This is it. This is the setup right here.',
        'Hot tub. Knicks game on the projector. Heat Waves by Glass Animals on between timeouts.',
        'This is what summer is supposed to be. I am never leaving this hot tub.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'anastasia',
      lines: [
        'This is honestly so good. The projector out here is so smart.',
        'Nick you need to do this every single weekend.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        'Every weekend. I\'m locking in. This is now my entire personality and I am fine with that.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'Knicks are down by 10 in the third quarter.',
        'I\'m putting $3 on them. I\'m a lifelong Knicks fan. Always have been. They\'re coming back.',
      ]
    },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: "Jacob's $3 Knicks bet. They're down by 10 in the third.",
      options: [
        {
          text: '"I\'ll take that bet. $3 says they don\'t come back."',
          ledgerDelta: -3,
          reactionSpeaker: 'jacob',
          reactionLines: [
            'DONE. Easy money for me. Absolutely easy.',
            'The Knicks ALWAYS come back. This is historical fact.',
            'You are going to look very silly when this is over.',
          ]
        },
        {
          text: '"The Knicks haven\'t won a championship since 1973, Jacob."',
          reactionSpeaker: 'jacob',
          reactionLines: [
            'Those are IRRELEVANT statistics. I don\'t trade in stats. I trade in VIBES.',
            'The Knicks are ascending. I feel it in my soul.',
          ]
        },
        {
          text: '"$3 with you becomes a whole thing. I\'m out."',
          reactionSpeaker: 'nick_f',
          reactionLines: [
            'Smart move. With Jacob, $3 becomes a psychological event.',
            'Good call. Watch it unfold from a safe distance.',
          ]
        },
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The Knicks go on a 14-0 run in the fourth quarter.',
        'They win by 7. The projector explodes with celebration.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'I TOLD YOU GUYS. I TOLD ALL OF YOU.',
        'I am a KNICKS FAN. Lifelong. From BIRTH. This was never in question.',
        'I\'m going to New York. I\'m buying Knicks gear. I might actually move there.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        'Jacob. You just said you were a "lifelong Knicks fan" 20 minutes ago while they were LOSING.',
        'You did not know who played point guard.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'I knew in my SOUL. Statistics are not the only way to know a team.',
        'WE WON. The details are unimportant. WE WON.',
      ]
    },

    // ── ACT VI: HEATED RIVALRY & THE 10% SCALE ────────────────────────────────
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The Knicks game ends. The projector switches to the next entertainment.',
        'On screen: "Heated Rivalry." A gay hockey romance series.',
        'The hot tub has entered a new era.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'Okay. What IS this. What are we watching right now.',
        'Are these guys... is this a... ROMANCE? Between hockey players?',
        'I need everyone to know: I am at 1% on the scale right now. That\'s the baseline.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'Wait. Wait wait wait. That scene right there.',
        'Okay I\'m recalculating. I am now at 4%. That specific scene moved the needle.',
        'But I need everyone to understand something: the MATHEMATICAL UPPER BOUND is 10%.',
        'That is the ceiling. It cannot be exceeded. I am stating this for the record.',
      ]
    },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: "Jacob's 10% Scale Commentary is in full effect. How do you respond?",
      options: [
        {
          text: '"Jacob. What in the world are you saying right now."',
          reactionSpeaker: 'jacob',
          reactionLines: [
            'I\'m saying what everyone is THINKING. I\'m the only honest person here.',
            '4% on the scale. Trending. But bounded.',
            'By end of season 2 I might be at 5, but the upper bound remains 10. Period.',
          ]
        },
        {
          text: '"I genuinely do not want to know your percentage, Jacob."',
          reactionSpeaker: 'jacob',
          reactionLines: [
            'You NEED to know. This is important public information.',
            'I\'m being transparent. 4%. And I am still 96% settled in the normal direction.',
            'Sam, back me up on this. SAM. Where is Sam.',
          ]
        },
        {
          text: '"Sam Ferretti needs to hear this from the patio."',
          reactionSpeaker: 'sam_ferretti',
          reactionLines: [
            'I can hear him perfectly from this patio chair. I have excellent hearing.',
            'I am choosing not to engage. This is my [Tactical Sit-Out] ability activating.',
            'You cannot pull me into that hot tub for this conversation. That is final.',
          ]
        },
      ]
    },
    {
      type: 'dialogue',
      speaker: 'sam_ferretti',
      lines: [
        'From my position on the patio: I have heard every single word of this.',
        'I have no comment. I am nauseous, sitting in a lawn chair, watching Jacob do this in a hot tub,',
        'and I have never been more entertained in my life. This is enough for me.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'anastasia',
      lines: [
        'Jacob, I love that you\'re passionate about this.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The diplomatic non-engagement absorbs Jacob\'s [Un-PC Filibuster] without damage.',
        'He interprets this as a positive reaction. It is not a positive reaction.',
        'The hot tub continues.',
      ]
    },

    // ── ACT VII: THE URBAN CAP INCIDENT ───────────────────────────────────────
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Hours pass. Jacob has spent the entire evening in his street clothes.',
        'He has sat in the hot tub fully clothed. He has eaten multiple Franks.',
        'Now, at last, Jacob looks at the main pool — cooled to 67 degrees by Eric\'s ice drop — and makes a decision.',
      ]
    },
    { type: 'walkTo', x: 180, y: 490, radius: 90, markerLabel: '🏊 Move to the Pool Edge' },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'I\'m getting in the pool.',
        'I don\'t have trunks. These street clothes can handle it. I\'ll let them dry.',
        'And the cap stays ON. I\'m keeping the cap on. Trust the process.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        'Jacob you don\'t have a towel. You don\'t have dry clothes. It\'s 11 PM.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'This is a commitment to the bit. The Urban Aura requires sacrifice.',
        'When Anastasia and Sophia see someone enter the pool fully clothed, in a cap,',
        'with complete confidence — that sends a signal. That\'s the theory.',
      ]
    },
    {
      type: 'choice',
      speaker: 'narrator',
      prompt: "Jacob is about to jump in with street clothes and his baseball cap. Your read?",
      options: [
        {
          text: '"That is not going to land the way you think, Jacob."',
          reactionSpeaker: 'jacob',
          reactionLines: [
            'You lack vision. The Urban Aura is about commitment.',
            'If you go all-in with the cap, it says something. Watch.',
            'Everyone is going to look over. I can feel it.',
          ]
        },
        {
          text: '"Leave it. I genuinely cannot wait to see this."',
          reactionSpeaker: 'nick_h',
          reactionLines: [
            'I am going to watch this from the hot tub without saying a single word.',
            'This is a natural event. We do not interfere with natural events.',
            'History is being made. Right here.',
          ]
        },
        {
          text: '"The cap absolutely makes you look urban, Jacob. Go for it."',
          reactionSpeaker: 'jacob',
          reactionLines: [
            'EXACTLY. Someone gets it. That is the thesis.',
            'The Urban Aura is real. The cap is the vehicle.',
            'Three... two... one.',
          ]
        },
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'Alright. Cap on. Full commitment.',
        'Here we go.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Jacob Lebby enters the pool.',
        'He is wearing dark street shorts, a t-shirt, socks still on — and his baseball cap.',
        'He is treading water. He is looking directly at hot tub.',
        'He is waiting for acknowledgment.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Anastasia continues her conversation with Sophia.',
        'Sophia laughs at something Anastasia said.',
        'Neither of them turns around.',
        'Jacob bobs in the water. The cap is soaked.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_h',
      lines: [
        'Bro.',
        'They didn\'t even look.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'I meant to do that.',
        '...The cap is very heavy now.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'nick_f',
      lines: [
        'Jacob you are soaking wet in street clothes at 11 PM.',
        'Please tell me your phone is not in your pocket right now.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'jacob',
      lines: [
        'It\'s waterproof.',
        'Probably.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        'The Urban Cap Strategy has yielded zero social returns.',
        'I have observed this from my lounge chair. The data has been catalogued.',
        'This is why I practice Motion Arbitrage: you deploy into a proven environment.',
        'You do not simply jump in.',
      ]
    },

    // ── EPILOGUE ───────────────────────────────────────────────────────────────
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The Franks fed everyone. The ice cooled the pool. The Knicks came back and won.',
        'Anastasia bypassed Eric\'s entire motion framework just by showing up.',
        'Sam Ferretti observed it all from a patio chair and did not suffer a single injury.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'Jacob arrived 3 hours late with no Red Bulls and only his own beer,',
        'sat in the hot tub in street clothes calculating his own sexuality out loud on a sliding scale,',
        'jumped into the pool with his baseball cap on trying to impress two girls who did not notice,',
        'and declared himself a lifelong Knicks fan at 9:47 PM.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        '1:40 AM. Eric opens the group chat.',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'eric',
      lines: [
        '"that party was so tuff"',
      ]
    },
    {
      type: 'dialogue',
      speaker: 'narrator',
      lines: [
        'The verdict is logged. The record is sealed.',
        'The Suds & Soles Pool Party: certified tuff.',
        'The Syndicate endures.',
      ]
    },
    { type: 'endChapter' },
  ],
};

export default chapter9;

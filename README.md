# Project Omega: The Rockville Syndicate

A top-down pixel RPG that dramatizes the real-life adventures of a Maryland friend group — told through boss fights, dialogue trees, and escalating interpersonal chaos.

---

## The Story

It started with a Spotify Family Plan. It ended with a cabin in Basye, Virginia and a $273.28 per-person entry fee.

**Project Omega** follows Eric, Nick F, Nick H, and Jacob as they navigate a series of increasingly unhinged confrontations — from a midnight Ding Dong Ditch operation on Ben Bersofsky's front lawn to a highway street race in Boca Raton against Jordan Divband and his 5.0 Mustang.

Each chapter is a self-contained story beat ripped from real events and lore-ified: loyalty tests, SOL crashes, red toilets, the Chicken Barrage, phantom toll booths, and one truly unforgettable hospital visit.

---

## Characters

### Playable Heroes

| Hero | Emoji | BIQ | Specialty |
|------|-------|-----|-----------|
| **Eric Huang** | 📊 | 180 | Aura-maximizing analyst |
| **Nick Farrar** | 🚗 | 85 | Car-brained street racer |
| **Nick Hedgecock** | 🐔 | 83 | Chicken-barrage tactician |
| **Jacob Lebby** | ❄️ | 130 | Sub-Zero energy specialist |

**BIQ** (Behavioral Intelligence Quotient) determines starting stats and unlock progression.

### Bosses & Antagonists

- **Eric** — Acts as both player and final-chapter antagonist depending on route
- **Audrey** — The Canadian Red Pee Bladder boss at Shepherd University
- **Jordan Divband** (boss_florida) — Shadow admin, Meat Market regular, owns a 5.0 Mustang
- **Ben Bersofsky** (boss_ben) — 12 Watchwater Way. The Pariah Zone.
- **Nick Farrar** (boss_nick_f) — The Spain Betrayal. Cabin fund thief. Do not invite to crypto.

---

## Chapters

| # | Title | Theme | Boss |
|---|-------|-------|------|
| 1 | The Spotify Family Insurgency | Apartment 1522 | Eric |
| 2 | Operation Inertia (Interlude) | NYC 1AM highway | — |
| 3 | The Red Pee Bladder Strike | Shepherd University | Audrey |
| 4 | The Jungle Gym Gambit (Interlude) | 1202 Princeton Place | — |
| 5 | The Florida Highway Duel | Boca Raton highway | Jordan |
| 6 | Operation Ding Dong Ditch Ben | 12 Watchwater Way | Ben |
| 7 | The Spain Betrayal | Commons 1522 | Nick F |
| 8 | The Cabin (Epilogue) | Basye, VA | — |

Chapters unlock sequentially. Completing a chapter saves progress to localStorage. A chapter-select map lets you replay any completed chapter.

---

## Gameplay

- **Explore**: Move with WASD or arrow keys. Walk up to NPCs to trigger dialogue.
- **Dialogue**: Space/Enter/E advances text. Number keys (1–9) select choices.
- **Combat**: Boss fights are rhythm-timed exchanges — dodge projectiles, land hits during windows.
- **Progression**: Each chapter ends with a narrative beat and contributes to your Aura score.
- **Leaderboard**: Post your final score to the global leaderboard with 3-letter initials.

---

## Tech Stack

- **Frontend**: React 19 + Phaser 3 + TypeScript + Vite + Tailwind v4
- **Backend**: Express.js with a JSON file-based leaderboard
- **Assets**: LimeZu Interiors tileset, Kenney SFX pack, original artwork
- **Save system**: `localStorage` key `omega-progress-v1`

---

## Running Locally

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`.

---

## Docker Deployment (VPS)

### Build and run

```bash
docker compose up -d --build
```

The app listens on port 3000. Leaderboard data persists in `./db_data/`.

### With a custom port

```bash
APP_PORT=8080 docker compose up -d --build
```

Then put Nginx or Caddy in front and reverse-proxy to `localhost:3000` (or your custom port).

### Example Nginx config

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

For HTTPS, run `certbot --nginx -d your-domain.com` after configuring the above.

---

## Lore Glossary

| Term | Meaning |
|------|---------|
| **BIQ** | Behavioral Intelligence Quotient — the primary stat |
| **$3,900 liquid** | The minimum buy-in threshold for the Cabin |
| **ARE YOU 291 LIQUID?** | The final cabin eligibility challenge |
| **The Ledger** | Running tally of social debts (Jordan owes everyone gas money) |
| **Jestermaxxing** | Nick H's signature psychological warfare technique |
| **WTM** | What's the Move — the eternal group chat question |
| **Chicken Barrage** | Nick H's ultimate attack form |
| **Sub-Zero** | Jacob's combat persona |
| **Bedtime Protocol** | Eric's passive ability: converts Aura drain to XP after midnight |
| **Infinite Deferral** | Maharko's signature move: never arriving, always en route |
| **The Spain Betrayal** | Ch7 event: cabin fund redirected to a Europe trip |
| **Sybau** | Shut Your Bitch Ass Up — a full boss ability |
| **D1 Consumerism** | Nick F's economic worldview |
| **Galaxy Gas** | The real substance behind Chapter 3 |
| **Ultraphonk/Hyperphonk** | The two competing musical factions of the group |

---

## Storyboard Source

Full lore, character sheets, boss strategies, and chapter briefs live in `storyboard/storyboard_0.txt` through `storyboard_8.txt`.

The events are real. The stats are canon.

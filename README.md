# Project Omega: The Rockville Syndicate

A top-down pixel RPG that dramatizes the real-life adventures of a Maryland friend group — told through boss fights, dialogue trees, interactive minigames, and escalating interpersonal chaos.

Built with **React 19 + Phaser 3.88 + TypeScript + Vite + Tailwind v4**, served by a tiny **Express** backend that hosts the production bundle and a JSON file–based global leaderboard.

> The events are real. The stats are canon.

---

## Table of Contents

- [The Story](#the-story)
- [Characters](#characters)
- [Chapters](#chapters)
- [Gameplay](#gameplay)
- [Architecture at a Glance](#architecture-at-a-glance)
  - [GameModes (Minigames)](#gamemodes-minigames)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Running Locally](#running-locally)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Docker Deployment (VPS)](#docker-deployment-vps)
- [Reverse Proxy Setup (Nginx or Caddy)](#reverse-proxy-setup-nginx-or-caddy)
- [Save Data & Persistence](#save-data--persistence)
- [Voice Generation Pipeline](#voice-generation-pipeline)
- [Lore Glossary](#lore-glossary)
- [Further Reading](#further-reading)

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

**BIQ** (Behavioral Intelligence Quotient) determines starting stats and unlock progression. Class stats, weapons, and loot metadata live in [`src/data/entities.ts`](src/data/entities.ts).

### Bosses & Antagonists

- **Eric** — Acts as both player and final-chapter antagonist depending on route
- **Audrey** — The Canadian Red Pee Bladder boss at Shepherd University
- **Jordan Divband** (`boss_florida`) — Shadow admin, Meat Market regular, owns a 5.0 Mustang
- **Ben Bersofsky** (`boss_ben`) — 12 Watchwater Way. The Pariah Zone.
- **Nick Farrar** (`boss_nick_f`) — The Spain Betrayal. Cabin fund thief. Do not invite to crypto.

---

## Chapters

Chapters are declarative config files in [`src/data/chapters/`](src/data/chapters/), registered into the `CHAPTERS` list in [`src/data/chapters/index.ts`](src/data/chapters/index.ts). They unlock sequentially; completing one saves progress to `localStorage`, and a chapter-select map lets you replay any completed chapter.

| # | Title | Theme / Setting | Boss | Config |
|---|-------|-----------------|------|--------|
| 0 | Maria Brooke *(Flashback — The Bit)* | Flashback | — | `chapter0.maria-brooke.ts` |
| 1 | The Spotify Family Insurgency | Apartment 1522 | Eric | `chapter1.spotify-insurgency.ts` |
| 2 | Operation Inertia *(Interlude)* | NYC 1AM highway | — | `chapter2.operation-inertia.ts` |
| 3 | The Red Pee Bladder Strike | Shepherd University | Audrey | `chapter3.red-pee-bladder-strike.ts` |
| 3b | The UMBC Incident *(Act III — The Pariah Event)* | UMBC | Ben | `chapter3b.umbc-incident.ts` |
| 4 | The Jungle Gym Gambit *(Interlude)* | 1202 Princeton Place | — | `chapter4.jungle-gym-gambit.ts` |
| 5 | The Florida Highway Duel | Boca Raton highway | Jordan | `chapter5.florida-highway-duel.ts` |
| 5b | The Closed System | Florida, July 4th | Maharko | `chapter5b.rose.ts` |
| 6 | Operation Ding Dong Ditch Ben | 12 Watchwater Way | Ben | `chapter6.ding-dong-ditch-ben.ts` |
| 7 | The Spain Betrayal | Commons 1522 | Nick F | `chapter7.spain-betrayal.ts` |
| 8 | The Cabin *(Epilogue)* | Basye, VA | — | `chapter8.the-cabin.ts` |
| 9 | The Suds & Soles Pool Party | Nick F's Backyard | — | `chapter9.pool-party.ts` |

---

## Gameplay

- **Explore**: Move with WASD or arrow keys. Walk up to NPCs to trigger dialogue.
- **Dialogue**: Space/Enter/E advances text. Number keys (1–9) select choices.
- **Combat**: Boss fights are rhythm-timed exchanges — dodge projectiles, land hits during windows.
- **Minigames**: Chapters can hand control to sandboxed game modes (group chats, silent drives, stew offerings, frat aggro, etc.) that run inline or in the background.
- **Progression**: Each chapter ends with a narrative beat and contributes to your Aura score.
- **Leaderboard**: Post your final score to the global leaderboard with 3-letter initials.

---

## Architecture at a Glance

React 19 manages the overlay UI (dialogue, choices, QTE prompts, difficulty settings) while Phaser 3.88 owns the physical world (camera, physics, sprites, collisions). The main scene is a thin controller that delegates to specialized subsystems.

```
GameLayout.tsx  <-- event bridge / callbacks -->  ChapterScene.ts
                                                        |
        +-----------------+----------------+------------+------------+
        |                 |                |            |            |
   MapBuilder.ts      Actors.ts     AudioController  BeatEngine   GameMode
   (floors, props)  (spawn/anim)    (music/SFX)     (narrative)   registry
                                                        |
                                                  ModeContext façade
                                                  (safe API for minigames)
```

- **`ChapterScene.ts`** — Phaser scene orchestrator. Preloads textures, sets up physics/collision groups, instantiates subsystems, and forwards per-frame ticks.
- **`scene/MapBuilder.ts`** — Interprets a chapter's `MapConfig` to draw floors, scattered nature, collision walls, and interactive props.
- **`scene/Actors.ts`** — Spawns actor sprites, resolves class stats, applies directional walk animations, and processes understudy substitutions.
- **`scene/AudioController.ts`** — Manages stage music crossfades, boss loops, and SFX stings.
- **`scene/BeatEngine.ts`** — Dispatches story beats: `dialogue`, `choice`, `walkTo`, `cameraPan`, and `minigame`.
- **`SpritePreprocessor.ts` / `PropExtractor.ts` / `packSpriteAtlas.ts`** — Boot-time, in-browser asset pipeline: background color-keying of JPG props, tight bounding-box crops, and atlas packing to cut GPU draw calls.

For the full design narrative, diagrams, and gotchas, see [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`CLAUDE.md`](CLAUDE.md).

### GameModes (Minigames)

Interactive segments implement the `GameMode` contract in [`src/game/modes/types.ts`](src/game/modes/types.ts) and are registered in [`src/game/modes/index.ts`](src/game/modes/index.ts). Each mode talks to the scene only through the `ModeContext` façade. Currently registered modes:

| Mode | Directory | Role |
|------|-----------|------|
| `bossFight` | `modes/bossFight/` | Combat minigame: boss movement, attack AI, HP overlays |
| `poolParty` | `modes/poolParty/` | Chapter 9 background pool-entrance script |
| `basementScene` | `modes/basementScene/` | Scripted basement sequence |
| `storyFractures` | `modes/storyFractures/` | Branching narrative fracture sequence |
| `stewOffering` | `modes/stewOffering/` | Interactive stew-offering encounter |
| `fratAggro` | `modes/fratAggro/` | Frat aggression encounter |
| `silentDrive` | `modes/silentDrive/` | Quiet driving interlude |
| `groupChat` | `modes/groupChat/` | Simulated group-chat timeline (parser, reactions, timeline) |
| `carRide` | `modes/carRide/` | Car ride sequence (Maharko boss fight) |
| `external` | `modes/external/` | Loads external minigames (e.g. BattleIQ) |

The [`modes/_template/`](src/game/modes/_template/) directory is a copyable reference. To build a new one, follow [`docs/ADDING_A_MINIGAME.md`](docs/ADDING_A_MINIGAME.md).

---

## Tech Stack

- **Frontend**: React 19 + Phaser 3.88.2 (**not Phaser 4**) + TypeScript + Vite 6 + Tailwind v4
- **Backend**: Express 4 (`server.ts`) serving the built bundle + a JSON file–based leaderboard
- **Animation/UI libs**: `motion`, `lucide-react`
- **Assets**: LimeZu Interiors tileset, Kenney impact SFX pack, original artwork, generated voice lines
- **Build/tooling**: Vite (client) + esbuild (server bundle), `tsx` for dev/server execution
- **Tests**: Vitest (unit) + Playwright (E2E)
- **Save system**: `localStorage` key `omega-progress-v1`

---

## Project Structure

Heavy binary asset directories (audio `.ogg/.mp3`, sprite sheets, `node_modules`, build output) are collapsed below for readability.

```
project-omega_-the-rockville-syndicate/
├── index.html                       # Vite entry HTML
├── server.ts                        # Express server: serves dist/ + leaderboard API
├── package.json                     # Scripts & dependencies
├── tsconfig.json
├── vite.config.ts                   # Vite client build config
├── vitest.config.ts                 # Vitest unit-test config
├── vitest.setup.ts                  # Test environment setup
├── playwright.config.ts             # Playwright E2E config
├── Dockerfile                       # Production container image
├── docker-compose.yml               # Container + db_data volume
├── .env.example                     # Sample environment variables
├── metadata.json
│
├── README.md                        # You are here
├── ARCHITECTURE.md                  # Deep technical design guide
├── CLAUDE.md                        # Developer reference + hard-won gotchas
│
├── src/
│   ├── main.tsx                     # React root (StrictMode)
│   ├── App.tsx                      # Top-level app component
│   ├── index.css                    # Global styles (Tailwind v4)
│   ├── vite-env.d.ts
│   ├── setupTests.ts
│   │
│   ├── components/
│   │   ├── GameLayout.tsx           # React<->Phaser bridge & overlay host
│   │   ├── ChapterSelect.tsx        # Chapter-select map UI
│   │   ├── DialogueBox.tsx          # Dialogue/choice overlay
│   │   └── DialogueBox.test.tsx
│   │
│   ├── data/
│   │   ├── entities.ts              # Hero/boss stats, weapons, loot metadata
│   │   ├── chapters.test.ts
│   │   └── chapters/
│   │       ├── index.ts             # CHAPTERS barrel + getChapter() lookup
│   │       ├── types.ts             # Config types (Speaker, MapRect, Beat, ...)
│   │       ├── palette.ts           # Shared color palette
│   │       ├── chapter0.maria-brooke.ts
│   │       ├── chapter1.spotify-insurgency.ts
│   │       ├── chapter2.operation-inertia.ts
│   │       ├── chapter3.red-pee-bladder-strike.ts
│   │       ├── chapter3b.umbc-incident.ts
│   │       ├── chapter4.jungle-gym-gambit.ts
│   │       ├── chapter5.florida-highway-duel.ts
│   │       ├── chapter6.ding-dong-ditch-ben.ts
│   │       ├── chapter7.spain-betrayal.ts
│   │       ├── chapter8.the-cabin.ts
│   │       └── chapter9.pool-party.ts
│   │
│   ├── game/
│   │   ├── ChapterScene.ts          # Phaser scene orchestrator
│   │   ├── audio.ts                 # Music key registry / CHAPTER_MUSIC_KEY
│   │   ├── uiSound.ts               # UI sound helpers
│   │   ├── progress.ts              # localStorage save/unlock logic
│   │   ├── progress.test.ts
│   │   ├── furnitureCatalog.ts      # Prop -> atlas frame catalog
│   │   ├── SpritePreprocessor.ts    # Background color-keying & cropping
│   │   ├── SpritePreprocessor.test.ts
│   │   ├── PropExtractor.ts         # Prop texture extraction
│   │   ├── packSpriteAtlas.ts       # Boot-time atlas packing
│   │   ├── stewOffering.test.ts
│   │   ├── scene/
│   │   │   ├── MapBuilder.ts        # Floors, nature, props, collision walls
│   │   │   ├── Actors.ts            # Sprite spawning + animation + understudies
│   │   │   ├── AudioController.ts   # Music crossfades, boss loops, SFX
│   │   │   └── BeatEngine.ts        # Narrative beat dispatcher
│   │   └── modes/
│   │       ├── types.ts             # GameMode interface + ModeContext façade
│   │       ├── index.ts             # Mode registry: registerMode/getMode
│   │       ├── _template/           # Copyable reference mode
│   │       ├── bossFight/           # Combat minigame
│   │       ├── poolParty/           # Ch9 pool entrance
│   │       ├── basementScene/
│   │       ├── storyFractures/
│   │       ├── stewOffering/
│   │       ├── fratAggro/
│   │       ├── silentDrive/
│   │       ├── groupChat/           # parser.ts, reactions.ts, timeline.ts
│   │       └── mariaBrookeStats.ts
│   │
│   └── assets/                      # [binaries] audio (Kenney SFX, boss music), sprites
│
├── public/
│   ├── assets/                      # [binaries] static images/sprites served as-is
│   └── voice/                       # [binaries] generated voice-line audio
│
├── scripts/
│   └── voicegen/                    # TTS voice-line pipeline (Python + tsx)
│       ├── extract-lines.ts         # `npm run voice:extract`
│       ├── generate.py / gen_*.py   # Voice generation scripts
│       ├── lines.json / voices.json # Line manifests & voice configs
│       └── refs/                    # Reference voice samples
│
├── e2e_tests/
│   ├── game.spec.ts
│   ├── playtest_umbc.spec.ts
│   ├── test_stew.spec.ts
│   └── test_stew_click.spec.ts
│
├── docs/
│   ├── ADDING_A_MINIGAME.md         # Minigame implementation guide
│   ├── EXTERNAL_GAME_PIPELINE_PLAN.md
│   ├── NARRATION_PLAN.md
│   ├── TURN_BATTLE_GAMEMODE_PLAN.md
│   ├── chapter-pipeline/            # Multi-stage chapter authoring pipeline + working drafts
│   └── history/                     # Handoffs, sprint plans, changelogs, scratchpads
│
├── battleiq/                        # Standalone legacy JS battle prototype (game.js, battle.js, ...)
├── storyboard/                      # Canonical lore source: storyboard_0..8.txt + briefs
├── assets/                          # Source art workspace (.aistudio)
└── db_data/                         # [runtime] persisted leaderboard JSON (Docker volume)
```

---

## Running Locally

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev
```

The dev server (`tsx server.ts`) runs at **`http://localhost:3324`**.

> **Tip:** After editing, a full restart of `npm run dev` is more reliable than hot reload for picking up changes (Vite caches transforms). Verify served code with `curl localhost:3324/src/... | grep <symbol>`.

---

## Available Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the dev server (`tsx server.ts`) on port 3324 |
| `npm run build` | Build client assets with Vite **and** bundle the server to `dist/server.cjs` (esbuild) |
| `npm start` | Run the built production server (`node dist/server.cjs`) |
| `npm run lint` | Typecheck the project (`tsc --noEmit`) |
| `npm test` | Run the Vitest unit-test suite |
| `npm run e2e` | Run the Playwright E2E suite |
| `npm run clean` | Remove `dist/` and stray `server.js` |
| `npm run voice:extract` | Extract dialogue lines for the voice-gen pipeline |

---

## Testing

- **Unit tests** (Vitest) live alongside source as `*.test.ts(x)` — e.g. `DialogueBox.test.tsx`, `chapters.test.ts`, `progress.test.ts`, `SpritePreprocessor.test.ts`, `stewOffering.test.ts`. Run with `npm test`.
- **E2E tests** (Playwright) live in [`e2e_tests/`](e2e_tests/) and exercise full gameplay flows. Run with `npm run e2e`.
- **Typecheck** the whole project with `npm run lint` before committing.

---

## Docker Deployment (VPS)

### 1. Clone & Set Up Directory Permissions

Clone the repository to your VPS and make sure the leaderboard database volume has the correct write permissions:

```bash
git clone git@github.com:eric-s-ai-slop/rockville-syndicate.git ./rockville-syndicate
mkdir -p db_data && chmod 777 db_data
```

### 2. Build & Run with Docker Compose

By default the container listens on port `3324` and maps it to `localhost:3324`. Build the production image and start the container:

```bash
docker compose up -d --build
```

#### Running on a Custom Port

To use a custom host port (e.g. `8080`), set the `APP_PORT` environment variable:

```bash
APP_PORT=8080 docker compose up -d --build
```

Leaderboard submissions are persisted inside the `./db_data/` directory.

---

## Reverse Proxy Setup (Nginx or Caddy)

Place a reverse proxy in front of the container to handle traffic and SSL termination.

### Option A: Nginx

Create a config file (e.g., `/etc/nginx/sites-available/your-domain.com`):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3324;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the config and request an SSL certificate with Certbot:

```bash
ln -s /etc/nginx/sites-available/your-domain.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d your-domain.com
```

### Option B: Caddy (Recommended)

Caddy automatically provisions SSL certificates. Add the following to `/etc/caddy/Caddyfile`:

```caddy
your-domain.com {
    reverse_proxy localhost:3324
}
```

Then reload Caddy:

```bash
systemctl reload caddy
```

---

## Save Data & Persistence

- **Player progress** is stored client-side in `localStorage` under the key `omega-progress-v1` (managed by [`src/game/progress.ts`](src/game/progress.ts)). Clearing site data resets chapter unlocks.
- **Leaderboard scores** are persisted server-side as JSON in the `db_data/` directory (mounted as a Docker volume in production) and served by [`server.ts`](server.ts).

---

## Voice Generation Pipeline

Character voice lines are generated offline via the TTS pipeline in [`scripts/voicegen/`](scripts/voicegen/) (Python + a `tsx` line extractor). Run `npm run voice:extract` to pull dialogue lines into `lines.json`, then use the Python generators with reference samples in `refs/`. Output audio lands in `public/voice/`. See [`scripts/voicegen/README.md`](scripts/voicegen/README.md) for details.

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

## Further Reading

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — Full technical design guide, subsystem responsibilities, and development recipes.
- [`CLAUDE.md`](CLAUDE.md) — Developer quick reference and the canonical list of hard-won gotchas.
- [`docs/ADDING_A_MINIGAME.md`](docs/ADDING_A_MINIGAME.md) — Step-by-step guide to building and registering a new minigame mode.
- [`docs/chapter-pipeline/`](docs/chapter-pipeline/) — The multi-stage pipeline for authoring new chapters.
- [`storyboard/`](storyboard/) — Canonical lore: character sheets, boss strategies, and chapter briefs (`storyboard_0.txt` through `storyboard_8.txt`).

The events are real. The stats are canon.
```

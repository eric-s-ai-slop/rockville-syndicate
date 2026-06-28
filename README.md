# Project Omega: The Rockville Syndicate

A top-down pixel RPG that dramatizes the real-life adventures of a Maryland friend group — told through boss fights, dialogue trees, interactive minigames, and escalating interpersonal chaos.

Built with **React 19 + Phaser 3.88 + TypeScript + Vite + Tailwind v4**, served by a lightweight **Express** backend that hosts the production bundle.

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
- **Combat**: Boss fights are rhythm-timed exchanges — dodge projectiles (SPACE to dash), land hits during windows.
- **Difficulty**: Easy / Normal / Hard at the start. Hard mode scores 1.5× — it's the intended experience.
- **Power-ups**: Shards drop power-ups randomly — invincibility, heal, speed boost, defense buff, poison aura.
- **Minigames**: Chapters can hand control to sandboxed game modes (group chats, silent drives, stew offerings, frat aggro, etc.) that run inline or in the background.
- **Hall of Records**: Each chapter run is scored (`shards × 200 + hp × 10 + ledger × 5 × difficulty`). Beat the crew's ghost targets and set personal bests, all stored locally.

---

## Architecture at a Glance

React 19 manages the overlay UI (dialogue, choices, QTE prompts, difficulty settings, Hall of Records) while Phaser 3.88 owns the physical world (camera, physics, sprites, collisions). The main scene is a thin controller that delegates to specialized subsystems.

```
GameLayout.tsx  <-- event bridge / callbacks -->  ChapterScene.ts
                                                        |
   +----------------+----------------+------------+-----+----------+
   |                |                |            |               |
MapBuilder.ts   Actors.ts   AudioController  BeatEngine   PlayerController
(floors,props) (spawn/anim)  (music/SFX)   (narrative)  (dash/fire/steps)
                                                  |
                                            ModeContext façade
                                            (safe API for minigames)
```

- **`ChapterScene.ts`** — Phaser scene orchestrator. Preloads textures, sets up physics/collision groups, instantiates subsystems, and forwards per-frame ticks.
- **`scene/MapBuilder.ts`** — Interprets a chapter's `MapConfig` to draw floors, scattered nature, collision walls, and interactive props.
- **`scene/Actors.ts`** — Spawns actor sprites, resolves class stats, applies directional walk animations, and processes understudy substitutions.
- **`scene/AudioController.ts`** — Manages stage music crossfades, boss loops, and SFX stings. Volume is settings-driven (live subscription to the save store).
- **`scene/BeatEngine.ts`** — Dispatches story beats: `dialogue`, `choice`, `walkTo`, `cameraPan`, and `minigame`.
- **`scene/PlayerController.ts`** — Owns player movement, dash i-frames, auto-fire, and footsteps. Extracted from ChapterScene to keep the scene thin.
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
- **Backend**: Express 4 (`server.ts`) — static bundle host + Vite dev middleware only
- **Animation/UI libs**: `motion`, `lucide-react`
- **Assets**: LimeZu Interiors tileset, Kenney impact SFX pack, original artwork, generated voice lines
- **Build/tooling**: Vite (client) + esbuild (server bundle), `tsx` for dev/server execution
- **Tests**: Vitest (unit, 140+ tests) + Playwright (E2E)
- **Save system**: `localStorage` key `omega-save-v2` — unified blob: settings + progress + Hall of Records

---

## Project Structure

Heavy binary asset directories (audio `.ogg/.mp3`, sprite sheets, `node_modules`, build output) are collapsed below for readability.

```
project-omega_-the-rockville-syndicate/
├── index.html                       # Vite entry HTML
├── server.ts                        # Express: static bundle host + Vite dev middleware
├── package.json                     # Scripts & dependencies
├── tsconfig.json
├── vite.config.ts                   # Vite client build config
├── vitest.config.ts                 # Vitest unit-test config
├── vitest.setup.ts                  # Test environment setup
├── playwright.config.ts             # Playwright E2E config
├── eslint.config.js                 # ESLint 9 config (typescript-eslint, react-hooks)
├── Dockerfile                       # Production container image
├── docker-compose.yml               # Container definition
├── metadata.json
│
├── README.md                        # You are here
├── ARCHITECTURE.md                  # Deep technical design guide
├── CLAUDE.md                        # Developer reference + hard-won gotchas
├── CONTRIBUTING.md                  # Conventions, green bar, parallel-work rules
│
├── src/
│   ├── main.tsx                     # React root (StrictMode)
│   ├── App.tsx                      # Top-level app component
│   ├── index.css                    # Global styles (Tailwind v4)
│   │
│   ├── components/
│   │   ├── GameLayout.tsx           # React<->Phaser bridge, overlay host, Hall of Records
│   │   ├── ChapterSelect.tsx        # Chapter-select map UI
│   │   ├── DialogueBox.tsx          # Dialogue/choice overlay
│   │   └── DialogueBox.test.tsx
│   │
│   ├── data/
│   │   ├── entities.ts              # Hero/boss stats, weapons, power-ups, loot metadata
│   │   ├── chapters.test.ts
│   │   └── chapters/
│   │       ├── index.ts             # CHAPTERS barrel + getChapter() lookup
│   │       ├── types.ts             # Config types (Speaker, MapRect, Beat, ...)
│   │       ├── palette.ts           # Shared color palette
│   │       └── chapter0–9.*.ts      # Per-chapter configs
│   │
│   ├── game/
│   │   ├── ChapterScene.ts          # Phaser scene orchestrator (~2,700 lines)
│   │   ├── settings.ts              # Unified save store (save-schema-v2): settings + progress + HoR
│   │   ├── settings.test.ts
│   │   ├── scoring.ts               # Run score formula, ghost targets, Hall of Records types
│   │   ├── progress.ts              # Chapter unlock helpers (delegates to settings.ts)
│   │   ├── audio.ts                 # Music key registry / CHAPTER_MUSIC_KEY
│   │   ├── uiSound.ts               # UI sound helpers
│   │   ├── uiSound.test.ts
│   │   ├── furnitureCatalog.ts      # Prop → atlas frame catalog
│   │   ├── SpritePreprocessor.ts    # Background color-keying & cropping
│   │   ├── SpritePreprocessor.test.ts
│   │   ├── PropExtractor.ts         # Prop texture extraction
│   │   ├── packSpriteAtlas.ts       # Boot-time atlas packing
│   │   ├── scene/
│   │   │   ├── MapBuilder.ts        # Floors, nature, props, collision walls
│   │   │   ├── Actors.ts            # Sprite spawning + animation + understudies
│   │   │   ├── AudioController.ts   # Music crossfades, boss loops, SFX (settings-driven)
│   │   │   ├── BeatEngine.ts        # Narrative beat dispatcher
│   │   │   ├── BeatEngine.test.ts
│   │   │   └── PlayerController.ts  # Dash, i-frames, auto-fire, footsteps
│   │   └── modes/
│   │       ├── types.ts             # GameMode interface + ModeContext façade
│   │       ├── index.ts             # Mode registry: registerMode/getMode
│   │       ├── _template/           # Copyable reference mode
│   │       ├── bossFight/           # Combat minigame + bossFight.test.ts
│   │       ├── poolParty/           # Ch9 pool entrance
│   │       ├── basementScene/
│   │       ├── storyFractures/
│   │       ├── stewOffering/
│   │       ├── fratAggro/
│   │       ├── silentDrive/
│   │       ├── groupChat/           # parser.ts, reactions.ts, timeline.ts
│   │       ├── carRide/
│   │       └── mariaBrookeStats.ts
│   │
│   └── assets/                      # [binaries] audio (Kenney SFX, boss music), sprites
│
├── public/
│   ├── assets/                      # [binaries] static images/sprites served as-is
│   └── voice/                       # [binaries] generated voice-line audio
│
├── scripts/
│   ├── dev/                         # Throwaway inspection/debug scripts (not production)
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
│   ├── ARCHITECTURE_AND_MAINTAINABILITY.md  # Track G spec: G1–G4 work items + conventions
│   ├── TEAM_COORDINATION_PLAN.md    # Lane ownership, phases, dependency graph
│   ├── TRACK_B_CONTENT_VISUAL.md
│   ├── TRACK_C_SYSTEMS_UI.md
│   ├── TRACK_D_AUDIO.md
│   ├── TRACK_E_TECHDEBT_PERF.md
│   ├── TRACK_F_SIGNATURE_FEATURE.md
│   ├── chapter-pipeline/            # Multi-stage chapter authoring pipeline + working drafts
│   └── history/                     # ARCHIVED: handoffs, sprint plans, QA reports
│
├── battleiq/                        # Legacy standalone JS prototype (payload for `external` mode)
├── storyboard/                      # Canonical lore source: storyboard_0..8.txt + briefs
└── assets/                          # Source art workspace (.aistudio)
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
| `npm run lint:es` | Run ESLint (style/quality gate) |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run ci` | Full gate: typecheck + eslint + tests + build |
| `npm test` | Run the Vitest unit-test suite |
| `npm run e2e` | Run the Playwright E2E suite |
| `npm run clean` | Remove `dist/` and stray `server.js` |
| `npm run voice:extract` | Extract dialogue lines for the voice-gen pipeline |

---

## Testing

- **Unit tests** (Vitest, 140+) live alongside source as `*.test.ts(x)` — covering settings/save, scoring, boss fight logic, beat engine routing, UI sound, sprite preprocessing, and more. Run with `npm test`.
- **E2E tests** (Playwright) live in [`e2e_tests/`](e2e_tests/) and exercise full gameplay flows. Run with `npm run e2e`.
- **CI** (GitHub Actions) runs `lint → lint:es → test → build` on every push and PR to `main`.
- Run the full gate locally with `npm run ci` before pushing.

---

## Docker Deployment (VPS)

### 1. Clone & Build

```bash
git clone git@github.com:eric-s-ai-slop/rockville-syndicate.git ./rockville-syndicate
cd rockville-syndicate
docker compose up -d --build
```

By default the container listens on port `3324`. To use a custom host port:

```bash
APP_PORT=8080 docker compose up -d --build
```

---

## Reverse Proxy Setup (Nginx or Caddy)

Place a reverse proxy in front of the container to handle traffic and SSL termination.

### Option A: Nginx

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

```caddy
your-domain.com {
    reverse_proxy localhost:3324
}
```

```bash
systemctl reload caddy
```

---

## Save Data & Persistence

All game state lives in a single versioned `localStorage` blob under the key **`omega-save-v2`**, managed by [`src/game/settings.ts`](src/game/settings.ts). The blob contains three sections:

| Section | Contents |
|---------|----------|
| `settings` | Volume, difficulty, text scale, colorblind, reduce-motion |
| `progress` | Completed chapters, selected hero, story flags (`rose_silence`, `freePlay`) |
| `progress.runRecords` | Up to 100 most-recent scored runs (newest first) |
| `progress.chapterBests` | Per-chapter personal best score |

On first load with no `omega-save-v2` key, the module migrates the four legacy v1 keys (`omega-progress-v1`, `omega-muted`, `omega-colorblind`, `omega-textscale`) and writes the unified blob. Corrupt JSON falls back to defaults without throwing. **Never write a new ad-hoc `localStorage` key** — all persistence goes through `settings.ts`.

Clearing site data resets everything.

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
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — Green bar requirements, hard rules, architecture conventions.
- [`docs/ADDING_A_MINIGAME.md`](docs/ADDING_A_MINIGAME.md) — Step-by-step guide to building and registering a new minigame mode.
- [`docs/chapter-pipeline/`](docs/chapter-pipeline/) — The multi-stage pipeline for authoring new chapters.
- [`storyboard/`](storyboard/) — Canonical lore: character sheets, boss strategies, and chapter briefs (`storyboard_0.txt` through `storyboard_8.txt`).

The events are real. The stats are canon.

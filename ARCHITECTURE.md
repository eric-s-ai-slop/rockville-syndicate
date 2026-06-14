# Project Omega: Architecture Guide

A comprehensive technical reference for understanding, maintaining, and extending Project Omega: The Rockville Syndicate.

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Directory Structure](#directory-structure)
4. [Game Flow](#game-flow)
5. [Core Systems](#core-systems)
6. [Asset Pipeline](#asset-pipeline)
7. [Chapter & Map System](#chapter--map-system)
8. [Adding Content](#adding-content)
9. [Performance & Debugging](#performance--debugging)
10. [Common Gotchas](#common-gotchas)

---

## Overview

Project Omega is a top-down pixel RPG that dramatizes real-life events as **scripted, linear story chapters**. Each chapter is a self-contained map + dialogue beats + one scripted boss fight.

**Key principles:**
- Story-first: events happen in a pre-authored sequence (no random encounters)
- Map-based exploration: player walks WASD through small, handcrafted spaces
- Dialogue trees: narrative driven by branching conversation options
- Combat as narrative beats: boss fights are scripted encounters with QTE mechanics
- Persist progress: `localStorage` tracks completed chapters and player stats

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **UI Framework** | React 19 + TypeScript | Menu, dialogue, HUD, chapter select |
| **Game Engine** | Phaser 3.90 (WebGL) | Scene management, sprite rendering, physics, camera |
| **Build Tool** | Vite | Module bundling, hot-reload dev server, production optimization |
| **Styling** | Tailwind CSS v4 | Header, UI panels, responsive layout |
| **Font Rendering** | Yoster Island (pixel font) | Retro aesthetic via CSS `@font-face` |
| **Audio** | Web Audio API (via Phaser) | Background music, UI/combat SFX |
| **State Management** | React hooks + `localStorage` | Dialogue state, character selection, progress |
| **Hosting** | Node.js Express + Docker | Production VPS deployment |

---

## Directory Structure

```
project-omega/
├── src/
│   ├── main.tsx                    # Vite entry point
│   ├── App.tsx                     # Root React component
│   ├── index.css                   # Global styles + keyframe animations
│   ├── data.ts                     # Character, NPC, weapon, boss definitions
│   │
│   ├── components/
│   │   ├── GameLayout.tsx          # Main UI wrapper (hero select, chapter select, game)
│   │   ├── ChapterSelect.tsx       # Chapter/difficulty picker
│   │   └── DialogueBox.tsx         # Dialogue UI with choice buttons
│   │
│   ├── data/
│   │   └── chapters.ts             # All 8 chapter definitions (maps, beats, dialogue)
│   │
│   ├── game/
│   │   ├── ChapterScene.ts         # Phaser scene (main gameplay loop)
│   │   ├── SpritePreprocessor.ts   # Texture extraction & alpha-keying
│   │   ├── packSpriteAtlas.ts      # Pack JPG sprites into single atlas
│   │   ├── furnitureCatalog.ts     # Furniture sprite sheet metadata
│   │   ├── progress.ts             # localStorage save/load logic
│   │   ├── audio.ts                # Music/SFX file imports
│   │   └── uiSound.ts              # UI click/toggle sounds
│   │
│   └── assets/
│       ├── fonts/
│       │   └── yoster.ttf          # Pixel font for retro look
│       ├── images/
│       │   ├── sprites/            # Character sprite sheets
│       │   ├── game_decor/         # Furniture, props, backgrounds
│       │   └── shield.jpg          # Hero select screen background
│       └── audio/
│           ├── chapters/           # Per-chapter background music (*.mp3)
│           └── sfx/                # UI and combat sound effects (*.mp3)
│
├── server.cjs                      # Express server for production (routes, leaderboard)
├── vite.config.ts                  # Build configuration
├── tailwind.config.ts              # UI styling config
├── tsconfig.json                   # TypeScript configuration
├── package.json                    # Dependencies
├── Dockerfile                      # Container image definition
├── docker-compose.yml              # Local dev + prod docker setup
├── README.md                       # Player-facing game documentation
└── ARCHITECTURE.md                 # This file
```

---

## Game Flow

### High-Level State Machine

```
App.tsx (React root)
  └─ GameLayout.tsx (main state container)
      ├─ Hero Selection (gameStatus='hero')
      │   └─ Player picks Eric/Nick F/Nick H/Jacob
      │
      ├─ Chapter Select (gameStatus='chapters')
      │   └─ Player picks which unlocked chapter to play
      │
      ├─ Playing (gameStatus='playing')
      │   ├─ Title Card shown
      │   ├─ ChapterScene (Phaser) boots up
      │   │   ├─ Phase A: preload assets
      │   │   ├─ Phase B: render map, place NPCs
      │   │   ├─ Phase C: game loop
      │   │   │   ├─ Handle player input (WASD/arrows)
      │   │   │   ├─ Trigger dialogues when player reaches NPCs
      │   │   │   ├─ Execute story "beats" (scripted events)
      │   │   │   └─ Run boss fight (dialogue + QTE + damage)
      │   │   └─ Phase D: teardown
      │   │
      │   ├─ DialogueBox (React) renders on top of game canvas
      │   └─ QTE UI appears during boss fights
      │
      ├─ Chapter Complete (gameStatus='chapterComplete')
      │   └─ Show victory screen, unlock next chapter
      │
      └─ Game Over (gameStatus='gameover')
          └─ Show defeat screen, retry option
```

### Player Data Flow

```
localStorage
  └─ omega-progress-v1
      ├─ completedChapters: string[]    (ch IDs player finished)
      ├─ currentChapter: string | null  (auto-save chapter ID)
      └─ hero: string                   (selected protagonist ID)

GameLayout.tsx (state management)
  ├─ [selectedHero] ─→ determines starting HP, stats
  ├─ [activeChapter] ─→ which chapter's map/dialogue to load
  ├─ [playerHp] ─→ shown in HUD, updated during combat
  ├─ [ledger] ─→ money/score, displayed in header
  ├─ [activeStory] ─→ current dialogue branch + choice callback
  └─ [muted] ─→ audio mute state
```

---

## Core Systems

### 1. Phaser Scene Lifecycle (ChapterScene.ts)

The Phaser scene is where all gameplay happens. It runs in **three phases**:

#### **Phase A: `create()`**
- Preload all textures (sprites, props, UI elements)
- Extract and crop sprites (remove backgrounds)
- Build sprite atlases (pack multiple JPGs into one texture)
- Process furniture sheet into named frames
- Cache aspect ratios for proportional scaling
- Initialize camera, physics, input handlers

#### **Phase B: Initial Render**
- Draw the map (call `drawMap()`)
  - Render floors, walls, decorative rects
  - Place NPC sprites at their starting positions
- Place player sprite at spawn point
- Fade camera in from black over 600ms

#### **Phase C: Game Loop (every frame)**
- Update player position (WASD input → X velocity)
- Handle camera follow
- Check for NPC overlaps (show "press E to talk" UI)
- Trigger dialogue when player chooses to talk
- Execute story "beats" (environmental events, cutscenes)
- Run boss fight logic (if active)
- Update dialogue box text via React state

#### **Phase D: `shutdown()`**
- Pause/destroy Phaser game
- Clean up event listeners
- Save progress to localStorage

---

### 2. Map Rendering (ChapterScene.ts `drawMap()`)

Maps are defined as **arrays of rectangles** (MapRect[]) with semantic types. The rendering pipeline is:

```
MapRect { x, y, w, h, fill, propType, propKey, solid }
  │
  ├─ If propType ∈ [hottub, arcade, junglebox]
  │   └─ drawPackSprite() → render from pack_atlas
  │
  ├─ Else if propKey is loaded as texture
  │   └─ add.image(propKey) → render full sprite
  │
  ├─ Else if propKey starts with 'furn_' (furniture)
  │   └─ add.image('furniture_atlas', 'furn_name') → render from atlas
  │
  └─ Else (fallback)
      └─ drawProcedural() → graphics.fillRect() with colors
         (couch, tv, desk, etc. rendered as colored boxes)
```

**Key insight:** propType is the source of truth; propKey is the sprite override. If both exist, propKey wins.

---

### 3. Asset Pipeline (SpritePreprocessor.ts + packSpriteAtlas.ts)

Sprites go through a **multi-stage extraction and packing process**:

#### **Stage 1: Texture Loading (ChapterScene.create)**
```javascript
// Phaser loads raw image file
this.textures.addImage('prop_jungle_gym', jungleGymJpgUrl);
```

#### **Stage 2: Background Extraction (extractCropSubject)**
Most showcase JPGs have a **gray background that needs to be transparent**:

```
Input: 1024×1024 JPG, gray bg (192, 196, 199)
  ↓
BFS from image center to find non-background pixels
  ↓
Make non-subject pixels transparent (alpha = 0)
  ↓
Crop to bounding box of subject
  ↓
Create new Phaser texture '{key}_crop' via addCanvas
  ↓
Output: Texture optimized for rendering
```

**Important:** This doesn't mutate the original Phaser texture's GL state. We create a separate `_crop` variant to avoid WebGL crashes.

#### **Stage 3: Atlas Packing (buildPackAtlas)**
Small sprites from owner asset packs (tollbooth, guardrails, hot tub, arcade) are **packed into a single 1024×1024 atlas** for performance:

```javascript
// packSpriteAtlas.ts defines crop regions:
const PACK_ENTRIES = [
  {
    sheetKey: 'pack_pool',      // texture key to source from
    name: 'hottub',             // frame name in atlas
    sx: 1055, sy: 395,          // source rectangle top-left
    sw: 322, sh: 346,           // source rectangle size
    bgR: 195, bgG: 195, bgB: 195 // background color to key transparent
  },
  // ... more entries
];

// buildPackAtlas() then:
// 1. Extract each sprite's rect and key bg → transparent
// 2. Tile them into rows on a 1024px wide canvas
// 3. Register as Phaser atlas with frame metadata
// 4. drawPackSprite() later renders by frame name
```

---

### 4. Dialogue System (GameLayout.tsx)

Dialogue is a **React-Phaser bridge**: story beats request dialogue via a callback, React renders it, and choice selection flows back.

```typescript
// In ChapterScene:
const storyRef = useRef<(payload: StoryDialoguePayload) => void>();

// In a story beat:
storyRef.current({
  speaker: 'eric',
  lines: ['This is line 1', 'This is line 2'],
  choices: [
    { text: 'Choice A', index: 0 },
    { text: 'Choice B', index: 1 }
  ]
});

// In React GameLayout:
const handleDialogueChoice = (choiceIndex) => {
  // Phaser callback fires: beat.onChoice(choiceIndex)
  // Scene continues from next beat
};
```

**Dialogue Box UI (DialogueBox.tsx):**
- Speaker name + emoji + color
- Text lines with fade-in animation
- Numbered choice buttons (1–9)
- ▼ indicator showing more choices exist

---

### 5. Audio System (audio.ts + uiSound.ts)

#### **Background Music**
Each chapter has a theme music track (MP3) that **auto-plays on chapter load** and **loops indefinitely**:

```typescript
// In ChapterScene.create():
const chapterMusic = CHAPTER_AUDIO[activeChapter.id];
if (chapterMusic) {
  this.sound.play(chapterMusic, { loop: true, volume: 0.7 });
}
```

**Structure:**
```
src/assets/audio/chapters/
├── spotify_insurgency.mp3
├── operation_inertia.mp3
├── red_pee_bladder.mp3
├── jungle_gym_gambit.mp3
├── florida_highway_duel.mp3
├── ding_dong_ditch_ben.mp3
├── spain_betrayal.mp3
└── cabin_epilogue.mp3
```

#### **UI & Combat Sounds**
Short SFX for player feedback:

```typescript
// uiSound.ts exports a single playUi() function
playUi('pick');   // hero selection
playUi('toggle'); // button click
playUi('back');   // return to menu
// Triggered throughout GameLayout and ChapterScene
```

#### **Muting**
- Player can toggle mute via 🔊 button in header
- State persists in localStorage ('omega-muted')
- On chapter load, if muted, a toast reminder appears (5 sec)

---

### 6. Save System (progress.ts)

State is saved to **localStorage** key `omega-progress-v1`:

```typescript
interface Progress {
  hero?: string;                    // selected hero ID
  completedChapters: string[];      // which chapters player finished
  currentChapter?: string;          // auto-save: where player is now
  freePlay?: boolean;               // unlock all chapters immediately
}
```

**Persistence points:**
- Hero selection → `rememberHero(id)`
- Chapter completion → `markChapterComplete(id)`
- Text scale / color-blind → individual localStorage keys

---

## Asset Pipeline

### Adding a Sprite

Sprites come in **three flavors**:

#### **1. Character Sprites (Animated Sheets)**
- Format: PNG spritesheet (multiple frames in a grid)
- Location: `src/assets/images/sprites/`
- Usage: Player character, NPCs, enemies
- How it works:
  ```typescript
  // In ChapterScene.create():
  this.textures.addImage('protagonist_eric', ericSpriteUrl);
  // In create(), extract & cache aspect ratio
  const aspect = this.extractCropSubject('protagonist_eric');
  ```
- Rendering:
  ```typescript
  this.add.sprite(x, y, 'protagonist_eric')
    .setDisplaySize(width, height)
    .play('protagonist_eric-walk'); // animation name
  ```

#### **2. Showcase Sprites (Large Props)**
- Format: JPG (1024×1024 or 1408×768) with solid gray background
- Location: `src/assets/images/game_decor/stages/{chapter}/`
- Examples: jungle_gym, hospital_bed, hot tub, arcade cabinet, red toilet
- How it works:
  1. Phaser loads the JPG as texture
  2. `extractCropSubject()` removes gray bg + crops to subject
  3. Creates `{key}_crop` texture
  4. Map rect renders with `propKey: 'prop_jungle_gym'`
- Rendering:
  ```typescript
  // In drawPropShape():
  const renderKey = this.textures.exists('prop_jungle_gym_crop') 
    ? 'prop_jungle_gym_crop' 
    : 'prop_jungle_gym';
  this.add.image(x, y, renderKey)
    .setDisplaySize(dw, dh); // contain-fit
  ```

#### **3. Packed Sprites (Small Props)**
- Format: JPG sheets (1408×768, e.g., pack_pool.jpg)
- Location: `src/assets/images/game_decor/`
- Examples: hot tub, arcade cabinet, guardrails, toll booth
- How it works:
  1. `packSpriteAtlas.ts` defines crop regions (sx, sy, sw, sh)
  2. `buildPackAtlas()` extracts each region, removes gray bg, tiles into one atlas
  3. Registers as Phaser atlas with frame metadata
  4. Map rect uses `propType: 'hottub'` → `drawPackSprite()` renders
- Rendering:
  ```typescript
  // In drawPackSprite():
  const frame = packFrame('hottub'); // 'hottub' or null
  if (frame) {
    this.add.image(x, y, 'pack_atlas', frame)
      .setDisplaySize(dw, dh);
  }
  ```

### Adding a Sprite to a Chapter

**Example: Add a new prop to Chapter 5 (Florida)**

1. **Prepare the image**
   - If it's a standalone prop (900×600px): save as `src/assets/images/game_decor/stages/florida/my_prop.jpg` with gray bg
   - If it's in an existing pack sheet: add crop coords to `packSpriteAtlas.ts`

2. **Import & preload in ChapterScene.ts**
   ```typescript
   import myPropUrl from '../assets/images/game_decor/stages/florida/my_prop.jpg?url';
   
   // In create():
   this.safeLoadImage('prop_my_prop', myPropUrl);
   this.extractCropSubject('prop_my_prop'); // remove bg
   ```

3. **Add a MapRect to the chapter in chapters.ts**
   ```typescript
   const chapter5: ChapterConfig = {
     id: 'florida_highway_duel',
     map: {
       rects: [
         // ... existing rects
         {
           x: 600, y: 300,
           w: 120, h: 80,
           fill: 0x333333,
           propType: 'tree', // semantic fallback
           propKey: 'prop_my_prop' // use our new sprite
         }
       ]
     }
   };
   ```

4. **Test**
   - Dev server hot-reloads
   - Navigate to Florida chapter
   - Prop renders at (600, 300)

---

## Chapter & Map System

### Chapter Structure (chapters.ts)

Each chapter has:

```typescript
interface ChapterConfig {
  id: string;                          // 'spotify_insurgency', etc.
  kind: 'chapter' | 'interlude' | 'epilogue';
  number: number;
  title: string;                       // shown in title card
  subtitle: string;
  location: string;
  protagonist?: string;                // who player is (defaults to hero select)
  map: MapConfig & { [key: string]: unknown };
  beats: StoryBeat[];                  // ordered dialogue/events
  boss?: BossConfig;
}

interface MapConfig {
  width: number;                       // world dimensions
  height: number;
  backdrop: number;                    // floor color
  theme?: MapTheme;                    // 'apartment', 'florida', etc.
  rects: MapRect[];                    // walls, props, furniture
  labels: RoomLabel[];                 // area signs
  playerSpawn: { x: number; y: number };
}

interface StoryBeat {
  trigger: 'auto' | 'npc:{id}' | 'event:{name}';
  dialogue: DialoguePayload;
  onChoice?: (index: number) => void;
}
```

### Creating a New Chapter

**Step 1: Define the map** (chapters.ts)
```typescript
const chapter9: ChapterConfig = {
  id: 'my_new_chapter',
  kind: 'chapter',
  number: 9,
  title: 'The Next Adventure',
  subtitle: 'Act VI',
  location: 'Some Place',
  map: {
    width: 960,
    height: 540,
    backdrop: 0x1a2e1a,
    theme: 'apartment',
    playerSpawn: { x: 480, y: 270 },
    rects: [
      // Floor
      { x: 480, y: 270, w: 960, h: 540, fill: 0x8b7355 },
      // Walls
      { x: 100, y: 150, w: 20, h: 180, fill: 0x654321, solid: true },
      // Props
      { x: 500, y: 400, w: 100, h: 80, fill: 0x8b4513, propType: 'couch', solid: true }
    ],
    labels: [
      { x: 150, y: 100, name: 'Living Room', detail: 'Where it all begins', color: '#8aaa60' }
    ]
  },
  beats: [
    {
      trigger: 'auto',
      dialogue: {
        speaker: 'eric',
        lines: ['Welcome to the new chapter!']
      }
    },
    {
      trigger: 'npc:alex',
      dialogue: {
        speaker: 'alex',
        lines: ['Hi Eric, nice to meet you.'],
        choices: [
          { text: 'Hello!', index: 0 },
          { text: 'Who are you?', index: 1 }
        ]
      },
      onChoice: (i) => {
        if (i === 0) console.log('Friendly greeting');
        else console.log('Inquisitive');
      }
    }
  ],
  boss: {
    id: 'boss_alex',
    name: 'Alex',
    maxHp: 100,
    // ... combat config
  }
};

// Export in the chapters array at the bottom
export const ALL_CHAPTERS = [
  // ... existing
  chapter9
];
```

**Step 2: Add music**
```
1. Record/obtain chapter music (MP3)
2. Save to src/assets/audio/chapters/my_new_chapter.mp3
3. Import in audio.ts:
   import chap9Music from '../assets/audio/chapters/my_new_chapter.mp3?url';
4. Add to CHAPTER_AUDIO:
   export const CHAPTER_AUDIO: Record<string, string> = {
     // ...
     'my_new_chapter': chap9Music
   };
```

**Step 3: Add sprites**
- Prepare PNG/JPG props
- Save to `src/assets/images/game_decor/stages/my_new_chapter/`
- Import in ChapterScene.create()
- Reference in MapRect propKey

**Step 4: Test**
- Dev server running
- Press hero select → chapter select → pick your new chapter
- Walk around, talk to NPCs, fight boss

---

## Adding Content

### Adding Dialogue

Dialogue is delivered as **StoryBeat** objects. A beat triggers automatically or when player interacts with an NPC:

```typescript
// Auto-trigger when chapter loads
{
  trigger: 'auto',
  dialogue: {
    speaker: 'eric',
    lines: [
      'I walked into the room.',
      'Something felt off.'
    ]
  }
}

// Trigger when player talks to NPC (press E near them)
{
  trigger: 'npc:alex',
  dialogue: {
    speaker: 'alex',
    lines: [
      'Hey, how are you?',
      'I have a question for you.'
    ],
    choices: [
      { text: 'I\'m good', index: 0 },
      { text: 'Not well', index: 1 },
      { text: 'Ask away', index: 2 }
    ]
  },
  onChoice: (choiceIndex) => {
    if (choiceIndex === 0) {
      console.log('Player said they\'re good');
    } else if (choiceIndex === 1) {
      console.log('Player said they\'re not well');
    } else {
      console.log('Player asked them to ask');
    }
  }
}
```

### Adding an NPC

NPCs are characters that stand in the world and trigger dialogue:

1. **Define in data.ts** (if new character):
   ```typescript
   export const NPC_CHARACTERS: NpcCharacter[] = [
     {
       id: 'alex',
       name: 'Alex',
       emoji: '👤',
       color: '#60a5fa'
     }
   ];
   ```

2. **Spawn in the map** (chapters.ts MapRect):
   ```typescript
   {
     x: 400, y: 300,
     w: 40, h: 60,
     fill: 0x333333,
     propKey: 'npc_alex' // sprite name
   }
   ```

3. **Add sprite** (PNG spritesheet):
   - Save: `src/assets/images/sprites/npc_alex.png`
   - Import in ChapterScene.create():
     ```typescript
     import npcAlexUrl from '../assets/images/sprites/npc_alex.png?url';
     this.safeLoadImage('npc_alex', npcAlexUrl);
     ```

4. **Trigger dialogue** (story beat):
   ```typescript
   {
     trigger: 'npc:alex',
     dialogue: { /* ... */ }
   }
   ```

### Adding a Boss Fight

Boss fights are **scripted QTE encounters**:

```typescript
// In ChapterConfig.boss:
{
  id: 'boss_alex',
  name: 'Alex',
  title: 'The Rival',
  maxHp: 100,
  combatBarks: [
    'You\'re mine!',
    'This ends here!'
  ],
  actions: ['slash', 'fireball', 'heal'],
  phaseBarks: {
    0: 'Round 1, let\'s go!',
    1: 'You\'re tougher than I thought!',
    2: 'Final round!'
  },
  weaknessQTE: {
    question: 'What\'s my weakness?',
    options: ['Fire', 'Water', 'Air'],
    correctAnswer: 'Water',
    damage: 30
  }
}

// Trigger in a story beat:
{
  trigger: 'auto',
  dialogue: {
    speaker: 'alex',
    lines: ['Time to fight!'],
    isBossFight: true,
    boss: 'boss_alex'
  }
}
```

The **QTE flow** is built into ChapterScene:
1. Boss enters arena (dialogue)
2. Player sees attacks coming (red projectiles)
3. Player presses keys to dodge/attack
4. Weakness QTE appears as multiple-choice popup
5. Correct answer = big damage; wrong = small damage
6. Boss defeated → victory dialogue → next beat

---

## Performance & Debugging

### Optimization Tips

1. **Sprite Atlases**
   - Small props are packed into single 1024×1024 atlas (hot tub, arcade, etc.)
   - One draw call for all packed sprites instead of many individual textures

2. **Texture Caching**
   - Extract sprites once in `create()`, reuse throughout scene
   - Aspect ratios cached in `propAspects: Record<string, number>`

3. **Camera Bounds**
   - Set to map dimensions in ChapterScene
   - Prevents rendering off-screen areas

4. **Audio Pooling**
   - UI sounds reuse same `sound.play()` calls (Phaser pools internally)

### Debugging Checklist

| Issue | Debug Steps |
|-------|------------|
| Sprite not showing | Check `textures.exists(key)`, verify import path, check `propKey` spelling |
| Dialogue doesn't trigger | Verify `trigger: 'npc:xyz'` matches NPC ID, check beat order |
| Audio doesn't play | Check `CHAPTER_AUDIO[chapterId]` exists, verify mute button state |
| Physics not working | Ensure `solid: true` on MapRect, check collision group setup |
| Black screen | Check WebGL texture state (rare), verify camera isn't outside bounds |
| Text is too small | Adjust `text-scale` CSS variable or increase DialogueBox font size |

### Useful Console Commands

```javascript
// Check current scene state
const scene = game.scene.scenes[0];
console.log(scene.map.rects); // All map rects
console.log(scene.textures.list()); // Loaded textures
console.log(scene.children.list); // All game objects

// Check progress
JSON.parse(localStorage.getItem('omega-progress-v1'));

// Force unlock all chapters
localStorage.setItem('omega-progress-v1', JSON.stringify({
  completedChapters: ['*'],
  freePlay: true
}));
```

---

## Common Gotchas

### 1. **WebGL Texture Crashes**
**Problem:** Screen goes black during gameplay (especially chapters with car sprites).

**Root cause:** Modifying `texture.source[0].glTexture` directly can null Phaser's GL wrapper.

**Solution:** Create separate `{key}_crop` texture via `addCanvas()` instead of mutating the original:
```typescript
// ❌ Don't do this:
texture.source[0].glTexture = null; // Crashes MultiPipeline

// ✅ Do this:
if (this.textures.exists(cropKey)) this.textures.remove(cropKey);
this.textures.addCanvas(cropKey, crop); // New texture, no GL mutation
```

### 2. **Asset Import Paths**
All image/audio imports must use **`?url` suffix** in Vite:
```typescript
// ❌ Wrong
import myImage from '../assets/image.jpg';

// ✅ Correct
import myImage from '../assets/image.jpg?url';
```

This tells Vite to generate a URL string instead of bundling the asset.

### 3. **Sprite Background Keying**
Showcase JPGs (jungle gym, hot tub, etc.) have a **solid gray background** that must be removed:

```typescript
// The background color is sampled from top-left pixel:
const bgR = d[0], bgG = d[1], bgB = d[2];

// Pixels within 30 units (Euclidean) are considered background:
const tolerance = 30;
const distance = Math.sqrt((r-bgR)² + (g-bgG)² + (b-bgB)²);
if (distance <= tolerance) alpha = 0; // Make transparent
```

If your prop has a mottled or gradient bg, the tolerance may need tuning (see `PACK_ENTRIES` in packSpriteAtlas.ts).

### 4. **Physics Body Persistence**
Map rects with `solid: true` create physics bodies. These bodies **don't scale with sprite display size**:

```typescript
// Map rect defines physical collision:
{ x: 400, y: 300, w: 100, h: 80, solid: true }

// But sprite rendering may be scaled:
this.add.image(x, y, textureKey)
  .setDisplaySize(150, 120); // Sprite is 150×120...

// ...but collider is still 100×80!
// Solution: match displaySize to physical body or use setScale
```

### 5. **localStorage Key Collisions**
localStorage is global per origin. If running multiple builds/versions, **keys must be unique**:

```typescript
// Naming convention prevents collisions:
'omega-progress-v1' // Main progress
'omega-muted'       // Mute state
'omega-colorblind'  // Colorblind mode
'omega-textscale'   // UI text scale

// If you fork, change the version number to avoid conflicts
'my-game-progress-v1'
```

### 6. **Chapter Music Auto-Play**
Modern browsers **require user interaction** before audio plays:

```typescript
// In ChapterScene.create(), music starts automatically (safe because user clicked to start chapter)
if (chapterMusic) this.sound.play(chapterMusic, { loop: true });

// But be aware: some browsers may mute until user clicks
// The mute button (🔊) in GameLayout handles this
```

### 7. **Dialogue Choices and Callbacks**
Choice index must match the index in the choices array:

```typescript
dialogue: {
  choices: [
    { text: 'Yes', index: 0 },    // ✅ Index 0
    { text: 'No', index: 1 },     // ✅ Index 1
    { text: 'Maybe', index: 2 }   // ✅ Index 2
  ]
},
onChoice: (choiceIndex) => {
  // choiceIndex is 0, 1, or 2 — matches the choices array
}
```

---

## Summary Checklist: Adding a New Chapter

- [ ] Create MapConfig with rects, theme, spawn point
- [ ] Define StoryBeats with dialogue and NPC triggers
- [ ] Create BossConfig if chapter has combat
- [ ] Add chapter to ALL_CHAPTERS export
- [ ] Create/import all sprite assets
- [ ] Add chapter music to src/assets/audio/chapters/
- [ ] Import chapter music in audio.ts + CHAPTER_AUDIO map
- [ ] Import & preload sprites in ChapterScene.create()
- [ ] Test: run dev server, pick chapter, walk around, talk to NPCs, fight boss
- [ ] Verify localStorage saves progress correctly
- [ ] Check audio plays and mute button works

---

**Happy developing! The codebase is modular and forgiving — follow these patterns and you'll be adding content in no time.**

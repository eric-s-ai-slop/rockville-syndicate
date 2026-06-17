## STAGE 3 — FULL IMPLEMENTATION SPEC: "THE STORY FRACTURES"

### BEAT CONFIG

Add this beat to the chapter's beat sequence (after the parking lot setup, before the group-distance ending):

```typescript
{
  type: 'minigame',
  modeId: 'storyFractures',
  config: {
    // The full story text with embedded fracture markers (see below)
    storySegments: storyData, 
    // Speed of auto-scroll (characters per second)
    scrollSpeed: 35,
    // Time allowed after the story ends to review/click missed fractures before auto-continue
    reviewWindow: 3000,
    // Whether to show a "replay" button on partial failure
    allowReplay: true,
    // Max number of attempts before forcing a conclusion (optional)
    maxAttempts: 3
  },
  introLines: [
    'MAHARKO\'S STORY — The Version He Told',
    'Mark the fractures. The truth is in the details.'
  ],
  background: false // Foreground mode — blocks story until resolved
}
```

---

### MODE SPEC: `storyFractures`

---

#### `modeId`
`'storyFractures'`

---

#### CONFIG SCHEMA

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `storySegments` | `StorySegment[]` | **required** | Array of text segments, each with optional `fractureId` |
| `scrollSpeed` | `number` | 35 | Characters per second for auto-scroll |
| `reviewWindow` | `number` | 3000 | ms to pause at end for final clicks |
| `allowReplay` | `boolean` | true | Whether player can restart if they miss fractures |
| `maxAttempts` | `number` | 3 | Attempts before forced outcome |

**`StorySegment` type:**
```typescript
interface StorySegment {
  text: string;           // The actual dialogue text
  speaker?: string;       // Optional speaker label (e.g., "Maharko")
  fractureId?: string;    // If set, this segment contains a fracture to mark
  fractureHint?: string;  // Optional subtle visual cue (e.g., a slight underline)
}
```

---

#### THE STORY DATA (Embedded in Config)

This is the exact text Maharko tells in the parking lot. **Fracture points** are marked with `fractureId` — each represents a detail that doesn't add up.

```typescript
const storyData: StorySegment[] = [
  {
    speaker: 'Maharko',
    text: 'So we were at UMBC. Frat party. Ben brought the stew, as usual. He was drinking, having a good time.'
  },
  {
    speaker: 'Maharko',
    text: 'I was over by the speakers, talking to some guys.',
    fractureId: 'location',  // He was actually close to Ben, not by the speakers
    fractureHint: 'Were you?'
  },
  {
    speaker: 'Maharko',
    text: 'I saw Ben talking to a couple girls, but I didn\'t think anything of it.',
    fractureId: 'count',  // There were three girls, not "a couple"
    fractureHint: 'A couple?'
  },
  {
    speaker: 'Maharko',
    text: 'Next thing I know, some frat guys come up to me and say "get your boy and leave."'
  },
  {
    speaker: 'Maharko',
    text: 'I was like, what? I didn\'t see anything.',
    fractureId: 'blindness',  // He saw the "you're next" and shhh
    fractureHint: 'Nothing?'
  },
  {
    speaker: 'Maharko',
    text: 'They said he was being inappropriate. I had to steer him out. He was drunk, barely walking.'
  },
  {
    speaker: 'Maharko',
    text: 'On the drive back, he didn\'t say much. I didn\'t know what happened until later.',
    fractureId: 'timing',  // He knew right then — the frat guys told him specifically
    fractureHint: 'Later?'
  }
];
```

**Total fractures: 4** (`location`, `count`, `blindness`, `timing`).  
The player must mark **all 4** to win.

---

#### GAMEMODE LIFECYCLE

##### `preload()`

Load minimal assets:
- A parking-lot background image (`parkingLotBg`) — stylized pixel art, night, one car, dim streetlight.
- A "cursor/click" sprite (`magnifyingGlass`) — optional UI accent.
- A sound effect for marking a fracture (`fractureMark`) — a soft "click" with a hint of revelation.
- A sound for missing/scrolling past a fracture (`fractureMiss`) — a low, hollow tone.
- Ambient parking-lot audio (`parkingAmbient`) — crickets, distant highway hum.

##### `start(context: ModeContext)`

1. **Setup UI Container**  
   Create a full-screen container (`this.uiContainer`) anchored to the camera.

2. **Render Background**  
   Place `parkingLotBg` centered, dimly lit.

3. **Render Speaker Label**  
   Create a text object at top-left: `"Maharko"` — in the game's dialogue font, slightly muted.

4. **Render Story Text**  
   Create a `scrollText` object — a `Phaser.GameObjects.Text` with `wordWrap` enabled.  
   - Position: centered, taking up ~70% of the screen width, starting about 100px from top.  
   - Style: pixel font, white, with a subtle dark drop-shadow for readability.  
   - It starts empty. A `scrollIndex` tracks how many characters have been revealed.

5. **Register Input**  
   - Make the entire text area interactive (`setInteractive()`).  
   - On `click` / `pointerdown`, call `handleClick(pointer)` — which checks if the player clicked on a word that contains a fracture.

6. **Build Word Map**  
   Parse the `storySegments` into a flat array of words with metadata:
   - `word`: string
   - `startChar`: global character index
   - `endChar`: global character index
   - `fractureId`: string | null
   - `bounds`: { x, y, width, height } (computed via `getTextBounds()` after rendering)

   This allows hit-testing: when the player clicks, find which word they clicked on, check its `fractureId`.

7. **Track State**  
   - `foundFractures`: `Set<string>` — IDs the player has successfully marked.
   - `scrollPosition`: `number` — current character index revealed.
   - `isComplete`: `boolean` — whether the full story has been scrolled.
   - `reviewing`: `boolean` — whether we're in the review window.
   - `attempts`: `number` — starts at 1.

8. **Start Auto-Scroll**  
   Use a `time` event or `update` delta to increment `scrollPosition` by `scrollSpeed * dt`.  
   Each frame, update the text display to show only up to `scrollPosition` characters.

9. **Display Fracture Hints**  
   For segments with `fractureId`, add a subtle visual indicator: a faint, wavy underline or a small "?" icon next to the line. This is **not** a spoiler — it just says "look here." The player still has to click on the *correct word* within that segment.

10. **Mark a Fracture (on successful click)**  
    - Play `fractureMark` sound.
    - Highlight the clicked word/phrase in a bright yellow/gold with a pulse tween.
    - Add the `fractureId` to `foundFractures`.
    - Update a UI counter: `"Fractures Found: 2 / 4"`.
    - If `foundFractures.size === totalFractures`, trigger win.

11. **Miss a Fracture (when it scrolls past without being clicked)**  
    - The moment `scrollPosition` passes the `endChar` of a fracture segment whose ID is **not** in `foundFractures`, play `fractureMiss` sound.
    - The segment's text fades slightly — still readable, but "cold" — indicating it slipped away.
    - Track `missedFractures` count.

12. **Story End / Review Window**  
    - When `scrollPosition >= totalCharacters`, set `isComplete = true`.
    - Pause scrolling.
    - Start `reviewWindow` timer:
      - During review, the player can still click on any revealed word (including missed fractures) to mark them.
      - The text is fully visible.
      - A subtle pulsing indicator appears on unmarked fracture segments.
    - When `reviewWindow` ends:
      - If `foundFractures.size === totalFractures` → **WIN**.
      - Else → **LOSE** (with option to replay).

13. **Replay**  
    - On lose, show a button: `"Listen Again"`.
    - Reset `scrollPosition`, `foundFractures`, `missedFractures`.
    - Reset text and restart scroll.
    - Increment `attempts`.
    - If `attempts >= maxAttempts`, force conclusion (lose with no replay).

##### `update(time: number, delta: number)`

- Update `scrollPosition` if `!isComplete && !paused`.
- Update text display.
- Update any tweened UI elements (pulsing hints, counter).

##### `teardown()`

- Destroy all UI elements (text, buttons, background).
- Stop any active tweens or timers.
- Clear input listeners.

---

#### MODE CONTEXT API CALLS

| API | Usage |
|-----|-------|
| `ctx.add.image(x, y, key)` | Render parking lot background |
| `ctx.add.text(x, y, str, style)` | Speaker label, counter — use `ctx.label()` for HiDPI |
| `ctx.label(x, y, text, style)` | High-DPI text label — always prefer over `ctx.add.text` |
| `ctx.cameras.main` | Viewport dimensions for anchoring UI (`ctx.cameras.main.width / height`) |
| `ctx.tweens.add({...})` | Pulse/highlight tween on marked fracture words |
| `ctx.time.delayedCall(ms, fn)` | Review window countdown, win/lose delay |
| `ctx.sound.play(key)` | `fractureMark`, `fractureMiss`, `parkingAmbient` |
| `ctx.input.on('pointerdown', fn)` | Click handler for fracture marking |
| `ctx.showLetterbox(dur)` | Apply cinematic bars on mode entry |
| `ctx.hideLetterbox(dur)` | Remove cinematic bars on mode exit |
| `onComplete({ outcome: 'win' })` | Call when all fractures found |
| `onComplete({ outcome: 'lose' })` | Call when review window ends with missed fractures |

**Notes:**
- There is no `getScene()`, `getCamera()`, `getGameState()`, `playSound()`, or `createButton()` — these don't exist.
- For the "Listen Again" replay button, use `ctx.add.text(...).setInteractive().on('pointerdown', fn)`.
- Outcome data (`fracturesFound`, `attempts`) does not flow through `onComplete` — only `outcome: 'win' | 'lose'` is supported. Store counts in mode-local variables; the chapter beats that follow can branch via `choice` or `goto` if needed.
- UI elements should use `setScrollFactor(0)` to stay fixed to the viewport regardless of camera position.

---

#### WIN PATH

**Trigger:** `foundFractures.size === 4` (all fractures marked) **during** the story or the review window.

**Effect:**
- The screen flashes white briefly.
- The fractured words **snap together** — they re-form into a new, complete sentence:
  > *"Ben said 'you're next' to three girls. Maharko was close enough to hear it. The frat guys pulled Ben off. Maharko knew right then."*
- A final text overlay appears:
  > *"You saw the cracks. The story couldn't hold."*
- The UI fades to black.
- Call `onComplete({ outcome: 'win' })`.

**Emotional landing:** The player feels a grim clarity. They did what the group couldn't.

---

#### LOSE PATH

**Trigger:** Review window ends AND `foundFractures.size < 4`.

**Effect:**
- The missed fractures gently pulse in a dim red — they're there, but unmarked.
- A text overlay appears:
  > *"What Maharko saw — or didn't see — was never asked again."*
- A button appears: `"Listen Again"` (if `allowReplay` and `attempts < maxAttempts`).
- If `attempts >= maxAttempts` or player chooses not to replay, the scene continues.
- Call `onComplete({ outcome: 'lose' })`.

**Emotional landing:** The player feels the weight of inaction. They know they could have looked closer, but they didn't. The game doesn't punish them harshly — it just lets them sit with the loss.

---

#### DIFFICULTY NOTE

**Is this fair on first attempt?** Yes. The fracture hints (subtle underlines) guide the player's attention. The review window gives them a second chance to catch anything they missed. The scroll speed (35 cps) is designed to be read comfortably — about 150–200 words per minute, slightly slower than average reading speed, to encourage careful reading.

**Should it be hard?** Not mechanically — the difficulty is *attentional*, not reflex-based. The challenge is staying engaged with a story the player might want to look away from.

**Is there a version of "losing" that still feels like a valid ending?** Yes — it's the chapter's actual ending. The group never asks the question. Losing the minigame means the player experiences exactly what the group experiences. It's thematically coherent and not punitive. The replay option exists so players who *want* the truth can get it, but those who "lose" aren't forced to replay — they can accept the blur and move on, which is its own kind of valid playthrough.

---

### ADDITIONAL NOTES FOR DEVELOPMENT

- **Text Hit-Testing:** Use `getTextBounds()` or a custom word-position map. For a pixel game, approximate bounds via character count and line height — or use a `Text` object per word for precise interaction. The latter is cleaner: create a `container` with one `Text` object per word, each interactive, positioned via `setWordWrap` logic.
- **Fracture Highlighting:** When a fracture is marked, add a tween that scales the word up 1.2x and changes color to gold, then settles back. This gives satisfying feedback.
- **Sound Design:** The `fractureMark` sound should be a soft, satisfying "clink" — like a puzzle piece clicking into place. `fractureMiss` should be a low, hollow "thud" — a missed opportunity.
- **Parking Lot Atmosphere:** The background should be dark but not oppressive. A single streetlight casts a cone of light on the car. Maharko's silhouette is visible but static. This reinforces the "confession in the dark" feel.

---

### INTRO LINES (for the beat)

```typescript
introLines: [
  'MAHARKO\'S STORY — The Version He Told',
  'Mark the fractures. The truth is in the details.'
]
```

---

This spec is ready for Step 3 (SCHEMA) to define the data structures and for a developer to implement the mode. The mechanic makes the chapter's argument tactile: *the truth is available if you're willing to look, but you can let it slip by if you're not.*
> **ARCHIVED** — Historical sprint plan. Verify against current code before acting on any item.

# TASK-07 — UI sounds (selection / click / hover)

## Goal
Add interface sounds across the React UI: selecting a hero, clicking buttons, picking dialogue/QTE choices, hover
feedback, the mute toggle, etc. Use the Kenney interface pack already in the repo
(`src/assets/audio/kenney_interface-sounds/`, also `kenney_ui-audio/`).

## House Rules (must follow)
- No new deps. Respect the existing **mute** state (`localStorage 'omega-muted'`); muted = no UI sounds.
- Don't put side effects inside React `setState` updaters (StrictMode double-fires them). Play sounds in event
  handlers, not in render or updaters.
- Done = `tsc --noEmit` clean + `npm run build` clean. Surgical diff.

## How audio is done in React land today
DOM UI uses plain `new Audio(url)` (see `src/components/DialogueBox.tsx`: `const typewriterAudio = new Audio(...)`).
Asset URLs come from `src/game/audio.ts`, imported with Vite `?url`. Follow that pattern — do **not** route UI
clicks through the Phaser sound manager (the menus exist before the Phaser game boots).

Available samples (pick by ear; `.ogg` is fine for Vite):
- select: `kenney_interface-sounds/Audio/select_00X.ogg`
- click/confirm: `.../confirmation_001.ogg`, `kenney_ui-audio/Audio/click1.ogg`
- hover/rollover: `kenney_ui-audio/Audio/rollover1.ogg`
- back/cancel: `.../back_00X.ogg`
- toggle (mute): `.../toggle_001.ogg` or `switch_00X.ogg`

## Implementation

### 1. Audio exports (`src/game/audio.ts`)
Append a clearly-labeled block **at the end of the file** (so it merges cleanly alongside other tasks' appends):
```ts
// ── UI SOUNDS (TASK-07) ──
import uiClickUrl    from '../assets/audio/kenney_interface-sounds/Audio/confirmation_001.ogg?url';
import uiHoverUrl    from '../assets/audio/kenney_ui-audio/Audio/rollover1.ogg?url';
import uiSelectUiUrl from '../assets/audio/kenney_interface-sounds/Audio/select_004.ogg?url';
import uiBackUrl     from '../assets/audio/kenney_interface-sounds/Audio/back_001.ogg?url';
import uiToggleUrl   from '../assets/audio/kenney_interface-sounds/Audio/toggle_001.ogg?url';
export const UI_CLICK_URL  = uiClickUrl;
export const UI_HOVER_URL  = uiHoverUrl;
export const UI_PICK_URL   = uiSelectUiUrl;
export const UI_BACK_URL   = uiBackUrl;
export const UI_TOGGLE_URL = uiToggleUrl;
```
(`UI_SELECT_URL` already exists for the in-game Phaser select — leave it.)

### 2. New util: `src/game/uiSound.ts`
A tiny module that preloads the clips, plays them respecting mute, and is safe to import anywhere:
```ts
import { UI_CLICK_URL, UI_HOVER_URL, UI_PICK_URL, UI_BACK_URL, UI_TOGGLE_URL } from './audio';

type UiSound = 'click' | 'hover' | 'pick' | 'back' | 'toggle';
const URLS: Record<UiSound, string> = {
  click: UI_CLICK_URL, hover: UI_HOVER_URL, pick: UI_PICK_URL, back: UI_BACK_URL, toggle: UI_TOGGLE_URL,
};
// Pool a couple of elements per sound so rapid clicks don't cut each other off.
const pools: Partial<Record<UiSound, HTMLAudioElement[]>> = {};
function get(name: UiSound): HTMLAudioElement {
  const pool = pools[name] ?? (pools[name] = [new Audio(URLS[name]), new Audio(URLS[name])]);
  const free = pool.find(a => a.paused || a.ended) ?? pool[0];
  return free;
}
export function isUiMuted(): boolean {
  try { return localStorage.getItem('omega-muted') === 'true'; } catch { return false; }
}
export function playUi(name: UiSound, volume = 0.4): void {
  if (isUiMuted()) return;
  try { const a = get(name); a.currentTime = 0; a.volume = volume; a.play().catch(() => {}); } catch {}
}
```
- All plays are wrapped so a missing/blocked audio never throws.
- Honors the existing mute flag. (Optional polish: have the mute toggle update a module-level cache, but reading
  `localStorage` per click is fine for UI rates.)

### 3. Wire into the React components
Import `playUi` and call it in the relevant handlers. **Add to existing `onClick`/`onMouseEnter`, don't replace
their logic.** Keep it light — hover sounds only on primary interactive cards, not every element.

`src/components/GameLayout.tsx`:
- Hero select card `onClick={() => handleSelectHero(hero)}` (~line 394) → `playUi('pick')` (call inside the handler,
  not the updater).
- "Begin the Story" button `onClick={handleStartStory}` (~line 431) → `playUi('click')`.
- Mute toggle (~line 361) → `playUi('toggle')` **before** flipping state (so you hear it even when unmuting from
  muted — actually only audible when unmuting; that's fine).
- "Return to chapters" buttons (~lines 586, 609) → `playUi('back')`.
- QTE option buttons `onClick={() => handleQteResponse(option)}` (~line 484) → `playUi('pick')`. Add a subtle
  `onMouseEnter={() => playUi('hover', 0.2)}` if it isn't annoying.

`src/components/ChapterSelect.tsx`:
- Chapter card click (unlocked only) → `playUi('pick')`.
- Free-Play toggle → `playUi('toggle')`.
- Card hover (unlocked) → `playUi('hover', 0.2)` (optional).

`src/components/DialogueBox.tsx`:
- The dialogue **choice** `<button onClick={() => onChoose?.(idx)}>` (~line 153) → `playUi('pick')`.
  ⚠️ Merge note: TASK-08 also edits `DialogueBox.tsx` (the typewriter text sound). Different region. Per
  MASTER_PLAN, TASK-08 merges first; only add the choice-click `playUi` here and leave the typewriter code alone.

## Acceptance criteria
- Selecting a hero, starting the story, clicking buttons, picking dialogue/QTE options, toggling mute, and going
  back all play appropriate, non-grating UI sounds.
- With the game muted (🔇), **no** UI sounds play.
- Rapid clicks don't produce harsh cut-offs (pooling) and never throw if audio is blocked.
- `npx tsc --noEmit` and `npm run build` clean.
import { UI_CLICK_URL, UI_HOVER_URL, UI_PICK_URL, UI_BACK_URL, UI_TOGGLE_URL, UI_CRACK_URL, UI_SHATTER_URL } from './audio';

type UiSound = 'click' | 'hover' | 'pick' | 'back' | 'toggle' | 'crack' | 'shatter';
const URLS: Record<UiSound, string> = {
  click: UI_CLICK_URL, hover: UI_HOVER_URL, pick: UI_PICK_URL, back: UI_BACK_URL, toggle: UI_TOGGLE_URL,
  crack: UI_CRACK_URL, shatter: UI_SHATTER_URL,
};
// Pool elements per sound so rapid clicks don't cut each other off, and allow amplitude stacking
const pools: Partial<Record<UiSound, HTMLAudioElement[]>> = {};
function get(name: UiSound): HTMLAudioElement {
  const pool = pools[name] ?? (pools[name] = [
    new Audio(URLS[name]), new Audio(URLS[name]), 
    new Audio(URLS[name]), new Audio(URLS[name]),
    new Audio(URLS[name]), new Audio(URLS[name]),
    new Audio(URLS[name]), new Audio(URLS[name])
  ]);
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

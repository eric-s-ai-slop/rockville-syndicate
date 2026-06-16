/**
 * BattleIQ: The Rockville Chronicles - Dynamic Control Toolbox HUD
 *
 * Renders a context-aware list of available controls and their keybinds
 * for the currently active game state. The toolbox updates automatically
 * when the game state changes and highlights keys as they are pressed.
 *
 * Pure keyboard input only — no mouse controls are listed.
 */

class ControlsHUD {
    constructor() {
        this.toolboxEl = null;
        this.listEl = null;
        this.active = false;
        this.userHidden = false;
    }

    init() {
        this.toolboxEl = document.getElementById("controls-toolbox");
        this.listEl = document.getElementById("controls-list");
        // Visible by default so the player always sees what they can press
        this.userHidden = false;
        if (!this.listEl) return;

        // Bind global keydown/keyup listeners for the active-key glow effect
        window.addEventListener("keydown", (e) => this.onKeyChange(e, true));
        window.addEventListener("keyup", (e) => this.onKeyChange(e, false));

        // 2026-06-11: MOBILE TOUCH CONTROLS — wire up the virtual D-pad + action
        // buttons. On touch devices, taps are translated to synthetic keyboard
        // events via dispatchKey() so all existing game logic (movement, menus,
        // dialogue) works without any changes.
        this.initTouchControls();
    }


    /**
     * 2026-06-11: Wire up the on-screen touch control buttons to the same
     * key-dispatch system used by the mouse-clickable key chips. Touch events
     * are converted to keydown/keyup events via dispatchKey().
     */
    initTouchControls() {
        const touchBtns = document.querySelectorAll(".touch-btn");
        touchBtns.forEach(btn => {
            // Map touchstart → keydown
            btn.addEventListener("touchstart", (e) => {
                e.preventDefault();  // prevent mouse-emulation + double-tap zoom
                const key = btn.dataset.key;
                if (!key) return;
                if (this.dispatchKey) this.dispatchKey(key);
                // Visual feedback — mark the matching key chip as active
                const k = key.toLowerCase();
                this.listEl.querySelectorAll(".key-chip").forEach(chip => {
                    if (chip.dataset.key === k) chip.classList.add("active");
                });
            }, { passive: false });

            // Map touchend → keyup (so keys don't get "stuck")
            btn.addEventListener("touchend", (e) => {
                e.preventDefault();
                const key = btn.dataset.key;
                if (!key) return;
                const up = new KeyboardEvent("keyup", {
                    key: key,
                    code: this.keyToCode(key),
                    bubbles: true
                });
                window.dispatchEvent(up);
                // Clear visual feedback
                const k = key.toLowerCase();
                this.listEl.querySelectorAll(".key-chip").forEach(chip => {
                    if (chip.dataset.key === k) chip.classList.remove("active");
                });
            }, { passive: false });

            // Cancel on touchcancel (e.g. finger slid off the button)
            btn.addEventListener("touchcancel", (e) => {
                const key = btn.dataset.key;
                if (!key) return;
                const up = new KeyboardEvent("keyup", {
                    key: key,
                    code: this.keyToCode(key),
                    bubbles: true
                });
                window.dispatchEvent(up);
                const k = key.toLowerCase();
                this.listEl.querySelectorAll(".key-chip").forEach(chip => {
                    if (chip.dataset.key === k) chip.classList.remove("active");
                });
            });

            // Also support mouse (for desktop testing without keyboard)
            btn.addEventListener("mousedown", (e) => {
                e.preventDefault();
                const key = btn.dataset.key;
                if (key && this.dispatchKey) this.dispatchKey(key);
            });
        });
    }


    setVisible(visible) {
        if (!this.toolboxEl) return;
        if (!visible || this.userHidden) {
            this.toolboxEl.classList.add("hidden");
        } else {
            this.toolboxEl.classList.remove("hidden");
        }
        this.active = visible && !this.userHidden;
    }

    toggleVisible() {
        this.userHidden = !this.userHidden;
        this.setVisible(this.userHidden ? false : true);
    }

    onKeyChange(e, isDown) {
        if (!this.listEl) return;
        if (!this.active) return;

        const key = e.key.toLowerCase();
        const chips = this.listEl.querySelectorAll(".key-chip");
        chips.forEach(chip => {
            if (chip.dataset.key === key) {
                if (isDown) chip.classList.add("active");
                else chip.classList.remove("active");
            }
        });
    }

    /**
     * Render the list of controls for the given state.
     *
     * @param {string} state - One of "menu", "overworld", "battle", or "bulletHell"
     * @param {string} battleMenu - Optional submenu: "main", "act", "item"
     */
    updateControls(state, battleMenu = "main") {
        if (!this.listEl) return;
        this.listEl.innerHTML = "";

        let controls = [];
        let visible = true;

        if (state === "menu") {
            visible = false;
        } else if (state === "overworld") {
            controls = [
                { label: "Move",      keys: ["W", "A", "S", "D", "↑", "←", "↓", "→"] },
                { label: "Talk / Go", keys: ["Space", "Enter"] },
                { label: "Pause",     keys: ["P"] },
                { label: "Save",      keys: ["K"] },
                { label: "Toggle UI", keys: ["H"] }
            ];

        } else if (state === "battle") {
            if (battleMenu === "main") {
                controls = [
                    { label: "Choose",  keys: ["A", "D", "←", "→"] },
                    { label: "Confirm", keys: ["Enter"] },
                    { label: "Cancel",  keys: ["Backspace"] },
                    { label: "Pause",   keys: ["P"] }
                ];
            } else if (battleMenu === "act") {
                controls = [
                    { label: "Navigate", keys: ["W", "S", "↑", "↓"] },
                    { label: "Confirm",  keys: ["Enter"] },
                    { label: "Back",     keys: ["Backspace"] }
                ];
            } else if (battleMenu === "item") {
                controls = [
                    { label: "Navigate", keys: ["W", "A", "S", "D"] },
                    { label: "Use",      keys: ["Enter"] },
                    { label: "Back",     keys: ["Backspace"] }
                ];
            }
        } else if (state === "bulletHell") {
            controls = [
                { label: "Dodge",    keys: ["W", "A", "S", "D", "↑", "←", "↓", "→"] },
                { label: "Pause",    keys: ["P"] }
            ];
        }


        controls.forEach(ctrl => {
            const row = document.createElement("div");
            row.className = "control-row";

            const label = document.createElement("div");
            label.className = "control-label";
            label.innerText = ctrl.label;
            row.appendChild(label);

            const keyGroup = document.createElement("div");
            keyGroup.className = "key-group";
            ctrl.keys.forEach(k => {
                const chip = document.createElement("span");
                chip.className = "key-chip";
                chip.dataset.key = k.toLowerCase();
                chip.innerText = k;
                // Make chip clickable: dispatch a synthetic keydown event
                chip.addEventListener("mousedown", (e) => {
                    e.preventDefault();
                    this.dispatchKey(k);
                });
                keyGroup.appendChild(chip);
            });
            row.appendChild(keyGroup);

            this.listEl.appendChild(row);
        });

        this.setVisible(visible);
    }

    /**
     * Dispatch a synthetic keydown event for the given key string.
     * This lets mouse/touch users trigger the same actions as keyboard users.
     * @param {string} key - The key string, e.g. "W", "Enter", "Space"
     */
    dispatchKey(key) {
        const evt = new KeyboardEvent("keydown", {
            key: key,
            code: this.keyToCode(key),
            bubbles: true,
            cancelable: true
        });
        window.dispatchEvent(evt);
        // Auto-release after a short delay
        setTimeout(() => {
            const up = new KeyboardEvent("keyup", {
                key: key,
                code: this.keyToCode(key),
                bubbles: true
            });
            window.dispatchEvent(up);
        }, 80);
        if (audio && audio.playSelect) audio.playSelect();
    }

    /**
     * Map a single-character key (as shown on the chip) to a KeyboardEvent.code.
     */
    keyToCode(key) {
        const k = key.toLowerCase();
        if (k === "space") return "Space";
        if (k === "enter") return "Enter";
        if (k === "backspace") return "Backspace";
        if (k === "escape") return "Escape";
        if (k === "↑" || k === "↑") return "ArrowUp";
        if (k === "↓") return "ArrowDown";
        if (k === "←") return "ArrowLeft";
        if (k === "→") return "ArrowRight";
        if (k.length === 1) return "Key" + k.toUpperCase();
        return "Unidentified";
    }
}


const controlsHUD = new ControlsHUD();
window.addEventListener("DOMContentLoaded", () => {
    controlsHUD.init();
});

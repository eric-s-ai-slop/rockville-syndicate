/**
 * BattleIQ: The Rockville Chronicles - DEBUG TOOLS & CHEAT CODES
 * 2026-06-11: Comprehensive dev tools system.
 *
 * Flip `CHEATS.enabled = false` to disable ALL cheats + hide dev UI in one line.
 *
 * Access methods:
 *   1. Hidden dev panel on the main menu (visible only when CHEATS.enabled)
 *   2. Backtick (`) opens in-game dev console — type codes like "god", "kill"
 *   3. Hotkeys: F1–F6 toggle common cheats instantly
 *
 * Type "help" in the dev console to see all codes.
 */

const CHEATS = {
    // =========================================================================
    // MASTER SWITCH — flip to false to disable ALL cheats at once
    // =========================================================================
    enabled: true,

    // =========================================================================
    // COMBAT CHEATS
    // =========================================================================
    godMode: false,        // Player takes 0 damage
    oneHitKO: false,       // All attacks deal 9999 damage
    infiniteMP: false,     // MP never decreases on use
    perfectTiming: false,  // All timing attacks auto-resolve as "perfect"
    pacifyAll: false,      // All bosses pacifiable on first try (acts like weakness)

    // =========================================================================
    // PLAYER / INVENTORY CHEATS
    // =========================================================================
    maxStats: false,       // All party at full HP/MP after every action
    infiniteItems: false,  // Items never get consumed (free heals)
    autoRecruitBoss: false,// Boss fights auto-end + auto-recruit (skip battle)

    // =========================================================================
    // EXPLORATION CHEATS
    // =========================================================================
    speedBoost: 1,         // Movement speed multiplier (1, 2, 5)
    noClip: false,         // Walk through walls + NPCs
    revealAll: false,      // Show all triggers labeled on the map

    // =========================================================================
    // DEBUG VISUALIZATION
    // =========================================================================
    showHitboxes: false,   // Draw collision boxes around player/NPCs/bullets
    showCoords: false,     // Display player X/Y + state + FPS in real time
    slowMotion: 1,         // Bullet hell speed multiplier (0.25, 0.5, 1)

    // =========================================================================
    // STORY / SAVE CHEATS
    // =========================================================================
    unlockAllActs: false,  // Can exit any act (defeat boss gate bypassed)
    pacifistRun: false,    // All bosses marked as "spared" (True Pacifist ending)

    // =========================================================================
    // HIDDEN KEYBINDS (active only when CHEATS.enabled)
    // =========================================================================
    keybinds: {
        "F1": "godMode",
        "F2": "oneHitKO",
        "F3": "maxStats",
        "F4": "speedBoost",     // Cycles 1→2→5→1
        "F5": "showHitboxes",
        "F6": "showCoords",
        "F7": "noClip",
        "F8": "infiniteMP",
        "`":  "toggleDevConsole",  // Backtick opens dev console
    }
};


// Make globally accessible
window.CHEATS = CHEATS;


// ============================================================================
// DEV CONSOLE — type cheat codes in-game
// ============================================================================
const DEV_CONSOLE = {
    history: [],
    historyIndex: -1,
    isOpen: false,
    currentInput: "",

    init() {
        if (!CHEATS.enabled) return;

        // Inject the dev console DOM
        const el = document.createElement("div");
        el.id = "dev-console";
        el.className = "dev-console-hidden";
        el.innerHTML = `
            <div class="dev-console-header">
                <span class="dev-console-title">🛠️ DEV CONSOLE</span>
                <span class="dev-console-hint">type "help" for codes • `+"`"+` to close</span>
            </div>
            <div class="dev-console-output" id="dev-console-output"></div>
            <input type="text" class="dev-console-input" id="dev-console-input"
                   placeholder="type a cheat code..." autocomplete="off" spellcheck="false">
        `;
        document.body.appendChild(el);

        this.el = el;
        this.output = document.getElementById("dev-console-output");
        this.input = document.getElementById("dev-console-input");

        // Input handler
        this.input.addEventListener("keydown", (e) => {
            e.stopPropagation();  // don't trigger game keys

            if (e.key === "Enter") {
                this.execute(this.input.value.trim().toLowerCase());
                this.input.value = "";
            } else if (e.key === "ArrowUp") {
                // Navigate history
                if (this.historyIndex < this.history.length - 1) {
                    this.historyIndex++;
                    this.input.value = this.history[this.historyIndex] || "";
                }
                e.preventDefault();
            } else if (e.key === "ArrowDown") {
                if (this.historyIndex > 0) {
                    this.historyIndex--;
                    this.input.value = this.history[this.historyIndex] || "";
                } else {
                    this.historyIndex = -1;
                    this.input.value = "";
                }
                e.preventDefault();
            }
        });
    },

    toggle() {
        if (!CHEATS.enabled) return;
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.el.classList.remove("dev-console-hidden");
            this.el.classList.add("dev-console-open");
            this.input.focus();
            this.log("🛠️ Dev console opened. Type 'help' for codes.");
        } else {
            this.el.classList.add("dev-console-hidden");
            this.el.classList.remove("dev-console-open");
            this.input.blur();
        }
    },

    log(msg, color = "#4df3ff") {
        if (!this.output) return;
        const line = document.createElement("div");
        line.className = "dev-console-line";
        line.style.color = color;
        line.textContent = msg;
        this.output.appendChild(line);
        this.output.scrollTop = this.output.scrollHeight;
    },

    execute(cmd) {
        if (!cmd) return;
        this.history.unshift(cmd);
        this.historyIndex = -1;
        this.log("> " + cmd, "#8a81b3");

        // Parse command
        const parts = cmd.split(/\s+/);
        const code = parts[0];
        const arg = parts[1];

        switch (code) {
            case "help":
                this.log("━━━ CHEAT CODES ━━━", "#ffd700");
                this.log("god / kill / mana / max / items", "#4dff8a");
                this.log("fly / reveal / hitbox / coords", "#4dff8a");
                this.log("speed [1|2|5]   •   slow [0.25|0.5|1]", "#4dff8a");
                this.log("acts / pacifist / recruit", "#4dff8a");
                this.log("allcheats / nocheats", "#4dff8a");
                this.log("give <itemId>   •   harm <amount>", "#4dff8a");
                this.log("heal / fullheal / nextact", "#4dff8a");
                this.log("━━━━━━━━━━━━━━━━━━━━", "#ffd700");
                break;

            // === Combat toggles ===
            case "god":
                this.toggle("godMode", "God Mode", "🛡️");
                break;
            case "kill":
                this.toggle("oneHitKO", "One-Hit KO", "⚔️");
                break;
            case "mana":
                this.toggle("infiniteMP", "Infinite MP", "✨");
                break;
            case "perfect":
                this.toggle("perfectTiming", "Perfect Timing", "🎯");
                break;
            case "pacifyall":
                this.toggle("pacifyAll", "Pacify All Bosses", "🕊️");
                break;

            // === Player/Inventory ===
            case "max":
                this.toggle("maxStats", "Max Stats", "💪");
                if (game && game.party) {
                    game.party.forEach(p => { p.hp = p.maxHp; p.mp = p.maxMp; });
                }
                this.log("All party members healed to full.", "#4dff8a");
                break;
            case "items":
                this.toggle("infiniteItems", "Infinite Items", "🎒");
                break;
            case "recruit":
                this.toggle("autoRecruitBoss", "Auto-Recruit Bosses", "👥");
                break;

            // === Exploration ===
            case "fly":
                this.toggle("noClip", "No-Clip Mode", "🪽");
                break;
            case "reveal":
                this.toggle("revealAll", "Reveal All Triggers", "🔍");
                break;
            case "hitbox":
                this.toggle("showHitboxes", "Show Hitboxes", "📐");
                break;
            case "coords":
                this.toggle("showCoords", "Show Coordinates", "📍");
                break;

            // === Speed controls ===
            case "speed":
                if (arg && ["1", "2", "5"].includes(arg)) {
                    CHEATS.speedBoost = parseInt(arg);
                    this.log(`🏃 Speed boost set to ${arg}x.`, "#4dff8a");
                } else {
                    this.log("Usage: speed 1 | 2 | 5", "#ff3c82");
                }
                break;
            case "slow":
                if (arg && ["0.25", "0.5", "1"].includes(arg)) {
                    CHEATS.slowMotion = parseFloat(arg);
                    this.log(`🐌 Bullet hell slow-mo set to ${arg}x.`, "#4dff8a");
                } else {
                    this.log("Usage: slow 0.25 | 0.5 | 1", "#ff3c82");
                }
                break;

            // === Story ===
            case "acts":
                this.toggle("unlockAllActs", "Unlock All Acts", "🚪");
                break;
            case "pacifist":
                this.toggle("pacifistRun", "Pacifist Run (all bosses spared)", "🕊️");
                if (CHEATS.pacifistRun && game) {
                    // Mark all 4 bosses as spared
                    game.sparedBosses = ["jacob", "hedgecock_boss", "eric", "maharko_boss"];
                    this.log("All 4 mid-bosses marked as spared. Victory screen → True Pacifist!", "#ffd700");
                }
                break;

            // === Bulk ===
            case "allcheats":
                CHEATS.godMode = true;
                CHEATS.oneHitKO = true;
                CHEATS.infiniteMP = true;
                CHEATS.perfectTiming = true;
                CHEATS.maxStats = true;
                CHEATS.infiniteItems = true;
                CHEATS.autoRecruitBoss = true;
                CHEATS.noClip = true;
                CHEATS.revealAll = true;
                CHEATS.showHitboxes = true;
                CHEATS.showCoords = true;
                CHEATS.unlockAllActs = true;
                CHEATS.speedBoost = 5;
                this.log("🔥 ALL CHEATS ENABLED.", "#ffd700");
                if (game && game.party) {
                    game.party.forEach(p => { p.hp = p.maxHp; p.mp = p.maxMp; });
                }
                break;
            case "nocheats":
                Object.keys(CHEATS).forEach(k => {
                    if (typeof CHEATS[k] === "boolean") CHEATS[k] = false;
                });
                CHEATS.speedBoost = 1;
                CHEATS.slowMotion = 1;
                this.log("❌ All cheats disabled.", "#8a81b3");
                break;

            // === Item spawning ===
            case "give":
                if (arg && typeof GAME_DATA !== "undefined" && GAME_DATA.ITEMS) {
                    const item = GAME_DATA.ITEMS.find(i => i.id === arg);
                    if (item && game && game.inventory) {
                        // Add a copy of the item to inventory
                        const newItem = JSON.parse(JSON.stringify(item));
                        if (!game.inventory.find(i => i.id === newItem.id)) {
                            game.inventory.push(newItem);
                        }
                        this.log(`📦 Added ${item.name} to inventory.`, "#4dff8a");
                    } else {
                        this.log(`❌ Unknown item: ${arg}`, "#ff3c82");
                    }
                } else {
                    this.log("Usage: give <itemId>  (e.g. give maki_platter)", "#ff3c82");
                }
                break;

            // === Direct actions ===
            case "heal":
            case "fullheal":
                if (game && game.party) {
                    game.party.forEach(p => { p.hp = p.maxHp; p.mp = p.maxMp; });
                    this.log(`💚 All party fully healed.`, "#4dff8a");
                }
                break;
            case "harm":
                if (game && game.party && arg) {
                    const amt = parseInt(arg) || 0;
                    if (game.party[0]) {
                        game.party[0].hp = Math.max(0, game.party[0].hp - amt);
                        this.log(`💔 ${game.party[0].name} took ${amt} damage.`, "#ff3c82");
                    }
                }
                break;
            case "nextact":
                if (typeof game.advanceAct === "function") {
                    game.advanceAct();
                    this.log("⏭️ Advanced to next act.", "#4dff8a");
                }
                break;

            // === F1-F6 hotkey emulation (in case user types them in console) ===
            case "f1": this.toggle("godMode", "God Mode", "🛡️"); break;
            case "f2": this.toggle("oneHitKO", "One-Hit KO", "⚔️"); break;
            case "f3": this.toggle("maxStats", "Max Stats", "💪"); break;
            case "f4":
                const speeds = [1, 2, 5];
                const cur = speeds.indexOf(CHEATS.speedBoost);
                CHEATS.speedBoost = speeds[(cur + 1) % speeds.length];
                this.log(`🏃 Speed: ${CHEATS.speedBoost}x`, "#4dff8a");
                break;
            case "f5": this.toggle("showHitboxes", "Show Hitboxes", "📐"); break;
            case "f6": this.toggle("showCoords", "Show Coordinates", "📍"); break;

            default:
                this.log(`❌ Unknown code: "${code}". Type "help" for list.`, "#ff3c82");
        }
    },

    toggle(key, label, emoji) {
        CHEATS[key] = !CHEATS[key];
        const state = CHEATS[key] ? "ON" : "OFF";
        const color = CHEATS[key] ? "#4dff8a" : "#8a81b3";
        this.log(`${emoji} ${label}: ${state}`, color);
    }
};
window.DEV_CONSOLE = DEV_CONSOLE;


// ============================================================================
// HOTKEY HANDLER — F1–F6 + backtick
// ============================================================================
function setupCheatHotkeys() {
    if (!CHEATS.enabled) return;
    window.addEventListener("keydown", (e) => {
        // Don't trigger when typing in input fields (except the dev console itself)
        if (e.target.tagName === "INPUT" && e.target.id !== "dev-console-input") return;

        const key = e.key.toLowerCase();

        // Backtick → toggle dev console
        if (key === "`") {
            e.preventDefault();
            DEV_CONSOLE.toggle();
            return;
        }

        // F1–F6 hotkeys
        if (key.startsWith("f") && key.length <= 3 && /^f\d+$/.test(key)) {
            e.preventDefault();
            DEV_CONSOLE.execute(key);  // route through the same handler
            return;
        }
    });
}
window.setupCheatHotkeys = setupCheatHotkeys;


// ============================================================================
// DEV MENU (in main menu) — visible only when CHEATS.enabled
// ============================================================================
const DEV_MENU = {
    el: null,
    isOpen: false,

    init() {
        if (!CHEATS.enabled) return;
        // The main menu is index.html's #menu-state.
        // We add a dev button to it and a hidden panel.
        const menuState = document.getElementById("menu-state");
        if (!menuState) return;

        // Add the "🛠️ DEV TOOLS" button (after Delete Save)
        const deleteSaveBtn = document.getElementById("delete-save-btn");
        if (deleteSaveBtn) {
            const devBtn = document.createElement("button");
            devBtn.id = "dev-menu-btn";
            devBtn.className = "menu-btn";
            devBtn.style.cssText = "margin-top:15px; font-size:10px; padding:8px 16px; background-color:#ffd700; color:#000; border-color:#ffd700;";
            devBtn.textContent = "🛠️ DEV TOOLS";
            devBtn.addEventListener("click", () => this.toggle());
            // Insert after the delete-save button
            deleteSaveBtn.parentNode.insertBefore(devBtn, deleteSaveBtn.nextSibling);
        }

        // Create the dev panel
        const panel = document.createElement("div");
        panel.id = "dev-panel";
        panel.className = "dev-panel-hidden";
        panel.innerHTML = `
            <div class="dev-panel-header">
                <h2 class="dev-panel-title">🛠️ DEV TOOLS</h2>
                <button class="dev-panel-close" id="dev-panel-close">✕</button>
            </div>
            <div class="dev-panel-body">
                <div class="dev-section">
                    <h3>⚔️ Combat</h3>
                    <label><input type="checkbox" data-cheat="godMode"> 🛡️ God Mode</label>
                    <label><input type="checkbox" data-cheat="oneHitKO"> ⚔️ One-Hit KO</label>
                    <label><input type="checkbox" data-cheat="infiniteMP"> ✨ Infinite MP</label>
                    <label><input type="checkbox" data-cheat="perfectTiming"> 🎯 Perfect Timing</label>
                    <label><input type="checkbox" data-cheat="pacifyAll"> 🕊️ Pacify All Bosses</label>
                </div>
                <div class="dev-section">
                    <h3>🎒 Player</h3>
                    <label><input type="checkbox" data-cheat="maxStats"> 💪 Max Stats (auto-heal)</label>
                    <label><input type="checkbox" data-cheat="infiniteItems"> 🎒 Infinite Items</label>
                    <label><input type="checkbox" data-cheat="autoRecruitBoss"> 👥 Auto-Recruit Bosses</label>
                    <button class="dev-action-btn" data-action="heal">💚 Full Heal Party</button>
                </div>
                <div class="dev-section">
                    <h3>🗺️ Exploration</h3>
                    <label><input type="checkbox" data-cheat="noClip"> 🪽 No-Clip (walk through walls)</label>
                    <label><input type="checkbox" data-cheat="revealAll"> 🔍 Reveal All Triggers</label>
                    <label><input type="checkbox" data-cheat="showHitboxes"> 📐 Show Hitboxes</label>
                    <label><input type="checkbox" data-cheat="showCoords"> 📍 Show Coordinates</label>
                    <label>Speed: <select data-cheat="speedBoost">
                        <option value="1">1x</option>
                        <option value="2">2x</option>
                        <option value="5">5x</option>
                    </select></label>
                    <label>Slow-Mo: <select data-cheat="slowMotion">
                        <option value="1">1x</option>
                        <option value="0.5">0.5x</option>
                        <option value="0.25">0.25x</option>
                    </select></label>
                </div>
                <div class="dev-section">
                    <h3>🎬 Story</h3>
                    <label><input type="checkbox" data-cheat="unlockAllActs"> 🚪 Unlock All Acts</label>
                    <label><input type="checkbox" data-cheat="pacifistRun"> 🕊️ Pacifist Run</label>
                    <button class="dev-action-btn" data-action="nextact">⏭️ Skip to Next Act</button>
                </div>
                <div class="dev-section">
                    <h3>⚡ Bulk Actions</h3>
                    <button class="dev-action-btn" data-action="allcheats">🔥 Enable ALL Cheats</button>
                    <button class="dev-action-btn" data-action="nocheats">❌ Disable ALL Cheats</button>
                </div>
                <div class="dev-section dev-hint">
                    <p>💡 <strong>Hotkeys:</strong> F1–F8 toggle cheats</p>
                    <p>💡 <strong>Console:</strong> Press <code>`+"`"+`</code> to type codes (try "help")</p>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
        this.el = panel;

        // Wire up checkboxes
        panel.querySelectorAll("input[type=checkbox][data-cheat]").forEach(cb => {
            const key = cb.dataset.cheat;
            cb.checked = !!CHEATS[key];
            cb.addEventListener("change", () => {
                CHEATS[key] = cb.checked;
            });
        });

        // Wire up selects
        panel.querySelectorAll("select[data-cheat]").forEach(sel => {
            const key = sel.dataset.cheat;
            sel.value = String(CHEATS[key]);
            sel.addEventListener("change", () => {
                CHEATS[key] = (key === "speedBoost") ? parseInt(sel.value) : parseFloat(sel.value);
            });
        });

        // Wire up action buttons
        panel.querySelectorAll(".dev-action-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const action = btn.dataset.action;
                // Route through the dev console for consistency
                if (action === "allcheats") DEV_CONSOLE.execute("allcheats");
                else if (action === "nocheats") DEV_CONSOLE.execute("nocheats");
                else if (action === "heal") DEV_CONSOLE.execute("heal");
                else if (action === "nextact") DEV_CONSOLE.execute("nextact");
            });
        });

        // Close button
        const closeBtn = document.getElementById("dev-panel-close");
        if (closeBtn) closeBtn.addEventListener("click", () => this.hide());
    },

    toggle() {
        if (this.isOpen) this.hide();
        else this.show();
    },

    show() {
        if (!this.el) return;
        this.el.classList.remove("dev-panel-hidden");
        this.el.classList.add("dev-panel-open");
        this.isOpen = true;
    },

    hide() {
        if (!this.el) return;
        this.el.classList.add("dev-panel-hidden");
        this.el.classList.remove("dev-panel-open");
        this.isOpen = false;
    }
};
window.DEV_MENU = DEV_MENU;


// ============================================================================
// INIT — called on DOMContentLoaded
// ============================================================================
window.addEventListener("DOMContentLoaded", () => {
    if (!CHEATS.enabled) {
        console.log("[BattleIQ:Debug] Cheats DISABLED. Set CHEATS.enabled = true in src/debug.js to enable.");
        return;
    }
    console.log("[BattleIQ:Debug] Cheats ENABLED. Press ` for dev console, F1–F8 for hotkeys.");
    DEV_CONSOLE.init();
    setupCheatHotkeys();
    DEV_MENU.init();
});


// ============================================================================
// HUD OVERLAY — show coords / hitboxes / slow-mo state
// ============================================================================
const DEBUG_HUD = {
    el: null,

    init() {
        if (!CHEATS.enabled) return;
        const el = document.createElement("div");
        el.id = "debug-hud";
        el.className = "debug-hud-hidden";
        document.body.appendChild(el);
        this.el = el;
    },

    update() {
        if (!CHEATS.enabled || !this.el) return;

        // Show if any viz cheat is on
        const show = CHEATS.showCoords || CHEATS.showHitboxes;
        if (show) {
            this.el.classList.remove("debug-hud-hidden");
            const lines = [];

            if (CHEATS.showCoords) {
                const player = (game && game.party && game.party[0]) ? game.party[0].name : "none";
                const px = (typeof overworld !== "undefined" && overworld.playerX !== undefined) ? `${overworld.playerX},${overworld.playerY}` : "?";
                const state = (typeof game !== "undefined" && game.currentState) ? game.currentState : "?";
                const act = (typeof game !== "undefined" && game.currentActIndex !== undefined) ? `Act ${game.currentActIndex + 1}` : "?";
                lines.push(`📍 ${px} | ${state} | ${act}`);
                lines.push(`👤 ${player}`);
            }

            if (CHEATS.showHitboxes) {
                lines.push("📐 HITBOXES ON");
            }

            if (CHEATS.speedBoost !== 1) {
                lines.push(`🏃 ${CHEATS.speedBoost}x`);
            }

            this.el.innerHTML = lines.map(l => `<div>${l}</div>`).join("");
        } else {
            this.el.classList.add("debug-hud-hidden");
        }
    }
};
window.DEBUG_HUD = DEBUG_HUD;


// Init the debug HUD on DOMContentLoaded (separate from cheats, always safe to init)
window.addEventListener("DOMContentLoaded", () => {
    DEBUG_HUD.init();

    // Animation loop for the debug HUD
    function debugHudLoop() {
        DEBUG_HUD.update();
        requestAnimationFrame(debugHudLoop);
    }
    requestAnimationFrame(debugHudLoop);
});

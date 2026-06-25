 /**
 * BattleIQ: The Rockville Chronicles - Custom Turn-Based Battle Controller
 * Handles Fight/Act/Item menus, rolling health cards, dialog trees, and Undertale transition sequences.
 */

class BattleController {
    constructor() {
        this.activeEnemy = null;
        this.activeEnemyId = "";
        this.partyIndex = 0; // Index of character taking their menu action
        this.currentActor = 0; // Index of the party member currently acting

        this.menuPath = "main"; // "main", "act", "item"
        this.selectedBtnIndex = 0;
        this.subSelectedBtnIndex = 0;

        this.isSelectingAction = false;
        this.isProcessing = false; // Guard against rapid-fire bullet hell stacking

        // Combo system (tracks action history for bonus damage)
        this.actionHistory = []; // Most recent N actions: "FIGHT", "ACT", "ITEM", "SPARE"
        this.comboMultiplier = 1.0;

        // Eric-specific pattern cycling
        this.ericPatternIndex = 0;

        // Turn counter & visual cues
        this.turnCount = 1;
        this.totalTurnsEstimate = 5; // rough estimate for display
        this.rollingHp = []; // Earthbound-style rolling HP meter

        // ============================================================================
        // TIMING ATTACK MECHANIC
        // ============================================================================
        this.timingAttackActive = false;
        this.timingBarPosition = 0; // 0-1 (left to right of bar)
        this.timingBarDirection = 1; // 1 = right, -1 = left
        this.timingBarSpeed = 0.012; // 0.012 per frame = ~1.4 cycles per second
        this.timingAnimFrame = 0;
        this.timingAnimTimer = null;
        this.timingTimeoutId = null;
    }





    startBattle(enemyId) {
        // 2026-06-11 FIX: Reset ALL battle UI state BEFORE the new battle begins.
        // This clears leftover popups, action history, submenus, timing bars, etc.
        // from the previous fight so the new battle starts clean.
        this.resetBattleUI();

        // 2026-06-11: CHEAT — autoRecruitBoss skips the entire battle and
        // immediately wins + auto-recruits. Useful for skipping boss battles
        // during dev testing.
        if (typeof CHEATS !== "undefined" && CHEATS.enabled && CHEATS.autoRecruitBoss) {
            const memberId = GAME_DATA.ENEMIES[enemyId]?.memberId;
            const isFinal = (game.currentActIndex === 3);
            setTimeout(() => {
                if (isFinal) { game.showVictoryScreen(); return; }
                game.advanceAct();
                if (memberId && GAME_DATA.PLAYERS[memberId] && game.recruitMember) {
                    setTimeout(() => game.recruitMember(memberId), 200);
                }
            }, 100);
            return;
        }

        this.activeEnemyId = enemyId;
        this.activeEnemy = JSON.parse(JSON.stringify(GAME_DATA.ENEMIES[enemyId]));
        this.partyIndex = 0;
        this.currentActor = 0; // 2026-06-11: New - tracks who is acting
        this.hypeMeter = 0;
        this.enemyPacified = false;
        this.turnCount = 1;
        // Initialize rolling HP display to actual HP
        this.rollingHp = game.party.map(pm => pm.hp);

        const partyState = (game.party || []).map(p => `${p.name}(${p.hp}/${p.maxHp})`).join(", ");
        console.log(`[BattleIQ:Battle] Start vs "${this.activeEnemy.name}" (HP ${this.activeEnemy.hp}/${this.activeEnemy.maxHp}, ATK ${this.activeEnemy.atk}). Act ${game.currentActIndex}. Party: [${partyState}] (${game.party.length})`);

        game.changeState("battle");


        // Apply theme-tinted background per boss
        this.applyBattleThemeTint();

        // Set Enemy Display parameters
        document.getElementById("enemy-name").innerText = this.activeEnemy.name;
        document.getElementById("enemy-mood").innerText = "MOOD: " + this.activeEnemy.mood;
        this.updateTurnCounter();

        // Defer visual setup to the helper method
        this.startBattleSetup();
        this.updateActiveMemberIndicator();
    }

    // ============================================================================
    // 2026-06-11: Reset ALL battle UI state.
    // Called at the start of EVERY new battle to prevent leftover remnants
    // (popups, action history, submenus, timing bar, etc.) from the previous
    // fight from muddying the new battle's UI.
    // ============================================================================
    resetBattleUI() {
        // Clear the battle narrative / log
        const narrative = document.getElementById("battle-narrative");
        if (narrative) narrative.innerText = "";

        // Hide any open submenus
        const actSub = document.getElementById("act-submenu");
        if (actSub) actSub.classList.add("hidden");
        const itemSub = document.getElementById("item-submenu");
        if (itemSub) itemSub.classList.add("hidden");
        const mainMenu = document.getElementById("main-battle-menu");
        if (mainMenu) mainMenu.classList.remove("hidden");

        // Hide timing bar + result
        const timingBar = document.getElementById("timing-bar-container");
        if (timingBar) timingBar.classList.add("hidden");
        const timingResult = document.getElementById("timing-result");
        if (timingResult) {
            timingResult.classList.add("hidden");
            timingResult.innerText = "";
        }

        // Clear any leftover damage popups and combo popups
        document.querySelectorAll(".damage-pop, .combo-popup").forEach(el => el.remove());

        // Stop any in-flight bullet hell
        if (this.bulletHellSafetyTimer) {
            clearTimeout(this.bulletHellSafetyTimer);
            this.bulletHellSafetyTimer = null;
        }
        if (bulletHell) bulletHell.stop();

        // Reset the combo / action history (so the new fight starts fresh)
        this.actionHistory = [];
        this.comboMultiplier = 1.0;
        this.timingAttackActive = false;
        this.timingBarPosition = 0;
        this.timingBarDirection = 1;
        if (this._timingRafId) {
            cancelAnimationFrame(this._timingRafId);
            this._timingRafId = null;
        }
        if (this.timingTimeoutId) {
            clearTimeout(this.timingTimeoutId);
            this.timingTimeoutId = null;
        }

        // Reset ephemeral battle state
        this.enemyPacified = false;
        this.isProcessing = false;
        this.isSelectingAction = false;
        this.menuPath = "main";
        this.selectedBtnIndex = 0;
        this.subSelectedBtnIndex = 0;

        // Reset screen shake
        const screen = document.getElementById("screen-container");
        if (screen) screen.classList.remove("shake");

        // Reset arena border color (red -> white)
        const arena = document.getElementById("arena-container");
        if (arena) arena.style.borderColor = "#ffffff";

        console.log("[BattleIQ:Reset] Battle UI fully reset (popups cleared, action history reset, timing bar hidden, submenus hidden, bullet hell stopped).");
    }



    // ============================================================================
    // ACTIVE MEMBER INDICATOR
    // Shows "▶ [Member]'s Turn" above the FIGHT menu
    // ============================================================================
    updateActiveMemberIndicator() {
        const ind = document.getElementById("active-member-indicator");
        if (!ind) return;
        if (!game.party[this.currentActor]) {
            ind.innerText = "";
            return;
        }
        const actor = game.party[this.currentActor];
        const isFainted = actor.hp <= 0;
        const label = isFainted ? "FAINTED" : "Turn";
        ind.innerText = `▶ ${actor.name}'s ${label}`;
        ind.style.color = isFainted ? "#ff004c" : (actor.color || "#4df3ff");
    }


    // ============================================================================
    // SWITCH PARTY MEMBER
    // Rotates currentActor to the next LIVING party member
    // ============================================================================
    switchActiveMember() {
        if (!game.party || game.party.length === 0) return null;
        const startIdx = this.currentActor;
        let nextIdx = (this.currentActor + 1) % game.party.length;
        let safety = 0;
        // Find next living member (skip fainted)
        while (game.party[nextIdx].hp <= 0 && nextIdx !== startIdx && safety < game.party.length) {
            nextIdx = (nextIdx + 1) % game.party.length;
            safety++;
        }
        if (game.party[nextIdx].hp <= 0) {
            this.logMessage("All party members are fainted! Defeat is inevitable...");
            return null;
        }
        this.currentActor = nextIdx;
        this.partyIndex = nextIdx;
        const newActor = game.party[nextIdx];
        console.log(`[BattleIQ:Switch] Switched to "${newActor.name}" (HP ${newActor.hp}/${newActor.maxHp}, ATK ${newActor.atk}). Inventory: [${(newActor.inventory || []).join(", ")}]`);
        this.logMessage(`→ Switched to ${newActor.name}'s turn!`);
        game.showToast(`→ ${newActor.name}'s Turn`);
        this.updateActiveMemberIndicator();
        return newActor;
    }



    applyBattleThemeTint() {
        const bgEl = document.querySelector(".battle-background");
        if (!bgEl) return;
        const tints = {
            jacob: "linear-gradient(45deg, #3a1a1a 25%, #15050d 25%, #15050d 50%, #3a1a1a 50%, #3a1a1a 75%, #15050d 75%, #15050d 100%)",
            hedgecock_boss: "linear-gradient(45deg, #1a2a4a 25%, #05081a 25%, #05081a 50%, #1a2a4a 50%, #1a2a4a 75%, #05081a 75%, #05081a 100%)",
            eric: "linear-gradient(45deg, #4a3a1a 25%, #1a1505 25%, #1a1505 50%, #4a3a1a 50%, #4a3a1a 75%, #1a1505 75%, #1a1505 100%)",
            // 2026-06-11: Maharko's tint uses her signature gold/yellow chain colors
            maharko_boss: "linear-gradient(45deg, #4a4a1a 25%, #1a1a05 25%, #1a1a05 50%, #4a4a1a 50%, #4a4a1a 75%, #1a1a05 75%, #1a1a05 100%)",
            ben: "linear-gradient(45deg, #2a0a1a 25%, #05000d 25%, #05000d 50%, #2a0a1a 50%, #2a0a1a 75%, #05000d 75%, #05000d 100%)"
        };
        if (tints[this.activeEnemyId]) {
            bgEl.style.background = tints[this.activeEnemyId];
        }
    }

    updateTurnCounter() {
        const moodEl = document.getElementById("enemy-mood");
        if (moodEl) {
            moodEl.innerHTML = `MOOD: ${this.activeEnemy.mood} &nbsp;|&nbsp; TURN ${this.turnCount}`;
        }
    }

    startBattleSetup() {
        // Hide the legacy emoji sprite, use canvas instead
        const spriteEl = document.getElementById("enemy-sprite");
        spriteEl.innerText = "";
        spriteEl.style.fontSize = "0px";

        // Establish canvas drawing for the HD enemy sprite (sized to fit 120x110 container)
        this.battleCanvas = document.getElementById("battle-state");
        this.enemyCanvas = document.createElement("canvas");
        this.enemyCanvas.width = 100;
        this.enemyCanvas.height = 80;
        this.enemyCanvas.style.position = "absolute";
        this.enemyCanvas.style.left = "50%";
        this.enemyCanvas.style.top = "8px";
        this.enemyCanvas.style.transform = "translateX(-50%)";
        this.enemyCanvas.style.imageRendering = "pixelated";
        this.enemyCanvas.style.pointerEvents = "none";
        const spriteContainer = document.querySelector(".enemy-sprite-container");
        if (spriteContainer) {
            spriteContainer.appendChild(this.enemyCanvas);
        }
        this.enemyCtx = this.enemyCanvas.getContext("2d");

        // Initialize enemy HP bar to 100%
        this.updateEnemyHpBar();

        // CRITICAL: Reset all battle state for the new fight.
        // Without this, isProcessing can be stuck at `true` from the previous
        // battle's last FIGHT action, blocking the first FIGHT in the new battle.
        this.isSelectingAction = true;
        this.isProcessing = false;
        this.menuPath = "main";
        this.selectedBtnIndex = 0;
        this.subSelectedBtnIndex = 0;
        this.bulletHellSafetyTimer = null;

        this.updatePartyUI();
        this.drawEnemySprite();
        this.logMessage("An angry " + this.activeEnemy.name + " blocked your message! Choose your move!");
        this.refreshMenuSelection();
    }


    updateEnemyHpBar() {
        const hpBar = document.getElementById("enemy-hp-bar");
        if (!hpBar || !this.activeEnemy) return;
        const pct = Math.max(0, Math.min(100, (this.activeEnemy.hp / this.activeEnemy.maxHp) * 100));
        hpBar.style.width = pct + "%";
    }



    drawEnemySprite() {
        if (!this.enemyCtx) return;
        const ctx = this.enemyCtx;
        // Clear within proper canvas bounds (100x80)
        ctx.clearRect(0, 0, this.enemyCanvas.width, this.enemyCanvas.height);
        pixelArt.ctx = ctx; // Inject context

        // Bobbing animation offset
        const wobble = Math.floor(pixelArt.animFrame / 8) % 2 === 0 ? 0 : 2;

        // Scale 2 (smaller for the 100x80 canvas). The sprite is ~32x32 internally.
        // For a 64x64 sprite, place it at (18, wobble+2) to be centered
        const scale = 2;
        const xOff = 18;
        const yOff = wobble + 2;
        switch (this.activeEnemyId) {
            case "jacob":
                pixelArt.drawJacobCow(xOff, yOff, scale, false);
                break;
            case "hedgecock_boss":
                pixelArt.drawNickHedgecock(xOff, yOff, scale, false);
                break;
            case "eric":
                pixelArt.drawEric(xOff, yOff, scale, false);
                break;
            // 2026-06-11: Maharko boss now has a proper sprite render. Previously
            // fell through to the generic white rectangle which looked broken.
            case "maharko_boss":
                pixelArt.drawMaharko(xOff, yOff, scale, false);
                break;
            case "ben":
                pixelArt.drawBenBersofsky(xOff, yOff - 2, scale);
                break;
            default:
                // Generic enemy
                ctx.fillStyle = "#ff3c82";
                ctx.fillRect(40, 20, 20, 30);
        }
        pixelArt.animFrame++; // Advance animation
    }


    logMessage(text) {
        document.getElementById("battle-narrative").innerText = text;
    }

    updatePartyUI() {
        const container = document.getElementById("party-container");
        container.innerHTML = "";

        game.party.forEach(pm => {
            const card = document.createElement("div");
            card.className = "party-member-card";
            if (pm.hp <= 0) card.classList.add("fainted");
            // 2026-06-11: Show 🔒 icon for locked members (prevents auto-remove)
            const lockIcon = pm.locked ? " 🔒" : "";
            // Highlight the active member
            const isActive = (game.party.indexOf(pm) === this.currentActor);
            if (isActive) card.classList.add("active");

            // Securely create elements to prevent XSS from unescaped party member names
            const nameDiv = document.createElement("div");
            nameDiv.className = "pm-name";
            nameDiv.textContent = pm.name + lockIcon; // textContent automatically escapes HTML

            const hpRow = document.createElement("div");
            hpRow.className = "pm-hp-row";
            // Safe to use innerHTML here because hp and maxHp are strictly numeric
            hpRow.innerHTML = `
                <span class="pm-hp-label">HP</span>
                <span class="pm-hp">${pm.hp}/${pm.maxHp}</span>
            `;

            const hpBarBg = document.createElement("div");
            hpBarBg.className = "pm-hp-bar-bg";
            const hpBar = document.createElement("div");
            hpBar.className = "pm-hp-bar " + (pm.hp < pm.maxHp * 0.3 ? "low" : "");
            hpBar.style.width = `${(pm.hp / pm.maxHp) * 100}%`;
            hpBarBg.appendChild(hpBar);

            card.appendChild(nameDiv);
            card.appendChild(hpRow);
            card.appendChild(hpBarBg);
            
            container.appendChild(card);
        });
    }

    // 2026-06-11: Toggle the lock on the CURRENTLY ACTIVE party member.
    // Locked members can't be auto-removed when the party is full.
    toggleActiveMemberLock() {
        const pm = game.party[this.currentActor];
        if (!pm) return;
        pm.locked = !pm.locked;
        console.log(`[BattleIQ:Lock] Toggled lock on "${pm.name}": ${pm.locked ? "LOCKED 🔒" : "UNLOCKED 🔓"}`);
        this.logMessage(`${pm.name} is now ${pm.locked ? "LOCKED 🔒" : "UNLOCKED 🔓"} (won't be auto-removed).`);
        if (game.showToast) {
            game.showToast(`${pm.name}: ${pm.locked ? "🔒 LOCKED" : "🔓 UNLOCKED"}`);
        }
        if (audio && audio.playSelect) audio.playSelect();
        this.updatePartyUI();
    }


    handleInput(e) {
        const key = e.key.toLowerCase();

        // FILTER: Ignore modifier keys (Meta, Control, Alt, Shift) and other
        // system keys that would otherwise spam the log and trigger nothing.
        if (key === "meta" || key === "control" || key === "alt" || key === "shift" || key === "capslock" || key === "tab") {
            return;
        }

        // ============================================================================
        // TIMING ATTACK: SPACE/ENTER stops the cursor and computes damage
        // ============================================================================
        if (this.timingAttackActive && (key === " " || key === "spacebar" || key === "enter")) {
            e.preventDefault();
            console.log("[BattleIQ:Timing] Player pressed SPACE to stop the cursor.");
            this.resolveTimingAttack();
            return;
        }

        // Throttled log: only when key changes from previous
        if (key !== this._lastInputKey) {
            this._lastInputKey = key;
            console.log(`[BattleIQ:Input] key=${key} | isSelectingAction=${this.isSelectingAction} | menuPath=${this.menuPath}`);
        }

        if (this.isSelectingAction) {
            if (this.menuPath === "main") {
                this.handleMainInput(key, e);
            } else {
                this.handleSubInput(key, e);
            }
        }
    }



    handleMainInput(key, e) {
        const buttons = document.querySelectorAll("#main-battle-menu .battle-btn");
        // DIAGNOSTIC: Alert if main menu has 0 buttons (UI bug indicator)
        if (buttons.length === 0) {
            console.warn(`[BattleIQ:Input] handleMainInput called but found 0 buttons. main-battle-menu may be hidden.`);
        }

        if (key === "a" || key === "arrowleft") {
            e.preventDefault();
            this.selectedBtnIndex = (this.selectedBtnIndex - 1 + buttons.length) % buttons.length;
            audio.playSelect();
        } else if (key === "d" || key === "arrowright") {
            e.preventDefault();
            this.selectedBtnIndex = (this.selectedBtnIndex + 1) % buttons.length;
            audio.playSelect();
        } else if (key === "enter" || key === " " || key === "spacebar") {
            e.preventDefault();
            this.executeMenuSelection(buttons[this.selectedBtnIndex].getAttribute("data-option"));
        } else if (key === "l") {
            // 2026-06-11: L toggles the lock on the currently active party member.
            // Locked members cannot be auto-removed when the party is full.
            e.preventDefault();
            this.toggleActiveMemberLock();
        }

        this.refreshMenuSelection();
    }



    refreshMenuSelection() {
        const buttons = document.querySelectorAll("#main-battle-menu .battle-btn");
        buttons.forEach((btn, idx) => {
            if (idx === this.selectedBtnIndex) {
                btn.classList.add("selected");
            } else {
                btn.classList.remove("selected");
            }
        });
    }

    handleSubInput(key, e) {
        const subId = this.menuPath === "act" ? "act-submenu" : "item-submenu";
        const buttons = document.querySelectorAll(`#${subId} .sub-btn`);
        if (buttons.length === 0) return;

        if (key === "w" || key === "arrowup") {
            e.preventDefault();
            this.subSelectedBtnIndex = (this.subSelectedBtnIndex - 1 + buttons.length) % buttons.length;
            audio.playSelect();
        } else if (key === "s" || key === "arrowdown") {
            e.preventDefault();
            this.subSelectedBtnIndex = (this.subSelectedBtnIndex + 1) % buttons.length;
            audio.playSelect();
        } else if (key === "escape" || key === "backspace") {
            e.preventDefault();
            this.closeSubmenus();
        } else if (key === "enter" || key === " " || key === "spacebar") {
            e.preventDefault();
            const btn = buttons[this.subSelectedBtnIndex];
            if (this.menuPath === "act") {
                this.executeAct(btn.getAttribute("data-id"));
            } else {
                this.executeItem(btn.getAttribute("data-id"));
            }
        }

        this.refreshSubMenuSelection(subId);
    }

    refreshSubMenuSelection(subId) {
        const buttons = document.querySelectorAll(`#${subId} .sub-btn`);
        buttons.forEach((btn, idx) => {
            if (idx === this.subSelectedBtnIndex) {
                btn.classList.add("selected");
            } else {
                btn.classList.remove("selected");
            }
        });
    }

    closeSubmenus() {
        const before = this.menuPath;
        this.menuPath = "main";
        document.getElementById("act-submenu").classList.add("hidden");
        document.getElementById("item-submenu").classList.add("hidden");
        document.getElementById("main-battle-menu").classList.remove("hidden");
        if (typeof controlsHUD !== "undefined" && controlsHUD) {
            controlsHUD.updateControls("battle", "main");
        }
        audio.playSelect();
        if (before !== "main") console.log(`[BattleIQ:Menu] ${before} → main (closed submenu)`);
    }



    executeMenuSelection(option) {
        console.log(`[BattleIQ:Input] executeMenuSelection option=${option} | isProcessing=${this.isProcessing}`);

        // Guard against rapid-fire stacking: if we're already processing, ignore
        if (this.isProcessing) {
            console.warn(`[BattleIQ:Input] BLOCKED by isProcessing guard. option=${option} ignored.`);
            audio.playSelect();
            return;
        }

        audio.playSelect();

        if (option === "fight") {
            this.isProcessing = true;
            // Record action for combo tracking
            this.recordAction("FIGHT");
            // Calculate combo multiplier
            this.comboMultiplier = this.calculateComboMultiplier();
            // === TIMING ATTACK MECHANIC ===
            // Hide main menu, show timing bar, let player time their press
            this.startTimingAttack();
        } else if (option === "act") {
            this.openActMenu();
        } else if (option === "item") {
            this.openItemMenu();
        } else if (option === "spare") {
            // Record action for combo tracking
            this.recordAction("SPARE");
            // 2026-06-11: CHEAT — Pacify All Bosses lets you SPARE on first try
            if (typeof CHEATS !== "undefined" && CHEATS.enabled && CHEATS.pacifyAll) {
                this.enemyPacified = true;
            }
            // Verify if pacified / de-gaslit
            if (this.activeEnemy.hp <= this.activeEnemy.maxHp * 0.3 || this.enemyPacified) {
                // 2026-06-11: Pass wasSpared=true so game.sparedBosses is updated
                // for the True Pacifist ending check.
                this.winBattle("You successfully de-gaslit " + this.activeEnemy.name + "! He unblocked the GC!", true);
            } else {
                this.isProcessing = true;
                this.logMessage(this.activeEnemy.name + " is still too Volatile or Stubborn to be spared!");
                setTimeout(() => this.triggerEnemyTurn(), 1500);
            }
        } else if (option === "switch") {
            // 2026-06-11: SWITCH to next living party member
            this.switchActiveMember();
            this.refreshMenuSelection();
        } else {
            console.warn(`[BattleIQ:Input] executeMenuSelection called with UNKNOWN option="${option}"`);
        }
    }


    // ============================================================================
    // TIMING ATTACK SYSTEM
    // ============================================================================
    // The cursor bounces left↔right across a 5-zone bar. Player presses SPACE
    // to stop it. Multiplier zones:
    //   0-15%  = MISS (0.5x damage)
    //   15-40% = OK   (1.0x damage)
    //   40-65% = GOOD (1.5x damage)
    //   65-85% = GREAT(2.0x damage)
    //   85-100%= PERFECT (3.0x damage)
    // Auto-stops after 4 seconds if player doesn't press.
    // ============================================================================
    startTimingAttack() {
        this.timingAttackActive = true;
        this.timingBarPosition = 0;
        this.timingBarDirection = 1;
        // 2026-06-11: Increased from 0.018 (~0.9 cycles/sec) to 0.028 (~1.4 cycles/sec)
        // Makes PERFECT timing more skill-based and reduces how easy damage bonuses are
        this.timingBarSpeed = 0.028;
        // 2026-06-11: CHEAT — Perfect Timing skips the bar entirely, auto-resolves
        if (typeof CHEATS !== "undefined" && CHEATS.enabled && CHEATS.perfectTiming) {
            this.timingBarPosition = 1.0;  // force to PERFECT zone (0.92-1.0)
        }
        this.timingAnimFrame = 0;


        // Hide main menu, show timing bar
        document.getElementById("main-battle-menu").classList.add("hidden");
        document.getElementById("timing-bar-container").classList.remove("hidden");
        document.getElementById("timing-result").classList.add("hidden");
        document.getElementById("timing-result").innerText = "";
        document.getElementById("timing-result").className = "timing-result hidden";

        // Disable global input from overworld/battle during timing
        this.isSelectingAction = false;
        // (the timing loop polls directly and triggers SPACE handler)

        // Start the animation loop
        const tick = () => {
            if (!this.timingAttackActive) return;
            this.timingBarPosition += this.timingBarSpeed * this.timingBarDirection;
            if (this.timingBarPosition >= 1) {
                this.timingBarPosition = 1;
                this.timingBarDirection = -1;
            } else if (this.timingBarPosition <= 0) {
                this.timingBarPosition = 0;
                this.timingBarDirection = 1;
            }
            this.drawTimingBar();
            this.timingAnimFrame++;
            this._timingRafId = requestAnimationFrame(tick);
        };
        this._timingRafId = requestAnimationFrame(tick);

        // Auto-stop after 4 seconds if player doesn't press
        if (this.timingTimeoutId) clearTimeout(this.timingTimeoutId);
        this.timingTimeoutId = setTimeout(() => {
            if (this.timingAttackActive) {
                console.log("[BattleIQ:Timing] Auto-stopped (timeout).");
                this.resolveTimingAttack();
            }
        }, 4000);
    }

    // Draw the timing bar to the canvas
    drawTimingBar() {
        const canvas = document.getElementById("timing-bar-canvas");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const W = canvas.width;
        const H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        // 2026-06-11: PERFECT zone shrunk from 15% (0.85-1.0) to 8% (0.92-1.0).
        // This makes PERFECT criticals genuinely skill-based instead of easy.
        // Zones are also slightly nerfed: GOOD 25%→22%, GREAT 20%→20%, OK 25%→25%, MISS 15%→25%.
        const zones = [
            { x: 0,    w: 0.25, color: "#ff004c", label: "MISS" },
            { x: 0.25, w: 0.25, color: "#8a81b3", label: "OK" },
            { x: 0.50, w: 0.22, color: "#4df3ff", label: "GOOD" },
            { x: 0.72, w: 0.20, color: "#4dff8a", label: "GREAT" },
            { x: 0.92, w: 0.08, color: "#ffd700", label: "PERFECT" }
        ];

        for (const z of zones) {
            ctx.fillStyle = z.color;
            ctx.globalAlpha = 0.35;
            ctx.fillRect(z.x * W, 5, z.w * W, H - 10);
            ctx.globalAlpha = 1.0;

            // Zone label
            ctx.fillStyle = "#ffffff";
            ctx.font = "8px 'Press Start 2P', monospace";
            ctx.textAlign = "center";
            ctx.fillText(z.label, (z.x + z.w / 2) * W, H - 4);
        }

        // Draw zone borders
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        for (const z of zones) {
            const lineX = (z.x + z.w) * W;
            ctx.beginPath();
            ctx.moveTo(lineX, 0);
            ctx.lineTo(lineX, H);
            ctx.stroke();
        }

        // Draw the cursor (vertical line)
        const cursorX = this.timingBarPosition * W;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cursorX, 0);
        ctx.lineTo(cursorX, H);
        ctx.stroke();
        // Glow effect
        ctx.shadowColor = "#ff3c82";
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // Called when the player presses SPACE during the timing attack
    // (or the auto-timeout fires)
    resolveTimingAttack() {
        if (!this.timingAttackActive) return;
        this.timingAttackActive = false;
        if (this.timingTimeoutId) {
            clearTimeout(this.timingTimeoutId);
            this.timingTimeoutId = null;
        }
        if (this._timingRafId) {
            cancelAnimationFrame(this._timingRafId);
            this._timingRafId = null;
        }

        const pos = this.timingBarPosition;
        let tier, multiplier, label, cls;
        // 2026-06-11: NERFED timing multipliers + zones aligned to drawTimingBar().
        // Zones: MISS 0-25%, OK 25-50%, GOOD 50-72%, GREAT 72-92%, PERFECT 92-100% (8%).
        // Multipliers reduced across the board so even PERFECT doesn't trivialize
        // boss HP. The weakness matchup (1.5x) on the right character makes the
        // BIGGEST difference, not the timing bar.
        if (pos < 0.25) { tier = "miss"; multiplier = 0.3; label = "WHIFF!"; cls = "tier-miss"; }
        else if (pos < 0.50) { tier = "ok"; multiplier = 0.5; label = "OK"; cls = "tier-ok"; }
        else if (pos < 0.72) { tier = "good"; multiplier = 0.9; label = "GOOD!"; cls = "tier-good"; }
        else if (pos < 0.92) { tier = "great"; multiplier = 1.1; label = "GREAT!"; cls = "tier-great"; }
        else { tier = "perfect"; multiplier = 1.3; label = "★ PERFECT! ★"; cls = "tier-perfect"; }



        // Show the result
        const result = document.getElementById("timing-result");
        result.innerText = label;
        result.className = "timing-result " + cls;
        result.classList.remove("hidden");

        // Calculate damage with all multipliers
        const pm = game.party[this.currentActor];
        const baseDmg = pm.atk * (0.8 + Math.random() * 0.4);
        const timingMult = multiplier;
        const totalMult = timingMult * this.comboMultiplier;
        const dmg = Math.floor(baseDmg * totalMult);
        const comboText = this.comboMultiplier > 1.0 ? ` (\u00d7${this.comboMultiplier.toFixed(1)} COMBO!)` : "";
        const timingText = ` (${tier.toUpperCase()} \u00d7${timingMult.toFixed(1)})`;

        console.log(`[BattleIQ:Timing] Resolved: pos=${pos.toFixed(3)} tier=${tier} mult=${timingMult} baseDmg=${baseDmg.toFixed(1)} totalMult=${totalMult.toFixed(2)} finalDmg=${dmg}`);

        // Re-enable input briefly, then deal damage after result display
        setTimeout(() => {
            // Hide timing bar
            document.getElementById("timing-bar-container").classList.add("hidden");
            // Re-show main menu briefly
            this.damageEnemy(dmg, `${pm.name} (${tier.toUpperCase()}) deals ${dmg} damage!${timingText}${comboText}`);
            if (totalMult >= 1.5) this.showComboPopup(totalMult);
        }, 700);
    }



    // Record an action for combo tracking (keeps last 4 actions)
    recordAction(actionType) {
        this.actionHistory.push(actionType);
        if (this.actionHistory.length > 4) {
            this.actionHistory.shift();
        }
    }

    // 2026-06-11: NERFED combo multipliers to prevent one-shots.
    // Highest possible combo is now ~2.5x (variety x timing).
    // Original values (3.0x full combo + 3.0x timing) allowed 9x one-shots.
    calculateComboMultiplier() {
        const h = this.actionHistory;
        if (h.length === 0) return 1.0;

        // 4 different actions in a row -> FULL COMBO
        const last4 = h.slice(-4);
        const unique4 = new Set(last4);
        if (h.length >= 4 && unique4.size === 4) {
            return 1.8;
        }

        // 3 different actions in a row -> Variety Strike
        const last3 = h.slice(-3);
        const unique3 = new Set(last3);
        if (last3.length === 3 && unique3.size === 3) {
            return 1.4;
        }

        // Specific patterns
        // FIGHT -> ACT -> FIGHT = Pincer Attack
        if (last3.length === 3 && last3[0] === "FIGHT" && last3[1] === "ACT" && last3[2] === "FIGHT") {
            return 1.3;
        }
        // ACT -> FIGHT -> ACT = Mind & Body
        if (last3.length === 3 && last3[0] === "ACT" && last3[1] === "FIGHT" && last3[2] === "ACT") {
            return 1.25;
        }
        // 2 ACTs in a row = Brain Surge
        const last2 = h.slice(-2);
        if (last2.length === 2 && last2[0] === "ACT" && last2[1] === "ACT") {
            return 1.25;
        }
        // FIGHT -> ACT or ACT -> FIGHT = Mix-up
        if (last2.length === 2 &&
            ((last2[0] === "FIGHT" && last2[1] === "ACT") || (last2[0] === "ACT" && last2[1] === "FIGHT"))) {
            return 1.15;
        }
        // 3 same actions in a row = Triple Tap
        if (last3.length === 3 && last3[0] === last3[1] && last3[1] === last3[2]) {
            return 1.2;
        }
        // 2 same actions in a row = Double Tap
        if (last2.length === 2 && last2[0] === last2[1] && last2[0] !== "SPARE") {
            return 1.1;
        }
        return 1.0;
    }


    // Show a floating combo popup above the damage number
    showComboPopup(multiplier) {
        const popup = document.getElementById("damage-popup");
        if (!popup) return;
        // Create a new popup just for the combo
        const comboEl = document.createElement("div");
        comboEl.className = "combo-popup";
        let tier = "tier-1";
        let label = "\u00d7" + multiplier.toFixed(1) + " COMBO";
        if (multiplier >= 3.0) { tier = "tier-5"; label = "\u2728 FULL COMBO \u2728"; }
        else if (multiplier >= 2.0) { tier = "tier-4"; label = "\u00d7" + multiplier.toFixed(1) + " COMBO"; }
        else if (multiplier >= 1.6) { tier = "tier-3"; label = "\u00d7" + multiplier.toFixed(1) + " COMBO"; }
        else if (multiplier >= 1.25) { tier = "tier-2"; label = "\u00d7" + multiplier.toFixed(1) + " COMBO"; }
        comboEl.classList.add(tier);
        comboEl.innerText = label;
        comboEl.style.position = "absolute";
        comboEl.style.left = popup.style.left || "50%";
        comboEl.style.top = "10px";
        comboEl.style.transform = "translateX(-50%)";
        comboEl.style.zIndex = "100";
        const container = document.querySelector(".enemy-container") || document.body;
        container.appendChild(comboEl);
        setTimeout(() => { if (comboEl.parentNode) comboEl.parentNode.removeChild(comboEl); }, 1800);
    }



    openActMenu() {
        this.menuPath = "act";
        this.subSelectedBtnIndex = 0;
        if (typeof controlsHUD !== "undefined" && controlsHUD) {
            controlsHUD.updateControls("battle", "act");
        }

        const submenu = document.getElementById("act-submenu");
        submenu.innerHTML = "";
        submenu.classList.remove("hidden");
        document.getElementById("main-battle-menu").classList.add("hidden");

        // 2026-06-11 FIX: Show the CURRENT ACTOR's personal acts (not the boss's preset)
        // Each character has unique ACT moves they bring to ANY battle.
        // Fallback to boss's preset acts if the actor has none.
        const actor = game.party[this.currentActor];
        const actorActs = (actor && actor.acts && actor.acts.length > 0) ? actor.acts : this.activeEnemy.acts;
        const actList = actorActs.map(a => ({
            ...a,
            // Use boss's dmg/pacify if the actor's act doesn't define them
            dmg: a.dmg !== undefined ? a.dmg : 20,
            pacify: a.pacify !== undefined ? a.pacify : false,
            // Append actor's name so the player knows which is which
            successMsg: a.successMsg || `${actor.name} uses ${a.name}!`
        }));

        // Header showing whose moves these are
        const header = document.createElement("div");
        header.className = "acts-header";
        header.innerText = `${actor.name}'s MOVES (${actor.name === game.party[0]?.name ? "LEAD" : "SUPPORT"})`;
        submenu.appendChild(header);

        // 2026-06-11: WEAKNESS HINT — Highlight any act whose id matches the
        // active boss's weaknessActId with a gold ★ and a .weakness-act CSS class.
        // This makes the "right" move obvious without spoiling which boss is next.
        const weaknessId = this.activeEnemy.weaknessActId;

        actList.forEach(act => {
            const btn = document.createElement("button");
            btn.className = "sub-btn";
            btn.setAttribute("data-id", act.id);
            // Show cost in the button label
            const costLabel = act.cost ? ` [${act.cost}MP]` : "";
            // 2026-06-11: Append ★ WEAKNESS marker if this is the boss's weakness
            const isWeakness = weaknessId && act.id === weaknessId;
            const weaknessMarker = isWeakness ? " \u2605" : "";
            btn.innerText = act.name + costLabel + weaknessMarker;
            if (isWeakness) btn.classList.add("weakness-act");
            // Tooltip-style description on title attribute (also hint weakness)
            btn.title = (act.desc || act.successMsg || "") + (isWeakness ? "  [WEAKNESS! 1.5x dmg]" : "");
            submenu.appendChild(btn);
        });

        this.refreshSubMenuSelection("act-submenu");
    }



    openItemMenu() {
        this.menuPath = "item";
        this.subSelectedBtnIndex = 0;

        const submenu = document.getElementById("item-submenu");
        submenu.innerHTML = "";
        submenu.classList.remove("hidden");
        document.getElementById("main-battle-menu").classList.add("hidden");

        // 2026-06-11: Show the CURRENT ACTOR's personal inventory (not shared)
        const actor = game.party[this.currentActor];
        const actorInv = (actor && actor.inventory) ? actor.inventory : [];

        if (actorInv.length === 0) {
            const btn = document.createElement("button");
            btn.className = "sub-btn disabled";
            btn.innerText = actor.name + " HAS NO ITEMS";
            submenu.appendChild(btn);
        } else {
            actorInv.forEach(itemId => {
                const item = GAME_DATA.ITEMS.find(it => it.id === itemId);
                if (!item) return;
                const btn = document.createElement("button");
                btn.className = "sub-btn";
                btn.setAttribute("data-id", item.id);
                // Debug item shows infinite count
                if (item.id === "intent") {
                    btn.innerText = item.name + " (∞ DEBUG)";
                    btn.classList.add("debug-item");
                } else {
                    const isUnique = item.ownerId && item.ownerId !== actor.id;
                    btn.innerText = (isUnique ? "🔒 " : "") + item.name + " (x1)";
                }
                submenu.appendChild(btn);
            });
        }

        this.refreshSubMenuSelection("item-submenu");
    }



    executeAct(actId) {
        // 2026-06-11 FIX: Look up the act in the CURRENT ACTOR's acts first,
        // not just the boss's preset. Each member has their own moves.
        const actor = game.party[this.currentActor];
        const actorActs = (actor && actor.acts) ? actor.acts : [];
        let act = actorActs.find(a => a.id === actId);
        // Fallback to boss's preset acts (in case actor has no acts)
        if (!act) {
            act = this.activeEnemy.acts.find(a => a.id === actId);
        }
        if (!act) {
            console.warn(`[BattleIQ:Act] Act id="${actId}" not found in actor or boss acts.`);
            return;
        }

        // 2026-06-11: WEAKNESS MATCHUP CHECK. If this act.id matches the active
        // boss's weaknessActId, the act does 1.5x bonus damage. This rewards
        // players for using the "right" character's move against the "right" boss.
        const isWeaknessHit = (this.activeEnemy.weaknessActId && act.id === this.activeEnemy.weaknessActId);
        const weaknessMult = isWeaknessHit ? 1.5 : 1.0;

        this.closeSubmenus();

        this.isSelectingAction = false;
        this.isProcessing = true; // Guard against rapid-fire
        // Record action for combo tracking
        this.recordAction("ACT");
        this.comboMultiplier = this.calculateComboMultiplier();
        const weaknessMsg = isWeaknessHit ? " ★WEAKNESS!★" : "";
        this.logMessage((act.successMsg || `${actor ? actor.name : "???"} uses ${act.name}!`) + weaknessMsg);

        // 2026-06-11: WEAKNESS VISUAL CUE — On a weakness hit, fire a strong
        // gold flash + heavy screen shake NOW so the player gets instant feedback
        // even before the damage number appears. This makes the 1.5x bonus feel
        // earned and special rather than hidden in a log message.
        if (isWeaknessHit) {
            this.flashEnemySpriteWeakness();
            const screen = document.getElementById("screen-container");
            if (screen) {
                screen.classList.add("strong-shake");
                setTimeout(() => screen.classList.remove("strong-shake"), 700);
            }
        }

        // MP cost: if the act has a cost, deduct from current actor
        // 2026-06-11: CHEAT — Infinite MP skips the MP deduction
        if (act.cost && actor && !(typeof CHEATS !== "undefined" && CHEATS.enabled && CHEATS.infiniteMP)) {
            actor.mp = Math.max(0, (actor.mp || 0) - act.cost);
            this.updatePartyUI();
        }

        // 2026-06-11: Play UNIQUE sound effect for each act's ID.
        // Each character's moves have a distinct audio signature.
        if (audio) {
            if (isWeaknessHit && audio.playPerfect) audio.playPerfect();
            else if (audio[act.id]) audio[act.id]();
            else if (act.dmg) audio.playHit();
        }

        setTimeout(() => {
            if (act.dmg) {
                const baseComboDmg = Math.floor(act.dmg * this.comboMultiplier);
                const comboDmg = Math.floor(baseComboDmg * weaknessMult);
                const comboText = this.comboMultiplier > 1.0 ? ` (\u00d7${this.comboMultiplier.toFixed(1)} COMBO!)` : "";
                const weaknessText = isWeaknessHit ? ` [WEAKNESS \u00d7${weaknessMult}]` : "";
                this.damageEnemy(comboDmg, "Enemy takes " + comboDmg + " core psychic damage!" + comboText + weaknessText);
                if (this.comboMultiplier > 1.0) this.showComboPopup(this.comboMultiplier * weaknessMult);
            } else if (act.pacify) {
                this.enemyPacified = true;
                if (audio && audio.playPacify) audio.playPacify();
                this.logMessage(this.activeEnemy.name + " looks de-gaslit! Try to SPARE him!" + weaknessMsg);
                setTimeout(() => this.triggerEnemyTurn(), 2000);
            } else {
                // Generic act with no damage/pacify
                setTimeout(() => this.triggerEnemyTurn(), 1500);
            }
        }, 1500);
    }

    // 2026-06-11: Weakness flash — a gold/yellow tint + brighter glow on the
    // boss sprite to visually celebrate a WEAKNESS hit. Distinct from the
    // regular enemy-turn flashEnemySprite() which uses a generic hue-rotate.
    flashEnemySpriteWeakness() {
        if (!this.enemyCanvas) return;
        const originalFilter = this.enemyCanvas.style.filter;
        this.enemyCanvas.style.filter = "brightness(2.8) sepia(0.6) saturate(3) hue-rotate(-10deg)";
        setTimeout(() => {
            this.enemyCanvas.style.filter = originalFilter;
        }, 500);
    }






    executeItem(itemId) {
        const item = GAME_DATA.ITEMS.find(it => it.id === itemId);
        if (!item) {
            console.warn(`[BattleIQ:Item] Item id="${itemId}" not found.`);
            return;
        }

        // ============================================================================
        // DEBUG ITEM: "Intentional Game Design" (id: "intent")
        // One-shots the boss. Refills each turn. Used for testing only.
        // ============================================================================
        if (itemId === "intent" && item.debugMaxDamage) {
            const debugDmg = this.activeEnemy.maxHp;
            console.log(`[BattleIQ:Debug] Intentional Game Design used. Dealt ${debugDmg} damage to "${this.activeEnemy.name}". (Item KEPT in inventory — infinite uses.)`);
            this.closeSubmenus();
            this.isSelectingAction = false;
            this.isProcessing = true;

            this.logMessage("⚡ INTENTIONAL GAME DESIGN ⚡ One-shotting the boss...");
            this.damageEnemy(debugDmg, `[DEBUG] ${this.activeEnemy.name} took ${debugDmg} damage (one-shot).`);
            return; // Do NOT consume the item
        }

        // 2026-06-11: Consume the item from the CURRENT ACTOR's personal inventory
        // (not the global game.inventory)
        // 2026-06-11: CHEAT — Infinite Items keeps the item in inventory
        if (typeof CHEATS !== "undefined" && CHEATS.enabled && CHEATS.infiniteItems) {
            // Skip consumption entirely
            const actor = game.party[this.currentActor];
            this.closeSubmenus();
            this.isSelectingAction = false;
            this.isProcessing = true;
            audio.playHeal();
            this.logMessage(`${actor.name} used an INFINITE ${item.name}!`);
            this.updatePartyUI();
            setTimeout(() => this.triggerEnemyTurn(), 1500);
            return;
        }
        const actor = game.party[this.currentActor];
        if (!actor) return;
        if (!actor.inventory) actor.inventory = [];
        const idx = actor.inventory.findIndex(i => i === itemId);
        if (idx >= 0) {
            actor.inventory.splice(idx, 1); // Consume from THIS member
        } else {
            // Fallback: try shared inventory
            const sharedIdx = game.inventory.findIndex(i => i === itemId);
            if (sharedIdx >= 0) game.inventory.splice(sharedIdx, 1);
        }

        this.closeSubmenus();
        this.isSelectingAction = false;
        this.isProcessing = true;

        audio.playHeal();

        // Apply healing effects (default items heal the whole party)
        if (item.heal) {
            const isFullParty = item.fullParty;
            if (isFullParty) {
                game.party.forEach(pm => {
                    if (pm.hp > 0) pm.hp = Math.min(pm.maxHp, pm.hp + item.heal);
                });
                this.logMessage(`${actor.name} used ${item.name}! Full party healed by ${item.heal}!`);
            } else {
                game.party.forEach(pm => {
                    if (pm.hp > 0) pm.hp = Math.min(pm.maxHp, pm.hp + item.heal);
                });
                this.logMessage(`${actor.name} used ${item.name}! Party healed by ${item.heal}!`);
            }
        }

        // MP restore
        if (item.mpHeal) {
            game.party.forEach(pm => {
                pm.mp = Math.min(pm.maxMp, (pm.mp || 0) + item.mpHeal);
            });
        }

        this.updatePartyUI();

        // Handle item-specific effects
        if (item.stunEnemy) {
            this.logMessage(`${actor.name}'s ${item.name} STUNS the enemy for ${item.stunEnemy} turn!`);
            this.enemyStunned = item.stunEnemy;
        }
        if (item.atkBoost) {
            this.logMessage(`${actor.name}'s ${item.name} gives +50% ATK for 1 turn!`);
            this.actorAtkBoost = item.atkBoost;
        }
        if (item.deflect) {
            this.logMessage(`${actor.name}'s ${item.name} deflects ${item.deflect} incoming attack!`);
            this.actorDeflect = item.deflect;
        }
        if (item.instantPacify) {
            this.logMessage(`${actor.name}'s ${item.name} INSTANTLY PACIFIES ${this.activeEnemy.name}!`);
            this.enemyPacified = true;
        }
        if (item.shield) {
            this.logMessage(`${actor.name}'s ${item.name} creates a ${item.shield}-damage shield!`);
            this.actorShield = item.shield;
        }

        // Handle item penalty constraints (beef stroganoff - debug item)
        if (itemId === "stroganoff" && game.party.some(p => p.name === "Myat Maharko")) {
            setTimeout(() => {
                const maharObj = game.party.find(p => p.name === "Myat Maharko");
                if (maharObj) {
                    maharObj.hp = Math.max(1, maharObj.hp - item.maharkoDmg);
                    this.updatePartyUI();
                    this.logMessage("Myat Maharko got 30 psychic damage because Nick used all the milk for stroganoff!");
                }
            }, 1500);
        }

        setTimeout(() => this.triggerEnemyTurn(), 2500);
    }



    damageEnemy(dmg, messageText) {
        // 2026-06-11: CHEAT — One-Hit KO scales any damage to 9999 (or enemy max HP)
        if (typeof CHEATS !== "undefined" && CHEATS.enabled && CHEATS.oneHitKO) {
            dmg = this.activeEnemy.maxHp;
        }
        const hpBefore = this.activeEnemy.hp;
        this.activeEnemy.hp = Math.max(0, this.activeEnemy.hp - dmg);
        this.logMessage(messageText);
        console.log(`[BattleIQ:Battle] Damage ${this.activeEnemy.name}: ${hpBefore} → ${this.activeEnemy.hp} (-${dmg}) [${((this.activeEnemy.hp / this.activeEnemy.maxHp) * 100).toFixed(0)}% HP]`);

        // Update enemy HP bar
        this.updateEnemyHpBar();


        // Show floating damage numbers
        const popup = document.getElementById("damage-popup");
        popup.innerText = "-" + dmg;
        popup.classList.add("damage-pop");

        const screen = document.getElementById("screen-container");
        screen.classList.add("shake");

        setTimeout(() => {
            popup.classList.remove("damage-pop");
            screen.classList.remove("shake");
        }, 800);

        setTimeout(() => {
            if (this.activeEnemy.hp <= 0) {
                this.winBattle(this.activeEnemy.name + " collapsed! GC has been completely restored.");
            } else {
                this.triggerEnemyTurn();
            }
        }, 1800);
    }


    triggerEnemyTurn() {
        // Switch menu to arena canvas
        this.isSelectingAction = false;
        document.getElementById("main-battle-menu").classList.add("hidden");
        document.getElementById("arena-container").style.borderColor = "#ff0000";

        // Reset combo at the start of enemy turn
        this.comboMultiplier = 1.0;

        // Pick pattern + tell for this turn (Eric has cycling patterns)
        let patternId = this.activeEnemy.bulletPattern;
        let tellLine = this.activeEnemy.dialogues[Math.floor(Math.random() * this.activeEnemy.dialogues.length)];

        if (this.activeEnemy.bulletPatterns && this.activeEnemy.bulletPatterns.length > 0) {
            // Cycle through Eric's 5 patterns turn by turn
            const patternIndex = (this.turnCount - 1) % this.activeEnemy.bulletPatterns.length;
            const pattern = this.activeEnemy.bulletPatterns[patternIndex];
            patternId = pattern.id;
            tellLine = pattern.tell;
        }

        // Display the "tell" line (player learns which attack is coming)
        this.logMessage(this.activeEnemy.name + ': "' + tellLine + '"');
        console.log(`[BattleIQ:Turn] T${this.turnCount} | Pattern: ${patternId} | Tell: ${tellLine} | Party: [${(game.party || []).map(p => `${p.name}(${p.hp}/${p.maxHp})`).join(", ")}]`);


        // Visual cue: flash the enemy sprite briefly
        this.flashEnemySprite();

        // CRITICAL: Stop any previous bullet hell instance before starting a new one
        if (this.bulletHellSafetyTimer) clearTimeout(this.bulletHellSafetyTimer);
        bulletHell.stop();

        // Start bullet hell sequence with the chosen pattern
        bulletHell.start(patternId, 5000, () => {
            // Cancel the safety net since the main callback fired
            if (this.bulletHellSafetyTimer) {
                clearTimeout(this.bulletHellSafetyTimer);
                this.bulletHellSafetyTimer = null;
            }
            this.endEnemyTurn();
        });

        // SAFETY NET: Independent backup timer in case the main one is cleared
        // This ensures the player NEVER gets stuck in the bullet hell
        this.bulletHellSafetyTimer = setTimeout(() => {
            // Only fire if the bullet hell is STILL active (otherwise the duration
            // timeout already ended it normally — don't double-call endEnemyTurn).
            if (bulletHell && bulletHell.active) {
                console.warn("[BattleIQ] Bullet hell safety net fired! Force-ending turn.");
                this.endEnemyTurn();
            } else {
                // Suppressed — bullet hell already ended normally
            }
        }, 5500);
    }




    // Flash the enemy sprite briefly to signal an incoming attack
    flashEnemySprite() {
        if (!this.enemyCanvas) return;
        const originalFilter = this.enemyCanvas.style.filter;
        this.enemyCanvas.style.filter = "brightness(2.5) hue-rotate(40deg)";
        setTimeout(() => {
            this.enemyCanvas.style.filter = originalFilter;
        }, 400);
    }


    endEnemyTurn() {
        this.isSelectingAction = true;
        this.isProcessing = false; // Re-enable input now that the player's turn is back
        this.menuPath = "main";
        document.getElementById("arena-container").style.borderColor = "#ffffff";
        document.getElementById("main-battle-menu").classList.remove("hidden");

        this.turnCount++;
        this.updateTurnCounter();
        this.selectedBtnIndex = 0;
        this.refreshMenuSelection();
        this.logMessage("What's the Move? Select an option!");
        this.showYourTurnIndicator();

        // DIAGNOSTIC: confirm the player's turn is fully set up
        const mainMenu = document.getElementById("main-battle-menu");
        const isVisible = mainMenu && !mainMenu.classList.contains("hidden");
        const btnCount = document.querySelectorAll("#main-battle-menu .battle-btn").length;
        console.log(`[BattleIQ:Turn] ENDED → T${this.turnCount} | menuPath=main | mainMenuVisible=${isVisible} | buttons=${btnCount} | isSelectingAction=${this.isSelectingAction}`);
    }



    showYourTurnIndicator() {
        // Show a brief flashing "YOUR TURN" indicator above the FIGHT menu
        const mainMenu = document.getElementById("main-battle-menu");
        if (!mainMenu) return;
        mainMenu.classList.add("your-turn-flash");
        setTimeout(() => {
            mainMenu.classList.remove("your-turn-flash");
        }, 1200);
    }


    damagePlayer(amount) {
        // 2026-06-11 FIX: Damage the CURRENTLY ACTIVE member (currentActor),
        // not always game.party[0]. This way SWITCH'ing mid-battle means
        // the chosen member takes the hit.
        if (game.party.length === 0) return;
        // 2026-06-11: CHEAT — God Mode blocks all damage
        if (typeof CHEATS !== "undefined" && CHEATS.enabled && CHEATS.godMode) {
            amount = 0;
        }
        const target = game.party[this.currentActor] || game.party[0];
        target.hp = Math.max(0, target.hp - amount);
        // 2026-06-11: CHEAT — Max Stats auto-heals party to full after damage
        if (typeof CHEATS !== "undefined" && CHEATS.enabled && CHEATS.maxStats) {
            game.party.forEach(pm => { if (pm.hp > 0) pm.hp = pm.maxHp; });
        }
        this.updatePartyUI();

        if (target.hp <= 0) {
            // Fainted
            audio.playDefeat();
            this.logMessage(target.name + " fainted under the extreme gaslight pressure!");
            // Remove the fainted member from the party
            game.party = game.party.filter(p => p !== target);
            this.updateActiveMemberIndicator();
            // Auto-rotate to next living member
            if (game.party.length > 0) {
                this.currentActor = this.currentActor % game.party.length;
                this.updateActiveMemberIndicator();
            }

            if (game.party.length === 0) {
                // Total Game Over - properly trigger the cinematic screen
                this.triggerGameOver();
            }
        }
    }


    // 2026-06-11: winBattle now accepts a `wasSpared` flag (default false).
    // When true, the boss ID is appended to game.sparedBosses so the True
    // Pacifist ending can be checked at the victory screen.
    winBattle(messageText, wasSpared = false) {
        audio.playHeal();
        if (audio.playBossDefeat) audio.playBossDefeat();
        this.logMessage(messageText);
        console.log(`[BattleIQ:Battle] WON vs "${this.activeEnemy.name}" after ${this.turnCount} turns! (${this.actionHistory.length} actions in history)${wasSpared ? " [SPARED]" : ""}`);

        // 2026-06-11: Track this boss as SPARED (not defeated) for True Pacifist check
        if (wasSpared && game && game.sparedBosses && !game.sparedBosses.includes(this.activeEnemyId)) {
            game.sparedBosses.push(this.activeEnemyId);
            console.log(`[BattleIQ:Ending] game.sparedBosses now = [${game.sparedBosses.join(", ")}]`);
        }

        // Cleanup the canvas we created
        if (this.enemyCanvas && this.enemyCanvas.parentNode) {
            this.enemyCanvas.parentNode.removeChild(this.enemyCanvas);
        }

        // Mark the boss for this act as defeated (unlocks the next act's exit)
        if (typeof game.markBossDefeated === "function") {
            game.markBossDefeated(game.currentActIndex);
        }

        // ============================================================================
        // 2026-06-11: AUTO-RECRUIT after boss defeat.
        // The player just beat the boss, so they should auto-join the party.
        // (The recruit flow respects the 3-member cap and the lock feature.)
        // We capture the memberId now because activeEnemy is reset by startBattle().
        // ============================================================================
        const newMemberId = this.activeEnemy.memberId;
        const isFinalBoss = (game.currentActIndex === 3);

        setTimeout(() => {
            // If this is the FINAL boss (Ben, Act 4 / index 3) -> show full Victory screen
            if (isFinalBoss) {
                console.log("[BattleIQ:Battle] Final boss defeated! Showing VICTORY screen.");
                game.showVictoryScreen();
                return;
            }

            // Otherwise advance to the next act FIRST
            console.log(`[BattleIQ:Battle] Advancing to next act...`);
            game.advanceAct();

            // Then auto-recruit the defeated boss (if they have a memberId)
            if (newMemberId && GAME_DATA.PLAYERS[newMemberId]) {
                console.log(`[BattleIQ:Auto-Recruit] Triggering recruit for "${newMemberId}" after advancing to next act.`);
                // Defer 200ms to let advanceAct() finish (sets up new map, party order)
                setTimeout(() => {
                    if (typeof game.recruitMember === "function") {
                        // If party is at 3, this shows the manual remove-member choice menu
                        game.recruitMember(newMemberId);
                    }
                }, 200);
            }
        }, 3000);
    }






    triggerGameOver() {
        bulletHell.stop();
        if (this.enemyCanvas && this.enemyCanvas.parentNode) {
            this.enemyCanvas.parentNode.removeChild(this.enemyCanvas);
        }
        game.showGameOverScreen();
    }
}

// Global battle manager
const battleController = new BattleController();


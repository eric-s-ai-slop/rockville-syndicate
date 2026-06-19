/**
 * BattleIQ: The Rockville Chronicles - Main State Machine Coordinator
 * Handles transitions, player/party statuses, dialogue panels, and state updates.
 */

class GameCoordinator {
    constructor() {
        this.currentState = "menu"; // "menu", "overworld", "battle", "dialogue"
        this.currentActIndex = 0;

        // Track which acts' boss fights have been defeated (indexed by act number)
        this.bossDefeated = [false, false, false, false];

        this.party = [];
        this.inventory = [];


        this.dialogueQueue = [];
        this.dialogueCallback = null;
        this.dialogueIndex = 0;
        this.isTypingDialogue = false;
        this.dialogueTypewriter = null;

        this.activeMapId = "shepherdstown";

        // 2026-06-11: DIAGNOSTICS NAMESPACE
        // Each flag controls a subsystem's logging verbosity. Toggle them at
        // runtime via the browser console:
        //   game.diag.choiceFlow = false   // silence choice-pick logs
        //   game.diag.stateDump  = true    // log full state on errors
        // Or set them all up-front via:
        //   window.__BATTLEIQ_DIAG__ = { choiceFlow: false, stateDump: true }
        // Press F10 in-game to toggle the verbose state dump.
        this.diag = {
            choiceFlow: true,      // log every choice pick + handler invocation
            callbackFlow: true,    // log every cb call (who, with what args)
            recruitFlow: true,     // log every recruit decision branch
            stateDump: false,      // log full state dump at key transitions
            errors: true           // always log errors with full context (can't disable)
        };
        if (typeof window !== "undefined" && window.__BATTLEIQ_DIAG__) {
            Object.assign(this.diag, window.__BATTLEIQ_DIAG__);
        }
    }

    // 2026-06-11: Unified diagnostic logger with subsystem tags + color coding.
    // Use this instead of console.log when debugging dialogue/cb flow.
    // Errors always log regardless of diag[subsystem].
    logDiag(subsystem, level, message, data) {
        if (!this.diag[subsystem] && level !== "error") return;
        const tag = `[BattleIQ:${subsystem}]`;
        const styles = {
            log:   "color: #4df3ff",
            warn:  "color: #ffd700; font-weight: bold",
            error: "color: #ff004c; font-weight: bold; background: #2a0a1a; padding: 2px 4px"
        };
        const args = [`%c${tag} ${message}`, styles[level] || styles.log];
        if (data !== undefined) {
            if (data instanceof Error) {
                args.push("\n  Error:", data.message, "\n  Stack:", data.stack);
            } else if (typeof data === "object") {
                try {
                    args.push("\n  Data:", JSON.stringify(data, null, 2));
                } catch (e) {
                    args.push("\n  Data: [unserializable]", data);
                }
            } else {
                args.push(data);
            }
        }
        console[level](...args);
    }

    // 2026-06-11: Comprehensive state dump for dialogue/recruit debugging.
    // Fires on errors automatically (when stateDump is true) or via F10 toggle.
    // Shows EVERY relevant field on the game object so you can see what
    // the dialogue system is actually holding at the time of the bug.
    dumpDialogueState(label = "STATE") {
        if (!this.diag.stateDump && !this.diag.errors) return;
        console.groupCollapsed(`%c[BattleIQ:Dump] ${label}`, "color: #ff3c82; font-weight: bold; font-size: 12px");
        console.log("📊 Party:", this.party?.map(p => `${p.name} (${p.hp}/${p.maxHp})`));
        console.log("📊 dialogueQueue.length:", this.dialogueQueue?.length);
        console.log("📊 dialogueIndex:", this.dialogueIndex);
        console.log("📊 dialogueCallback:", typeof this.dialogueCallback, this.dialogueCallback?.name);
        console.log("📊 pendingChoices:", this.pendingChoices);
        console.log("📊 activeChoices.length:", this.activeChoices?.length);
        console.log("📊 choiceCallback:", typeof this.choiceCallback, this.choiceCallback?.name);
        console.log("📊 selectedChoiceIndex:", this.selectedChoiceIndex);
        console.log("📊 choiceMenuActive:", this.choiceMenuActive);
        console.log("📊 activeDialogueTrigger:", this.activeDialogueTrigger);
        console.log("📊 _lastPickedChoice:", this._lastPickedChoice);
        console.log("📊 pendingRecruit:", this.pendingRecruit);
        console.log("📊 currentState:", this.currentState);
        console.log("📊 currentActIndex:", this.currentActIndex);
        console.groupEnd();
    }

    init() {
        console.log("[BattleIQ:Init] Game initialized. BattleIQ v1.0");
        // Resolution Scaler
        this.applyResolutionScale();
        window.addEventListener("resize", () => this.applyResolutionScale());


        // Window blur safety: clear all input state and any pending dialogue
        // timers so the game doesn't get stuck if the user alt-tabs mid-action.
        window.addEventListener("blur", () => {
            if (bulletHell && bulletHell.keys) bulletHell.keys = {};
            if (this.dialogueTypewriter) {
                clearInterval(this.dialogueTypewriter);
                this.dialogueTypewriter = null;
                this.isTypingDialogue = false;
            }
        });

        // Expose error handler so any uncaught exception surfaces visibly
        // instead of silently breaking the game.
        window.addEventListener("error", (e) => {
            console.error("[BattleIQ Runtime Error]", e.error || e.message);
        });


        // Start button
        document.getElementById("start-game-btn").addEventListener("click", () => {
            this.startGame();
        });

        // Continue Save button (only visible if save exists)
        const continueBtn = document.getElementById("continue-btn");
        const deleteSaveBtn = document.getElementById("delete-save-btn");
        if (this.hasSave()) {
            continueBtn.classList.remove("hidden");
            deleteSaveBtn.classList.remove("hidden");
            continueBtn.addEventListener("click", () => {
                if (this.loadGame()) {
                    overworld.loadMap(this.activeMapId);
                    const chapter = GAME_DATA.CHAPTERS[this.currentActIndex];
                    if (chapter) {
                        document.querySelector(".chapter-indicator").innerText = chapter.title;
                        document.querySelector(".objective-box").innerText = "Objective: " + chapter.objective;
                    }
                    this.changeState("overworld");
                    this.startDialogue([
                        { speaker: "System", text: "Save data loaded. The GC is back where you left it." }
                    ], () => {});
                }
            });
            deleteSaveBtn.addEventListener("click", () => {
                this.deleteSave();
                continueBtn.classList.add("hidden");
                deleteSaveBtn.classList.add("hidden");
            });
        }


        // Mute button
        document.getElementById("mute-btn").addEventListener("click", () => {
            const isMuted = audio.toggleMute();
            document.getElementById("mute-btn").innerText = isMuted ? "🔇 MUSIC: OFF" : "🔊 MUSIC: ON";
            if (!isMuted) {
                if (this.currentState === "menu") audio.playBgm("menu");
                else if (this.currentState === "overworld") audio.playBgm("overworld");
                else if (this.currentState === "battle") {
                    audio.playBgm(this.currentActIndex === 3 ? "final" : "battle");
                }
            }
        });

        // Global keyboard listener
        window.addEventListener("keydown", (e) => {
            this.handleGlobalInput(e);
        });

        // Init audio on first click (or keyboard gesture)
        const initAudioOnGesture = () => {
            audio.resumeOnGesture();
        };
        window.addEventListener("mousedown", initAudioOnGesture, { once: true });
        window.addEventListener("keydown", initAudioOnGesture, { once: true });


        // Play BGM
        audio.playBgm("menu");
    }

    applyResolutionScale() {
        const wrapper = document.getElementById("screen-wrapper");
        if (!wrapper) return;

        const padding = 100;
        const maxW = window.innerWidth;
        const maxH = window.innerHeight - padding;

        const scaleW = maxW / 640;
        const scaleH = maxH / 480;
        const scale = Math.min(scaleW, scaleH);

        const finalScale = Math.max(0.5, Math.min(scale, 4));
        wrapper.style.transform = `scale(${finalScale})`;
    }

    startGame() {
        audio.playSelect();
        console.log("[BattleIQ:StartGame] Player clicked START ADVENTURE. Going to character select...");
        // Hook Victory & Game Over buttons to reset (do this regardless of which path)
        const victoryBtn = document.getElementById("victory-restart-btn");
        if (victoryBtn) victoryBtn.onclick = () => this.restartGame();
        const gameOverBtn = document.getElementById("game-over-restart-btn");
        if (gameOverBtn) gameOverBtn.onclick = () => this.restartGame();

        // 2026-06-11: NEW FLOW — Show character select screen first
        this.selectedCharIndex = 1; // default to Jacob in the middle
        this.showCharacterSelect();
    }

    // ============================================================================
    // CHARACTER SELECT SCREEN
    // Player picks one of 3 starting champions. Each has unique items and stats.
    // ============================================================================
    showCharacterSelect() {
        // Generate the 3 character cards dynamically from data
        const container = document.getElementById("character-cards");
        if (!container) return;
        container.innerHTML = "";

        GAME_DATA.STARTING_CHARACTERS.forEach((char, idx) => {
            const card = document.createElement("div");
            card.className = "char-card" + (idx === this.selectedCharIndex ? " selected" : "");

            const itemsList = char.startingItems.map(id => {
                const item = GAME_DATA.ITEMS.find(it => it.id === id);
                return item ? item.name : id;
            }).join(", ");

            card.innerHTML = `
                <div class="char-card-avatar">${char.avatar}</div>
                <div class="char-card-name" style="color: ${char.color}">${char.name}</div>
                <div class="char-card-title">${char.title}</div>
                <div class="char-card-desc">${char.description}</div>
                <div class="char-card-stats">
                    <div class="stat-line"><span class="stat-label">HP</span><span class="stat-value">${char.stats.hp}</span></div>
                    <div class="stat-line"><span class="stat-label">MP</span><span class="stat-value">${char.stats.mp}</span></div>
                    <div class="stat-line"><span class="stat-label">ATK</span><span class="stat-value">${char.stats.atk}</span></div>
                    <div class="stat-line"><span class="stat-label">DEF</span><span class="stat-value">${char.stats.def}</span></div>
                    <div class="stat-line"><span class="stat-label">SPD</span><span class="stat-value">${char.stats.spd}</span></div>
                </div>
                <div class="char-card-items">
                    <strong>★ UNIQUE ITEMS</strong>
                    ${itemsList}
                </div>
            `;
            container.appendChild(card);
        });

        this.changeState("character-select");
    }

    // Actually start the game with the chosen character
    startGameWithCharacter(charId) {
        audio.playSelect();
        console.log(`[BattleIQ:StartGame] Starting new game with "${charId}". Act=0.`);

        this.currentActIndex = 0;
        this.bossDefeated = [false, false, false, false]; // reset boss progress
        this.bossEncounterQueue = []; // 2026-06-11: Reset so a NEW dynamic boss order is generated (excluding player + previous bosses)
        this.sparedBosses = []; // 2026-06-11: Track which bosses were spared (not defeated) for the True Pacifist ending
        this.inventory = JSON.parse(JSON.stringify(GAME_DATA.ITEMS));

        // Ensure debug item is always present in inventory
        const hasDebug = this.inventory.some(i => i.id === "intent");
        if (!hasDebug) {
            const debugItem = JSON.parse(JSON.stringify(GAME_DATA.ITEMS.find(i => i.id === "intent")));
            if (debugItem) this.inventory.push(debugItem);
        }

        // Initialize the chosen character as party[0] with their full data (incl. inventory)
        const chosenChar = JSON.parse(JSON.stringify(GAME_DATA.PLAYERS[charId]));
        this.party = [chosenChar];
        this.startingCharId = charId;

        this.activeMapId = "shepherdstown";
        overworld.loadMap(this.activeMapId);

        this.changeState("overworld");

        // Opening dialogue with the chosen character
        const intros = {
            farrar: [
                { speaker: "Nick Farrar", text: "BOOM! Welcome to Shepherdstown!" },
                { speaker: "Nick Farrar", text: "I skip work just to drive down here, and what do I find? Jacob blocked the whole GC!" },
                { speaker: "Nick Farrar", text: "He locked himself in Potomac Place dorm lobby, crying over Audrey and Makayla." },
                { speaker: "Nick Farrar", text: "I have to find him, unblock the chat, and save the group's precious META." }
            ],
            hedgecock: [
                { speaker: "Nick Hedgecock", text: "I'm so tired of the GC drama, but Anastasia said I need more friends..." },
                { speaker: "Nick Hedgecock", text: "So here I am at Shepherd, looking for Jacob. The 'Lost' Jacob, not the 'Sub-Zero' one." },
                { speaker: "Nick Hedgecock", text: "Past 10 PM I'm going to bed though. No questions." },
                { speaker: "Nick Hedgecock", text: "Wake me up if anyone needs Safe Space. Otherwise, let's get this done." }
            ],
            lebby: [
                { speaker: "Jacob Lebby", text: "F off all of you! I'm at Shepherd, moping in a cow suit." },
                { speaker: "Jacob Lebby", text: "Audrey hasn't texted me in 3 days. My rizz is in shambles." },
                { speaker: "Jacob Lebby", text: "I AM Sub-Zero! I'm the most interesting man in the GC!" },
                { speaker: "Jacob Lebby", text: "But first... somebody buy me Maki. I'll unblock the chat for Maki." }
            ],
            // 2026-06-11: Added Eric and Maharko intros for the 2 new starting characters
            eric: [
                { speaker: "Eric Huang", text: "Welcome to Shepherdstown. Hand over $4.50 for the parking permit." },
                { speaker: "Eric Huang", text: "It's just business guys. Blame Joe Biden. I don't make the rules, I just enforce them at 400% markup." },
                { speaker: "Eric Huang", text: "Jacob is in Potomac Place somewhere. Probably crying over his $50 forfeit. Not my problem. Not my margin." },
                { speaker: "Eric Huang", text: "Find him, unblock the chat, restore order. I'll audit everyone afterwards. For a small fee, of course." }
            ],
            maharko: [
                { speaker: "Myat Maharko", text: "Yo. IYKYK, this Shepherd dorm is a D1 energy black hole." },
                { speaker: "Myat Maharko", text: "Jacob's been ghosting the GC for days. Find My confirms he's in Potomac Place wearing a cow suit. IYKYK." },
                { speaker: "Myat Maharko", text: "I brought TP. For emotional support. Also because the dorms are unsanitary. Cope and unblock." },
                { speaker: "Myat Maharko", text: "We pull up, audit Jacob, restore order. Then we can talk about that 0.4% D1 return. *adjusts gold chain*" }
            ]
        };
        this.startDialogue(intros[charId] || intros.farrar, () => {});
    }


    restartGame() {
        document.getElementById("victory-screen").classList.add("hidden");
        document.getElementById("game-over-screen").classList.add("hidden");
        this.startGame();
    }

    showVictoryScreen() {
        audio.stopBgm();
        document.getElementById("victory-screen").classList.remove("hidden");

        // 2026-06-11: TRUE PACIFIST ENDING CHECK.
        // A run is "True Pacifist" if the player spared ALL 3 mid-bosses
        // (jacob, hedgecock_boss, eric, maharko_boss) instead of defeating any.
        // Ben must still be defeated (he's the final boss and not a sparing option).
        const PACIFIST_BOSSES = ["jacob", "hedgecock_boss", "eric", "maharko_boss"];
        const isTruePacifist = PACIFIST_BOSSES.every(b => (this.sparedBosses || []).includes(b));
        if (isTruePacifist) {
            console.log(`[BattleIQ:Ending] 🌟 TRUE PACIFIST ROYALE! Spared bosses: [${this.sparedBosses.join(", ")}]`);
        } else {
            console.log(`[BattleIQ:Ending] Standard victory. Spared bosses: [${(this.sparedBosses || []).join(", ")}]`);
        }
        // Toggle which victory content is visible (both elements live in the same overlay)
        const pacifistEl = document.getElementById("victory-pacifist");
        const standardEl = document.getElementById("victory-standard");
        if (pacifistEl) {
            if (isTruePacifist) pacifistEl.classList.remove("hidden");
            else pacifistEl.classList.add("hidden");
        }
        if (standardEl) {
            if (isTruePacifist) standardEl.classList.add("hidden");
            else standardEl.classList.remove("hidden");
        }
    }

    showGameOverScreen() {
        audio.stopBgm();
        audio.playDefeat();
        document.getElementById("game-over-screen").classList.remove("hidden");
    }

    // ====================== PAUSE MENU ======================

    isPaused = false;
    pauseOverlay = null;

    togglePause() {
        if (this.currentState === "menu") return;
        if (this.isPaused) {
            this.resumeGame();
        } else {
            this.pauseGame();
        }
    }

    pauseGame() {
        this.isPaused = true;
        audio.stopBgm();
        bulletHell.stop();
        this.pauseOverlay = document.createElement("div");
        this.pauseOverlay.className = "fullscreen-overlay";
        this.pauseOverlay.innerHTML = `
            <div class="victory-content">
                <h1 class="victory-title" style="font-size:48px;">⏸ PAUSED</h1>
                <p class="victory-narrative" style="margin-top:20px;">
                    The world has halted mid-conversation.
                </p>
                <p class="victory-narrative">Press [P] to resume.</p>
                <p class="victory-narrative">Press [R] to restart the current act.</p>
                <button id="resume-btn" class="menu-btn victory-btn" style="margin-top:20px;">RESUME</button>
            </div>
        `;
        document.body.appendChild(this.pauseOverlay);
        document.getElementById("resume-btn").onclick = () => this.resumeGame();
    }

    resumeGame() {
        this.isPaused = false;
        if (this.pauseOverlay && this.pauseOverlay.parentNode) {
            this.pauseOverlay.parentNode.removeChild(this.pauseOverlay);
            this.pauseOverlay = null;
        }
        if (this.currentState === "overworld") audio.playBgm("overworld");
        else if (this.currentState === "battle") audio.playBgm("battle");
    }

    restartCurrentAct() {
        this.resumeGame();
        // Reset the active act to its starting point
        const chapter = GAME_DATA.CHAPTERS[this.currentActIndex];
        if (!chapter) return;
        this.activeMapId = chapter.startMap;
        overworld.loadMap(this.activeMapId);
        this.changeState("overworld");
        this.startDialogue([
            { speaker: "System", text: "Act reset. The world has been rebooted." }
        ], () => {});
    }

    // ====================== SAVE / LOAD (localStorage) ======================

    saveGame() {
        try {
            const saveData = {
                currentActIndex: this.currentActIndex,
                activeMapId: this.activeMapId,
                party: this.party,
                inventory: this.inventory,
                // 2026-06-11: Persist startingCharId so the dynamic boss
                // exclusion logic works after a Continue. Without this, the
                // player's own character could be picked as a boss encounter.
                startingCharId: this.startingCharId,
                // 2026-06-11: Persist the boss encounter queue so a save/load
                // mid-run keeps the same boss order (no re-randomization).
                bossEncounterQueue: this.bossEncounterQueue
            };
            localStorage.setItem("battleiq_save", JSON.stringify(saveData));
            return true;
        } catch (err) {
            console.warn("[BattleIQ] Save failed:", err);
            return false;
        }
    }

    loadGame() {
        try {
            const raw = localStorage.getItem("battleiq_save");
            if (!raw) return false;
            const saveData = JSON.parse(raw);
            this.currentActIndex = saveData.currentActIndex || 0;
            this.activeMapId = saveData.activeMapId || "shepherdstown";
            this.party = saveData.party || [JSON.parse(JSON.stringify(GAME_DATA.PLAYERS.farrar))];
            this.inventory = saveData.inventory || JSON.parse(JSON.stringify(GAME_DATA.ITEMS));
            // 2026-06-11: Restore the starting character ID + boss queue so the
            // dynamic boss selection system continues to work after Continue.
            this.startingCharId = saveData.startingCharId || "farrar";
            this.bossEncounterQueue = saveData.bossEncounterQueue || [];
            console.log(`[BattleIQ:Load] Restored startingCharId="${this.startingCharId}", bossEncounterQueue=[${this.bossEncounterQueue.join(", ")}]`);
            return true;
        } catch (err) {
            console.warn("[BattleIQ] Load failed:", err);
            return false;
        }
    }

    hasSave() {
        try {
            return !!localStorage.getItem("battleiq_save");
        } catch (err) {
            return false;
        }
    }

    deleteSave() {
        try {
            localStorage.removeItem("battleiq_save");
        } catch (err) {
            // ignore
        }
    }


    changeState(newState) {
        const prevState = this.currentState;
        if (newState === "overworld" && this.currentState !== "overworld") {
            audio.playBgm("overworld");
        } else if (newState === "battle" && this.currentState !== "battle") {
            audio.playBgm(this.currentActIndex === 3 ? "final" : "battle");
        } else if (newState === "menu" && this.currentState !== "menu") {
            audio.playBgm("menu");
        }

        this.currentState = newState;
        if (prevState !== newState) {
            console.log(`[BattleIQ:State] ${prevState} → ${newState}`);
        }


        document.querySelectorAll(".game-state").forEach(el => el.classList.remove("active"));

        // Refresh the context-aware Control Toolbox whenever the state changes
        if (typeof controlsHUD !== "undefined" && controlsHUD) {
            if (newState === "menu") {
                controlsHUD.updateControls("menu");
            } else if (newState === "overworld") {
                controlsHUD.updateControls("overworld");
            } else if (newState === "battle") {
                controlsHUD.updateControls("battle", "main");
            }
        }

        if (newState === "menu") {
            document.getElementById("menu-state").classList.add("active");
        } else if (newState === "overworld") {
            document.getElementById("overworld-state").classList.add("active");
            overworld.resizeCanvas();
        } else if (newState === "battle") {
            document.getElementById("battle-state").classList.add("active");
        } else if (newState === "character-select") {
            // 2026-06-11 FIX: The character-select state needs the .active class
            // or the screen appears blank. (Previously this case was missing.)
            document.getElementById("character-select-state").classList.add("active");
        }
    }


    startDialogue(dialogueList, callback = null) {
        this.dialogueQueue = dialogueList;
        this.dialogueIndex = 0;
        this.dialogueCallback = callback;
        this.setDialogueUIVisible(true);
        this.showNextDialogue();
    }

    setDialogueUIVisible(visible) {
        // Hide the toolbox whenever dialogue is on screen so they don't collide
        const toolbox = document.getElementById("controls-toolbox");
        if (toolbox) {
            if (visible) toolbox.classList.add("dialogue-active");
            else toolbox.classList.remove("dialogue-active");
        }
    }

    /**
     * Show a non-blocking toast notification that auto-fades after 2 seconds.
     * @param {string} message - Text to show
     * @param {boolean} isError - If true, use the red error style
     */
    showToast(message, isError = false) {
        const toast = document.getElementById("save-toast");
        if (!toast) return;

        toast.innerText = message;
        toast.classList.remove("show", "error");
        // Force reflow so re-adding `.show` re-triggers the transition
        void toast.offsetWidth;
        if (isError) toast.classList.add("error");
        toast.classList.add("show");

        if (this._toastTimeout) clearTimeout(this._toastTimeout);
        this._toastTimeout = setTimeout(() => {
            toast.classList.remove("show");
        }, 2000);
    }


    showNextDialogue() {
        if (this.dialogueIndex >= this.dialogueQueue.length) {
            document.getElementById("dialogue-box").classList.add("hidden");
            this.hideDialoguePortrait();
            this.setDialogueUIVisible(false);

            // ============================================================================
            // BRANCHING DIALOGUE: If a choice menu is queued, show it after the
            // initial dialogue ends (instead of calling the callback).
            // ============================================================================
            if (this.pendingChoices) {
                // 2026-06-11: clear any stale recruit context — the new choice
                // menu will set its own context if needed (startDialogueWithChoices
                // already did this for this current queue, so this is just a
                // belt-and-suspenders cleanup).
                this.showChoiceMenu(this.pendingChoices.choices, this.pendingChoices.callback, this.pendingChoices.speaker);
                this.pendingChoices = null;
                return;
            }

            // 2026-06-11: No more queued choices — the dialogue chain is done.
            // Clear the recruit context so it doesn't accidentally fire on the
            // next unrelated dialogue.
            this.activeDialogueTrigger = null;

            if (this.dialogueCallback) {
                const cb = this.dialogueCallback;
                this.dialogueCallback = null;
                // 2026-06-11: Pass the stashed picked choice so post-reply
                // callbacks (like the manual-swap choiceHandler) know which
                // option the user picked. Falls back to undefined for
                // non-choice-related callbacks (which just ignore the arg).
                const stashedChoice = this._lastPickedChoice;
                this._lastPickedChoice = null;  // clear so it doesn't leak

                // 2026-06-11: Diagnostic log — would have caught the
                // missing-arg bug in 1 line. Shows exactly which cb is
                // being invoked and what args it received.
                this.logDiag("callbackFlow", "log", `Invoking dialogue callback`, {
                    cbName: cb?.name || "(anonymous)",
                    cbSource: cb?.toString().substring(0, 120) + "...",
                    passedChoice: stashedChoice ? { label: stashedChoice.label, ...stashedChoice } : null
                });

                cb(stashedChoice);
            }
            return;
        }


        const box = document.getElementById("dialogue-box");
        box.classList.remove("hidden");

        const speakerEl = document.getElementById("dialogue-speaker");
        const textEl = document.getElementById("dialogue-text");

        const dialogue = this.dialogueQueue[this.dialogueIndex];
        speakerEl.innerText = dialogue.speaker;

        // 2026-06-11: Render the speaker's portrait in the top-left corner.
        // The portrait persists for the entire conversation (including nested branches).
        this.updateDialoguePortrait(dialogue.speaker);

        if (this.dialogueTypewriter) clearInterval(this.dialogueTypewriter);
        textEl.innerText = "";
        let charIdx = 0;
        this.isTypingDialogue = true;

        this.dialogueTypewriter = setInterval(() => {
            // 2026-06-11: SAFETY NET — If dialogue is malformed (e.g. missing .text),
            // clear the interval and bail. Prevents infinite TypeError loop.
            if (!dialogue || typeof dialogue.text !== "string") {
                clearInterval(this.dialogueTypewriter);
                this.isTypingDialogue = false;
                return;
            }
            if (charIdx < dialogue.text.length) {
                textEl.innerText += dialogue.text[charIdx];
                if (charIdx % 2 === 0) audio.playText();
                charIdx++;
            } else {
                clearInterval(this.dialogueTypewriter);
                this.isTypingDialogue = false;
            }
        }, 25);

        this.dialogueIndex++;
    }

    // 2026-06-11: Render a portrait sprite in the top-left of the dialogue box.
    // Maps speaker names to their sprite-drawing functions. Falls back to hiding
    // the portrait for unknown speakers.
    updateDialoguePortrait(speakerName) {
        const portraitCanvas = document.getElementById("dialogue-portrait");
        if (!portraitCanvas) return;
        const ctx = portraitCanvas.getContext("2d");
        // Clear previous portrait
        ctx.clearRect(0, 0, portraitCanvas.width, portraitCanvas.height);

        // Map speaker names to portrait drawing functions.
        // Sprites are 32x32 internally; we draw at scale 2 to fit 80x80 canvas.
        const portraitMap = {
            "Audrey": () => pixelArt.drawAudrey(0, 0, 2.5),
            "Jacob Lebby": () => pixelArt.drawJacobCow(0, 0, 2.5, false),
            "Myat Maharko": () => pixelArt.drawMaharko(0, 0, 2.5, false),
            "Nick Farrar": () => pixelArt.drawNickFarrar(0, 0, 2.5, false),
            "Nick Hedgecock": () => pixelArt.drawNickHedgecock(0, 0, 2.5, false),
            "Eric Huang": () => pixelArt.drawEric(0, 0, 2.5, false),
            "Ben Bersofsky": () => pixelArt.drawBenBersofsky(0, 0, 2.5)
        };
        const drawFn = portraitMap[speakerName];
        if (drawFn) {
            // Inject canvas context into pixelArt temporarily
            const savedCtx = pixelArt.ctx;
            pixelArt.ctx = ctx;
            try { drawFn(); } catch (e) { console.warn("[BattleIQ:Portrait] draw failed:", e); }
            pixelArt.ctx = savedCtx;
            portraitCanvas.classList.remove("hidden");
        } else {
            // Unknown speaker — hide the portrait
            portraitCanvas.classList.add("hidden");
        }
    }

    hideDialoguePortrait() {
        const portraitCanvas = document.getElementById("dialogue-portrait");
        if (portraitCanvas) {
            portraitCanvas.classList.add("hidden");
        }
    }



    // ============================================================================
    // BRANCHING DIALOGUE SYSTEM
    // ============================================================================
    // startDialogueWithChoices(dialogueList, choices, callback):
    //   1. Show dialogueList normally
    //   2. After it ends, show a choice menu (W/S + Enter to pick)
    //   3. Each choice has a `label` (button text) and `reply` (follow-up line)
    //   4. After the reply, call the callback
    //
    // Use this for NPCs that have multiple conversation paths.
    // ============================================================================
    startDialogueWithChoices(dialogueList, choices, callback, contextTrigger = null) {
        this.pendingChoices = { choices, callback, speaker: dialogueList[0]?.speaker || "NPC" };
        // 2026-06-11: Store the parent trigger so the choice handler can reference
        // it later (e.g. for `action: "recruit"`, we need to know which NPC the
        // player is talking to). This makes the recruit flow fully dynamic — any
        // future NPC with `action: "recruit"` in its branches just works.
        this.activeDialogueTrigger = contextTrigger;
        this.startDialogue(dialogueList, null);
    }

    // Show the choice menu UI. Player navigates with W/S and confirms with Enter.
    showChoiceMenu(choices, callback, speakerName) {
        this.choiceMenuActive = true;
        this.activeChoices = choices;
        this.choiceCallback = callback;
        this.selectedChoiceIndex = 0;

        // 2026-06-11 FIX: Hide the controls panel so it doesn't hover over the
        // choice text (e.g., D1 Joe's branching dialogue).
        const toolbox = document.getElementById("controls-toolbox");
        if (toolbox) toolbox.classList.add("choice-menu-active");

        const menu = document.getElementById("dialogue-choices");
        const list = document.getElementById("choices-list");
        const header = menu.querySelector(".choices-header");
        if (header) header.innerText = (speakerName ? speakerName + ": " : "") + "What do you say?";

        list.innerHTML = "";
        choices.forEach((c, idx) => {
            const btn = document.createElement("button");
            btn.className = "choice-btn";
            btn.setAttribute("data-idx", idx);
            btn.innerText = c.label;
            if (idx === 0) btn.classList.add("selected");
            list.appendChild(btn);
        });

        menu.classList.remove("hidden");
    }

    // Hide the choice menu UI
    hideChoiceMenu() {
        this.choiceMenuActive = false;
        this.activeChoices = null;
        this.choiceCallback = null;
        // 2026-06-11: SAFETY NET — also stop any in-flight dialogue typewriter
        // when the choice menu closes. Without this, a typewriter that was
        // running on the intro dialogue would keep firing every 25ms,
        // potentially reading undefined fields if its captured dialogue
        // became invalid (e.g. after showRemoveMemberChoice completed).
        if (this.dialogueTypewriter) {
            clearInterval(this.dialogueTypewriter);
            this.dialogueTypewriter = null;
            this.isTypingDialogue = false;
        }
        const menu = document.getElementById("dialogue-choices");
        if (menu) menu.classList.add("hidden");
        // 2026-06-11 FIX: Re-show the controls panel when the choice menu closes.
        const toolbox = document.getElementById("controls-toolbox");
        if (toolbox) toolbox.classList.remove("choice-menu-active");
    }


    // Handle input when the choice menu is open
    handleChoiceInput(key, e) {
        if (!this.choiceMenuActive || !this.activeChoices) return false;
        if (key === "w" || key === "arrowup") {
            e.preventDefault();
            this.selectedChoiceIndex = (this.selectedChoiceIndex - 1 + this.activeChoices.length) % this.activeChoices.length;
            audio.playSelect();
            this.refreshChoiceSelection();
            return true;
        } else if (key === "s" || key === "arrowdown") {
            e.preventDefault();
            this.selectedChoiceIndex = (this.selectedChoiceIndex + 1) % this.activeChoices.length;
            audio.playSelect();
            this.refreshChoiceSelection();
            return true;
        } else if (key === "enter" || key === " " || key === "spacebar") {
            e.preventDefault();
            const choice = this.activeChoices[this.selectedChoiceIndex];
            const speakerName = document.getElementById("dialogue-speaker").innerText || "NPC";
            const cb = this.choiceCallback;
            this.hideChoiceMenu();
            audio.playSelect();
            console.log(`[BattleIQ:Branch] Player chose: "${choice.label}"`);

            // 2026-06-11: Stash the picked choice on a class property so the
            // dialogue callback (called later with no args by the standard
            // showNextDialogue flow) can access it via this._lastPickedChoice.
            // Cleared after the cb fires. This is the key fix for the
            // manual-swap menu crash where the cb received undefined.
            this._lastPickedChoice = choice;

            // 2026-06-11: Verbose diagnostic log — would have caught the
            // missing-arg bug in 1 line. Shows exactly which choice was
            // picked, what fields it has, and which cb will be invoked.
            this.logDiag("choiceFlow", "log", `Player picked choice #${this.selectedChoiceIndex}`, {
                label: choice.label,
                hasAction: !!choice.action,
                hasRemoveId: choice.removeId !== undefined,
                hasReply: typeof choice.reply === "string",
                cbType: typeof cb,
                cbName: cb?.name || "(anonymous)"
            });

            // 2026-06-11: Support speaker-switching mid-conversation (e.g., Audrey → Jacob).
            // If the choice has `nextSpeaker`, the reply will be attributed to that speaker.
            const replySpeaker = choice.nextSpeaker || speakerName;

            // 2026-06-11: Support nested branches (1-on-1 conversations that continue branching).
            // If the choice has `nextBranches`, queue them up to show AFTER the reply.
            if (choice.nextBranches && Array.isArray(choice.nextBranches) && choice.nextBranches.length > 0) {
                this.pendingChoices = {
                    choices: choice.nextBranches,
                    callback: cb,
                    speaker: choice.nextSpeaker || speakerName
                };
            }

            // 2026-06-11: DYNAMIC RECRUIT — fully self-configuring.
            // Derives the recruit from the parent trigger that owns this branch
            // (stored on this.activeDialogueTrigger by startDialogueWithChoices).
            // No hardcoded names, no recruitId field required in the choice data.
            // Any future NPC can add `action: "recruit"` to a branch and it works.
            if (choice.action === "recruit") {
                const ctxTrig = this.activeDialogueTrigger;
                // Prefer the trigger's explicit memberId; fall back to id; fall back
                // to the dialogue speaker name (last-resort).
                let recruitId = (ctxTrig && (ctxTrig.memberId || ctxTrig.id)) || null;
                if (!recruitId && typeof speakerName === "string") {
                    const speakerTrig = (overworld.activeTriggers || []).find(t =>
                        t.name && t.name.toLowerCase() === speakerName.toLowerCase()
                    );
                    if (speakerTrig) recruitId = speakerTrig.memberId || speakerTrig.id;
                }

                if (!recruitId) {
                    console.warn(`[BattleIQ:Recruit] Could not determine recruitId for "Join my party" branch. Trigger:`, ctxTrig);
                    this.startDialogue([
                        { speaker: "System", text: "Sorry, I can't join right now." }
                    ], cb);
                    return true;
                }

                const finalRecruitData = GAME_DATA.PLAYERS[recruitId];
                const finalRecruitName = finalRecruitData ? finalRecruitData.name : recruitId;

                this.startDialogue([
                    { speaker: replySpeaker, text: choice.reply }
                ], () => {
                    // recruitMember() respects party size — shows manual swap menu if full
                    if (typeof this.recruitMember === "function") {
                        this.recruitMember(recruitId);
                    }
                    this.showToast(`✅ ${finalRecruitName} has joined your party!`);
                    if (audio && audio.playRecruit) audio.playRecruit();
                    // Remove the parent trigger so the player can't recruit the same NPC twice
                    if (ctxTrig) {
                        overworld.activeTriggers = overworld.activeTriggers.filter(t => t !== ctxTrig);
                    }
                    // Clear the stored context so it doesn't leak to a future dialogue
                    this.activeDialogueTrigger = null;
                    if (cb) cb();
                });
                return true;
            }

            // Play the reply as a normal dialogue, then either call the callback
            // OR (if pendingChoices is set) show the next branch menu.
            this.startDialogue([
                { speaker: replySpeaker, text: choice.reply }
            ], cb);
            return true;
        }
        return false;
    }



    refreshChoiceSelection() {
        const buttons = document.querySelectorAll("#choices-list .choice-btn");
        buttons.forEach((btn, idx) => {
            if (idx === this.selectedChoiceIndex) btn.classList.add("selected");
            else btn.classList.remove("selected");
        });
    }

    // Refresh the visual selection state of the character select cards
    refreshCharSelectSelection() {
        const cards = document.querySelectorAll("#character-cards .char-card");
        cards.forEach((card, idx) => {
            if (idx === this.selectedCharIndex) {
                card.classList.add("selected");
                card.style.borderColor = "#ff3c82";
            } else {
                card.classList.remove("selected");
                card.style.borderColor = "#ffffff";
            }
        });
    }



    handleGlobalInput(e) {
        const key = e.key.toLowerCase();

        // Block all input while paused
        if (this.isPaused) {
            if (key === "p" || key === "escape") {
                e.preventDefault();
                this.resumeGame();
            } else if (key === "r") {
                e.preventDefault();
                this.restartCurrentAct();
            }
            return;
        }

        // H toggles the control toolbox (works in any state, including dialogue)
        if (key === "h") {
            if (typeof controlsHUD !== "undefined" && controlsHUD) {
                controlsHUD.toggleVisible();
                audio.playSelect();
            }
            return;
        }

        // P pauses / resumes the game
        if (key === "p") {
            e.preventDefault();
            this.togglePause();
            return;
        }

        // K saves the game (uses a non-blocking toast so movement isn't blocked).
        // Note: K is used instead of S to avoid conflict with the WASD move-down keybind.
        if (key === "k") {
            e.preventDefault();
            const ok = this.saveGame();
            this.showToast(ok ? "✓ GAME SAVED" : "✗ SAVE FAILED", !ok);
            audio.playSelect();
            return;
        }

        // 2026-06-11: F10 toggles the verbose diagnostic state dump. When ON,
        // every dialogue/choice/cb transition dumps the full state to the
        // console (in a collapsed group). Perfect for debugging stubborn bugs.
        if (key === "f10") {
            e.preventDefault();
            this.diag.stateDump = !this.diag.stateDump;
            this.showToast(this.diag.stateDump ? "🔍 STATE DUMP: ON" : "🔍 STATE DUMP: OFF");
            console.warn(`[BattleIQ:Diag] stateDump ${this.diag.stateDump ? "ENABLED" : "DISABLED"}. Press F10 again to toggle.`);
            if (this.diag.stateDump) {
                // Immediately dump the current state so the user can see it.
                this.dumpDialogueState("Manual state dump (F10)");
            }
            return;
        }




        // ============================================================================
        // CHARACTER SELECT INPUT: A/D or LEFT/RIGHT to navigate cards,
        // ENTER to confirm, ESC to go back to main menu.
        // ============================================================================
        if (this.currentState === "character-select") {
            if (key === "a" || key === "arrowleft") {
                e.preventDefault();
                this.selectedCharIndex = (this.selectedCharIndex - 1 + GAME_DATA.STARTING_CHARACTERS.length) % GAME_DATA.STARTING_CHARACTERS.length;
                audio.playSelect();
                this.refreshCharSelectSelection();
                return;
            } else if (key === "d" || key === "arrowright") {
                e.preventDefault();
                this.selectedCharIndex = (this.selectedCharIndex + 1) % GAME_DATA.STARTING_CHARACTERS.length;
                audio.playSelect();
                this.refreshCharSelectSelection();
                return;
            } else if (key === "enter" || key === " " || key === "spacebar") {
                e.preventDefault();
                const chosen = GAME_DATA.STARTING_CHARACTERS[this.selectedCharIndex];
                console.log(`[BattleIQ:CharSelect] Player selected: "${chosen.id}" (${chosen.name})`);
                this.startGameWithCharacter(chosen.id);
                return;
            } else if (key === "escape") {
                e.preventDefault();
                audio.playSelect();
                this.changeState("menu");
                return;
            }
            return; // Block all other input in character-select state
        }

        // ============================================================================
        // BRANCHING CHOICE MENU: intercept input when the choice menu is open.
        // This runs even if the dialogue box is hidden (it appears separately).
        // ============================================================================
        if (this.choiceMenuActive) {
            if (this.handleChoiceInput(key, e)) return;
        }


        if (document.getElementById("dialogue-box").classList.contains("hidden") === false) {

            if (key === "enter" || key === " " || key === "spacebar") {
                e.preventDefault();
                if (this.isTypingDialogue) {
                    clearInterval(this.dialogueTypewriter);
                    const dialogue = this.dialogueQueue[this.dialogueIndex - 1];
                    document.getElementById("dialogue-text").innerText = dialogue.text;
                    this.isTypingDialogue = false;
                } else {
                    audio.playSelect();
                    this.showNextDialogue();
                }
            }
            return;
        }


        if (this.currentState === "overworld") {
            overworld.handleInput(e);
        }

        if (this.currentState === "battle") {
            battleController.handleInput(e);
        }
    }

    triggerBattleTransition(enemyId, callback) {
        audio.stopBgm();
        audio.playBattleTrigger();

        const flash = document.getElementById("flash-overlay");
        flash.classList.remove("hidden");
        flash.classList.add("flash-active");

        let shakes = 0;
        const screen = document.getElementById("screen-container");

        const shakeInterval = setInterval(() => {
            screen.classList.add("shake");
            setTimeout(() => screen.classList.remove("shake"), 80);
            shakes++;
            if (shakes >= 4) {
                clearInterval(shakeInterval);
            }
        }, 120);

        setTimeout(() => {
            flash.classList.add("hidden");
            flash.classList.remove("flash-active");
            callback();
        }, 800);
    }

    recruitMember(memberId) {
        // ============================================================================
        // DUPLICATE GUARD: If a member with the same name is already in the party,
        // skip adding them again. This prevents Jacob from being added twice when
        // the auto-recruit in winBattle() fires AND the recruit trigger in the next
        // map also fires.
        // ============================================================================
        if (!GAME_DATA.PLAYERS[memberId]) {
            console.warn(`[BattleIQ:Recruit] memberId="${memberId}" not found in GAME_DATA.PLAYERS. Skipped.`);
            return;
        }
        const newMember = JSON.parse(JSON.stringify(GAME_DATA.PLAYERS[memberId]));
        const isAlreadyInParty = (this.party || []).some(p => p.name === newMember.name);
        if (isAlreadyInParty) {
            console.log(`[BattleIQ:Recruit] "${newMember.name}" already in party. Skipped duplicate.`);
            return;
        }

        // ============================================================================
        // 2026-06-11: Enforce MAX_PARTY_SIZE = 3 with MANUAL choice.
        // If adding the new member would exceed the cap, show a choice menu
        // asking which current member to remove. The player picks!
        // ============================================================================
        const MAX_PARTY_SIZE = 3;
        if (this.party.length >= MAX_PARTY_SIZE) {
            console.log(`[BattleIQ:Recruit] Party is FULL (${MAX_PARTY_SIZE}). Showing manual swap menu for "${newMember.name}".`);
            this.pendingRecruit = newMember; // store for showRemoveMemberChoice()
            this.showRemoveMemberChoice(newMember);
            return; // wait for the player's choice
        }

        // Party has room — just add the new member
        this._finalizeRecruit(newMember);
    }

    // Helper: actually push the new member into the party
    _finalizeRecruit(newMember) {
        this.party.push(newMember);
        if (audio && audio.playRecruit) audio.playRecruit();
        console.log(`[BattleIQ:Recruit] "${newMember.name}" joined the party. Party: [${this.party.map(p => p.name).join(", ")}] (${this.party.length} members)`);
        if (this.showToast) {
            this.showToast(`✅ ${newMember.name} has joined your party!`);
        }
    }

    // 2026-06-11: Show a choice menu asking the player WHICH current party
    // member to remove, before adding the new recruit. The player has full control.
    // LOCKED members (locked: true) are SKIPPED — they cannot be removed.
    showRemoveMemberChoice(newMember) {
        if (!newMember) {
            this.pendingRecruit = null;
            return;
        }
        // Build the choice list: one option per UNLOCKED current party member.
        // Locked members are skipped to prevent the player from losing their
        // starting character or any member they explicitly marked as protected.
        const choices = this.party
            .filter(p => !p.locked)  // 2026-06-11: skip locked members
            .map(p => ({
                label: `Remove ${p.name} (${p.hp}/${p.maxHp} HP)`,
                removeId: p.name
            }));

        // Edge case: ALL party members are locked. Tell the player they can't recruit.
        if (choices.length === 0) {
            this.startDialogue([
                {
                    speaker: "System",
                    text: `All current party members are LOCKED. Unlock a member first (L key in battle) to make room for ${newMember.name}.`
                }
            ], () => {
                this.pendingRecruit = null;
            });
            return;
        }

        // Add a "Cancel" option (don't add newMember)
        choices.push({ label: "Cancel (don't recruit)", removeId: null });


        // 2026-06-11: FIX — pass the actual handler as the 3rd arg of
        // startDialogueWithChoices so it doesn't get overwritten by the
        // standard showChoiceMenu callback assignment (which set
        // this.choiceCallback = null from pendingChoices.callback = null).
        const choiceHandler = (choice) => {
            this.hideChoiceMenu();

            // 2026-06-11: DEFENSIVE NULL GUARD. The standard cb call now
            // passes this._lastPickedChoice as an arg, but if the cb fires
            // through some other path (e.g. skipped handleChoiceInput),
            // choice could still be undefined. Dump state + warn instead of
            // crashing so we can see exactly what's happening.
            if (!choice) {
                this.logDiag("errors", "error", `Manual swap choiceHandler called with NO CHOICE!`, {
                    newMember: newMember?.name,
                    expectedRemoveId: newMember?.memberId,
                    fallbackChoice: this._lastPickedChoice
                });
                this.dumpDialogueState("CRASH: choiceHandler called with no choice");
                // Try to recover by using the stashed choice
                choice = this._lastPickedChoice;
                if (!choice) {
                    console.error(`[BattleIQ:Recruit] ABORTING — no choice available for manual swap.`);
                    this.pendingRecruit = null;
                    return;
                }
            }

            if (choice.removeId) {
                const victim = this.party.find(p => p.name === choice.removeId);
                if (victim) {
                    this.party = this.party.filter(p => p !== victim);
                    console.log(`[BattleIQ:Recruit] Player chose to remove "${victim.name}" to make room for ${newMember.name}.`);
                    if (this.showToast) {
                        this.showToast(`📤 Removed ${victim.name} to add ${newMember.name}`);
                    }
                    // 2026-06-11: FIX — actually finalize the recruit (add the
                    // new member) after the old one is removed. Previously the
                    // remove logic ran but _finalizeRecruit was never called,
                    // so the new member (e.g., Jacob) never joined the party.
                    this._finalizeRecruit(newMember);
                }
            } else {
                console.log(`[BattleIQ:Recruit] Player cancelled recruiting ${newMember.name}.`);
                if (this.showToast) {
                    this.showToast(`❌ Recruitment cancelled. ${newMember.name} did not join.`);
                }
            }
            this.pendingRecruit = null;
        };
        this.startDialogueWithChoices(
            [
                {
                    speaker: "System",
                    text: `Party is full (${this.party.length}/${3}). ${newMember.name} wants to join. Remove a current member to make room?`
                }
            ],
            choices,
            choiceHandler
        );
    }





    /**
     * Mark a boss fight as defeated for the given act index.
     * The exit trigger on the overworld map checks this flag to allow progression.
     * @param {number} actIndex - 0-indexed act number
     */
    markBossDefeated(actIndex) {
        if (actIndex >= 0 && actIndex < this.bossDefeated.length) {
            this.bossDefeated[actIndex] = true;
            console.log(`[BattleIQ:Boss] Boss for act ${actIndex + 1} marked as defeated. bossDefeated=[${this.bossDefeated.map(b => b ? "✓" : "✗").join(",")}]`);
        }
    }


    /**
     * Check if the boss for the current act has been defeated.
     * @returns {boolean}
     */
    isCurrentBossDefeated() {
        return this.bossDefeated[this.currentActIndex] === true;
    }


    /**
     * 2026-06-11: Dynamic boss progression
     * Returns the boss ID for a given act, EXCLUDING the player's starting character.
     * The final boss (Ben) is always the final boss.
     * @param {number} actIndex - 0-indexed act number
     * @returns {string|null} - the boss enemy ID (key in GAME_DATA.ENEMIES), or null if final act
     */
    getBossForAct(actIndex) {
        // Final boss is always Ben
        if (actIndex === 3) return "ben";
        // For acts 0-2, pick a boss from the 3 non-starting characters
        const availableBosses = ["jacob", "hedgecock_boss", "eric", "maharko_boss"]
            .filter(id => {
                // Map boss id to player id to compare
                const bossToPlayerMap = {
                    "jacob": "lebby",
                    "hedgecock_boss": "hedgecock",
                    "eric": "eric",  // eric's enemy is the player eric himself
                    "maharko_boss": "maharko"
                };
                return bossToPlayerMap[id] !== this.startingCharId;
            });
        // Pick the boss in order from available bosses
        if (availableBosses.length === 0) return "jacob"; // fallback
        return availableBosses[actIndex % availableBosses.length];
    }

    /**
     * 2026-06-11: When a boss is defeated, set the active enemy to the next dynamic boss.
     * This is called from battle.js winBattle() and from advanceAct() to load the
     * correct boss enemy for the upcoming fight.
     *
     * 2026-06-11 v2: FIXED — Previously the boss order was hardcoded in bossMap,
     * which meant Act 2 could repeat the same boss as Act 1 (the user just beat).
     * Now we DYNAMICALLY pick each act's boss from a pool that excludes:
     *   1. The player's starting character (e.g., Jacob player → no Jacob boss)
     *   2. Any bosses used in PREVIOUS acts (e.g., if Act 1 was Hedgecock, Act 2
     *      cannot be Hedgecock again)
     * Final boss (Act 4 / index 3) is always Ben.
     */
    setNextDynamicBoss() {
        // Only build the queue if it's empty (preserves queue across calls within same game)
        if (!this.bossEncounterQueue || this.bossEncounterQueue.length === 0) {
            this.bossEncounterQueue = [];

            // Map player's starting character ID to the BOSS ID that represents them
            const playerToBossMap = {
                "lebby": "jacob",
                "hedgecock": "hedgecock_boss",
                "eric": "eric",
                "maharko": "maharko_boss"
            };
            const excludedBoss = playerToBossMap[this.startingCharId];
            const allActBosses = ["jacob", "hedgecock_boss", "eric", "maharko_boss"];

            // Build the queue for acts 0, 1, 2 (Act 3 is Ben, always)
            for (let act = 0; act < 3; act++) {
                // Pool = all bosses MINUS the player's character MINUS bosses used in previous acts
                const usedInPreviousActs = this.bossEncounterQueue.filter(Boolean);
                const available = allActBosses.filter(b =>
                    b !== excludedBoss && !usedInPreviousActs.includes(b)
                );

                if (available.length === 0) {
                    // Edge case: somehow no bosses left. Fall back to a safe default
                    // (shouldn't happen with 4 bosses and 3 acts)
                    console.warn(`[BattleIQ:Boss] No bosses available for act ${act}! Using fallback "eric".`);
                    this.bossEncounterQueue.push("eric");
                } else {
                    // Pick a random boss from the available pool
                    const pick = available[Math.floor(Math.random() * available.length)];
                    this.bossEncounterQueue.push(pick);
                    console.log(`[BattleIQ:Boss] Act ${act + 1} boss: "${pick}". Used so far: [${this.bossEncounterQueue.join(", ")}]. Player: "${this.startingCharId}" (excluded: ${excludedBoss || "none"}).`);
                }
            }
            // Final boss is always Ben (Act 4 / index 3)
            this.bossEncounterQueue.push("ben");
        }
    }


    /**
     * Returns the boss ID for the CURRENT act (used when loading a new act's map).
     * Initializes the queue on first call.
     */
    getCurrentActBoss() {
        if (!this.bossEncounterQueue || this.bossEncounterQueue.length === 0) {
            this.setNextDynamicBoss();
        }
        return this.bossEncounterQueue[this.currentActIndex] || "ben";
    }

    /**
     * 2026-06-11: Build a dynamic chapter title that includes the current act's
     * boss name. Replaces the hardcoded "ACT II: The Rockville Playground" with
     * something like "ACT II: Confront Myat Maharko!". Falls back to the
     * CHAPTERS[].title string if the boss or chapter can't be resolved.
     * @param {number} actIndex
     * @param {string} bossId
     * @returns {string}
     */
    getDynamicTitle(actIndex, bossId) {
        const chapter = GAME_DATA.CHAPTERS[actIndex];
        if (!chapter) return "";
        if (!bossId || bossId === "ben") {
            // Final boss or no boss resolved: use the static title
            return chapter.title;
        }
        const boss = GAME_DATA.ENEMIES[bossId];
        if (!boss) return chapter.title;
        // Strip the "(Mode)" subtitle from the boss name for a cleaner display
        const bossShortName = boss.name.split(" (")[0];
        // Keep the original chapter title prefix (e.g. "ACT II:") and append the boss
        return `${chapter.title} — ${bossShortName}!`;
    }

    advanceAct() {
        this.currentActIndex++;
        if (this.currentActIndex >= GAME_DATA.CHAPTERS.length) {
            console.log("[BattleIQ:Act] All acts complete. Showing victory screen.");
            this.showVictoryScreen();
            return;
        }

        // Auto-save on act advance so the player can always resume
        this.saveGame();

        // 2026-06-11: Override the next act's objective to mention the new dynamic boss
        const chapter = GAME_DATA.CHAPTERS[this.currentActIndex];
        const nextBossId = this.getCurrentActBoss();
        const nextBoss = GAME_DATA.ENEMIES[nextBossId];
        const bossName = nextBoss ? nextBoss.name : "the next boss";

        // Load the new map and switch to overworld FIRST (don't gate on dialogue dismissal)
        this.activeMapId = chapter.startMap;
        overworld.loadMap(this.activeMapId);
        this.changeState("overworld");

        // 2026-06-11 FIX: Defer the chapter-indicator / objective-box DOM update
        // to AFTER changeState() so the .active class is on #overworld-state
        // before the elements are queried/rendered. (Previously the update
        // could happen before the parent was active, causing the player to
        // briefly see the OLD chapter title and OLD objective.)
        setTimeout(() => {
            const chapterEl = document.querySelector(".chapter-indicator");
            const objectiveEl = document.querySelector(".objective-box");
            if (chapterEl) chapterEl.innerText = this.getDynamicTitle(this.currentActIndex, nextBossId);
            if (objectiveEl) objectiveEl.innerText = "Objective: Confront " + bossName + "!";
            console.log(`[BattleIQ:Act] UI updated → chapter="${this.getDynamicTitle(this.currentActIndex, nextBossId)}", objective="Confront ${bossName}!"`);
        }, 50);

        // Show a quick transition toast (non-blocking) so player knows the act changed
        const actMessages = {
            0: `→ ${chapter.title}: Confront ${bossName}!`,
            1: `→ ${chapter.title}: ${bossName} awaits!`,
            2: `→ ${chapter.title}: Time to take on ${bossName}!`
        };
        if (actMessages[this.currentActIndex]) {
            this.showToast(actMessages[this.currentActIndex]);
        }

        console.log(`[BattleIQ:Act] Advanced to act ${this.currentActIndex + 1} (${chapter.title}). Map: ${chapter.startMap}. Party: [${this.party.map(p => p.name).join(", ")}] (${this.party.length} members). Next boss: ${bossName}`);
    }



}


const game = new GameCoordinator();
window.addEventListener("DOMContentLoaded", () => {
    game.init();
});

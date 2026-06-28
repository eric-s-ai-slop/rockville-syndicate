/**
 * BattleIQ: The Rockville Chronicles - Overworld Engine (HD Edition)
 * Manages 2D tilemap rendering, player movement, collision checking, and interaction prompts.
 * Now uses the PixelArtAssets module for beautiful 32x32 pixel art sprites and dynamic tiles.
 */

class OverworldEngine {
    constructor() {
        this.canvas = null;
        this.ctx = null;

        // Active map properties
        this.activeMap = null;
        this.tiles = [];
        this.tileSize = 32;

        // Player properties
        this.playerX = 0;
        this.playerY = 0;
        this.playerDir = "down";
        this.walking = false;
        this.lastMoveTime = 0;

        // Interaction helper
        this.nearTrigger = null;

        // Initialize the pixel art context bridge
        pixelArt.ctx = null; // Will be assigned during render()
    }

    loadMap(mapId) {
        this.canvas = document.getElementById("overworld-canvas");
        this.ctx = this.canvas.getContext("2d");
        pixelArt.ctx = this.ctx; // Inject context to asset engine

        this.activeMap = GAME_DATA.MAPS[mapId];
        this.tiles = this.activeMap.tiles;
        this.tileSize = this.activeMap.tileSize;

        this.playerX = this.activeMap.playerStart.x;
        this.playerY = this.activeMap.playerStart.y;
        this.playerDir = "down";
        this.walking = false;
        this.nearTrigger = null;

        // Build a copy of the triggers so we can mutate (e.g. remove consumed recruit triggers)
        this.activeTriggers = JSON.parse(JSON.stringify(this.activeMap.triggers || []));

        // ============================================================================
        // FILTER RECRUIT TRIGGERS: If a recruit trigger's member is already in the
        // party (e.g., auto-recruited after a boss fight), hide the trigger so the
        // player can't try to recruit them again. The user already has them.
        // ============================================================================
        const partyMemberNames = new Set((game.party || []).map(p => p.name.toLowerCase()));

        this.activeTriggers = this.activeTriggers.filter(trig => {
            if (trig.type === "recruit" && GAME_DATA.PLAYERS[trig.memberId]) {
                const memberName = GAME_DATA.PLAYERS[trig.memberId].name;
                const alreadyInParty = partyMemberNames.has(memberName.toLowerCase());
                if (alreadyInParty) {
                    console.log(`[BattleIQ:Map] Filtered out recruit trigger for "${memberName}" (already in party) at (${trig.x},${trig.y})`);
                    // 2026-06-11: Highlight the Maharko-specific case so the dev
                    // console clearly shows the duplicate-recruit prevention fired
                    // (e.g., Maharko auto-recruited as Act 1 boss AND she's the
                    // cabin NPC — we must not show her twice).
                    if (trig.memberId === "maharko") {
                        console.log(`[BattleIQ:Map] 🛡️  MAHARKO SAFETY: Prevented duplicate recruit trigger at (${trig.x},${trig.y}). She's already in the party.`);
                    }
                    return false;
                }
            }
            // 2026-06-11: NEW — Hide NPC triggers for characters already in the
            // party (e.g., Maharko cabin NPC at (4,5) when Maharko is the
            // starting character or was auto-recruited as a mid-boss). This
            // prevents "duplicate character" appearances in a single session.
            // IMPORTANT: Skip triggers that have triggerBattle — these are
            // DYNAMIC boss triggers that resolve to the current act's boss
            // (NOT to the NPC's static name). They must always be reachable
            // even if the NPC's static name happens to match a party member.
            // Without this guard, picking Jacob/Hedgecock/Eric as the starting
            // character would hide the act's boss trigger, leaving no way to
            // progress through the game.
            if (trig.type === "npc" && trig.name && !trig.triggerBattle) {
                const alreadyInParty = partyMemberNames.has(trig.name.toLowerCase());
                if (alreadyInParty) {
                    console.log(`[BattleIQ:Map] Filtered out NPC trigger for "${trig.name}" (already in party) at (${trig.x},${trig.y})`);
                    return false;
                }
            }
            return true;
        });


        // Log a full state dump of the loaded map
        const partySummary = (game && game.party) ? game.party.map(p => p.name + " (" + p.hp + "/" + p.maxHp + ")").join(", ") : "none";
        console.log(`[BattleIQ:Map] Loaded "${mapId}" (${this.activeMap.theme}). Player at (${this.playerX},${this.playerY}). Party: [${partySummary}]. Triggers: ${this.activeTriggers.length}`);

        this.startLoop();
    }


    resizeCanvas() {
        if (!this.canvas) return;
        this.canvas.width = 640;
        this.canvas.height = 480;
    }

    startLoop() {
        if (this.renderTimer) cancelAnimationFrame(this.renderTimer);
        const tick = () => {
            if (game.currentState !== "overworld") return;
            this.update();
            this.render();
            this.renderTimer = requestAnimationFrame(tick);
        };
        this.renderTimer = requestAnimationFrame(tick);
    }


    update() {
        // Decay walking animation state
        if (Date.now() - this.lastMoveTime > 200) {
            this.walking = false;
        }
        pixelArt.tick();
        this.checkTriggerProximity();
    }

    /**
     * Visual helpers to make Jacob (and other story-critical NPCs) easy to find.
     * - Pulsing yellow ring on the NPC's tile
     * - Floating "TALK TO JACOB" speech bubble above their head
     * - Red directional arrow at the top of the screen when out of range
     */
    renderNpcOverlays() {
        // DISABLED: No more yellow rings, speech bubbles, or directional arrows.
        // The player must explore the map naturally to find objectives.
        // (Original drawDirectionalArrow function also removed to save space)
    }

    drawDirectionalArrow() {
        // DISABLED: Directional arrow rendering removed.
    }


    render() {


        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Render map tiles (using HD pixel art)
        for (let y = 0; y < this.tiles.length; y++) {
            for (let x = 0; x < this.tiles[y].length; x++) {
                const tile = this.tiles[y][x];
                const px = x * this.tileSize;
                const py = y * this.tileSize;
                this.renderTile(tile, px, py);
            }
        }

        // 2. Render ambient decorations (trees, cars, signs) per map theme
        this.renderDecorations();

        // 3. Render Map triggers / NPCs (use activeTriggers so consumed recruit triggers disappear)
        const triggers = this.activeTriggers || this.activeMap.triggers;
        if (triggers) {
            triggers.forEach(trig => {
                if (trig.type === "npc" || trig.type === "recruit") {
                    const px = trig.x * this.tileSize;
                    const py = trig.y * this.tileSize;
                    // 2026-06-11: pass the full trigger so renderNpc can
                    // distinguish dynamic-boss triggers (triggerBattle: "act_boss")
                    // from static NPCs that happen to share a boss name (e.g. the
                    // cabin's static Eric at (2,4) should NOT be re-skinned to Ben
                    // just because Act 4's boss is Ben).
                    this.renderNpc(trig, px, py);
                }
            });
        }


        // 3. Render Player (leader)

        const playerPx = this.playerX * this.tileSize;
        const playerPy = this.playerY * this.tileSize;
        this.renderPlayer(playerPx, playerPy);

        // 4. Render Action prompts
        if (this.nearTrigger) {
            this.ctx.font = "12px 'Silkscreen', monospace";
            this.ctx.textAlign = "center";
            this.ctx.fillStyle = "#000000";
            this.ctx.strokeStyle = "#ffffff";
            this.ctx.lineWidth = 3;

            const promptY = this.playerY * this.tileSize - 8;
            let text;
            if (this.nearTrigger.type === "exit") {
                text = ">> GO [SPACE] <<";
            } else if (this.nearTrigger.type === "back") {
                text = "<< GO BACK [SPACE]";
            } else {
                text = ">> TALK [SPACE] <<";
            }

            this.ctx.strokeText(text, playerPx + 16, promptY);
            this.ctx.fillStyle = "#ffd700";
            this.ctx.fillText(text, playerPx + 16, promptY);
        }


        // 5. Mini-map (top right corner) - simple square representation
        this.renderMinimap();

        // 6. NPC finder overlays (pulsing rings, speech bubbles, direction arrows)
        this.renderNpcOverlays();
    }


    renderTile(tile, px, py) {
        const s = this.tileSize;
        const theme = (this.activeMap && this.activeMap.theme) || "brick";
        switch (tile) {
            case 0: // Default walkable - theme-dependent
                if (theme === "playground") {
                    pixelArt.drawSandTile(px, py, s, pixelArt.animFrame);
                } else if (theme === "dorm") {
                    pixelArt.drawCarpetTile(px, py, s);
                } else if (theme === "wood") {
                    pixelArt.drawWoodPlankTile(px, py, s);
                } else {
                    pixelArt.drawGrassTile(px, py, s, pixelArt.animFrame);
                }
                break;
            case 1: // Solid stone block - theme-dependent
                if (theme === "playground") {
                    pixelArt.drawRubberMatTile(px, py, s);
                } else if (theme === "dorm") {
                    pixelArt.drawCheckeredTile(px, py, s);
                } else if (theme === "wood") {
                    pixelArt.drawSnowTile(px, py, s, pixelArt.animFrame);
                } else {
                    pixelArt.drawWallTile(px, py, s);
                }
                break;
            case 2: // Building wall
                if (theme === "dorm") {
                    pixelArt.drawCheckeredTile(px, py, s);
                } else if (theme === "wood") {
                    pixelArt.drawWoodPlankTile(px, py, s);
                } else {
                    pixelArt.drawWallTile(px, py, s);
                    pixelArt.drawBuildingWindow(px + 4, py + 4, s - 8, true);
                }
                break;
            case 3: // Building wall, unlit
                if (theme === "dorm") {
                    pixelArt.drawCheckeredTile(px, py, s);
                } else if (theme === "wood") {
                    pixelArt.drawWoodPlankTile(px, py, s);
                } else {
                    pixelArt.drawWallTile(px, py, s);
                    pixelArt.drawBuildingWindow(px + 4, py + 4, s - 8, false);
                }
                break;
            case 4: // Counter / furniture - theme dependent
                this.ctx.fillStyle = "#8b5e3a";
                this.ctx.fillRect(px, py, s, s);
                this.ctx.fillStyle = "#5a3a1a";
                this.ctx.fillRect(px, py, s, 4);
                break;
            case 5: // Decorative (path)
                if (theme === "playground") {
                    pixelArt.drawRubberMatTile(px, py, s);
                } else if (theme === "dorm") {
                    pixelArt.drawCarpetTile(px, py, s);
                } else if (theme === "wood") {
                    pixelArt.drawSnowTile(px, py, s, pixelArt.animFrame);
                } else {
                    pixelArt.drawDirtTile(px, py, s);
                }
                break;
            case 9: // Exit portal
                pixelArt.drawExitPortal(px, py, s, pixelArt.animFrame);
                break;
            default:
                pixelArt.drawGrassTile(px, py, s, pixelArt.animFrame);
        }
    }

    /**
     * Render ambient decorations on top of the tiles but below the player and NPCs.
     * Theme-specific props: trees, cars, signs, etc.
     */
    renderDecorations() {
        if (!this.activeMap) return;
        const s = this.tileSize;
        const theme = this.activeMap.theme || "brick";

        // Static decoration locations per map (decorative, non-collidable)
        // 2026-06-11: Removed the confusing "POTOMAC" and "PLAY" signs.
        const decorSpots = {
            shepherdstown: [
                { x: 6, y: 6, type: "tree" },
                { x: 11, y: 6, type: "tree" }
            ],
            rockville: [
                { x: 5, y: 5, type: "car", color: "#cc3333" },
                { x: 10, y: 9, type: "car", color: "#3366cc" }
            ],
            commons: [
                { x: 5, y: 6, type: "sign", text: "1522" },
                { x: 14, y: 6, type: "sign", text: "1523" }
            ],
            cabin: [
                { x: 3, y: 4, type: "pine" },
                { x: 6, y: 4, type: "pine" },
                { x: 14, y: 4, type: "pine" },
                { x: 16, y: 5, type: "pine" }
            ]
        };


        const spots = decorSpots[this.activeMapId] || decorSpots.shepherdstown;
        for (let i = 0; i < spots.length; i++) {
            const d = spots[i];
            const px = d.x * s;
            const py = d.y * s;
            if (d.type === "tree") {
                pixelArt.drawTree(px, py, s);
            } else if (d.type === "pine") {
                pixelArt.drawPineTree(px, py, s);
            } else if (d.type === "car") {
                pixelArt.drawCar(px, py, s, d.color);
            } else if (d.type === "sign") {
                pixelArt.drawSign(px, py, s, d.text);
            }
        }

        // ============================================================================
        // 2026-06-11: Draw OBVIOUS arrows on back-exit and forward-exit tiles
        // so the player always knows where they can go.
        // ============================================================================
        const triggers = this.activeTriggers || this.activeMap.triggers || [];
        for (let i = 0; i < triggers.length; i++) {
            const trig = triggers[i];
            const tx = trig.x;
            const ty = trig.y;
            if (trig.type === "back") {
                this.drawBackExitArrow(tx, ty);
            } else if (trig.type === "exit") {
                // Forward exit: show ✓ if boss is defeated, ✗ if not
                const isOpen = (typeof game.isCurrentBossDefeated === "function")
                    ? game.isCurrentBossDefeated() : false;
                this.drawForwardExitIndicator(tx, ty, isOpen);
            }
        }

        // ============================================================================
        // 2026-06-11: AUDREY STANDING OUTSIDE HER HOUSE.
        // The user wanted to see Audrey's sprite on the world map outside her
        // house. The Audrey trigger is at (3, 3) (her house door). We draw
        // a SECOND visible Audrey sprite at (3, 7) (just south of the house,
        // clearly visible walking around the playground) so the player can
        // always see her on the map.
        // ============================================================================
        if (this.activeMapId === "rockville") {
            const audreyPx = 3 * s;
            const audreyPy = 7 * s;
            pixelArt.drawAudrey(audreyPx - 16, audreyPy - 28, 2, false);
        }
    }


    // 2026-06-11: Draw a glowing left-pointing arrow on the back-exit tile
    // with the text "← PREV" so the player can clearly see where to go back.
    drawBackExitArrow(tileX, tileY) {
        const s = this.tileSize;
        const cx = tileX * s + s / 2;
        const cy = tileY * s + s / 2;
        const t = Date.now() / 200;
        const pulse = 0.5 + 0.5 * Math.sin(t); // 0..1 pulsing

        // Cyan glowing diamond backing
        this.ctx.fillStyle = `rgba(77, 243, 255, ${0.25 + pulse * 0.2})`;
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy - 14);
        this.ctx.lineTo(cx + 14, cy);
        this.ctx.lineTo(cx, cy + 14);
        this.ctx.lineTo(cx - 14, cy);
        this.ctx.closePath();
        this.ctx.fill();

        // Left arrow "←" drawn in cyan
        this.ctx.strokeStyle = "#4df3ff";
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(cx - 8, cy);
        this.ctx.lineTo(cx + 8, cy);
        this.ctx.moveTo(cx - 8, cy);
        this.ctx.lineTo(cx - 3, cy - 4);
        this.ctx.moveTo(cx - 8, cy);
        this.ctx.lineTo(cx - 3, cy + 4);
        this.ctx.stroke();

        // "PREV" label below
        this.ctx.fillStyle = "#4df3ff";
        this.ctx.font = "7px 'Press Start 2P', monospace";
        this.ctx.textAlign = "center";
        this.ctx.fillText("PREV", cx, cy + 22);
    }

    // 2026-06-11: Draw a forward-pointing arrow on the forward-exit tile.
    // Shows a green ✓ if the boss for this act is defeated (exit is open),
    // or a red ✗ if the boss is still alive (exit is sealed).
    drawForwardExitIndicator(tileX, tileY, isOpen) {
        const s = this.tileSize;
        const cx = tileX * s + s / 2;
        const cy = tileY * s + s / 2;
        const t = Date.now() / 250;
        const pulse = 0.5 + 0.5 * Math.sin(t);

        // Backing diamond — green if open, red if sealed
        const color = isOpen ? "#4dff8a" : "#ff004c";
        this.ctx.fillStyle = isOpen
            ? `rgba(77, 255, 138, ${0.25 + pulse * 0.2})`
            : `rgba(255, 0, 76, ${0.25 + pulse * 0.2})`;
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy - 14);
        this.ctx.lineTo(cx + 14, cy);
        this.ctx.lineTo(cx, cy + 14);
        this.ctx.lineTo(cx - 14, cy);
        this.ctx.closePath();
        this.ctx.fill();

        // Right arrow "→" or right pointer
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(cx - 8, cy);
        this.ctx.lineTo(cx + 8, cy);
        this.ctx.moveTo(cx + 8, cy);
        this.ctx.lineTo(cx + 3, cy - 4);
        this.ctx.moveTo(cx + 8, cy);
        this.ctx.lineTo(cx + 3, cy + 4);
        this.ctx.stroke();

        // Label: "NEXT ✓" or "SEALED ✗"
        this.ctx.fillStyle = color;
        this.ctx.font = "7px 'Press Start 2P', monospace";
        this.ctx.textAlign = "center";
        this.ctx.fillText(isOpen ? "NEXT ✓" : "SEALED ✗", cx, cy + 22);
    }



    renderNpc(trigOrId, px, py) {
        const s = this.tileSize;
        // Center the sprite in the tile
        const offsetX = (s - 32) / 2; // assumes 32px wide sprite at scale 2 (16*2)
        const offsetY = s - 32; // plant feet at bottom

        // 2026-06-11: Accept either a trigger object (preferred) or a bare id
        // (backwards-compat). When given the trigger, we can tell whether this
        // NPC is a DYNAMIC boss trigger (triggerBattle: "act_boss") or a
        // STATIC NPC that just happens to share a boss name. Only dynamic
        // boss triggers should be re-skinned to match the current act boss.
        const trig = (trigOrId && typeof trigOrId === "object") ? trigOrId : null;
        const id = trig ? (trig.id || trig.memberId) : trigOrId;
        const isDynamicBoss = trig && trig.triggerBattle === "act_boss";

        // 2026-06-11 FIX: DYNAMIC BOSS SPRITE.
        // If this is a DYNAMIC boss trigger (jacob, hedgecock, eric, or ben id),
        // look up the ACTUAL current-act boss via game.getCurrentActBoss()
        // (the player might be Jacob, in which case the actual boss is
        // Hedgecock, Eric, or Maharko — not Jacob). Static NPCs (like the
        // cabin's Eric at (2,4)) must keep their own sprite — previously they
        // got re-skinned to the act boss (e.g. Ben in Act 4).
        let effectiveId = id;
        if (isDynamicBoss && (id === "jacob" || id === "hedgecock" || id === "eric" || id === "ben")) {
            if (typeof game !== "undefined" && game && game.getCurrentActBoss) {
                const actualBoss = game.getCurrentActBoss();
                if (actualBoss) {
                    // Map boss id to the right NPC sprite key
                    if (actualBoss === "hedgecock_boss") effectiveId = "hedgecock";
                    else if (actualBoss === "eric") effectiveId = "eric";
                    else if (actualBoss === "maharko_boss") effectiveId = "maharko";
                    else if (actualBoss === "ben") effectiveId = "ben";
                    else effectiveId = "jacob"; // default to jacob
                }
            }
        }

        switch (effectiveId) {
            case "suitmate":
                // Generic NPC
                this.ctx.fillStyle = "#5a3f25";
                this.ctx.fillRect(px + 8, py + 4, 16, 24);
                this.ctx.fillStyle = "#fcd5b4";
                this.ctx.fillRect(px + 9, py + 0, 14, 12);
                break;
            case "jacob":
                pixelArt.drawJacobCow(px - 16, py - 28, 2, false);
                break;
            case "farrar":
                pixelArt.drawNickFarrar(px - 16, py - 28, 2, false);
                break;
            case "hedgecock":
                pixelArt.drawNickHedgecock(px - 16, py - 28, 2, false);
                break;
            case "eric":
                pixelArt.drawEric(px - 16, py - 28, 2, false);
                break;
            case "maharko":
                pixelArt.drawMaharko(px - 16, py - 28, 2, false);
                break;
            case "ben":
                pixelArt.drawBenBersofsky(px - 16, py - 32, 2);
                break;
            // 2026-06-11: AUDREY NOW VISIBLE ON MAP. Previously fell through
            // to the default white rectangle. Now uses the drawAudrey sprite
            // (same as the dialogue portrait) so players can see her sprite
            // when walking past the playground in Rockville.
            case "audrey":
                pixelArt.drawAudrey(px - 16, py - 28, 2, false);
                break;
            default:
                this.ctx.fillStyle = "#ffffff";
                this.ctx.fillRect(px + 8, py + 4, 16, 24);
        }

    }


    renderPlayer(px, py) {
        // Choose sprite based on party leader
        const leaderName = game.party[0] ? game.party[0].name : "Nick Farrar";
        const offsetX = -16;
        const offsetY = -28;

        switch (leaderName) {
            case "Nick Farrar":
                pixelArt.drawNickFarrar(px + offsetX, py + offsetY, 2, this.walking);
                break;
            case "Nick Hedgecock":
                pixelArt.drawNickHedgecock(px + offsetX, py + offsetY, 2, this.walking);
                break;
            case "Myat Maharko":
                pixelArt.drawMaharko(px + offsetX, py + offsetY, 2, this.walking);
                break;
            case "Eric Huang":
                // 2026-06-11 FIX: Eric was missing from this switch, so the
                // default case drew Nick Farrar whenever Eric was party leader.
                pixelArt.drawEric(px + offsetX, py + offsetY, 2, this.walking);
                break;
            case "Jacob Lebby":
                pixelArt.drawJacobCow(px + offsetX, py + offsetY, 2, this.walking);
                break;
            default:
                pixelArt.drawNickFarrar(px + offsetX, py + offsetY, 2, this.walking);
        }
    }

    renderMinimap() {
        if (!this.activeMap) return;

        const mapW = this.activeMap.width;
        const mapH = this.activeMap.height;
        const scale = 2; // each tile is 2px on minimap
        const mmW = mapW * scale;
        const mmH = mapH * scale;
        // Clamp to keep the minimap fully on-screen even for tall maps
        let startX = 640 - mmW - 10;
        let startY = 480 - mmH - 10;
        if (startY < 380) startY = 380; // Ensure it doesn't crash into the dialogue box zone
        if (startX < 10) startX = 10;


        // Border / background
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        this.ctx.fillRect(startX - 3, startY - 3, mmW + 6, mmH + 6);
        this.ctx.strokeStyle = "#4df3ff";
        this.ctx.strokeRect(startX - 3, startY - 3, mmW + 6, mmH + 6);

        // Tiles (just outline to show walkable paths)
        for (let y = 0; y < mapH; y++) {
            for (let x = 0; x < mapW; x++) {
                const tile = this.tiles[y][x];
                if (tile === 0 || tile === 5 || tile === 9) {
                    this.ctx.fillStyle = "rgba(100, 100, 150, 0.5)";
                    this.ctx.fillRect(startX + x * scale, startY + y * scale, scale, scale);
                }
            }
        }

        // NPCs on minimap (use activeTriggers so consumed recruit triggers disappear)
        const miniTriggers = this.activeTriggers || this.activeMap.triggers;
        if (miniTriggers) {
            miniTriggers.forEach(trig => {
                if (trig.type === "npc" || trig.type === "recruit") {
                    this.ctx.fillStyle = trig.type === "recruit" ? "#ffd700" : "#ff3c82";
                    this.ctx.fillRect(startX + trig.x * scale, startY + trig.y * scale, scale, scale);
                }
            });
        }


        // Player position
        this.ctx.fillStyle = "#4df3ff";
        this.ctx.fillRect(startX + this.playerX * scale - 1, startY + this.playerY * scale - 1, 4, 4);
    }

    handleInput(e) {
        const key = e.key.toLowerCase();
        let targetX = this.playerX;
        let targetY = this.playerY;
        let isMove = false;

        if (key === "w" || key === "arrowup") {
            targetY--;
            this.playerDir = "up";
            isMove = true;
        } else if (key === "s" || key === "arrowdown") {
            targetY++;
            this.playerDir = "down";
            isMove = true;
        } else if (key === "a" || key === "arrowleft") {
            targetX--;
            this.playerDir = "left";
            isMove = true;
        } else if (key === "d" || key === "arrowright") {
            targetX++;
            this.playerDir = "right";
            isMove = true;
        } else if (key === " " || key === "enter") {
            e.preventDefault();
            this.interact();
            return;
        } else {
            return;
        }

        e.preventDefault();
        // 2026-06-11: CHEAT — Speed Boost moves multiple tiles per keypress
        // 2026-06-11: NOTE — A future improvement would be to add audio
        // deduplication (only play select sound on first move per keypress).
        if (isMove) {
            const speed = (typeof CHEATS !== "undefined" && CHEATS.enabled)
                ? Math.max(1, CHEATS.speedBoost || 1)
                : 1;
            for (let i = 0; i < speed; i++) {
                this.movePlayer(targetX, targetY);
                // Update target for the next iteration
                if (key === "w" || key === "arrowup") targetY--;
                else if (key === "s" || key === "arrowdown") targetY++;
                else if (key === "a" || key === "arrowleft") targetX--;
                else if (key === "d" || key === "arrowright") targetX++;
            }
        }
    }

    movePlayer(tx, ty) {
        if (tx < 0 || tx >= this.activeMap.width || ty < 0 || ty >= this.activeMap.height) {
            this._logBlocked("OOB", tx, ty, -1);
            return;
        }

        // 2026-06-11: CHEAT — noClip bypasses wall + NPC collision checks
        const noClip = (typeof CHEATS !== "undefined" && CHEATS.enabled && CHEATS.noClip);

        const targetTile = this.tiles[ty][tx];
        const isWalkable = noClip || targetTile === 0 || targetTile === 5 || targetTile === 9;

        if (isWalkable) {
            const hasSolidNpc = noClip ? false : (this.activeTriggers || this.activeMap.triggers || []).some(trig => trig.type === "npc" && trig.x === tx && trig.y === ty);
            if (!hasSolidNpc) {
                const fromX = this.playerX, fromY = this.playerY;
                this.playerX = tx;
                this.playerY = ty;
                this.walking = true;
                this.lastMoveTime = Date.now();
                audio.playSelect();
                this._lastBlockedKey = null; // reset on successful move
                console.log(`[BattleIQ:Move] Player (${fromX},${fromY}) → (${tx},${ty}). Walkable. Tile=${targetTile}.${noClip ? " [noClip]" : ""}`);
            } else {
                this._logBlocked("NPC", tx, ty, targetTile);
            }
        } else {
            this._logBlocked("wall", tx, ty, targetTile);
        }
    }

    // Throttled blocked-move logger: only logs when the blocked direction or
    // target tile changes (avoids flooding the console when player spams keys
    // against a wall or NPC).
    _logBlocked(reason, tx, ty, tile) {
        const key = `${reason}:${tx},${ty}:${tile}`;
        if (this._lastBlockedKey === key) return;
        this._lastBlockedKey = key;
        if (reason === "wall") {
            console.log(`[BattleIQ:Move] Blocked by wall at (${tx},${ty}). Tile=${tile}.`);
        } else if (reason === "NPC") {
            console.log(`[BattleIQ:Move] Blocked by NPC at (${tx},${ty})`);
        } else {
            console.log(`[BattleIQ:Move] Blocked OOB → (${tx},${ty}) from (${this.playerX},${this.playerY})`);
        }
    }


    checkTriggerProximity() {
        const triggers = this.activeTriggers || this.activeMap.triggers;
        if (!triggers) {
            this.nearTrigger = null;
            return;
        }

        let found = null;
        for (let i = 0; i < triggers.length; i++) {
            const trig = triggers[i];

            if (trig.type === "exit" || trig.type === "back") {
                if (this.playerX === trig.x && this.playerY === trig.y) {
                    found = trig;
                    break;
                }
            }

            if (trig.type === "npc" || trig.type === "recruit") {
                const dist = Math.abs(this.playerX - trig.x) + Math.abs(this.playerY - trig.y);
                if (dist === 1) {
                    found = trig;
                    break;
                }
            }

        }

        this.nearTrigger = found;

        // Only log when the near-trigger CHANGES (avoids flooding the console)
        const oldId = this._lastNearTriggerId;
        const newId = found ? (found.id || found.memberId) : null;
        if (oldId !== newId) {
            if (found) {
                console.log(`[BattleIQ:Trigger] Player adjacent to type=${found.type} id=${newId} at (${found.x},${found.y})`);
            } else if (oldId) {
                console.log(`[BattleIQ:Trigger] Player left trigger id=${oldId}`);
            }
            this._lastNearTriggerId = newId;
        }
    }


    interact() {
        if (!this.nearTrigger) {
            console.log(`[BattleIQ:Interact] Called but nearTrigger is null`);
            return;
        }

        const trig = this.nearTrigger;
        console.log(`[BattleIQ:Interact] Triggering type=${trig.type} id=${trig.id || trig.memberId} at (${trig.x},${trig.y}) text="${trig.text ? trig.text.substring(0, 50) + (trig.text.length > 50 ? '...' : '') : ''}"`);
        // DIAGNOSTIC: Show all active triggers (helps debug recruit issues)
        console.log(`[BattleIQ:Interact] activeTriggers=[${(this.activeTriggers || []).map(t => `${t.type}:${t.id || t.memberId}@(${t.x},${t.y})`).join(", ")}]`);

        if (trig.type === "exit") {
            // GATE: Check if the boss for this act has been defeated.
            // If not, the player must defeat the boss before progressing.
            // 2026-06-11: CHEAT — Unlock All Acts bypasses the boss gate
            if (typeof CHEATS !== "undefined" && CHEATS.enabled && CHEATS.unlockAllActs) {
                console.log("[BattleIQ:Cheat] Unlock All Acts ON — boss gate bypassed.");
            } else if (typeof game.isCurrentBossDefeated === "function" && !game.isCurrentBossDefeated()) {
                const bossNames = ["Jacob", "Hedgecock", "Eric", "Ben"];
                const bossName = bossNames[game.currentActIndex] || "the boss";
                game.showToast("⛔ Defeat " + bossName + " first! The exit is sealed.");
                audio.playDefeat();
                return;
            }
            game.startDialogue([
                { speaker: "System", text: trig.text }
            ], () => {
                game.advanceAct();
            });
        } else if (trig.type === "back") {
            // BACK EXIT: Returns to a previous map without advancing the act.
            // No boss gate — you can always go back. Useful for revisiting old areas.
            console.log(`[BattleIQ:Back] Player chose to go back to "${trig.nextMap}" from current map.`);
            game.startDialogue([
                { speaker: "System", text: trig.text }
            ], () => {
                // Just load the previous map; don't advance the act.
                overworld.loadMap(trig.nextMap);
            });
        } else if (trig.type === "recruit") {

            // Recruit the new member to the party
            const beforeNames = (game.party || []).map(p => p.name).join(", ");
            if (typeof game.recruitMember === "function") {
                game.recruitMember(trig.memberId);
            } else {
                const newMember = JSON.parse(JSON.stringify(GAME_DATA.PLAYERS[trig.memberId]));
                if (newMember && game.party) game.party.push(newMember);
            }
            const afterNames = (game.party || []).map(p => p.name).join(", ");
            console.log(`[BattleIQ:Recruit] "${trig.name}" joined. Party: ${afterNames} (${game.party.length} members)`);
            game.showToast("✅ " + trig.name + " has joined your party!");
            audio.playHeal();
            // Remove this trigger so it can't be triggered again
            this.activeTriggers = this.activeTriggers.filter(t => t !== trig);
            // Also show the recruit dialogue
            game.startDialogue([
                { speaker: trig.name, text: trig.text }
            ]);
        } else if (trig.type === "npc") {
            if (trig.triggerBattle) {
                // 2026-06-11: Resolve the "act_boss" placeholder to the current act's
                // dynamic boss (which excludes the player's starting character).
                const bossId = (trig.triggerBattle === "act_boss")
                    ? game.getCurrentActBoss()
                    : trig.triggerBattle;
                console.log(`[BattleIQ:Battle] Starting battle vs "${trig.id}" via NPC trigger at (${trig.x},${trig.y}). Boss ID: ${bossId}`);
                game.triggerBattleTransition(bossId, () => {
                    battleController.startBattle(bossId);
                });
            } else if (trig.useBranching && trig.branches && trig.branches.length > 0) {

                // BRANCHING DIALOGUE: Show the intro line, then a choice menu.
                console.log(`[BattleIQ:Branch] Starting branching dialogue for "${trig.name}" with ${trig.branches.length} branches.`);
                // 2026-06-11: Pass `trig` as the 4th arg so the choice handler
                // can reference it later (e.g. for `action: "recruit"`, we use
                // trig.id to know which character to recruit). Makes the system
                // fully dynamic — no hardcoded names needed in game.js.
                game.startDialogueWithChoices(
                    [{ speaker: trig.name, text: trig.text }],
                    trig.branches,
                    () => {},
                    trig
                );
            } else {
                game.startDialogue([
                    { speaker: trig.name, text: trig.text }
                ]);
            }
        }
    }



}


const overworld = new OverworldEngine();

/**
 * BattleIQ: The Rockville Chronicles - HD Pixel Art Asset Engine
 * Custom sprite drawing functions for characters, NPCs, and animated tiles.
 * Uses HTML5 Canvas 2D context to draw multi-color pixel art using fillRect.
 */

class PixelArtAssets {
    constructor(ctx) {
        this.ctx = ctx;
        this.animFrame = 0; // global animation tick (incremented in render loop)
    }

    tick() {
        this.animFrame = (this.animFrame + 1) % 120; // 120-frame loop
    }

    /**
     * Draws a small scale image using a 2D array of color hex codes.
     * @param {number} px - top-left X in pixels
     * @param {number} py - top-left Y in pixels
     * @param {number[][]} art - 2D array where each cell is a hex string or 0 (transparent)
     * @param {number} scale - multiplier for each pixel
     */
    drawArt(px, py, art, scale = 4) {
        for (let y = 0; y < art.length; y++) {
            for (let x = 0; x < art[y].length; x++) {
                const c = art[y][x];
                if (c && c !== 0 && c !== ".") {
                    this.ctx.fillStyle = c;
                    this.ctx.fillRect(px + x * scale, py + y * scale, scale, scale);
                }
            }
        }
    }

    // ============== TILES (16x16 base scaled to whatever pixel size needed) ==============

    drawGrassTile(x, y, size, frame = 0) {
        // Base grass color
        this.ctx.fillStyle = "#3a7d3e";
        this.ctx.fillRect(x, y, size, size);

        // Lighter grass blades
        this.ctx.fillStyle = "#4a8e4e";
        const offset = (frame % 4) * 2;
        this.ctx.fillRect(x + 2, y + 4 + offset, 2, 2);
        this.ctx.fillRect(x + 8, y + 10 - offset, 2, 2);
        this.ctx.fillRect(x + 12, y + 6 + offset, 2, 2);

        // Darker grass shadows
        this.ctx.fillStyle = "#2c6230";
        this.ctx.fillRect(x, y, size, 1);
        this.ctx.fillRect(x, y, 1, size);
    }

    drawDirtTile(x, y, size) {
        this.ctx.fillStyle = "#6b4f30";
        this.ctx.fillRect(x, y, size, size);
        this.ctx.fillStyle = "#5a3f25";
        this.ctx.fillRect(x + 4, y + 4, 3, 3);
        this.ctx.fillRect(x + 12, y + 10, 3, 3);
    }

    drawWaterTile(x, y, size, frame = 0) {
        this.ctx.fillStyle = "#1f4e8c";
        this.ctx.fillRect(x, y, size, size);
        this.ctx.fillStyle = "#3a7dd0";
        const offset = (frame % 6) * 1.5;
        this.ctx.fillRect(x + 2, y + 4 + offset, 8, 2);
        this.ctx.fillRect(x + 8, y + 12 - offset, 6, 2);
        this.ctx.fillStyle = "#7ec0ee";
        this.ctx.fillRect(x + 14, y + 8 + (offset / 2), 2, 1);
    }

    drawRoadTile(x, y, size, frame = 0) {
        this.ctx.fillStyle = "#333333";
        this.ctx.fillRect(x, y, size, size);
        // Dashed yellow center line (only if horizontal road)
        this.ctx.fillStyle = "#f0c020";
        const offset = (frame % 4) * 8;
        for (let dx = 0; dx < size; dx += 16) {
            this.ctx.fillRect(x + dx, y + size/2 - 1, 8, 2);
        }
    }

    drawWallTile(x, y, size) {
        this.ctx.fillStyle = "#6a4a35";
        this.ctx.fillRect(x, y, size, size);
        // Brick pattern
        this.ctx.fillStyle = "#8b5e3a";
        this.ctx.fillRect(x, y, size, 2);
        this.ctx.fillRect(x, y, 2, size);
        this.ctx.fillRect(x + size - 2, y, 2, size);
        this.ctx.fillStyle = "#4a2a18";
        this.ctx.fillRect(x, y + size - 2, size, 2);
    }

    drawBuildingWindow(x, y, size, lit = true) {
        this.ctx.fillStyle = "#4a3a30";
        this.ctx.fillRect(x, y, size, size);
        this.ctx.fillStyle = lit ? "#fff3a0" : "#222222";
        this.ctx.fillRect(x + 4, y + 4, size - 8, size - 8);
        // Window cross
        this.ctx.fillStyle = "#4a3a30";
        this.ctx.fillRect(x + size/2 - 1, y + 4, 2, size - 8);
        this.ctx.fillRect(x + 4, y + size/2 - 1, size - 8, 2);
    }

    drawExitPortal(x, y, size, frame = 0) {
        // Pulsing portal
        const pulse = Math.sin(frame * 0.15) * 0.3 + 0.7;
        this.ctx.fillStyle = `rgba(75, 0, 130, ${pulse})`;
        this.ctx.fillRect(x, y, size, size);
        this.ctx.fillStyle = `rgba(255, 60, 130, ${pulse})`;
        const inset = 4 + Math.sin(frame * 0.2) * 2;
        this.ctx.fillRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(x + size/2 - 2, y + size/2 - 2, 4, 4);
    }

    // ============== THEME TILES (Rockville Playground) ==============

    drawSandTile(x, y, size, frame = 0) {
        // Bright playground sand with subtle sparkle
        this.ctx.fillStyle = "#e8c878";
        this.ctx.fillRect(x, y, size, size);
        this.ctx.fillStyle = "#d4b566";
        this.ctx.fillRect(x + 4, y + 6, 3, 3);
        this.ctx.fillRect(x + 14, y + 12, 3, 3);
        this.ctx.fillRect(x + 22, y + 4, 3, 3);
        this.ctx.fillStyle = "#f0d488";
        this.ctx.fillRect(x + 8, y + 18, 4, 2);
        this.ctx.fillRect(x + 18, y + 22, 3, 2);
        // Border
        this.ctx.fillStyle = "#a08840";
        this.ctx.fillRect(x, y, size, 1);
        this.ctx.fillRect(x, y, 1, size);
    }

    drawRubberMatTile(x, y, size) {
        // Colorful playground rubber mat
        this.ctx.fillStyle = "#4d7eb5";
        this.ctx.fillRect(x, y, size, size);
        this.ctx.fillStyle = "#3a6494";
        this.ctx.fillRect(x, y, size, 2);
        this.ctx.fillRect(x, y, 2, size);
        this.ctx.fillStyle = "#6a9bd4";
        this.ctx.fillRect(x + 6, y + 6, 4, 4);
        this.ctx.fillRect(x + 16, y + 6, 4, 4);
        this.ctx.fillRect(x + 6, y + 16, 4, 4);
        this.ctx.fillRect(x + 16, y + 16, 4, 4);
    }

    // ============== THEME TILES (Dorm) ==============

    drawCarpetTile(x, y, size) {
        // Purple hallway carpet
        this.ctx.fillStyle = "#5a3a7d";
        this.ctx.fillRect(x, y, size, size);
        this.ctx.fillStyle = "#7048a0";
        for (let i = 0; i < 4; i++) {
            this.ctx.fillRect(x + 2 + i * 7, y + 2, 3, size - 4);
        }
        // Texture dots
        this.ctx.fillStyle = "#8a5cc0";
        this.ctx.fillRect(x + 4, y + 8, 1, 1);
        this.ctx.fillRect(x + 12, y + 18, 1, 1);
        this.ctx.fillRect(x + 22, y + 12, 1, 1);
    }

    drawCheckeredTile(x, y, size) {
        // Black/white checkered bathroom tile
        this.ctx.fillStyle = "#1a1a1a";
        this.ctx.fillRect(x, y, size, size);
        const half = size / 2;
        if ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 0) {
            this.ctx.fillStyle = "#dddddd";
            this.ctx.fillRect(x, y, half, half);
            this.ctx.fillRect(x + half, y + half, half, half);
        } else {
            this.ctx.fillStyle = "#dddddd";
            this.ctx.fillRect(x + half, y, half, half);
            this.ctx.fillRect(x, y + half, half, half);
        }
    }

    // ============== THEME TILES (Cabin) ==============

    drawWoodPlankTile(x, y, size) {
        // Warm wooden plank floor
        this.ctx.fillStyle = "#8b5e34";
        this.ctx.fillRect(x, y, size, size);
        // Plank lines
        this.ctx.fillStyle = "#5a3a1f";
        this.ctx.fillRect(x, y, size, 1);
        this.ctx.fillRect(x, y + size - 1, size, 1);
        this.ctx.fillStyle = "#7a4f2a";
        this.ctx.fillRect(x + 4, y + 2, 1, size - 4);
        // Wood grain
        this.ctx.fillStyle = "#6a4520";
        this.ctx.fillRect(x + 6, y + 8, 8, 1);
        this.ctx.fillRect(x + 16, y + 16, 6, 1);
        this.ctx.fillRect(x + 10, y + 22, 10, 1);
    }

    drawSnowTile(x, y, size, frame = 0) {
        // Snowy outdoor ground
        this.ctx.fillStyle = "#e8f0f8";
        this.ctx.fillRect(x, y, size, size);
        this.ctx.fillStyle = "#ffffff";
        const offset = (frame % 4) * 2;
        this.ctx.fillRect(x + 4, y + 4 + offset, 3, 3);
        this.ctx.fillRect(x + 14, y + 12 - offset, 3, 3);
        this.ctx.fillRect(x + 22, y + 6 + offset, 3, 3);
        this.ctx.fillStyle = "#c0d0e0";
        this.ctx.fillRect(x, y, size, 1);
        this.ctx.fillRect(x, y, 1, size);
    }

    // ============== AMBIENT DECORATIONS ==============

    drawTree(x, y, size) {
        // Small tree trunk + leafy top
        const s = size;
        this.ctx.fillStyle = "#5a3a1f";
        this.ctx.fillRect(x + s * 0.4, y + s * 0.6, s * 0.2, s * 0.4);
        this.ctx.fillStyle = "#2a6230";
        this.ctx.fillRect(x + s * 0.1, y, s * 0.8, s * 0.5);
        this.ctx.fillStyle = "#3a7d3e";
        this.ctx.fillRect(x + s * 0.15, y + s * 0.05, s * 0.7, s * 0.4);
        this.ctx.fillStyle = "#4a8e4e";
        this.ctx.fillRect(x + s * 0.2, y + s * 0.1, s * 0.3, s * 0.2);
    }

    drawPineTree(x, y, size) {
        // Tall pine tree (snowy top variant)
        const s = size;
        this.ctx.fillStyle = "#5a3a1f";
        this.ctx.fillRect(x + s * 0.45, y + s * 0.7, s * 0.1, s * 0.3);
        this.ctx.fillStyle = "#1a4a1f";
        this.ctx.fillRect(x + s * 0.25, y + s * 0.1, s * 0.5, s * 0.3);
        this.ctx.fillRect(x + s * 0.15, y + s * 0.35, s * 0.7, s * 0.3);
        this.ctx.fillRect(x + s * 0.05, y + s * 0.55, s * 0.9, s * 0.3);
        // Snowy top
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(x + s * 0.4, y + s * 0.05, s * 0.2, 2);
        this.ctx.fillRect(x + s * 0.3, y + s * 0.3, s * 0.4, 2);
        this.ctx.fillRect(x + s * 0.2, y + s * 0.5, s * 0.6, 2);
    }

    drawCar(x, y, size, color) {
        // Stylized car top-down view (for the playground)
        const s = size;
        this.ctx.fillStyle = "#1a1a1a";
        this.ctx.fillRect(x + 2, y + s * 0.3, s - 4, s * 0.5);
        this.ctx.fillStyle = color || "#cc3333";
        this.ctx.fillRect(x + 4, y + s * 0.35, s - 8, s * 0.4);
        // Windshield
        this.ctx.fillStyle = "#4df3ff";
        this.ctx.fillRect(x + s * 0.6, y + s * 0.4, s * 0.3, s * 0.3);
        // Wheels
        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(x + 3, y + s * 0.25, 5, 5);
        this.ctx.fillRect(x + s - 8, y + s * 0.25, 5, 5);
        this.ctx.fillRect(x + 3, y + s * 0.7, 5, 5);
        this.ctx.fillRect(x + s - 8, y + s * 0.7, 5, 5);
    }

    drawSign(x, y, size, text) {
        // Wooden sign post
        const s = size;
        this.ctx.fillStyle = "#5a3a1f";
        this.ctx.fillRect(x + s * 0.45, y + s * 0.3, s * 0.1, s * 0.7);
        this.ctx.fillStyle = "#8b5e34";
        this.ctx.fillRect(x + s * 0.1, y, s * 0.8, s * 0.4);
        this.ctx.fillStyle = "#000000";
        this.ctx.strokeStyle = "#000000";
        this.ctx.lineWidth = 1;
        this.ctx.font = "8px 'Press Start 2P'";
        this.ctx.textAlign = "center";
        this.ctx.strokeText(text, x + s * 0.5, y + s * 0.22);
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillText(text, x + s * 0.5, y + s * 0.22);
    }


    // ============== CHARACTER SPRITES (32x32 base) ==============

    /**
     * Nick Farrar (lead player) - Cool guy with cyan/blue hair and sunglasses
     */
    drawNickFarrar(px, py, scale = 2, walking = false) {
        const s = scale;
        const wobble = walking && Math.floor(this.animFrame / 8) % 2 === 0 ? -1 : 0;
        // Body
        this.ctx.fillStyle = "#4df3ff";
        this.ctx.fillRect(px + 8*s, py + (12+wobble)*s, 16*s, 14*s);
        // Head (skin)
        this.ctx.fillStyle = "#fcd5b4";
        this.ctx.fillRect(px + 9*s, py + (4+wobble)*s, 14*s, 10*s);
        // Hair (cyan)
        this.ctx.fillStyle = "#4df3ff";
        this.ctx.fillRect(px + 8*s, py + (0+wobble)*s, 16*s, 6*s);
        // Sunglasses
        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(px + 9*s, py + (6+wobble)*s, 14*s, 3*s);
        // Shirt details
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(px + 10*s, py + (16+wobble)*s, 12*s, 3*s);
        // Legs
        this.ctx.fillStyle = "#333333";
        this.ctx.fillRect(px + 10*s, py + (26+wobble)*s, 4*s, 6*s);
        this.ctx.fillRect(px + 18*s, py + (26+wobble)*s, 4*s, 6*s);
        // Car logo on shirt (C55 reference)
        this.ctx.fillStyle = "#ff3c82";
        this.ctx.fillRect(px + 14*s, py + (20+wobble)*s, 4*s, 4*s);
    }

    /**
     * Jacob Lebby - In cow mode (wearing cow costume with horns and spots)
     */
    drawJacobCow(px, py, scale = 2, walking = false) {
        const s = scale;
        const wobble = walking && Math.floor(this.animFrame / 8) % 2 === 0 ? -1 : 0;
        // Body (white with black cow spots)
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(px + 6*s, py + (10+wobble)*s, 20*s, 18*s);
        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(px + 10*s, py + (14+wobble)*s, 4*s, 4*s); // spot
        this.ctx.fillRect(px + 20*s, py + (20+wobble)*s, 3*s, 5*s); // spot
        // Head (cow face)
        this.ctx.fillStyle = "#fcd5b4";
        this.ctx.fillRect(px + 9*s, py + (2+wobble)*s, 14*s, 10*s);
        // Cow horns
        this.ctx.fillStyle = "#d4a574";
        this.ctx.fillRect(px + 7*s, py + (0+wobble)*s, 3*s, 4*s);
        this.ctx.fillRect(px + 22*s, py + (0+wobble)*s, 3*s, 4*s);
        // Cow ears
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(px + 5*s, py + (4+wobble)*s, 4*s, 4*s);
        this.ctx.fillRect(px + 23*s, py + (4+wobble)*s, 4*s, 4*s);
        // Cow nose/snout
        this.ctx.fillStyle = "#ffc0cb";
        this.ctx.fillRect(px + 11*s, py + (8+wobble)*s, 10*s, 4*s);
        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(px + 14*s, py + (10+wobble)*s, 1*s, 1*s);
        this.ctx.fillRect(px + 17*s, py + (10+wobble)*s, 1*s, 1*s);
        // Sad/distressed eyes
        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(px + 11*s, py + (6+wobble)*s, 2*s, 2*s);
        this.ctx.fillRect(px + 19*s, py + (6+wobble)*s, 2*s, 2*s);
    }

    /**
     * Nick Hedgecock - Sleepy guy with "zzz" floating above
     */
    drawNickHedgecock(px, py, scale = 2, walking = false) {
        const s = scale;
        const wobble = walking && Math.floor(this.animFrame / 8) % 2 === 0 ? -1 : 0;
        // Body (green polo)
        this.ctx.fillStyle = "#4dff8a";
        this.ctx.fillRect(px + 8*s, py + (12+wobble)*s, 16*s, 14*s);
        // Head
        this.ctx.fillStyle = "#fcd5b4";
        this.ctx.fillRect(px + 9*s, py + (4+wobble)*s, 14*s, 10*s);
        // Hair (brown messy)
        this.ctx.fillStyle = "#5a3f25";
        this.ctx.fillRect(px + 8*s, py + (0+wobble)*s, 16*s, 5*s);
        this.ctx.fillRect(px + 18*s, py + (3+wobble)*s, 6*s, 3*s);
        // Sleepy eyes (closed lines)
        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(px + 11*s, py + (8+wobble)*s, 3*s, 1*s);
        this.ctx.fillRect(px + 18*s, py + (8+wobble)*s, 3*s, 1*s);
        // Mouth
        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(px + 14*s, py + (11+wobble)*s, 4*s, 1*s);
        // Legs
        this.ctx.fillStyle = "#444444";
        this.ctx.fillRect(px + 10*s, py + (26+wobble)*s, 4*s, 6*s);
        this.ctx.fillRect(px + 18*s, py + (26+wobble)*s, 4*s, 6*s);
        // Floating "Z" for sleep
        if (Math.floor(this.animFrame / 20) % 2 === 0) {
            this.ctx.fillStyle = "#ffffff";
            this.ctx.font = `${10 * s}px 'Press Start 2P'`;
            this.ctx.textAlign = "center";
            this.ctx.fillText("Z", px + 28*s, py + (4 - (this.animFrame % 10)) * s);
        }
    }

    /**
     * Eric Huang - The Extortion Economist (Businessman with tie)
     */
    drawEric(px, py, scale = 2, walking = false) {
        const s = scale;
        const wobble = walking && Math.floor(this.animFrame / 8) % 2 === 0 ? -1 : 0;
        // Body (grey suit)
        this.ctx.fillStyle = "#4a4a5a";
        this.ctx.fillRect(px + 8*s, py + (12+wobble)*s, 16*s, 14*s);
        // Tie
        this.ctx.fillStyle = "#ff3c82";
        this.ctx.fillRect(px + 15*s, py + (12+wobble)*s, 2*s, 10*s);
        // Shirt
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(px + 12*s, py + (12+wobble)*s, 8*s, 8*s);
        // Head
        this.ctx.fillStyle = "#fcd5b4";
        this.ctx.fillRect(px + 9*s, py + (4+wobble)*s, 14*s, 10*s);
        // Hair (black, slick)
        this.ctx.fillStyle = "#1a1a1a";
        this.ctx.fillRect(px + 8*s, py + (0+wobble)*s, 16*s, 5*s);
        // Eyes
        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(px + 11*s, py + (7+wobble)*s, 3*s, 3*s);
        this.ctx.fillRect(px + 18*s, py + (7+wobble)*s, 3*s, 3*s);
        // Money in hand (briefcase)
        this.ctx.fillStyle = "#8b5a2b";
        this.ctx.fillRect(px + 22*s, py + (18+wobble)*s, 6*s, 6*s);
        this.ctx.fillStyle = "#ffd700";
        this.ctx.fillRect(px + 24*s, py + (20+wobble)*s, 2*s, 2*s);
    }

    /**
     * 2026-06-11 v2: Ben Bersofsky - F1 REDESIGN
     * White dude with black curly hair, wearing a plain WHITE tank top
     * with "F1" text on the front (no other accents), and bright orange shorts.
     * Holds a small cauldron because... alchemist. Racing never stops.
     */
    drawBenBersofsky(px, py, scale = 2) {
        const s = scale;

        // ===== HEAD & SKIN (white) =====
        // Skin: light beige / "white" tone
        this.ctx.fillStyle = "#f5dcc4";
        this.ctx.fillRect(px + 8*s, py + 3*s, 16*s, 10*s);

        // ===== BLACK CURLY HAIR (bumpy texture on top) =====
        this.ctx.fillStyle = "#0a0a0a";
        // Main hair cap
        this.ctx.fillRect(px + 7*s, py + 0*s, 18*s, 5*s);
        // Side wisps
        this.ctx.fillRect(px + 6*s, py + 2*s, 2*s, 4*s);
        this.ctx.fillRect(px + 24*s, py + 2*s, 2*s, 4*s);
        // Curly bumps (4 small "C" shapes on top of the head)
        this.ctx.fillStyle = "#1a1a1a";
        this.ctx.fillRect(px + 8*s, py + 0*s, 3*s, 2*s);
        this.ctx.fillRect(px + 12*s, py + 0*s, 3*s, 2*s);
        this.ctx.fillRect(px + 16*s, py + 0*s, 3*s, 2*s);
        this.ctx.fillRect(px + 20*s, py + 0*s, 3*s, 2*s);
        // One more row of curls below
        this.ctx.fillRect(px + 9*s, py + 2*s, 2*s, 2*s);
        this.ctx.fillRect(px + 13*s, py + 2*s, 2*s, 2*s);
        this.ctx.fillRect(px + 17*s, py + 2*s, 2*s, 2*s);
        this.ctx.fillRect(px + 21*s, py + 2*s, 2*s, 2*s);
        // Re-apply the main hair cap on top so curls blend
        this.ctx.fillStyle = "#0a0a0a";
        this.ctx.fillRect(px + 7*s, py + 1*s, 18*s, 3*s);

        // ===== FACE =====
        // Eyes (brown)
        this.ctx.fillStyle = "#2a1810";
        this.ctx.fillRect(px + 11*s, py + 6*s, 2*s, 2*s);
        this.ctx.fillRect(px + 19*s, py + 6*s, 2*s, 2*s);
        // Eye whites (small white)
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(px + 11*s, py + 6*s, 1*s, 1*s);
        this.ctx.fillRect(px + 19*s, py + 6*s, 1*s, 1*s);
        // Smile (skin-tone mouth)
        this.ctx.fillStyle = "#c08070";
        this.ctx.fillRect(px + 13*s, py + 9*s, 6*s, 1*s);

        // ===== WHITE TANK TOP (with "F1" text, no other accents) =====
        // Main white tank top body
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(px + 9*s, py + 13*s, 14*s, 9*s);
        // Tank top strap (left)
        this.ctx.fillRect(px + 10*s, py + 12*s, 3*s, 2*s);
        // Tank top strap (right)
        this.ctx.fillRect(px + 19*s, py + 12*s, 3*s, 2*s);
        // Tank top neckline (slight V showing skin)
        this.ctx.fillStyle = "#f5dcc4"; // skin color showing
        this.ctx.fillRect(px + 14*s, py + 13*s, 4*s, 1*s);
        // 2026-06-11: "F1" text on the tank top (red, with black outline so it
        // reads clearly at sprite scale). Centered horizontally on the tank.
        // Centered vertically around py + 17*s.
        const f1X = px + 16*s;
        const f1Y = py + 19*s;  // baseline; "F1" sits just above this
        const f1FontSize = 6 * s;  // scales with the sprite
        this.ctx.font = `bold ${f1FontSize}px 'Press Start 2P', monospace`;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        // Black outline (draw text 4 times offset in 4 directions)
        this.ctx.fillStyle = "#000000";
        this.ctx.fillText("F1", f1X - 1*s, f1Y);
        this.ctx.fillText("F1", f1X + 1*s, f1Y);
        this.ctx.fillText("F1", f1X, f1Y - 1*s);
        this.ctx.fillText("F1", f1X, f1Y + 1*s);
        // Red fill on top
        this.ctx.fillStyle = "#ff0000";
        this.ctx.fillText("F1", f1X, f1Y);
        // Reset context for subsequent draws
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "alphabetic";

        // ===== ARMS (skin tone) =====
        this.ctx.fillStyle = "#f5dcc4";
        this.ctx.fillRect(px + 6*s, py + 13*s, 3*s, 8*s);  // left arm
        this.ctx.fillRect(px + 23*s, py + 13*s, 3*s, 8*s); // right arm

        // ===== ORANGE SHORTS =====
        this.ctx.fillStyle = "#ff5500";
        this.ctx.fillRect(px + 9*s, py + 22*s, 14*s, 6*s);
        // Shorts leg separation (skin showing)
        this.ctx.fillStyle = "#f5dcc4";
        this.ctx.fillRect(px + 15*s, py + 22*s, 2*s, 6*s);
        // Shorts white stripe detail
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(px + 9*s, py + 22*s, 14*s, 1*s);
        // Green stripe on the shorts (matches tank accent)
        this.ctx.fillStyle = "#33aa33";
        this.ctx.fillRect(px + 9*s, py + 27*s, 14*s, 1*s);

        // ===== LEGS (skin tone, peeking out below shorts) =====
        this.ctx.fillStyle = "#f5dcc4";
        this.ctx.fillRect(px + 10*s, py + 28*s, 4*s, 4*s); // left leg
        this.ctx.fillRect(px + 18*s, py + 28*s, 4*s, 4*s); // right leg

        // ===== FEET (small brown shoes) =====
        this.ctx.fillStyle = "#3a2510";
        this.ctx.fillRect(px + 9*s, py + 32*s, 5*s, 1*s);  // left shoe
        this.ctx.fillRect(px + 18*s, py + 32*s, 5*s, 1*s); // right shoe
    }


    /**
     * 2026-06-11: Audrey (Jacob's love interest) — gentle white girl with
     * brown hair, pink top, and a soft smile. Used as a dialogue portrait.
     */
    drawAudrey(px, py, scale = 2) {
        const s = scale;
        // Background panel (subtle dark backdrop so she pops)
        this.ctx.fillStyle = "#0a0a14";
        this.ctx.fillRect(px, py, 32 * s, 32 * s);

        // ===== HEAD & SKIN (light beige) =====
        this.ctx.fillStyle = "#fcd5b4";
        this.ctx.fillRect(px + 9*s, py + 3*s, 14*s, 10*s);

        // ===== BROWN HAIR (shoulder-length, side-swept) =====
        this.ctx.fillStyle = "#5a3f25";
        this.ctx.fillRect(px + 7*s, py + 0*s, 18*s, 6*s);  // main hair
        this.ctx.fillRect(px + 6*s, py + 3*s, 3*s, 8*s);   // left side
        this.ctx.fillRect(px + 23*s, py + 3*s, 3*s, 9*s);  // right side (slightly longer)
        this.ctx.fillRect(px + 8*s, py + 2*s, 16*s, 4*s);  // top hair fill
        // Bangs (side-swept)
        this.ctx.fillRect(px + 11*s, py + 4*s, 6*s, 2*s);
        this.ctx.fillRect(px + 16*s, py + 4*s, 4*s, 2*s);

        // ===== FACE =====
        // Eyes (soft brown)
        this.ctx.fillStyle = "#3a2818";
        this.ctx.fillRect(px + 12*s, py + 7*s, 2*s, 2*s);
        this.ctx.fillRect(px + 18*s, py + 7*s, 2*s, 2*s);
        // Eye highlights
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(px + 12*s, py + 7*s, 1*s, 1*s);
        this.ctx.fillRect(px + 18*s, py + 7*s, 1*s, 1*s);
        // Smile (pink lips)
        this.ctx.fillStyle = "#ff7f7f";
        this.ctx.fillRect(px + 13*s, py + 10*s, 6*s, 1*s);
        // Blush
        this.ctx.fillStyle = "#ffb3b3";
        this.ctx.fillRect(px + 10*s, py + 9*s, 2*s, 1*s);
        this.ctx.fillRect(px + 20*s, py + 9*s, 2*s, 1*s);

        // ===== PINK TOP =====
        this.ctx.fillStyle = "#ff6fa8";
        this.ctx.fillRect(px + 8*s, py + 13*s, 16*s, 7*s);
        // Top detail (slightly lighter pink)
        this.ctx.fillStyle = "#ff9cc1";
        this.ctx.fillRect(px + 8*s, py + 13*s, 16*s, 1*s);
        // Top neckline (V)
        this.ctx.fillStyle = "#fcd5b4";
        this.ctx.fillRect(px + 14*s, py + 13*s, 4*s, 1*s);

        // ===== ARMS (skin) =====
        this.ctx.fillStyle = "#fcd5b4";
        this.ctx.fillRect(px + 6*s, py + 14*s, 3*s, 5*s);
        this.ctx.fillRect(px + 23*s, py + 14*s, 3*s, 5*s);

        // ===== HAIR BOTTOM (covers shoulders) =====
        this.ctx.fillStyle = "#5a3f25";
        this.ctx.fillRect(px + 6*s, py + 19*s, 3*s, 3*s);
        this.ctx.fillRect(px + 23*s, py + 19*s, 3*s, 3*s);
    }

    /**
     * Myat Maharko - The Critic (with golden chain and toilet paper)
     */
    drawMaharko(px, py, scale = 2, walking = false) {

        const s = scale;
        const wobble = walking && Math.floor(this.animFrame / 8) % 2 === 0 ? -1 : 0;
        // Body (yellow shirt)
        this.ctx.fillStyle = "#ffbe4d";
        this.ctx.fillRect(px + 8*s, py + (12+wobble)*s, 16*s, 14*s);
        // Head
        this.ctx.fillStyle = "#fcd5b4";
        this.ctx.fillRect(px + 9*s, py + (4+wobble)*s, 14*s, 10*s);
        // Hair (black)
        this.ctx.fillStyle = "#1a1a1a";
        this.ctx.fillRect(px + 8*s, py + (0+wobble)*s, 16*s, 5*s);
        // Gold chain
        this.ctx.fillStyle = "#ffd700";
        this.ctx.fillRect(px + 13*s, py + (14+wobble)*s, 6*s, 2*s);
        // Toilet paper roll in hand
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(px + 22*s, py + (16+wobble)*s, 4*s, 8*s);
        this.ctx.fillStyle = "#d0d0d0";
        this.ctx.fillRect(px + 22*s, py + (16+wobble)*s, 4*s, 1*s);
    }

    // ============== ENEMY BATTLE SPRITES ==============

    drawEnemyCowJacob(px, py) {
        this.drawJacobCow(px, py, 3, false);
        // Add angry eyebrows
        this.ctx.fillStyle = "#ff0000";
        this.ctx.fillRect(px + 30, py + 18, 8, 2);
        this.ctx.fillRect(px + 50, py + 18, 8, 2);
    }

    drawEnemySleepyHedgecock(px, py) {
        this.drawNickHedgecock(px, py, 3, false);
        // ZZZ aura
        const z = Math.floor(this.animFrame / 10) % 3;
        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = "20px 'Press Start 2P'";
        this.ctx.fillText("z".repeat(z + 1), px + 70, py + 20 - (z * 8));
    }

    drawEnemyEric(px, py) {
        this.drawEric(px, py, 3);
        // Money aura
        const wave = Math.sin(this.animFrame * 0.1) * 4;
        this.ctx.fillStyle = "#ffd700";
        this.ctx.font = "16px 'Press Start 2P'";
        this.ctx.fillText("$", px + 10 + wave, py + 10);
        this.ctx.fillText("$", px + 80 - wave, py + 50);
    }

    drawEnemyBen(px, py) {
        this.drawBenBersofsky(px, py, 3);
        // Block aura
        this.ctx.fillStyle = "#ff3c82";
        this.ctx.font = "20px 'Press Start 2P'";
        this.ctx.fillText("🚫", px + 80, py + 30 + Math.sin(this.animFrame * 0.1) * 4);
    }
}

// Global asset instance
const pixelArt = new PixelArtAssets(null);

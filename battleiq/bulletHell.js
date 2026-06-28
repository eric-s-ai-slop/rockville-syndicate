/**
 * BattleIQ: The Rockville Chronicles - Undertale Bullet Hell Arena
 * Controls heart movement, bullet generations, collision checking, and canvas rendering.
 */

const BUILD_VERSION = "v1.1.0-debug-2026-06-11T16:28:00";
console.log(`[BattleIQ:Build] bulletHell.js loaded ${BUILD_VERSION}`);


function secureRandom() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
    }
    return Math.random();
}


class BulletHellEngine {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.active = false;

        // Player Heart properties (made bigger + faster for easier dodging)
        this.heartX = 110;
        this.heartY = 90;
        this.heartSize = 12;
        this.heartSpeed = 4.5;
        this.invulnerableUntil = 0; // ms timestamp for i-frames
        this.isHit = false;


        // Active bullet pools
        this.bullets = [];
        this.patternTimer = null;
        this.activePattern = "cow_melt";

        // Keyboard tracking
        this.keys = {};
    }

    init() {
        this.canvas = document.getElementById("arena-canvas");
        this.ctx = this.canvas.getContext("2d");

        // Set dimensions to match the 180x150 arena container
        this.canvas.width = 180;
        this.canvas.height = 150;


        // Movement keys (only while active)
        window.addEventListener("keydown", (e) => {
            if (!this.active) return;
            const key = e.key.toLowerCase();
            this.keys[key] = true;
            // SAFETY: Press ESC or P to instantly skip the bullet hell
            if (key === "escape" || key === "p") {
                e.preventDefault();
                console.log("[BattleIQ] Bullet hell skipped via keypress");
                this.stop(this.onEndCallback);
            }
        });

        window.addEventListener("keyup", (e) => {
            if (!this.active) return;
            this.keys[e.key.toLowerCase()] = false;
        });
    }


    start(patternId, duration, onEndCallback) {
        this.init();
        this.active = true;
        this.activePattern = patternId;
        this.bullets = [];
        this.keys = {};
        this.startTime = Date.now(); // Track when bullet hell began
        this.onEndCallback = onEndCallback; // Store callback for safety net
        if (typeof controlsHUD !== "undefined" && controlsHUD) {
            controlsHUD.updateControls("bulletHell");
        }
        console.log(`[BattleIQ:BulletHell] Started pattern=${patternId} for ${duration}ms (1500ms grace, 600ms i-frames)`);



        // Recenter player heart at bottom-left (safe from center-spawning bullets)
        this.heartX = 40;
        this.heartY = 140;

        // 1500ms grace period at start of bullet hell
        this.gracePeriod = Date.now() + 1500;
        // 500ms invulnerability at start
        this.invulnerableUntil = Date.now() + 500;


        // Set up bullet generation ticks (slower rate = easier)
        // SPEED BALANCED 2026: tickRate 200ms → 280ms (40% slower spawn = more spacing)
        let ticks = 0;
        const tickRate = 280;


        this.patternTimer = setInterval(() => {
            this.generateBullet(this.activePattern, ticks);
            ticks++;
        }, tickRate);


        // Turn Duration timeout
        this.durationTimeout = setTimeout(() => {
            this.stop(onEndCallback);
        }, duration);

        // Start animation frame loop
        this.loop();
    }


    stop(onEndCallback = null) {
        this.active = false;
        if (this.patternTimer) clearInterval(this.patternTimer);
        if (this.durationTimeout) clearTimeout(this.durationTimeout);

        if (this.animFrame) cancelAnimationFrame(this.animFrame);

        if (onEndCallback) onEndCallback();
    }

    loop() {
        if (!this.active) return;
        // MAX-SAFETY: Force end the bullet hell if it's been running too long
        // (e.g., duration timeout was somehow cleared or the callback failed)
        if (this.startTime && Date.now() - this.startTime > 8000) {
            console.warn("[BattleIQ] Bullet hell max-safety fired (8s timeout). Force-stopping.");
            this.stop(this.onEndCallback);
            return;
        }
        try {
            this.update();
            this.render();
        } catch (err) {
            console.error("[BattleIQ] BulletHell loop error:", err);
            // Don't kill the loop on a single draw error; just keep trying
        }
        this.animFrame = requestAnimationFrame(() => this.loop());
    }



    update() {
        // 1. Move Player Heart (restrained within arena bounds)
        let dx = 0;
        let dy = 0;

        if (this.keys["w"] || this.keys["arrowup"]) dy -= this.heartSpeed;
        if (this.keys["s"] || this.keys["arrowdown"]) dy += this.heartSpeed;
        if (this.keys["a"] || this.keys["arrowleft"]) dx -= this.heartSpeed;
        if (this.keys["d"] || this.keys["arrowright"]) dx += this.heartSpeed;

        this.heartX += dx;
        this.heartY += dy;

        // Restrain bounds
        this.heartX = Math.max(this.heartSize, Math.min(this.canvas.width - this.heartSize, this.heartX));
        this.heartY = Math.max(this.heartSize, Math.min(this.canvas.height - this.heartSize, this.heartY));

        // 2. Move & Update Bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx;
            b.y += b.vy;

            // Optional rotating bullet angles
            if (b.spin) {
                b.angle += 0.05;
            }

            // Check Collision with heart (with i-frame invulnerability)
            const dist = Math.hypot(b.x - this.heartX, b.y - this.heartY);
            if (dist < (this.heartSize + b.size) - 2) {
                if (Date.now() < this.invulnerableUntil) {
                    // I-frames: bullet just passes through
                    continue;
                }
                // Heart got hit!
                this.bullets.splice(i, 1);
                this.invulnerableUntil = Date.now() + 600; // 600ms i-frames
                this.isHit = true;
                const oldHp = (game && game.party && game.party[0]) ? game.party[0].hp : -1;
                battleController.damagePlayer(12); // Rebalanced 2026: 12 HP per hit (forgiving, 5+ hits survivable)
                if (game && game.party && game.party[0]) {
                    console.log(`[BattleIQ:BulletHell] Player hit! HP ${oldHp} → ${game.party[0].hp} (-12)`);
                }
                audio.playHit();
                continue;


            }


            // Remove offscreen bullets
            if (b.x < -40 || b.x > this.canvas.width + 40 || b.y < -40 || b.y > this.canvas.height + 40) {
                this.bullets.splice(i, 1);
            }
        }
    }

    render() {
        if (!this.ctx) return;
        // Clear canvas (black background)
        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Draw Player Heart (Undertale Red Soul) with hit-flash + i-frame flicker
        try {
            const isInvulnerable = Date.now() < this.invulnerableUntil;
            const flicker = isInvulnerable && Math.floor(Date.now() / 80) % 2 === 0;
            this.ctx.fillStyle = flicker ? "#ffaaaa" : "#ff0000";
            this.ctx.beginPath();
            const x = this.heartX;
            const y = this.heartY - 2;
            const s = this.heartSize;

            this.ctx.moveTo(x, y + s/4);
            this.ctx.bezierCurveTo(x, y, x - s/2, y, x - s/2, y + s/2);
            this.ctx.bezierCurveTo(x - s/2, y + s, x, y + s, x, y + s * 1.2);
            this.ctx.bezierCurveTo(x, y + s, x + s/2, y + s, x + s/2, y + s/2);
            this.ctx.bezierCurveTo(x + s/2, y, x, y, x, y + s/4);
            this.ctx.fill();

            // White hit-flash overlay for the first 100ms after a hit
            if (this.isHit) {
                const sinceHit = Date.now() - (this.invulnerableUntil - 600);
                if (sinceHit < 100) {
                    this.ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
                    this.ctx.beginPath();
                    this.ctx.arc(this.heartX, this.heartY, this.heartSize + 4, 0, Math.PI * 2);
                    this.ctx.fill();
                } else {
                    this.isHit = false;
                }
            }
        } catch (err) {
            console.error("[BattleIQ] Heart render error:", err);
        }


        // 2. Draw Bullets (each in its own try/catch to be robust)
        this.bullets.forEach(b => {
            try {
                this.ctx.save();
                this.ctx.translate(b.x, b.y);
                if (b.spin) this.ctx.rotate(b.angle);

                this.ctx.font = b.fontSize + "px Arial";
                this.ctx.textAlign = "center";
                this.ctx.textBaseline = "middle";
                this.ctx.fillText(b.char, 0, 0);
                this.ctx.restore();
            } catch (err) {
                // Silently skip this bullet; the next frame will retry
            }
        });
    }


    // Dynamic projectile generation based on Act Boss patterns
    generateBullet(patternId, ticks) {
        // Skip bullet generation during the grace period (player gets a free start)
        if (Date.now() < (this.gracePeriod || 0)) {
            return;
        }

        if (patternId === "cow_melt") {

            // Jacob: Melt blobs (💧), Crazy 8 cards (🃏), and Galaxy Gas clouds (☁️)
            // SPEED BALANCED 2026: vy 2-4 → 1.2-2.4 (40% slower for easier dodging)
            const chars = ["💧", "🃏", "☁️", "🐮"];
            const char = chars[Math.floor(secureRandom() * chars.length)];

            // Spawn from top, falling down
            this.bullets.push({
                x: secureRandom() * this.canvas.width,
                y: -10,
                vx: (secureRandom() - 0.5) * 0.9,
                vy: 1.2 + secureRandom() * 1.2,
                size: 8,
                fontSize: 14,
                char: char,
                spin: true,
                angle: 0
            });
        } else if (patternId === "bedtime_chicken") {
            // Hedgecock: Chicken emojis (🐔) and alarm clocks (⏰)
            // SPEED BALANCED 2026: speed 1.6 → 1.0
            const side = secureRandom() < 0.5 ? "left" : "right";
            const rx = side === "left" ? -10 : this.canvas.width + 10;
            const ry = secureRandom() * this.canvas.height;

            // Aim directly towards player heart (slower for easier dodging)
            const angle = Math.atan2(this.heartY - ry, this.heartX - rx);
            const speed = 1.0;


            this.bullets.push({
                x: rx,
                y: ry,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 8,
                fontSize: 14,
                char: secureRandom() < 0.7 ? "🐔" : "⏰",
                spin: true,
                angle: 0
            });
        } else if (patternId === "spotify_crazy8") {
            // Eric Pattern 1: Spotify Extortion Spiral (radial)
            // SPEED BALANCED 2026: speed 1.6 → 1.0
            const angle = ticks * 0.55;
            const speed = 1.0;
            const chars = ["🪙", "📧", "💤", "🃏"];
            const char = chars[Math.floor(secureRandom() * chars.length)];

            this.bullets.push({
                x: this.canvas.width / 2,
                y: this.canvas.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 7,
                fontSize: 12,
                char: char,
                spin: false,
                angle: 0
            });
        } else if (patternId === "a_list_barrage") {
            // Eric Pattern 2: A-List Cancellation Barrage (dense falling cards + film reels)
            // SPEED BALANCED 2026: vy 2.2-3.7 → 1.4-2.4
            const chars = ["💳", "🎬", "🎟️", "💴"];
            const char = chars[Math.floor(secureRandom() * chars.length)];

            // 2-3 bullets per tick (denser than other patterns)
            const bulletCount = 2 + Math.floor(ticks / 4) % 2;
            for (let i = 0; i < bulletCount; i++) {
                this.bullets.push({
                    x: secureRandom() * this.canvas.width,
                    y: -10 - secureRandom() * 20,
                    vx: (secureRandom() - 0.5) * 0.5,
                    vy: 1.4 + secureRandom() * 1.0,
                    size: 9,
                    fontSize: 14,
                    char: char,
                    spin: true,
                    angle: secureRandom() * Math.PI * 2
                });
            }
        } else if (patternId === "inflation_rain") {
            // Eric Pattern 3: Inflation Rain (coins accelerating as pattern progresses)
            // SPEED BALANCED 2026: speedMult 1+0.05*t (unbounded, reaches 11x) → capped at 2.0x
            const speedMult = 1 + (ticks * 0.015); // 0.015 instead of 0.05 = 70% slower growth
            const cappedMult = Math.min(speedMult, 2.0); // hard cap at 2.0x
            const chars = ["💵", "🪙", "💰", "🪙"];
            const char = chars[Math.floor(secureRandom() * chars.length)];

            this.bullets.push({
                x: secureRandom() * this.canvas.width,
                y: -10,
                vx: (secureRandom() - 0.5) * 0.4,
                vy: 1.5 * cappedMult,
                size: 9,
                fontSize: 14,
                char: char,
                spin: true,
                angle: 0
            });
        } else if (patternId === "location_lockdown") {
            // Eric Pattern 4: Location Lockdown (cross-fire from all 4 corners)
            // SPEED BALANCED 2026: speed 2.2 → 1.4
            const corner = ticks % 4;
            const cx = corner === 0 ? 0 : (corner === 1 ? this.canvas.width : (corner === 2 ? this.canvas.width : 0));
            const cy = corner === 2 ? 0 : (corner === 3 ? this.canvas.height : (corner === 0 ? this.canvas.height : 0));

            // Aim toward heart with some spread
            const baseAngle = Math.atan2(this.heartY - cy, this.heartX - cx);
            const spread = (secureRandom() - 0.5) * 0.4;
            const angle = baseAngle + spread;
            const speed = 1.4;

            const chars = ["📍", "🚫", "📍", "🚫"];
            const char = chars[Math.floor(secureRandom() * chars.length)];

            this.bullets.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 8,
                fontSize: 14,
                char: char,
                spin: false,
                angle: 0
            });
        } else if (patternId === "tired_zzz") {
            // Eric Pattern 5: Tired Zzz (slow, easy breather)
            // SPEED BALANCED 2026: speed 0.8 → 0.5 (very easy, the breather between patterns)
            const side = secureRandom() < 0.5 ? "left" : "right";
            const rx = side === "left" ? -10 : this.canvas.width + 10;
            const ry = secureRandom() * this.canvas.height;

            // Slow, lazy aim
            const angle = Math.atan2(this.heartY - ry, this.heartX - rx);
            const speed = 0.5; // Very slow - this is a breather

            this.bullets.push({
                x: rx,
                y: ry,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 10,
                fontSize: 16,
                char: "💤",
                spin: true,
                angle: 0
            });
        } else if (patternId === "crypto_stalk") {
            // 2026-06-11: MAHARKO BOSS PATTERN — "Crypto Stalk"
            // Theme: Find My tracking + toilet paper wave + crypto coins.
            // Every 6 ticks: drop a 3-wide wave of toilet paper rolls from the top.
            // Every tick: fire a Find My / crypto tracking bullet from the side
            // that aims at the player's heart (slow + dodgeable).
            // SPEED BALANCED 2026: tracking speed 0.8 (same as tired_zzz for fairness).
            if (ticks % 6 === 0) {
                // Periodic 3-wide toilet paper wave from the top
                for (let i = 0; i < 3; i++) {
                    this.bullets.push({
                        x: 30 + i * 60,
                        y: -10,
                        vx: 0,
                        vy: 1.2,
                        size: 10,
                        fontSize: 16,
                        char: "🧻",
                        spin: true,
                        angle: 0
                    });
                }
            }

            // Continuous tracking bullets (alternating 📍 Find My and 💰 crypto)
            const side = secureRandom() < 0.5 ? "left" : "right";
            const rx = side === "left" ? -10 : this.canvas.width + 10;
            const ry = secureRandom() * this.canvas.height;
            const angle = Math.atan2(this.heartY - ry, this.heartX - rx);
            const speed = 0.8;

            this.bullets.push({
                x: rx,
                y: ry,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 8,
                fontSize: 14,
                char: secureRandom() < 0.5 ? "📍" : "💰",
                spin: false,
                angle: 0
            });
        } else if (patternId === "stew_gokart") {

            // Ben: Racing go-karts (🏎️), Suspicious Stew splashes (🍲), and Block icons (🚫)
            // SPEED BALANCED 2026: gokart vx 2.5→1.6, stew vy 2→1.4
            if (ticks % 4 === 0) { // Less frequent go-karts
                // Horizontal sweeping Go-Karts
                const rSide = secureRandom() < 0.5 ? "left" : "right";
                const rx = rSide === "left" ? -20 : this.canvas.width + 20;
                const ry = secureRandom() * (this.canvas.height - 40) + 20;

                this.bullets.push({
                    x: rx,
                    y: ry,
                    vx: rSide === "left" ? 1.6 : -1.6,
                    vy: 0,
                    size: 10,
                    fontSize: 18,
                    char: "🏎️",
                    spin: false,
                    angle: 0
                });
            }

            // Normal falling stew drops
            this.bullets.push({
                x: secureRandom() * this.canvas.width,
                y: -10,
                vx: 0,
                vy: 1.4,
                size: 8,
                fontSize: 14,
                char: secureRandom() < 0.6 ? "🍲" : "🚫",
                spin: true,
                angle: 0
            });
        } else if (patternId === "f1_pitstop") {
            // 2026-06-11: BEN BERSOFSKY F1 BULLET PATTERN ("Racing never stops")
            // Theme: F1 racing chaos. Karts sweep horizontally, checkered flags + 🚫
            // fall vertically. Slightly faster than stew_gokart so Ben feels
            // like a real final boss.
            // SPEED BALANCED: karts vx 1.8 (vs stew 1.6), debris vy 1.5 (vs stew 1.4)
            if (ticks % 5 === 0) { // Slightly less frequent than stew_gokart
                // Horizontal sweeping F1 karts (left or right)
                const rSide = secureRandom() < 0.5 ? "left" : "right";
                const rx = rSide === "left" ? -20 : this.canvas.width + 20;
                const ry = secureRandom() * (this.canvas.height - 40) + 20;

                this.bullets.push({
                    x: rx,
                    y: ry,
                    vx: rSide === "left" ? 1.8 : -1.8,
                    vy: 0,
                    size: 10,
                    fontSize: 18,
                    char: "🏎️",
                    spin: false,
                    angle: 0
                });
            }

            // Falling F1 debris: checkered flags + block icons
            this.bullets.push({
                x: secureRandom() * this.canvas.width,
                y: -10,
                vx: 0,
                vy: 1.5,
                size: 8,
                fontSize: 14,
                char: secureRandom() < 0.5 ? "🏁" : "🚫",
                spin: true,
                angle: 0
            });
        }


    }
}

// Global bullet hell engine instance
const bulletHell = new BulletHellEngine();

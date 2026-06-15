/**
 * BattleIQ: The Rockville Chronicles - Custom Synthesizer
 * Uses the Web Audio API to create authentic procedural retro sounds.
 */

class RetroAudio {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.ready = false; // Becomes true only after a user gesture
        this._ctxBlockedLogged = false; // Avoid spamming the same warning
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            try {
                this.ctx = new AudioContext();
                // DO NOT set this.ready = true here! The context starts in
                // "suspended" state and Chrome will log a warning if we try
                // to play before a user gesture. resumeOnGesture() will set
                // ready=true AFTER the context actually resumes.
                this.ready = false;
            } catch (err) {
                // Suppress: AudioContext construction failed (rare)
            }
        }
    }


    // Called by the game on first user gesture (mousedown). This is the
    // ONLY time the AudioContext can resume if Chrome auto-blocked it.
    resumeOnGesture() {
        if (this.ctx && this.ctx.state === "suspended") {
            this.ctx.resume().then(() => {
                this.ready = true;
            }).catch(() => {});
        } else if (!this.ctx) {
            this.init();
        }
    }

    playOsc(type, freq, duration, gainStart = 0.1, gainEnd = 0.001) {
        // Don't even attempt to play if the audio context isn't ready
        // (this is what causes the "AudioContext was not allowed to start"
        // warning spam — Chrome blocks the call until a user gesture).
        if (!this.ctx || this.muted || !this.ready) {
            if (this.ctx && this.ctx.state === "suspended" && !this._ctxBlockedLogged) {
                this._ctxBlockedLogged = true; // suppress future warnings
            }
            return;
        }


        // Create audio nodes
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(gainStart, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(gainEnd, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    // Sound: standard selection cursor
    playSelect() {
        this.playOsc("square", 600, 0.08, 0.05);
    }

    // Sound: text characters rendering
    playText() {
        // Subtle high pitch click
        this.playOsc("sine", 850, 0.03, 0.02);
    }

    // Sound: hit/attack registered
    playHit() {
        this.playOsc("triangle", 150, 0.15, 0.2);
        // Add metallic ring
        setTimeout(() => {
            this.playOsc("sawtooth", 110, 0.2, 0.1);
        }, 30);
    }

    // Sound: party fainted or critical fail
    playDefeat() {
        this.playOsc("sawtooth", 200, 0.3, 0.1);
        setTimeout(() => this.playOsc("sawtooth", 160, 0.3, 0.1), 150);
        setTimeout(() => this.playOsc("sawtooth", 120, 0.5, 0.1), 300);
    }

    // Sound: heal complete
    playHeal() {
        const notes = [261.6, 329.6, 392.0, 523.3]; // C chord sweep
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                this.playOsc("sine", freq, 0.15, 0.05);
            }, idx * 100);
        });
    }

    // ============================================================================
    // 2026-06-11: NEW SOUND EFFECTS for unique actions
    // All synthesized via Web Audio API (no audio files needed)
    // ============================================================================

    // ACT move: Farrar's BOOM! (square wave, 220→880Hz sweep, hype)
    playBoom() {
        if (!this.ctx || this.muted) return;
        this.playOsc("square", 220, 0.15, 0.15);
        setTimeout(() => this.playOsc("square", 440, 0.15, 0.15), 50);
        setTimeout(() => this.playOsc("square", 880, 0.2, 0.2), 100);
    }

    // ACT move: Hedgecock's Safe Space (sine, descending 600→200Hz)
    playSafeSpace() {
        if (!this.ctx || this.muted) return;
        this.playOsc("sine", 600, 0.2, 0.15);
        setTimeout(() => this.playOsc("sine", 400, 0.2, 0.15), 100);
        setTimeout(() => this.playOsc("sine", 200, 0.3, 0.15), 200);
    }

    // ACT move:Hedgecock's Chicken Emoji Barrage (cluck-like noise)
    playChickenBarrage() {
        if (!this.ctx || this.muted) return;
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.playOsc("square", 1100, 0.06, 0.12);
                setTimeout(() => this.playOsc("square", 800, 0.06, 0.12), 60);
            }, i * 150);
        }
    }

    // ACT move: Maharko's Ben Pose (low rumble 80Hz + reverb tail)
    playBenPose() {
        if (!this.ctx || this.muted) return;
        this.playOsc("sawtooth", 80, 0.4, 0.25);
        this.playOsc("triangle", 60, 0.5, 0.2);
        setTimeout(() => this.playOsc("sine", 120, 0.3, 0.15), 200);
    }

    // ACT move: Maharko's Holy Consumer (triple beep, 800+1000+1200Hz)
    playHolyConsumer() {
        if (!this.ctx || this.muted) return;
        this.playOsc("square", 800, 0.12, 0.18);
        setTimeout(() => this.playOsc("square", 1000, 0.12, 0.18), 100);
        setTimeout(() => this.playOsc("square", 1200, 0.15, 0.2), 200);
    }

    // ACT move: Maharko's Location Grab (sonar ping 400→1200Hz)
    playLocationGrab() {
        if (!this.ctx || this.muted) return;
        this.playOsc("sine", 400, 0.15, 0.15);
        setTimeout(() => this.playOsc("sine", 800, 0.15, 0.15), 100);
        setTimeout(() => this.playOsc("sine", 1200, 0.2, 0.2), 200);
    }

    // ACT move: Jacob's Liquid Flex (ka-ching! bell tone)
    playLiquidFlex() {
        if (!this.ctx || this.muted) return;
        this.playOsc("sine", 1200, 0.1, 0.18);
        this.playOsc("sine", 1800, 0.1, 0.12);
        setTimeout(() => this.playOsc("sine", 2400, 0.15, 0.1), 80);
    }

    // ACT move: Jacob's Nigeria Deflect (chaotic noise burst)
    playNigeria() {
        if (!this.ctx || this.muted) return;
        this.playOsc("sawtooth", 200 + Math.random() * 800, 0.15, 0.15);
        this.playOsc("square", 400 + Math.random() * 600, 0.2, 0.12);
        for (let i = 0; i < 5; i++) {
            setTimeout(() => this.playOsc("square", 200 + Math.random() * 1000, 0.04, 0.1), i * 60);
        }
    }

    // ACT move: Jacob's Mute GC (descending noise sweep 800→0Hz)
    playMuteGC() {
        if (!this.ctx || this.muted) return;
        this.playOsc("sawtooth", 800, 0.2, 0.2);
        this.playOsc("sine", 600, 0.2, 0.15);
        setTimeout(() => this.playOsc("sawtooth", 400, 0.2, 0.18), 100);
        setTimeout(() => this.playOsc("sawtooth", 200, 0.2, 0.15), 200);
    }

    // ACT move: Hedgecock's Looney Tuesday (rampant carnival noise)
    playLooney() {
        if (!this.ctx || this.muted) return;
        const freqs = [440, 554, 659, 880, 660, 523];
        freqs.forEach((f, i) => {
            setTimeout(() => this.playOsc("square", f, 0.1, 0.15), i * 80);
        });
    }

    // ACT move: GC Rebrand (descending whoop 1000→500Hz)
    playRebrand() {
        if (!this.ctx || this.muted) return;
        this.playOsc("sine", 1000, 0.15, 0.15);
        setTimeout(() => this.playOsc("sine", 750, 0.15, 0.15), 80);
        setTimeout(() => this.playOsc("sine", 500, 0.2, 0.15), 160);
    }

    // ACT move: I'm On My Way! (engine revving, 80→400Hz)
    playOnMyWay() {
        if (!this.ctx || this.muted) return;
        this.playOsc("sawtooth", 80, 0.2, 0.2);
        setTimeout(() => this.playOsc("sawtooth", 200, 0.2, 0.2), 60);
        setTimeout(() => this.playOsc("sawtooth", 400, 0.2, 0.2), 120);
    }

    // Item sound:Galaxy Gas (hissy brainrot)
    playGalaxyGas() {
        if (!this.ctx || this.muted) return;
        // White-noise-like high-frequency hiss
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                const f = 2000 + Math.random() * 3000;
                this.playOsc("sawtooth", f, 0.05, 0.05);
            }, i * 50);
        }
    }

    // Item sound: Mystery Juice (slot machine jingle)
    playMysteryJuice() {
        if (!this.ctx || this.muted) return;
        this.playOsc("square", 800, 0.08, 0.15);
        setTimeout(() => this.playOsc("square", 1200, 0.08, 0.15), 80);
        setTimeout(() => this.playOsc("square", 1500, 0.12, 0.18), 160);
    }

    // Item sound: Poison tick (low oscillating tone)
    playPoison() {
        if (!this.ctx || this.muted) return;
        this.playOsc("triangle", 100, 0.2, 0.12);
        setTimeout(() => this.playOsc("triangle", 200, 0.2, 0.12), 100);
        setTimeout(() => this.playOsc("triangle", 150, 0.25, 0.1), 200);
    }

    // Item sound: Recruit fanfare (rising arpeggio C-E-G-C)
    playRecruit() {
        if (!this.ctx || this.muted) return;
        this.playOsc("square", 261.6, 0.15, 0.15);
        setTimeout(() => this.playOsc("square", 329.6, 0.15, 0.15), 100);
        setTimeout(() => this.playOsc("square", 392.0, 0.15, 0.15), 200);
        setTimeout(() => this.playOsc("square", 523.3, 0.4, 0.2), 300);
    }

    // Item sound: Boss defeat explosion (noise burst + chord)
    playBossDefeat() {
        if (!this.ctx || this.muted) return;
        this.playOsc("sawtooth", 60, 0.5, 0.3);
        this.playOsc("square", 261.6, 0.4, 0.15);
        this.playOsc("square", 329.6, 0.4, 0.15);
        this.playOsc("square", 392.0, 0.5, 0.15);
        setTimeout(() => this.playOsc("sawtooth", 80, 0.3, 0.2), 200);
    }

    // Item sound: Pacify (calming chime 440→880Hz)
    playPacify() {
        if (!this.ctx || this.muted) return;
        this.playOsc("sine", 440, 0.3, 0.12);
        setTimeout(() => this.playOsc("sine", 660, 0.3, 0.1), 150);
        setTimeout(() => this.playOsc("sine", 880, 0.4, 0.1), 300);
    }

    // Item sound: Perfect timing (high chime + sparkle)
    playPerfect() {
        if (!this.ctx || this.muted) return;
        this.playOsc("sine", 2000, 0.2, 0.2);
        this.playOsc("sine", 3000, 0.3, 0.1);
        setTimeout(() => this.playOsc("sine", 4000, 0.2, 0.08), 100);
        setTimeout(() => this.playOsc("sine", 2400, 0.3, 0.1), 200);
    }

    // Item sound: Spare / de-escalation (descending hum 600→300Hz)
    playSpare() {
        if (!this.ctx || this.muted) return;
        this.playOsc("sine", 600, 0.25, 0.15);
        setTimeout(() => this.playOsc("sine", 450, 0.25, 0.12), 150);
        setTimeout(() => this.playOsc("sine", 300, 0.3, 0.1), 300);
    }

    // Item sound: Stun (electric zap, square 60Hz burst)
    playStun() {
        if (!this.ctx || this.muted) return;
        this.playOsc("square", 60, 0.2, 0.25);
        this.playOsc("square", 80, 0.2, 0.2);
        setTimeout(() => this.playOsc("square", 100, 0.15, 0.15), 100);
    }

    // Item sound: Switch member (whoosh + click)
    playSwitchMember() {
        if (!this.ctx || this.muted) return;
        this.playOsc("sawtooth", 400, 0.1, 0.15);
        this.playOsc("square", 1000, 0.05, 0.12);
        setTimeout(() => this.playOsc("square", 1200, 0.05, 0.1), 50);
    }

    // Item sound: Back exit (footstep pattern, 3 quick muted thumps)
    playBackExit() {
        if (!this.ctx || this.muted) return;
        for (let i = 0; i < 3; i++) {
            setTimeout(() => this.playOsc("triangle", 80, 0.06, 0.12), i * 120);
        }
    }

    // Item sound: ATK Boost (power-up sound, ascending C-E-G)
    playAtkBoost() {
        if (!this.ctx || this.muted) return;
        this.playOsc("square", 261.6, 0.1, 0.15);
        setTimeout(() => this.playOsc("square", 329.6, 0.1, 0.15), 80);
        setTimeout(() => this.playOsc("square", 392.0, 0.15, 0.18), 160);
    }

    // ============================================================================
    // END new sound effects
    // ============================================================================

    // Sound: battle trigger flash
    playBattleTrigger() {
        const totalDuration = 0.5;
        this.playOsc("sawtooth", 80, totalDuration, 0.25);
        this.playOsc("triangle", 120, totalDuration, 0.25);
    }


    // Background chiptune music composer loop
    playBgm(trackId) {
        this.init();
        if (!this.ctx || this.muted) return;
        this.stopBgm();

        const tempos = { menu: 120, overworld: 110, battle: 140, final: 155 };
        const tempo = tempos[trackId] || 120;
        const noteDuration = 60 / tempo / 2; // eighth notes

        // Basic procedural tracks
        const tracks = {
            menu: [
                [261.6, 1], [329.6, 1], [392.0, 1], [523.3, 1],
                [392.0, 1], [329.6, 1], [261.6, 2], [0, 1],
                [293.7, 1], [349.2, 1], [440.0, 1], [587.3, 1],
                [440.0, 1], [349.2, 1], [293.7, 2], [0, 1]
            ],
            overworld: [
                [329.6, 1], [392.0, 1], [440.0, 2], [392.0, 1], [329.6, 1], [293.7, 2],
                [261.6, 1], [329.6, 1], [392.0, 2], [329.6, 1], [261.6, 1], [220.0, 2]
            ],
            battle: [
                [110.0, 1], [110.0, 1], [220.0, 1], [110.0, 1],
                [130.8, 1], [130.8, 1], [261.6, 1], [130.8, 1],
                [146.8, 1], [146.8, 1], [293.7, 1], [146.8, 1],
                [165.0, 1], [165.0, 1], [330.0, 1], [0, 1]
            ],
            final: [
                // Hyperphunk 3 AM Bass drop inspired loop
                [55.0, 1], [55.0, 1], [55.0, 2], [110.0, 1], [55.0, 1], [110.0, 2],
                [65.4, 1], [65.4, 1], [65.4, 2], [130.8, 1], [65.4, 1], [130.8, 2],
                [73.4, 1], [73.4, 1], [73.4, 2], [146.8, 1], [73.4, 1], [146.8, 2]
            ]
        };

        const score = tracks[trackId];
        let step = 0;

        this.bgmTimer = setInterval(() => {
            if (this.muted) return;
            const item = score[step % score.length];
            const freq = item[0];
            const lenMultiplier = item[1];

            if (freq > 0) {
                this.playOsc(trackId === "final" ? "sawtooth" : "triangle", freq, noteDuration * lenMultiplier, 0.04);
            }
            step++;
        }, noteDuration * 1000);
    }

    stopBgm() {
        if (this.bgmTimer) {
            clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            this.stopBgm();
        }
        return this.muted;
    }
}

// Global instance
const audio = new RetroAudio();

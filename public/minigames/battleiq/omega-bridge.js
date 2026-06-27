// Omega Bridge Shim
// This file intercepts the external game's messages and globals
// without modifying the game's actual source code.

(function() {
  let omegaToken = null;

  function sendOmegaMessage(type, data = {}) {
    window.parent.postMessage({ source: 'omega-game', token: omegaToken, type, ...data }, '*');
  }

  // Hook into the battle controller once it's loaded
  function hookBattleController() {
    if (typeof battleController === 'undefined') {
      console.warn('[Omega Bridge] battleController not found!');
      return false;
    }

    // Wrap winBattle
    const originalWin = battleController.winBattle;
    battleController.winBattle = function(messageText, wasSpared) {
      originalWin.apply(this, arguments);
      // Let the animation/victory text play for a bit, then report complete
      setTimeout(() => {
        sendOmegaMessage('complete', { result: { outcome: 'win', data: { spared: wasSpared } } });
      }, 3000);
    };

    // Wrap triggerGameOver
    const originalLose = battleController.triggerGameOver;
    battleController.triggerGameOver = function() {
      // Be resilient: the original triggerGameOver() calls game.showGameOverScreen()
      // (defined in game.js, which is NOT loaded in this sandbox). If that — or any
      // other sandbox-missing global — throws synchronously, we MUST still report the
      // loss to the parent. Otherwise the dispatch below is skipped, no message ever
      // reaches Omega, and the minigame freezes instead of returning to the car ride.
      try {
        originalLose.apply(this, arguments);
      } catch (err) {
        console.warn('[Omega Bridge] triggerGameOver threw; reporting loss anyway:', err);
      }
      // Let the game-over beat read, then report the loss.
      setTimeout(() => {
        sendOmegaMessage('complete', { result: { outcome: 'lose' } });
      }, 3000);
    };

    return true;
  }

  // Stub missing globals that battle.js needs (since we are not loading the overworld)
  window.game = window.game || {
    // 2026-06-24: Hero HP raised to 220 (was 100). The boss turn is a 5s bullet
    // hell dealing 12 HP/hit; at 100 HP the player could be wiped in the FIRST
    // round (party empties -> game over -> minigame exits after a single hit).
    // 220 HP guarantees surviving the opening round and makes the longer,
    // tankier-boss fight a real dodging challenge instead of an instant loss.
    party: [
      { name: "Hero", hp: 220, maxHp: 220, atk: 35, def: 10, spd: 14, locked: false }
    ],
    inventory: [],
    currentActIndex: 3,
    changeState: () => {},
    showToast: (msg) => console.log('[Toast]', msg),
    sparedBosses: [],
    player: {
      updateLocation: () => {}
    },
    // The real cinematic game-over lives in game.js, which isn't loaded in this
    // embedded sandbox. battleController.triggerGameOver() calls this on death, so
    // without a stub it threw and the minigame froze (see the triggerGameOver
    // wrapper above). Render a minimal GAME OVER overlay; the bridge reports the
    // loss ~3s later, which sends the player back to the start of the car ride.
    showGameOverScreen: () => {
      try {
        if (document.getElementById('omega-gameover')) return;
        const ov = document.createElement('div');
        ov.id = 'omega-gameover';
        ov.textContent = 'GAME OVER';
        ov.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;' +
          'justify-content:center;background:#000;color:#fff;' +
          'font:bold 32px monospace;letter-spacing:6px;z-index:9999;';
        document.body.appendChild(ov);
      } catch (e) {
        console.warn('[Omega Bridge] game-over overlay failed:', e);
      }
    }
  };
  
  // Stub the controls HUD. The real one lives in ui.js/game.js (not loaded in the
  // embedded sandbox). bulletHell.start() calls controlsHUD.updateControls() at the
  // start of every enemy turn — without it, the first attack threw
  // "updateControls is not a function", which the error handler forwarded to the
  // parent and ended the minigame after a single hit. Stub every method the game
  // touches (updateControls, init, toggleVisible) plus the userHidden flag.
  window.controlsHUD = window.controlsHUD || {
    userHidden: false,
    updateControls: () => {},
    updateHUD: () => {},
    hideHUD: () => {},
    init: () => {},
    toggleVisible: () => {}
  };

  // Forward global keyboard inputs directly to battleController
  window.addEventListener('keydown', (e) => {
    if (typeof battleController !== 'undefined' && battleController) {
      battleController.handleInput(e);
    }
  });

  // Listen for the start message
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.source !== 'omega') return;

    if (data.type === 'start') {
      omegaToken = data.token;
      
      const config = data.config || {};
      const enemyId = config.enemyId || 'eric';

      if (!hookBattleController()) {
        sendOmegaMessage('error', { message: 'Failed to hook battleController' });
        return;
      }

      // Force battle UI visible
      document.getElementById('battle-screen').classList.remove('hidden');
      
      // Grab focus so keyboard inputs register immediately
      window.focus();

      // Start the battle
      battleController.startBattle(enemyId);
    }
  });

  // Let Omega know we are ready to receive the start message
  window.addEventListener('load', () => {
    // Provide a dummy token just so it gets through the initial ready handler,
    // though the parent might not enforce token on 'ready' until 'start'.
    // Actually, the parent checks token on ALL messages. We need to extract it from URL.
    const urlParams = new URLSearchParams(window.location.search);
    omegaToken = urlParams.get('token');
    
    sendOmegaMessage('ready');
  });

})();

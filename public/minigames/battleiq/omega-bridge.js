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
      originalLose.apply(this, arguments);
      setTimeout(() => {
        sendOmegaMessage('complete', { result: { outcome: 'lose' } });
      }, 3000);
    };

    return true;
  }

  // Stub missing globals that battle.js needs (since we are not loading the overworld)
  window.game = window.game || {
    party: [
      { name: "Hero", hp: 100, maxHp: 100, atk: 35, def: 10, spd: 14, locked: false }
    ],
    inventory: [],
    currentActIndex: 3,
    changeState: () => {},
    showToast: (msg) => console.log('[Toast]', msg),
    sparedBosses: [],
    player: {
      updateLocation: () => {}
    }
  };
  
  window.controlsHUD = window.controlsHUD || {
    updateHUD: () => {},
    hideHUD: () => {}
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

import { GameMode, ModeContext, ModeResult } from '../types';

export function createExternalGameMode(opts: { id: string; gameId: string }): GameMode {
  let activeCtx: ModeContext | null = null;
  return {
    id: opts.id,
    
    start: (ctx: ModeContext, config: unknown, onComplete: (result: ModeResult) => void) => {
      activeCtx = ctx;
      // Suspend Omega
      ctx.player.setVelocity(0, 0);
      // Let the main scene know there's a boss/minigame active so it gates input
      ctx.isBossActive = true; 

      // Duck Omega music
      if (ctx.audioController) {
        ctx.audioController.pauseStageMusic();
      }

      // Mount the external game via React bridge
      ctx.mountExternalGame({ gameId: opts.gameId, config }, (result) => {
        ctx.unmountExternalGame();
        onComplete(result);
      });
    },

    teardown: () => {
      if (!activeCtx) return;
      activeCtx.unmountExternalGame();
      activeCtx.isBossActive = false;
      
      // Restore Omega music
      if (activeCtx.audioController) {
        activeCtx.audioController.resumeStageMusic();
      }
      activeCtx = null;
    }
  };
}

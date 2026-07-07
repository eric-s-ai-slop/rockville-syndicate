import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createExternalGameMode } from './index';
import { ModeContext, ModeResult } from '../types';

describe('createExternalGameMode', () => {
  let mockCtx: ModeContext;
  const mockOpts = { id: 'test-external-mode', gameId: 'minigame-1' };

  beforeEach(() => {
    mockCtx = {
      player: {
        setVelocity: vi.fn(),
      },
      audioController: {
        pauseStageMusic: vi.fn(),
        resumeStageMusic: vi.fn(),
      },
      isBossActive: false,
      mountExternalGame: vi.fn(),
      unmountExternalGame: vi.fn(),
    } as unknown as ModeContext;
  });

  it('should create a valid GameMode object with correct id', () => {
    const mode = createExternalGameMode(mockOpts);
    expect(mode.id).toBe(mockOpts.id);
    expect(mode.start).toBeTypeOf('function');
    expect(mode.teardown).toBeTypeOf('function');
  });

  describe('start', () => {
    it('should initialize external game context correctly', () => {
      const mode = createExternalGameMode(mockOpts);
      const onComplete = vi.fn();
      const config = { some: 'config' };

      mode.start(mockCtx, config, onComplete);

      expect(mockCtx.player.setVelocity).toHaveBeenCalledWith(0, 0);
      expect(mockCtx.isBossActive).toBe(true);
      expect(mockCtx.audioController.pauseStageMusic).toHaveBeenCalled();
      expect(mockCtx.mountExternalGame).toHaveBeenCalledWith(
        { gameId: mockOpts.gameId, config },
        expect.any(Function)
      );
    });

    it('should unmount game and call onComplete when external game finishes', () => {
      const mode = createExternalGameMode(mockOpts);
      const onComplete = vi.fn();

      // Setup mock to immediately call the callback passed to mountExternalGame
      const mockResult: ModeResult = { outcome: 'win' };
      vi.mocked(mockCtx.mountExternalGame).mockImplementation((opts, callback) => {
        callback(mockResult);
      });

      mode.start(mockCtx, {}, onComplete);

      expect(mockCtx.unmountExternalGame).toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalledWith(mockResult);
    });

    it('should not throw if audioController is undefined in start', () => {
      const mode = createExternalGameMode(mockOpts);
      const onComplete = vi.fn();

      const ctxWithoutAudio = { ...mockCtx };
      delete ctxWithoutAudio.audioController;

      expect(() => {
        mode.start(ctxWithoutAudio as unknown as ModeContext, {}, onComplete);
      }).not.toThrow();
    });
  });

  describe('teardown', () => {
    it('should do nothing safely if not started', () => {
      const mode = createExternalGameMode(mockOpts);
      expect(() => {
        mode.teardown();
      }).not.toThrow();
    });

    it('should reset state and unmount game on teardown', () => {
      const mode = createExternalGameMode(mockOpts);

      // Start the mode first
      mode.start(mockCtx, {}, vi.fn());

      // Reset mocks to verify teardown
      vi.mocked(mockCtx.unmountExternalGame).mockClear();
      vi.mocked(mockCtx.audioController.resumeStageMusic).mockClear();

      mode.teardown();

      expect(mockCtx.unmountExternalGame).toHaveBeenCalled();
      expect(mockCtx.isBossActive).toBe(false);
      expect(mockCtx.audioController.resumeStageMusic).toHaveBeenCalled();
    });

    it('should not throw if audioController is undefined in teardown', () => {
      const mode = createExternalGameMode(mockOpts);

      const ctxWithoutAudio = { ...mockCtx };
      delete ctxWithoutAudio.audioController;

      mode.start(ctxWithoutAudio as unknown as ModeContext, {}, vi.fn());

      expect(() => {
        mode.teardown();
      }).not.toThrow();

      expect(ctxWithoutAudio.isBossActive).toBe(false);
      expect(ctxWithoutAudio.unmountExternalGame).toHaveBeenCalled();
    });

    it('should do nothing if called multiple times after first teardown clears context', () => {
      const mode = createExternalGameMode(mockOpts);

      mode.start(mockCtx, {}, vi.fn());
      mode.teardown();

      // Clear to ensure it's not called again
      vi.mocked(mockCtx.unmountExternalGame).mockClear();

      mode.teardown(); // Second call

      expect(mockCtx.unmountExternalGame).not.toHaveBeenCalled();
    });
  });
});

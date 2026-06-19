import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildPackAtlas, packFrame, packSize, PACK_ATLAS_KEY } from './packSpriteAtlas';

describe('packSpriteAtlas', () => {
  let mockScene: any;
  let originalGetContext: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockScene = {
      textures: {
        exists: vi.fn().mockReturnValue(false),
        get: vi.fn().mockReturnValue({
          getSourceImage: vi.fn().mockReturnValue(document.createElement('img')),
        }),
        addAtlas: vi.fn(),
      },
    };
    originalGetContext = HTMLCanvasElement.prototype.getContext;
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it('should return early if the atlas already exists', () => {
    mockScene.textures.exists.mockImplementation((key: string) => key === PACK_ATLAS_KEY);

    buildPackAtlas(mockScene);

    expect(mockScene.textures.get).not.toHaveBeenCalled();
    expect(mockScene.textures.addAtlas).not.toHaveBeenCalled();

    expect(packFrame('tollbooth_front')).toBe('tollbooth_front');
    expect(packSize('tollbooth_front')).toBeDefined();
  });

  it('should build the atlas and correctly layout frames, including wrapping', () => {
    // We want to test that if sum of widths exceeds 1024, it wraps to a new line
    // The entries in packSpriteAtlas:
    // tollbooth_front (w=690)
    // barrier_arm_down (w=185)
    // pack_cone (w=42)
    // guardrail_h (w=366)
    // 690 + 2 + 185 + 2 + 42 = 919. Next is 366. 919 + 2 + 366 = 1287 > 1024, so guardrail_h wraps.

    const mockGetContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
      getImageData: vi.fn().mockImplementation((x, y, w, h) => ({
        data: new Uint8ClampedArray(w * h * 4).fill(255), // All white pixels
      })),
      putImageData: vi.fn(),
    });
    HTMLCanvasElement.prototype.getContext = mockGetContext as any;

    mockScene.textures.exists.mockImplementation((key: string) => {
        if (key === PACK_ATLAS_KEY) return false;
        return true;
    });

    buildPackAtlas(mockScene);

    expect(mockScene.textures.get).toHaveBeenCalled();
    expect(mockScene.textures.addAtlas).toHaveBeenCalled();

    const config = mockScene.textures.addAtlas.mock.calls[0][2];
    expect(config).toBeDefined();

    // tollbooth_front: dx=0, dy=0
    const tollbooth = config.frames.find((f: any) => f.filename === 'tollbooth_front');
    expect(tollbooth.frame.x).toBe(0);
    expect(tollbooth.frame.y).toBe(0);

    // guardrail_h should be wrapped to a new row.
    // The previous row max height was 195 (tollbooth_front).
    // PAD is 2. So dy should be 195 + 2 = 197.
    const guardrail_h = config.frames.find((f: any) => f.filename === 'guardrail_h');
    expect(guardrail_h.frame.x).toBe(0); // Wrapped to start of row
    expect(guardrail_h.frame.y).toBe(197);
  });

  it('should key the background to transparent if within tolerance', () => {
    // Test the cropAndKey logic inside buildPackAtlas
    let putImageDataCalledWith: ImageData | undefined;

    const mockGetContext = vi.fn().mockImplementation(function(this: any, contextType) {
      return {
        drawImage: vi.fn(),
        getImageData: vi.fn().mockImplementation((x, y, w, h) => {
          // Create 1 pixel image data
          // Set color to exactly match tollbooth bg (165, 171, 178)
          const data = new Uint8ClampedArray([165, 171, 178, 255]);
          return { data, width: 1, height: 1 };
        }),
        putImageData: vi.fn().mockImplementation((imgData, x, y) => {
          putImageDataCalledWith = imgData;
        }),
      };
    });
    HTMLCanvasElement.prototype.getContext = mockGetContext as any;

    mockScene.textures.exists.mockImplementation((key: string) => {
        if (key === PACK_ATLAS_KEY) return false;
        // Only provide tollbooth to isolate the test
        if (key === 'pack_tollbooth') return true;
        return false;
    });

    buildPackAtlas(mockScene);

    // Since we matched the bg color exactly, cropAndKey should have set alpha to 0
    expect(putImageDataCalledWith).toBeDefined();
    if (putImageDataCalledWith) {
        expect(putImageDataCalledWith.data[3]).toBe(0); // Alpha should be 0
    }
  });

  it('should not key the background if outside tolerance', () => {
    let putImageDataCalledWith: ImageData | undefined;

    const mockGetContext = vi.fn().mockImplementation(function(this: any, contextType) {
      return {
        drawImage: vi.fn(),
        getImageData: vi.fn().mockImplementation((x, y, w, h) => {
          // Color significantly different from tollbooth bg (165, 171, 178)
          const data = new Uint8ClampedArray([0, 0, 0, 255]);
          return { data, width: 1, height: 1 };
        }),
        putImageData: vi.fn().mockImplementation((imgData, x, y) => {
          putImageDataCalledWith = imgData;
        }),
      };
    });
    HTMLCanvasElement.prototype.getContext = mockGetContext as any;

    mockScene.textures.exists.mockImplementation((key: string) => {
        if (key === PACK_ATLAS_KEY) return false;
        if (key === 'pack_tollbooth') return true;
        return false;
    });

    buildPackAtlas(mockScene);

    expect(putImageDataCalledWith).toBeDefined();
    if (putImageDataCalledWith) {
        expect(putImageDataCalledWith.data[3]).toBe(255); // Alpha should remain 255
    }
  });

  it('should return if no crops are generated', () => {
    mockScene.textures.exists.mockImplementation((key: string) => false);

    buildPackAtlas(mockScene);

    expect(mockScene.textures.addAtlas).not.toHaveBeenCalled();
  });

  it('should catch errors and log them to console.error', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockScene.textures.exists.mockImplementation((key: string) => {
        if (key === PACK_ATLAS_KEY) return false;
        return true;
    });

    mockScene.textures.get.mockImplementation(() => {
        throw new Error('Mock error');
    });

    buildPackAtlas(mockScene);

    expect(consoleSpy).toHaveBeenCalledWith(
        '[packSpriteAtlas] buildPackAtlas failed:',
        expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});

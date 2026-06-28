import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { preprocessShowcaseSheet, preprocessColumnFirstSheet, preprocessGirlSilhouetteSheet, preprocessStandardSheet } from './SpritePreprocessor';

describe('SpritePreprocessor', () => {
  let originalGetContext: any;
  let originalGetImageData: any;

  beforeEach(() => {
    // Save original methods
    originalGetContext = HTMLCanvasElement.prototype.getContext;
  });

  afterEach(() => {
    // Restore original methods
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it('should process a mock sprite sheet correctly and extract components', () => {
    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: 100 });
    Object.defineProperty(img, 'naturalHeight', { value: 100 });

    const result = preprocessShowcaseSheet(img, 'test-character');

    expect(result).toBeDefined();
    expect(result.canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(result.frameWidth).toBe(128);
    expect(result.frameHeight).toBe(128);
    expect(result.idleFrontFrames).toBeDefined();
    expect(result.idleFrontFrames.length).toBeGreaterThan(0);
  });

  it('should handle edge cases with no components found gracefully', () => {
    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: 10 });
    Object.defineProperty(img, 'naturalHeight', { value: 10 }); // Too small to find our mocked red pixel

    const result = preprocessShowcaseSheet(img, 'test-character');

    expect(result).toBeDefined();
    // It should have fallbacks for all animation arrays
    expect(result.idleFrontFrames[0]).toBe(0);
    expect(result.idleSideFrames[0]).toBe(0);
    expect(result.idleBackFrames[0]).toBe(0);
    expect(result.walkFrames[0]).toBe(0);
    expect(result.walkFrontFrames[0]).toBe(0);
    expect(result.walkSideFrames[0]).toBe(0);
    expect(result.walkBackFrames[0]).toBe(0);
    expect(result.runFrames[0]).toBe(0);
    expect(result.attackFrames[0]).toBe(0);
    expect(result.hurtFrames[0]).toBe(0);
    expect(result.victoryFrames[0]).toBe(0);
    expect(result.defeatFrames[0]).toBe(0);
  });

  it('should throw error if canvas context cannot be created', () => {
    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: 100 });
    Object.defineProperty(img, 'naturalHeight', { value: 100 });

    HTMLCanvasElement.prototype.getContext = () => null;

    expect(() => preprocessShowcaseSheet(img, 'test-character')).toThrowError(
      'Could not get temporary canvas 2D context'
    );
  });

  const createMockGetContext = (
    w: number,
    h: number,
    mockPixels: Array<{x: number, y: number, color?: number[]}> = []
  ) => {
    return function (contextId: string): any {
      if (contextId === '2d') {
        return {
          fillRect: vi.fn(),
          clearRect: vi.fn(),
          getImageData: (ix: number, iy: number, iw: number, ih: number) => {
            const data = new Uint8ClampedArray(iw * ih * 4);
            // Default fully transparent
            for (let i = 0; i < data.length; i += 4) {
              data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0;
            }

            // Add specific colored pixels
            for (const { x, y, color } of mockPixels) {
              // Map global x, y to local ix, iy
              if (x >= ix && x < ix + iw && y >= iy && y < iy + ih) {
                const lx = x - ix;
                const ly = y - iy;
                const idx = (ly * iw + lx) * 4;
                data[idx] = color ? color[0] : 255;
                data[idx + 1] = color ? color[1] : 0;
                data[idx + 2] = color ? color[2] : 0;
                data[idx + 3] = color ? color[3] : 255;
              }
            }

            return { data, width: iw, height: ih };
          },
          putImageData: vi.fn(),
          createImageData: vi.fn(() => []),
          drawImage: vi.fn(),
          imageSmoothingEnabled: false,
        };
      }
      return null;
    };
  };

  it('should handle a 3-row configuration sheet correctly', () => {
    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: 200 });
    Object.defineProperty(img, 'naturalHeight', { value: 200 });

    // Create 3 "rows" of components
    const pixels = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
         // Create a 20x20 component box
         for (let px=0; px<20; px++) {
            for (let py=0; py<20; py++) {
               pixels.push({ x: col * 40 + px + 10, y: row * 40 + py + 10 });
            }
         }
      }
    }

    HTMLCanvasElement.prototype.getContext = createMockGetContext(200, 200, pixels);

    const result = preprocessShowcaseSheet(img, 'standard');
    expect(result.idleFrontFrames.length).toBeGreaterThan(0);
    expect(result.walkFrames.length).toBeGreaterThan(0);
    expect(result.attackFrames.length).toBeGreaterThan(0);
  });

  it('should handle a 4-row configuration sheet correctly', () => {
    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: 200 });
    Object.defineProperty(img, 'naturalHeight', { value: 200 });

    // Create 4 "rows" of components
    const pixels = [];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
         // Create a 20x20 component box
         for (let px=0; px<20; px++) {
            for (let py=0; py<20; py++) {
               pixels.push({ x: col * 40 + px + 10, y: row * 40 + py + 10 });
            }
         }
      }
    }

    HTMLCanvasElement.prototype.getContext = createMockGetContext(200, 200, pixels);

    const result = preprocessShowcaseSheet(img, 'jacob');
    expect(result.idleFrontFrames.length).toBeGreaterThan(0);
    expect(result.walkFrames.length).toBeGreaterThan(0);
    expect(result.attackFrames.length).toBeGreaterThan(0);
    expect(result.victoryFrames.length).toBeGreaterThan(0);
  });

  it('should handle a 7-row configuration sheet correctly', () => {
    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: 200 });
    Object.defineProperty(img, 'naturalHeight', { value: 500 }); // Taller to fit 7 rows

    // Create 7 "rows" of components
    const pixels = [];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 4; col++) {
         // Create a 20x20 component box
         for (let px=0; px<20; px++) {
            for (let py=0; py<20; py++) {
               pixels.push({ x: col * 40 + px + 10, y: row * 60 + py + 10 });
            }
         }
      }
    }

    HTMLCanvasElement.prototype.getContext = createMockGetContext(200, 500, pixels);

    const result = preprocessShowcaseSheet(img, 'advanced');
    expect(result.idleFrontFrames.length).toBeGreaterThan(0);
    expect(result.idleSideFrames.length).toBeGreaterThan(0);
    expect(result.idleBackFrames.length).toBeGreaterThan(0);
    expect(result.walkFrontFrames.length).toBeGreaterThan(0);
    expect(result.attackFrames.length).toBeGreaterThan(0);
  });

  it('should handle nick_f special case', () => {
    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: 500 });
    Object.defineProperty(img, 'naturalHeight', { value: 200 });

    // Create 3 "rows" of components, with 12 cols
    const pixels = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 12; col++) {
         // Create a 20x20 component box
         for (let px=0; px<20; px++) {
            for (let py=0; py<20; py++) {
               pixels.push({ x: col * 30 + px + 10, y: row * 40 + py + 10 });
            }
         }
      }
    }

    HTMLCanvasElement.prototype.getContext = createMockGetContext(500, 200, pixels);

    const result = preprocessShowcaseSheet(img, 'nick_f');
    expect(result.idleFrontFrames.length).toBeGreaterThan(0);
    expect(result.idleBackFrames.length).toBeGreaterThan(0);
    expect(result.idleSideFrames.length).toBeGreaterThan(0);
  });

  it('should ignore text labels and big illustrations', () => {
    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: 400 });
    Object.defineProperty(img, 'naturalHeight', { value: 400 });

    const pixels = [];
    // Small text label at top
    for (let px=0; px<100; px++) {
       for (let py=0; py<10; py++) {
          pixels.push({ x: px + 10, y: py + 10 });
       }
    }

    // Big illustration
    for (let px=0; px<200; px++) {
       for (let py=0; py<200; py++) {
          pixels.push({ x: px + 10, y: py + 100 });
       }
    }

    HTMLCanvasElement.prototype.getContext = createMockGetContext(400, 400, pixels);

    const result = preprocessShowcaseSheet(img, 'test-character');
    // Should fallback to 0 frames as no valid components were found
    expect(result.idleFrontFrames[0]).toBe(0);
  });

  it('should process column-first sheet correctly (preprocessColumnFirstSheet)', () => {
    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: 200 });
    Object.defineProperty(img, 'naturalHeight', { value: 200 });

    const pixels = [];
    // Create columns
    for (let col = 0; col < 8; col++) {
      for (let row = 0; row < 4; row++) {
         for (let px=0; px<10; px++) {
            for (let py=0; py<10; py++) {
               pixels.push({ x: col * 20 + px + 5, y: row * 20 + py + 5 });
            }
         }
      }
    }

    HTMLCanvasElement.prototype.getContext = createMockGetContext(200, 200, pixels);

    const result = preprocessColumnFirstSheet(img, 'test-boss');
    expect(result).toBeDefined();
    expect(result.idleFrontFrames.length).toBeGreaterThan(0);
  });

  it('should throw error if canvas context cannot be created in preprocessColumnFirstSheet', () => {
    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: 100 });
    Object.defineProperty(img, 'naturalHeight', { value: 100 });

    HTMLCanvasElement.prototype.getContext = () => null;

    expect(() => preprocessColumnFirstSheet(img, 'test-character')).toThrowError();
  });

  it('should process girl silhouette sheet correctly (preprocessGirlSilhouetteSheet)', () => {
    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: 848 });
    Object.defineProperty(img, 'naturalHeight', { value: 1264 });

    const pixels = [];
    // Just mock some non-bg pixels
    for (let px=0; px<10; px++) {
      for (let py=0; py<10; py++) {
         pixels.push({ x: px + 50, y: py + 50 });
      }
    }

    HTMLCanvasElement.prototype.getContext = createMockGetContext(848, 1264, pixels);

    const result = preprocessGirlSilhouetteSheet(img);
    expect(result).toBeDefined();
    expect(result.idleFrontFrames.length).toBe(4);
    expect(result.walkFrames.length).toBe(4);
  });

  it('should throw error if canvas context cannot be created in preprocessGirlSilhouetteSheet', () => {
    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: 100 });
    Object.defineProperty(img, 'naturalHeight', { value: 100 });

    HTMLCanvasElement.prototype.getContext = () => null;

    expect(() => preprocessGirlSilhouetteSheet(img)).toThrowError();
  });

  describe('preprocessStandardSheet checkerboard keying', () => {
    // Builds a 4x4 mock sheet whose first row carries one pixel of each class we
    // care about, captures the alpha buffer handed to putImageData, and returns it.
    const runKeying = (firstRow: number[][]): Uint8ClampedArray => {
      const w = 4, h = 4;
      let captured: Uint8ClampedArray | null = null;
      HTMLCanvasElement.prototype.getContext = function (contextId: string): any {
        if (contextId !== '2d') return null;
        return {
          fillRect: vi.fn(),
          clearRect: vi.fn(),
          drawImage: vi.fn(),
          getImageData: () => {
            const data = new Uint8ClampedArray(w * h * 4);
            for (let i = 0; i < data.length; i += 4) data[i + 3] = 255; // opaque black default
            firstRow.forEach(([r, g, b], px) => {
              const idx = px * 4;
              data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
            });
            return { data, width: w, height: h };
          },
          putImageData: (imgData: ImageData) => { captured = imgData.data; },
          imageSmoothingEnabled: false,
        };
      } as any;

      const img = document.createElement('img');
      Object.defineProperty(img, 'naturalWidth', { value: w });
      Object.defineProperty(img, 'naturalHeight', { value: h });
      preprocessStandardSheet(img);
      if (!captured) throw new Error('putImageData was never called');
      return captured;
    };

    it('keys out both flattened checker tones', () => {
      // px0 ~#787878 (lum 120), px1 ~#bdbdbd (lum 189) — both checker tones.
      const out = runKeying([[120, 120, 120], [189, 189, 189]]);
      expect(out[3]).toBe(0);  // tone 1 → transparent
      expect(out[7]).toBe(0);  // tone 2 → transparent
    });

    it('preserves mid-gray subject pixels between the two checker tones', () => {
      // px2 lum 155 sits in the gap between the tones — the old [70,210] band would
      // have punched a hole here; the tolerance-based keying must keep it opaque.
      const out = runKeying([[120, 120, 120], [189, 189, 189], [155, 155, 155]]);
      expect(out[3]).toBe(0);    // checker still cleared
      expect(out[11]).toBe(255); // mid-gray subject preserved
    });

    it('preserves dark outlines and saturated subject pixels', () => {
      const out = runKeying([[40, 40, 40], [220, 30, 30]]);
      expect(out[3]).toBe(255); // dark outline (lum 40) kept
      expect(out[7]).toBe(255); // saturated red (skin/clothing) kept
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('phaser', () => {
    return {
        default: {
            WEBGL: 1,
            CANVAS: 2,
        }
    };
});
import { extractPropSubject } from './PropExtractor';

describe('extractPropSubject', () => {
  let mockScene: any;
  let mockTextureManager: any;

  beforeEach(() => {
    mockTextureManager = {
      get: vi.fn(),
      createCanvas: vi.fn(),
    };

    mockScene = {
      textures: mockTextureManager,
      game: {
        renderer: {
          type: 1, // Phaser.WEBGL mock value
          deleteTexture: vi.fn(),
        },
      },
    };
  });

  it('should return 1 when texture is not found', () => {
    mockTextureManager.get.mockReturnValue(null);
    expect(extractPropSubject(mockScene, 'missing-texture')).toBe(1);
  });

  it('should return 1 when texture key is __MISSING', () => {
    mockTextureManager.get.mockReturnValue({ key: '__MISSING' });
    expect(extractPropSubject(mockScene, '__MISSING')).toBe(1);
  });

  it('should return 1 for unsupported texture source', () => {
    mockTextureManager.get.mockReturnValue({
      key: 'test',
      getSourceImage: () => ({}), // not Canvas or Image
    });
    expect(extractPropSubject(mockScene, 'test')).toBe(1);
  });

  it('should return 1 when 2D context fails to create', () => {
    const mockImage = document.createElement('img');
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = () => null;

    mockTextureManager.get.mockReturnValue({
      key: 'test',
      getSourceImage: () => mockImage,
    });

    expect(extractPropSubject(mockScene, 'test')).toBe(1);

    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it('should handle HTMLImageElement and correctly modify its source when finding seed', () => {
    const mockImage = document.createElement('img');
    // Using a size > 20x20 to trigger the red pixel generation in vitest.setup.ts
    // The red pixel will be at x=15, y=15, which is index (15*30 + 15)*4 = 1860
    Object.defineProperty(mockImage, 'width', { value: 30 });
    Object.defineProperty(mockImage, 'height', { value: 30 });

    const mockTextureSource = {
      source: mockImage,
      image: mockImage,
      width: 30,
      height: 30,
      glTexture: {},
    };

    const textureMock = {
      key: 'test',
      getSourceImage: () => mockImage,
      source: [mockTextureSource],
    };

    mockTextureManager.get.mockReturnValue(textureMock);

    // It should find the non-background pixel placed at (15, 15) by the jsdom mock,
    // bounding box will be just 1 pixel (width 1, height 1) -> aspect ratio 1.
    const aspect = extractPropSubject(mockScene, 'test');

    expect(aspect).toBe(1);
    expect(mockScene.game.renderer.deleteTexture).toHaveBeenCalled();
  });

  it('should handle HTMLCanvasElement correctly', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 30;
    canvas.height = 30;

    const textureMock = {
      key: 'test',
      getSourceImage: () => canvas,
    };

    mockTextureManager.get.mockReturnValue(textureMock);

    const aspect = extractPropSubject(mockScene, 'test');
    expect(aspect).toBe(1);
  });

  it('should return width/height when seed is not found', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 20;

    const textureMock = {
      key: 'test',
      getSourceImage: () => canvas,
    };

    mockTextureManager.get.mockReturnValue(textureMock);

    // Size < 20x20 so no non-bg pixel is added by the mock getContext
    // Should return width / height
    const aspect = extractPropSubject(mockScene, 'test');
    expect(aspect).toBe(10 / 20);
  });
});

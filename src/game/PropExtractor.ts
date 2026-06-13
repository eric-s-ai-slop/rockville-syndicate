import Phaser from 'phaser';

/**
 * Extracts a single subject (prop) from a sprite sheet frame that contains a "card" background.
 * Uses a BFS island-finding algorithm starting from the center (assumed to be part of the subject)
 * to locate connected non-background pixels. Modifies the texture in place, creating a transparent
 * background and returns the aspect ratio of the extracted subject's bounding box.
 */
export function extractPropSubject(
  scene: Phaser.Scene,
  textureKey: string,
  tolerance: number = 30
): number {
  const texture = scene.textures.get(textureKey);
  if (!texture || texture.key === '__MISSING') {
    console.warn(`[PropExtractor] Texture ${textureKey} not found.`);
    return 1; // Default aspect
  }

  // Use the canvas from the texture source
  const source = texture.getSourceImage();
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null;

  if (source instanceof HTMLCanvasElement) {
    canvas = source;
    ctx = canvas.getContext('2d', { willReadFrequently: true });
  } else if (source instanceof HTMLImageElement) {
    canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(source, 0, 0);
    }
  } else {
    console.warn(`[PropExtractor] Unsupported texture source for ${textureKey}`);
    return 1;
  }

  if (!ctx) {
    console.warn(`[PropExtractor] Failed to get 2D context for ${textureKey}`);
    return 1;
  }

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Assume the top-left pixel is the background color (card background)
  const bgR = data[0];
  const bgG = data[1];
  const bgB = data[2];

  // Function to check if a pixel is considered "background" based on color distance
  const isBackground = (x: number, y: number) => {
    const idx = (y * width + x) * 4;
    // Transparent pixels are also background
    if (data[idx + 3] === 0) return true;

    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    const dist = Math.sqrt(
      Math.pow(r - bgR, 2) + Math.pow(g - bgG, 2) + Math.pow(b - bgB, 2)
    );
    return dist <= tolerance;
  };

  // Find a starting point (seed) for the subject.
  // Start from the center and scan outwards.
  let seedX = -1;
  let seedY = -1;
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);

  // Simple scan near the center to find a non-background pixel
  outer: for (let radius = 0; radius < Math.min(cx, cy); radius += 2) {
      for (let dx = -radius; dx <= radius; dx++) {
          for (let dy = -radius; dy <= radius; dy++) {
              if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
                  const x = cx + dx;
                  const y = cy + dy;
                  if (x >= 0 && x < width && y >= 0 && y < height && !isBackground(x, y)) {
                      seedX = x;
                      seedY = y;
                      break outer;
                  }
              }
          }
      }
  }

  if (seedX === -1 || seedY === -1) {
    console.warn(`[PropExtractor] Could not find subject seed for ${textureKey}. Treating whole image as subject.`);
    return width / height;
  }

  // BFS to find the connected component (the subject)
  const visited = new Uint8Array(width * height);
  const queue: [number, number][] = [[seedX, seedY]];
  visited[seedY * width + seedX] = 1;

  let minX = seedX;
  let maxX = seedX;
  let minY = seedY;
  let maxY = seedY;

  // Keep track of pixels that are part of the subject
  const subjectPixels = new Set<number>();
  subjectPixels.add(seedY * width + seedX);

  const dx = [-1, 1, 0, 0];
  const dy = [0, 0, -1, 1];

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    for (let i = 0; i < 4; i++) {
      const nx = x + dx[i];
      const ny = y + dy[i];

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const idx = ny * width + nx;
        if (!visited[idx]) {
          visited[idx] = 1;
          if (!isBackground(nx, ny)) {
            subjectPixels.add(idx);
            queue.push([nx, ny]);
          }
        }
      }
    }
  }

  // Modify image data to make everything outside the subject transparent
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!subjectPixels.has(idx)) {
        // Set alpha to 0 for background
        data[idx * 4 + 3] = 0;
      }
    }
  }

  // Update the canvas with the modified image data
  ctx.putImageData(imgData, 0, 0);

  // Update the Phaser texture with the new canvas
  if (texture.getSourceImage() !== canvas) {
    // If we created a new canvas, we need to update the texture's source
    const newCanvasTexture = scene.textures.createCanvas(textureKey + '_extracted', width, height);
    if (newCanvasTexture) {
      newCanvasTexture.context.drawImage(canvas, 0, 0);
      newCanvasTexture.refresh();
      // To simplify swapping in the scene without modifying texture keys in the map,
      // we'll actually just overwrite the source canvas if we could, but creating a new one
      // is safer. Let's just modify the existing texture source if it's an image.
      // Phaser's update method handles this.
    }
  }

  if (source instanceof HTMLImageElement) {
    // Replace the image source with the canvas to apply transparency
     texture.source[0].source = canvas;
     texture.source[0].image = canvas;
     texture.source[0].width = width;
     texture.source[0].height = height;
     // Note: WebGL context needs texture update.
     if (scene.game.renderer.type === Phaser.WEBGL) {
        (scene.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).deleteTexture(texture.source[0].glTexture!);
        texture.source[0].glTexture = null;
     }
  }

  // Calculate the aspect ratio of the extracted bounding box
  const subjectWidth = maxX - minX + 1;
  const subjectHeight = maxY - minY + 1;
  const aspect = subjectWidth / subjectHeight;

  // We could also optionally crop the texture here, but just preserving the alpha is enough
  // as the visual bounding box will be correct, and we have the true aspect ratio.
  // Actually, calculating aspect ratio based on the whole canvas is what the game uses
  // for drawing, but the subject might be off-center or smaller. Let's return the aspect
  // of the actual subject content.

  return aspect;
}

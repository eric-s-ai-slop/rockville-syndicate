import { Jimp } from 'jimp';

async function main() {
  const file = './src/assets/images/hero_eric_1781236098529.jpg';
  console.log('Loading file:', file);
  const image = await Jimp.read(file);
  const width = image.bitmap.width;
  const height = image.bitmap.height;

  // Background color at (10, 10)
  const bgPixel = image.getPixelColor(10, 10);
  const bgR = (bgPixel >> 24) & 0xff;
  const bgG = (bgPixel >> 16) & 0xff;
  const bgB = (bgPixel >> 8) & 0xff;

  console.log('BG Color:', { bgR, bgG, bgB });

  const isBackground = (r: number, g: number, b: number) => {
    const dist = Math.sqrt((r - bgR)**2 + (g - bgG)**2 + (b - bgB)**2);
    return dist < 35; // tolerance
  };

  const visited = new Uint8Array(width * height);
  interface Comp {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    w: number;
    h: number;
    cx: number;
    cy: number;
  }
  const components: Comp[] = [];

  // Ignore top 11% (headers)
  const topBuffer = Math.floor(height * 0.11);

  for (let y = topBuffer; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;

      const pixel = image.getPixelColor(x, y);
      const r = (pixel >> 24) & 0xff;
      const g = (pixel >> 16) & 0xff;
      const b = (pixel >> 8) & 0xff;
      const a = pixel & 0xff;

      if (a < 50 || isBackground(r, g, b)) {
        visited[idx] = 1;
        continue;
      }

      // BFS to find all connected pixels
      let minX = x, maxX = x, minY = y, maxY = y;
      const queue: [number, number][] = [[x, y]];
      visited[idx] = 1;

      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) continue;
        const [cx, cy] = item;

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbors: [number, number][] = [
          [cx + 1, cy], [cx - 1, cy],
          [cx, cy + 1], [cx, cy - 1]
        ];

        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < width && ny >= topBuffer && ny < height) {
            const nidx = ny * width + nx;
            if (!visited[nidx]) {
              const npixel = image.getPixelColor(nx, ny);
              const nr = (npixel >> 24) & 0xff;
              const ng = (npixel >> 16) & 0xff;
              const nb = (npixel >> 8) & 0xff;
              const na = npixel & 0xff;

              if (na >= 50 && !isBackground(nr, ng, nb)) {
                visited[nidx] = 1;
                queue.push([nx, ny]);
              } else {
                visited[nidx] = 1;
              }
            }
          }
        }
      }

      const w = maxX - minX + 1;
      const h = maxY - minY + 1;

      // Filter noise (labels, tiny specs, etc)
      if (w >= 15 && h >= 25) {
        // Exclude the huge bottom-left illustration (minX < 210, maxY > 300)
        if (minX < 210 && maxY > 300) {
          continue;
        }
        components.push({ minX, minY, maxX, maxY, w, h, cx: Math.floor((minX + maxX)/2), cy: Math.floor((minY + maxY)/2) });
      }
    }
  }

  // Group by horizontal columns roughly using actual layout values
  const getColName = (cx: number) => {
    if (cx < 140) return 'Idle Front';
    if (cx < 250) return 'Idle Side (Right/Left)';
    if (cx < 360) return 'Idle Back';
    if (cx < 480) return 'Walk Cycle';
    if (cx < 620) return 'Running Cycle';
    if (cx < 740) return 'Battle Stance';
    if (cx < 870) return 'Attack Animation';
    if (cx < 1000) return 'Hurt/Damage Column';
    return 'Far Right Action';
  };

  components.sort((a, b) => {
    const colA = a.cx;
    const colB = b.cx;
    if (Math.abs(colA - colB) > 40) return colA - colB;
    return a.minY - b.minY;
  });

  console.log('Detected Components:', components.length);
  components.forEach((c, idx) => {
    console.log(`[${idx}] Column: ${getColName(c.cx)} (x=${c.cx}, y=${c.cy}) size: ${c.w}x${c.h} bbox: [${c.minX}, ${c.minY}, ${c.maxX}, ${c.maxY}]`);
  });
}

main().catch(console.error);

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

function analyzeImage(imagePath, characterId) {
  console.log(`\n=== Analyzing ${characterId} (${path.basename(imagePath)}) ===`);
  const imgData = fs.readFileSync(imagePath);
  
  // Create virtual canvas to draw the loaded image on
  const canvas = createCanvas(1, 1);
  const img = new (require('canvas').Image)();
  img.src = imgData;
  
  const width = img.width;
  const height = img.height;
  const sheetScale = height / 768;
  
  console.log(`Image dimensions: ${width}x${height}, sheetScale: ${sheetScale}`);

  const tempCanvas = createCanvas(width, height);
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(img, 0, 0);

  const imgRawData = tempCtx.getImageData(0, 0, width, height);
  const pixels = imgRawData.data;

  const bgR = pixels[10 * 4];
  const bgG = pixels[10 * 4 + 1];
  const bgB = pixels[10 * 4 + 2];
  console.log(`Background color: RGB(${bgR}, ${bgG}, ${bgB})`);

  const isBackground = (r, g, b, a) => {
    if (a < 50) return true;
    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
    const tolerance = (characterId && characterId.includes('nick_f')) ? 35 : 45;
    return dist < tolerance;
  };

  const visited = new Uint8Array(width * height);
  const components = [];
  const topBuffer = Math.floor(height * 0.04);

  for (let y = topBuffer; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;

      const pIdx = idx * 4;
      const r = pixels[pIdx];
      const g = pixels[pIdx + 1];
      const b = pixels[pIdx + 2];
      const a = pixels[pIdx + 3];

      if (a < 50 || isBackground(r, g, b, a)) {
        visited[idx] = 1;
        continue;
      }

      let minX = x, maxX = x, minY = y, maxY = y;
      const queue = [[x, y]];
      visited[idx] = 1;

      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) continue;
        const [cx, cy] = item;

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbors = [
          [cx + 1, cy], [cx - 1, cy],
          [cx, cy + 1], [cx, cy - 1]
        ];

        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < width && ny >= topBuffer && ny < height) {
            const nidx = ny * width + nx;
            if (!visited[nidx]) {
              const npIdx = nidx * 4;
              const nr = pixels[npIdx];
              const ng = pixels[npIdx + 1];
              const nb = pixels[npIdx + 2];
              const na = pixels[npIdx + 3];

              if (na >= 50 && !isBackground(nr, ng, nb, na)) {
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

      if (w >= 15 * sheetScale && h >= 22 * sheetScale) {
        if (minY < height * 0.10 && h < 24 * sheetScale) {
          continue;
        }
        if (w > 180 * sheetScale && minX < 230 * sheetScale && maxY > 300 * sheetScale) {
          continue;
        }
        components.push({
          minX, minY, maxX, maxY, w, h,
          cx: Math.floor((minX + maxX) / 2),
          cy: Math.floor((minY + maxY) / 2)
        });
      }
    }
  }

  console.log(`Initially detected components count: ${components.length}`);

  // Merge components
  let mergedAny = true;
  while (mergedAny) {
    mergedAny = false;
    for (let i = 0; i < components.length; i++) {
      for (let j = i + 1; j < components.length; j++) {
        const c1 = components[i];
        const c2 = components[j];

        const overlapY = Math.min(c1.maxY, c2.maxY) - Math.max(c1.minY, c2.minY);
        const gapY = overlapY >= 0 ? 0 : -overlapY;

        const overlapX = Math.min(c1.maxX, c2.maxX) - Math.max(c1.minX, c2.minX);
        const gapX = overlapX >= 0 ? 0 : -overlapX;

        const isSameCol = Math.abs(c1.cx - c2.cx) < 35 * sheetScale || gapX === 0;
        const isNearVert = gapY < 12 * sheetScale;

        if (isSameCol && isNearVert) {
          const mergedMinX = Math.min(c1.minX, c2.minX);
          const mergedMinY = Math.min(c1.minY, c2.minY);
          const mergedMaxX = Math.max(c1.maxX, c2.maxX);
          const mergedMaxY = Math.max(c1.maxY, c2.maxY);

          c1.minX = mergedMinX;
          c1.minY = mergedMinY;
          c1.maxX = mergedMaxX;
          c1.maxY = mergedMaxY;
          c1.w = mergedMaxX - mergedMinX + 1;
          c1.h = mergedMaxY - mergedMinY + 1;
          c1.cx = Math.floor((mergedMinX + mergedMaxX) / 2);
          c1.cy = Math.floor((mergedMinY + mergedMaxY) / 2);

          components.splice(j, 1);
          mergedAny = true;
          break;
        }
      }
      if (mergedAny) break;
    }
  }

  console.log(`After merge components count: ${components.length}`);

  components.sort((a, b) => a.cy - b.cy);
  const rows = [];
  components.forEach(c => {
    let matchedRow = rows.findIndex(cyValue => Math.abs(cyValue - c.cy) < 55 * sheetScale);
    if (matchedRow === -1) {
      rows.push(c.cy);
      rows.sort((x, y) => x - y);
    }
  });

  console.log(`Detected unique rows count: ${rows.length}`);
  console.log(`Row Y coordinates:`, rows);

  // Print row assignment distribution
  const rowsData = Array.from({ length: rows.length }, () => []);
  components.forEach(c => {
    const rowIdx = rows.findIndex(cyValue => Math.abs(cyValue - c.cy) < 55 * sheetScale);
    if (rowIdx !== -1) {
      rowsData[rowIdx].push(c);
    }
  });

  rowsData.forEach((row, idx) => {
    row.sort((a, b) => a.minX - b.minX);
    console.log(`  Row ${idx}: ${row.length} components. Y average: ${Math.round(row.reduce((acc, c) => acc + c.cy, 0) / row.length)}`);
    row.forEach((c, cIdx) => {
      console.log(`    Comp ${cIdx}: cx=${Math.round(c.cx)}, cy=${Math.round(c.cy)}, w=${c.w}, h=${c.h}, [${c.minX}, ${c.minY}, ${c.maxX}, ${c.maxY}]`);
    });
  });
}

const imagesDir = path.join(__dirname, 'src', 'assets', 'images');
analyzeImage(path.join(imagesDir, 'hero_nick_h_1781236135006.jpg'), 'nick_h');
analyzeImage(path.join(imagesDir, 'hero_nick_f_1781236122782.jpg'), 'nick_f');
analyzeImage(path.join(imagesDir, 'hero_eric_1781236098529.jpg'), 'eric');
analyzeImage(path.join(imagesDir, 'hero_jacob_1781236113357.jpg'), 'jacob');
analyzeImage(path.join(imagesDir, 'hero_jordan.jpg'), 'jordan');
analyzeImage(path.join(imagesDir, 'hero_maharko.jpg'), 'maharko');
analyzeImage(path.join(imagesDir, 'boss_ben.jpg'), 'ben');

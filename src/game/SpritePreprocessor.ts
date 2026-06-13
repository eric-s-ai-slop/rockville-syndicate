// Dynamic pixel-art sprite sheet preprocessor
// Automatically detects, crops, and baselines individual sprites from arbitrary layouts

export interface SlicedSpriteSheet {
  canvas: HTMLCanvasElement;
  frameWidth: number;
  frameHeight: number;
  idleFrontFrames: number[];
  idleSideFrames: number[];
  idleBackFrames: number[];
  walkFrames: number[];
  walkFrontFrames: number[];
  walkSideFrames: number[];
  walkBackFrames: number[];
  runFrames: number[];
  attackFrames: number[];
  hurtFrames: number[];
  victoryFrames: number[];
  defeatFrames: number[];
}

interface SpriteComponent {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

export function preprocessShowcaseSheet(
  img: HTMLImageElement,
  characterId: string
): SlicedSpriteSheet {
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  // Create temporary canvas to inspect image pixels
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) {
    throw new Error('Could not get temporary canvas 2D context');
  }
  tempCtx.drawImage(img, 0, 0);

  const imgData = tempCtx.getImageData(0, 0, width, height);
  const pixels = imgData.data;

  // Sample background color near top-left (10, 10) to mask it accurately
  const bgR = pixels[10 * 4];
  const bgG = pixels[10 * 4 + 1];
  const bgB = pixels[10 * 4 + 2];

  // Tolerance helper
  const isBackground = (r: number, g: number, b: number, a: number): boolean => {
    if (a < 50) return true;
    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
    return dist < 45; // safe tolerance for compressed images
  };

  // BFS island analysis
  const visited = new Uint8Array(width * height);
  const components: SpriteComponent[] = [];
  const topBuffer = Math.floor(height * 0.04); // Start much higher to capture full crown/head crowns

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

      // Found active pixel, standard BFS
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

      // Filter noise & labels & big illustration in bottom-left
      if (w >= 15 && h >= 22) {
        // Exclude text labels (which are very short and appear near the top header of the graphics sheet)
        if (minY < height * 0.10 && h < 24) {
          continue;
        }
        if (w > 180 && minX < 230 && maxY > 300) {
          // Skip the big character illustration (usually extremely wide)
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

  // Merge nearby fragmented components belonging to the same vertical sprite candidate (e.g. split heads/bodies)
  let mergedAny = true;
  while (mergedAny) {
    mergedAny = false;
    for (let i = 0; i < components.length; i++) {
      for (let j = i + 1; j < components.length; j++) {
        const c1 = components[i];
        const c2 = components[j];

        // Calculate vertical overlap/gap
        const overlapY = Math.min(c1.maxY, c2.maxY) - Math.max(c1.minY, c2.minY);
        const gapY = overlapY >= 0 ? 0 : -overlapY;

        // Calculate horizontal overlap/gap
        const overlapX = Math.min(c1.maxX, c2.maxX) - Math.max(c1.minX, c2.minX);
        const gapX = overlapX >= 0 ? 0 : -overlapX;

        // Check if they belong to the same column and are extremely close vertically (split fragments)
        const isSameCol = Math.abs(c1.cx - c2.cx) < 35 || gapX === 0;
        const isNearVert = gapY < 12; // Adjusted threshold to prevent merging separate animation rows

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

  // Group coordinates into unique horizontal rows
  components.sort((a, b) => a.cy - b.cy);
  const rows: number[] = [];
  components.forEach(c => {
    let matchedRow = rows.findIndex(cyValue => Math.abs(cyValue - c.cy) < 55);
    if (matchedRow === -1) {
      rows.push(c.cy);
      rows.sort((x, y) => x - y);
    }
  });

  // Organize frames by sorted rows
  const rowsData: SpriteComponent[][] = Array.from({ length: rows.length }, () => []);
  components.forEach(c => {
    const rowIdx = rows.findIndex(cyValue => Math.abs(cyValue - c.cy) < 55);
    if (rowIdx !== -1) {
      rowsData[rowIdx].push(c);
    }
  });

  // Sort each row's elements from left to right (X coordinate ascending)
  rowsData.forEach(row => {
    row.sort((a, b) => a.minX - b.minX);
  });

  // Setup standardized gridsheet
  // Row structure:
  // Row 0: Idle Front
  // Row 1: Idle Side
  // Row 2: Idle Back
  // Row 3: Walk Front/Cycle
  // Row 4: Run Cycle
  // Row 5: Combat / Stance / Attack
  // Row 6: Hurt
  // Row 7: Victory / Defeated
  const targetFrameW = 128;
  const targetFrameH = 128;
  const gridColumns = 12;

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetFrameW * gridColumns;
  finalCanvas.height = targetFrameH * 8; // 8 rows of action categories

  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) {
    throw new Error('Could not get final canvas context');
  }
  finalCtx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);
  finalCtx.imageSmoothingEnabled = false; // Preserve beautiful crisp pixel art scaling

  // Animation layout index arrays
  const idleFrontFrames: number[] = [];
  const idleSideFrames: number[] = [];
  const idleBackFrames: number[] = [];
  const walkFrames: number[] = [];
  const walkFrontFrames: number[] = [];
  const walkSideFrames: number[] = [];
  const walkBackFrames: number[] = [];
  const runFrames: number[] = [];
  const attackFrames: number[] = [];
  const hurtFrames: number[] = [];
  const victoryFrames: number[] = [];
  const defeatFrames: number[] = [];

  // Define drawing helper helper with automatic card background stripping
  const drawFrameToGrid = (comp: SpriteComponent, rowIndex: number, colIndex: number): number => {
    const frameImgData = tempCtx.getImageData(comp.minX, comp.minY, comp.w, comp.h);
    const data = frameImgData.data;

    // Gather background color samples around the corners and deep insets of the component
    const cornerSampleLocs = [
      [comp.minX + 3, comp.minY + 3],
      [comp.maxX - 3, comp.minY + 3],
      [comp.minX + 3, comp.maxY - 3],
      [comp.maxX - 3, comp.maxY - 3],
      [comp.minX, comp.minY],
      [comp.maxX, comp.minY],
      [comp.minX, comp.maxY],
      [comp.maxX, comp.maxY],
      [comp.minX + 6, comp.minY + 6],
      [comp.maxX - 6, comp.minY + 6],
      [comp.minX + 6, comp.maxY - 6],
      [comp.maxX - 6, comp.maxY - 6]
    ];
    const cornerColors: { r: number; g: number; b: number }[] = [];
    cornerSampleLocs.forEach(([cx, cy]) => {
      if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
        const pidx = (cy * width + cx) * 4;
        cornerColors.push({
          r: pixels[pidx],
          g: pixels[pidx + 1],
          b: pixels[pidx + 2]
        });
      }
    });

    const isBackgroundOrCard = (r: number, g: number, b: number, a: number, lx: number, ly: number, compW: number, compH: number): boolean => {
      // Force transparency for the outermost border of the card to completely remove lines
      if (lx < 2 || lx >= compW - 2 || ly < 2 || ly >= compH - 2) {
        return true;
      }
      if (a < 50) return true;

      // Check against overall background
      const distBg = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
      if (distBg < 45) return true;

      // Check against sampled card background colors
      for (const c of cornerColors) {
        const distCorner = Math.sqrt((r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2);
        if (distCorner < 35) return true;
      }
      return false;
    };

    // Zero-out background pixels for smooth anti-aliased look
    for (let i = 0; i < data.length; i += 4) {
      const pixelIdx = i / 4;
      const lx = pixelIdx % comp.w;
      const ly = Math.floor(pixelIdx / comp.w);
      if (isBackgroundOrCard(data[i], data[i + 1], data[i + 2], data[i + 3], lx, ly, comp.w, comp.h)) {
        data[i + 3] = 0;
      }
    }

    // Scale components exceeding 100px so they fit comfortably in the 128x128 grid cell without bleeding
    const maxBound = 100;
    let drawW = comp.w;
    let drawH = comp.h;
    let scale = 1.0;

    if (drawW > maxBound || drawH > maxBound) {
      scale = maxBound / Math.max(drawW, drawH);
      drawW = Math.floor(drawW * scale);
      drawH = Math.floor(drawH * scale);
    }

    const cellCanvas = document.createElement('canvas');
    cellCanvas.width = comp.w;
    cellCanvas.height = comp.h;
    cellCanvas.getContext('2d')?.putImageData(frameImgData, 0, 0);

    // Baseline centered calculation
    const dx = colIndex * targetFrameW + Math.floor((targetFrameW - drawW) / 2);
    // Ground character feet exactly 16px from the bottom of each 128x128 frame
    const dy = rowIndex * targetFrameH + (targetFrameH - drawH) - 16;

    finalCtx.drawImage(cellCanvas, 0, 0, comp.w, comp.h, dx, dy, drawW, drawH);

    // Return the absolute frame index on the grid sheet
    return rowIndex * gridColumns + colIndex;
  };

  // Map arbitrary rows configurations to finalized rows categories!

  if (rows.length >= 7) {
    // Advanced sheet with directional frames
    // 0: idle front
    // 1: idle side
    // 2: idle back
    // 3: walk front
    // 4: walk side
    // 5: walk back
    // 6: attack
    // 7: victory/defeat (optional)

    rowsData[0]?.forEach((c, idx) => { if (idx < gridColumns) idleFrontFrames.push(drawFrameToGrid(c, 0, idx)); });
    rowsData[1]?.forEach((c, idx) => { if (idx < gridColumns) idleSideFrames.push(drawFrameToGrid(c, 1, idx)); });
    rowsData[2]?.forEach((c, idx) => { if (idx < gridColumns) idleBackFrames.push(drawFrameToGrid(c, 2, idx)); });

    rowsData[3]?.forEach((c, idx) => { if (idx < gridColumns) walkFrontFrames.push(drawFrameToGrid(c, 3, idx)); });
    rowsData[4]?.forEach((c, idx) => { if (idx < gridColumns) walkSideFrames.push(drawFrameToGrid(c, 4, idx)); });
    rowsData[5]?.forEach((c, idx) => { if (idx < gridColumns) walkBackFrames.push(drawFrameToGrid(c, 5, idx)); });

    walkFrames.push(...walkFrontFrames);
    runFrames.push(...walkFrames);

    rowsData[6]?.forEach((c, idx) => {
      if (idx < gridColumns) {
        const idxOnGrid = drawFrameToGrid(c, 6, idx);
        attackFrames.push(idxOnGrid);
        if (idx === 0) hurtFrames.push(idxOnGrid);
      }
    });

    if (rows.length >= 8 && rowsData[7]) {
      const half = Math.floor(rowsData[7].length / 2);
      rowsData[7].forEach((c, idx) => {
        if (idx < half) {
          if (idx < gridColumns) victoryFrames.push(drawFrameToGrid(c, 7, idx));
        } else {
          const dIdx = idx - half;
          if (dIdx + 6 < gridColumns) defeatFrames.push(drawFrameToGrid(c, 7, dIdx + 6));
        }
      });
    } else {
      rowsData[6]?.forEach((c, idx) => {
        if (idx < gridColumns) {
          const idxOnGrid = 6 * gridColumns + idx;
          if (idx < Math.ceil(rowsData[6].length / 2)) {
            victoryFrames.push(idxOnGrid);
          } else {
            defeatFrames.push(idxOnGrid);
          }
        }
      });
    }
  } else {
    // Standard 3-4 row sheet
    // Row 0 of sheet -> Idle Front (Final Row 0)
    rowsData[0]?.forEach((c, idx) => {
      if (idx < gridColumns) idleFrontFrames.push(drawFrameToGrid(c, 0, idx));
    });
    // Reuse Front animations as fallbacks for side/back
    idleSideFrames.push(...idleFrontFrames);
    idleBackFrames.push(...idleFrontFrames);

    // Row 1 of sheet -> Walk Cycle (Final Row 3)
    rowsData[1]?.forEach((c, idx) => {
      if (idx < gridColumns) walkFrames.push(drawFrameToGrid(c, 3, idx));
    });
    walkFrontFrames.push(...walkFrames);
    walkSideFrames.push(...walkFrames);
    walkBackFrames.push(...walkFrames);
    runFrames.push(...walkFrames);

    // Row 2 of sheet -> Combat / Attack Cycle (Final Row 5)
    rowsData[2]?.forEach((c, idx) => {
      if (idx < gridColumns) {
        const idxOnGrid = drawFrameToGrid(c, 5, idx);
        attackFrames.push(idxOnGrid);
        // Hurt is the first frame of combat stance/attack as standard flinch pose
        if (idx === 0) {
          hurtFrames.push(idxOnGrid);
        }
      }
    });

    // If a 4th row exists (Jacob, Nick F) -> Victory / Defeated (Final Row 7)
    if (rows.length >= 4 && rowsData[3]) {
      const half = Math.floor(rowsData[3].length / 2);
      rowsData[3].forEach((c, idx) => {
        if (idx < half) {
          if (idx < gridColumns) victoryFrames.push(drawFrameToGrid(c, 7, idx));
        } else {
          const dIdx = idx - half;
          if (dIdx + 6 < gridColumns) defeatFrames.push(drawFrameToGrid(c, 7, dIdx + 6));
        }
      });
    } else {
      // 3-row sheets (Eric, Nick H) -> split attack row frames for victory / defeat fallbacks
      rowsData[2]?.forEach((c, idx) => {
        if (idx < gridColumns) {
          const idxOnGrid = 5 * gridColumns + idx;
          if (idx < Math.ceil(rowsData[2].length / 2)) {
            victoryFrames.push(idxOnGrid);
          } else {
            defeatFrames.push(idxOnGrid);
          }
        }
      });
    }
  }

  // Double check fallbacks to avoid blank animation arrays crash
  if (idleFrontFrames.length === 0) idleFrontFrames.push(0);
  if (idleSideFrames.length === 0) idleSideFrames.push(idleFrontFrames[0]);
  if (idleBackFrames.length === 0) idleBackFrames.push(idleFrontFrames[0]);
  if (walkFrames.length === 0) walkFrames.push(idleFrontFrames[0]);
  if (walkFrontFrames.length === 0) walkFrontFrames.push(walkFrames[0]);
  if (walkSideFrames.length === 0) walkSideFrames.push(walkFrames[0]);
  if (walkBackFrames.length === 0) walkBackFrames.push(walkFrames[0]);
  if (runFrames.length === 0) runFrames.push(walkFrames[0]);
  if (attackFrames.length === 0) attackFrames.push(idleFrontFrames[0]);
  if (hurtFrames.length === 0) hurtFrames.push(idleFrontFrames[0]);
  if (victoryFrames.length === 0) victoryFrames.push(idleFrontFrames[0]);
  if (defeatFrames.length === 0) defeatFrames.push(idleFrontFrames[0]);

  return {
    canvas: finalCanvas,
    frameWidth: targetFrameW,
    frameHeight: targetFrameH,
    idleFrontFrames,
    idleSideFrames,
    idleBackFrames,
    walkFrames,
    walkFrontFrames,
    walkSideFrames,
    walkBackFrames,
    runFrames,
    attackFrames,
    hurtFrames,
    victoryFrames,
    defeatFrames
  };
}

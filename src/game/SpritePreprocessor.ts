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
  submergedIdleFrames?: number[];
  submergedSwimFrames?: number[];
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
  const sheetScale = height / 768;

  // Create temporary canvas to inspect image pixels
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
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
    const tolerance = (characterId && characterId.includes('nick_f')) ? 35 : 45;
    return dist < tolerance; // safe tolerance for compressed images
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
      if (w >= 15 * sheetScale && h >= 22 * sheetScale) {
        // Exclude text labels (which are very short and appear near the top header of the graphics sheet)
        if (minY < height * 0.10 && h < 24 * sheetScale) {
          continue;
        }
        if (w > 180 * sheetScale && minX < 230 * sheetScale && maxY > 300 * sheetScale) {
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

  // Merge nearby fragmented components belonging to the same vertical sprite candidate (e.g. split heads/bodies).
  // Performance Optimization:
  // We use a Set (`merged`) to track components that have been consumed by a merge.
  // This avoids calling `array.splice()` inside the loop and restarting the entire N^2
  // iteration process upon every single merge, reducing worst-case time complexity from O(N^3) to O(N^2).
  const merged = new Set<SpriteComponent>();
  let mergedAny = true;
  while (mergedAny) {
    mergedAny = false;
    for (let i = 0; i < components.length; i++) {
      const c1 = components[i];
      if (merged.has(c1)) continue;

      for (let j = i + 1; j < components.length; j++) {
        const c2 = components[j];
        if (merged.has(c2)) continue;

        // Calculate vertical overlap/gap
        const overlapY = Math.min(c1.maxY, c2.maxY) - Math.max(c1.minY, c2.minY);
        const gapY = overlapY >= 0 ? 0 : -overlapY;

        // Calculate horizontal overlap/gap
        const overlapX = Math.min(c1.maxX, c2.maxX) - Math.max(c1.minX, c2.minX);
        const gapX = overlapX >= 0 ? 0 : -overlapX;

        // Check if they belong to the same column and are extremely close vertically (split fragments)
        const isSameCol = Math.abs(c1.cx - c2.cx) < 35 * sheetScale || gapX === 0;
        const isNearVert = gapY < 12 * sheetScale; // Adjusted threshold to prevent merging separate animation rows

        if (isSameCol && isNearVert) {
          c1.minX = Math.min(c1.minX, c2.minX);
          c1.minY = Math.min(c1.minY, c2.minY);
          c1.maxX = Math.max(c1.maxX, c2.maxX);
          c1.maxY = Math.max(c1.maxY, c2.maxY);
          c1.w = c1.maxX - c1.minX + 1;
          c1.h = c1.maxY - c1.minY + 1;
          c1.cx = Math.floor((c1.minX + c1.maxX) / 2);
          c1.cy = Math.floor((c1.minY + c1.maxY) / 2);

          // Mark c2 as consumed. We do NOT break the inner loop here!
          // We keep iterating so the newly expanded c1 can immediately absorb 
          // any other overlapping components further down the array.
          merged.add(c2);
          mergedAny = true;
        }
      }
    }
  }

  const activeComponents = components.filter(c => !merged.has(c));
  components.length = 0;
  components.push(...activeComponents);

  // Group coordinates into unique horizontal rows and organize frames
  // By iterating once, we avoid a redundant O(N*M) findIndex loop and unnecessary re-sorting.
  components.sort((a, b) => a.cy - b.cy);
  const rows: number[] = [];
  const rowsData: SpriteComponent[][] = [];
  
  // Performance Optimization: Since `components` are pre-sorted by `cy` (monotonically increasing), 
  // a new component can only mathematically match the *most recently created row*. We just check the last element 
  // rather than iterating through the entire `rows` array via `findIndex`.
  components.forEach(c => {
    let matchedRow = -1;
    if (rows.length > 0) {
      const lastRowCy = rows[rows.length - 1];
      if (Math.abs(lastRowCy - c.cy) < 55 * sheetScale) {
        matchedRow = rows.length - 1;
      }
    }

    if (matchedRow === -1) {
      rows.push(c.cy);
      rowsData.push([c]);
      // Note: components is already sorted by cy, so pushing to rows maintains ascending order.
    } else {
      rowsData[matchedRow].push(c);
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
      [comp.minX + Math.round(3 * sheetScale), comp.minY + Math.round(3 * sheetScale)],
      [comp.maxX - Math.round(3 * sheetScale), comp.minY + Math.round(3 * sheetScale)],
      [comp.minX + Math.round(3 * sheetScale), comp.maxY - Math.round(3 * sheetScale)],
      [comp.maxX - Math.round(3 * sheetScale), comp.maxY - Math.round(3 * sheetScale)],
      [comp.minX, comp.minY],
      [comp.maxX, comp.minY],
      [comp.minX, comp.maxY],
      [comp.maxX, comp.maxY],
      [comp.minX + Math.round(6 * sheetScale), comp.minY + Math.round(6 * sheetScale)],
      [comp.maxX - Math.round(6 * sheetScale), comp.minY + Math.round(6 * sheetScale)],
      [comp.minX + Math.round(6 * sheetScale), comp.maxY - Math.round(6 * sheetScale)],
      [comp.maxX - Math.round(6 * sheetScale), comp.maxY - Math.round(6 * sheetScale)]
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

    const w = comp.w;
    const h = comp.h;
    const isBgMask = new Uint8Array(w * h);
    const queue: [number, number][] = [];

    const checkIsBackground = (lx: number, ly: number): boolean => {
      if (lx < 2 || lx >= w - 2 || ly < 2 || ly >= h - 2) {
        return true;
      }
      const idx = (ly * w + lx) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      if (a < 50) return true;

      const distBg = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
      if (distBg < 45) return true;

      for (const c of cornerColors) {
        const distCorner = Math.sqrt((r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2);
        if (distCorner < 35) return true;
      }
      return false;
    };

    // Seed the queue with border pixels
    for (let lx = 0; lx < w; lx++) {
      if (!isBgMask[lx] && checkIsBackground(lx, 0)) {
        isBgMask[lx] = 1;
        queue.push([lx, 0]);
      }
      const bIdx = (h - 1) * w + lx;
      if (!isBgMask[bIdx] && checkIsBackground(lx, h - 1)) {
        isBgMask[bIdx] = 1;
        queue.push([lx, h - 1]);
      }
    }
    for (let ly = 0; ly < h; ly++) {
      const lIdx = ly * w;
      if (!isBgMask[lIdx] && checkIsBackground(0, ly)) {
        isBgMask[lIdx] = 1;
        queue.push([0, ly]);
      }
      const rIdx = ly * w + (w - 1);
      if (!isBgMask[rIdx] && checkIsBackground(w - 1, ly)) {
        isBgMask[rIdx] = 1;
        queue.push([w - 1, ly]);
      }
    }

    while (queue.length > 0) {
      const curr = queue.shift();
      if (!curr) continue;
      const [lx, ly] = curr;
      const neighbors: [number, number][] = [
        [lx + 1, ly], [lx - 1, ly],
        [lx, ly + 1], [lx, ly - 1]
      ];
      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const nIdx = ny * w + nx;
          if (!isBgMask[nIdx] && checkIsBackground(nx, ny)) {
            isBgMask[nIdx] = 1;
            queue.push([nx, ny]);
          }
        }
      }
    }

    // Zero-out background pixels for smooth anti-aliased look
    for (let ly = 0; ly < h; ly++) {
      for (let lx = 0; lx < w; lx++) {
        const idx = ly * w + lx;
        if (isBgMask[idx] === 1) {
          data[idx * 4 + 3] = 0;
        }
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
    const isNickF = characterId && characterId.includes('nick_f');

    if (isNickF) {
      // Nick F: 4 rows of 16 columns
      // Row 0: Idle Front (0-3), Idle Back (4-7), Idle Side (8-11)
      rowsData[0]?.forEach((c, idx) => {
        if (idx < 4) {
          idleFrontFrames.push(drawFrameToGrid(c, 0, idx));
        } else if (idx < 8) {
          idleBackFrames.push(drawFrameToGrid(c, 2, idx - 4));
        } else if (idx < 12) {
          idleSideFrames.push(drawFrameToGrid(c, 1, idx - 8));
        } else if (idx < 16) {
          drawFrameToGrid(c, 1, idx - 8); // Extra side frames (cols 4-7 of Output Row 1)
        }
      });

      // Row 1: Walk Front (0-3), Walk Back (4-7), Walk Side (8-15)
      rowsData[1]?.forEach((c, idx) => {
        if (idx < 4) {
          walkFrontFrames.push(drawFrameToGrid(c, 3, idx));
        } else if (idx < 8) {
          walkBackFrames.push(drawFrameToGrid(c, 5, idx - 4));
        } else if (idx < 16) {
          const gridIdx = drawFrameToGrid(c, 4, idx - 8); // Walk Side (cols 0-7 of Output Row 4)
          if (idx < 12) {
            walkSideFrames.push(gridIdx);
          } else {
            // Include extra walk side frames
            walkSideFrames.push(gridIdx);
          }
        }
      });
      walkFrames.push(...walkFrontFrames);
      runFrames.push(...walkSideFrames);

      // Row 2: Combat / Attack (Side attack: columns 8-11)
      rowsData[2]?.forEach((c, idx) => {
        if (idx < 4) {
          drawFrameToGrid(c, 6, idx); // Front combat stance (cols 0-3 of Output Row 6)
        } else if (idx < 8) {
          drawFrameToGrid(c, 6, idx); // Back combat stance (cols 4-7 of Output Row 6)
        } else if (idx < 12) {
          const gridIdx = drawFrameToGrid(c, 6, idx); // Side attack (cols 8-11 of Output Row 6)
          attackFrames.push(gridIdx);
          if (idx === 8) hurtFrames.push(gridIdx);
        } else {
          // Extra attack frames (ignore or draw)
        }
      });

      // Row 3: Victory / Defeated (split in half)
      if (rowsData[3]) {
        const half = Math.floor(rowsData[3].length / 2);
        rowsData[3].forEach((c, idx) => {
          if (idx < half) {
            if (idx < gridColumns) victoryFrames.push(drawFrameToGrid(c, 7, idx));
          } else {
            const dIdx = idx - half;
            if (dIdx + 6 < gridColumns) defeatFrames.push(drawFrameToGrid(c, 7, dIdx + 6));
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

/**
 * Preprocesses boss showcase sheets where COLUMNS = animation categories
 * and ROWS = frames within each category (opposite of hero row-first sheets).
 *
 * Column order: Idle Front, Idle Side, Idle Back, Walk, Run, Battle Stance, Attack, Hurt
 * Bottom region (y > 55%): Victory Pose + Defeated/KO
 */
export function preprocessColumnFirstSheet(
  img: HTMLImageElement,
  _characterId: string
): SlicedSpriteSheet {
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  const sheetScale = height / 768;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })!;
  tempCtx.drawImage(img, 0, 0);

  const imgData = tempCtx.getImageData(0, 0, width, height);
  const pixels = imgData.data;

  const bgR = pixels[(10 * width + 10) * 4];
  const bgG = pixels[(10 * width + 10) * 4 + 1];
  const bgB = pixels[(10 * width + 10) * 4 + 2];

  const isBackground = (r: number, g: number, b: number, a: number): boolean => {
    if (a < 50) return true;
    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
    const tolerance = (_characterId && _characterId.includes('nick_f')) ? 35 : 45;
    return dist < tolerance;
  };

  // BFS island detection (same approach as preprocessShowcaseSheet)
  const visited = new Uint8Array(width * height);
  const components: SpriteComponent[] = [];
  const topBuffer = Math.floor(height * 0.04);

  for (let y = topBuffer; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;

      const pIdx = idx * 4;
      const r = pixels[pIdx], g = pixels[pIdx + 1], b = pixels[pIdx + 2], a = pixels[pIdx + 3];

      if (a < 50 || isBackground(r, g, b, a)) { visited[idx] = 1; continue; }

      let minX = x, maxX = x, minY = y, maxY = y;
      const queue: [number, number][] = [[x, y]];
      visited[idx] = 1;

      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) continue;
        const [cx, cy] = item;

        if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;

        for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]] as [number, number][]) {
          if (nx >= 0 && nx < width && ny >= topBuffer && ny < height) {
            const nidx = ny * width + nx;
            if (!visited[nidx]) {
              const npIdx = nidx * 4;
              const na = pixels[npIdx + 3];
              visited[nidx] = 1;
              if (na >= 50 && !isBackground(pixels[npIdx], pixels[npIdx + 1], pixels[npIdx + 2], na)) {
                queue.push([nx, ny]);
              }
            }
          }
        }
      }

      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      // Skip text labels near top, very small noise, and excessively wide text bubbles
      if (minY < height * 0.10 && h < 28 * sheetScale) continue;
      if (w < 12 * sheetScale || h < 18 * sheetScale) continue;
      // Skip the large bottom-left portrait illustration
      if (w > 120 * sheetScale && minX < width * 0.20 && maxY > height * 0.40) continue;
      // Skip text-bubble components (wider than tall)
      if (w > h * 1.8) continue;
      // Skip bottom caption text (filename labels at very bottom)
      if (minY > height * 0.82 && h < 22 * sheetScale) continue;

      components.push({ minX, minY, maxX, maxY, w, h,
        cx: Math.floor((minX + maxX) / 2), cy: Math.floor((minY + maxY) / 2) });
    }
  }

  // Group components into columns by X-center proximity
  const colTolerance = 52 * sheetScale;
  components.sort((a, b) => a.minX - b.minX);
  const columns: SpriteComponent[][] = [];
  // Use parallel arrays to cache sums to avoid O(N^2) reduces
  const colCxSums: number[] = [];
  const colMinXSums: number[] = [];

  for (const c of components) {
    let found = false;
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const colCx = colCxSums[i] / col.length;
      if (Math.abs(colCx - c.cx) < colTolerance) {
        col.push(c);
        colCxSums[i] += c.cx;
        colMinXSums[i] += c.minX;
        found = true;
        break;
      }
    }
    if (!found) {
      columns.push([c]);
      colCxSums.push(c.cx);
      colMinXSums.push(c.minX);
    }
  }

  // Sort columns left-to-right; frames within each column top-to-bottom
  // Sort indices first, then map to preserve association
  const colIndices = columns.map((_, i) => i);
  colIndices.sort((a, b) => {
    const ax = colMinXSums[a] / columns[a].length;
    const bx = colMinXSums[b] / columns[b].length;
    return ax - bx;
  });

  // Reorder columns according to sorted indices
  const sortedColumns = colIndices.map(i => columns[i]);
  columns.length = 0;
  columns.push(...sortedColumns);
  columns.forEach(col => col.sort((a, b) => a.minY - b.minY));

  // Separate main-grid columns (sprites in upper 55% of image) from
  // bottom-section columns (Victory / Defeated which sit lower down)
  const mainCols: SpriteComponent[][] = [];
  const bottomCols: SpriteComponent[][] = [];
  for (const col of columns) {
    const mainFrames = col.filter(c => c.cy < height * 0.60);
    const bottomFrames = col.filter(c => c.cy >= height * 0.60);
    if (mainFrames.length > 0) mainCols.push(mainFrames);
    if (bottomFrames.length > 0) bottomCols.push(bottomFrames);
  }

  // Build the standardized 128×128 output grid (same format as preprocessShowcaseSheet)
  const targetFrameW = 128, targetFrameH = 128, gridColumns = 12;
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetFrameW * gridColumns;
  finalCanvas.height = targetFrameH * 8;
  const finalCtx = finalCanvas.getContext('2d')!;
  finalCtx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);
  finalCtx.imageSmoothingEnabled = false;

  const drawComp = (comp: SpriteComponent, rowIndex: number, colIndex: number): number => {
    const frameData = tempCtx.getImageData(comp.minX, comp.minY, comp.w, comp.h);
    const fd = frameData.data;

    const w = comp.w;
    const h = comp.h;
    const isBgMask = new Uint8Array(w * h);
    const queue: [number, number][] = [];

    const checkIsBackground = (lx: number, ly: number): boolean => {
      if (lx < 2 || lx >= w - 2 || ly < 2 || ly >= h - 2) {
        return true;
      }
      const idx = (ly * w + lx) * 4;
      const r = fd[idx];
      const g = fd[idx + 1];
      const b = fd[idx + 2];
      const a = fd[idx + 3];
      if (a < 50) return true;
      const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
      return dist < 45;
    };

    // Seed queue with border pixels
    for (let lx = 0; lx < w; lx++) {
      if (!isBgMask[lx] && checkIsBackground(lx, 0)) {
        isBgMask[lx] = 1;
        queue.push([lx, 0]);
      }
      const bIdx = (h - 1) * w + lx;
      if (!isBgMask[bIdx] && checkIsBackground(lx, h - 1)) {
        isBgMask[bIdx] = 1;
        queue.push([lx, h - 1]);
      }
    }
    for (let ly = 0; ly < h; ly++) {
      const lIdx = ly * w;
      if (!isBgMask[lIdx] && checkIsBackground(0, ly)) {
        isBgMask[lIdx] = 1;
        queue.push([0, ly]);
      }
      const rIdx = ly * w + (w - 1);
      if (!isBgMask[rIdx] && checkIsBackground(w - 1, ly)) {
        isBgMask[rIdx] = 1;
        queue.push([w - 1, ly]);
      }
    }

    while (queue.length > 0) {
      const curr = queue.shift();
      if (!curr) continue;
      const [lx, ly] = curr;
      for (const [nx, ny] of [[lx + 1, ly], [lx - 1, ly], [lx, ly + 1], [lx, ly - 1]]) {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const nIdx = ny * w + nx;
          if (!isBgMask[nIdx] && checkIsBackground(nx, ny)) {
            isBgMask[nIdx] = 1;
            queue.push([nx, ny]);
          }
        }
      }
    }

    for (let i = 0; i < fd.length; i += 4) {
      const pixelIdx = i / 4;
      if (isBgMask[pixelIdx] === 1) {
        fd[i + 3] = 0;
      }
    }

    const maxBound = 100;
    let drawW = comp.w, drawH = comp.h;
    if (drawW > maxBound || drawH > maxBound) {
      const sc = maxBound / Math.max(drawW, drawH);
      drawW = Math.floor(drawW * sc);
      drawH = Math.floor(drawH * sc);
    }

    const cell = document.createElement('canvas');
    cell.width = comp.w; cell.height = comp.h;
    cell.getContext('2d')!.putImageData(frameData, 0, 0);

    const dx = colIndex * targetFrameW + Math.floor((targetFrameW - drawW) / 2);
    const dy = rowIndex * targetFrameH + (targetFrameH - drawH) - 16;
    finalCtx.drawImage(cell, 0, 0, comp.w, comp.h, dx, dy, drawW, drawH);
    return rowIndex * gridColumns + colIndex;
  };

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

  // Map main columns to animation categories
  // Expected column order: Idle Front(0), Idle Side(1), Idle Back(2),
  //   Walk(3), Run(4), Battle Stance(5), Attack(6), Hurt(7)
  const colAnimMap: { frames: number[], row: number }[] = [
    { frames: idleFrontFrames, row: 0 },
    { frames: idleSideFrames,  row: 1 },
    { frames: idleBackFrames,  row: 2 },
    { frames: walkFrontFrames, row: 3 },
    { frames: walkSideFrames,  row: 4 },
    { frames: walkBackFrames,  row: 5 },  // battle stance → walk back fallback
    { frames: attackFrames,    row: 6 },
    { frames: hurtFrames,      row: 7 },
  ];

  mainCols.forEach((col, colIdx) => {
    if (colIdx >= colAnimMap.length) return;
    const { frames, row } = colAnimMap[colIdx];
    col.forEach((comp, frameIdx) => {
      if (frameIdx < gridColumns) frames.push(drawComp(comp, row, frameIdx));
    });
  });

  walkFrames.push(...walkFrontFrames);
  if (walkSideFrames.length === 0) walkSideFrames.push(...walkFrontFrames);
  if (walkBackFrames.length === 0) walkBackFrames.push(...walkFrontFrames);
  runFrames.push(...walkFrontFrames);

  // Bottom section: alternate victory / defeat
  const bottomAll = bottomCols.flatMap(c => c).sort((a, b) => a.minX - b.minX);
  const half = Math.ceil(bottomAll.length / 2);
  bottomAll.forEach((comp, idx) => {
    if (idx < half) {
      if (idx < gridColumns) victoryFrames.push(drawComp(comp, 7, idx));
    } else {
      const di = idx - half;
      if (di + 6 < gridColumns) defeatFrames.push(drawComp(comp, 7, di + 6));
    }
  });

  // Fallbacks
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
    idleFrontFrames, idleSideFrames, idleBackFrames,
    walkFrames, walkFrontFrames, walkSideFrames, walkBackFrames, runFrames,
    attackFrames, hurtFrames, victoryFrames, defeatFrames,
  };
}

export function preprocessFemalePoolSheet(
  img: HTMLImageElement,
  characterId: string
): SlicedSpriteSheet {
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })!;
  tempCtx.drawImage(img, 0, 0);

  const imgData = tempCtx.getImageData(0, 0, width, height);
  const pixels = imgData.data;

  const bgR = pixels[(10 * width + 10) * 4];
  const bgG = pixels[(10 * width + 10) * 4 + 1];
  const bgB = pixels[(10 * width + 10) * 4 + 2];

  const scaleX = (val: number) => Math.round(val * (width / 2752));
  const scaleY = (val: number) => Math.round(val * (height / 1536));

  const targetFrameW = 128, targetFrameH = 128, gridColumns = 12;
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetFrameW * gridColumns;
  finalCanvas.height = targetFrameH * 8;
  const finalCtx = finalCanvas.getContext('2d')!;
  finalCtx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);
  finalCtx.imageSmoothingEnabled = false;

  const drawComp = (comp: { minX: number; minY: number; w: number; h: number }, rowIndex: number, colIndex: number): number => {
    const frameData = tempCtx.getImageData(comp.minX, comp.minY, comp.w, comp.h);
    const fd = frameData.data;
    const w = comp.w;
    const h = comp.h;

    // Find active bounding box (exclude background)
    const checkIsBackground = (lx: number, ly: number): boolean => {
      const idx = (ly * w + lx) * 4;
      const r = fd[idx];
      const g = fd[idx + 1];
      const b = fd[idx + 2];
      const a = fd[idx + 3];
      if (a < 50) return true;
      const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
      return dist < 45;
    };

    let activeMinX = w, activeMaxX = 0, activeMinY = h, activeMaxY = 0;
    let foundAny = false;
    for (let ly = 0; ly < h; ly++) {
      for (let lx = 0; lx < w; lx++) {
        if (!checkIsBackground(lx, ly)) {
          foundAny = true;
          if (lx < activeMinX) activeMinX = lx;
          if (lx > activeMaxX) activeMaxX = lx;
          if (ly < activeMinY) activeMinY = ly;
          if (ly > activeMaxY) activeMaxY = ly;
        }
      }
    }

    if (!foundAny) {
      return rowIndex * gridColumns + colIndex;
    }

    const activeW = activeMaxX - activeMinX + 1;
    const activeH = activeMaxY - activeMinY + 1;
    const activeFrameData = tempCtx.getImageData(comp.minX + activeMinX, comp.minY + activeMinY, activeW, activeH);
    const afd = activeFrameData.data;

    // Border-seeded BFS to mask background
    const isBgMask = new Uint8Array(activeW * activeH);
    const queue: [number, number][] = [];

    const checkActiveIsBackground = (lx: number, ly: number): boolean => {
      if (lx < 2 || lx >= activeW - 2 || ly < 2 || ly >= activeH - 2) {
        return true;
      }
      const idx = (ly * activeW + lx) * 4;
      const r = afd[idx];
      const g = afd[idx + 1];
      const b = afd[idx + 2];
      const a = afd[idx + 3];
      if (a < 50) return true;
      const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
      return dist < 45;
    };

    // Seed queue with border pixels
    for (let lx = 0; lx < activeW; lx++) {
      if (!isBgMask[lx] && checkActiveIsBackground(lx, 0)) {
        isBgMask[lx] = 1;
        queue.push([lx, 0]);
      }
      const bIdx = (activeH - 1) * activeW + lx;
      if (!isBgMask[bIdx] && checkActiveIsBackground(lx, activeH - 1)) {
        isBgMask[bIdx] = 1;
        queue.push([lx, activeH - 1]);
      }
    }
    for (let ly = 0; ly < activeH; ly++) {
      const lIdx = ly * activeW;
      if (!isBgMask[lIdx] && checkActiveIsBackground(0, ly)) {
        isBgMask[lIdx] = 1;
        queue.push([0, ly]);
      }
      const rIdx = ly * activeW + (activeW - 1);
      if (!isBgMask[rIdx] && checkActiveIsBackground(activeW - 1, ly)) {
        isBgMask[rIdx] = 1;
        queue.push([activeW - 1, ly]);
      }
    }

    while (queue.length > 0) {
      const curr = queue.shift();
      if (!curr) continue;
      const [lx, ly] = curr;
      for (const [nx, ny] of [[lx + 1, ly], [lx - 1, ly], [lx, ly + 1], [lx, ly - 1]]) {
        if (nx >= 0 && nx < activeW && ny >= 0 && ny < activeH) {
          const nIdx = ny * activeW + nx;
          if (!isBgMask[nIdx] && checkActiveIsBackground(nx, ny)) {
            isBgMask[nIdx] = 1;
            queue.push([nx, ny]);
          }
        }
      }
    }

    for (let i = 0; i < afd.length; i += 4) {
      const pixelIdx = i / 4;
      if (isBgMask[pixelIdx] === 1) {
        afd[i + 3] = 0;
      }
    }

    const cell = document.createElement('canvas');
    cell.width = activeW;
    cell.height = activeH;
    cell.getContext('2d')!.putImageData(activeFrameData, 0, 0);

    const targetH = 96;
    const sc = targetH / activeH;
    const drawW = Math.round(activeW * sc);
    const drawH = targetH;

    const dx = colIndex * targetFrameW + Math.floor((targetFrameW - drawW) / 2);
    const dy = rowIndex * targetFrameH + (targetFrameH - drawH) - 10;
    finalCtx.drawImage(cell, 0, 0, activeW, activeH, dx, dy, drawW, drawH);
    return rowIndex * gridColumns + colIndex;
  };

  interface SpriteCoords {
    x: number;
    y: number;
    w: number;
    h: number;
  }

  interface CharacterCoords {
    idleFront: SpriteCoords;
    idleSide: SpriteCoords;
    idleBack: SpriteCoords;
    walkFront: SpriteCoords[];
    submergedIdle: SpriteCoords[];
    submergedSwim: SpriteCoords[];
  }

  // Coordinates mapping
  let coords: CharacterCoords;
  if (characterId === 'anastasia') {
    coords = {
      idleFront: { x: 80, y: 140, w: 200, h: 370 },
      idleSide:  { x: 415, y: 160, w: 150, h: 350 },
      idleBack:  { x: 1010, y: 1140, w: 180, h: 350 },
      walkFront: [
        { x: 1010, y: 126, w: 180, h: 320 },
        { x: 1010, y: 460, w: 180, h: 320 },
        { x: 1010, y: 796, w: 180, h: 320 },
      ],
      submergedIdle: [
        { x: 680, y: 160, w: 220, h: 350 },
        { x: 680, y: 600, w: 220, h: 380 },
        { x: 680, y: 1040, w: 220, h: 380 },
      ],
      submergedSwim: [
        { x: 680, y: 160, w: 220, h: 350 },
        { x: 680, y: 600, w: 220, h: 380 },
        { x: 680, y: 1040, w: 220, h: 380 },
      ]
    };
  } else { // sophia
    coords = {
      idleFront: { x: 80, y: 140, w: 200, h: 370 },
      idleSide:  { x: 400, y: 160, w: 170, h: 350 },
      idleBack:  { x: 1030, y: 1162, w: 170, h: 328 },
      walkFront: [
        { x: 1030, y: 126, w: 170, h: 320 },
        { x: 1030, y: 460, w: 170, h: 320 },
        { x: 1030, y: 796, w: 170, h: 320 },
      ],
      submergedIdle: [
        { x: 700, y: 160, w: 210, h: 350 },
        { x: 700, y: 600, w: 210, h: 380 },
        { x: 700, y: 1040, w: 210, h: 380 },
      ],
      submergedSwim: [
        { x: 1230, y: 240, w: 140, h: 250 },
        { x: 1400, y: 240, w: 160, h: 250 },
      ]
    };
  }

  // Scale coordinates
  const scaleRect = (r: { x: number; y: number; w: number; h: number }) => ({
    minX: scaleX(r.x),
    minY: scaleY(r.y),
    w: scaleX(r.w),
    h: scaleY(r.h)
  });

  const idleFrontFrames: number[] = [];
  const idleSideFrames: number[] = [];
  const idleBackFrames: number[] = [];
  const walkFrontFrames: number[] = [];
  const walkSideFrames: number[] = [];
  const walkBackFrames: number[] = [];
  const submergedIdleFrames: number[] = [];
  const submergedSwimFrames: number[] = [];

  // Draw rows
  const rectIF = scaleRect(coords.idleFront);
  for (let i = 0; i < 4; i++) {
    idleFrontFrames.push(drawComp(rectIF, 0, i));
  }

  const rectIS = scaleRect(coords.idleSide);
  for (let i = 0; i < 4; i++) {
    idleSideFrames.push(drawComp(rectIS, 1, i));
  }

  const rectIB = scaleRect(coords.idleBack);
  for (let i = 0; i < 4; i++) {
    idleBackFrames.push(drawComp(rectIB, 2, i));
  }

  coords.walkFront.forEach((r: any, idx: number) => {
    const rectWF = scaleRect(r);
    walkFrontFrames.push(drawComp(rectWF, 3, idx));
  });
  walkFrontFrames.push(walkFrontFrames[0]); // Pad to 4 frames
  walkSideFrames.push(...walkFrontFrames);
  walkBackFrames.push(...idleBackFrames);

  coords.submergedIdle.forEach((r: any, idx: number) => {
    const rectSI = scaleRect(r);
    submergedIdleFrames.push(drawComp(rectSI, 6, idx));
  });
  submergedIdleFrames.push(submergedIdleFrames[0]);

  coords.submergedSwim.forEach((r: any, idx: number) => {
    const rectSS = scaleRect(r);
    submergedSwimFrames.push(drawComp(rectSS, 7, idx));
  });
  while (submergedSwimFrames.length < 4) {
    submergedSwimFrames.push(submergedSwimFrames[0]);
  }

  const walkFrames = [...walkFrontFrames];

  return {
    canvas: finalCanvas,
    frameWidth: targetFrameW,
    frameHeight: targetFrameH,
    idleFrontFrames, idleSideFrames, idleBackFrames,
    walkFrames, walkFrontFrames, walkSideFrames, walkBackFrames, runFrames: walkFrontFrames,
    attackFrames: idleFrontFrames, hurtFrames: idleFrontFrames, victoryFrames: idleFrontFrames, defeatFrames: idleFrontFrames,
    submergedIdleFrames, submergedSwimFrames
  };
}

export function preprocessGirlSilhouetteSheet(img: HTMLImageElement): SlicedSpriteSheet {
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  if (!tempCtx) throw new Error('Could not get temp canvas');
  tempCtx.drawImage(img, 0, 0);

  const imgData = tempCtx.getImageData(0, 0, width, height);
  const pixels = imgData.data;

  // Background color sample at (2, 2)
  const bgR = pixels[2 * 4];
  const bgG = pixels[2 * 4 + 1];
  const bgB = pixels[2 * 4 + 2];

  // We are mapping a 4x4 grid. Cell size: 212 x 316.
  const targetFrameW = 128;
  const targetFrameH = 128;
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetFrameW * 4;
  finalCanvas.height = targetFrameH * 4;
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) throw new Error('finalCtx fail');

  const idleFrontFrames = [0]; // Just return an array of frames

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const startX = col * 212;
      const startY = row * 316;
      
      // Crop out text at top, and borders
      const cropX = startX + 15;
      const cropY = startY + 60;
      const cropW = 212 - 30;
      const cropH = 316 - 70;

      const cellData = tempCtx.getImageData(cropX, cropY, cropW, cropH);
      const cellPixels = cellData.data;

      // Strip background (tolerance 45)
      for (let i = 0; i < cellPixels.length; i += 4) {
        const r = cellPixels[i];
        const g = cellPixels[i+1];
        const b = cellPixels[i+2];
        const dist = Math.sqrt((r-bgR)**2 + (g-bgG)**2 + (b-bgB)**2);
        if (dist < 45 || r > 200) { // Strip light colors / borders
          cellPixels[i+3] = 0; // Transparent
        }
      }

      // Draw cleaned cell to temporary canvas
      const cleanCellCanvas = document.createElement('canvas');
      cleanCellCanvas.width = cropW;
      cleanCellCanvas.height = cropH;
      const cleanCellCtx = cleanCellCanvas.getContext('2d');
      if (cleanCellCtx) {
        cleanCellCtx.putImageData(cellData, 0, 0);
        // Draw into final grid (scale it down slightly to fit)
        const scale = 0.5;
        const dw = cropW * scale;
        const dh = cropH * scale;
        const dx = col * targetFrameW + (targetFrameW - dw) / 2;
        const dy = row * targetFrameH + targetFrameH - dh - 5;
        finalCtx.drawImage(cleanCellCanvas, dx, dy, dw, dh);
      }
    }
  }

  // Map to the required interface
  return {
    canvas: finalCanvas,
    frameWidth: targetFrameW,
    frameHeight: targetFrameH,
    idleFrontFrames: [0, 1, 2, 3],
    idleSideFrames: [4, 5, 6, 7],
    idleBackFrames: [8, 9, 10, 11],
    walkFrames: [0, 1, 2, 3],
    walkFrontFrames: [0, 1, 2, 3],
    walkSideFrames: [0, 1, 2, 3],
    walkBackFrames: [0, 1, 2, 3],
    runFrames: [0, 1, 2, 3],
    attackFrames: [0, 1, 2, 3],
    hurtFrames: [0, 1, 2, 3],
    victoryFrames: [0, 1, 2, 3],
    defeatFrames: [0, 1, 2, 3]
  };
}

export function preprocessStandardSheet(img: HTMLImageElement): SlicedSpriteSheet {
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  if (!tempCtx) throw new Error('Could not get temp canvas');
  tempCtx.drawImage(img, 0, 0);

  const imgData = tempCtx.getImageData(0, 0, width, height);
  const pixels = imgData.data;

  // Background color sample at (0, 0)
  const bgR = pixels[0];
  const bgG = pixels[1];
  const bgB = pixels[2];

  // Strip background
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i+1];
    const b = pixels[i+2];
    const dist = Math.sqrt((r-bgR)**2 + (g-bgG)**2 + (b-bgB)**2);
    if (dist < 45 || r > 240) { // Strip bg and pure white
      pixels[i+3] = 0; // Transparent
    }
  }

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = width;
  finalCanvas.height = height;
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) throw new Error('finalCtx fail');
  finalCtx.putImageData(imgData, 0, 0);

  const frameWidth = width / 3;
  const frameHeight = height / 4;

  return {
    canvas: finalCanvas,
    frameWidth: Math.floor(frameWidth),
    frameHeight: Math.floor(frameHeight),
    idleFrontFrames: [1],
    idleSideFrames: [4], // Assuming row 1 is left, row 2 is right. Let's just map 4.
    idleBackFrames: [10],
    walkFrames: [0, 1, 2, 1], // fallback
    walkFrontFrames: [0, 1, 2, 1],
    walkSideFrames: [3, 4, 5, 4],
    walkBackFrames: [9, 10, 11, 10],
    runFrames: [0, 1, 2, 1],
    attackFrames: [0],
    hurtFrames: [0],
    victoryFrames: [0],
    defeatFrames: [0]
  };
}

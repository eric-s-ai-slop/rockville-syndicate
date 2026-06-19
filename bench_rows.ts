import { performance } from 'perf_hooks';

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

function runTest(components: SpriteComponent[], sheetScale: number) {
  components.sort((a, b) => a.cy - b.cy);
  const rows: number[] = [];
  
  let matchOtherThanLast = false;

  components.forEach(c => {
    let matchedRow = rows.findIndex(cyValue => Math.abs(cyValue - c.cy) < 55 * sheetScale);
    if (matchedRow !== -1 && matchedRow !== rows.length - 1) {
      matchOtherThanLast = true;
      console.log(`Matched row ${matchedRow} instead of ${rows.length - 1} for cy=${c.cy}, rows=${rows}`);
    }
    if (matchedRow === -1) {
      rows.push(c.cy);
    }
  });

  console.log(`Did it ever match an earlier row? ${matchOtherThanLast}`);
}

function generateMockComponents(count: number): SpriteComponent[] {
  const comps: SpriteComponent[] = [];
  for (let i = 0; i < count; i++) {
    const minX = Math.random() * 1000;
    const cy = Math.random() * 5000; 
    comps.push({
      minX, minY: cy - 10, maxX: minX + 20, maxY: cy + 10,
      w: 20, h: 20,
      cx: minX + 10, cy: cy
    });
  }
  return comps;
}

const comps = generateMockComponents(100000);
runTest(comps, 1);

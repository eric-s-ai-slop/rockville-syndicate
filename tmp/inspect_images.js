import fs from 'fs';
import path from 'path';
import { Jimp } from 'jimp';

const assetsDir = path.join(process.cwd(), 'src/assets/chapters/SUMMER2026_FIRSTPOOLPARTY');

async function inspect() {
  const files = fs.readdirSync(assetsDir).filter(f => f.endsWith('.jpg'));
  for (const file of files) {
    const filePath = path.join(assetsDir, file);
    try {
      const image = await Jimp.read(filePath);
      const w = image.bitmap.width;
      const h = image.bitmap.height;
      const data = image.bitmap.data;
      
      const getPixel = (x, y) => {
        const idx = (y * w + x) * 4;
        return {
          r: data[idx],
          g: data[idx+1],
          b: data[idx+2],
          a: data[idx+3]
        };
      };
      
      const c10_10 = getPixel(10, 10);
      const c0_0 = getPixel(0, 0);
      const c5_5 = getPixel(5, 5);
      
      console.log(`File: ${file}`);
      console.log(`  Size: ${w}x${h}`);
      console.log(`  Color at (10,10): r=${c10_10.r}, g=${c10_10.g}, b=${c10_10.b}, a=${c10_10.a}`);
      console.log(`  Color at (0,0):   r=${c0_0.r}, g=${c0_0.g}, b=${c0_0.b}, a=${c0_0.a}`);
      console.log(`  Color at (5,5):   r=${c5_5.r}, g=${c5_5.g}, b=${c5_5.b}, a=${c5_5.a}`);
    } catch (err) {
      console.error(`Error loading ${file}:`, err);
    }
  }
}

inspect();

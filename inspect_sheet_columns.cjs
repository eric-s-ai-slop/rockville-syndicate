const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

function inspectColumns(imagePath, name) {
  console.log(`\n=== Inspecting Columns of ${name} ===`);
  const imgData = fs.readFileSync(imagePath);
  const img = new (require('canvas').Image)();
  img.src = imgData;
  
  const width = img.width;
  const height = img.height;
  const tempCanvas = createCanvas(width, height);
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(img, 0, 0);

  const imgRawData = tempCtx.getImageData(0, 0, width, height);
  const pixels = imgRawData.data;

  // Let's divide into 16 columns
  const colWidth = width / 16;
  console.log(`Each column is ${colWidth}px wide`);

  for (let c = 0; c < 16; c++) {
    const startX = Math.round(c * colWidth);
    const endX = Math.round((c + 1) * colWidth);
    
    let greenCount = 0;
    let greyCount = 0;
    let totalCount = 0;

    for (let y = 0; y < height; y++) {
      for (let x = startX; x < endX; x++) {
        const idx = (y * width + x) * 4;
        const r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2], a = pixels[idx+3];
        if (a > 50) {
          totalCount++;
          // Green definition
          if (g > r + 30 && g > b + 30) {
            greenCount++;
          }
          // Grey definition
          if (Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && Math.abs(r - b) < 10 && r > 40 && r < 150) {
            greyCount++;
          }
        }
      }
    }
    console.log(`  Col ${c} (X: ${startX}-${endX}): Green=${greenCount} (${(greenCount/totalCount*100).toFixed(1)}%), Grey=${greyCount} (${(greyCount/totalCount*100).toFixed(1)}%)`);
  }
}

const imagesDir = path.join(__dirname, 'src', 'assets', 'images');
inspectColumns(path.join(imagesDir, 'hero_nick_f_1781236122782.jpg'), 'hero_nick_f');
inspectColumns(path.join(imagesDir, 'hero_nick_h_1781236135006.jpg'), 'hero_nick_h');

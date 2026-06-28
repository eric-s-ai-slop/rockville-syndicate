const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

function findGreenInImage(imagePath, name) {
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

  let greenCount = 0;
  let totalPixels = width * height;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];

    // Check if pixel is green
    if (g > r + 30 && g > b + 30 && a > 50) {
      greenCount++;
    }
  }

  console.log(`${name}: ${greenCount} green pixels out of ${totalPixels} (${(greenCount/totalPixels * 100).toFixed(2)}%)`);
}

const imagesDir = path.join(__dirname, 'src', 'assets', 'images');
findGreenInImage(path.join(imagesDir, 'hero_nick_f_1781236122782.jpg'), 'hero_nick_f');
findGreenInImage(path.join(imagesDir, 'hero_nick_h_1781236135006.jpg'), 'hero_nick_h');
findGreenInImage(path.join(imagesDir, 'hero_eric_1781236098529.jpg'), 'hero_eric');
findGreenInImage(path.join(imagesDir, 'hero_jacob_1781236113357.jpg'), 'hero_jacob');

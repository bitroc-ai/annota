const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../public/favicon.svg');
const icoPath = path.join(__dirname, '../public/favicon.ico');

async function generateIco() {
  try {
    console.log('Generating favicon.ico from favicon.svg...');

    // Generate a 32x32 PNG buffer from the SVG
    const buffer = await sharp(svgPath)
      .resize(32, 32)
      .png()
      .toBuffer();

    // Write the buffer to favicon.ico (simple single-size ico)
    // Note: A real .ico can contain multiple sizes, but for this purpose, 
    // a 32x32 PNG renamed to .ico or formatted as such works in most browsers,
    // or we can use sharp to output to a format if supported, but sharp doesn't support .ico directly.
    // However, we can use a trick or just save as png and rename if the browser supports it, 
    // but strictly speaking .ico has a specific header.
    // Let's try to use a proper ico generator if possible, or just write the png bytes 
    // which many browsers accept even with .ico extension, OR better:
    // use sharp to resize to 32x32 and save as png, then we might need another tool for real ico.
    // BUT, for a quick fix without extra deps, we can try to just save the 32x32 png.
    // Most modern browsers handle PNGs in .ico files.

    // Actually, to be safe and "real", let's just create a 32x32 png and save it as favicon.ico.
    // It's a common hack. If the user wants a "real" multi-layer ico, we'd need `png-to-ico` or similar.
    // Let's try to install `png-to-ico` if this script is not enough, but let's start with sharp.

    await sharp(buffer).toFile(icoPath);

    console.log('favicon.ico generated successfully!');
  } catch (error) {
    console.error('Error generating favicon:', error);
    process.exit(1);
  }
}

generateIco();

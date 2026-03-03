/**
 * Remove o fundo branco do favicon.
 * Converte favicon.ico -> PNG, remove pixels brancos, salva favicon.png.
 * Uso: node scripts/fix-favicon-background.js
 * Requer: npm install ico-to-png
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '..', 'public');
const faviconPath = path.join(publicDir, 'favicon.ico');
const outputPath = path.join(publicDir, 'favicon.png');
const backupPath = path.join(publicDir, 'favicon-backup-before-fix.ico');

const WHITE_THRESHOLD = 245;

async function main() {
  if (!fs.existsSync(faviconPath)) {
    console.error('Arquivo não encontrado: public/favicon.ico');
    process.exit(1);
  }

  let pngBuffer;
  try {
    const icoToPng = require('ico-to-png');
    const icoBuffer = fs.readFileSync(faviconPath);
    pngBuffer = await icoToPng(icoBuffer, 32);
    console.log('Convertido favicon.ico para PNG (32x32)');
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      console.error('Instale o pacote: npm install ico-to-png --save-dev');
    } else {
      console.error('Erro ao converter ICO:', e.message);
    }
    process.exit(1);
  }

  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  console.log(`Imagem: ${width}x${height}, removendo fundo branco...`);

  let count = 0;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD) {
      data[i + 3] = 0;
      count++;
    }
  }
  console.log(`Pixels tornados transparentes: ${count}`);

  fs.copyFileSync(faviconPath, backupPath);
  console.log('Backup: public/favicon-backup-before-fix.ico');

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(outputPath);

  console.log('Favicon com fundo transparente salvo em: public/favicon.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

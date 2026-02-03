/**
 * Gera logoprincipal-menu.png: logoprincipal com fundo branco transparente
 * para uso no menu (fundo azul slate-800). Não altera logoprincipal.png (login).
 * Uso: node scripts/fix-logoprincipal-for-menu.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '..', 'public');
const srcPath = path.join(publicDir, 'logoprincipal.png');
const outPath = path.join(publicDir, 'logoprincipal-menu.png');

const WHITE_THRESHOLD = 245;

async function main() {
  if (!fs.existsSync(srcPath)) {
    console.error('Arquivo não encontrado: public/logoprincipal.png');
    process.exit(1);
  }

  console.log('Lendo public/logoprincipal.png...');
  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  console.log(`Imagem: ${width}x${height}, ${channels} canais`);

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

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(outPath);

  console.log('Salvo: public/logoprincipal-menu.png (use no menu)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Remove o fundo (branco ou claro) da logodash.png para uso no menu.
 * Pixels brancos ou quase brancos ficam transparentes.
 * Uso: node scripts/fix-logodash-background.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '..', 'public');
const logoPath = path.join(publicDir, 'logodash.png');
const backupPath = path.join(publicDir, 'logodash-backup-before-fix.png');

const WHITE_THRESHOLD = 245;

async function main() {
  if (!fs.existsSync(logoPath)) {
    console.error('Arquivo não encontrado: public/logodash.png');
    process.exit(1);
  }

  console.log('Lendo public/logodash.png...');
  const { data, info } = await sharp(logoPath)
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

  fs.copyFileSync(logoPath, backupPath);
  console.log('Backup salvo em public/logodash-backup-before-fix.png');

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(logoPath);

  console.log('Logodash atualizada: public/logodash.png (fundo removido)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

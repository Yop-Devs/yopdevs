/**
 * Remove o fundo branco do ícone do app (icone.png).
 * Pixels brancos ou quase brancos ficam transparentes.
 * Uso: node scripts/fix-icon-background.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '..', 'public');
const iconPath = path.join(publicDir, 'icone.png');
const backupPath = path.join(publicDir, 'icone-backup-before-fix.png');

// Limiar: acima disso (R,G,B) considera "branco" e torna transparente (0-255)
const WHITE_THRESHOLD = 245;

async function main() {
  if (!fs.existsSync(iconPath)) {
    console.error('Arquivo não encontrado: public/icone.png');
    process.exit(1);
  }

  console.log('Lendo public/icone.png...');
  const { data, info } = await sharp(iconPath)
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
      data[i + 3] = 0; // alpha = transparente
      count++;
    }
  }
  console.log(`Pixels tornados transparentes: ${count}`);

  fs.copyFileSync(iconPath, backupPath);
  console.log('Backup salvo em public/icone-backup-before-fix.png');

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(iconPath);

  console.log('Ícone atualizado: public/icone.png (fundo branco removido)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

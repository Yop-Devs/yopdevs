/**
 * Remove o fundo escuro (azul-acinzentado) da logo do menu (logoprincipal.png).
 * Pixels escuros abaixo do limiar ficam transparentes.
 * Uso: node scripts/fix-logo-background.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '..', 'public');
const logoPath = path.join(publicDir, 'logoprincipal.png');
const backupPath = path.join(publicDir, 'logoprincipal-backup-before-fix.png');

// Limiar: abaixo disso (média R,G,B) considera "fundo escuro" e torna transparente (0-255)
// Ajuste se necessário: 130 = cinza/azul bem escuro; aumentar = mais área transparente
const DARK_THRESHOLD = 130;

async function main() {
  if (!fs.existsSync(logoPath)) {
    console.error('Arquivo não encontrado: public/logoprincipal.png');
    process.exit(1);
  }

  console.log('Lendo public/logoprincipal.png...');
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
    const avg = (r + g + b) / 3;
    if (avg <= DARK_THRESHOLD) {
      data[i + 3] = 0;
      count++;
    }
  }
  console.log(`Pixels tornados transparentes (fundo escuro): ${count}`);

  fs.copyFileSync(logoPath, backupPath);
  console.log('Backup salvo em public/logoprincipal-backup-before-fix.png');

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(logoPath);

  console.log('Logo atualizada: public/logoprincipal.png (fundo removido)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

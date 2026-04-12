/**
 * Plify: trim + fundo transparente + texto preto → branco (mantém acento colorido).
 * Tryly: não reprocessar (ficheiro atual já vem com fundo transparente).
 * Westham: se existir westham.png, remove pixels pretos (fundo).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dir = path.join(__dirname, '..', 'public', 'projetos')

function nearWhite(r, g, b, t = 248) {
  return r >= t && g >= t && b >= t
}

function nearBlack(r, g, b, t = 28) {
  return r <= t && g <= t && b <= t
}

function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

async function removeBlackBackground(inputPath, outputPath) {
  const img = sharp(inputPath).ensureAlpha()
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  const out = Buffer.from(data)
  const w = info.width
  const h = info.height
  const ch = info.channels
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch
      const r = out[i]
      const g = out[i + 1]
      const b = out[i + 2]
      if (nearBlack(r, g, b)) {
        out[i + 3] = 0
      }
    }
  }
  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile(outputPath)
}

async function processPlify(inputPath, outputPath) {
  const trimmed = await sharp(inputPath).trim({ threshold: 25 }).png().toBuffer()
  const img = sharp(trimmed).ensureAlpha()
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  const out = Buffer.from(data)
  const w = info.width
  const h = info.height
  const ch = info.channels
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch
      const r = out[i]
      const g = out[i + 1]
      const b = out[i + 2]
      if (nearWhite(r, g, b, 245)) {
        out[i + 3] = 0
        continue
      }
      const lum = luminance(r, g, b)
      if (lum < 95 && r < 130 && g < 130 && b < 130) {
        out[i] = 255
        out[i + 1] = 255
        out[i + 2] = 255
        out[i + 3] = 255
        continue
      }
    }
  }
  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile(outputPath)
}

async function main() {
  const plifyIn = path.join(dir, 'plify.png')
  const westhamPng = path.join(dir, 'westham.png')

  if (fs.existsSync(plifyIn)) {
    await processPlify(plifyIn, path.join(dir, 'plify.png'))
    console.log('plify.png OK (trim + branco)')
  }

  if (fs.existsSync(westhamPng)) {
    await removeBlackBackground(westhamPng, westhamPng)
    console.log('westham.png OK (fundo preto → transparente)')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

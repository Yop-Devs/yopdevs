/** Geração 100% no browser — nada vai para API/log/banco. */

const LOWER = 'abcdefghijkmnopqrstuvwxyz' // sem l
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // sem I O
const DIGITS = '23456789' // sem 0 1
const SYMBOLS = '!@#$%^&*_-+=?'

const LOWER_FULL = 'abcdefghijklmnopqrstuvwxyz'
const UPPER_FULL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DIGITS_FULL = '0123456789'

export type PasswordGenOptions = {
  length: number
  lower: boolean
  upper: boolean
  digits: boolean
  symbols: boolean
  /** Remove caracteres ambíguos (0/O, 1/l/I) */
  avoidAmbiguous: boolean
}

function pickCharset(opts: PasswordGenOptions): string {
  const lower = opts.avoidAmbiguous ? LOWER : LOWER_FULL
  const upper = opts.avoidAmbiguous ? UPPER : UPPER_FULL
  const digits = opts.avoidAmbiguous ? DIGITS : DIGITS_FULL
  let set = ''
  if (opts.lower) set += lower
  if (opts.upper) set += upper
  if (opts.digits) set += digits
  if (opts.symbols) set += SYMBOLS
  return set
}

function randomIndex(max: number): number {
  if (max <= 0) throw new Error('charset vazio')
  const buf = new Uint32Array(1)
  // rejeição para evitar bias do módulo
  const limit = Math.floor(0x100000000 / max) * max
  let x = 0
  do {
    crypto.getRandomValues(buf)
    x = buf[0]!
  } while (x >= limit)
  return x % max
}

function randomChar(alphabet: string): string {
  return alphabet[randomIndex(alphabet.length)]!
}

/** Gera senha forte com crypto.getRandomValues (cliente). */
export function generateSecurePassword(opts: PasswordGenOptions): string {
  const length = Math.min(128, Math.max(8, Math.floor(opts.length) || 24))
  const charset = pickCharset(opts)
  if (!charset) throw new Error('Selecione ao menos um tipo de caractere.')

  const required: string[] = []
  if (opts.lower) required.push(randomChar(opts.avoidAmbiguous ? LOWER : LOWER_FULL))
  if (opts.upper) required.push(randomChar(opts.avoidAmbiguous ? UPPER : UPPER_FULL))
  if (opts.digits) required.push(randomChar(opts.avoidAmbiguous ? DIGITS : DIGITS_FULL))
  if (opts.symbols) required.push(randomChar(SYMBOLS))

  const out: string[] = [...required]
  while (out.length < length) {
    out.push(randomChar(charset))
  }

  // embaralha (Fisher–Yates com CSPRNG)
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1)
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }

  return out.join('')
}

export const DEFAULT_PASSWORD_OPTIONS: PasswordGenOptions = {
  length: 24,
  lower: true,
  upper: true,
  digits: true,
  symbols: true,
  avoidAmbiguous: true,
}

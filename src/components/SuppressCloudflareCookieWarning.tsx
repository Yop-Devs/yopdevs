'use client'

import { useEffect } from 'react'

/**
 * Suprime no console o aviso do cookie _cf_bm (Cloudflare Bot Management),
 * que é rejeitado por domínio inválido em alguns ambientes e não é controlado pela aplicação.
 */
export default function SuppressCloudflareCookieWarning() {
  useEffect(() => {
    const original = console.error
    console.error = (...args: unknown[]) => {
      const msg = args[0]
      if (typeof msg === 'string' && msg.includes('_cf_bm')) return
      original.apply(console, args)
    }
    return () => { console.error = original }
  }, [])
  return null
}

'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { CSP_NONCE } from '@/lib/csp'

type Props = {
  onToken: (token: string) => void
  onExpire?: () => void
  onError?: (message: string) => void
  className?: string
  theme?: 'light' | 'dark' | 'auto'
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
          'timeout-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
          appearance?: 'always' | 'execute' | 'interaction-only'
          size?: 'normal' | 'flexible' | 'compact'
        },
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || ''

let scriptLoading: Promise<void> | null = null

function readCspNonce(): string {
  if (typeof document === 'undefined') return CSP_NONCE
  const fromMeta = document.querySelector('meta[name="csp-nonce"]')?.getAttribute('content')?.trim()
  return fromMeta || CSP_NONCE
}

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile) return Promise.resolve()
  if (scriptLoading) return scriptLoading

  scriptLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-turnstile]') as HTMLScriptElement | null
    if (existing) {
      if (window.turnstile) {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener(
        'error',
        () => {
          scriptLoading = null
          reject(new Error('Turnstile script failed'))
        },
        { once: true },
      )
      return
    }
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.defer = true
    s.dataset.turnstile = '1'
    s.setAttribute('nonce', readCspNonce())
    s.onload = () => resolve()
    s.onerror = () => {
      scriptLoading = null
      reject(new Error('Turnstile script failed'))
    }
    document.head.appendChild(s)
  })
  return scriptLoading
}

/** Widget Cloudflare Turnstile — callbacks via ref para não desmontar a cada render. */
export default function TurnstileWidget({
  onToken,
  onExpire,
  onError,
  className,
  theme = 'auto',
}: Props) {
  const elRef = useRef<HTMLDivElement | null>(null)
  const widgetId = useRef<string | null>(null)
  const reactId = useId()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const onTokenRef = useRef(onToken)
  const onExpireRef = useRef(onExpire)
  const onErrorRef = useRef(onError)
  onTokenRef.current = onToken
  onExpireRef.current = onExpire
  onErrorRef.current = onError

  useEffect(() => {
    let cancelled = false

    const fail = (message: string) => {
      if (cancelled) return
      setErrorMsg(message)
      onErrorRef.current?.(message)
      onExpireRef.current?.()
    }

    async function mount() {
      if (!SITE_KEY) return
      setErrorMsg(null)

      // espera o div existir no DOM
      await new Promise<void>((r) => requestAnimationFrame(() => r()))
      if (cancelled || !elRef.current) return

      try {
        await loadTurnstileScript()
      } catch {
        fail('Não foi possível carregar o captcha. Recarregue a página.')
        return
      }
      if (cancelled || !elRef.current || !window.turnstile) {
        if (!cancelled && !window.turnstile) {
          fail('Captcha indisponível neste navegador.')
        }
        return
      }

      if (widgetId.current) {
        try {
          window.turnstile.remove(widgetId.current)
        } catch {
          // ignore
        }
        widgetId.current = null
      }

      // limpa filhos residuais antes de render
      elRef.current.innerHTML = ''

      try {
        widgetId.current = window.turnstile.render(elRef.current, {
          sitekey: SITE_KEY,
          theme,
          appearance: 'always',
          size: 'flexible',
          callback: (token) => {
            if (cancelled) return
            setErrorMsg(null)
            onTokenRef.current(token)
          },
          'expired-callback': () => {
            if (cancelled) return
            onExpireRef.current?.()
          },
          'error-callback': () => {
            fail(
              'Captcha falhou. No Cloudflare Turnstile, inclua admin.yopdevs.com.br e yopdevs.com.br nos hostnames do widget.',
            )
          },
          'timeout-callback': () => {
            fail('Captcha expirou. Clique em tentar de novo.')
          },
        })
      } catch {
        fail('Erro ao montar o captcha.')
      }
    }

    void mount()

    return () => {
      cancelled = true
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current)
        } catch {
          // ignore
        }
        widgetId.current = null
      }
    }
  }, [theme, retryKey])

  if (!SITE_KEY) return null

  return (
    <div className={className}>
      <div ref={elRef} data-turnstile-id={reactId} />
      {errorMsg ? (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-rose-300">{errorMsg}</p>
          <button
            type="button"
            onClick={() => {
              onExpireRef.current?.()
              setRetryKey((k) => k + 1)
            }}
            className="text-xs font-semibold text-violet-200 underline hover:text-white"
          >
            Tentar captcha de novo
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function isTurnstileConfigured(): boolean {
  return Boolean(SITE_KEY)
}

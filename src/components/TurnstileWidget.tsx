'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
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
          'error-callback'?: (errorCode?: string) => void
          'timeout-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
          appearance?: 'always' | 'execute' | 'interaction-only'
          size?: 'normal' | 'flexible' | 'compact'
        },
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
    onTurnstileLoad?: () => void
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
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Turnstile script failed')))
      return
    }
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.defer = true
    s.dataset.turnstile = '1'
    // CSP com nonce: obrigatório para o Turnstile propagar aos recursos filhos
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

/** Widget Cloudflare Turnstile. Não renderiza se a site key não existir. */
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
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const fail = useCallback(
    (message: string) => {
      setStatus('error')
      setErrorMsg(message)
      onError?.(message)
      onExpire?.()
    },
    [onError, onExpire],
  )

  const renderWidget = useCallback(async () => {
    if (!SITE_KEY || !elRef.current) return
    setStatus('loading')
    setErrorMsg(null)
    try {
      await loadTurnstileScript()
    } catch {
      fail('Não foi possível carregar o captcha. Recarregue a página.')
      return
    }
    if (!window.turnstile || !elRef.current) {
      fail('Captcha indisponível neste navegador.')
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
    try {
      widgetId.current = window.turnstile.render(elRef.current, {
        sitekey: SITE_KEY,
        theme,
        appearance: 'always',
        size: 'flexible',
        callback: (token) => {
          setStatus('ready')
          onToken(token)
        },
        'expired-callback': () => {
          setStatus('idle')
          onExpire?.()
        },
        'error-callback': () => {
          fail(
            'Captcha falhou. Confira no Cloudflare se o domínio admin.yopdevs.com.br está na lista do widget.',
          )
        },
        'timeout-callback': () => {
          fail('Captcha expirou. Clique em tentar de novo.')
        },
      })
      setStatus('ready')
    } catch {
      fail('Erro ao montar o captcha.')
    }
  }, [fail, onExpire, onToken, theme])

  useEffect(() => {
    void renderWidget()
    return () => {
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current)
        } catch {
          // ignore
        }
      }
    }
  }, [renderWidget, retryKey])

  if (!SITE_KEY) return null

  return (
    <div className={className}>
      <div ref={elRef} data-turnstile-id={reactId} />
      {status === 'error' && errorMsg ? (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-rose-300">{errorMsg}</p>
          <button
            type="button"
            onClick={() => {
              onExpire?.()
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

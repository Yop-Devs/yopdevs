'use client'

import { useCallback, useEffect, useId, useRef } from 'react'

type Props = {
  onToken: (token: string) => void
  onExpire?: () => void
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
          theme?: 'light' | 'dark' | 'auto'
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

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile) return Promise.resolve()
  if (scriptLoading) return scriptLoading

  scriptLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-turnstile]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Turnstile script failed')))
      return
    }
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.defer = true
    s.dataset.turnstile = '1'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Turnstile script failed'))
    document.head.appendChild(s)
  })
  return scriptLoading
}

/** Widget Cloudflare Turnstile. Não renderiza se a site key não existir. */
export default function TurnstileWidget({ onToken, onExpire, className, theme = 'auto' }: Props) {
  const elRef = useRef<HTMLDivElement | null>(null)
  const widgetId = useRef<string | null>(null)
  const reactId = useId()

  const renderWidget = useCallback(async () => {
    if (!SITE_KEY || !elRef.current) return
    await loadTurnstileScript()
    if (!window.turnstile || !elRef.current) return
    if (widgetId.current) {
      try {
        window.turnstile.remove(widgetId.current)
      } catch {
        // ignore
      }
      widgetId.current = null
    }
    widgetId.current = window.turnstile.render(elRef.current, {
      sitekey: SITE_KEY,
      theme,
      callback: (token) => onToken(token),
      'expired-callback': () => onExpire?.(),
    })
  }, [onExpire, onToken, theme])

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
  }, [renderWidget])

  if (!SITE_KEY) return null

  return <div ref={elRef} className={className} data-turnstile-id={reactId} />
}

export function isTurnstileConfigured(): boolean {
  return Boolean(SITE_KEY)
}

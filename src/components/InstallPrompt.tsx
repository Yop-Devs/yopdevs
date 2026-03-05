"use client"

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const STORAGE_KEY = 'yop-install-prompt-dismissed'
const DISMISS_DAYS = 7

function getIsMobile(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  return /iPhone|iPad|iPod|Android/i.test(ua) || (window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 900)
}

function getIsIOS(): boolean {
  if (typeof window === 'undefined') return false
  return /iPhone|iPad|iPod/i.test(window.navigator.userAgent)
}

function getIsAndroid(): boolean {
  if (typeof window === 'undefined') return false
  return /Android/i.test(window.navigator.userAgent)
}

function wasDismissedRecently(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const until = parseInt(raw, 10)
    return Date.now() < until
  } catch {
    return false
  }
}

function setDismissed(): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000))
  } catch {}
}

export default function InstallPrompt() {
  const pathname = usePathname()
  const [isClient, setIsClient] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsClient(true)
    setIsIOS(getIsIOS())
    setIsAndroid(getIsAndroid())
    setIsMobile(getIsMobile())
  }, [])

  useEffect(() => {
    if (!isClient) return
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [isClient])

  // Mostrar na home ou no dashboard, só em mobile, após 1s, e se não dispensou nos últimos 7 dias
  useEffect(() => {
    if (!isClient || !isMobile) return
    const isHome = pathname === '/'
    const isDashboard = pathname?.startsWith('/dashboard') ?? false
    if (!isHome && !isDashboard) return
    if (wasDismissedRecently()) return

    const timer = setTimeout(() => setShowBanner(true), 1000)
    return () => clearTimeout(timer)
  }, [isClient, isMobile, pathname])

  // Atalho: abrir prompt ao clicar em "Adicionar ao celular" no dashboard
  useEffect(() => {
    if (!isClient) return
    const handler = () => setShowBanner(true)
    window.addEventListener('yop-show-install-prompt', handler)
    return () => window.removeEventListener('yop-show-install-prompt', handler)
  }, [isClient])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowBanner(false)
        setDismissed()
      }
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    setDismissed()
  }

  if (!isClient || !isMobile) return null

  const showAndroidPrompt = isAndroid && deferredPrompt
  const showIOSInstructions = isIOS

  if (showAndroidPrompt && showBanner) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-[999] p-5 rounded-2xl shadow-2xl border-2 border-violet-200 bg-white text-slate-900">
        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600 mb-1">📱 App disponível</p>
        <p className="text-sm font-bold text-slate-900 mb-4">Salve o YopDevs na tela inicial e abra como app.</p>
        <div className="flex gap-3">
          <button type="button" onClick={handleDismiss} className="px-4 py-3 text-sm font-semibold text-slate-500 hover:text-slate-700 rounded-xl">Agora não</button>
          <button type="button" onClick={handleInstall} className="flex-1 py-3.5 bg-[#4c1d95] text-white rounded-xl text-sm font-bold hover:bg-violet-800 transition-colors shadow-lg">
            Salvar na tela inicial
          </button>
        </div>
      </div>
    )
  }

  if (showIOSInstructions && showBanner) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-[999] p-5 rounded-2xl shadow-2xl border-2 border-violet-200 bg-white text-slate-900">
        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600 mb-1">📱 Adicionar ao iPhone/iPad</p>
        <p className="text-sm font-bold text-slate-900 mb-3">Toque em <strong>Compartilhar</strong> (□ com seta ↑) e depois em <strong>Adicionar à Tela de Início</strong>.</p>
        <div className="flex gap-3">
          <button type="button" onClick={handleDismiss} className="px-4 py-3 text-sm font-semibold text-slate-500 hover:text-slate-700 rounded-xl">Fechar</button>
          <a
            href="https://support.apple.com/pt-br/guide/iphone/iph42ab2f3a/ios"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3.5 bg-[#4c1d95] text-white rounded-xl text-sm font-bold hover:bg-violet-800 transition-colors shadow-lg text-center"
          >
            Ver como fazer
          </a>
        </div>
      </div>
    )
  }

  return null
}

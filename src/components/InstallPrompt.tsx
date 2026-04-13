"use client"

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const SESSION_KEY = 'yop-install-prompt-dismissed'

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

function wasDismissedThisSession(): boolean {
  if (typeof sessionStorage === 'undefined') return false
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function setDismissed(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
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

  // Mostrar na home ou no dashboard, só em mobile, após 1s; se dispensou nesta sessão não mostra de novo
  useEffect(() => {
    if (!isClient || !isMobile) return
    const isHome = pathname === '/'
    const isDashboard = pathname?.startsWith('/dashboard') ?? false
    if (!isHome && !isDashboard) return
    if (wasDismissedThisSession()) return

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
      <div className="fixed bottom-4 left-4 right-4 z-[999] p-5 rounded-2xl shadow-2xl border-2 border-violet-200 bg-white text-slate-900 print:hidden">
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
      <div className="fixed bottom-4 left-4 right-4 z-[999] p-5 rounded-2xl shadow-2xl border-2 border-violet-200 bg-white text-slate-900 print:hidden">
        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600 mb-2">📱 Adicionar ao iPhone/iPad</p>
        <ol className="text-sm text-slate-700 space-y-2 mb-4 list-decimal list-inside">
          <li>Toque no ícone <strong>Compartilhar</strong> (quadrado com seta para cima) na barra inferior do Safari.</li>
          <li>Role e toque em <strong>Adicionar à Tela de Início</strong>.</li>
          <li>Toque em <strong>Adicionar</strong> no canto superior direito.</li>
        </ol>
        <button type="button" onClick={handleDismiss} className="w-full py-3.5 bg-[#4c1d95] text-white rounded-xl text-sm font-bold hover:bg-violet-800 transition-colors shadow-lg">
          Entendi
        </button>
      </div>
    )
  }

  return null
}

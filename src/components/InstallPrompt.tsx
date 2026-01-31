"use client"

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const STORAGE_KEY = 'yop-install-prompt-shown'

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

  useEffect(() => {
    if (!isClient || !isMobile || pathname !== '/') return
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(STORAGE_KEY)) return

    const timer = setTimeout(() => {
      setShowBanner(true)
    }, 2000)
    return () => clearTimeout(timer)
  }, [isClient, isMobile, pathname])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowBanner(false)
        sessionStorage.setItem(STORAGE_KEY, '1')
      }
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    sessionStorage.setItem(STORAGE_KEY, '1')
  }

  if (!isClient || !showBanner || !isMobile) return null

  const showAndroidPrompt = isAndroid && deferredPrompt
  const showIOSInstructions = isIOS

  if (showAndroidPrompt) {
    return (
      <div className="fixed bottom-6 left-4 right-4 z-[999] p-5 rounded-2xl shadow-2xl border border-violet-200 bg-white text-slate-900">
        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600 mb-1">App disponível</p>
        <p className="text-sm font-bold text-slate-900 mb-4">Adicione o YOP DEVS à tela de início para acessar mais rápido.</p>
        <div className="flex gap-3">
          <button type="button" onClick={handleDismiss} className="px-4 py-3 text-sm font-semibold text-slate-500 hover:text-slate-700">Agora não</button>
          <button type="button" onClick={handleInstall} className="flex-1 py-3 bg-[#4c1d95] text-white rounded-xl text-sm font-bold hover:bg-violet-800 transition-colors">
            Adicionar à tela de início
          </button>
        </div>
      </div>
    )
  }

  if (showIOSInstructions) {
    return (
      <div className="fixed bottom-6 left-4 right-4 z-[999] p-5 rounded-2xl shadow-2xl border border-violet-200 bg-white text-slate-900">
        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600 mb-1">Adicione ao seu iPhone/iPad</p>
        <p className="text-sm font-bold text-slate-900 mb-3">Para colocar o YOP DEVS na tela de início:</p>
        <ol className="text-xs text-slate-600 space-y-2 mb-4 list-decimal list-inside">
          <li>Toque no ícone <strong>Compartilhar</strong> (quadrado com seta para cima) na barra do navegador.</li>
          <li>Role e toque em <strong>&quot;Adicionar à Tela de Início&quot;</strong>.</li>
          <li>Toque em <strong>Adicionar</strong> no canto superior direito.</li>
        </ol>
        <button type="button" onClick={handleDismiss} className="w-full py-3 bg-[#4c1d95] text-white rounded-xl text-sm font-bold hover:bg-violet-800 transition-colors">
          Entendi
        </button>
      </div>
    )
  }

  return null
}

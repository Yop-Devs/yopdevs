"use client"
import { useEffect, useState } from 'react'

export default function InstallPrompt() {
  const [isClient, setIsClient] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    setIsClient(true) // Garante que o código rode apenas no navegador
    
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShowBanner(false)
  }

  // Se não estiver no cliente ou não houver prompt, não renderiza nada
  if (!isClient || !showBanner) return null

  return (
    <div className="fixed bottom-24 left-6 right-6 bg-slate-900 text-white p-6 rounded-3xl shadow-2xl flex flex-col gap-4 z-[999] border border-slate-700">
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">App Disponível</p>
        <p className="text-sm font-bold">Instalar YOP DEVS na tela de início?</p>
      </div>
      <div className="flex gap-3">
        <button onClick={() => setShowBanner(false)} className="px-4 py-3 text-[10px] font-black uppercase text-slate-400">Agora não</button>
        <button onClick={handleInstall} className="flex-1 py-3 bg-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest">Instalar</button>
      </div>
    </div>
  )
}
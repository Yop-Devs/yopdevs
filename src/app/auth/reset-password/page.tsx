'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      setMessage({ type: 'error', text: `FALHA NO PROTOCOLO: ${error.message.toUpperCase()}` })
    } else {
      setMessage({ type: 'success', text: 'CHAVE ATUALIZADA. REDIRECIONANDO PARA O TERMINAL...' })
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="mb-10 text-center">
        <h1 className="leading-none"><Logo variant="dark" size="lg" /></h1>
        <p className="text-slate-500 font-semibold text-xs uppercase tracking-wider mt-3">
          Redefinição de senha
        </p>
      </div>

      <div className="w-full max-w-[400px]">
        <form 
          onSubmit={handleReset} 
          className="bg-white border border-slate-200 p-8 rounded-2xl shadow-lg space-y-5"
        >
          {/* Mensagem de Feedback Integrada */}
          {message && (
            <div className={`p-4 border-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
              message.type === 'success' 
              ? 'bg-green-50 border-green-500 text-green-600' 
              : 'bg-red-50 border-red-500 text-red-600'
            }`}>
              {message.text}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">
              Nova Senha de Acesso
            </label>
            <input 
              required
              type="password"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#4c1d95] transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-[9px] text-slate-400 italic font-medium">Mínimo de 6 caracteres alfanuméricos.</p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-[#4c1d95] text-white rounded-xl text-sm font-bold hover:bg-violet-800 transition-all active:scale-[0.98] shadow-lg"
          >
            {loading ? 'PROCESSANDO_DADOS...' : 'ATUALIZAR CHAVE'}
          </button>
        </form>
      </div>

      <footer className="fixed bottom-6 text-xs text-slate-400">
        © 2026 YOP Devs
      </footer>
    </div>
  )
}
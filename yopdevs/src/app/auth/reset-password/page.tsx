'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
    <div className="min-h-screen bg-[#fcfcfd] flex flex-col items-center justify-center p-6">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-black italic tracking-tighter text-slate-900 uppercase leading-none">
          Yop Devs
        </h1>
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mt-4">
          Redefinição de Credenciais
        </p>
      </div>

      <div className="w-full max-w-[400px]">
        <form 
          onSubmit={handleReset} 
          className="bg-white border-2 border-slate-900 p-10 rounded-2xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] space-y-6"
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
              className="w-full p-4 bg-white border-2 border-slate-900 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-[9px] text-slate-400 italic font-medium">Mínimo de 6 caracteres alfanuméricos.</p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-indigo-600 transition-all active:scale-95 shadow-lg"
          >
            {loading ? 'PROCESSANDO_DADOS...' : 'ATUALIZAR CHAVE'}
          </button>
        </form>
      </div>

      <footer className="fixed bottom-8 text-[9px] font-bold text-slate-300 uppercase tracking-[0.5em]">
        © 2026 YOP_DEVS_CORE_SYSTEM
      </footer>
    </div>
  )
}
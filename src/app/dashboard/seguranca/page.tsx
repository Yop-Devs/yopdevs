// src/app/dashboard/seguranca/page.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SecurityPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setStatus({ type: 'error', text: error.message })
      setTimeout(() => setStatus(null), 5000)
    } else {
      setStatus({ type: 'success', text: 'Senha atualizada com sucesso. Sua sessão continua ativa.' })
      setPassword('')
      setTimeout(() => setStatus(null), 4000)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto px-4 sm:px-0">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-gray-900">Segurança</h1>
      {status && (
        <div className={`mb-6 rounded-xl border-2 px-4 py-3 text-sm font-bold ${status.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {status.text}
        </div>
      )}
      <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100">
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nova Senha</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all"
          >
            {loading ? 'Atualizando...' : 'ATUALIZAR SENHA'}
          </button>
        </form>
      </div>
    </div>
  )
}
// src/app/dashboard/seguranca/page.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function SecurityPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase.auth.updateUser({ password })

    if (error) alert(error.message)
    else {
      alert("Senha atualizada com sucesso!")
      setPassword('')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Segurança</h1>
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
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
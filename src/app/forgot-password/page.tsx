// src/app/forgot-password/page.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const [error, setError] = useState('')

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (err) {
      setError(err.message)
    } else {
      setMessage('Verifique seu e-mail para redefinir a senha.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-4">Recuperar Senha</h2>
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm font-medium border border-red-200">
            {error}
          </div>
        )}
        {message ? (
          <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 text-green-700 text-sm font-medium border border-green-200">{message}</div>
        ) : null}
        {!message ? (
          <form onSubmit={handleReset} className="space-y-4">
            <p className="text-gray-500 text-sm">Insira seu e-mail para receber um link de redefinição.</p>
            <input
              type="email"
              required
              placeholder="Seu e-mail"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md font-bold hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'ENVIAR LINK'}
            </button>
          </form>
        ) : null}
        <div className="mt-4 text-center">
          <Link href="/" className="text-indigo-600 text-sm hover:underline">Voltar para o login</Link>
        </div>
      </div>
    </div>
  )
}
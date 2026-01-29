"use client"
import { useState } from 'react'
import Link from 'next/link'

export default function SupportPage() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'success'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    
    await fetch('/api/send', {
      method: 'POST',
      body: JSON.stringify(formData),
    })

    setStatus('success')
    setFormData({ name: '', email: '', message: '' })
    setTimeout(() => setStatus('idle'), 5000)
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#0a0a0a] border border-white/10 rounded-[40px] p-10 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black italic uppercase tracking-tighter">Suporte Técnico</h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Protocolo de Atendimento</p>
        </div>

        {status === 'success' ? (
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-2xl text-center animate-in zoom-in">
            <p className="text-indigo-400 text-sm font-bold uppercase italic">Mensagem Enviada com Sucesso!</p>
            <p className="text-slate-500 text-[10px] mt-2 font-mono">Responderemos em até 24 horas.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Seu Nome"
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-indigo-500 text-sm"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Seu E-mail"
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-indigo-500 text-sm"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <textarea
              placeholder="Descreva o problema ou sugestão"
              rows={4}
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-indigo-500 text-sm resize-none"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
            ></textarea>
            
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-600 hover:text-white transition-all"
            >
              {status === 'sending' ? "PROCESSANDO..." : "ENVIAR CHAMADO"}
            </button>
          </form>
        )}
        
        <Link href="/" className="block text-center mt-6 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-white transition-colors">
          Voltar ao Início
        </Link>
      </div>
    </div>
  )
}
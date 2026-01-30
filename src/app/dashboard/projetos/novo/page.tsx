'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NewProjectPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'SaaS',
    tech_stack: '',
    equity_offered: 0
  })

  const LIMITE_PROJETOS_POR_DIA = 3

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setStatus(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const inicioDoDia = hoje.toISOString()

    const { count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .gte('created_at', inicioDoDia)

    if ((count ?? 0) >= LIMITE_PROJETOS_POR_DIA) {
      setStatus({ type: 'error', text: `LIMITE DIÁRIO ATINGIDO: VOCÊ JÁ CRIOU ${LIMITE_PROJETOS_POR_DIA} PROJETOS HOJE. TENTE AMANHÃ.` })
      setSaving(false)
      return
    }

    const { error } = await supabase.from('projects').insert([
      { ...formData, owner_id: user.id }
    ])

    if (error) {
      setStatus({ type: 'error', text: `FALHA NO LANÇAMENTO: ${error.message.toUpperCase()}` })
      setSaving(false)
    } else {
      setStatus({ type: 'success', text: 'VENTURE LANÇADA COM SUCESSO. REDIRECIONANDO...' })
      setTimeout(() => router.push('/dashboard/projetos'), 2000)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <header className="mb-10">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">Lançar Nova Venture</h1>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Estruture sua oferta de equity para o mercado</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white p-10 border border-slate-200 rounded-2xl space-y-8 shadow-lg">
        {status && (
          <div className={`p-4 border-2 rounded-xl text-[9px] font-black uppercase tracking-widest animate-pulse ${
            status.type === 'success' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700'
          }`}>
            {status.text}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Título do Projeto / Empresa</label>
          <input required placeholder="Ex: FinCore - Gateway de Pagamentos" className="w-full p-4 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#4c1d95] transition-all" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Setor</label>
            <select className="w-full p-4 border border-slate-200 rounded-xl text-sm font-bold outline-none appearance-none bg-white" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
              <option value="SaaS">SaaS</option>
              <option value="Fintech">Fintech</option>
              <option value="AI/ML">AI / Machine Learning</option>
              <option value="Web3">Web3 / Crypto</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Equity Oferecido (%)</label>
            <input required type="number" step="0.1" placeholder="Ex: 15.0" className="w-full p-4 border border-slate-200 rounded-xl text-sm font-bold outline-none" value={formData.equity_offered} onChange={e => setFormData({...formData, equity_offered: parseFloat(e.target.value)})} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Tech Stack Requerida (Separada por vírgula)</label>
          <input required placeholder="React, Node.js, PostgreSQL, AWS" className="w-full p-4 border border-slate-200 rounded-xl text-sm font-bold outline-none" value={formData.tech_stack} onChange={e => setFormData({...formData, tech_stack: e.target.value})} />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Tese de Negócio e Desafios</label>
          <textarea required rows={5} placeholder="Descreva o ROI esperado e o que você busca em um sócio técnico..." className="w-full p-4 border border-slate-200 rounded-xl text-sm font-medium outline-none resize-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
        </div>

        <button type="submit" disabled={saving} className="w-full py-5 bg-[#4c1d95] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-violet-800 transition-all shadow-xl active:scale-95">
          {saving ? 'TRANSMITINDO_DADOS...' : 'EXECUTAR LANÇAMENTO DE VENTURE'}
        </button>
      </form>
    </div>
  )
}
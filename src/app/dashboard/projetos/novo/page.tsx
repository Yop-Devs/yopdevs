'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const PROJECT_TYPES = [
  { value: 'VAGA_EMPREGO', label: 'Vaga de emprego' },
  { value: 'NOVO_PROJETO', label: 'Novo projeto / Startup' },
] as const

export default function NewProjectPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectType: 'NOVO_PROJETO' as (typeof PROJECT_TYPES)[number]['value'],
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
      {
        owner_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.projectType,
        tech_stack: '',
        equity_offered: 0,
      },
    ])

    if (error) {
      setStatus({ type: 'error', text: `FALHA NO LANÇAMENTO: ${error.message.toUpperCase()}` })
      setSaving(false)
    } else {
      setStatus({ type: 'success', text: 'PROJETO LANÇADO COM SUCESSO. REDIRECIONANDO...' })
      setTimeout(() => router.push('/dashboard/projetos'), 2000)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <header className="mb-10">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">Lançar Projeto</h1>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Título, descrição e tipo de oportunidade</p>
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
          <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Tipo</label>
          <select
            required
            className="w-full p-4 border border-slate-200 rounded-xl text-sm font-bold outline-none appearance-none bg-white focus:border-[#4c1d95] transition-all"
            value={formData.projectType}
            onChange={(e) => setFormData({ ...formData, projectType: e.target.value as typeof formData.projectType })}
          >
            {PROJECT_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Título</label>
          <input
            required
            placeholder="Ex: Desenvolvedor Full Stack | Ex: FinCore - Gateway de Pagamentos"
            className="w-full p-4 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#4c1d95] transition-all"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">O que se trata</label>
          <textarea
            required
            rows={5}
            placeholder="Descreva a vaga ou o projeto: responsabilidades, stack, etapa da startup, o que você busca..."
            className="w-full p-4 border border-slate-200 rounded-xl text-sm font-medium outline-none resize-none focus:border-[#4c1d95] transition-all"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <button type="submit" disabled={saving} className="w-full py-5 bg-[#4c1d95] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-violet-800 transition-all shadow-xl active:scale-95 disabled:opacity-60">
          {saving ? 'Enviando...' : 'Lançar'}
        </button>
      </form>
    </div>
  )
}

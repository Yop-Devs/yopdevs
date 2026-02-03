'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function EquityPortfolioPage() {
  const [investments, setInvestments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function loadPortfolio() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Aqui buscaríamos de uma tabela 'project_partners' (precisa criar no SQL)
      const { data } = await supabase
        .from('project_partners')
        .select('*, projects(title, category)')
        .eq('user_id', user.id)
      setInvestments(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { loadPortfolio() }, [])

  if (loading) return <div className="p-20 text-center font-mono text-[10px] text-slate-400 uppercase tracking-widest">Carregando carteira...</div>

  return (
    <div className="max-w-[1200px] mx-auto py-6 sm:py-12 px-4 sm:px-6 space-y-6 sm:space-y-12">
      <header className="border-b-2 border-slate-200 pb-6 sm:pb-8">
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter text-slate-800">Carteira de Equity</h1>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-1 sm:mt-2">Ativos e participações societárias rastreadas na rede YOP</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
        {investments.map((item) => (
          <div key={item.id} className="bg-white border-2 border-slate-200 p-5 sm:p-8 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-lg hover:border-violet-200 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black px-2 py-1 bg-[#4c1d95] text-white rounded uppercase tracking-tighter">
                  {item.projects?.category}
                </span>
                <span className="text-2xl font-black text-slate-800">{item.equity_share}%</span>
              </div>
              <h3 className="text-xl font-black uppercase italic text-slate-800 leading-tight">
                {item.projects?.title}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status: <span className="text-green-600">{item.status || 'Em operação'}</span></p>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1 font-mono">ID do ativo</p>
              <p className="text-[9px] font-mono text-slate-400 truncate">{item.id}</p>
            </div>
          </div>
        ))}

        {/* Card de Adição (Estético para o Dev ver como fica) */}
        <div className="border-2 border-dashed border-slate-200 p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 opacity-50">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-2xl">+</div>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Novo Ativo será listado após assinatura de contrato</p>
        </div>
      </div>
    </div>
  )
}
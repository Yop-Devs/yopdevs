"use client"
import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 font-sans p-6 md:p-20">
      <div className="max-w-3xl mx-auto space-y-12">
        <Link href="/" className="inline-flex items-center gap-2 text-indigo-400 font-black uppercase text-[10px] tracking-[0.3em] hover:text-white transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
          Voltar ao Terminal
        </Link>
        
        <header>
          <h1 className="text-4xl md:text-6xl font-black italic text-white uppercase tracking-tighter mb-4">Termos de Uso</h1>
          <p className="text-xs font-mono uppercase tracking-widest text-slate-500">Última atualização: Janeiro de 2026</p>
        </header>

        <section className="space-y-6 text-sm leading-relaxed border-t border-white/5 pt-10">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white uppercase italic">1. O Ecossistema</h2>
            <p>O YOP DEVS é uma rede exclusiva para conexão entre desenvolvedores e empresários. Ao acessar, você concorda em manter o profissionalismo e a integridade das informações compartilhadas.</p>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white uppercase italic">2. Propriedade Intelectual</h2>
            <p>Todas as teses de negócios e códigos compartilhados no fórum permanecem sob propriedade de seus respectivos autores, a menos que um contrato de sociedade (Equity) seja firmado entre as partes.</p>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white uppercase italic">3. Conduta</h2>
            <p>É estritamente proibido o uso de bots, scripts de automação não autorizados ou qualquer comportamento que comprometa a segurança do Protocolo YOP.</p>
          </div>
        </section>

        <footer className="pt-20 text-[10px] font-bold text-slate-700 uppercase tracking-widest">
          &copy; 2026 Gabriel Carrara. YOP DEVS Protocol.
        </footer>
      </div>
    </div>
  )
}
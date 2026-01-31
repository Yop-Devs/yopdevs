"use client"
import Image from 'next/image'
import Link from 'next/link'
export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <Link href="/" className="flex items-center">
            <Image src="/homeimage.png" alt="YOP DEVS" width={220} height={70} className="h-12 w-auto object-contain" unoptimized />
          </Link>
          <nav className="flex gap-4 text-sm font-semibold">
            <Link href="/termos" className="text-[#4c1d95]">Termos de Uso</Link>
            <Link href="/privacidade" className="text-slate-600 hover:text-[#4c1d95]">Privacidade</Link>
            <Link href="/suporte" className="text-slate-600 hover:text-[#4c1d95]">Suporte</Link>
          </nav>
        </header>

        <h1 className="text-3xl md:text-4xl font-black text-slate-900">Termos de Uso</h1>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Última atualização: Janeiro de 2026</p>

        <section className="space-y-6 text-sm leading-relaxed border-t border-slate-200 pt-8">
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">1. O Ecossistema</h2>
            <p className="text-slate-600">O YOP Devs é uma rede exclusiva para conexão entre desenvolvedores e empresários. Ao acessar, você concorda em manter o profissionalismo e a integridade das informações compartilhadas.</p>
          </div>
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">2. Propriedade Intelectual</h2>
            <p className="text-slate-600">Todas as teses de negócios e códigos compartilhados no fórum permanecem sob propriedade de seus respectivos autores, a menos que um contrato de sociedade (Equity) seja firmado entre as partes.</p>
          </div>
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">3. Conduta</h2>
            <p className="text-slate-600">É estritamente proibido o uso de bots, scripts de automação não autorizados ou qualquer comportamento que comprometa a segurança do Protocolo YOP Devs.</p>
          </div>
        </section>

        <footer className="pt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 text-xs text-slate-500">
          <span>© 2026 YOP Devs. Todos os direitos reservados.</span>
          <nav className="flex gap-4 font-semibold">
            <Link href="/termos" className="text-[#4c1d95]">Termos</Link>
            <Link href="/privacidade" className="hover:text-[#4c1d95]">Privacidade</Link>
            <Link href="/suporte" className="hover:text-[#4c1d95]">Suporte</Link>
          </nav>
        </footer>
      </div>
    </div>
  )
}

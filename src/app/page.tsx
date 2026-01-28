'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function EntryPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'signin' | 'signup' | 'forgot'>('signin')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (view === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      })
      if (error) setMessage({ type: 'error', text: `ERRO NO CADASTRO: ${error.message.toUpperCase()}` })
      else setMessage({ type: 'success', text: 'PROTOCOLO ENVIADO! VERIFIQUE SEU E-MAIL PARA ATIVAR.' })
    } else if (view === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage({ type: 'error', text: `ACESSO NEGADO: ${error.message.toUpperCase()}` })
      else router.push('/dashboard')
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) setMessage({ type: 'error', text: `FALHA NO ENVIO: ${error.message.toUpperCase()}` })
      else setMessage({ type: 'success', text: 'LINK DE RECUPERAÇÃO ENVIADO PARA SEU E-MAIL.' })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#fcfcfd] flex flex-col lg:flex-row font-sans text-slate-900">
      
      {/* LADO ESQUERDO: PROPÓSITO */}
      <div className="lg:w-1/2 flex flex-col justify-center p-12 lg:p-24 space-y-8 bg-white border-r-2 border-slate-900">
        <div className="space-y-4">
          <h1 className="text-6xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
            YOP DEVS
          </h1>
          <div className="h-2 w-24 bg-indigo-600"></div>
        </div>
        
        <h2 className="text-4xl font-extrabold tracking-tight leading-[1.1]">
          Onde o <span className="text-indigo-600 italic">Código Elite</span> encontra o <span className="underline decoration-4">Capital Estratégico</span>.
        </h2>
        
        <p className="text-xl text-slate-500 font-medium max-w-lg leading-relaxed">
          Nascemos para eliminar a barreira entre grandes teses de negócios e a execução técnica impecável.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
          <div className="p-6 border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2">Para DEVS</p>
            <p className="text-sm font-bold">Acesse projetos validados e torne-se sócio através de Equity.</p>
          </div>
          <div className="p-6 border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2">Para Empresários</p>
            <p className="text-sm font-bold">Encontre o CTO ou time técnico capaz de escalar seu ROI.</p>
          </div>
        </div>
      </div>

      {/* LADO DIREITO: ACESSO COM FEEDBACK INTEGRADO */}
      <div className="lg:w-1/2 flex flex-col items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-[420px] space-y-8">
          
          <div className="text-center space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Protocolo de Segurança</p>
            <h3 className="text-2xl font-black uppercase italic">
              {view === 'signin' ? 'Iniciar Sessão' : view === 'signup' ? 'Criar Acesso' : 'Recuperar Chave'}
            </h3>
          </div>

          <div className="relative">
            {/* O CARD DE FORMULÁRIO */}
            <form 
              onSubmit={handleAuth} 
              className="bg-white border-2 border-slate-900 p-8 lg:p-10 rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] space-y-6"
            >
              {/* MENSAGEM DE STATUS (SUBSTITUI O ALERT) */}
              {message && (
                <div className={`p-4 border-2 rounded-xl text-[10px] font-black uppercase tracking-widest animate-in fade-in zoom-in duration-300 ${
                  message.type === 'success' 
                  ? 'bg-green-50 border-green-500 text-green-700' 
                  : 'bg-red-50 border-red-500 text-red-700'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    {message.text}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {view === 'signup' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Nome Completo</label>
                    <input required type="text" className="w-full p-4 bg-white border-2 border-slate-900 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="SEU NOME" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                )}
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">E-mail Institucional</label>
                  <input required type="email" className="w-full p-4 bg-white border-2 border-slate-900 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="NOME@EMPRESA.COM" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                {view !== 'forgot' && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest ml-1">
                      <label>Senha de Acesso</label>
                      {view === 'signin' && (
                        <button type="button" onClick={() => {setView('forgot'); setMessage(null)}} className="text-slate-400 hover:text-indigo-600 transition-colors">Esqueci a senha</button>
                      )}
                    </div>
                    <input required type="password" className="w-full p-4 bg-white border-2 border-slate-900 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                )}
              </div>

              <button type="submit" disabled={loading} className="w-full py-5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all active:scale-95 shadow-lg">
                {loading ? 'PROCESSANDO...' : view === 'signin' ? 'AUTENTICAR SESSÃO' : view === 'signup' ? 'EFETIVAR CADASTRO' : 'ENVIAR LINK'}
              </button>
            </form>
          </div>

          <div className="flex flex-col gap-3 items-center">
            {view !== 'signin' && (
              <button onClick={() => {setView('signin'); setMessage(null)}} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">
                Voltar para o Login
              </button>
            )}
            {view === 'signin' && (
              <button onClick={() => {setView('signup'); setMessage(null)}} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">
                Não possui credenciais? <span className="text-indigo-600">Cadastre-se</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      <footer className="fixed bottom-6 right-6 text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em] pointer-events-none">
        © 2026 YOP_DEVS_INFRASTRUCTURE
      </footer>
    </div>
  )
}
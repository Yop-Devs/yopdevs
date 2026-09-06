'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  DEFAULT_PASSWORD_OPTIONS,
  generateSecurePassword,
  type PasswordGenOptions,
} from '@/lib/password-generator'

const AUTO_CLEAR_MS = 45_000

export default function AdminSenhasPage() {
  const [opts, setOpts] = useState<PasswordGenOptions>(DEFAULT_PASSWORD_OPTIONS)
  const [password, setPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const passwordRef = useRef<string | null>(null)

  const wipe = useCallback(() => {
    passwordRef.current = null
    setPassword(null)
    setCopied(false)
    setSecondsLeft(null)
    if (clearTimer.current) {
      clearTimeout(clearTimer.current)
      clearTimer.current = null
    }
    if (tickTimer.current) {
      clearInterval(tickTimer.current)
      tickTimer.current = null
    }
  }, [])

  const scheduleAutoClear = useCallback(() => {
    if (clearTimer.current) clearTimeout(clearTimer.current)
    if (tickTimer.current) clearInterval(tickTimer.current)
    const ends = Date.now() + AUTO_CLEAR_MS
    setSecondsLeft(Math.ceil(AUTO_CLEAR_MS / 1000))
    tickTimer.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((ends - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left <= 0 && tickTimer.current) {
        clearInterval(tickTimer.current)
        tickTimer.current = null
      }
    }, 250)
    clearTimer.current = setTimeout(() => {
      wipe()
      toast.message('Senha apagada da tela.')
    }, AUTO_CLEAR_MS)
  }, [wipe])

  useEffect(() => () => wipe(), [wipe])

  function onGenerate() {
    try {
      const next = generateSecurePassword(opts)
      passwordRef.current = next
      setPassword(next)
      setCopied(false)
      scheduleAutoClear()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao gerar.')
    }
  }

  async function onCopyAndClear() {
    const value = passwordRef.current
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success('Copiada — sumindo da tela…')
      // limpa da UI logo após copiar (clipboard fica com o usuário)
      window.setTimeout(() => wipe(), 600)
    } catch {
      toast.error('Não foi possível copiar. Selecione e copie manualmente, depois apague.')
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Gerador de senhas</h2>
        <p className="mt-1 text-sm text-slate-500">
          Gera só neste momento, no seu navegador. Nada é salvo no servidor, banco ou log. Depois de
          copiar, some da tela.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Tamanho</span>
            <span className="tabular-nums text-slate-800">{opts.length}</span>
          </div>
          <input
            type="range"
            min={12}
            max={64}
            value={opts.length}
            onChange={(e) => setOpts((o) => ({ ...o, length: Number(e.target.value) }))}
            className="w-full accent-slate-900"
          />
        </label>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(
            [
              ['lower', 'a–z'],
              ['upper', 'A–Z'],
              ['digits', '0–9'],
              ['symbols', '!@#$…'],
              ['avoidAmbiguous', 'Sem ambíguos'],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={opts[key]}
                onChange={(e) => setOpts((o) => ({ ...o, [key]: e.target.checked }))}
                className="rounded border-slate-300"
              />
              {label}
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={onGenerate}
          className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-slate-800"
        >
          Gerar senha segura
        </button>

        {password ? (
          <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="break-all font-mono text-base font-semibold tracking-wide text-slate-900 select-all">
              {password}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onCopyAndClear()}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-emerald-800"
              >
                {copied ? 'Copiada!' : 'Copiar e apagar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  wipe()
                  toast.message('Senha apagada.')
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
              >
                Apagar agora
              </button>
            </div>
            {secondsLeft != null ? (
              <p className="text-[11px] text-slate-500">
                Some automaticamente em {secondsLeft}s se você não apagar.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-center text-xs text-slate-400">Nenhuma senha na tela.</p>
        )}
      </div>

      <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
        <li>Use para Gmail, Vercel, Cloudflare, etc. — depois anote no bloco de acessos do sistema, se quiser.</li>
        <li>Não cole a senha em chats ou prints.</li>
        <li>Geração local com <code className="rounded bg-slate-100 px-1">crypto.getRandomValues</code>.</li>
      </ul>
    </div>
  )
}

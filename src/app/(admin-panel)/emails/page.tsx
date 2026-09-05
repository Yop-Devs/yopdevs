'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

type Thread = {
  id: string
  subject: string
  participants: string[]
  last_message_at: string
  unread_count: number
}

type Attachment = {
  filename?: string | null
  content_type?: string | null
  download_url?: string | null
  size?: number | null
}

type Message = {
  id: string
  direction: 'inbound' | 'outbound'
  from_email: string
  from_name: string | null
  to_emails: string[]
  subject: string
  text_body: string | null
  html_body: string | null
  attachments: Attachment[]
  created_at: string
}

async function authHeaders(json = true): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sessão expirada.')
  return json
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { Authorization: `Bearer ${token}` }
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function AdminEmailsPage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [reply, setReply] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [sending, setSending] = useState(false)

  const loadThreads = useCallback(async (opts?: { sync?: boolean }) => {
    setLoading(true)
    try {
      const headers = await authHeaders()
      if (opts?.sync) {
        const syncRes = await fetch('/api/admin/mailbox', {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'sync' }),
        })
        const syncJson = (await syncRes.json()) as {
          imported?: number
          skipped?: number
          error?: string
          errors?: string[]
        }
        if (!syncRes.ok) throw new Error(syncJson.error || 'Falha ao sincronizar com Resend.')
        if ((syncJson.imported ?? 0) > 0) {
          toast.success(`${syncJson.imported} e-mail(s) importado(s) do Resend.`)
        } else if (syncJson.errors?.length) {
          toast.message(syncJson.errors[0])
        } else {
          toast.message('Nenhum e-mail novo no Resend.')
        }
      }

      const res = await fetch('/api/admin/mailbox', { headers })
      const json = (await res.json()) as { threads?: Thread[]; error?: string }
      if (!res.ok) throw new Error(json.error || 'Falha ao carregar inbox.')
      setThreads(json.threads ?? [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao carregar inbox.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadThreads({ sync: true })
  }, [loadThreads])

  const openThread = useCallback(async (threadId: string) => {
    setSelectedId(threadId)
    setLoadingThread(true)
    setReply('')
    setFiles(null)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/admin/mailbox?threadId=${encodeURIComponent(threadId)}`, {
        headers,
      })
      const json = (await res.json()) as { messages?: Message[]; error?: string }
      if (!res.ok) throw new Error(json.error || 'Falha ao abrir conversa.')
      setMessages(json.messages ?? [])
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, unread_count: 0 } : t)),
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao abrir conversa.')
    } finally {
      setLoadingThread(false)
    }
  }, [])

  async function onReply(e: FormEvent) {
    e.preventDefault()
    if (!selectedId || !reply.trim()) return
    setSending(true)
    try {
      const headers = await authHeaders(false)
      const form = new FormData()
      form.set('text', reply.trim())
      if (files) {
        Array.from(files).slice(0, 5).forEach((f) => form.append('attachments', f))
      }
      const res = await fetch(`/api/admin/mailbox/${selectedId}/reply`, {
        method: 'POST',
        headers,
        body: form,
      })
      const json = (await res.json()) as { message?: Message; error?: string }
      if (!res.ok) throw new Error(json.error || 'Falha ao enviar.')
      if (json.message) setMessages((prev) => [...prev, json.message!])
      setReply('')
      setFiles(null)
      toast.success('Resposta enviada.')
      void loadThreads()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao enviar.')
    } finally {
      setSending(false)
    }
  }

  const selected = threads.find((t) => t.id === selectedId) ?? null

  return (
    <div className="mx-auto flex h-[calc(100vh-5.5rem)] max-w-7xl flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Caixa de e-mail</h2>
          <p className="text-sm text-slate-500">
            Conversas em <span className="font-medium text-slate-700">gabrielcarrara@yopdevs.com.br</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadThreads({ sync: true })}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
        >
          Atualizar
        </button>
      </div>

      <div className="grid min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <aside className="min-h-0 overflow-y-auto border-b border-slate-100 lg:border-b-0 lg:border-r">
          {loading ? (
            <p className="p-4 text-sm text-slate-500">Carregando...</p>
          ) : threads.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">
              Nenhuma conversa ainda. Assim que o Receiving do Resend estiver ativo, os e-mails aparecem aqui.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {threads.map((thread) => (
                <li key={thread.id}>
                  <button
                    type="button"
                    onClick={() => void openThread(thread.id)}
                    className={`w-full px-3 py-3 text-left hover:bg-slate-50 ${
                      selectedId === thread.id ? 'bg-slate-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{thread.subject}</p>
                      {thread.unread_count > 0 ? (
                        <span className="shrink-0 rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {thread.unread_count}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      {(thread.participants ?? []).join(', ') || '—'}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">{formatWhen(thread.last_message_at)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="flex min-h-0 flex-col">
          {!selectedId ? (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
              Selecione uma conversa
            </div>
          ) : (
            <>
              <header className="border-b border-slate-100 px-4 py-3">
                <h3 className="text-sm font-bold text-slate-900">{selected?.subject ?? 'Conversa'}</h3>
                <p className="text-[11px] text-slate-500">
                  {(selected?.participants ?? []).join(', ')}
                </p>
              </header>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
                {loadingThread ? (
                  <p className="text-sm text-slate-500">Abrindo...</p>
                ) : (
                  messages.map((msg) => (
                    <article
                      key={msg.id}
                      className={`rounded-xl border px-3 py-2.5 ${
                        msg.direction === 'outbound'
                          ? 'ml-6 border-emerald-100 bg-emerald-50/60'
                          : 'mr-6 border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-[11px] font-semibold text-slate-800">
                          {msg.direction === 'outbound'
                            ? 'Você'
                            : msg.from_name
                              ? `${msg.from_name} <${msg.from_email}>`
                              : msg.from_email}
                        </p>
                        <time className="text-[10px] text-slate-400">{formatWhen(msg.created_at)}</time>
                      </div>
                      {msg.html_body ? (
                        <div
                          className="prose prose-sm mt-2 max-w-none text-slate-700"
                          dangerouslySetInnerHTML={{ __html: msg.html_body }}
                        />
                      ) : (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                          {msg.text_body || '(sem conteúdo)'}
                        </p>
                      )}
                      {msg.attachments?.length ? (
                        <ul className="mt-2 space-y-1">
                          {msg.attachments.map((a, i) => (
                            <li key={`${a.filename}-${i}`} className="text-[11px] text-violet-700">
                              {a.download_url ? (
                                <a href={a.download_url} target="_blank" rel="noreferrer" className="hover:underline">
                                  📎 {a.filename || 'anexo'}
                                </a>
                              ) : (
                                <span>📎 {a.filename || 'anexo'}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  ))
                )}
              </div>

              <form onSubmit={onReply} className="border-t border-slate-100 p-3">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  placeholder="Escreva a resposta..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-200"
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setFiles(e.target.files)}
                    className="max-w-full text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-semibold"
                  />
                  <button
                    type="submit"
                    disabled={sending || !reply.trim()}
                    className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {sending ? 'Enviando...' : 'Responder'}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

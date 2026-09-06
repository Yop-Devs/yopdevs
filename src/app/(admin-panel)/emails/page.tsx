'use client'

import { FormEvent, MouseEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Archive,
  Inbox,
  Loader2,
  Mail,
  Paperclip,
  PenSquare,
  RefreshCw,
  Reply,
  Send,
  Star,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useConfirmDialog } from '@/components/admin/ConfirmDialog'
import { supabase } from '@/lib/supabase'

type Thread = {
  id: string
  subject: string
  participants: string[]
  last_message_at: string
  unread_count: number
  starred?: boolean
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

type Panel = 'inbox' | 'compose'
type Filter = 'all' | 'starred' | 'unread'

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
    const d = new Date(iso)
    const now = new Date()
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    if (sameDay) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function participantLabel(participants: string[]): string {
  const list = (participants ?? []).filter(Boolean)
  if (!list.length) return '—'
  if (list.length === 1) return list[0]
  return `${list[0]} +${list.length - 1}`
}

export default function AdminEmailsPage() {
  const { confirm, dialog: confirmDialog } = useConfirmDialog()
  const [panel, setPanel] = useState<Panel>('inbox')
  const [filter, setFilter] = useState<Filter>('all')
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [reply, setReply] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [sending, setSending] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [composeFiles, setComposeFiles] = useState<FileList | null>(null)

  const loadThreads = useCallback(async (opts?: { sync?: boolean; quiet?: boolean }) => {
    if (!opts?.quiet) setLoading(true)
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
          toast.success(`${syncJson.imported} e-mail(s) importado(s).`)
        } else if (syncJson.errors?.length) {
          toast.message(syncJson.errors[0])
        } else if (!opts.quiet) {
          toast.message('Nenhum e-mail novo.')
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
    setPanel('inbox')
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

  function openCompose() {
    setPanel('compose')
    setSelectedId(null)
    setMessages([])
  }

  async function toggleStar(threadId: string, next: boolean, e?: MouseEvent) {
    e?.stopPropagation()
    setBusyId(threadId)
    const prev = threads
    setThreads((list) => list.map((t) => (t.id === threadId ? { ...t, starred: next } : t)))
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/admin/mailbox/${threadId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ starred: next }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(json.error || 'Falha ao marcar.')
      toast.success(next ? 'Marcado como importante.' : 'Removido de importantes.')
    } catch (err) {
      setThreads(prev)
      toast.error(err instanceof Error ? err.message : 'Falha ao marcar.')
    } finally {
      setBusyId(null)
    }
  }

  async function removeThread(threadId: string, e?: MouseEvent) {
    e?.stopPropagation()
    const ok = await confirm({
      title: 'Apagar esta conversa?',
      description: 'Não dá para desfazer. A conversa e as mensagens somem da caixa.',
      confirmLabel: 'Apagar',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    })
    if (!ok) return
    setBusyId(threadId)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/admin/mailbox/${threadId}`, {
        method: 'DELETE',
        headers,
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(json.error || 'Falha ao apagar.')
      setThreads((list) => list.filter((t) => t.id !== threadId))
      if (selectedId === threadId) {
        setSelectedId(null)
        setMessages([])
        setPanel('inbox')
      }
      toast.success('Conversa apagada.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao apagar.')
    } finally {
      setBusyId(null)
    }
  }

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
      void loadThreads({ quiet: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao enviar.')
    } finally {
      setSending(false)
    }
  }

  async function onCompose(e: FormEvent) {
    e.preventDefault()
    if (!composeTo.trim() || !composeBody.trim()) return
    setSending(true)
    try {
      const headers = await authHeaders(false)
      const form = new FormData()
      form.set('to', composeTo.trim())
      form.set('subject', composeSubject.trim())
      form.set('text', composeBody.trim())
      if (composeFiles) {
        Array.from(composeFiles).slice(0, 5).forEach((f) => form.append('attachments', f))
      }
      const res = await fetch('/api/admin/mailbox/compose', {
        method: 'POST',
        headers,
        body: form,
      })
      const json = (await res.json()) as {
        thread?: Thread
        message?: Message
        error?: string
      }
      if (!res.ok) throw new Error(json.error || 'Falha ao enviar.')
      toast.success('E-mail enviado.')
      setComposeTo('')
      setComposeSubject('')
      setComposeBody('')
      setComposeFiles(null)
      await loadThreads({ quiet: true })
      if (json.thread?.id) {
        await openThread(json.thread.id)
      } else {
        setPanel('inbox')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao enviar.')
    } finally {
      setSending(false)
    }
  }

  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      if (filter === 'starred') return Boolean(t.starred)
      if (filter === 'unread') return (t.unread_count ?? 0) > 0
      return true
    })
  }, [threads, filter])

  const selected = threads.find((t) => t.id === selectedId) ?? null
  const unreadTotal = threads.reduce((n, t) => n + (t.unread_count || 0), 0)
  const starredTotal = threads.filter((t) => t.starred).length

  return (
    <div className="mx-auto flex h-[calc(100vh-5.5rem)] max-w-7xl flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            <Mail className="h-3.5 w-3.5" />
            Inbox
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Caixa de e-mail</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            <span className="font-medium text-slate-700">gabrielcarrara@yopdevs.com.br</span>
            {unreadTotal > 0 ? (
              <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
                {unreadTotal} não lido{unreadTotal > 1 ? 's' : ''}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openCompose}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-3.5 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm hover:bg-slate-800"
          >
            <PenSquare className="h-3.5 w-3.5" />
            Novo e-mail
          </button>
          <button
            type="button"
            onClick={() => void loadThreads({ sync: true })}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.35)] lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-slate-100 lg:border-b-0 lg:border-r lg:border-slate-100">
          <div className="flex gap-1 border-b border-slate-100 p-2">
            {(
              [
                { id: 'all' as const, label: 'Todas', icon: Inbox, count: threads.length },
                { id: 'starred' as const, label: 'Importantes', icon: Star, count: starredTotal },
                { id: 'unread' as const, label: 'Não lidas', icon: Archive, count: unreadTotal },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon
              const active = filter === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <Icon className={`h-3 w-3 ${tab.id === 'starred' && active ? 'fill-amber-300 text-amber-300' : ''}`} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className={`tabular-nums ${active ? 'text-white/70' : 'text-slate-400'}`}>
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center gap-2 p-5 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Inbox className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-slate-700">Nada por aqui</p>
                <p className="mt-1 text-xs text-slate-500">
                  {filter === 'starred'
                    ? 'Marque conversas com a estrela.'
                    : filter === 'unread'
                      ? 'Sem não lidas no momento.'
                      : 'Use Novo e-mail ou aguarde mensagens.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100/80">
                {filteredThreads.map((thread) => {
                  const active = selectedId === thread.id && panel === 'inbox'
                  const unread = (thread.unread_count ?? 0) > 0
                  return (
                    <li key={thread.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => void openThread(thread.id)}
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter' || ev.key === ' ') void openThread(thread.id)
                        }}
                        className={`group relative w-full cursor-pointer px-3 py-3 text-left transition ${
                          active ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            disabled={busyId === thread.id}
                            onClick={(ev) => void toggleStar(thread.id, !thread.starred, ev)}
                            className={`mt-0.5 shrink-0 rounded-md p-0.5 ${
                              active ? 'hover:bg-white/10' : 'hover:bg-slate-200/70'
                            }`}
                            aria-label={thread.starred ? 'Remover importante' : 'Marcar importante'}
                          >
                            <Star
                              className={`h-3.5 w-3.5 ${
                                thread.starred
                                  ? 'fill-amber-400 text-amber-400'
                                  : active
                                    ? 'text-white/40'
                                    : 'text-slate-300'
                              }`}
                            />
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={`truncate text-sm ${
                                  unread ? 'font-bold' : 'font-semibold'
                                } ${active ? 'text-white' : 'text-slate-900'}`}
                              >
                                {thread.subject}
                              </p>
                              <time
                                className={`shrink-0 text-[10px] tabular-nums ${
                                  active ? 'text-white/50' : 'text-slate-400'
                                }`}
                              >
                                {formatWhen(thread.last_message_at)}
                              </time>
                            </div>
                            <p
                              className={`mt-0.5 truncate text-[11px] ${
                                active ? 'text-white/60' : 'text-slate-500'
                              }`}
                            >
                              {participantLabel(thread.participants)}
                            </p>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              {unread ? (
                                <span
                                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                    active ? 'bg-white/15 text-white' : 'bg-emerald-50 text-emerald-700'
                                  }`}
                                >
                                  {thread.unread_count} nova{thread.unread_count > 1 ? 's' : ''}
                                </span>
                              ) : null}
                              <button
                                type="button"
                                disabled={busyId === thread.id}
                                onClick={(ev) => void removeThread(thread.id, ev)}
                                className={`ml-auto rounded-md p-1 opacity-0 transition group-hover:opacity-100 ${
                                  active
                                    ? 'text-white/50 hover:bg-white/10 hover:text-rose-200'
                                    : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'
                                }`}
                                aria-label="Apagar conversa"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col bg-white/70">
          {panel === 'compose' ? (
            <form onSubmit={onCompose} className="flex min-h-0 flex-1 flex-col">
              <header className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-base font-bold text-slate-900">Novo e-mail</h3>
                <p className="text-[11px] text-slate-500">
                  De <span className="font-medium text-slate-700">gabrielcarrara@yopdevs.com.br</span>
                  {' · '}
                  assinatura YOP (CEO) incluída automaticamente
                </p>
              </header>

              <div className="space-y-3 px-5 py-4">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Para
                  </span>
                  <input
                    type="text"
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    placeholder="email@exemplo.com"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Assunto
                  </span>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="Assunto"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
                  />
                </label>
              </div>

              <div className="min-h-0 flex-1 px-5">
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Escreva a mensagem..."
                  required
                  className="h-full min-h-[12rem] w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-500">
                  <Paperclip className="h-3.5 w-3.5" />
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setComposeFiles(e.target.files)}
                    className="max-w-[14rem] text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-semibold"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPanel('inbox')}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={sending || !composeTo.trim() || !composeBody.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Enviar
                  </button>
                </div>
              </div>
            </form>
          ) : !selectedId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200/80 text-slate-400 shadow-inner">
                <Mail className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Selecione uma conversa</p>
                <p className="mt-1 max-w-xs text-xs text-slate-500">
                  Ou escreva um novo e-mail. Novas mensagens também avisam no Telegram.
                </p>
              </div>
            </div>
          ) : (
            <>
              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold text-slate-900">
                    {selected?.subject ?? 'Conversa'}
                  </h3>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">
                    {(selected?.participants ?? []).join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={!selected || busyId === selected.id}
                    onClick={() => selected && void toggleStar(selected.id, !selected.starred)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${
                        selected?.starred ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                      }`}
                    />
                    {selected?.starred ? 'Importante' : 'Marcar'}
                  </button>
                  <button
                    type="button"
                    disabled={!selected || busyId === selected.id}
                    onClick={() => selected && void removeThread(selected.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-100 px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Apagar
                  </button>
                </div>
              </header>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_rgba(248,250,252,0.9),_transparent_55%)] px-5 py-4">
                {loadingThread ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Abrindo...
                  </div>
                ) : (
                  messages.map((msg) => (
                    <article
                      key={msg.id}
                      className={`max-w-[92%] rounded-2xl border px-3.5 py-3 shadow-sm ${
                        msg.direction === 'outbound'
                          ? 'ml-auto border-emerald-100/80 bg-gradient-to-br from-emerald-50 to-white'
                          : 'mr-auto border-slate-200/80 bg-white'
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
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                          {msg.text_body || '(sem conteúdo)'}
                        </p>
                      )}
                      {msg.attachments?.length ? (
                        <ul className="mt-2 space-y-1">
                          {msg.attachments.map((a, i) => (
                            <li key={`${a.filename}-${i}`} className="text-[11px] text-slate-600">
                              {a.download_url ? (
                                <a
                                  href={a.download_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 hover:underline"
                                >
                                  <Paperclip className="h-3 w-3" />
                                  {a.filename || 'anexo'}
                                </a>
                              ) : (
                                <span className="inline-flex items-center gap-1">
                                  <Paperclip className="h-3 w-3" />
                                  {a.filename || 'anexo'}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  ))
                )}
              </div>

              <form onSubmit={onReply} className="border-t border-slate-100 bg-white px-5 py-3">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  placeholder="Escreva a resposta..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-500">
                    <Paperclip className="h-3.5 w-3.5" />
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setFiles(e.target.files)}
                      className="max-w-[14rem] text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-semibold"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={sending || !reply.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {sending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Reply className="h-3.5 w-3.5" />
                    )}
                    Responder
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-slate-400">
                  A assinatura com logo YOP Devs e CEO Gabriel Carrara é anexada automaticamente.
                </p>
              </form>
            </>
          )}
        </section>
      </div>
      {confirmDialog}
    </div>
  )
}

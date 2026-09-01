'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import {
  ADMIN_SYSTEM_BUCKET,
  AdminSystem,
  AdminSystemFile,
  AdminSystemFileKind,
  daysUntil,
  formatDateBr,
  isHttpLink,
  resolveSystemLogoUrl,
} from '@/lib/admin-systems'

type FormState = {
  name: string
  company_name: string
  link: string
  domain_expires_at: string
  notes: string
}

const emptyForm: FormState = {
  name: '',
  company_name: '',
  link: '',
  domain_expires_at: '',
  notes: '',
}

function reminderTone(days: number | null): string {
  if (days == null) return 'bg-slate-100 text-slate-600'
  if (days < 0) return 'bg-rose-100 text-rose-800'
  if (days <= 7) return 'bg-amber-100 text-amber-900'
  if (days <= 30) return 'bg-orange-100 text-orange-900'
  return 'bg-emerald-100 text-emerald-800'
}

function reminderLabel(days: number | null, prefix: string): string {
  if (days == null) return `${prefix}: —`
  if (days < 0) return `${prefix}: atrasado (${Math.abs(days)}d)`
  if (days === 0) return `${prefix}: hoje`
  return `${prefix}: em ${days}d`
}

export default function AdminSistemasPage() {
  const [systems, setSystems] = useState<AdminSystem[]>([])
  const [filesBySystem, setFilesBySystem] = useState<Record<string, AdminSystemFile[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<AdminSystem | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [envFiles, setEnvFiles] = useState<FileList | null>(null)
  const [accessFiles, setAccessFiles] = useState<FileList | null>(null)
  const [query, setQuery] = useState('')
  const [logoSrcById, setLogoSrcById] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const { data: rows, error } = await supabase
      .from('yop_admin_systems')
      .select('*')
      .order('company_name', { ascending: true })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    const list = (rows ?? []) as AdminSystem[]
    setSystems(list)

    const logos: Record<string, string> = {}
    await Promise.all(
      list.map(async (system) => {
        const url = await resolveSystemLogoUrl(system, async (path, expiresIn) => {
          const { data, error: signError } = await supabase.storage
            .from(ADMIN_SYSTEM_BUCKET)
            .createSignedUrl(path, expiresIn)
          return { signedUrl: data?.signedUrl, error: signError }
        })
        if (url) logos[system.id] = url
      }),
    )
    setLogoSrcById(logos)

    if (list.length) {
      const ids = list.map((s) => s.id)
      const { data: files, error: filesError } = await supabase
        .from('yop_admin_system_files')
        .select('*')
        .in('system_id', ids)
        .order('created_at', { ascending: false })

      if (filesError) {
        toast.error(filesError.message)
      } else {
        const map: Record<string, AdminSystemFile[]> = {}
        for (const file of (files ?? []) as AdminSystemFile[]) {
          if (!map[file.system_id]) map[file.system_id] = []
          map[file.system_id].push(file)
        }
        setFilesBySystem(map)
      }
    } else {
      setFilesBySystem({})
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return systems
    return systems.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.company_name.toLowerCase().includes(q) ||
        (s.link ?? '').toLowerCase().includes(q)
    )
  }, [systems, query])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setLogoFile(null)
    setEnvFiles(null)
    setAccessFiles(null)
    setEditorOpen(true)
  }

  function openEdit(system: AdminSystem) {
    setEditing(system)
    setForm({
      name: system.name,
      company_name: system.company_name,
      link: system.link ?? '',
      domain_expires_at: system.domain_expires_at ?? '',
      notes: system.notes ?? '',
    })
    setLogoFile(null)
    setEnvFiles(null)
    setAccessFiles(null)
    setEditorOpen(true)
  }

  async function uploadFile(systemId: string, file: File, folder: string) {
    const safeName = file.name.replace(/[^\w.\-()+ ]+/g, '_')
    const path = `${systemId}/${folder}/${Date.now()}-${safeName}`
    const { error } = await supabase.storage.from(ADMIN_SYSTEM_BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    })
    if (error) throw error
    return path
  }

  async function attachFiles(systemId: string, files: FileList | null, kind: AdminSystemFileKind) {
    if (!files?.length) return
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const userId = session?.user?.id ?? null

    for (const file of Array.from(files)) {
      const path = await uploadFile(systemId, file, kind)
      const { error } = await supabase.from('yop_admin_system_files').insert({
        system_id: systemId,
        kind,
        file_name: file.name,
        file_path: path,
        mime_type: file.type || null,
        file_size: file.size,
        created_by: userId,
      })
      if (error) throw error
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.company_name.trim()) {
      toast.error('Preencha nome do sistema e empresa.')
      return
    }

    setSaving(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const userId = session?.user?.id ?? null

      const payload = {
        name: form.name.trim(),
        company_name: form.company_name.trim(),
        link: form.link.trim() || null,
        domain_expires_at: form.domain_expires_at || null,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      }

      let systemId = editing?.id

      if (editing) {
        const { error } = await supabase.from('yop_admin_systems').update(payload).eq('id', editing.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('yop_admin_systems')
          .insert({ ...payload, created_by: userId })
          .select('id')
          .single()
        if (error) throw error
        systemId = data.id as string

        const { error: payError } = await supabase.from('yop_admin_payments').insert({
          system_id: systemId,
          created_by: userId,
        })
        if (payError) throw payError
      }

      if (!systemId) throw new Error('Sistema sem ID')

      if (logoFile) {
        const logoPath = await uploadFile(systemId, logoFile, 'logo')
        // Bucket privado: logo_url local/publica fica null; a UI gera URL assinada a partir de logo_path
        const { error: logoError } = await supabase
          .from('yop_admin_systems')
          .update({
            logo_path: logoPath,
            logo_url: null,
          })
          .eq('id', systemId)
        if (logoError) throw logoError
      }

      await attachFiles(systemId, envFiles, 'env')
      await attachFiles(systemId, accessFiles, 'access')

      toast.success(editing ? 'Sistema atualizado.' : 'Sistema cadastrado.')
      setEditorOpen(false)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function removeSystem(system: AdminSystem) {
    if (!window.confirm(`Excluir "${system.company_name}" e todos os anexos/pagamentos?`)) return
    const files = filesBySystem[system.id] ?? []
    const paths = [...files.map((f) => f.file_path), system.logo_path].filter(Boolean) as string[]
    if (paths.length) {
      await supabase.storage.from(ADMIN_SYSTEM_BUCKET).remove(paths)
    }
    const { error } = await supabase.from('yop_admin_systems').delete().eq('id', system.id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Sistema excluído.')
    await load()
  }

  async function removeFile(file: AdminSystemFile) {
    if (!window.confirm(`Excluir o arquivo "${file.file_name}"?`)) return
    await supabase.storage.from(ADMIN_SYSTEM_BUCKET).remove([file.file_path])
    const { error } = await supabase.from('yop_admin_system_files').delete().eq('id', file.id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Arquivo excluído.')
    await load()
  }

  async function downloadFile(file: AdminSystemFile) {
    const { data, error } = await supabase.storage.from(ADMIN_SYSTEM_BUCKET).createSignedUrl(file.file_path, 60)
    if (error || !data?.signedUrl) {
      toast.error(error?.message ?? 'Não foi possível gerar o link.')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Gerenciamento de Sistemas</h2>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          + Novo sistema
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por sistema, empresa ou link..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-200"
        />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          Carregando sistemas...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
          Nenhum sistema cadastrado ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((system) => {
            const files = filesBySystem[system.id] ?? []
            const envCount = files.filter((f) => f.kind === 'env').length
            const accessCount = files.filter((f) => f.kind === 'access').length
            const domainDays = daysUntil(system.domain_expires_at)
            const logoSrc = logoSrcById[system.id] ?? null
            const hasLogo = Boolean(logoSrc)

            return (
              <article
                key={system.id}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-center justify-center border-b border-slate-100 bg-slate-950 px-4 py-5">
                  {hasLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoSrc}
                      alt={`Logo ${system.company_name}`}
                      className="h-14 w-auto max-w-[12rem] object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement | null
                        if (fallback) fallback.classList.remove('hidden')
                      }}
                    />
                  ) : null}
                  <span className={`text-sm font-bold uppercase tracking-wider text-white/70 ${hasLogo ? 'hidden' : ''}`}>
                    {system.name}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div>
                    <h3 className="line-clamp-2 text-base font-bold leading-snug text-slate-900">{system.company_name}</h3>
                    <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{system.name}</p>
                    {isHttpLink(system.link) ? (
                      <a
                        href={system.link!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 block truncate text-sm text-violet-700 hover:underline"
                      >
                        {system.link!.replace(/^https?:\/\//, '')}
                      </a>
                    ) : system.link ? (
                      <p className="mt-1.5 text-sm text-slate-500">{system.link}</p>
                    ) : null}
                  </div>

                  <span className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${reminderTone(domainDays)}`}>
                    {reminderLabel(domainDays, 'Domínio')}
                    {system.domain_expires_at ? ` · ${formatDateBr(system.domain_expires_at)}` : ''}
                  </span>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                    <span>.env: {envCount}</span>
                    <span>Acessos: {accessCount}</span>
                  </div>

                  {system.notes ? <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">{system.notes}</p> : null}

                  {files.length > 0 ? (
                    <details className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        Anexos ({files.length})
                      </summary>
                      <ul className="mt-2 space-y-1.5">
                        {files.map((file) => (
                          <li key={file.id} className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="min-w-0 truncate font-medium text-slate-700">
                              <span className="mr-1 uppercase text-slate-400">{file.kind}</span>
                              {file.file_name}
                            </span>
                            <span className="flex shrink-0 gap-2">
                              <button type="button" onClick={() => downloadFile(file)} className="font-semibold text-violet-700 hover:underline">
                                Baixar
                              </button>
                              <button type="button" onClick={() => removeFile(file)} className="font-semibold text-rose-700 hover:underline">
                                Excluir
                              </button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}

                  <div className="mt-auto flex gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => openEdit(system)}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSystem(system)}
                      className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-rose-700 hover:bg-rose-50"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {editorOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => !saving && setEditorOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{editing ? 'Editar sistema' : 'Novo sistema'}</h3>
                <p className="text-sm text-slate-500">Anexos aceitos: .env, .txt e .pdf (vários por tipo).</p>
              </div>
              <button type="button" onClick={() => setEditorOpen(false)} className="rounded-lg p-1 text-slate-400 hover:text-slate-700" aria-label="Fechar">
                ✕
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome do sistema">
                  <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
                </Field>
                <Field label="Empresa">
                  <input required value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} className={inputClass} />
                </Field>
              </div>

              <Field label="Link">
                <input value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} placeholder="https://" className={inputClass} />
              </Field>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="block text-sm">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Logo</span>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.svg,.gif"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null
                      setLogoFile(file)
                      // Permite selecionar o mesmo arquivo de novo depois
                      e.target.value = ''
                    }}
                    className={fileClass}
                  />
                  {editing && (editing.logo_path || logoSrcById[editing.id]) ? (
                    <p className="mt-1 text-[11px] text-slate-500">Já tem logo. Escolha outra imagem para substituir.</p>
                  ) : null}
                  {logoFile ? <p className="mt-1 text-[11px] font-medium text-emerald-700">Selecionada: {logoFile.name}</p> : null}
                </div>
                <div className="block text-sm">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Anexar .env (1+)</span>
                  <input
                    type="file"
                    multiple
                    accept=".env,.txt,text/plain"
                    onChange={(e) => setEnvFiles(e.target.files)}
                    className={fileClass}
                  />
                </div>
                <div className="block text-sm">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Anexar acessos (.txt/.pdf)</span>
                  <input
                    type="file"
                    multiple
                    accept=".txt,.pdf,text/plain,application/pdf"
                    onChange={(e) => setAccessFiles(e.target.files)}
                    className={fileClass}
                  />
                </div>
              </div>

              <Field label="Expiração do domínio">
                <input type="date" value={form.domain_expires_at} onChange={(e) => setForm((f) => ({ ...f, domain_expires_at: e.target.value }))} className={inputClass} />
              </Field>

              <Field label="Observações">
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} className={inputClass} />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" disabled={saving} onClick={() => setEditorOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="block text-sm">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-200'

const fileClass =
  'w-full rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-semibold'

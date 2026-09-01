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
  formatBrl,
  formatDateBr,
} from '@/lib/admin-systems'

type FormState = {
  name: string
  company_name: string
  link: string
  is_quitado: boolean
  has_monthly_fee: boolean
  monthly_fee_amount: string
  monthly_fee_due_day: string
  monthly_next_due: string
  is_paying_development: boolean
  development_amount: string
  development_paid_off_date: string
  domain_expires_at: string
  notes: string
}

const emptyForm: FormState = {
  name: '',
  company_name: '',
  link: '',
  is_quitado: false,
  has_monthly_fee: false,
  monthly_fee_amount: '',
  monthly_fee_due_day: '',
  monthly_next_due: '',
  is_paying_development: false,
  development_amount: '',
  development_paid_off_date: '',
  domain_expires_at: '',
  notes: '',
}

function toNullableNumber(value: string): number | null {
  const cleaned = value.replace(',', '.').trim()
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function toNullableInt(value: string): number | null {
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : null
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
      is_quitado: system.is_quitado,
      has_monthly_fee: system.has_monthly_fee,
      monthly_fee_amount: system.monthly_fee_amount != null ? String(system.monthly_fee_amount) : '',
      monthly_fee_due_day: system.monthly_fee_due_day != null ? String(system.monthly_fee_due_day) : '',
      monthly_next_due: system.monthly_next_due ?? '',
      is_paying_development: system.is_paying_development,
      development_amount: system.development_amount != null ? String(system.development_amount) : '',
      development_paid_off_date: system.development_paid_off_date ?? '',
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
        is_quitado: form.is_quitado,
        has_monthly_fee: form.has_monthly_fee,
        monthly_fee_amount: toNullableNumber(form.monthly_fee_amount),
        monthly_fee_due_day: toNullableInt(form.monthly_fee_due_day),
        monthly_next_due: form.monthly_next_due || null,
        is_paying_development: form.is_paying_development,
        development_amount: toNullableNumber(form.development_amount),
        development_paid_off_date: form.development_paid_off_date || null,
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
      }

      if (!systemId) throw new Error('Sistema sem ID')

      if (logoFile) {
        const logoPath = await uploadFile(systemId, logoFile, 'logo')
        const { data: publicData } = supabase.storage.from(ADMIN_SYSTEM_BUCKET).getPublicUrl(logoPath)
        // bucket is private — store path and create signed URLs when displaying
        const { error: logoError } = await supabase
          .from('yop_admin_systems')
          .update({ logo_path: logoPath, logo_url: publicData.publicUrl })
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
    if (!window.confirm(`Excluir "${system.company_name}" e todos os anexos?`)) return
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

  async function downloadLogo(system: AdminSystem) {
    if (!system.logo_path) return
    const { data, error } = await supabase.storage.from(ADMIN_SYSTEM_BUCKET).createSignedUrl(system.logo_path, 60)
    if (error || !data?.signedUrl) {
      toast.error(error?.message ?? 'Logo indisponível.')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Gerenciamento de Sistemas</h2>
          <p className="mt-1 text-sm text-slate-600">
            Cadastre sistemas, anexos (.env, acessos) e lembretes de pagamento / domínio.
          </p>
        </div>
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
        <div className="grid gap-4">
          {filtered.map((system) => {
            const files = filesBySystem[system.id] ?? []
            const envCount = files.filter((f) => f.kind === 'env').length
            const accessCount = files.filter((f) => f.kind === 'access').length
            const monthlyDays = daysUntil(system.monthly_next_due)
            const domainDays = daysUntil(system.domain_expires_at)
            const devDays = daysUntil(system.development_paid_off_date)

            return (
              <article key={system.id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{system.company_name}</h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        {system.name}
                      </span>
                      {system.is_quitado ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                          Quitado
                        </span>
                      ) : null}
                      {system.has_monthly_fee ? (
                        <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-800">
                          Mensalidade
                        </span>
                      ) : null}
                      {system.is_paying_development ? (
                        <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800">
                          Pagando desenvolvimento
                        </span>
                      ) : null}
                    </div>

                    {system.link ? (
                      <a
                        href={system.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block truncate text-sm text-violet-700 hover:underline"
                      >
                        {system.link}
                      </a>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className={`rounded-full px-2.5 py-1 font-medium ${reminderTone(monthlyDays)}`}>
                        {reminderLabel(monthlyDays, 'Mensalidade')}
                        {system.monthly_fee_amount != null ? ` · ${formatBrl(system.monthly_fee_amount)}` : ''}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 font-medium ${reminderTone(domainDays)}`}>
                        {reminderLabel(domainDays, 'Domínio')} · {formatDateBr(system.domain_expires_at)}
                      </span>
                      {system.is_paying_development ? (
                        <span className={`rounded-full px-2.5 py-1 font-medium ${reminderTone(devDays)}`}>
                          Dev {formatBrl(system.development_amount)} · quita {formatDateBr(system.development_paid_off_date)}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      {system.logo_url || system.logo_path ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={system.logo_url || undefined}
                          alt={`Logo ${system.company_name}`}
                          className="h-10 w-auto max-w-[8rem] rounded-md border border-slate-200 bg-slate-950 object-contain p-1"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : null}
                      <span>Anexos .env: {envCount}</span>
                      <span>Anexos acessos: {accessCount}</span>
                      {system.monthly_fee_due_day ? <span>Dia mensalidade: {system.monthly_fee_due_day}</span> : null}
                      {system.logo_path ? (
                        <button type="button" onClick={() => downloadLogo(system)} className="font-semibold text-violet-700 hover:underline">
                          Baixar logo (storage)
                        </button>
                      ) : null}
                    </div>

                    {files.length > 0 ? (
                      <ul className="mt-3 space-y-1.5">
                        {files.map((file) => (
                          <li
                            key={file.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                          >
                            <div className="min-w-0">
                              <span className="mr-2 rounded bg-white px-1.5 py-0.5 font-semibold uppercase text-slate-500">
                                {file.kind}
                              </span>
                              <span className="font-medium text-slate-800">{file.file_name}</span>
                            </div>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => downloadFile(file)} className="font-semibold text-violet-700 hover:underline">
                                Baixar
                              </button>
                              <button type="button" onClick={() => removeFile(file)} className="font-semibold text-rose-700 hover:underline">
                                Excluir
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {system.notes ? <p className="mt-3 text-sm text-slate-600">{system.notes}</p> : null}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(system)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
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
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4" role="presentation" onClick={() => !saving && setEditorOpen(false)}>
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
                <Field label="Logo">
                  <input type="file" accept="image/*,.svg" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} className={fileClass} />
                </Field>
                <Field label="Anexar .env (1+)">
                  <input type="file" multiple accept=".env,.txt,text/plain" onChange={(e) => setEnvFiles(e.target.files)} className={fileClass} />
                </Field>
                <Field label="Anexar acessos (.txt/.pdf)">
                  <input type="file" multiple accept=".txt,.pdf,text/plain,application/pdf" onChange={(e) => setAccessFiles(e.target.files)} className={fileClass} />
                </Field>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Pagamentos e domínio</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input type="checkbox" checked={form.is_quitado} onChange={(e) => setForm((f) => ({ ...f, is_quitado: e.target.checked }))} />
                    Sistema quitado
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input type="checkbox" checked={form.has_monthly_fee} onChange={(e) => setForm((f) => ({ ...f, has_monthly_fee: e.target.checked }))} />
                    Possui mensalidade
                  </label>
                  <Field label="Valor da mensalidade">
                    <input value={form.monthly_fee_amount} onChange={(e) => setForm((f) => ({ ...f, monthly_fee_amount: e.target.value }))} className={inputClass} placeholder="0,00" />
                  </Field>
                  <Field label="Dia do pagamento (1–31)">
                    <input value={form.monthly_fee_due_day} onChange={(e) => setForm((f) => ({ ...f, monthly_fee_due_day: e.target.value }))} className={inputClass} placeholder="10" />
                  </Field>
                  <Field label="Próximo pagamento da mensalidade">
                    <input type="date" value={form.monthly_next_due} onChange={(e) => setForm((f) => ({ ...f, monthly_next_due: e.target.value }))} className={inputClass} />
                  </Field>
                  <Field label="Expiração do domínio">
                    <input type="date" value={form.domain_expires_at} onChange={(e) => setForm((f) => ({ ...f, domain_expires_at: e.target.value }))} className={inputClass} />
                  </Field>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={form.is_paying_development}
                      onChange={(e) => setForm((f) => ({ ...f, is_paying_development: e.target.checked }))}
                    />
                    Ainda está pagando o desenvolvimento
                  </label>
                  <Field label="Valor do desenvolvimento">
                    <input value={form.development_amount} onChange={(e) => setForm((f) => ({ ...f, development_amount: e.target.value }))} className={inputClass} placeholder="0,00" />
                  </Field>
                  <Field label="Data que quita o desenvolvimento">
                    <input
                      type="date"
                      value={form.development_paid_off_date}
                      onChange={(e) => setForm((f) => ({ ...f, development_paid_off_date: e.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>

              <Field label="Observações">
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className={inputClass}
                />
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
    <label className="block text-sm">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-200'

const fileClass =
  'w-full rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-semibold'

'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import {
  ADMIN_CLIENT_DOCS_BUCKET,
  AdminClient,
  AdminClientDocument,
  AdminSystemOption,
  ClientDocMode,
  clientDisplayName,
  fetchAddressByCep,
  formatAddressLine,
  formatCep,
  formatCnpj,
  formatCpf,
  formatPhone,
  inferClientDocMode,
  onlyDigits,
} from '@/lib/admin-clients'
import { useConfirmDialog } from '@/components/admin/ConfirmDialog'

type FormState = {
  docMode: ClientDocMode
  person_name: string
  cpf: string
  company_name: string
  cnpj: string
  cep: string
  street: string
  address_number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  email: string
  phone: string
  systemIds: string[]
}

const emptyForm: FormState = {
  docMode: 'cpf',
  person_name: '',
  cpf: '',
  company_name: '',
  cnpj: '',
  cep: '',
  street: '',
  address_number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  email: '',
  phone: '',
  systemIds: [],
}

type ClientRow = AdminClient & {
  client_systems?: { system_id: string; system: AdminSystemOption | null }[] | null
  documents?: AdminClientDocument[] | null
}

function mapClient(row: ClientRow): AdminClient {
  const systems = (row.client_systems ?? [])
    .map((link) => link.system)
    .filter((s): s is AdminSystemOption => Boolean(s))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  const documents = [...(row.documents ?? [])].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
  const { client_systems: _ignored, ...rest } = row
  return { ...rest, systems, documents }
}

const DOC_MODES: { value: ClientDocMode; label: string; hint: string }[] = [
  { value: 'cpf', label: 'Só CPF', hint: 'Pessoa física' },
  { value: 'cnpj', label: 'Só CNPJ', hint: 'Empresa' },
  { value: 'both', label: 'CPF + CNPJ', hint: 'Dono e empresa no mesmo cadastro' },
]

export default function AdminClientesPage() {
  const [clients, setClients] = useState<AdminClient[]>([])
  const [systems, setSystems] = useState<AdminSystemOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<AdminClient | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [query, setQuery] = useState('')
  const { confirm, dialog: confirmDialog } = useConfirmDialog()

  const [docModalOpen, setDocModalOpen] = useState(false)
  const [docClient, setDocClient] = useState<AdminClient | null>(null)
  const [editingDoc, setEditingDoc] = useState<AdminClientDocument | null>(null)
  const [docTitle, setDocTitle] = useState('')
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docSaving, setDocSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [clientsRes, systemsRes] = await Promise.all([
      supabase
        .from('yop_admin_clients')
        .select(
          '*, client_systems:yop_admin_client_systems(system_id, system:yop_admin_systems(id, name, company_name, link, notes)), documents:yop_admin_client_documents(*)',
        )
        .order('full_name', { ascending: true }),
      supabase
        .from('yop_admin_systems')
        .select('id, name, company_name, link, notes')
        .order('name', { ascending: true }),
    ])

    if (clientsRes.error) {
      toast.error(clientsRes.error.message)
      setLoading(false)
      return
    }
    if (systemsRes.error) toast.error(systemsRes.error.message)

    setClients(((clientsRes.data ?? []) as ClientRow[]).map(mapClient))
    setSystems((systemsRes.data ?? []) as AdminSystemOption[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((c) => {
      const systemHay = (c.systems ?? []).map((s) => `${s.name} ${s.company_name} ${s.notes ?? ''}`).join(' ')
      const docsHay = (c.documents ?? []).map((d) => `${d.title} ${d.file_name}`).join(' ')
      const hay = [
        c.person_name,
        c.company_name,
        c.full_name,
        c.cpf,
        c.cnpj,
        c.document,
        c.email,
        c.phone,
        c.city,
        c.neighborhood,
        systemHay,
        docsHay,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [clients, query])

  const selectedSystems = useMemo(
    () => systems.filter((s) => form.systemIds.includes(s.id)),
    [systems, form.systemIds],
  )

  const showPerson = form.docMode === 'cpf' || form.docMode === 'both'
  const showCompany = form.docMode === 'cnpj' || form.docMode === 'both'

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setEditorOpen(true)
  }

  function openEdit(client: AdminClient) {
    setEditing(client)
    setForm({
      docMode: inferClientDocMode(client),
      person_name: client.person_name ?? '',
      cpf: client.cpf ?? '',
      company_name: client.company_name ?? '',
      cnpj: client.cnpj ?? '',
      cep: client.cep ?? '',
      street: client.street ?? '',
      address_number: client.address_number ?? '',
      complement: client.complement ?? '',
      neighborhood: client.neighborhood ?? '',
      city: client.city ?? '',
      state: client.state ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      systemIds: (client.systems ?? []).map((s) => s.id),
    })
    setEditorOpen(true)
  }

  function toggleSystem(systemId: string) {
    setForm((f) => ({
      ...f,
      systemIds: f.systemIds.includes(systemId)
        ? f.systemIds.filter((id) => id !== systemId)
        : [...f.systemIds, systemId],
    }))
  }

  async function lookupCep(rawCep: string) {
    const digits = onlyDigits(rawCep)
    if (digits.length !== 8) return
    setCepLoading(true)
    try {
      const address = await fetchAddressByCep(digits)
      if (!address) {
        toast.error('CEP não encontrado.')
        return
      }
      setForm((f) => ({
        ...f,
        street: address.street || f.street,
        neighborhood: address.neighborhood || f.neighborhood,
        city: address.city || f.city,
        state: address.state || f.state,
      }))
    } catch {
      toast.error('Falha ao buscar o CEP.')
    } finally {
      setCepLoading(false)
    }
  }

  async function syncClientSystems(clientId: string, systemIds: string[]) {
    const { error: delError } = await supabase.from('yop_admin_client_systems').delete().eq('client_id', clientId)
    if (delError) throw delError
    if (!systemIds.length) return
    const { error: insError } = await supabase.from('yop_admin_client_systems').insert(
      systemIds.map((system_id) => ({ client_id: clientId, system_id })),
    )
    if (insError) throw insError
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()

    const personName = showPerson ? form.person_name.trim() : ''
    const cpf = showPerson ? form.cpf.trim() : ''
    const companyName = showCompany ? form.company_name.trim() : ''
    const cnpj = showCompany ? form.cnpj.trim() : ''

    if (showPerson && (!personName || !cpf)) {
      toast.error('Preencha nome completo e CPF.')
      return
    }
    if (showCompany && (!companyName || !cnpj)) {
      toast.error('Preencha razão social e CNPJ.')
      return
    }
    if (showPerson && onlyDigits(cpf).length !== 11) {
      toast.error('CPF inválido.')
      return
    }
    if (showCompany && onlyDigits(cnpj).length !== 14) {
      toast.error('CNPJ inválido.')
      return
    }

    setSaving(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const userId = session?.user?.id ?? null
      const primaryName = personName || companyName
      const primaryDocument = cpf || cnpj

      const payload = {
        person_name: personName || null,
        cpf: cpf || null,
        company_name: companyName || null,
        cnpj: cnpj || null,
        full_name: primaryName,
        document: primaryDocument,
        cep: form.cep.trim() || null,
        street: form.street.trim() || null,
        address_number: form.address_number.trim() || null,
        complement: form.complement.trim() || null,
        neighborhood: form.neighborhood.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim().toUpperCase() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        updated_at: new Date().toISOString(),
      }

      let clientId = editing?.id ?? null

      if (editing) {
        const { error } = await supabase.from('yop_admin_clients').update(payload).eq('id', editing.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('yop_admin_clients')
          .insert({ ...payload, created_by: userId })
          .select('id')
          .single()
        if (error) throw error
        clientId = data.id
      }

      if (!clientId) throw new Error('Cliente sem id após salvar.')
      await syncClientSystems(clientId, form.systemIds)

      toast.success(editing ? 'Cliente atualizado.' : 'Cliente cadastrado.')
      setEditorOpen(false)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function removeClient(client: AdminClient) {
    const label = clientDisplayName(client)
    const ok = await confirm({
      title: 'Excluir cliente?',
      description: `"${label}" e seus documentos serão removidos permanentemente.`,
      confirmLabel: 'Excluir cliente',
      tone: 'danger',
    })
    if (!ok) return

    const paths = (client.documents ?? []).map((d) => d.file_path).filter(Boolean)
    if (paths.length) {
      await supabase.storage.from(ADMIN_CLIENT_DOCS_BUCKET).remove(paths)
    }

    const { error } = await supabase.from('yop_admin_clients').delete().eq('id', client.id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Cliente excluído.')
    await load()
  }

  function openAddDocument(client: AdminClient) {
    setDocClient(client)
    setEditingDoc(null)
    setDocTitle('')
    setDocFile(null)
    setDocModalOpen(true)
  }

  function openEditDocument(client: AdminClient, doc: AdminClientDocument) {
    setDocClient(client)
    setEditingDoc(doc)
    setDocTitle(doc.title)
    setDocFile(null)
    setDocModalOpen(true)
  }

  async function uploadClientPdf(clientId: string, file: File) {
    const safeName = file.name.replace(/[^\w.\-()+ ]+/g, '_')
    const path = `clients/${clientId}/docs/${Date.now()}-${safeName}`
    const { error } = await supabase.storage.from(ADMIN_CLIENT_DOCS_BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || 'application/pdf',
    })
    if (error) throw error
    return path
  }

  function isPdfFile(file: File) {
    const byMime = file.type === 'application/pdf'
    const byExt = file.name.toLowerCase().endsWith('.pdf')
    return byMime || byExt
  }

  async function saveDocument(e: FormEvent) {
    e.preventDefault()
    if (!docClient) return

    const title = docTitle.trim()
    if (!title) {
      toast.error('Informe o nome do documento.')
      return
    }
    if (!editingDoc && !docFile) {
      toast.error('Anexe um arquivo PDF.')
      return
    }
    if (docFile && !isPdfFile(docFile)) {
      toast.error('Somente PDF é aceito.')
      return
    }

    setDocSaving(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const userId = session?.user?.id ?? null

      if (editingDoc) {
        let filePath = editingDoc.file_path
        let fileName = editingDoc.file_name
        let mimeType = editingDoc.mime_type
        let fileSize = editingDoc.file_size

        if (docFile) {
          const newPath = await uploadClientPdf(docClient.id, docFile)
          if (editingDoc.file_path) {
            await supabase.storage.from(ADMIN_CLIENT_DOCS_BUCKET).remove([editingDoc.file_path])
          }
          filePath = newPath
          fileName = docFile.name
          mimeType = docFile.type || 'application/pdf'
          fileSize = docFile.size
        }

        const { error } = await supabase
          .from('yop_admin_client_documents')
          .update({
            title,
            file_name: fileName,
            file_path: filePath,
            mime_type: mimeType,
            file_size: fileSize,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingDoc.id)
        if (error) throw error
        toast.success('Documento atualizado.')
      } else {
        if (!docFile) throw new Error('Arquivo obrigatório.')
        const filePath = await uploadClientPdf(docClient.id, docFile)
        const { error } = await supabase.from('yop_admin_client_documents').insert({
          client_id: docClient.id,
          title,
          file_name: docFile.name,
          file_path: filePath,
          mime_type: docFile.type || 'application/pdf',
          file_size: docFile.size,
          created_by: userId,
        })
        if (error) throw error
        toast.success('Documento adicionado.')
      }

      setDocModalOpen(false)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar documento.')
    } finally {
      setDocSaving(false)
    }
  }

  async function downloadDocument(doc: AdminClientDocument) {
    const { data, error } = await supabase.storage
      .from(ADMIN_CLIENT_DOCS_BUCKET)
      .createSignedUrl(doc.file_path, 60)
    if (error || !data?.signedUrl) {
      toast.error(error?.message ?? 'Não foi possível gerar o link de download.')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function removeDocument(doc: AdminClientDocument) {
    const ok = await confirm({
      title: 'Excluir documento?',
      description: `"${doc.title}" será removido permanentemente.`,
      confirmLabel: 'Excluir documento',
      tone: 'danger',
    })
    if (!ok) return
    await supabase.storage.from(ADMIN_CLIENT_DOCS_BUCKET).remove([doc.file_path])
    const { error } = await supabase.from('yop_admin_client_documents').delete().eq('id', doc.id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Documento excluído.')
    await load()
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {confirmDialog}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Gerenciamento de Clientes</h2>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          + Novo cliente
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, CPF, CNPJ, documento, e-mail, sistema ou cidade..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-200"
        />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          Carregando clientes...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
          Nenhum cliente cadastrado ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((client) => {
            const docs = client.documents ?? []
            return (
              <article
                key={client.id}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="border-b border-slate-100 bg-slate-950 px-4 py-4">
                  <h3 className="line-clamp-2 text-base font-bold leading-snug text-white">
                    {clientDisplayName(client)}
                  </h3>
                  <div className="mt-2 space-y-1 text-xs text-white/65">
                    {client.person_name ? (
                      <p>
                        <span className="text-white/40">CPF · </span>
                        {client.person_name}
                        {client.cpf ? ` · ${client.cpf}` : ''}
                      </p>
                    ) : null}
                    {client.company_name ? (
                      <p>
                        <span className="text-white/40">CNPJ · </span>
                        {client.company_name}
                        {client.cnpj ? ` · ${client.cnpj}` : ''}
                      </p>
                    ) : null}
                    {!client.person_name && !client.company_name && client.document ? (
                      <p>{client.document}</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4">
                  {(client.systems ?? []).length ? (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sistemas</p>
                      <ul className="mt-1.5 space-y-2">
                        {(client.systems ?? []).map((system) => (
                          <li key={system.id} className="rounded-lg bg-slate-50 px-2.5 py-2">
                            <p className="text-sm font-semibold text-slate-900">{system.name}</p>
                            {system.company_name && system.company_name !== system.name ? (
                              <p className="text-[11px] text-slate-500">{system.company_name}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Nenhum sistema vinculado.</p>
                  )}

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Documentos ({docs.length})
                      </p>
                      <button
                        type="button"
                        onClick={() => openAddDocument(client)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-100"
                      >
                        + Adicionar
                      </button>
                    </div>
                    {docs.length === 0 ? (
                      <p className="text-xs text-slate-400">Nenhum PDF anexado.</p>
                    ) : (
                      <ul className="space-y-2">
                        {docs.map((doc) => (
                          <li key={doc.id} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                            <p className="truncate text-sm font-semibold text-slate-900">{doc.title}</p>
                            <p className="truncate text-[11px] text-slate-500">{doc.file_name}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => downloadDocument(doc)}
                                className="text-[10px] font-bold uppercase tracking-wide text-violet-700 hover:underline"
                              >
                                Baixar
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditDocument(client, doc)}
                                className="text-[10px] font-bold uppercase tracking-wide text-slate-700 hover:underline"
                              >
                                Alterar
                              </button>
                              <button
                                type="button"
                                onClick={() => removeDocument(doc)}
                                className="text-[10px] font-bold uppercase tracking-wide text-rose-700 hover:underline"
                              >
                                Excluir
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    {client.email ? (
                      <p>
                        <span className="font-semibold text-slate-500">E-mail:</span> {client.email}
                      </p>
                    ) : null}
                    {client.phone ? (
                      <p>
                        <span className="font-semibold text-slate-500">Telefone:</span> {client.phone}
                      </p>
                    ) : null}
                    <p className="leading-relaxed">
                      <span className="font-semibold text-slate-500">Endereço:</span>{' '}
                      {formatAddressLine(client) || '—'}
                    </p>
                  </div>

                  <div className="mt-auto flex gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => openEdit(client)}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => removeClient(client)}
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
              <h3 className="text-lg font-bold text-slate-900">{editing ? 'Editar cliente' : 'Novo cliente'}</h3>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Tipo de documento</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {DOC_MODES.map((mode) => {
                    const active = form.docMode === mode.value
                    return (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, docMode: mode.value }))}
                        className={`rounded-xl border px-3 py-2.5 text-left transition ${
                          active
                            ? 'border-violet-300 bg-violet-50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className="block text-sm font-semibold text-slate-900">{mode.label}</span>
                        <span className="mt-0.5 block text-[11px] text-slate-500">{mode.hint}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {showPerson ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Pessoa física</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Nome completo">
                      <input
                        required={showPerson}
                        value={form.person_name}
                        onChange={(e) => setForm((f) => ({ ...f, person_name: e.target.value }))}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="CPF">
                      <input
                        required={showPerson}
                        value={form.cpf}
                        onChange={(e) => setForm((f) => ({ ...f, cpf: formatCpf(e.target.value) }))}
                        className={inputClass}
                        placeholder="000.000.000-00"
                      />
                    </Field>
                  </div>
                </div>
              ) : null}

              {showCompany ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Pessoa jurídica</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Razão social">
                      <input
                        required={showCompany}
                        value={form.company_name}
                        onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="CNPJ">
                      <input
                        required={showCompany}
                        value={form.cnpj}
                        onChange={(e) => setForm((f) => ({ ...f, cnpj: formatCnpj(e.target.value) }))}
                        className={inputClass}
                        placeholder="00.000.000/0000-00"
                      />
                    </Field>
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Endereço</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="CEP">
                    <div className="flex gap-2">
                      <input
                        value={form.cep}
                        onChange={(e) => {
                          const next = formatCep(e.target.value)
                          setForm((f) => ({ ...f, cep: next }))
                          if (onlyDigits(next).length === 8) lookupCep(next)
                        }}
                        onBlur={() => lookupCep(form.cep)}
                        className={inputClass}
                        placeholder="00000-000"
                      />
                      <button
                        type="button"
                        disabled={cepLoading || onlyDigits(form.cep).length !== 8}
                        onClick={() => lookupCep(form.cep)}
                        className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                      >
                        {cepLoading ? '...' : 'Buscar'}
                      </button>
                    </div>
                  </Field>
                  <Field label="Número">
                    <input
                      value={form.address_number}
                      onChange={(e) => setForm((f) => ({ ...f, address_number: e.target.value }))}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="UF">
                    <input
                      value={form.state}
                      maxLength={2}
                      onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))}
                      className={inputClass}
                      placeholder="SP"
                    />
                  </Field>
                </div>
                <div className="mt-3 grid gap-3">
                  <Field label="Rua / logradouro">
                    <input value={form.street} onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))} className={inputClass} />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Bairro">
                      <input
                        value={form.neighborhood}
                        onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Cidade">
                      <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className={inputClass} />
                    </Field>
                  </div>
                  <Field label="Complemento">
                    <input
                      value={form.complement}
                      onChange={(e) => setForm((f) => ({ ...f, complement: e.target.value }))}
                      className={inputClass}
                      placeholder="Apto, sala, etc."
                    />
                  </Field>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="E-mail">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Telefone">
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: formatPhone(e.target.value) }))}
                    className={inputClass}
                    placeholder="(00) 00000-0000"
                  />
                </Field>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Sistemas vinculados</p>
                    <p className="mt-0.5 text-xs text-slate-500">O vínculo também identifica o cliente em Pagamentos.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    {form.systemIds.length} selecionado{form.systemIds.length === 1 ? '' : 's'}
                  </span>
                </div>

                {systems.length === 0 ? (
                  <p className="text-sm text-slate-500">Cadastre sistemas em Gerenciamento de Sistemas primeiro.</p>
                ) : (
                  <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                    {systems.map((system) => {
                      const checked = form.systemIds.includes(system.id)
                      return (
                        <label
                          key={system.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition ${
                            checked
                              ? 'border-violet-300 bg-violet-50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSystem(system.id)}
                            className="mt-1"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-slate-900">{system.name}</span>
                            {system.company_name && system.company_name !== system.name ? (
                              <span className="block text-xs text-slate-500">{system.company_name}</span>
                            ) : null}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}

                {selectedSystems.length ? (
                  <p className="mt-3 text-xs text-slate-500">
                    Selecionados: {selectedSystems.map((s) => s.name).join(', ')}
                  </p>
                ) : null}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditorOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {docModalOpen && docClient ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => !docSaving && setDocModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingDoc ? 'Alterar documento' : 'Adicionar documento'}
                </h3>
                <p className="text-sm text-slate-500">{clientDisplayName(docClient)}</p>
              </div>
              <button
                type="button"
                onClick={() => setDocModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={saveDocument} className="space-y-4">
              <Field label="Nome do documento">
                <input
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className={inputClass}
                  placeholder="Ex.: Contrato, RG, CNPJ..."
                />
              </Field>

              <div className="block text-sm">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Arquivo PDF {editingDoc ? '(opcional para trocar)' : ''}
                </span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    setDocFile(e.target.files?.[0] ?? null)
                    e.target.value = ''
                  }}
                  className={fileClass}
                />
                {editingDoc && !docFile ? (
                  <p className="mt-1 text-[11px] text-slate-500">Atual: {editingDoc.file_name}</p>
                ) : null}
                {docFile ? (
                  <p className="mt-1 text-[11px] font-medium text-emerald-700">Selecionado: {docFile.name}</p>
                ) : null}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={docSaving}
                  onClick={() => setDocModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={docSaving}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {docSaving ? 'Salvando...' : editingDoc ? 'Salvar' : 'Adicionar'}
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

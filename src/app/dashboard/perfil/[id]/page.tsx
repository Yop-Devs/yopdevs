'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatAuthorName } from '@/lib/format'

const AVAILABILITY_LABELS: Record<string, string> = {
  AVAILABLE: '🚀 Disponível para projetos',
  SEEKING_PARTNER: '🤝 Buscando sócio',
  OPEN_OPPORTUNITIES: '💼 Aberto a oportunidades',
}

const LOOKING_FOR_LABELS: Record<string, string> = {
  ENTRAR_PROJETO: 'Quero entrar em um projeto',
  CRIANDO_PRECISO_TIME: 'Estou criando algo e preciso de time',
  NETWORKING: 'Busco networking',
  EXPLORANDO: 'Apenas explorando',
}

function parseSpecialties(s: string): string[] {
  return (s || '').split(',').map((t) => t.trim()).filter(Boolean)
}

export default function ProfileByIdPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string | undefined

  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<{
    full_name: string
    title: string | null
    availability_badge: string | null
    bio: string | null
    github_url: string | null
    linkedin_url: string | null
    website_url: string | null
    avatar_url: string | null
    location: string | null
    specialties: string | null
    looking_for: string | null
    quick_responder: boolean
  } | null>(null)
  const [stats, setStats] = useState({ posts: 0, projects: 0 })

  const isOwnProfile = !!id && !!currentUserId && id === currentUserId

  useEffect(() => {
    if (!id) {
      router.replace('/dashboard/perfil')
      return
    }
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)
      if (!user) {
        setLoading(false)
        return
      }
      if (id === user.id) {
        router.replace('/dashboard/perfil')
        return
      }
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()
      if (error || !data) {
        setLoading(false)
        return
      }
      setProfile({
        full_name: data.full_name || '',
        title: data.title || null,
        availability_badge: data.availability_badge || null,
        bio: data.bio || null,
        github_url: data.github_url || null,
        linkedin_url: data.linkedin_url || null,
        website_url: data.website_url || null,
        avatar_url: data.avatar_url || null,
        location: data.location || null,
        specialties: data.specialties || null,
        looking_for: data.looking_for || null,
        quick_responder: !!data.quick_responder,
      })
      const [{ count: postsCount }, { count: projectsCount }] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', id),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('owner_id', id),
      ])
      setStats({ posts: postsCount ?? 0, projects: projectsCount ?? 0 })
      setLoading(false)
    }
    loadProfile()
  }, [id, router])

  const sendToChat = () => router.push(`/dashboard/chat/${id}`)

  const requestConnect = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !profile) return
    await supabase.from('notifications').insert({
      user_id: id,
      type: 'INTEREST',
      content: `${formatAuthorName(profile.full_name)} quer se conectar com você.`,
      is_read: false,
      link: `/dashboard/chat/${user.id}`,
      from_user_id: user.id,
    })
    sendToChat()
  }

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-slate-500 text-sm">Carregando perfil...</p>
      </div>
    )
  }

  if (!profile || (!profile.full_name && !profile.bio && !profile.avatar_url)) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-6 text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-2">Perfil não encontrado</h1>
        <p className="text-slate-500 text-sm mb-6">Este usuário não existe ou o perfil ainda não foi preenchido.</p>
        <Link href="/dashboard/membros" className="text-[#4c1d95] font-bold hover:underline">
          Voltar às conexões
        </Link>
      </div>
    )
  }

  const tags = parseSpecialties(profile.specialties || '')
  const hasLinks = profile.github_url || profile.linkedin_url || profile.website_url

  return (
    <div className="max-w-[1100px] mx-auto w-full min-w-0 py-4 sm:py-8 md:py-12 px-4 sm:px-6">
      <Link
        href="/dashboard/membros"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-[#4c1d95] mb-6"
      >
        ← Voltar às conexões
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-14 min-w-0">
        {/* COLUNA ESQUERDA: CARTÃO SOCIAL */}
        <aside className="lg:col-span-5 min-w-0 order-first lg:order-none">
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="w-full aspect-square max-w-[260px] mx-auto rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-50 flex items-center justify-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-6xl font-black text-slate-300">
                  {profile.full_name?.[0] || '?'}
                </span>
              )}
            </div>

            <div className="mt-6 text-center space-y-2">
              <h1 className="text-xl font-bold text-slate-900">
                {formatAuthorName(profile.full_name) || 'Membro'}
              </h1>
              {profile.title && (
                <p className="text-sm text-slate-600">{profile.title}</p>
              )}
              {profile.availability_badge && AVAILABILITY_LABELS[profile.availability_badge] && (
                <p className="text-sm font-medium text-slate-700">
                  {AVAILABILITY_LABELS[profile.availability_badge]}
                </p>
              )}
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {stats.projects >= 1 && (
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                    🏆 Primeiro Projeto Publicado
                  </span>
                )}
                {profile.quick_responder && (
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-green-100 text-green-800 text-[10px] font-bold uppercase">
                    ⚡ Responde rápido
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={requestConnect}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#4c1d95] text-white text-sm font-bold hover:bg-violet-800 transition-all"
              >
                Conectar
              </button>
              <button
                type="button"
                onClick={sendToChat}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-bold hover:border-violet-300 hover:bg-violet-50 transition-all"
              >
                Enviar mensagem
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 flex justify-center gap-6">
              <div className="text-center">
                <span className="block text-2xl font-bold text-[#4c1d95]">{stats.posts}</span>
                <span className="text-xs font-medium text-slate-500">Publicações</span>
              </div>
              <div className="text-center">
                <span className="block text-2xl font-bold text-slate-700">{stats.projects}</span>
                <span className="text-xs font-medium text-slate-500">Oportunidades</span>
              </div>
            </div>
          </div>
        </aside>

        {/* COLUNA DIREITA: INFORMAÇÕES */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            {(profile.location || tags.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {profile.location && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium">
                    📍 {profile.location}
                  </span>
                )}
                {tags.map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1.5 rounded-lg bg-violet-100 text-violet-800 text-xs font-semibold"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {profile.bio && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Sobre</h3>
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
              </div>
            )}

            {profile.looking_for && LOOKING_FOR_LABELS[profile.looking_for] && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Buscando agora</h3>
                <p className="text-slate-700 text-sm font-medium">
                  {LOOKING_FOR_LABELS[profile.looking_for]}
                </p>
              </div>
            )}

            {hasLinks && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Links</h3>
                <div className="flex flex-wrap gap-3">
                  {profile.github_url && (
                    <a
                      href={profile.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
                      GitHub
                    </a>
                  )}
                  {profile.linkedin_url && (
                    <a
                      href={profile.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0a66c2] text-white text-sm font-semibold hover:bg-[#004182] transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                      LinkedIn
                    </a>
                  )}
                  {profile.website_url && (
                    <a
                      href={profile.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                      Portfólio
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

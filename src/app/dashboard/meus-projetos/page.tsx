// src/app/dashboard/meus-projetos/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function MyProjectsPage() {
  const [myProjects, setMyProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function loadMyProjects() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Busca projetos do usuário e traz junto a lista de interesses e o perfil do dev interessado
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_interests (
            id,
            created_at,
            profiles (
              id,
              full_name,
              role,
              github_url
            )
          )
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (data) setMyProjects(data)
    }
    setLoading(false)
  }

  const deleteProject = async (projectId: string) => {
    if (!confirm('Excluir este projeto? Esta ação não pode ser desfeita.')) return
    setDeletingId(projectId)
    const { error } = await supabase.from('projects').delete().eq('id', projectId)
    setDeletingId(null)
    if (!error) loadMyProjects()
  }

  useEffect(() => {
    loadMyProjects()
  }, [])

  if (loading) return <div className="p-8">Carregando seus projetos...</div>

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gestão de Projetos</h1>
        <p className="text-gray-500">Veja quem demonstrou interesse nas suas ideias.</p>
      </header>

      {myProjects.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center">
          <p className="text-gray-500">Você ainda não publicou nenhum projeto.</p>
          <Link href="/dashboard/projetos" className="text-indigo-600 font-bold mt-2 inline-block">
            Ir para o Marketplace →
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {myProjects.map((project) => (
            <div key={project.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50 bg-gray-50/50">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h3 className="text-xl font-bold text-gray-900">{project.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-3 py-1 bg-white border rounded-full text-gray-500">
                      {project.project_interests?.length || 0} Candidatos
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteProject(project.id)}
                      disabled={deletingId === project.id}
                      className="text-xs font-bold px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded-full hover:bg-red-100 disabled:opacity-60 transition-colors"
                    >
                      {deletingId === project.id ? 'Excluindo...' : 'Excluir projeto'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Interessados</h4>
                
                {project.project_interests?.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {project.project_interests.map((interest: any) => (
                      <div key={interest.id} className="py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                            {interest.profiles.full_name[0]}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{interest.profiles.full_name}</p>
                            <p className="text-xs text-gray-500">{interest.profiles.role}</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-3">
                          {interest.profiles.github_url && (
                            <a 
                              href={interest.profiles.github_url} 
                              target="_blank" 
                              className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-md transition-colors"
                            >
                              GitHub
                            </a>
                          )}
                          <Link 
                            href={`/dashboard/perfil/${interest.profiles.id}`}
                            className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 transition-colors"
                          >
                            Ver Perfil
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Ninguém manifestou interesse ainda.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
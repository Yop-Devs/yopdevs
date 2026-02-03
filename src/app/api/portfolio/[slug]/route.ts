import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  if (!slug) return NextResponse.json({ error: 'Slug obrigatório' }, { status: 400 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json(
      { error: 'Configuração do servidor incompleta', profile: null, projects: [] },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, anonKey)

  // Função no Supabase (SECURITY DEFINER) ignora RLS e retorna profile + projects
  const { data, error } = await supabase.rpc('get_portfolio_by_slug', {
    slug_input: slug,
  })

  if (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar perfil', profile: null, projects: [] },
      { status: 500 }
    )
  }

  const payload = Array.isArray(data) ? data[0] : data
  const profile = payload?.profile ?? null
  const projects = payload?.projects ?? []

  if (!profile) {
    return NextResponse.json(
      { error: 'Perfil não encontrado', profile: null, projects: [] },
      { status: 404 }
    )
  }

  return NextResponse.json({
    profile,
    projects: Array.isArray(projects) ? projects : [],
  })
}

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params
  if (!username || typeof username !== 'string') {
    return NextResponse.json({ error: 'Username obrigatório' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: 'Configuração incompleta' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, anonKey)
  const slug = username.toLowerCase().trim()

  const { data: portfolio, error: portfolioError } = await supabase
    .from('user_portfolios')
    .select('*')
    .eq('username', slug)
    .single()

  if (portfolioError || !portfolio) {
    return NextResponse.json(
      { error: 'Portfólio não encontrado', portfolio: null },
      { status: 404 }
    )
  }

  const [skillsRes, projectsRes, experiencesRes] = await Promise.all([
    supabase.from('portfolio_skills').select('skill_name').eq('user_id', portfolio.user_id).order('skill_name'),
    supabase.from('portfolio_projects').select('*').eq('user_id', portfolio.user_id).order('created_at', { ascending: false }),
    supabase.from('portfolio_experiences').select('*').eq('user_id', portfolio.user_id).order('start_date', { ascending: false }),
  ])

  return NextResponse.json({
    portfolio,
    skills: (skillsRes.data ?? []).map((s) => s.skill_name),
    projects: projectsRes.data ?? [],
    experiences: experiencesRes.data ?? [],
  })
}

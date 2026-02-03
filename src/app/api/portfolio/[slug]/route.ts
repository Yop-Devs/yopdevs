import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Para portfolios públicos: se RLS bloquear leitura anônima em profiles,
// adicione uma policy: CREATE POLICY "Public read profiles for portfolio"
// ON profiles FOR SELECT USING (true);

function slugToFullName(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  if (!slug) return NextResponse.json({ error: 'Slug obrigatório' }, { status: 400 })

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const fullName = slugToFullName(slug)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('full_name', fullName)
    .single()

  if (profileError || !profile) {
    return NextResponse.json(
      { error: 'Perfil não encontrado', profile: null, projects: [] },
      { status: 404 }
    )
  }

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', profile.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    profile,
    projects: projects || [],
  })
}

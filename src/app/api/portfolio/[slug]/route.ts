import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// Service role ignora RLS — use em produção (Vercel: SUPABASE_SERVICE_ROLE_KEY)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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

  const supabase = createClient(supabaseUrl, supabaseKey)
  const fullName = slugToFullName(slug)

  // Tenta exato; se não achar, tenta case-insensitive (ilike)
  let { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('full_name', fullName)
    .maybeSingle()

  if ((profileError || !profile) && fullName) {
    const { data: profileIlike } = await supabase
      .from('profiles')
      .select('*')
      .ilike('full_name', fullName)
      .limit(1)
      .maybeSingle()
    if (profileIlike) profile = profileIlike
  }

  if (!profile) {
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

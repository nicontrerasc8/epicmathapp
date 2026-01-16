import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import {
  createStudentSessionValue,
  getStudentSessionCookieName,
  getStudentSessionMaxAge,
  type StudentSession,
} from '@/utils/student-session'

type LoginPayload = {
  username?: string
  password?: string
}

const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ludus-edu.com'

const getCookieDomain = (request: Request) => {
  const host = request.headers.get('host') || ''
  if (!host || host.includes('localhost')) return undefined
  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}` || host.endsWith(`.${ROOT_DOMAIN}`)) {
    return `.${ROOT_DOMAIN}`
  }
  return undefined
}

const getInstitutionSlugFromHost = (host: string) => {
  const hostname = host.split(':')[0] || ''
  if (!hostname) return null
  if (hostname === 'localhost') return null
  if (hostname.endsWith('.localhost')) {
    const parts = hostname.split('.')
    return parts.length > 1 ? parts[0] : null
  }
  if (hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`) {
    return null
  }
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = hostname.slice(0, -1 * (`.${ROOT_DOMAIN}`.length))
    if (!slug || slug === 'www') return null
    return slug
  }
  return null
}

const getInstitutionId = async (request: Request) => {
  const explicitId = request.headers.get('x-institution-id')
  if (explicitId) return explicitId

  const slugHeader = request.headers.get('x-institution-slug')
  const host = request.headers.get('host') || ''
  const slug = slugHeader || getInstitutionSlugFromHost(host)
  if (!slug) return null

  const { data: institution } = await supabaseAdmin
    .from('edu_institutions')
    .select('id, slug')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle()

  return institution?.id ?? null
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const institutionId = await getInstitutionId(request)

  const body = (await request.json()) as LoginPayload
  const username = body.username?.trim()
  const password = body.password ?? ''

  if (!username) {
    return NextResponse.json(
      { error: 'Credenciales incorrectas.' },
      { status: 400 }
    )
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('edu_profiles')
    .select('id, username, password_hash, active, global_role, first_name, last_name')
    .eq('username', username)
    .eq('global_role', 'student')
    .eq('active', true)
    .maybeSingle()

  if (profileError || !profile) {
    return NextResponse.json(
      { error: 'Credenciales incorrectas.' },
      { status: 401 }
    )
  }

  if (profile.password_hash) {
    const isBcrypt = profile.password_hash.startsWith('$2')
    const ok = isBcrypt
      ? await bcrypt.compare(password, profile.password_hash)
      : profile.password_hash === password
    if (!ok) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas.' },
        { status: 401 }
      )
    }
  }

  let memberQuery = supabaseAdmin
    .from('edu_institution_members')
    .select('classroom_id, institution_id')
    .eq('profile_id', profile.id)
    .eq('role', 'student')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)

  if (institutionId) {
    memberQuery = memberQuery.eq('institution_id', institutionId)
  }

  const { data: member } = await memberQuery.maybeSingle()

  if (!member?.institution_id) {
    return NextResponse.json(
      { error: 'Credenciales incorrectas.' },
      { status: 401 }
    )
  }

  const session: StudentSession = {
    profile_id: profile.id,
    role: 'student',
    classroom_id: member?.classroom_id ?? null,
    institution_id: member?.institution_id ?? null,
    issued_at: Date.now(),
  }

  const token = await createStudentSessionValue(session)
  const response = NextResponse.json({
    student: {
      id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      username: profile.username,
      classroom_id: member?.classroom_id ?? null,
      institution_id: member?.institution_id ?? null,
    },
    redirect_to: '/dashboard/student/play',
  })

  response.cookies.set(getStudentSessionCookieName(), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: getStudentSessionMaxAge(),
    path: '/',
    domain: getCookieDomain(request),
  })

  return response
}

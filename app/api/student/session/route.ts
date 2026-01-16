import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import {
  parseStudentSessionValue,
  getStudentSessionCookieName,
  getStudentSessionMaxAge,
  type StudentSession,
} from '@/utils/student-session'

const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ludus-edu.com'

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

const clearSession = () => {
  const response = NextResponse.json({ student: null }, { status: 401 })
  response.cookies.set(getStudentSessionCookieName(), '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(0),
    path: '/',
  })
  return response
}

export async function GET(request: Request) {
  const institutionId = await getInstitutionId(request)
  if (!institutionId) {
    return clearSession()
  }
  const cookieStore = await cookies()
  const token = cookieStore.get(getStudentSessionCookieName())?.value

  if (!token) {
    return clearSession()
  }

  const session = token
    ? ((await parseStudentSessionValue(token)) as StudentSession | null)
    : null

  if (!session?.profile_id) {
    return clearSession()
  }
  if (institutionId && session.institution_id && session.institution_id !== institutionId) {
    return clearSession()
  }

  const { data: profile } = await supabaseAdmin
    .from('edu_profiles')
    .select('id, first_name, last_name, username, global_role, active')
    .eq('id', session.profile_id)
    .maybeSingle()

  if (!profile || profile.active === false || profile.global_role !== 'student') {
    return clearSession()
  }

  const response = NextResponse.json({
    student: {
      id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      username: profile.username,
      classroom_id: session.classroom_id ?? null,
      institution_id: session.institution_id ?? null,
    },
  })

  response.cookies.set(getStudentSessionCookieName(), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: getStudentSessionMaxAge(),
    path: '/',
  })

  return response
}

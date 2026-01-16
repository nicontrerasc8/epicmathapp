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

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const institutionId = request.headers.get('x-institution-id')
  if (!institutionId) {
    return NextResponse.json(
      { error: 'Institucion no encontrada.' },
      { status: 400 }
    )
  }

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
    const ok = await bcrypt.compare(password, profile.password_hash)
    if (!ok) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas.' },
        { status: 401 }
      )
    }
  }

  const { data: member } = await supabaseAdmin
    .from('edu_institution_members')
    .select('classroom_id, institution_id')
    .eq('profile_id', profile.id)
    .eq('role', 'student')
    .eq('active', true)
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

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

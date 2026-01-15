import { NextResponse } from 'next/server'
import { getStudentSessionCookieName } from '@/utils/student-session'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(getStudentSessionCookieName(), '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(0),
    path: '/',
  })
  return response
}

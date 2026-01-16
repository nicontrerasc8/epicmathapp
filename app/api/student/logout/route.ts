import { NextResponse } from 'next/server'
import { getStudentSessionCookieName } from '@/utils/student-session'

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

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(getStudentSessionCookieName(), '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(0),
    path: '/',
    domain: getCookieDomain(request),
  })
  return response
}

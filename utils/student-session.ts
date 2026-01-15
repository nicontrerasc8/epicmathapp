export type StudentSession = {
  profile_id: string
  role: 'student'
  classroom_id: string | null
  institution_id: string | null
  issued_at: number
}

const COOKIE_NAME = 'ludus_student_session'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

const encoder = new TextEncoder()

const getSecret = () => {
  const secret = process.env.STUDENT_AUTH_SECRET
  if (!secret) {
    throw new Error('Missing STUDENT_AUTH_SECRET')
  }
  return secret
}

const toBase64Url = (bytes: Uint8Array) => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64url')
  }
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

const fromBase64Url = (value: string) => {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(value, 'base64url'))
  }
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(value.length + (4 - (value.length % 4 || 4)), '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

const signValue = async (value: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  return toBase64Url(new Uint8Array(signature))
}

const verifyValue = async (value: string, signature: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )
  return crypto.subtle.verify(
    'HMAC',
    key,
    fromBase64Url(signature),
    encoder.encode(value)
  )
}

export const createStudentSessionValue = async (session: StudentSession) => {
  const payload = JSON.stringify(session)
  const signature = await signValue(payload)
  return `${toBase64Url(encoder.encode(payload))}.${signature}`
}

export const parseStudentSessionValue = async (token: string) => {
  const [payloadEncoded, signature] = token.split('.')
  if (!payloadEncoded || !signature) {
    return null
  }
  try {
    const payloadBytes = fromBase64Url(payloadEncoded)
    const payload = new TextDecoder().decode(payloadBytes)
    const valid = await verifyValue(payload, signature)
    if (!valid) {
      return null
    }
    return JSON.parse(payload) as StudentSession
  } catch {
    return null
  }
}

export const getStudentSessionCookieName = () => COOKIE_NAME
export const getStudentSessionMaxAge = () => SESSION_MAX_AGE_SECONDS

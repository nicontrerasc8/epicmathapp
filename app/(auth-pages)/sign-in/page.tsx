'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Mail, Lock, Eye, EyeOff, AlertCircle, User } from 'lucide-react'

type Mode = 'student' | 'teacher'

export default function SignInPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<Mode>('student')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  const [username, setUsername] = useState('')
  const [studentPassword, setStudentPassword] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: sign, error: signErr } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

    if (signErr || !sign.user) {
      setError('Credenciales incorrectas o usuario no encontrado.')
      setLoading(false)
      return
    }

    await supabase.auth.getSession()

    const userId = sign.user.id
    const { data: profile, error: profErr } = await supabase
      .from('edu_profiles')
      .select('id, global_role, active')
      .eq('id', userId)
      .single()

    setLoading(false)

    if (profErr || !profile) {
      setError('No se encontro tu perfil (edu_profiles). Contacta al administrador.')
      return
    }

    if (profile.active === false) {
      setError('Tu cuenta esta desactivada. Contacta al administrador.')
      return
    }

    if (profile.global_role === 'admin') {
      router.push('/dashboard/admin')
      return
    }

    if (profile.global_role === 'teacher') {
      router.push('/dashboard/teacher')
      return
    }

    setError('Tu cuenta no tiene rol asignado (global_role). Contacta al administrador.')
  }

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/student/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password: studentPassword || undefined,
      }),
    })

    if (!res.ok) {
      setError('Credenciales incorrectas o usuario no encontrado.')
      setLoading(false)
      return
    }

    setLoading(false)
    router.push('/dashboard/student/play')
  }

  return (
    <div className="flex items-center justify-center px-6 w-full">
      <div className="relative w-full max-w-md">
        <div className="pointer-events-none absolute -top-20 -left-24 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-40 w-40 rounded-full bg-secondary/20 blur-3xl" />

        <div className="relative rounded-2xl border border-border bg-card/80 backdrop-blur p-7 md:p-8 shadow-lg">
          <div className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Inicia sesion en <span className="text-primary">Ludus</span>
            </h1>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('student')
                setError('')
              }}
              className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold ${
                mode === 'student'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-foreground border-border'
              }`}
            >
              Soy alumno
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('teacher')
                setError('')
              }}
              className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold ${
                mode === 'teacher'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-foreground border-border'
              }`}
            >
              Soy profesor
            </button>
          </div>

          {mode === 'student' ? (
            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg border bg-input px-3 py-2 focus-within:ring-2 ring-ring">
                <User className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-transparent outline-none text-sm"
                  autoComplete="username"
                  required
                />
              </div>

              <div className="flex items-center gap-2 rounded-lg border bg-input px-3 py-2 focus-within:ring-2 ring-ring">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Contrasena"
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  className="w-full bg-transparent outline-none text-sm"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="text-muted-foreground hover:text-foreground transition"
                  aria-label={showPwd ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm justify-center">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full h-11 text-base font-semibold">
                {loading ? 'Ingresando...' : 'Entrar'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleTeacherLogin} className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg border bg-input px-3 py-2 focus-within:ring-2 ring-ring">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="Correo electronico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent outline-none text-sm"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="flex items-center gap-2 rounded-lg border bg-input px-3 py-2 focus-within:ring-2 ring-ring">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Contrasena"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent outline-none text-sm"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="text-muted-foreground hover:text-foreground transition"
                  aria-label={showPwd ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm justify-center">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full h-11 text-base font-semibold">
                {loading ? 'Ingresando...' : 'Entrar'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

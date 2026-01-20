'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'

type Mode = 'student' | 'teacher'

export default function SignInPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<Mode>('student')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMode, setLoadingMode] = useState<Mode | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setLoadingMode(mode)

    const { data: sign, error: signErr } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

    if (signErr || !sign.user) {
      setError('Credenciales incorrectas o usuario no encontrado.')
      setLoading(false)
      setLoadingMode(null)
      return
    }

    const userId = sign.user.id
    const { data: profile, error: profErr } = await supabase
      .from('edu_profiles')
      .select('id, global_role, active')
      .eq('id', userId)
      .single()

    setLoading(false)
    setLoadingMode(null)

    if (profErr || !profile) {
      setError('No se encontro tu perfil (edu_profiles). Contacta al administrador.')
      return
    }

    if (profile.active === false) {
      setError('Tu cuenta esta desactivada. Contacta al administrador.')
      return
    }

    if (mode === 'student' && profile.global_role !== 'student') {
      setError('Tu cuenta no es de estudiante. Cambia a modo profesor.')
      return
    }

    if (mode === 'teacher' && profile.global_role === 'student') {
      setError('Tu cuenta es de estudiante. Cambia a modo alumno.')
      return
    }

    if (profile.global_role === 'admin') {
      router.push('/admin-access')
      return
    }

    if (profile.global_role === 'teacher') {
      router.push('/dashboard/teacher')
      return
    }

    if (profile.global_role === 'student') {
      router.push('/student/play')
      return
    }

    setError('Tu cuenta no tiene rol asignado (global_role). Contacta al administrador.')
  }

  const isSubmitting = loading && loadingMode === mode

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
                setLoading(false)
                setLoadingMode(null)
              }}
              disabled={loading}
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
                setLoading(false)
                setLoadingMode(null)
              }}
              disabled={loading}
              className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold ${
                mode === 'teacher'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-foreground border-border'
              }`}
            >
              Soy profesor
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="text-muted-foreground hover:text-foreground transition"
                aria-label={showPwd ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                disabled={isSubmitting}
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
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Ingresando...
                </span>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

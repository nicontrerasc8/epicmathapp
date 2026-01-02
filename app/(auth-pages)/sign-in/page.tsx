'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function SignInPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // 1) Auth
    const { data: sign, error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signErr || !sign.user) {
      setError('Credenciales incorrectas o usuario no encontrado.')
      setLoading(false)
      return
    }

    // 2) Asegurar sesión lista (evita “tengo que refrescar”)
    await supabase.auth.getSession()

    const userId = sign.user.id

    // 3) Rol global desde edu_profiles
    const { data: profile, error: profErr } = await supabase
      .from('edu_profiles')
      .select('id, first_name, last_name, global_role, active')
      .eq('id', userId)
      .single()

    setLoading(false)

    if (profErr || !profile) {
      setError('No se encontró tu perfil (edu_profiles). Contacta al administrador.')
      return
    }

    if (profile.active === false) {
      setError('Tu cuenta está desactivada. Contacta al administrador.')
      return
    }

    const role = profile.global_role // 'student' | 'teacher' | 'admin' | null

    // 4) Router por rol global
    if (role === 'admin') {
      router.push('/dashboard/admin') // o '/superadmin' si prefieres
      return
    }

    if (role === 'teacher') {
      router.push('/dashboard/teacher')
      return
    }

    if (role === 'student') {
      // opcional: guardar para navbar u otros
      try {
        localStorage.setItem(
          'profile',
          JSON.stringify({
            id: profile.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            global_role: profile.global_role,
          })
        )
      } catch {}
      router.push('/dashboard/student/play')
      return
    }

    setError('Tu cuenta no tiene rol asignado (global_role). Contacta al administrador.')
  }

  return (
    <div className="flex items-center justify-center px-6 w-full">
      <div className="relative w-full max-w-md">
        {/* blobs de fondo */}
        <div className="pointer-events-none absolute -top-20 -left-24 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-40 w-40 rounded-full bg-secondary/20 blur-3xl" />

        <div className="relative rounded-2xl border border-border bg-card/80 backdrop-blur p-7 md:p-8 shadow-lg">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Inicia sesión en <span className="text-primary">Ludus</span>
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border bg-input px-3 py-2 focus-within:ring-2 ring-ring">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="Correo electrónico"
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
                placeholder="Contraseña"
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
                aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
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
              {loading ? 'Ingresando…' : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

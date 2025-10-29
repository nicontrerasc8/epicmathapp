'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { UserCircle, Lock } from 'lucide-react'

export default function SignInPage() {
  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab] = useState<'student' | 'teacher'>('student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user) {
      setError('Credenciales incorrectas o usuario no encontrado.')
      setLoading(false)
      return
    }

    const userId = data.user.id

    // Verificar rol real
    const { data: student } = await supabase
      .from('students')
      .select('id, nombres')
      .eq('id', userId)
      .single()

    const { data: teacher } = await supabase
      .from('teachers')
      .select('id, nombres')
      .eq('id', userId)
      .single()

    setLoading(false)

    if (student) {
      localStorage.setItem('student', JSON.stringify(student))
      router.push('/dashboard/student/play')
    } else if (teacher) {
      router.push('/dashboard/teacher')
    } else {
      setError('Tu cuenta no tiene un rol asignado. Contacta al administrador.')
    }
  }

  return (
    <div className="flex items-center mx-auto justify-center bg-background text-foreground px-4 ">
      <div className="w-full max-w-md">
        <div className="flex gap-4 mb-8 justify-center">
          {['student', 'teacher'].map((role) => (
            <button
              key={role}
              onClick={() => setTab(role as 'student' | 'teacher')}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 ${
                tab === role
                  ? 'bg-primary text-white border-primary shadow-md'
                  : 'bg-muted text-foreground border-border hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {role === 'student' ? 'Estudiante' : 'Profesor'}
            </button>
          ))}
        </div>

        <div className="bg-card p-8 rounded-2xl shadow-lg border border-border space-y-5 animate-in fade-in zoom-in">
          <h1 className="text-2xl font-bold text-center">
            Ingreso {tab === 'student' ? 'Estudiante' : 'Profesor'}
          </h1>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="flex items-center border rounded-lg overflow-hidden bg-input focus-within:ring-2 ring-ring">
              <UserCircle className="mx-3 text-muted-foreground" size={18} />
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full py-2 px-1 outline-none bg-transparent"
                required
              />
            </div>

            <div className="flex items-center border rounded-lg overflow-hidden bg-input focus-within:ring-2 ring-ring">
              <Lock className="mx-3 text-muted-foreground" size={18} />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-2 px-1 outline-none bg-transparent"
                required
              />
            </div>

            {error && <p className="text-destructive text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white py-2 rounded-lg font-medium transition duration-200 disabled:opacity-50"
            >
              {loading ? 'Ingresando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

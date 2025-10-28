'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { User, Lock, UserCircle } from 'lucide-react'

export default function SignInPage() {
  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab] = useState<'student' | 'teacher'>('student')

  const [studentError, setStudentError] = useState('')
  const [studentMessage, setStudentMessage] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [teacherError, setTeacherError] = useState('')

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setTeacherError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setTeacherError('Credenciales incorrectas')
      console.log(error)
    } else {
      router.push('/dashboard/student/play')
    }
  }

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setTeacherError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setTeacherError('Credenciales incorrectas')
      console.log(error)
    } else {
      router.push('/dashboard/teacher')
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

          {tab === 'student' ? (
            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div className="flex items-center border rounded-lg overflow-hidden bg-input focus-within:ring-2 ring-ring">
                <UserCircle className="mx-3 text-muted-foreground" size={18} />
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.form?.requestSubmit()}
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
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.form?.requestSubmit()}
                  className="w-full py-2 px-1 outline-none bg-transparent"
                  required
                />
              </div>
              {studentError && <p className="text-destructive text-sm text-center">{studentError}</p>}
              {studentMessage && <p className="text-green-600 text-sm text-center">{studentMessage}</p>}
              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white py-2 rounded-lg font-medium transition duration-200"
              >
                Entrar
              </button>
            
            </form>
          ) : (
            <form onSubmit={handleTeacherLogin} className="space-y-4">
              <div className="flex items-center border rounded-lg overflow-hidden bg-input focus-within:ring-2 ring-ring">
                <UserCircle className="mx-3 text-muted-foreground" size={18} />
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.form?.requestSubmit()}
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
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.form?.requestSubmit()}
                  className="w-full py-2 px-1 outline-none bg-transparent"
                  required
                />
              </div>
              {teacherError && <p className="text-destructive text-sm text-center">{teacherError}</p>}
              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white py-2 rounded-lg font-medium transition duration-200"
              >
                Entrar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function SignInPage() {
  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab] = useState<'student' | 'teacher'>('student')
  const [username, setUsername] = useState('')
  const [studentError, setStudentError] = useState('')
  const [studentMessage, setStudentMessage] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [teacherError, setTeacherError] = useState('')

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setStudentError('')
    setStudentMessage('')

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('username', username.trim().toLowerCase())
      .single()

    if (studentError || !student) {
      setStudentError('Usuario no encontrado 😞')
      return
    }

    setStudentMessage(`Bienvenido, ${student.username} 👋`)
    localStorage.setItem('student', JSON.stringify(student))
    router.push('/dashboard/student')
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
    } else {
      router.push('/dashboard/teacher')
    }
  }

  return (
    <div className="flex items-center justify-center bg-background text-foreground px-4 min-h-screen">
      <div className="w-full max-w-sm">
        <div className="flex gap-4 mb-6 justify-center">
          <button
            onClick={() => setTab('student')}
            className={`px-4 py-2 rounded-md text-sm font-medium border transition ${
              tab === 'student'
                ? 'bg-primary text-white border-primary'
                : 'bg-muted text-foreground border-border'
            }`}
          >
            Estudiante
          </button>
          <button
            onClick={() => setTab('teacher')}
            className={`px-4 py-2 rounded-md text-sm font-medium border transition ${
              tab === 'teacher'
                ? 'bg-primary text-white border-primary'
                : 'bg-muted text-foreground border-border'
            }`}
          >
            Profesor
          </button>
        </div>

        {tab === 'student' && (
          <form
            onSubmit={handleStudentLogin}
            className="bg-muted p-6 rounded-xl shadow flex flex-col gap-4 border border-border"
          >
            <h1 className="text-xl font-bold text-center">Ingreso Estudiante</h1>
            <input
              type="text"
              placeholder="Nombre de usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="p-2 border rounded bg-white"
            />
            {studentError && <p className="text-destructive text-sm text-center">{studentError}</p>}
            {studentMessage && <p className="text-green-600 text-sm text-center">{studentMessage}</p>}
            <button type="submit" className="bg-primary text-white p-2 rounded">
              Entrar
            </button>
          </form>
        )}

        {tab === 'teacher' && (
          <form
            onSubmit={handleTeacherLogin}
            className="bg-muted p-6 rounded-xl shadow flex flex-col gap-4 border border-border"
          >
            <h1 className="text-xl font-bold text-center">Ingreso Profesor</h1>
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="p-2 border rounded bg-white"
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="p-2 border rounded bg-white"
            />
            {teacherError && <p className="text-destructive text-sm text-center">{teacherError}</p>}
            <button type="submit" className="bg-primary text-white p-2 rounded">
              Entrar
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

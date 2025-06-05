'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

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
      router.push('/protected')
    }
  }

  return (
    <div className="flex items-center justify-center bg-background text-foreground px-4 min-h-screen">
      <Tabs value={tab} onValueChange={(v:any) => setTab(v as 'student' | 'teacher')} className="w-full max-w-sm">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="student">Estudiante</TabsTrigger>
          <TabsTrigger value="teacher">Profesor</TabsTrigger>
        </TabsList>

        <TabsContent value="student">
          <form
            onSubmit={handleStudentLogin}
            className="bg-muted p-8 rounded-2xl shadow-lg w-full flex flex-col gap-6 border border-border"
          >
            <h1 className="text-2xl font-bold text-center text-primary">Ingreso de Estudiantes</h1>
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Nombre de usuario</Label>
              <Input
                id="username"
                name="username"
                placeholder="pepe123"
                autoComplete="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            {studentError && <p className="text-destructive text-sm text-center">{studentError}</p>}
            {studentMessage && <p className="text-green-600 text-sm text-center">{studentMessage}</p>}
            <Button type="submit" className="w-full">Entrar</Button>
          </form>
        </TabsContent>

        <TabsContent value="teacher">
          <form
            onSubmit={handleTeacherLogin}
            className="bg-muted p-8 rounded-2xl shadow-lg w-full flex flex-col gap-6 border border-border"
          >
            <h1 className="text-2xl font-bold text-center text-primary">Ingreso de Profesores</h1>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="profe@colegio.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {teacherError && <p className="text-destructive text-sm text-center">{teacherError}</p>}
            <Button type="submit" className="w-full">Entrar</Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function SignInPage() {
  const router = useRouter()
  const supabase = createClient()

  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('username', username.trim().toLowerCase())
      .single()

    if (studentError || !student) {
      setError('Usuario no encontrado 😞')
      return
    }

    setMessage(`Bienvenido, ${student.username} 👋`)
    localStorage.setItem('student', JSON.stringify(student))
    router.push('/dashboard/student')
  }

  return (
    <div className="flex items-center justify-center bg-background text-foreground px-4 min-h-screen">
      <form
        onSubmit={handleSubmit}
        className="bg-muted p-8 rounded-2xl shadow-lg w-full max-w-sm flex flex-col gap-6 border border-border"
      >
        <h1 className="text-3xl font-extrabold text-center text-primary">
          Bienvenido a EpicMathApp
        </h1>

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

        {error && <p className="text-destructive text-sm text-center">{error}</p>}
        {message && <p className="text-green-600 text-sm text-center">{message}</p>}

        <Button type="submit" className="w-full">
          Entrar
        </Button>
      </form>
    </div>
  )
}

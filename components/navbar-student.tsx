'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User, LogOut, BookOpen, GraduationCap, Info, Sparkles } from 'lucide-react'

export default function NavbarUser() {
  const [userData, setUserData] = useState<any>(null)
  const [role, setRole] = useState<'student' | 'teacher' | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // =============================
  // Obtener datos del usuario y rol
  // =============================
  useEffect(() => {
    const fetchUserRole = async () => {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setUserData(null)
        setRole(null)
        setLoading(false)
        return
      }

      // Primero buscamos si es estudiante
      const { data: student } = await supabase
        .from('students')
        .select('*')
        .eq('id', user.id)
        .single()

      if (student) {
        setUserData(student)
        setRole('student')
        localStorage.setItem('student', JSON.stringify(student))
        setLoading(false)
        return
      }

      // Si no es estudiante, probamos si es teacher
      const { data: teacher } = await supabase
        .from('teachers')
        .select('*')
        .eq('id', user.id)
        .single()

      if (teacher) {
        setUserData(teacher)
        setRole('teacher')
        setLoading(false)
        return
      }

      // Si no es ninguno
      setUserData(user)
      setRole(null)
      setLoading(false)
    }

    fetchUserRole()
  }, [pathname])

  // =============================
  // Cerrar sesión
  // =============================
  const logout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('student')
    setUserData(null)
    setRole(null)
    router.push('/sign-in')
  }

  // =============================
  // Loading Skeleton
  // =============================
  if (loading) {
    return (
      <div className="flex items-center gap-4">
        <div className="h-8 w-32 bg-muted animate-pulse rounded-md"></div>
        <div className="h-8 w-20 bg-muted animate-pulse rounded-md"></div>
      </div>
    )
  }

  // =============================
  // Navbar para ESTUDIANTE
  // =============================
  if (role === 'student' && userData) {
    const name = userData.nombres?.split(' ')[0] || userData.username
    return (
      <div className="flex items-center gap-3">
        {/* Mensaje de bienvenida */}
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full border border-primary/20">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-foreground">
            ¡Hola, <span className="font-semibold">{name}</span>!
          </span>
        </div>

        {/* Dashboard */}
        <Link
          href="/dashboard/student/play"
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white hover:bg-accent/20 rounded-lg border border-border hover:border-accent transition-all duration-200 group"
        >
          <BookOpen className="w-4 h-4 text-muted-foreground group-hover:text-accent-foreground" />
          <span className="text-sm font-medium text-foreground group-hover:text-accent-foreground">
            Dashboard
          </span>
        </Link>

        {/* Logout */}
        <Button
          onClick={logout}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 bg-red hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Cerrar sesión</span>
        </Button>
      </div>
    )
  }

  // =============================
  // Navbar para PROFESOR
  // =============================
  if (role === 'teacher' && userData) {
    const name = userData.nombres?.split(' ')[0] || 'Profesor'
    return (
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full border border-primary/20">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-foreground">
            Bienvenido, {name}
          </span>
        </div>

        <Link
          href="/dashboard/teacher"
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white hover:bg-accent/20 rounded-lg border border-border hover:border-accent transition-all duration-200 group"
        >
          <BookOpen className="w-4 h-4 text-muted-foreground group-hover:text-accent-foreground" />
          <span className="text-sm font-medium text-foreground group-hover:text-accent-foreground">
            Dashboard
          </span>
        </Link>

        <Button
          onClick={logout}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 bg-red hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Cerrar sesión</span>
        </Button>
      </div>
    )
  }

  // =============================
  // Navbar sin sesión
  // =============================
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/sign-in"
        className="inline-flex items-center gap-2 px-6 py-2 font-medium text-primary border-2 border-primary rounded-full bg-white hover:bg-secondary hover:text-white transition-colors duration-300"
      >
        <User className="w-4 h-4" />
        Iniciar sesión
      </Link>
    </div>
  )
}

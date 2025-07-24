'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User, LogOut, BookOpen, GraduationCap, ChevronDown } from 'lucide-react'

// Actualizado useStudent hook integrado directamente
function useStudent(redirectIfNotFound = false) {
  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const stored = localStorage.getItem('student')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setStudent(parsed)
      } catch (err) {
        console.error('Error parsing student from localStorage', err)
        localStorage.removeItem('student')
      }
    } else if (redirectIfNotFound) {
      // Redirect logic here
    }
    setLoading(false)
  }, [redirectIfNotFound, router, pathname])

  const logout = () => {
    localStorage.removeItem('student')
    setStudent(null)
    router.push('/sign-in')
  }

  return { student, loading, logout }
}

export default function NavbarStudent() {
  const { student, logout, loading } = useStudent(true)
  const [authUser, setAuthUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setAuthUser(user || null)
      setAuthLoading(false)
    }

    checkAuth()
  }, [pathname])

  if (loading || authLoading) {
    return (
      <div className="flex items-center gap-4">
        <div className="h-8 w-32 bg-muted animate-pulse rounded-md"></div>
        <div className="h-8 w-20 bg-muted animate-pulse rounded-md"></div>
      </div>
    )
  }

  if (student) {
    return (
      <div className="flex items-center gap-3">
        {/* Welcome Message */}
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full border border-primary/20">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-foreground">
            ¡Hola, <span className="font-semibold text-white">{student.username}</span>!
          </span>
        </div>

        {/* Mobile Welcome */}
        <div className="sm:hidden flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
          <GraduationCap className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary truncate max-w-20">
            {student.username}
          </span>
        </div>

        {/* Dashboard Link */}
        <Link 
          href="/dashboard/student/play" 
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white hover:bg-accent/20 rounded-lg border border-border hover:border-accent transition-all duration-200 group"
        >
          <BookOpen className="w-4 h-4 text-muted-foreground group-hover:text-accent-foreground" />
          <span className="text-sm font-medium text-foreground group-hover:text-accent-foreground">
            Dashboard
          </span>
        </Link>

        {/* Logout Button */}
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

  if (authUser) {
    return (
      <div className="flex items-center gap-3">
        {/* Teacher Welcome */}
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-secondary/10 to-accent/10 rounded-full border border-secondary/20">
          <div className="w-8 h-8 bg-gradient-to-br from-secondary to-accent rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-foreground">
            ¡Hola, <span className="text-white font-semibold">{authUser.email?.split('@')[0]}</span>!
          </span>
        </div>

        {/* Mobile Teacher Welcome */}
        <div className="sm:hidden flex items-center gap-2 px-3 py-1.5 bg-secondary/10 rounded-full">
          <User className="w-4 h-4 text-secondary" />
          <span className="text-sm font-medium text-secondary truncate max-w-20">
            {authUser.email?.split('@')[0]}
          </span>
        </div>

        {/* Dashboard Link */}
        <Link 
          href="/dashboard/teacher" 
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white hover:bg-accent/20 rounded-lg border border-border hover:border-accent transition-all duration-200 group"
        >
          <BookOpen className="w-4 h-4 text-muted-foreground group-hover:text-accent-foreground" />
          <span className="text-sm font-medium text-foreground group-hover:text-accent-foreground">
            Dashboard
          </span>
        </Link>

        {/* Logout Button */}
        <Button
          onClick={async () => {
            await supabase.auth.signOut()
            router.push('/sign-in')
          }}
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
'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { GraduationCap, LogOut, BookOpen, User } from 'lucide-react'
import { useInstitution } from '@/components/institution-provider'
import { createClient } from '@/utils/supabase/client'
import { fetchStudentSession, type StudentSessionData } from '@/lib/student-session-client'

export default function StudentNavbar() {
  const [studentSession, setStudentSession] = useState<StudentSessionData | null>(null)
  const [loading, setLoading] = useState(true)

  const router = useRouter()
  const pathname = usePathname()
  const institution = useInstitution()
  const supabase = createClient()

  const displayName = (
    [studentSession?.first_name, studentSession?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim()
  ) || studentSession?.email?.trim() || "Estudiante"

  useEffect(() => {
    const fetchStudent = async () => {
      setLoading(true)

      const session = await fetchStudentSession(institution?.id)
      setStudentSession(session)
      setLoading(false)
    }

    fetchStudent()
  }, [pathname, institution?.id])

  if (!institution) {
    return null
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setStudentSession(null)
    router.push('/sign-in')
  }

  if (loading) {
    return (
      <div className="flex items-center gap-4">
        <div className="h-8 w-32 bg-muted animate-pulse rounded-md" />
        <div className="h-8 w-20 bg-muted animate-pulse rounded-md" />
      </div>
    )
  }

  if (!studentSession) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-2 px-6 py-2 font-medium text-primary border-2 border-primary rounded-full bg-white hover:bg-secondary hover:text-white transition-colors duration-300"
        >
          <User className="w-4 h-4" />
          Iniciar sesion
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full border border-primary/20">
        <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
          <GraduationCap className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-medium text-foreground">
          Hola, <span className="font-semibold">{displayName}</span>!
        </span>
      </div>

      <Link
        href="/student/play"
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
        className="flex items-center gap-2 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all duration-200"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Cerrar sesion</span>
      </Button>
    </div>
  )
}

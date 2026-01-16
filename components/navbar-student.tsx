'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User, LogOut, BookOpen, GraduationCap, Sparkles } from 'lucide-react'
import { useInstitution } from '@/components/institution-provider'

type Role = 'student' | 'teacher' | 'admin' | null

type EduProfile = {
  id: string
  first_name: string
  last_name: string
  global_role: 'student' | 'teacher' | 'admin' | null
}

type EduMember = {
  id: string
  role: 'student' | 'teacher' | 'admin'
  institution_id: string | null
  classroom_id: string | null
  active: boolean
  created_at: string
}

type StudentSession = {
  id: string
  first_name: string | null
  last_name: string | null
  username: string | null
  classroom_id: string | null
  institution_id: string | null
}

export default function NavbarUser() {
  const [profile, setProfile] = useState<EduProfile | null>(null)
  const [member, setMember] = useState<EduMember | null>(null)
  const [studentSession, setStudentSession] = useState<StudentSession | null>(null)
  const [role, setRole] = useState<Role>(null)
  const [loading, setLoading] = useState(true)

  const router = useRouter()
  const pathname = usePathname()
  const institution = useInstitution()
  const supabase = createClient()

  const displayName = profile ? profile.first_name?.trim() || 'Usuario' : 'Usuario'

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true)

      const studentRes = await fetch('/api/student/session', {
        method: 'GET',
        credentials: 'include',
      })

      if (studentRes.ok) {
        const data = await studentRes.json()
        const student = data.student as StudentSession | null
        if (student) {
          if (institution?.id && student.institution_id && student.institution_id !== institution.id) {
            setStudentSession(null)
            setProfile(null)
            setMember(null)
            setRole(null)
            setLoading(false)
            return
          }
          setStudentSession(student)
          setProfile({
            id: student.id,
            first_name: student.first_name ?? '',
            last_name: student.last_name ?? '',
            global_role: 'student',
          })
          setMember(null)
          setRole('student')
          setLoading(false)
          return
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setProfile(null)
        setMember(null)
        setStudentSession(null)
        setRole(null)
        setLoading(false)
        return
      }

      // 1) Perfil (nombre y rol global)
      const { data: p, error: pErr } = await supabase
        .from('edu_profiles')
        .select('id, first_name, last_name, global_role')
        .eq('id', user.id)
        .maybeSingle()

      if (pErr) {
        console.error('edu_profiles error:', pErr)
      }

      // 2) Membresía (rol real dentro de institución/aula)
      //    Tomamos la más reciente activa (y si hay varias, esta decide)
      let memberQuery = supabase
        .from('edu_institution_members')
        .select('id, role, institution_id, classroom_id, active, created_at')
        .eq('profile_id', user.id)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)

      if (institution?.id) {
        memberQuery = memberQuery.eq('institution_id', institution.id)
      }

      const { data: m, error: mErr } = await memberQuery.maybeSingle()

      if (mErr) {
        console.error('edu_institution_members error:', mErr)
      }

      const resolvedRole: Role =
        (m?.role as Role) ?? (p?.global_role as Role) ?? null

      setProfile((p as EduProfile) ?? null)
      setMember((m as EduMember) ?? null)
      setRole(resolvedRole)
      setStudentSession(null)
      setLoading(false)
    }

    fetchUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, institution?.id])

  if (!institution) {
    return null
  }

  const logout = async () => {
    if (role === 'student') {
      await fetch('/api/student/logout', { method: 'POST' })
    } else {
      await supabase.auth.signOut()
    }
    setProfile(null)
    setMember(null)
    setStudentSession(null)
    setRole(null)
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

  // =============================
  // Navbar para ESTUDIANTE
  // =============================
  if (role === 'student' && profile) {
    return (
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full border border-primary/20">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-foreground">
            ¡Hola, <span className="font-semibold">{displayName}</span>!
          </span>
        </div>

        <Link
          href="/dashboard/student/play"
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
          <span className="hidden sm:inline">Cerrar sesión</span>
        </Button>
      </div>
    )
  }

  // =============================
  // Navbar para PROFESOR
  // =============================
  if (role === 'teacher' && profile) {
    return (
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full border border-primary/20">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-foreground">
            Bienvenido, {displayName}
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
          className="flex items-center gap-2 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Cerrar sesión</span>
        </Button>
      </div>
    )
  }
  if (role === 'admin' && profile) {
    return (
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-full border border-primary/20">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-foreground">
            Bienvenido, {displayName}
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
          className="flex items-center gap-2 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Cerrar sesión</span>
        </Button>
      </div>
    )
  }

  // =============================
  // Navbar sin sesión / sin perfil
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

'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, School, Users, ChevronRight } from 'lucide-react'

type ClassroomRow = {
  id: string
  grade: string
  section: string | null
  academic_year: number
}

type InstitutionRow = {
  id: string
  name: string
  type: 'academia' | 'colegio' | 'universidad'
}

type MembershipRow = {
  classroom_id: string | null
  institution_id: string | null
  edu_classrooms: ClassroomRow | null
  edu_institutions: InstitutionRow | null
}

type ClassroomCard = {
  classroomId: string
  title: string
  subtitle: string
  gradeLabel: string
  institutionName: string
  academicYear: number
}

export default function TeacherDashboard() {
  const supabase = createClient()
  const router = useRouter()

  const [cards, setCards] = useState<ClassroomCard[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const fetchTeacherClassrooms = async () => {
      setLoading(true)
      setErrorMsg(null)

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
      if (sessionErr) {
        setErrorMsg('No se pudo obtener la sesión.')
        setLoading(false)
        return
      }

      const user = sessionData.session?.user
      if (!user) {
        setErrorMsg('No hay sesión activa.')
        setLoading(false)
        return
      }

      // ✅ Nuevo: aulas por membership (role = teacher)
      const { data, error } = await supabase
        .from('edu_institution_members')
        .select(
          `
          classroom_id,
          institution_id,
          edu_classrooms:classroom_id ( id, grade, section, academic_year ),
          edu_institutions:institution_id ( id, name, type )
        `
        )
        .eq('profile_id', user.id)
        .eq('role', 'teacher')
        .eq('active', true)

      if (error) {
        setErrorMsg(error.message ?? 'Error al cargar tus clases.')
        setLoading(false)
        return
      }

      const rows = (data ?? []) as any

      const mapped: ClassroomCard[] = rows
        .map((m:any) => {
          const c = m.edu_classrooms
          if (!c) return null

          const gradeLabel = `Grado ${c.grade}${c.section ? ` - ${c.section}` : ''}`
          const institutionName = m.edu_institutions?.name ?? 'Institución'
          const title = gradeLabel
          const subtitle = `${institutionName} • Año ${c.academic_year}`

          return {
            classroomId: c.id,
            title,
            subtitle,
            gradeLabel,
            institutionName,
            academicYear: c.academic_year,
          }
        })
        .filter(Boolean) as ClassroomCard[]

      // orden: año desc, luego grado/sección
      mapped.sort((a, b) => {
        if (a.academicYear !== b.academicYear) return b.academicYear - a.academicYear
        return a.title.localeCompare(b.title)
      })

      setCards(mapped)
      setLoading(false)
    }

    fetchTeacherClassrooms()
  }, [supabase])

  const grouped = useMemo(() => {
    const map:any = new Map<string, ClassroomCard[]>()
    for (const c of cards) {
      const key = c.institutionName
      map.set(key, [...(map.get(key) ?? []), c])
    }
    return [...map.entries()]
  }, [cards])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="animate-spin w-6 h-6 text-primary" />
        <span className="ml-3 text-lg">Cargando clases...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container py-10">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-4xl font-bold text-primary">📚 Mis Clases</h1>
  
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
            <Users className="w-5 h-5 text-secondary" />
            <div className="text-sm">
              <div className="font-semibold">{cards.length}</div>
              <div className="text-muted-foreground">aulas</div>
            </div>
          </div>
        </div>

        {errorMsg ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-5">
            <p className="text-destructive font-semibold">Ocurrió un error</p>
            <p className="text-muted-foreground mt-1">{errorMsg}</p>
          </div>
        ) : cards.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-border bg-card p-8">
            <p className="text-lg font-semibold">No tienes clases asignadas por ahora.</p>
            <p className="text-muted-foreground mt-2">
              Asegúrate de que en <span className="font-semibold">edu_institution_members</span> exista tu registro con
              role = <span className="font-semibold">teacher</span> y active = true.
            </p>
          </div>
        ) : (
          <div className="mt-10 space-y-10">
            {grouped.map(([institutionName, list]) => (
              <section key={institutionName}>
                <div className="flex items-center gap-2 mb-4">
                  <School className="w-5 h-5 text-accent" />
                  <h2 className="text-xl font-bold">{institutionName}</h2>
                  <span className="text-sm text-muted-foreground">({list.length})</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {list.map((cls:any) => (
                    <div
                      key={cls.classroomId}
                      className="bg-card border border-border rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                    >
                      <div>
                        <h3 className="text-2xl font-semibold mb-2 text-foreground">{cls.title}</h3>
                        <p className="text-sm text-muted-foreground">{cls.subtitle}</p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="inline-block bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full">
                            {cls.gradeLabel}
                          </span>
                          <span className="inline-block bg-muted text-muted-foreground text-xs font-semibold px-3 py-1 rounded-full">
                            Año {cls.academicYear}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => router.push(`/dashboard/teacher/classroom/${cls.classroomId}/performance`)}
                        className="mt-6 bg-primary text-white py-2 px-4 rounded-xl text-sm font-medium hover:bg-primary/90 transition-shadow shadow-sm hover:shadow-md inline-flex items-center justify-center gap-2"
                      >
                        Ir al salón <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

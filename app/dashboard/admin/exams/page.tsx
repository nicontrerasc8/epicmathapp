import Link from "next/link"
import { ArrowRight, ClipboardList, FileText, GraduationCap } from "lucide-react"
import { createClient } from "@/utils/supabase/server"
import { requireInstitution } from "@/lib/institution"
import { EmptyState, PageHeader } from "@/components/dashboard/core"
import { Button } from "@/components/ui/button"

type ClassroomRow = {
  id: string
  grade: string
  section: string | null
  academic_year: number
  active: boolean
}

function getClassroomLabel(classroom: ClassroomRow) {
  return `${classroom.grade}${classroom.section ? ` ${classroom.section}` : ""}`.trim()
}

export default async function AdminExamsPage() {
  const institution = await requireInstitution()
  const supabase = await createClient()

  const [{ data }, { count: examsCount }, { count: assignmentsCount }] = await Promise.all([
    supabase
      .from("edu_classrooms")
      .select("id, grade, section, academic_year, active")
      .eq("institution_id", institution.id)
      .eq("active", true)
      .order("academic_year", { ascending: false })
      .order("grade", { ascending: true })
      .order("section", { ascending: true }),
    supabase
      .from("edu_exams")
      .select("id", { count: "exact", head: true })
      .eq("institution_id", institution.id),
    supabase
      .from("edu_exam_assignments")
      .select("id, edu_classrooms!inner ( institution_id )", { count: "exact", head: true })
      .eq("edu_classrooms.institution_id", institution.id),
  ])

  const classrooms = (data ?? []) as ClassroomRow[]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Examenes"
        description="Modulo admin para gestionar examenes por salon."
        breadcrumbs={[
          { label: "Admin", href: "/dashboard/admin" },
          { label: "Examenes" },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Salones activos</div>
              <div className="text-2xl font-semibold">{classrooms.length}</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Catalogo de examenes</div>
              <div className="text-lg font-semibold">{examsCount ?? 0}</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Asignaciones</div>
              <div className="text-lg font-semibold">{assignmentsCount ?? 0}</div>
            </div>
          </div>
        </div>
      </div>

      {classrooms.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            title="No hay salones activos"
            description="Primero necesitas un salon activo para configurar examenes."
          />
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold">Configurar por salon</h2>
            <p className="text-sm text-muted-foreground">
              Cada salon ya tiene su acceso propio al modulo de examenes.
            </p>
          </div>

          <div className="divide-y">
            {classrooms.map((classroom) => (
              <div
                key={classroom.id}
                className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="font-medium">{getClassroomLabel(classroom)}</div>
                  <div className="text-sm text-muted-foreground">
                    Ano {classroom.academic_year}
                  </div>
                </div>

                <Link href={`/dashboard/admin/classrooms/${classroom.id}/exams`}>
                  <Button variant="outline" className="gap-2">
                    Abrir modulo
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import Link from "next/link"
import { useMemo } from "react"
import { PageHeader, StatusBadge } from "@/components/dashboard/core"

type Institution = {
  id: string
  name: string
  type: string
}

type Classroom = {
  id: string
  institution_id: string
  grade: string
  section?: string | null
  academic_year: number
  active: boolean
}

type Exercise = {
  id: string
  exercise_type: string
  description: string | null
  active: boolean
}

type ExerciseAssignment = {
  classroom_id: string
  exercise_id: string
  active: boolean
}

type Props = {
  institutions: Institution[]
  classrooms: Classroom[]
  exercises: Exercise[]
  assignments: ExerciseAssignment[]
}

function classroomLabel(c: Classroom) {
  const section = c.section ? ` ${c.section}` : ""
  return `${c.grade}${section} (${c.academic_year})`
}

export default function ContentsHierarchyClient({
  institutions,
  classrooms,
  exercises,
  assignments,
}: Props) {
  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>()
    exercises.forEach((e) => map.set(e.id, e))
    return map
  }, [exercises])

  const classroomsByInstitution = useMemo(() => {
    const map = new Map<string, Classroom[]>()
    classrooms.forEach((c) => {
      const list = map.get(c.institution_id) || []
      list.push(c)
      map.set(c.institution_id, list)
    })
    return map
  }, [classrooms])

  const assignmentsByClassroom = useMemo(() => {
    const map = new Map<string, ExerciseAssignment[]>()
    assignments.forEach((a) => {
      const list = map.get(a.classroom_id) || []
      list.push(a)
      map.set(a.classroom_id, list)
    })
    return map
  }, [assignments])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mapa de Contenidos"
        description="Jerarquia: Institucion > Aula > Ejercicio"
        breadcrumbs={[
          { label: "Admin", href: "/dashboard/admin" },
          { label: "Contenidos" },
        ]}
      />

      <div className="rounded-2xl border bg-card p-4">
        <div className="text-sm text-muted-foreground">
          Total Instituciones:{" "}
          <span className="font-semibold text-foreground">{institutions.length}</span>{" "}
          · Aulas:{" "}
          <span className="font-semibold text-foreground">{classrooms.length}</span>{" "}
          · Ejercicios:{" "}
          <span className="font-semibold text-foreground">{exercises.length}</span>{" "}
          · Asignaciones:{" "}
          <span className="font-semibold text-foreground">{assignments.length}</span>
        </div>
      </div>

      <div className="space-y-4">
        {institutions.map((inst) => {
          const instClassrooms = classroomsByInstitution.get(inst.id) || []
          return (
            <details key={inst.id} className="rounded-2xl border bg-card p-4" open>
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">{inst.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{inst.type}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Aulas:{" "}
                    <span className="font-semibold text-foreground">{instClassrooms.length}</span>
                  </div>
                </div>
              </summary>

              <div className="mt-4 space-y-3">
                {instClassrooms.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No hay aulas en esta institucion.
                  </div>
                ) : (
                  instClassrooms.map((classroom) => {
                    const classroomAssignments =
                      assignmentsByClassroom.get(classroom.id) || []
                    const orderedAssignments = [...classroomAssignments].sort((a, b) =>
                      a.exercise_id.localeCompare(b.exercise_id),
                    )

                    return (
                      <details key={classroom.id} className="rounded-xl border bg-background p-4">
                        <summary className="cursor-pointer list-none">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-semibold">{classroomLabel(classroom)}</div>
                              <div className="text-xs text-muted-foreground">
                                Ejercicios asignados: {classroomAssignments.length}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge active={classroom.active} />
                              <Link
                                href={`/dashboard/admin/classrooms/${classroom.id}`}
                                className="text-sm text-primary hover:underline"
                              >
                                Gestionar
                              </Link>
                            </div>
                          </div>
                        </summary>

                        <div className="mt-4 space-y-2">
                          {orderedAssignments.length === 0 ? (
                            <div className="text-sm text-muted-foreground">
                              No hay ejercicios asignados a esta aula.
                            </div>
                          ) : (
                            <ul className="space-y-2 text-sm">
                              {orderedAssignments.map((assignment) => {
                                const exercise = exerciseMap.get(assignment.exercise_id)
                                const label =
                                  exercise?.description ||
                                  exercise?.id ||
                                  assignment.exercise_id
                                return (
                                  <li
                                    key={`${assignment.classroom_id}-${assignment.exercise_id}`}
                                    className="flex items-center justify-between"
                                  >
                                    <div>
                                      <div className="font-medium">{label}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {exercise?.exercise_type || "sin_tipo"}
                                      </div>
                                    </div>
                                    <StatusBadge active={assignment.active} />
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </div>
                      </details>
                    )
                  })
                )}
              </div>
            </details>
          )
        })}

        {institutions.length === 0 && (
          <div className="text-center text-muted-foreground py-10">
            No hay instituciones cargadas.
          </div>
        )}
      </div>
    </div>
  )
}

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
  academic_year: number
  active: boolean
}

type AcademicBlock = {
  id: string
  name: string
  block_type: string
  academic_year: number
  ordering: number | null
  active: boolean
}

type AcademicSubblock = {
  id: string
  block_id: string
  name: string
  ordering: number | null
  active: boolean
}

type Tema = {
  id: string
  name: string
  area_id: string
  subblock_id: string
  ordering: number | null
  active: boolean
}

type Area = {
  id: string
  name: string
}

type Exercise = {
  id: string
  exercise_type: string
  description: string | null
  active: boolean
}

type ExerciseAssignment = {
  exercise_id: string
  tema_id: string
  active: boolean
}

type ClassroomBlock = {
  classroom_id: string
  block_id: string
  active: boolean
}

type ClassroomTemaExercise = {
  classroom_id: string
  tema_id: string
  exercise_id: string
  active: boolean
}

type Props = {
  institutions: Institution[]
  classrooms: Classroom[]
  blocks: AcademicBlock[]
  subblocks: AcademicSubblock[]
  areas: Area[]
  temas: Tema[]
  exercises: Exercise[]
  assignments: ExerciseAssignment[]
  classroomBlocks: ClassroomBlock[]
  classroomTemaExercises: ClassroomTemaExercise[]
}

function classroomLabel(c: Classroom) {
  return `${c.grade} (${c.academic_year})`
}

export default function ContentsHierarchyClient({
  institutions,
  classrooms,
  blocks,
  subblocks,
  areas,
  temas,
  exercises,
  assignments,
  classroomBlocks,
  classroomTemaExercises,
}: Props) {
  const areasMap = useMemo(() => new Map(areas.map(a => [a.id, a.name])), [areas])
  const exerciseMap = useMemo(
    () => new Map(exercises.map(e => [e.id, e.description || e.id])),
    [exercises]
  )

  const classroomsByInstitution = useMemo(() => {
    const map = new Map<string, Classroom[]>()
    classrooms.forEach(c => {
      const list = map.get(c.institution_id) || []
      list.push(c)
      map.set(c.institution_id, list)
    })
    return map
  }, [classrooms])

  const blocksByClassroom = useMemo(() => {
    const map = new Map<string, ClassroomBlock[]>()
    classroomBlocks.forEach(cb => {
      const list = map.get(cb.classroom_id) || []
      list.push(cb)
      map.set(cb.classroom_id, list)
    })
    return map
  }, [classroomBlocks])

  const subblocksByBlock = useMemo(() => {
    const map = new Map<string, AcademicSubblock[]>()
    subblocks.forEach(s => {
      const list = map.get(s.block_id) || []
      list.push(s)
      map.set(s.block_id, list)
    })
    return map
  }, [subblocks])

  const temasBySubblock = useMemo(() => {
    const map = new Map<string, Tema[]>()
    temas.forEach(t => {
      const list = map.get(t.subblock_id) || []
      list.push(t)
      map.set(t.subblock_id, list)
    })
    return map
  }, [temas])

  const exercisesByTema = useMemo(() => {
    const map = new Map<string, ExerciseAssignment[]>()
    assignments.forEach(a => {
      const list = map.get(a.tema_id) || []
      list.push(a)
      map.set(a.tema_id, list)
    })
    return map
  }, [assignments])

  const classroomExercisesByTema = useMemo(() => {
    const map = new Map<string, ClassroomTemaExercise[]>()
    classroomTemaExercises.forEach(cte => {
      const key = `${cte.classroom_id}:${cte.tema_id}`
      const list = map.get(key) || []
      list.push(cte)
      map.set(key, list)
    })
    return map
  }, [classroomTemaExercises])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mapa de Contenidos"
        description="Jerarquia completa: Institucion > Aula > Bloque > Sub-bloque > Tema > Ejercicio"
        breadcrumbs={[
          { label: "Admin", href: "/dashboard/admin" },
          { label: "Contenidos" },
        ]}
      />

      <div className="rounded-2xl border bg-card p-4">
        <div className="text-sm text-muted-foreground">
          Total Instituciones: <span className="font-semibold text-foreground">{institutions.length}</span>{" "}
          · Aulas: <span className="font-semibold text-foreground">{classrooms.length}</span>{" "}
          · Bloques: <span className="font-semibold text-foreground">{blocks.length}</span>{" "}
          · Temas: <span className="font-semibold text-foreground">{temas.length}</span>{" "}
          · Ejercicios: <span className="font-semibold text-foreground">{exercises.length}</span>
        </div>
      </div>

      <div className="space-y-4">
        {institutions.map(inst => {
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
                    Aulas: <span className="font-semibold text-foreground">{instClassrooms.length}</span>
                  </div>
                </div>
              </summary>

              <div className="mt-4 space-y-3">
                {instClassrooms.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No hay aulas en esta institucion.</div>
                ) : (
                  instClassrooms.map(classroom => {
                    const classroomBlocks = blocksByClassroom.get(classroom.id) || []
                    return (
                      <details key={classroom.id} className="rounded-xl border bg-background p-4">
                        <summary className="cursor-pointer list-none">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-semibold">{classroomLabel(classroom)}</div>
                              <div className="text-xs text-muted-foreground">
                                Bloques asignados: {classroomBlocks.length}
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

                        <div className="mt-4 space-y-3">
                          {classroomBlocks.length === 0 ? (
                            <div className="text-sm text-muted-foreground">
                              No hay bloques asignados a este aula.
                            </div>
                          ) : (
                            classroomBlocks.map(cb => {
                              const block = blocks.find(b => b.id === cb.block_id)
                              if (!block) return null
                              const blockSubblocks = subblocksByBlock.get(block.id) || []

                              return (
                                <details key={cb.block_id} className="rounded-xl border bg-card p-4">
                                  <summary className="cursor-pointer list-none">
                                    <div className="flex items-center justify-between gap-3">
                                      <div>
                                        <div className="font-semibold">{block.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {block.block_type} · {block.academic_year} · Sub-bloques: {blockSubblocks.length}
                                        </div>
                                      </div>
                                      <StatusBadge active={cb.active} />
                                    </div>
                                  </summary>

                                  <div className="mt-4 space-y-3">
                                    {blockSubblocks.length === 0 ? (
                                      <div className="text-sm text-muted-foreground">
                                        No hay sub-bloques en este bloque.
                                      </div>
                                    ) : (
                                      blockSubblocks.map(sub => {
                                        const subTemas = temasBySubblock.get(sub.id) || []

                                        return (
                                          <details key={sub.id} className="rounded-xl border bg-background p-4">
                                            <summary className="cursor-pointer list-none">
                                              <div className="flex items-center justify-between gap-3">
                                                <div>
                                                  <div className="font-semibold">{sub.name}</div>
                                                  <div className="text-xs text-muted-foreground">
                                                    Temas: {subTemas.length}
                                                  </div>
                                                </div>
                                                <StatusBadge active={sub.active} />
                                              </div>
                                            </summary>

                                            <div className="mt-4 space-y-3">
                                              {subTemas.length === 0 ? (
                                                <div className="text-sm text-muted-foreground">
                                                  No hay temas en este sub-bloque.
                                                </div>
                                              ) : (
                                                subTemas.map(tema => {
                                                  const temaExercises = exercisesByTema.get(tema.id) || []
                                                  const classroomTemaKey = `${classroom.id}:${tema.id}`
                                                  const classroomExercises = classroomExercisesByTema.get(classroomTemaKey) || []

                                                  return (
                                                    <details key={tema.id} className="rounded-xl border bg-card p-4">
                                                      <summary className="cursor-pointer list-none">
                                                        <div className="flex items-center justify-between gap-3">
                                                          <div>
                                                            <div className="font-semibold">{tema.name}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                              Area: {areasMap.get(tema.area_id) || "Sin area"}
                                                            </div>
                                                          </div>
                                                          <div className="text-xs text-muted-foreground">
                                                            Ejercicios aula:{" "}
                                                            <span className="font-semibold text-foreground">
                                                              {classroomExercises.length}
                                                            </span>{" "}
                                                            · Global:{" "}
                                                            <span className="font-semibold text-foreground">
                                                              {temaExercises.length}
                                                            </span>
                                                          </div>
                                                        </div>
                                                      </summary>

                                                      <div className="mt-4 space-y-2">
                                                        {classroomExercises.length === 0 ? (
                                                          <div className="text-sm text-muted-foreground">
                                                            No hay ejercicios asignados a este tema en el aula.
                                                          </div>
                                                        ) : (
                                                          <ul className="space-y-2 text-sm">
                                                            {classroomExercises.map(ex => (
                                                              <li key={`${ex.classroom_id}-${ex.exercise_id}`} className="flex items-center justify-between">
                                                                <span>{exerciseMap.get(ex.exercise_id) || ex.exercise_id}</span>
                                                                <StatusBadge active={ex.active} />
                                                              </li>
                                                            ))}
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
                                      })
                                    )}
                                  </div>
                                </details>
                              )
                            })
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

"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { PageHeader, StatCard, StatCardGrid } from "@/components/dashboard/core"
import { useInstitution } from "@/components/institution-provider"

type AttemptRow = {
  student_id: string
  exercise_id: string
  correct: boolean
  time_seconds: number | null
  created_at: string
}

type StudentRow = {
  student_id: string
  name: string
  attempts: number
  correct: number
  incorrect: number
  accuracy: number
  last_attempt: string | null
}

type ExerciseRow = {
  exercise_id: string
  label: string
  type: string
  attempts: number
  correct: number
  incorrect: number
  accuracy: number
  students: number
}

export default function PerformancePage() {
  const params = useParams() as { id?: string }
  const classroomId = params?.id
  const institution = useInstitution()
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [exercises, setExercises] = useState<ExerciseRow[]>([])

  useEffect(() => {
    if (!classroomId) return

    const load = async () => {
      setLoading(true)

      const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      let membersQuery = supabase
        .from("edu_institution_members")
        .select("profile_id, edu_profiles ( first_name, last_name )")
        .eq("classroom_id", classroomId)
        .eq("role", "student")
        .eq("active", true)

      if (institution?.id) {
        membersQuery = membersQuery.eq("institution_id", institution.id)
      }

      const [{ data: members }, { data: assignments }, { data: attempts }] =
        await Promise.all([
          membersQuery,
          supabase
            .from("edu_exercise_assignments")
            .select("exercise:edu_exercises ( id, description, exercise_type )")
            .eq("classroom_id", classroomId)
            .eq("active", true),
          (() => {
            let attemptsQuery = supabase
              .from("edu_student_exercises")
              .select("student_id, exercise_id, correct, time_seconds, created_at")
              .eq("classroom_id", classroomId)
              .gte("created_at", since30)

            if (institution?.id) {
              attemptsQuery = attemptsQuery.eq("institution_id", institution.id)
            }

            return attemptsQuery
          })(),
        ])

      const studentNameMap = new Map<string, string>()
      ;(members || []).forEach((row: any) => {
        const profile = Array.isArray(row.edu_profiles) ? row.edu_profiles[0] : row.edu_profiles
        const fullName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim()
        studentNameMap.set(row.profile_id, fullName || row.profile_id)
      })

      const exerciseMap = new Map<string, { label: string; type: string }>()
      ;(assignments || []).forEach((row: any) => {
        const exercise = Array.isArray(row.exercise) ? row.exercise[0] : row.exercise
        if (!exercise?.id) return
        const label = exercise.description || exercise.id
        exerciseMap.set(exercise.id, {
          label,
          type: exercise.exercise_type || "sin_tipo",
        })
      })

      const byStudent = new Map<string, StudentRow>()
      const byExercise = new Map<string, ExerciseRow>()

      ;((attempts || []) as AttemptRow[]).forEach((row) => {
        const studentName = studentNameMap.get(row.student_id) || row.student_id
        const exerciseInfo = exerciseMap.get(row.exercise_id) || {
          label: row.exercise_id,
          type: "sin_tipo",
        }

        const student = byStudent.get(row.student_id) || {
          student_id: row.student_id,
          name: studentName,
          attempts: 0,
          correct: 0,
          incorrect: 0,
          accuracy: 0,
          last_attempt: null,
        }

        const exercise = byExercise.get(row.exercise_id) || {
          exercise_id: row.exercise_id,
          label: exerciseInfo.label,
          type: exerciseInfo.type,
          attempts: 0,
          correct: 0,
          incorrect: 0,
          accuracy: 0,
          students: 0,
        }

        student.attempts += 1
        exercise.attempts += 1
        if (row.correct) {
          student.correct += 1
          exercise.correct += 1
        } else {
          student.incorrect += 1
          exercise.incorrect += 1
        }

        if (!student.last_attempt || new Date(row.created_at) > new Date(student.last_attempt)) {
          student.last_attempt = row.created_at
        }

        byStudent.set(row.student_id, student)
        byExercise.set(row.exercise_id, exercise)
      })

      const studentsList = Array.from(byStudent.values()).map((row) => ({
        ...row,
        accuracy: row.attempts ? Math.round((row.correct / row.attempts) * 100) : 0,
      }))

      const exercisesList = Array.from(byExercise.values()).map((row) => ({
        ...row,
        accuracy: row.attempts ? Math.round((row.correct / row.attempts) * 100) : 0,
      }))

      exercisesList.forEach((exercise) => {
        const studentSet = new Set<string>()
        ;((attempts || []) as AttemptRow[])
          .filter((row) => row.exercise_id === exercise.exercise_id)
          .forEach((row) => studentSet.add(row.student_id))
        exercise.students = studentSet.size
      })

      setStudents(studentsList)
      setExercises(exercisesList)
      setLoading(false)
    }

    load()
  }, [classroomId, supabase, institution?.id])

  const totalAttempts = useMemo(() => {
    return students.reduce((acc, row) => acc + row.attempts, 0)
  }, [students])

  const totalCorrect = useMemo(() => {
    return students.reduce((acc, row) => acc + row.correct, 0)
  }, [students])

  const accuracy = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => b.accuracy - a.accuracy)
  }, [students])

  const sortedExercises = useMemo(() => {
    return [...exercises].sort((a, b) => b.attempts - a.attempts)
  }, [exercises])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rendimiento del Aula"
        description="Resumen de los ultimos 30 dias por estudiante y ejercicio"
        breadcrumbs={[
          { label: "Mis Clases", href: "/dashboard/teacher" },
          { label: "Aula", href: `/dashboard/teacher/classroom/${classroomId}` },
          { label: "Rendimiento" },
        ]}
      />

      <StatCardGrid columns={3}>
        <StatCard
          title="Intentos (30 dias)"
          value={totalAttempts}
          variant="default"
        />
        <StatCard
          title="Precision"
          value={accuracy}
          suffix="%"
          variant={accuracy >= 70 ? "success" : accuracy >= 50 ? "warning" : "danger"}
        />
        <StatCard
          title="Estudiantes activos"
          value={students.length}
          variant="default"
        />
      </StatCardGrid>

      {loading ? (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          Cargando rendimiento...
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="text-lg font-semibold mb-4">Estudiantes</h2>
            {sortedStudents.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No hay intentos registrados en los ultimos 30 dias.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2">Estudiante</th>
                      <th className="py-2">Intentos</th>
                      <th className="py-2">Precision</th>
                      <th className="py-2">Ultimo intento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStudents.map((row) => (
                      <tr key={row.student_id} className="border-b last:border-b-0">
                        <td className="py-2">{row.name}</td>
                        <td className="py-2">{row.attempts}</td>
                        <td className="py-2">{row.accuracy}%</td>
                        <td className="py-2">
                          {row.last_attempt
                            ? new Date(row.last_attempt).toLocaleDateString()
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <h2 className="text-lg font-semibold mb-4">Ejercicios</h2>
            {sortedExercises.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No hay ejercicios con intentos en los ultimos 30 dias.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2">Ejercicio</th>
                      <th className="py-2">Intentos</th>
                      <th className="py-2">Precision</th>
                      <th className="py-2">Estudiantes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedExercises.map((row) => (
                      <tr key={row.exercise_id} className="border-b last:border-b-0">
                        <td className="py-2">
                          <div className="font-medium">{row.label}</div>
                          <div className="text-xs text-muted-foreground">{row.type}</div>
                        </td>
                        <td className="py-2">{row.attempts}</td>
                        <td className="py-2">{row.accuracy}%</td>
                        <td className="py-2">{row.students}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

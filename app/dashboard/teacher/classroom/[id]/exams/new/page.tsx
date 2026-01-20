"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { PageHeader } from "@/components/dashboard/core"
import { Button } from "@/components/ui/button"
import { Save } from "lucide-react"

interface ExerciseOption {
  id: string
  description: string | null
  exercise_type: string
}

export default function NewExamPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const classroomId = params.id as string

  const [exercises, setExercises] = useState<ExerciseOption[]>([])
  const [selectedExerciseId, setSelectedExerciseId] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      // Fetch exercises assigned to this classroom
      const { data } = await supabase
        .from("edu_exercise_assignments")
        .select(`
          exercise:edu_exercises ( id, description, exercise_type )
        `)
        .eq("classroom_id", classroomId)
        .eq("active", true)

      if (data) {
        setExercises(data.map((row: any) => {
          const exercise = Array.isArray(row.exercise) ? row.exercise[0] : row.exercise
          return {
            id: exercise?.id,
            description: exercise?.description ?? null,
            exercise_type: exercise?.exercise_type ?? "sin_tipo",
          }
        }).filter((e: any) => Boolean(e.id)))
      }
      setLoading(false)
    }
    fetchData()
  }, [classroomId])

  const handleCreate = async () => {
    if (!selectedExerciseId) return
    setSaving(true)

    const exercise = exercises.find(t => t.id === selectedExerciseId)

    // Fetch classroom grade if needed for quizzes table
    const { data: cls } = await supabase
      .from("edu_classrooms")
      .select("grade")
      .eq("id", classroomId)
      .single()

    const { error } = await supabase.from("quizzes").insert([
      {
        title: exercise?.description || exercise?.id || "Examen",
        description,
        classroom_id: classroomId,
        grade_target: cls?.grade
      }
    ])

    if (!error) {
      router.push(`/dashboard/teacher/classroom/${classroomId}/exams`)
    } else {
      console.error(error)
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo Examen"
        breadcrumbs={[
          { label: "Mis Clases", href: "/dashboard/teacher" },
          { label: "Aula", href: `/dashboard/teacher/classroom/${classroomId}` },
          { label: "Exámenes", href: `/dashboard/teacher/classroom/${classroomId}/exams` },
          { label: "Nuevo" },
        ]}
      />

      <div className="max-w-xl bg-card border rounded-xl p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Ejercicio</label>
          <select
            value={selectedExerciseId}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
            className="w-full p-2 rounded-md border bg-background"
            disabled={loading}
          >
            <option value="">Selecciona un ejercicio</option>
            {exercises.map((t) => (
              <option key={t.id} value={t.id}>
                {(t.description || t.id)} - {t.exercise_type}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Descripción (Opcional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 rounded-md border bg-background min-h-[100px]"
            placeholder="Instrucciones para el examen..."
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleCreate} disabled={!selectedExerciseId || saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Guardando..." : "Crear Examen"}
          </Button>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import {
  PageHeader,
  DataTable,
  StatusBadge,
  type ColumnDef
} from "@/components/dashboard/core"

interface ClassroomExercise {
  id: string
  active: boolean
  exercise: {
    question: string
    difficulty: string
  }
}

const columns: ColumnDef<ClassroomExercise>[] = [
  {
    key: "question",
    header: "Pregunta",
    render: (_, row) => (
      <div className="font-medium truncate max-w-md">
        {row.exercise.question}
      </div>
    ),
  },
  {
    key: "difficulty",
    header: "Dificultad",
    render: (_, row) => (
      <span className="capitalize text-sm text-muted-foreground">
        {row.exercise.difficulty}
      </span>
    ),
  },
  {
    key: "active",
    header: "Estado",
    render: (val) => <StatusBadge active={val} />,
  },
]

export default function ClassroomExercisesPage() {
  const params = useParams()
  const classroomId = params.classroomId as string
  const [loading, setLoading] = useState(true)
  const [exercises, setExercises] = useState<ClassroomExercise[]>([])

  useEffect(() => {
    const fetchExercises = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("edu_classroom_tema_exercises")
        .select(`
          id,
          active,
          exercise:edu_exercises ( question, difficulty )
        `)
        .eq("classroom_id", classroomId)

      if (data) {
        setExercises(data.map((e: any) => ({
          id: e.id,
          active: e.active,
          exercise: e.exercise
        })))
      }
      setLoading(false)
    }
    fetchExercises()
  }, [classroomId])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ejercicios Asignados"
        breadcrumbs={[
          { label: "Admin", href: "/dashboard/admin" },
          { label: "Aulas", href: "/dashboard/admin/classrooms" },
          { label: "Detalle", href: `/dashboard/admin/classrooms/${classroomId}` },
          { label: "Ejercicios" },
        ]}
      />

      <DataTable
        columns={columns}
        data={exercises}
        loading={loading}
        emptyState={{
          title: "ejercicios",
          description: "No hay ejercicios asignados a esta aula."
        }}
      />
    </div>
  )
}

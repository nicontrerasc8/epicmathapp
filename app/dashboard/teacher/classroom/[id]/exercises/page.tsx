"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import {
  PageHeader,
  DataTable,
  RowActionsMenu,
  StatusBadge,
  type ColumnDef,
} from "@/components/dashboard/core"
import { Input } from "@/components/ui/input"
import { useInstitution } from "@/components/institution-provider"

type ClassroomExercise = {
  id: string
  active: boolean
  created_at: string
  exercise: {
    id: string
    exercise_type: string
    description: string | null
    institution_id: string | null
  } | null
}

const columns: ColumnDef<ClassroomExercise>[] = [
  {
    key: "exercise",
    header: "Ejercicio",
    render: (_, row) => (
      <div>
        <div className="font-medium">{row.exercise?.description || row.exercise?.id || "Sin descripcion"}</div>
        <div className="text-xs text-muted-foreground">{row.exercise?.exercise_type || "Sin tipo"}</div>
      </div>
    ),
  },
  {
    key: "active",
    header: "Estado",
    render: (value) => <StatusBadge active={Boolean(value)} />,
  },
  {
    key: "created_at",
    header: "Asignado",
    render: (value) => new Date(value).toLocaleDateString(),
  },
]

export default function TeacherClassroomExercisesPage() {
  const params = useParams()
  const classroomId = params.id as string
  const institution = useInstitution()

  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [classroomLabel, setClassroomLabel] = useState("Aula")
  const [exercises, setExercises] = useState<ClassroomExercise[]>([])
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const fetchData = async () => {
    if (!classroomId) return

    const supabase = createClient()
    setLoading(true)

    const [{ data: classroom }, { data: assignments, error }] = await Promise.all([
      supabase
        .from("edu_classrooms")
        .select("grade, section")
        .eq("id", classroomId)
        .single(),
      supabase
        .from("edu_exercise_assignments")
        .select(`
          id,
          active,
          created_at,
          exercise:edu_exercises ( id, exercise_type, description, institution_id )
        `)
        .eq("classroom_id", classroomId)
        .order("created_at", { ascending: false }),
    ])

    if (classroom?.grade) {
      setClassroomLabel(`${classroom.grade}${classroom.section ? ` ${classroom.section}` : ""}`.trim())
    }

    if (error) {
      setMessage({ type: "error", text: "No se pudieron cargar los ejercicios del salon." })
      setLoading(false)
      return
    }

    const rows: ClassroomExercise[] = (assignments || [])
      .map((row: any) => {
        const exercise = Array.isArray(row.exercise) ? row.exercise[0] : row.exercise
        return {
          id: row.id,
          active: Boolean(row.active),
          created_at: row.created_at,
          exercise: exercise ?? null,
        }
      })
      .filter((row) => {
        if (!institution?.id) return true
        return !row.exercise?.institution_id || row.exercise.institution_id === institution.id
      })

    setExercises(rows)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [classroomId, institution?.id])

  const filteredExercises = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return exercises

    return exercises.filter((row) => {
      const description = row.exercise?.description?.toLowerCase() || ""
      const type = row.exercise?.exercise_type?.toLowerCase() || ""
      const id = row.exercise?.id?.toLowerCase() || ""
      return description.includes(needle) || type.includes(needle) || id.includes(needle)
    })
  }, [exercises, search])

  const toggleAssignment = async (row: ClassroomExercise) => {
    const nextActive = !row.active
    setUpdatingId(row.id)
    setMessage(null)

    const supabase = createClient()
    const { error } = await supabase
      .from("edu_exercise_assignments")
      .update({ active: nextActive })
      .eq("id", row.id)
      .eq("classroom_id", classroomId)

    if (error) {
      setMessage({ type: "error", text: "No se pudo actualizar el estado del ejercicio." })
      setUpdatingId(null)
      return
    }

    setExercises((prev) => prev.map((item) => (item.id === row.id ? { ...item, active: nextActive } : item)))
    setMessage({
      type: "success",
      text: `Ejercicio ${nextActive ? "activado" : "desactivado"} correctamente.`,
    })
    setUpdatingId(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ejercicios del salon"
        description={`Gestiona los ejercicios disponibles para ${classroomLabel}`}
        breadcrumbs={[
          { label: "Mis Clases", href: "/dashboard/teacher" },
          { label: classroomLabel, href: `/dashboard/teacher/classroom/${classroomId}` },
          { label: "Ejercicios" },
        ]}
      />

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar por descripcion, tipo o ID..."
      />

      {message && (
        <div
          className={`rounded-md border p-3 text-sm ${
            message.type === "error"
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredExercises}
        loading={loading}
        emptyState={{
          title: "ejercicios",
          description: "No hay ejercicios asignados a este salon.",
        }}
        rowActions={(row) => (
          <RowActionsMenu
            actions={[
              {
                label: updatingId === row.id ? "Actualizando..." : row.active ? "Desactivar" : "Activar",
                onClick: () => {
                  if (updatingId) return
                  toggleAssignment(row)
                },
              },
            ]}
          />
        )}
      />
    </div>
  )
}


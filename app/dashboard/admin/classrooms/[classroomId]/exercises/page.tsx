"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import {
  PageHeader,
  DataTable,
  RowActionsMenu,
  StatusBadge,
  type ColumnDef
} from "@/components/dashboard/core"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

interface ClassroomExercise {
  id: string
  active: boolean
  exercise: {
    id: string
    exercise_type: string
    description: string | null
  } | null
}

interface ExerciseOption {
  id: string
  exercise_type: string
  description: string | null
}

type Message = {
  type: "success" | "error"
  text: string
}

const pageSizeOptions = [10, 20, 50, 100]

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
    render: (val) => <StatusBadge active={val} />,
  },
]

export default function ClassroomExercisesPage() {
  const params = useParams()
  const classroomId = params.classroomId as string
  const [loading, setLoading] = useState(true)
  const [exercises, setExercises] = useState<ClassroomExercise[]>([])
  const [exerciseOptions, setExerciseOptions] = useState<ExerciseOption[]>([])
  const [message, setMessage] = useState<Message | null>(null)
  const [search, setSearch] = useState("")
  const [pageSize, setPageSize] = useState(pageSizeOptions[0])
  const [page, setPage] = useState(1)

  const [form, setForm] = useState({
    exercise_id: "",
    active: true,
  })

  useEffect(() => {
    const fetchExercises = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("edu_exercise_assignments")
        .select(`
          id,
          active,
          exercise:edu_exercises ( id, exercise_type, description )
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

    const fetchExerciseOptions = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("edu_exercises")
        .select("id, exercise_type, description")
        .eq("active", true)
        .order("created_at", { ascending: false })

      if (data) {
        setExerciseOptions(data as ExerciseOption[])
      }
    }

    fetchExercises()
    fetchExerciseOptions()
  }, [classroomId])

  useEffect(() => {
    setPage(1)
  }, [search, pageSize])

  const filteredExercises = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return exercises
    return exercises.filter((row) => {
      const exerciseDesc = row.exercise?.description || ""
      const exerciseType = row.exercise?.exercise_type || ""
      const exerciseId = row.exercise?.id || ""
      return (
        exerciseDesc.toLowerCase().includes(needle) ||
        exerciseType.toLowerCase().includes(needle) ||
        exerciseId.toLowerCase().includes(needle)
      )
    })
  }, [exercises, search])

  const pagedExercises = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredExercises.slice(start, start + pageSize)
  }, [filteredExercises, page, pageSize])

  async function refreshExercises() {
    const supabase = createClient()
    const { data } = await supabase
      .from("edu_exercise_assignments")
      .select(`
        id,
        active,
        exercise:edu_exercises ( id, exercise_type, description )
      `)
      .eq("classroom_id", classroomId)

    if (data) {
      setExercises(data.map((e: any) => ({
        id: e.id,
        active: e.active,
        exercise: e.exercise
      })))
    }
  }

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

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-[220px] flex-1">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por ejercicio..."
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Items por pagina</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={pagedExercises}
            loading={loading}
            emptyState={{
              title: "ejercicios",
              description: "No hay ejercicios asignados a esta aula."
            }}
            pagination={{
              page,
              pageSize,
              total: filteredExercises.length,
            }}
            onPageChange={setPage}
            rowActions={(row) => (
              <RowActionsMenu
                actions={[
                  {
                    label: row.active ? "Desactivar" : "Activar",
                    onClick: async () => {
                      const supabase = createClient()
                      await supabase
                        .from("edu_exercise_assignments")
                        .update({ active: !row.active })
                        .eq("id", row.id)
                      await refreshExercises()
                    },
                  },
                    {
                      label: "Eliminar",
                      variant: "destructive",
                      onClick: async () => {
                        const supabase = createClient()
                        await supabase
                          .from("edu_exercise_assignments")
                          .delete()
                          .eq("id", row.id)
                        await refreshExercises()
                    },
                  },
                ]}
              />
            )}
          />
        </div>

        <form
          className="space-y-4 rounded-xl border bg-card p-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setMessage(null)

            if (!form.exercise_id) {
              setMessage({ type: "error", text: "Selecciona un ejercicio." })
              return
            }

            const exists = exercises.some(
              (row) => row.exercise?.id === form.exercise_id
            )
            if (exists) {
              setMessage({ type: "error", text: "Este ejercicio ya esta asignado al aula." })
              return
            }

            const supabase = createClient()
            const { error } = await supabase
              .from("edu_exercise_assignments")
              .insert({
                classroom_id: classroomId,
                exercise_id: form.exercise_id,
                active: form.active,
              })

            if (error) {
              setMessage({ type: "error", text: error.message || "No se pudo asignar." })
              return
            }

            await refreshExercises()
            setForm({
              exercise_id: "",
              active: true,
            })
            setMessage({ type: "success", text: "Ejercicio asignado." })
          }}
        >
          <div className="text-sm font-medium">Asignar ejercicio al aula</div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Ejercicio</label>
            <select
              value={form.exercise_id}
              onChange={(e) => setForm((s) => ({ ...s, exercise_id: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecciona un ejercicio</option>
              {exerciseOptions.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {(exercise.description || exercise.id)} - {exercise.exercise_type}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.active}
              onCheckedChange={(val) => setForm((s) => ({ ...s, active: Boolean(val) }))}
            />
            Activo
          </label>

          {message && (
            <div
              className={`rounded-md border p-3 text-sm ${
                message.type === "error"
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="submit">Asignar</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setForm({
                  exercise_id: "",
                  active: true,
                })
                setMessage(null)
              }}
            >
              Limpiar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

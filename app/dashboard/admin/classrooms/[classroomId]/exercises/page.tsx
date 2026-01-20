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
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

/* =========================
   Types
========================= */
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

/* =========================
   Table columns
========================= */
const columns: ColumnDef<ClassroomExercise>[] = [
  {
    key: "exercise",
    header: "Ejercicio",
    render: (_, row) => (
      <div>
        <div className="font-medium">
          {row.exercise?.description || row.exercise?.id || "Sin descripción"}
        </div>
        <div className="text-xs text-muted-foreground">
          {row.exercise?.exercise_type || "Sin tipo"}
        </div>
      </div>
    ),
  },
  {
    key: "active",
    header: "Estado",
    render: (val) => <StatusBadge active={val} />,
  },
]

/* =========================
   Page
========================= */
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

  /* ---------- form state ---------- */
  const [form, setForm] = useState({
    exercise_id: "",
    active: true,
  })

  const [createMode, setCreateMode] = useState(false)
  const [assignToGrade, setAssignToGrade] = useState(false)

  const [newExercise, setNewExercise] = useState({
    description: "",
    exercise_type: "",
  })

  /* =========================
     Data loading
  ========================= */
  useEffect(() => {
    const supabase = createClient()

    const fetchExercises = async () => {
      const { data } = await supabase
        .from("edu_exercise_assignments")
        .select(`
          id,
          active,
          exercise:edu_exercises ( id, exercise_type, description )
        `)
        .eq("classroom_id", classroomId)

      if (data) {
        setExercises(
          data.map((e: any) => ({
            id: e.id,
            active: e.active,
            exercise: e.exercise,
          }))
        )
      }
      setLoading(false)
    }

    const fetchExerciseOptions = async () => {
      const { data } = await supabase
        .from("edu_exercises")
        .select("id, exercise_type, description")
        .eq("active", true)
        .order("created_at", { ascending: false })

      if (data) setExerciseOptions(data)
    }

    fetchExercises()
    fetchExerciseOptions()
  }, [classroomId])

  const refreshExercises = async () => {
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
      setExercises(
        data.map((e: any) => ({
          id: e.id,
          active: e.active,
          exercise: e.exercise,
        }))
      )
    }
  }

  /* =========================
     Filtering & paging
  ========================= */
  useEffect(() => setPage(1), [search, pageSize])

  const filteredExercises = useMemo(() => {
    const needle = search.toLowerCase().trim()
    if (!needle) return exercises

    return exercises.filter((r) => {
      const d = r.exercise?.description ?? ""
      const t = r.exercise?.exercise_type ?? ""
      const i = r.exercise?.id ?? ""
      return (
        d.toLowerCase().includes(needle) ||
        t.toLowerCase().includes(needle) ||
        i.toLowerCase().includes(needle)
      )
    })
  }, [exercises, search])

  const pagedExercises = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredExercises.slice(start, start + pageSize)
  }, [filteredExercises, page, pageSize])

  /* =========================
     Submit handler
  ========================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    const supabase = createClient()
    let exerciseId = form.exercise_id

    /* ---- create exercise if needed ---- */
    if (createMode) {
      if (!newExercise.description || !newExercise.exercise_type) {
        setMessage({
          type: "error",
          text: "Completa la descripción y el tipo del ejercicio.",
        })
        return
      }

      const { data, error } = await supabase
        .from("edu_exercises")
        .insert({
          description: newExercise.description,
          exercise_type: newExercise.exercise_type,
          active: true,
        })
        .select("id")
        .single()

      if (error || !data) {
        setMessage({ type: "error", text: "No se pudo crear el ejercicio." })
        return
      }

      exerciseId = data.id
    } else {
      if (!exerciseId) {
        setMessage({ type: "error", text: "Selecciona un ejercicio." })
        return
      }
    }

    /* ---- RPC assignment ---- */
    const { error } = await supabase.rpc("assign_exercise_to_classrooms", {
      p_classroom_id: classroomId,
      p_exercise_id: exerciseId,
      p_assign_to_grade: assignToGrade,
      p_active: form.active,
    })

    if (error) {
      setMessage({ type: "error", text: error.message })
      return
    }

    await refreshExercises()

    setMessage({ type: "success", text: "Ejercicio asignado correctamente." })
    setForm({ exercise_id: "", active: true })
    setNewExercise({ description: "", exercise_type: "" })
    setAssignToGrade(false)
    setCreateMode(false)
  }

  /* =========================
     Render
  ========================= */
  return (
    <div className="space-y-6">
      <PageHeader
        title="Ejercicios asignados"
        breadcrumbs={[
          { label: "Admin", href: "/dashboard/admin" },
          { label: "Aulas", href: "/dashboard/admin/classrooms" },
          { label: "Detalle", href: `/dashboard/admin/classrooms/${classroomId}` },
          { label: "Ejercicios" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* ================= TABLE ================= */}
        <div className="space-y-3">
          <div className="flex gap-3 items-center">
            <Input
              placeholder="Buscar ejercicio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-9 rounded-md border px-2 text-sm bg-white"
            >
              {pageSizeOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <DataTable
            columns={columns}
            data={pagedExercises}
            loading={loading}
            pagination={{ page, pageSize, total: filteredExercises.length }}
            onPageChange={setPage}
            emptyState={{
              title: "Ejercicios",
              description: "No hay ejercicios asignados.",
            }}
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
                      refreshExercises()
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
                      refreshExercises()
                    },
                  },
                ]}
              />
            )}
          />
        </div>

        {/* ================= FORM ================= */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border bg-card p-4"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Asignar ejercicio</div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setCreateMode((s) => !s)}
            >
              {createMode ? "Usar existente" : "Crear nuevo"}
            </Button>
          </div>

          {createMode ? (
            <>
              <Input
                placeholder="Descripción"
                value={newExercise.description}
                onChange={(e) =>
                  setNewExercise((s) => ({ ...s, description: e.target.value }))
                }
              />
              <Input
                placeholder="Tipo (aritmética, álgebra, etc.)"
                value={newExercise.exercise_type}
                onChange={(e) =>
                  setNewExercise((s) => ({
                    ...s,
                    exercise_type: e.target.value,
                  }))
                }
              />
            </>
          ) : (
            <select
              value={form.exercise_id}
              onChange={(e) =>
                setForm((s) => ({ ...s, exercise_id: e.target.value }))
              }
              className="h-10 rounded-md border px-3 text-sm bg-white"
            >
              <option value="">Selecciona un ejercicio</option>
              {exerciseOptions.map((e) => (
                <option key={e.id} value={e.id}>
                  {(e.description || e.id) + " — " + e.exercise_type}
                </option>
              ))}
            </select>
          )}

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.active}
              onCheckedChange={(v) =>
                setForm((s) => ({ ...s, active: Boolean(v) }))
              }
            />
            Activo
          </label>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={assignToGrade}
              onCheckedChange={(v) => setAssignToGrade(Boolean(v))}
            />
            Asignar a todos los salones del mismo grado
          </label>

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

          <Button type="submit">Guardar</Button>
        </form>
      </div>
    </div>
  )
}

"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { ExerciseRegistry } from "@/components/exercises"
import { createClient } from "@/utils/supabase/client"
import { PageHeader } from "@/components/dashboard/core"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useInstitution } from "@/components/institution-provider"
import {
  BookOpen,
  ChevronRight,
  Loader2,
  MonitorPlay,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Exercise = {
  id: string
  exercise_type: string
  block: string | null
  component_key: string | null
  institution_id: string | null
  active: boolean
}

type ClassroomExercise = {
  id: string
  active: boolean
  created_at: string
  display_order: number
  exercise: Exercise | null
}

type ExerciseGroup = {
  key: string
  title: string
  rows: ClassroomExercise[]
  collapsed: boolean
}

function AddExercisesModal({
  classroomId,
  assignedIds,
  institutionId,
  onClose,
  onAdded,
}: {
  classroomId: string
  assignedIds: Set<string>
  institutionId: string | undefined
  onClose: () => void
  onAdded: () => void
}) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      let query = supabase
        .from("edu_exercises")
        .select("id, exercise_type, block, component_key, institution_id, active")
        .eq("active", true)

      if (institutionId) {
        query = query.or(`institution_id.eq.${institutionId},institution_id.is.null`)
      }

      const { data } = await query
        .order("exercise_type", { ascending: true })
        .order("block", { ascending: true })
        .order("id", { ascending: true })

      setExercises(data || [])
      setLoading(false)
    }

    load()
  }, [institutionId])

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return exercises

    return exercises.filter((exercise) => {
      const type = exercise.exercise_type.toLowerCase()
      const block = (exercise.block || "").toLowerCase()
      const componentKey = (exercise.component_key || "").toLowerCase()
      const id = exercise.id.toLowerCase()

      return (
        type.includes(needle) ||
        block.includes(needle) ||
        componentKey.includes(needle) ||
        id.includes(needle)
      )
    })
  }, [exercises, search])

  const grouped = useMemo(() => {
    const map = new Map<string, Exercise[]>()

    for (const exercise of filtered) {
      const groupKey = `${exercise.exercise_type}|||${exercise.block || "Sin tema"}`
      if (!map.has(groupKey)) map.set(groupKey, [])
      map.get(groupKey)!.push(exercise)
    }

    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const assign = async (exerciseId: string) => {
    setAdding(exerciseId)
    const supabase = createClient()
    await supabase.from("edu_exercise_assignments").insert({
      classroom_id: classroomId,
      exercise_id: exerciseId,
      active: true,
      order: 0,
    })
    setAdding(null)
    onAdded()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative flex h-[80vh] w-full max-w-3xl flex-col rounded-xl border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-semibold">Agregar ejercicios</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="border-b px-5 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por tipo, tema, componente o ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cargando ejercicios...
            </div>
          ) : grouped.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No se encontraron ejercicios
            </div>
          ) : (
            <div className="divide-y">
              {grouped.map(([groupKey, items]) => {
                const [type, block] = groupKey.split("|||")

                return (
                  <div key={groupKey}>
                    <div className="sticky top-0 bg-muted/60 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
                      {type} · {block} · {items.length}
                    </div>
                    {items.map((exercise) => {
                      const assigned = assignedIds.has(exercise.id)

                      return (
                        <div
                          key={exercise.id}
                          className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">
                              {exercise.block || "Sin tema"}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {exercise.component_key || "Sin component_key"}
                            </div>
                            <div className="text-xs text-muted-foreground">{exercise.id}</div>
                          </div>
                          {assigned ? (
                            <Badge variant="secondary" className="shrink-0 text-xs">
                              Ya asignado
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 gap-1"
                              disabled={adding === exercise.id}
                              onClick={() => assign(exercise.id)}
                            >
                              {adding === exercise.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Plus className="h-3 w-3" />
                              )}
                              Asignar
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ExerciseRow({
  row,
  displayLabel,
  updatingId,
  onPreview,
  onDelete,
}: {
  row: ClassroomExercise
  displayLabel: string
  updatingId: string | null
  onPreview: (row: ClassroomExercise) => void
  onDelete: (row: ClassroomExercise) => void
}) {
  const isUpdating = updatingId === row.id

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-all",
        isUpdating && "opacity-60",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{displayLabel}</span>
        </div>

      </div>

      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={!!updatingId || !row.exercise?.id}
          onClick={() => onPreview(row)}
          title="Previsualizar"
        >
          <MonitorPlay className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={!!updatingId}
          onClick={() => onDelete(row)}
          title="Eliminar del salón"
        >
          {isUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}

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
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [showAddModal, setShowAddModal] = useState(false)
  const [previewRow, setPreviewRow] = useState<ClassroomExercise | null>(null)

  const fetchData = useCallback(async () => {
    if (!classroomId) return

    const supabase = createClient()
    setLoading(true)

    const [{ data: classroom }, { data: assignments, error }] = await Promise.all([
      supabase.from("edu_classrooms").select("grade, section").eq("id", classroomId).single(),
      supabase
        .from("edu_exercise_assignments")
        .select(`
          id,
          active,
          created_at,
          display_order:order,
          exercise:edu_exercises ( id, exercise_type, block, component_key, institution_id, active )
        `)
        .eq("classroom_id", classroomId)
        .eq("active", true)
        .order("order", { ascending: true })
        .order("created_at", { ascending: false }),
    ])

    if (classroom?.grade) {
      setClassroomLabel(
        `${classroom.grade}${classroom.section ? ` ${classroom.section}` : ""}`.trim(),
      )
    }

    if (error) {
      setMessage({ type: "error", text: "No se pudieron cargar los ejercicios del salón." })
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
          display_order: Number(row.display_order) || 0,
          exercise: exercise ?? null,
        }
      })
      .filter((row) => {
        if (!institution?.id) return true
        return !row.exercise?.institution_id || row.exercise.institution_id === institution.id
      })

    setExercises(rows)
    setLoading(false)
  }, [classroomId, institution?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(null), 3500)
    return () => clearTimeout(timer)
  }, [message])

  const assignedIds = useMemo(
    () => new Set(exercises.map((exercise) => exercise.exercise?.id).filter(Boolean) as string[]),
    [exercises],
  )

  const filteredExercises = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return exercises

    return exercises.filter((row) => {
      const type = row.exercise?.exercise_type?.toLowerCase() || ""
      const block = row.exercise?.block?.toLowerCase() || ""
      const componentKey = row.exercise?.component_key?.toLowerCase() || ""
      const id = row.exercise?.id?.toLowerCase() || ""

      return (
        type.includes(needle) ||
        block.includes(needle) ||
        componentKey.includes(needle) ||
        id.includes(needle)
      )
    })
  }, [exercises, search])

  const groupedExercises = useMemo((): ExerciseGroup[] => {
    const grouped = new Map<string, ClassroomExercise[]>()

    for (const row of filteredExercises) {
      const type = row.exercise?.exercise_type?.trim() || "Sin tipo"
      const block = row.exercise?.block?.trim() || "Sin tema"
      const key = `${type}|||${block}`
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(row)
    }

    return Array.from(grouped.entries())
      .map(([key, rows]) => {
        const [type, block] = key.split("|||")
        const sorted = [...rows].sort((a, b) => {
          if (a.display_order !== b.display_order) return a.display_order - b.display_order
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        })

        return {
          key,
          title: `${type} · ${block}`,
          rows: sorted,
          collapsed: collapsedGroups.has(key),
        }
      })
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [filteredExercises, collapsedGroups])

  const toggleCollapse = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const deleteAssignment = async (row: ClassroomExercise) => {
    setUpdatingId(row.id)
    setMessage(null)

    const supabase = createClient()
    const { error: feedbackError } = await supabase
      .from("edu_assignment_feedback")
      .delete()
      .eq("assignment_id", row.id)

    if (feedbackError) {
      setMessage({ type: "error", text: "No se pudieron borrar los comentarios del ejercicio." })
      setUpdatingId(null)
      return
    }

    const { error } = await supabase
      .from("edu_exercise_assignments")
      .delete()
      .eq("id", row.id)
      .eq("classroom_id", classroomId)

    if (error) {
      setMessage({ type: "error", text: "No se pudo eliminar el ejercicio del salón." })
    } else {
      setExercises((prev) => prev.filter((item) => item.id !== row.id))
      setPreviewRow((current) => (current?.id === row.id ? null : current))
      setMessage({ type: "success", text: "Ejercicio eliminado del salón." })
    }

    setUpdatingId(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ejercicios del salón"
        description={`Gestiona los ejercicios disponibles para ${classroomLabel}`}
        breadcrumbs={[
          { label: "Mis Clases", href: "/dashboard/teacher" },
          { label: classroomLabel, href: `/dashboard/teacher/classroom/${classroomId}` },
          { label: "Ejercicios" },
        ]}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por tipo, tema, componente o ID..."
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Agregar ejercicios
        </Button>
      </div>

      {message && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm transition-all",
            message.type === "error"
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
          )}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Cargando ejercicios...
        </div>
      ) : groupedExercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <div className="font-medium text-muted-foreground">
              {search ? "No se encontraron ejercicios" : "No hay ejercicios asignados"}
            </div>
            <div className="text-sm text-muted-foreground/60">
              {search
                ? "Intenta con otro término de búsqueda"
                : "Agrega ejercicios usando el botón de arriba"}
            </div>
          </div>
          {search && (
            <Button variant="outline" size="sm" onClick={() => setSearch("")}>
              Limpiar búsqueda
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {groupedExercises.map((group) => {
            return (
              <div key={group.key} className="overflow-hidden rounded-xl border">
                <button
                  className="flex w-full items-center gap-3 bg-muted/40 px-4 py-3 text-left transition-colors hover:bg-muted/60"
                  onClick={() => toggleCollapse(group.key)}
                >
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                      !group.collapsed && "rotate-90",
                    )}
                  />
                  <span className="flex-1 text-sm font-semibold">{group.title}</span>
                  <Badge variant="secondary" className="text-xs">
                    {group.rows.length} ejercicios
                  </Badge>
                </button>

                {!group.collapsed && (
                  <div className="space-y-2 bg-card p-3">
                    {group.rows.map((row, index) => (
                      <ExerciseRow
                        key={row.id}
                        row={row}
                        displayLabel={`Ejercicio ${index + 1}`}
                        updatingId={updatingId}
                        onPreview={setPreviewRow}
                        onDelete={deleteAssignment}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAddModal && (
        <AddExercisesModal
          classroomId={classroomId}
          assignedIds={assignedIds}
          institutionId={institution?.id}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false)
            fetchData()
            setMessage({ type: "success", text: "Ejercicio asignado correctamente." })
          }}
        />
      )}

      {previewRow?.exercise?.id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <MonitorPlay className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Vista previa del ejercicio</span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {(previewRow.exercise.exercise_type || "Sin tipo") +
                    " · " +
                    (previewRow.exercise.block || "Sin tema")}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setPreviewRow(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="overflow-y-auto p-4">
              <ExerciseRegistry
                exerciseId={previewRow.exercise.id}
                classroomId={classroomId}
                displayTitle={previewRow.exercise.block || "Ejercicio"}
                previewMode
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

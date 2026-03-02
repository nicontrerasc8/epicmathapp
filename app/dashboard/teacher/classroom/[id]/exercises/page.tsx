"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import {
  PageHeader,
  StatusBadge,
  type ColumnDef,
} from "@/components/dashboard/core"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useInstitution } from "@/components/institution-provider"
import {
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Search,
  GripVertical,
  ChevronRight,
  Loader2,
  BookOpen,
  Plus,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type Exercise = {
  id: string
  exercise_type: string
  description: string | null
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
  type: string
  minOrder: number
  rows: ClassroomExercise[]
  collapsed: boolean
}

// ─── Available exercises modal ─────────────────────────────────────────────────

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
        .select("id, exercise_type, description, institution_id, active")
        .eq("active", true)

      if (institutionId) {
        query = query.or(`institution_id.eq.${institutionId},institution_id.is.null`)
      }

      const { data } = await query.order("exercise_type").order("id")
      setExercises(data || [])
      setLoading(false)
    }
    load()
  }, [institutionId])

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return exercises
    return exercises.filter(
      (e) =>
        e.description?.toLowerCase().includes(needle) ||
        e.exercise_type.toLowerCase().includes(needle) ||
        e.id.toLowerCase().includes(needle)
    )
  }, [exercises, search])

  const grouped = useMemo(() => {
    const map = new Map<string, Exercise[]>()
    for (const ex of filtered) {
      const t = ex.exercise_type || "Sin tipo"
      if (!map.has(t)) map.set(t, [])
      map.get(t)!.push(ex)
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
      <div className="relative flex h-[80vh] w-full max-w-2xl flex-col rounded-xl border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-semibold">Agregar ejercicios</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="border-b px-5 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar ejercicio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
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
              {grouped.map(([type, items]) => (
                <div key={type}>
                  <div className="sticky top-0 bg-muted/60 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
                    {type} · {items.length}
                  </div>
                  {items.map((ex) => {
                    const assigned = assignedIds.has(ex.id)
                    return (
                      <div
                        key={ex.id}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-sm font-medium">
                            {ex.description || ex.id}
                          </div>
                          <div className="text-xs text-muted-foreground">{ex.id}</div>
                        </div>
                        {assigned ? (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            Ya asignado
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0 gap-1"
                            disabled={adding === ex.id}
                            onClick={() => assign(ex.id)}
                          >
                            {adding === ex.id ? (
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Exercise row ──────────────────────────────────────────────────────────────

function ExerciseRow({
  row,
  isFirst,
  isLast,
  updatingId,
  onToggle,
  onMove,
  onOrderChange,
}: {
  row: ClassroomExercise
  isFirst: boolean
  isLast: boolean
  updatingId: string | null
  onToggle: (row: ClassroomExercise) => void
  onMove: (row: ClassroomExercise, dir: "up" | "down") => void
  onOrderChange: (row: ClassroomExercise, value: number) => void
}) {
  const isUpdating = updatingId === row.id
  const [localOrder, setLocalOrder] = useState(String(row.display_order))

  // Sync if parent changes
  useEffect(() => {
    setLocalOrder(String(row.display_order))
  }, [row.display_order])

  const commitOrder = () => {
    const parsed = parseInt(localOrder, 10)
    if (!isNaN(parsed) && parsed !== row.display_order) {
      onOrderChange(row, parsed)
    } else {
      setLocalOrder(String(row.display_order))
    }
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-all",
        isUpdating && "opacity-60",
        !row.active && "opacity-50"
      )}
    >
      {/* Drag handle visual */}
      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground/70" />

      {/* Order input */}
      <input
        type="number"
        className="w-12 rounded border bg-muted/30 px-1.5 py-1 text-center text-sm font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
        value={localOrder}
        onChange={(e) => setLocalOrder(e.target.value)}
        onBlur={commitOrder}
        onKeyDown={(e) => e.key === "Enter" && commitOrder()}
        disabled={isUpdating}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="truncate text-sm font-medium">
            {row.exercise?.description || row.exercise?.id || "Sin descripción"}
          </span>
          {!row.active && (
            <Badge variant="outline" className="text-xs shrink-0 text-muted-foreground">
              Inactivo
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">{row.exercise?.id}</div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={!!updatingId}
          onClick={() => onToggle(row)}
          title={row.active ? "Desactivar" : "Activar"}
        >
          {isUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : row.active ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

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
          exercise:edu_exercises ( id, exercise_type, description, institution_id, active )
        `)
        .eq("classroom_id", classroomId)
        .order("order", { ascending: true })
        .order("created_at", { ascending: false }),
    ])

    if (classroom?.grade) {
      setClassroomLabel(
        `${classroom.grade}${classroom.section ? ` ${classroom.section}` : ""}`.trim()
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

  // Auto-clear messages
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 3500)
    return () => clearTimeout(t)
  }, [message])

  const assignedIds = useMemo(() => new Set(exercises.map((e) => e.exercise?.id).filter(Boolean) as string[]), [exercises])

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

  /**
   * Groups sorted by the MINIMUM display_order within each group so that
   * the group with the highest-priority exercise appears first.
   */
  const groupedExercises = useMemo((): ExerciseGroup[] => {
    const grouped = new Map<string, ClassroomExercise[]>()
    for (const row of filteredExercises) {
      const type = row.exercise?.exercise_type?.trim() || "Sin tipo"
      if (!grouped.has(type)) grouped.set(type, [])
      grouped.get(type)!.push(row)
    }

    return Array.from(grouped.entries())
      .map(([type, rows]) => {
        const sorted = rows.sort((a, b) => {
          if (a.display_order !== b.display_order) return b.display_order - a.display_order // highest first
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        const maxOrder = sorted[0]?.display_order ?? 0
        return {
          type,
          minOrder: maxOrder, // reusing field — now holds the max
          rows: sorted,
          collapsed: collapsedGroups.has(type),
        }
      })
      .sort((a, b) => {
        // Sort groups by their highest order value descending
        if (a.minOrder !== b.minOrder) return b.minOrder - a.minOrder
        return a.type.localeCompare(b.type)
      })
  }, [filteredExercises, collapsedGroups])

  const toggleCollapse = (type: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  // ── Toggle active ────────────────────────────────────────────────────────────

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
      setMessage({ type: "error", text: "No se pudo actualizar el estado." })
    } else {
      setExercises((prev) =>
        prev.map((item) => (item.id === row.id ? { ...item, active: nextActive } : item))
      )
      setMessage({
        type: "success",
        text: `Ejercicio ${nextActive ? "activado" : "desactivado"} correctamente.`,
      })
    }
    setUpdatingId(null)
  }

  // ── Move (swap adjacent order values) ────────────────────────────────────────

  const moveAssignment = async (row: ClassroomExercise, direction: "up" | "down") => {
    const sameTypeRows = exercises
      .filter(
        (item) =>
          (item.exercise?.exercise_type || "") === (row.exercise?.exercise_type || "")
      )
      .sort((a, b) => {
        if (a.display_order !== b.display_order) return b.display_order - a.display_order // highest first
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

    const index = sameTypeRows.findIndex((item) => item.id === row.id)
    if (index === -1) return

    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= sameTypeRows.length) return

    const target = sameTypeRows[targetIndex]
    setUpdatingId(row.id)
    setMessage(null)

    const supabase = createClient()
    const [r1, r2] = await Promise.all([
      supabase
        .from("edu_exercise_assignments")
        .update({ order: target.display_order })
        .eq("id", row.id)
        .eq("classroom_id", classroomId),
      supabase
        .from("edu_exercise_assignments")
        .update({ order: row.display_order })
        .eq("id", target.id)
        .eq("classroom_id", classroomId),
    ])

    if (r1.error || r2.error) {
      setMessage({ type: "error", text: "No se pudo actualizar el orden." })
    } else {
      setExercises((prev) =>
        prev.map((item) => {
          if (item.id === row.id) return { ...item, display_order: target.display_order }
          if (item.id === target.id) return { ...item, display_order: row.display_order }
          return item
        })
      )
      setMessage({ type: "success", text: "Orden actualizado." })
    }
    setUpdatingId(null)
  }

  // ── Direct order edit ─────────────────────────────────────────────────────────

  const updateOrder = async (row: ClassroomExercise, newOrder: number) => {
    setUpdatingId(row.id)
    setMessage(null)

    const supabase = createClient()
    const { error } = await supabase
      .from("edu_exercise_assignments")
      .update({ order: newOrder })
      .eq("id", row.id)
      .eq("classroom_id", classroomId)

    if (error) {
      setMessage({ type: "error", text: "No se pudo actualizar el orden." })
    } else {
      setExercises((prev) =>
        prev.map((item) => (item.id === row.id ? { ...item, display_order: newOrder } : item))
      )
      setMessage({ type: "success", text: "Orden actualizado." })
    }
    setUpdatingId(null)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const totalActive = exercises.filter((e) => e.active).length

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

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descripción, tipo o ID..."
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

     

    
      </div>

      {/* Message */}
      {message && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm transition-all",
            message.type === "error"
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          )}
        >
          {message.text}
        </div>
      )}

      {/* Content */}
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
            const activeCount = group.rows.filter((r) => r.active).length
            return (
              <div key={group.type} className="rounded-xl border overflow-hidden">
                {/* Group header */}
                <button
                  className="flex w-full items-center gap-3 bg-muted/40 px-4 py-3 text-left hover:bg-muted/60 transition-colors"
                  onClick={() => toggleCollapse(group.type)}
                >
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                      !group.collapsed && "rotate-90"
                    )}
                  />
                  <span className="flex-1 font-semibold text-sm">{group.type}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {activeCount}/{group.rows.length} activos
                    </Badge>
                
                  </div>
                </button>

                {/* Group rows */}
                {!group.collapsed && (
                  <div className="p-3 space-y-2 bg-card">
                    {group.rows.map((row, idx) => (
                      <ExerciseRow
                        key={row.id}
                        row={row}
                        isFirst={idx === 0}
                        isLast={idx === group.rows.length - 1}
                        updatingId={updatingId}
                        onToggle={toggleAssignment}
                        onMove={moveAssignment}
                        onOrderChange={updateOrder}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add exercises modal */}
      {showAddModal && (
        <AddExercisesModal
          classroomId={classroomId}
          assignedIds={assignedIds}
          institutionId={institution?.id}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            fetchData()
            setMessage({ type: "success", text: "Ejercicio asignado correctamente." })
          }}
        />
      )}
    </div>
  )
}
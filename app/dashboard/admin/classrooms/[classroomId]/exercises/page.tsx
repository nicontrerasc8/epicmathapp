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

type ImportMappingItem = {
  id: string
  description: string
  importPath: string
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
        <div className="text-xs font-mono text-muted-foreground select-all">
          ID: {row.exercise?.id || "Sin ID"}
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

  const [institutionId, setInstitutionId] = useState<string | null>(null)

  /* ---------- form state ---------- */
  const [form, setForm] = useState({
    active: true,
  })
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([])
  const [selectedExerciseType, setSelectedExerciseType] = useState("")

  const [createMode, setCreateMode] = useState(false)
  const [assignToGrade, setAssignToGrade] = useState(false)

  const [newExercise, setNewExercise] = useState({
    exercise_type: "",
    custom_type: "",
    descriptionsText: "",
  })
  const [importMappings, setImportMappings] = useState<ImportMappingItem[]>([])

  /* =========================
     Data loading
  ========================= */
  useEffect(() => {
    const supabase = createClient()

    const fetchClassroomInstitution = async () => {
      const { data } = await supabase
        .from("edu_classrooms")
        .select("institution_id")
        .eq("id", classroomId)
        .single()

      if (data?.institution_id) {
        setInstitutionId(data.institution_id)
      }
    }

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

    fetchClassroomInstitution()
    fetchExercises()
  }, [classroomId])

  /* =========================
     Fetch exercise options (by institution)
  ========================= */
  useEffect(() => {
    if (!institutionId) return
    const supabase = createClient()

    const fetchExerciseOptions = async () => {
      const { data } = await supabase
        .from("edu_exercises")
        .select("id, exercise_type, description")
        .eq("active", true)
        .eq("institution_id", institutionId)
        .order("created_at", { ascending: false })

      if (data) setExerciseOptions(data)
    }

    fetchExerciseOptions()
  }, [institutionId])

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

  const exerciseTypeOptions = useMemo(() => {
    const set = new Set(
      exerciseOptions
        .map((e) => e.exercise_type?.trim())
        .filter((t): t is string => Boolean(t))
    )
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [exerciseOptions])

  const filteredExerciseOptions = useMemo(() => {
    if (!selectedExerciseType) return exerciseOptions
    return exerciseOptions.filter((e) => e.exercise_type === selectedExerciseType)
  }, [exerciseOptions, selectedExerciseType])

  const mappingText = useMemo(() => {
    if (importMappings.length === 0) return ""
    const oneLine = (s?: string) => (s || "Sin descripción").replace(/\s+/g, " ").trim()
    return importMappings
      .map(
        (m) =>
          `"${m.id}": () => import("${m.importPath || "./ruta/Componente"}"), // ${oneLine(m.description)}`
      )
      .join("\n")
  }, [importMappings])

  const downloadTextFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const toDefaultImportPath = (exerciseType: string) => {
    const slug = exerciseType
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9/_-]/g, "")
    return `./${slug || "carpeta"}/Componente`
  }

  const tableMappings = useMemo<ImportMappingItem[]>(() => {
    const map = new Map<string, ImportMappingItem>()
    for (const row of exercises) {
      const ex = row.exercise
      if (!ex?.id) continue
      if (map.has(ex.id)) continue
      map.set(ex.id, {
        id: ex.id,
        description: ex.description || ex.id,
        importPath: toDefaultImportPath(ex.exercise_type || "carpeta"),
      })
    }
    return Array.from(map.values())
  }, [exercises])

  const tableMappingText = useMemo(() => {
    if (tableMappings.length === 0) return ""
    const oneLine = (s?: string) => (s || "Sin descripción").replace(/\s+/g, " ").trim()
    return tableMappings
      .map(
        (m) =>
          `"${m.id}": () => import("${m.importPath}"), // ${oneLine(m.description)}`
      )
      .join("\n")
  }, [tableMappings])

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
    let exerciseIds: string[] = []

    /* ---- create many exercises ---- */
    if (createMode) {
      const typeToUse =
        newExercise.exercise_type === "__custom__"
          ? newExercise.custom_type.trim()
          : newExercise.exercise_type

      const descriptions = newExercise.descriptionsText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)

      if (!typeToUse || descriptions.length === 0) {
        setMessage({
          type: "error",
          text: "Define un tipo (existente o nuevo) y al menos una descripción (una por línea).",
        })
        return
      }

      const payload = descriptions.map((description) => ({
        id: crypto.randomUUID(),
        description,
        exercise_type: typeToUse,
        institution_id: institutionId,
        active: true,
      }))

      const { error } = await supabase
        .from("edu_exercises")
        .insert(payload)

      if (error) {
        setMessage({ type: "error", text: "No se pudieron crear los ejercicios." })
        return
      }

      // Conserva exactamente el orden de creación (mismo orden de líneas ingresadas).
      exerciseIds = payload.map((p) => p.id)
    } else {
      if (selectedExerciseIds.length === 0) {
        setMessage({ type: "error", text: "Selecciona al menos un ejercicio." })
        return
      }
      exerciseIds = selectedExerciseIds
    }

    /* ---- RPC (for each exercise) ---- */
    for (const exerciseId of exerciseIds) {
      const { error } = await supabase.rpc("assign_exercise_to_classrooms", {
        p_exercise_id: exerciseId,
        p_classroom_ids: [classroomId],
      })
      if (error) {
        setMessage({ type: "error", text: error.message })
        return
      }
    }

    await refreshExercises()
    if (createMode) {
      const { data } = await supabase
        .from("edu_exercises")
        .select("id, exercise_type, description")
        .eq("active", true)
        .eq("institution_id", institutionId)
        .order("created_at", { ascending: false })
      if (data) setExerciseOptions(data)
    }

    const typeForMappings =
      createMode
        ? (newExercise.exercise_type === "__custom__"
            ? newExercise.custom_type.trim()
            : newExercise.exercise_type)
        : selectedExerciseType

    const createdMappingItems: ImportMappingItem[] = exerciseIds.map((id) => ({
      id,
      description: createMode ? "Nuevo ejercicio" : (exerciseOptions.find((e) => e.id === id)?.description || "Ejercicio"),
      importPath: toDefaultImportPath(typeForMappings || "carpeta"),
    }))

    setImportMappings(createdMappingItems)

    if (createMode && createdMappingItems.length > 0) {
      const autoText = createdMappingItems
        .map((m) => `"${m.id}": () => import("${m.importPath}"),`)
        .join("\n")
      downloadTextFile(`exercise-imports-${new Date().toISOString().slice(0, 10)}.txt`, autoText)
    }

    setMessage({
      type: "success",
      text: `Se asignaron ${exerciseIds.length} ejercicio(s) correctamente.`,
    })
    setForm({ active: true })
    setSelectedExerciseIds([])
    setNewExercise({ exercise_type: "", custom_type: "", descriptionsText: "" })
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

      <div className="grid gap-6">
        {/* TABLE */}
        <div className="order-2 space-y-3">
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
                <option key={s} value={s}>{s}</option>
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

        {/* FORM */}
        <form onSubmit={handleSubmit} className="order-1 space-y-4 rounded-xl border bg-card p-4">
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

          <div className="rounded-md border p-3 space-y-2">
            <div className="text-xs text-muted-foreground">
              Exportar mapeo para <code>components/exercises/index.tsx</code>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={!mappingText}
                onClick={async () => {
                  if (!mappingText) return
                  await navigator.clipboard.writeText(mappingText)
                  setMessage({ type: "success", text: "Mapeo copiado al portapapeles." })
                }}
              >
                Copiar mapeo
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!mappingText}
                onClick={() => {
                  if (!mappingText) return
                  downloadTextFile(
                    `exercise-imports-${new Date().toISOString().slice(0, 10)}.txt`,
                    mappingText
                  )
                }}
              >
                Descargar TXT
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!tableMappingText}
                onClick={async () => {
                  if (!tableMappingText) return
                  await navigator.clipboard.writeText(tableMappingText)
                  setMessage({ type: "success", text: "Mapeo desde tabla copiado al portapapeles." })
                }}
              >
                Copiar desde tabla
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!tableMappingText}
                onClick={() => {
                  if (!tableMappingText) return
                  downloadTextFile(
                    `exercise-imports-table-${new Date().toISOString().slice(0, 10)}.txt`,
                    tableMappingText
                  )
                }}
              >
                Descargar TXT (tabla)
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!tableMappings.length}
                onClick={() => setImportMappings(tableMappings)}
              >
                Cargar tabla abajo
              </Button>
            </div>
          </div>

          {createMode ? (
            <>
              <select
                value={newExercise.exercise_type}
                onChange={(e) =>
                  setNewExercise((s) => ({
                    ...s,
                    exercise_type: e.target.value,
                    custom_type: e.target.value === "__custom__" ? s.custom_type : "",
                  }))
                }
                className="h-10 rounded-md border px-3 text-sm bg-white"
              >
                <option value="">Selecciona un tipo</option>
                {exerciseTypeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
                <option value="__custom__">+ Crear tipo nuevo</option>
              </select>
              {newExercise.exercise_type === "__custom__" && (
                <Input
                  placeholder="Nuevo tipo (ej: Funciones avanzadas)"
                  value={newExercise.custom_type}
                  onChange={(e) =>
                    setNewExercise((s) => ({ ...s, custom_type: e.target.value }))
                  }
                />
              )}
              <textarea
                placeholder={"Nuevas descripciones (una por línea)\nEjercicio 1...\nEjercicio 2..."}
                value={newExercise.descriptionsText}
                onChange={(e) =>
                  setNewExercise((s) => ({ ...s, descriptionsText: e.target.value }))
                }
                className="min-h-[120px] rounded-md border px-3 py-2 text-sm bg-white"
              />
            </>
          ) : (
            <div className="space-y-2">
              <select
                value={selectedExerciseType}
                onChange={(e) => setSelectedExerciseType(e.target.value)}
                className="h-10 rounded-md border px-3 text-sm bg-white"
              >
                <option value="">Todos los tipos</option>
                {exerciseTypeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <div className="max-h-56 overflow-auto rounded-md border p-2 space-y-2">
                {filteredExerciseOptions.map((e) => (
                  <label key={e.id} className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={selectedExerciseIds.includes(e.id)}
                      onCheckedChange={(v) => {
                        const checked = Boolean(v)
                        setSelectedExerciseIds((prev) =>
                          checked ? [...prev, e.id] : prev.filter((id) => id !== e.id)
                        )
                      }}
                    />
                    <span>
                      {(e.description || e.id) + " — " + e.exercise_type}
                    </span>
                  </label>
                ))}
                {filteredExerciseOptions.length === 0 && (
                  <div className="text-xs text-muted-foreground">
                    No hay ejercicios para este tipo.
                  </div>
                )}
              </div>
            </div>
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

          {importMappings.length > 0 && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="text-sm font-medium">
                Mapeo para <code>components/exercises/index.tsx</code>
              </div>
              <div className="max-h-48 overflow-auto space-y-2">
                {importMappings.map((m) => (
                  <div key={m.id} className="grid gap-2">
                    <div className="text-xs text-muted-foreground font-mono select-all">
                      {m.id}
                    </div>
                    <Input
                      value={m.importPath}
                      onChange={(e) =>
                        setImportMappings((prev) =>
                          prev.map((x) => (x.id === m.id ? { ...x, importPath: e.target.value } : x))
                        )
                      }
                      placeholder="./carpeta/Componente"
                    />
                  </div>
                ))}
              </div>
              <textarea
                readOnly
                value={mappingText}
                className="min-h-[120px] w-full rounded-md border bg-muted/20 p-2 text-xs font-mono"
              />
            </div>
          )}

          <Button type="submit">Guardar</Button>
        </form>
      </div>
    </div>
  )
}

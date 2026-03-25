"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { PageHeader, RowActionsMenu, StatusBadge } from "@/components/dashboard/core"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

type Message = {
  type: "success" | "error"
  text: string
}

type ExerciseRow = {
  id: string
  active: boolean
  exercise: {
    id: string
    exercise_type: string
    block?: string | null
    description: string | null
    component_key?: string | null
  } | null
}

type ExerciseOption = {
  id: string
  exercise_type: string
  block?: string | null
  description: string | null
  component_key?: string | null
}

type GroupedExercise = {
  theme: string
  block: string
  rows: ExerciseRow[]
}

export default function ClassroomExercisesPage() {
  const params = useParams()
  const classroomId = params.classroomId as string

  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<Message | null>(null)
  const [exercises, setExercises] = useState<ExerciseRow[]>([])
  const [exerciseOptions, setExerciseOptions] = useState<ExerciseOption[]>([])

  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [classroomGrade, setClassroomGrade] = useState<string | null>(null)
  const [classroomAcademicYear, setClassroomAcademicYear] = useState<number | null>(null)
  const [replicatingGrade, setReplicatingGrade] = useState(false)

  const [search, setSearch] = useState("")
  const [tableExerciseType, setTableExerciseType] = useState("")
  const [tableBlock, setTableBlock] = useState("")
  const [selectedAssignedIds, setSelectedAssignedIds] = useState<string[]>([])

  const [editingExercise, setEditingExercise] = useState<ExerciseRow | null>(null)
  const [editingDescription, setEditingDescription] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)

  const [createMode, setCreateMode] = useState(false)
  const [assignToGrade, setAssignToGrade] = useState(false)
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([])
  const [selectedExerciseType, setSelectedExerciseType] = useState("")
  const [selectedExerciseBlock, setSelectedExerciseBlock] = useState("")
  const [newExercise, setNewExercise] = useState({
    exercise_type: "",
    custom_type: "",
    block: "",
    custom_block: "",
    component_key: "",
    descriptionsText: "",
  })

  const loadClassroomMeta = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("edu_classrooms")
      .select("institution_id, grade, academic_year")
      .eq("id", classroomId)
      .single()

    setInstitutionId(data?.institution_id ?? null)
    setClassroomGrade(data?.grade ?? null)
    setClassroomAcademicYear(typeof data?.academic_year === "number" ? data.academic_year : null)
  }

  const refreshExercises = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("edu_exercise_assignments")
      .select(`
        id,
        active,
        exercise:edu_exercises ( id, exercise_type, block, description, component_key )
      `)
      .eq("classroom_id", classroomId)

    if (data) {
      setExercises(
        data.map((row: any) => ({
          id: row.id,
          active: Boolean(row.active),
          exercise: Array.isArray(row.exercise) ? row.exercise[0] ?? null : row.exercise,
        }))
      )
    }
  }

  const refreshExerciseOptions = async (nextInstitutionId = institutionId) => {
    if (!nextInstitutionId) return

    const supabase = createClient()
    const { data } = await supabase
      .from("edu_exercises")
      .select("id, exercise_type, block, description, component_key")
      .eq("active", true)
      .eq("institution_id", nextInstitutionId)
      .order("exercise_type", { ascending: true })
      .order("block", { ascending: true })
      .order("description", { ascending: true })

    if (data) setExerciseOptions(data)
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await loadClassroomMeta()
      await refreshExercises()
      setLoading(false)
    }

    load()
  }, [classroomId])

  useEffect(() => {
    if (!institutionId) return
    refreshExerciseOptions(institutionId)
  }, [institutionId])

  const assignedExerciseTypeOptions = useMemo(() => {
    const values = new Set(
      exercises
        .map((row) => row.exercise?.exercise_type?.trim())
        .filter((value): value is string => Boolean(value))
    )

    return Array.from(values).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
  }, [exercises])

  const exerciseTypeOptions = useMemo(() => {
    const values = new Set(
      exerciseOptions
        .map((row) => row.exercise_type?.trim())
        .filter((value): value is string => Boolean(value))
    )

    return Array.from(values).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
  }, [exerciseOptions])

  const assignedBlockOptions = useMemo(() => {
    const values = new Set(
      exercises
        .filter((row) => !tableExerciseType || row.exercise?.exercise_type === tableExerciseType)
        .map((row) => row.exercise?.block?.trim())
        .filter((value): value is string => Boolean(value))
    )

    return Array.from(values).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
  }, [exercises, tableExerciseType])

  const exerciseBlockOptions = useMemo(() => {
    const values = new Set(
      exerciseOptions
        .filter((row) => !selectedExerciseType || row.exercise_type === selectedExerciseType)
        .map((row) => row.block?.trim())
        .filter((value): value is string => Boolean(value))
    )

    return Array.from(values).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
  }, [exerciseOptions, selectedExerciseType])

  const filteredExerciseOptions = useMemo(() => {
    return exerciseOptions.filter((row) => {
      const matchesType = !selectedExerciseType || row.exercise_type === selectedExerciseType
      const matchesBlock = !selectedExerciseBlock || row.block === selectedExerciseBlock
      return matchesType && matchesBlock
    })
  }, [exerciseOptions, selectedExerciseType, selectedExerciseBlock])

  const filteredExerciseIds = useMemo(
    () => filteredExerciseOptions.map((row) => row.id),
    [filteredExerciseOptions]
  )

  const allFilteredSelected = useMemo(() => {
    if (filteredExerciseIds.length === 0) return false
    const selectedSet = new Set(selectedExerciseIds)
    return filteredExerciseIds.every((id) => selectedSet.has(id))
  }, [filteredExerciseIds, selectedExerciseIds])

  const someFilteredSelected = useMemo(() => {
    if (filteredExerciseIds.length === 0) return false
    const selectedSet = new Set(selectedExerciseIds)
    return filteredExerciseIds.some((id) => selectedSet.has(id))
  }, [filteredExerciseIds, selectedExerciseIds])

  const toggleSelectAllFiltered = (checked: boolean) => {
    setSelectedExerciseIds((prev) => {
      if (checked) {
        const merged = new Set(prev)
        for (const id of filteredExerciseIds) merged.add(id)
        return Array.from(merged)
      }

      const filteredSet = new Set(filteredExerciseIds)
      return prev.filter((id) => !filteredSet.has(id))
    })
  }

  const filteredExercises = useMemo(() => {
    const needle = search.trim().toLowerCase()

    return exercises.filter((row) => {
      const theme = row.exercise?.exercise_type ?? ""
      const block = row.exercise?.block ?? ""
      const description = row.exercise?.description ?? ""
      const id = row.exercise?.id ?? ""

      const matchesTheme = !tableExerciseType || theme === tableExerciseType
      const matchesBlock = !tableBlock || block === tableBlock
      const matchesSearch =
        !needle ||
        theme.toLowerCase().includes(needle) ||
        block.toLowerCase().includes(needle) ||
        description.toLowerCase().includes(needle) ||
        id.toLowerCase().includes(needle)

      return matchesTheme && matchesBlock && matchesSearch
    })
  }, [exercises, search, tableExerciseType, tableBlock])

  const groupedExercises = useMemo((): GroupedExercise[] => {
    const grouped = new Map<string, ExerciseRow[]>()

    for (const row of filteredExercises) {
      const theme = row.exercise?.exercise_type?.trim() || "Sin tipo"
      const block = row.exercise?.block?.trim() || "Sin bloque"
      const key = `${theme}|||${block}`
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(row)
    }

    return Array.from(grouped.entries())
      .map(([key, rows]) => {
        const [theme, block] = key.split("|||")
        return {
          theme,
          block,
          rows: [...rows].sort((a, b) => {
          const labelA = (a.exercise?.description || a.exercise?.id || "").trim()
          const labelB = (b.exercise?.description || b.exercise?.id || "").trim()
          return labelA.localeCompare(labelB, "es", { sensitivity: "base" })
          }),
        }
      })
      .sort((a, b) => {
        const byTheme = a.theme.localeCompare(b.theme, "es", { sensitivity: "base" })
        if (byTheme !== 0) return byTheme
        return a.block.localeCompare(b.block, "es", { sensitivity: "base" })
      })
  }, [filteredExercises])

  const openEditExercise = (row: ExerciseRow) => {
    setEditingExercise(row)
    setEditingDescription(row.exercise?.description || "")
    setMessage(null)
  }

  const closeEditExercise = () => {
    if (savingEdit) return
    setEditingExercise(null)
    setEditingDescription("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    const supabase = createClient()
    let exerciseIds: string[] = []
    let targetClassroomIds: string[] = [classroomId]

    if (createMode) {
      const typeToUse =
        newExercise.exercise_type === "__custom__"
          ? newExercise.custom_type.trim()
          : newExercise.exercise_type.trim()

      const componentKey = newExercise.component_key.trim()
      const block =
        newExercise.block === "__custom__"
          ? newExercise.custom_block.trim()
          : newExercise.block.trim()
      const descriptions = newExercise.descriptionsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)

      if (!typeToUse || !block || !componentKey || descriptions.length === 0) {
        setMessage({
          type: "error",
          text: "Define tema, block, component_key y al menos una descripción.",
        })
        return
      }

      const payload = descriptions.map((description) => ({
        id: crypto.randomUUID(),
        description,
        exercise_type: typeToUse,
        block,
        component_key: componentKey,
        institution_id: institutionId,
        active: true,
      }))

      const { error } = await supabase.from("edu_exercises").insert(payload)

      if (error) {
        setMessage({ type: "error", text: error.message || "No se pudieron crear los ejercicios." })
        return
      }

      exerciseIds = payload.map((row) => row.id)
    } else {
      if (selectedExerciseIds.length === 0) {
        setMessage({ type: "error", text: "Selecciona al menos un ejercicio." })
        return
      }

      exerciseIds = selectedExerciseIds
    }

    if (assignToGrade) {
      if (!institutionId || !classroomGrade || classroomAcademicYear == null) {
        setMessage({
          type: "error",
          text: "No se pudo identificar grado/año para asignar al bloque.",
        })
        return
      }

      const { data, error } = await supabase
        .from("edu_classrooms")
        .select("id")
        .eq("institution_id", institutionId)
        .eq("grade", classroomGrade)
        .eq("academic_year", classroomAcademicYear)
        .eq("active", true)

      if (error) {
        setMessage({ type: "error", text: error.message })
        return
      }

      const ids = (data ?? []).map((row: any) => row.id).filter(Boolean)
      if (ids.length === 0) {
        setMessage({ type: "error", text: "No hay salones activos del mismo grado." })
        return
      }

      targetClassroomIds = ids
    }

    for (const exerciseId of exerciseIds) {
      const { error } = await supabase.rpc("assign_exercise_to_classrooms", {
        p_exercise_id: exerciseId,
        p_classroom_ids: targetClassroomIds,
      })

      if (error) {
        setMessage({ type: "error", text: error.message })
        return
      }
    }

    await refreshExercises()
    await refreshExerciseOptions()

    setMessage({
      type: "success",
      text: assignToGrade
        ? `Se asignaron ${exerciseIds.length} ejercicio(s) en ${targetClassroomIds.length} aula(s) del mismo grado.`
        : `Se asignaron ${exerciseIds.length} ejercicio(s) correctamente.`,
    })

    setSelectedExerciseIds([])
    setAssignToGrade(false)
    setCreateMode(false)
    setNewExercise({
      exercise_type: "",
      custom_type: "",
      block: "",
      custom_block: "",
      component_key: "",
      descriptionsText: "",
    })
  }

  const replicateAssignmentsToSameGrade = async (
    sourceAssignments: { exerciseId: string; active: boolean }[],
    confirmText: string
  ) => {
    if (!institutionId || !classroomGrade || classroomAcademicYear == null) {
      setMessage({
        type: "error",
        text: "No se pudo identificar grado/año del aula actual.",
      })
      return
    }

    if (sourceAssignments.length === 0) {
      setMessage({
        type: "error",
        text: "No hay ejercicios asignados para replicar.",
      })
      return
    }

    const ok = window.confirm(confirmText)
    if (!ok) return

    const supabase = createClient()
    setReplicatingGrade(true)
    setMessage(null)

    try {
      const { data, error } = await supabase
        .from("edu_classrooms")
        .select("id")
        .eq("institution_id", institutionId)
        .eq("grade", classroomGrade)
        .eq("academic_year", classroomAcademicYear)
        .neq("id", classroomId)
        .eq("active", true)

      if (error) {
        setMessage({ type: "error", text: error.message })
        return
      }

      const targetIds = (data ?? []).map((row: any) => row.id).filter(Boolean)
      if (targetIds.length === 0) {
        setMessage({
          type: "error",
          text: "No se encontraron otros salones del mismo grado.",
        })
        return
      }

      for (const row of sourceAssignments) {
        const { error: assignError } = await supabase.rpc("assign_exercise_to_classrooms", {
          p_exercise_id: row.exerciseId,
          p_classroom_ids: targetIds,
        })

        if (assignError) {
          setMessage({ type: "error", text: assignError.message })
          return
        }

        if (!row.active) {
          const { error: inactiveError } = await supabase
            .from("edu_exercise_assignments")
            .update({ active: false })
            .in("classroom_id", targetIds)
            .eq("exercise_id", row.exerciseId)

          if (inactiveError) {
            setMessage({ type: "error", text: inactiveError.message })
            return
          }
        }
      }

      setMessage({
        type: "success",
        text: `Se replicaron ${sourceAssignments.length} asignaciones en ${targetIds.length} aula(s) del mismo grado.`,
      })
      setSelectedAssignedIds([])
    } finally {
      setReplicatingGrade(false)
    }
  }

  const handleReplicateToSameGrade = async () => {
    const sourceAssignments = exercises
      .map((row) => ({
        exerciseId: row.exercise?.id || "",
        active: row.active,
      }))
      .filter((row) => Boolean(row.exerciseId))

    await replicateAssignmentsToSameGrade(
      sourceAssignments,
      "Se copiarán todas las asignaciones de esta aula a los demás salones del mismo grado. ¿Continuar?"
    )
  }

  const handleReplicateSelectedToSameGrade = async () => {
    const selectedSet = new Set(selectedAssignedIds)
    const sourceAssignments = exercises
      .filter((row) => selectedSet.has(row.id))
      .map((row) => ({
        exerciseId: row.exercise?.id || "",
        active: row.active,
      }))
      .filter((row) => Boolean(row.exerciseId))

    await replicateAssignmentsToSameGrade(
      sourceAssignments,
      `Se copiarán ${sourceAssignments.length} asignaciones seleccionadas a los demás salones del mismo grado. ¿Continuar?`
    )
  }

  const handleSaveExerciseName = async () => {
    const exerciseId = editingExercise?.exercise?.id
    const description = editingDescription.trim()

    if (!exerciseId) {
      setMessage({ type: "error", text: "No se encontró el ejercicio a editar." })
      return
    }

    if (!description) {
      setMessage({ type: "error", text: "Ingresa un nombre para el ejercicio." })
      return
    }

    const supabase = createClient()
    setSavingEdit(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from("edu_exercises")
        .update({ description })
        .eq("id", exerciseId)

      if (error) {
        setMessage({ type: "error", text: error.message })
        return
      }

      await refreshExercises()
      await refreshExerciseOptions()
      setMessage({ type: "success", text: "Nombre del ejercicio actualizado." })
      setEditingExercise(null)
      setEditingDescription("")
    } finally {
      setSavingEdit(false)
    }
  }

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
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Buscar por tema, nombre o ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              value={tableExerciseType}
              onChange={(e) => {
                setTableExerciseType(e.target.value)
                setTableBlock("")
              }}
              className="h-10 rounded-md border px-3 text-sm bg-white"
            >
              <option value="">Todos los temas</option>
              {assignedExerciseTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
                ))}
              </select>

            <select
              value={tableBlock}
              onChange={(e) => setTableBlock(e.target.value)}
              className="h-10 rounded-md border px-3 text-sm bg-white"
            >
              <option value="">Todos los blocks</option>
              {assignedBlockOptions.map((block) => (
                <option key={block} value={block}>
                  {block}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">
              Cargando ejercicios...
            </div>
          ) : groupedExercises.length === 0 ? (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">
              No hay ejercicios asignados con ese filtro.
            </div>
          ) : (
            <div className="space-y-4">
              {groupedExercises.map((group) => (
                <div key={group.theme} className="rounded-lg border">
                  <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold">{group.theme}</div>
                      <div className="text-xs font-medium text-foreground/80">{group.block}</div>
                      <div className="text-xs text-muted-foreground">
                        {group.rows.length} ejercicio(s)
                      </div>
                    </div>
                  </div>

                  <div className="divide-y">
                    {group.rows.map((row) => (
                      <div key={row.id} className="flex items-center justify-between gap-4 px-4 py-3">
                        <label className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedAssignedIds.includes(row.id)}
                            onCheckedChange={(checked) => {
                              const next = Boolean(checked)
                              setSelectedAssignedIds((prev) =>
                                next ? [...prev, row.id] : prev.filter((id) => id !== row.id)
                              )
                            }}
                          />
                          <div>
                            <div className="font-medium">
                              {row.exercise?.description || row.exercise?.id || "Sin descripción"}
                            </div>
                            <div className="text-xs font-mono text-muted-foreground select-all">
                              ID: {row.exercise?.id || "Sin ID"}
                            </div>
                            {row.exercise?.block && (
                              <div className="text-xs text-muted-foreground">
                                block: {row.exercise.block}
                              </div>
                            )}
                            {row.exercise?.component_key && (
                              <div className="text-xs text-muted-foreground">
                                component_key: {row.exercise.component_key}
                              </div>
                            )}
                          </div>
                        </label>

                        <div className="flex items-center gap-3">
                          <StatusBadge active={row.active} />
                          <RowActionsMenu
                            actions={[
                              {
                                label: "Editar nombre",
                                onClick: () => openEditExercise(row),
                              },
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
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Asignar ejercicios por tema</div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setCreateMode((state) => !state)}
            >
              {createMode ? "Usar existente" : "Crear nuevo"}
            </Button>
          </div>

          {createMode ? (
            <div className="space-y-3">
              <select
                value={newExercise.exercise_type}
                onChange={(e) =>
                  setNewExercise((state) => ({
                    ...state,
                    exercise_type: e.target.value,
                    custom_type: e.target.value === "__custom__" ? state.custom_type : "",
                  }))
                }
                className="h-10 rounded-md border px-3 text-sm bg-white"
              >
                <option value="">Selecciona un tema</option>
                {exerciseTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
                <option value="__custom__">+ Crear tema nuevo</option>
              </select>

              {newExercise.exercise_type === "__custom__" && (
                <Input
                  placeholder="Nuevo tema"
                  value={newExercise.custom_type}
                  onChange={(e) =>
                    setNewExercise((state) => ({ ...state, custom_type: e.target.value }))
                  }
                />
              )}

              <select
                value={newExercise.block}
                onChange={(e) =>
                  setNewExercise((state) => ({
                    ...state,
                    block: e.target.value,
                    custom_block: e.target.value === "__custom__" ? state.custom_block : "",
                  }))
                }
                className="h-10 rounded-md border px-3 text-sm bg-white"
              >
                <option value="">Selecciona un block</option>
                {exerciseBlockOptions.map((block) => (
                  <option key={block} value={block}>
                    {block}
                  </option>
                ))}
                <option value="__custom__">+ Crear block nuevo</option>
              </select>

              {newExercise.block === "__custom__" && (
                <Input
                  placeholder="Nuevo block. Ej: Ecuación de la recta"
                  value={newExercise.custom_block}
                  onChange={(e) =>
                    setNewExercise((state) => ({ ...state, custom_block: e.target.value }))
                  }
                />
              )}

              <Input
                placeholder="component_key. Ej: cristo/algebra/ej17"
                value={newExercise.component_key}
                onChange={(e) =>
                  setNewExercise((state) => ({ ...state, component_key: e.target.value }))
                }
              />

              <textarea
                placeholder={"Descripciones, una por línea\nEj17 - Error porcentual\nEj18 - Error porcentual"}
                value={newExercise.descriptionsText}
                onChange={(e) =>
                  setNewExercise((state) => ({ ...state, descriptionsText: e.target.value }))
                }
                className="min-h-[140px] rounded-md border px-3 py-2 text-sm bg-white"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <select
                value={selectedExerciseType}
                onChange={(e) => {
                  setSelectedExerciseType(e.target.value)
                  setSelectedExerciseBlock("")
                }}
                className="h-10 rounded-md border px-3 text-sm bg-white"
              >
                <option value="">Todos los temas</option>
                {exerciseTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <select
                value={selectedExerciseBlock}
                onChange={(e) => setSelectedExerciseBlock(e.target.value)}
                className="h-10 rounded-md border px-3 text-sm bg-white"
              >
                <option value="">Todos los blocks</option>
                {exerciseBlockOptions.map((block) => (
                  <option key={block} value={block}>
                    {block}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={allFilteredSelected ? true : someFilteredSelected ? "indeterminate" : false}
                  onCheckedChange={(value) => toggleSelectAllFiltered(Boolean(value))}
                  disabled={filteredExerciseOptions.length === 0}
                />
                Seleccionar todos ({filteredExerciseOptions.length})
              </label>

              <div className="max-h-64 overflow-auto rounded-md border p-2 space-y-2">
                {filteredExerciseOptions.map((row) => (
                  <label key={row.id} className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={selectedExerciseIds.includes(row.id)}
                      onCheckedChange={(value) => {
                        const checked = Boolean(value)
                        setSelectedExerciseIds((prev) =>
                          checked ? [...prev, row.id] : prev.filter((id) => id !== row.id)
                        )
                      }}
                    />
                    <span>
                      {(row.description || row.id) + " — " + row.exercise_type}
                      {row.block ? ` — ${row.block}` : ""}
                      {row.component_key ? ` — ${row.component_key}` : ""}
                    </span>
                  </label>
                ))}

                {filteredExerciseOptions.length === 0 && (
                  <div className="text-xs text-muted-foreground">
                    No hay ejercicios para ese tema.
                  </div>
                )}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={assignToGrade}
              onCheckedChange={(value) => setAssignToGrade(Boolean(value))}
            />
            Asignar a todos los salones del mismo grado
          </label>

          <div className="rounded-md border p-3 space-y-2">
            <div className="text-sm font-medium">Copiar asignaciones actuales</div>
            <div className="text-xs text-muted-foreground">
              Replica estas asignaciones en los demás salones del mismo grado.
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleReplicateToSameGrade}
                disabled={replicatingGrade || exercises.length === 0}
              >
                {replicatingGrade ? "Copiando..." : "Copiar todo"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleReplicateSelectedToSameGrade}
                disabled={replicatingGrade || selectedAssignedIds.length === 0}
              >
                {replicatingGrade
                  ? "Copiando..."
                  : `Copiar seleccionados (${selectedAssignedIds.length})`}
              </Button>
            </div>
          </div>

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

      {editingExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <div className="text-base font-semibold">Editar nombre del ejercicio</div>
                <div className="text-sm text-muted-foreground">
                  ID: {editingExercise.exercise?.id || "Sin ID"}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={closeEditExercise} disabled={savingEdit}>
                Cerrar
              </Button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  Tema: {editingExercise.exercise?.exercise_type || "Sin tipo"}
                </div>
                {editingExercise.exercise?.block && (
                  <div className="text-sm text-muted-foreground">
                    Block: {editingExercise.exercise.block}
                  </div>
                )}
                {editingExercise.exercise?.component_key && (
                  <div className="text-sm text-muted-foreground">
                    component_key: {editingExercise.exercise.component_key}
                  </div>
                )}
                <Input
                  value={editingDescription}
                  onChange={(e) => setEditingDescription(e.target.value)}
                  placeholder="Nombre del ejercicio"
                  disabled={savingEdit}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeEditExercise} disabled={savingEdit}>
                  Cancelar
                </Button>
                <Button type="button" onClick={handleSaveExerciseName} disabled={savingEdit}>
                  {savingEdit ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

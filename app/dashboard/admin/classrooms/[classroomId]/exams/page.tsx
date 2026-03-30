"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { PageHeader, RowActionsMenu, StatusBadge } from "@/components/dashboard/core"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

type Message = { type: "success" | "error"; text: string }

type AssignmentRow = {
  id: string
  active: boolean
  exam: {
    id: string
    title: string
    description: string | null
    exam_type: string
    block: string | null
    component_key: string
    duration_minutes: number | null
  } | null
}

type ExamOption = {
  id: string
  title: string
  description: string | null
  exam_type: string
  block: string | null
  component_key: string
  duration_minutes: number | null
}

const EMPTY_NEW = {
  title: "",
  description: "",
  exam_type: "",
  custom_type: "",
  block: "",
  custom_block: "",
  component_key: "",
  duration_minutes: "",
}

export default function ClassroomExamsPage() {
  const params = useParams()
  const classroomId = params.classroomId as string
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<Message | null>(null)
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [catalog, setCatalog] = useState<ExamOption[]>([])
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [grade, setGrade] = useState<string | null>(null)
  const [academicYear, setAcademicYear] = useState<number | null>(null)

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [blockFilter, setBlockFilter] = useState("")
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<string[]>([])

  const [createMode, setCreateMode] = useState(false)
  const [assignToGrade, setAssignToGrade] = useState(false)
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<string[]>([])
  const [catalogTypeFilter, setCatalogTypeFilter] = useState("")
  const [catalogBlockFilter, setCatalogBlockFilter] = useState("")
  const [newExam, setNewExam] = useState(EMPTY_NEW)
  const [saving, setSaving] = useState(false)

  const [editing, setEditing] = useState<AssignmentRow | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editDuration, setEditDuration] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)

  const loadMeta = async () => {
    const { data, error } = await supabase
      .from("edu_classrooms")
      .select("institution_id, grade, academic_year")
      .eq("id", classroomId)
      .single()
    if (error) throw error
    setInstitutionId(data?.institution_id ?? null)
    setGrade(data?.grade ?? null)
    setAcademicYear(typeof data?.academic_year === "number" ? data.academic_year : null)
  }

  const loadAssignments = async () => {
    const { data, error } = await supabase
      .from("edu_exam_assignments")
      .select(`
        id,
        active,
        exam:edu_exams (
          id,
          title,
          description,
          exam_type,
          block,
          component_key,
          duration_minutes
        )
      `)
      .eq("classroom_id", classroomId)
    if (error) throw error
    setAssignments(
      (data ?? []).map((row: any) => ({
        id: row.id,
        active: Boolean(row.active),
        exam: Array.isArray(row.exam) ? row.exam[0] ?? null : row.exam,
      }))
    )
  }

  const loadCatalog = async (nextInstitutionId = institutionId) => {
    if (!nextInstitutionId) return
    const { data, error } = await supabase
      .from("edu_exams")
      .select("id, title, description, exam_type, block, component_key, duration_minutes")
      .eq("institution_id", nextInstitutionId)
      .eq("active", true)
      .order("exam_type", { ascending: true })
      .order("block", { ascending: true })
      .order("title", { ascending: true })
    if (error) throw error
    setCatalog((data ?? []) as ExamOption[])
  }

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        await loadMeta()
        await loadAssignments()
      } catch (error: any) {
        setMessage({ type: "error", text: error?.message || "No se pudo cargar examenes." })
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [classroomId])

  useEffect(() => {
    if (!institutionId) return
    loadCatalog(institutionId).catch((error: any) =>
      setMessage({ type: "error", text: error?.message || "No se pudo cargar el catalogo." })
    )
  }, [institutionId])

  const assignmentTypes = useMemo(
    () =>
      Array.from(new Set(assignments.map((r) => r.exam?.exam_type).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b, "es", { sensitivity: "base" })
      ),
    [assignments]
  )

  const assignmentBlocks = useMemo(
    () =>
      Array.from(
        new Set(
          assignments
            .filter((r) => !typeFilter || r.exam?.exam_type === typeFilter)
            .map((r) => r.exam?.block)
            .filter(Boolean) as string[]
        )
      ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })),
    [assignments, typeFilter]
  )

  const catalogTypes = useMemo(
    () =>
      Array.from(new Set(catalog.map((r) => r.exam_type).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "es", { sensitivity: "base" })
      ),
    [catalog]
  )

  const catalogBlocks = useMemo(
    () =>
      Array.from(
        new Set(
          catalog
            .filter((r) => !catalogTypeFilter || r.exam_type === catalogTypeFilter)
            .map((r) => r.block)
            .filter(Boolean) as string[]
        )
      ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })),
    [catalog, catalogTypeFilter]
  )

  const filteredAssignments = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return assignments.filter((row) => {
      const exam = row.exam
      const matchesType = !typeFilter || exam?.exam_type === typeFilter
      const matchesBlock = !blockFilter || exam?.block === blockFilter
      const matchesSearch =
        !needle ||
        (exam?.title ?? "").toLowerCase().includes(needle) ||
        (exam?.component_key ?? "").toLowerCase().includes(needle) ||
        (exam?.id ?? "").toLowerCase().includes(needle)
      return matchesType && matchesBlock && matchesSearch
    })
  }, [assignments, search, typeFilter, blockFilter])

  const filteredCatalog = useMemo(
    () =>
      catalog.filter((row) => {
        const matchesType = !catalogTypeFilter || row.exam_type === catalogTypeFilter
        const matchesBlock = !catalogBlockFilter || row.block === catalogBlockFilter
        return matchesType && matchesBlock
      }),
    [catalog, catalogTypeFilter, catalogBlockFilter]
  )

  const filteredCatalogIds = useMemo(() => filteredCatalog.map((row) => row.id), [filteredCatalog])
  const allFilteredSelected = useMemo(
    () => filteredCatalogIds.length > 0 && filteredCatalogIds.every((id) => selectedCatalogIds.includes(id)),
    [filteredCatalogIds, selectedCatalogIds]
  )

  const resetCreate = () => {
    setCreateMode(false)
    setAssignToGrade(false)
    setSelectedCatalogIds([])
    setNewExam(EMPTY_NEW)
  }

  const assignExamIds = async (examIds: string[], targetIds: string[]) => {
    for (const examId of examIds) {
      const { error } = await supabase.rpc("assign_exam_to_classrooms", {
        p_exam_id: examId,
        p_classroom_ids: targetIds,
      })
      if (error) throw error
    }
  }

  const resolveTargetClassrooms = async () => {
    if (!assignToGrade) return [classroomId]
    if (!institutionId || !grade || academicYear == null) throw new Error("No se pudo identificar el grado del aula.")
    const { data, error } = await supabase
      .from("edu_classrooms")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("grade", grade)
      .eq("academic_year", academicYear)
      .eq("active", true)
    if (error) throw error
    return (data ?? []).map((row: any) => row.id).filter(Boolean)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setSaving(true)
    try {
      let examIds: string[] = []

      if (createMode) {
        const examType = newExam.exam_type === "__custom__" ? newExam.custom_type.trim() : newExam.exam_type.trim()
        const block = newExam.block === "__custom__" ? newExam.custom_block.trim() : newExam.block.trim()
        if (!newExam.title.trim() || !examType || !block || !newExam.component_key.trim()) {
          throw new Error("Define titulo, tipo, block y component_key del examen.")
        }
        const newId = crypto.randomUUID()
        const { error } = await supabase.from("edu_exams").insert({
          id: newId,
          title: newExam.title.trim(),
          description: newExam.description.trim() || null,
          exam_type: examType,
          block,
          component_key: newExam.component_key.trim(),
          duration_minutes: newExam.duration_minutes.trim() ? Number(newExam.duration_minutes) : null,
          institution_id: institutionId,
          active: true,
        })
        if (error) throw error
        examIds = [newId]
      } else {
        if (selectedCatalogIds.length === 0) throw new Error("Selecciona al menos un examen.")
        examIds = selectedCatalogIds
      }

      const targets = await resolveTargetClassrooms()
      if (targets.length === 0) throw new Error("No hay salones objetivo para asignar.")
      await assignExamIds(examIds, targets)
      await loadAssignments()
      await loadCatalog()
      resetCreate()
      setMessage({
        type: "success",
        text:
          targets.length > 1
            ? `Se asignaron ${examIds.length} examen(es) en ${targets.length} aula(s).`
            : `Se asignaron ${examIds.length} examen(es) correctamente.`,
      })
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "No se pudo guardar el examen." })
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (row: AssignmentRow) => {
    setEditing(row)
    setEditTitle(row.exam?.title || "")
    setEditDescription(row.exam?.description || "")
    setEditDuration(row.exam?.duration_minutes != null ? String(row.exam.duration_minutes) : "")
  }

  const saveEdit = async () => {
    if (!editing?.exam?.id) return
    if (!editTitle.trim()) {
      setMessage({ type: "error", text: "Ingresa un titulo para el examen." })
      return
    }
    setSavingEdit(true)
    try {
      const { error } = await supabase
        .from("edu_exams")
        .update({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          duration_minutes: editDuration.trim() ? Number(editDuration) : null,
        })
        .eq("id", editing.exam.id)
      if (error) throw error
      await loadAssignments()
      await loadCatalog()
      setEditing(null)
      setMessage({ type: "success", text: "Examen actualizado." })
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "No se pudo actualizar." })
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Examenes asignados"
        description="Mismo metodo que ejercicios: el examen existe como contenido y luego se asigna al salon."
        breadcrumbs={[
          { label: "Admin", href: "/dashboard/admin" },
          { label: "Aulas", href: "/dashboard/admin/classrooms" },
          { label: "Detalle", href: `/dashboard/admin/classrooms/${classroomId}` },
          { label: "Examenes" },
        ]}
      />

      {message && (
        <div className={`rounded-md border px-4 py-3 text-sm ${message.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-6">
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap gap-3">
            <Input placeholder="Buscar por tipo, titulo o component_key..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setBlockFilter("") }} className="h-10 rounded-md border px-3 text-sm bg-white">
              <option value="">Todos los tipos</option>
              {assignmentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <select value={blockFilter} onChange={(e) => setBlockFilter(e.target.value)} className="h-10 rounded-md border px-3 text-sm bg-white">
              <option value="">Todos los blocks</option>
              {assignmentBlocks.map((block) => <option key={block} value={block}>{block}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">Cargando examenes...</div>
          ) : filteredAssignments.length === 0 ? (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">No hay examenes asignados con ese filtro.</div>
          ) : (
            <div className="space-y-3">
              {filteredAssignments.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                  <label className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedAssignmentIds.includes(row.id)}
                      onCheckedChange={(checked) =>
                        setSelectedAssignmentIds((prev) => Boolean(checked) ? [...prev, row.id] : prev.filter((id) => id !== row.id))
                      }
                    />
                    <div>
                      <div className="font-medium">{row.exam?.title || row.exam?.id || "Sin titulo"}</div>
                      <div className="text-xs text-muted-foreground">{row.exam?.exam_type || "Sin tipo"} · {row.exam?.block || "Sin block"}</div>
                      <div className="text-xs font-mono text-muted-foreground">{row.exam?.component_key || "Sin component_key"}</div>
                    </div>
                  </label>

                  <div className="flex items-center gap-3">
                    <StatusBadge active={row.active} />
                    <RowActionsMenu
                      actions={[
                        { label: "Editar", onClick: () => openEdit(row) },
                        {
                          label: row.active ? "Desactivar" : "Activar",
                          onClick: async () => {
                            await supabase.from("edu_exam_assignments").update({ active: !row.active }).eq("id", row.id)
                            loadAssignments()
                          },
                        },
                        {
                          label: "Eliminar",
                          variant: "destructive",
                          onClick: async () => {
                            await supabase.from("edu_exam_assignments").delete().eq("id", row.id)
                            loadAssignments()
                          },
                        },
                      ]}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Asignar examenes por catalogo</div>
            <Button type="button" size="sm" variant="secondary" onClick={() => setCreateMode((v) => !v)}>
              {createMode ? "Usar existente" : "Crear nuevo"}
            </Button>
          </div>

          {createMode ? (
            <div className="space-y-3">
              <Input placeholder="Titulo del examen" value={newExam.title} onChange={(e) => setNewExam((s) => ({ ...s, title: e.target.value }))} />
              <textarea className="min-h-24 w-full rounded-md border px-3 py-2 text-sm" placeholder="Descripcion" value={newExam.description} onChange={(e) => setNewExam((s) => ({ ...s, description: e.target.value }))} />
              <select value={newExam.exam_type} onChange={(e) => setNewExam((s) => ({ ...s, exam_type: e.target.value, custom_type: e.target.value === "__custom__" ? s.custom_type : "" }))} className="h-10 rounded-md border px-3 text-sm bg-white">
                <option value="">Selecciona un tipo</option>
                {catalogTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                <option value="__custom__">+ Crear tipo nuevo</option>
              </select>
              {newExam.exam_type === "__custom__" && <Input placeholder="Nuevo tipo" value={newExam.custom_type} onChange={(e) => setNewExam((s) => ({ ...s, custom_type: e.target.value }))} />}
              <select value={newExam.block} onChange={(e) => setNewExam((s) => ({ ...s, block: e.target.value, custom_block: e.target.value === "__custom__" ? s.custom_block : "" }))} className="h-10 rounded-md border px-3 text-sm bg-white">
                <option value="">Selecciona un block</option>
                {catalogBlocks.map((block) => <option key={block} value={block}>{block}</option>)}
                <option value="__custom__">+ Crear block nuevo</option>
              </select>
              {newExam.block === "__custom__" && <Input placeholder="Nuevo block" value={newExam.custom_block} onChange={(e) => setNewExam((s) => ({ ...s, custom_block: e.target.value }))} />}
              <Input placeholder="component_key. Ej: cristo/examenes/algebra-b1" value={newExam.component_key} onChange={(e) => setNewExam((s) => ({ ...s, component_key: e.target.value }))} />
              <Input placeholder="Duracion en minutos (opcional)" value={newExam.duration_minutes} onChange={(e) => setNewExam((s) => ({ ...s, duration_minutes: e.target.value }))} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <select value={catalogTypeFilter} onChange={(e) => { setCatalogTypeFilter(e.target.value); setCatalogBlockFilter("") }} className="h-10 rounded-md border px-3 text-sm bg-white">
                  <option value="">Todos los tipos</option>
                  {catalogTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                <select value={catalogBlockFilter} onChange={(e) => setCatalogBlockFilter(e.target.value)} className="h-10 rounded-md border px-3 text-sm bg-white">
                  <option value="">Todos los blocks</option>
                  {catalogBlocks.map((block) => <option key={block} value={block}>{block}</option>)}
                </select>
              </div>

              <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                <Checkbox
                  checked={allFilteredSelected || (filteredCatalogIds.some((id) => selectedCatalogIds.includes(id)) && "indeterminate")}
                  onCheckedChange={(checked) =>
                    setSelectedCatalogIds(Boolean(checked)
                      ? Array.from(new Set([...selectedCatalogIds, ...filteredCatalogIds]))
                      : selectedCatalogIds.filter((id) => !filteredCatalogIds.includes(id)))
                  }
                />
                Seleccionar todos los examenes filtrados
              </label>

              <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                {filteredCatalog.map((row) => (
                  <label key={row.id} className="flex items-start gap-3 rounded-md border px-3 py-3">
                    <Checkbox
                      checked={selectedCatalogIds.includes(row.id)}
                      onCheckedChange={(checked) =>
                        setSelectedCatalogIds((prev) => Boolean(checked) ? [...prev, row.id] : prev.filter((id) => id !== row.id))
                      }
                    />
                    <div>
                      <div className="font-medium">{row.title}</div>
                      <div className="text-xs text-muted-foreground">{row.exam_type} · {row.block || "Sin block"}</div>
                      <div className="text-xs font-mono text-muted-foreground">{row.component_key}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center gap-3 text-sm">
            <Checkbox checked={assignToGrade} onCheckedChange={(checked) => setAssignToGrade(Boolean(checked))} />
            Asignar tambien a todos los salones del mismo grado
          </label>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : createMode ? "Crear y asignar examen" : "Asignar examenes"}
            </Button>
          </div>
        </form>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-xl border bg-white p-6 shadow-xl">
            <div className="mb-4">
              <div className="text-lg font-semibold">Editar examen</div>
              <div className="text-sm text-muted-foreground">{editing.exam?.component_key}</div>
            </div>
            <div className="space-y-3">
              <Input placeholder="Titulo" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              <textarea className="min-h-24 w-full rounded-md border px-3 py-2 text-sm" placeholder="Descripcion" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
              <Input placeholder="Duracion en minutos" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button type="button" onClick={saveEdit} disabled={savingEdit}>{savingEdit ? "Guardando..." : "Guardar"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

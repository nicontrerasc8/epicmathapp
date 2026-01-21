"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Eye, Edit, Trash2, Plus, Download, X, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  PageHeader,
  FilterBar,
  useFilters,
  DataTable,
  StatusBadge,
  RowActionsMenu,
  type ColumnDef,
  type FilterConfig
} from "@/components/dashboard/core"
import {
  listClassroomsAction,
  listInstitutionsAction,
  createClassroomAction,
  updateClassroomAction,
  deactivateClassroomAction,
} from "../admin-actions"

// Types
type Classroom = {
  id: string
  grade: string
  section?: string | null
  institution_id?: string | null
  academic_year: number
  active: boolean
  classroom_code?: string | null
  edu_institutions?: { id: string; name: string } | null
}

type Institution = {
  id: string
  name: string
  type?: string | null
  code?: string | null
}


const pageSizeOptions = [10, 20, 50, 100]
const primaryGrades = [
  "1-Primaria",
  "2-Primaria",
  "3-Primaria",
  "4-Primaria",
  "5-Primaria",
  "6-Primaria",
]
const secondaryGrades = [
  "1-Secundaria",
  "2-Secundaria",
  "3-Secundaria",
  "4-Secundaria",
  "5-Secundaria",
]
const allowedGrades = [...primaryGrades, ...secondaryGrades]

function getGradeLabel(classroom: Classroom): string {
  const grade = classroom.grade || ""
  const section = classroom.section || ""
  return `${grade} ${section}`.trim()
}



// Helper to get institution name (handles both array and object from Supabase)
function getInstitutionName(classroom: Classroom): string {
  const inst = classroom.edu_institutions
  if (!inst) return "Sin institución"
  if (Array.isArray(inst)) return inst[0]?.name || "Sin institución"
  return inst.name || "Sin institución"
}

// Filter configuration
const filterConfigs: FilterConfig[] = [
  {
    key: "search",
    type: "search",
    label: "Buscar",
    placeholder: "Buscar por grado o institución...",
  },
  {
    key: "active",
    type: "toggle",
    label: "Estado",
    options: [
      { value: "", label: "Todos" },
      { value: "true", label: "Activos" },
      { value: "false", label: "Inactivos" },
    ],
  },
]

// Column definitions
const columns: ColumnDef<Classroom>[] = [
  {
    key: "institution",
    header: "Institución",
    sortable: true,
    render: (_, row) => (
      <div>
        <div className="font-medium">{getInstitutionName(row)}</div>
        <div className="text-xs text-muted-foreground font-mono">
          {row.institution_id || "Sin ID"}
        </div>
      </div>
    ),
  },
  {
    key: "grade",
    header: "Grado",
    width: "100px",
    sortable: true,
    render: (_, row) => (
      <span className="font-medium">{getGradeLabel(row)}</span>
    ),
  },

  {
    key: "academic_year",
    header: "Año",
    width: "100px",
    align: "center",
    sortable: true,
    render: (value) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted">
        {value}
      </span>
    ),
  },
  {
    key: "id",
    header: "ID",
    width: "220px",
    render: (value) => (
      <span className="text-xs text-muted-foreground font-mono">
        {value}
      </span>
    ),
  },
  {
    key: "active",
    header: "Estado",
    width: "120px",
    render: (value) => <StatusBadge active={value} />,
  },
]

export default function ClassroomsTable() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Classroom[]>([])
  const [filteredRows, setFilteredRows] = useState<Classroom[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState(pageSizeOptions[0])
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [form, setForm] = useState({
    institutionId: "",
    grade: "",
    section: "",
    academicYear: String(new Date().getFullYear()),
    active: true,
  })

  // Filters
  const { values, onChange, onClear } = useFilters({
    search: "",
    active: "",
  })

  // Fetch data
  const fetchClassrooms = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await listClassroomsAction()
      setRows(Array.isArray(data) ? (data as any[]) : [])
    } catch (e: any) {
      setError(e?.message ?? "Error cargando aulas")
    } finally {
      setLoading(false)
    }
  }, [])

  const resetForm = useCallback(() => {
    setForm({
      institutionId: "",
      grade: "",
      section: "",
      academicYear: String(new Date().getFullYear()),
      active: true,
    })
    setCreateError(null)
    setCreateSuccess(null)
    setEditId(null)
  }, [])

  useEffect(() => {
    fetchClassrooms()
  }, [fetchClassrooms])

  useEffect(() => {
    if (!showCreate) return
    const loadInstitutions = async () => {
      try {
        setCreateError(null)
        const data = await listInstitutionsAction()
        setInstitutions(data as Institution[])
      } catch (e: any) {
        setCreateError(e?.message ?? "Error cargando instituciones")
      }
    }
    loadInstitutions()
  }, [showCreate])

  useEffect(() => {
    if (!showCreate) return
    if (form.institutionId) return
    if (institutions.length === 1) {
      setForm((s) => ({
        ...s,
        institutionId: institutions[0].id,
      }))
    }
  }, [showCreate, institutions, form.institutionId])

  useEffect(() => {
    setPage(1)
  }, [values.search, values.active, pageSize])

  // Client-side filtering
  useEffect(() => {
    let result = rows

    // Search filter
    if (values.search) {
      const needle = values.search.toLowerCase()
      result = result.filter((r) =>
        getGradeLabel(r).toLowerCase().includes(needle) ||
        getInstitutionName(r).toLowerCase().includes(needle)
      )
    }

    // Active filter
    if (values.active === "true") {
      result = result.filter((r) => r.active)
    } else if (values.active === "false") {
      result = result.filter((r) => !r.active)
    }

    setFilteredRows(result)
  }, [rows, values])

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, page, pageSize])

  // Check if filters are active
  const isFiltered = Boolean(values.search || values.active)

  // Row click handler
  const handleRowClick = (row: Classroom) => {
    router.push(`/dashboard/admin/classrooms/${row.id}`)
  }

  // Row actions
  const renderRowActions = (row: Classroom) => (
    <RowActionsMenu
      actions={[
        {
          label: "Ver detalle",
          icon: <Eye className="w-4 h-4" />,
          onClick: () => router.push(`/dashboard/admin/classrooms/${row.id}`),
        },
        {
          label: "Editar",
          icon: <Edit className="w-4 h-4" />,
          onClick: () => {
            setShowCreate(true)
            setCreateError(null)
            setEditId(row.id)
            setForm({
              institutionId: row.institution_id || "",
              grade: row.grade || "",
              section: row.section || "",
              academicYear: String(row.academic_year ?? new Date().getFullYear()),
              active: Boolean(row.active),
            })
          },
        },
        {
          label: "Eliminar",
          icon: <Trash2 className="w-4 h-4" />,
          variant: "destructive",
          onClick: async () => {
            const ok = window.confirm("¿Seguro que deseas desactivar esta aula?")
            if (!ok) return
            try {
              setActionError(null)
              await deactivateClassroomAction(row.id)
              await fetchClassrooms()
            } catch (e: any) {
              setActionError(e?.message ?? "Error desactivando aula")
            }
          },
        },
      ]}
    />
  )

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateError(null)
    setCreateSuccess(null)
    setShowSuccess(false)

    if (!form.institutionId || !form.grade.trim()) {
      setCreateError("Completa institucion y grado.")
      return
    }

    if (!allowedGrades.includes(form.grade)) {
      setCreateError("Selecciona un grado valido.")
      return
    }

    const year = Number(form.academicYear)
    if (!Number.isFinite(year) || year < 2000) {
      setCreateError("Ingresa un ano valido.")
      return
    }

    try {
      setCreating(true)
      if (editId) {
        await updateClassroomAction(editId, {
          institution_id: form.institutionId,
          grade: form.grade,
          section: form.section || null,
          academic_year: year,
          active: form.active,
        })
        setCreateSuccess("Aula actualizada correctamente.")
      } else {
        await createClassroomAction({
          institution_id: form.institutionId,
          grade: form.grade,
          section: form.section || null,
          academic_year: year,
          active: form.active,
        })
        setCreateSuccess("Aula creada correctamente.")
      }
      setShowSuccess(true)
      resetForm()
      setShowCreate(false)
      await fetchClassrooms()
    } catch (e: any) {
      setCreateError(e?.message ?? "Error creando aula")
    } finally {
      setCreating(false)
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Aulas"
          description="Gestiona las aulas de la plataforma"
        />
        <div className="rounded-xl border bg-destructive/10 p-6 text-center">
          <p className="text-destructive font-medium">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={fetchClassrooms}
          >
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  const closeCreateModal = () => {
    resetForm()
    setShowCreate(false)
  }

  const closeSuccessModal = () => {
    setShowSuccess(false)
    setCreateSuccess(null)
  }

  const selectedInstitution = institutions.find((inst) => inst.id === form.institutionId)
  const institutionCode = (selectedInstitution?.code || selectedInstitution?.name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
  const codePreview = (() => {
    if (!institutionCode || !form.grade || !form.academicYear) return ""
    const [gradeNumber, levelName] = form.grade.split("-")
    const levelCode = levelName === "Primaria" ? "PRI" : "SEC"
    const section = form.section.trim().toUpperCase()
    return `${institutionCode}-${levelCode}-${gradeNumber}${section}-${form.academicYear}`
  })()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Aulas"
        description={loading ? "Cargando..." : `${filteredRows.length} aulas`}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setShowCreate(true)
              setCreateError(null)
              setShowSuccess(false)
              setCreateSuccess(null)
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Aula
          </Button>
        }
      />

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-5xl rounded-2xl border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <div className="text-base font-semibold">
                  {editId ? "Editar aula" : "Nueva aula"}
                </div>
                <div className="text-sm text-muted-foreground">
                  Completa los datos para registrar una nueva aula.
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={closeCreateModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 px-5 py-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="institution">Institucion</Label>
                  <select
                    id="institution"
                    value={form.institutionId}
                    onChange={(e) => {
                      setForm((s) => ({
                        ...s,
                        institutionId: e.target.value,
                      }))
                    }}
                    disabled={institutions.length <= 1}
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="">Selecciona institucion</option>
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">Grado</Label>
                  <select
                    id="grade"
                    value={form.grade}
                    onChange={(e) => setForm((s) => ({ ...s, grade: e.target.value }))}
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="">Selecciona grado</option>
                    <optgroup label="Primaria">
                      {primaryGrades.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Secundaria">
                      {secondaryGrades.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="section">Seccion</Label>
                  <Input
                    id="section"
                    value={form.section}
                    onChange={(e) => setForm((s) => ({ ...s, section: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="academicYear">Ano</Label>
                  <Input
                    id="academicYear"
                    type="number"
                    min={2000}
                    max={2100}
                    value={form.academicYear}
                    onChange={(e) => setForm((s) => ({ ...s, academicYear: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="classroomCode">Codigo</Label>
                  <Input id="classroomCode" value={codePreview} readOnly />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="active"
                  checked={form.active}
                  onCheckedChange={(val) => setForm((s) => ({ ...s, active: Boolean(val) }))}
                />
                <Label htmlFor="active">Activo</Label>
              </div>
              {createError && <p className="text-sm text-destructive">{createError}</p>}
              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={creating}>
                  {creating ? "Guardando..." : editId ? "Actualizar Aula" : "Crear Aula"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={closeCreateModal}>
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div className="text-base font-semibold">Operacion completada</div>
              <Button variant="ghost" size="sm" onClick={closeSuccessModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-sm font-medium">Listo</div>
                  <div className="text-sm text-muted-foreground">
                    {createSuccess || "Aula creada correctamente."}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end">
                <Button size="sm" onClick={closeSuccessModal}>
                  Aceptar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {actionError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {/* Filters */}
      <FilterBar
        filters={filterConfigs}
        values={values}
        onChange={onChange}
        onClear={onClear}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {filteredRows.length} resultados
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

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={pagedRows}
        loading={loading}
        emptyState={{
          title: "aulas",
          description: "Aún no hay aulas registradas.",
        }}
        isFiltered={isFiltered}
        onClearFilters={onClear}
        pagination={{
          page,
          pageSize,
          total: filteredRows.length,
        }}
        onPageChange={setPage}
        selectable
        onRowClick={handleRowClick}
        rowActions={renderRowActions}
        bulkActions={[
          {
            label: "Exportar",
            icon: <Download className="w-4 h-4 mr-1" />,
            onClick: (ids) => console.log("Export:", ids),
          },
        ]}
      />
    </div>
  )
}












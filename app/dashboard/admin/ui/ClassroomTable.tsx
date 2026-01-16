"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import type { FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, Edit, Trash2, Plus, Download } from "lucide-react"
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
  listInstitutionGradesAction,
  listGradeSectionsAction,
  createClassroomAction,
  updateClassroomAction,
  deactivateClassroomAction,
} from "../admin-actions"

// Types
type Classroom = {
  id: string
  grade: string
  section: string | null
  grade_id?: string | null
  section_id?: string | null
  institution_id?: string | null
  academic_year: number
  active: boolean
  edu_institutions?: any
  edu_institution_grades?: any
  edu_grade_sections?: any
}

type Institution = {
  id: string
  name: string
  type?: string | null
  code?: string | null
}

type InstitutionGrade = {
  id: string
  institution_id: string
  name: string
  code?: string | null
  level?: string | null
  grade_num?: number | null
}

type GradeSection = {
  id: string
  grade_id: string
  name: string
  code?: string | null
}

const pageSizeOptions = [10, 20, 50, 100]

function getGradeLabel(classroom: Classroom): string {
  const grade = classroom.edu_institution_grades
  if (Array.isArray(grade)) {
    return grade[0]?.name || grade[0]?.code || classroom.grade
  }
  return grade?.name || grade?.code || classroom.grade
}

function getSectionLabel(classroom: Classroom): string {
  const section = classroom.edu_grade_sections
  if (Array.isArray(section)) {
    return section[0]?.name || section[0]?.code || classroom.section || "Sin sección"
  }
  return section?.name || section?.code || classroom.section || "Sin sección"
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
    key: "section",
    header: "Sección",
    width: "100px",
    render: (_, row) => getSectionLabel(row),
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
  const [actionError, setActionError] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [grades, setGrades] = useState<InstitutionGrade[]>([])
  const [sections, setSections] = useState<GradeSection[]>([])
  const [form, setForm] = useState({
    institutionId: "",
    gradeId: "",
    sectionId: "",
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
      setRows(data as Classroom[])
    } catch (e: any) {
      setError(e?.message ?? "Error cargando aulas")
    } finally {
      setLoading(false)
    }
  }, [])

  const resetForm = useCallback(() => {
    setForm({
      institutionId: "",
      gradeId: "",
      sectionId: "",
      academicYear: String(new Date().getFullYear()),
      active: true,
    })
    setGrades([])
    setSections([])
    setCreateError(null)
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
    if (!form.institutionId) {
      setGrades([])
      setSections([])
      return
    }
    const loadGrades = async () => {
      try {
        setCreateError(null)
        const data = await listInstitutionGradesAction(form.institutionId)
        setGrades(data as InstitutionGrade[])
      } catch (e: any) {
        setCreateError(e?.message ?? "Error cargando grados")
      }
    }
    loadGrades()
  }, [form.institutionId])

  useEffect(() => {
    if (!form.gradeId) {
      setSections([])
      return
    }
    const loadSections = async () => {
      try {
        setCreateError(null)
        const data = await listGradeSectionsAction(form.gradeId)
        setSections(data as GradeSection[])
      } catch (e: any) {
        setCreateError(e?.message ?? "Error cargando secciones")
      }
    }
    loadSections()
  }, [form.gradeId])

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
        getInstitutionName(r).toLowerCase().includes(needle) ||
        getSectionLabel(r).toLowerCase().includes(needle)
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
              gradeId: row.grade_id || "",
              sectionId: row.section_id || "",
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

    if (!form.institutionId || !form.gradeId || !form.sectionId) {
      setCreateError("Completa institucion, grado y seccion.")
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
          grade_id: form.gradeId,
          section_id: form.sectionId,
          academic_year: year,
          active: form.active,
        })
      } else {
        await createClassroomAction({
          institution_id: form.institutionId,
          grade_id: form.gradeId,
          section_id: form.sectionId,
          academic_year: year,
          active: form.active,
        })
      }
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
              setShowCreate((s) => !s)
              if (showCreate) resetForm()
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            {showCreate ? "Cerrar" : "Nueva Aula"}
          </Button>
        }
      />

      {showCreate && (
        <form onSubmit={handleCreateSubmit} className="rounded-xl border bg-card p-4 space-y-4">
          <div className="text-sm font-medium">
            {editId ? "Editar aula" : "Nueva aula"}
          </div>
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
                    gradeId: "",
                    sectionId: "",
                  }))
                }}
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
                value={form.gradeId}
                onChange={(e) => {
                  setForm((s) => ({
                    ...s,
                    gradeId: e.target.value,
                    sectionId: "",
                  }))
                }}
                disabled={!form.institutionId}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60"
              >
                <option value="">Selecciona grado</option>
                {grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name || grade.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="section">Seccion</Label>
              <select
                id="section"
                value={form.sectionId}
                onChange={(e) => setForm((s) => ({ ...s, sectionId: e.target.value }))}
                disabled={!form.gradeId}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60"
              >
                <option value="">Selecciona seccion</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name || section.code}
                  </option>
                ))}
              </select>
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                resetForm()
                setShowCreate(false)
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
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


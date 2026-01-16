"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import type { FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, Edit, Trash2, UserPlus, Download } from "lucide-react"
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
  listStudentsAction,
  listClassroomsAction,
  createStudentAction,
  updateStudentAction,
  deactivateStudentAction,
} from "../admin-actions"

// Types
type Student = {
  id: string
  first_name: string
  last_name: string
  full_name: string
  global_role: "student" | "teacher" | "admin" | null
  active: boolean
  created_at?: string
  edu_institution_members?: InstitutionMember[]
}

type InstitutionMember = {
  id: string
  role: string
  active: boolean
  institution_id: string | null
  classroom_id: string | null
  edu_institutions?: { id: string; name: string } | null
  edu_classrooms?: {
    id: string
    academic_year: number
    grade: string
    section: string | null
    edu_institution_grades?: { name: string; code: string } | null
    edu_grade_sections?: { name: string; code: string } | null
  } | null
}

type ClassroomOption = {
  id: string
  institution_id: string | null
  academic_year: number
  grade: string
  section: string | null
  active?: boolean
  edu_institutions?: { id: string; name: string } | null
  edu_institution_grades?: { name: string; code: string } | null
  edu_grade_sections?: { name: string; code: string } | null
}

const pageSizeOptions = [10, 20, 50, 100]

function getPrimaryMembership(student: Student) {
  const members = student.edu_institution_members || []
  const active = members.find((m) => m.active)
  return active || members[0]
}

function getMembershipGrade(member?: InstitutionMember) {
  if (!member?.edu_classrooms) return ""
  const grade = member.edu_classrooms.edu_institution_grades as any
  if (Array.isArray(grade)) {
    return grade[0]?.name || grade[0]?.code || member.edu_classrooms.grade || ""
  }
  return grade?.name || grade?.code || member.edu_classrooms.grade || ""
}

function getMembershipSection(member?: InstitutionMember) {
  if (!member?.edu_classrooms) return ""
  const section = member.edu_classrooms.edu_grade_sections as any
  if (Array.isArray(section)) {
    return section[0]?.name || section[0]?.code || member.edu_classrooms.section || ""
  }
  return section?.name || section?.code || member.edu_classrooms.section || ""
}

function getClassroomLabel(cls: ClassroomOption) {
  const grade = cls.edu_institution_grades as any
  const section = cls.edu_grade_sections as any
  const gradeLabel = Array.isArray(grade)
    ? grade[0]?.name || grade[0]?.code || cls.grade
    : grade?.name || grade?.code || cls.grade
  const sectionLabel = Array.isArray(section)
    ? section[0]?.name || section[0]?.code || cls.section || ""
    : section?.name || section?.code || cls.section || ""
  return `${gradeLabel} ${sectionLabel}`.trim()
}

// Filter configuration
const filterConfigs: FilterConfig[] = [
  {
    key: "search",
    type: "search",
    label: "Buscar",
    placeholder: "Buscar por nombre o ID...",
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
const columns: ColumnDef<Student>[] = [
  {
    key: "full_name",
    header: "Nombre",
    sortable: true,
    render: (_, row) => (
      <div className="font-medium">{row.full_name}</div>
    ),
  },
  {
    key: "institution",
    header: "Institucion",
    render: (_, row) => {
      const member = getPrimaryMembership(row)
      return (
        <span className="text-sm">
          {member?.edu_institutions?.name || "Sin institucion"}
        </span>
      )
    },
  },
  {
    key: "grade",
    header: "Grado",
    render: (_, row) => {
      const member = getPrimaryMembership(row)
      return (
        <span className="text-sm">
          {getMembershipGrade(member) || "Sin grado"}
        </span>
      )
    },
  },
  {
    key: "section",
    header: "Seccion",
    render: (_, row) => {
      const member = getPrimaryMembership(row)
      return (
        <span className="text-sm">
          {getMembershipSection(member) || "Sin seccion"}
        </span>
      )
    },
  },
  {
    key: "academic_year",
    header: "Ano",
    width: "90px",
    render: (_, row) => {
      const member = getPrimaryMembership(row)
      return (
        <span className="text-xs text-muted-foreground">
          {member?.edu_classrooms?.academic_year || "—"}
        </span>
      )
    },
  },
  {
    key: "id",
    header: "ID",
    width: "200px",
    render: (value) => (
      <span className="font-mono text-xs text-muted-foreground">
        {value.slice(0, 8)}...
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

export default function StudentsTable() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Student[]>([])
  const [filteredRows, setFilteredRows] = useState<Student[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState(pageSizeOptions[0])
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    classroomId: "",
    active: true,
  })

  // Filters
  const { values, onChange, onClear } = useFilters({
    search: "",
    active: "",
  })

  // Fetch data
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await listStudentsAction(values.search || "")
      setRows(data as Student[])
    } catch (e: any) {
      setError(e?.message ?? "Error cargando estudiantes")
    } finally {
      setLoading(false)
    }
  }, [values.search])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  useEffect(() => {
    if (!showCreate) return
    const loadClassrooms = async () => {
      try {
        setCreateError(null)
        const data = await listClassroomsAction()
        const active = (data as ClassroomOption[]).filter((c) => c.active !== false)
        setClassrooms(active)
      } catch (e: any) {
        setCreateError(e?.message ?? "Error cargando aulas")
      }
    }
    loadClassrooms()
  }, [showCreate])

  useEffect(() => {
    setPage(1)
  }, [values.search, values.active, pageSize])

  // Client-side filtering for active status
  useEffect(() => {
    let result = rows

    if (values.active === "true") {
      result = result.filter((r) => r.active)
    } else if (values.active === "false") {
      result = result.filter((r) => !r.active)
    }

    setFilteredRows(result)
  }, [rows, values.active])

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, page, pageSize])

  // Check if filters are active
  const isFiltered = Boolean(values.search || values.active)

  // Row click handler
  const handleRowClick = (row: Student) => {
    router.push(`/dashboard/admin/students/${row.id}`)
  }

  // Row actions
  const renderRowActions = (row: Student) => (
    <RowActionsMenu
      actions={[
        {
          label: "Ver detalle",
          icon: <Eye className="w-4 h-4" />,
          onClick: () => router.push(`/dashboard/admin/students/${row.id}`),
        },
        {
          label: "Editar",
          icon: <Edit className="w-4 h-4" />,
          onClick: () => {
            const member = getPrimaryMembership(row)
            setEditId(row.id)
            setShowCreate(true)
            setCreateError(null)
            setCreateSuccess(null)
            setForm({
              firstName: row.first_name,
              lastName: row.last_name,
              email: "",
              password: "",
              classroomId: member?.classroom_id || "",
              active: Boolean(row.active),
            })
          },
        },
        {
          label: "Eliminar",
          icon: <Trash2 className="w-4 h-4" />,
          variant: "destructive",
          onClick: async () => {
            const ok = window.confirm("¿Seguro que deseas desactivar este estudiante?")
            if (!ok) return
            try {
              setCreateError(null)
              await deactivateStudentAction(row.id)
              await fetchStudents()
            } catch (e: any) {
              setCreateError(e?.message ?? "Error desactivando estudiante")
            }
          },
        },
      ]}
    />
  )

  const resetForm = () => {
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      classroomId: "",
    })
    setCreateError(null)
    setEditId(null)
  }

  const clearMessages = () => {
    setCreateError(null)
    setCreateSuccess(null)
  }

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateError(null)
    setCreateSuccess(null)

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setCreateError("Completa nombre y apellido.")
      return
    }
    if (!editId && !form.email.trim()) {
      setCreateError("Completa el correo.")
      return
    }

    try {
      setCreating(true)
      if (editId) {
        await updateStudentAction(editId, {
          first_name: form.firstName,
          last_name: form.lastName,
          classroom_id: form.classroomId || null,
          active: form.active,
        })
        setCreateSuccess("Estudiante actualizado.")
      } else {
        const result = await createStudentAction({
          email: form.email,
          password: form.password || undefined,
          first_name: form.firstName,
          last_name: form.lastName,
          classroom_id: form.classroomId || null,
        })
        const passwordInfo = result?.password ? `Password: ${result.password}` : "Usuario creado."
        setCreateSuccess(passwordInfo)
      }
      resetForm()
      await fetchStudents()
    } catch (e: any) {
      setCreateError(e?.message ?? "Error creando estudiante")
    } finally {
      setCreating(false)
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Estudiantes"
          description="Gestiona los estudiantes de la plataforma"
        />
        <div className="rounded-xl border bg-destructive/10 p-6 text-center">
          <p className="text-destructive font-medium">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={fetchStudents}
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
        title="Estudiantes"
        description={loading ? "Cargando..." : `${filteredRows.length} estudiantes`}
        actions={
          <div className="flex gap-2">
            <Link href="/dashboard/admin/students/import">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Importar
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => {
                setShowCreate((s) => !s)
                if (showCreate) {
                  resetForm()
                  clearMessages()
                }
              }}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {showCreate ? "Cerrar" : "Nuevo"}
            </Button>
          </div>
        }
      />

      {showCreate && (
        <form onSubmit={handleCreateSubmit} className="rounded-xl border bg-card p-4 space-y-4">
          <div className="text-sm font-medium">{editId ? "Editar estudiante" : "Nuevo estudiante"}</div>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="studentFirstName">Nombre</Label>
              <Input
                id="studentFirstName"
                value={form.firstName}
                onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentLastName">Apellido</Label>
              <Input
                id="studentLastName"
                value={form.lastName}
                onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentEmail">Correo</Label>
              <Input
                id="studentEmail"
                type="email"
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                disabled={Boolean(editId)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentPassword">Password (opcional)</Label>
              <Input
                id="studentPassword"
                type="text"
                value={form.password}
                onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                disabled={Boolean(editId)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="studentClassroom">Aula</Label>
              <select
                id="studentClassroom"
                value={form.classroomId}
                onChange={(e) => setForm((s) => ({ ...s, classroomId: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">Sin asignar</option>
                {classrooms.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.edu_institutions?.name || "Sin institucion"} - {getClassroomLabel(cls)} - {cls.academic_year}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Checkbox
                id="studentActive"
                checked={form.active}
                onCheckedChange={(val) => setForm((s) => ({ ...s, active: Boolean(val) }))}
              />
              <Label htmlFor="studentActive">Activo</Label>
            </div>
          </div>
          {createError && <p className="text-sm text-destructive">{createError}</p>}
          {createSuccess && <p className="text-sm text-foreground">{createSuccess}</p>}
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={creating}>
              {creating ? "Guardando..." : editId ? "Actualizar estudiante" : "Crear estudiante"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                resetForm()
                clearMessages()
                setShowCreate(false)
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
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
          title: "estudiantes",
          description: "Aún no hay estudiantes registrados.",
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

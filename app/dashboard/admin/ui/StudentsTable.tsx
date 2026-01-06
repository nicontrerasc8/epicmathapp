"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, Edit, Trash2, UserPlus, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { listStudentsAction } from "../admin-actions"

// Types
type Student = {
  id: string
  first_name: string
  last_name: string
  full_name: string
  global_role: "student" | "teacher" | "admin" | null
  active: boolean
  created_at?: string
}

const pageSizeOptions = [10, 20, 50, 100]

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
          onClick: () => {/* TODO: implement edit */ },
        },
        {
          label: "Eliminar",
          icon: <Trash2 className="w-4 h-4" />,
          variant: "destructive",
          onClick: () => {/* TODO: implement delete */ },
        },
      ]}
    />
  )

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
            <Button size="sm">
              <UserPlus className="w-4 h-4 mr-2" />
              Nuevo
            </Button>
          </div>
        }
      />

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

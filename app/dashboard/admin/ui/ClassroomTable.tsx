"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, Edit, Trash2, Plus, Download } from "lucide-react"
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
import { listClassroomsAction } from "../admin-actions"

// Types
type Classroom = {
  id: string
  grade: string
  section: string | null
  academic_year: number
  active: boolean
  edu_institutions?: any
}

const pageSizeOptions = [10, 20, 50, 100]

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
      <div className="font-medium">
        {getInstitutionName(row)}
      </div>
    ),
  },
  {
    key: "grade",
    header: "Grado",
    width: "100px",
    sortable: true,
    render: (value) => (
      <span className="font-medium">{value}</span>
    ),
  },
  {
    key: "section",
    header: "Sección",
    width: "100px",
    render: (value) => value || "—",
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

  useEffect(() => {
    fetchClassrooms()
  }, [fetchClassrooms])

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
        r.grade.toLowerCase().includes(needle) ||
        getInstitutionName(r).toLowerCase().includes(needle) ||
        r.section?.toLowerCase().includes(needle)
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
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Aula
          </Button>
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

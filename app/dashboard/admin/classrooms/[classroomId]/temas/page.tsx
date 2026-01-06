"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import {
  PageHeader,
  DataTable,
  StatusBadge,
  type ColumnDef
} from "@/components/dashboard/core"
import { Input } from "@/components/ui/input"

interface ClassroomTema {
  id: string
  active: boolean
  tema: {
    name: string
    description: string
    area?: {
      name: string
    } | null
    subblock?: {
      name: string
    } | null
  }
}

const pageSizeOptions = [10, 20, 50, 100]

const columns: ColumnDef<ClassroomTema>[] = [
  {
    key: "area",
    header: "Area",
    render: (_, row) => (
      <div>
        <div className="font-medium">{row.tema.area?.name || "Sin area"}</div>
        <div className="text-sm text-muted-foreground">{row.tema.subblock?.name || "Sin sub-bloque"}</div>
      </div>
    ),
  },
  {
    key: "active",
    header: "Estado",
    render: (val) => <StatusBadge active={val} />,
  },
]

export default function ClassroomTemasPage() {
  const params = useParams()
  const classroomId = params.classroomId as string
  const [loading, setLoading] = useState(true)
  const [temas, setTemas] = useState<ClassroomTema[]>([])
  const [search, setSearch] = useState("")
  const [pageSize, setPageSize] = useState(pageSizeOptions[0])
  const [page, setPage] = useState(1)

  useEffect(() => {
    const fetchTemas = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("edu_classroom_temas")
        .select(`
          id,
          active,
          tema:edu_temas (
            name,
            description,
            area:edu_areas ( name ),
            subblock:edu_academic_subblocks ( name )
          )
        `)
        .eq("classroom_id", classroomId)

      if (data) {
        setTemas(data.map((t: any) => ({
          id: t.id,
          active: t.active,
          tema: t.tema
        })))
      }
      setLoading(false)
    }
    fetchTemas()
  }, [classroomId])

  useEffect(() => {
    setPage(1)
  }, [search, pageSize])

  const filteredTemas = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return temas
    return temas.filter((t) =>
      (t.tema.area?.name || "").toLowerCase().includes(needle) ||
      (t.tema.subblock?.name || "").toLowerCase().includes(needle)
    )
  }, [temas, search])

  const pagedTemas = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredTemas.slice(start, start + pageSize)
  }, [filteredTemas, page, pageSize])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Temas Asignados"
        breadcrumbs={[
          { label: "Admin", href: "/dashboard/admin" },
          { label: "Aulas", href: "/dashboard/admin/classrooms" },
          { label: "Detalle", href: `/dashboard/admin/classrooms/${classroomId}` },
          { label: "Temas" },
        ]}
      />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-[220px] flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por area o sub-bloque..."
            />
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

        <DataTable
          columns={columns}
          data={pagedTemas}
          loading={loading}
          emptyState={{
            title: "temas",
            description: "No hay temas asignados a esta aula."
          }}
          pagination={{
            page,
            pageSize,
            total: filteredTemas.length,
          }}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}

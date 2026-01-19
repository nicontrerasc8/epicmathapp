"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { useInstitution } from "@/components/institution-provider"
import {
  PageHeader,
  DataTable,
  RowActionsMenu,
  StatusBadge,
  type ColumnDef
} from "@/components/dashboard/core"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

interface ClassroomBlock {
  id: string
  active: boolean
  started_at: string | null
  ended_at: string | null
  block: {
    id: string
    name: string
    block_type: string
    academic_year: number
    ordering: number | null
  } | null
}

interface BlockOption {
  id: string
  name: string
  block_type: string
  academic_year: number
  ordering: number | null
}

type Message = {
  type: "success" | "error"
  text: string
}

const pageSizeOptions = [10, 20, 50, 100]

const columns: ColumnDef<ClassroomBlock>[] = [
  {
    key: "block",
    header: "Bloque",
    render: (_, row) => (
      <div>
        <div className="font-medium">{row.block?.name || "Sin bloque"}</div>
        <div className="text-xs text-muted-foreground">
          {row.block?.block_type || "Sin tipo"} - {row.block?.academic_year || "N/A"}
        </div>
      </div>
    ),
  },
  {
    key: "ordering",
    header: "Orden",
    render: (_, row) => row.block?.ordering ?? "-",
  },
  {
    key: "started_at",
    header: "Inicio",
    render: (val) => (val ? new Date(val).toLocaleDateString() : "-"),
  },
  {
    key: "ended_at",
    header: "Fin",
    render: (val) => (val ? new Date(val).toLocaleDateString() : "-"),
  },
  {
    key: "active",
    header: "Estado",
    render: (val) => <StatusBadge active={val} />,
  },
]

export default function ClassroomBlocksPage() {
  const params = useParams()
  const classroomId = params.classroomId as string
  const institution = useInstitution()
  const [loading, setLoading] = useState(true)
  const [blocks, setBlocks] = useState<ClassroomBlock[]>([])
  const [blockOptions, setBlockOptions] = useState<BlockOption[]>([])
  const [message, setMessage] = useState<Message | null>(null)
  const [blockMessage, setBlockMessage] = useState<Message | null>(null)
  const [subblockMessage, setSubblockMessage] = useState<Message | null>(null)
  const [search, setSearch] = useState("")
  const [pageSize, setPageSize] = useState(pageSizeOptions[0])
  const [page, setPage] = useState(1)

  const [form, setForm] = useState({
    block_id: "",
    started_at: "",
    ended_at: "",
    active: true,
  })
  const [blockForm, setBlockForm] = useState({
    name: "",
    block_type: "bimestre",
    academic_year: new Date().getFullYear(),
    ordering: "",
    active: true,
  })
  const [subblockForm, setSubblockForm] = useState({
    block_id: "",
    name: "",
    ordering: "",
    active: true,
  })

  useEffect(() => {
    const fetchAssignments = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("edu_classroom_blocks")
        .select(`
          id,
          active,
          started_at,
          ended_at,
          block:edu_academic_blocks (
            id, name, block_type, academic_year, ordering
          )
        `)
        .eq("classroom_id", classroomId)
        .order("created_at", { ascending: false })

      if (data) {
        setBlocks(data as ClassroomBlock[])
      }
      setLoading(false)
    }

    const fetchBlockOptions = async () => {
      const supabase = createClient()
      let query = supabase
        .from("edu_academic_blocks")
        .select("id, name, block_type, academic_year, ordering")
        .eq("active", true)
        .order("academic_year", { ascending: false })
        .order("ordering", { ascending: true })
      if (institution?.id) {
        query = query.eq("institution_id", institution.id)
      }
      const { data } = await query

      if (data) {
        setBlockOptions(data as BlockOption[])
      }
    }

    fetchAssignments()
    fetchBlockOptions()
  }, [classroomId])

  useEffect(() => {
    setPage(1)
  }, [search, pageSize])

  const filteredBlocks = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return blocks
    return blocks.filter((row) => {
      const name = row.block?.name || ""
      const type = row.block?.block_type || ""
      const year = row.block?.academic_year ? String(row.block.academic_year) : ""
      return (
        name.toLowerCase().includes(needle) ||
        type.toLowerCase().includes(needle) ||
        year.includes(needle)
      )
    })
  }, [blocks, search])

  const pagedBlocks = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredBlocks.slice(start, start + pageSize)
  }, [filteredBlocks, page, pageSize])

  async function refreshAssignments() {
    const supabase = createClient()
    const { data } = await supabase
      .from("edu_classroom_blocks")
      .select(`
        id,
        active,
        started_at,
        ended_at,
        block:edu_academic_blocks (
          id, name, block_type, academic_year, ordering
        )
      `)
      .eq("classroom_id", classroomId)
      .order("created_at", { ascending: false })

    if (data) {
      setBlocks(data as ClassroomBlock[])
    }
  }

  async function refreshBlockOptions() {
    const supabase = createClient()
    let query = supabase
      .from("edu_academic_blocks")
      .select("id, name, block_type, academic_year, ordering")
      .eq("active", true)
      .order("academic_year", { ascending: false })
      .order("ordering", { ascending: true })
    if (institution?.id) {
      query = query.eq("institution_id", institution.id)
    }
    const { data } = await query
    if (data) {
      setBlockOptions(data as BlockOption[])
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bloques Asignados"
        breadcrumbs={[
          { label: "Admin", href: "/dashboard/admin" },
          { label: "Aulas", href: "/dashboard/admin/classrooms" },
          { label: "Detalle", href: `/dashboard/admin/classrooms/${classroomId}` },
          { label: "Bloques" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-[220px] flex-1">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, tipo o anio..."
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
            data={pagedBlocks}
            loading={loading}
            emptyState={{
              title: "bloques",
              description: "No hay bloques asignados a esta aula."
            }}
            pagination={{
              page,
              pageSize,
              total: filteredBlocks.length,
            }}
            onPageChange={setPage}
            rowActions={(row) => (
              <RowActionsMenu
                actions={[
                  {
                    label: row.active ? "Desactivar" : "Activar",
                    onClick: async () => {
                      const supabase = createClient()
                      await supabase
                        .from("edu_classroom_blocks")
                        .update({ active: !row.active })
                        .eq("id", row.id)
                      await refreshAssignments()
                    },
                  },
                  {
                    label: "Eliminar",
                    variant: "destructive",
                    onClick: async () => {
                      const supabase = createClient()
                      await supabase
                        .from("edu_classroom_blocks")
                        .delete()
                        .eq("id", row.id)
                      await refreshAssignments()
                    },
                  },
                ]}
              />
            )}
          />
        </div>

        <div className="space-y-4">
          <form
            className="space-y-4 rounded-xl border bg-card p-4"
            onSubmit={async (e) => {
              e.preventDefault()
              setMessage(null)

              if (!form.block_id) {
                setMessage({ type: "error", text: "Selecciona un bloque." })
                return
              }

              const exists = blocks.some((row) => row.block?.id === form.block_id)
              if (exists) {
                setMessage({ type: "error", text: "Este bloque ya esta asignado al aula." })
                return
              }

              const supabase = createClient()
              const { error } = await supabase
                .from("edu_classroom_blocks")
                .insert({
                  classroom_id: classroomId,
                  block_id: form.block_id,
                  started_at: form.started_at || null,
                  ended_at: form.ended_at || null,
                  active: form.active,
                })

              if (error) {
                setMessage({ type: "error", text: error.message || "No se pudo asignar." })
                return
              }

              await refreshAssignments()
              setForm({
                block_id: "",
                started_at: "",
                ended_at: "",
                active: true,
              })
              setMessage({ type: "success", text: "Bloque asignado." })
            }}
          >
            <div className="text-sm font-medium">Asignar bloque al aula</div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Bloque</label>
              <select
                value={form.block_id}
                onChange={(e) => setForm((s) => ({ ...s, block_id: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecciona un bloque</option>
                {blockOptions.map((block) => (
                  <option key={block.id} value={block.id}>
                    {block.name} - {block.block_type} ({block.academic_year})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Inicio</label>
              <Input
                type="date"
                value={form.started_at}
                onChange={(e) => setForm((s) => ({ ...s, started_at: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fin</label>
              <Input
                type="date"
                value={form.ended_at}
                onChange={(e) => setForm((s) => ({ ...s, ended_at: e.target.value }))}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.active}
                onCheckedChange={(val) => setForm((s) => ({ ...s, active: Boolean(val) }))}
              />
              Activo
            </label>

            {message && (
              <div
                className={`rounded-md border p-3 text-sm ${
                  message.type === "error"
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="submit">Asignar</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setForm({
                    block_id: "",
                    started_at: "",
                    ended_at: "",
                    active: true,
                  })
                  setMessage(null)
                }}
              >
                Limpiar
              </Button>
            </div>
          </form>

          <form
            className="space-y-4 rounded-xl border bg-card p-4"
            onSubmit={async (e) => {
              e.preventDefault()
              setBlockMessage(null)

              if (!institution?.id) {
                setBlockMessage({ type: "error", text: "Institucion no encontrada." })
                return
              }
              if (!blockForm.name.trim()) {
                setBlockMessage({ type: "error", text: "Completa el nombre del bloque." })
                return
              }
              if (!Number.isFinite(blockForm.academic_year)) {
                setBlockMessage({ type: "error", text: "Anio invalido." })
                return
              }

              const orderingValue = blockForm.ordering.trim()
                ? Number(blockForm.ordering)
                : null
              if (orderingValue !== null && !Number.isFinite(orderingValue)) {
                setBlockMessage({ type: "error", text: "Orden invalido." })
                return
              }

              const supabase = createClient()
              const { data, error } = await supabase
                .from("edu_academic_blocks")
                .insert({
                  name: blockForm.name.trim(),
                  block_type: blockForm.block_type,
                  academic_year: blockForm.academic_year,
                  ordering: orderingValue,
                  active: blockForm.active,
                  institution_id: institution.id,
                })
                .select("id")
                .single()

              if (error) {
                setBlockMessage({ type: "error", text: error.message || "No se pudo crear." })
                return
              }

              await refreshBlockOptions()
              setForm((s) => ({ ...s, block_id: data?.id || s.block_id }))
              setBlockForm({
                name: "",
                block_type: "bimestre",
                academic_year: new Date().getFullYear(),
                ordering: "",
                active: true,
              })
              setBlockMessage({ type: "success", text: "Bloque creado." })
            }}
          >
            <div className="text-sm font-medium">Crear bloque</div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={blockForm.name}
                onChange={(e) => setBlockForm((s) => ({ ...s, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <select
                value={blockForm.block_type}
                onChange={(e) => setBlockForm((s) => ({ ...s, block_type: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="bimestre">Bimestre</option>
                <option value="trimestre">Trimestre</option>
                <option value="unidad">Unidad</option>
                <option value="semestre">Semestre</option>
                <option value="modulo">Modulo</option>
                <option value="bloque">Bloque</option>
                <option value="periodo">Periodo</option>
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Anio</label>
                <Input
                  type="number"
                  value={blockForm.academic_year}
                  onChange={(e) =>
                    setBlockForm((s) => ({ ...s, academic_year: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Orden</label>
                <Input
                  type="number"
                  value={blockForm.ordering}
                  onChange={(e) => setBlockForm((s) => ({ ...s, ordering: e.target.value }))}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={blockForm.active}
                onCheckedChange={(val) => setBlockForm((s) => ({ ...s, active: Boolean(val) }))}
              />
              Activo
            </label>
            {blockMessage && (
              <div
                className={`rounded-md border p-3 text-sm ${
                  blockMessage.type === "error"
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                }`}
              >
                {blockMessage.text}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="submit">Crear bloque</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setBlockForm({
                    name: "",
                    block_type: "bimestre",
                    academic_year: new Date().getFullYear(),
                    ordering: "",
                    active: true,
                  })
                  setBlockMessage(null)
                }}
              >
                Limpiar
              </Button>
            </div>
          </form>

          <form
            className="space-y-4 rounded-xl border bg-card p-4"
            onSubmit={async (e) => {
              e.preventDefault()
              setSubblockMessage(null)

              if (!institution?.id) {
                setSubblockMessage({ type: "error", text: "Institucion no encontrada." })
                return
              }
              if (!subblockForm.block_id) {
                setSubblockMessage({ type: "error", text: "Selecciona un bloque." })
                return
              }
              if (!subblockForm.name.trim()) {
                setSubblockMessage({ type: "error", text: "Completa el nombre del sub-bloque." })
                return
              }

              const orderingValue = subblockForm.ordering.trim()
                ? Number(subblockForm.ordering)
                : null
              if (orderingValue !== null && !Number.isFinite(orderingValue)) {
                setSubblockMessage({ type: "error", text: "Orden invalido." })
                return
              }

              const supabase = createClient()
              const { error } = await supabase
                .from("edu_academic_subblocks")
                .insert({
                  block_id: subblockForm.block_id,
                  name: subblockForm.name.trim(),
                  ordering: orderingValue,
                  active: subblockForm.active,
                  institution_id: institution.id,
                })

              if (error) {
                setSubblockMessage({ type: "error", text: error.message || "No se pudo crear." })
                return
              }

              setSubblockForm({
                block_id: "",
                name: "",
                ordering: "",
                active: true,
              })
              setSubblockMessage({ type: "success", text: "Sub-bloque creado." })
            }}
          >
            <div className="text-sm font-medium">Crear sub-bloque</div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bloque</label>
              <select
                value={subblockForm.block_id}
                onChange={(e) => setSubblockForm((s) => ({ ...s, block_id: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecciona un bloque</option>
                {blockOptions.map((block) => (
                  <option key={block.id} value={block.id}>
                    {block.name} - {block.block_type} ({block.academic_year})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={subblockForm.name}
                onChange={(e) => setSubblockForm((s) => ({ ...s, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Orden</label>
              <Input
                type="number"
                value={subblockForm.ordering}
                onChange={(e) => setSubblockForm((s) => ({ ...s, ordering: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={subblockForm.active}
                onCheckedChange={(val) => setSubblockForm((s) => ({ ...s, active: Boolean(val) }))}
              />
              Activo
            </label>
            {subblockMessage && (
              <div
                className={`rounded-md border p-3 text-sm ${
                  subblockMessage.type === "error"
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                }`}
              >
                {subblockMessage.text}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="submit">Crear sub-bloque</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSubblockForm({
                    block_id: "",
                    name: "",
                    ordering: "",
                    active: true,
                  })
                  setSubblockMessage(null)
                }}
              >
                Limpiar
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

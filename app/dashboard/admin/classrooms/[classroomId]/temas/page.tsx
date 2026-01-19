"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { useInstitution } from "@/components/institution-provider"
import {
  PageHeader,
  DataTable,
  StatusBadge,
  RowActionsMenu,
  type ColumnDef
} from "@/components/dashboard/core"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

interface ClassroomTema {
  id: string
  active: boolean
  tema: {
    id: string
    name: string
    area?: {
      id: string
      name: string
    } | null
    subblock?: {
      id: string
      name: string
    } | null
  }
}

type BlockOption = {
  id: string
  name: string
  block_type: string
  academic_year: number
}

type AreaOption = {
  id: string
  name: string
}

type SubblockOption = {
  id: string
  name: string
  block_id: string | null
}

type TemaOption = {
  id: string
  name: string
  area_id: string | null
  subblock_id: string | null
}

type Message = {
  type: "success" | "error"
  text: string
}

const pageSizeOptions = [10, 20, 50, 100]

const columns: ColumnDef<ClassroomTema>[] = [
  {
    key: "area",
    header: "Area",
    render: (_, row) => (
      <div>
        <div className="font-medium">{row.tema.area?.name || "Sin area"}</div>
        <div className="text-sm text-muted-foreground">
          {row.tema.subblock?.name || "Sin sub-bloque"}
        </div>
        <div className="text-xs text-muted-foreground">{row.tema.name}</div>
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
  const institution = useInstitution()
  const [loading, setLoading] = useState(true)
  const [temas, setTemas] = useState<ClassroomTema[]>([])
  const [blocks, setBlocks] = useState<BlockOption[]>([])
  const [areas, setAreas] = useState<AreaOption[]>([])
  const [subblocks, setSubblocks] = useState<SubblockOption[]>([])
  const [temaOptions, setTemaOptions] = useState<TemaOption[]>([])
  const [message, setMessage] = useState<Message | null>(null)
  const [blockMessage, setBlockMessage] = useState<Message | null>(null)
  const [areaMessage, setAreaMessage] = useState<Message | null>(null)
  const [subblockMessage, setSubblockMessage] = useState<Message | null>(null)
  const [temaMessage, setTemaMessage] = useState<Message | null>(null)
  const [search, setSearch] = useState("")
  const [pageSize, setPageSize] = useState(pageSizeOptions[0])
  const [page, setPage] = useState(1)

  const [assignForm, setAssignForm] = useState({
    tema_id: "",
    active: true,
  })

  const [blockForm, setBlockForm] = useState({
    name: "",
    block_type: "bimestre",
    academic_year: new Date().getFullYear(),
    ordering: "",
    active: true,
  })

  const [areaForm, setAreaForm] = useState({
    name: "",
    active: true,
  })

  const [subblockForm, setSubblockForm] = useState({
    block_id: "",
    name: "",
    ordering: "",
    active: true,
  })

  const [temaForm, setTemaForm] = useState({
    area_id: "",
    block_id: "",
    subblock_id: "",
    name: "",
    grade: "",
    ordering: "",
    active: true,
  })

  const loadTemas = async () => {
    const supabase = createClient()
    let query = supabase
      .from("edu_classroom_temas")
      .select(`
        id,
        active,
        tema:edu_temas!inner (
          id,
          name,
          area:edu_areas ( id, name ),
          subblock:edu_academic_subblocks ( id, name )
        )
      `)
      .eq("classroom_id", classroomId)
      .order("created_at", { ascending: false })
    if (institution?.id) {
      query = query.eq("tema.institution_id", institution.id)
    }
    const { data } = await query

    if (data) {
      setTemas(data.map((t: any) => ({
        id: t.id,
        active: t.active,
        tema: t.tema,
      })))
    }
    setLoading(false)
  }

  const loadOptions = async () => {
    const supabase = createClient()
    const institutionId = institution?.id
    if (!institutionId) {
      return
    }
    const [blocksRes, areasRes, subblocksRes, temasRes] = await Promise.all([
      supabase
        .from("edu_academic_blocks")
        .select("id, name, block_type, academic_year")
        .eq("institution_id", institutionId)
        .eq("active", true)
        .order("academic_year", { ascending: false }),
      supabase
        .from("edu_areas")
        .select("id, name")
        .eq("institution_id", institutionId)
        .eq("active", true)
        .order("name", { ascending: true }),
      supabase
        .from("edu_academic_subblocks")
        .select("id, name, block_id")
        .eq("institution_id", institutionId)
        .eq("active", true)
        .order("ordering", { ascending: true }),
      supabase
        .from("edu_temas")
        .select("id, name,  area_id, subblock_id")
        .eq("institution_id", institutionId)
        .eq("active", true)
        .order("name", { ascending: true }),
    ])

    if (blocksRes.data) setBlocks(blocksRes.data as BlockOption[])
    if (areasRes.data) setAreas(areasRes.data as AreaOption[])
    if (subblocksRes.data) setSubblocks(subblocksRes.data as SubblockOption[])
    if (temasRes.data) setTemaOptions(temasRes.data as TemaOption[])
  }

  useEffect(() => {
    loadTemas()
  }, [classroomId, institution?.id])

  useEffect(() => {
    loadOptions()
  }, [classroomId, institution?.id])

  useEffect(() => {
    setPage(1)
  }, [search, pageSize])

  const filteredTemas = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return temas
    return temas.filter((t) =>
      (t.tema.area?.name || "").toLowerCase().includes(needle) ||
      (t.tema.subblock?.name || "").toLowerCase().includes(needle) ||
      (t.tema.name || "").toLowerCase().includes(needle)
    )
  }, [temas, search])

  const pagedTemas = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredTemas.slice(start, start + pageSize)
  }, [filteredTemas, page, pageSize])

  const filteredSubblocks = useMemo(() => {
    if (!temaForm.block_id) return subblocks
    return subblocks.filter((s) => s.block_id === temaForm.block_id)
  }, [subblocks, temaForm.block_id])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Temas"
        description="Crea la estructura academica y asigna temas al aula"
        breadcrumbs={[
          { label: "Admin", href: "/dashboard/admin" },
          { label: "Aulas", href: "/dashboard/admin/classrooms" },
          { label: "Detalle", href: `/dashboard/admin/classrooms/${classroomId}` },
          { label: "Temas" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-[220px] flex-1">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por area, sub-bloque o tema..."
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
            rowActions={(row) => (
              <RowActionsMenu
                actions={[
                  {
                    label: row.active ? "Desactivar" : "Activar",
                    onClick: async () => {
                      const supabase = createClient()
                      await supabase
                        .from("edu_classroom_temas")
                        .update({ active: !row.active })
                        .eq("id", row.id)
                      await loadTemas()
                    },
                  },
                  {
                    label: "Eliminar",
                    variant: "destructive",
                    onClick: async () => {
                      const supabase = createClient()
                      await supabase
                        .from("edu_classroom_temas")
                        .delete()
                        .eq("id", row.id)
                      await loadTemas()
                    },
                  },
                ]}
              />
            )}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <div className="text-sm font-medium">Paso 1: Bloques y sub-bloques</div>
            <p className="text-xs text-muted-foreground">
              Define el bloque academico y sus sub-bloques antes de crear temas.
            </p>
          </div>
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
                .select("id, name, block_type, academic_year")
                .single()

              if (error) {
                setBlockMessage({ type: "error", text: error.message || "No se pudo crear." })
                return
              }

              setBlocks((prev) => [data as BlockOption, ...prev])
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
              const { data, error } = await supabase
                .from("edu_academic_subblocks")
                .insert({
                  block_id: subblockForm.block_id,
                  name: subblockForm.name.trim(),
                  ordering: orderingValue,
                  active: subblockForm.active,
                  institution_id: institution.id,
                })
                .select("id, name, block_id")
                .single()

              if (error) {
                setSubblockMessage({ type: "error", text: error.message || "No se pudo crear." })
                return
              }

              setSubblocks((prev) => [data as SubblockOption, ...prev])
              setSubblockForm({ block_id: "", name: "", ordering: "", active: true })
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
                {blocks.map((block) => (
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
                  setSubblockForm({ block_id: "", name: "", ordering: "", active: true })
                  setSubblockMessage(null)
                }}
              >
                Limpiar
              </Button>
            </div>
          </form>

          <div className="rounded-xl border bg-card p-4">
            <div className="text-sm font-medium">Paso 2: Area y tema</div>
            <p className="text-xs text-muted-foreground">
              Crea el area y luego el tema con su sub-bloque.
            </p>
          </div>

          <form
            className="space-y-4 rounded-xl border bg-card p-4"
            onSubmit={async (e) => {
              e.preventDefault()
              setAreaMessage(null)

              if (!institution?.id) {
                setAreaMessage({ type: "error", text: "Institucion no encontrada." })
                return
              }
              if (!areaForm.name.trim()) {
                setAreaMessage({ type: "error", text: "Completa el nombre del area." })
                return
              }

              const supabase = createClient()
              const { data, error } = await supabase
                .from("edu_areas")
                .insert({
                  name: areaForm.name.trim(),
                  active: areaForm.active,
                  institution_id: institution.id,
                })
                .select("id, name")
                .single()

              if (error) {
                setAreaMessage({ type: "error", text: error.message || "No se pudo crear." })
                return
              }

              setAreas((prev) => [data as AreaOption, ...prev])
              setAreaForm({ name: "", active: true })
              setAreaMessage({ type: "success", text: "Area creada." })
            }}
          >
            <div className="text-sm font-medium">Crear area</div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={areaForm.name}
                onChange={(e) => setAreaForm((s) => ({ ...s, name: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={areaForm.active}
                onCheckedChange={(val) => setAreaForm((s) => ({ ...s, active: Boolean(val) }))}
              />
              Activo
            </label>
            {areaMessage && (
              <div
                className={`rounded-md border p-3 text-sm ${
                  areaMessage.type === "error"
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                }`}
              >
                {areaMessage.text}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="submit">Crear area</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setAreaForm({ name: "", active: true })
                  setAreaMessage(null)
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
              setTemaMessage(null)

              if (!institution?.id) {
                setTemaMessage({ type: "error", text: "Institucion no encontrada." })
                return
              }
              if (!temaForm.name.trim()) {
                setTemaMessage({ type: "error", text: "Completa el nombre del tema." })
                return
              }
              if (!temaForm.grade.trim()) {
                setTemaMessage({ type: "error", text: "Completa el grado." })
                return
              }
              if (!temaForm.area_id || !temaForm.subblock_id) {
                setTemaMessage({ type: "error", text: "Selecciona area y sub-bloque." })
                return
              }

              const orderingValue = temaForm.ordering.trim()
                ? Number(temaForm.ordering)
                : null
              if (orderingValue !== null && !Number.isFinite(orderingValue)) {
                setTemaMessage({ type: "error", text: "Orden invalido." })
                return
              }

              const supabase = createClient()
              const { data, error } = await supabase
                .from("edu_temas")
                .insert({
                  area_id: temaForm.area_id,
                  subblock_id: temaForm.subblock_id,
                  name: temaForm.name.trim(),
                  grade: temaForm.grade.trim(),
                  ordering: orderingValue,
                  active: temaForm.active,
                  institution_id: institution.id,
                })
                .select("id, name,  area_id, subblock_id")
                .single()

              if (error) {
                setTemaMessage({ type: "error", text: error.message || "No se pudo crear." })
                return
              }

              setTemaOptions((prev) => [data as TemaOption, ...prev])
              setAssignForm((s) => ({ ...s, tema_id: data?.id || s.tema_id }))
              setTemaForm({
                area_id: "",
                block_id: "",
                subblock_id: "",
                name: "",
                grade: "",
                ordering: "",
                active: true,
              })
              setTemaMessage({ type: "success", text: "Tema creado." })
            }}
          >
            <div className="text-sm font-medium">Crear tema</div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Area</label>
              <select
                value={temaForm.area_id}
                onChange={(e) => setTemaForm((s) => ({ ...s, area_id: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecciona un area</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bloque</label>
              <select
                value={temaForm.block_id}
                onChange={(e) =>
                  setTemaForm((s) => ({
                    ...s,
                    block_id: e.target.value,
                    subblock_id: "",
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecciona un bloque</option>
                {blocks.map((block) => (
                  <option key={block.id} value={block.id}>
                    {block.name} - {block.block_type} ({block.academic_year})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sub-bloque</label>
              <select
                value={temaForm.subblock_id}
                onChange={(e) => setTemaForm((s) => ({ ...s, subblock_id: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecciona un sub-bloque</option>
                {filteredSubblocks.map((subblock) => (
                  <option key={subblock.id} value={subblock.id}>
                    {subblock.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  value={temaForm.name}
                  onChange={(e) => setTemaForm((s) => ({ ...s, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Grado</label>
                <Input
                  value={temaForm.grade}
                  onChange={(e) => setTemaForm((s) => ({ ...s, grade: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Orden</label>
              <Input
                type="number"
                value={temaForm.ordering}
                onChange={(e) => setTemaForm((s) => ({ ...s, ordering: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={temaForm.active}
                onCheckedChange={(val) => setTemaForm((s) => ({ ...s, active: Boolean(val) }))}
              />
              Activo
            </label>
            {temaMessage && (
              <div
                className={`rounded-md border p-3 text-sm ${
                  temaMessage.type === "error"
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                }`}
              >
                {temaMessage.text}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="submit">Crear tema</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setTemaForm({
                    area_id: "",
                    block_id: "",
                    subblock_id: "",
                    name: "",
                    grade: "",
                    ordering: "",
                    active: true,
                  })
                  setTemaMessage(null)
                }}
              >
                Limpiar
              </Button>
            </div>
          </form>

          <div className="rounded-xl border bg-card p-4">
            <div className="text-sm font-medium">Paso 3: Asignar tema al aula</div>
            <p className="text-xs text-muted-foreground">
              Selecciona un tema existente para asignarlo al aula.
            </p>
          </div>
          <form
            className="space-y-4 rounded-xl border bg-card p-4"
            onSubmit={async (e) => {
              e.preventDefault()
              setMessage(null)

              if (!assignForm.tema_id) {
                setMessage({ type: "error", text: "Selecciona un tema." })
                return
              }

              const exists = temas.some((t) => t.tema.id === assignForm.tema_id)
              if (exists) {
                setMessage({ type: "error", text: "Este tema ya esta asignado." })
                return
              }

              const supabase = createClient()
              const { error } = await supabase
                .from("edu_classroom_temas")
                .insert({
                  classroom_id: classroomId,
                  tema_id: assignForm.tema_id,
                  active: assignForm.active,
                })

              if (error) {
                setMessage({ type: "error", text: error.message || "No se pudo asignar." })
                return
              }

              await loadTemas()
              setAssignForm({ tema_id: "", active: true })
              setMessage({ type: "success", text: "Tema asignado." })
            }}
          >
            <div className="text-sm font-medium">Asignar tema</div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tema</label>
              <select
                value={assignForm.tema_id}
                onChange={(e) => setAssignForm((s) => ({ ...s, tema_id: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecciona un tema</option>
                {temaOptions.map((tema) => (
                  <option key={tema.id} value={tema.id}>
                    {tema.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={assignForm.active}
                onCheckedChange={(val) => setAssignForm((s) => ({ ...s, active: Boolean(val) }))}
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
                  setAssignForm({ tema_id: "", active: true })
                  setMessage(null)
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

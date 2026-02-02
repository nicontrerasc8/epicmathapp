"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
    DataTable,
    PageHeader,
    type ColumnDef,
    StatusBadge,
    RowActionsMenu
} from "@/components/dashboard/core"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Pencil } from "lucide-react"
import {
    createInstitutionAction,
    listClassroomsAction,
    updateInstitutionAction,
} from "../admin-actions"

interface Institution {
    id: string
    name: string
    type: string
    region: string | null
    code: string | null
    slug: string | null
    domain: string | null
    logo_url: string | null
    active: boolean | null
    created_at: string
    __classroomCount?: number
}

type Classroom = {
    id: string
    institution_id?: string | null
    grade: string
    section?: string | null
    academic_year: number
    active: boolean
}

const pageSizeOptions = [10, 20, 50, 100]

const columns: ColumnDef<Institution>[] = [
    {
        key: "name",
        header: "Nombre",
        sortable: true,
        render: (val) => <span className="font-medium">{val}</span>
    },
    {
        key: "type",
        header: "Tipo",
        sortable: true,
        render: (val) => <span className="capitalize text-muted-foreground">{val}</span>
    },
    {
        key: "code",
        header: "Codigo",
        render: (val) => <span className="font-mono text-xs">{val || "-"}</span>
    },
    {
        key: "region",
        header: "Region",
        render: (val) => <span className="text-muted-foreground">{val || "-"}</span>
    },
    {
        key: "domain",
        header: "Dominio",
        render: (val) => <span className="text-muted-foreground">{val || "-"}</span>
    },
    {
        key: "classrooms",
        header: "Aulas",
        width: "120px",
        render: (_, row) => (
            <span className="text-sm text-muted-foreground">
                {row.__classroomCount ?? 0}
            </span>
        )
    },
    {
        key: "active",
        header: "Estado",
        width: "130px",
        render: (val) => <StatusBadge active={Boolean(val)} />
    },
    {
        key: "created_at",
        header: "Registrado",
        sortable: true,
        render: (val) => new Date(val).toLocaleDateString("es-PE")
    }
]

interface InstitutionsTableProps {
    initialData: Institution[]
}

export default function InstitutionsTable({ initialData }: InstitutionsTableProps) {
    const [data, setData] = useState(initialData)
    const [search, setSearch] = useState("")
    const [pageSize, setPageSize] = useState(pageSizeOptions[0])
    const [page, setPage] = useState(1)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [formSuccess, setFormSuccess] = useState<string | null>(null)
    const [classrooms, setClassrooms] = useState<Classroom[]>([])
    const [classroomError, setClassroomError] = useState<string | null>(null)
    const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | null>(null)
    const [form, setForm] = useState({
        id: "",
        name: "",
        type: "colegio",
        region: "",
        code: "",
        slug: "",
        domain: "",
        logo_url: "",
        active: true,
    })

    useEffect(() => {
        const loadClassrooms = async () => {
            try {
                setClassroomError(null)
                const data = await listClassroomsAction()
                setClassrooms(data as Classroom[])
            } catch (e: any) {
                setClassroomError(e?.message ?? "Error cargando aulas")
            }
        }
        loadClassrooms()
    }, [])

    const classroomCounts = useMemo(() => {
        const map = new Map<string, number>()
        classrooms.forEach((c) => {
            if (!c.institution_id) return
            map.set(c.institution_id, (map.get(c.institution_id) || 0) + 1)
        })
        return map
    }, [classrooms])

    const filteredData = useMemo(() => {
        const needle = search.trim().toLowerCase()
        if (!needle) return data
        return data.filter((row) =>
            row.name.toLowerCase().includes(needle) ||
            row.type.toLowerCase().includes(needle) ||
            (row.code || "").toLowerCase().includes(needle) ||
            (row.region || "").toLowerCase().includes(needle) ||
            (row.domain || "").toLowerCase().includes(needle) ||
            (row.slug || "").toLowerCase().includes(needle)
        )
    }, [data, search])

    const pagedData = useMemo(() => {
        const start = (page - 1) * pageSize
        return filteredData.slice(start, start + pageSize)
    }, [filteredData, page, pageSize])

    const handleSearchChange = (value: string) => {
        setSearch(value)
        setPage(1)
    }

    const handlePageSizeChange = (value: number) => {
        setPageSize(value)
        setPage(1)
    }

    const startEdit = (row: Institution) => {
        setForm({
            id: row.id,
            name: row.name || "",
            type: (row.type || "colegio") as "academia" | "colegio" | "universidad",
            region: row.region || "",
            code: row.code || "",
            slug: row.slug || "",
            domain: row.domain || "",
            logo_url: row.logo_url || "",
            active: row.active !== false,
        })
        setFormError(null)
        setFormSuccess(null)
        setEditing(true)
    }

    const startCreate = () => {
        setForm({
            id: "",
            name: "",
            type: "colegio",
            region: "",
            code: "",
            slug: "",
            domain: "",
            logo_url: "",
            active: true,
        })
        setFormError(null)
        setFormSuccess(null)
        setEditing(true)
    }

    const handleSave = async () => {
        if (!form.name.trim()) {
            setFormError("Completa el nombre.")
            return
        }
        if (!form.type) {
            setFormError("Selecciona el tipo.")
            return
        }

        try {
            setSaving(true)
            setFormError(null)
            if (form.id) {
                await updateInstitutionAction(form.id, {
                    name: form.name,
                    type: form.type as "academia" | "colegio" | "universidad",
                    region: form.region || null,
                    code: form.code || null,
                    slug: form.slug || null,
                    domain: form.domain || null,
                    logo_url: form.logo_url || null,
                    active: form.active,
                })
                setData((prev) =>
                    prev.map((row) =>
                        row.id === form.id
                            ? {
                                ...row,
                                name: form.name,
                                type: form.type,
                                region: form.region || null,
                                code: form.code || null,
                                slug: form.slug || null,
                                domain: form.domain || null,
                                logo_url: form.logo_url || null,
                                active: form.active,
                            }
                            : row
                    )
                )
                setFormSuccess("Institucion actualizada.")
            } else {
                const created = await createInstitutionAction({
                    name: form.name,
                    type: form.type as "academia" | "colegio" | "universidad",
                    region: form.region || null,
                    code: form.code || null,
                    slug: form.slug || null,
                    domain: form.domain || null,
                    logo_url: form.logo_url || null,
                    active: form.active,
                })
                setData((prev) => [created as Institution, ...prev])
                setFormSuccess("Institucion creada.")
            }
            setEditing(false)
        } catch (e: any) {
            setFormError(e?.message ?? "Error actualizando institucion")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Instituciones"
                description="Gestiona los colegios e instituciones registradas"
                breadcrumbs={[
                    { label: "Admin", href: "/dashboard/admin" },
                    { label: "Instituciones" }
                ]}
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" onClick={startCreate}>
                            Nueva institucion
                        </Button>
                        {data[0] && (
                            <Button onClick={() => startEdit(data[0])}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Editar institucion
                            </Button>
                        )}
                    </div>
                }
            />

            {formSuccess && !editing && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {formSuccess}
                </div>
            )}

            {editing && (
                <div className="rounded-xl border bg-card p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium">
                            {form.id ? "Editar institucion" : "Nueva institucion"}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                                Cancelar
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={saving}>
                                {saving ? "Guardando..." : "Guardar cambios"}
                            </Button>
                        </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-4">
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="institutionName">Nombre</Label>
                            <Input
                                id="institutionName"
                                value={form.name}
                                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="institutionType">Tipo</Label>
                            <select
                                id="institutionType"
                                value={form.type}
                                onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}
                                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                            >
                                <option value="academia">Academia</option>
                                <option value="colegio">Colegio</option>
                                <option value="universidad">Universidad</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="institutionCode">Codigo</Label>
                            <Input
                                id="institutionCode"
                                value={form.code}
                                onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="institutionRegion">Region</Label>
                            <Input
                                id="institutionRegion"
                                value={form.region}
                                onChange={(e) => setForm((s) => ({ ...s, region: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="institutionSlug">Slug</Label>
                            <Input
                                id="institutionSlug"
                                value={form.slug}
                                onChange={(e) => setForm((s) => ({ ...s, slug: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="institutionDomain">Dominio</Label>
                            <Input
                                id="institutionDomain"
                                value={form.domain}
                                onChange={(e) => setForm((s) => ({ ...s, domain: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="institutionLogo">Logo URL</Label>
                            <Input
                                id="institutionLogo"
                                value={form.logo_url}
                                onChange={(e) => setForm((s) => ({ ...s, logo_url: e.target.value }))}
                                placeholder="/logos/mi-colegio.png"
                            />
                            <p className="text-xs text-muted-foreground">
                                Sube el logo en <span className="font-mono">public/logos</span> y usa la ruta
                                <span className="font-mono"> /logos/slug.png</span>.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 md:col-span-2">
                            <Checkbox
                                id="institutionActive"
                                checked={form.active}
                                onCheckedChange={(val) => setForm((s) => ({ ...s, active: Boolean(val) }))}
                            />
                            <Label htmlFor="institutionActive">Activo</Label>
                        </div>
                    </div>
                    {formError && <p className="text-sm text-destructive">{formError}</p>}
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-[220px] flex-1">
                    <Input
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Buscar por nombre o tipo..."
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Items por pagina</span>
                    <select
                        value={pageSize}
                        onChange={(e) => handlePageSizeChange(Number(e.target.value))}
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
                data={pagedData.map((row) => ({
                    ...row,
                    __classroomCount: classroomCounts.get(row.id) || 0,
                }))}
                emptyState={{
                    title: "instituciones",
                    description: "No hay instituciones registradas."
                }}
                pagination={{
                    page,
                    pageSize,
                    total: filteredData.length,
                }}
                onPageChange={setPage}
                onRowClick={(row) => {
                    startEdit(row)
                    setSelectedInstitutionId(row.id)
                }}
                rowActions={(row) => (
                    <RowActionsMenu
                        actions={[
                            {
                                label: "Editar",
                                icon: <Pencil className="w-4 h-4" />,
                                onClick: () => startEdit(row),
                            },
                            {
                                label: "Ver aulas",
                                onClick: () => setSelectedInstitutionId(row.id),
                            },
                        ]}
                    />
                )}
            />

            <div className="rounded-xl border bg-card p-4">
                <div className="font-medium mb-2">Aulas de la institucion</div>
                {classroomError && (
                    <div className="text-sm text-destructive mb-2">{classroomError}</div>
                )}
                {!selectedInstitutionId ? (
                    <div className="text-sm text-muted-foreground">
                        Selecciona una institucion para ver sus aulas.
                    </div>
                ) : (
                    <div className="space-y-2 text-sm">
                        {classrooms
                            .filter((c) => c.institution_id === selectedInstitutionId)
                            .map((c) => (
                                <div
                                    key={c.id}
                                    className="flex items-center justify-between rounded-lg border bg-background px-3 py-2"
                                >
                                    <div>
                                        <div className="font-medium">
                                            {`${c.grade}${c.section ? ` ${c.section}` : ""}`} ({c.academic_year})
                                        </div>
                                        <div className="text-xs text-muted-foreground">{c.id}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <StatusBadge active={c.active} />
                                        <Link
                                            href={`/dashboard/admin/classrooms/${c.id}`}
                                            className="text-sm text-primary hover:underline"
                                        >
                                            Ver
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        {classrooms.filter((c) => c.institution_id === selectedInstitutionId).length === 0 && (
                            <div className="text-sm text-muted-foreground">
                                No hay aulas registradas para esta institucion.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

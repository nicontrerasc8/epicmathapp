"use client"

import { useEffect, useMemo, useState } from "react"
import {
    DataTable,
    PageHeader,
    RowActionsMenu,
    StatusBadge,
    type ColumnDef,
} from "@/components/dashboard/core"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
    createAcademicBlockAction,
    createAcademicSubblockAction,
    createAreaAction,
    createExerciseAction,
    createExerciseAssignmentAction,
    createClassroomBlockAction,
    createTemaAction,
    deleteAcademicBlockAction,
    deleteAcademicSubblockAction,
    deleteAreaAction,
    deleteExerciseAction,
    deleteExerciseAssignmentAction,
    deleteClassroomBlockAction,
    deleteTemaAction,
    listAcademicBlocksAction,
    listAcademicSubblocksAction,
    listAreasAction,
    listExerciseAssignmentsAction,
    listExercisesAction,
    listClassroomsAction,
    listClassroomBlocksAction,
    listTemasAction,
    updateAcademicBlockAction,
    updateAcademicSubblockAction,
    updateAreaAction,
    updateExerciseAction,
    updateExerciseAssignmentAction,
    updateClassroomBlockAction,
    updateTemaAction,
} from "./content-actions"

type AcademicBlock = {
    id: string
    name: string
    block_type: string
    academic_year: number
    ordering: number | null
    active: boolean
    created_at: string
}

type AcademicSubblock = {
    id: string
    block_id: string
    name: string
    ordering: number | null
    active: boolean
    created_at: string
}

type Area = {
    id: string
    name: string
    active: boolean
    created_at: string
}

type Tema = {
    id: string
    area_id: string
    subblock_id: string
    ordering: number | null
    active: boolean
    created_at: string
}

type Exercise = {
    id: string
    exercise_type: string
    description: string | null
    active: boolean
    created_at: string
}

type ExerciseAssignment = {
    id: string
    exercise_id: string
    tema_id: string
    ordering: number | null
    active: boolean
    created_at: string
}

type Classroom = {
    id: string
    grade: string
    academic_year: number
    active: boolean
    created_at: string
}

type ClassroomBlock = {
    id: string
    classroom_id: string
    block_id: string
    active: boolean
    started_at: string | null
    ended_at: string | null
    created_at: string
}

type Message = {
    type: "success" | "error"
    text: string
}

function TableControls({
    search,
    onSearchChange,
    pageSize,
    onPageSizeChange,
}: {
    search: string
    onSearchChange: (value: string) => void
    pageSize: number
    onPageSizeChange: (value: number) => void
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-[220px] flex-1">
                <Input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Buscar..."
                />
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Items por pagina</span>
                <select
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
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
    )
}

const blockTypeOptions = [
    "bimestre",
    "trimestre",
    "unidad",
    "semestre",
    "modulo",
    "bloque",
    "periodo",
]

const pageSizeOptions = [10, 20, 50, 100]

function paginateRows<T>(rows: T[], page: number, pageSize: number) {
    const start = (page - 1) * pageSize
    return rows.slice(start, start + pageSize)
}

function matchesSearch(value: unknown, needle: string) {
    if (!needle) return true
    if (value === null || value === undefined) return false
    return String(value).toLowerCase().includes(needle)
}

interface ContentsAdminClientProps {
    blocks: AcademicBlock[]
    subblocks: AcademicSubblock[]
    areas: Area[]
    temas: Tema[]
    exercises: Exercise[]
    assignments: ExerciseAssignment[]
    classrooms: Classroom[]
    classroomBlocks: ClassroomBlock[]
}

export default function ContentsAdminClient({
    blocks: initialBlocks,
    subblocks: initialSubblocks,
    areas: initialAreas,
    temas: initialTemas,
    exercises: initialExercises,
    assignments: initialAssignments,
    classrooms: initialClassrooms,
    classroomBlocks: initialClassroomBlocks,
}: ContentsAdminClientProps) {
    const [blocks, setBlocks] = useState(initialBlocks)
    const [subblocks, setSubblocks] = useState(initialSubblocks)
    const [areas, setAreas] = useState(initialAreas)
    const [temas, setTemas] = useState(initialTemas)
    const [exercises, setExercises] = useState(initialExercises)
    const [assignments, setAssignments] = useState(initialAssignments)
    const [classrooms, setClassrooms] = useState(initialClassrooms)
    const [classroomBlocks, setClassroomBlocks] = useState(initialClassroomBlocks)

    const [blockMessage, setBlockMessage] = useState<Message | null>(null)
    const [subblockMessage, setSubblockMessage] = useState<Message | null>(null)
    const [areaMessage, setAreaMessage] = useState<Message | null>(null)
    const [temaMessage, setTemaMessage] = useState<Message | null>(null)
    const [exerciseMessage, setExerciseMessage] = useState<Message | null>(null)
    const [assignmentMessage, setAssignmentMessage] = useState<Message | null>(null)
    const [classroomBlockMessage, setClassroomBlockMessage] = useState<Message | null>(null)

    const [blockSearch, setBlockSearch] = useState("")
    const [blockPageSize, setBlockPageSize] = useState(pageSizeOptions[0])
    const [blockPage, setBlockPage] = useState(1)

    const [subblockSearch, setSubblockSearch] = useState("")
    const [subblockPageSize, setSubblockPageSize] = useState(pageSizeOptions[0])
    const [subblockPage, setSubblockPage] = useState(1)

    const [areaSearch, setAreaSearch] = useState("")
    const [areaPageSize, setAreaPageSize] = useState(pageSizeOptions[0])
    const [areaPage, setAreaPage] = useState(1)

    const [temaSearch, setTemaSearch] = useState("")
    const [temaPageSize, setTemaPageSize] = useState(pageSizeOptions[0])
    const [temaPage, setTemaPage] = useState(1)

    const [exerciseSearch, setExerciseSearch] = useState("")
    const [exercisePageSize, setExercisePageSize] = useState(pageSizeOptions[0])
    const [exercisePage, setExercisePage] = useState(1)

    const [assignmentSearch, setAssignmentSearch] = useState("")
    const [assignmentPageSize, setAssignmentPageSize] = useState(pageSizeOptions[0])
    const [assignmentPage, setAssignmentPage] = useState(1)

    const [classroomBlockSearch, setClassroomBlockSearch] = useState("")
    const [classroomBlockPageSize, setClassroomBlockPageSize] = useState(pageSizeOptions[0])
    const [classroomBlockPage, setClassroomBlockPage] = useState(1)

    const [blockForm, setBlockForm] = useState({
        editId: "",
        name: "",
        block_type: blockTypeOptions[0],
        academic_year: "",
        ordering: "",
        active: true,
    })
    const [subblockForm, setSubblockForm] = useState({
        editId: "",
        block_id: "",
        name: "",
        ordering: "",
        active: true,
    })
    const [areaForm, setAreaForm] = useState({
        editId: "",
        name: "",
        active: true,
    })
    const [temaForm, setTemaForm] = useState({
        editId: "",
        area_id: "",
        subblock_id: "",
        ordering: "",
        active: true,
    })
    const [exerciseForm, setExerciseForm] = useState({
        editId: "",
        id: "",
        exercise_type: "",
        description: "",
        active: true,
    })
    const [assignmentForm, setAssignmentForm] = useState({
        editId: "",
        exercise_id: "",
        tema_id: "",
        ordering: "",
        active: true,
    })
    const [classroomBlockForm, setClassroomBlockForm] = useState({
        editId: "",
        classroom_id: "",
        block_id: "",
        started_at: "",
        ended_at: "",
        active: true,
    })

    useEffect(() => setBlockPage(1), [blockSearch, blockPageSize])
    useEffect(() => setSubblockPage(1), [subblockSearch, subblockPageSize])
    useEffect(() => setAreaPage(1), [areaSearch, areaPageSize])
    useEffect(() => setTemaPage(1), [temaSearch, temaPageSize])
    useEffect(() => setExercisePage(1), [exerciseSearch, exercisePageSize])
    useEffect(() => setAssignmentPage(1), [assignmentSearch, assignmentPageSize])
    useEffect(() => setClassroomBlockPage(1), [classroomBlockSearch, classroomBlockPageSize])

    const blockMap = useMemo(() => new Map(blocks.map((b) => [b.id, b.name])), [blocks])
    const blockMetaMap = useMemo(
        () => new Map(blocks.map((b) => [b.id, `${b.name} (${b.block_type} ${b.academic_year})`])),
        [blocks]
    )
    const areaMap = useMemo(() => new Map(areas.map((a) => [a.id, a.name])), [areas])
    const subblockMap = useMemo(() => new Map(subblocks.map((s) => [s.id, s.name])), [subblocks])
    const temaMap = useMemo(
        () => new Map(temas.map((t) => [t.id, `${areaMap.get(t.area_id) || "Sin area"} • ${subblockMap.get(t.subblock_id) || "Sin sub-bloque"}`])),
        [temas, areaMap, subblockMap]
    )
    const exerciseMap = useMemo(() => new Map(exercises.map((e) => [e.id, e.description || e.id])), [exercises])
    const classroomMap = useMemo(
        () => new Map(classrooms.map((c) => [c.id, `${c.grade} (${c.academic_year})`])),
        [classrooms]
    )

    const refreshBlocks = async () => setBlocks(await listAcademicBlocksAction())
    const refreshSubblocks = async () => setSubblocks(await listAcademicSubblocksAction())
    const refreshAreas = async () => setAreas(await listAreasAction())
    const refreshTemas = async () => setTemas(await listTemasAction())
    const refreshExercises = async () => setExercises(await listExercisesAction())
    const refreshAssignments = async () => setAssignments(await listExerciseAssignmentsAction())
    const refreshClassrooms = async () => setClassrooms(await listClassroomsAction())
    const refreshClassroomBlocks = async () => setClassroomBlocks(await listClassroomBlocksAction())

    const blockColumns: ColumnDef<AcademicBlock>[] = [
        { key: "name", header: "Nombre", sortable: true, render: (v) => <span className="font-medium">{v}</span> },
        { key: "block_type", header: "Tipo", sortable: true },
        { key: "academic_year", header: "Anio", sortable: true },
        { key: "ordering", header: "Orden", render: (v) => v ?? "-" },
        { key: "active", header: "Estado", render: (v) => <StatusBadge active={v} /> },
    ]

    const subblockColumns: ColumnDef<AcademicSubblock>[] = [
        { key: "name", header: "Nombre", sortable: true, render: (v) => <span className="font-medium">{v}</span> },
        {
            key: "block_id",
            header: "Bloque",
            render: (v) => blockMap.get(v) || "Sin bloque",
        },
        { key: "ordering", header: "Orden", render: (v) => v ?? "-" },
        { key: "active", header: "Estado", render: (v) => <StatusBadge active={v} /> },
    ]

    const areaColumns: ColumnDef<Area>[] = [
        { key: "name", header: "Nombre", sortable: true, render: (v) => <span className="font-medium">{v}</span> },
        { key: "active", header: "Estado", render: (v) => <StatusBadge active={v} /> },
    ]

    const temaColumns: ColumnDef<Tema>[] = [
        {
            key: "area_id",
            header: "Area",
            render: (v, row) => (
                <div>
                    <div className="font-medium">{areaMap.get(v) || "Sin area"}</div>
                    <div className="text-xs text-muted-foreground">
                        {subblockMap.get(row.subblock_id) || "Sin sub-bloque"}
                    </div>
                </div>
            ),
        },
        { key: "subblock_id", header: "Sub-bloque", render: (v) => subblockMap.get(v) || "Sin sub-bloque" },
        { key: "ordering", header: "Orden", render: (v) => v ?? "-" },
        { key: "active", header: "Estado", render: (v) => <StatusBadge active={v} /> },
    ]

    const exerciseColumns: ColumnDef<Exercise>[] = [
        { key: "id", header: "ID", render: (v) => <span className="font-mono text-xs">{v}</span> },
        { key: "exercise_type", header: "Tipo", sortable: true },
        { key: "description", header: "Descripcion", render: (v) => v || "-" },
        { key: "active", header: "Estado", render: (v) => <StatusBadge active={v} /> },
    ]

    const assignmentColumns: ColumnDef<ExerciseAssignment>[] = [
        {
            key: "exercise_id",
            header: "Ejercicio",
            render: (v) => exerciseMap.get(v) || v,
        },
        {
            key: "tema_id",
            header: "Tema",
            render: (v) => temaMap.get(v) || "Sin tema",
        },
        { key: "ordering", header: "Orden", render: (v) => v ?? "-" },
        { key: "active", header: "Estado", render: (v) => <StatusBadge active={v} /> },
    ]

    const classroomBlockColumns: ColumnDef<ClassroomBlock>[] = [
        {
            key: "classroom_id",
            header: "Aula",
            render: (v) => classroomMap.get(v) || v,
        },
        {
            key: "block_id",
            header: "Bloque",
            render: (v) => blockMetaMap.get(v) || blockMap.get(v) || v,
        },
        { key: "started_at", header: "Inicio", render: (v) => v ? new Date(v).toLocaleDateString() : "-" },
        { key: "ended_at", header: "Fin", render: (v) => v ? new Date(v).toLocaleDateString() : "-" },
        { key: "active", header: "Estado", render: (v) => <StatusBadge active={v} /> },
    ]

    const blockNeedle = blockSearch.trim().toLowerCase()
    const filteredBlocks = useMemo(() => {
        if (!blockNeedle) return blocks
        return blocks.filter((b) =>
            matchesSearch(b.name, blockNeedle) ||
            matchesSearch(b.block_type, blockNeedle) ||
            matchesSearch(b.academic_year, blockNeedle)
        )
    }, [blocks, blockNeedle])
    const pagedBlocks = useMemo(
        () => paginateRows(filteredBlocks, blockPage, blockPageSize),
        [filteredBlocks, blockPage, blockPageSize]
    )

    const subblockNeedle = subblockSearch.trim().toLowerCase()
    const filteredSubblocks = useMemo(() => {
        if (!subblockNeedle) return subblocks
        return subblocks.filter((s) =>
            matchesSearch(s.name, subblockNeedle) ||
            matchesSearch(blockMap.get(s.block_id), subblockNeedle)
        )
    }, [subblocks, subblockNeedle, blockMap])
    const pagedSubblocks = useMemo(
        () => paginateRows(filteredSubblocks, subblockPage, subblockPageSize),
        [filteredSubblocks, subblockPage, subblockPageSize]
    )

    const areaNeedle = areaSearch.trim().toLowerCase()
    const filteredAreas = useMemo(() => {
        if (!areaNeedle) return areas
        return areas.filter((a) => matchesSearch(a.name, areaNeedle))
    }, [areas, areaNeedle])
    const pagedAreas = useMemo(
        () => paginateRows(filteredAreas, areaPage, areaPageSize),
        [filteredAreas, areaPage, areaPageSize]
    )

    const temaNeedle = temaSearch.trim().toLowerCase()
    const filteredTemas = useMemo(() => {
        if (!temaNeedle) return temas
        return temas.filter((t) =>
            matchesSearch(areaMap.get(t.area_id), temaNeedle) ||
            matchesSearch(subblockMap.get(t.subblock_id), temaNeedle)
        )
    }, [temas, temaNeedle, areaMap, subblockMap])
    const pagedTemas = useMemo(
        () => paginateRows(filteredTemas, temaPage, temaPageSize),
        [filteredTemas, temaPage, temaPageSize]
    )

    const exerciseNeedle = exerciseSearch.trim().toLowerCase()
    const filteredExercises = useMemo(() => {
        if (!exerciseNeedle) return exercises
        return exercises.filter((e) =>
            matchesSearch(e.id, exerciseNeedle) ||
            matchesSearch(e.exercise_type, exerciseNeedle) ||
            matchesSearch(e.description, exerciseNeedle)
        )
    }, [exercises, exerciseNeedle])
    const pagedExercises = useMemo(
        () => paginateRows(filteredExercises, exercisePage, exercisePageSize),
        [filteredExercises, exercisePage, exercisePageSize]
    )

    const assignmentNeedle = assignmentSearch.trim().toLowerCase()
    const filteredAssignments = useMemo(() => {
        if (!assignmentNeedle) return assignments
        return assignments.filter((a) =>
            matchesSearch(exerciseMap.get(a.exercise_id), assignmentNeedle) ||
            matchesSearch(temaMap.get(a.tema_id), assignmentNeedle) ||
            matchesSearch(a.ordering, assignmentNeedle)
        )
    }, [assignments, assignmentNeedle, exerciseMap, temaMap])
    const pagedAssignments = useMemo(
        () => paginateRows(filteredAssignments, assignmentPage, assignmentPageSize),
        [filteredAssignments, assignmentPage, assignmentPageSize]
    )

    const classroomBlockNeedle = classroomBlockSearch.trim().toLowerCase()
    const filteredClassroomBlocks = useMemo(() => {
        if (!classroomBlockNeedle) return classroomBlocks
        return classroomBlocks.filter((cb) =>
            matchesSearch(classroomMap.get(cb.classroom_id), classroomBlockNeedle) ||
            matchesSearch(blockMetaMap.get(cb.block_id), classroomBlockNeedle) ||
            matchesSearch(blockMap.get(cb.block_id), classroomBlockNeedle)
        )
    }, [classroomBlocks, classroomBlockNeedle, classroomMap, blockMetaMap, blockMap])
    const pagedClassroomBlocks = useMemo(
        () => paginateRows(filteredClassroomBlocks, classroomBlockPage, classroomBlockPageSize),
        [filteredClassroomBlocks, classroomBlockPage, classroomBlockPageSize]
    )

    return (
        <div className="space-y-6">
            <PageHeader
                title="Contenidos"
                description="CRUD de bloques, areas, temas, ejercicios y asignaciones"
                breadcrumbs={[
                    { label: "Admin", href: "/dashboard/admin" },
                    { label: "Contenidos" },
                ]}
            />

            <Tabs defaultValue="blocks">
                <TabsList className="flex flex-wrap gap-2">
                    <TabsTrigger value="blocks">Bloques</TabsTrigger>
                    <TabsTrigger value="subblocks">Sub-bloques</TabsTrigger>
                    <TabsTrigger value="areas">Areas</TabsTrigger>
                    <TabsTrigger value="temas">Temas</TabsTrigger>
                    <TabsTrigger value="exercises">Ejercicios</TabsTrigger>
                    <TabsTrigger value="assignments">Asignaciones</TabsTrigger>
                    <TabsTrigger value="classroom-blocks">Bloques x Aula</TabsTrigger>
                </TabsList>

                <TabsContent value="blocks" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                        <div className="space-y-3">
                            <TableControls
                                search={blockSearch}
                                onSearchChange={setBlockSearch}
                                pageSize={blockPageSize}
                                onPageSizeChange={setBlockPageSize}
                            />
                            <DataTable
                                columns={blockColumns}
                                data={pagedBlocks}
                                emptyState={{
                                    title: "bloques",
                                    description: "No hay bloques registrados.",
                                }}
                                pagination={{
                                    page: blockPage,
                                    pageSize: blockPageSize,
                                    total: filteredBlocks.length,
                                }}
                                onPageChange={setBlockPage}
                                rowActions={(row) => (
                                    <RowActionsMenu
                                        actions={[
                                            {
                                                label: "Editar",
                                                onClick: () => {
                                                    setBlockForm({
                                                        editId: row.id,
                                                        name: row.name,
                                                        block_type: row.block_type,
                                                        academic_year: String(row.academic_year),
                                                        ordering: row.ordering != null ? String(row.ordering) : "",
                                                        active: row.active,
                                                    })
                                                    setBlockMessage(null)
                                                },
                                            },
                                            {
                                                label: "Eliminar",
                                                variant: "destructive",
                                                onClick: async () => {
                                                    try {
                                                        await deleteAcademicBlockAction(row.id)
                                                        await refreshBlocks()
                                                        setBlockMessage({ type: "success", text: "Bloque eliminado." })
                                                    } catch (err: any) {
                                                        setBlockMessage({ type: "error", text: err?.message || "No se pudo eliminar." })
                                                    }
                                                },
                                            },
                                        ]}
                                    />
                                )}
                            />
                        </div>

                        <form
                            className="space-y-4 rounded-xl border bg-card p-4"
                            onSubmit={async (e) => {
                                e.preventDefault()
                                setBlockMessage(null)
                                const year = Number(blockForm.academic_year)
                                if (!blockForm.name.trim()) {
                                    setBlockMessage({ type: "error", text: "El nombre es obligatorio." })
                                    return
                                }
                                if (!Number.isFinite(year)) {
                                    setBlockMessage({ type: "error", text: "El año academico es obligatorio." })
                                    return
                                }
                                try {
                                    const payload = {
                                        name: blockForm.name.trim(),
                                        block_type: blockForm.block_type,
                                        academic_year: year,
                                        ordering: blockForm.ordering ? Number(blockForm.ordering) : null,
                                        active: blockForm.active,
                                    }
                                    if (blockForm.editId) {
                                        await updateAcademicBlockAction(blockForm.editId, payload)
                                    } else {
                                        await createAcademicBlockAction(payload)
                                    }
                                    await refreshBlocks()
                                    setBlockForm({
                                        editId: "",
                                        name: "",
                                        block_type: blockTypeOptions[0],
                                        academic_year: "",
                                        ordering: "",
                                        active: true,
                                    })
                                    setBlockMessage({ type: "success", text: "Bloque guardado." })
                                } catch (err: any) {
                                    setBlockMessage({ type: "error", text: err?.message || "No se pudo guardar." })
                                }
                            }}
                        >
                            <div className="text-sm font-medium">
                                {blockForm.editId ? "Editar bloque" : "Nuevo bloque"}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nombre</label>
                                <Input
                                    value={blockForm.name}
                                    onChange={(e) => setBlockForm((s) => ({ ...s, name: e.target.value }))}
                                    placeholder="Ej: Primer bimestre"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tipo</label>
                                <select
                                    value={blockForm.block_type}
                                    onChange={(e) => setBlockForm((s) => ({ ...s, block_type: e.target.value }))}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    {blockTypeOptions.map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Año academico</label>
                                <Input
                                    type="number"
                                    value={blockForm.academic_year}
                                    onChange={(e) => setBlockForm((s) => ({ ...s, academic_year: e.target.value }))}
                                    placeholder="2024"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Orden</label>
                                <Input
                                    type="number"
                                    value={blockForm.ordering}
                                    onChange={(e) => setBlockForm((s) => ({ ...s, ordering: e.target.value }))}
                                    placeholder="1"
                                />
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
                                <Button type="submit">
                                    {blockForm.editId ? "Actualizar" : "Crear"}
                                </Button>
                                {blockForm.editId && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() =>
                                            setBlockForm({
                                                editId: "",
                                                name: "",
                                                block_type: blockTypeOptions[0],
                                                academic_year: "",
                                                ordering: "",
                                                active: true,
                                            })
                                        }
                                    >
                                        Cancelar
                                    </Button>
                                )}
                            </div>
                        </form>
                    </div>
                </TabsContent>

                <TabsContent value="subblocks" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                        <div className="space-y-3">
                            <TableControls
                                search={subblockSearch}
                                onSearchChange={setSubblockSearch}
                                pageSize={subblockPageSize}
                                onPageSizeChange={setSubblockPageSize}
                            />
                            <DataTable
                                columns={subblockColumns}
                                data={pagedSubblocks}
                                emptyState={{
                                    title: "sub-bloques",
                                    description: "No hay sub-bloques registrados.",
                                }}
                                pagination={{
                                    page: subblockPage,
                                    pageSize: subblockPageSize,
                                    total: filteredSubblocks.length,
                                }}
                                onPageChange={setSubblockPage}
                                rowActions={(row) => (
                                    <RowActionsMenu
                                        actions={[
                                            {
                                                label: "Editar",
                                                onClick: () => {
                                                    setSubblockForm({
                                                        editId: row.id,
                                                        block_id: row.block_id,
                                                        name: row.name,
                                                        ordering: row.ordering != null ? String(row.ordering) : "",
                                                        active: row.active,
                                                    })
                                                    setSubblockMessage(null)
                                                },
                                            },
                                            {
                                                label: "Eliminar",
                                                variant: "destructive",
                                                onClick: async () => {
                                                    try {
                                                        await deleteAcademicSubblockAction(row.id)
                                                        await refreshSubblocks()
                                                        setSubblockMessage({ type: "success", text: "Sub-bloque eliminado." })
                                                    } catch (err: any) {
                                                        setSubblockMessage({ type: "error", text: err?.message || "No se pudo eliminar." })
                                                    }
                                                },
                                            },
                                        ]}
                                    />
                                )}
                            />
                        </div>

                        <form
                            className="space-y-4 rounded-xl border bg-card p-4"
                            onSubmit={async (e) => {
                                e.preventDefault()
                                setSubblockMessage(null)
                                if (!subblockForm.block_id) {
                                    setSubblockMessage({ type: "error", text: "Selecciona un bloque." })
                                    return
                                }
                                if (!subblockForm.name.trim()) {
                                    setSubblockMessage({ type: "error", text: "El nombre es obligatorio." })
                                    return
                                }
                                try {
                                    const payload = {
                                        block_id: subblockForm.block_id,
                                        name: subblockForm.name.trim(),
                                        ordering: subblockForm.ordering ? Number(subblockForm.ordering) : null,
                                        active: subblockForm.active,
                                    }
                                    if (subblockForm.editId) {
                                        await updateAcademicSubblockAction(subblockForm.editId, payload)
                                    } else {
                                        await createAcademicSubblockAction(payload)
                                    }
                                    await refreshSubblocks()
                                    setSubblockForm({
                                        editId: "",
                                        block_id: "",
                                        name: "",
                                        ordering: "",
                                        active: true,
                                    })
                                    setSubblockMessage({ type: "success", text: "Sub-bloque guardado." })
                                } catch (err: any) {
                                    setSubblockMessage({ type: "error", text: err?.message || "No se pudo guardar." })
                                }
                            }}
                        >
                            <div className="text-sm font-medium">
                                {subblockForm.editId ? "Editar sub-bloque" : "Nuevo sub-bloque"}
                            </div>

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
                                            {block.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nombre</label>
                                <Input
                                    value={subblockForm.name}
                                    onChange={(e) => setSubblockForm((s) => ({ ...s, name: e.target.value }))}
                                    placeholder="Ej: Unidad 1"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Orden</label>
                                <Input
                                    type="number"
                                    value={subblockForm.ordering}
                                    onChange={(e) => setSubblockForm((s) => ({ ...s, ordering: e.target.value }))}
                                    placeholder="1"
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
                                <Button type="submit">
                                    {subblockForm.editId ? "Actualizar" : "Crear"}
                                </Button>
                                {subblockForm.editId && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() =>
                                            setSubblockForm({
                                                editId: "",
                                                block_id: "",
                                                name: "",
                                                ordering: "",
                                                active: true,
                                            })
                                        }
                                    >
                                        Cancelar
                                    </Button>
                                )}
                            </div>
                        </form>
                    </div>
                </TabsContent>

                <TabsContent value="areas" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                        <div className="space-y-3">
                            <TableControls
                                search={areaSearch}
                                onSearchChange={setAreaSearch}
                                pageSize={areaPageSize}
                                onPageSizeChange={setAreaPageSize}
                            />
                            <DataTable
                                columns={areaColumns}
                                data={pagedAreas}
                                emptyState={{
                                    title: "areas",
                                    description: "No hay areas registradas.",
                                }}
                                pagination={{
                                    page: areaPage,
                                    pageSize: areaPageSize,
                                    total: filteredAreas.length,
                                }}
                                onPageChange={setAreaPage}
                                rowActions={(row) => (
                                    <RowActionsMenu
                                        actions={[
                                            {
                                                label: "Editar",
                                                onClick: () => {
                                                    setAreaForm({
                                                        editId: row.id,
                                                        name: row.name,
                                                        active: row.active,
                                                    })
                                                    setAreaMessage(null)
                                                },
                                            },
                                            {
                                                label: "Eliminar",
                                                variant: "destructive",
                                                onClick: async () => {
                                                    try {
                                                        await deleteAreaAction(row.id)
                                                        await refreshAreas()
                                                        setAreaMessage({ type: "success", text: "Area eliminada." })
                                                    } catch (err: any) {
                                                        setAreaMessage({ type: "error", text: err?.message || "No se pudo eliminar." })
                                                    }
                                                },
                                            },
                                        ]}
                                    />
                                )}
                            />
                        </div>

                        <form
                            className="space-y-4 rounded-xl border bg-card p-4"
                            onSubmit={async (e) => {
                                e.preventDefault()
                                setAreaMessage(null)
                                if (!areaForm.name.trim()) {
                                    setAreaMessage({ type: "error", text: "El nombre es obligatorio." })
                                    return
                                }
                                try {
                                    const payload = {
                                        name: areaForm.name.trim(),
                                        active: areaForm.active,
                                    }
                                    if (areaForm.editId) {
                                        await updateAreaAction(areaForm.editId, payload)
                                    } else {
                                        await createAreaAction(payload)
                                    }
                                    await refreshAreas()
                                    setAreaForm({ editId: "", name: "", active: true })
                                    setAreaMessage({ type: "success", text: "Area guardada." })
                                } catch (err: any) {
                                    setAreaMessage({ type: "error", text: err?.message || "No se pudo guardar." })
                                }
                            }}
                        >
                            <div className="text-sm font-medium">
                                {areaForm.editId ? "Editar area" : "Nueva area"}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nombre</label>
                                <Input
                                    value={areaForm.name}
                                    onChange={(e) => setAreaForm((s) => ({ ...s, name: e.target.value }))}
                                    placeholder="Ej: Algebra"
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
                                <Button type="submit">
                                    {areaForm.editId ? "Actualizar" : "Crear"}
                                </Button>
                                {areaForm.editId && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => setAreaForm({ editId: "", name: "", active: true })}
                                    >
                                        Cancelar
                                    </Button>
                                )}
                            </div>
                        </form>
                    </div>
                </TabsContent>

                <TabsContent value="temas" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                        <div className="space-y-3">
                            <TableControls
                                search={temaSearch}
                                onSearchChange={setTemaSearch}
                                pageSize={temaPageSize}
                                onPageSizeChange={setTemaPageSize}
                            />
                            <DataTable
                                columns={temaColumns}
                                data={pagedTemas}
                                emptyState={{
                                    title: "temas",
                                    description: "No hay temas registrados.",
                                }}
                                pagination={{
                                    page: temaPage,
                                    pageSize: temaPageSize,
                                    total: filteredTemas.length,
                                }}
                                onPageChange={setTemaPage}
                                rowActions={(row) => (
                                    <RowActionsMenu
                                        actions={[
                                            {
                                                label: "Editar",
                                                onClick: () => {
                                                setTemaForm({
                                                    editId: row.id,
                                                    area_id: row.area_id,
                                                    subblock_id: row.subblock_id,
                                                    ordering: row.ordering != null ? String(row.ordering) : "",
                                                    active: row.active,
                                                })
                                                    setTemaMessage(null)
                                                },
                                            },
                                            {
                                                label: "Eliminar",
                                                variant: "destructive",
                                                onClick: async () => {
                                                    try {
                                                        await deleteTemaAction(row.id)
                                                        await refreshTemas()
                                                        setTemaMessage({ type: "success", text: "Tema eliminado." })
                                                    } catch (err: any) {
                                                        setTemaMessage({ type: "error", text: err?.message || "No se pudo eliminar." })
                                                    }
                                                },
                                            },
                                        ]}
                                    />
                                )}
                            />
                        </div>

                        <form
                            className="space-y-4 rounded-xl border bg-card p-4"
                            onSubmit={async (e) => {
                                e.preventDefault()
                                setTemaMessage(null)
                                if (!temaForm.area_id) {
                                    setTemaMessage({ type: "error", text: "Selecciona un area." })
                                    return
                                }
                                if (!temaForm.subblock_id) {
                                    setTemaMessage({ type: "error", text: "Selecciona un sub-bloque." })
                                    return
                                }
                                try {
                                    const payload = {
                                        area_id: temaForm.area_id,
                                        subblock_id: temaForm.subblock_id,
                                        ordering: temaForm.ordering ? Number(temaForm.ordering) : null,
                                        active: temaForm.active,
                                    }
                                    if (temaForm.editId) {
                                        await updateTemaAction(temaForm.editId, payload)
                                    } else {
                                        await createTemaAction(payload)
                                    }
                                    await refreshTemas()
                                    setTemaForm({
                                        editId: "",
                                        area_id: "",
                                        subblock_id: "",
                                        ordering: "",
                                        active: true,
                                    })
                                    setTemaMessage({ type: "success", text: "Tema guardado." })
                                } catch (err: any) {
                                    setTemaMessage({ type: "error", text: err?.message || "No se pudo guardar." })
                                }
                            }}
                        >
                            <div className="text-sm font-medium">
                                {temaForm.editId ? "Editar tema" : "Nuevo tema"}
                            </div>

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
                                <label className="text-sm font-medium">Sub-bloque</label>
                                <select
                                    value={temaForm.subblock_id}
                                    onChange={(e) => setTemaForm((s) => ({ ...s, subblock_id: e.target.value }))}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="">Selecciona un sub-bloque</option>
                                    {subblocks.map((subblock) => (
                                        <option key={subblock.id} value={subblock.id}>
                                            {subblock.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Orden</label>
                                <Input
                                    type="number"
                                    value={temaForm.ordering}
                                    onChange={(e) => setTemaForm((s) => ({ ...s, ordering: e.target.value }))}
                                    placeholder="1"
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
                                <Button type="submit">
                                    {temaForm.editId ? "Actualizar" : "Crear"}
                                </Button>
                                {temaForm.editId && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() =>
                                            setTemaForm({
                                                editId: "",
                                                area_id: "",
                                                subblock_id: "",
                                                ordering: "",
                                                active: true,
                                            })
                                        }
                                    >
                                        Cancelar
                                    </Button>
                                )}
                            </div>
                        </form>
                    </div>
                </TabsContent>

                <TabsContent value="exercises" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                        <div className="space-y-3">
                            <TableControls
                                search={exerciseSearch}
                                onSearchChange={setExerciseSearch}
                                pageSize={exercisePageSize}
                                onPageSizeChange={setExercisePageSize}
                            />
                            <DataTable
                                columns={exerciseColumns}
                                data={pagedExercises}
                                emptyState={{
                                    title: "ejercicios",
                                    description: "No hay ejercicios registrados.",
                                }}
                                pagination={{
                                    page: exercisePage,
                                    pageSize: exercisePageSize,
                                    total: filteredExercises.length,
                                }}
                                onPageChange={setExercisePage}
                                rowActions={(row) => (
                                    <RowActionsMenu
                                        actions={[
                                            {
                                                label: "Editar",
                                                onClick: () => {
                                                    setExerciseForm({
                                                        editId: row.id,
                                                        id: row.id,
                                                        exercise_type: row.exercise_type,
                                                        description: row.description || "",
                                                        active: row.active,
                                                    })
                                                    setExerciseMessage(null)
                                                },
                                            },
                                            {
                                                label: "Eliminar",
                                                variant: "destructive",
                                                onClick: async () => {
                                                    try {
                                                        await deleteExerciseAction(row.id)
                                                        await refreshExercises()
                                                        setExerciseMessage({ type: "success", text: "Ejercicio eliminado." })
                                                    } catch (err: any) {
                                                        setExerciseMessage({ type: "error", text: err?.message || "No se pudo eliminar." })
                                                    }
                                                },
                                            },
                                        ]}
                                    />
                                )}
                            />
                        </div>

                        <form
                            className="space-y-4 rounded-xl border bg-card p-4"
                            onSubmit={async (e) => {
                                e.preventDefault()
                                setExerciseMessage(null)
                                if (!exerciseForm.id.trim()) {
                                    setExerciseMessage({ type: "error", text: "El id es obligatorio." })
                                    return
                                }
                                if (!exerciseForm.exercise_type.trim()) {
                                    setExerciseMessage({ type: "error", text: "El tipo es obligatorio." })
                                    return
                                }
                                try {
                                    const payload = {
                                        exercise_type: exerciseForm.exercise_type.trim(),
                                        description: exerciseForm.description.trim() || null,
                                        active: exerciseForm.active,
                                    }
                                    if (exerciseForm.editId) {
                                        await updateExerciseAction(exerciseForm.editId, payload)
                                    } else {
                                        await createExerciseAction({
                                            id: exerciseForm.id.trim(),
                                            ...payload,
                                        })
                                    }
                                    await refreshExercises()
                                    setExerciseForm({
                                        editId: "",
                                        id: "",
                                        exercise_type: "",
                                        description: "",
                                        active: true,
                                    })
                                    setExerciseMessage({ type: "success", text: "Ejercicio guardado." })
                                } catch (err: any) {
                                    setExerciseMessage({ type: "error", text: err?.message || "No se pudo guardar." })
                                }
                            }}
                        >
                            <div className="text-sm font-medium">
                                {exerciseForm.editId ? "Editar ejercicio" : "Nuevo ejercicio"}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">ID</label>
                                <Input
                                    value={exerciseForm.id}
                                    onChange={(e) => setExerciseForm((s) => ({ ...s, id: e.target.value }))}
                                    placeholder="UUID o id custom"
                                    disabled={Boolean(exerciseForm.editId)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tipo</label>
                                <Input
                                    value={exerciseForm.exercise_type}
                                    onChange={(e) => setExerciseForm((s) => ({ ...s, exercise_type: e.target.value }))}
                                    placeholder="Ej: prisma"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Descripcion</label>
                                <Input
                                    value={exerciseForm.description}
                                    onChange={(e) => setExerciseForm((s) => ({ ...s, description: e.target.value }))}
                                    placeholder="Breve descripcion"
                                />
                            </div>

                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox
                                    checked={exerciseForm.active}
                                    onCheckedChange={(val) => setExerciseForm((s) => ({ ...s, active: Boolean(val) }))}
                                />
                                Activo
                            </label>

                            {exerciseMessage && (
                                <div
                                    className={`rounded-md border p-3 text-sm ${
                                        exerciseMessage.type === "error"
                                            ? "border-destructive/50 bg-destructive/10 text-destructive"
                                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                                    }`}
                                >
                                    {exerciseMessage.text}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                                <Button type="submit">
                                    {exerciseForm.editId ? "Actualizar" : "Crear"}
                                </Button>
                                {exerciseForm.editId && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() =>
                                            setExerciseForm({
                                                editId: "",
                                                id: "",
                                                exercise_type: "",
                                                description: "",
                                                active: true,
                                            })
                                        }
                                    >
                                        Cancelar
                                    </Button>
                                )}
                            </div>
                        </form>
                    </div>
                </TabsContent>

                <TabsContent value="assignments" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                        <div className="space-y-3">
                            <TableControls
                                search={assignmentSearch}
                                onSearchChange={setAssignmentSearch}
                                pageSize={assignmentPageSize}
                                onPageSizeChange={setAssignmentPageSize}
                            />
                            <DataTable
                                columns={assignmentColumns}
                                data={pagedAssignments}
                                emptyState={{
                                    title: "asignaciones",
                                    description: "No hay asignaciones registradas.",
                                }}
                                pagination={{
                                    page: assignmentPage,
                                    pageSize: assignmentPageSize,
                                    total: filteredAssignments.length,
                                }}
                                onPageChange={setAssignmentPage}
                                rowActions={(row) => (
                                    <RowActionsMenu
                                        actions={[
                                            {
                                                label: "Editar",
                                                onClick: () => {
                                                    setAssignmentForm({
                                                        editId: row.id,
                                                        exercise_id: row.exercise_id,
                                                        tema_id: row.tema_id,
                                                        ordering: row.ordering != null ? String(row.ordering) : "",
                                                        active: row.active,
                                                    })
                                                    setAssignmentMessage(null)
                                                },
                                            },
                                            {
                                                label: "Eliminar",
                                                variant: "destructive",
                                                onClick: async () => {
                                                    try {
                                                        await deleteExerciseAssignmentAction(row.id)
                                                        await refreshAssignments()
                                                        setAssignmentMessage({ type: "success", text: "Asignacion eliminada." })
                                                    } catch (err: any) {
                                                        setAssignmentMessage({ type: "error", text: err?.message || "No se pudo eliminar." })
                                                    }
                                                },
                                            },
                                        ]}
                                    />
                                )}
                            />
                        </div>

                        <form
                            className="space-y-4 rounded-xl border bg-card p-4"
                            onSubmit={async (e) => {
                                e.preventDefault()
                                setAssignmentMessage(null)
                                if (!assignmentForm.exercise_id || !assignmentForm.tema_id) {
                                    setAssignmentMessage({ type: "error", text: "Selecciona ejercicio y tema." })
                                    return
                                }
                                try {
                                    const payload = {
                                        exercise_id: assignmentForm.exercise_id,
                                        tema_id: assignmentForm.tema_id,
                                        ordering: assignmentForm.ordering ? Number(assignmentForm.ordering) : null,
                                        active: assignmentForm.active,
                                    }
                                    if (assignmentForm.editId) {
                                        await updateExerciseAssignmentAction(assignmentForm.editId, payload)
                                    } else {
                                        await createExerciseAssignmentAction(payload)
                                    }
                                    await refreshAssignments()
                                    setAssignmentForm({
                                        editId: "",
                                        exercise_id: "",
                                        tema_id: "",
                                        ordering: "",
                                        active: true,
                                    })
                                    setAssignmentMessage({ type: "success", text: "Asignacion guardada." })
                                } catch (err: any) {
                                    setAssignmentMessage({ type: "error", text: err?.message || "No se pudo guardar." })
                                }
                            }}
                        >
                            <div className="text-sm font-medium">
                                {assignmentForm.editId ? "Editar asignacion" : "Nueva asignacion"}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Ejercicio</label>
                                <select
                                    value={assignmentForm.exercise_id}
                                    onChange={(e) => setAssignmentForm((s) => ({ ...s, exercise_id: e.target.value }))}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="">Selecciona un ejercicio</option>
                                    {exercises.map((exercise) => (
                                        <option key={exercise.id} value={exercise.id}>
                                            {(exercise.description || exercise.id)} - {exercise.exercise_type}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tema</label>
                                <select
                                    value={assignmentForm.tema_id}
                                    onChange={(e) => setAssignmentForm((s) => ({ ...s, tema_id: e.target.value }))}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="">Selecciona un tema</option>
                                    {temas.map((tema) => (
                                        <option key={tema.id} value={tema.id}>
                                            {areaMap.get(tema.area_id) || "Sin area"} • {subblockMap.get(tema.subblock_id) || "Sin sub-bloque"}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Orden</label>
                                <Input
                                    type="number"
                                    value={assignmentForm.ordering}
                                    onChange={(e) => setAssignmentForm((s) => ({ ...s, ordering: e.target.value }))}
                                    placeholder="1"
                                />
                            </div>

                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox
                                    checked={assignmentForm.active}
                                    onCheckedChange={(val) => setAssignmentForm((s) => ({ ...s, active: Boolean(val) }))}
                                />
                                Activo
                            </label>

                            {assignmentMessage && (
                                <div
                                    className={`rounded-md border p-3 text-sm ${
                                        assignmentMessage.type === "error"
                                            ? "border-destructive/50 bg-destructive/10 text-destructive"
                                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                                    }`}
                                >
                                    {assignmentMessage.text}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                                <Button type="submit">
                                    {assignmentForm.editId ? "Actualizar" : "Crear"}
                                </Button>
                                {assignmentForm.editId && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() =>
                                            setAssignmentForm({
                                                editId: "",
                                                exercise_id: "",
                                                tema_id: "",
                                                ordering: "",
                                                active: true,
                                            })
                                        }
                                    >
                                        Cancelar
                                    </Button>
                                )}
                            </div>
                        </form>
                    </div>
                </TabsContent>

                <TabsContent value="classroom-blocks" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                        <div className="space-y-3">
                            <TableControls
                                search={classroomBlockSearch}
                                onSearchChange={setClassroomBlockSearch}
                                pageSize={classroomBlockPageSize}
                                onPageSizeChange={setClassroomBlockPageSize}
                            />
                            <DataTable
                                columns={classroomBlockColumns}
                                data={pagedClassroomBlocks}
                                emptyState={{
                                    title: "bloques por aula",
                                    description: "No hay bloques asignados a aulas.",
                                }}
                                pagination={{
                                    page: classroomBlockPage,
                                    pageSize: classroomBlockPageSize,
                                    total: filteredClassroomBlocks.length,
                                }}
                                onPageChange={setClassroomBlockPage}
                                rowActions={(row) => (
                                    <RowActionsMenu
                                        actions={[
                                            {
                                                label: "Editar",
                                                onClick: () => {
                                                    setClassroomBlockForm({
                                                        editId: row.id,
                                                        classroom_id: row.classroom_id,
                                                        block_id: row.block_id,
                                                        started_at: row.started_at || "",
                                                        ended_at: row.ended_at || "",
                                                        active: row.active,
                                                    })
                                                    setClassroomBlockMessage(null)
                                                },
                                            },
                                            {
                                                label: "Eliminar",
                                                variant: "destructive",
                                                onClick: async () => {
                                                    try {
                                                        await deleteClassroomBlockAction(row.id)
                                                        await refreshClassroomBlocks()
                                                        setClassroomBlockMessage({ type: "success", text: "Asignacion eliminada." })
                                                    } catch (err: any) {
                                                        setClassroomBlockMessage({ type: "error", text: err?.message || "No se pudo eliminar." })
                                                    }
                                                },
                                            },
                                        ]}
                                    />
                                )}
                            />
                        </div>

                        <form
                            className="space-y-4 rounded-xl border bg-card p-4"
                            onSubmit={async (e) => {
                                e.preventDefault()
                                setClassroomBlockMessage(null)

                                if (!classroomBlockForm.classroom_id || !classroomBlockForm.block_id) {
                                    setClassroomBlockMessage({ type: "error", text: "Selecciona aula y bloque." })
                                    return
                                }

                                try {
                                    const payload = {
                                        classroom_id: classroomBlockForm.classroom_id,
                                        block_id: classroomBlockForm.block_id,
                                        started_at: classroomBlockForm.started_at || null,
                                        ended_at: classroomBlockForm.ended_at || null,
                                        active: classroomBlockForm.active,
                                    }
                                    if (classroomBlockForm.editId) {
                                        await updateClassroomBlockAction(classroomBlockForm.editId, payload)
                                    } else {
                                        await createClassroomBlockAction(payload)
                                    }
                                    await refreshClassroomBlocks()
                                    await refreshClassrooms()
                                    setClassroomBlockForm({
                                        editId: "",
                                        classroom_id: "",
                                        block_id: "",
                                        started_at: "",
                                        ended_at: "",
                                        active: true,
                                    })
                                    setClassroomBlockMessage({ type: "success", text: "Asignacion guardada." })
                                } catch (err: any) {
                                    setClassroomBlockMessage({ type: "error", text: err?.message || "No se pudo guardar." })
                                }
                            }}
                        >
                            <div className="text-sm font-medium">
                                {classroomBlockForm.editId ? "Editar bloque por aula" : "Asignar bloque a aula"}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Aula</label>
                                <select
                                    value={classroomBlockForm.classroom_id}
                                    onChange={(e) => setClassroomBlockForm((s) => ({ ...s, classroom_id: e.target.value }))}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="">Selecciona un aula</option>
                                    {classrooms.map((classroom) => (
                                        <option key={classroom.id} value={classroom.id}>
                                            {classroomMap.get(classroom.id) || classroom.id}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Bloque</label>
                                <select
                                    value={classroomBlockForm.block_id}
                                    onChange={(e) => setClassroomBlockForm((s) => ({ ...s, block_id: e.target.value }))}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="">Selecciona un bloque</option>
                                    {blocks.map((block) => (
                                        <option key={block.id} value={block.id}>
                                            {blockMetaMap.get(block.id) || block.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Inicio</label>
                                <Input
                                    type="date"
                                    value={classroomBlockForm.started_at}
                                    onChange={(e) => setClassroomBlockForm((s) => ({ ...s, started_at: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Fin</label>
                                <Input
                                    type="date"
                                    value={classroomBlockForm.ended_at}
                                    onChange={(e) => setClassroomBlockForm((s) => ({ ...s, ended_at: e.target.value }))}
                                />
                            </div>

                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox
                                    checked={classroomBlockForm.active}
                                    onCheckedChange={(val) => setClassroomBlockForm((s) => ({ ...s, active: Boolean(val) }))}
                                />
                                Activo
                            </label>

                            {classroomBlockMessage && (
                                <div
                                    className={`rounded-md border p-3 text-sm ${
                                        classroomBlockMessage.type === "error"
                                            ? "border-destructive/50 bg-destructive/10 text-destructive"
                                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                                    }`}
                                >
                                    {classroomBlockMessage.text}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                                <Button type="submit">
                                    {classroomBlockForm.editId ? "Actualizar" : "Crear"}
                                </Button>
                                {classroomBlockForm.editId && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() =>
                                            setClassroomBlockForm({
                                                editId: "",
                                                classroom_id: "",
                                                block_id: "",
                                                started_at: "",
                                                ended_at: "",
                                                active: true,
                                            })
                                        }
                                    >
                                        Cancelar
                                    </Button>
                                )}
                            </div>
                        </form>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}

"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
    DataTable,
    PageHeader,
    type ColumnDef,
    StatusBadge
} from "@/components/dashboard/core"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Building2 } from "lucide-react"

interface Institution {
    id: string
    name: string
    type: string
    created_at: string
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
        key: "created_at",
        header: "Fecha de Registro",
        sortable: true,
        render: (val) => new Date(val).toLocaleDateString()
    }
]

interface InstitutionsTableProps {
    initialData: Institution[]
}

export default function InstitutionsTable({ initialData }: InstitutionsTableProps) {
    const router = useRouter()
    const [data, setData] = useState(initialData)
    const [search, setSearch] = useState("")
    const [pageSize, setPageSize] = useState(pageSizeOptions[0])
    const [page, setPage] = useState(1)

    const filteredData = useMemo(() => {
        const needle = search.trim().toLowerCase()
        if (!needle) return data
        return data.filter((row) =>
            row.name.toLowerCase().includes(needle) ||
            row.type.toLowerCase().includes(needle)
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
                    <Button onClick={() => console.log("New Institution")}>
                        <Plus className="w-4 h-4 mr-2" />
                        Nueva Institución
                    </Button>
                }
            />

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
                data={pagedData}
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
                onRowClick={(row) => console.log("View institution", row.id)}
            />
        </div>
    )
}

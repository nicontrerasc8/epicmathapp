"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    DataTable,
    PageHeader,
    StatusBadge,
    type ColumnDef
} from "@/components/dashboard/core"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface ContentRow {
    id: string
    classroom_id: string | null
    classroom_label: string
    tema_id: string | null
    tema_name: string
    exercise_id: string | null
    description: string
    exercise_type: string
    active: boolean
    created_at: string
}

const columns: ColumnDef<ContentRow>[] = [
    {
        key: "classroom_label",
        header: "Salon",
        sortable: true,
        render: (val) => <span className="font-medium">{val}</span>
    },
    {
        key: "tema_name",
        header: "Tema",
        sortable: true,
        render: (val) => <span className="text-muted-foreground">{val}</span>
    },
    {
        key: "description",
        header: "Ejercicio",
        render: (val) => <span className="font-medium truncate max-w-lg block">{val}</span>
    },
    {
        key: "exercise_type",
        header: "Tipo",
        sortable: true,
        render: (val) => (
            <span className="capitalize px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                {val}
            </span>
        )
    },
    {
        key: "active",
        header: "Estado",
        render: (val) => <StatusBadge active={val} />
    },
    {
        key: "created_at",
        header: "Creado",
        sortable: true,
        render: (val) => new Date(val).toLocaleDateString()
    }
]

interface ContentsTableProps {
    initialData: ContentRow[]
}

export default function ContentsTable({ initialData }: ContentsTableProps) {
    const router = useRouter()

    return (
        <div className="space-y-6">
            <PageHeader
                title="Contenidos"
                description="Gestion de ejercicios por salon y tema"
                breadcrumbs={[
                    { label: "Admin", href: "/dashboard/admin" },
                    { label: "Contenidos" }
                ]}
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Button asChild>
                            <Link href="/dashboard/admin/contents/new">
                                <Plus className="w-4 h-4 mr-2" />
                                Nuevo Ejercicio
                            </Link>
                        </Button>
                        <Button variant="secondary" asChild>
                            <Link href="/dashboard/admin/contents/assign">
                                Asignar Ejercicio a Salon
                            </Link>
                        </Button>
                    </div>
                }
            />

            <DataTable
                columns={columns}
                data={initialData}
                emptyState={{
                    title: "ejercicios",
                    description: "No hay ejercicios asignados."
                }}
                onRowClick={(row) => {
                    if (row.tema_id) {
                        router.push(`/dashboard/admin/contents/${row.tema_id}`)
                    }
                }}
            />
        </div>
    )
}

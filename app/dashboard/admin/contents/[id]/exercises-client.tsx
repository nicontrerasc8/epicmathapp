"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
    DataTable,
    PageHeader,
    type ColumnDef
} from "@/components/dashboard/core"
import { Button } from "@/components/ui/button"
import { Plus, FileQuestion } from "lucide-react"

interface Exercise {
    id: string
    exercise_id: string | null
    description: string
    exercise_type: string
    created_at: string
}

interface Tema {
    id: string
    area?: { name: string } | null
    subblock?: { name: string } | null
}

const columns: ColumnDef<Exercise>[] = [
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
        key: "created_at",
        header: "Creado",
        sortable: true,
        render: (val) => new Date(val).toLocaleDateString()
    }
]

interface ExercisesClientProps {
    tema: Tema
    exercises: Exercise[]
}

export default function ExercisesClient({ tema, exercises }: ExercisesClientProps) {
    const router = useRouter()
    const [data, setData] = useState(exercises)

    return (
        <div className="space-y-6">
            <PageHeader
                title={tema.area?.name || "Area"}
                description={tema.subblock?.name || "Sub-bloque"}
                breadcrumbs={[
                    { label: "Admin", href: "/dashboard/admin" },
                    { label: "Contenidos", href: "/dashboard/admin/contents" },
                    { label: tema.area?.name || "Area" }
                ]}
                actions={
                    <Button onClick={() => router.push("/dashboard/admin/contents/new")}>
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Ejercicio
                    </Button>
                }
            />

            <DataTable
                columns={columns}
                data={data}
                emptyState={{
                    title: "ejercicios",
                    description: "No hay ejercicios en este tema."
                }}
            />
        </div>
    )
}

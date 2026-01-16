"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import {
    PageHeader,
    DataTable,
    StatusBadge,
    type ColumnDef
} from "@/components/dashboard/core"
import { useInstitution } from "@/components/institution-provider"

interface Student {
    id: string
    first_name: string
    last_name: string
    active: boolean
    created_at: string
}

const columns: ColumnDef<Student>[] = [
    {
        key: "first_name",
        header: "Nombre",
        sortable: true,
        render: (_, row) => (
            <div className="font-medium">
                {row.first_name} {row.last_name}
            </div>
        ),
    },
    {
        key: "active",
        header: "Estado",
        render: (val) => <StatusBadge active={val} />,
    },
    {
        key: "created_at",
        header: "Fecha de Ingreso",
        sortable: true,
        render: (val) => new Date(val).toLocaleDateString(),
    },
]

export default function TeacherClassroomStudentsPage() {
    const params = useParams()
    const classroomId = params.id as string
    const router = useRouter()
    const institution = useInstitution()
    const [loading, setLoading] = useState(true)
    const [students, setStudents] = useState<Student[]>([])

    useEffect(() => {
        const fetchStudents = async () => {
            const supabase = createClient()
            let query = supabase
                .from("edu_institution_members")
                .select(`
          active,
          created_at,
          profile:edu_profiles ( id, first_name, last_name )
        `)
                .eq("classroom_id", classroomId)
                .eq("role", "student")

            if (institution?.id) {
                query = query.eq("institution_id", institution.id)
            }

            const { data } = await query

            if (data) {
                setStudents(data.map((m: any) => ({
                    id: m.profile.id,
                    first_name: m.profile.first_name,
                    last_name: m.profile.last_name,
                    active: m.active,
                    created_at: m.created_at
                })))
            }
            setLoading(false)
        }
        fetchStudents()
    }, [classroomId, institution?.id])

    return (
        <div className="space-y-6">
            <PageHeader
                title="Estudiantes"
                breadcrumbs={[
                    { label: "Mis Clases", href: "/dashboard/teacher" },
                    { label: "Aula", href: `/dashboard/teacher/classroom/${classroomId}` },
                    { label: "Estudiantes" },
                ]}
            />

            <DataTable
                columns={columns}
                data={students}
                loading={loading}
                emptyState={{
                    title: "estudiantes",
                    description: "No hay estudiantes en esta clase."
                }}
                onRowClick={(student) => {
                    router.push(`/dashboard/teacher/classroom/${classroomId}/performance/${student.id}`)
                }}
            />
        </div>
    )
}

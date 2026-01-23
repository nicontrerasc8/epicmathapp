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
                .from("edu_classroom_members")
                .select(`
          edu_institution_members!inner (
            active,
            created_at,
            role,
            institution_id,
            profile:edu_profiles ( id, first_name, last_name )
          )
        `)
                .eq("classroom_id", classroomId)
                .eq("edu_institution_members.role", "student")
                .eq("edu_institution_members.active", true)

            if (institution?.id) {
                query = query.eq("edu_institution_members.institution_id", institution.id)
            }

            const { data } = await query

            if (data) {
                setStudents(
                    data
                        .map((row: any) => {
                            const member = Array.isArray(row.edu_institution_members)
                                ? row.edu_institution_members[0]
                                : row.edu_institution_members

                            if (!member?.profile) return undefined

                            return {
                                id: member.profile.id,
                                first_name: member.profile.first_name,
                                last_name: member.profile.last_name,
                                active: member.active,
                                created_at: member.created_at,
                            }
                        })
                        .filter((s): s is Student => Boolean(s))
                )

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

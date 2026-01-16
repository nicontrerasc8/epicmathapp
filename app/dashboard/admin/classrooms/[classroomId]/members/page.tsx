"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import {
  PageHeader,
  DataTable,
  StatusBadge,
  type ColumnDef
} from "@/components/dashboard/core"
import { useInstitution } from "@/components/institution-provider"

interface Member {
  id: string
  role: string
  active: boolean
  profile: {
    first_name: string
    last_name: string
    email: string
  }
}

const columns: ColumnDef<Member>[] = [
  {
    key: "name",
    header: "Nombre",
    render: (_, row) => (
      <div className="font-medium">
        {row.profile.first_name} {row.profile.last_name}
      </div>
    ),
  },
  {
    key: "role",
    header: "Rol",
    render: (val) => <span className="capitalize">{val}</span>,
  },
  {
    key: "active",
    header: "Estado",
    render: (val) => <StatusBadge active={val} />,
  },
]

export default function ClassroomMembersPage() {
  const params = useParams()
  const classroomId = params.classroomId as string
  const institution = useInstitution()
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<Member[]>([])

  useEffect(() => {
    const fetchMembers = async () => {
      const supabase = createClient()
      let query = supabase
        .from("edu_institution_members")
        .select(`
          id,
          role,
          active,
          profile:edu_profiles ( first_name, last_name )
        `)
        .eq("classroom_id", classroomId)

      if (institution?.id) {
        query = query.eq("institution_id", institution.id)
      }

      const { data } = await query

      if (data) {
        setMembers(data.map((m: any) => ({
          id: m.id,
          role: m.role,
          active: m.active,
          profile: m.profile
        })))
      }
      setLoading(false)
    }
    fetchMembers()
  }, [classroomId, institution?.id])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Miembros del Aula"
        breadcrumbs={[
          { label: "Admin", href: "/dashboard/admin" },
          { label: "Aulas", href: "/dashboard/admin/classrooms" },
          { label: "Detalle", href: `/dashboard/admin/classrooms/${classroomId}` },
          { label: "Miembros" },
        ]}
      />

      <DataTable
        columns={columns}
        data={members}
        loading={loading}
        emptyState={{
          title: "miembros",
          description: "No hay miembros asignados a esta aula."
        }}
      />
    </div>
  )
}

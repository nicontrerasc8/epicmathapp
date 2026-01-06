"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Plus, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  PageHeader,
  DataTable,
  type ColumnDef
} from "@/components/dashboard/core"

interface Quiz {
  id: string
  title: string
  description: string
  created_at: string
}

const columns: ColumnDef<Quiz>[] = [
  {
    key: "title",
    header: "Título",
    render: (_, row) => (
      <div>
        <div className="font-medium">{row.title}</div>
        <div className="text-sm text-muted-foreground truncate max-w-md">
          {row.description}
        </div>
      </div>
    ),
  },
  {
    key: "created_at",
    header: "Fecha de Creación",
    sortable: true,
    render: (val) => new Date(val).toLocaleDateString(),
  },
]

export default function TeacherClassroomExamsPage() {
  const router = useRouter()
  const params = useParams()
  const classroomId = params.id as string
  const [loading, setLoading] = useState(true)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])

  useEffect(() => {
    const fetchQuizzes = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("quizzes")
        .select("id, title, description, created_at")
        .eq("classroom_id", classroomId)
        .order("created_at", { ascending: false })

      if (data) {
        setQuizzes(data)
      }
      setLoading(false)
    }
    fetchQuizzes()
  }, [classroomId])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exámenes"
        breadcrumbs={[
          { label: "Mis Clases", href: "/dashboard/teacher" },
          { label: "Aula", href: `/dashboard/teacher/classroom/${classroomId}` },
          { label: "Exámenes" },
        ]}
        actions={
          <Button onClick={() => router.push(`/dashboard/teacher/classroom/${classroomId}/exams/new`)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Examen
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={quizzes}
        loading={loading}
        emptyState={{
          title: "exámenes",
          description: "No hay exámenes creados."
        }}
        onRowClick={(row) => console.log("View quiz", row.id)}
      />
    </div>
  )
}

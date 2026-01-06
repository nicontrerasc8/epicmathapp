"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { PageHeader } from "@/components/dashboard/core"
import { Button } from "@/components/ui/button"
import { Save } from "lucide-react"

interface Tema {
  id: string
  areaName: string
  subblockName: string
}

export default function NewExamPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const classroomId = params.id as string

  const [temas, setTemas] = useState<Tema[]>([])
  const [selectedTemaId, setSelectedTemaId] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      // Fetch temas assigned to this classroom
      const { data } = await supabase
        .from("edu_classroom_temas")
        .select(`
          tema:edu_temas (
            id,
            area:edu_areas ( name ),
            subblock:edu_academic_subblocks ( name )
          )
        `)
        .eq("classroom_id", classroomId)
        .eq("active", true)

      if (data) {
        setTemas(data.map((t: any) => ({
          id: t.tema.id,
          areaName: t.tema.area?.name || "Area",
          subblockName: t.tema.subblock?.name || "Sub-bloque",
        })))
      }
      setLoading(false)
    }
    fetchData()
  }, [classroomId])

  const handleCreate = async () => {
    if (!selectedTemaId) return
    setSaving(true)

    const tema = temas.find(t => t.id === selectedTemaId)

    // Fetch classroom grade if needed for quizzes table
    const { data: cls } = await supabase
      .from("edu_classrooms")
      .select("grade")
      .eq("id", classroomId)
      .single()

    const { error } = await supabase.from("quizzes").insert([
      {
        title: tema ? `${tema.areaName} - ${tema.subblockName}` : "Examen",
        description,
        classroom_id: classroomId,
        grade_target: cls?.grade
      }
    ])

    if (!error) {
      router.push(`/dashboard/teacher/classroom/${classroomId}/exams`)
    } else {
      console.error(error)
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo Examen"
        breadcrumbs={[
          { label: "Mis Clases", href: "/dashboard/teacher" },
          { label: "Aula", href: `/dashboard/teacher/classroom/${classroomId}` },
          { label: "Exámenes", href: `/dashboard/teacher/classroom/${classroomId}/exams` },
          { label: "Nuevo" },
        ]}
      />

      <div className="max-w-xl bg-card border rounded-xl p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Area</label>
          <select
            value={selectedTemaId}
            onChange={(e) => setSelectedTemaId(e.target.value)}
            className="w-full p-2 rounded-md border bg-background"
            disabled={loading}
          >
            <option value="">Selecciona un area</option>
            {temas.map((t) => (
              <option key={t.id} value={t.id}>{t.areaName} - {t.subblockName}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Descripción (Opcional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 rounded-md border bg-background min-h-[100px]"
            placeholder="Instrucciones para el examen..."
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleCreate} disabled={!selectedTemaId || saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Guardando..." : "Crear Examen"}
          </Button>
        </div>
      </div>
    </div>
  )
}

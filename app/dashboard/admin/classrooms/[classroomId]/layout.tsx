import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/server"
import { requireInstitution } from "@/lib/institution"

export default async function ClassroomLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ classroomId: string }>
}) {
  const { classroomId } = await params
  const institution = await requireInstitution()
  const supabase = await createClient()
  const { data: classroom } = await supabase
    .from("edu_classrooms")
    .select("id")
    .eq("id", classroomId)
    .eq("institution_id", institution.id)
    .single()

  if (!classroom) {
    notFound()
  }
  const base = `/dashboard/admin/classrooms/${classroomId}`

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">Detalle de clase</h1>
        <Link href="/dashboard/admin/classrooms">
          <Button variant="secondary">Volver</Button>
        </Link>
      </div>

      <div className="flex gap-2 border-b pb-2">
        <Link href={base}>
          <Button variant="ghost">Resumen</Button>
        </Link>
        <Link href={`${base}/temas`}>
          <Button variant="ghost">Temas</Button>
        </Link>
        <Link href={`${base}/blocks`}>
          <Button variant="ghost">Bloques</Button>
        </Link>
        <Link href={`${base}/members`}>
          <Button variant="ghost">Usuarios</Button>
        </Link>
        <Link href={`${base}/exercises`}>
          <Button variant="ghost">Ejercicios</Button>
        </Link>
      </div>

      {children}
    </div>
  )
}

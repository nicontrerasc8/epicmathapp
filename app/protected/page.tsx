import { createClient } from "@/utils/supabase/server"
import { InfoIcon } from "lucide-react"
import { redirect } from "next/navigation"

export default async function ProtectedPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Si no hay usuario autenticado → redirigir al inicio
  if (!user) {
    return redirect("/")
  }

  // Buscar si el usuario es profesor
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("id", user.id)
    .single()

  if (teacher) {
    return redirect("/dashboard/teacher")
  }

  // Buscar si el usuario es estudiante
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", user.id)
    .single()

  if (student) {
    return redirect("/dashboard/student/play")
  }

  // Si no es ni profesor ni estudiante → mostrar mensaje
  return (
    <div className="flex-1 w-full flex flex-col gap-12 p-6">
      <div className="bg-destructive text-sm p-3 px-5 rounded-md text-white flex gap-3 items-center">
        <InfoIcon size={16} strokeWidth={2} />
        Este usuario no tiene un rol asignado como profesor o estudiante.
      </div>

      <div className="flex flex-col gap-2 items-start mt-4">
        <h2 className="font-bold text-2xl mb-4">Detalles del usuario</h2>
        <pre className="text-xs font-mono p-3 rounded border max-h-32 overflow-auto text-white">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>
    </div>
  )
}

import { createClient } from "@/utils/supabase/server"
import { InfoIcon } from "lucide-react"
import { redirect } from "next/navigation"

export default async function ProtectedPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 1️⃣ No autenticado
  if (!user) {
    return redirect("/sign-in")
  }

  // 2️⃣ Buscar perfil + rol global
  const { data: profile, error } = await supabase
    .from("edu_profiles")
    .select("id, global_role, active")
    .eq("id", user.id)
    .single()

  // 3️⃣ Perfil inexistente
  if (error || !profile) {
    return (
      <ErrorBox message="Tu perfil no existe en el sistema. Contacta al administrador." user={user} />
    )
  }

  // 4️⃣ Cuenta desactivada
  if (!profile.active) {
    return (
      <ErrorBox message="Tu cuenta está desactivada. Contacta al administrador." user={user} />
    )
  }

  // 5️⃣ Redirect según ROL GLOBAL
  switch (profile.global_role) {
    case "admin":
      return redirect("/dashboard/admin")

    case "teacher":
      return redirect("/dashboard/teacher")

    case "student":
      return redirect("/dashboard/student/play")

    default:
      return (
        <ErrorBox
          message="Tu cuenta no tiene un rol asignado (global_role). Contacta al administrador."
          user={user}
        />
      )
  }
}

/* ===========================
   UI DE ERROR REUTILIZABLE
=========================== */
function ErrorBox({
  message,
  user,
}: {
  message: string
  user: any
}) {
  return (
    <div className="flex-1 w-full flex flex-col gap-10 p-6">
      <div className="bg-destructive text-sm p-4 px-5 rounded-md text-white flex gap-3 items-center">
        <InfoIcon size={16} strokeWidth={2} />
        {message}
      </div>

      <div className="flex flex-col gap-2 items-start">
        <h2 className="font-bold text-xl">Detalles del usuario autenticado</h2>
        <pre className="text-xs font-mono p-3 rounded border max-h-48 overflow-auto bg-black text-white">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>
    </div>
  )
}

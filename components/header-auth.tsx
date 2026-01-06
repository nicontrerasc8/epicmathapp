import { signOutAction } from "@/app/actions"
import { hasEnvVars } from "@/utils/supabase/check-env-vars"
import Link from "next/link"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { createClient } from "@/utils/supabase/server"

export default async function AuthButton() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!hasEnvVars) {
    return (
      <div className="flex gap-4 items-center">
        <Badge className="font-normal pointer-events-none">
          Por favor actualiza el archivo .env.local
        </Badge>
        <Button asChild size="sm" variant="outline" disabled>
          <Link href="/sign-in">Iniciar sesión</Link>
        </Button>
      </div>
    )
  }

  if (user) {
    const { data: profile } = await supabase
      .from("edu_profiles")
      .select("first_name, last_name, global_role")
      .eq("id", user.id)
      .eq("active", true)
      .single()

    const fullName = profile
      ? `${profile.first_name} ${profile.last_name}`
      : user.email

    return (
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold">
          ¡Hola, {fullName}!
        </span>

        {profile?.global_role && (
          <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
            {profile.global_role.toUpperCase()}
          </span>
        )}

        <form action={signOutAction}>
          <Button type="submit" variant="destructive" size="sm">
            Cerrar sesión
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Button asChild size="sm" variant="secondary">
        <Link href="/sign-in">Iniciar sesión</Link>
      </Button>
    </div>
  )
}

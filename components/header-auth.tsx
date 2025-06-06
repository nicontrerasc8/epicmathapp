import { signOutAction } from "@/app/actions";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { createClient } from "@/utils/supabase/server";

export default async function AuthButton() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!hasEnvVars) {
    return (
      <div className="flex gap-4 items-center">
        <Badge
       
          className="font-normal pointer-events-none"
        >
          Por favor actualiza el archivo .env.local
        </Badge>
        <div className="flex gap-2">
          <Button
            asChild
            size="sm"
            variant="outline"
            disabled
            className="opacity-75 cursor-not-allowed"
          >
            <Link href="/sign-in">Iniciar sesión</Link>
          </Button>
        </div>
      </div>
    );
  }

  return user ? (
    <div className="flex items-center gap-4">
      <span className="text-sm font-semibold">¡Hola, {user.email}!</span>
      <form action={signOutAction}>
        <Button type="submit" variant="destructive" size="sm">
          Cerrar sesión
        </Button>
      </form>
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant="secondary">
        <Link href="/sign-in">Iniciar sesión</Link>
      </Button>
    </div>
  );
}

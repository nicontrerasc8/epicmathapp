'use client'

import { useStudent } from '@/lib/hooks/useStudent'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function NavbarStudent() {
  const { student, logout } = useStudent()
  const router = useRouter()

  if (!student) {
    return (
      <Link
        href="/sign-in"
        className="text-sm underline text-primary-foreground hover:text-white"
      >
        Iniciar sesión
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-primary-foreground">
        👋 Hola, <span className="font-semibold">{student.username}</span>
      </span>
      <Link
        href="/dashboard/student"
        className="text-sm hover:underline"
      >
        Dashboard
      </Link>
      <Button
        onClick={logout}
        variant="destructive"
        className="text-sm"
      >
        Cerrar sesión
      </Button>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

// Actualizado useStudent hook integrado directamente
function useStudent(redirectIfNotFound = false) {
  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const stored = localStorage.getItem('student')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setStudent(parsed)
      } catch (err) {
        console.error('Error parsing student from localStorage', err)
        localStorage.removeItem('student')
      }
    } else if (redirectIfNotFound) {
      router.push('/sign-in')
    }
    setLoading(false)
  }, [redirectIfNotFound, router, pathname])

  const logout = () => {
    localStorage.removeItem('student')
    setStudent(null)
    router.push('/sign-in')
  }

  return { student, loading, logout }
}

export default function NavbarStudent() {
  const { student, logout, loading } = useStudent(true)
  const [authUser, setAuthUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setAuthUser(user || null)
      setAuthLoading(false)
    }

    checkAuth()
  }, [pathname])

  if (loading || authLoading) return null

  if (student) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-primary-foreground">
          👋 Hola, <span className="font-semibold">{student.username}</span>
        </span>
        <Link href="/dashboard/student" className="text-sm hover:underline">
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

  if (authUser) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-primary-foreground">
          👋 Hola, <span className="font-semibold">{authUser.email}</span>
        </span>
        <Link href="/dashboard/teacher" className="text-sm hover:underline">
          Dashboard
        </Link>
        <Button
          onClick={async () => {
            await supabase.auth.signOut()
            router.push('/sign-in')
          }}
          variant="destructive"
          className="text-sm"
        >
          Cerrar sesión
        </Button>
      </div>
    )
  }

  return (
    <Link
      href="/sign-in"
      className="text-sm underline text-primary-foreground hover:text-white"
    >
      Iniciar sesión
    </Link>
  )
}

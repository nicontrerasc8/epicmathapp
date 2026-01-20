'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { fetchStudentSession, type StudentSessionData } from '@/lib/student-session-client'

export function useStudent(redirectIfNotFound = false) {
  const [student, setStudent] = useState<StudentSessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let active = true

    const loadSession = async () => {
      try {
        const session = await fetchStudentSession()
        if (!active) return
        if (session) {
          setStudent(session)
        } else {
          setStudent(null)
          if (redirectIfNotFound) {
            router.push('/sign-in')
          }
        }
      } catch (err) {
        if (active) {
          setStudent(null)
          if (redirectIfNotFound) {
            router.push('/sign-in')
          }
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadSession()

    return () => {
      active = false
    }
  }, [redirectIfNotFound, router])

  const logout = async () => {
    await supabase.auth.signOut()
    setStudent(null)
    router.push('/sign-in')
  }

  return { student, loading, logout }
}

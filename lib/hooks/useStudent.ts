'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { fetchStudentSession } from '@/lib/student-session-client'

type Student = {
  id: string
  username: string
  grade: number
  level: number
  school_id: string | null
  classroom_id: string
}


export function useStudent(redirectIfNotFound = false) {
  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

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
    await fetch('/api/student/logout', { method: 'POST' })
    setStudent(null)
    router.push('/sign-in')
  }

  return { student, loading, logout }
}

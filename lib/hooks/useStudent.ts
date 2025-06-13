'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
      router.push('/sign-in') // o la ruta que uses
    }
    setLoading(false)
  }, [redirectIfNotFound, router])

  const logout = () => {
    localStorage.removeItem('student')
    setStudent(null)
    router.push('/sign-in')
  }

  return { student, loading, logout }
}

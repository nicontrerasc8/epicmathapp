'use client'

import { useStudent } from '@/lib/hooks/useStudent'
import Link from 'next/link'

export default function StudentDashboard() {
  const { student, loading } = useStudent(true)

  if (loading) return <div className="text-white p-6">Cargando...</div>

  return (
    <div className="min-h-screen p-6 bg-background text-foreground">
      <h1 className="text-2xl font-bold mb-2">¡Hola, {student?.username}!</h1>
      <p className="text-muted-foreground mb-6">
        Estás en el nivel <strong>{student?.level}</strong> del grado <strong>{student?.grade}</strong>.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-10">
        <Link href="/dashboard/student/play" className="w-full sm:w-auto">
          <button className="w-full sm:w-auto bg-secondary text-white font-semibold px-6 py-3 rounded-lg shadow hover:bg-secondary/90 transition">
            🎮 Jugar
          </button>
        </Link>
      </div>
    </div>
  )
}

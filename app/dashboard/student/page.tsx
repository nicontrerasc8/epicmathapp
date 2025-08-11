'use client'

import { useStudent } from '@/lib/hooks/useStudent'
import Link from 'next/link'

export default function StudentDashboard() {
  const { student, loading } = useStudent(true)

  if (loading) return <div className="text-white p-6">Cargando...</div>

  return (
  <div className="p-6 bg-background text-foreground flex flex-col items-center justify-center">
  <h1 className="text-2xl font-bold mb-2 text-primary">
    ¡Hola, {student?.nombres ? student.nombres.split(' ')[0] : student?.username}!
  </h1>
  <p className="text-muted-foreground mb-6">
    Estás en el nivel <strong>{student?.level}</strong> del grado <strong>{student?.grade}</strong>.
  </p>

  <div className="flex flex-col sm:flex-row gap-6">
    <Link href="/dashboard/student/play" className="w-full sm:w-auto">
      <button className="w-full sm:w-auto bg-secondary text-white font-semibold px-6 py-3 rounded-xl hover:bg-secondary/90 transition">
        🎮 Jugar
      </button>
    </Link>

    <Link href="/dashboard/student/exams" className="w-full sm:w-auto">
      <button className="w-full sm:w-auto bg-primary text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 transition">
        📝 Ver mis exámenes
      </button>
    </Link>
  </div>
</div>

  )
}

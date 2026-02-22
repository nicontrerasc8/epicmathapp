'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, BookOpen, Brain, Rocket, Sparkles, Star, Target, Trophy, Zap } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { fetchStudentSession } from '@/lib/student-session-client'

type AssignmentRow = {
  id: string
  exercise_id: string
  edu_exercises: {
    id: string
    exercise_type: string
    description: string | null
  }
}

type AssignmentRowFromQuery = {
  id: string
  exercise_id: string
  edu_exercises:
    | {
        id: string
        exercise_type: string
        description: string | null
      }
    | Array<{
        id: string
        exercise_type: string
        description: string | null
      }>
    | null
}

const icons = [Rocket, Star, Sparkles, Trophy, Zap, Target, BookOpen, Brain]

export default function TopicExercisesPage() {
  const params = useParams<{ id: string; exercise_type: string }>()
  const idClassroom = params.id
  const exerciseType = decodeURIComponent(params.exercise_type)

  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])

  useEffect(() => {
    if (!idClassroom || !exerciseType) return

    let active = true

    const load = async () => {
      setLoading(true)

      const session = await fetchStudentSession()
      if (!session?.student_id) {
        if (!active) return
        setAssignments([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('edu_exercise_assignments')
        .select(`
          id,
          exercise_id,
          edu_exercises!inner (
            id,
            exercise_type,
            description
          )
        `)
        .eq('classroom_id', idClassroom)
        .eq('active', true)

      if (!active) return

      if (error) {
        console.error('Supabase error:', error)
        setAssignments([])
        setLoading(false)
        return
      }

      const normalized = ((data ?? []) as AssignmentRowFromQuery[])
        .map((assignment) => {
          const exercise = Array.isArray(assignment.edu_exercises)
            ? assignment.edu_exercises[0]
            : assignment.edu_exercises

          if (!exercise) return null

          return {
            id: assignment.id,
            exercise_id: assignment.exercise_id,
            edu_exercises: exercise,
          } satisfies AssignmentRow
        })
        .filter((assignment): assignment is AssignmentRow => assignment !== null)

      const filtered = normalized.filter(
        (assignment) => assignment.edu_exercises.exercise_type === exerciseType,
      )

      setAssignments(filtered)
      setLoading(false)
    }

    load()
    return () => {
      active = false
    }
  }, [supabase, idClassroom, exerciseType])

  const sortedAssignments = useMemo(() => {
    return [...assignments].sort((a, b) => {
      const labelA = a.edu_exercises?.description || a.edu_exercises?.id || a.exercise_id
      const labelB = b.edu_exercises?.description || b.edu_exercises?.id || b.exercise_id
      return labelA.localeCompare(labelB)
    })
  }, [assignments])

  if (!idClassroom || !exerciseType) {
    return <div className="p-6">Ruta invalida.</div>
  }

  if (loading) {
    return <div className="p-6">Cargando ejercicios...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 px-6 py-10 sm:py-16">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-blue-200 bg-white/90 px-4 py-3">
          <Link
            href="/student/play"
            className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a temas
          </Link>
          <p className="text-sm font-semibold text-slate-700">
            Tema: <span className="text-blue-700">{exerciseType}</span>
          </p>
        </div>

        {sortedAssignments.length === 0 ? (
          <div className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-3xl border-2 border-blue-200 shadow-lg">
            <p className="text-2xl font-bold text-slate-900 mb-2">No hay ejercicios para este tema.</p>
            <p className="text-slate-600">Prueba con otro tema del menu general.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedAssignments.map((assignment, index) => {
              const exercise = assignment.edu_exercises
              const label = exercise.description || exercise.id || `Ejercicio ${index + 1}`
              const Icon = icons[index % icons.length]

              return (
                <motion.div
                  key={assignment.id}
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    delay: index * 0.08,
                    type: 'spring',
                    stiffness: 100,
                    damping: 15,
                  }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    href={`/student/play/${assignment.exercise_id}`}
                    className="block relative group"
                  >
                    <div className="relative bg-white rounded-2xl p-6 border-2 border-blue-200 hover:border-blue-400 transition-all overflow-hidden shadow-xl">
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-200/40 to-transparent opacity-0 group-hover:opacity-100"
                        initial={{ x: '-100%' }}
                        whileHover={{ x: '100%' }}
                        transition={{ duration: 0.6 }}
                      />

                      <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="relative z-10 space-y-4">
                        <motion.div
                          className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-100 to-green-100 rounded-xl flex items-center justify-center border-2 border-blue-300"
                          whileHover={{ rotate: 360, scale: 1.1 }}
                          transition={{ duration: 0.5 }}
                        >
                          <Icon className="w-10 h-10 text-blue-600" />
                        </motion.div>

                        <h3 className="font-bold text-lg text-center text-slate-900   group-hover:text-blue-600 transition-colors">
                          {label}
                        </h3>

                        <motion.div
                          className="bg-blue-100 hover:bg-blue-600 text-blue-700 hover:text-white font-bold py-3 px-6 rounded-xl text-center border border-blue-300 transition-all"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Comenzar
                        </motion.div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

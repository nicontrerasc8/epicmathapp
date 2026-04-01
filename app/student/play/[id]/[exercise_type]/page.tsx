'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  BookOpen,
  Brain,
  Rocket,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { fetchStudentSession } from '@/lib/student-session-client'

type AssignmentRow = {
  id: string
  exercise_id: string
  order: number | null
  edu_exercises: {
    id: string
    exercise_type: string
    block: string | null
    created_at: string | null
  }
}

type AssignmentRowFromQuery = {
  id: string
  exercise_id: string
  order: number | null
  edu_exercises:
    | {
        id: string
        exercise_type: string
        block: string | null
        created_at: string | null
      }
    | Array<{
        id: string
        exercise_type: string
        block: string | null
        created_at: string | null
      }>
    | null
}

type ThemeCard = {
  block: string
  exerciseCount: number
  firstOrder: number
}

const icons = [Rocket, Star, Sparkles, Trophy, Zap, Target, BookOpen, Brain]

export default function TopicThemesPage() {
  const params = useParams<{ id: string; exercise_type: string }>()
  const classroomId = params.id
  const exerciseType = decodeURIComponent(params.exercise_type)

  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])

  useEffect(() => {
    if (!classroomId || !exerciseType) return

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
          order,
          edu_exercises!inner (
            id,
            exercise_type,
            block,
            created_at
          )
        `)
        .eq('classroom_id', classroomId)
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
            order: assignment.order,
            edu_exercises: exercise,
          } satisfies AssignmentRow
        })
        .filter((assignment): assignment is AssignmentRow => assignment !== null)

      setAssignments(
        normalized.filter(
          (assignment) => assignment.edu_exercises.exercise_type === exerciseType,
        ),
      )
      setLoading(false)
    }

    load()
    return () => {
      active = false
    }
  }, [supabase, classroomId, exerciseType])

  const themes = useMemo(() => {
    const grouped = new Map<string, ThemeCard>()

    for (const assignment of assignments) {
      const theme = assignment.edu_exercises.block?.trim() || 'Sin tema'
      const current = grouped.get(theme)
      const order = Number(assignment.order ?? 0)

      if (!current) {
        grouped.set(theme, {
          block: theme,
          exerciseCount: 1,
          firstOrder: order,
        })
        continue
      }

      current.exerciseCount += 1
      current.firstOrder = Math.min(current.firstOrder, order)
    }

    return Array.from(grouped.values()).sort((a, b) => {
      if (a.firstOrder !== b.firstOrder) return a.firstOrder - b.firstOrder
      return a.block.localeCompare(b.block)
    })
  }, [assignments])

  if (!classroomId || !exerciseType) {
    return <div className="p-6">Ruta inválida.</div>
  }

  if (loading) {
    return <div className="p-6">Cargando temas...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 px-6 py-10 sm:py-16">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-blue-200 bg-white/90 px-4 py-3">
          <Link
            href="/student/play"
            className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
          <p className="text-sm font-semibold text-blue-700">{exerciseType}</p>
        </div>

        {themes.length === 0 ? (
          <div className="rounded-3xl border-2 border-blue-200 bg-white/80 py-20 text-center shadow-lg backdrop-blur-sm">
            <p className="mb-2 text-2xl font-bold text-slate-900">No hay temas disponibles.</p>
            <p className="text-slate-600">Prueba con otra categoría del menú general.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {themes.map((theme, index) => {
              const Icon = icons[index % icons.length]

              return (
                <motion.div
                  key={theme.block}
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
                    href={`/student/play/${classroomId}/${encodeURIComponent(exerciseType)}/${encodeURIComponent(theme.block)}`}
                    className="block relative group"
                  >
                    <div className="relative overflow-hidden rounded-2xl border-2 border-blue-200 bg-white p-6 shadow-xl transition-all hover:border-blue-400">
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-200/40 to-transparent opacity-0 group-hover:opacity-100"
                        initial={{ x: '-100%' }}
                        whileHover={{ x: '100%' }}
                        transition={{ duration: 0.6 }}
                      />

                      <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                      <div className="relative z-10 space-y-4">
                        <motion.div
                          className="mx-auto flex h-20 w-20 items-center justify-center rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-100 to-green-100"
                          whileHover={{ rotate: 360, scale: 1.1 }}
                          transition={{ duration: 0.5 }}
                        >
                          <Icon className="h-10 w-10 text-blue-600" />
                        </motion.div>

                        <h3 className="text-center text-lg font-bold text-slate-900 transition-colors group-hover:text-blue-600">
                          {theme.block}
                        </h3>

                        <p className="text-center text-sm text-slate-600">
                          {theme.exerciseCount} ejercicio{theme.exerciseCount === 1 ? '' : 's'}
                        </p>

                        <motion.div
                          className="rounded-xl border border-blue-300 bg-blue-100 px-6 py-3 text-center font-bold text-blue-700 transition-all hover:bg-blue-600 hover:text-white"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Ver tema
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

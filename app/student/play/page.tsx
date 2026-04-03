'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  BookOpen,
  Brain,
  ClipboardList,
  Clock3,
  Rocket,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { fetchStudentSession } from '@/lib/student-session-client'
import type { StudentSessionData } from '@/lib/student-session-client'
import { useInstitution } from '@/components/institution-provider'
import { isExamAvailableNow } from '@/lib/exam-availability'

type AssignmentRow = {
  id: string
  exercise_id: string
  edu_exercises: {
    id: string
    exercise_type: string
    block: string | null
  }
}

type ExamAssignmentRow = {
  id: string
  exam_id: string
  created_at: string
  order: number | string | null
  active: boolean
  available_from: string | null
  available_until: string | null
  edu_exams: {
    id: string
    title: string
    description: string | null
    exam_type: string
    block: string | null
    duration_minutes: number | null
    component_key: string
  }
}

type StudentExamAttemptRow = {
  exam_id: string
}

type ExerciseQueryRow = {
  id: string
  exercise_id: string
  edu_exercises:
    | {
        id: string
        exercise_type: string
        block: string | null
      }
    | {
        id: string
        exercise_type: string
        block: string | null
      }[]
    | null
}

type ExamQueryRow = {
  id: string
  exam_id: string
  created_at: string
  order: number | string | null
  active: boolean
  available_from: string | null
  available_until: string | null
  edu_exams:
    | {
        id: string
        title: string
        description: string | null
        exam_type: string
        block: string | null
        duration_minutes: number | null
        component_key: string
      }
    | {
        id: string
        title: string
        description: string | null
        exam_type: string
        block: string | null
        duration_minutes: number | null
        component_key: string
      }[]
    | null
}

const icons = [Rocket, Star, Sparkles, Trophy, Zap, Target, BookOpen, Brain]
const floatingPositions = [
  { left: '12%', top: '10%', driftX: -18, repeatDelay: 1.2 },
  { left: '78%', top: '14%', driftX: 24, repeatDelay: 2.1 },
  { left: '24%', top: '34%', driftX: -12, repeatDelay: 1.6 },
  { left: '82%', top: '42%', driftX: 16, repeatDelay: 2.8 },
  { left: '16%', top: '62%', driftX: -22, repeatDelay: 1.9 },
  { left: '68%', top: '68%', driftX: 20, repeatDelay: 2.4 },
]
const loadingStarPositions = [
  { left: '8%', top: '12%' },
  { left: '22%', top: '72%' },
  { left: '34%', top: '24%' },
  { left: '48%', top: '82%' },
  { left: '62%', top: '18%' },
  { left: '74%', top: '58%' },
  { left: '86%', top: '28%' },
  { left: '92%', top: '76%' },
]

const FloatingIcon = ({
  Icon,
  delay,
  left,
  top,
  driftX,
  repeatDelay,
}: {
  Icon: any
  delay: number
  left: string
  top: string
  driftX: number
  repeatDelay: number
}) => (
  <motion.div
    className="absolute"
    initial={{ y: 0, x: 0, opacity: 0 }}
    animate={{
      y: [-20, -120],
      x: [0, driftX],
      opacity: [0, 0.4, 0],
    }}
    transition={{
      duration: 4,
      delay,
      repeat: Infinity,
      repeatDelay,
      ease: 'easeOut',
    }}
    style={{
      left,
      top,
    }}
  >
    <Icon className="h-8 w-8 text-blue-400" />
  </motion.div>
)

export default function StudentDashboardPage() {
  const supabase = useMemo(() => createClient(), [])
  const institution = useInstitution()

  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [examAssignments, setExamAssignments] = useState<ExamAssignmentRow[]>([])
  const [classroomId, setClassroomId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      if (!institution?.id) return

      setLoading(true)

      const studentSession: StudentSessionData | null =
        await fetchStudentSession()

      if (!studentSession?.student_id || !studentSession?.classroom_id) {
        if (!active) return
        setAssignments([])
        setExamAssignments([])
        setClassroomId(null)
        setLoading(false)
        return
      }

      setClassroomId(studentSession.classroom_id)

      const [exerciseResult, examResult, examAttemptsResult] = await Promise.all([
        supabase
          .from('edu_exercise_assignments')
          .select(`
            id,
            exercise_id,
            edu_exercises!inner (
              id,
              exercise_type,
              block
            )
          `)
          .eq('classroom_id', studentSession.classroom_id)
          .eq('active', true),
        supabase
          .from('edu_exam_assignments')
          .select(`
            id,
            exam_id,
            created_at,
            order,
            active,
            available_from,
            available_until,
            edu_exams!inner (
              id,
              title,
              description,
              exam_type,
              block,
              duration_minutes,
              component_key
            )
          `)
          .eq('classroom_id', studentSession.classroom_id)
          .eq('active', true),
        supabase
          .from('edu_student_exams')
          .select('exam_id')
          .eq('student_id', studentSession.student_id)
          .eq('classroom_id', studentSession.classroom_id),
      ])

      if (!active) return

      if (exerciseResult.error || examResult.error || examAttemptsResult.error) {
        console.error(
          'Supabase error:',
          exerciseResult.error ?? examResult.error ?? examAttemptsResult.error,
        )
        setAssignments([])
        setExamAssignments([])
        setLoading(false)
        return
      }

      const normalizedAssignments = ((exerciseResult.data ?? []) as ExerciseQueryRow[])
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
        .filter((assignment): assignment is AssignmentRow => Boolean(assignment))

      const normalizedExamAssignments = ((examResult.data ?? []) as ExamQueryRow[])
        .map((assignment) => {
          const exam = Array.isArray(assignment.edu_exams)
            ? assignment.edu_exams[0]
            : assignment.edu_exams
          if (!exam) return null

          return {
            id: assignment.id,
            exam_id: assignment.exam_id,
            created_at: assignment.created_at,
            order: assignment.order,
            active: assignment.active,
            available_from: assignment.available_from,
            available_until: assignment.available_until,
            edu_exams: exam,
          } satisfies ExamAssignmentRow
        })
        .filter((assignment): assignment is ExamAssignmentRow => Boolean(assignment))

      const attemptedExamIds = new Set(
        ((examAttemptsResult.data ?? []) as StudentExamAttemptRow[]).map(
          (attempt) => attempt.exam_id,
        ),
      )

      setAssignments(normalizedAssignments)
      setExamAssignments(
        normalizedExamAssignments.filter(
          (assignment) =>
            !attemptedExamIds.has(assignment.exam_id) && isExamAvailableNow(assignment),
        ),
      )
      setLoading(false)
    }

    load()

    return () => {
      active = false
    }
  }, [supabase, institution?.id])

  const sortedAssignments = useMemo(() => {
    return [...assignments].sort((a, b) => {
      const labelA = a.edu_exercises?.block || a.edu_exercises?.id || a.exercise_id
      const labelB = b.edu_exercises?.block || b.edu_exercises?.id || b.exercise_id
      return labelA.localeCompare(labelB)
    })
  }, [assignments])

  const exerciseTypes = useMemo(() => {
    const uniqueTypes = new Set(
      assignments
        .map((a) => a.edu_exercises?.exercise_type)
        .filter((t): t is string => Boolean(t)),
    )
    return Array.from(uniqueTypes).sort((a, b) => a.localeCompare(b))
  }, [assignments])

  const sortedExamAssignments = useMemo(() => {
    return [...examAssignments].sort((a, b) => {
      const orderA = Number(a.order ?? 0)
      const orderB = Number(b.order ?? 0)
      if (orderA !== orderB) return orderA - orderB

      return (a.edu_exams?.title ?? a.exam_id).localeCompare(
        b.edu_exams?.title ?? b.exam_id,
      )
    })
  }, [examAssignments])

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-green-50 to-blue-50">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, 180, 360],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 3,
              delay: i * 0.3,
              repeat: Infinity,
            }}
            style={{
              left: loadingStarPositions[i]?.left,
              top: loadingStarPositions[i]?.top,
            }}
          >
            <Star className="h-6 w-6 text-blue-400" />
          </motion.div>
        ))}

        <motion.div
          className="relative z-10 space-y-6 text-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            animate={{
              y: [0, -30, 0],
              rotate: [0, 15, -15, 0],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Rocket className="mx-auto h-24 w-24 text-blue-600" />
          </motion.div>
          <motion.div
            className="space-y-2"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          >
            <p className="text-3xl font-black text-slate-900">
              Preparando tu mision
            </p>
            <p className="text-sm text-slate-600">
              Cargando ejercicios y examenes...
            </p>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-green-50 to-blue-50">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <FloatingIcon Icon={Rocket} delay={0} {...floatingPositions[0]} />
        <FloatingIcon Icon={Star} delay={1.2} {...floatingPositions[1]} />
        <FloatingIcon Icon={Sparkles} delay={2.4} {...floatingPositions[2]} />
        <FloatingIcon Icon={Trophy} delay={3.6} {...floatingPositions[3]} />
        <FloatingIcon Icon={Zap} delay={4.8} {...floatingPositions[4]} />
        <FloatingIcon Icon={Target} delay={6} {...floatingPositions[5]} />
      </div>

      <div className="relative z-10 px-6 py-10 sm:py-16">
        <div className="mx-auto max-w-7xl space-y-12">
          <motion.header
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, type: 'spring' }}
            className="space-y-6 text-center"
          >
            <motion.div
              animate={{ rotate: [0, 1, -1, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-block"
            >
              <h1 className="bg-gradient-to-r from-blue-600 via-green-600 to-blue-600 bg-clip-text text-5xl font-black text-transparent sm:text-6xl lg:text-7xl">
                Tu Zona de Matematica
              </h1>
            </motion.div>
          </motion.header>

          {sortedExamAssignments.length > 0 ? (
            <motion.section
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-center gap-3 text-center">
                <ClipboardList className="h-7 w-7 text-amber-600" />
                <div>
                  <h2 className="text-3xl font-black text-slate-900">Examenes</h2>
                  <p className="text-sm text-slate-600">
                    Los pendientes aparecen primero para que entres directo.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {sortedExamAssignments.map((assignment, index) => (
                  <motion.div
                    key={assignment.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 * index }}
                  >
                    <Link
                      href={`/student/exams/${assignment.exam_id}`}
                      className="block rounded-3xl border-2 border-amber-200 bg-white p-6 shadow-xl transition-all hover:-translate-y-1 hover:border-amber-400"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                              Examen pendiente
                            </span>
                            <h3 className="text-2xl font-black text-slate-900">
                              {assignment.edu_exams.title}
                            </h3>
                          </div>
                          <div className="rounded-2xl bg-amber-100 p-3">
                            <ClipboardList className="h-7 w-7 text-amber-700" />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
                          <span className="rounded-full bg-slate-100 px-3 py-1">
                            {assignment.edu_exams.exam_type}
                          </span>
                          {assignment.edu_exams.block ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1">
                              {assignment.edu_exams.block}
                            </span>
                          ) : null}
                          {assignment.edu_exams.duration_minutes ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                              <Clock3 className="h-3.5 w-3.5" />
                              {assignment.edu_exams.duration_minutes} min
                            </span>
                          ) : null}
                        </div>

                        {assignment.edu_exams.description ? (
                          <p className="line-clamp-2 text-sm text-slate-600">
                            {assignment.edu_exams.description}
                          </p>
                        ) : (
                          <p className="text-sm text-slate-600">
                            Ingresa para resolver este examen dentro de la plataforma.
                          </p>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          ) : null}

          <motion.section
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-center gap-3 text-center">
              <Rocket className="h-7 w-7 text-blue-600" />
              <div>
                <h2 className="text-3xl font-black text-slate-900">
                  Ejercicios
                </h2>
                <p className="text-sm text-slate-600">
                  Practica por temas con los juegos asignados a tu salon.
                </p>
              </div>
            </div>

            {sortedAssignments.length === 0 ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.4 }}
                className="rounded-3xl border-2 border-blue-200 bg-white/80 py-20 text-center shadow-lg backdrop-blur-sm"
              >
                <motion.div
                  animate={{
                    rotate: 360,
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
                    scale: { duration: 2, repeat: Infinity },
                  }}
                >
                  <Star className="mx-auto mb-6 h-24 w-24 text-blue-400" />
                </motion.div>
                <p className="mb-2 text-2xl font-bold text-slate-900">
                  Aun no hay ejercicios disponibles
                </p>
                <p className="text-slate-600">
                  Tu docente pronto agregara ejercicios.
                </p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {exerciseTypes.map((topic, index) => {
                  const topicAssignments = sortedAssignments.filter(
                    (assignment) => assignment.edu_exercises?.exercise_type === topic,
                  )
                  const topicCount = topicAssignments.length
                  const topicThemeCount = new Set(
                    topicAssignments
                      .map((assignment) => assignment.edu_exercises?.block)
                      .filter((value): value is string => Boolean(value)),
                  ).size
                  const Icon = icons[index % icons.length]
                  const topicHref = classroomId
                    ? `/student/play/${classroomId}/${encodeURIComponent(topic)}`
                    : '/student/play'

                  return (
                    <motion.div
                      key={topic}
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
                        href={topicHref}
                        className="block overflow-hidden rounded-2xl border-2 border-blue-200 bg-white p-6 text-left shadow-xl transition-all hover:border-blue-400"
                      >
                        <div className="space-y-4">
                          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-100 to-green-100">
                            <Icon className="h-10 w-10 text-blue-600" />
                          </div>
                          <h3 className="line-clamp-2 min-h-[3.5rem] text-center text-lg font-bold text-slate-900">
                            {topic}
                          </h3>
                          <p className="text-center text-sm text-slate-600">
                            {topicThemeCount} tema{topicThemeCount === 1 ? '' : 's'} · {topicCount} ejercicio{topicCount === 1 ? '' : 's'}
                          </p>
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.section>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="space-y-4 py-12 text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex items-center gap-3 rounded-full border-2 border-blue-300 bg-white/80 px-8 py-4 shadow-lg"
            >
              <Trophy className="h-6 w-6 text-blue-600" />
              <p className="text-xl font-black text-slate-900">
                Sigue asi, vas muy bien
              </p>
              <Sparkles className="h-6 w-6 text-green-500" />
            </motion.div>
            <p className="text-sm tracking-wide text-slate-600">
              Cada ejercicio y cada examen cuentan.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

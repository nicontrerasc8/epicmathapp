'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
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
import type { StudentSessionData } from '@/lib/student-session-client'
import { useInstitution } from '@/components/institution-provider'

type AssignmentRow = {
  id: string
  exercise_id: string
  edu_exercises: {
    id: string
    exercise_type: string
    block: string | null
  }
}

const icons = [Rocket, Star, Sparkles, Trophy, Zap, Target, BookOpen, Brain]

const FloatingIcon = ({ Icon, delay }: { Icon: any; delay: number }) => (
  <motion.div
    className="absolute"
    initial={{ y: 0, x: 0, opacity: 0 }}
    animate={{
      y: [-20, -120],
      x: [0, Math.random() * 60 - 30],
      opacity: [0, 0.4, 0],
    }}
    transition={{
      duration: 4,
      delay,
      repeat: Infinity,
      repeatDelay: Math.random() * 6,
      ease: 'easeOut',
    }}
    style={{
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
    }}
  >
    <Icon className="h-8 w-8 text-blue-400" />
  </motion.div>
)

export default function StudentDashboardPage() {
  const supabase = createClient()
  const institution = useInstitution()

  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [classroomId, setClassroomId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!institution?.id) return

      setLoading(true)

      const studentSession: StudentSessionData | null =
        await fetchStudentSession(institution.id)

      if (!studentSession?.student_id || !studentSession?.classroom_id) {
        setAssignments([])
        setClassroomId(null)
        setLoading(false)
        return
      }

      setClassroomId(studentSession.classroom_id)

      const { data, error } = await supabase
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
        .eq('active', true)

      if (error) {
        console.error('Supabase error:', error)
        setAssignments([])
        setLoading(false)
        return
      }

      setAssignments((data ?? []) as any[])
      setLoading(false)
    }

    load()
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
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
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
              Preparando tu misión
            </p>
            <p className="text-sm text-slate-600">Cargando ejercicios...</p>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-green-50 to-blue-50">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <FloatingIcon Icon={Rocket} delay={0} />
        <FloatingIcon Icon={Star} delay={1.2} />
        <FloatingIcon Icon={Sparkles} delay={2.4} />
        <FloatingIcon Icon={Trophy} delay={3.6} />
        <FloatingIcon Icon={Zap} delay={4.8} />
        <FloatingIcon Icon={Target} delay={6} />
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
                Tus Juegos de Matemática
              </h1>
            </motion.div>
          </motion.header>

          <motion.section
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
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
                  Aún no hay misiones disponibles
                </p>
                <p className="text-slate-600">
                  Tu docente pronto agregará ejercicios.
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
                Sigue así, vas muy bien
              </p>
              <Sparkles className="h-6 w-6 text-green-500" />
            </motion.div>
            <p className="text-sm tracking-wide text-slate-600">
              Cada ejercicio te acerca más a tu meta.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

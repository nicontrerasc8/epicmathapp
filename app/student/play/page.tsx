'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { fetchStudentSession } from '@/lib/student-session-client'
import type { StudentSessionData } from '@/lib/student-session-client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useInstitution } from '@/components/institution-provider'
import { Rocket, Star, Sparkles, Trophy, Zap, Target, BookOpen, Brain } from 'lucide-react'

type AssignmentRow = {
  id: string
  exercise_id: string
  edu_exercises: {
    id: string
    exercise_type: string
    description: string | null
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
    <Icon className="w-8 h-8 text-blue-400" />
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
            description
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
      const labelA = a.edu_exercises?.description || a.edu_exercises?.id || a.exercise_id
      const labelB = b.edu_exercises?.description || b.edu_exercises?.id || b.exercise_id
      return labelA.localeCompare(labelB)
    })
  }, [assignments])

  const exerciseTypes = useMemo(() => {
    const uniqueTypes = new Set(
      assignments
        .map((a) => a.edu_exercises?.exercise_type)
        .filter((t): t is string => Boolean(t))
    )
    return Array.from(uniqueTypes).sort((a, b) => a.localeCompare(b))
  }, [assignments])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 overflow-hidden relative">
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
            <Star className="w-6 h-6 text-blue-400" />
          </motion.div>
        ))}

        <motion.div
          className="text-center space-y-6 relative z-10"
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
            <Rocket className="w-24 h-24 mx-auto text-blue-600" />
          </motion.div>
          <motion.div
            className="space-y-2"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          >
            <p className="text-3xl font-black text-slate-900">
              ¡Preparando tu misión! 
            </p>
            <p className="text-slate-600 text-sm">
              Cargando ejercicios...
            </p>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <FloatingIcon Icon={Rocket} delay={0} />
        <FloatingIcon Icon={Star} delay={1.2} />
        <FloatingIcon Icon={Sparkles} delay={2.4} />
        <FloatingIcon Icon={Trophy} delay={3.6} />
        <FloatingIcon Icon={Zap} delay={4.8} />
        <FloatingIcon Icon={Target} delay={6} />
      </div>

      <div className="relative z-10 px-6 py-10 sm:py-16">
        <div className="max-w-7xl mx-auto space-y-12">
          <motion.header
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, type: 'spring' }}
            className="text-center space-y-6"
          >
            <motion.div
              animate={{
                rotate: [0, 1, -1, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="inline-block"
            >
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black bg-gradient-to-r from-blue-600 via-green-600 to-blue-600 bg-clip-text text-transparent">
                ¡Tus Juegos de Matemática!
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
                className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-3xl border-2 border-blue-200 shadow-lg"
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
                  <Star className="w-24 h-24 mx-auto text-blue-400 mb-6" />
                </motion.div>
                <p className="text-2xl font-bold text-slate-900 mb-2">
                  �Aún no hay misiones disponibles! ??
                </p>
                <p className="text-slate-600">
                  Tu docente pronto agregará ejercicios incre�bles
                </p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {exerciseTypes.map((topic, index) => {
                  const topicCount = sortedAssignments.filter(
                    (assignment) => assignment.edu_exercises?.exercise_type === topic
                  ).length
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
                        className="block relative bg-white rounded-2xl p-6 border-2 border-blue-200 hover:border-blue-400 transition-all overflow-hidden shadow-xl text-left"
                      >
                        <div className="relative z-10 space-y-4">
                          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-100 to-green-100 rounded-xl flex items-center justify-center border-2 border-blue-300">
                            <Icon className="w-10 h-10 text-blue-600" />
                          </div>
                          <h3 className="font-bold text-lg text-center text-slate-900 line-clamp-2 min-h-[3.5rem]">
                            {topic}
                          </h3>
                          <p className="text-center text-sm text-slate-600">
                            {topicCount} ejercicio{topicCount === 1 ? '' : 's'}
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
            className="text-center py-12 space-y-4"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex items-center gap-3 bg-white/80 border-2 border-blue-300 rounded-full px-8 py-4 shadow-lg"
            >
              <Trophy className="w-6 h-6 text-blue-600" />
              <p className="text-xl font-black text-slate-900">
                Sigue asi, vas muy bien!
              </p>
              <Sparkles className="w-6 h-6 text-green-500" />
            </motion.div>
            <p className="text-sm text-slate-600 tracking-wide">
              Cada ejercicio te acerca más a tu meta ?
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

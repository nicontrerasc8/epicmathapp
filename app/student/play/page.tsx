'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { fetchStudentSession } from '@/lib/student-session-client'
import type { StudentSessionData } from '@/lib/student-session-client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useInstitution } from '@/components/institution-provider'
import { Rocket, Star, Sparkles, Trophy, Zap, Target, BookOpen, Brain, ArrowLeft } from 'lucide-react'

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
    {/* CAMBIO 1: text-slate-950 -> text-blue-400 */}
    <Icon className="w-8 h-8 text-blue-400" />
  </motion.div>
)

export default function StudentDashboardPage() {
  const supabase = createClient()
  const institution = useInstitution()

  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!institution?.id) {
        console.log('⏳ Waiting for institution...')
        return
      }

      setLoading(true)

      const studentSession: StudentSessionData | null =
        await fetchStudentSession(institution.id)

      if (!studentSession?.student_id || !studentSession?.classroom_id) {
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
        .eq('classroom_id', studentSession.classroom_id)
        .eq('active', true)

      if (error) {
        console.error('🔥 Supabase error:', error)
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

  const topicAssignments = useMemo(() => {
    if (!selectedTopic) return []
    return sortedAssignments.filter(
      (assignment) => assignment.edu_exercises?.exercise_type === selectedTopic
    )
  }, [sortedAssignments, selectedTopic])

  if (loading) {
    return (
      // CAMBIO 2: bg-slate-950 -> bg-gradient-to-br from-blue-50 via-green-50 to-blue-50
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 overflow-hidden relative">
        {/* Iconos flotantes de fondo */}
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
            {/* CAMBIO 3: text-primary -> text-blue-400 */}
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
            {/* CAMBIO 4: text-primary -> text-blue-600 */}
            <Rocket className="w-24 h-24 mx-auto text-blue-600" />
          </motion.div>
          <motion.div
            className="space-y-2"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          >
            {/* CAMBIO 5: text-white -> text-slate-900 */}
            <p className="text-3xl font-black text-slate-900">
              ¡Preparando tu misión! 🚀
            </p>
            {/* CAMBIO 6: text-slate-400 -> text-slate-600 */}
            <p className="text-slate-600 text-sm">
              Cargando ejercicios...
            </p>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    // CAMBIO 7: bg-slate-950 -> bg-gradient-to-br from-blue-50 via-green-50 to-blue-50
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 relative overflow-hidden">
      {/* Iconos flotantes de fondo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <FloatingIcon Icon={Rocket} delay={0} />
        <FloatingIcon Icon={Star} delay={1.2} />
        <FloatingIcon Icon={Sparkles} delay={2.4} />
        <FloatingIcon Icon={Trophy} delay={3.6} />
        <FloatingIcon Icon={Zap} delay={4.8} />
        <FloatingIcon Icon={Target} delay={6} />
      </div>

      {/* CAMBIO 8: ELIMINADO - el gradiente radial oscuro ya no se necesita */}
      {/* <div className="fixed inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent pointer-events-none" /> */}

      <div className="relative z-10 px-6 py-10 sm:py-16">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Header con animación */}
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
              {/* CAMBIO 9: text-white -> bg-gradient-to-r from-blue-600 via-green-600 to-blue-600 bg-clip-text text-transparent */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black bg-gradient-to-r from-blue-600 via-green-600 to-blue-600 bg-clip-text text-transparent">
                ¡Tus Juegos de Matemática! 
              </h1>
            </motion.div>




          </motion.header>

          {/* Grid de ejercicios */}
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
                // CAMBIO 14: bg-slate-900/60 border-white/10 -> bg-white/80 border-blue-200
                className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-3xl border-2 border-blue-200 shadow-lg"
              >
                <motion.div
                  animate={{ 
                    rotate: 360,
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
                    scale: { duration: 2, repeat: Infinity }
                  }}
                >
                  {/* CAMBIO 15: text-primary/60 -> text-blue-400 */}
                  <Star className="w-24 h-24 mx-auto text-blue-400 mb-6" />
                </motion.div>
                {/* CAMBIO 16: text-white -> text-slate-900 */}
                <p className="text-2xl font-bold text-slate-900 mb-2">
                  ¡Aún no hay misiones disponibles! 🎯
                </p>
                {/* CAMBIO 17: text-slate-400 -> text-slate-600 */}
                <p className="text-slate-600">
                  Tu docente pronto agregará ejercicios increíbles
                </p>
              </motion.div>
            ) : !selectedTopic ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {exerciseTypes.map((topic, index) => {
                  const topicCount = sortedAssignments.filter(
                    (assignment) => assignment.edu_exercises?.exercise_type === topic
                  ).length
                  const Icon = icons[index % icons.length]

                  return (
                    <motion.button
                      key={topic}
                      type="button"
                      onClick={() => setSelectedTopic(topic)}
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
                      className="relative bg-white rounded-2xl p-6 border-2 border-blue-200 hover:border-blue-400 transition-all overflow-hidden shadow-xl text-left"
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
                    </motion.button>
                  )
                })}
              </div>
            ) : (
              <>
                <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border-2 border-blue-200 bg-white/90 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTopic(null)}
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a temas
                  </button>
                  <p className="text-sm font-semibold text-slate-700">
                    Tema: <span className="text-blue-700">{selectedTopic}</span>
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {topicAssignments.map((assignment, index) => {
                  const exercise = assignment.edu_exercises
                  const label =
                    exercise.description ||
                    exercise.id ||
                    `Ejercicio ${index + 1}`
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
              

                        {/* Card principal */}
                        {/* CAMBIO 19: bg-slate-900 border-white/10 hover:border-primary/50 -> bg-white border-blue-200 hover:border-blue-400 */}
                        <div className="relative bg-white rounded-2xl p-6 border-2 border-blue-200 hover:border-blue-400 transition-all overflow-hidden shadow-xl">
                          {/* Efecto de brillo en hover */}
                          {/* CAMBIO 20: via-primary/10 -> via-blue-200/40 */}
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-200/40 to-transparent opacity-0 group-hover:opacity-100"
                            initial={{ x: '-100%' }}
                            whileHover={{ x: '100%' }}
                            transition={{ duration: 0.6 }}
                          />

                          {/* Glow effect */}
                          {/* CAMBIO 21: from-primary/5 -> from-blue-100/50 */}
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                          {/* Contenido */}
                          <div className="relative z-10 space-y-4">
                            {/* Icono */}
                            <motion.div
                              // CAMBIO 22: from-primary/20 to-primary/10 border-primary/20 -> from-blue-100 to-green-100 border-blue-300
                              className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-100 to-green-100 rounded-xl flex items-center justify-center border-2 border-blue-300"
                              whileHover={{ rotate: 360, scale: 1.1 }}
                              transition={{ duration: 0.5 }}
                            >
                              {/* CAMBIO 23: text-primary -> text-blue-600 */}
                              <Icon className="w-10 h-10 text-blue-600" />
                            </motion.div>

                            {/* Título */}
                            {/* CAMBIO 24: text-white group-hover:text-primary -> text-slate-900 group-hover:text-blue-600 */}
                            <h3 className="font-bold text-lg text-center text-slate-900 line-clamp-2 min-h-[3.5rem] group-hover:text-blue-600 transition-colors">
                              {label}
                            </h3>

                            {/* Botón */}
                            {/* CAMBIO 27: bg-primary/10 hover:bg-primary text-slate-300 hover:text-white border-primary/30 -> bg-blue-100 hover:bg-blue-600 text-blue-700 hover:text-white border-blue-300 */}
                            <motion.div
                              className="bg-blue-100 hover:bg-blue-600 text-blue-700 hover:text-white font-bold py-3 px-6 rounded-xl text-center border border-blue-300 transition-all"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              Comenzar 🚀
                            </motion.div>
                          </div>

                          {/* Decoración: estrellas en las esquinas */}
                          <motion.div
                            className="absolute top-3 left-3"
                            animate={{ 
                              rotate: 360,
                              scale: [1, 1.2, 1]
                            }}
                            transition={{ 
                              rotate: { duration: 8, repeat: Infinity, ease: 'linear' },
                              scale: { duration: 2, repeat: Infinity }
                            }}
                          >
                            {/* CAMBIO 28: text-primary/40 -> text-blue-300 */}
                            <Star className="w-3 h-3 text-blue-300" />
                          </motion.div>
                          <motion.div
                            className="absolute bottom-3 right-3"
                            animate={{ 
                              rotate: -360,
                              scale: [1, 1.3, 1]
                            }}
                            transition={{ 
                              rotate: { duration: 8, repeat: Infinity, ease: 'linear' },
                              scale: { duration: 2.5, repeat: Infinity, delay: 0.5 }
                            }}
                          >
                            {/* CAMBIO 29: text-primary/40 -> text-green-300 */}
                            <Sparkles className="w-3 h-3 text-green-300" />
                          </motion.div>
                        </div>
                      </Link>
                    </motion.div>
                  )
                  })}
                </div>
              </>
            )}
          </motion.section>

          {/* Footer motivacional */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="text-center py-12 space-y-4"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              // CAMBIO 30: bg-slate-900/60 border-primary/20 -> bg-white/80 border-blue-300
              className="inline-flex items-center gap-3 bg-white/80 border-2 border-blue-300 rounded-full px-8 py-4 shadow-lg"
            >
              {/* CAMBIO 31: text-primary -> text-blue-600 */}
              <Trophy className="w-6 h-6 text-blue-600" />
              {/* CAMBIO 32: text-white -> text-slate-900 */}
              <p className="text-xl font-black text-slate-900">
                Sigue asi, vas muy bien!
              </p>
              {/* CAMBIO 33: text-primary -> text-green-500 */}
              <Sparkles className="w-6 h-6 text-green-500" />
            </motion.div>
            {/* CAMBIO 34: text-slate-400 -> text-slate-600 */}
            <p className="text-sm text-slate-600 tracking-wide">
              Cada ejercicio te acerca más a tu meta ✨
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

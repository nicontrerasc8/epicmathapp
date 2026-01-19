'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { fetchStudentSession } from '@/lib/student-session-client'
import Link from 'next/link'
import { motion } from 'framer-motion'

type Exercise = {
  id: string
  order: number
}

type Tema = {
  id: string
  name: string
  areaName: string
  subblockName: string
  exercises: Exercise[]
}

type Subblock = {
  id: string
  name: string
  temas: Tema[]
}

type Block = {
  id: string
  name: string
  type: string
  subblocks: Subblock[]
}

export default function StudentDashboardPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [activeBlockLabel, setActiveBlockLabel] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const studentSession = await fetchStudentSession()
      if (!studentSession?.id) {
        setLoading(false)
        return
      }

      const { data: member } = await supabase
        .from('edu_institution_members')
        .select('classroom_id')
        .eq('profile_id', studentSession.id)
        .eq('role', 'student')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!member?.classroom_id) {
        setLoading(false)
        return
      }

      const classroomId = member.classroom_id

      const { data: activeBlocks } = await supabase
        .from('edu_classroom_blocks')
        .select(`
          block:edu_academic_blocks ( id, name, block_type )
        `)
        .eq('classroom_id', classroomId)
        .eq('active', true)
        .order('started_at', { ascending: false })
        .limit(1)

      const activeBlock = activeBlocks?.[0]?.block
      if (!activeBlock?.id) {
        setLoading(false)
        setBlocks([])
        return
      }

      setActiveBlockLabel(`${activeBlock.name} (${activeBlock.block_type})`)

      const { data: assignments, error } = await supabase
        .from('edu_classroom_tema_exercises')
        .select(`
          id,
          exercise_id,
          ordering,
          tema:edu_temas (
            id,
            name,
            ordering,
            area:edu_areas ( name ),
            subblock:edu_academic_subblocks (
              id,
              name,
              ordering,
              block:edu_academic_blocks ( id, name, block_type )
            )
          )
        `)
        .eq('classroom_id', classroomId)
        .eq('active', true)

      if (error || !assignments) {
        console.error(error)
        setLoading(false)
        return
      }

      const blockMap = new Map<string, Block>()

      assignments.forEach((row: any) => {
        const block = row.tema?.subblock?.block
        if (!block || block.id !== activeBlock.id) return

        if (!blockMap.has(block.id)) {
          blockMap.set(block.id, {
            id: block.id,
            name: block.name,
            type: block.block_type,
            subblocks: [],
          })
        }

        const blockEntry = blockMap.get(block.id)!
        const subblock = row.tema?.subblock
        if (!subblock) return

        let sub = blockEntry.subblocks.find(s => s.id === subblock.id)
        if (!sub) {
          sub = {
            id: subblock.id,
            name: subblock.name,
            temas: [],
          }
          blockEntry.subblocks.push(sub)
        }

        const tema = row.tema
        if (!tema) return

        let temaEntry = sub.temas.find(t => t.id === tema.id)
        if (!temaEntry) {
          temaEntry = {
            id: tema.id,
            name: tema.name,
            areaName: tema.area?.name || 'Area',
            subblockName: subblock.name || 'Sub-bloque',
            exercises: [],
          }
          sub.temas.push(temaEntry)
        }

        if (!temaEntry.exercises.find(e => e.id === row.exercise_id)) {
          temaEntry.exercises.push({
            id: row.exercise_id,
            order: row.ordering ?? 0,
          })
        }
      })

      blockMap.forEach(block => {
        block.subblocks.forEach(sub => {
          sub.temas.forEach(tema => {
            tema.exercises.sort((a, b) => a.order - b.order)
          })
        })
      })

      setBlocks(Array.from(blockMap.values()))
      setLoading(false)
    }

    load()
  }, [supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground text-lg animate-pulse">
          Cargando practica academica...
        </span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6 sm:p-10">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Practica academica
          </h1>
          <p className="text-muted-foreground">
            {activeBlockLabel
              ? `Bloque activo: ${activeBlockLabel}`
              : 'No hay bloque activo asignado.'}
          </p>
        </header>

        {blocks.map((block, bi) => (
          <motion.section
            key={block.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: bi * 0.08 }}
            className="rounded-2xl border bg-card p-6 space-y-8 shadow-sm"
          >
            <div>
              <h2 className="text-2xl font-semibold">{block.name}</h2>
              <span className="text-sm text-muted-foreground">
                {block.type}
              </span>
            </div>

            {block.subblocks.map(sub => (
              <div key={sub.id} className="space-y-6">
                <h3 className="text-lg font-medium text-primary">
                  {sub.name}
                </h3>

                {sub.temas.map(tema => (
                  <div
                    key={tema.id}
                    className="rounded-xl border bg-background p-4 space-y-4"
                  >
                    <div className="space-y-1">
                      <h4 className="font-semibold">{tema.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {tema.areaName} · {tema.subblockName}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {tema.exercises.map(ex => (
                        <motion.div
                          key={ex.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <Link
                            href={`/student/play/${ex.id}`}
                            className="block rounded-lg border bg-card p-4 text-center hover:shadow-md transition"
                          >
                            <span className="text-sm font-semibold">
                              Ejercicio {ex.order}
                            </span>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </motion.section>
        ))}

        {blocks.length === 0 && (
          <div className="text-center text-muted-foreground py-20">
            No hay ejercicios disponibles para el bloque activo.
          </div>
        )}
      </div>
    </div>
  )
}

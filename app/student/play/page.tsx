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
  block_type: string
  subblocks: Subblock[]
}

type AssignmentRow = {
  exercise_id: string
  ordering: number | null
  tema: {
    id: string
    name: string
    area: { name: string } | null
    subblock: {
      id: string
      name: string
      block: {
        id: string
        name: string
        block_type: string
      } | null
    } | null
  } | null
}

export default function StudentDashboardPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [blocks, setBlocks] = useState<any>([])
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

      const activeBlock:any = activeBlocks?.[0]?.block
      if (!activeBlock?.id) {
        setBlocks([])
        setLoading(false)
        return
      }

      setActiveBlockLabel(`${activeBlock.name} (${activeBlock.block_type})`)

      const { data: assignments, error } = await supabase
        .from('edu_classroom_tema_exercises')
        .select(`
          exercise_id,
          ordering,
          tema:edu_temas (
            id,
            name,
            area:edu_areas ( name ),
            subblock:edu_academic_subblocks (
              id,
              name,
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
            block_type: block.block_type,
            subblocks: [],
          })
        }

        const blockEntry = blockMap.get(block.id)!
        const subblock = row.tema?.subblock
        if (!subblock) return

        let sub = blockEntry.subblocks.find(s => s.id === subblock.id)
        if (!sub) {
          sub = { id: subblock.id, name: subblock.name, temas: [] }
          blockEntry.subblocks.push(sub)
        }

        const tema = row.tema
        if (!tema) return

        let temaEntry = sub.temas.find(t => t.id === tema.id)
        if (!temaEntry) {
          temaEntry = {
            id: tema.id,
            name: tema.name,
            areaName: tema.area?.name ?? 'Área',
            subblockName: subblock.name,
            exercises: [],
          }
          sub.temas.push(temaEntry)
        }

        if (!temaEntry.exercises.some(e => e.id === row.exercise_id)) {
          temaEntry.exercises.push({
            id: row.exercise_id,
            order: row.ordering ?? 0,
          })
        }
      })

      blockMap.forEach(block =>
        block.subblocks.forEach(sub =>
          sub.temas.forEach(tema =>
            tema.exercises.sort((a, b) => a.order - b.order),
          ),
        ),
      )

      setBlocks(Array.from(blockMap.values()))
      setLoading(false)
    }

    load()
  }, [supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground text-lg animate-pulse">
          Cargando práctica académica...
        </span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6 sm:p-10">
      <div className="max-w-7xl mx-auto space-y-12">
        <header>
          <h1 className="text-3xl font-bold">Práctica académica</h1>
          <p className="text-muted-foreground">
            {activeBlockLabel
              ? `Bloque activo: ${activeBlockLabel}`
              : 'No hay bloque activo asignado'}
          </p>
        </header>

        {blocks.map((block:any, bi:any) => (
          <motion.section
            key={block.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: bi * 0.08 }}
            className="rounded-2xl border bg-card p-6 space-y-8"
          >
            <h2 className="text-2xl font-semibold">{block.name}</h2>

            {block.subblocks.map((sub:any) => (
              <div key={sub.id}>
                <h3 className="text-lg font-medium text-primary">
                  {sub.name}
                </h3>

                {sub.temas.map((tema:any) => (
                  <div key={tema.id} className="border rounded-xl p-4">
                    <h4 className="font-semibold">{tema.name}</h4>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      {tema.exercises.map((ex:any) => (
                        <Link
                          key={ex.id}
                          href={`/student/play/${ex.id}`}
                          className="rounded-lg border p-3 text-center hover:shadow-md"
                        >
                          Ejercicio {ex.order}
                        </Link>
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

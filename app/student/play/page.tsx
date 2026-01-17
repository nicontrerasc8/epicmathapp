'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { fetchStudentSession } from '@/lib/student-session-client'
import Link from 'next/link'
import { motion } from 'framer-motion'

/* ============================================================
   TYPES
============================================================ */
type Row = {
  profile_id: string

  block_id: string
  block_name: string
  block_type: string
  block_order: number

  subblock_id: string
  subblock_name: string
  subblock_order: number

  tema_id: string
  tema_order: number

  exercise_id: string
  exercise_order: number // ✅ EXISTE EN EL VIEW
}

type Exercise = {
  id: string
  order: number
}

type Tema = {
  id: string
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

/* ============================================================
   PAGE
============================================================ */
export default function StudentDashboardPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [blocks, setBlocks] = useState<Block[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const studentSession = await fetchStudentSession()
      if (!studentSession?.id) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('edu_v_student_practice_screen')
        .select('*')
        .eq('profile_id', studentSession.id)
        .order('block_order')
        .order('subblock_order')
        .order('tema_order')
        .order('exercise_order') // 🔥 IMPORTANTE

      if (error || !data) {
        console.error(error)
        setLoading(false)
        return
      }

      const temaIds = Array.from(new Set(data.map((r: Row) => r.tema_id)))
      const { data: temasData } = await supabase
        .from('edu_temas')
        .select(`
          id,
          area:edu_areas ( name ),
          subblock:edu_academic_subblocks ( name )
        `)
        .in('id', temaIds)

      const temaMeta = new Map<string, { areaName: string; subblockName: string }>()
      temasData?.forEach((t: any) => {
        temaMeta.set(t.id, {
          areaName: t.area?.name || 'Area',
          subblockName: t.subblock?.name || 'Sub-bloque',
        })
      })

      const blockMap = new Map<string, Block>()

      data.forEach((r: Row) => {
        /* =========================
           BLOCK
        ========================= */
        if (!blockMap.has(r.block_id)) {
          blockMap.set(r.block_id, {
            id: r.block_id,
            name: r.block_name,
            type: r.block_type,
            subblocks: [],
          })
        }

        const block = blockMap.get(r.block_id)!

        /* =========================
           SUBBLOCK
        ========================= */
        let sub = block.subblocks.find(s => s.id === r.subblock_id)
        if (!sub) {
          sub = {
            id: r.subblock_id,
            name: r.subblock_name,
            temas: [],
          }
          block.subblocks.push(sub)
        }

        /* =========================
           TEMA
        ========================= */
        let tema = sub.temas.find(t => t.id === r.tema_id)
        if (!tema) {
          const meta = temaMeta.get(r.tema_id)
          tema = {
            id: r.tema_id,
            areaName: meta?.areaName || 'Area',
            subblockName: meta?.subblockName || r.subblock_name,
            exercises: [],
          }
          sub.temas.push(tema)
        }

        /* =========================
           EXERCISE (AQUÍ ESTABA EL BUG)
        ========================= */
        if (!tema.exercises.find(e => e.id === r.exercise_id)) {
          tema.exercises.push({
            id: r.exercise_id,
            order: r.exercise_order, // ✅ SE GUARDA EL ORDER REAL
          })
        }
      })

      /* =========================
         ORDEN FINAL (DEFENSIVO)
      ========================= */
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

  /* =========================
     LOADING
  ========================= */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground text-lg animate-pulse">
          Cargando práctica académica…
        </span>
      </div>
    )
  }

  /* =========================
     UI
  ========================= */
  return (
    <div className="min-h-screen bg-background p-6 sm:p-10">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Práctica académica
          </h1>
          <p className="text-muted-foreground">
            Avanza por bloques y temas a tu ritmo.
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
                      <h4 className="font-semibold">{tema.areaName}</h4>
                      <p className="text-sm text-muted-foreground">{tema.subblockName}</p>
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
            No hay ejercicios disponibles.
          </div>
        )}
      </div>
    </div>
  )
}

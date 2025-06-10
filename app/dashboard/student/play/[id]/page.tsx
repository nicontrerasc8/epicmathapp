'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useStudent } from '@/lib/hooks/useStudent'
import { SumGame } from '@/components/sum/SumGame'

interface Tema {
  id: string
  tema: string
}

export default function TemaPlayPage() {
  const { id } = useParams()
  const { student, loading: loadingStudent } = useStudent(true)
  const [tema, setTema] = useState<Tema | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const fetchTema = async () => {
      if (!id || typeof id !== 'string') return

      const { data, error } = await supabase
        .from('tema_periodo')
        .select('id, tema')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error al cargar el tema:', error)
      } else {
        setTema(data)
      }
      setLoading(false)
    }

    fetchTema()
  }, [id])

  if (loading || loadingStudent) {
    return <div className="p-6 text-foreground">Cargando tema...</div>
  }

  if (!tema) {
    return <div className="p-6 text-red-500">❌ No se encontró el tema.</div>
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <h1 className="text-2xl font-bold mb-4 text-center">{tema.tema}</h1>

      {/* Aquí puedes pasar el temaId a SumGame o usar otro componente */}
      <SumGame   />
    </div>
  )
}

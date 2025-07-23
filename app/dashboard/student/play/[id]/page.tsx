'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

import { SumGame } from '@/components/sum/SumGame'
import { FraccionesSumasStGeorgeGameGame } from '@/components/fracciones/FraccionesSumasStGeorge'
import { FraccionesMultiplicacionStGeorgeGame } from '@/components/fracciones/FraccionesMultiplicacionesStGeorge'

interface Tema {
  id: string
  tema: string
}

// Mapeo de ID de tema a componente
const gameComponents: Record<string, React.ComponentType> = {
  'ea5de085-2e52-40ac-b975-8931d08b9e44': FraccionesSumasStGeorgeGameGame,
  '4f098735-8cea-416a-be52-12e91adbba23': FraccionesMultiplicacionStGeorgeGame,
  // Agrega más aquí cuando tengas más juegos
}

export default function TemaPlayPage() {
  const { id } = useParams()
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

  if (loading) {
    return <div className="p-6 text-foreground">Cargando tema...</div>
  }

  if (!tema) {
    return <div className="p-6 text-red-500">❌ No se encontró el tema.</div>
  }

  // Selecciona componente según ID
  const SelectedGame = gameComponents[tema.id]

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <h1 className="text-2xl font-bold mb-4 text-center">{tema.tema}</h1>
      {SelectedGame ? (
        <SelectedGame />
      ) : (
        <div className="text-red-500">⚠️ No hay juego asignado para este tema.</div>
      )}
    </div>
  )
}

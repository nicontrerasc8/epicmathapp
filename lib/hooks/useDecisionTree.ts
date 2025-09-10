'use client'

import { useState, useCallback } from 'react'
import DecisionTree from 'decision-tree'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

// ================== Tipos ==================
type Nivel = 1 | 2 | 3
type Resultado = 'sube' | 'baja' | 'mantiene'
type Tiempo = 'rapido' | 'moderado' | 'lento'
type Mejora = 'mejora' | 'estable' | 'empeora'
type TipoOperacion = 'suma' | 'resta' | 'multiplicacion' | 'division'
type TipoProblema = 'fracciones' | 'patrones' | 'regla3' | 'inversas'

export interface RegistroEntrenamiento {
  nivel: Nivel
  aciertos: number
  errores: number
  tiempo_promedio: Tiempo
  pistas_usadas: number
  racha: number
  mejora: Mejora
  tipo_problema: TipoOperacion | TipoProblema
  resultado: Resultado
}

export function useDecisionTree(
  temaId: string,
  className: keyof RegistroEntrenamiento = 'resultado',
  features: (keyof RegistroEntrenamiento)[] = [
    'nivel',
    'aciertos',
    'errores',
    'tiempo_promedio',
    'pistas_usadas',
    'racha',
    'mejora',
    'tipo_problema'
  ]
) {
  const [tree, setTree] = useState<any>(null)

  // ----------- Entrenar ----------
  const train = useCallback(
    (trainingData: RegistroEntrenamiento[]) => {
      console.log('[DecisionTree] Entrenando con data:', trainingData)
      const dt = new DecisionTree(trainingData, className, features)
      setTree(dt)
      console.log('[DecisionTree] Árbol entrenado:', dt)
      return dt
    },
    [className, features]
  )

  // ----------- Predecir ----------
  const predict = useCallback(
    (sample: Omit<RegistroEntrenamiento, 'resultado'>) => {
      if (!tree) {
        console.warn('[DecisionTree] No hay árbol cargado todavía')
        return null
      }
      const result = tree.predict(sample) as Resultado
      console.log('[DecisionTree] Predicción con sample:', sample, '→', result)
      return result
    },
    [tree]
  )

  // ----------- Guardar en Supabase ----------
  const saveModel = useCallback(
    async (trainingData: RegistroEntrenamiento[]) => {
      const modelo = { trainingData, className, features }
      console.log('[DecisionTree] Guardando modelo en Supabase:', {
        temaId,
        modelo,
      })

      const { data, error } = await supabase
        .from('decision_trees')
        .update({ modelo })
        .eq('tema', temaId)
        .select()

      if (error) {
        console.error('[DecisionTree] Error guardando modelo:', error)
        throw error
      }

      console.log('[DecisionTree] Modelo guardado correctamente. Respuesta:', data)
      return data
    },
    [temaId, className, features]
  )

  // ----------- Cargar desde Supabase ----------
  const loadModel = useCallback(async () => {
    console.log('[DecisionTree] Cargando modelo desde Supabase con temaId:', temaId)
    const { data, error } = await supabase
      .from('decision_trees')
      .select('modelo')
      .eq('tema', temaId)
      .single()

    if (error) {
      console.error('[DecisionTree] Error al cargar modelo:', error)
      return null
    }
    if (!data?.modelo) {
      console.warn('[DecisionTree] No existe modelo guardado en BD')
      return null
    }

    console.log('[DecisionTree] Modelo cargado desde Supabase:', data.modelo)
    const { trainingData, className, features } = data.modelo
    const dt = new DecisionTree(trainingData, className, features)
    setTree(dt)
    console.log('[DecisionTree] Árbol reconstruido desde BD:', dt)
    return dt
  }, [temaId])

  return { tree, train, predict, saveModel, loadModel }
}

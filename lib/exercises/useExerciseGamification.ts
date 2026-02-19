import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"

export type GamificationRow = {
  student_id: string
  exercise_id: string
  attempts: number
  correct_attempts: number
  wrong_attempts: number
  trophies: number
  streak: number
  last_played_at: string | null
}

export function useExerciseGamification(
  exerciseId: string,
  classroomId: string
) {
  const supabase = createClient()
  const [studentId, setStudentId] = useState<string | null>(null)
  const [gami, setGami] = useState<GamificationRow | null>(null)
  const [gamiLoading, setGamiLoading] = useState(true)

  const fetchRow = async (uid: string) => {
    const { data: row, error } = await supabase
      .from("edu_student_gamification")
      .select(
        `
        student_id,
        exercise_id,
        attempts,
        correct_attempts,
        wrong_attempts,
        trophies,
        streak,
        last_played_at
      `
      )
      .eq("student_id", uid)
      .eq("exercise_id", exerciseId)
      .maybeSingle()

    return { row: (row as GamificationRow | null) ?? null, error }
  }

  const ensureRow = async (uid: string) => {
    const { row, error } = await fetchRow(uid)
    if (error) return { row: null, error }
    if (row) return { row, error: null }

    const baseRow = {
      student_id: uid,
      exercise_id: exerciseId,
      attempts: 0,
      correct_attempts: 0,
      wrong_attempts: 0,
      trophies: 0,
      streak: 0,
      last_played_at: null as string | null,
    }

    const { error: upsertError } = await supabase
      .from("edu_student_gamification")
      .upsert(baseRow, { onConflict: "student_id,exercise_id" })

    if (upsertError) return { row: null, error: upsertError }

    return fetchRow(uid)
  }

  /* ======================================================
     LOAD GAMIFICATION
  ====================================================== */
  useEffect(() => {
    let alive = true

    const run = async () => {
      setGamiLoading(true)

      const { data } = await supabase.auth.getUser()
      const uid = data?.user?.id ?? null
      if (!alive) return

      setStudentId(uid)

      if (!uid) {
        setGami(null)
        setGamiLoading(false)
        return
      }

      const { row, error } = await ensureRow(uid)

      if (!alive) return

      if (error) {
        console.warn("[exercise gamification] load error", error)
        setGami(null)
      } else {
        setGami(row)
      }

      setGamiLoading(false)
    }

    run()
    return () => {
      alive = false
    }
  }, [supabase, exerciseId])

  /* ======================================================
     REFRESH
  ====================================================== */
  const refresh = async (uid: string) => {
    const { row, error } = await ensureRow(uid)
    if (error) {
      console.warn("[exercise gamification] refresh error", error)
      setGami(null)
      return
    }
    setGami(row)
  }

  /* ======================================================
     APPLY GAMIFICATION + LEARNING (RPC ÚNICA)
  ====================================================== */
  const applyGamification = async (params: {
    uid: string
    correct: boolean
    timeSeconds: number
  }) => {
    const { error } = await supabase.rpc(
      "fn_apply_gamification_and_learning",
      {
        p_student_id: params.uid,
        p_classroom_id: classroomId,
        p_exercise_id: exerciseId,
        p_correct: params.correct,
        p_time_seconds: Math.floor(params.timeSeconds),
      }
    )

    if (error) {
      console.warn("[gamification + learning] rpc error", error)
      return
    }

    await refresh(params.uid)
  }

  return {
    studentId,
    gami,
    gamiLoading,
    refresh,
    applyGamification,
  }
}

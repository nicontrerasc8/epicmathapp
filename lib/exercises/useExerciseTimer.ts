import { useEffect, useRef, useState } from "react"

export function useExerciseTimer(active: boolean, resetKey: number) {
  const startedAtRef = useRef<number>(Date.now())
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    startedAtRef.current = Date.now()
    setElapsed(0)
  }, [resetKey])

  useEffect(() => {
    if (!active) return
    const t = setInterval(() => {
      const now = Date.now()
      const secs = (now - startedAtRef.current) / 1000
      setElapsed(secs)
    }, 250)
    return () => clearInterval(t)
  }, [active, resetKey])

  return {
    elapsed,
    startedAtRef,
  }
}

export const TROPHY_MAX = 30
export const TROPHY_MIN = 16
export const TROPHY_STEP_SECONDS = 15
export const WRONG_PENALTY = 15

export function computeTrophyGain(timeSeconds: number) {
  const steps = Math.floor(Math.max(0, timeSeconds) / TROPHY_STEP_SECONDS)
  return Math.max(TROPHY_MIN, TROPHY_MAX - steps)
}

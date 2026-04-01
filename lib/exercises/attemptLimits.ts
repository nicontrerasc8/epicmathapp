export const CRISTO_SALVADOR_COMPONENT_PREFIX = 'CristoSalvador/'
export const CRISTO_SALVADOR_MAX_ATTEMPTS = 3

export function getExerciseMaxAttempts(componentKey: string | null | undefined) {
  if (componentKey?.startsWith(CRISTO_SALVADOR_COMPONENT_PREFIX)) {
    return CRISTO_SALVADOR_MAX_ATTEMPTS
  }

  return Number.POSITIVE_INFINITY
}

export function hasLimitedAttempts(componentKey: string | null | undefined) {
  return Number.isFinite(getExerciseMaxAttempts(componentKey))
}

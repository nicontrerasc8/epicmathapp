export type TimedExamAssignment = {
  active?: boolean | null
  available_from?: string | null
  available_until?: string | null
}

export function getExamWindowState(
  assignment: TimedExamAssignment,
  now = new Date(),
): "disabled" | "upcoming" | "open" | "closed" {
  if (assignment.active === false) return "disabled"

  const startsAt = assignment.available_from ? new Date(assignment.available_from) : null
  const endsAt = assignment.available_until ? new Date(assignment.available_until) : null

  if (startsAt && startsAt.getTime() > now.getTime()) return "upcoming"
  if (endsAt && endsAt.getTime() < now.getTime()) return "closed"
  return "open"
}

export function isExamAvailableNow(
  assignment: TimedExamAssignment,
  now = new Date(),
) {
  return getExamWindowState(assignment, now) === "open"
}

export function formatDateTimeLabel(value: string | null) {
  if (!value) return "Sin fecha"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Sin fecha"

  return date.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
